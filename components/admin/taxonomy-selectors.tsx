"use client";

import { Combobox } from "@/components/ui/combobox";
import { MultiSelect } from "@/components/ui/multi-select";
import type { TaxonomyItem } from "@/lib/content/service";

interface TaxonomySelectorProps {
  form?: string;
  items: TaxonomyItem[];
  selected: TaxonomyItem[];
}

function taxonomyOptions(items: TaxonomyItem[]) {
  return items.map((item) => ({ value: item.id, label: item.name }));
}

export function CategorySelect({ form, items, selected }: TaxonomySelectorProps) {
  return (
    <Combobox
      defaultValue={selected[0]?.id ?? ""}
      form={form}
      label="分类"
      name="categoryIds"
      options={[{ value: "", label: "未分类" }, ...taxonomyOptions(items)]}
    />
  );
}

export function TagMultiSelect({ form, items, selected }: TaxonomySelectorProps) {
  return (
    <MultiSelect
      defaultValue={selected.map((item) => item.id)}
      form={form}
      label="标签"
      name="tagIds"
      options={taxonomyOptions(items)}
      placeholder="选择标签"
    />
  );
}
