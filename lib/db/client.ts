import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

import { getEnvironment } from "@/lib/env";
import * as schema from "@/lib/db/schema";

export interface DatabaseConnection {
  sqlite: Database.Database;
  db: BetterSQLite3Database<typeof schema>;
  path: string;
}

function resolveDatabasePath(path: string): string {
  if (path === ":memory:") {
    return path;
  }

  return resolve(path);
}

export function createDatabaseConnection(path: string): DatabaseConnection {
  const resolvedPath = resolveDatabasePath(path);

  if (resolvedPath !== ":memory:") {
    mkdirSync(dirname(resolvedPath), { recursive: true });
  }

  const sqlite = new Database(resolvedPath);
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("synchronous = NORMAL");

  if (resolvedPath !== ":memory:") {
    sqlite.pragma("journal_mode = WAL");
  }

  return {
    sqlite,
    db: drizzle(sqlite, { schema }),
    path: resolvedPath,
  };
}

const globalDatabase = globalThis as typeof globalThis & {
  soraDatabase?: DatabaseConnection;
};

export function getDatabaseConnection(): DatabaseConnection {
  globalDatabase.soraDatabase ??= createDatabaseConnection(getEnvironment().databasePath);
  return globalDatabase.soraDatabase;
}

export function resetDatabaseConnectionForTests(): void {
  globalDatabase.soraDatabase?.sqlite.close();
  globalDatabase.soraDatabase = undefined;
}
