// @vitest-environment jsdom

import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { deleteFriendLinkAction, saveFriendLinkAction } from "@/app/(admin)/admin/friends/actions";
import AdminFriendsPage from "@/app/(admin)/admin/friends/page";
import { AdminMobileNavigation } from "@/components/admin/admin-mobile-navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { FriendLogo } from "@/components/friend-logo";

const actionMocks = vi.hoisted(() => {
  class MockFriendLinkConflictError extends Error {}

  return {
    deleteFriendLink: vi.fn(),
    FriendLinkConflictError: MockFriendLinkConflictError,
    redirect: vi.fn((url: string): never => {
      throw new Error(`NEXT_REDIRECT:${url}`);
    }),
    requireAdminSession: vi.fn().mockResolvedValue({}),
    revalidatePath: vi.fn(),
    saveFriendLink: vi.fn(),
  };
});

const friendLinks = Array.from({ length: 11 }, (_, index) => ({
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  name: `Friend ${index + 1}`,
  url: `https://friend-${index + 1}.example.com`,
  logoUrl: `https://cdn.example.com/friend-${index + 1}.png`,
  description: `Friend ${index + 1} description`,
  sortOrder: index,
  enabled: index % 2 === 0,
  createdAt: 1_700_000_000_000 + index,
  updatedAt: 1_700_000_000_000 + index,
}));

vi.mock("next/cache", () => ({ revalidatePath: actionMocks.revalidatePath }));

vi.mock("next/navigation", () => ({
  redirect: actionMocks.redirect,
  usePathname: () => "/admin/friends",
}));

vi.mock("@/lib/auth/admin", () => ({ requireAdminSession: actionMocks.requireAdminSession }));

vi.mock("@/lib/friends/service", () => ({
  countFriendLinks: () => friendLinks.length,
  deleteFriendLink: actionMocks.deleteFriendLink,
  FriendLinkConflictError: actionMocks.FriendLinkConflictError,
  listAdminFriendLinks: (limit: number, offset: number) =>
    friendLinks.slice(offset, offset + limit),
  saveFriendLink: actionMocks.saveFriendLink,
}));

function validFriendForm(page = "2") {
  const formData = new FormData();
  formData.set("name", "Saved friend");
  formData.set("url", "https://saved.example.com");
  formData.set("logoUrl", "");
  formData.set("description", "");
  formData.set("sortOrder", "3");
  formData.set("page", page);
  return formData;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("admin friend links", () => {
  test("renders ten friend links and a second page", async () => {
    const page = await AdminFriendsPage({ searchParams: Promise.resolve({}) });
    const { container } = render(page);

    expect(screen.getByRole("heading", { name: "友链" })).toBeVisible();
    expect(container.querySelectorAll(".admin-record-row")).toHaveLength(10);
    expect(container.querySelector('a[href="/admin/friends?page=2"]')).toBeInTheDocument();
  });

  test("opens a friend form with a text logo field that accepts internal media paths", async () => {
    const page = await AdminFriendsPage({ searchParams: Promise.resolve({}) });
    render(page);

    fireEvent.click(screen.getByRole("button", { name: "新建友链" }));

    expect(screen.getByRole("textbox", { name: "Logo 地址" })).toHaveAttribute("inputmode", "url");
    expect(screen.getByRole("textbox", { name: "Logo 地址" })).toHaveAttribute("type", "text");
  });

  test("clamps an extreme page to the last available friend link page", async () => {
    const page = await AdminFriendsPage({ searchParams: Promise.resolve({ page: "999999" }) });
    const { container } = render(page);

    expect(screen.getByText("Friend 11")).toBeVisible();
    expect(container.querySelector<HTMLInputElement>('input[name="page"]')?.value).toBe("2");
  });

  test("desktop and mobile admin navigation expose friend links", () => {
    const { unmount } = render(createElement(AdminSidebar));
    expect(screen.getByRole("link", { name: "友链" })).toHaveAttribute("href", "/admin/friends");
    unmount();

    render(createElement(AdminMobileNavigation));
    fireEvent.click(screen.getByRole("button", { name: "打开后台导航" }));
    expect(screen.getByRole("link", { name: "友链" })).toHaveAttribute("href", "/admin/friends");
  });

  test("authenticates, treats a missing enabled checkbox as false, then revalidates before saving", async () => {
    await expect(saveFriendLinkAction({ status: "idle" }, validFriendForm())).rejects.toThrow(
      "NEXT_REDIRECT:/admin/friends?page=2&notice=saved",
    );

    expect(actionMocks.requireAdminSession).toHaveBeenCalledOnce();
    expect(actionMocks.saveFriendLink).toHaveBeenCalledWith({
      name: "Saved friend",
      url: "https://saved.example.com",
      logoUrl: "",
      description: "",
      sortOrder: 3,
      enabled: false,
    });
    expect(actionMocks.requireAdminSession.mock.invocationCallOrder[0]!).toBeLessThan(
      actionMocks.saveFriendLink.mock.invocationCallOrder[0]!,
    );
    expect(actionMocks.revalidatePath).toHaveBeenNthCalledWith(1, "/admin/friends");
    expect(actionMocks.revalidatePath).toHaveBeenNthCalledWith(2, "/friends");
    expect(actionMocks.revalidatePath.mock.invocationCallOrder[1]!).toBeLessThan(
      actionMocks.redirect.mock.invocationCallOrder[0]!,
    );
  });

  test("redirects invalid and duplicate saves without mutating data", async () => {
    const invalid = validFriendForm("2junk");
    invalid.set("name", "");
    await expect(saveFriendLinkAction({ status: "idle" }, invalid)).resolves.toMatchObject({
      status: "error",
    });
    expect(actionMocks.saveFriendLink).not.toHaveBeenCalled();

    actionMocks.redirect.mockClear();
    actionMocks.saveFriendLink.mockImplementationOnce(() => {
      throw new actionMocks.FriendLinkConflictError();
    });
    await expect(
      saveFriendLinkAction({ status: "idle" }, validFriendForm()),
    ).resolves.toMatchObject({
      fieldErrors: { url: expect.any(String) },
      status: "error",
    });
    expect(actionMocks.revalidatePath).not.toHaveBeenCalled();
  });

  test("authenticates UUID deletion, then revalidates both routes before redirecting", async () => {
    const formData = new FormData();
    formData.set("id", "00000000-0000-4000-8000-000000000001");
    formData.set("page", "2");

    await expect(deleteFriendLinkAction({ status: "idle" }, formData)).rejects.toThrow(
      "NEXT_REDIRECT:/admin/friends?page=2&notice=deleted",
    );

    expect(actionMocks.requireAdminSession).toHaveBeenCalledOnce();
    expect(actionMocks.deleteFriendLink).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000001",
    );
    expect(actionMocks.requireAdminSession.mock.invocationCallOrder[0]!).toBeLessThan(
      actionMocks.deleteFriendLink.mock.invocationCallOrder[0]!,
    );
    expect(actionMocks.revalidatePath).toHaveBeenNthCalledWith(1, "/admin/friends");
    expect(actionMocks.revalidatePath).toHaveBeenNthCalledWith(2, "/friends");
    expect(actionMocks.revalidatePath.mock.invocationCallOrder[1]!).toBeLessThan(
      actionMocks.redirect.mock.invocationCallOrder[0]!,
    );
  });

  test("rejects an invalid deletion id after authenticating", async () => {
    const formData = new FormData();
    formData.set("id", "not-a-uuid");
    formData.set("page", "9007199254740992");

    await expect(deleteFriendLinkAction({ status: "idle" }, formData)).resolves.toMatchObject({
      fieldErrors: { id: expect.any(String) },
      status: "error",
    });
    expect(actionMocks.requireAdminSession).toHaveBeenCalledOnce();
    expect(actionMocks.deleteFriendLink).not.toHaveBeenCalled();
  });

  test("falls back for empty Unicode logos and retries when a new source replaces a failed one", () => {
    const { rerender } = render(createElement(FriendLogo, { logoUrl: "", name: " ångström" }));
    expect(screen.getByRole("img", { name: "ångström Logo" })).toHaveTextContent("Å");

    rerender(
      createElement(FriendLogo, {
        logoUrl: "https://cdn.example.com/broken.png",
        name: "Friend 1",
      }),
    );
    fireEvent.error(screen.getByRole("img", { name: "Friend 1 Logo" }));
    expect(screen.getByRole("img", { name: "Friend 1 Logo" })).toHaveTextContent("F");

    rerender(
      createElement(FriendLogo, {
        logoUrl: "https://cdn.example.com/replacement.png",
        name: "Friend 1",
      }),
    );
    expect(screen.getByRole("img", { name: "Friend 1 Logo" })).toHaveAttribute(
      "src",
      "https://cdn.example.com/replacement.png",
    );
  });
});
