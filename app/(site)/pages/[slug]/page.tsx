import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPublishedContentBySlug } from "@/lib/content/service";
import { decodeSlugParam } from "@/lib/content/validation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const page = getPublishedContentBySlug(decodeSlugParam((await params).slug), "PAGE");
  return page
    ? { title: page.seoTitle || page.title, description: page.seoDescription || page.excerpt }
    : {};
}

export default async function PublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const page = getPublishedContentBySlug(decodeSlugParam((await params).slug), "PAGE");
  if (!page) notFound();
  return (
    <article className="sora-page-article">
      <h1>{page.title}</h1>
      <div className="prose-content" dangerouslySetInnerHTML={{ __html: page.renderedHtml }} />
    </article>
  );
}
