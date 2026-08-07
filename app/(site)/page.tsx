import { GitFork, Mail, Rss, Search } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { PostList } from "@/components/site/post-list";
import { resolveSiteNavigation } from "@/components/site/site-navigation";
import { getSiteSettings, listPrimaryMenuItems, listPublishedPosts } from "@/lib/content/service";

export default function HomePage() {
  const settings = getSiteSettings();
  const posts = listPublishedPosts(10);
  const navigation = resolveSiteNavigation(listPrimaryMenuItems());
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
          <div className="sora-social-links">
            {settings.githubUrl ? (
              <a
                aria-label="GitHub"
                href={settings.githubUrl}
                rel="noreferrer"
                target="_blank"
                title="GitHub"
              >
                <GitFork aria-hidden="true" size={20} />
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
            <Link aria-label="搜索" href="/search" title="搜索">
              <Search aria-hidden="true" size={17} strokeWidth={2.5} />
            </Link>
          </nav>
        </div>
      </header>

      <section aria-label="文章列表" className="sora-home-posts">
        <PostList posts={posts} />
      </section>
    </div>
  );
}
