import Link from "next/link";

import type { ContentSummary } from "@/lib/content/service";
import { formatSoraDate } from "@/components/site/site-format";
import { resolveCoverImageUrl } from "@/lib/content/cover-image";

export function PostList({
  posts,
  emptyText = "暂无公开文章",
}: {
  posts: ContentSummary[];
  emptyText?: string;
}) {
  if (posts.length === 0) {
    return <p className="py-12 text-center text-sm text-[var(--muted)]">{emptyText}</p>;
  }

  return (
    <div className="sora-post-list">
      {posts.map((post) => {
        const coverUrl = post.cover
          ? resolveCoverImageUrl(post.cover.url, `${post.id}-${post.updatedAt}`)
          : null;

        return (
          <article className="sora-post-card" key={post.id}>
            <Link
              className={post.cover ? "sora-post-card-link has-cover" : "sora-post-card-link"}
              href={`/posts/${post.slug}`}
            >
              <div className="sora-post-card-copy">
                <h2>{post.title}</h2>
                {post.excerpt ? <p className="sora-post-excerpt">{post.excerpt}</p> : null}
                <time
                  className="sora-post-date"
                  dateTime={post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined}
                >
                  {formatSoraDate(post.publishedAt)}
                </time>
              </div>
              {post.cover && coverUrl ? (
                <div className="sora-post-cover-frame">
                  {/* eslint-disable-next-line @next/next/no-img-element -- Covers may use local media or an administrator-provided URL. */}
                  <img
                    alt={post.cover.altText || `${post.title}封面`}
                    className="sora-post-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    src={coverUrl}
                  />
                </div>
              ) : null}
            </Link>
          </article>
        );
      })}
    </div>
  );
}
