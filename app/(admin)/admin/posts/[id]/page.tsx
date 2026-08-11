import { notFound } from "next/navigation";

import { ContentEditor } from "@/components/admin/content-editor";
import {
  getAdminContentById,
  getSiteSettings,
  listCategories,
  listTags,
} from "@/lib/content/service";
import { listMediaForSelection } from "@/lib/media/service";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const content = getAdminContentById((await params).id);
  if (!content || content.kind !== "POST") notFound();
  return (
    <ContentEditor
      categories={listCategories(true)}
      content={content}
      coverSources={getSiteSettings().coverSources}
      kind="POST"
      media={listMediaForSelection()}
      tags={listTags(true)}
    />
  );
}
