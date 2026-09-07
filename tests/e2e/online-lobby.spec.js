const { test, expect } = require("@playwright/test");
const { createOnlineLobby } = require("./helpers");

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
    await expect(page.locator(".online-teams-preview")).toContainText("Cali");
    await expect(page.locator(".online-teams-preview")).toContainText("Paulo");
  });

  test("permite comecar partida a partir do lobby", async ({ page }) => {
    await createOnlineLobby(page);
    await page.getByRole("button", { name: /Começar partida/i }).click();
    await expect(page.getByText(/Passe o celular para Cali/i)).toBeVisible();
  });
});
