import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { expect, test } from "vitest";

const adminUiStyles = readFileSync(join(process.cwd(), "app", "admin-ui.css"), "utf8");
const globalStyles = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

const layoutFixture = `
  <style>${adminUiStyles}</style>
  <main class="admin-page-template">
    <nav class="admin-link-tabs"><a class="admin-link-tab is-active">全部</a></nav>
    <section class="admin-dashboard-stats">
      <article class="admin-surface admin-stat-card"></article>
      <article class="admin-surface admin-stat-card"></article>
      <article class="admin-surface admin-stat-card"></article>
      <article class="admin-surface admin-stat-card"></article>
    </section>
    <div class="admin-dashboard-grid"><section></section><section></section></div>
    <div class="admin-data-list-scroll"><table class="admin-data-list"><tbody><tr><td>内容</td></tr></tbody></table></div>
    <form class="admin-media-upload-form"><label></label><label></label><button></button></form>
    <ul class="admin-media-grid"><li></li><li></li><li></li></ul>
    <article class="admin-comment-row"><span></span><div class="admin-comment-copy"></div></article>
    <div class="admin-data-controls"><label></label><button></button></div>
  </main>
`;

function columnCount(value: string): number {
  return value.split(" ").filter(Boolean).length;
}

test("migrated admin menus receive complete desktop layout styles", async () => {
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.setContent(layoutFixture);

    const styles = await page
      .locator(
        ".admin-link-tabs, .admin-dashboard-stats, .admin-dashboard-grid, .admin-data-list-scroll, .admin-data-list, .admin-media-upload-form, .admin-media-grid, .admin-comment-row, .admin-comment-copy, .admin-data-controls",
      )
      .evaluateAll((elements) =>
        elements.map((element) => {
          const style = getComputedStyle(element);
          return {
            className: element.className,
            display: style.display,
            gridTemplateColumns: style.gridTemplateColumns,
            overflowX: style.overflowX,
            width: style.width,
          };
        }),
      );
    const byClass = Object.fromEntries(styles.map((style) => [style.className, style]));

    expect(byClass["admin-link-tabs"]?.display).toBe("flex");
    expect(byClass["admin-dashboard-stats"]?.display).toBe("grid");
    expect(columnCount(byClass["admin-dashboard-stats"]?.gridTemplateColumns ?? "")).toBe(4);
    expect(columnCount(byClass["admin-dashboard-grid"]?.gridTemplateColumns ?? "")).toBe(2);
    expect(byClass["admin-data-list-scroll"]?.overflowX).toBe("auto");
    expect(byClass["admin-data-list"]?.width).not.toBe("auto");
    expect(columnCount(byClass["admin-media-upload-form"]?.gridTemplateColumns ?? "")).toBe(3);
    expect(columnCount(byClass["admin-media-grid"]?.gridTemplateColumns ?? "")).toBe(4);
    expect(columnCount(byClass["admin-comment-row"]?.gridTemplateColumns ?? "")).toBe(2);
    expect(byClass["admin-comment-copy"]?.display).toBe("grid");
    expect(columnCount(byClass["admin-data-controls"]?.gridTemplateColumns ?? "")).toBe(2);
  } finally {
    await browser.close();
  }
});

test("migrated admin menu layouts collapse cleanly on mobile", async () => {
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.setContent(layoutFixture);

    for (const selector of [
      ".admin-dashboard-stats",
      ".admin-dashboard-grid",
      ".admin-media-upload-form",
      ".admin-media-grid",
      ".admin-data-controls",
    ]) {
      const layout = await page.locator(selector).evaluate((element) => {
        const style = getComputedStyle(element);
        return { columns: style.gridTemplateColumns, display: style.display };
      });
      expect(layout.display, selector).toBe("grid");
      expect(columnCount(layout.columns), selector).toBe(1);
    }
  } finally {
    await browser.close();
  }
});

test("desktop admin shell keeps document fixed and scrolls only the right content pane", async () => {
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.setContent(`
      <style>
        html, body { margin: 0; }
        ${adminUiStyles}
      </style>
      <div class="admin-shell-layout">
        <aside class="admin-sidebar-shell">
          <div class="admin-sidebar-shell-panel">菜单</div>
        </aside>
        <div class="admin-shell-workspace">
          <header class="admin-shell-topbar">顶栏</header>
          <main class="admin-shell-main">
            <div style="height: 1600px">长内容</div>
          </main>
        </div>
      </div>
    `);

    const metrics = await page.evaluate(() => {
      const shell = document.querySelector<HTMLElement>(".admin-shell-layout");
      const sidebar = document.querySelector<HTMLElement>(".admin-sidebar-shell");
      const workspace = document.querySelector<HTMLElement>(".admin-shell-workspace");
      const main = document.querySelector<HTMLElement>(".admin-shell-main");
      if (!shell || !sidebar || !workspace || !main) throw new Error("后台壳层结构缺失");

      return {
        documentClientHeight: document.documentElement.clientHeight,
        documentScrollHeight: document.documentElement.scrollHeight,
        mainClientHeight: main.clientHeight,
        mainOverflowY: getComputedStyle(main).overflowY,
        mainScrollHeight: main.scrollHeight,
        shellHeight: shell.getBoundingClientRect().height,
        shellOverflow: getComputedStyle(shell).overflow,
        sidebarHeight: sidebar.getBoundingClientRect().height,
        workspaceHeight: workspace.getBoundingClientRect().height,
      };
    });

    expect(metrics.shellHeight).toBe(800);
    expect(metrics.workspaceHeight).toBe(800);
    expect(metrics.sidebarHeight).toBeLessThanOrEqual(800);
    expect(metrics.shellOverflow).toBe("hidden");
    expect(metrics.documentScrollHeight).toBe(metrics.documentClientHeight);
    expect(metrics.mainOverflowY).toBe("auto");
    expect(metrics.mainScrollHeight).toBeGreaterThan(metrics.mainClientHeight);
  } finally {
    await browser.close();
  }
});

test("admin pagination renders compact page controls without the legacy panel shell", async () => {
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.setContent(`
      <style>${globalStyles}</style>
      <style>${adminUiStyles}</style>
      <nav class="ui-pagination admin-pagination" aria-label="分页">
        <span class="ui-pagination-item ui-pagination-disabled">‹</span>
        <a class="ui-pagination-item">1</a>
        <a class="ui-pagination-item ui-pagination-current">2</a>
        <span class="ui-pagination-ellipsis">…</span>
        <a class="ui-pagination-item">8</a>
        <a class="ui-pagination-item">›</a>
      </nav>
    `);

    const desktop = await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>(".ui-pagination");
      const item = document.querySelector<HTMLElement>(
        ".ui-pagination-item:not(.ui-pagination-disabled)",
      );
      const current = document.querySelector<HTMLElement>(".ui-pagination-current");
      const disabled = document.querySelector<HTMLElement>(".ui-pagination-disabled");
      const ellipsis = document.querySelector<HTMLElement>(".ui-pagination-ellipsis");
      if (!root || !item || !current || !disabled || !ellipsis) {
        throw new Error("分页器结构缺失");
      }

      const rootStyle = getComputedStyle(root);
      const itemStyle = getComputedStyle(item);
      const currentStyle = getComputedStyle(current);
      const disabledStyle = getComputedStyle(disabled);
      const ellipsisStyle = getComputedStyle(ellipsis);
      return {
        currentBackground: currentStyle.backgroundColor,
        currentColor: currentStyle.color,
        disabledOpacity: Number.parseFloat(disabledStyle.opacity),
        ellipsisDisplay: ellipsisStyle.display,
        itemDisplay: itemStyle.display,
        itemHeight: Number.parseFloat(itemStyle.height),
        itemWidth: Number.parseFloat(itemStyle.width),
        rootBackground: rootStyle.backgroundColor,
        rootBorderWidth: rootStyle.borderTopWidth,
        rootBoxShadow: rootStyle.boxShadow,
        rootPadding: rootStyle.paddingTop,
      };
    });

    expect(desktop.rootBorderWidth).toBe("0px");
    expect(desktop.rootBackground).toBe("rgba(0, 0, 0, 0)");
    expect(desktop.rootBoxShadow).toBe("none");
    expect(desktop.rootPadding).toBe("0px");
    expect(desktop.itemDisplay).toBe("grid");
    expect(desktop.itemWidth).toBe(40);
    expect(desktop.itemHeight).toBe(40);
    expect(desktop.currentBackground).toBe("rgb(130, 4, 91)");
    expect(desktop.currentColor).toBe("rgb(255, 255, 255)");
    expect(desktop.disabledOpacity).toBeLessThan(1);
    expect(desktop.ellipsisDisplay).toBe("grid");

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileSize = await page
      .locator(".ui-pagination-item")
      .first()
      .evaluate((element) => {
        const style = getComputedStyle(element);
        return { height: Number.parseFloat(style.height), width: Number.parseFloat(style.width) };
      });
    expect(mobileSize.width).toBeGreaterThanOrEqual(44);
    expect(mobileSize.height).toBeGreaterThanOrEqual(44);
  } finally {
    await browser.close();
  }
});

test("editor toolbar spacing and compact media thumbnails retain their intended density", async () => {
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.setContent(`
      <style>${globalStyles}</style>
      <style>${adminUiStyles}</style>
      <div class="admin-shell-layout">
        <div class="content-editor">
          <div class="content-editor-toolbar">工具栏</div>
        </div>
      </div>
      <ul class="admin-media-grid">
        <li class="admin-media-card"><button class="admin-media-preview"><img alt="缩略图" /></button></li>
        <li></li><li></li><li></li>
      </ul>
      <img class="admin-media-dialog-image" alt="完整预览" />
    `);

    const density = await page.evaluate(() => {
      const toolbar = document.querySelector<HTMLElement>(".content-editor-toolbar");
      const grid = document.querySelector<HTMLElement>(".admin-media-grid");
      const preview = document.querySelector<HTMLElement>(".admin-media-preview");
      const thumbnail = document.querySelector<HTMLImageElement>(".admin-media-preview img");
      const dialogImage = document.querySelector<HTMLImageElement>(".admin-media-dialog-image");
      if (!toolbar || !grid || !preview || !thumbnail || !dialogImage) {
        throw new Error("编辑器或媒体样式结构缺失");
      }

      const toolbarStyle = getComputedStyle(toolbar);
      const gridStyle = getComputedStyle(grid);
      const previewStyle = getComputedStyle(preview);
      return {
        columns: gridStyle.gridTemplateColumns,
        dialogObjectFit: getComputedStyle(dialogImage).objectFit,
        previewHeight: Number.parseFloat(previewStyle.height),
        thumbnailObjectFit: getComputedStyle(thumbnail).objectFit,
        toolbarPaddingLeft: Number.parseFloat(toolbarStyle.paddingLeft),
        toolbarPaddingRight: Number.parseFloat(toolbarStyle.paddingRight),
      };
    });

    expect(density.toolbarPaddingLeft).toBeGreaterThan(0);
    expect(density.toolbarPaddingRight).toBeGreaterThan(0);
    expect(columnCount(density.columns)).toBe(4);
    expect(density.previewHeight).toBe(120);
    expect(density.thumbnailObjectFit).toBe("cover");
    expect(density.dialogObjectFit).toBe("contain");
  } finally {
    await browser.close();
  }
});
