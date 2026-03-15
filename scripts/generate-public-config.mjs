import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!url || !anonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY for public config generation."
  );
}

const outputPath = resolve("assets/js/public-config.js");
mkdirSync(dirname(outputPath), { recursive: true });

const content = `window.__RR_PUBLIC_CONFIG__ = {
  supabaseUrl: ${JSON.stringify(url)},
  supabaseAnonKey: ${JSON.stringify(anonKey)},
};
`;

writeFileSync(outputPath, content, "utf8");
console.log(`Generated ${outputPath}`);

