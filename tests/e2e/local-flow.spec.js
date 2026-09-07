const { test, expect } = require("@playwright/test");
const { openApp, chooseDeck } = require("./helpers");

test.describe("fluxo local", () => {
  test("abre o app e navega para configuracao de partida", async ({ page }) => {
    await openApp(page);
    await expect(page.getByRole("heading", { name: /Não Pode/i })).toBeVisible();
    await chooseDeck(page);
    await expect(page.getByText(/Equipes/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Começar partida/i })).toBeVisible();
  });

  test("configura times e inicia uma rodada local", async ({ page }) => {
    await openApp(page);
    await chooseDeck(page);
    await page.locator('[data-team-input="blue"]').fill("Azul Teste");
    await page.locator('[data-team-input="red"]').fill("Vermelho Teste");
    await page.locator('[data-player-input="blue"]').first().fill("Cali");
    await page.locator('[data-player-input="red"]').first().fill("Paulo");
    await page.getByRole("button", { name: /Começar partida/i }).click();
    await expect(page.getByText(/Passe o celular para Cali/i)).toBeVisible();
    await page.getByRole("button", { name: /Estou pronto/i }).click();
    await expect(page.getByRole("button", { name: /Acertou/i })).toBeVisible({ timeout: 6000 });
  });

  test("marca acerto e atualiza placar local", async ({ page }) => {
    await openApp(page);
    await chooseDeck(page);
    await page.getByRole("button", { name: /Começar partida/i }).click();
    await page.getByRole("button", { name: /Estou pronto/i }).click();
    await page.getByRole("button", { name: /Acertou/i }).click({ timeout: 6000 });
    await expect(page.locator(".score-mini")).toContainText("1");
  });

  test("pula carta sem pontuar", async ({ page }) => {
    await openApp(page);
    await chooseDeck(page);
    await page.getByRole("button", { name: /Começar partida/i }).click();
    await page.getByRole("button", { name: /Estou pronto/i }).click();
    await page.getByRole("button", { name: /Pular/i }).click({ timeout: 6000 });
    await expect(page.locator(".score-mini")).toContainText("0");
  });

  test("pausa e retoma a rodada", async ({ page }) => {
    await openApp(page);
    await chooseDeck(page);
    await page.getByRole("button", { name: /Começar partida/i }).click();
    await page.getByRole("button", { name: /Estou pronto/i }).click();
    await page.getByRole("button", { name: /Pausar/i }).click({ timeout: 6000 });
    await expect(page.getByText(/Partida pausada/i)).toBeVisible();
    await page.getByRole("button", { name: /Continuar/i }).click();
    await expect(page.getByRole("button", { name: /Acertou/i })).toBeVisible();
  });
});
