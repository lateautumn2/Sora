"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { formatSoraDate } from "@/components/site/site-format";
import { Dialog } from "@/components/ui/dialog";

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  publishedAt: number | null;
}

interface SearchPayload {
  data?: SearchResult[];
  error?: { message?: string };
}

type SearchState = "idle" | "loading" | "success" | "error";

export function SiteSearch({ variant = "header" }: { variant?: "header" | "home" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [state, setState] = useState<SearchState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const normalizedQuery = query.normalize("NFKC").trim();

  useEffect(() => {
    if (!open || !normalizedQuery) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setState("loading");
      setErrorMessage("");
      void fetch(`/api/v1/public/search?q=${encodeURIComponent(normalizedQuery)}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          const payload = (await response.json()) as SearchPayload;
          if (!response.ok) throw new Error(payload.error?.message ?? "搜索失败，请稍后重试");
          setResults(payload.data ?? []);
          setState("success");
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setResults([]);
          setState("error");
          setErrorMessage(error instanceof Error ? error.message : "搜索失败，请稍后重试");
        });
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [normalizedQuery, open]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
      setResults([]);
      setState("idle");
      setErrorMessage("");
    }
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    setResults([]);
    setErrorMessage("");
    setState(value.normalize("NFKC").trim() ? "loading" : "idle");
  }

  const triggerClassName = variant === "home" ? "sora-home-search-trigger" : "sora-icon-link";
  return (
    <Dialog
      contentClassName="sora-search-dialog-shell"
      onOpenChange={handleOpenChange}
      open={open}
      title="搜索文章"
      trigger={
        <button aria-label="搜索" className={triggerClassName} title="搜索" type="button">
          <Search aria-hidden="true" size={17} strokeWidth={2.25} />
        </button>
      }
      triggerAsChild
    >
      <div className="sora-search-dialog">
        <label className="sora-search-dialog-field">
          <span className="sr-only">搜索文章</span>
          <Search aria-hidden="true" size={17} />
          <input
            aria-label="搜索文章"
            autoFocus
            maxLength={100}
            onChange={(event) => handleQueryChange(event.target.value)}
            placeholder="输入标题或正文关键词"
            type="search"
            value={query}
          />
        </label>

        <div aria-live="polite" className="sora-search-dialog-results">
          {state === "idle" ? <p className="sora-search-dialog-state">输入关键词开始搜索</p> : null}
          {state === "loading" ? <p className="sora-search-dialog-state">正在搜索…</p> : null}
          {state === "error" ? (
            <p className="sora-search-dialog-state" role="alert">
              {errorMessage}
            </p>
          ) : null}
          {state === "success" && results.length === 0 ? (
            <p className="sora-search-dialog-state">暂未找到与“{normalizedQuery}”匹配的文章</p>
          ) : null}
          {state === "success" && results.length > 0 ? (
            <div className="sora-search-dialog-list">
              {results.map((result) => (
                <Link
                  className="sora-search-dialog-item"
                  href={`/posts/${result.slug}`}
                  key={result.id}
                  onClick={() => setOpen(false)}
                >
                  <strong>{result.title}</strong>
                  {result.excerpt ? <span>{result.excerpt}</span> : null}
                  <time>{formatSoraDate(result.publishedAt)}</time>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </Dialog>
  );
}
