import { TaxonomyManager } from "@/components/admin/taxonomy-manager";
import { listTags } from "@/lib/content/service";

import { deleteTagAction, saveTagAction } from "../taxonomy-actions";

export default async function AdminTagsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  return (
    <TaxonomyManager
      deleteAction={deleteTagAction}
      items={listTags(true)}
      notice={(await searchParams).notice}
      noun="标签"
      saveAction={saveTagAction}
    />
  );
}
