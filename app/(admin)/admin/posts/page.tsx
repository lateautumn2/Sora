import { ContentList } from "@/components/admin/content-list";
import { resolvePage, resolveTotalPages } from "@/lib/content/pagination";
import { countAdminContents, listAdminContents } from "@/lib/content/service";

const POSTS_PAGE_SIZE = 10;

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; page?: string; status?: string }>;
}) {
  const query = await searchParams;
  const showTrash = query.status === "TRASHED";
  const page = resolvePage(query.page);
  const status = showTrash ? "TRASHED" : "ACTIVE";
  const total = countAdminContents("POST", status);
  return (
    <ContentList
      items={listAdminContents("POST", POSTS_PAGE_SIZE, (page - 1) * POSTS_PAGE_SIZE, status)}
      kind="POST"
      notice={query.notice}
      page={page}
      showTrash={showTrash}
      totalPages={resolveTotalPages(total, POSTS_PAGE_SIZE)}
    />
  );
}
