import { test, expect } from "./fixtures";

// No test sends email, uploads a file, signs in, or contacts a production backend.
test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (
      ["127.0.0.1", "localhost"].includes(url.hostname) ||
      ["data:", "blob:"].includes(url.protocol)
    )
      return route.continue();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "{}",
    });
  });
});

test("original tool pages render without viewport overflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const slug of [
    "gomoku",
    "beautifier",
    "tempmail",
    "checkin",
    "fileshare",
    "rewriter",
    "mbti",
  ]) {
    await page.goto(`/tools/${slug}/`);
    if (slug === "checkin")
      await expect(
        page.getByRole("heading", { name: "欢迎回来" }),
      ).toBeVisible();
    else await expect(page.locator("main h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      slug,
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});

test("Gomoku plays an AI response and resets", async ({ page }) => {
  await page.goto("/tools/gomoku/");
  await page.locator("#soundBtn").click();
  await page.locator("#difficulty").selectOption("normal");
  const board = page.locator("#board");
  const bounds = await board.boundingBox();
  await board.click({
    position: { x: bounds!.width / 2, y: bounds!.height / 2 },
  });
  await expect(page.locator("#status")).toHaveText("轮到黑棋");
  await page.getByRole("button", { name: "重新开始", exact: true }).click();
  await expect(page.locator("#status")).toHaveText("黑棋先手");
});

test("Beautifier edits a local image and produces a download", async ({
  page,
}) => {
  await page.goto("/tools/beautifier/");
  const image = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l5sAAAAASUVORK5CYII=",
    "base64",
  );
  await page
    .locator("#file-input")
    .setInputFiles({ name: "test.png", mimeType: "image/png", buffer: image });
  await expect(page.locator("#editor-area")).toBeVisible();
  await page.locator("#sl-brightness").fill("20");
  await page.locator("#btn-reset").click();
  await expect(page.locator("#sl-brightness")).toHaveValue("0");
  const download = page.waitForEvent("download");
  await page.locator("#btn-download").click();
  expect((await download).suggestedFilename()).toMatch(/\.(png|jpg)$/);
});

test("MBTI question flow and previous answer remain usable", async ({
  page,
}) => {
  await page.goto("/tools/mbti/");
  await page.locator("#btn-start").click();
  await expect(page.locator("#test-screen")).toBeVisible();
  await page.locator("#q-options input[type=radio]").first().check();
  await page.locator("#btn-next").click();
  await expect(page.locator("#q-progress")).toHaveText(/2\s*\/\s*60/);
  await page.locator("#btn-prev").click();
  await expect(page.locator("#q-progress")).toHaveText(/1\s*\/\s*60/);
  await expect(
    page.locator("#q-options input[type=radio]").first(),
  ).toBeChecked();
});
