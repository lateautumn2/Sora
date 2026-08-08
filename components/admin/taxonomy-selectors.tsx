"use client";

import { Combobox } from "@/components/ui/combobox";
import { MultiSelect } from "@/components/ui/multi-select";
import type { TaxonomyItem } from "@/lib/content/service";

interface TaxonomySelectorProps {
  form?: string;
  items: TaxonomyItem[];
  selected: TaxonomyItem[];
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
}

function taxonomyOptions(items: TaxonomyItem[]) {
  return items.map((item) => ({ value: item.id, label: item.name }));
}

export function CategorySelect({ form, items, onValueChange, selected, value }: TaxonomySelectorProps) {
  return (
    <Combobox
      defaultValue={selected[0]?.id ?? ""}
      form={form}
      label="分类"
      name="categoryIds"
      options={[{ value: "", label: "未分类" }, ...taxonomyOptions(items)]}
      onValueChange={(nextValue) => onValueChange?.(nextValue)}
      value={typeof value === "string" ? value : undefined}
    />
  );
}

export function TagMultiSelect({ form, items, onValueChange, selected, value }: TaxonomySelectorProps) {
  return (
    <MultiSelect
      defaultValue={selected.map((item) => item.id)}
      form={form}
      label="标签"
      name="tagIds"
      options={taxonomyOptions(items)}
      onValueChange={(nextValue) => onValueChange?.(nextValue)}
      placeholder="选择标签"
      value={Array.isArray(value) ? value : undefined}
    />
  );
}
