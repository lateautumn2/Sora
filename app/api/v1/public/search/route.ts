import { searchPublishedPosts } from "@/lib/content/service";

const MAX_QUERY_LENGTH = 100;

export function GET(request: Request): Response {
  const query = (new URL(request.url).searchParams.get("q") ?? "").normalize("NFKC").trim();
  if (!query) return Response.json({ data: [] });
  if (query.length > MAX_QUERY_LENGTH) {
    return Response.json(
      {
        error: {
          code: "QUERY_TOO_LONG",
          message: `搜索关键词不能超过 ${MAX_QUERY_LENGTH} 个字符`,
        },
      },
      { status: 422 },
    );
  }

  const data = searchPublishedPosts(query, 8).map(({ id, title, slug, excerpt, publishedAt }) => ({
    id,
    title,
    slug,
    excerpt,
    publishedAt,
  }));
  return Response.json({ data });
}
