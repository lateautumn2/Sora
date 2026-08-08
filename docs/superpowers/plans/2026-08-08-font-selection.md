# Sora Font Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reproduce halo-theme-sora's four-font selection, loading sources, fallback behavior, and full-site application in the Next.js Sora project.

**Architecture:** A focused client component owns the three ZeoSeven stylesheet URLs and their one-time fallback behavior. The root layout loads that component plus the self-hosted HarmonyOS stylesheet, while global CSS exposes one canonical variable per font role and maps Tailwind font utilities to those variables.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4, TypeScript 6, Vitest 4, Testing Library, ZeoSeven font CDN.

## Global Constraints

- HarmonyOS Sans SC is copied from `Liksium/halo-theme-sora` commit `d0056ddde4ba957757cd9e11989156eee2744ff0` and served locally.
- Noto Serif CJK uses ZeoSeven font `285`; LXGW WenKai uses `292`; Maple Mono NF CN uses `442`.
- The ZeoSeven storage host is attempted at most once after a primary stylesheet error.
- Fonts apply to the public site, authentication pages, and administration pages.
- LXGW WenKai is available as `semi-serif` but does not replace existing body or heading text.
- No new package dependency is introduced.
- Font size, weight, line height, spacing, and layout remain unchanged.

## File Map

- Create `components/font-stylesheets.tsx`: render ZeoSeven stylesheet links and perform one-time fallback switching.
- Create `tests/unit/font-loading.test.ts`: verify CDN behavior, local assets, layout links, and CSS font mappings.
- Create `public/fonts/HarmonyOS_Sans_SC/main.css`: define self-hosted HarmonyOS Sans SC subsets.
- Create `public/fonts/HarmonyOS_Sans_SC/*.woff2`: provide the referenced local font subsets.
- Modify `app/layout.tsx`: add preconnect, local stylesheet, and `FontStylesheets` to the document head.
- Modify `app/globals.css`: define canonical font stacks and connect body, prose, code, and Tailwind utilities.

---

### Task 1: ZeoSeven Stylesheet Loader

**Files:**
- Create: `components/font-stylesheets.tsx`
- Create: `tests/unit/font-loading.test.ts`

**Interfaces:**
- Produces: `FontStylesheets(): React.JSX.Element`, which renders links marked with `data-font-stylesheet`.
- Produces: each link starts at `https://fontsapi.zeoseven.com/<id>/main/result.css` and switches once to `https://fontsapi-storage.zeoseven.com/<id>/main/result.css` after an error.

- [ ] **Step 1: Write the failing component tests**

Create `tests/unit/font-loading.test.ts`:

```ts
// @vitest-environment jsdom

import { fireEvent, render } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, test } from "vitest";

import { FontStylesheets } from "@/components/font-stylesheets";

describe("font loading", () => {
  test("loads the three reference ZeoSeven stylesheets", () => {
    const { container } = render(createElement(FontStylesheets));
    const links = Array.from(container.querySelectorAll("link[data-font-stylesheet]"));

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
```

- [ ] **Step 2: Run the tests and confirm the missing component failure**

Run: `corepack pnpm@10.26.2 test -- tests/unit/font-loading.test.ts`

Expected: FAIL because `@/components/font-stylesheets` does not exist.

- [ ] **Step 3: Implement the minimal loader**

Create `components/font-stylesheets.tsx`:

```tsx
"use client";

const FONT_STYLESHEETS = [
  { name: "Noto Serif CJK", id: 285 },
  { name: "LXGW WenKai", id: 292 },
  { name: "Maple Mono NF CN", id: 442 },
] as const;

export function FontStylesheets() {
  return (
    <>
      {FONT_STYLESHEETS.map(({ name, id }) => (
        <link
          data-font-stylesheet={name}
          href={`https://fontsapi.zeoseven.com/${id}/main/result.css`}
          key={name}
          onError={({ currentTarget }) => {
            if (currentTarget.dataset.fallbackAttempted === "true") return;

            currentTarget.dataset.fallbackAttempted = "true";
            currentTarget.href = `https://fontsapi-storage.zeoseven.com/${id}/main/result.css`;
          }}
          rel="stylesheet"
        />
      ))}
    </>
  );
}
```

- [ ] **Step 4: Run the focused tests and confirm they pass**

Run: `corepack pnpm@10.26.2 test -- tests/unit/font-loading.test.ts`

Expected: 2 tests PASS.

- [ ] **Step 5: Commit the loader**

```powershell
git add -- components/font-stylesheets.tsx tests/unit/font-loading.test.ts
git commit -m "feat: add resilient font stylesheet loading"
```

### Task 2: Local HarmonyOS Assets and Global Font Mapping

**Files:**
- Modify: `tests/unit/font-loading.test.ts`
- Create: `public/fonts/HarmonyOS_Sans_SC/main.css`
- Create: `public/fonts/HarmonyOS_Sans_SC/*.woff2`
- Modify: `app/layout.tsx:1-28`
- Modify: `app/globals.css:1-49,209-295`

**Interfaces:**
- Consumes: `FontStylesheets()` from Task 1.
- Produces: `--sora-sans`, `--sora-serif`, `--sora-mono`, and `--sora-semi-serif` CSS variables.
- Produces: Tailwind `font-sans`, `font-serif`, `font-mono`, and `font-semi-serif` mappings.
- Produces: `/fonts/HarmonyOS_Sans_SC/main.css` and its relative WOFF2 resources.

- [ ] **Step 1: Add failing asset and mapping tests**

Extend `tests/unit/font-loading.test.ts` imports:

```ts
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
```

Add these tests inside the existing `describe` block:

```ts
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
```

- [ ] **Step 2: Run the tests and confirm the missing asset failure**

Run: `corepack pnpm@10.26.2 test -- tests/unit/font-loading.test.ts`

Expected: FAIL because `public/fonts/HarmonyOS_Sans_SC/main.css` does not exist.

- [ ] **Step 3: Copy the pinned HarmonyOS assets from the reference repository**

Run these PowerShell commands from the repository root:

```powershell
$fontTemp = New-Item -ItemType Directory -Path (Join-Path $env:TEMP ("sora-fonts-" + [guid]::NewGuid()))
$fontArchive = Join-Path $fontTemp "halo-theme-sora.zip"
curl.exe -sSL -o $fontArchive "https://github.com/Liksium/halo-theme-sora/archive/d0056ddde4ba957757cd9e11989156eee2744ff0.zip"
Expand-Archive -LiteralPath $fontArchive -DestinationPath $fontTemp
New-Item -ItemType Directory -Force -Path "public/fonts" | Out-Null
Copy-Item -Recurse -LiteralPath (Join-Path $fontTemp "halo-theme-sora-d0056ddde4ba957757cd9e11989156eee2744ff0/templates/assets/fonts/HarmonyOS_Sans_SC") -Destination "public/fonts/HarmonyOS_Sans_SC"
```

Expected: `public/fonts/HarmonyOS_Sans_SC/main.css` and more than 100 WOFF2 files exist.

- [ ] **Step 4: Connect the font sources in the root layout**

Add the component import to `app/layout.tsx`:

```ts
import { FontStylesheets } from "@/components/font-stylesheets";
```

Add this head before `<body>`:

```tsx
      <head>
        <link crossOrigin="anonymous" href="https://fontsapi.zeoseven.com" rel="preconnect" />
        <link href="/fonts/HarmonyOS_Sans_SC/main.css" rel="stylesheet" />
        <FontStylesheets />
      </head>
```

- [ ] **Step 5: Define and apply the canonical font variables**

Add this Tailwind theme block after the imports in `app/globals.css`:

```css
@theme inline {
  --font-sans: var(--sora-sans);
  --font-serif: var(--sora-serif);
  --font-mono: var(--sora-mono);
  --font-semi-serif: var(--sora-semi-serif);
}
```

Replace the existing font variables in `:root` with:

```css
  --sora-sans: "HarmonyOS Sans SC", ui-sans-serif, sans-serif;
  --sora-serif: "Noto Serif CJK", ui-serif, serif;
  --sora-mono: "Maple Mono NF CN", ui-monospace, monospace;
  --sora-semi-serif: "LXGW WenKai", ui-serif, serif;
```

Set the `body` font family to:

```css
  font-family: var(--sora-sans);
```

Set `.prose-content` to the same sans variable, and set both `.prose-content pre` and `.prose-content :not(pre) > code` to:

```css
  font-family: var(--sora-mono);
```

- [ ] **Step 6: Run the focused tests and confirm they pass**

Run: `corepack pnpm@10.26.2 test -- tests/unit/font-loading.test.ts`

Expected: 4 tests PASS.

- [ ] **Step 7: Commit the font assets and mappings**

```powershell
git add -- app/layout.tsx app/globals.css tests/unit/font-loading.test.ts components/font-stylesheets.tsx public/fonts/HarmonyOS_Sans_SC
git commit -m "feat: reproduce Sora font selection"
```

### Task 3: Full Verification and Browser Evidence

**Files:**
- Verify only: `app/layout.tsx`, `app/globals.css`, `components/font-stylesheets.tsx`, `public/fonts/HarmonyOS_Sans_SC/*`, `tests/unit/font-loading.test.ts`

**Interfaces:**
- Consumes: the complete font loading and style integration from Tasks 1 and 2.
- Produces: verification evidence; no new application interface.

- [ ] **Step 1: Run formatting and lint checks**

Run: `corepack pnpm@10.26.2 format:check`

Expected: PASS. If only touched files fail formatting, run `corepack pnpm@10.26.2 exec prettier --write app/layout.tsx app/globals.css components/font-stylesheets.tsx tests/unit/font-loading.test.ts`, then rerun the check.

Run: `corepack pnpm@10.26.2 lint`

Expected: PASS with no new errors.

- [ ] **Step 2: Run type checking and the complete test suite**

Run: `corepack pnpm@10.26.2 typecheck`

Expected: PASS.

Run: `corepack pnpm@10.26.2 test`

Expected: all tests PASS, including the four font-loading tests.

- [ ] **Step 3: Run the production build**

Run: `corepack pnpm@10.26.2 build`

Expected: Next.js production build completes successfully.

- [ ] **Step 4: Verify fonts in a browser**

Start the application with `corepack pnpm@10.26.2 dev` on an available local port. Use Playwright at a desktop viewport and verify:

```js
const bodyFont = await page.locator("body").evaluate((element) => getComputedStyle(element).fontFamily);
const headingFont = await page.locator("h1").first().evaluate((element) => getComputedStyle(element).fontFamily);
const localFontResponse = await page.request.get("/fonts/HarmonyOS_Sans_SC/main.css");
```

Expected: `bodyFont` begins with `HarmonyOS Sans SC`, `headingFont` begins with `Noto Serif CJK` where the heading uses serif styling, and `localFontResponse.status()` is `200`. Repeat the body check on `/admin/login` to confirm the full-site scope.

- [ ] **Step 5: Confirm the final diff scope**

Run: `git status --short`

Expected: only pre-existing unrelated `.superpowers/` files and the ignored `daily.md` may remain untracked; no implementation file is accidentally omitted from its task commit.
