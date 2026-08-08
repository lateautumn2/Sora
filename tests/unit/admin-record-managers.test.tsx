// @vitest-environment jsdom

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { FriendManager } from "@/components/admin/friend-manager";
import { MenuManager } from "@/components/admin/menu-manager";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";

vi.mock("@/app/(admin)/admin/taxonomy-actions", () => ({
  deleteCategoryAction: vi.fn(),
  saveCategoryAction: vi.fn(),
  deleteTagAction: vi.fn(),
  saveTagAction: vi.fn(),
}));

vi.mock("@/app/(admin)/admin/menus/actions", () => ({
  deleteMenuItemAction: vi.fn(),
  saveMenuItemAction: vi.fn(),
}));

vi.mock("@/app/(admin)/admin/friends/actions", () => ({
  deleteFriendLinkAction: vi.fn(),
  saveFriendLinkAction: vi.fn(),
}));

const taxonomyProps = {
  basePath: "/admin/categories",
  items: [
    { id: "category-1", name: "产品设计", slug: "product-design", description: "", count: 0 },
  ],
  noun: "分类",
  page: 1,
  totalPages: 1,
  type: "category" as const,
};

describe("admin record managers", () => {
  test("opens taxonomy creation in a dialog and confirms deletion", () => {
    render(<TaxonomyManager {...taxonomyProps} />);

    fireEvent.click(screen.getByRole("button", { name: "新建分类" }));
    expect(screen.getByRole("dialog", { name: "新建分类" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "关闭" }));
    fireEvent.click(screen.getByRole("button", { name: "删除产品设计" }));
    expect(screen.getByRole("alertdialog", { name: "删除分类" })).toBeVisible();
  });

  test("uses switches for friend and menu enabled state without immediate mutation", () => {
    render(
      <>
        <FriendManager
          friends={[
            {
              description: "",
              enabled: true,
              id: "00000000-0000-4000-8000-000000000001",
              logoUrl: "",
              name: "Friend 1",
              sortOrder: 0,
              url: "https://friend.example.com",
            },
          ]}
          page={1}
          totalPages={1}
        />
        <MenuManager
          items={[
            {
              enabled: true,
              id: "00000000-0000-4000-8000-000000000002",
              label: "关于",
              openInNewTab: false,
              sortOrder: 0,
              url: "/about",
            },
          ]}
        />
      </>,
    );

    fireEvent.click(screen.getByRole("button", { name: "编辑 Friend 1" }));
    expect(screen.getByRole("switch", { name: "启用 Friend 1" })).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "关闭" }));
    fireEvent.click(screen.getByRole("button", { name: "编辑 关于" }));
    expect(screen.getByRole("switch", { name: "启用 关于" })).toBeChecked();
  });

  test("friend dialogs reset unsubmitted create and edit values after reopening", () => {
    render(
      <FriendManager
        friends={[
          {
            description: "",
            enabled: true,
            id: "00000000-0000-4000-8000-000000000001",
            logoUrl: "",
            name: "Friend 1",
            sortOrder: 0,
            url: "https://friend.example.com",
          },
        ]}
        page={1}
        totalPages={1}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "新建友链" }));
    fireEvent.change(within(screen.getByRole("dialog")).getByRole("textbox", { name: "名称" }), {
      target: { value: "未提交的新友链" },
    });
    fireEvent.click(screen.getByRole("button", { name: "关闭" }));
    fireEvent.click(screen.getByRole("button", { name: "新建友链" }));
    expect(within(screen.getByRole("dialog")).getByRole("textbox", { name: "名称" })).toHaveValue(
      "",
    );

    fireEvent.click(screen.getByRole("button", { name: "关闭" }));
    fireEvent.click(screen.getByRole("button", { name: "编辑 Friend 1" }));
    const editDialog = screen.getByRole("dialog");
    fireEvent.change(within(editDialog).getByRole("textbox", { name: "名称" }), {
      target: { value: "未提交的编辑" },
    });
    fireEvent.click(within(editDialog).getByRole("switch", { name: "启用 Friend 1" }));
    fireEvent.click(screen.getByRole("button", { name: "关闭" }));
    fireEvent.click(screen.getByRole("button", { name: "编辑 Friend 1" }));

    expect(within(screen.getByRole("dialog")).getByRole("textbox", { name: "名称" })).toHaveValue(
      "Friend 1",
    );
    expect(screen.getByRole("switch", { name: "启用 Friend 1" })).toBeChecked();
  });
});
