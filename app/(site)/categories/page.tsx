import { Folder } from "lucide-react";
import Link from "next/link";

import { listCategories } from "@/lib/content/service";

export const metadata = { title: "分类" };

export default function CategoriesPage() {
  const categories = listCategories();
  return (
    <div className="sora-taxonomy-page">
      <h1 className="sr-only">分类</h1>
      {categories.length === 0 ? (
        <p className="py-12 text-center text-sm text-[var(--muted)]">暂无分类</p>
      ) : (
        <ul className="sora-taxonomy-list">
          {categories.map((category) => (
            <li key={category.slug}>
              <Link className="sora-taxonomy-chip" href={`/categories/${category.slug}`}>
                <Folder aria-hidden="true" size={17} strokeWidth={2} />
                <span>{category.name}</span>
                <span>{category.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
