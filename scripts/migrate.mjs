import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import Database from "better-sqlite3";

const databasePath = resolve(process.env.DATABASE_PATH ?? "./data/blog.db");
const migrationsFolder = resolve(process.env.MIGRATIONS_PATH ?? "./db/migrations");
const journalPath = join(migrationsFolder, "meta", "_journal.json");

mkdirSync(dirname(databasePath), { recursive: true });

const sqlite = new Database(databasePath);

try {
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL,
      created_at NUMERIC
    )
  `);

  const journal = JSON.parse(readFileSync(journalPath, "utf8"));
  const lastMigration = sqlite
    .prepare("SELECT created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 1")
    .get();
  const lastAppliedAt = Number(lastMigration?.created_at ?? 0);
  let applied = 0;

  for (const entry of journal.entries) {
    if (entry.when <= lastAppliedAt) {
      continue;
    }

    const migrationSql = readFileSync(join(migrationsFolder, `${entry.tag}.sql`), "utf8");
    const statements = migrationSql
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean)
      .filter((statement) => !/^PRAGMA\s+foreign_keys\s*=/i.test(statement));
    const disablesForeignKeys = /PRAGMA\s+foreign_keys\s*=\s*OFF/i.test(migrationSql);
    const hash = createHash("sha256").update(migrationSql).digest("hex");

    if (disablesForeignKeys) {
      sqlite.pragma("foreign_keys = OFF");
    }

    try {
      sqlite.transaction(() => {
        for (const statement of statements) {
          sqlite.exec(statement);
        }
        sqlite
          .prepare("INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)")
          .run(hash, entry.when);
      })();
    } finally {
      if (disablesForeignKeys) {
        sqlite.pragma("foreign_keys = ON");
      }
    }

    applied += 1;
  }

  const violations = sqlite.pragma("foreign_key_check");
  if (violations.length > 0) {
    throw new Error(`Foreign key check failed with ${violations.length} violation(s).`);
  }

  console.log(`Database migrations applied: ${applied}; path: ${databasePath}`);
} finally {
  sqlite.close();
}
