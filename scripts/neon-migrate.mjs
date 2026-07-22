import { readFile, readdir } from "node:fs/promises";
import { Pool } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to run Neon migrations.");

const migrationsDirectory = new URL("../db/migrations/", import.meta.url);
const migrationNames = (await readdir(migrationsDirectory)).filter((name) => name.endsWith(".sql")).sort();

const pool = new Pool({ connectionString });
const client = await pool.connect();
try {
  await client.query(`CREATE TABLE IF NOT EXISTS gm_schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  for (const migrationName of migrationNames) {
    const { rowCount } = await client.query("SELECT 1 FROM gm_schema_migrations WHERE name = $1", [migrationName]);
    if (rowCount) { console.log(`${migrationName} is already applied.`); continue; }
    // The first schema was provisioned before migration bookkeeping existed.
    // Baseline it instead of attempting to recreate its tables on that database.
    if (migrationName === "0000_wise_wiccan.sql") {
      const existing = await client.query("SELECT to_regclass('public.gm_users') AS users_table");
      if (existing.rows[0]?.users_table) {
        await client.query("INSERT INTO gm_schema_migrations (name) VALUES ($1)", [migrationName]);
        console.log(`Baselined ${migrationName}.`);
        continue;
      }
    }
    const statements = (await readFile(new URL(`../db/migrations/${migrationName}`, import.meta.url), "utf8")).split("--> statement-breakpoint").map((statement) => statement.trim()).filter(Boolean);
    await client.query("BEGIN");
    for (const statement of statements) await client.query(statement);
    await client.query("INSERT INTO gm_schema_migrations (name) VALUES ($1)", [migrationName]);
    await client.query("COMMIT");
    console.log(`Applied ${migrationName}.`);
  }
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  client.release();
  await pool.end();
}
