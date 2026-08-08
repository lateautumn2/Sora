"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useActionState, useRef } from "react";

import {
  deleteCategoryAction,
  deleteTagAction,
  saveCategoryAction,
  saveTagAction,
  type TaxonomyActionState,
} from "@/app/(admin)/admin/taxonomy-actions";
import { AdminPage, AdminPageHeader } from "@/components/admin/admin-page";
import { AdminSurface } from "@/components/admin/admin-surface";
import { TaxonomyDialog } from "@/components/admin/taxonomy-dialog";
import { Button, IconButton } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormMessage } from "@/components/ui/form-message";
import { PostPagination } from "@/components/site/post-pagination";
import type { TaxonomyItem } from "@/lib/content/service";

interface TaxonomyManagerProps {
  basePath: string;
  items: TaxonomyItem[];
  noun: string;
  notice?: string;
  page: number;
  totalPages: number;
  type: "category" | "tag";
}

const notices: Record<string, string> = {
  saved: "保存成功",
  deleted: "删除成功",
  invalid: "名称或 URL 别名格式不正确",
  duplicate: "名称或 URL 别名已经存在",
  "in-use": "该项仍被内容使用，暂时不能删除",
};

const initialState: TaxonomyActionState = { status: "idle" };

function DeleteTaxonomyControl({
  item,
  noun,
  type,
}: Pick<TaxonomyManagerProps, "noun" | "type"> & { item: TaxonomyItem }) {
  const formRef = useRef<HTMLFormElement>(null);
  const action = type === "category" ? deleteCategoryAction : deleteTagAction;
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} ref={formRef}>
      <input name="id" type="hidden" value={item.id} />
      <ConfirmDialog
        description={`删除后无法恢复${noun}“${item.name}”。`}
        onConfirm={() => formRef.current?.requestSubmit()}
        title={`删除${noun}`}
        trigger={
          <IconButton
            aria-label={`删除${item.name}`}
            className="admin-record-delete-action"
            type="button"
          >
            <Trash2 aria-hidden="true" size={16} />
          </IconButton>
        }
        triggerAsChild
        triggerTooltip="删除"
      />
      {state.formError ? <FormMessage>{state.formError}</FormMessage> : null}
    </form>
  );
}

export function TaxonomyManager({
  basePath,
  items,
  noun,
  notice,
  page,
  totalPages,
  type,
}: TaxonomyManagerProps) {
  const saveAction = type === "category" ? saveCategoryAction : saveTagAction;

  return (
    <AdminPage>
      <AdminPageHeader
        actions={
          <TaxonomyDialog
            action={saveAction}
            noun={noun}
            trigger={
              <Button type="button">
                <Plus aria-hidden="true" size={16} />
                新建{noun}
              </Button>
            }
            triggerAsChild
          />
        }
        description="维护名称、公开 URL 与内容关联。"
        title={noun}
      >
        {notice && notices[notice] ? (
          <p className="admin-notice" role="status">
            {notices[notice]}
          </p>
        ) : null}
      </AdminPageHeader>

      <AdminSurface aria-label={`已有${noun}`}>
        {items.length === 0 ? (
          <p className="admin-record-empty">暂无{noun}</p>
        ) : (
          <div className="admin-record-list">
            {items.map((item) => (
              <article className="admin-record-row" key={item.id}>
                <div className="admin-record-copy">
                  <h2>{item.name}</h2>
                  <p>
                    /{item.slug}
                    {item.description ? ` · ${item.description}` : ""}
                  </p>
                </div>
                <div className="admin-record-meta">{item.count} 篇内容</div>
                <div className="admin-record-actions">
                  <TaxonomyDialog
                    action={saveAction}
                    item={item}
                    noun={noun}
                    trigger={
                      <IconButton aria-label={`编辑 ${item.name}`} type="button">
                        <Pencil aria-hidden="true" size={16} />
                      </IconButton>
                    }
                    triggerAsChild
                    triggerTooltip="编辑"
                  />
                  <DeleteTaxonomyControl item={item} noun={noun} type={type} />
                </div>
              </article>
            ))}
          </div>
        )}
        <PostPagination
          basePath={basePath}
          className="admin-pagination"
          page={page}
          totalPages={totalPages}
          variant="admin"
        />
      </AdminSurface>
    </AdminPage>
  );
}
