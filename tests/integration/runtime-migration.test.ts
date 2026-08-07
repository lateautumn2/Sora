import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("runtime migration script", () => {
  it("applies every migration once using only runtime dependencies", () => {
    const directory = mkdtempSync(join(tmpdir(), "sora-blog-runtime-migrate-"));
    temporaryDirectories.push(directory);
    const databasePath = join(directory, "blog.db");
    const environment = { ...process.env, DATABASE_PATH: databasePath };

    const firstOutput = execFileSync(process.execPath, ["scripts/migrate.mjs"], {
      cwd: process.cwd(),
      env: environment,
      encoding: "utf8",
    });
    const secondOutput = execFileSync(process.execPath, ["scripts/migrate.mjs"], {
      cwd: process.cwd(),
      env: environment,
      encoding: "utf8",
    });

    const sqlite = new Database(databasePath, { readonly: true });
    const tables = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => (row as { name: string }).name);
    const migrationCount = sqlite
      .prepare("SELECT COUNT(*) AS count FROM __drizzle_migrations")
      .get() as { count: number };
    const mediaColumns = sqlite.pragma("table_info(media)") as Array<{ name: string }>;
    const commentColumns = sqlite.pragma("table_info(comments)") as Array<{ name: string }>;

    try {
      expect(firstOutput).toContain("applied: 6");
      expect(secondOutput).toContain("applied: 0");
      expect(tables).toContain("posts");
      expect(tables).toContain("comments");
      expect(tables).toContain("user");
      expect(tables).toContain("posts_fts");
      expect(tables).toContain("comment_requests");
      expect(tables).toContain("public_rate_limits");
      expect(tables).not.toContain("migration_runs");
      expect(tables).not.toContain("migration_id_map");
      expect(mediaColumns.map((column) => column.name)).not.toContain("source");
      expect(commentColumns.map((column) => column.name)).not.toContain("source");
      expect(migrationCount.count).toBe(6);
    } finally {
      sqlite.close();
    }
  });
});
