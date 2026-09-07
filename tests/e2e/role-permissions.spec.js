const { test, expect } = require("@playwright/test");
const { createOnlineLobby, joinFirstRoundPlayers, openApp, startFirstRound } = require("./helpers");

test.describe("permissoes por papel", () => {
  test("jogador da vez ve a carta completa", async ({ browser }) => {
    const context = await browser.newContext();
    const host = await context.newPage();
    const code = await createOnlineLobby(host);
    const { cali } = await joinFirstRoundPlayers(context, code);
    await startFirstRound(host);
    await expect(cali.getByText(/Sua vez/i)).toBeVisible({ timeout: 6000 });
    await expect(cali.locator(".game-card")).toBeVisible();
    await expect(host.getByRole("button", { name: /Pular/i })).toBeVisible();
    await expect(host.getByRole("button", { name: /Acertou/i })).toBeVisible();
    await expect(host.getByRole("button", { name: /Não pode/i })).toHaveCount(0);
    await expect(host.locator(".game-card")).toHaveCount(0);
    await context.close();
  });

  test("adversario nao ve a carta e pode fiscalizar", async ({ browser }) => {
    const context = await browser.newContext();
    const host = await context.newPage();
    const code = await createOnlineLobby(host);
    const { paulo } = await joinFirstRoundPlayers(context, code);
    await startFirstRound(host);
    await expect(paulo.getByText(/Fiscalize a rodada/i)).toBeVisible({ timeout: 6000 });
    await expect(paulo.locator(".game-card")).toHaveCount(0);
    await expect(paulo.getByRole("button", { name: /Segure se ele falar/i })).toBeVisible();
    await context.close();
  });

  test("espectador acompanha sem carta e sem botao de fiscalizacao", async ({ browser }) => {
    const context = await browser.newContext();
    const host = await context.newPage();
    const code = await createOnlineLobby(host);
    await joinFirstRoundPlayers(context, code);
    const spectator = await context.newPage();
    await openApp(spectator, `/?room=${code}`);
    await expect(spectator.getByRole("heading", { name: /Quem é você/i })).toBeVisible({ timeout: 10000 });
    await spectator.getByRole("button", { name: /Entrar como espectador/i }).click();
    await startFirstRound(host);
    await expect(spectator.getByText(/Acompanhando/i)).toBeVisible({ timeout: 6000 });
    await expect(spectator.locator(".game-card")).toHaveCount(0);
    await expect(spectator.locator(".hold-button")).toBeHidden();
    await context.close();
  });

  test("marcacao de proibida pelo adversario afeta o host", async ({ browser }) => {
    const context = await browser.newContext();
    const host = await context.newPage();
    const code = await createOnlineLobby(host);
    const { paulo } = await joinFirstRoundPlayers(context, code);
    await startFirstRound(host);
    await paulo.getByRole("button", { name: /Segure se ele falar/i }).dispatchEvent("pointerdown", { pointerId: 1 });
    await paulo.waitForTimeout(650);
    await expect(host.getByText(/Fiscal marcou/i)).toBeVisible({ timeout: 4000 });
    await context.close();
  });
});
