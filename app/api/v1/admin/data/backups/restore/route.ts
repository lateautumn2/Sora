import { dataApiErrorResponse, requireAdminApiRequest } from "@/lib/data/api";
import { operationActions, recordOperation } from "@/lib/auth/operation-log";
import { stageFullBackupRestore } from "@/lib/data/backups";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await requireAdminApiRequest(request);
    const job = await stageFullBackupRestore(request);
    await recordOperation({
      action: operationActions.DATA_RESTORE,
      actor: session.user,
      metadata: { stage: "validate", jobId: job.jobId },
      targetId: job.jobId,
      targetType: "BACKUP",
    });
    return Response.json({ data: job }, { status: 201 });
  } catch (error) {
    return dataApiErrorResponse(error);
  }
}
