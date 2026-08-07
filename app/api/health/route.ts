import { existsSync } from "node:fs";

import { NextResponse } from "next/server";

import { getMaintenanceMarkerPath } from "@/lib/data/jobs";
import { checkDatabaseHealth } from "@/lib/db/health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(): NextResponse {
  const maintenance = existsSync(getMaintenanceMarkerPath());
  const database = checkDatabaseHealth();
  const status = database.ok && !maintenance ? 200 : 503;

  return NextResponse.json(
    {
      status: maintenance ? "maintenance" : database.ok ? "ok" : "degraded",
      checks: {
        database: {
          ok: database.ok,
          journalMode: database.journalMode,
          foreignKeys: database.foreignKeys,
        },
      },
      timestamp: new Date().toISOString(),
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
