import { Tag } from "lucide-react";
import Link from "next/link";

import { listTags } from "@/lib/content/service";

export const metadata = { title: "标签" };

export default function TagsPage() {
  const tags = listTags();
  return (
    <div className="sora-taxonomy-page">
      <h1 className="sr-only">标签</h1>
      {tags.length === 0 ? (
        <p className="py-12 text-center text-sm text-[var(--muted)]">暂无标签</p>
      ) : (
        <ul className="sora-taxonomy-list">
          {tags.map((tag) => (
            <li key={tag.id}>
              <Link className="sora-taxonomy-chip" href={`/tags/${tag.slug}`}>
                <Tag aria-hidden="true" size={16} strokeWidth={2} />
                <span>{tag.name}</span>
                <span>{tag.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
