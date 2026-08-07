import { getPublishedContentBySlug } from "@/lib/content/service";

export const metadata = { title: "关于" };

export default function AboutPage() {
  const page = getPublishedContentBySlug("about", "PAGE");
  return (
    <article className="sora-page-article">
      <h1>{page?.title ?? "关于"}</h1>
      {page ? (
        <div className="prose-content" dangerouslySetInnerHTML={{ __html: page.renderedHtml }} />
      ) : (
        <div className="prose-content">
          <p>这里记录技术、生活，以及那些值得慢慢想清楚的事。</p>
          <p>文章重视可验证的经验，也保留尚未得到答案的问题。</p>
        </div>
      )}
    </article>
  );
}
