import { expect, test } from "@playwright/test";

test("guest can add, search, filter, edit, and delete transactions", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto("/");
  await page.getByRole("button", { name: "Continue without an account" }).click();

  await page.getByRole("tab", { name: "Add" }).click();
  await expect(page.getByRole("progressbar", { name: "Loading screen" })).toHaveCount(0);
  await page.getByLabel("Amount").fill("24.50");
  await page.getByPlaceholder("e.g. Lunch with friends").fill("Lunch - e2e");
  await page.getByRole("button", { name: "Add entry" }).click();

  await page.getByRole("button", { name: "Income" }).click();
  await page.getByLabel("Amount").fill("2500");
  await page.getByPlaceholder("e.g. October salary").fill("Salary - e2e");
  await page.getByRole("button", { name: "Add entry" }).click();

  await page.getByRole("tab", { name: "Activity" }).click();
  await expect(page.getByRole("progressbar", { name: "Loading screen" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Actions for Lunch - e2e" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Actions for Salary - e2e" })).toBeVisible();

  const search = page.getByLabel("Search descriptions");
  await search.fill("Salary - e2e");
  await expect(page.getByRole("button", { name: "Actions for Salary - e2e" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Actions for Lunch - e2e" })).toHaveCount(0);
  await search.clear();

  await page.getByRole("button", { name: /^Advanced filters/ }).click();
  await page.getByRole("button", { name: "Transaction type: All types" }).click();
  await page.getByRole("button", { name: "Expense", exact: true }).last().click();
  await expect(page.getByRole("button", { name: "Actions for Lunch - e2e" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Actions for Salary - e2e" })).toHaveCount(0);

  await page.getByRole("button", { name: "Clear" }).click();
  await page.getByRole("button", { name: "Actions for Lunch - e2e" }).click();
  await page.getByRole("button", { name: "Edit transaction" }).click();
  await page.getByPlaceholder("e.g. Lunch with friends").fill("Updated lunch - e2e");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("button", { name: "Actions for Updated lunch - e2e" })).toBeVisible();

  await page.getByRole("button", { name: "Actions for Updated lunch - e2e" }).click();
  await page.getByRole("button", { name: "Delete transaction" }).click();
  await expect(page.getByRole("button", { name: "Actions for Updated lunch - e2e" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Actions for Salary - e2e" })).toBeVisible();
});
