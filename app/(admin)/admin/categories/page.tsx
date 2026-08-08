import { TaxonomyManager } from "@/components/admin/taxonomy-manager";
import { resolvePage, resolveTotalPages } from "@/lib/content/pagination";
import { countTaxonomies, listCategories } from "@/lib/content/service";

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; page?: string }>;
}) {
  const query = await searchParams;
  const page = resolvePage(query.page);
  const pageSize = 10;
  const total = countTaxonomies("category");
  return (
    <TaxonomyManager
      items={listCategories(true, pageSize, (page - 1) * pageSize)}
      notice={query.notice}
      noun="分类"
      page={page}
      totalPages={resolveTotalPages(total, pageSize)}
      basePath="/admin/categories"
      type="category"
    />
  );
}
