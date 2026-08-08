// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import FriendsPage from "@/app/(site)/friends/page";
import sitemap from "@/app/sitemap";
import { resolveSiteNavigation } from "@/components/site/site-navigation";

const friendLinkMocks = vi.hoisted(() => ({ listPublicFriendLinks: vi.fn() }));

const publicFriendLinks = [
  {
    id: "friend-alpha",
    name: "Alpha",
    url: "https://alpha.example.com",
    logoUrl: "",
    description: "Alpha site",
    sortOrder: 0,
    enabled: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: "friend-beta",
    name: "Beta",
    url: "https://beta.example.com",
    logoUrl: "",
    description: "Disabled site",
    sortOrder: 1,
    enabled: false,
    createdAt: 0,
    updatedAt: 0,
  },
];

vi.mock("@/lib/content/service", () => ({
  listPublishedPages: () => [],
  listPublishedPosts: () => [],
}));

vi.mock("@/lib/env", () => ({
  getEnvironment: () => ({ appUrl: new URL("https://sora.example.com") }),
}));

vi.mock("@/lib/friends/service", () => ({
  listPublicFriendLinks: friendLinkMocks.listPublicFriendLinks,
}));

describe("public friend links UI", () => {
  beforeEach(() => {
    friendLinkMocks.listPublicFriendLinks.mockReset();
    friendLinkMocks.listPublicFriendLinks.mockReturnValue(publicFriendLinks);
  });

  test("renders public friend links with safe external targets", async () => {
    render(await FriendsPage());

    const link = screen.getByRole("link", { name: /Alpha/ });
    expect(link).toHaveAttribute("href", "https://alpha.example.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.queryByRole("link", { name: /Beta/ })).not.toBeInTheDocument();
  });

  test("renders an empty state when no public friend links exist", async () => {
    friendLinkMocks.listPublicFriendLinks.mockReturnValue([]);
    const { container } = render(await FriendsPage());

    expect(screen.getByText("暂无友链")).toBeVisible();
    expect(container.querySelector(".sora-friends-list")).not.toBeInTheDocument();
  });

  test("fallback navigation contains friends before about", () => {
    expect(resolveSiteNavigation([])).toContainEqual({
      href: "/friends",
      id: "friends",
      label: "友链",
      openInNewTab: false,
    });
    expect(resolveSiteNavigation([]).map((item) => item.id)).toEqual([
      "home",
      "archives",
      "categories",
      "tags",
      "friends",
      "about",
    ]);
  });

  test("preserves configured navigation without forcing friends", () => {
    expect(
      resolveSiteNavigation([
        {
          id: "custom",
          label: "自定义",
          url: "/custom",
          openInNewTab: false,
          sortOrder: 0,
          enabled: true,
        },
      ]),
    ).toEqual([{ id: "custom", label: "自定义", href: "/custom", openInNewTab: false }]);
  });

  test("includes friends in the sitemap", () => {
    expect(sitemap().map((entry) => entry.url)).toContain("https://sora.example.com/friends");
  });
});
