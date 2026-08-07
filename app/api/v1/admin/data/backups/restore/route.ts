import { dataApiErrorResponse, requireAdminApiRequest } from "@/lib/data/api";
import { stageFullBackupRestore } from "@/lib/data/backups";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    await requireAdminApiRequest(request);
    const job = await stageFullBackupRestore(request);
    return Response.json({ data: job }, { status: 201 });
  } catch (error) {
    return dataApiErrorResponse(error);
  }
}
