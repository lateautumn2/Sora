import { Mail, Rss } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import {
  countPublishedPosts,
  getSiteSettings,
  listPrimaryMenuItems,
  listPublishedPosts,
} from "@/lib/content/service";
import { PostList } from "@/components/site/post-list";
import { PostPagination } from "@/components/site/post-pagination";
import { SiteSearch } from "@/components/site/site-search";
import { resolveSiteNavigation } from "@/components/site/site-navigation";
import {
  BilibiliIcon,
  GithubIcon,
  WeiboIcon,
  XBrandIcon,
} from "@/components/site/social-brand-icons";
import { resolvePage, resolveTotalPages, SITE_PAGE_SIZE } from "@/lib/content/pagination";
import { sanitizeHomeQuote } from "@/lib/content/render";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = resolvePage((await searchParams).page);
  const settings = getSiteSettings();
  const posts = listPublishedPosts(SITE_PAGE_SIZE, (page - 1) * SITE_PAGE_SIZE);
  const totalPages = resolveTotalPages(countPublishedPosts());
  const navigation = resolveSiteNavigation(listPrimaryMenuItems());
  const homeQuoteHtml = sanitizeHomeQuote(settings.homeQuoteHtml);
  return (
    <div className="sora-home">
      <header className="sora-home-profile">
        <div
          aria-label={`${settings.title} 头像`}
          className="sora-avatar"
          role="img"
          style={settings.avatarUrl ? { backgroundImage: `url(${settings.avatarUrl})` } : undefined}
        >
          {settings.avatarUrl ? null : settings.title.slice(0, 1).toUpperCase()}
        </div>
        <div className="sora-home-identity">
          <h1>{settings.title}</h1>
          {homeQuoteHtml ? (
            <div className="sora-home-quote" dangerouslySetInnerHTML={{ __html: homeQuoteHtml }} />
          ) : null}
          <div className="sora-social-links">
            {settings.githubUrl ? (
              <a
                aria-label="GitHub"
                href={settings.githubUrl}
                rel="noreferrer"
                target="_blank"
                title="GitHub"
              >
                <GithubIcon aria-hidden="true" height={20} width={20} />
              </a>
            ) : null}
            {settings.weiboUrl ? (
              <a
                aria-label="微博"
                href={settings.weiboUrl}
                rel="noreferrer"
                target="_blank"
                title="微博"
              >
                <WeiboIcon aria-hidden="true" height={19} width={19} />
              </a>
            ) : null}
            {settings.bilibiliUrl ? (
              <a
                aria-label="B站"
                href={settings.bilibiliUrl}
                rel="noreferrer"
                target="_blank"
                title="B站"
              >
                <BilibiliIcon aria-hidden="true" height={19} width={19} />
              </a>
            ) : null}
            {settings.xUrl ? (
              <a aria-label="X" href={settings.xUrl} rel="noreferrer" target="_blank" title="X">
                <XBrandIcon aria-hidden="true" height={18} width={18} />
              </a>
            ) : null}
            {settings.email ? (
              <a aria-label="邮件" href={`mailto:${settings.email}`} title="邮件">
                <Mail aria-hidden="true" size={20} />
              </a>
            ) : null}
            <a aria-label="RSS 订阅" href="/rss.xml" title="RSS 订阅">
              <Rss aria-hidden="true" size={19} />
            </a>
          </div>
          <nav aria-label="首页导航" className="sora-home-navigation">
            {navigation.map((item) => (
              <Link
                href={item.href as Route}
                key={item.id}
                rel={item.openInNewTab ? "noreferrer" : undefined}
                target={item.openInNewTab ? "_blank" : undefined}
              >
                {item.label}
              </Link>
            ))}
            <SiteSearch variant="home" />
          </nav>
        </div>
      </header>

      <section aria-label="文章列表" className="sora-home-posts">
        <PostList posts={posts} />
        <PostPagination basePath="/" page={page} totalPages={totalPages} />
      </section>
    </div>
  );
}
