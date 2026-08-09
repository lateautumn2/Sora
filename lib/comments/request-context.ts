import { getClientIp, parseBrowser, summarizeUserAgent } from "@/lib/interactions/request";

export interface CommentRequestContext {
  ipAddress: string | null;
  ipCity: string | null;
  userAgentSummary: string | null;
  browserName: string | null;
  browserVersion: string | null;
}

/**
 * 私有、环回和链路本地地址没有可用的公网城市归属，也不应发送给第三方服务。
 * 这里只识别评论入口可能收到的常见 IPv4/IPv6 文本形式；无法识别的值交给
 * IP 服务验证，查询失败后统一降级为空。
 */
function isPrivateOrLocalIp(ip: string): boolean {
  const normalized = ip.trim().toLowerCase();
  if (!normalized) return true;
  if (normalized === "::1" || normalized === "0:0:0:0:0:0:0:1") return true;
  if (normalized.startsWith("fe8") || normalized.startsWith("fe9")) return true;
  if (normalized.startsWith("fea") || normalized.startsWith("feb")) return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;

  const ipv4 = normalized.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;
  const octets = ipv4.slice(1).map(Number);
  if (octets.some((octet) => octet > 255)) return true;
  const [first = 0, second = 0] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

/** 查询 IP 对应城市；任何外部错误都降级为 null，不影响评论主流程。 */
export async function lookupIpCity(
  ip: string | null,
  fetcher: typeof fetch = fetch,
): Promise<string | null> {
  if (!ip || isPrivateOrLocalIp(ip)) return null;

  const query = new URLSearchParams({ fields: "success,city", lang: "zh-CN" });
  try {
    const response = await fetcher(`https://ipwho.is/${encodeURIComponent(ip)}?${query}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as { success?: boolean; city?: unknown };
    if (!payload.success || typeof payload.city !== "string") return null;
    const city = payload.city.trim();
    return city ? city.slice(0, 120) : null;
  } catch {
    return null;
  }
}

/** 生成评论写入所需的可信请求环境，客户端 JSON 不参与这些字段。 */
export async function resolveCommentRequestContext(
  request: Request,
  fetcher: typeof fetch = fetch,
): Promise<CommentRequestContext> {
  const ipAddress = getClientIp(request);
  const userAgentSummary = summarizeUserAgent(request);
  const browser = parseBrowser(userAgentSummary);
  return {
    ipAddress,
    ipCity: await lookupIpCity(ipAddress, fetcher),
    userAgentSummary,
    browserName: browser.name,
    browserVersion: browser.version,
  };
}
