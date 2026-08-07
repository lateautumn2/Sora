import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

// Content lives in the mounted SQLite database and can change after the image
// was built, so public pages must never be frozen into the container layer.
export const dynamic = "force-dynamic";

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="site-main" id="main-content">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
