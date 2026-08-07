import { ContentList } from "@/components/admin/content-list";
import { listAdminContents } from "@/lib/content/service";

export default function AdminPagesPage() {
  return <ContentList items={listAdminContents("PAGE")} kind="PAGE" />;
}
