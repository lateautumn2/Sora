import { ContentEditor } from "@/components/admin/content-editor";
import { listCategories, listTags } from "@/lib/content/service";

export default function NewPostPage() {
  return <ContentEditor categories={listCategories(true)} kind="POST" tags={listTags(true)} />;
}
