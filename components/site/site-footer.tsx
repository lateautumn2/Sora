import { getSiteSettings } from "@/lib/content/service";
import { SiteFooterNote } from "@/components/site/site-footer-note";

export async function SiteFooter() {
  const settings = getSiteSettings();
  return (
    <footer className="sora-footer">
      <div className="sora-footer-content">
        <p>
          © {new Date().getFullYear()} · {settings.authorName || settings.title}
        </p>
        <SiteFooterNote fallbackText={settings.footerText} source={settings.footerQuoteSource} />
        <p>
          Powered by{" "}
          <a href="https://github.com/lateautumn2/Sora" rel="noreferrer" target="_blank">
            Sora
          </a>
        </p>
      </div>
    </footer>
  );
}
