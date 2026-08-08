# Sora Admin UI System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every visible admin, login, and setup form control with a cohesive Radix-backed Sora UI system and reorganize the full admin information architecture without changing business or database behavior.

**Architecture:** Add a local `components/ui/` layer for styling, form semantics, selection, overlays, and feedback. Keep Server Components as the default; use Client Components only for Radix state, `useActionState`, uploads, editor state, and dialogs. Migrate page groups incrementally so old CSS remains until its final consumer is gone.

**Tech Stack:** Next.js 16.3, React 19.2, TypeScript 6, Tailwind CSS 4, Radix React primitives, cmdk, Lucide React, Vitest, Testing Library, Playwright.

## Global Constraints

- Use Node.js `>=22.0.0` and pnpm `10.26.2`.
- Use black, white, and gray for surfaces and text; use `#82045b` as the only brand accent.
- Desktop controls are 40px high; mobile touch targets are at least 44px high.
- Controls use 6px radii; surfaces and dialogs use 8px radii with three restrained shadow levels.
- Do not change the database Schema, migrations, public-site visual system, Markdown editor engine, routes, permission checks, or service-layer business behavior.
- Add only the approved Radix primitives and `cmdk`; keep Lucide React as the icon source.
- Keep `requireAdminSession()` before every protected mutation.
- Follow red-green-refactor for each task and do not batch unrelated cleanup.
- Do not stage `.superpowers/` visual-companion artifacts.

---

### Task 1: Theme Tokens and Native Form Foundation

**Files:**
- Create: `components/ui/cn.ts`
- Create: `components/ui/button.tsx`
- Create: `components/ui/input.tsx`
- Create: `components/ui/textarea.tsx`
- Create: `components/ui/field.tsx`
- Create: `components/ui/form-message.tsx`
- Create: `lib/forms/action-state.ts`
- Create: `app/admin-ui.css`
- Modify: `app/globals.css`
- Test: `tests/unit/ui-form-foundation.test.tsx`

**Interfaces:**
- Produces: `cn(...values: Array<string | false | null | undefined>): string`.
- Produces: `FormActionState<FieldName extends string> = { status?: "idle" | "success" | "error"; fieldErrors?: Partial<Record<FieldName, string>>; formError?: string }`.
- Produces: `Button`, `IconButton`, `Input`, `Textarea`, `Field`, `FormMessage` with forwarded refs and native element props.
- Consumes: existing CSS variables only as migration fallbacks; new admin/auth components use `--admin-*` tokens.

- [ ] **Step 1: Write failing foundation tests**

```tsx
test("connects labels, help, and errors to the input", () => {
  render(
    <Field label="站点名称" description="显示在页头" error="请输入站点名称">
      <Input name="title" />
    </Field>,
  );
  const input = screen.getByRole("textbox", { name: "站点名称" });
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(input.getAttribute("aria-describedby")).toContain("description");
  expect(input.getAttribute("aria-describedby")).toContain("error");
});

test("exposes loading without changing button dimensions", () => {
  render(<Button loading>保存设置</Button>);
  expect(screen.getByRole("button", { name: "正在处理" })).toBeDisabled();
  expect(screen.getByRole("button")).toHaveClass("ui-button");
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `corepack pnpm@10.26.2 test tests/unit/ui-form-foundation.test.tsx`

Expected: FAIL because `@/components/ui/field`, `input`, and `button` do not exist.

- [ ] **Step 3: Implement the shared types and native controls**

```ts
export type FormActionState<FieldName extends string = string> = {
  status?: "idle" | "success" | "error";
  fieldErrors?: Partial<Record<FieldName, string>>;
  formError?: string;
};

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
```

`Field` must clone its single form-control child with generated `id`, `aria-invalid`, and `aria-describedby`; error and description IDs must be stable through `useId()`.

- [ ] **Step 4: Add the exact admin theme tokens**

```css
:root {
  --admin-accent: #82045b;
  --admin-accent-hover: #6f034d;
  --admin-bg: #f4f4f6;
  --admin-surface: #ffffff;
  --admin-surface-muted: #f8f8fa;
  --admin-sidebar: #151518;
  --admin-text: #19191d;
  --admin-muted: #6f6f77;
  --admin-border: #d9d9de;
  --admin-danger: #b42318;
  --admin-radius-control: 6px;
  --admin-radius-surface: 8px;
  --admin-shadow-surface: 0 4px 14px rgb(18 18 20 / 8%);
  --admin-shadow-popover: 0 12px 30px rgb(18 18 20 / 16%);
  --admin-shadow-dialog: 0 24px 60px rgb(18 18 20 / 24%);
}
```

Import `admin-ui.css` from `app/globals.css` after Tailwind. Scope component rules to `.admin-shell`, `.auth-shell`, and `.ui-*` classes so the public site does not change.

- [ ] **Step 5: Run focused tests and static checks**

Run: `corepack pnpm@10.26.2 test tests/unit/ui-form-foundation.test.tsx`

Run: `corepack pnpm@10.26.2 typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/admin-ui.css app/globals.css components/ui lib/forms tests/unit/ui-form-foundation.test.tsx
git commit -m "feat: add admin form foundation"
```

---

### Task 2: Radix Selection, Overlay, and Feedback Components

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `components/ui/select.tsx`
- Create: `components/ui/checkbox.tsx`
- Create: `components/ui/switch.tsx`
- Create: `components/ui/combobox.tsx`
- Create: `components/ui/multi-select.tsx`
- Create: `components/ui/dialog.tsx`
- Create: `components/ui/confirm-dialog.tsx`
- Create: `components/ui/tabs.tsx`
- Create: `components/ui/tooltip.tsx`
- Create: `components/ui/toast.tsx`
- Create: `components/ui/ui-provider.tsx`
- Modify: `app/admin-ui.css`
- Test: `tests/unit/ui-selection-controls.test.tsx`
- Test: `tests/unit/ui-overlays.test.tsx`

**Interfaces:**
- Consumes: `cn`, `Field`, `Input`, `Button`, and admin tokens from Task 1.
- Produces: `SelectOption = { value: string; label: string; disabled?: boolean }`.
- Produces: `SelectField({ name, label, options, defaultValue, placeholder, error })` that submits one string value.
- Produces: `MultiSelect({ name, label, options, defaultValue })` that submits repeated hidden inputs with the same name.
- Produces: `Dialog`, `ConfirmDialog`, `Tabs`, `Tooltip`, `ToastProvider`, and `useToast()`.

- [ ] **Step 1: Install approved dependencies**

Run:

```bash
corepack pnpm@10.26.2 add @radix-ui/react-checkbox @radix-ui/react-dialog @radix-ui/react-label @radix-ui/react-popover @radix-ui/react-select @radix-ui/react-switch @radix-ui/react-tabs @radix-ui/react-toast @radix-ui/react-tooltip cmdk
```

Expected: `package.json` and `pnpm-lock.yaml` update without another UI framework.

- [ ] **Step 2: Write failing selection tests**

```tsx
test("select submits the chosen value and restores trigger focus", async () => {
  render(<SelectField label="状态" name="status" options={statusOptions} />);
  const trigger = screen.getByRole("combobox", { name: "状态" });
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole("option", { name: "已发布" }));
  expect(trigger).toHaveFocus();
  expect(document.querySelector('[name="status"]')).toHaveValue("PUBLISHED");
});

test("multi-select searches, selects, and emits repeated form values", async () => {
  render(<MultiSelect label="标签" name="tagIds" options={tagOptions} defaultValue={["a"]} />);
  fireEvent.click(screen.getByRole("button", { name: "选择标签" }));
  fireEvent.change(screen.getByRole("combobox", { name: "搜索标签" }), { target: { value: "Beta" } });
  fireEvent.click(screen.getByRole("checkbox", { name: "Beta" }));
  expect(document.querySelectorAll('[name="tagIds"]')).toHaveLength(2);
});
```

- [ ] **Step 3: Verify selection tests fail**

Run: `corepack pnpm@10.26.2 test tests/unit/ui-selection-controls.test.tsx`

Expected: FAIL because the components do not exist.

- [ ] **Step 4: Implement Select, Checkbox, Switch, Combobox, and MultiSelect**

Use Radix `name` support where available. `MultiSelect` must render one hidden input per selected value, keep chips within their container, expose selected state through Checkbox, and return focus to its trigger after Escape.

```ts
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface MultiSelectProps {
  name: string;
  label: string;
  options: SelectOption[];
  defaultValue?: string[];
  placeholder?: string;
  searchLabel?: string;
  emptyMessage?: string;
}
```

- [ ] **Step 5: Write failing overlay tests**

```tsx
test("confirm dialog only submits after explicit confirmation", async () => {
  const onConfirm = vi.fn();
  render(<ConfirmDialog title="删除友链" description="此操作无法撤销" onConfirm={onConfirm} />);
  fireEvent.click(screen.getByRole("button", { name: "删除友链" }));
  fireEvent.click(screen.getByRole("button", { name: "确认删除" }));
  expect(onConfirm).toHaveBeenCalledOnce();
});

test("dialog closes on Escape and restores focus", async () => {
  render(<Dialog trigger="编辑分类" title="编辑分类">内容</Dialog>);
  const trigger = screen.getByRole("button", { name: "编辑分类" });
  fireEvent.click(trigger);
  fireEvent.keyDown(screen.getByRole("dialog", { name: "编辑分类" }), { key: "Escape" });
  expect(trigger).toHaveFocus();
});
```

- [ ] **Step 6: Implement overlay, tab, tooltip, and toast wrappers**

`UIProvider` wraps `Tooltip.Provider` and `Toast.Provider`. Dialog content uses `--admin-shadow-dialog`; popovers and selects use `--admin-shadow-popover`; all overlay portals use deterministic z-index tokens.

- [ ] **Step 7: Run focused tests, lint, and typecheck**

Run: `corepack pnpm@10.26.2 test tests/unit/ui-selection-controls.test.tsx tests/unit/ui-overlays.test.tsx`

Run: `corepack pnpm@10.26.2 lint`

Run: `corepack pnpm@10.26.2 typecheck`

Expected: PASS with no accessibility-role warnings.

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-lock.yaml app/admin-ui.css components/ui tests/unit/ui-selection-controls.test.tsx tests/unit/ui-overlays.test.tsx
git commit -m "feat: add accessible admin UI primitives"
```

---

### Task 3: Admin Shell, Page Templates, Login, and Setup

**Files:**
- Create: `components/admin/admin-navigation.ts`
- Create: `components/admin/admin-page.tsx`
- Create: `components/admin/admin-toolbar.tsx`
- Create: `components/admin/admin-surface.tsx`
- Create: `components/admin/admin-empty-state.tsx`
- Modify: `app/(admin)/admin/layout.tsx`
- Modify: `components/admin/admin-sidebar.tsx`
- Modify: `components/admin/admin-mobile-navigation.tsx`
- Modify: `components/auth/auth-shell.tsx`
- Modify: `app/(auth)/admin/login/login-form.tsx`
- Modify: `app/(auth)/admin/setup/setup-form.tsx`
- Modify: `app/admin-ui.css`
- Test: `tests/unit/admin-shell-ui.test.tsx`
- Test: `tests/integration/auth.test.ts`

**Interfaces:**
- Consumes: `UIProvider`, `Button`, `IconButton`, `Field`, `Input`, `FormMessage`, `Tooltip`.
- Produces: one `adminNavigation` array shared by desktop and mobile navigation.
- Produces: `AdminPage`, `AdminPageHeader`, `AdminToolbar`, `AdminSurface`, and `AdminEmptyState` page composition APIs.

- [ ] **Step 1: Write failing shell and auth tests**

```tsx
test("desktop and mobile navigation share grouped entries", () => {
  render(<AdminSidebar />);
  expect(screen.getByRole("navigation", { name: "后台导航" })).toHaveTextContent("内容");
  expect(screen.getByRole("link", { name: "文章" })).toHaveAttribute("aria-current", "page");
});

test("login uses the shared field and primary button system", () => {
  render(<LoginForm />);
  expect(screen.getByRole("textbox", { name: "邮箱" })).toHaveClass("ui-input");
  expect(screen.getByRole("button", { name: "登录" })).toHaveClass("ui-button-primary");
});
```

- [ ] **Step 2: Verify the new tests fail**

Run: `corepack pnpm@10.26.2 test tests/unit/admin-shell-ui.test.tsx tests/integration/auth.test.ts`

Expected: FAIL on missing shared classes and grouped navigation.

- [ ] **Step 3: Centralize navigation and implement page templates**

```ts
export const adminNavigation = [
  { group: "概览", items: [{ href: "/admin", label: "仪表盘", icon: LayoutDashboard }] },
  { group: "内容", items: [postItem, pageItem, categoryItem, tagItem] },
  { group: "互动", items: [commentItem, friendItem] },
  { group: "管理", items: [mediaItem, menuItem, dataItem, settingsItem] },
] as const;
```

The top bar contains breadcrumb context, user name, site link, and icon-only sign-out. The sidebar uses `#151518`; active navigation uses `#82045b`. Mobile navigation uses Radix Dialog instead of an absolutely positioned custom panel.

- [ ] **Step 4: Migrate login and setup forms**

Replace their local `Field` and button implementations with the shared components. Preserve existing `useActionState`, autocomplete attributes, redirects, and Chinese validation messages. `AuthShell` uses `.auth-shell` and an 8px elevated surface.

- [ ] **Step 5: Run focused verification**

Run: `corepack pnpm@10.26.2 test tests/unit/admin-shell-ui.test.tsx tests/integration/auth.test.ts`

Run: `corepack pnpm@10.26.2 typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app components/admin components/auth tests/unit/admin-shell-ui.test.tsx tests/integration/auth.test.ts
git commit -m "feat: unify admin shell and authentication UI"
```

---

### Task 4: Editor and Settings Form Migration

**Files:**
- Create: `components/admin/editor-settings-panel.tsx`
- Create: `components/admin/settings-form.tsx`
- Modify: `components/admin/content-editor.tsx`
- Modify: `components/admin/taxonomy-selectors.tsx`
- Modify: `app/(admin)/admin/settings/page.tsx`
- Modify: `app/(admin)/admin/settings/actions.ts`
- Modify: `app/(admin)/admin/content-actions.ts`
- Modify: `app/admin-ui.css`
- Test: `tests/unit/admin-editor.test.tsx`
- Create: `tests/unit/admin-settings-ui.test.tsx`
- Modify: `tests/integration/content.test.ts`

**Interfaces:**
- Consumes: `SelectField`, `Combobox`, `MultiSelect`, `Checkbox`, `Field`, `Input`, `Textarea`, `Button`, `Tabs`, `FormActionState`.
- Produces: `EditorSettingsPanel` with desktop side panel and mobile Dialog presentation.
- Produces: settings forms grouped as `identity`, `comments`, `runtime`, and `security` sections.

- [ ] **Step 1: Extend editor tests for shared controls and panel behavior**

```tsx
test("uses accessible shared controls in the editor settings panel", async () => {
  render(<ContentEditor {...editorProps} />);
  fireEvent.click(screen.getByRole("button", { name: "文章设置" }));
  expect(screen.getByRole("combobox", { name: "状态" })).toHaveClass("ui-select-trigger");
  expect(screen.getByRole("combobox", { name: "分类" })).toHaveAttribute("aria-expanded");
  expect(screen.getByRole("button", { name: "选择标签" })).toHaveClass("ui-multi-select-trigger");
});
```

- [ ] **Step 2: Add failing settings tests**

```tsx
test("renders settings sections and shared boolean controls", async () => {
  render(await AdminSettingsPage({ searchParams: Promise.resolve({}) }));
  expect(screen.getByRole("tab", { name: "站点身份" })).toBeVisible();
  expect(screen.getByRole("checkbox", { name: "允许全站评论" })).toHaveClass("ui-checkbox-input");
  expect(screen.getByRole("button", { name: "保存设置" })).toHaveClass("ui-button-primary");
});
```

- [ ] **Step 3: Verify RED**

Run: `corepack pnpm@10.26.2 test tests/unit/admin-editor.test.tsx tests/unit/admin-settings-ui.test.tsx`

Expected: FAIL because old native controls and layout remain.

- [ ] **Step 4: Implement the editor panel and taxonomy selection migration**

Keep the editor title and ByteMD instance in the main area. Move status, visibility, slug, excerpt, comment options, category, tags, and SEO to `EditorSettingsPanel`. Category uses `Combobox`; tags use `MultiSelect`; page content omits post-only taxonomy and comment controls.

- [ ] **Step 5: Implement sectioned settings with field errors**

Create `SettingsForm` as a client boundary. Adapt save actions to return `FormActionState` on validation errors and redirect or revalidate on success. Preserve password session revocation and runtime-config normalization.

```ts
export type SiteSettingsField = "title" | "description" | "authorName" | "avatarUrl" | "email" | "githubUrl" | "footerText";
export type SiteSettingsActionState = FormActionState<SiteSettingsField>;
```

- [ ] **Step 6: Run focused tests and typecheck**

Run: `corepack pnpm@10.26.2 test tests/unit/admin-editor.test.tsx tests/unit/admin-settings-ui.test.tsx tests/integration/content.test.ts`

Run: `corepack pnpm@10.26.2 typecheck`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app components/admin tests/unit/admin-editor.test.tsx tests/unit/admin-settings-ui.test.tsx tests/integration/content.test.ts
git commit -m "feat: redesign editor and settings forms"
```

---

### Task 5: Taxonomy, Menu, and Friend Management Dialogs

**Files:**
- Create: `components/admin/taxonomy-dialog.tsx`
- Create: `components/admin/menu-manager.tsx`
- Create: `components/admin/friend-manager.tsx`
- Modify: `components/admin/taxonomy-manager.tsx`
- Modify: `app/(admin)/admin/categories/page.tsx`
- Modify: `app/(admin)/admin/tags/page.tsx`
- Modify: `app/(admin)/admin/taxonomy-actions.ts`
- Modify: `app/(admin)/admin/menus/page.tsx`
- Modify: `app/(admin)/admin/menus/actions.ts`
- Modify: `app/(admin)/admin/friends/page.tsx`
- Modify: `app/(admin)/admin/friends/actions.ts`
- Delete after replacement: `components/admin/friend-delete-button.tsx`
- Modify: `app/admin-ui.css`
- Modify: `tests/unit/admin-friends.test.ts`
- Create: `tests/unit/admin-record-managers.test.tsx`
- Modify: `tests/integration/friends.test.ts`

**Interfaces:**
- Consumes: `AdminPage`, `AdminToolbar`, `AdminSurface`, `Dialog`, `ConfirmDialog`, `Field`, `Input`, `Textarea`, `Switch`, `Button`, `Pagination`, `FormActionState`.
- Produces: client manager boundaries that receive serializable records and server actions.
- Keeps: `/admin/categories`, `/admin/tags`, `/admin/menus`, and `/admin/friends` routes and existing service calls.

- [ ] **Step 1: Write failing manager interaction tests**

```tsx
test("opens taxonomy creation in a dialog and confirms deletion", async () => {
  render(<TaxonomyManager {...taxonomyProps} />);
  fireEvent.click(screen.getByRole("button", { name: "新建分类" }));
  expect(screen.getByRole("dialog", { name: "新建分类" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "删除产品设计" }));
  expect(screen.getByRole("alertdialog", { name: "删除分类" })).toBeVisible();
});

test("uses switches for friend and menu enabled state", () => {
  render(<FriendManager {...friendProps} />);
  expect(screen.getByRole("switch", { name: "启用 Friend 1" })).toBeChecked();
});
```

- [ ] **Step 2: Verify RED**

Run: `corepack pnpm@10.26.2 test tests/unit/admin-friends.test.ts tests/unit/admin-record-managers.test.tsx`

Expected: FAIL because records are still edited inline and deletes use custom buttons.

- [ ] **Step 3: Migrate taxonomy pages**

Use one responsive list with Edit and Delete icon actions. Create/edit uses `TaxonomyDialog`; delete uses `ConfirmDialog`. Preserve pagination and duplicate/in-use messages. Return field errors for invalid name/slug and keep success redirects compatible with `notice`.

- [ ] **Step 4: Migrate menu and friend pages**

Use list/table rows with logo or label, destination, sort order, enabled state, and actions. Creation/editing uses Dialog. Friend logo accepts HTTPS and `/media/`; menu URLs accept `/` paths or HTTPS. Switch state is included in submitted `FormData`, and no mutation occurs before the dialog form is submitted.

- [ ] **Step 5: Run focused and integration tests**

Run: `corepack pnpm@10.26.2 test tests/unit/admin-friends.test.ts tests/unit/admin-record-managers.test.tsx tests/integration/friends.test.ts`

Run: `corepack pnpm@10.26.2 typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app components/admin tests/unit tests/integration/friends.test.ts
git commit -m "feat: modernize admin record managers"
```

---

### Task 6: Content Lists, Comments, and Dashboard

**Files:**
- Create: `components/admin/admin-data-list.tsx`
- Create: `components/admin/admin-tabs.tsx`
- Modify: `components/admin/content-list.tsx`
- Modify: `app/(admin)/admin/posts/page.tsx`
- Modify: `app/(admin)/admin/pages/page.tsx`
- Modify: `app/(admin)/admin/comments/page.tsx`
- Modify: `app/(admin)/admin/comments/actions.ts`
- Modify: `app/(admin)/admin/page.tsx`
- Modify: `components/site/post-pagination.tsx`
- Modify: `app/admin-ui.css`
- Modify: `tests/unit/admin-pagination.test.ts`
- Create: `tests/unit/admin-list-pages.test.tsx`
- Modify: `tests/e2e/cms.spec.ts`

**Interfaces:**
- Consumes: `AdminPage`, `AdminToolbar`, `AdminSurface`, `AdminEmptyState`, `Tabs`, `Button`, `IconButton`, `Field`, `Textarea`, `Pagination`, `Tooltip`.
- Produces: `AdminDataList` with semantic table layout on desktop and labelled record rows on mobile.
- Keeps: status query parameters, trash behavior, grouped comment service results, and current pagination parser.

- [ ] **Step 1: Write failing page-structure tests**

```tsx
test("content list exposes status tabs, toolbar, and trash", () => {
  render(<ContentList kind="POST" items={items} page={1} totalPages={2} />);
  expect(screen.getByRole("tab", { name: /全部/ })).toBeVisible();
  expect(screen.getByRole("tab", { name: /回收站/ })).toBeVisible();
  expect(screen.getByRole("region", { name: "文章筛选" })).toBeVisible();
});

test("dashboard does not render a create-post action", async () => {
  render(await AdminDashboardPage());
  expect(screen.queryByRole("link", { name: "新建文章" })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Verify RED**

Run: `corepack pnpm@10.26.2 test tests/unit/admin-list-pages.test.tsx tests/unit/admin-pagination.test.ts`

Expected: FAIL on missing shared tabs/toolbars and data-list semantics.

- [ ] **Step 3: Migrate content and comment lists**

Content pages use title, status Tabs, search/filter toolbar, desktop data list, mobile rows, empty state, and pagination. Comments retain article-grouped sections; reply textareas use `Field` and `Textarea`; moderation actions use tooltips and consistent danger styling.

- [ ] **Step 4: Migrate dashboard and pagination**

Dashboard uses un-nested summary surfaces and recent-content rows. Do not add a new-post action. Move `PostPagination` styling behind a generic `Pagination` presentation while preserving public-site defaults through an explicit `variant="site" | "admin"` prop.

- [ ] **Step 5: Run focused tests and the content E2E slice**

Run: `corepack pnpm@10.26.2 test tests/unit/admin-list-pages.test.tsx tests/unit/admin-pagination.test.ts`

Run: `corepack pnpm@10.26.2 test:e2e tests/e2e/cms.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app components/admin components/site/post-pagination.tsx tests/unit tests/e2e/cms.spec.ts
git commit -m "feat: unify admin list pages"
```

---

### Task 7: Image and Data Management

**Files:**
- Modify: `app/(admin)/admin/media/page.tsx`
- Modify: `app/(admin)/admin/media/actions.ts`
- Modify: `components/admin/media-manager.tsx`
- Modify: `app/(admin)/admin/data/page.tsx`
- Modify: `components/admin/data-manager.tsx`
- Modify: `app/admin-ui.css`
- Create: `tests/unit/admin-media-ui.test.tsx`
- Create: `tests/unit/admin-data-ui.test.tsx`
- Modify: `tests/e2e/data-management.spec.ts`

**Interfaces:**
- Consumes: `AdminPage`, `AdminToolbar`, `AdminSurface`, `FileInput`, `Dialog`, `Tabs`, `Button`, `IconButton`, `Field`, `Input`, `FormMessage`, `Toast`.
- Keeps: existing upload API, timestamp naming after file selection, three address formats, automatic copy on tab change, pagination, backup, restore, import, and export behavior.

- [ ] **Step 1: Write failing media and data tests**

```tsx
test("uses shared file input and Radix preview dialog", async () => {
  render(<MediaUploadForm action={vi.fn()} />);
  expect(screen.getByLabelText("选择图片")).toHaveClass("ui-file-input-native");
  render(<MediaPreview alt="封面" src="/media/cover.webp" />);
  fireEvent.click(screen.getByRole("button", { name: "放大查看封面" }));
  expect(screen.getByRole("dialog", { name: "图片预览" })).toBeVisible();
});

test("address tabs copy the selected representation", async () => {
  render(<MediaAddressTabs {...addressProps} />);
  fireEvent.click(screen.getByRole("tab", { name: "Markdown" }));
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith("![封面](https://example.com/media/cover.webp)");
});
```

- [ ] **Step 2: Verify RED**

Run: `corepack pnpm@10.26.2 test tests/unit/admin-media-ui.test.tsx tests/unit/admin-data-ui.test.tsx`

Expected: FAIL because custom lightbox, tabs, and native styles remain.

- [ ] **Step 3: Migrate image management**

Replace the custom lightbox with `Dialog`, custom address tabs with shared `Tabs`, and raw file input with `FileInput`. Keep delete next to the image name, maintain pagination, and preserve the exact URL/Markdown/internal-path values.

- [ ] **Step 4: Migrate data management**

Wrap backup, restore, import, and export controls with shared fields and buttons. Preserve current confirmation and progress behavior. Destructive restore uses `ConfirmDialog`; large logs remain in a bounded monospace surface.

- [ ] **Step 5: Run focused and E2E tests**

Run: `corepack pnpm@10.26.2 test tests/unit/admin-media-ui.test.tsx tests/unit/admin-data-ui.test.tsx`

Run: `corepack pnpm@10.26.2 test:e2e tests/e2e/data-management.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app components/admin tests/unit tests/e2e/data-management.spec.ts
git commit -m "feat: redesign media and data management UI"
```

---

### Task 8: Source Audit and Legacy Style Removal

**Files:**
- Modify: `app/globals.css`
- Modify: `app/admin-ui.css`
- Modify only when named by the audit: `app/(admin)/admin/layout.tsx`
- Modify only when named by the audit: `app/(admin)/admin/page.tsx`
- Modify only when named by the audit: `app/(admin)/admin/categories/page.tsx`
- Modify only when named by the audit: `app/(admin)/admin/comments/page.tsx`
- Modify only when named by the audit: `app/(admin)/admin/data/page.tsx`
- Modify only when named by the audit: `app/(admin)/admin/friends/page.tsx`
- Modify only when named by the audit: `app/(admin)/admin/media/page.tsx`
- Modify only when named by the audit: `app/(admin)/admin/menus/page.tsx`
- Modify only when named by the audit: `app/(admin)/admin/pages/page.tsx`
- Modify only when named by the audit: `app/(admin)/admin/posts/page.tsx`
- Modify only when named by the audit: `app/(admin)/admin/settings/page.tsx`
- Modify only when named by the audit: `app/(admin)/admin/tags/page.tsx`
- Modify only when named by the audit: `app/(auth)/admin/login/login-form.tsx`
- Modify only when named by the audit: `app/(auth)/admin/setup/setup-form.tsx`
- Modify only when named by the audit: `components/admin/admin-mobile-navigation.tsx`
- Modify only when named by the audit: `components/admin/admin-sidebar.tsx`
- Modify only when named by the audit: `components/admin/content-editor.tsx`
- Modify only when named by the audit: `components/admin/content-list.tsx`
- Modify only when named by the audit: `components/admin/data-manager.tsx`
- Modify only when named by the audit: `components/admin/media-manager.tsx`
- Modify only when named by the audit: `components/admin/taxonomy-manager.tsx`
- Modify only when named by the audit: `components/admin/taxonomy-selectors.tsx`
- Modify only when named by the audit: `components/auth/auth-shell.tsx`
- Create: `tests/unit/admin-ui-audit.test.ts`
- Modify: `tests/unit/site-ui.test.ts`

**Interfaces:**
- Consumes: every shared component and migrated page from Tasks 1-7.
- Produces: a source-level guard that prevents visible raw selects, checkboxes, and legacy form classes from returning to admin/auth code.
- Keeps: public-site selectors and ByteMD vendor styles.

- [ ] **Step 1: Write the failing audit test**

```ts
test("admin and auth pages do not use legacy visible controls", () => {
  const files = adminAndAuthSourceFiles();
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    expect(source, file).not.toMatch(/className="[^"]*form-(?:input|textarea)/);
    expect(source, file).not.toMatch(/<select\b/);
    expect(source, file).not.toMatch(/<input[^>]+type="checkbox"/);
  }
});
```

Exclude hidden inputs, ByteMD internals, and the implementation files under `components/ui/` from the raw-control audit.

- [ ] **Step 2: Verify the audit fails on remaining legacy consumers**

Run: `corepack pnpm@10.26.2 test tests/unit/admin-ui-audit.test.ts`

Expected: FAIL and list every remaining admin/auth source file.

- [ ] **Step 3: Migrate every reported consumer**

Replace only reported visible controls with the matching shared component. Re-run the audit after each file until it passes. Preserve hidden inputs and native file internals owned by `FileInput`.

Use this exact replacement map:

- `<select>` becomes `SelectField` or `Combobox`.
- visible `<input type="checkbox">` becomes `Checkbox` or `Switch` according to the confirmed interaction rule.
- `.form-input` becomes `Input`, `SelectField`, `Combobox`, or `FileInput` according to input type.
- `.form-textarea` becomes `Textarea` inside `Field`.
- legacy submit and icon buttons become `Button` or `IconButton`.

- [ ] **Step 4: Remove unused legacy CSS**

Run:

```bash
rg -n "form-input|form-textarea|admin-filter|admin-lightbox|admin-tabs|taxonomy-tag-" app components
```

Delete a legacy rule only when `rg` reports no remaining consumer outside `components/ui/` and public-site code. Update `site-ui.test.ts` to assert that public typography, post images, and site navigation styles remain present.

- [ ] **Step 5: Run the full unit/integration suite and static checks**

Run: `corepack pnpm@10.26.2 test`

Run: `corepack pnpm@10.26.2 lint`

Run: `corepack pnpm@10.26.2 typecheck`

Run: `corepack pnpm@10.26.2 exec prettier --check app/admin-ui.css app/globals.css "app/(admin)" "app/(auth)" components/admin components/auth components/ui tests`

Expected: PASS; no raw-control audit failures.

- [ ] **Step 6: Commit**

```bash
git add app components tests
git commit -m "refactor: remove legacy admin form styles"
```

---

### Task 9: Browser Acceptance and Production Verification

**Files:**
- Modify: `tests/e2e/smoke.spec.ts`
- Modify: `tests/e2e/cms.spec.ts`
- Modify: `tests/e2e/data-management.spec.ts`
- Create: `.superpowers/sdd/2026-08-08-admin-ui-system/verification.md` (ignored local evidence; do not stage)

**Interfaces:**
- Consumes: the complete UI system and all migrated pages.
- Produces: repeatable Playwright coverage and local verification evidence.

- [ ] **Step 1: Add failing E2E assertions for the new UI contract**

```ts
await expect(page.locator(".admin-shell")).toHaveCSS("--admin-accent", "#82045b");
await expect(page.getByRole("combobox", { name: "状态" })).toBeVisible();
await page.getByRole("button", { name: "新建分类" }).click();
await expect(page.getByRole("dialog", { name: "新建分类" })).toBeVisible();
await expect(page.locator("html")).not.toHaveCSS("overflow-x", "scroll");
```

Cover login, setup redirect behavior, admin navigation, editor settings, category/tag dialogs, friend/menu dialogs, comment moderation, image upload/preview, data management, and trash restoration.

- [ ] **Step 2: Run E2E and fix only contract failures**

Run: `corepack pnpm@10.26.2 test:e2e`

Expected: PASS. For failures, record the exact route, viewport, selector, and screenshot before changing code.

- [ ] **Step 3: Capture desktop and mobile evidence**

Use Playwright at `1440x900` and `390x844` for dashboard, editor, settings, taxonomy, comments, media, login, and setup. Confirm:

- No horizontal overflow or overlapping controls.
- Select/Popover stays within the viewport.
- Dialog content scrolls without hiding actions.
- Text wraps inside buttons, rows, and labels.
- Controls remain 40px desktop and at least 44px mobile.
- Surface, popover, and dialog shadows remain visually distinct.

Write findings and screenshot paths to `.superpowers/sdd/2026-08-08-admin-ui-system/verification.md`.

- [ ] **Step 4: Run final verification**

Run: `corepack pnpm@10.26.2 test`

Run: `corepack pnpm@10.26.2 lint`

Run: `corepack pnpm@10.26.2 typecheck`

Run: `corepack pnpm@10.26.2 build`

Run: `git diff --check`

Expected: every command exits 0; Vitest has 0 failures; Next.js build completes.

- [ ] **Step 5: Commit final E2E coverage**

```bash
git add tests/e2e
git commit -m "test: cover redesigned admin UI workflows"
```
