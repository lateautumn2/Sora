"use client";

import { useId, useRef, useState } from "react";

import type { TaxonomyItem } from "@/lib/content/service";

interface TaxonomySelectorProps {
  items: TaxonomyItem[];
  selected: TaxonomyItem[];
}

export function CategorySelect({ items, selected }: TaxonomySelectorProps) {
  return (
    <label className="content-editor-taxonomy taxonomy-category-select">
      <span className="text-sm font-medium">分类</span>
      <select className="form-input" defaultValue={selected[0]?.id ?? ""} name="categoryIds">
        <option value="">未分类</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TagMultiSelect({ items, selected }: TaxonomySelectorProps) {
  const [selectedIds, setSelectedIds] = useState(() => new Set(selected.map((item) => item.id)));
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();
  const selectedItems = items.filter((item) => selectedIds.has(item.id));

  function closeListbox() {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function toggleTag(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <fieldset className="content-editor-taxonomy taxonomy-tag-select">
      <legend className="text-sm font-medium">标签</legend>
      <div className="taxonomy-tag-control">
        <div className="taxonomy-tag-chips">
          {selectedItems.map((item) => (
            <span className="taxonomy-tag-chip" key={item.id}>
              {item.name}
              <button
                aria-label={`移除 ${item.name}`}
                onClick={() => toggleTag(item.id)}
                type="button"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <button
          aria-controls={listboxId}
          aria-expanded={open}
          className="form-input taxonomy-tag-trigger"
          onClick={() => setOpen((current) => !current)}
          onKeyDown={(event) => {
            if (open && event.key === "Escape") {
              event.preventDefault();
              closeListbox();
            }
          }}
          ref={triggerRef}
          type="button"
        >
          选择标签
        </button>
        {open ? (
          <div
            aria-label="标签选项"
            className="taxonomy-tag-menu"
            id={listboxId}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                closeListbox();
              }
            }}
            role="group"
          >
            {items.map((item) => {
              const isSelected = selectedIds.has(item.id);
              return (
                <button
                  aria-pressed={isSelected}
                  className="taxonomy-tag-option"
                  key={item.id}
                  onClick={() => toggleTag(item.id)}
                  type="button"
                >
                  {item.name}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      {[...selectedIds].map((id) => (
        <input key={id} name="tagIds" type="hidden" value={id} />
      ))}
    </fieldset>
  );
}
