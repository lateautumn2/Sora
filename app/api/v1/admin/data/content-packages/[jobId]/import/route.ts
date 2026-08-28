import { dataApiErrorResponse, requireAdminApiRequest } from "@/lib/data/api";
import { operationActions, recordOperation } from "@/lib/auth/operation-log";
import { importStagedContentPackage } from "@/lib/data/content-packages";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
): Promise<Response> {
  try {
    const session = await requireAdminApiRequest(request);
    const jobId = (await params).jobId;
    const job = await importStagedContentPackage(jobId);
    await recordOperation({
      action: operationActions.DATA_IMPORT,
      actor: session.user,
      metadata: { stage: "import", state: job.state },
      targetId: jobId,
      targetType: "CONTENT_PACKAGE",
    });
    return Response.json({ data: job });
  } catch (error) {
    return dataApiErrorResponse(error);
  }
}
