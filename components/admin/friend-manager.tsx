"use client";

import { LoaderCircle, Pencil, Plus, Save, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  deleteFriendLinkAction,
  saveFriendLinkAction,
  type FriendLinkActionState,
} from "@/app/(admin)/admin/friends/actions";
import { AdminPage, AdminPageHeader } from "@/components/admin/admin-page";
import { AdminSurface } from "@/components/admin/admin-surface";
import { Button, IconButton } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FriendLogo } from "@/components/friend-logo";
import { PostPagination } from "@/components/site/post-pagination";

export interface FriendManagerRecord {
  description: string;
  enabled: boolean;
  id: string;
  logoUrl: string;
  name: string;
  sortOrder: number;
  url: string;
}

interface FriendManagerProps {
  friends: FriendManagerRecord[];
  notice?: string;
  page: number;
  totalPages: number;
}

const initialState: FriendLinkActionState = { status: "idle" };
const notices: Record<string, string> = {
  deleted: "友链已删除",
  duplicate: "该友链地址已存在",
  invalid: "友链信息格式不正确，请检查后重试",
  saved: "友链已保存",
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
      {pending ? "正在保存" : "保存友链"}
    </Button>
  );
}

function FriendDialog({
  item,
  page,
  trigger,
  triggerAsChild,
  triggerTooltip,
}: {
  item?: FriendManagerRecord;
  page: number;
  trigger: ReactNode;
  triggerAsChild?: boolean;
  triggerTooltip?: string;
}) {
  const [state, formAction] = useActionState(saveFriendLinkAction, initialState);
  const initialEnabled = item?.enabled ?? true;
  const [enabled, setEnabled] = useState(initialEnabled);
  const [open, setOpen] = useState(false);
  const title = item ? "编辑友链" : "新建友链";

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) setEnabled(initialEnabled);
  }

  return (
    <Dialog
      description="Logo 仅支持 HTTPS 地址或 /media/ 路径。"
      onOpenChange={handleOpenChange}
      open={open}
      title={title}
      trigger={trigger}
      triggerAsChild={triggerAsChild}
      triggerTooltip={triggerTooltip}
    >
      <form action={formAction} className="admin-record-dialog-form">
        {item ? <input name="id" type="hidden" value={item.id} /> : null}
        <input name="page" type="hidden" value={page} />
        {enabled ? <input name="enabled" type="hidden" value="on" /> : null}
        {state.formError ? <FormMessage>{state.formError}</FormMessage> : null}
        <Field error={state.fieldErrors?.name} label="名称">
          <Input defaultValue={item?.name} maxLength={80} name="name" required />
        </Field>
        <Field error={state.fieldErrors?.url} label="网址">
          <Input defaultValue={item?.url} name="url" required type="url" />
        </Field>
        <Field
          description="仅支持 HTTPS 或 /media/ 路径。"
          error={state.fieldErrors?.logoUrl}
          label="Logo 地址"
        >
          <Input defaultValue={item?.logoUrl} inputMode="url" name="logoUrl" type="text" />
        </Field>
        <Field error={state.fieldErrors?.description} label="描述">
          <Input defaultValue={item?.description} maxLength={240} name="description" />
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
              aria-label={`启用 ${item?.name ?? "新友链"}`}
              checked={enabled}
              onCheckedChange={setEnabled}
            />
            启用
          </label>
        </div>
        <div className="ui-dialog-actions">
          <SubmitButton />
        </div>
      </form>
    </Dialog>
  );
}

function DeleteFriendControl({ item, page }: { item: FriendManagerRecord; page: number }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(deleteFriendLinkAction, initialState);
  return (
    <form action={formAction} ref={formRef}>
      <input name="id" type="hidden" value={item.id} />
      <input name="page" type="hidden" value={page} />
      <ConfirmDialog
        description={`删除后无法恢复友链“${item.name}”。`}
        onConfirm={() => formRef.current?.requestSubmit()}
        title="删除友链"
        trigger={
          <IconButton aria-label={`删除${item.name}`} className="admin-record-delete-action">
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

export function FriendManager({ friends, notice, page, totalPages }: FriendManagerProps) {
  return (
    <AdminPage>
      <AdminPageHeader
        actions={
          <FriendDialog
            page={page}
            trigger={
              <Button>
                <Plus aria-hidden="true" size={16} />
                新建友链
              </Button>
            }
            triggerAsChild
          />
        }
        description="维护站点推荐链接、展示顺序与公开状态。"
        title="友链"
      >
        {notice && notices[notice] ? (
          <p className="admin-notice" role="status">
            {notices[notice]}
          </p>
        ) : null}
      </AdminPageHeader>
      <AdminSurface aria-label="已有友链">
        {friends.length === 0 ? (
          <p className="admin-record-empty">暂无友链</p>
        ) : (
          <div className="admin-record-list">
            {friends.map((friend) => (
              <article className="admin-record-row" key={friend.id}>
                <FriendLogo logoUrl={friend.logoUrl} name={friend.name} />
                <div className="admin-record-copy">
                  <h2>{friend.name}</h2>
                  <p>
                    {friend.url}
                    {friend.description ? ` · ${friend.description}` : ""}
                  </p>
                </div>
                <div className="admin-record-meta">
                  顺序 {friend.sortOrder} · {friend.enabled ? "已启用" : "已停用"}
                </div>
                <div className="admin-record-actions">
                  <FriendDialog
                    item={friend}
                    page={page}
                    trigger={
                      <IconButton aria-label={`编辑 ${friend.name}`}>
                        <Pencil aria-hidden="true" size={16} />
                      </IconButton>
                    }
                    triggerAsChild
                    triggerTooltip="编辑"
                  />
                  <DeleteFriendControl item={friend} page={page} />
                </div>
              </article>
            ))}
          </div>
        )}
        <PostPagination
          basePath="/admin/friends"
          className="admin-pagination"
          page={page}
          totalPages={totalPages}
          variant="admin"
        />
      </AdminSurface>
    </AdminPage>
  );
}
