import type { SiteSettings } from "@/lib/content/validation";

interface SiteFooterNoteProps {
  fallbackText: string;
  source: SiteSettings["footerQuoteSource"];
}

const quoteEndpoints = {
  HITOKOTO: {
    field: "hitokoto",
    url: "https://v1.hitokoto.cn/?encode=json",
  },
  GUSHI: {
    field: "content",
    url: "https://v1.jinrishici.com/all.json",
  },
} as const;

async function requestFooterQuote(source: Exclude<SiteSettings["footerQuoteSource"], "NONE">) {
  const endpoint = quoteEndpoints[source];
  const requestUrl = new URL(endpoint.url);
  requestUrl.searchParams.set("_t", Date.now().toString());

  try {
    const response = await fetch(requestUrl, {
      cache: "no-store",
      headers: { Accept: "application/json", "Cache-Control": "no-cache" },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return "";

    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object") return "";

    const value = (payload as Record<string, unknown>)[endpoint.field];
    return typeof value === "string" ? value.trim() : "";
  } catch {
    return "";
  }
}

export async function SiteFooterNote({ fallbackText, source }: SiteFooterNoteProps) {
  const quote = source === "NONE" ? "" : await requestFooterQuote(source);
  const text = quote || fallbackText;
  return text ? <p className="sora-footer-note">{text}</p> : null;
}
