import { expect, test } from "@playwright/test";

test("cms authenticated publishing workflow", async ({ page }) => {
  test.skip(!process.env.CMS_E2E, "Run explicitly against an isolated migrated database.");
  test.setTimeout(60_000);

  await page.goto("/admin/setup");
  if (page.url().endsWith("/admin/setup")) {
    await page.getByLabel("显示名称").fill("验收管理员");
    await page.getByLabel("邮箱").fill("acceptance@example.com");
    await page.getByLabel("密码", { exact: true }).fill("acceptance-password-2026");
    await page.getByLabel("确认密码").fill("acceptance-password-2026");
    await page.getByRole("button", { name: "创建管理员" }).click();
  } else {
    await page.goto("/admin/login");
    await page.getByLabel("邮箱").fill("acceptance@example.com");
    await page.getByLabel("密码").fill("acceptance-password-2026");
    await page.getByRole("button", { name: "登录" }).click();
  }
  await expect(page).toHaveURL(/\/admin$/);

  await page.goto("/admin/categories");
  if ((await page.locator('input[name="name"][value="技术"]').count()) === 0) {
    await page.getByLabel("分类名称").fill("技术");
    await page.getByLabel("分类 URL 别名").fill("technology");
    await page.getByLabel("分类说明").fill("工程实践");
    await page.getByRole("button", { name: "保存", exact: true }).first().click();
    await expect(page.getByText("保存成功")).toBeVisible();
  }

  const title = `隔离验收文章 ${Date.now()}`;
  await page.goto("/admin/posts/new");
  await page.getByLabel("标题", { exact: true }).fill(title);
  await page.locator(".cm-content").fill("# 真实发布\n\n这是一篇从后台发布的 **Markdown** 文章。");
  await page.getByLabel("状态").selectOption("PUBLISHED");
  await page.getByLabel("技术").check();
  await page.getByRole("button", { name: "保存内容" }).click();
  await expect(page).toHaveURL(/\/admin\/posts\/[0-9a-f-]+\?saved=1$/);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await page.getByRole("link", { name: new RegExp(title) }).click();
  await expect(page).toHaveURL(/\/posts\//);
  const articleUrl = page.url();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "真实发布" })).toBeVisible();
  await expect(
    page.getByText("这是一篇从后台发布的 Markdown 文章。", { exact: true }),
  ).toBeVisible();

  await page.getByLabel("昵称").fill("验收访客");
  await page.getByLabel("邮箱").fill("reader@example.com");
  await page.getByRole("textbox", { name: "评论" }).fill("这是一条待审核评论");
  await page.getByRole("button", { name: "提交评论" }).click();
  await expect(page.getByText("评论已提交，审核通过后会显示在这里。")).toBeVisible();

  await page.goto("/admin/comments");
  await expect(page.getByText("验收访客").first()).toBeVisible();
  await page
    .locator("article")
    .filter({ hasText: "验收访客" })
    .first()
    .getByRole("button", { name: "通过" })
    .click();
  await page.goto(articleUrl);
  await expect(page.getByText("这是一条待审核评论", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "点赞" }).click();
  await expect(page.getByRole("button", { name: "取消点赞" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
