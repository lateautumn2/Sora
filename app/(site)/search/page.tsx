import { Search } from "lucide-react";

import { PostList } from "@/components/site/post-list";
import { searchPublishedPosts } from "@/lib/content/service";

export const metadata = { title: "搜索" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q?.trim() ?? "";
  const posts = query ? searchPublishedPosts(query) : [];

  return (
    <div className="sora-search-page">
      <h1>搜索</h1>
      <form action="/search" className="sora-search-form" role="search">
        <label className="sr-only" htmlFor="site-search">
          搜索文章
        </label>
        <input
          className="form-input flex-1"
          defaultValue={query}
          id="site-search"
          name="q"
          placeholder="输入关键词"
          type="search"
        />
        <button className="sora-search-button" title="搜索" type="submit">
          <Search aria-hidden="true" size={18} />
          <span className="sr-only">搜索</span>
        </button>
      </form>
      {query ? (
        <div className="mt-8">
          <PostList emptyText={`暂未找到与“${query}”匹配的文章`} posts={posts} />
        </div>
      ) : (
        <div className="py-12 text-center text-sm text-[var(--muted)]">输入关键词开始搜索</div>
      )}
    </div>
  );
}
