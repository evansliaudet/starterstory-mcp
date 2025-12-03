import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import * as z from "zod/v3";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// --- Initializations ---
const app = express();
app.use(express.json());
// Load keys from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SECRET_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
});
const server = new McpServer({
    name: "example-server",
    version: "1.0.0",
});
server.registerTool("search_transcripts", {
    title: "Search Transcripts",
    description: "Semantic search over transcript chunks stored in Supabase",
    inputSchema: z.object({ query: z.string() }),
    outputSchema: z.object({
        results: z.array(z.object({
            transcript_id: z.any(),
            chunk_text: z.string(),
            similarity: z.number(),
        })),
    }),
}, async ({ query }) => {
    const embedding = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: query,
    });
    const vector = embedding.data[0].embedding;
    const { data, error } = await supabase.rpc("match_transcript_chunk", {
        query_embedding: vector,
        match_threshold: 0.3,
        match_count: 6,
    });
    if (error) {
        console.error(error);
        throw new Error("Vector search failed");
    }
    const rows = (data || []);
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(data, null, 2),
            },
        ],
        structuredContent: {
            results: rows.map((row) => ({
                transcript_id: row.transcript_id,
                chunk_text: row.chunk_text,
                similarity: row.similarity,
            })),
        },
    };
});
app.post("/mcp", async (req, res) => {
    try {
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
            enableJsonResponse: true,
        });
        res.on("close", () => {
            transport.close();
        });
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
    }
    catch (error) {
        console.error("Error handling MCP request:", error);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: "2.0",
                error: {
                    code: -32603,
                    message: "Internal server error",
                },
                id: null,
            });
        }
    }
});
async function main() {
    // Check for a flag to decide which mode to run
    const isStdio = process.argv.includes("--stdio");
    if (isStdio) {
        // MODE 1: Stdio (For Claude Desktop)
        // In this mode, we cannot use console.log for info, only console.error
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("MCP Server running in stdio mode");
    }
    else {
        // MODE 2: HTTP (For testing with Curl)
        app.post("/mcp", async (req, res) => {
            try {
                const transport = new StreamableHTTPServerTransport({
                    sessionIdGenerator: undefined,
                    enableJsonResponse: true,
                });
                res.on("close", () => {
                    transport.close();
                });
                await server.connect(transport);
                await transport.handleRequest(req, res, req.body);
            }
            catch (error) {
                console.error("Error handling MCP request:", error);
                if (!res.headersSent) {
                    res.status(500).json({
                        jsonrpc: "2.0",
                        error: { code: -32603, message: "Internal server error" },
                        id: null,
                    });
                }
            }
        });
        const port = parseInt(process.env.PORT || "3000");
        app.listen(port, () => {
            console.log(`MCP Server running on http://localhost:${port}/mcp`);
        });
    }
}
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
