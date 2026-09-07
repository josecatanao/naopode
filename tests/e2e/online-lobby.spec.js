const { test, expect } = require("@playwright/test");
const { createOnlineLobby, joinFirstRoundPlayers } = require("./helpers");

test.describe("partida online e lobby", () => {
  test("gera codigo, link e QR Code da partida online", async ({ page }) => {
    const code = await createOnlineLobby(page);
    await expect(page.locator(".room-link")).toContainText(`room=${code}`);
    await expect(page.locator("#room-qr")).toBeVisible();
  });

  test("mostra times e jogadores cadastrados no lobby", async ({ page }) => {
    await createOnlineLobby(page);
    await expect(page.locator(".online-teams-preview")).toContainText("Time Azul");
    await expect(page.locator(".online-teams-preview")).toContainText("Time Vermelho");
    await expect(page.locator(".online-participant-list")).toContainText("HOST");
    await expect(page.locator(".online-participant-list")).toContainText("Cali");
    await expect(page.locator(".online-teams-preview")).toContainText("Paulo");
  });

  test("permite comecar partida a partir do lobby", async ({ page }) => {
    const context = page.context();
    const code = await createOnlineLobby(page);
    await joinFirstRoundPlayers(context, code);
    await page.getByRole("button", { name: /Começar partida/i }).click();
    await expect(page.getByText(/Sua vez/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Acertou/i })).toBeVisible();
  });
});
