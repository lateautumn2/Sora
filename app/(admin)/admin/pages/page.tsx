import { ContentList } from "@/components/admin/content-list";
import { resolvePage, resolveTotalPages } from "@/lib/content/pagination";
import { countAdminContents, listAdminContents } from "@/lib/content/service";

export default async function AdminPagesPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; page?: string; status?: string }>;
}) {
  const query = await searchParams;
  const showTrash = query.status === "TRASHED";
  const page = resolvePage(query.page);
  const pageSize = 10;
  const status = showTrash ? "TRASHED" : "ACTIVE";
  const total = countAdminContents("PAGE", status);
  return (
    <ContentList
      items={listAdminContents("PAGE", pageSize, (page - 1) * pageSize, status)}
      kind="PAGE"
      notice={query.notice}
      page={page}
      showTrash={showTrash}
      totalPages={resolveTotalPages(total, pageSize)}
    />
  );
}
