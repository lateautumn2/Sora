import { Folder } from "lucide-react";
import { notFound } from "next/navigation";

import { PostList } from "@/components/site/post-list";
import { PostPagination } from "@/components/site/post-pagination";
import { getTaxonomyPosts } from "@/lib/content/service";
import {
  resolvePage,
  resolveTotalPages,
  SITE_PAGE_SIZE,
} from "@/lib/content/pagination";
import { decodeSlugParam } from "@/lib/content/validation";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ slug }, { page: pageValue }] = await Promise.all([params, searchParams]);
  const page = resolvePage(pageValue);
  const result = getTaxonomyPosts("category", decodeSlugParam(slug), SITE_PAGE_SIZE, (page - 1) * SITE_PAGE_SIZE);
  if (!result) notFound();

  return (
    <div className="sora-taxonomy-detail">
      <h1>
        <Folder aria-hidden="true" size={23} strokeWidth={2} />
        {result.taxonomy.name}
      </h1>
      <PostList posts={result.posts} />
      <PostPagination
        basePath={`/categories/${result.taxonomy.slug}`}
        page={page}
        totalPages={resolveTotalPages(result.total)}
      />
    </div>
  );
}
