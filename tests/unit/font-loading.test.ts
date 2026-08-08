// @vitest-environment jsdom

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { fireEvent, render } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, test } from "vitest";

import { FontStylesheets } from "@/components/font-stylesheets";

describe("font loading", () => {
  test("loads the three reference ZeoSeven stylesheets", () => {
    const { container } = render(createElement(FontStylesheets));
    const links = Array.from(
      container.querySelectorAll("link[data-font-stylesheet]"),
    );

    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "https://fontsapi.zeoseven.com/285/main/result.css",
      "https://fontsapi.zeoseven.com/292/main/result.css",
      "https://fontsapi.zeoseven.com/442/main/result.css",
    ]);
  });

  test("switches a failed stylesheet to storage only once", () => {
    const { container } = render(createElement(FontStylesheets));
    const link = container.querySelector(
      'link[data-font-stylesheet="Noto Serif CJK"]',
    ) as HTMLLinkElement;

    fireEvent.error(link);
    expect(link.getAttribute("href")).toBe(
      "https://fontsapi-storage.zeoseven.com/285/main/result.css",
    );

    fireEvent.error(link);
    expect(link.getAttribute("href")).toBe(
      "https://fontsapi-storage.zeoseven.com/285/main/result.css",
    );
  });

  test("ships the local HarmonyOS subsets and links all font sources", () => {
    const fontDirectory = join(process.cwd(), "public", "fonts", "HarmonyOS_Sans_SC");
    const layout = readFileSync(join(process.cwd(), "app", "layout.tsx"), "utf8");

    expect(existsSync(join(fontDirectory, "main.css"))).toBe(true);
    expect(readdirSync(fontDirectory).filter((file) => file.endsWith(".woff2")).length).toBeGreaterThan(100);
    expect(layout).toContain('href="https://fontsapi.zeoseven.com"');
    expect(layout).toContain('rel="preconnect"');
    expect(layout).toContain('href="/fonts/HarmonyOS_Sans_SC/main.css"');
    expect(layout).toContain("<FontStylesheets />");
  });

  test("maps every font role to the reference family and fallback", () => {
    const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

    expect(css).toContain('--sora-sans: "HarmonyOS Sans SC", ui-sans-serif, sans-serif;');
    expect(css).toContain('--sora-serif: "Noto Serif CJK", ui-serif, serif;');
    expect(css).toContain('--sora-mono: "Maple Mono NF CN", ui-monospace, monospace;');
    expect(css).toContain('--sora-semi-serif: "LXGW WenKai", ui-serif, serif;');
    expect(css).toContain("--font-semi-serif: var(--sora-semi-serif);");
    expect(css).toContain("font-family: var(--sora-sans);");
    expect(css).toContain("font-family: var(--sora-mono);");
  });
});
