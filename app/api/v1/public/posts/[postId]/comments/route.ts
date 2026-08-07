import { createPublicComment, InteractionError } from "@/lib/comments/service";
import { publicCommentSchema } from "@/lib/comments/validation";
import {
  getVisitorHash,
  isTrustedRequestOrigin,
  summarizeUserAgent,
} from "@/lib/interactions/request";

const errorMessages = {
  POST_NOT_FOUND: "文章不存在或尚未公开",
  COMMENTS_CLOSED: "这篇文章已关闭评论",
  PARENT_INVALID: "回复的评论不存在",
  RATE_LIMITED: "提交过于频繁，请稍后再试",
} as const;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ postId: string }> },
): Promise<Response> {
  if (!isTrustedRequestOrigin(request)) {
    return Response.json(
      { error: { code: "ORIGIN_REJECTED", message: "请求来源不受信任" } },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { code: "INVALID_JSON", message: "请求内容格式不正确" } },
      { status: 400 },
    );
  }
  const parsed = publicCommentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: {
          code: "VALIDATION_FAILED",
          message: parsed.error.issues[0]?.message ?? "请检查评论内容",
        },
      },
      { status: 422 },
    );
  }

  try {
    const result = createPublicComment(
      (await params).postId,
      parsed.data,
      getVisitorHash(request),
      summarizeUserAgent(request),
    );
    return Response.json(
      { data: { id: result.id, status: result.status, duplicate: result.duplicate } },
      { status: result.duplicate ? 200 : 201 },
    );
  } catch (error) {
    if (error instanceof InteractionError) {
      const status =
        error.code === "RATE_LIMITED" ? 429 : error.code === "POST_NOT_FOUND" ? 404 : 409;
      return Response.json(
        { error: { code: error.code, message: errorMessages[error.code] } },
        { status },
      );
    }
    return Response.json(
      { error: { code: "COMMENT_FAILED", message: "评论提交失败" } },
      { status: 500 },
    );
  }
}
