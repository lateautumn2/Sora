import { MenuManager } from "@/components/admin/menu-manager";
import { listPrimaryMenuItems } from "@/lib/content/service";

export default async function AdminMenusPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const notice = (await searchParams).notice;
  return <MenuManager items={listPrimaryMenuItems(true)} notice={notice} />;
}
