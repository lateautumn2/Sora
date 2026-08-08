import { getSiteSettings } from "@/lib/content/service";

export function SiteFooter() {
  const settings = getSiteSettings();
  return (
    <footer className="sora-footer">
      <div className="sora-footer-content">
        <p>
          © {new Date().getFullYear()} · {settings.authorName || settings.title}
        </p>
        {settings.footerText ? <p className="sora-footer-note">{settings.footerText}</p> : null}
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
