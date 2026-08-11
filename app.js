(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  // ===== Konstanten =====
  const ROWS = [2, 3, 4, 5, 6, 7, 8, 9, 10];
  const BASE_POINTS = 10;        // Punkte pro richtiger Antwort
  const STREAK_BONUS_STEP = 2;   // Bonus je Serienstufe
  const STREAK_BONUS_MAX = 10;   // Bonus-Deckel
  const TRAINING_CLEAR = 2;      // so oft richtig, bis eine Aufgabe aus dem Fehler-Training fliegt
  const ZEITRENNEN_CAP = 45;     // maximale Restzeit im Zeit-Rennen

  // Spielmodi: kind = Aufgabentyp, total/time/lives = Endbedingung
  const MODES = {
    practice:   { icon: '📘', name: 'Übungsrunde',     short: 'Übung',     desc: '20 Aufgaben ohne Zeitdruck',        board: true,  rules: { total: 20, kind: 'mult' } },
    blitz:      { icon: '⚡', name: 'Blitzmodus',      short: 'Blitz',     desc: '60 Sekunden Zeit',                  board: true,  rules: { time: 60, kind: 'mult' } },
    luecken:    { icon: '❓', name: 'Lücken-Modus',    short: 'Lücken',    desc: '4 × ? = 28',                        board: true,  rules: { total: 20, kind: 'gap' } },
    geteilt:    { icon: '➗', name: 'Geteilt-Modus',   short: 'Geteilt',   desc: '28 ÷ 4 = ?',                        board: true,  rules: { total: 20, kind: 'div' } },
    stimmts:    { icon: '✅', name: "Stimmt's?",       short: "Stimmt's",  desc: 'Richtig oder falsch?',              board: true,  rules: { total: 20, kind: 'bool' } },
    ueberleben: { icon: '💖', name: 'Überleben',       short: 'Überleben', desc: '3 Leben – wie weit kommst du?',     board: true,  rules: { lives: 3, kind: 'mult' } },
    zeitrennen: { icon: '⏱️', name: 'Zeit-Rennen',     short: 'Rennen',    desc: 'Richtige geben +3 Sekunden',        board: true,  rules: { time: 20, bonus: 3, kind: 'mult' } },
    training:   { icon: '🔁', name: 'Fehler-Training', short: 'Training',  desc: 'Übe deine Patzer weg',              board: false, rules: { total: 15, kind: 'mult', source: 'pool' } },
    duell:      { icon: '⚔️', name: 'Duell',           short: 'Duell',     desc: 'Zwei Spieler, ein Gerät',           board: false, rules: { total: 10, kind: 'mult', duel: true } },
    abenteuer:  { icon: '🗺️', name: 'Abenteuer',       short: 'Abenteuer', desc: 'Level für Level zum 1x1-Profi',     board: false, rules: { total: 12, kind: 'mult', adventure: true } },
  };

  const DAILY_GOAL = 10;         // Aufgaben pro Tag für die Tages-Serie

  const STORE = {
    rows: 'einmaleins.rows',
    muted: 'einmaleins.muted',
    player: 'einmaleins.player',
    board: 'einmaleins.leaderboard',
    players: 'einmaleins.players',
    pool: (name) => `einmaleins.training.${name.toLowerCase()}`,
    adventure: (name) => `einmaleins.abenteuer.${name.toLowerCase()}`,
    daily: (name) => `einmaleins.tagesserie.${name.toLowerCase()}`,
    badges: (name) => `einmaleins.abzeichen.${name.toLowerCase()}`,
    total: (name) => `einmaleins.gesamt.${name.toLowerCase()}`,
    modes: (name) => `einmaleins.modi.${name.toLowerCase()}`,
    stats: (name) => `einmaleins.statistik.${name.toLowerCase()}`,
  };

  function loadJSON(key, fallback) {
    try {
      const data = JSON.parse(localStorage.getItem(key) || 'null');
      if (data !== null) return data;
    } catch { /* kaputte Daten ignorieren */ }
    return fallback;
  }

  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function dateStr(offset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toLocaleDateString('sv'); // JJJJ-MM-TT in lokaler Zeit
  }

  // ===== Zustand =====
  const state = {
    selectedRows: new Set(),
    mode: 'practice',
    running: false,
    locked: false,
    score: 0,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    wrong: 0,
    taskIndex: 0,
    current: null,        // { a, b, kind, display, answer, solution, isTrue, key }
    lastTaskKey: '',
    input: '',
    timeLeft: 0,
    lives: 0,
    timerId: null,
    feedbackId: null,
    duel: null,           // { idx, players: [name, name], results: [] }
    adventureLevel: 0,
    poolStart: 0,
    dailyGoalHit: false,
  };

  let playerName = (localStorage.getItem(STORE.player) || '').trim();
  let lbMode = 'practice';

  // ===== Sounds (Web Audio, keine Dateien) =====
  let audioCtx = null;
  let muted = localStorage.getItem(STORE.muted) === '1';

  function ensureAudio() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }

  function tone(freq, start, duration, type = 'sine', volume = 0.15) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const t = audioCtx.currentTime + start;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  function playSound(name) {
    if (muted) return;
    ensureAudio();
    if (!audioCtx) return;
    switch (name) {
      case 'tap':     tone(600, 0, 0.06, 'sine', 0.06); break;
      case 'correct': tone(660, 0, 0.12); tone(880, 0.1, 0.18); break;
      case 'wrong':   tone(220, 0, 0.25, 'sawtooth', 0.08); break;
      case 'finish':  tone(523, 0, 0.15); tone(659, 0.15, 0.15); tone(784, 0.3, 0.15); tone(1047, 0.45, 0.35); break;
      case 'record':  tone(659, 0, 0.12); tone(784, 0.12, 0.12); tone(988, 0.24, 0.12); tone(1319, 0.36, 0.4); break;
    }
  }

  // ===== Screens =====
  function showScreen(name) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    $(`screen-${name}`).classList.add('active');
  }

  function currentPlayerName() {
    return state.duel ? state.duel.players[state.duel.idx] : playerName;
  }

  // ===== Fehler-Training (Aufgaben-Pool pro Spieler) =====
  function loadPool(name) {
    if (!name) return [];
    try {
      const pool = JSON.parse(localStorage.getItem(STORE.pool(name)) || '[]');
      if (Array.isArray(pool)) {
        return pool.filter((e) => e && ROWS.concat([1]).includes(e.b) && e.a >= 1 && e.a <= 10);
      }
    } catch { /* kaputte Daten ignorieren */ }
    return [];
  }

  function savePool(name, pool) {
    localStorage.setItem(STORE.pool(name), JSON.stringify(pool));
  }

  function addToPool(name, a, b) {
    if (!name) return;
    const pool = loadPool(name);
    const entry = pool.find((e) => e.a === a && e.b === b);
    if (entry) entry.left = TRAINING_CLEAR;
    else pool.push({ a, b, left: TRAINING_CLEAR });
    savePool(name, pool);
  }

  function poolCorrect(name, a, b) {
    if (!name) return;
    const pool = loadPool(name);
    const entry = pool.find((e) => e.a === a && e.b === b);
    if (!entry) return;
    entry.left -= 1;
    savePool(name, entry.left <= 0 ? pool.filter((e) => e !== entry) : pool);
  }

  // ===== Abenteuer (Level-Fortschritt pro Spieler) =====
  function loadAdventure(name) {
    if (!name) return { stars: {} };
    try {
      const data = JSON.parse(localStorage.getItem(STORE.adventure(name)) || 'null');
      if (data && data.stars) return data;
    } catch { /* kaputte Daten ignorieren */ }
    return { stars: {} };
  }

  function adventureStars(name, row) {
    return loadAdventure(name).stars[row] || 0;
  }

  function saveAdventureStars(name, row, stars) {
    const data = loadAdventure(name);
    data.stars[row] = stars;
    localStorage.setItem(STORE.adventure(name), JSON.stringify(data));
  }

  function totalStars(name) {
    const data = loadAdventure(name);
    return ROWS.reduce((sum, row) => sum + (data.stars[row] || 0), 0);
  }

  // ===== Bekannte Spieler (Schnellwahl) =====
  function loadPlayers() {
    const players = loadJSON(STORE.players, []);
    return Array.isArray(players) ? players.filter((p) => typeof p === 'string' && p.trim()) : [];
  }

  function rememberPlayer(name) {
    if (!name) return;
    const players = loadPlayers();
    if (!players.some((p) => p.toLowerCase() === name.toLowerCase())) {
      players.push(name);
      saveJSON(STORE.players, players);
    }
  }

  function makePlayerChip(name, selected, onPick) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'pchip' + (selected ? ' selected' : '');
    chip.textContent = name;
    chip.addEventListener('click', () => { playSound('tap'); onPick(name); });
    return chip;
  }

  function renderPlayerChips() {
    const wrap = $('playerChips');
    wrap.innerHTML = '';
    loadPlayers().forEach((p) => {
      const selected = playerName && p.toLowerCase() === playerName.toLowerCase();
      wrap.appendChild(makePlayerChip(p, selected, (name) => {
        playerName = name;
        localStorage.setItem(STORE.player, name);
        $('playerName').value = name;
        refreshPlayerUI();
      }));
    });
  }

  function renderDuelChips() {
    const wrap = $('duelChips');
    wrap.innerHTML = '';
    const current = $('duelName').value.trim().toLowerCase();
    loadPlayers()
      .filter((p) => !playerName || p.toLowerCase() !== playerName.toLowerCase())
      .forEach((p) => {
        wrap.appendChild(makePlayerChip(p, p.toLowerCase() === current, (name) => {
          $('duelName').value = name;
          renderDuelChips();
          updateStartUI();
        }));
      });
  }

  // ===== Tages-Serie =====
  function loadDaily(name) {
    return loadJSON(STORE.daily(name), { today: '', count: 0, streak: 0, lastGoal: '' });
  }

  // Zählt eine beantwortete Aufgabe; liefert true, wenn damit das Tagesziel erreicht wurde
  function bumpDaily(name) {
    if (!name) return false;
    const d = loadDaily(name);
    const today = dateStr();
    if (d.today !== today) { d.today = today; d.count = 0; }
    d.count += 1;
    let goalHit = false;
    if (d.count === DAILY_GOAL && d.lastGoal !== today) {
      d.streak = d.lastGoal === dateStr(-1) ? d.streak + 1 : 1;
      d.lastGoal = today;
      goalHit = true;
    }
    saveJSON(STORE.daily(name), d);
    return goalHit;
  }

  function effectiveStreak(name) {
    const d = loadDaily(name);
    return d.lastGoal === dateStr() || d.lastGoal === dateStr(-1) ? d.streak : 0;
  }

  function renderDailyInfo() {
    const el = $('dailyInfo');
    if (!playerName) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    const d = loadDaily(playerName);
    const count = d.today === dateStr() ? Math.min(d.count, DAILY_GOAL) : 0;
    const done = count >= DAILY_GOAL;
    el.textContent = `🔥 ${effectiveStreak(playerName)} Tage-Serie · Heute ${count}/${DAILY_GOAL} Aufgaben${done ? ' ✅' : ''}`;
  }

  // ===== Statistik je Reihe =====
  function bumpStats(name, row, ok) {
    if (!name) return;
    const stats = loadJSON(STORE.stats(name), {});
    const entry = stats[row] || (stats[row] = { ok: 0, n: 0 });
    entry.n += 1;
    if (ok) entry.ok += 1;
    saveJSON(STORE.stats(name), stats);
  }

  function renderStats() {
    const grid = $('statsGrid');
    grid.innerHTML = '';
    const stats = playerName ? loadJSON(STORE.stats(playerName), {}) : {};
    let totalN = 0;
    ROWS.forEach((row) => {
      const e = stats[row];
      const tile = document.createElement('div');
      let cls = 'none';
      let val = '–';
      if (e && e.n > 0) {
        totalN += e.n;
        const acc = e.ok / e.n;
        val = `${Math.round(acc * 100)}%`;
        cls = acc >= 0.9 ? 'good' : acc >= 0.7 ? 'mid' : 'bad';
      }
      tile.className = `stat-tile ${cls}`;
      const label = document.createElement('span');
      label.className = 'st-row';
      label.textContent = `${row}er-Reihe`;
      const value = document.createElement('span');
      value.className = 'st-val';
      value.textContent = val;
      tile.append(label, value);
      grid.appendChild(tile);
    });
    $('statsSummary').textContent = playerName
      ? `${playerName} hat insgesamt ${totalN} Aufgaben beantwortet. Grün = sitzt (ab 90 %), Gelb = fast (ab 70 %), Rot = üben.`
      : 'Wähle zuerst einen Spieler aus.';
  }

  // ===== Abzeichen =====
  const BADGES = [
    { id: 'erste',      icon: '🎈', name: 'Erste Runde',     desc: 'Die allererste Runde gespielt',            check: (c) => c.rounds >= 1 },
    { id: 'serie10',    icon: '🔥', name: 'Serien-Star',     desc: '10 Richtige in Folge',                     check: (c) => c.bestStreak >= 10 },
    { id: 'serie20',    icon: '🌋', name: 'Serien-Meister',  desc: '20 Richtige in Folge',                     check: (c) => c.bestStreak >= 20 },
    { id: 'runde300',   icon: '💎', name: 'Punktejäger',     desc: '300 Punkte in einer Runde',                check: (c) => c.score >= 300 },
    { id: 'perfekt',    icon: '🎯', name: 'Fehlerfrei',      desc: 'Runde ohne Fehler (mind. 10 Aufgaben)',    check: (c) => c.answered >= 10 && c.wrong === 0 },
    { id: 'punkte1000', icon: '🏆', name: 'Tausender',       desc: '1000 Punkte insgesamt gesammelt',          check: (c) => c.totalPoints >= 1000 },
    { id: 'punkte5000', icon: '👑', name: 'Punkte-König',    desc: '5000 Punkte insgesamt gesammelt',          check: (c) => c.totalPoints >= 5000 },
    { id: 'training',   icon: '🧹', name: 'Ausgebügelt',     desc: 'Das Fehler-Training leergeübt',            check: (c) => c.reason === 'cleared' },
    { id: 'entdecker',  icon: '🧭', name: 'Entdecker',       desc: '5 verschiedene Modi ausprobiert',          check: (c) => c.modesCount >= 5 },
    { id: 'abenteurer', icon: '🗺️', name: 'Abenteurer',      desc: 'Alle Level im Abenteuer geschafft',        check: (c) => c.allLevels },
    { id: 'sterne27',   icon: '🌟', name: 'Sternensammler',  desc: 'Alle 27 Abenteuer-Sterne geholt',          check: (c) => c.stars27 },
    { id: 'serie7tage', icon: '📅', name: 'Dranbleiber',     desc: '7 Tage hintereinander das Tagesziel',      check: (c) => c.dayStreak >= 7 },
  ];

  function awardBadges(name, ctx) {
    const earned = loadJSON(STORE.badges(name), {});
    const newly = [];
    BADGES.forEach((b) => {
      if (!earned[b.id] && b.check(ctx)) {
        earned[b.id] = dateStr();
        newly.push(b);
      }
    });
    if (newly.length) saveJSON(STORE.badges(name), earned);
    return newly;
  }

  // Rundenabschluss pro Spieler: Gesamtpunkte, gespielte Modi und Abzeichen aktualisieren
  function finishForPlayer(name, snap, reason) {
    if (!name) return [];
    const totals = loadJSON(STORE.total(name), { points: 0, rounds: 0 });
    totals.points += snap.score;
    totals.rounds += 1;
    saveJSON(STORE.total(name), totals);

    const modes = loadJSON(STORE.modes(name), []);
    if (!modes.includes(state.mode)) { modes.push(state.mode); saveJSON(STORE.modes(name), modes); }

    const adv = loadAdventure(name);
    return awardBadges(name, {
      score: snap.score,
      bestStreak: snap.bestStreak,
      wrong: snap.wrong,
      answered: snap.correct + snap.wrong,
      reason,
      totalPoints: totals.points,
      rounds: totals.rounds,
      modesCount: modes.length,
      allLevels: ROWS.every((r) => (adv.stars[r] || 0) >= 2),
      stars27: totalStars(name) >= ROWS.length * 3,
      dayStreak: effectiveStreak(name),
    });
  }

  function renderBadgeGrid() {
    const grid = $('badgeGrid');
    grid.innerHTML = '';
    const earned = playerName ? loadJSON(STORE.badges(playerName), {}) : {};
    BADGES.forEach((b) => {
      const tile = document.createElement('div');
      tile.className = 'badge-tile' + (earned[b.id] ? '' : ' locked');
      tile.title = b.desc;
      const icon = document.createElement('span');
      icon.className = 'badge-icon';
      icon.textContent = b.icon;
      const name = document.createElement('span');
      name.className = 'badge-name';
      name.textContent = b.name;
      tile.append(icon, name);
      grid.appendChild(tile);
    });
  }

  // ===== Sichern / Laden =====
  function exportData() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('einmaleins.')) data[key] = localStorage.getItem(key);
    }
    const blob = new Blob(
      [JSON.stringify({ app: '1x1-held', version: 1, exportiert: new Date().toISOString(), data }, null, 2)],
      { type: 'application/json' }
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `1x1-held-sicherung-${dateStr()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed || parsed.app !== '1x1-held' || typeof parsed.data !== 'object') throw new Error('ungültig');
        if (!confirm('Sicherung laden? Alle aktuellen Punkte, Ranglisten und Fortschritte auf diesem Gerät werden ersetzt.')) return;
        Object.keys(localStorage)
          .filter((k) => k.startsWith('einmaleins.'))
          .forEach((k) => localStorage.removeItem(k));
        Object.entries(parsed.data).forEach(([k, v]) => {
          if (k.startsWith('einmaleins.')) localStorage.setItem(k, String(v));
        });
        location.reload();
      } catch {
        alert('Diese Datei ist keine gültige 1x1-Held-Sicherung.');
      }
    };
    reader.readAsText(file);
  }

  // ===== Rangliste =====
  function loadBoard() {
    try {
      const board = JSON.parse(localStorage.getItem(STORE.board) || '[]');
      if (Array.isArray(board)) {
        return board.filter((e) => e && typeof e.name === 'string' && typeof e.score === 'number');
      }
    } catch { /* kaputte Daten ignorieren */ }
    return [];
  }

  function boardFor(mode) {
    return loadBoard()
      .filter((e) => e.mode === mode)
      .sort((a, b) => b.score - a.score);
  }

  function getPersonalBest(name, mode) {
    if (!name) return 0;
    const entry = boardFor(mode).find((e) => e.name.toLowerCase() === name.toLowerCase());
    return entry ? entry.score : 0;
  }

  // Speichert das Rundenergebnis (bestes Ergebnis pro Name & Modus)
  // und liefert zurück, ob es ein neuer persönlicher Rekord war und welchen Platz er belegt.
  function recordScore(name, mode, score) {
    const board = loadBoard();
    const idx = board.findIndex((e) => e.mode === mode && e.name.toLowerCase() === name.toLowerCase());
    const prev = idx >= 0 ? board[idx].score : 0;
    const improved = score > prev;
    if (improved) {
      const entry = { name, score, mode, date: new Date().toISOString().slice(0, 10) };
      if (idx >= 0) board[idx] = entry;
      else board.push(entry);
      localStorage.setItem(STORE.board, JSON.stringify(board));
    }
    const rank = improved
      ? boardFor(mode).findIndex((e) => e.name.toLowerCase() === name.toLowerCase()) + 1
      : null;
    return { improved, rank };
  }

  function renderLbTabs() {
    const wrap = $('lbTabs');
    wrap.innerHTML = '';
    Object.entries(MODES).filter(([, m]) => m.board).forEach(([key, m]) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'lb-tab' + (key === lbMode ? ' selected' : '');
      tab.textContent = `${m.icon} ${m.short}`;
      tab.addEventListener('click', () => {
        playSound('tap');
        lbMode = key;
        renderLbTabs();
        renderLeaderboard();
      });
      wrap.appendChild(tab);
    });
  }

  function renderLeaderboard() {
    const list = $('lbList');
    list.innerHTML = '';
    const entries = boardFor(lbMode).slice(0, 8);
    $('lbEmpty').classList.toggle('hidden', entries.length > 0);
    const medals = ['🥇', '🥈', '🥉'];
    entries.forEach((e, i) => {
      const li = document.createElement('li');
      li.className = 'lb-row' + (playerName && e.name.toLowerCase() === playerName.toLowerCase() ? ' me' : '');
      const rank = document.createElement('span');
      rank.className = 'lb-rank';
      rank.textContent = medals[i] || `${i + 1}.`;
      const name = document.createElement('span');
      name.className = 'lb-name';
      name.textContent = e.name;
      const score = document.createElement('span');
      score.className = 'lb-score';
      score.textContent = `${e.score} ⭐`;
      li.append(rank, name, score);
      list.appendChild(li);
    });
  }

  // ===== Startbildschirm =====
  function buildRowChips() {
    const wrap = $('rowChips');
    ROWS.forEach((row) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip';
      btn.textContent = row;
      btn.dataset.row = row;
      btn.addEventListener('click', () => {
        playSound('tap');
        if (state.selectedRows.has(row)) state.selectedRows.delete(row);
        else state.selectedRows.add(row);
        renderRowChips();
        saveRows();
      });
      wrap.appendChild(btn);
    });

    $('btnAllRows').addEventListener('click', () => {
      playSound('tap');
      const allSelected = state.selectedRows.size === ROWS.length;
      state.selectedRows = new Set(allSelected ? [] : ROWS);
      renderRowChips();
      saveRows();
    });
  }

  function renderRowChips() {
    document.querySelectorAll('#rowChips .chip').forEach((btn) => {
      btn.classList.toggle('selected', state.selectedRows.has(Number(btn.dataset.row)));
    });
    $('btnAllRows').classList.toggle('selected', state.selectedRows.size === ROWS.length);
    updateStartUI();
  }

  function saveRows() {
    localStorage.setItem(STORE.rows, JSON.stringify([...state.selectedRows]));
  }

  function loadRows() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE.rows) || 'null');
      if (Array.isArray(saved) && saved.length) {
        state.selectedRows = new Set(saved.filter((r) => ROWS.includes(r)));
      }
    } catch { /* kaputte Daten ignorieren */ }
    if (state.selectedRows.size === 0) state.selectedRows = new Set(ROWS);
  }

  function buildModeGrid() {
    const grid = $('modeGrid');
    Object.entries(MODES).forEach(([key, m]) => {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'mode-tile' + (key === state.mode ? ' selected' : '');
      tile.dataset.mode = key;

      const icon = document.createElement('span');
      icon.className = 'mt-icon';
      icon.textContent = m.icon;
      const name = document.createElement('span');
      name.className = 'mt-name';
      name.textContent = m.name;
      const desc = document.createElement('span');
      desc.className = 'mt-desc';
      desc.textContent = m.desc;
      const badge = document.createElement('span');
      badge.className = 'mt-hs';
      badge.id = `hs-${key}`;
      tile.append(icon, name, desc, badge);

      tile.addEventListener('click', () => {
        playSound('tap');
        state.mode = key;
        document.querySelectorAll('.mode-tile').forEach((t) => t.classList.toggle('selected', t === tile));
        updateModeVisibility();
      });
      grid.appendChild(tile);
    });
  }

  function renderModeBadges() {
    Object.entries(MODES).forEach(([key, m]) => {
      const el = $(`hs-${key}`);
      if (!el) return;
      if (m.board) {
        el.textContent = `🏆 ${getPersonalBest(playerName, key)}`;
      } else if (key === 'training') {
        const open = playerName ? loadPool(playerName).length : 0;
        el.textContent = open > 0 ? `${open} offen` : '✔️ nichts offen';
      } else if (key === 'abenteuer') {
        el.textContent = `⭐ ${playerName ? totalStars(playerName) : 0}/${ROWS.length * 3}`;
      } else if (key === 'duell') {
        el.textContent = '2 Spieler';
      }
    });
  }

  function renderLevelGrid() {
    const grid = $('levelGrid');
    grid.innerHTML = '';
    const adv = loadAdventure(playerName);
    ROWS.forEach((row, i) => {
      const stars = adv.stars[row] || 0;
      const unlocked = !!playerName && (i === 0 || (adv.stars[ROWS[i - 1]] || 0) >= 2);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'level-btn' + (unlocked ? '' : ' locked') + (stars >= 2 ? ' done' : '');

      const num = document.createElement('span');
      num.className = 'level-num';
      if (unlocked) {
        num.textContent = row;
        const small = document.createElement('small');
        small.textContent = 'er';
        num.appendChild(small);
      } else {
        num.textContent = '🔒';
      }
      const starEl = document.createElement('span');
      starEl.className = 'level-stars';
      starEl.textContent = unlocked ? '⭐'.repeat(stars) + '☆'.repeat(3 - stars) : `${row}er`;
      btn.append(num, starEl);

      if (unlocked) {
        btn.addEventListener('click', () => {
          ensureAudio();
          playSound('tap');
          state.adventureLevel = row;
          startGame();
        });
      }
      grid.appendChild(btn);
    });
  }

  function updateModeVisibility() {
    const m = state.mode;
    $('rowsCard').classList.toggle('hidden', m === 'training' || m === 'abenteuer');
    $('duelCard').classList.toggle('hidden', m !== 'duell');
    $('adventureCard').classList.toggle('hidden', m !== 'abenteuer');
    $('btnStart').classList.toggle('hidden', m === 'abenteuer');
    if (m === 'abenteuer') renderLevelGrid();
    updateStartUI();
  }

  function updateStartUI() {
    const m = state.mode;
    const rules = MODES[m].rules;
    let problem = '';
    if (!playerName) {
      problem = 'Trag zuerst deinen Namen ein 😊';
    } else if (m === 'training' && loadPool(playerName).length === 0) {
      problem = 'Keine Fehler zum Üben – super! Spiele erst andere Modi. 🎉';
    } else if (m !== 'training' && m !== 'abenteuer' && state.selectedRows.size === 0) {
      problem = 'Wähle mindestens eine Reihe aus 😊';
    } else if (rules.duel && $('duelName').value.trim() === '') {
      problem = 'Trag den Namen deines Gegners ein ⚔️';
    }
    $('btnStart').disabled = !!problem;
    const hint = $('startHint');
    hint.textContent = problem;
    hint.classList.toggle('hidden', !problem);
  }

  // ===== Spielablauf =====
  function startGame() {
    const rules = MODES[state.mode].rules;
    rememberPlayer(playerName);
    if (rules.duel) {
      const opponent = $('duelName').value.trim();
      if (!opponent) { updateStartUI(); return; }
      rememberPlayer(opponent);
      state.duel = { idx: 0, players: [playerName, opponent], results: [] };
    } else {
      state.duel = null;
    }
    if (rules.source === 'pool') state.poolStart = loadPool(playerName).length;
    beginRound();
  }

  // Setzt alle Rundenzähler zurück und startet – wird im Duell für jeden Spieler aufgerufen
  function beginRound() {
    const rules = MODES[state.mode].rules;
    state.running = true;
    state.locked = false;
    state.score = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.correct = 0;
    state.wrong = 0;
    state.taskIndex = 0;
    state.lastTaskKey = '';
    state.input = '';
    state.lives = rules.lives || 0;
    state.timeLeft = rules.time || 0;
    state.dailyGoalHit = false;

    $('score').textContent = '0';
    updateStreakUI();
    showScreen('quiz');
    nextTask();
    if (rules.time) startRoundTimer();
    else updateProgressUI();
  }

  function startRoundTimer() {
    stopTimer();
    updateTimerUI();
    state.timerId = setInterval(() => {
      state.timeLeft -= 0.1;
      if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        updateTimerUI();
        endRound();
      } else {
        updateTimerUI();
      }
    }, 100);
  }

  function stopTimer() {
    if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
  }

  // ===== Aufgaben =====
  // Schlaue Aufgabenwahl: aus 3 Kandidaten den Fakt nehmen, der am wackeligsten ist
  // (bekannte Fehleraufgaben und schwache Reihen kommen dadurch etwas häufiger dran)
  function pickFact() {
    const rows = [...state.selectedRows];
    const name = currentPlayerName();
    const stats = name ? loadJSON(STORE.stats(name), {}) : {};
    const pool = name ? loadPool(name) : [];
    let best = null;
    let bestWeight = -1;
    for (let i = 0; i < 3; i++) {
      const b = rows[Math.floor(Math.random() * rows.length)];
      const a = Math.floor(Math.random() * 10) + 1;
      let weight = Math.random();
      if (pool.some((e) => e.a === a && e.b === b)) weight += 2;
      const s = stats[b];
      if (s && s.n >= 5) weight += 1 - s.ok / s.n;
      if (weight > bestWeight) { best = { a, b }; bestWeight = weight; }
    }
    return best;
  }

  function generateTask(rules) {
    let a, b;
    if (rules.source === 'pool') {
      const pool = loadPool(currentPlayerName());
      const entry = pool[Math.floor(Math.random() * pool.length)];
      a = entry.a; b = entry.b;
    } else if (rules.adventure) {
      b = state.adventureLevel;
      a = Math.floor(Math.random() * 10) + 1;
    } else {
      ({ a, b } = pickFact());
    }
    const p = a * b;

    switch (rules.kind) {
      case 'gap': {
        const hideA = Math.random() < 0.5;
        return {
          a, b, kind: 'gap',
          display: hideA ? `? × ${b} = ${p}` : `${a} × ? = ${p}`,
          answer: hideA ? a : b,
          solution: `${a} × ${b} = ${p}`,
          key: `gap${hideA ? 'A' : 'B'}:${a}x${b}`,
        };
      }
      case 'div':
        return {
          a, b, kind: 'div',
          display: `${p} ÷ ${b}`,
          answer: a,
          solution: `${p} ÷ ${b} = ${a}`,
          key: `div:${a}x${b}`,
        };
      case 'bool': {
        const isTrue = Math.random() < 0.5;
        let shown = p;
        if (!isTrue) {
          const cands = [p + b, p - b, p + a, p - a, p + 1, p - 1, p + 2, p - 2, p + 10, p - 10]
            .filter((v) => v > 0 && v !== p);
          shown = cands[Math.floor(Math.random() * cands.length)];
        }
        return {
          a, b, kind: 'bool', isTrue,
          display: `${a} × ${b} = ${shown}`,
          solution: `${a} × ${b} = ${p}`,
          key: `bool:${a}x${b}=${shown}`,
        };
      }
      default:
        return {
          a, b, kind: 'mult',
          display: `${a} × ${b}`,
          answer: p,
          solution: `${a} × ${b} = ${p}`,
          key: `mult:${a}x${b}`,
        };
    }
  }

  function nextTask() {
    const rules = MODES[state.mode].rules;
    let task = generateTask(rules);
    for (let i = 0; i < 30 && task.key === state.lastTaskKey; i++) {
      task = generateTask(rules);
    }
    state.lastTaskKey = task.key;
    state.current = task;
    state.input = '';
    state.locked = false;

    const taskEl = $('taskText');
    taskEl.textContent = task.display;
    taskEl.classList.toggle('long', task.display.length > 6);
    taskEl.style.animation = 'none';
    void taskEl.offsetWidth; // Animation neu starten
    taskEl.style.animation = '';

    const isBool = task.kind === 'bool';
    $('keypad').classList.toggle('hidden', isBool);
    $('answerDisplay').classList.toggle('hidden', isBool);
    $('truthButtons').classList.toggle('hidden', !isBool);

    renderInput();
    clearFeedback();
  }

  function renderInput() {
    const display = $('answerDisplay');
    display.innerHTML = state.input === '' ? '<span class="placeholder">?</span>' : state.input;
  }

  function clearFeedback() {
    if (state.feedbackId) { clearTimeout(state.feedbackId); state.feedbackId = null; }
    const fb = $('feedback');
    fb.textContent = '';
    fb.className = 'feedback';
  }

  function handleKey(key) {
    if (!state.running || state.locked) return;
    if (state.current && state.current.kind === 'bool') return;
    if (key === 'del') {
      state.input = state.input.slice(0, -1);
      playSound('tap');
      renderInput();
    } else if (key === 'ok') {
      if (state.input === '') return;
      resolveAnswer(Number(state.input) === state.current.answer);
    } else if (/^\d$/.test(key)) {
      if (state.input.length >= 3) return;
      if (state.input === '' && key === '0') return; // keine führende Null
      state.input += key;
      playSound('tap');
      renderInput();
    }
  }

  // Gemeinsame Auswertung für alle Aufgabentypen
  function resolveAnswer(correct) {
    const task = state.current;
    const rules = MODES[state.mode].rules;
    state.locked = true;
    state.taskIndex += 1;

    bumpStats(currentPlayerName(), task.b, correct);
    if (bumpDaily(currentPlayerName())) state.dailyGoalHit = true;

    const card = $('taskCard');
    const fb = $('feedback');
    card.classList.remove('correct', 'wrong');
    void card.offsetWidth;

    if (correct) {
      state.streak += 1;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      const bonus = Math.min((state.streak - 1) * STREAK_BONUS_STEP, STREAK_BONUS_MAX);
      const points = BASE_POINTS + bonus;
      state.score += points;
      state.correct += 1;
      if (rules.source === 'pool') poolCorrect(currentPlayerName(), task.a, task.b);

      let msg = `Richtig! +${points} Punkte${bonus > 0 ? ' 🔥' : ''}`;
      if (rules.bonus) {
        state.timeLeft = Math.min(state.timeLeft + rules.bonus, ZEITRENNEN_CAP);
        updateTimerUI();
        msg += ` · +${rules.bonus}s`;
      }
      $('score').textContent = state.score;
      updateStreakUI(true);
      card.classList.add('correct');
      fb.textContent = msg;
      fb.className = 'feedback good';
      playSound('correct');
      confettiBurst(card, 14);
      state.feedbackId = setTimeout(advance, 900);
    } else {
      state.streak = 0;
      state.wrong += 1;
      addToPool(currentPlayerName(), task.a, task.b);
      if (rules.lives) state.lives -= 1;
      updateStreakUI();
      card.classList.add('wrong');
      fb.textContent = `Ups! ${task.solution}`;
      fb.className = 'feedback bad';
      playSound('wrong');
      if (navigator.vibrate) navigator.vibrate(150);
      state.feedbackId = setTimeout(advance, 1600);
    }

    updateProgressUI();
  }

  function advance() {
    state.feedbackId = null;
    if (!state.running) return;
    const rules = MODES[state.mode].rules;
    if (rules.lives && state.lives <= 0) return endRound();
    if (rules.source === 'pool' && loadPool(currentPlayerName()).length === 0) return endRound('cleared');
    if (rules.total && state.taskIndex >= rules.total) {
      if (rules.duel && state.duel && state.duel.idx === 0) return duelHandover();
      return endRound();
    }
    nextTask();
  }

  function updateStreakUI(bump = false) {
    const box = $('streakBox');
    $('streak').textContent = state.streak;
    box.classList.toggle('hot', state.streak >= 3);
    if (bump) {
      box.classList.remove('bump');
      void box.offsetWidth;
      box.classList.add('bump');
    }
  }

  function updateProgressUI() {
    const rules = MODES[state.mode].rules;
    if (rules.time) return; // Anzeige übernimmt updateTimerUI
    const bar = $('progressBar');
    const label = $('progressLabel');

    if (rules.lives) {
      bar.style.width = `${(state.lives / rules.lives) * 100}%`;
      bar.classList.toggle('low', state.lives <= 1);
      label.textContent = `${'💖'.repeat(state.lives)}${'🖤'.repeat(rules.lives - state.lives)} · Aufgabe ${state.taskIndex + 1}`;
      return;
    }
    if (rules.source === 'pool') {
      const left = loadPool(currentPlayerName()).length;
      const startCount = Math.max(state.poolStart, 1);
      bar.style.width = `${((startCount - left) / startCount) * 100}%`;
      bar.classList.remove('low');
      label.textContent = `🔁 Noch ${left} Aufgabe${left === 1 ? '' : 'n'} zu üben`;
      return;
    }
    const total = rules.total;
    const done = Math.min(state.taskIndex, total);
    bar.style.width = `${(done / total) * 100}%`;
    bar.classList.remove('low');
    const prefix = rules.duel ? `${currentPlayerName()} · `
      : rules.adventure ? `${state.adventureLevel}er-Reihe · ` : '';
    label.textContent = `${prefix}Aufgabe ${Math.min(done + 1, total)} von ${total}`;
  }

  function updateTimerUI() {
    const rules = MODES[state.mode].rules;
    const denom = rules.bonus ? ZEITRENNEN_CAP : rules.time;
    $('progressBar').style.width = `${Math.min((state.timeLeft / denom) * 100, 100)}%`;
    $('progressBar').classList.toggle('low', state.timeLeft <= (rules.bonus ? 5 : 10));
    $('progressLabel').textContent = `⏱️ ${Math.ceil(state.timeLeft)} Sekunden`;
  }

  // ===== Duell =====
  function snapshotPlayer() {
    return {
      name: currentPlayerName(),
      score: state.score,
      correct: state.correct,
      wrong: state.wrong,
      bestStreak: state.bestStreak,
    };
  }

  function duelHandover() {
    state.duel.results[0] = snapshotPlayer();
    state.running = false;
    $('handoverTitle').textContent = `Jetzt ist ${state.duel.players[1]} dran!`;
    showScreen('handover');
    playSound('finish');
  }

  function showDuelResult() {
    const [p1, p2] = state.duel.results;
    const winner = p1.score === p2.score ? null : (p1.score > p2.score ? p1 : p2);
    $('resultTitle').textContent = winner ? `🏆 ${winner.name} gewinnt!` : 'Unentschieden! 🤝';

    $('stars').classList.add('hidden');
    $('finalScoreWrap').classList.add('hidden');
    $('newHighscore').classList.add('hidden');
    $('resultRank').classList.add('hidden');
    $('resultStats').classList.add('hidden');

    const box = $('duelResult');
    box.innerHTML = '';
    box.classList.remove('hidden');
    [p1, p2].forEach((p) => {
      const row = document.createElement('div');
      row.className = 'duel-row' + (winner === p ? ' winner' : '');
      const name = document.createElement('span');
      name.className = 'dr-name';
      name.textContent = (winner === p ? '👑 ' : '') + p.name;
      const info = document.createElement('span');
      info.textContent = `${p.correct} richtig`;
      const score = document.createElement('span');
      score.className = 'dr-score';
      score.textContent = `${p.score} ⭐`;
      row.append(name, info, score);
      box.appendChild(row);
    });

    // Gesamtpunkte, Modi und Abzeichen für beide Spieler verbuchen
    finishForPlayer(p1.name, p1);
    finishForPlayer(p2.name, p2);
    $('dailyGoal').classList.add('hidden');
    $('newBadges').classList.add('hidden');

    state.duel = null;
    renderModeBadges();
    renderBadgeGrid();
    renderDailyInfo();
    showScreen('result');
    playSound('record');
    confettiRain(60);
  }

  // ===== Rundenende =====
  function endRound(reason) {
    if (!state.running) return;
    state.running = false;
    stopTimer();
    clearFeedback();

    const modeCfg = MODES[state.mode];
    const rules = modeCfg.rules;

    if (rules.duel && state.duel) {
      state.duel.results[1] = snapshotPlayer();
      showDuelResult();
      return;
    }

    // Standard-Ergebniselemente einblenden (könnten vom Duell versteckt sein)
    $('stars').classList.remove('hidden');
    $('finalScoreWrap').classList.remove('hidden');
    $('resultStats').classList.remove('hidden');
    $('duelResult').classList.add('hidden');

    const answered = state.correct + state.wrong;
    const accuracy = answered > 0 ? state.correct / answered : 0;
    const starCount = accuracy >= 0.9 ? 3 : accuracy >= 0.7 ? 2 : 1;

    const titles = {
      3: 'Fantastisch! 🌟',
      2: 'Super gemacht! 💪',
      1: 'Gut geübt – weiter so! 😊',
    };
    let title = titles[starCount];

    $('finalScore').textContent = state.score;
    $('statCorrect').textContent = state.correct;
    $('statWrong').textContent = state.wrong;
    $('statStreak').textContent = state.bestStreak;
    document.querySelectorAll('#stars .star').forEach((star, i) => {
      star.classList.toggle('earned', i < starCount);
    });

    const rankEl = $('resultRank');
    let improved = false;
    let rankText = '';

    if (modeCfg.board) {
      let rank = null;
      if (playerName && state.score > 0) {
        ({ improved, rank } = recordScore(playerName, state.mode, state.score));
      }
      if (rank) rankText = `🏆 Platz ${rank} in der Rangliste`;
    }

    let extraConfetti = false;
    if (rules.adventure) {
      const row = state.adventureLevel;
      const prevStars = adventureStars(playerName, row);
      if (playerName && starCount > prevStars) saveAdventureStars(playerName, row, starCount);
      const passed = starCount >= 2;
      title = passed ? `${row}er-Reihe geschafft! 🌟` : 'Fast! Versuch es gleich nochmal 💪';
      const idx = ROWS.indexOf(row);
      if (passed && prevStars < 2 && idx < ROWS.length - 1) {
        rankText = `🔓 ${ROWS[idx + 1]}er-Reihe freigeschaltet!`;
        extraConfetti = true;
      }
      renderLevelGrid();
    }
    if (rules.source === 'pool' && reason === 'cleared') {
      title = 'Alle Fehler ausgebügelt! 🎉';
      extraConfetti = true;
    }

    $('resultTitle').textContent = title;
    $('newHighscore').classList.toggle('hidden', !improved);
    rankEl.textContent = rankText;
    rankEl.classList.toggle('hidden', !rankText);

    // Gesamtpunkte, Modi und Abzeichen verbuchen
    const newBadges = playerName
      ? finishForPlayer(playerName, { score: state.score, bestStreak: state.bestStreak, correct: state.correct, wrong: state.wrong }, reason)
      : [];
    const badgeBox = $('newBadges');
    badgeBox.innerHTML = '';
    newBadges.forEach((b) => {
      const row = document.createElement('div');
      row.className = 'new-badge';
      row.textContent = `🏅 Neues Abzeichen: ${b.icon} ${b.name}`;
      badgeBox.appendChild(row);
    });
    badgeBox.classList.toggle('hidden', newBadges.length === 0);

    // Tagesziel erreicht?
    const dailyEl = $('dailyGoal');
    if (state.dailyGoalHit && playerName) {
      dailyEl.textContent = `🔥 Tagesziel geschafft! ${effectiveStreak(playerName)}-Tage-Serie!`;
      dailyEl.classList.remove('hidden');
    } else {
      dailyEl.classList.add('hidden');
    }
    if (newBadges.length > 0 || state.dailyGoalHit) extraConfetti = true;

    renderModeBadges();
    renderBadgeGrid();
    renderDailyInfo();
    renderLeaderboard();

    showScreen('result');
    playSound(improved || extraConfetti ? 'record' : 'finish');
    if (improved || extraConfetti) confettiRain(80);
    else if (starCount === 3) confettiRain(40);
  }

  // Aktualisiert alles auf dem Startbildschirm, das vom aktuellen Spieler abhängt
  function refreshPlayerUI() {
    renderPlayerChips();
    renderDuelChips();
    renderDailyInfo();
    renderBadgeGrid();
    renderModeBadges();
    renderLeaderboard();
    updateModeVisibility();
    if (!$('statsCard').classList.contains('hidden')) renderStats();
  }

  function quitToMenu() {
    state.running = false;
    state.duel = null;
    stopTimer();
    clearFeedback();
    refreshPlayerUI();
    showScreen('start');
  }

  // ===== Konfetti =====
  const CONFETTI_COLORS = ['#fbbf24', '#fb923c', '#22c55e', '#38bdf8', '#f472b6', '#a78bfa'];

  function makeConfetto(x, y) {
    const el = document.createElement('div');
    el.className = 'confetti';
    el.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    document.body.appendChild(el);
    return el;
  }

  function confettiBurst(anchor, count) {
    const rect = anchor.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    for (let i = 0; i < count; i++) {
      const el = makeConfetto(cx, cy);
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 120;
      const anim = el.animate([
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist + 80}px) rotate(${Math.random() * 540 - 270}deg)`, opacity: 0 },
      ], { duration: 700 + Math.random() * 400, easing: 'cubic-bezier(0.2, 0.6, 0.4, 1)' });
      anim.onfinish = () => el.remove();
    }
  }

  function confettiRain(count) {
    const w = window.innerWidth;
    for (let i = 0; i < count; i++) {
      const el = makeConfetto(Math.random() * w, -20);
      const drift = Math.random() * 120 - 60;
      const anim = el.animate([
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${drift}px, ${window.innerHeight + 40}px) rotate(${Math.random() * 720 - 360}deg)`, opacity: 0.8 },
      ], { duration: 1800 + Math.random() * 1600, delay: Math.random() * 800, easing: 'linear', fill: 'backwards' });
      anim.onfinish = () => el.remove();
    }
  }

  // ===== Events =====
  function bindEvents() {
    const nameInput = $('playerName');
    nameInput.value = playerName;
    nameInput.addEventListener('input', () => {
      playerName = nameInput.value.trim();
      localStorage.setItem(STORE.player, playerName);
      refreshPlayerUI();
    });

    $('duelName').addEventListener('input', () => {
      renderDuelChips();
      updateStartUI();
    });

    $('btnStats').addEventListener('click', () => {
      playSound('tap');
      const card = $('statsCard');
      card.classList.toggle('hidden');
      if (!card.classList.contains('hidden')) {
        renderStats();
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });

    $('btnExport').addEventListener('click', () => { playSound('tap'); exportData(); });
    $('btnImport').addEventListener('click', () => { playSound('tap'); $('importFile').click(); });
    $('importFile').addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) importData(e.target.files[0]);
      e.target.value = '';
    });

    $('btnStart').addEventListener('click', () => {
      ensureAudio();
      playSound('tap');
      startGame();
    });

    $('btnHandover').addEventListener('click', () => {
      if (!state.duel) return;
      ensureAudio();
      playSound('tap');
      state.duel.idx = 1;
      beginRound();
    });

    $('keypad').addEventListener('click', (e) => {
      const key = e.target.closest('.key');
      if (key) handleKey(key.dataset.key);
    });

    $('truthButtons').addEventListener('click', (e) => {
      const btn = e.target.closest('.truth-btn');
      if (!btn || !state.running || state.locked) return;
      if (!state.current || state.current.kind !== 'bool') return;
      resolveAnswer((btn.dataset.truth === '1') === state.current.isTrue);
    });

    document.addEventListener('keydown', (e) => {
      if ($('screen-start').classList.contains('active')) {
        // Enter startet die Runde (außer im Abenteuer, dort starten die Level-Buttons)
        if (e.key === 'Enter' && !$('btnStart').disabled && !$('btnStart').classList.contains('hidden')) {
          e.preventDefault();
          ensureAudio();
          startGame();
        }
        return;
      }
      if (!$('screen-quiz').classList.contains('active')) return;
      if (/^\d$/.test(e.key)) handleKey(e.key);
      else if (e.key === 'Backspace') handleKey('del');
      else if (e.key === 'Enter') handleKey('ok');
    });

    $('btnQuit').addEventListener('click', () => {
      if (state.running && state.taskIndex > 0 && !confirm('Runde wirklich abbrechen?')) return;
      quitToMenu();
    });
    $('btnMenu').addEventListener('click', quitToMenu);
    $('btnAgain').addEventListener('click', () => { playSound('tap'); startGame(); });

    $('btnMute').addEventListener('click', () => {
      muted = !muted;
      localStorage.setItem(STORE.muted, muted ? '1' : '0');
      $('btnMute').textContent = muted ? '🔇' : '🔊';
      playSound('tap');
    });
  }

  // ===== Init =====
  function init() {
    loadRows();
    buildRowChips();
    buildModeGrid();
    bindEvents();
    renderRowChips();
    renderLbTabs();
    refreshPlayerUI();
    $('btnMute').textContent = muted ? '🔇' : '🔊';

    // Offline-Fähigkeit (nur über http/https möglich, nicht bei file://)
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* offline-Modus dann eben nicht */ });
    }
  }

  init();
})();
