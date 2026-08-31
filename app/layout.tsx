import type { Metadata } from "next";

import { FontStylesheets } from "@/components/font-stylesheets";
import { ThemeProvider, THEME_STORAGE_KEY } from "@/components/ui/theme-provider";
import { getSiteSettings } from "@/lib/content/service";
import { getEnvironment } from "@/lib/env";

import "./globals.css";
import "./admin-ui.css";

export function generateMetadata(): Metadata {
  const settings = getSiteSettings();
  return {
    metadataBase: getEnvironment().appUrl,
    title: { default: settings.title, template: `%s | ${settings.title}` },
    description: settings.description,
    icons: { icon: settings.faviconUrl || "/icon.svg" },
    openGraph: {
      type: "website",
      siteName: settings.title,
      title: settings.title,
      description: settings.description,
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                try {
                  const saved = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
                  const theme = saved === "dark" || saved === "light"
                    ? saved
                    : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
                  document.documentElement.dataset.theme = theme;
                } catch {}
              })();
            `,
          }}
        />
        <link crossOrigin="anonymous" href="https://fontsapi.zeoseven.com" rel="preconnect" />
        <FontStylesheets />
      </head>
      <body>
        <a className="skip-link" href="#main-content">
          跳到正文
        </a>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
