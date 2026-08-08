// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
  const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");
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

  test("uses one category select and an accessible removable tag group", () => {
    render(createElement(ContentEditor, editorProps));

    expect(screen.getByRole("combobox", { name: "分类" })).toHaveValue("category-a");

    fireEvent.click(screen.getByRole("button", { name: "选择标签" }));
    expect(screen.getByRole("group", { name: "标签选项" })).toBeInTheDocument();
    const tagBOption = screen.getByRole("button", { name: "Tag B" });
    expect(tagBOption).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(tagBOption);
    expect(tagBOption).toHaveAttribute("aria-pressed", "true");
    expect(document.querySelectorAll('input[name="tagIds"]')).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "移除 Tag A" }));
    expect(document.querySelectorAll('input[name="tagIds"]')).toHaveLength(1);
  });

  test("closes the tag group with Escape and keeps focus on its trigger", () => {
    render(createElement(ContentEditor, editorProps));
    const trigger = screen.getByRole("button", { name: "选择标签" });

    fireEvent.click(trigger);
    expect(screen.getByRole("group", { name: "标签选项" })).toBeInTheDocument();
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "Escape" });

    expect(screen.queryByRole("group", { name: "标签选项" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  test("constrains long tag chips while keeping the remove button stable", () => {
    const chip = cssRule(".taxonomy-tag-chip");
    const removeButton = cssRule(".taxonomy-tag-chip button");

    expect(chip).toContain("min-width: 0;");
    expect(chip).toContain("max-width: 100%;");
    expect(chip).toContain("overflow-wrap: anywhere;");
    expect(removeButton).toContain("flex: 0 0 1.1rem;");
  });
});
