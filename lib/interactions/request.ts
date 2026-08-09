import { createHash, createHmac } from "node:crypto";

import { getEnvironment } from "@/lib/env";

export function isTrustedRequestOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return getEnvironment().trustedOrigins.includes(new URL(origin).origin);
  } catch {
    return false;
  }
}

/**
 * 从受信代理写入的请求头提取客户端 IP。
 * 多级代理的 `x-forwarded-for` 会按经过顺序追加地址，因此只取第一项。
 */
export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwarded || realIp || null;
}

export function getVisitorHash(request: Request): string {
  const ip = getClientIp(request) ?? "unknown";
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  return createHmac("sha256", getEnvironment().visitorHashSecret)
    .update(`${ip}\n${userAgent}`)
    .digest("hex");
}

export function summarizeUserAgent(request: Request): string | null {
  const value = request.headers.get("user-agent")?.trim();
  return value ? value.slice(0, 240) : null;
}

export interface BrowserSummary {
  name: string | null;
  version: string | null;
}

/**
 * 把 User-Agent 压缩为适合公开展示的浏览器名称和版本。
 * Chromium 衍生浏览器必须先于 Chrome 判断，否则 Edge、Opera 等会被误识别。
 */
export function parseBrowser(userAgent: string | null): BrowserSummary {
  if (!userAgent) return { name: null, version: null };

  const patterns: Array<{ name: string; pattern: RegExp }> = [
    { name: "Edge", pattern: /(?:EdgA|EdgiOS|Edg)\/([\d.]+)/ },
    { name: "Opera", pattern: /(?:OPR|Opera)\/([\d.]+)/ },
    { name: "Samsung Internet", pattern: /SamsungBrowser\/([\d.]+)/ },
    { name: "Chrome", pattern: /(?:CriOS|Chrome)\/([\d.]+)/ },
    { name: "Firefox", pattern: /(?:FxiOS|Firefox)\/([\d.]+)/ },
  ];

  for (const { name, pattern } of patterns) {
    const match = userAgent.match(pattern);
    if (match?.[1]) return { name, version: match[1] };
  }

  const safari = userAgent.match(/Version\/([\d.]+).*Safari\//);
  return safari?.[1] ? { name: "Safari", version: safari[1] } : { name: null, version: null };
}

export function hashRequestToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
