import type { PrimaryMenuItem } from "@/lib/content/service";

export interface SiteNavigationItem {
  href: string;
  id: string;
  label: string;
  openInNewTab: boolean;
}

const fallbackNavigation: SiteNavigationItem[] = [
  { href: "/", id: "home", label: "首页", openInNewTab: false },
  { href: "/archives", id: "archives", label: "归档", openInNewTab: false },
  { href: "/categories", id: "categories", label: "分类", openInNewTab: false },
  { href: "/tags", id: "tags", label: "标签", openInNewTab: false },
  { href: "/about", id: "about", label: "关于", openInNewTab: false },
];

export function resolveSiteNavigation(configured: PrimaryMenuItem[]): SiteNavigationItem[] {
  if (configured.length === 0) return fallbackNavigation;
  return configured.map((item) => ({
    href: item.url,
    id: item.id,
    label: item.label,
    openInNewTab: item.openInNewTab,
  }));
}
