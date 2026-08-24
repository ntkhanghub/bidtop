import { readFileSync } from "node:fs";
import { Client } from "pg";
import "dotenv/config";

const sql = readFileSync(process.argv[2], "utf8");
const client = new Client({ connectionString: process.env.DIRECT_URL });

await client.connect();
try {
  await client.query(sql);
  console.log("Migration applied.");
} finally {
  await client.end();
}
