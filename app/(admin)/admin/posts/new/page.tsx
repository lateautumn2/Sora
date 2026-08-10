import { ContentEditor } from "@/components/admin/content-editor";
import { listCategories, listTags } from "@/lib/content/service";
import { listMediaForSelection } from "@/lib/media/service";

export default function NewPostPage() {
  return (
    <ContentEditor
      categories={listCategories(true)}
      kind="POST"
      media={listMediaForSelection()}
      tags={listTags(true)}
    />
  );
}
