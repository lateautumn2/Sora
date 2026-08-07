import { getDatabaseConnection } from "@/lib/db/client";

export interface DatabaseHealth {
  ok: boolean;
  journalMode?: string;
  foreignKeys?: boolean;
  error?: string;
}

export function checkDatabaseHealth(): DatabaseHealth {
  try {
    const { sqlite } = getDatabaseConnection();
    sqlite.prepare("SELECT 1").get();

    const journalMode = sqlite.pragma("journal_mode", { simple: true }) as string;
    const foreignKeys = sqlite.pragma("foreign_keys", { simple: true }) === 1;

    return {
      ok: foreignKeys,
      journalMode,
      foreignKeys,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}
