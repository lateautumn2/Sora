import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

test("admin imports a content package and validates a full backup", async ({ page }) => {
  test.skip(!process.env.DATA_E2E, "Run explicitly against an isolated migrated database.");
  test.setTimeout(120_000);

  await page.goto("/admin/setup");
  if (page.url().endsWith("/admin/setup")) {
    await page.getByLabel("显示名称").fill("数据验收管理员");
    await page.getByLabel("邮箱").fill("data-acceptance@example.com");
    await page.getByLabel("密码", { exact: true }).fill("data-acceptance-password-2026");
    await page.getByLabel("确认密码").fill("data-acceptance-password-2026");
    await page.getByLabel("初始化令牌").fill(process.env.SETUP_TOKEN ?? "");
    await page.getByRole("button", { name: "创建管理员" }).click();
  } else {
    await page.goto("/admin/login");
    await page.getByLabel("邮箱").fill("data-acceptance@example.com");
    await page.getByLabel("密码").fill("data-acceptance-password-2026");
    await page.getByRole("button", { name: "登录" }).click();
  }
  await expect(page).toHaveURL(/\/admin$/);

  await page.goto("/admin/data");
  await expect(page.getByRole("heading", { name: "数据管理" })).toBeVisible();
  const contentSection = page.locator("section").filter({
    has: page.getByRole("heading", { name: "导入内容包" }),
  });
  await contentSection
    .getByLabel("选择内容包 ZIP")
    .setInputFiles(resolve("converted/sora-content-package-v1.zip"));
  await contentSection.getByRole("button", { name: "上传并分析" }).click();
  await expect(contentSection.getByText("分析与导入预演通过")).toBeVisible({ timeout: 60_000 });
  await expect(contentSection.getByText("30", { exact: true })).toBeVisible();
  await expect(contentSection.getByText("6", { exact: true })).toBeVisible();
  await contentSection.getByRole("button", { name: "确认导入" }).click();
  await expect(contentSection.getByText("内容包已导入并验证通过")).toBeVisible({
    timeout: 60_000,
  });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "下载完整备份" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^sora-backup-v1-.+\.zip$/);
  const backupPath = resolve("test-results/data-management-backup.zip");
  await download.saveAs(backupPath);

  const restoreSection = page.locator("section").filter({
    has: page.getByRole("heading", { name: "恢复完整备份" }),
  });
  await restoreSection.getByLabel("选择完整备份 ZIP").setInputFiles(backupPath);
  await restoreSection.getByRole("button", { name: "上传并校验" }).click();
  await expect(restoreSection.getByText("备份结构、哈希和 SQLite 完整性校验通过")).toBeVisible({
    timeout: 60_000,
  });
  const confirmButton = restoreSection.getByRole("button", { name: "确认恢复" });
  await expect(confirmButton).toBeDisabled();
  await restoreSection.getByLabel("输入 RESTORE 确认恢复").fill("RESTORE");
  await expect(confirmButton).toBeEnabled();

  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.locator(".skip-link").evaluate((element) => {
    (element as HTMLElement).style.display = "none";
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ fullPage: true, path: "test-results/data-management-desktop.png" });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.screenshot({ fullPage: true, path: "test-results/data-management-mobile.png" });
});
