import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createDatabaseConnection } from "@/lib/db/client";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("createDatabaseConnection", () => {
  it("configures a file database for safe single-instance operation", () => {
    const directory = mkdtempSync(join(tmpdir(), "sora-blog-db-"));
    temporaryDirectories.push(directory);

    const connection = createDatabaseConnection(join(directory, "blog.db"));

    expect(connection.sqlite.pragma("foreign_keys", { simple: true })).toBe(1);
    expect(connection.sqlite.pragma("journal_mode", { simple: true })).toBe("wal");
    expect(connection.sqlite.pragma("busy_timeout", { simple: true })).toBe(5000);

    connection.sqlite.close();
  });

  it("supports isolated in-memory databases for focused tests", () => {
    const connection = createDatabaseConnection(":memory:");
    const result = connection.sqlite.prepare("SELECT 1 AS value").get() as { value: number };

    expect(result.value).toBe(1);
    expect(connection.path).toBe(":memory:");

    connection.sqlite.close();
  });
});
