import { TaxonomyManager } from "@/components/admin/taxonomy-manager";
import { listCategories } from "@/lib/content/service";

import { deleteCategoryAction, saveCategoryAction } from "../taxonomy-actions";

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  return (
    <TaxonomyManager
      deleteAction={deleteCategoryAction}
      items={listCategories(true)}
      notice={(await searchParams).notice}
      noun="分类"
      saveAction={saveCategoryAction}
    />
  );
}
