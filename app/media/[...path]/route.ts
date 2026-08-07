import { readMedia } from "@/lib/media/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const storageKey = (await params).path.join("/");
  const item = await readMedia(storageKey);
  if (!item) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(item.data), {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": item.mimeType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
