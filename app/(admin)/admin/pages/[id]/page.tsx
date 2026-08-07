import { notFound } from "next/navigation";

import { ContentEditor } from "@/components/admin/content-editor";
import { getAdminContentById } from "@/lib/content/service";

export default async function EditPagePage({ params }: { params: Promise<{ id: string }> }) {
  const content = getAdminContentById((await params).id);
  if (!content || content.kind !== "PAGE") notFound();
  return <ContentEditor categories={[]} content={content} kind="PAGE" tags={[]} />;
}
