const { test, expect } = require("@playwright/test");
const { createOnlineLobby, joinOnlineMatch, openApp } = require("./helpers");

test.describe("entrada de participante", () => {
  test("participante entra pelo link e escolhe o proprio nome", async ({ browser }) => {
    const context = await browser.newContext();
    const host = await context.newPage();
    const code = await createOnlineLobby(host);
    const participant = await joinOnlineMatch(context, code, "Paulo");
    await expect(participant.getByText(/aguardando inicio da partida/i)).toBeVisible();
    await context.close();
  });

  test("participante pode trocar identidade", async ({ browser }) => {
    const context = await browser.newContext();
    const host = await context.newPage();
    const code = await createOnlineLobby(host);
    const participant = await joinOnlineMatch(context, code, "Paulo");
    await participant.getByRole("button", { name: /Trocar jogador/i }).click();
    await expect(participant.getByRole("heading", { name: /Quem é você/i })).toBeVisible();
    await participant.getByRole("button", { name: /Entrar como espectador/i }).click();
    await expect(participant.locator("#fiscal-player-name")).toHaveText("Espectador");
    await context.close();
  });

  test("jogador escolhido fica indisponivel para outros participantes", async ({ browser }) => {
    const context = await browser.newContext();
    const host = await context.newPage();
    const code = await createOnlineLobby(host);

    const secondParticipant = await context.newPage();
    await openApp(secondParticipant, `/?room=${code}`);
    await expect(secondParticipant.getByRole("heading", { name: /Quem é você/i })).toBeVisible({ timeout: 10000 });
    await expect(secondParticipant.getByRole("button", { name: /Cali ocupado/i })).toBeDisabled();
    await expect(secondParticipant.getByRole("button", { name: /Paulo/i })).toBeEnabled();
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
