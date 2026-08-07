import Link from "next/link";

import { formatSoraDate } from "@/components/site/site-format";
import { listPublishedPosts } from "@/lib/content/service";

export const metadata = { title: "归档" };

export default function ArchivesPage() {
  const posts = listPublishedPosts(10_000);
  const years = Map.groupBy(posts, (post) =>
    post.publishedAt ? new Date(post.publishedAt).getFullYear() : 0,
  );
  return (
    <div className="sora-archive-page">
      <h1 className="sr-only">归档</h1>
      {posts.length === 0 ? (
        <p className="py-12 text-center text-sm text-[var(--muted)]">暂无公开文章</p>
      ) : (
        Array.from(years.entries()).map(([year, yearPosts]) => (
          <section aria-labelledby={`year-${year}`} className="sora-archive-year" key={year}>
            <h2 id={`year-${year}`}>{year || "未定日期"}</h2>
            <ol>
              {yearPosts.map((post) => (
                <li key={post.slug}>
                  <time
                    dateTime={
                      post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined
                    }
                  >
                    {formatSoraDate(post.publishedAt)}
                  </time>
                  <Link href={`/posts/${post.slug}`}>{post.title}</Link>
                </li>
              ))}
            </ol>
          </section>
        ))
      )}
    </div>
  );
}
