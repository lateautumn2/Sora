// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { SetupForm } from "@/app/(auth)/admin/setup/setup-form";
import { AdminMobileNavigation } from "@/components/admin/admin-mobile-navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
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
});
