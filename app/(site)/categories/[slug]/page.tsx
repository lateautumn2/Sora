import { Folder } from "lucide-react";
import { notFound } from "next/navigation";

import { PostList } from "@/components/site/post-list";
import { getTaxonomyPosts } from "@/lib/content/service";
import { decodeSlugParam } from "@/lib/content/validation";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = decodeSlugParam((await params).slug);
  const result = getTaxonomyPosts("category", slug);
  if (!result) notFound();

  return (
    <div className="sora-taxonomy-detail">
      <h1>
        <Folder aria-hidden="true" size={23} strokeWidth={2} />
        {result.taxonomy.name}
      </h1>
      <PostList posts={result.posts} />
    </div>
  );
}
