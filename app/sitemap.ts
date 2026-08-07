import type { MetadataRoute } from "next";

import { listPublishedPages, listPublishedPosts } from "@/lib/content/service";
import { getEnvironment } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getEnvironment().appUrl.origin;
  const staticEntries: MetadataRoute.Sitemap = [
    "",
    "/archives",
    "/categories",
    "/tags",
    "/search",
    "/about",
  ].map((path) => ({ url: `${origin}${path}`, changeFrequency: "weekly" }));
  const postEntries = listPublishedPosts(50_000).map((post) => ({
    url: `${origin}/posts/${encodeURIComponent(post.slug)}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: "monthly" as const,
  }));
  const pageEntries = listPublishedPages().map((page) => ({
    url: `${origin}/pages/${encodeURIComponent(page.slug)}`,
    lastModified: new Date(page.updatedAt),
    changeFrequency: "monthly" as const,
  }));
  return [...staticEntries, ...postEntries, ...pageEntries];
}
