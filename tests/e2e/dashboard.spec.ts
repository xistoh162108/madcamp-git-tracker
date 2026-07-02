import { expect, test } from "@playwright/test"

test("dashboard renders critical Korean copy and tabs", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByText(/커밋 수는 GitHub 활동량을 보여주는 참고 지표입니다/)).toBeVisible()
  await expect(page.getByText("주차와 날짜는 한국 시간으로 표시됩니다.")).toBeVisible()
  await expect(page.getByText(/external-dev/)).toBeVisible()
  await expect(page.getByRole("link", { name: /관리자/ })).toHaveCount(0)
  await expect(page.getByRole("button", { name: /동기화/ })).toHaveCount(0)
  await expect(page.getByRole("tab", { name: /개인/ })).toBeVisible()
  await page.getByRole("tab", { name: /팀/ }).click()
  await expect(page.getByText(/w2-c\d-\d{2}/).first()).toBeVisible()
  await page.getByRole("tab", { name: /분반/ }).click()
  await expect(
    page.getByText("분반 랭킹은 인원 차이를 보정하기 위해 기본적으로 인당 평균 기준으로 표시됩니다."),
  ).toBeVisible()
})

test("admin endpoint is protected", async ({ request }) => {
  const response = await request.get("/api/admin/rate-limit")
  expect(response.status()).toBe(401)
})

test("mobile viewport renders dashboard", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/")
  await expect(page.getByText("몰입 랭킹").first()).toBeVisible()
  await expect(page.getByText(/일별 커밋 추이/)).toBeVisible()
})

test("snapshot-backed detail pages render", async ({ page }) => {
  await page.goto("/participant/gaon-kim")
  await expect(page.getByRole("heading", { name: "김가온" })).toBeVisible()
  await expect(page.getByText("w2-c3-07").first()).toBeVisible()

  await page.goto("/team/w2-c3-07")
  await expect(page.getByRole("heading", { name: "w2-c3-07" })).toBeVisible()
  await expect(page.getByText(/external-dev|gaon-kim/).first()).toBeVisible()
})
