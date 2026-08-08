// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { ContentEditor } from "@/components/admin/content-editor";

vi.mock("@bytemd/plugin-gfm", () => ({ default: () => ({}) }));
vi.mock("@bytemd/react", () => ({
  Editor: () => createElement("div", { "data-testid": "bytemd-editor" }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ back: vi.fn(), push: vi.fn() }) }));
vi.mock("@/app/(admin)/admin/content-actions", () => ({
  saveContentAction: vi.fn(),
  trashContentAction: vi.fn(),
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock;
HTMLElement.prototype.scrollIntoView = () => {};

const categoryA = {
  id: "category-a",
  name: "Category A",
  slug: "category-a",
  description: "",
  count: 0,
};
const categoryB = {
  id: "category-b",
  name: "Category B",
  slug: "category-b",
  description: "",
  count: 0,
};
const categories = [categoryA, categoryB];
const tagA = { id: "tag-a", name: "Tag A", slug: "tag-a", description: "", count: 0 };
const tagB = { id: "tag-b", name: "Tag B", slug: "tag-b", description: "", count: 0 };
const tagC = { id: "tag-c", name: "Tag C", slug: "tag-c", description: "", count: 0 };
const tags = [tagA, tagB, tagC];

const editorProps = {
  kind: "POST" as const,
  categories,
  tags,
  content: {
    id: "post-1",
    kind: "POST" as const,
    title: "编辑器测试文章",
    slug: "editor-test",
    excerpt: "",
    status: "DRAFT" as const,
    visibility: "PUBLIC" as const,
    pinned: false,
    publishedAt: null,
    updatedAt: 0,
    wordCount: 0,
    readingMinutes: 0,
    viewCount: 0,
    upvoteCount: 0,
    commentCount: 0,
    categories: [categoryA],
    tags: [tagA],
    sourceContent: "",
    sourceFormat: "MARKDOWN" as const,
    renderedHtml: "",
    plainText: "",
    allowComment: true,
    seoTitle: "",
    seoDescription: "",
    canonicalUrl: "",
  },
};

afterEach(cleanup);

function cssRule(selector: string) {
  const css = readFileSync(join(process.cwd(), "app", "admin-ui.css"), "utf8");
  return css.match(new RegExp(`\\${selector}\\s*\\{([\\s\\S]*?)\\n\\}`))?.[1] ?? "";
}

describe("admin content editor", () => {
  test("keeps only navigation and save actions in the editor toolbar", () => {
    render(createElement(ContentEditor, editorProps));
    const toolbar = document.querySelector(".content-editor-toolbar") as HTMLElement;

    expect(within(toolbar).getByRole("link", { name: "返回列表" })).toBeVisible();
    expect(within(toolbar).getByRole("button", { name: "保存内容" })).toBeVisible();
    expect(within(toolbar).queryByText("编辑文章")).not.toBeInTheDocument();
    expect(within(toolbar).queryByText(editorProps.content.title)).not.toBeInTheDocument();
  });

  test("uses the editor settings panel and accessible shared selection controls", () => {
    render(createElement(ContentEditor, editorProps));

    expect(document.querySelector(".editor-settings-panel")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "状态" })).toHaveClass("ui-select-trigger");

    const category = screen.getByRole("combobox", { name: "分类" });
    expect(category).toHaveClass("ui-select-trigger");
    expect(category).toHaveAttribute("aria-expanded", "false");

    const tagsTrigger = screen.getByRole("button", { name: "选择标签" });
    expect(tagsTrigger).toHaveClass("ui-multi-select-trigger");
    fireEvent.click(tagsTrigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Tag B" }));
    expect(document.querySelectorAll('input[name="tagIds"]')).toHaveLength(2);
  });

  test("closes the tag dialog with Escape and keeps focus on its trigger", () => {
    vi.useFakeTimers();
    render(createElement(ContentEditor, editorProps));
    const trigger = screen.getByRole("button", { name: "选择标签" });

    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    vi.runAllTimers();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    vi.useRealTimers();
  });

  test("omits post-only taxonomy and comment settings for pages", () => {
    render(createElement(ContentEditor, { ...editorProps, kind: "PAGE" as const }));

    expect(screen.queryByRole("combobox", { name: "分类" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "选择标签" })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "允许评论" })).not.toBeInTheDocument();
  });

  test("constrains long tag chips while keeping the remove button stable", () => {
    const chip = cssRule(".ui-multi-select-chip");

    expect(chip).toContain("min-width: 0;");
    expect(chip).toContain("max-width: 100%;");
    expect(chip).toContain("overflow-wrap: anywhere;");
  });

  test("keeps mobile metadata in the main form after closing the settings dialog", async () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => ({
        matches: true,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    });

    render(createElement(ContentEditor, editorProps));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "文章设置" })).toBeVisible();
    });
    fireEvent.click(screen.getByRole("button", { name: "文章设置" }));

    fireEvent.click(screen.getByRole("combobox", { name: "状态" }));
    fireEvent.click(screen.getByRole("option", { name: "已发布" }));
    fireEvent.change(screen.getByRole("textbox", { name: "URL 别名" }), {
      target: { value: "mobile-edited" },
    });
    fireEvent.click(screen.getByRole("combobox", { name: "分类" }));
    fireEvent.click(screen.getByRole("option", { name: "Category B" }));
    fireEvent.click(screen.getByRole("button", { name: "选择标签" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Tag B" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "允许评论" }));
    fireEvent.click(screen.getByRole("button", { name: "关闭" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    const form = document.getElementById("content-editor-form") as HTMLFormElement;
    const formData = new FormData(form);

    expect(formData.getAll("status")).toEqual(["PUBLISHED"]);
    expect(formData.getAll("slug")).toEqual(["mobile-edited"]);
    expect(formData.getAll("categoryIds")).toEqual(["category-b"]);
    expect(formData.getAll("tagIds")).toEqual(["tag-a", "tag-b"]);
    expect(formData.getAll("allowComment")).toEqual([]);
  });

  test("does not bridge post-only metadata for page dialogs", async () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => ({
        matches: true,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    });
    render(
      createElement(ContentEditor, {
        ...editorProps,
        kind: "PAGE" as const,
        content: { ...editorProps.content, kind: "PAGE" as const, categories: [], tags: [] },
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "文章设置" })).toBeVisible();
    });
    fireEvent.click(screen.getByRole("button", { name: "文章设置" }));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    const formData = new FormData(document.getElementById("content-editor-form") as HTMLFormElement);

    expect(formData.getAll("categoryIds")).toEqual([]);
    expect(formData.getAll("tagIds")).toEqual([]);
    expect(formData.getAll("allowComment")).toEqual([]);
    expect(formData.getAll("pinned")).toEqual([]);
  });
});
