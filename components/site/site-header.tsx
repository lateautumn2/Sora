import type { Route } from "next";
import Link from "next/link";

import { MobileNavigation } from "@/components/site/mobile-navigation";
import { resolveSiteNavigation } from "@/components/site/site-navigation";
import { SiteSearch } from "@/components/site/site-search";
import { getSiteSettings, listPrimaryMenuItems } from "@/lib/content/service";

export function SiteHeader() {
  const settings = getSiteSettings();
  const navigation = resolveSiteNavigation(listPrimaryMenuItems());
  return (
    <header className="sora-inner-header">
      <div className="sora-inner-header-row">
        <Link className="sora-brand" href="/">
          {settings.title}
        </Link>
        <nav aria-label="主导航" className="sora-inner-navigation">
          {navigation.map((item) => (
            <Link
              href={item.href as Route}
              key={item.id}
              rel={item.openInNewTab ? "noreferrer" : undefined}
              target={item.openInNewTab ? "_blank" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sora-header-actions">
          <SiteSearch variant="header" />
          <MobileNavigation navigation={navigation.map(({ href, label }) => ({ href, label }))} />
        </div>
      </div>
    </header>
  );
}
