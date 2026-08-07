import { rm, stat } from "node:fs/promises";
import { Readable } from "node:stream";

import { archiveReadStream } from "@/lib/data/archive";
import { dataApiErrorResponse, requireAdminApiRequest } from "@/lib/data/api";
import { createFullBackupExport } from "@/lib/data/backups";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    await requireAdminApiRequest(request);
    const backup = await createFullBackupExport();
    const bytes = (await stat(backup.archivePath)).size;
    const source = archiveReadStream(backup.archivePath);
    source.once("close", () => {
      void rm(backup.jobDirectory, { recursive: true, force: true });
    });
    return new Response(Readable.toWeb(source) as ReadableStream<Uint8Array>, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${backup.fileName}"`,
        "Content-Length": String(bytes),
        "Content-Type": "application/zip",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return dataApiErrorResponse(error);
  }
}
