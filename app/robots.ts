import type { MetadataRoute } from "next";

import { getEnvironment } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const origin = getEnvironment().appUrl.origin;
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: `${origin}/sitemap.xml`,
  };
}
