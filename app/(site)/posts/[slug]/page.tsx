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
import { formatSoraDate, getElapsedDays } from "@/components/site/site-format";
import { listPublicComments } from "@/lib/comments/service";
import { getPublishedContentBySlug, getSiteSettings } from "@/lib/content/service";
import { decodeSlugParam } from "@/lib/content/validation";
import { getAppUrl } from "@/lib/runtime-config";

const TIME_CHANGE_PHRASES = [
  "时过境迁",
  "沧海桑田",
  "天翻地覆",
  "水流花落",
  "斗转星移",
  "物是人非",
  "时移世易",
  "物换星移",
  "春去秋来",
] as const;

function selectTimeChangePhrase(seed: string): (typeof TIME_CHANGE_PHRASES)[number] {
  let hash = 0;
  for (const character of seed) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return TIME_CHANGE_PHRASES[hash % TIME_CHANGE_PHRASES.length] ?? TIME_CHANGE_PHRASES[0];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const post = getPublishedContentBySlug(decodeSlugParam((await params).slug), "POST");
  if (!post) return {};
  const settings = getSiteSettings();
  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt,
    alternates: post.canonicalUrl ? { canonical: post.canonicalUrl } : undefined,
    openGraph: {
      type: "article",
      siteName: settings.title,
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
  const updatedDays = getElapsedDays(post.updatedAt);
  const timeChangePhrase = selectTimeChangePhrase(`${post.id}:${post.updatedAt}`);
  const postUrl = decodeURI(new URL(`/posts/${encodeURIComponent(post.slug)}`, getAppUrl()).href);

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

      {updatedDays > 30 ? (
        <div className="sora-time-notice">
          <Clock3 aria-hidden="true" size={18} />
          <span>
            本文最后更新于 {updatedDays} 天前，其中的信息可能已经{timeChangePhrase}。
          </span>
        </div>
      ) : null}

      <section className="sora-reading-surface">
        <PostContent html={post.renderedHtml} />
        <PostToc />
      </section>

      <section aria-labelledby="post-license-title" className="sora-license">
        <h2 id="post-license-title">文章许可</h2>
        <p className="sora-license-title">{post.title}</p>
        <p className="sora-license-path">{postUrl}</p>
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
