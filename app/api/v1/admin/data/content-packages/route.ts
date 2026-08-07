import { dataApiErrorResponse, requireAdminApiRequest } from "@/lib/data/api";
import { stageContentPackage } from "@/lib/data/content-packages";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    await requireAdminApiRequest(request);
    const job = await stageContentPackage(request);
    return Response.json({ data: job }, { status: 201 });
  } catch (error) {
    return dataApiErrorResponse(error);
  }
}
