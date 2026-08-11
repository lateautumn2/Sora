"use client";

import { LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  changePasswordAction,
  saveRuntimeConfigAction,
  saveSiteSettingsAction,
  type PasswordActionState,
  type RuntimeConfigActionState,
  type SiteSettingsActionState,
} from "@/app/(admin)/admin/settings/actions";
import { AdminSurface } from "@/components/admin/admin-surface";
import { Button, IconButton } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip } from "@/components/ui/tooltip";
import type { CoverSource, SiteSettings } from "@/lib/content/validation";
import type { RuntimeConfig } from "@/lib/runtime-config";

interface SettingsFormProps {
  runtimeConfig: RuntimeConfig;
  settings: SiteSettings;
}

const initialSiteState: SiteSettingsActionState = { status: "idle" };
const initialRuntimeState: RuntimeConfigActionState = { status: "idle" };
const initialPasswordState: PasswordActionState = { status: "idle" };

function SubmitButton({ children }: { children: string }) {
  const { pending } = useFormStatus();

  return (
    <Button className="ui-button-primary" loading={pending} type="submit">
      {pending ? (
        <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />
      ) : (
        <Save aria-hidden="true" size={17} />
      )}
      {pending ? "正在保存" : children}
    </Button>
  );
}

function CoverSourcesField({
  error,
  initialSources,
}: {
  error?: string;
  initialSources: CoverSource[];
}) {
  const [sources, setSources] = useState(() =>
    initialSources.map((source, index) => ({ ...source, key: `stored-${index}` })),
  );

  return (
    <fieldset className="settings-cover-sources">
      <legend>封面来源</legend>
      <input
        name="coverSourcesJson"
        type="hidden"
        value={JSON.stringify(sources.map(({ name, url }) => ({ name, url })))}
      />
      <div className="settings-cover-source-list">
        {sources.map((source, index) => (
          <div className="settings-cover-source-row" key={source.key}>
            <Input
              aria-label={`封面来源 ${index + 1} 名称`}
              onChange={(event) =>
                setSources((current) =>
                  current.map((item) =>
                    item.key === source.key ? { ...item, name: event.target.value } : item,
                  ),
                )
              }
              placeholder="来源名称"
              value={source.name}
            />
            <Input
              aria-label={`封面来源 ${index + 1} API URL`}
              onChange={(event) =>
                setSources((current) =>
                  current.map((item) =>
                    item.key === source.key ? { ...item, url: event.target.value } : item,
                  ),
                )
              }
              placeholder="https://example.com/random-image"
              type="url"
              value={source.url}
            />
            <Tooltip content="删除来源">
              <IconButton
                aria-label={`删除封面来源 ${source.name || index + 1}`}
                onClick={() =>
                  setSources((current) => current.filter((item) => item.key !== source.key))
                }
              >
                <Trash2 aria-hidden="true" size={16} />
              </IconButton>
            </Tooltip>
          </div>
        ))}
      </div>
      {error ? <FormMessage>{error}</FormMessage> : null}
      <Button
        className="settings-cover-source-add"
        onClick={() =>
          setSources((current) => [...current, { key: crypto.randomUUID(), name: "", url: "" }])
        }
        type="button"
      >
        <Plus aria-hidden="true" size={16} />
        添加来源
      </Button>
    </fieldset>
  );
}

function SiteSettingsHiddenFields({
  includeCommentSettings = true,
  settings,
}: {
  includeCommentSettings?: boolean;
  settings: SiteSettings;
}) {
  return (
    <>
      <input name="title" type="hidden" value={settings.title} />
      <input name="description" type="hidden" value={settings.description} />
      <input name="homeQuoteHtml" type="hidden" value={settings.homeQuoteHtml} />
      <input name="authorName" type="hidden" value={settings.authorName} />
      <input name="avatarUrl" type="hidden" value={settings.avatarUrl} />
      <input name="faviconUrl" type="hidden" value={settings.faviconUrl} />
      <input name="email" type="hidden" value={settings.email} />
      <input name="githubUrl" type="hidden" value={settings.githubUrl} />
      <input name="weiboUrl" type="hidden" value={settings.weiboUrl} />
      <input name="bilibiliUrl" type="hidden" value={settings.bilibiliUrl} />
      <input name="xUrl" type="hidden" value={settings.xUrl} />
      <input name="footerText" type="hidden" value={settings.footerText} />
      <input name="footerQuoteSource" type="hidden" value={settings.footerQuoteSource} />
      <input name="coverSourcesJson" type="hidden" value={JSON.stringify(settings.coverSources)} />
      {includeCommentSettings && settings.allowComments ? (
        <input name="allowComments" type="hidden" value="on" />
      ) : null}
      {includeCommentSettings && settings.requireCommentModeration ? (
        <input name="requireCommentModeration" type="hidden" value="on" />
      ) : null}
    </>
  );
}

export function SettingsForm({ runtimeConfig, settings }: SettingsFormProps) {
  const [siteState, siteAction] = useActionState(saveSiteSettingsAction, initialSiteState);
  const [runtimeState, runtimeAction] = useActionState(
    saveRuntimeConfigAction,
    initialRuntimeState,
  );
  const [passwordState, passwordAction] = useActionState(
    changePasswordAction,
    initialPasswordState,
  );

  return (
    <Tabs
      defaultValue="identity"
      tabs={[
        {
          value: "identity",
          label: "站点身份",
          content: (
            <AdminSurface>
              <form action={siteAction} className="settings-form-grid">
                <input
                  name="allowComments"
                  type="hidden"
                  value={settings.allowComments ? "on" : ""}
                />
                <input
                  name="requireCommentModeration"
                  type="hidden"
                  value={settings.requireCommentModeration ? "on" : ""}
                />
                {siteState.formError ? <FormMessage>{siteState.formError}</FormMessage> : null}
                <Field error={siteState.fieldErrors?.title} label="站点名称">
                  <Input defaultValue={settings.title} name="title" required />
                </Field>
                <Field error={siteState.fieldErrors?.description} label="站点说明">
                  <Textarea defaultValue={settings.description} name="description" />
                </Field>
                <Field error={siteState.fieldErrors?.homeQuoteHtml} label="今日一言">
                  <Textarea
                    defaultValue={settings.homeQuoteHtml}
                    name="homeQuoteHtml"
                    placeholder={'<img src="https://v1.jinrishici.com/all.svg">'}
                    rows={4}
                  />
                </Field>
                <Field error={siteState.fieldErrors?.authorName} label="作者名称">
                  <Input defaultValue={settings.authorName} name="authorName" />
                </Field>
                <div className="settings-form-two-columns">
                  <Field error={siteState.fieldErrors?.avatarUrl} label="头像地址">
                    <Input defaultValue={settings.avatarUrl} name="avatarUrl" type="url" />
                  </Field>
                  <Field error={siteState.fieldErrors?.faviconUrl} label="Favicon 地址">
                    <Input defaultValue={settings.faviconUrl} name="faviconUrl" type="url" />
                  </Field>
                </div>
                <div className="settings-form-two-columns">
                  <Field error={siteState.fieldErrors?.email} label="联系邮箱">
                    <Input defaultValue={settings.email} name="email" type="email" />
                  </Field>
                  <Field error={siteState.fieldErrors?.githubUrl} label="GitHub 地址">
                    <Input defaultValue={settings.githubUrl} name="githubUrl" type="url" />
                  </Field>
                </div>
                <div className="settings-form-two-columns">
                  <Field error={siteState.fieldErrors?.weiboUrl} label="微博地址">
                    <Input defaultValue={settings.weiboUrl} name="weiboUrl" type="url" />
                  </Field>
                  <Field error={siteState.fieldErrors?.bilibiliUrl} label="B站地址">
                    <Input defaultValue={settings.bilibiliUrl} name="bilibiliUrl" type="url" />
                  </Field>
                </div>
                <Field error={siteState.fieldErrors?.xUrl} label="X 地址">
                  <Input defaultValue={settings.xUrl} name="xUrl" type="url" />
                </Field>
                <Field error={siteState.fieldErrors?.footerText} label="页脚文字">
                  <Input defaultValue={settings.footerText} name="footerText" />
                </Field>
                <SelectField
                  defaultValue={settings.footerQuoteSource}
                  label="页脚随机语句"
                  name="footerQuoteSource"
                  options={[
                    { value: "NONE", label: "关闭" },
                    { value: "HITOKOTO", label: "一言" },
                    { value: "GUSHI", label: "古诗词" },
                  ]}
                />
                <CoverSourcesField
                  error={siteState.fieldErrors?.coverSources}
                  initialSources={settings.coverSources}
                />
                <SubmitButton>保存设置</SubmitButton>
              </form>
            </AdminSurface>
          ),
        },
        {
          value: "comments",
          label: "评论",
          content: (
            <AdminSurface>
              <form action={siteAction} className="settings-form-grid">
                <SiteSettingsHiddenFields includeCommentSettings={false} settings={settings} />
                {siteState.formError ? <FormMessage>{siteState.formError}</FormMessage> : null}
                <fieldset className="settings-form-options">
                  <legend>评论设置</legend>
                  <label>
                    <Checkbox
                      className="ui-checkbox-input"
                      defaultChecked={settings.allowComments}
                      name="allowComments"
                    />
                    <span>允许全站评论</span>
                  </label>
                  <label>
                    <Checkbox
                      className="ui-checkbox-input"
                      defaultChecked={settings.requireCommentModeration}
                      name="requireCommentModeration"
                    />
                    <span>评论需要审核</span>
                  </label>
                </fieldset>
                <SubmitButton>保存设置</SubmitButton>
              </form>
            </AdminSurface>
          ),
        },
        {
          value: "runtime",
          label: "运行配置",
          content: (
            <AdminSurface>
              <form action={runtimeAction} className="settings-form-grid">
                {runtimeState.formError ? (
                  <FormMessage>{runtimeState.formError}</FormMessage>
                ) : null}
                <Field error={runtimeState.fieldErrors?.appUrl} label="站点地址">
                  <Input defaultValue={runtimeConfig.appUrl} name="appUrl" required type="url" />
                </Field>
                <Field error={runtimeState.fieldErrors?.trustedOrigins} label="可信来源">
                  <Textarea
                    defaultValue={runtimeConfig.trustedOrigins.join(", ")}
                    name="trustedOrigins"
                    rows={3}
                  />
                </Field>
                <SubmitButton>保存运行配置</SubmitButton>
              </form>
            </AdminSurface>
          ),
        },
        {
          value: "security",
          label: "安全",
          content: (
            <AdminSurface>
              <form action={passwordAction} className="settings-form-grid">
                {passwordState.formError ? (
                  <FormMessage>{passwordState.formError}</FormMessage>
                ) : null}
                <Field error={passwordState.fieldErrors?.currentPassword} label="当前密码">
                  <Input
                    autoComplete="current-password"
                    name="currentPassword"
                    required
                    type="password"
                  />
                </Field>
                <Field error={passwordState.fieldErrors?.newPassword} label="新密码">
                  <Input
                    autoComplete="new-password"
                    minLength={12}
                    name="newPassword"
                    required
                    type="password"
                  />
                </Field>
                <Field error={passwordState.fieldErrors?.confirmPassword} label="确认新密码">
                  <Input
                    autoComplete="new-password"
                    minLength={12}
                    name="confirmPassword"
                    required
                    type="password"
                  />
                </Field>
                <SubmitButton>更新密码</SubmitButton>
              </form>
            </AdminSurface>
          ),
        },
      ]}
    />
  );
}
