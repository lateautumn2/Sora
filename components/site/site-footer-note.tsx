"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface SiteFooterNoteProps {
  enabled: boolean;
  fallbackText: string;
}

interface HitokotoResult {
  requestKey: string;
  text: string;
}

/**
 * 一言由访客浏览器按前台路径请求。结果与请求路径绑定，因此导航开始后旧内容会
 * 立即失效；失败时保持空白，只有关闭一言开关时才显示后台填写的静态文字。
 */
export function SiteFooterNote({ enabled, fallbackText }: SiteFooterNoteProps) {
  const pathname = usePathname();
  const requestKey = enabled ? pathname : "";
  const [result, setResult] = useState<HitokotoResult>({ requestKey: "", text: "" });

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();

    async function loadHitokoto() {
      try {
        const response = await fetch("https://v1.hitokoto.cn/?encode=json", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;

        const payload: unknown = await response.json();
        if (!payload || typeof payload !== "object" || !("hitokoto" in payload)) return;

        const hitokoto = (payload as { hitokoto?: unknown }).hitokoto;
        if (typeof hitokoto !== "string") return;

        const text = hitokoto.trim();
        if (!text || controller.signal.aborted) return;
        setResult({ requestKey, text });
      } catch {
        // 外部内容只是可选增强；请求失败或被取消时保持空白。
      }
    }

    void loadHitokoto();
    return () => controller.abort();
  }, [enabled, requestKey]);

  const text = enabled ? (result.requestKey === requestKey ? result.text : "") : fallbackText;
  return text ? <p className="sora-footer-note">{text}</p> : null;
}
