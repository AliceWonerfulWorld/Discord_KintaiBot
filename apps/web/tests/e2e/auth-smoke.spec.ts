import { test, expect } from "@playwright/test";

test("未ログイン状態で / へアクセスすると /login が表示される", async ({
  page
}) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "サインイン" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Discordでログイン" })
  ).toBeVisible();
});
