import type { Metadata } from "next";

import { FontStylesheets } from "@/components/font-stylesheets";
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
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <head>
        <link crossOrigin="anonymous" href="https://fontsapi.zeoseven.com" rel="preconnect" />
        <FontStylesheets />
      </head>
      <body>
        <a className="skip-link" href="#main-content">
          跳到正文
        </a>
        {children}
      </body>
    </html>
  );
}
