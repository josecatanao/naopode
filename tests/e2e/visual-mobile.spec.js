const { test, expect } = require("@playwright/test");
const { createOnlineLobby, joinOnlineMatch, openApp, chooseDeck, startFirstRound } = require("./helpers");

test.describe("visual e mobile", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chromium", "Checks visuais rodam apenas no projeto mobile.");
  });

  test("home cabe na tela mobile", async ({ page }) => {
    await openApp(page);
    await expect(page.getByRole("button", { name: /Jogar agora/i })).toBeVisible();
    await expect(page).toHaveScreenshot("home-mobile.png", {
      maxDiffPixelRatio: 0.08
    });
  });

  test("configuracao da partida cabe na tela mobile", async ({ page }) => {
    await openApp(page);
    await chooseDeck(page);
    await expect(page.getByRole("button", { name: /Começar partida/i })).toBeVisible();
    await expect(page).toHaveScreenshot("config-mobile.png", {
      maxDiffPixelRatio: 0.08
    });
  });

  test("lobby online cabe na tela mobile", async ({ page }) => {
    await createOnlineLobby(page);
    await expect(page.locator(".online-room-card")).toBeVisible();
    await expect(page).toHaveScreenshot("online-lobby-mobile.png", {
      maxDiffPixelRatio: 0.08
    });
  });

  test("tela de identidade cabe na tela mobile", async ({ browser }) => {
    const context = await browser.newContext();
    const host = await context.newPage();
    const code = await createOnlineLobby(host);
    const participant = await context.newPage();
    await openApp(participant, `/?room=${code}`);
    await expect(participant.getByRole("heading", { name: /Quem é você/i })).toBeVisible({ timeout: 10000 });
    await expect(participant).toHaveScreenshot("identity-mobile.png", {
      maxDiffPixelRatio: 0.08
    });
    await context.close();
  });

  test("tela de acompanhamento cabe na tela mobile", async ({ browser }) => {
    const context = await browser.newContext();
    const host = await context.newPage();
    const code = await createOnlineLobby(host);
    const paulo = await joinOnlineMatch(context, code, "Paulo");
    await startFirstRound(host);
    await expect(paulo.getByText(/Fiscalize a rodada/i)).toBeVisible({ timeout: 6000 });
    await expect(paulo).toHaveScreenshot("participant-mobile.png", {
      maxDiffPixelRatio: 0.08
    });
    await context.close();
  });
});
