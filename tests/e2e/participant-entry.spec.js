const { test, expect } = require("@playwright/test");
const { createOnlineLobby, joinOnlineMatch, openApp } = require("./helpers");

test.describe("entrada de participante", () => {
  test("participante entra pelo link e escolhe o proprio nome", async ({ browser }) => {
    const context = await browser.newContext();
    const host = await context.newPage();
    const code = await createOnlineLobby(host);
    const participant = await joinOnlineMatch(context, code, "Cali");
    await expect(participant.getByText(/aguardando inicio da partida/i)).toBeVisible();
    await context.close();
  });

  test("participante pode trocar identidade", async ({ browser }) => {
    const context = await browser.newContext();
    const host = await context.newPage();
    const code = await createOnlineLobby(host);
    const participant = await joinOnlineMatch(context, code, "Cali");
    await participant.getByRole("button", { name: /Trocar jogador/i }).click();
    await expect(participant.getByRole("heading", { name: /Quem é você/i })).toBeVisible();
    await participant.getByRole("button", { name: /Paulo/i }).click();
    await expect(participant.getByText(/Paulo/i).first()).toBeVisible();
    await context.close();
  });

  test("permite entrar como espectador", async ({ browser }) => {
    const context = await browser.newContext();
    const host = await context.newPage();
    const code = await createOnlineLobby(host);
    const spectator = await context.newPage();
    await openApp(spectator, `/?room=${code}`);
    await expect(spectator.getByRole("heading", { name: /Quem é você/i })).toBeVisible({ timeout: 10000 });
    await spectator.getByRole("button", { name: /Entrar como espectador/i }).click();
    await expect(spectator.locator("#fiscal-player-name")).toHaveText("Espectador");
    await context.close();
  });
});
