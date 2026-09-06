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
    fiscalConnected: false,
    lastTimerSecond: null
  };

  const fiscal = {
    endpoint: null,
    state: null,
    timerId: null,
    requestTimer: null,
    holdTimer: null,
    holdFrame: null,
    holdStart: 0
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

    if (!["correct", "forbidden", "skip", "hold-forbidden"].includes(action)) feedback("tap");

    if (action === "home") guardedHome();
    if (action === "how") renderHow();
    if (action === "settings") renderSettings();
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
    if (action === "start-after-room") renderPassPhone();
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
    if (action === "disable-fiscal") disableFiscalMode();
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
        ${decorations()}
        <div class="home-stage">
          <div class="logo-lockup">
            <div class="logo-symbol" aria-hidden="true">🚫</div>
            <h1>Não<br>Pode!</h1>
            <p class="subtitle">O jogo de palavras proibidas!</p>
          </div>
          <button class="button primary hero-button" data-action="mode">
            <span>▶</span>
            <strong>Jogar agora</strong>
            <i aria-hidden="true"></i>
          </button>
          <div class="deck-stats" aria-label="Baralhos disponiveis">
            <div><span>📖</span><b>150+</b><small>cartas biblicas</small></div>
            <div><span>🌎</span><b>150+</b><small>cartas variadas</small></div>
          </div>
          <div class="actions two">
            <button class="button ghost" data-action="how">📚 Como jogar</button>
            <button class="button ghost" data-action="settings">⚙️ Configurações</button>
          </div>
        </div>
      </section>
    `, direction, immediate);
  }

  function renderHow() {
    setScreen(`
      <section class="screen">
        <div class="stack">
          ${topbar("Como jogar", "home")}
          <div class="panel summary-grid rules-panel">
            <div class="stat"><span>Veja a palavra principal</span><b>👀</b></div>
            <div class="stat"><span>Dê pistas para sua equipe</span><b>💬</b></div>
            <div class="stat"><span>Não fale as 5 proibidas</span><b>🚫</b></div>
            <div class="stat"><span>Acumule pontos antes do tempo acabar</span><b>⏱️</b></div>
          </div>
          <button class="button primary" data-action="mode">▶ Jogar agora</button>
        </div>
      </section>
    `);
  }

  function renderSettings() {
    setScreen(`
      <section class="screen">
        <div class="stack">
          ${topbar("Configurações", "home")}
          <div class="panel summary-grid">
            ${toggleRow("🔊 Som", "sound")}
            ${toggleRow("📳 Vibração", "vibration")}
            ${toggleRow("✨ Animações", "motion")}
          </div>
          <button class="button primary" data-action="home">🏠 Inicio</button>
        </div>
      </section>
    `);
  }

  function renderModeChoice(direction = "forward") {
    if (!game.currentCard) disconnectHostRoom();
    setScreen(`
      <section class="screen">
        <div class="stack">
          ${topbar("Escolha o baralho", "home")}
          <div class="deck-choice">
            ${modeCard("biblia", "📖", "Biblia", "Personagens, historias, lugares, livros e milagres.", "150+ desafios")}
            ${modeCard("variados", "🌎", "Temas variados", "Filmes, animais, comidas, tecnologia, esportes e muito mais.", "150+ desafios")}
          </div>
        </div>
      </section>
    `, direction);
  }

  function modeCard(mode, emoji, title, description, count) {
    return `
      <button class="mode-card deck-${mode}" data-action="pick-mode" data-value="${mode}">
        <span class="mode-check" aria-hidden="true">✓</span>
        <span class="mode-emoji">${emoji}</span>
        <strong>${title}</strong>
        <small>${count}</small>
        <p>${description}</p>
      </button>
    `;
  }

  function selectMode(mode, control) {
    game.mode = mode;
    game.deck = mode === "biblia" ? window.CARDS_BIBLIA : window.CARDS_VARIADOS;
    game.category = "todas";
    game.difficulty = "todas";
    control?.classList.add("selected");
    feedback("correct");
    setTimeout(renderConfig, motionDelay(180));
  }

  function renderConfig(direction = "forward") {
    const categories = [...new Set(game.deck.map((card) => card.categoria))]
      .sort((a, b) => labelForCategory(a).localeCompare(labelForCategory(b)));
    const modeTitle = game.mode === "biblia" ? "📖 Biblia" : "🌎 Temas variados";
    const customActive = game.customTimeActive || !timeOptions.includes(game.duration);

    setScreen(`
      <section class="screen config-screen">
        <div class="stack">
          ${topbar(modeTitle, "mode")}
          <div class="game-setup">
            <section class="setup-block teams-block">
              <h3>👥 Equipes</h3>
              <div class="team-columns">
                ${teamEditor("blue")}
                ${teamEditor("red")}
              </div>
            </section>
            <section class="setup-block">
              <h3>⏱ Tempo</h3>
              <div class="chip-grid time-grid">
                ${timeOptions.map((seconds) => optionChip("set-time", seconds, formatDuration(seconds), !customActive && game.duration === seconds)).join("")}
                <button class="chip ${customActive ? "active" : ""}" data-action="show-custom-time" data-value="${game.customDuration}">⚙ Personalizado</button>
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
              <h3>🎯 Rodadas</h3>
              <div class="chip-grid">
                ${[4, 6, 8, 10, 12].map((rounds) => optionChip("set-rounds", rounds, String(rounds), game.rounds === rounds)).join("")}
              </div>
            </section>
            <section class="setup-block">
              <h3>🔥 Dificuldade</h3>
              <div class="chip-grid">
                ${Object.entries(difficultyLabels).map(([value, label]) => optionChip("set-difficulty", value, label, game.difficulty === value)).join("")}
              </div>
            </section>
            <section class="setup-block">
              <h3>🃏 Categoria</h3>
              <div class="chip-scroll">
                ${optionChip("set-category", "todas", "Todas", game.category === "todas")}
                ${categories.map((category) => optionChip("set-category", category, (categoryIcons[category] || "🃏") + " " + labelForCategory(category), game.category === category)).join("")}
              </div>
            </section>
            <section class="setup-block fiscal-setup">
              <div>
                <h3>📱 Fiscal em outro celular</h3>
                <p>Cria uma sala espelhada. Neste pacote estatico, a sala usa sync.js local; para dois celulares reais, conecte um backend nesse arquivo.</p>
              </div>
              <button class="switch" role="switch" aria-checked="${game.remoteFiscal}" aria-label="Usar fiscal em outro celular" data-action="toggle" data-value="remoteFiscal"></button>
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
        <label>${meta.dot} Nome do time
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
        <button class="add-player" data-action="add-player" data-value="${team}">+ Adicionar jogador</button>
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
    game.fiscalConnected = false;
    persistSettings();

    if (game.remoteFiscal) {
      createHostRoom();
      renderRoomLobby();
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
      game.fiscalConnected = connected;
      updateFiscalStatus();
      if (connected) sendFiscalState("lobby");
    });
    game.syncRoom.onStateRequest?.(() => {
      const status = game.syncStatus === "idle"
        ? game.currentCard ? "playing" : "lobby"
        : game.syncStatus;
      sendFiscalState(status);
    });
    game.syncRoom.onForbidden(() => {
      if (game.locked || game.paused || !game.currentCard) return;
      showToast("🚨 Fiscal marcou!");
      markCard("forbidden");
    });
    sendFiscalState("lobby");
  }

  function renderRoomLobby() {
    const code = game.syncRoom?.code || "----";
    const link = game.syncRoom?.link || "";
    const isSupabase = game.syncRoom?.backend === "supabase";
    setScreen(`
      <section class="screen">
        <div class="stack">
          ${topbar("Sala do fiscal", "mode")}
          <div class="room-card">
            <span class="room-label">Sala</span>
            <strong>${escapeHtml(code)}</strong>
            <div id="room-qr" class="qr-card qr-fallback" aria-label="QR Code para entrar como fiscal">${qrPattern(code)}</div>
            <p class="room-link">${escapeHtml(link)}</p>
            <button class="button white" data-action="copy-room">Copiar link</button>
            <div id="fiscal-status" class="connection-status waiting">Aguardando fiscal</div>
            <p class="sync-note">${isSupabase ? "Sala online via Supabase Realtime. O fiscal pode ler o QR Code ou abrir o link." : "Supabase ainda nao configurado. Preencha supabase-config.js para a sala funcionar entre celulares."}</p>
          </div>
          <button class="button primary" data-action="start-after-room">Começar no host</button>
        </div>
      </section>
    `, "forward", false, () => renderQRCode("room-qr", link));
  }

  function renderPassPhone(direction = "forward") {
    clearTimers();
    const team = currentTeam();
    const player = currentPlayer();
    const fiscalPlayer = currentFiscalPlayer();
    sendFiscalState("pass");
    setScreen(`
      <section class="screen pass-screen">
        ${decorations()}
        <div class="stack center">
          <div class="pass-card">
            <div class="turn-team ${teamMeta[team].className}">${teamMeta[team].dot} Vez do ${escapeHtml(game.teamNames[team])}</div>
            <h2>${escapeHtml(player)}</h2>
            <p>vai dar as pistas!</p>
            <div class="phone-cue">📱 Passe o celular para ${escapeHtml(player)}</div>
            <div class="privacy">👀 Cuidado! Os outros jogadores não podem olhar a carta.</div>
            ${game.remoteFiscal ? `<div class="fiscal-cue">Fiscal: <strong>${escapeHtml(fiscalPlayer)}</strong></div>` : ""}
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
      <section class="screen play-screen">
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
          <div id="card-slot" class="card-wrap">${cardMarkup(game.currentCard)}</div>
          <div class="bottom-actions">
            <button class="button white round-button" data-action="skip"><span>⏭</span><strong>Pular</strong></button>
            <button class="button red round-button" data-action="forbidden"><span>🚫</span><strong>Não pode</strong></button>
            <button class="button green round-button" data-action="correct"><span>✅</span><strong>Acertou</strong></button>
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
      <section class="screen">
        <div class="stack center">
          <div class="panel summary-grid round-end">
            <h2>⏰ Fim da rodada</h2>
            <p><strong>${escapeHtml(player)}</strong></p>
            <div class="stat score-pop"><span>✅ Acertos</span><b>${game.roundStats.correct}</b></div>
            <div class="stat score-pop delay-1"><span>⏭ Puladas</span><b>${game.roundStats.skipped}</b></div>
            <div class="stat score-pop delay-2"><span>🚫 Não Pode</span><b>${game.roundStats.forbidden}</b></div>
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
      ? `🔥 ${game.teamNames.blue} esta na frente!`
      : redLeads
        ? `🔥 ${game.teamNames.red} esta na frente!`
        : "🤝 Tudo empatado!";
    const maxScore = Math.max(1, game.scores.blue, game.scores.red);

    setScreen(`
      <section class="screen">
        <div class="stack center">
          <div class="panel scoreboard">
            <h2>🏆 Placar</h2>
            ${teamScore("blue", blueLeads, maxScore)}
            ${teamScore("red", redLeads, maxScore)}
            <p class="leader-line">${escapeHtml(leaderText)}</p>
            <div class="next-player">
              <span>Proximo</span>
              <strong>${escapeHtml(currentPlayer())}</strong>
              <small>${teamMeta[nextTeam].dot} ${escapeHtml(game.teamNames[nextTeam])}</small>
            </div>
          </div>
          <button class="button primary" data-action="next-round">Proxima rodada</button>
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
    const winner = getWinner();
    feedback("victory");
    burstConfetti(56);
    const result = winner === "draw"
      ? `<h2>Empate!</h2><p><strong>${game.scores.blue} x ${game.scores.red}</strong></p>`
      : `<h2>${escapeHtml(game.teamNames[winner].toUpperCase())} venceu!</h2><p><strong>${game.scores[winner]}</strong><span> pontos</span></p>`;

    setScreen(`
      <section class="screen final-screen">
        ${decorations()}
        <div class="stack center">
          <div class="panel winner">
            <div class="big">🏆</div>
            ${result}
            <div class="summary-grid">
              <div class="stat"><span>✅ Acertos</span><b>${game.totalStats.correct}</b></div>
              <div class="stat"><span>🚫 Não Pode</span><b>${game.totalStats.forbidden}</b></div>
              <div class="stat"><span>⏭ Puladas</span><b>${game.totalStats.skipped}</b></div>
              <div class="stat"><span>🔥 Melhor rodada</span><b>${game.bestRound}</b></div>
            </div>
          </div>
          <div class="actions three">
            <button class="button primary" data-action="restart">🔄 Revanche</button>
            <button class="button white" data-action="new-game">🎲 Nova partida</button>
            <button class="button ghost" data-action="home">🏠 Inicio</button>
          </div>
        </div>
      </section>
    `);
  }

  function renderNoCards() {
    setScreen(`
      <section class="screen">
        <div class="stack center">
          <div class="panel summary-grid">
            <h2>Sem cartas</h2>
            <p class="empty">Não ha cartas suficientes para esse filtro sem repetir durante a partida.</p>
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
  }

  function closeExitModal() {
    document.querySelector(".modal-backdrop")?.remove();
    if (game.exitModal) {
      game.exitModal = false;
      game.paused = false;
      game.endAt = Date.now() + game.pauseRemainingMs;
      setRoundButtonsDisabled(false);
      tickTimer();
    }
  }

  function exitMatch() {
    clearTimers();
    disconnectHostRoom();
    game.currentCard = null;
    game.locked = false;
    game.paused = false;
    renderHome("back");
  }

  function guardedHome() {
    if (game.currentCard && !game.locked && !game.paused) {
      openExitModal();
      return;
    }
    renderHome("back");
  }

  function renderFiscalJoin(code = "") {
    disconnectHostRoom();
    setScreen(`
      <section class="screen fiscal-screen">
        <div class="stack center">
          <div class="panel fiscal-join">
            <h2>Fiscal da rodada</h2>
            <p>Entre com o codigo da sala para acompanhar a carta.</p>
            <label>Codigo da sala
              <input id="room-code" inputmode="numeric" maxlength="4" value="${escapeAttr(code)}" autocomplete="off">
            </label>
            <button class="button primary" data-action="join-fiscal">Entrar como fiscal</button>
            <p class="sync-note">Depois que o Supabase estiver configurado, voce pode entrar por codigo ou lendo o QR Code gerado no celular principal.</p>
          </div>
        </div>
      </section>
    `, "forward", true);
  }

  function joinFiscalFromInput() {
    const code = document.querySelector("#room-code")?.value.trim();
    if (!code) {
      showToast("Digite o codigo");
      return;
    }
    fiscal.endpoint?.disconnect();
    fiscal.endpoint = window.NaoPodeSync?.joinRoom(code);
    fiscal.endpoint?.onStateChange((state) => {
      clearInterval(fiscal.requestTimer);
      fiscal.state = state;
      renderFiscalMirror();
    });
    fiscal.endpoint?.onConnectionChange(({ connected }) => {
      showToast(connected ? "✅ Fiscal conectado" : "⚠ Host desconectado");
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

  function renderFiscalMirror() {
    const state = fiscal.state;
    if (!state) {
      setScreen(`
        <section class="screen fiscal-screen">
          <div class="stack center">
            <div class="panel fiscal-join">
              <h2>Conectando...</h2>
              <p>Aguardando o host enviar a rodada.</p>
              <div class="connection-status waiting">Sala ${escapeHtml(fiscal.endpoint?.code || "")}</div>
            </div>
          </div>
        </section>
      `, "none");
      return;
    }

    setScreen(`
      <section class="screen fiscal-screen">
        <div class="fiscal-layout">
          <div class="fiscal-top">
            <span>Fiscal da rodada</span>
            <strong>${escapeHtml(state.fiscalPlayer || "Fiscal")}</strong>
            <small>fiscalizando ${escapeHtml(state.player || "jogador")}</small>
          </div>
          <div id="fiscal-timer" class="timer ${state.status === "paused" ? "paused" : ""}">⏱ ${fiscalTime(state)}</div>
          ${state.card ? cardMarkup(state.card, "fiscal-card") : `<div class="pass-card"><h2>${escapeHtml(state.statusLabel || "Aguardando rodada")}</h2></div>`}
          <button class="hold-button" data-action="hold-forbidden" data-hold="forbidden">
            <span class="hold-progress" aria-hidden="true"></span>
            <strong>🚨 Segure se ele falar uma proibida</strong>
          </button>
          <p class="sync-note">Pressione por meio segundo para evitar toque acidental.</p>
        </div>
      </section>
    `, "none");
    startFiscalTimer();
  }

  function startFiscalTimer() {
    clearInterval(fiscal.timerId);
    fiscal.timerId = setInterval(() => {
      const timer = document.querySelector("#fiscal-timer");
      if (!timer || !fiscal.state) return;
      timer.textContent = `⏱ ${fiscalTime(fiscal.state)}`;
    }, 250);
  }

  function startHold(event) {
    const button = event.target.closest("[data-hold='forbidden']");
    if (!button || !fiscal.endpoint || !fiscal.state || fiscal.state.status !== "playing") return;
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
      fiscal.endpoint.sendForbidden({ by: fiscal.state.fiscalPlayer, at: Date.now() });
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
      card: status === "playing" || status === "paused" ? game.currentCard : null,
      duration: game.duration,
      startTimestamp: game.endAt - game.duration * 1000,
      endTimestamp: game.endAt,
      pausedRemainingMs: remainingMs,
      updatedAt: Date.now()
    });
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

    if (!current || immediate || direction === "none" || !settings.motion) {
      $app.innerHTML = html;
      $app.firstElementChild?.classList.add(enterClass);
      afterRender?.();
      return;
    }

    current.classList.add(exitClass);
    setTimeout(() => {
      $app.innerHTML = html;
      $app.firstElementChild?.classList.add(enterClass);
      afterRender?.();
    }, motionDelay(120));
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
      victory: [60, 40, 90]
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
    clearInterval(fiscal.timerId);
    game.frameId = null;
    game.countdownId = null;
  }

  function disconnectHostRoom() {
    game.syncRoom?.disconnect();
    game.syncRoom = null;
    game.fiscalConnected = false;
  }

  function setRoundButtonsDisabled(disabled) {
    document.querySelectorAll(".round-button").forEach((button) => {
      button.disabled = disabled;
    });
  }

  function updateFiscalStatus() {
    const status = document.querySelector("#fiscal-status");
    if (status) {
      status.textContent = game.fiscalConnected ? "✅ Fiscal conectado" : "⚠ Fiscal desconectado";
      status.className = `connection-status ${game.fiscalConnected ? "connected" : "waiting"}`;
    }
    const playStatus = document.querySelector("#fiscal-play-status");
    if (playStatus) {
      playStatus.className = `fiscal-play-status ${game.fiscalConnected ? "connected" : "waiting"}`;
      playStatus.innerHTML = game.fiscalConnected
        ? "✅ Fiscal conectado"
        : "⚠ Fiscal desconectado <button data-action=\"disable-fiscal\">Continuar sem fiscal</button>";
    }
  }

  function fiscalHostStatus() {
    return `
      <div id="fiscal-play-status" class="fiscal-play-status ${game.fiscalConnected ? "connected" : "waiting"}">
        ${game.fiscalConnected ? "✅ Fiscal conectado" : "⚠ Fiscal desconectado <button data-action=\"disable-fiscal\">Continuar sem fiscal</button>"}
      </div>
    `;
  }

  function disableFiscalMode() {
    game.remoteFiscal = false;
    disconnectHostRoom();
    document.querySelector("#fiscal-play-status")?.remove();
    persistSettings();
    showToast("Fiscal remoto desligado");
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
    if (state.status === "paused") return formatTime(Math.ceil((state.pausedRemainingMs || 0) / 1000));
    if (state.status !== "playing") return "--:--";
    return formatTime(Math.max(0, Math.ceil((state.endTimestamp - Date.now()) / 1000)));
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
