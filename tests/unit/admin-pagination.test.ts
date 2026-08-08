// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";

import AdminCategoriesPage from "@/app/(admin)/admin/categories/page";
import AdminMediaPage from "@/app/(admin)/admin/media/page";
import AdminTagsPage from "@/app/(admin)/admin/tags/page";
import { resolvePage } from "@/lib/content/pagination";
import { PostPagination } from "@/components/site/post-pagination";

const taxonomyTotal = 15;
const mediaTotal = 16;

vi.mock("@/lib/content/service", () => ({
  countTaxonomies: () => taxonomyTotal,
  listCategories: (_withCount: boolean, limit: number, offset: number) =>
    Array.from({ length: Math.max(0, Math.min(limit, taxonomyTotal - offset)) }, (_, index) => ({
      id: `category-${offset + index}`,
      name: `Category ${offset + index}`,
      slug: `category-${offset + index}`,
      description: "",
      count: 0,
    })),
  listTags: (_withCount: boolean, limit: number, offset: number) =>
    Array.from({ length: Math.max(0, Math.min(limit, taxonomyTotal - offset)) }, (_, index) => ({
      id: `tag-${offset + index}`,
      name: `Tag ${offset + index}`,
      slug: `tag-${offset + index}`,
      description: "",
      count: 0,
    })),
}));

vi.mock("@/lib/media/service", () => ({
  countMedia: () => mediaTotal,
  listMedia: (limit: number, offset: number) =>
    Array.from({ length: Math.max(0, Math.min(limit, mediaTotal - offset)) }, (_, index) => ({
      id: `media-${offset + index}`,
      storageKey: `2026/08/image-${offset + index}.png`,
      originalName: `image-${offset + index}.png`,
      mimeType: "image/png",
      byteSize: 1024,
      width: 100,
      height: 100,
      sha256: `sha-${offset + index}`,
      altText: "",
      createdAt: 0,
    })),
}));

vi.mock("@/lib/runtime-config", () => ({
  getRuntimeConfig: () => ({ appUrl: "http://localhost:3000" }),
}));

vi.mock("@/app/(admin)/admin/taxonomy-actions", () => ({
  deleteCategoryAction: vi.fn(),
  deleteTagAction: vi.fn(),
  saveCategoryAction: vi.fn(),
  saveTagAction: vi.fn(),
}));

vi.mock("@/app/(admin)/admin/media/actions", () => ({
  deleteMediaAction: vi.fn(),
  uploadMediaAction: vi.fn(),
}));

afterEach(cleanup);

describe("admin list pagination", () => {
  test("keeps public pagination styling while exposing an admin variant", () => {
    const { container, rerender } = render(
      createElement(PostPagination, { basePath: "/", page: 1, totalPages: 2, variant: "site" }),
    );
    expect(container.querySelector(".sora-pagination")).toBeInTheDocument();
    expect(container.querySelector(".ui-pagination")).not.toBeInTheDocument();

    rerender(
      createElement(PostPagination, {
        basePath: "/admin/posts",
        page: 1,
        totalPages: 2,
        variant: "admin",
      }),
    );
    expect(container.querySelector(".ui-pagination")).toBeInTheDocument();
    expect(container.querySelector(".sora-pagination")).not.toBeInTheDocument();
  });

  test("accepts only safe complete positive decimal page numbers", () => {
    expect(resolvePage("2")).toBe(2);
    expect(resolvePage("002")).toBe(2);
    expect(resolvePage("2junk")).toBe(1);
    expect(resolvePage("2.5")).toBe(1);
    expect(resolvePage("1e2")).toBe(1);
    expect(resolvePage("0")).toBe(1);
    expect(resolvePage("9007199254740992")).toBe(1);
  });

  test("limits categories to ten rows and renders the second page", async () => {
    const page = await AdminCategoriesPage({ searchParams: Promise.resolve({}) });
    const { container } = render(page);

    expect(container.querySelectorAll(".admin-record-row")).toHaveLength(10);
    expect(
      container.querySelector('nav[aria-label="\u5206\u9875"] a[href="/admin/categories?page=2"]'),
    ).toBeInTheDocument();
  });

  test("limits tags to ten rows and renders the second page", async () => {
    const page = await AdminTagsPage({ searchParams: Promise.resolve({}) });
    const { container } = render(page);

    expect(container.querySelectorAll(".admin-record-row")).toHaveLength(10);
    expect(
      container.querySelector('nav[aria-label="\u5206\u9875"] a[href="/admin/tags?page=2"]'),
    ).toBeInTheDocument();
  });

  test("limits media to twelve cards and renders the second page", async () => {
    const page = await AdminMediaPage({ searchParams: Promise.resolve({}) });
    const { container } = render(page);

    expect(container.querySelectorAll(".admin-media-card")).toHaveLength(12);
    expect(
      container.querySelector('nav[aria-label="\u5206\u9875"] a[href="/admin/media?page=2"]'),
    ).toBeInTheDocument();
  });
});
