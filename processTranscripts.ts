import { Supadata } from "@supadata/js";
import { createClient } from "@supabase/supabase-js";
import readline from "readline";
import chunktranscript from "./chunktranscript.js";
import "dotenv/config";

const supadata = new Supadata({
  apiKey: process.env.SUPADATA_API_KEY!,
});

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.PUBLIC_SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Fetches a transcript for a given URL and stores it in Supabase.
 * @param {string} url The YouTube video URL.
 */
async function processAndStoreTranscript(url: string) {
  try {
    console.log("Fetching transcript for:", url);
    const transcriptData = await supadata.youtube.transcript({ url });

    if (!transcriptData || !Array.isArray(transcriptData.content)) {
      console.error("Could not retrieve valid transcript content.");
      return;
    }

    let fullTranscript = "";
    for (const el of transcriptData.content) {
      fullTranscript += el.text + " ";
    }
    fullTranscript = fullTranscript.trim();

    console.log("\nStoring transcript in Supabase...");
    const { data, error } = await supabase
      .from("transcripts")
      .insert([{ url: url, transcript: fullTranscript }]);

    if (error) {
      throw error;
    }

    console.log("✅ Successfully stored transcript!\n");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("\n❌ An error occurred:", errorMessage, "\n");
  }
}

/**
 * Main application loop to continuously ask for URLs.
 */
function askForUrl() {
  rl.question('Enter a YouTube URL (or type "exit" to quit): ', async (url) => {
    if (url.toLowerCase() === "exit") {
      console.log("Goodbye!");
      rl.close();
      return;
    }

    if (url) {
      await processAndStoreTranscript(url);
    } else {
      console.log("URL cannot be empty. Please try again.");
    }

    askForUrl();
  });
}

chunktranscript();
