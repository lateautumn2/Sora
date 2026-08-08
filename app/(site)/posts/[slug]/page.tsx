import type { Metadata } from "next";
import {
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Clock3,
  FolderOpen,
  Tag,
  Text,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PostInteractions } from "@/components/site/post-interactions";
import { PostBackButton } from "@/components/site/post-back-button";
import { PostContent } from "@/components/site/post-content";
import { PostToc } from "@/components/site/post-toc";
import { formatSoraDate, getPublishedDays } from "@/components/site/site-format";
import { listPublicComments } from "@/lib/comments/service";
import { getPublishedContentBySlug, getSiteSettings } from "@/lib/content/service";
import { decodeSlugParam } from "@/lib/content/validation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const post = getPublishedContentBySlug(decodeSlugParam((await params).slug), "POST");
  if (!post) return {};
  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt,
    alternates: post.canonicalUrl ? { canonical: post.canonicalUrl } : undefined,
    openGraph: {
      type: "article",
      title: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt,
      publishedTime: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
    },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = decodeSlugParam((await params).slug);
  const post = getPublishedContentBySlug(slug, "POST");

  if (!post) {
    notFound();
  }

  const settings = getSiteSettings();
  const publishedDays = getPublishedDays(post.publishedAt);

  return (
    <article className="sora-article">
      <header className="sora-article-header">
        <h1>{post.title}</h1>
        <div className="sora-article-meta">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays aria-hidden="true" size={15} />
            {formatSoraDate(post.publishedAt)}
          </span>
          {post.categories[0] ? (
            <Link
              className="inline-flex items-center gap-1.5"
              href={`/categories/${post.categories[0].slug}`}
            >
              <FolderOpen aria-hidden="true" size={15} />
              {post.categories[0].name}
            </Link>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <Text aria-hidden="true" size={15} />约 {post.wordCount} 字
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 aria-hidden="true" size={15} />
            {post.readingMinutes} 分钟
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ChartNoAxesColumnIncreasing aria-hidden="true" size={15} />
            {post.viewCount}
          </span>
        </div>
      </header>

      <div className="sora-time-notice">
        <Clock3 aria-hidden="true" size={18} />
        <span>本文发布于 {publishedDays} 天前，部分内容可能已经发生变化，请结合当前环境核对。</span>
      </div>

      <section className="sora-reading-surface">
        <PostContent html={post.renderedHtml} />
        <PostToc />
      </section>

      <section aria-labelledby="post-license-title" className="sora-license">
        <h2 id="post-license-title">文章许可</h2>
        <p className="sora-license-title">{post.title}</p>
        <p className="sora-license-path">/posts/{post.slug}</p>
        <dl>
          <div>
            <dt>作者</dt>
            <dd>{settings.authorName || settings.title}</dd>
          </div>
          <div>
            <dt>发布于</dt>
            <dd>{formatSoraDate(post.publishedAt)}</dd>
          </div>
          <div>
            <dt>更新于</dt>
            <dd>{formatSoraDate(post.updatedAt)}</dd>
          </div>
          <div>
            <dt>许可</dt>
            <dd>CC BY-NC-SA 4.0</dd>
          </div>
        </dl>
        {post.categories.length > 0 || post.tags.length > 0 ? (
          <div className="sora-license-taxonomies">
            <div>
              {post.categories.map((category) => (
                <Link
                  className="sora-small-chip"
                  href={`/categories/${category.slug}`}
                  key={category.id}
                >
                  <FolderOpen aria-hidden="true" size={14} />
                  {category.name}
                </Link>
              ))}
            </div>
            <div>
              {post.tags.map((postTag) => (
                <Link className="sora-small-chip" href={`/tags/${postTag.slug}`} key={postTag.id}>
                  <Tag aria-hidden="true" size={14} />
                  {postTag.name}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </section>
      <PostInteractions
        allowComment={settings.allowComments && post.allowComment}
        comments={listPublicComments(post.id)}
        initialUpvoteCount={post.upvoteCount}
        initialViewCount={post.viewCount}
        postId={post.id}
      />
      <PostBackButton />
    </article>
  );
}
