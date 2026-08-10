"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

interface TocItem {
  id: string;
  level: number;
  text: string;
}

export function PostToc() {
  const snapshot = useSyncExternalStore(subscribeToToc, readTocSnapshot, () => "[]");
  const items = JSON.parse(snapshot) as TocItem[];
  const [activeId, setActiveId] = useState("");
  const resolvedActiveId = activeId || items[0]?.id || "";

  useEffect(() => {
    const headings = Array.from(
      document.querySelectorAll<HTMLElement>(
        "#post-content h1[id], #post-content h2[id], #post-content h3[id], #post-content h4[id]",
      ),
    );

    const firstHeading = headings[0];
    if (!firstHeading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const activeHeading = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0];

        if (activeHeading) {
          setActiveId((activeHeading.target as HTMLElement).id);
        }
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 },
    );

    headings.forEach((heading) => observer.observe(heading));

    return () => observer.disconnect();
  }, []);

  return (
    <aside className="sora-post-toc">
      <nav aria-label="文章目录">
        {items.map((item) => {
          const active = item.id === resolvedActiveId;
          return (
            <a
              aria-current={active ? "location" : undefined}
              className={`sora-toc-level-${item.level}${active ? " is-active" : ""}`}
              href={`#${item.id}`}
              key={item.id}
            >
              {item.text}
            </a>
          );
        })}
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
