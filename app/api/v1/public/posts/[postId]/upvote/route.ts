import { InteractionError } from "@/lib/comments/service";
import { getVisitorHash, isTrustedRequestOrigin } from "@/lib/interactions/request";
import { toggleUpvote } from "@/lib/interactions/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ postId: string }> },
): Promise<Response> {
  if (!isTrustedRequestOrigin(request)) {
    return Response.json({ error: { code: "ORIGIN_REJECTED" } }, { status: 403 });
  }
  try {
    return Response.json({ data: toggleUpvote((await params).postId, getVisitorHash(request)) });
  } catch (error) {
    if (error instanceof InteractionError && error.code === "POST_NOT_FOUND") {
      return Response.json({ error: { code: error.code } }, { status: 404 });
    }
    return Response.json({ error: { code: "UPVOTE_FAILED" } }, { status: 500 });
  }
}
