const { expect } = require("@playwright/test");

async function preparePage(page) {
  await page.route("**/cdn.jsdelivr.net/npm/@supabase/**", (route) => route.abort());
  await page.addInitScript(() => {
    Math.random = () => 0.2345;
    localStorage.setItem("naoPodeSettings", JSON.stringify({
      sound: false,
      vibration: false,
      motion: false,
      duration: 30,
      customDuration: 30,
      rounds: 4,
      remoteFiscal: false,
      teamNames: { blue: "Time Azul", red: "Time Vermelho" },
      players: { blue: ["Cali"], red: ["Paulo"] }
    }));
  });
}

async function openApp(page, path = "/") {
  await preparePage(page);
  await page.goto(path);
}

async function chooseDeck(page, deckName = "Bíblia") {
  await page.getByRole("button", { name: /Jogar agora/i }).click();
  await page.getByRole("button", { name: new RegExp(deckName, "i") }).click();
  await expect(page.getByRole("heading", { name: /Prepare a rodada/i })).toBeVisible();
}

async function createOnlineLobby(page) {
  await openApp(page);
  await chooseDeck(page);
  await page.getByRole("switch", { name: /Usar partida online/i }).click();
  await page.getByRole("button", { name: /Começar partida/i }).click();
  await expect(page.getByText(/Partida online/i).first()).toBeVisible();
  const code = (await page.locator(".online-room-card > strong").textContent()).trim();
  expect(code).toMatch(/^\d{4}$/);
  return code;
}

async function joinOnlineMatch(context, code, playerName) {
  const page = await context.newPage();
  await openApp(page, `/?room=${code}`);
  await expect(page.getByRole("heading", { name: /Quem é você/i })).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: new RegExp(playerName, "i") }).click();
  await expect(page.getByText(new RegExp(playerName, "i")).first()).toBeVisible();
  return page;
}

async function startFirstRound(hostPage) {
  await hostPage.getByRole("button", { name: /Começar partida/i }).click();
  await hostPage.getByRole("button", { name: /Estou pronto/i }).click();
  await expect(hostPage.getByRole("button", { name: /Acertou/i })).toBeVisible({ timeout: 6000 });
}

module.exports = {
  createOnlineLobby,
  joinOnlineMatch,
  preparePage,
  openApp,
  chooseDeck,
  startFirstRound
};
