import { expect, test } from "@playwright/test";

test("renders the public homepage without horizontal overflow", async ({ page }, testInfo) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Sora");
  await expect(page.getByRole("heading", { level: 1, name: "Sora" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "首页导航" })).toBeVisible();
  await expect(page.getByRole("region", { name: "文章列表" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "最近文章" })).toHaveCount(0);

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);

  await page.screenshot({ path: testInfo.outputPath("homepage.png"), fullPage: true });
});

test("renders Sora archive and taxonomy layouts", async ({ page }) => {
  await page.goto("/archives");
  await expect(page.locator(".sora-inner-header")).toBeVisible();
  await expect(page.locator(".sora-archive-page")).toBeVisible();

  await page.goto("/categories");
  await expect(page.locator(".sora-taxonomy-page")).toBeVisible();
});

test("renders the public friends page without horizontal overflow", async ({ page }, testInfo) => {
  await page.goto("/friends");

  await expect(page.getByRole("heading", { level: 1, name: "友链" })).toBeVisible();
  if (testInfo.project.name === "mobile-chromium") {
    await page.getByRole("button", { name: "打开导航" }).click();
    const navigation = page.getByRole("navigation", { name: "移动端导航" });
    await expect(navigation).toBeVisible();
    await expect(navigation.getByRole("link", { name: "友链" })).toBeVisible();
  } else {
    const navigation = page.getByRole("navigation", { name: "主导航" });
    await expect(navigation).toBeVisible();
    await expect(navigation.getByRole("link", { name: "友链" })).toBeVisible();
  }

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("redirects an anonymous administrator to setup or login", async ({ page }) => {
  await page.goto("/admin");

  await expect(page).toHaveURL(/\/admin\/(setup|login)$/);
  if (page.url().endsWith("/admin/setup")) {
    await expect(page.getByRole("heading", { name: "初始化博客" })).toBeVisible();
    await expect(page.getByLabel("显示名称")).toBeVisible();
  } else {
    await expect(page.getByRole("heading", { name: "登录" })).toBeVisible();
    await expect(page.getByLabel("邮箱")).toBeVisible();
  }
});

test("reports a healthy SQLite connection", async ({ request }) => {
  const response = await request.get("/api/health");
  const payload = (await response.json()) as {
    status: string;
    checks: { database: { journalMode: string; foreignKeys: boolean } };
  };

  expect(response.ok()).toBe(true);
  expect(payload.status).toBe("ok");
  expect(payload.checks.database).toMatchObject({
    journalMode: "wal",
    foreignKeys: true,
  });
});

test("opens and closes the mobile navigation", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Mobile-only interaction");

  await page.goto("/archives");
  const menuButton = page.getByRole("button", { name: "打开导航" });
  await menuButton.click();

  await expect(page.getByRole("navigation", { name: "移动端导航" })).toBeVisible();
  await expect(page.getByRole("link", { name: "归档" }).last()).toBeVisible();
  await page.getByRole("button", { name: "关闭导航" }).click();
  await expect(page.getByRole("navigation", { name: "移动端导航" })).toBeHidden();
});
