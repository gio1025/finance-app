import { expect, test } from "@playwright/test";

test("guest can open the overview and navigate to activity and settings", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto("/");

  await page.getByRole("button", { name: "Continue without an account" }).click();
  await expect(page.getByText("Overview", { exact: true })).toBeVisible();
  await expect(page.getByText("Total balance", { exact: true })).toBeVisible();

  await page.getByRole("tab", { name: "Activity" }).click();
  await expect(page.getByRole("progressbar", { name: "Loading screen" })).toHaveCount(0);
  await expect(page.getByText("Review and filter your transactions.")).toBeVisible();

  await page.getByRole("tab", { name: "Settings" }).click();
  await expect(page.getByRole("progressbar", { name: "Loading screen" })).toHaveCount(0);
  await expect(page.getByText("Appearance applies instantly. Other changes ask first.")).toBeVisible();

  await page.getByRole("tab", { name: "Activity" }).click();
  await expect(page.getByRole("progressbar", { name: "Loading screen" })).toHaveCount(0);
  await expect(page.getByText("Review and filter your transactions.")).toBeVisible();
});
