import { test, expect } from "@playwright/test";

test("로그인 페이지에서 테스트 계정 버튼을 누르면 즉시 로그인된다", async ({ page }) => {
  await page.goto("/login");

  await page.getByRole("button", { name: "테스트 계정으로 로그인" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: "로그인" })).not.toBeVisible();
});
