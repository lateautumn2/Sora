// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import AdminSettingsPage from "@/app/(admin)/admin/settings/page";

vi.mock("@/lib/content/service", () => ({
  getSiteSettings: () => ({
    title: "Sora",
    description: "",
    authorName: "Sora",
    avatarUrl: "",
    email: "",
    githubUrl: "",
    footerText: "",
    allowComments: true,
    requireCommentModeration: true,
  }),
}));

vi.mock("@/lib/runtime-config", () => ({
  getRuntimeConfig: () => ({ appUrl: "https://example.com", trustedOrigins: [] }),
}));

vi.mock("@/app/(admin)/admin/settings/actions", () => ({
  changePasswordAction: vi.fn(),
  saveRuntimeConfigAction: vi.fn(),
  saveSiteSettingsAction: vi.fn(),
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock;

afterEach(cleanup);

describe("admin settings UI", () => {
  test("renders grouped settings sections with shared checkbox and primary button controls", async () => {
    render(await AdminSettingsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("tab", { name: "站点身份" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "评论" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "运行配置" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "安全" })).toBeVisible();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "评论" }), { button: 0 });
    const allowComments = screen.getByRole("checkbox", { name: "允许全站评论" });
    expect(allowComments).toHaveClass("ui-checkbox-input");
    expect(new FormData(allowComments.closest("form")!).getAll("allowComments")).toEqual(["on"]);
    expect(screen.getByRole("button", { name: "保存设置" })).toHaveClass("ui-button-primary");
  });
});
