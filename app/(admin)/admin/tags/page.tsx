import { TaxonomyManager } from "@/components/admin/taxonomy-manager";
import { resolvePage, resolveTotalPages } from "@/lib/content/pagination";
import { countTaxonomies, listTags } from "@/lib/content/service";

export default async function AdminTagsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; page?: string }>;
}) {
  const query = await searchParams;
  const page = resolvePage(query.page);
  const pageSize = 10;
  const total = countTaxonomies("tag");
  return (
    <TaxonomyManager
      items={listTags(true, pageSize, (page - 1) * pageSize)}
      notice={query.notice}
      noun="标签"
      page={page}
      totalPages={resolveTotalPages(total, pageSize)}
      basePath="/admin/tags"
      type="tag"
    />
  );
}
