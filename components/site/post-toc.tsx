"use client";

import { useSyncExternalStore } from "react";

interface TocItem {
  id: string;
  level: number;
  text: string;
}

export function PostToc() {
  const snapshot = useSyncExternalStore(subscribeToToc, readTocSnapshot, () => "[]");
  const items = JSON.parse(snapshot) as TocItem[];

  return (
    <aside className="sora-post-toc">
      <nav aria-label="文章目录">
        {items.map((item) => (
          <a className={`sora-toc-level-${item.level}`} href={`#${item.id}`} key={item.id}>
            {item.text}
          </a>
        ))}
      </nav>
    </aside>
  );
}

function subscribeToToc(): () => void {
  return () => undefined;
}

function readTocSnapshot(): string {
  const headings = Array.from(
    document.querySelectorAll<HTMLElement>(
      "#post-content h1[id], #post-content h2[id], #post-content h3[id], #post-content h4[id]",
    ),
  );
  return JSON.stringify(
    headings.map((heading) => ({
      id: heading.id,
      level: Number(heading.tagName.slice(1)),
      text: heading.textContent?.trim() || heading.id,
    })),
  );
}
