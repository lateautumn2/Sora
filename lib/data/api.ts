import { auth } from "@/lib/auth/server";
import { ArchiveError } from "@/lib/data/archive";
import { isTrustedRequestOrigin } from "@/lib/interactions/request";

export class DataApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "DataApiError";
  }
}

export async function requireAdminApiRequest(request: Request) {
  if (!isTrustedRequestOrigin(request)) {
    throw new DataApiError("ORIGIN_REJECTED", "请求来源不受信任", 403);
  }
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw new DataApiError("AUTH_REQUIRED", "管理员登录已失效", 401);
  return session;
}

export function dataApiErrorResponse(error: unknown): Response {
  if (error instanceof DataApiError || error instanceof ArchiveError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }
  console.error("Data management operation failed", error);
  return Response.json(
    { error: { code: "DATA_OPERATION_FAILED", message: "数据操作失败，请查看服务日志" } },
    { status: 500 },
  );
}
