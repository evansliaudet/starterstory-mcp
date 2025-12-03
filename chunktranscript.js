import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.PUBLIC_SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

// -------------------------
// 1. Chunking Function
// -------------------------
function chunkTranscript(text, chunkSize = 800, overlap = 150) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end);
    chunks.push(chunk);
    start += chunkSize - overlap;
  }

  return chunks;
}

// -------------------------
// 2. Main Script
// -------------------------
export default async function chunktranscript() {
  console.log("Fetching transcripts...");

  const { data: transcripts, error } = await supabase
    .from("transcripts")
    .select("*");

  if (error) {
    console.error("Error loading transcripts:", error);
    return;
  }

  console.log(`Found ${transcripts.length} transcripts.`);

  for (const t of transcripts) {
    console.log(`\nProcessing transcript ${t.id}...`);

    const chunks = chunkTranscript(t.transcript);
    console.log(` → Created ${chunks.length} chunks.`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // ---------------
      // Embed chunk
      // ---------------
      const embed = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk,
      });

      const vector = embed.data[0].embedding;

      // ---------------
      // Insert chunk
      // ---------------
      const { error: insertErr } = await supabase
        .from("transcript_chunks")
        .insert({
          transcript_id: t.id,
          chunk_text: chunk,
          embedding: vector,
        });

      if (insertErr) {
        console.error("Insert error on chunk", i, insertErr);
      } else {
        console.log(`   ✓ Inserted chunk ${i + 1}/${chunks.length}`);
      }
    }
  }

  console.log("\nAll transcripts processed successfully!");
}
