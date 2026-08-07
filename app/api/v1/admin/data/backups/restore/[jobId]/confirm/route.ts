import { dataApiErrorResponse, DataApiError, requireAdminApiRequest } from "@/lib/data/api";
import { requestFullBackupRestore } from "@/lib/data/backups";
import { getEnvironment } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
): Promise<Response> {
  try {
    await requireAdminApiRequest(request);
    const body = (await request.json().catch(() => null)) as { confirmation?: unknown } | null;
    if (body?.confirmation !== "RESTORE") {
      throw new DataApiError("RESTORE_CONFIRMATION_REQUIRED", "请输入 RESTORE 确认完整恢复", 422);
    }
    const job = await requestFullBackupRestore((await params).jobId);
    const production = getEnvironment().nodeEnv === "production";
    if (production) {
      setTimeout(() => process.kill(process.pid, "SIGTERM"), 1500).unref();
    }
    return Response.json({
      data: {
        ...job,
        restartScheduled: production,
        message: production
          ? "恢复请求已提交，服务将进入维护状态并自动重启"
          : "恢复请求已提交；开发环境请使用离线恢复命令",
      },
    });
  } catch (error) {
    return dataApiErrorResponse(error);
  }
}
