(function () {
  const $app = document.querySelector("#app");
  const $toast = document.querySelector("#toast");
  const storageKey = "naoPodeSettings";

  const categoryLabels = {
    personagens: "Personagens",
    historias: "Historias",
    lugares: "Lugares",
    objetos: "Objetos",
    livros: "Livros",
    milagres: "Milagres",
    parabolas: "Parabolas",
    profetas: "Profetas",
    reis: "Reis",
    apostolos: "Apostolos",
    comidas: "Comidas",
    "filmes-series": "Filmes e series",
    esportes: "Esportes",
    animais: "Animais",
    tecnologia: "Tecnologia",
    games: "Games",
    musica: "Musica",
    profissoes: "Profissoes",
    viagens: "Viagens",
    natureza: "Natureza",
    transportes: "Transportes",
    "cultura-geral": "Cultura geral"
  };

  const categoryIcons = {
    personagens: "👤",
    historias: "📚",
    lugares: "🏛️",
    objetos: "🎒",
    livros: "📖",
    milagres: "✨",
    parabolas: "🌱",
    profetas: "📜",
    reis: "👑",
    apostolos: "🕊️",
    comidas: "🍔",
    "filmes-series": "🎬",
    esportes: "⚽",
    animais: "🐶",
    tecnologia: "💻",
    games: "🎮",
    musica: "🎵",
    profissoes: "🧰",
    viagens: "🧳",
    natureza: "🌿",
    transportes: "🚗",
    "cultura-geral": "🌟"
  };

  const difficultyLabels = {
    todas: "Todas",
    facil: "Facil",
    media: "Media",
    dificil: "Dificil"
  };

  const teamMeta = {
    blue: { dot: "🔵", className: "blue", label: "Time Azul", fallback: "Jose" },
    red: { dot: "🔴", className: "red", label: "Time Vermelho", fallback: "Pedro" }
  };

  const timeOptions = [30, 45, 60, 90, 120, 180];
  const defaultSettings = {
    sound: true,
    vibration: true,
    motion: true,
    duration: 60,
    customDuration: 60,
    rounds: 6,
    remoteFiscal: false,
    teamNames: { blue: "Time Azul", red: "Time Vermelho" },
    players: { blue: ["Jose"], red: ["Pedro"] }
  };

  const settings = loadSettings();
  const game = {
    mode: null,
    deck: [],
    teamNames: { ...settings.teamNames },
    players: { blue: [...settings.players.blue], red: [...settings.players.red] },
    duration: settings.duration,
    customDuration: settings.customDuration,
    customTimeActive: !timeOptions.includes(settings.duration),
    rounds: settings.rounds,
    difficulty: "todas",
    category: "todas",
    remoteFiscal: settings.remoteFiscal,
    usedCards: new Set(),
    currentRound: 0,
    scores: { blue: 0, red: 0 },
    roundStats: { correct: 0, skipped: 0, forbidden: 0 },
    totalStats: { correct: 0, skipped: 0, forbidden: 0 },
    bestRound: 0,
    currentCard: null,
    locked: false,
    transitioning: false,
    paused: false,
    pauseRemainingMs: 0,
    exitModal: false,
    endAt: 0,
    frameId: null,
    countdownId: null,
    audio: null,
    syncRoom: null,
    syncStatus: "idle",
    participants: {},
    roomState: null,
    hostIdentity: null,
    processedRoomEvents: new Set(),
    lastRoomEventId: null,
    roomTimerId: null,
    roomAdvanceId: null,
    fiscalConnected: false,
    lastTimerSecond: null
  };

  const fiscal = {
    endpoint: null,
    state: null,
    identity: null,
    view: "idle",
    renderedCardKey: null,
    timerId: null,
    requestTimer: null,
    holdTimer: null,
    holdFrame: null,
    holdStart: 0,
    lastEventId: null,
    lastTimerSecond: null
  };

  applyMotionPreference();

  const roomFromUrl = new URLSearchParams(window.location.search).get("room");
  if (roomFromUrl) renderFiscalJoin(roomFromUrl);
  else renderHome("forward", true);

  document.addEventListener("click", handleClick);
  document.addEventListener("input", handleInput);
  document.addEventListener("change", handleChange);
  document.addEventListener("pointerdown", startHold);
  document.addEventListener("pointerup", cancelHold);
  document.addEventListener("pointercancel", cancelHold);
  window.addEventListener("beforeunload", () => {
    game.syncRoom?.disconnect();
    fiscal.endpoint?.disconnect();
  });

  function handleClick(event) {
    const control = event.target.closest("[data-action]");
    if (!control) return;

    unlockAudio();
    const action = control.dataset.action;
    const value = control.dataset.value;

    if (!["correct", "forbidden", "skip", "hold-forbidden", "pick-mode"].includes(action)) feedback("tap");

    if (action === "home") guardedHome();
    if (action === "how") renderHow();
    if (action === "settings") renderSettings();
    if (action === "play-now") playHomeIntro(control);
    if (action === "mode") renderModeChoice();
    if (action === "pick-mode") selectMode(value, control);
    if (action === "set-time") setTime(Number(value));
    if (action === "show-custom-time") showCustomTime();
    if (action === "set-custom-time") setCustomTime(Number(value));
    if (action === "set-rounds") setRounds(Number(value));
    if (action === "set-difficulty") setDifficulty(value);
    if (action === "set-category") setCategory(value);
    if (action === "add-player") addPlayer(value);
    if (action === "remove-player") removePlayer(control.dataset.team, Number(control.dataset.index));
    if (action === "start-game") startGame();
    if (action === "start-after-room") startAfterRoom();
    if (action === "ready") startCountdown();
    if (action === "correct") markCard("correct");
    if (action === "forbidden") markCard("forbidden");
    if (action === "skip") markCard("skip");
    if (action === "pause") pauseRound();
    if (action === "resume") resumeRound();
    if (action === "ask-exit") openExitModal();
    if (action === "cancel-exit") closeExitModal();
    if (action === "confirm-exit") exitMatch();
    if (action === "round-continue") continueAfterRound();
    if (action === "next-round") renderPassPhone();
    if (action === "restart") restartSameSetup();
    if (action === "new-game") renderModeChoice();
    if (action === "toggle") toggleSetting(value);
    if (action === "copy-room") copyRoomLink();
    if (action === "join-fiscal") joinFiscalFromInput();
    if (action === "choose-host-identity") chooseHostIdentity(value, control.dataset.team);
    if (action === "choose-identity") chooseOnlineIdentity(value, control.dataset.team);
    if (action === "join-spectator") chooseOnlineIdentity("spectator", "spectator");
    if (action === "change-identity") changeOnlineIdentity();
    if (action === "disable-fiscal") disableFiscalMode();
    if (action === "room-next-round") advanceOnlineRound();
  }

  function handleInput(event) {
    const input = event.target;
    if (!input.matches("[data-player-input], [data-team-input], #custom-minutes, #custom-seconds")) return;
    syncConfigFromDom();
  }

  function handleChange(event) {
    const input = event.target;
    if (!input.matches("[data-player-input], [data-team-input], #custom-minutes, #custom-seconds")) return;
    syncConfigFromDom();
  }

  function loadSettings() {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return {
        ...defaultSettings,
        ...stored,
        teamNames: { ...defaultSettings.teamNames, ...(stored.teamNames || {}) },
        players: {
          blue: normalizePlayers(stored.players?.blue, defaultSettings.players.blue[0]),
          red: normalizePlayers(stored.players?.red, defaultSettings.players.red[0])
        }
      };
    } catch {
      return JSON.parse(JSON.stringify(defaultSettings));
    }
  }

  function persistSettings() {
    localStorage.setItem(storageKey, JSON.stringify({
      sound: settings.sound,
      vibration: settings.vibration,
      motion: settings.motion,
      duration: game.duration,
      customDuration: game.customDuration,
      rounds: game.rounds,
      remoteFiscal: game.remoteFiscal,
      teamNames: game.teamNames,
      players: game.players
    }));
  }

  function renderHome(direction = "back", immediate = false) {
    clearTimers();
    disconnectHostRoom();
    setScreen(`
      <section class="screen home">
        <div class="home-visual-bg" aria-hidden="true">
          <span class="light-arc arc-one"></span>
          <span class="light-arc arc-two"></span>
          <span class="light-arc arc-three"></span>
          <span class="bg-card bg-card-talk"><b>FALAR</b></span>
          <span class="bg-card bg-card-gesture"><b>GESTOS</b></span>
          <span class="bg-card bg-card-mime"><b>MÍMICA</b></span>
          <span class="bg-card bg-card-draw"><b>DESENHAR</b></span>
          <span class="bg-card bg-card-forbid"><b>NÃO<br>PODE!</b></span>
          <span class="party-chip chip-a"></span>
          <span class="party-chip chip-b"></span>
          <span class="party-chip chip-c"></span>
          <span class="party-chip chip-d"></span>
          <span class="sparkle sparkle-a"></span>
          <span class="sparkle sparkle-b"></span>
          <span class="sparkle sparkle-c"></span>
        </div>
        <div class="home-stage">
          <div class="home-logo-lockup">
            <div class="home-symbol-card" aria-hidden="true">
              <span class="ban-mark"></span>
            </div>
            <h1 class="home-title" aria-label="Não Pode!">
              <span class="home-title-no" aria-hidden="true">
                <span>N</span><span class="title-a">A<i>~</i></span><span>O</span>
              </span>
              <span class="home-title-pode">Pode!</span>
            </h1>
            <p class="home-subtitle">O jogo de palavras proibidas!</p>
          </div>
          <button class="home-play-button" data-action="play-now" aria-label="Jogar agora">
            <img src="assets/home/icon-play-button.png" alt="">
            <strong>Jogar agora</strong>
          </button>
          <div class="home-secondary-actions">
            <button class="home-secondary-button" data-action="how">
              <img src="assets/home/icon-books-premium.png" alt="">
              <strong>Como jogar</strong>
            </button>
            <button class="home-secondary-button" data-action="settings">
              <img src="assets/home/icon-gear-premium.png" alt="">
              <strong>Configurações</strong>
            </button>
          </div>
          <p class="home-invite">Reúna seus amigos<br>e teste seus limites!</p>
        </div>
      </section>
    `, direction, immediate);
  }

  function playHomeIntro(control) {
    const home = control.closest(".home");
    if (!home || home.classList.contains("launching")) return;
    home.classList.add("launching");
    feedback("correct");
    burstConfetti(18);
    setTimeout(() => renderModeChoice("forward"), motionDelay(640));
  }

  function ambientBackdrop(extraClass = "") {
    return `
      <div class="flow-visual-bg ${extraClass}" aria-hidden="true">
        <span class="light-arc flow-arc-one"></span>
        <span class="light-arc flow-arc-two"></span>
        <span class="party-chip flow-chip-a"></span>
        <span class="party-chip flow-chip-b"></span>
        <span class="party-chip flow-chip-c"></span>
        <span class="sparkle flow-sparkle-a"></span>
        <span class="sparkle flow-sparkle-b"></span>
      </div>
    `;
  }

  function renderHow() {
    setScreen(`
      <section class="screen info-screen premium-flow-screen">
        ${ambientBackdrop("info-bg")}
        <div class="stack premium-stack">
          ${topbar("Como jogar", "home")}
          <div class="panel summary-grid rules-panel">
            <div class="stat"><span>Veja a palavra principal</span><b>1</b></div>
            <div class="stat"><span>Dê pistas para sua equipe</span><b>2</b></div>
            <div class="stat"><span>Não fale as 5 proibidas</span><b>3</b></div>
            <div class="stat"><span>Some pontos antes do tempo acabar</span><b>4</b></div>
          </div>
          <button class="button primary" data-action="mode">Jogar agora</button>
        </div>
      </section>
    `);
  }

  function renderSettings() {
    setScreen(`
      <section class="screen settings-screen premium-flow-screen">
        ${ambientBackdrop("settings-bg")}
        <div class="stack premium-stack">
          ${topbar("Configurações", "home")}
          <div class="panel summary-grid">
            ${toggleRow("Som", "sound")}
            ${toggleRow("Vibração", "vibration")}
            ${toggleRow("Animações", "motion")}
          </div>
          <button class="button primary" data-action="home">Início</button>
        </div>
      </section>
    `);
  }

  function renderModeChoice(direction = "forward") {
    if (!game.currentCard) disconnectHostRoom();
    setScreen(`
      <section class="screen mode-screen">
        <div class="mode-visual-bg" aria-hidden="true">
          <span class="light-arc mode-arc-one"></span>
          <span class="light-arc mode-arc-two"></span>
          <span class="party-chip mode-chip-a"></span>
          <span class="party-chip mode-chip-b"></span>
          <span class="party-chip mode-chip-c"></span>
          <span class="sparkle mode-sparkle-a"></span>
          <span class="sparkle mode-sparkle-b"></span>
        </div>
        <div class="stack mode-stack">
          ${topbar("Baralhos", "home")}
          <div class="mode-headline">
            <span>Escolha a vibe da rodada</span>
            <h2>Qual baralho vai para a mesa?</h2>
          </div>
          <div class="deck-choice deck-choice-premium">
            ${modeCard("biblia", "assets/mode/deck-biblia-premium.png", "Bíblia", "Personagens, histórias, lugares, livros e milagres.", "150+ desafios", "Clássico")}
            ${modeCard("variados", "assets/mode/deck-variados-premium.png", "Temas variados", "Filmes, comidas, games, esportes, viagens e muito mais.", "150+ desafios", "Party")}
          </div>
        </div>
      </section>
    `, direction);
  }

  function modeCard(mode, image, title, description, count, tag) {
    return `
      <button class="mode-card deck-${mode}" data-action="pick-mode" data-value="${mode}">
        <span class="mode-check" aria-hidden="true">✓</span>
        <span class="mode-card-glow" aria-hidden="true"></span>
        <span class="mode-asset-wrap" aria-hidden="true">
          <img class="mode-asset" src="${image}" alt="">
        </span>
        <span class="mode-copy">
          <small>${tag}</small>
          <strong>${title}</strong>
          <p>${description}</p>
        </span>
        <span class="mode-count">${count}</span>
      </button>
    `;
  }

  function selectMode(mode, control) {
    if (control?.classList.contains("choosing")) return;
    game.mode = mode;
    game.deck = mode === "biblia" ? window.CARDS_BIBLIA : window.CARDS_VARIADOS;
    game.category = "todas";
    game.difficulty = "todas";
    control?.classList.add("selected", "choosing");
    document.querySelectorAll(".mode-card").forEach((card) => {
      if (card !== control) card.classList.add("dim-away");
    });
    feedback("deckSelect");
    setTimeout(renderConfig, motionDelay(620));
  }

  function renderConfig(direction = "forward") {
    const categories = [...new Set(game.deck.map((card) => card.categoria))]
      .sort((a, b) => labelForCategory(a).localeCompare(labelForCategory(b)));
    const modeTitle = game.mode === "biblia" ? "Bíblia" : "Temas variados";
    const customActive = game.customTimeActive || !timeOptions.includes(game.duration);

    setScreen(`
      <section class="screen config-screen premium-flow-screen">
        ${ambientBackdrop("setup-bg")}
        <div class="stack config-stack premium-stack">
          ${topbar("Partida", "mode")}
          <div class="setup-headline">
            <span>${escapeHtml(modeTitle)}</span>
            <h2>Prepare a rodada</h2>
          </div>
          <div class="game-setup">
            <section class="setup-block teams-block">
              <h3><span class="setup-icon">👥</span> Equipes</h3>
              <div class="team-columns">
                ${teamEditor("blue")}
                ${teamEditor("red")}
              </div>
            </section>
            <section class="setup-block">
              <h3><span class="setup-icon">⏱</span> Tempo</h3>
              <div class="chip-grid time-grid">
                ${timeOptions.map((seconds) => optionChip("set-time", seconds, formatDuration(seconds), !customActive && game.duration === seconds)).join("")}
                <button class="chip ${customActive ? "active" : ""}" data-action="show-custom-time" data-value="${game.customDuration}">Personalizado</button>
              </div>
              <div class="custom-time ${customActive ? "show" : ""}">
                ${[60, 120, 180, 240, 300].map((seconds) => optionChip("set-custom-time", seconds, formatDuration(seconds), game.duration === seconds)).join("")}
                <div class="custom-inputs">
                  <label>Min <input id="custom-minutes" inputmode="numeric" type="number" min="0" max="9" value="${Math.floor(game.customDuration / 60)}"></label>
                  <label>Seg <input id="custom-seconds" inputmode="numeric" type="number" min="0" max="59" value="${game.customDuration % 60}"></label>
                </div>
              </div>
            </section>
            <section class="setup-block">
              <h3><span class="setup-icon">🎯</span> Rodadas</h3>
              <div class="chip-grid">
                ${[4, 6, 8, 10, 12].map((rounds) => optionChip("set-rounds", rounds, String(rounds), game.rounds === rounds)).join("")}
              </div>
            </section>
            <section class="setup-block">
              <h3><span class="setup-icon">🔥</span> Dificuldade</h3>
              <div class="chip-grid">
                ${Object.entries(difficultyLabels).map(([value, label]) => optionChip("set-difficulty", value, label, game.difficulty === value)).join("")}
              </div>
            </section>
            <section class="setup-block">
              <h3><span class="setup-icon">🃏</span> Categoria</h3>
              <div class="chip-scroll">
                ${optionChip("set-category", "todas", "Todas", game.category === "todas")}
                ${categories.map((category) => optionChip("set-category", category, (categoryIcons[category] || "🃏") + " " + labelForCategory(category), game.category === category)).join("")}
              </div>
            </section>
            <section class="setup-block fiscal-setup">
              <div>
                <h3><span class="setup-icon">📱</span> Partida online</h3>
                <p>Convide por QR Code ou link para cada pessoa entrar com o proprio celular.</p>
              </div>
              <button class="switch" role="switch" aria-checked="${game.remoteFiscal}" aria-label="Usar partida online" data-action="toggle" data-value="remoteFiscal"></button>
            </section>
          </div>
          <button class="button primary" data-action="start-game">Começar partida</button>
        </div>
      </section>
    `, direction);
  }

  function teamEditor(team) {
    const meta = teamMeta[team];
    return `
      <div class="team-editor ${meta.className}">
        <label>${meta.dot} Time
          <input data-team-input="${team}" value="${escapeAttr(game.teamNames[team])}" autocomplete="off">
        </label>
        <div class="player-list" aria-label="Jogadores do ${escapeAttr(game.teamNames[team])}">
          ${game.players[team].map((player, index) => `
            <div class="player-row">
              <span>${index + 1}</span>
              <input data-player-input="${team}" data-index="${index}" value="${escapeAttr(player)}" autocomplete="off">
              <button class="icon-button danger" data-action="remove-player" data-team="${team}" data-index="${index}" aria-label="Remover jogador">
                ${xIcon()}
              </button>
            </div>
          `).join("")}
        </div>
        <button class="add-player" data-action="add-player" data-value="${team}">+ Jogador</button>
      </div>
    `;
  }

  function optionChip(action, value, label, active) {
    return `<button class="chip ${active ? "active" : ""}" data-action="${action}" data-value="${escapeAttr(value)}">${escapeHtml(label)}</button>`;
  }

  function setTime(seconds) {
    syncConfigFromDom();
    game.customTimeActive = false;
    game.duration = seconds;
    if (!timeOptions.includes(seconds)) game.customDuration = seconds;
    persistSettings();
    renderConfig("none");
  }

  function showCustomTime() {
    syncConfigFromDom();
    game.customTimeActive = true;
    game.duration = game.customDuration;
    persistSettings();
    renderConfig("none");
  }

  function setCustomTime(seconds) {
    syncConfigFromDom();
    game.customTimeActive = true;
    game.customDuration = seconds;
    game.duration = seconds;
    persistSettings();
    renderConfig("none");
  }

  function setRounds(rounds) {
    syncConfigFromDom();
    game.rounds = rounds;
    persistSettings();
    renderConfig("none");
  }

  function setDifficulty(value) {
    syncConfigFromDom();
    game.difficulty = value;
    renderConfig("none");
  }

  function setCategory(value) {
    syncConfigFromDom();
    game.category = value;
    renderConfig("none");
  }

  function addPlayer(team) {
    syncConfigFromDom();
    game.players[team].push("");
    renderConfig("none");
    const inputs = [...document.querySelectorAll(`[data-player-input="${team}"]`)];
    inputs[inputs.length - 1]?.focus();
  }

  function removePlayer(team, index) {
    syncConfigFromDom();
    if (game.players[team].length <= 1) {
      showToast("Cada time precisa de jogador");
      return;
    }
    game.players[team].splice(index, 1);
    renderConfig("none");
  }

  function syncConfigFromDom() {
    document.querySelectorAll("[data-team-input]").forEach((input) => {
      game.teamNames[input.dataset.teamInput] = input.value.trim() || teamMeta[input.dataset.teamInput].label;
    });

    ["blue", "red"].forEach((team) => {
      const names = [...document.querySelectorAll(`[data-player-input="${team}"]`)]
        .map((input) => input.value.trim())
        .filter(Boolean);
      if (names.length) game.players[team] = names;
    });

    const customMinutes = document.querySelector("#custom-minutes");
    const customSeconds = document.querySelector("#custom-seconds");
    if (customMinutes && customSeconds) {
      const minutes = clamp(Number(customMinutes.value || 0), 0, 9);
      const seconds = clamp(Number(customSeconds.value || 0), 0, 59);
      game.customDuration = clamp(minutes * 60 + seconds, 10, 599);
      if (game.customTimeActive) game.duration = game.customDuration;
    }
  }

  function startGame() {
    syncConfigFromDom();
    game.players.blue = normalizePlayers(game.players.blue, teamMeta.blue.fallback);
    game.players.red = normalizePlayers(game.players.red, teamMeta.red.fallback);
    game.duration = clamp(Number(game.duration), 10, 599);
    game.customDuration = clamp(Number(game.customDuration), 10, 599);
    game.usedCards = new Set();
    game.currentRound = 0;
    game.scores = { blue: 0, red: 0 };
    game.roundStats = { correct: 0, skipped: 0, forbidden: 0 };
    game.totalStats = { correct: 0, skipped: 0, forbidden: 0 };
    game.bestRound = 0;
    game.participants = {};
    game.roomState = null;
    game.hostIdentity = null;
    game.processedRoomEvents = new Set();
    game.lastRoomEventId = null;
    game.fiscalConnected = false;
    persistSettings();

    if (game.remoteFiscal) {
      createHostRoom();
      initializeRoomState();
      sendRoomState();
      renderHostIdentity();
      return;
    }
    renderPassPhone();
  }

  function createHostRoom() {
    disconnectHostRoom();
    game.syncRoom = window.NaoPodeSync?.createRoom();
    if (!game.syncRoom) {
      showToast("Sync indisponivel");
      return;
    }
    game.syncRoom.onConnectionChange(({ connected }) => {
      game.fiscalConnected = connected || activeParticipants().length > 0;
      updateFiscalStatus();
      if (connected) sendRoomState();
    });
    game.syncRoom.onIdentityChange?.((payload) => {
      handleParticipantIdentity(payload);
    });
    game.syncRoom.onPeerDisconnect?.((payload) => {
      if (payload?.role !== "host") removeParticipant(payload.id);
    });
    game.syncRoom.onStateRequest?.(() => {
      sendRoomState();
    });
    game.syncRoom.onGameEvent?.((event) => {
      handleRoomGameEvent(event);
    });
    game.syncRoom.onForbidden(() => {
      handleRoomGameEvent({ kind: "forbidden", actorId: game.roomState?.inspectorId, eventId: `legacy-${Date.now()}` });
    });
    sendRoomState();
  }

  function initializeRoomState() {
    game.roomState = {
      hostId: game.syncRoom?.id || "",
      host: game.syncRoom?.id || "",
      room: game.syncRoom?.code || "",
      participants: [],
      teams: {
        blue: { id: "blue", name: game.teamNames.blue, playerNames: [...game.players.blue] },
        red: { id: "red", name: game.teamNames.red, playerNames: [...game.players.red] }
      },
      currentPlayerId: null,
      currentTeamId: null,
      inspectorId: null,
      round: 0,
      currentRound: 0,
      roundState: "lobby",
      status: "lobby",
      remainingTime: game.duration,
      roundHits: 0,
      roundSkips: 0,
      roundForbidden: 0,
      roundStats: { correct: 0, skipped: 0, forbidden: 0 },
      totalStats: { correct: 0, skipped: 0, forbidden: 0 },
      scores: { blue: 0, red: 0 },
      currentCard: null,
      card: null,
      usedCardIds: [],
      duration: game.duration,
      rounds: game.rounds,
      roundStartedAt: null,
      roundEndsAt: null,
      startTimestamp: null,
      endTimestamp: null,
      pausedRemainingMs: 0,
      lastEvent: null,
      roundResult: null,
      matchFinished: false,
      winner: null,
      updatedAt: Date.now()
    };
    syncLocalFromRoomState();
  }

  function renderHostIdentity() {
    const state = game.roomState;
    if (!state) return;
    const occupied = new Set(occupiedPlayersSnapshot());
    setScreen(`
      <section class="screen fiscal-screen online-join-screen">
        ${ambientBackdrop("join-bg")}
        <div class="stack premium-stack">
          <div class="online-join-headline">
            <span>Host da sala ${escapeHtml(game.syncRoom?.code || "")}</span>
            <h2>Quem é você?</h2>
          </div>
          <div class="identity-board">
            ${identityTeam("blue", state.teams.blue.name, state.teams.blue.playerNames, occupied, "choose-host-identity")}
            ${identityTeam("red", state.teams.red.name, state.teams.red.playerNames, occupied, "choose-host-identity")}
          </div>
          <p class="sync-note center-note">O host tambem joga. Escolha seu nome e equipe para aparecer no lobby.</p>
        </div>
      </section>
    `, "forward", false);
  }

  function chooseHostIdentity(name, team) {
    if (!game.syncRoom || !game.roomState) return;
    if (team !== "spectator" && isPlayerOccupied(name, team, game.syncRoom.id)) {
      showToast("Jogador ja escolhido");
      renderHostIdentity();
      return;
    }
    const identity = { id: game.syncRoom.id, name, team };
    game.hostIdentity = identity;
    upsertRoomParticipant(game.syncRoom.id, identity, true);
    showToast(`Você é ${name}`);
    sendRoomState();
    renderRoomLobby();
  }

  function syncLocalFromRoomState() {
    const state = game.roomState;
    if (!state) return;
    game.participants = Object.fromEntries((state.participants || []).map((participant) => [participant.id, participant]));
    game.scores = { blue: state.scores?.blue || 0, red: state.scores?.red || 0 };
    game.currentRound = Number(state.round || 0);
    game.roundStats = {
      correct: Number(state.roundHits || state.roundStats?.correct || 0),
      skipped: Number(state.roundSkips || state.roundStats?.skipped || 0),
      forbidden: Number(state.roundForbidden || state.roundStats?.forbidden || 0)
    };
    game.totalStats = {
      correct: Number(state.totalStats?.correct || 0),
      skipped: Number(state.totalStats?.skipped || 0),
      forbidden: Number(state.totalStats?.forbidden || 0)
    };
    game.currentCard = state.currentCard || state.card || null;
  }

  function upsertRoomParticipant(id, identity, isHost = false) {
    if (!game.roomState || !id || !identity) return false;
    const name = String(identity.name || "").trim();
    const team = String(identity.team || "").trim();
    if (!name || !team || team === "spectator") return false;
    if (!isConfiguredPlayer(name, team)) return false;
    if (isPlayerOccupied(name, team, id)) return false;

    const participants = [...(game.roomState.participants || [])];
    const current = participants.find((participant) => participant.id === id);
    const next = {
      id,
      name,
      team,
      connected: true,
      isHost: isHost || id === game.roomState.hostId,
      joinedAt: current?.joinedAt || Date.now(),
      updatedAt: Date.now()
    };
    const index = participants.findIndex((participant) => participant.id === id);
    if (index >= 0) participants[index] = next;
    else participants.push(next);

    game.roomState.participants = participants;
    game.roomState.updatedAt = Date.now();
    syncLocalFromRoomState();
    return true;
  }

  function roomParticipantById(id) {
    return (game.roomState?.participants || []).find((participant) => participant.id === id && participant.connected);
  }

  function roomParticipantsByTeam(team) {
    const roster = game.roomState?.teams?.[team]?.playerNames || game.players[team] || [];
    const order = new Map(roster.map((name, index) => [playerKey(name, team), index]));
    return (game.roomState?.participants || [])
      .filter((participant) => participant.connected && participant.team === team)
      .sort((a, b) => {
        const aOrder = order.has(playerKey(a.name, team)) ? order.get(playerKey(a.name, team)) : 999;
        const bOrder = order.has(playerKey(b.name, team)) ? order.get(playerKey(b.name, team)) : 999;
        return aOrder - bOrder || a.joinedAt - b.joinedAt;
      });
  }

  function assignOnlineRoles() {
    if (!game.roomState) return false;
    const team = game.roomState.round % 2 === 0 ? "blue" : "red";
    const opponent = oppositeTeam(team);
    const teamPlayers = roomParticipantsByTeam(team);
    const inspectors = roomParticipantsByTeam(opponent);
    if (!teamPlayers.length || !inspectors.length) return false;
    const playerIndex = Math.floor(game.roomState.round / 2) % teamPlayers.length;
    const inspectorIndex = Math.floor(game.roomState.round / 2) % inspectors.length;
    const currentPlayer = teamPlayers[playerIndex];
    const inspector = inspectors[inspectorIndex];
    game.roomState.currentPlayerId = currentPlayer.id;
    game.roomState.currentTeamId = team;
    game.roomState.inspectorId = inspector.id;
    game.roomState.host = game.roomState.hostId;
    game.roomState.player = currentPlayer.name;
    game.roomState.team = team;
    game.roomState.teamName = game.roomState.teams[team].name;
    game.roomState.fiscalPlayer = inspector.name;
    return true;
  }

  function participantDisplayName(id, fallback = "jogador") {
    return roomParticipantById(id)?.name || fallback;
  }

  function handleParticipantIdentity(payload) {
    const id = payload?.id;
    const identity = payload?.identity;
    if (!id || !identity) return;

    if (identity.team === "spectator") {
      removeParticipant(id);
      sendRoomState();
      return;
    }

    if (!upsertRoomParticipant(id, identity, false)) {
      sendRoomState();
      return;
    }
    game.fiscalConnected = activeParticipants().length > 0;
    updateFiscalStatus();
    sendRoomState();
    if (document.querySelector(".room-screen")) renderRoomLobby("none");
  }

  function removeParticipant(id) {
    if (!id || !game.roomState) return;
    const participant = game.roomState.participants.find((item) => item.id === id);
    if (!participant) return;
    participant.connected = false;
    participant.updatedAt = Date.now();
    game.roomState.updatedAt = Date.now();
    syncLocalFromRoomState();
    game.fiscalConnected = activeParticipants().length > 0;
    updateFiscalStatus();
    sendRoomState();
    if (document.querySelector(".room-screen")) renderRoomLobby("none");
  }

  function activeParticipants() {
    return (game.roomState?.participants || Object.values(game.participants)).filter((participant) => participant.connected);
  }

  function playerKey(name, team) {
    return `${team}:${String(name || "").trim().toLowerCase()}`;
  }

  function occupiedPlayerKeys(exceptId = "") {
    return new Set(activeParticipants()
      .filter((participant) => participant.team !== "spectator" && participant.id !== exceptId)
      .map((participant) => playerKey(participant.name, participant.team)));
  }

  function isPlayerOccupied(name, team, exceptId = "") {
    return occupiedPlayerKeys(exceptId).has(playerKey(name, team));
  }

  function isConfiguredPlayer(name, team) {
    return (game.players[team] || []).some((player) => playerKey(player, team) === playerKey(name, team));
  }

  function occupiedPlayersSnapshot() {
    return [...occupiedPlayerKeys()];
  }

  function renderRoomLobby(direction = "forward") {
    const code = game.syncRoom?.code || "----";
    const link = game.syncRoom?.link || "";
    const isSupabase = game.syncRoom?.backend === "supabase";
    const participantCount = activeParticipants().filter((participant) => participant.team !== "spectator").length;
    setScreen(`
      <section class="screen room-screen premium-flow-screen">
        ${ambientBackdrop("room-bg")}
        <div class="stack premium-stack">
          ${topbar("Online", "mode")}
          <div class="room-card online-room-card">
            <span class="room-label">Partida online</span>
            <strong>${escapeHtml(code)}</strong>
            <div id="room-qr" class="qr-card qr-fallback" aria-label="QR Code para entrar como fiscal">${qrPattern(code)}</div>
            <p class="room-link">${escapeHtml(link)}</p>
            <button class="button white" data-action="copy-room">Copiar convite</button>
            <div id="fiscal-status" class="connection-status waiting">Esperando participantes</div>
            <div class="online-teams-preview">
              ${onlineTeamPreview("blue")}
              ${onlineTeamPreview("red")}
            </div>
            <div class="online-participant-list">
              <strong>Conectados (${participantCount})</strong>
              ${activeParticipants().filter((participant) => participant.team !== "spectator").map((participant) => `
                <span class="${teamMeta[participant.team]?.className || ""}">
                  ${participant.isHost ? "HOST · " : ""}${escapeHtml(participant.name)} · ${escapeHtml(game.roomState?.teams?.[participant.team]?.name || participant.team)}
                </span>
              `).join("") || "<small>Nenhum jogador conectado ainda.</small>"}
            </div>
            <div class="online-steps">
              <span>1. Envie o link</span>
              <span>2. Cada pessoa escolhe o nome</span>
              <span>3. Comece a rodada</span>
            </div>
            <p class="sync-note">${isSupabase ? "Quem entrar pelo link escolhe o proprio nome e ve uma tela adequada ao papel na rodada." : "Conexão online ainda não configurada. Este modo só conecta abas do mesmo navegador ate ativar o Supabase."}</p>
          </div>
          <button class="button primary" data-action="start-after-room">Começar partida</button>
        </div>
      </section>
    `, direction, false, () => {
      renderQRCode("room-qr", link);
      updateFiscalStatus();
    });
  }

  function onlineTeamPreview(team) {
    const players = game.roomState?.teams?.[team]?.playerNames || game.players[team] || [];
    const participants = activeParticipants().filter((participant) => participant.team === team);
    const occupied = new Map(participants.map((participant) => [playerKey(participant.name, team), participant]));
    return `
      <div class="online-team-preview ${teamMeta[team].className}">
        <strong>${teamMeta[team].dot} ${escapeHtml(game.roomState?.teams?.[team]?.name || game.teamNames[team])}</strong>
        <div>${players.map((player) => {
          const taken = occupied.get(playerKey(player, team));
          return `<span class="${taken ? "is-occupied" : ""}">${taken?.isHost ? "HOST · " : ""}${escapeHtml(player)}${taken ? " entrou" : ""}</span>`;
        }).join("")}</div>
      </div>
    `;
  }

  function startAfterRoom() {
    if (!game.remoteFiscal) {
      renderPassPhone();
      return;
    }

    if (!game.hostIdentity) {
      showToast("O host precisa escolher jogador");
      renderHostIdentity();
      return;
    }

    if (!roomParticipantsByTeam("blue").length || !roomParticipantsByTeam("red").length) {
      showToast("Cada time precisa de jogador conectado");
      sendRoomState();
      return;
    }

    beginOnlineRound();
  }

  function beginOnlineRound() {
    if (!game.roomState) return;
    clearTimers();
    if (!assignOnlineRoles()) {
      showToast("Aguardando jogadores dos dois times");
      game.roomState.roundState = "lobby";
      game.roomState.status = "lobby";
      sendRoomState();
      renderRoomLobby("none");
      return;
    }

    const card = pickCard();
    if (!card) {
      game.roomState.roundState = "no-cards";
      game.roomState.status = "no-cards";
      game.roomState.currentCard = null;
      game.roomState.card = null;
      sendRoomState();
      renderNoCards();
      return;
    }

    const now = Date.now();
    game.roomState.roundState = "playing";
    game.roomState.status = "playing";
    game.roomState.remainingTime = game.duration;
    game.roomState.roundHits = 0;
    game.roomState.roundSkips = 0;
    game.roomState.roundForbidden = 0;
    game.roomState.roundStats = { correct: 0, skipped: 0, forbidden: 0 };
    game.roomState.currentCard = card;
    game.roomState.card = card;
    game.roomState.roundStartedAt = now;
    game.roomState.roundEndsAt = now + game.duration * 1000;
    game.roomState.startTimestamp = game.roomState.roundStartedAt;
    game.roomState.endTimestamp = game.roomState.roundEndsAt;
    game.roomState.pausedRemainingMs = 0;
    game.roomState.roundResult = null;
    game.roomState.matchFinished = false;
    game.roomState.lastEvent = { id: `turn-${game.roomState.round}-${now}`, kind: "turn", team: game.roomState.currentTeamId, actorId: game.roomState.currentPlayerId, at: now };
    game.locked = false;
    game.paused = false;
    game.transitioning = false;
    syncLocalFromRoomState();
    sendRoomState();
    renderHostOnlineState(true);
    startRoomTimer();
  }

  function renderPassPhone(direction = "forward") {
    clearTimers();
    const team = currentTeam();
    const player = currentPlayer();
    const fiscalPlayer = currentFiscalPlayer();
    sendFiscalState("pass");
    setScreen(`
      <section class="screen pass-screen premium-flow-screen">
        ${ambientBackdrop("pass-bg")}
        <div class="stack center">
          <div class="pass-card">
            <div class="turn-team ${teamMeta[team].className}">${teamMeta[team].dot} Vez do ${escapeHtml(game.teamNames[team])}</div>
            <h2>${escapeHtml(player)}</h2>
            <p>vai dar as pistas!</p>
            <div class="phone-cue">Passe o celular para ${escapeHtml(player)}</div>
            <div class="privacy">Os outros jogadores não podem olhar a carta.</div>
            ${game.remoteFiscal ? `<div class="fiscal-cue">Fiscal sugerido: <strong>${escapeHtml(fiscalPlayer)}</strong></div>` : ""}
          </div>
          <button class="button primary hero-button" data-action="ready">Estou pronto</button>
        </div>
      </section>
    `, direction);
  }

  function startCountdown() {
    clearTimers();
    let count = 3;
    setScreen(`<section class="countdown" aria-label="Contagem regressiva"><span>${count}</span></section>`, "forward");
    feedback("countdown");
    game.countdownId = setInterval(() => {
      count -= 1;
      const node = $app.querySelector(".countdown span");
      if (count > 0) {
        if (node) {
          node.textContent = count;
          restartAnimation(node, "count-pop");
        }
        feedback("countdown");
        return;
      }
      if (node) {
        node.textContent = "Começou!";
        node.classList.add("started");
      }
      feedback("timeOverSoft");
      clearInterval(game.countdownId);
      game.countdownId = setTimeout(startRound, motionDelay(520));
    }, 780);
  }

  function startRound() {
    clearTimers();
    game.roundStats = { correct: 0, skipped: 0, forbidden: 0 };
    game.locked = false;
    game.transitioning = false;
    game.paused = false;
    game.exitModal = false;
    game.lastTimerSecond = null;
    game.currentCard = pickCard();

    if (!game.currentCard) {
      renderNoCards();
      return;
    }

    setScreen(`
      <section class="screen play-screen premium-flow-screen">
        ${ambientBackdrop("play-bg")}
        <div class="play-layout">
          <div class="play-top">
            <button class="icon-button soft" data-action="ask-exit" aria-label="Sair da partida">${xIcon()}</button>
            <div id="timer" class="timer">⏱ ${formatTime(game.duration)}</div>
            <button class="icon-button soft" data-action="pause" aria-label="Pausar">${pauseIcon()}</button>
          </div>
          <div class="score-mini" aria-label="Placar atual">
            <span>🔵 ${game.scores.blue}</span>
            <span>🔴 ${game.scores.red}</span>
          </div>
          <div class="round-meta">
            <strong>${escapeHtml(currentPlayer())}</strong>
            <span>${teamMeta[currentTeam()].dot} ${escapeHtml(game.teamNames[currentTeam()])}</span>
          </div>
          ${game.remoteFiscal ? fiscalHostStatus() : ""}
          <div id="card-slot" class="card-wrap">${game.remoteFiscal ? hostOnlineRoundCard() : cardMarkup(game.currentCard)}</div>
          <div class="bottom-actions ${game.remoteFiscal ? "online-actions" : ""}">
            <button class="button white round-button" data-action="skip"><span>⏭</span><strong>Pular</strong></button>
            <button class="button green round-button" data-action="correct"><span>✅</span><strong>Acertou</strong></button>
            ${game.remoteFiscal ? "" : `<button class="button red round-button" data-action="forbidden"><span>🚫</span><strong>Não pode</strong></button>`}
          </div>
        </div>
      </section>
    `, "forward", false, () => {
      game.endAt = Date.now() + game.duration * 1000;
      sendFiscalState("playing");
      tickTimer();
    });
  }

  function markCard(kind) {
    const onlineStatus = game.roomState?.roundState || fiscal.state?.roundState || fiscal.state?.status;
    if (onlineStatus === "playing" && (game.roomState || fiscal.state)) {
      sendRoomAction(kind);
      return;
    }
    if (game.locked || game.transitioning || game.paused || !game.currentCard) return;
    game.transitioning = true;
    setRoundButtonsDisabled(true);
    const card = document.querySelector(".game-card");
    const button = document.querySelector(`[data-action="${kind === "correct" ? "correct" : kind === "skip" ? "skip" : "forbidden"}"]`);

    if (kind === "correct") {
      game.scores[currentTeam()] += 1;
      game.roundStats.correct += 1;
      game.totalStats.correct += 1;
      showToast("+1 🎉");
      feedback("correct");
      button?.classList.add("pulse-once");
      card?.classList.add("pop", "lift");
      burstConfetti(14);
      setTimeout(nextCard, motionDelay(240));
    }

    if (kind === "forbidden") {
      game.roundStats.forbidden += 1;
      game.totalStats.forbidden += 1;
      showToast("🚨 NÃO PODE!");
      feedback("forbidden");
      card?.classList.add("shake", "wrong-flash");
      setTimeout(nextCard, motionDelay(300));
    }

    if (kind === "skip") {
      game.roundStats.skipped += 1;
      game.totalStats.skipped += 1;
      showToast("⏭ PULOU");
      feedback("skip");
      card?.classList.add("card-exit-left");
      setTimeout(nextCard, motionDelay(220));
    }
  }

  function sendRoomAction(kind) {
    const state = game.roomState || fiscal.state;
    const identity = currentOnlineIdentity();
    if (!state || !identity?.id || state.roundState !== "playing") return;

    const isCurrentPlayer = identity.id === state.currentPlayerId;
    const isInspector = identity.id === state.inspectorId;
    if ((kind === "correct" || kind === "skip") && !isCurrentPlayer) {
      showToast("Apenas o jogador da vez controla a carta");
      return;
    }
    if (kind === "forbidden" && !isInspector) {
      showToast("Apenas o fiscal registra proibida");
      return;
    }

    const event = {
      eventId: `${identity.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      kind,
      actorId: identity.id,
      round: state.round,
      cardId: state.card?.id || state.currentCard?.id || null,
      at: Date.now()
    };

    if (game.syncRoom && identity.id === game.syncRoom.id) handleRoomGameEvent(event);
    else fiscal.endpoint?.sendGameEvent?.(event);
  }

  function currentOnlineIdentity() {
    if (game.syncRoom && game.hostIdentity) return { ...game.hostIdentity, id: game.syncRoom.id };
    if (fiscal.endpoint && fiscal.identity) return { ...fiscal.identity, id: fiscal.endpoint.id };
    return null;
  }

  function handleRoomGameEvent(event) {
    if (!game.roomState || game.roomState.roundState !== "playing") return;
    const eventId = event?.eventId || `${event?.actorId || "event"}-${event?.kind || "unknown"}-${event?.at || Date.now()}`;
    if (game.processedRoomEvents.has(eventId)) return;
    game.processedRoomEvents.add(eventId);

    const kind = event?.kind;
    const actorId = event?.actorId;
    if (Number(event?.round) !== Number(game.roomState.round)) {
      sendRoomState();
      return;
    }
    if ((kind === "correct" || kind === "skip") && actorId !== game.roomState.currentPlayerId) {
      sendRoomState();
      return;
    }
    if (kind === "forbidden" && actorId !== game.roomState.inspectorId) {
      sendRoomState();
      return;
    }
    if (event?.cardId && game.roomState.currentCard?.id && event.cardId !== game.roomState.currentCard.id) {
      sendRoomState();
      return;
    }

    applyRoomAction(kind, eventId, actorId);
  }

  function applyRoomAction(kind, eventId, actorId) {
    const state = game.roomState;
    if (!state) return;
    const team = state.currentTeamId;
    const now = Date.now();

    if (kind === "correct") {
      state.scores[team] = Number(state.scores[team] || 0) + 1;
      state.roundHits += 1;
      state.roundStats.correct = state.roundHits;
      state.totalStats.correct = Number(state.totalStats.correct || 0) + 1;
    }

    if (kind === "skip") {
      state.roundSkips += 1;
      state.roundStats.skipped = state.roundSkips;
      state.totalStats.skipped = Number(state.totalStats.skipped || 0) + 1;
    }

    if (kind === "forbidden") {
      state.roundForbidden += 1;
      state.roundStats.forbidden = state.roundForbidden;
      state.totalStats.forbidden = Number(state.totalStats.forbidden || 0) + 1;
    }

    state.lastEvent = {
      id: eventId,
      kind,
      actorId,
      team,
      score: { ...state.scores },
      roundHits: state.roundHits,
      roundSkips: state.roundSkips,
      roundForbidden: state.roundForbidden,
      at: now
    };

    const next = pickCard();
    if (!next) {
      finishOnlineRound(false);
      return;
    }
    state.currentCard = next;
    state.card = next;
    state.remainingTime = roomRemainingSeconds(state);
    state.updatedAt = now;
    syncLocalFromRoomState();
    sendRoomState();
    renderHostOnlineState(false);
  }

  function nextCard() {
    if (game.locked) return;
    const next = pickCard();
    if (!next) {
      finishRound(false);
      return;
    }
    game.currentCard = next;
    game.transitioning = false;
    setRoundButtonsDisabled(false);
    const slot = document.querySelector("#card-slot");
    if (slot) slot.innerHTML = cardMarkup(next, "card-enter-right");
    updateMiniScore();
    sendFiscalState("playing");
  }

  function pickCard() {
    const available = game.deck.filter((card) => {
      const categoryMatch = game.category === "todas" || card.categoria === game.category;
      const difficultyMatch = game.difficulty === "todas" || card.dificuldade === game.difficulty;
      return categoryMatch && difficultyMatch && !game.usedCards.has(card.id);
    });
    if (!available.length) return null;
    const card = available[Math.floor(Math.random() * available.length)];
    game.usedCards.add(card.id);
    return card;
  }

  function hostOnlineRoundCard() {
    return `
      <article class="participant-card host-private-card playing">
        <span>Rodada ${game.currentRound + 1}/${escapeHtml(game.rounds)}</span>
        <h2>Carta no celular do jogador</h2>
        <p>${escapeHtml(currentPlayer())} ve a carta completa. Acertos e pulos ficam no aparelho do jogador da vez.</p>
        <div class="participant-turn ${teamMeta[currentTeam()].className}">
          <strong>${teamMeta[currentTeam()].dot} ${escapeHtml(game.teamNames[currentTeam()])}</strong>
          <small>Fiscal: ${escapeHtml(currentFiscalPlayer())}</small>
        </div>
      </article>
    `;
  }

  function tickTimer() {
    const timer = document.querySelector("#timer");
    if (!timer || game.locked || game.paused) return;
    const remainingMs = game.endAt - Date.now();
    const remaining = Math.max(0, Math.ceil(remainingMs / 1000));
    timer.textContent = remaining <= 5 && remaining > 0 ? `🔥 ${remaining}` : `⏱ ${formatTime(remaining)}`;
    timer.classList.toggle("hot", remaining <= 10 && remaining > 0);
    timer.classList.toggle("last-five", remaining <= 5 && remaining > 0);

    if (remaining !== game.lastTimerSecond) {
      if (remaining <= 5 && remaining > 0) feedback("tick");
      game.lastTimerSecond = remaining;
      if (remaining % 5 === 0 || remaining <= 10) sendFiscalState("playing");
    }

    if (remainingMs <= 0) {
      finishRound(true);
      return;
    }
    game.frameId = requestAnimationFrame(tickTimer);
  }

  function finishRound(playEffects) {
    if (game.locked) return;
    game.locked = true;
    game.paused = false;
    clearTimers();
    setRoundButtonsDisabled(true);
    game.bestRound = Math.max(game.bestRound, game.roundStats.correct);
    sendFiscalState("ended");
    if (playEffects) {
      showToast("⏰ TEMPO!");
      feedback("timeOver");
    }
    setTimeout(renderRoundEnd, playEffects ? motionDelay(620) : motionDelay(180));
  }

  function renderRoundEnd() {
    const player = currentPlayer();
    setScreen(`
      <section class="screen summary-screen premium-flow-screen">
        ${ambientBackdrop("summary-bg")}
        <div class="stack center">
          <div class="panel summary-grid round-end">
            <h2>Fim da rodada</h2>
            <p><strong>${escapeHtml(player)}</strong></p>
            <div class="stat score-pop"><span>Acertos</span><b>${game.roundStats.correct}</b></div>
            <div class="stat score-pop delay-1"><span>Puladas</span><b>${game.roundStats.skipped}</b></div>
            <div class="stat score-pop delay-2"><span>Não Pode</span><b>${game.roundStats.forbidden}</b></div>
            <div class="points-won">Pontos conquistados <strong>+${game.roundStats.correct}</strong></div>
          </div>
          <button class="button primary" data-action="round-continue">Continuar</button>
        </div>
      </section>
    `);
  }

  function continueAfterRound() {
    game.currentRound += 1;
    if (game.currentRound >= game.rounds) {
      renderGameEnd();
      return;
    }
    renderScoreboard();
  }

  function renderScoreboard() {
    const nextTeam = currentTeam();
    const blueLeads = game.scores.blue > game.scores.red;
    const redLeads = game.scores.red > game.scores.blue;
    const leaderText = blueLeads
      ? `${game.teamNames.blue} está na frente!`
      : redLeads
        ? `${game.teamNames.red} está na frente!`
        : "Tudo empatado!";
    const maxScore = Math.max(1, game.scores.blue, game.scores.red);

    setScreen(`
      <section class="screen score-screen premium-flow-screen">
        ${ambientBackdrop("score-bg")}
        <div class="stack center">
          <div class="panel scoreboard">
            <h2>Placar</h2>
            ${teamScore("blue", blueLeads, maxScore)}
            ${teamScore("red", redLeads, maxScore)}
            <p class="leader-line">${escapeHtml(leaderText)}</p>
            <div class="next-player">
              <span>Proximo</span>
              <strong>${escapeHtml(currentPlayer())}</strong>
              <small>${teamMeta[nextTeam].dot} ${escapeHtml(game.teamNames[nextTeam])}</small>
            </div>
          </div>
          <button class="button primary" data-action="next-round">Próxima rodada</button>
        </div>
      </section>
    `);
  }

  function teamScore(team, leader, maxScore) {
    const pct = Math.max(8, Math.round((game.scores[team] / maxScore) * 100));
    return `
      <div class="team-score ${team} ${leader ? "leader" : ""}">
        <strong>${teamMeta[team].dot} ${escapeHtml(game.teamNames[team])}</strong>
        <b>${game.scores[team]}</b>
        <span class="score-bar"><i style="width:${pct}%"></i></span>
      </div>
    `;
  }

  function renderGameEnd() {
    sendFiscalState("final");
    const winner = getWinner();
    feedback("victory");
    burstConfetti(56);
    const result = winner === "draw"
      ? `<h2>Empate!</h2><p><strong>${game.scores.blue} x ${game.scores.red}</strong></p>`
      : `<h2>${escapeHtml(game.teamNames[winner].toUpperCase())} venceu!</h2><p><strong>${game.scores[winner]}</strong><span> pontos</span></p>`;

    setScreen(`
      <section class="screen final-screen premium-flow-screen">
        ${ambientBackdrop("final-bg")}
        <div class="stack center">
          <div class="panel winner">
            <div class="big">🏆</div>
            ${result}
            <div class="summary-grid">
              <div class="stat"><span>Acertos</span><b>${game.totalStats.correct}</b></div>
              <div class="stat"><span>Não Pode</span><b>${game.totalStats.forbidden}</b></div>
              <div class="stat"><span>Puladas</span><b>${game.totalStats.skipped}</b></div>
              <div class="stat"><span>Melhor rodada</span><b>${game.bestRound}</b></div>
            </div>
          </div>
          <div class="actions three">
            <button class="button primary" data-action="restart">Revanche</button>
            <button class="button white" data-action="new-game">Nova partida</button>
            <button class="button ghost" data-action="home">Início</button>
          </div>
        </div>
      </section>
    `);
  }

  function renderNoCards() {
    sendFiscalState("no-cards");
    setScreen(`
      <section class="screen no-cards-screen premium-flow-screen">
        ${ambientBackdrop("empty-bg")}
        <div class="stack center">
          <div class="panel summary-grid">
            <h2>Sem cartas</h2>
            <p class="empty">Não há cartas suficientes para esse filtro sem repetir durante a partida.</p>
            <p class="muted">Troque a categoria ou dificuldade para continuar jogando com cartas novas.</p>
          </div>
          <button class="button primary" data-action="mode">Escolher baralho</button>
        </div>
      </section>
    `);
  }

  function restartSameSetup() {
    game.usedCards = new Set();
    game.currentRound = 0;
    game.scores = { blue: 0, red: 0 };
    game.roundStats = { correct: 0, skipped: 0, forbidden: 0 };
    game.totalStats = { correct: 0, skipped: 0, forbidden: 0 };
    game.bestRound = 0;
    renderPassPhone();
  }

  function pauseRound() {
    if (game.locked || game.paused) return;
    game.paused = true;
    game.pauseRemainingMs = Math.max(0, game.endAt - Date.now());
    clearTimers();
    setRoundButtonsDisabled(true);
    document.querySelector(".play-screen")?.classList.add("is-paused");
    document.querySelector(".play-layout")?.insertAdjacentHTML("beforeend", `
      <div class="pause-overlay">
        <div>
          <h2>⏸ Partida pausada</h2>
          <p>A carta fica escondida ate continuar.</p>
          <button class="button primary" data-action="resume">▶ Continuar</button>
        </div>
      </div>
    `);
    sendFiscalState("paused");
  }

  function resumeRound() {
    if (!game.paused) return;
    game.paused = false;
    game.endAt = Date.now() + game.pauseRemainingMs;
    document.querySelector(".pause-overlay")?.remove();
    document.querySelector(".play-screen")?.classList.remove("is-paused");
    setRoundButtonsDisabled(false);
    sendFiscalState("playing");
    tickTimer();
  }

  function openExitModal() {
    if (game.locked || document.querySelector(".modal-backdrop")) return;
    if (!game.paused) {
      game.exitModal = true;
      game.paused = true;
      game.pauseRemainingMs = Math.max(0, game.endAt - Date.now());
      clearTimers();
      setRoundButtonsDisabled(true);
    }
    document.querySelector(".play-layout")?.insertAdjacentHTML("beforeend", `
      <div class="modal-backdrop">
        <div class="modal">
          <h2>Sair da partida?</h2>
          <p>O progresso atual sera perdido. O cronometro esta pausado enquanto esta janela esta aberta.</p>
          <div class="actions two">
            <button class="button white" data-action="cancel-exit">Cancelar</button>
            <button class="button red" data-action="confirm-exit">Sair</button>
          </div>
        </div>
      </div>
    `);
    sendFiscalState("paused");
  }

  function closeExitModal() {
    document.querySelector(".modal-backdrop")?.remove();
    if (game.exitModal) {
      game.exitModal = false;
      game.paused = false;
      game.endAt = Date.now() + game.pauseRemainingMs;
      setRoundButtonsDisabled(false);
      sendFiscalState("playing");
      tickTimer();
    }
  }

  function exitMatch() {
    sendFiscalState("closed");
    clearTimers();
    disconnectHostRoom();
    game.currentCard = null;
    game.locked = false;
    game.paused = false;
    renderHome("back");
  }

  function guardedHome() {
    if (game.roomState) {
      exitMatch();
      return;
    }
    if (game.currentCard && !game.locked && !game.paused) {
      openExitModal();
      return;
    }
    renderHome("back");
  }

  function renderFiscalJoin(code = "") {
    disconnectHostRoom();
    resetFiscalView();
    setScreen(`
      <section class="screen fiscal-screen">
        ${ambientBackdrop("fiscal-bg")}
        <div class="stack center">
          <div class="panel fiscal-join">
            <h2>Entrar na partida</h2>
            <p>Digite o código da sala ou abra pelo link enviado pelo celular principal.</p>
            <label>Código da sala
              <input id="room-code" inputmode="numeric" maxlength="4" value="${escapeAttr(code)}" autocomplete="off">
            </label>
            <button class="button primary" data-action="join-fiscal">Continuar</button>
            <p class="sync-note">Depois de conectar, escolha seu nome para receber a tela certa da rodada.</p>
          </div>
        </div>
      </section>
    `, "forward", true);
    if (code) joinFiscalFromInput();
  }

  function joinFiscalFromInput() {
    const code = document.querySelector("#room-code")?.value.trim();
    if (!code) {
      showToast("Digite o código");
      return;
    }
    fiscal.endpoint?.disconnect();
    resetFiscalView();
    fiscal.endpoint = window.NaoPodeSync?.joinRoom(code);
    fiscal.endpoint?.onStateChange((state) => {
      clearInterval(fiscal.requestTimer);
      fiscal.state = normalizeRoomState(state);
      if (!confirmCurrentIdentity(fiscal.state)) return;
      if (fiscal.identity) renderFiscalMirror();
      else renderOnlineIdentity();
    });
    fiscal.endpoint?.onConnectionChange(({ connected }) => {
      showToast(connected ? "✅ Participante conectado" : "⚠ Host desconectado");
    });
    clearInterval(fiscal.requestTimer);
    fiscal.requestTimer = setInterval(() => {
      if (fiscal.state) {
        clearInterval(fiscal.requestTimer);
        return;
      }
      fiscal.endpoint?.requestState?.();
    }, 900);
    fiscal.endpoint?.requestState?.();
    renderFiscalMirror();
  }

  function confirmCurrentIdentity(state) {
    if (!fiscal.identity || fiscal.identity.name === "spectator") return true;
    const ownId = fiscal.endpoint?.id || fiscal.identity.id;
    const accepted = (state.participants || []).some((participant) => (
      participant.id === ownId &&
      participant.name === fiscal.identity.name &&
      participant.team === fiscal.identity.team
    ));
    const occupiedByOther = (state.occupiedPlayers || []).includes(playerKey(fiscal.identity.name, fiscal.identity.team));

    if (occupiedByOther && !accepted) {
      fiscal.identity = null;
      fiscal.renderedCardKey = null;
      showToast("Jogador ja escolhido");
      renderOnlineIdentity();
      return false;
    }

    return true;
  }

  function normalizeRoomState(state) {
    if (!state) return state;
    const roundState = state.roundState || (state.status === "ended" ? "finished" : state.status) || "lobby";
    const currentTeamId = state.currentTeamId || state.team || null;
    const currentPlayerId = state.currentPlayerId || getStateParticipantByName(state, state.player, currentTeamId)?.id || null;
    const inspectorId = state.inspectorId || getStateParticipantByName(state, state.fiscalPlayer, oppositeTeam(currentTeamId || "blue"))?.id || null;
    return {
      ...state,
      host: state.host || state.hostId,
      roundState,
      status: roundState,
      currentTeamId,
      currentPlayerId,
      inspectorId,
      round: Number.isFinite(Number(state.round)) ? Number(state.round) : Number(state.currentRound || 0),
      currentRound: Number.isFinite(Number(state.currentRound)) ? Number(state.currentRound) : Number(state.round || 0),
      currentCard: state.currentCard || state.card || null,
      card: state.card || state.currentCard || null,
      roundHits: Number(state.roundHits ?? state.roundStats?.correct ?? 0),
      roundSkips: Number(state.roundSkips ?? state.roundStats?.skipped ?? 0),
      roundForbidden: Number(state.roundForbidden ?? state.roundStats?.forbidden ?? 0),
      roundEndsAt: state.roundEndsAt || state.endTimestamp,
      roundStartedAt: state.roundStartedAt || state.startTimestamp,
      teams: state.teams || {
        blue: { id: "blue", name: state.teamNames?.blue || game.teamNames.blue, playerNames: state.players?.blue || game.players.blue },
        red: { id: "red", name: state.teamNames?.red || game.teamNames.red, playerNames: state.players?.red || game.players.red }
      }
    };
  }

  function getStateParticipantByName(state, name, team) {
    const key = playerKey(name, team);
    return (state?.participants || []).find((participant) => playerKey(participant.name, participant.team) === key);
  }

  function renderOnlineIdentity() {
    const state = fiscal.state;
    if (!state) {
      renderFiscalWaiting();
      return;
    }

    const teams = state.players || game.players;
    const teamNames = state.teamNames || game.teamNames;
    const occupied = new Set((state.occupiedPlayers || []).filter((key) => key !== playerKey(fiscal.identity?.name, fiscal.identity?.team)));
    setScreen(`
      <section class="screen fiscal-screen online-join-screen">
        ${ambientBackdrop("join-bg")}
        <div class="stack premium-stack">
          <div class="online-join-headline">
            <span>Sala ${escapeHtml(fiscal.endpoint?.code || state.room || "")}</span>
            <h2>Quem é você?</h2>
          </div>
          <div class="identity-board">
            ${identityTeam("blue", teamNames.blue, teams.blue || [], occupied)}
            ${identityTeam("red", teamNames.red, teams.red || [], occupied)}
          </div>
          <button class="button white" data-action="join-spectator">Entrar como espectador</button>
          <p class="sync-note center-note">Escolha seu nome para o app mostrar carta, placar ou fiscalização conforme sua vez.</p>
        </div>
      </section>
    `, "none", true, () => {
      fiscal.view = "identity";
      fiscal.renderedCardKey = null;
    });
  }

  function identityTeam(team, name, players, occupied = new Set(), action = "choose-identity") {
    return `
      <section class="identity-team ${teamMeta[team].className}">
        <h3>${teamMeta[team].dot} ${escapeHtml(name || teamMeta[team].label)}</h3>
        <div>
          ${players.map((player) => {
            const taken = occupied.has(playerKey(player, team));
            return `
            <button class="identity-player ${taken ? "is-occupied" : ""}" ${taken ? "disabled" : ""} data-action="${action}" data-team="${team}" data-value="${escapeAttr(player)}">
              <span>${escapeHtml(player.slice(0, 1).toUpperCase())}</span>
              <strong>${escapeHtml(player)}${taken ? " ocupado" : ""}</strong>
            </button>
          `;
          }).join("")}
        </div>
      </section>
    `;
  }

  function chooseOnlineIdentity(name, team) {
    const identity = { id: fiscal.endpoint?.id || "", name, team };
    const occupied = new Set(fiscal.state?.occupiedPlayers || []);
    if (team !== "spectator" && occupied.has(playerKey(name, team))) {
      showToast("Jogador ja escolhido");
      renderOnlineIdentity();
      return;
    }
    fiscal.identity = identity;
    fiscal.renderedCardKey = null;
    fiscal.endpoint?.sendIdentity?.(identity);
    showToast(name === "spectator" ? "Entrou como espectador" : `Você é ${name}`);
    renderFiscalMirror();
  }

  function changeOnlineIdentity() {
    fiscal.identity = null;
    fiscal.renderedCardKey = null;
    renderOnlineIdentity();
  }

  function renderFiscalMirror() {
    const state = fiscal.state;
    if (!state) {
      renderFiscalWaiting();
      return;
    }
    renderOnlineRoomView(state, fiscal.identity || { id: fiscal.endpoint?.id || "", name: "spectator", team: "spectator" }, false);
  }

  function renderHostOnlineState(force = false) {
    const state = game.roomState;
    if (!state || !game.hostIdentity) return;
    renderOnlineRoomView(state, { ...game.hostIdentity, id: game.syncRoom?.id || game.hostIdentity.id }, true, force);
  }

  function renderOnlineRoomView(state, identity, isHostDevice = false, force = false) {
    if (!state) return;
    const viewOwner = isHostDevice ? "host" : "participant";
    const viewKey = `${viewOwner}:${state.roundState}:${identity?.id || "spectator"}`;
    if (fiscal.view !== viewKey || force) {
      setScreen(`
        <section class="screen fiscal-screen online-room-screen">
          ${ambientBackdrop("fiscal-bg")}
          <div class="fiscal-layout">
            <div class="fiscal-top">
              <span id="participant-role-label">Partida online</span>
              <strong id="fiscal-player-name"></strong>
              <small id="fiscal-player-target"></small>
            </div>
            <div id="fiscal-timer" class="timer">⏱ ${fiscalTime(state)}</div>
            <div id="participant-score" class="participant-score"></div>
            <div id="fiscal-card-slot"></div>
            <div class="participant-round-actions">
              <button class="button white round-button" data-action="skip"><span>⏭</span><strong>Pular</strong></button>
              <button class="button green round-button" data-action="correct"><span>✅</span><strong>Acertou</strong></button>
            </div>
            <button class="hold-button" data-action="hold-forbidden" data-hold="forbidden">
              <span class="hold-progress" aria-hidden="true"></span>
              <strong>Segure se ele falar uma proibida</strong>
            </button>
            <div class="participant-actions">
              ${isHostDevice ? `<button class="button primary" data-action="room-next-round">Próximo jogador</button>` : ""}
              ${isHostDevice ? `<button class="button ghost" data-action="home">Encerrar</button>` : `<button class="button ghost" data-action="change-identity">Trocar jogador</button>`}
            </div>
          </div>
        </section>
      `, "none", true, () => {
        fiscal.view = viewKey;
        updateOnlineRoomDom(state, identity, isHostDevice, true);
      });
    } else {
      updateOnlineRoomDom(state, identity, isHostDevice, false);
    }
    if (!isHostDevice) startFiscalTimer();
  }

  function renderFiscalWaiting() {
    if (fiscal.view === "waiting") {
      const status = document.querySelector("#fiscal-waiting-status");
      if (status) status.textContent = `Sala ${fiscal.endpoint?.code || ""}`;
      return;
    }

    setScreen(`
      <section class="screen fiscal-screen">
        ${ambientBackdrop("fiscal-bg")}
        <div class="stack center">
          <div class="panel fiscal-join">
            <h2>Conectando...</h2>
            <p>Aguardando o host enviar a rodada.</p>
            <div id="fiscal-waiting-status" class="connection-status waiting">Sala ${escapeHtml(fiscal.endpoint?.code || "")}</div>
          </div>
        </div>
      </section>
    `, "none", true, () => {
      fiscal.view = "waiting";
      fiscal.renderedCardKey = null;
    });
  }

  function updateFiscalMirrorDom(forceCard) {
    updateOnlineRoomDom(fiscal.state, fiscal.identity || { id: fiscal.endpoint?.id || "", name: "spectator", team: "spectator" }, false, forceCard);
  }

  function updateOnlineRoomDom(state, identity, isHostDevice, forceCard) {
    if (!state) return;

    const name = document.querySelector("#fiscal-player-name");
    const target = document.querySelector("#fiscal-player-target");
    const roleLabel = document.querySelector("#participant-role-label");
    const timer = document.querySelector("#fiscal-timer");
    const slot = document.querySelector("#fiscal-card-slot");
    const holdButton = document.querySelector(".hold-button");
    const roundActions = document.querySelector(".participant-round-actions");
    const nextButton = document.querySelector('[data-action="room-next-round"]');
    const score = document.querySelector("#participant-score");
    const selfId = identity?.id || "";
    const actor = getStateParticipant(state, state.currentPlayerId);
    const actorName = actor?.name || state.player || "jogador";
    const actorTeam = state.currentTeamId || state.team || "blue";
    const isActor = identity?.team !== "spectator" && selfId === state.currentPlayerId;
    const isSameTeam = identity?.team !== "spectator" && identity?.team === actorTeam;
    const isInspector = identity?.team !== "spectator" && selfId === state.inspectorId;
    const canFlag = isInspector && state.roundState === "playing";
    const teamNames = state.teamNames || game.teamNames;
    const scores = state.scores || { blue: 0, red: 0 };
    const lastEvent = state.lastEvent || null;
    const eventHolder = isHostDevice ? game : fiscal;
    const eventKey = isHostDevice ? "lastRoomEventId" : "lastEventId";
    const isFreshScoreEvent = lastEvent?.kind === "correct" && eventHolder[eventKey] !== lastEvent.id;

    applyRoomEventEffects(state, identity, isHostDevice);

    if (roleLabel) roleLabel.textContent = participantRoleLabel(state, identity, isActor, isInspector, isSameTeam);
    if (name) name.textContent = identity?.team === "spectator" ? "Espectador" : identity?.name;
    if (target) target.textContent = participantTargetLabel(state, identity, isActor, isInspector, isSameTeam);
    if (timer) {
      timer.textContent = `⏱ ${fiscalTime(state)}`;
      const remaining = roomRemainingSeconds(state);
      timer.classList.toggle("paused", state.roundState === "paused");
      timer.classList.toggle("hot", remaining <= 10 && remaining > 0);
      timer.classList.toggle("last-five", remaining <= 5 && remaining > 0);
    }
    if (score) {
      score.innerHTML = `
        <span class="blue ${isFreshScoreEvent && lastEvent?.team === "blue" ? "score-bump" : ""}">🔵 ${escapeHtml(teamNames.blue || "Time Azul")} <strong>${scores.blue || 0}</strong></span>
        <span class="red ${isFreshScoreEvent && lastEvent?.team === "red" ? "score-bump" : ""}">🔴 ${escapeHtml(teamNames.red || "Time Vermelho")} <strong>${scores.red || 0}</strong></span>
      `;
    }
    if (roundActions) roundActions.hidden = !(isActor && state.roundState === "playing");
    if (holdButton) {
      holdButton.hidden = !isInspector;
      holdButton.disabled = !canFlag;
      holdButton.querySelector("strong").textContent = canFlag
        ? "Segure se ele falar uma proibida"
        : "Fiscalização disponível quando a rodada estiver ativa";
    }
    if (nextButton) nextButton.hidden = !(isHostDevice && state.roundState === "finished");

    const visibleCard = (isActor || isInspector) && state.roundState === "playing" ? state.card : null;
    const cardKey = visibleCard
      ? `card:${visibleCard.id || visibleCard.palavra}`
      : `viewer:${state.roundState}:${actorName}:${state.round || 0}:${state.updatedAt || ""}`;
    if (slot && (forceCard || fiscal.renderedCardKey !== cardKey)) {
      slot.innerHTML = visibleCard
        ? cardMarkup(visibleCard, "fiscal-card")
        : participantStatusCard(state, identity, isActor, isInspector, isSameTeam);
      fiscal.renderedCardKey = cardKey;
    }
  }

  function participantRoleLabel(state, identity, isActor, isInspector, isSameTeam) {
    if (isActor) return "Sua vez";
    if (isInspector) return "Fiscalize a rodada";
    if (identity?.team === "spectator") return "Acompanhando";
    if (state.roundState === "lobby") return "No lobby";
    if (isSameTeam) return "Sua equipe acompanha";
    return "Acompanhando";
  }

  function participantTargetLabel(state, identity, isActor, isInspector, isSameTeam) {
    const actorName = getStateParticipant(state, state.currentPlayerId)?.name || state.player || "Jogador";
    if (state.roundState === "lobby") return "aguardando inicio da partida";
    if (isActor) return "voce ve a carta completa";
    if (isInspector) return `fiscalizando ${actorName}`;
    if (isSameTeam) return `torcendo por ${actorName}`;
    return `vez de ${actorName}`;
  }

  function participantStatusCard(state, identity, isActor, isInspector, isSameTeam) {
    const status = state.roundState || state.status || "lobby";
    const teamNames = state.teamNames || game.teamNames;
    const actorTeam = state.currentTeamId || state.team || "blue";
    const actor = getStateParticipant(state, state.currentPlayerId);
    const actorName = actor?.name || state.player || "Jogador";
    const actorTeamName = teamNames[actorTeam] || state.teamName || "Time";
    const roundNumber = Number.isFinite(Number(state.round)) ? Number(state.round) + 1 : 1;
    const totalRounds = state.rounds || game.rounds;
    if (status === "finished") return roundResultCard(state, identity, isActor, isSameTeam);
    if (status === "final") return finalResultCard(state);
    const messages = {
      lobby: ["Aguardando inicio", "A partida ainda esta no lobby."],
      playing: isInspector
        ? ["Olho nas proibidas", "Se a pessoa falar uma palavra proibida, segure o botao vermelho."]
        : isSameTeam
          ? ["Sua equipe joga", `Acompanhe ${actorName}, o tempo e o placar em tempo real.`]
          : ["Rodada em andamento", "Acompanhe o tempo e o placar sem ver a carta."],
      paused: ["Partida pausada", "A carta fica protegida ate o host continuar."],
      "no-cards": ["Sem cartas", "O host precisa trocar o filtro ou iniciar outra partida."],
      closed: ["Partida encerrada", "O host saiu da partida."]
    };
    const [title, copy] = messages[status] || messages.lobby;

    return `
      <article class="participant-card ${status}">
        <span>Rodada ${roundNumber}/${escapeHtml(totalRounds)}</span>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(copy)}</p>
        <div class="participant-turn ${teamMeta[actorTeam]?.className || ""}">
          <strong>${teamMeta[actorTeam]?.dot || "•"} ${escapeHtml(actorTeamName)}</strong>
          <small>${escapeHtml(actorName || "aguardando jogador")}</small>
        </div>
      </article>
    `;
  }

  function getStateParticipant(state, id) {
    return (state?.participants || []).find((participant) => participant.id === id);
  }

  function roundResultCard(state, identity, wasActor, isSameTeam) {
    const result = state.roundResult || {};
    const teamNames = state.teamNames || game.teamNames;
    const teamId = result.teamId || state.currentTeamId || "blue";
    const teamName = teamNames[teamId] || "Time";
    const actorName = result.playerName || getStateParticipant(state, result.playerId)?.name || state.player || "Jogador";
    const title = wasActor
      ? "Seu resumo"
      : isSameTeam
        ? "Boa rodada!"
        : "Resultado atualizado";
    const copy = wasActor
      ? `${actorName}, confira sua rodada completa.`
      : isSameTeam
        ? `${actorName} fez +${result.points || 0} para ${teamName}.`
        : `${teamName} marcou +${result.points || 0}.`;

    return `
      <article class="participant-card finished result-card ${teamMeta[teamId]?.className || ""}">
        <span>Rodada ${(state.round || 0) + 1}/${escapeHtml(state.rounds || game.rounds)}</span>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(copy)}</p>
        <div class="summary-grid mini-result-grid">
          <div class="stat score-pop"><span>Acertos</span><b>${result.hits || 0}</b></div>
          <div class="stat score-pop delay-1"><span>Pulos</span><b>${result.skips || 0}</b></div>
          <div class="stat score-pop delay-2"><span>Proibidas</span><b>${result.forbidden || 0}</b></div>
        </div>
        <div class="points-won score-pop">Pontos conquistados <strong>+${result.points || 0}</strong></div>
        <div class="participant-turn ${teamMeta[teamId]?.className || ""}">
          <strong>${teamMeta[teamId]?.dot || "•"} ${escapeHtml(teamName)}</strong>
          <small>Placar: ${escapeHtml(teamNames.blue || "Azul")} ${state.scores?.blue || 0} x ${state.scores?.red || 0} ${escapeHtml(teamNames.red || "Vermelho")}</small>
        </div>
      </article>
    `;
  }

  function finalResultCard(state) {
    const winner = state.winner || getWinnerFromScores(state.scores || {});
    const teamNames = state.teamNames || game.teamNames;
    const title = winner === "draw" ? "Empate!" : `${teamNames[winner] || "Time"} venceu!`;
    return `
      <article class="participant-card final">
        <span>Fim da partida</span>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(finalParticipantMessage(state))}</p>
        <div class="participant-turn">
          <strong>Placar final</strong>
          <small>${escapeHtml(teamNames.blue || "Azul")} ${state.scores?.blue || 0} x ${state.scores?.red || 0} ${escapeHtml(teamNames.red || "Vermelho")}</small>
        </div>
      </article>
    `;
  }

  function applyRoomEventEffects(state, identity, isHostDevice) {
    const event = state?.lastEvent;
    if (!event?.id) return;
    const key = isHostDevice ? "lastRoomEventId" : "lastEventId";
    const holder = isHostDevice ? game : fiscal;
    if (holder[key] === event.id) return;
    holder[key] = event.id;

    if (event.kind === "correct") {
      showFloatingPoint("+1", event.team);
      showToast("+1");
      feedback("correct");
      burstConfetti(12);
    }
    if (event.kind === "skip") {
      showToast("Pulou");
      feedback("skip");
    }
    if (event.kind === "forbidden") {
      showToast("NÃO PODE!");
      feedback("forbidden");
    }
    if (event.kind === "finish" || event.kind === "final") {
      feedback(event.kind === "final" ? "victory" : "timeOverSoft");
      if ((state.roundResult?.points || 0) >= 3 || event.kind === "final") burstConfetti(40);
    }
    if (event.kind === "turn") {
      const actor = getStateParticipant(state, event.actorId)?.name || state.player || "jogador";
      showToast(`Vez de ${actor}`);
      feedback("countdown");
    }
  }

  function showFloatingPoint(text, team) {
    if (!settings.motion) return;
    const layer = document.createElement("div");
    layer.className = `floating-point ${teamMeta[team]?.className || ""}`;
    layer.textContent = text;
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 900);
  }

  function updateOnlineTimerDom(state) {
    const timer = document.querySelector("#fiscal-timer");
    if (!timer) return;
    timer.textContent = `⏱ ${fiscalTime(state)}`;
    const remaining = roomRemainingSeconds(state);
    timer.classList.toggle("hot", remaining <= 10 && remaining > 0);
    timer.classList.toggle("last-five", remaining <= 5 && remaining > 0);
  }

  function startFiscalTimer() {
    clearInterval(fiscal.timerId);
    fiscal.timerId = setInterval(() => {
      const timer = document.querySelector("#fiscal-timer");
      if (!timer || !fiscal.state) return;
      timer.textContent = `⏱ ${fiscalTime(fiscal.state)}`;
      const remaining = roomRemainingSeconds(fiscal.state);
      timer.classList.toggle("hot", remaining <= 10 && remaining > 0);
      timer.classList.toggle("last-five", remaining <= 5 && remaining > 0);
      if (remaining <= 5 && remaining > 0 && remaining !== fiscal.lastTimerSecond) feedback("tick");
      fiscal.lastTimerSecond = remaining;
    }, 250);
  }

  function startHold(event) {
    const button = event.target.closest("[data-hold='forbidden']");
    const status = fiscal.state?.roundState || fiscal.state?.status;
    if (!button || button.disabled || button.hidden || !fiscal.endpoint || !fiscal.state || status !== "playing") return;
    button.setPointerCapture?.(event.pointerId);
    fiscal.holdStart = Date.now();
    button.classList.add("holding");
    const progress = button.querySelector(".hold-progress");
    const paint = () => {
      const pct = clamp((Date.now() - fiscal.holdStart) / 500, 0, 1);
      if (progress) progress.style.setProperty("--hold", `${pct * 100}%`);
      if (pct < 1) fiscal.holdFrame = requestAnimationFrame(paint);
    };
    paint();
    fiscal.holdTimer = setTimeout(() => {
      sendRoomAction("forbidden");
      showToast("🚨 NÃO PODE REGISTRADO");
      feedback("forbidden");
      cancelHold();
    }, 500);
  }

  function cancelHold() {
    clearTimeout(fiscal.holdTimer);
    cancelAnimationFrame(fiscal.holdFrame);
    fiscal.holdTimer = null;
    fiscal.holdFrame = null;
    document.querySelectorAll(".hold-button").forEach((button) => {
      button.classList.remove("holding");
      button.querySelector(".hold-progress")?.style.setProperty("--hold", "0%");
    });
  }

  function sendFiscalState(status) {
    if (game.roomState) {
      game.roomState.roundState = status === "ended" ? "finished" : status;
      game.roomState.status = status;
      sendRoomState();
      return;
    }
    if (!game.syncRoom) return;
    game.syncStatus = status;
    const remainingMs = game.paused ? game.pauseRemainingMs : Math.max(0, game.endAt - Date.now());
    game.syncRoom.sendState({
      status,
      statusLabel: status === "pass" ? "Aguardando jogador" : status === "ended" ? "Fim da rodada" : "Aguardando",
      room: game.syncRoom.code,
      player: currentPlayer(),
      fiscalPlayer: currentFiscalPlayer(),
      team: currentTeam(),
      teamName: game.teamNames[currentTeam()],
      teamNames: game.teamNames,
      players: game.players,
      participants: activeParticipants(),
      occupiedPlayers: occupiedPlayersSnapshot(),
      scores: game.scores,
      currentRound: game.currentRound,
      rounds: game.rounds,
      roundStats: game.roundStats,
      card: status === "playing" || status === "paused" ? game.currentCard : null,
      duration: game.duration,
      startTimestamp: game.endAt - game.duration * 1000,
      endTimestamp: game.endAt,
      pausedRemainingMs: remainingMs,
      winner: status === "final" ? getWinner() : null,
      updatedAt: Date.now()
    });
  }

  function sendRoomState() {
    if (!game.syncRoom || !game.roomState) return;
    const state = game.roomState;
    state.hostId = game.syncRoom.id;
    state.host = game.syncRoom.id;
    state.room = game.syncRoom.code;
    state.currentRound = state.round;
    state.status = state.roundState;
    state.roundStats = {
      correct: Number(state.roundHits || 0),
      skipped: Number(state.roundSkips || 0),
      forbidden: Number(state.roundForbidden || 0)
    };
    state.player = participantDisplayName(state.currentPlayerId, state.player || "jogador");
    state.fiscalPlayer = participantDisplayName(state.inspectorId, state.fiscalPlayer || "fiscal");
    state.team = state.currentTeamId || state.team || "blue";
    state.teamName = state.teams?.[state.team]?.name || game.teamNames[state.team] || "Time";
    state.teamNames = {
      blue: state.teams?.blue?.name || game.teamNames.blue,
      red: state.teams?.red?.name || game.teamNames.red
    };
    state.players = {
      blue: state.teams?.blue?.playerNames || game.players.blue,
      red: state.teams?.red?.playerNames || game.players.red
    };
    state.usedCardIds = [...game.usedCards];
    state.occupiedPlayers = occupiedPlayersSnapshot();
    state.currentCard = state.currentCard || state.card || null;
    state.card = state.roundState === "playing" || state.roundState === "paused" ? state.currentCard : null;
    state.remainingTime = roomRemainingSeconds(state);
    state.endTimestamp = state.roundEndsAt;
    state.startTimestamp = state.roundStartedAt;
    state.updatedAt = Date.now();
    game.syncStatus = state.roundState;
    game.syncRoom.sendState(JSON.parse(JSON.stringify(state)));
    updateFiscalStatus();
  }

  function finalParticipantMessage(state) {
    if (!state.scores) return "Confira o resultado no celular principal.";
    if (state.winner === "draw") return `Empate em ${state.scores.blue || 0} x ${state.scores.red || 0}.`;
    const teamNames = state.teamNames || game.teamNames;
    const winnerName = teamNames[state.winner] || "Um time";
    return `${winnerName} venceu por ${state.scores[state.winner] || 0} pontos.`;
  }

  function roomRemainingSeconds(state) {
    if (!state || state.roundState !== "playing") return Number(state?.remainingTime || 0);
    return Math.max(0, Math.ceil((Number(state.roundEndsAt || state.endTimestamp || 0) - Date.now()) / 1000));
  }

  function startRoomTimer() {
    clearInterval(game.roomTimerId);
    game.roomTimerId = setInterval(() => {
      if (!game.roomState || game.roomState.roundState !== "playing") {
        clearInterval(game.roomTimerId);
        game.roomTimerId = null;
        return;
      }
      const remaining = roomRemainingSeconds(game.roomState);
      game.roomState.remainingTime = remaining;
      updateOnlineTimerDom(game.roomState);
      const changedSecond = remaining !== game.lastTimerSecond;
      if (remaining <= 5 && remaining > 0 && changedSecond) feedback("tick");
      game.lastTimerSecond = remaining;
      if (remaining <= 0) finishOnlineRound(true);
      else if (changedSecond && (remaining % 5 === 0 || remaining <= 10)) sendRoomState();
    }, 250);
  }

  function finishOnlineRound(playEffects) {
    if (!game.roomState || game.roomState.roundState !== "playing") return;
    clearInterval(game.roomTimerId);
    game.roomTimerId = null;
    const state = game.roomState;
    state.roundState = "finished";
    state.status = state.roundState;
    state.matchFinished = state.round + 1 >= state.rounds;
    state.remainingTime = 0;
    state.card = null;
    state.currentCard = null;
    state.roundResult = {
      playerId: state.currentPlayerId,
      playerName: participantDisplayName(state.currentPlayerId),
      teamId: state.currentTeamId,
      inspectorId: state.inspectorId,
      hits: state.roundHits,
      skips: state.roundSkips,
      forbidden: state.roundForbidden,
      points: state.roundHits,
      scores: { ...state.scores },
      finishedAt: Date.now()
    };
    state.bestRound = Math.max(Number(state.bestRound || 0), state.roundHits);
    state.winner = state.matchFinished ? getWinnerFromScores(state.scores) : null;
    state.lastEvent = {
      id: `finish-${state.round}-${Date.now()}`,
      kind: state.matchFinished ? "final" : "finish",
      team: state.currentTeamId,
      actorId: state.currentPlayerId,
      at: Date.now()
    };
    syncLocalFromRoomState();
    sendRoomState();
    renderHostOnlineState(true);
    if (playEffects) {
      showToast("TEMPO!");
      feedback("timeOver");
    }
    if (state.roundResult.points >= 3) burstConfetti(36);
    scheduleOnlineAdvance();
  }

  function scheduleOnlineAdvance() {
    clearTimeout(game.roomAdvanceId);
    if (!game.roomState || game.roomState.roundState !== "finished") return;
    game.roomAdvanceId = setTimeout(() => advanceOnlineRound(), motionDelay(5200));
  }

  function advanceOnlineRound() {
    if (!game.roomState) return;
    clearTimeout(game.roomAdvanceId);
    if (game.roomState.roundState === "final") {
      renderHostOnlineState(true);
      return;
    }
    if (game.roomState.matchFinished) {
      game.roomState.roundState = "final";
      game.roomState.status = "final";
      game.roomState.lastEvent = {
        id: `final-${Date.now()}`,
        kind: "final",
        at: Date.now()
      };
      sendRoomState();
      renderHostOnlineState(true);
      return;
    }
    game.roomState.round += 1;
    game.roomState.currentRound = game.roomState.round;
    beginOnlineRound();
  }

  function getWinnerFromScores(scores) {
    if ((scores?.blue || 0) === (scores?.red || 0)) return "draw";
    return (scores?.blue || 0) > (scores?.red || 0) ? "blue" : "red";
  }

  function currentTeam() {
    return game.currentRound % 2 === 0 ? "blue" : "red";
  }

  function oppositeTeam(team) {
    return team === "blue" ? "red" : "blue";
  }

  function currentPlayer() {
    const team = currentTeam();
    const index = Math.floor(game.currentRound / 2) % game.players[team].length;
    return game.players[team][index];
  }

  function currentFiscalPlayer() {
    const team = oppositeTeam(currentTeam());
    const index = Math.floor(game.currentRound / 2) % game.players[team].length;
    return game.players[team][index];
  }

  function getWinner() {
    if (game.scores.blue === game.scores.red) return "draw";
    return game.scores.blue > game.scores.red ? "blue" : "red";
  }

  function cardMarkup(card, extraClass = "") {
    return `
      <article class="game-card ${extraClass}">
        <div class="prompt">Faça seu time adivinhar</div>
        <div class="card-emoji" aria-hidden="true">${card.emoji}</div>
        <h2 class="word">${escapeHtml(card.palavra)}</h2>
        <div class="forbidden-title">🚫 Não pode</div>
        <ol class="forbidden-list">
          ${card.proibidas.map((word) => `<li><span>🚫</span>${escapeHtml(word)}</li>`).join("")}
        </ol>
      </article>
    `;
  }

  function updateMiniScore() {
    const score = document.querySelector(".score-mini");
    if (score) score.innerHTML = `<span>🔵 ${game.scores.blue}</span><span>🔴 ${game.scores.red}</span>`;
  }

  function topbar(title, backAction) {
    return `
      <div class="topbar">
        <button class="back" data-action="${backAction}" aria-label="Voltar">${backIcon()}</button>
        <h2>${title}</h2>
        <span aria-hidden="true" class="topbar-spacer"></span>
      </div>
    `;
  }

  function toggleRow(label, key) {
    return `
      <div class="toggle-row">
        <strong>${label}</strong>
        <button class="switch" role="switch" aria-checked="${settings[key]}" aria-label="${label}" data-action="toggle" data-value="${key}"></button>
      </div>
    `;
  }

  function toggleSetting(key) {
    if (key === "remoteFiscal") {
      syncConfigFromDom();
      game.remoteFiscal = !game.remoteFiscal;
      persistSettings();
      renderConfig("none");
      return;
    }
    settings[key] = !settings[key];
    persistSettings();
    applyMotionPreference();
    renderSettings();
  }

  function setScreen(html, direction = "forward", immediate = false, afterRender) {
    const current = $app.firstElementChild;
    const enterClass = direction === "back" ? "screen-enter-back" : direction === "none" ? "screen-enter-none" : "screen-enter-forward";
    const exitClass = direction === "back" ? "screen-exit-back" : "screen-exit-forward";
    const shouldResetScroll = direction !== "none";

    if (!current || immediate || direction === "none" || !settings.motion) {
      $app.innerHTML = html;
      $app.firstElementChild?.classList.add(enterClass);
      if (shouldResetScroll) resetViewportScroll();
      afterRender?.();
      return;
    }

    current.classList.add(exitClass);
    setTimeout(() => {
      $app.innerHTML = html;
      $app.firstElementChild?.classList.add(enterClass);
      if (shouldResetScroll) resetViewportScroll();
      afterRender?.();
    }, motionDelay(120));
  }

  function resetViewportScroll() {
    document.scrollingElement?.scrollTo({ top: 0, left: 0 });
    $app.scrollTo?.({ top: 0, left: 0 });
  }

  function showToast(message) {
    $toast.textContent = message;
    $toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => $toast.classList.remove("show"), 650);
  }

  function feedback(type) {
    vibrateFeedback(type);
    playSfx(type);
  }

  function vibrateFeedback(type) {
    if (!settings.vibration || !("vibrate" in navigator)) return;
    const patterns = {
      tap: 10,
      correct: 40,
      skip: 20,
      forbidden: [80, 40, 100],
      countdown: 20,
      tick: 8,
      timeOver: [120, 50, 150],
      timeOverSoft: 50,
      victory: [60, 40, 90],
      deckSelect: [16, 22, 32]
    };
    navigator.vibrate(patterns[type] || 10);
  }

  function unlockAudio() {
    if (!settings.sound || game.audio) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      game.audio = new AudioContext();
      game.audio.resume?.();
    } catch {
      settings.sound = false;
      persistSettings();
    }
  }

  function playSfx(type) {
    if (!settings.sound) return;
    if (type === "deckSelect") {
      playSweep(260, 920, 190, "sine", 0.022);
      setTimeout(() => playSweep(520, 1320, 135, "triangle", 0.017), 72);
      setTimeout(() => playTone(1240, 72, "sine", 0.014), 148);
      return;
    }
    const patterns = {
      tap: [[520, 35, "sine", 0.018]],
      correct: [[680, 50, "triangle", 0.035], [920, 75, "triangle", 0.025]],
      forbidden: [[170, 100, "sawtooth", 0.032], [120, 80, "square", 0.02]],
      skip: [[390, 45, "sine", 0.025]],
      countdown: [[540, 55, "square", 0.025]],
      tick: [[760, 25, "sine", 0.014]],
      timeOver: [[180, 150, "sawtooth", 0.034], [120, 160, "sawtooth", 0.024]],
      timeOverSoft: [[700, 70, "triangle", 0.03]],
      victory: [[620, 70, "triangle", 0.03], [820, 80, "triangle", 0.026], [1040, 110, "triangle", 0.024]]
    };
    (patterns[type] || patterns.tap).forEach((tone, index) => {
      setTimeout(() => playTone(...tone), index * 70);
    });
  }

  function playTone(frequency, duration, type = "sine", volume = 0.02) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      game.audio ||= new AudioContext();
      const oscillator = game.audio.createOscillator();
      const gain = game.audio.createGain();
      oscillator.frequency.value = frequency;
      oscillator.type = type;
      gain.gain.setValueAtTime(volume, game.audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, game.audio.currentTime + duration / 1000);
      oscillator.connect(gain).connect(game.audio.destination);
      oscillator.start();
      oscillator.stop(game.audio.currentTime + duration / 1000);
    } catch {
      settings.sound = false;
      persistSettings();
    }
  }

  function playSweep(startFrequency, endFrequency, duration, type = "sine", volume = 0.018) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      game.audio ||= new AudioContext();
      const oscillator = game.audio.createOscillator();
      const gain = game.audio.createGain();
      const now = game.audio.currentTime;
      oscillator.frequency.setValueAtTime(startFrequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), now + duration / 1000);
      oscillator.type = type;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration / 1000);
      oscillator.connect(gain).connect(game.audio.destination);
      oscillator.start(now);
      oscillator.stop(now + duration / 1000);
    } catch {
      settings.sound = false;
      persistSettings();
    }
  }

  function burstConfetti(amount) {
    if (!settings.motion) return;
    const colors = ["#FFC928", "#FF3D4F", "#28C76F", "#1677FF", "#FFFFFF"];
    const layer = document.createElement("div");
    layer.className = "confetti";
    for (let index = 0; index < amount; index += 1) {
      const piece = document.createElement("i");
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[index % colors.length];
      piece.style.animationDelay = `${Math.random() * 150}ms`;
      piece.style.transform = `rotate(${Math.random() * 110}deg)`;
      layer.appendChild(piece);
    }
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 1200);
  }

  function clearTimers() {
    if (game.frameId) cancelAnimationFrame(game.frameId);
    if (game.countdownId) clearInterval(game.countdownId);
    clearInterval(game.roomTimerId);
    clearTimeout(game.roomAdvanceId);
    clearInterval(fiscal.timerId);
    game.frameId = null;
    game.countdownId = null;
    game.roomTimerId = null;
    game.roomAdvanceId = null;
  }

  function disconnectHostRoom() {
    game.syncRoom?.disconnect();
    game.syncRoom = null;
    game.fiscalConnected = false;
    game.roomState = null;
    game.hostIdentity = null;
  }

  function resetFiscalView() {
    clearInterval(fiscal.timerId);
    clearInterval(fiscal.requestTimer);
    cancelHold();
    fiscal.state = null;
    fiscal.identity = null;
    fiscal.view = "idle";
    fiscal.renderedCardKey = null;
    fiscal.timerId = null;
    fiscal.requestTimer = null;
    fiscal.lastEventId = null;
    fiscal.lastTimerSecond = null;
  }

  function setRoundButtonsDisabled(disabled) {
    document.querySelectorAll(".round-button").forEach((button) => {
      button.disabled = disabled;
    });
  }

  function updateFiscalStatus() {
    const status = document.querySelector("#fiscal-status");
    if (status) {
      status.textContent = game.fiscalConnected ? "✅ Participante conectado" : "⚠ Esperando participantes";
      status.className = `connection-status ${game.fiscalConnected ? "connected" : "waiting"}`;
    }
    const playStatus = document.querySelector("#fiscal-play-status");
    if (playStatus) {
      playStatus.className = `fiscal-play-status ${game.fiscalConnected ? "connected" : "waiting"}`;
      playStatus.innerHTML = game.fiscalConnected
        ? "✅ Participante conectado"
        : "⚠ Sem participantes <button data-action=\"disable-fiscal\">Continuar local</button>";
    }
  }

  function fiscalHostStatus() {
    return `
      <div id="fiscal-play-status" class="fiscal-play-status ${game.fiscalConnected ? "connected" : "waiting"}">
        ${game.fiscalConnected ? "✅ Participante conectado" : "⚠ Sem participantes <button data-action=\"disable-fiscal\">Continuar local</button>"}
      </div>
    `;
  }

  function disableFiscalMode() {
    game.remoteFiscal = false;
    disconnectHostRoom();
    document.querySelector("#fiscal-play-status")?.remove();
    persistSettings();
    showToast("Partida online desligada");
  }

  async function copyRoomLink() {
    try {
      await navigator.clipboard?.writeText(game.syncRoom?.link || "");
      showToast("Link copiado");
    } catch {
      showToast("Copie o link da tela");
    }
  }

  function fiscalTime(state) {
    const status = state.roundState || state.status;
    if (status === "paused") return formatTime(Math.ceil((state.pausedRemainingMs || 0) / 1000));
    if (status !== "playing") return "--:--";
    return formatTime(roomRemainingSeconds(state));
  }

  function applyMotionPreference() {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    document.body.classList.toggle("no-motion", !settings.motion || reduce);
  }

  function decorations() {
    return `
      <div class="screen-decor" aria-hidden="true">
        <span>✦</span><span>◆</span><span>★</span><span>✕</span><span>●</span>
      </div>
    `;
  }

  function qrPattern(code) {
    const seed = String(code).split("").reduce((sum, char) => sum + Number(char), 0);
    return Array.from({ length: 49 }, (_, index) => `<i class="${(index * seed + index) % 3 ? "" : "on"}"></i>`).join("");
  }

  function renderQRCode(targetId, text) {
    const target = document.querySelector(`#${targetId}`);
    if (!target || !text || !window.QRCode) return;
    target.innerHTML = "";
    target.classList.remove("qr-fallback");
    try {
      new window.QRCode(target, {
        text,
        width: 148,
        height: 148,
        colorDark: "#081f4d",
        colorLight: "#ffffff",
        correctLevel: window.QRCode.CorrectLevel.M
      });
    } catch {
      target.classList.add("qr-fallback");
      target.innerHTML = qrPattern(text);
    }
  }

  function backIcon() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  function pauseIcon() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h3v12H8zM13 6h3v12h-3z" fill="currentColor"/></svg>`;
  }

  function xIcon() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>`;
  }

  function restartAnimation(node, className) {
    node.classList.remove(className);
    void node.offsetWidth;
    node.classList.add(className);
  }

  function formatTime(totalSeconds) {
    const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function formatDuration(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return rest ? `${minutes}m ${rest}s` : `${minutes} min`;
  }

  function labelForCategory(category) {
    return categoryLabels[category] || category;
  }

  function normalizePlayers(players, fallback) {
    const list = Array.isArray(players) ? players.map((name) => String(name).trim()).filter(Boolean) : [];
    return list.length ? list : [fallback];
  }

  function motionDelay(milliseconds) {
    return settings.motion ? milliseconds : 25;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }
})();
