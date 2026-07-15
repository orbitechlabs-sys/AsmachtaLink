import fs from "fs";
import path from "path";
import { Client } from "pg";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("Missing DIRECT_URL or DATABASE_URL in .env.local");
  process.exit(1);
}

async function main() {
  const sqlPath = path.join(process.cwd(), "migrations", "postgres", "001_init.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });

  console.log("Connecting to Supabase Postgres...");
  await client.connect();
  try {
    await client.query(sql);
    console.log("Applied migrations/postgres/001_init.sql successfully.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
