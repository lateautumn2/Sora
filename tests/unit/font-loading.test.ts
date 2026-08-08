// @vitest-environment jsdom

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
});
