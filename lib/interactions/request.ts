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

export function getVisitorHash(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  return createHmac("sha256", getEnvironment().visitorHashSecret)
    .update(`${ip}\n${userAgent}`)
    .digest("hex");
}

export function summarizeUserAgent(request: Request): string | null {
  const value = request.headers.get("user-agent")?.trim();
  return value ? value.slice(0, 240) : null;
}

export function hashRequestToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
