import { getSiteSettings, listPublishedPosts } from "@/lib/content/service";
import { getEnvironment } from "@/lib/env";

export function GET(): Response {
  const settings = getSiteSettings();
  const origin = getEnvironment().appUrl.origin;
  const cdata = (value: string) => value.replaceAll("]]>", "]]]]><![CDATA[>");
  const items = listPublishedPosts(100)
    .map(
      (post) => `
    <item>
      <title><![CDATA[${cdata(post.title)}]]></title>
      <link>${origin}/posts/${encodeURIComponent(post.slug)}</link>
      <guid>${origin}/posts/${encodeURIComponent(post.slug)}</guid>
      <pubDate>${new Date(post.publishedAt ?? post.updatedAt).toUTCString()}</pubDate>
      <description><![CDATA[${cdata(post.excerpt)}]]></description>
    </item>`,
    )
    .join("");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title><![CDATA[${cdata(settings.title)}]]></title>
    <link>${origin}</link>
    <description><![CDATA[${cdata(settings.description)}]]></description>${items}
  </channel>
</rss>`,
    {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
      },
    },
  );
}
