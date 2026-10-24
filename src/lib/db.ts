/**
 * Database access.
 * - On Vercel: uses the Neon Postgres database in DATABASE_URL.
 * - Locally without DATABASE_URL: uses an in-process PGlite database (data in ./.pglite).
 */

export interface Db {
  query<T = any>(sql: string, params?: unknown[]): Promise<T[]>;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tickets (
  id          SERIAL PRIMARY KEY,
  day         DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Asia/Manila')::date,
  number      TEXT NOT NULL,
  service     TEXT NOT NULL,
  priority    BOOLEAN NOT NULL DEFAULT FALSE,
  phone       TEXT,
  status      TEXT NOT NULL DEFAULT 'waiting',
  counter     INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  called_at   TIMESTAMPTZ
);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS done_at   TIMESTAMPTZ;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS recalls   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS notified  BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS token     TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS office    TEXT NOT NULL DEFAULT 'bplo';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS app_type      TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS biz_type      TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS business_name TEXT;
CREATE INDEX IF NOT EXISTS tickets_day_status ON tickets (day, status);
CREATE INDEX IF NOT EXISTS tickets_office_status ON tickets (office, status, day);
`;

let dbPromise: Promise<Db> | null = null;

async function init(): Promise<Db> {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  let db: Db;
  if (url) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: url, max: 5, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
    db = {
      async query(sql, params) {
        const r = await pool.query(sql, params as any[]);
        return r.rows;
      },
    };
    for (const stmt of SCHEMA.split(";").map((s) => s.trim()).filter(Boolean)) {
      await pool.query(stmt);
    }
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const pg = new PGlite(process.env.PGLITE_DIR || "./.pglite");
    await pg.exec(SCHEMA);
    db = {
      async query(sql, params) {
        const r = await pg.query(sql, params as any[]);
        return r.rows as any[];
      },
    };
  }
  return db;
}

export function getDb(): Promise<Db> {
  const g = globalThis as any;
  if (g.__queueDb) return g.__queueDb;
  dbPromise = init().catch((e) => {
    g.__queueDb = null;
    throw e;
  });
  g.__queueDb = dbPromise;
  return dbPromise;
}
