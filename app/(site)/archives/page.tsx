import Link from "next/link";

import { formatSoraDate } from "@/components/site/site-format";
import { PostPagination } from "@/components/site/post-pagination";
import { countPublishedPosts, listPublishedPosts } from "@/lib/content/service";
import {
  resolvePage,
  resolveTotalPages,
  SITE_PAGE_SIZE,
} from "@/lib/content/pagination";

export const metadata = { title: "归档" };

export default async function ArchivesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = resolvePage((await searchParams).page);
  const posts = listPublishedPosts(SITE_PAGE_SIZE, (page - 1) * SITE_PAGE_SIZE);
  const totalPages = resolveTotalPages(countPublishedPosts());
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
      <PostPagination basePath="/archives" page={page} totalPages={totalPages} />
    </div>
  );
}
