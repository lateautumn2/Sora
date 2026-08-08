// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRef } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { SetupForm } from "@/app/(auth)/admin/setup/setup-form";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import { AdminMobileNavigation } from "@/components/admin/admin-mobile-navigation";
import { isAdminNavigationActive } from "@/components/admin/admin-navigation";
import { AdminPage, AdminPageHeader } from "@/components/admin/admin-page";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminSurface } from "@/components/admin/admin-surface";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { LoginForm } from "@/app/(auth)/admin/login/login-form";
import { UIProvider } from "@/components/ui/ui-provider";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/posts",
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock;

afterEach(() => {
  cleanup();
});

describe("admin shell UI", () => {
  test("only marks exact navigation routes and descendants as active", () => {
    expect(isAdminNavigationActive("/admin", "/admin")).toBe(true);
    expect(isAdminNavigationActive("/admin/posts", "/admin/posts")).toBe(true);
    expect(isAdminNavigationActive("/admin/posts/new", "/admin/posts")).toBe(true);
    expect(isAdminNavigationActive("/admin/posts-archive", "/admin/posts")).toBe(false);
  });

  test("desktop and mobile navigation share grouped entries", () => {
    const { unmount } = render(<AdminSidebar />);

    expect(screen.getByRole("navigation", { name: "后台导航" })).toHaveTextContent("内容");
    expect(screen.getByRole("link", { name: "文章" })).toHaveAttribute("aria-current", "page");

    unmount();
    render(
      <UIProvider>
        <AdminMobileNavigation />
      </UIProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "打开后台导航" }));

    expect(screen.getByRole("navigation", { name: "移动端后台导航" })).toHaveTextContent("内容");
    expect(screen.getByRole("link", { name: "文章" })).toHaveAttribute("aria-current", "page");
  });

  test("login uses shared fields and the primary button", () => {
    render(<LoginForm />);

    expect(screen.getByRole("textbox", { name: "邮箱" })).toHaveClass("ui-input");
    expect(screen.getByLabelText("密码")).toHaveClass("ui-input");
    expect(screen.getByRole("button", { name: "登录" })).toHaveClass("ui-button-primary");
  });

  test("setup uses shared fields and the primary button", () => {
    render(<SetupForm />);

    expect(screen.getByRole("textbox", { name: "显示名称" })).toHaveClass("ui-input");
    expect(screen.getByRole("textbox", { name: "邮箱" })).toHaveClass("ui-input");
    expect(screen.getByLabelText("确认密码")).toHaveClass("ui-input");
    expect(screen.getByRole("button", { name: "创建管理员" })).toHaveClass("ui-button-primary");
  });

  test("keeps every mobile navigation target at 44px through the lg breakpoint", () => {
    const adminUiStyles = readFileSync(join(process.cwd(), "app", "admin-ui.css"), "utf8");
    const mobileNavigationStyles = adminUiStyles.split("@media (max-width: 63.9375rem) {")[1] ?? "";

    expect(mobileNavigationStyles).toMatch(
      /\.admin-mobile-navigation-trigger,\s*\.admin-mobile-navigation-header \.ui-icon-button,\s*\.admin-mobile-navigation-link\s*\{[^}]*min-width: 2\.75rem;[^}]*min-height: 2\.75rem;/s,
    );
  });

  test("page composition components forward refs and native props while retaining header children", () => {
    const pageRef = createRef<HTMLDivElement>();
    const headerRef = createRef<HTMLElement>();
    const toolbarRef = createRef<HTMLDivElement>();
    const surfaceRef = createRef<HTMLElement>();
    const emptyStateRef = createRef<HTMLElement>();

    render(
      <>
        <AdminPage aria-label="页面容器" data-testid="page" ref={pageRef}>
          页面内容
        </AdminPage>
        <AdminPageHeader
          actions={<button type="button">保存</button>}
          aria-live="polite"
          data-testid="header"
          ref={headerRef}
          title="页面标题"
        >
          额外标题内容
        </AdminPageHeader>
        <AdminToolbar data-testid="toolbar" ref={toolbarRef} title="工具提示">
          工具栏内容
        </AdminToolbar>
        <AdminSurface data-testid="surface" ref={surfaceRef} title="内容区域">
          内容区域
        </AdminSurface>
        <AdminEmptyState data-testid="empty-state" ref={emptyStateRef} title="空状态">
          空状态补充内容
        </AdminEmptyState>
      </>,
    );

    expect(pageRef.current).toBe(screen.getByTestId("page"));
    expect(headerRef.current).toBe(screen.getByTestId("header"));
    expect(toolbarRef.current).toBe(screen.getByTestId("toolbar"));
    expect(surfaceRef.current).toBe(screen.getByTestId("surface"));
    expect(emptyStateRef.current).toBe(screen.getByTestId("empty-state"));
    expect(screen.getByTestId("page")).toHaveAttribute("aria-label", "页面容器");
    expect(screen.getByTestId("header")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByTestId("toolbar")).toHaveAttribute("title", "工具提示");
    expect(screen.getByTestId("surface")).toHaveAttribute("title", "内容区域");
    expect(screen.getByTestId("header")).toHaveTextContent("额外标题内容");
  });

  test("page composition APIs explicitly use forwardRef", () => {
    const componentFiles = [
      "components/admin/admin-page.tsx",
      "components/admin/admin-toolbar.tsx",
      "components/admin/admin-surface.tsx",
      "components/admin/admin-empty-state.tsx",
    ];

    for (const file of componentFiles) {
      expect(readFileSync(join(process.cwd(), file), "utf8")).toContain("forwardRef");
    }
  });
});
