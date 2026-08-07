import { dataApiErrorResponse, requireAdminApiRequest } from "@/lib/data/api";
import { importStagedContentPackage } from "@/lib/data/content-packages";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
): Promise<Response> {
  try {
    await requireAdminApiRequest(request);
    const job = await importStagedContentPackage((await params).jobId);
    return Response.json({ data: job });
  } catch (error) {
    return dataApiErrorResponse(error);
  }
}
