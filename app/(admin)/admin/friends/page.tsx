import { FriendManager } from "@/components/admin/friend-manager";
import { resolvePage, resolveTotalPages } from "@/lib/content/pagination";
import { countFriendLinks, listAdminFriendLinks } from "@/lib/friends/service";

const PAGE_SIZE = 10;

export default async function AdminFriendsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; page?: string }>;
}) {
  const query = await searchParams;
  const total = countFriendLinks();
  const totalPages = resolveTotalPages(total, PAGE_SIZE);
  const page = totalPages > 0 ? Math.min(resolvePage(query.page), totalPages) : 1;

  return (
    <FriendManager
      friends={listAdminFriendLinks(PAGE_SIZE, (page - 1) * PAGE_SIZE)}
      notice={query.notice}
      page={page}
      totalPages={totalPages}
    />
  );
}
