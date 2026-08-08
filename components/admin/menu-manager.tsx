"use client";

import { LoaderCircle, Pencil, Plus, Save, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  deleteMenuItemAction,
  saveMenuItemAction,
  type MenuItemActionState,
} from "@/app/(admin)/admin/menus/actions";
import { AdminPage, AdminPageHeader } from "@/components/admin/admin-page";
import { AdminSurface } from "@/components/admin/admin-surface";
import { Button, IconButton } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { PrimaryMenuItem } from "@/lib/content/service";

interface MenuManagerProps {
  items: PrimaryMenuItem[];
  notice?: string;
}

const initialState: MenuItemActionState = { status: "idle" };

const notices: Record<string, string> = {
  deleted: "菜单项已删除",
  invalid: "菜单名称或 URL 格式不正确",
  saved: "菜单项已保存",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button loading={pending} type="submit">
      {pending ? (
        <LoaderCircle aria-hidden="true" className="animate-spin" size={16} />
      ) : (
        <Save aria-hidden="true" size={16} />
      )}
      {pending ? "正在保存" : "保存菜单"}
    </Button>
  );
}

function MenuDialog({
  item,
  trigger,
  triggerAsChild,
  triggerTooltip,
}: {
  item?: PrimaryMenuItem;
  trigger: ReactNode;
  triggerAsChild?: boolean;
  triggerTooltip?: string;
}) {
  const [state, formAction] = useActionState(saveMenuItemAction, initialState);
  const [enabled, setEnabled] = useState(item?.enabled ?? true);
  const [openInNewTab, setOpenInNewTab] = useState(item?.openInNewTab ?? false);
  const title = item ? "编辑菜单" : "新建菜单";

  return (
    <Dialog
      description="菜单 URL 仅支持站内 / 路径或 HTTPS 链接。"
      title={title}
      trigger={trigger}
      triggerAsChild={triggerAsChild}
      triggerTooltip={triggerTooltip}
    >
      <form action={formAction} className="admin-record-dialog-form">
        {item ? <input name="id" type="hidden" value={item.id} /> : null}
        {enabled ? <input name="enabled" type="hidden" value="on" /> : null}
        {openInNewTab ? <input name="openInNewTab" type="hidden" value="on" /> : null}
        {state.formError ? <FormMessage>{state.formError}</FormMessage> : null}
        <Field error={state.fieldErrors?.label} label="名称">
          <Input defaultValue={item?.label} maxLength={40} name="label" required />
        </Field>
        <Field error={state.fieldErrors?.url} label="URL">
          <Input defaultValue={item?.url} name="url" required />
        </Field>
        <Field error={state.fieldErrors?.sortOrder} label="顺序">
          <Input
            defaultValue={item?.sortOrder ?? 0}
            max={999}
            min={0}
            name="sortOrder"
            type="number"
          />
        </Field>
        <div className="admin-record-switches">
          <label>
            <Switch
              aria-label={`启用 ${item?.label ?? "新菜单"}`}
              checked={enabled}
              onCheckedChange={setEnabled}
            />
            启用
          </label>
          <label>
            <Switch
              aria-label={`新窗口打开 ${item?.label ?? "新菜单"}`}
              checked={openInNewTab}
              onCheckedChange={setOpenInNewTab}
            />
            新窗口打开
          </label>
        </div>
        <div className="ui-dialog-actions">
          <SubmitButton />
        </div>
      </form>
    </Dialog>
  );
}

function DeleteMenuControl({ item }: { item: PrimaryMenuItem }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(deleteMenuItemAction, initialState);

  return (
    <form action={formAction} ref={formRef}>
      <input name="id" type="hidden" value={item.id} />
      <ConfirmDialog
        description={`删除后无法恢复菜单项“${item.label}”。`}
        onConfirm={() => formRef.current?.requestSubmit()}
        title="删除菜单"
        trigger={
          <IconButton aria-label={`删除${item.label}`} className="admin-record-delete-action">
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

export function MenuManager({ items, notice }: MenuManagerProps) {
  return (
    <AdminPage>
      <AdminPageHeader
        actions={
          <MenuDialog
            trigger={
              <Button>
                <Plus aria-hidden="true" size={16} />
                新建菜单
              </Button>
            }
            triggerAsChild
          />
        }
        description="维护公开站点主导航。"
        title="菜单"
      >
        {notice && notices[notice] ? (
          <p className="admin-notice" role="status">
            {notices[notice]}
          </p>
        ) : null}
      </AdminPageHeader>
      <AdminSurface aria-label="主导航菜单">
        {items.length === 0 ? (
          <p className="admin-record-empty">未配置时将使用默认导航。</p>
        ) : (
          <div className="admin-record-list">
            {items.map((item) => (
              <article className="admin-record-row" key={item.id}>
                <div className="admin-record-copy">
                  <h2>{item.label}</h2>
                  <p>{item.url}</p>
                </div>
                <div className="admin-record-meta">
                  顺序 {item.sortOrder} · {item.enabled ? "已启用" : "已停用"}
                </div>
                <div className="admin-record-actions">
                  <MenuDialog
                    item={item}
                    trigger={
                      <IconButton aria-label={`编辑 ${item.label}`}>
                        <Pencil aria-hidden="true" size={16} />
                      </IconButton>
                    }
                    triggerAsChild
                    triggerTooltip="编辑"
                  />
                  <DeleteMenuControl item={item} />
                </div>
              </article>
            ))}
          </div>
        )}
      </AdminSurface>
    </AdminPage>
  );
}
