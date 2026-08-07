import { ContentList } from "@/components/admin/content-list";
import { listAdminContents } from "@/lib/content/service";

export default function AdminPostsPage() {
  return <ContentList items={listAdminContents("POST")} kind="POST" />;
}
