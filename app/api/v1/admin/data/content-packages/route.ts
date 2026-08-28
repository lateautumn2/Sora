import { dataApiErrorResponse, requireAdminApiRequest } from "@/lib/data/api";
import { operationActions, recordOperation } from "@/lib/auth/operation-log";
import { stageContentPackage } from "@/lib/data/content-packages";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await requireAdminApiRequest(request);
    const job = await stageContentPackage(request);
    await recordOperation({
      action: operationActions.DATA_IMPORT,
      actor: session.user,
      metadata: { stage: "analyze", jobId: job.jobId },
      targetId: job.jobId,
      targetType: "CONTENT_PACKAGE",
    });
    return Response.json({ data: job }, { status: 201 });
  } catch (error) {
    return dataApiErrorResponse(error);
  }
}
