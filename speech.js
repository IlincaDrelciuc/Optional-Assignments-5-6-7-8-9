window.addEventListener('DOMContentLoaded', () => {
  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  const synth = window.speechSynthesis;

  const elSupport = document.getElementById('supportStatus');
  const elListenStatus = document.getElementById('listenStatus');

  const btnListen = document.getElementById('btnListen');
  const btnNewGame = document.getElementById('btnNewGame');
  const btnHelp = document.getElementById('btnHelp');

  const selListenMode = document.getElementById('listenMode');
  const selDifficulty = document.getElementById('difficulty');
  const selLanguage = document.getElementById('language');
  const selVoice = document.getElementById('voiceSelect');

  const rngRate = document.getElementById('rate');
  const rngPitch = document.getElementById('pitch');
  const rngTtsVol = document.getElementById('ttsVolume');

  const selMultiplayer = document.getElementById('multiplayer');

  const elPlayerLabel = document.getElementById('playerLabel');
  const elTranscribed = document.getElementById('transcribed');
  const elHint = document.getElementById('hint');
  const elAttempts = document.getElementById('attempts');
  const elRange = document.getElementById('range');

  const listP1 = document.getElementById('historyP1');
  const listP2 = document.getElementById('historyP2');
  const titleP2 = document.getElementById('p2Title');

  const elGamesPlayed = document.getElementById('gamesPlayed');
  const elWins = document.getElementById('wins');
  const elLosses = document.getElementById('losses');
  const elWinRatio = document.getElementById('winRatio');
  const elBestAttempts = document.getElementById('bestAttempts');
  const elLastTime = document.getElementById('lastTime');
  const elAvgTime = document.getElementById('avgTime');

  const badgesEl = document.getElementById('badges');

  const rangeCanvas = document.getElementById('rangeCanvas');
  const rangeCtx = rangeCanvas.getContext('2d');

  const statsCanvas = document.getElementById('statsCanvas');
  const statsCtx = statsCanvas.getContext('2d');

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const sfxGain = audioCtx.createGain();
  sfxGain.gain.value = 0.2;
  sfxGain.connect(audioCtx.destination);

  const STORAGE_KEY = 'voiceGuessGame.v1';

  const i18n = {
    'en-US': {
      ready: 'Voices loaded, I am ready!',
      start: 'Listening. Say a number.',
      invalid: 'Your input is invalid.',
      tooLow: 'The number is too low. Try again.',
      tooHigh: 'The number is too high. Try again.',
      won: 'You won, congrats!',
      giveUp: 'You gave up. The number was {n}. Starting a new game.',
      help: 'Say a number, or say restart, repeat, help, or give up.',
      restart: 'New game started.',
      repeat: 'Repeating the last hint: {hint}',
      timeout: 'I did not hear you. Please try again.',
      micDenied: 'Microphone permission denied.',
      noSpeech: 'No speech detected. Try again.',
      network: 'Network error. Try again.',
      aborted: 'Listening stopped.',
      notSupported: 'Your browser does not support the Web Speech API.'
    },
    'es-ES': {
      ready: 'Voces cargadas, estoy listo.',
      start: 'Escuchando. Di un número.',
      invalid: 'Tu entrada no es válida.',
      tooLow: 'El número es demasiado bajo. Inténtalo de nuevo.',
      tooHigh: 'El número es demasiado alto. Inténtalo de nuevo.',
      won: '¡Ganaste, felicidades!',
      giveUp: 'Te rendiste. El número era {n}. Empezando un nuevo juego.',
      help: 'Di un número, o di reiniciar, repetir, ayuda, o rendirse.',
      restart: 'Nuevo juego iniciado.',
      repeat: 'Repitiendo la última pista: {hint}',
      timeout: 'No te escuché. Inténtalo de nuevo.',
      micDenied: 'Permiso de micrófono denegado.',
      noSpeech: 'No se detectó voz. Inténtalo de nuevo.',
      network: 'Error de red. Inténtalo de nuevo.',
      aborted: 'Escucha detenida.',
      notSupported: 'Tu navegador no soporta la API de voz.'
    },
    'fr-FR': {
      ready: 'Voix chargées, je suis prêt.',
      start: 'J’écoute. Dis un nombre.',
      invalid: 'Entrée invalide.',
      tooLow: 'Le nombre est trop petit. Réessaie.',
      tooHigh: 'Le nombre est trop grand. Réessaie.',
      won: 'Tu as gagné, bravo !',
      giveUp: 'Tu abandonnes. Le nombre était {n}. Nouvelle partie.',
      help: 'Dis un nombre, ou dis redémarrer, répéter, aide, ou abandonner.',
      restart: 'Nouvelle partie démarrée.',
      repeat: 'Je répète l’indice: {hint}',
      timeout: 'Je ne t’ai pas entendu. Réessaie.',
      micDenied: 'Permission micro refusée.',
      noSpeech: 'Aucune parole détectée. Réessaie.',
      network: 'Erreur réseau. Réessaie.',
      aborted: 'Écoute arrêtée.',
      notSupported: 'Ton navigateur ne supporte pas l’API vocale.'
    },
    'de-DE': {
      ready: 'Stimmen geladen, ich bin bereit.',
      start: 'Ich höre zu. Sag eine Zahl.',
      invalid: 'Ungültige Eingabe.',
      tooLow: 'Die Zahl ist zu niedrig. Versuch es noch einmal.',
      tooHigh: 'Die Zahl ist zu hoch. Versuch es noch einmal.',
      won: 'Du hast gewonnen, Glückwunsch!',
      giveUp: 'Du gibst auf. Die Zahl war {n}. Neues Spiel startet.',
      help: 'Sag eine Zahl oder sag neu starten, wiederholen, hilfe oder aufgeben.',
      restart: 'Neues Spiel gestartet.',
      repeat: 'Ich wiederhole den Hinweis: {hint}',
      timeout: 'Ich habe dich nicht gehört. Bitte versuch es erneut.',
      micDenied: 'Mikrofonzugriff verweigert.',
      noSpeech: 'Keine Sprache erkannt. Versuch es erneut.',
      network: 'Netzwerkfehler. Versuch es erneut.',
      aborted: 'Zuhören beendet.',
      notSupported: 'Dein Browser unterstützt die Sprach-API nicht.'
    }
  };

  const wordNumbers = {
    'en-US': { zero:0, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10 },
    'es-ES': { cero:0, uno:1, dos:2, tres:3, cuatro:4, cinco:5, seis:6, siete:7, ocho:8, nueve:9, diez:10 },
    'fr-FR': { zero:0, un:1, deux:2, trois:3, quatre:4, cinq:5, six:6, sept:7, huit:8, neuf:9, dix:10 },
    'de-DE': { null:0, eins:1, zwei:2, drei:3, vier:4, fünf:5, sechs:6, sieben:7, acht:8, neun:9, zehn:10 }
  };

  function t(key) {
    const lang = selLanguage.value;
    const pack = i18n[lang] || i18n['en-US'];
    return pack[key] || i18n['en-US'][key] || key;
  }

  function format(template, vars) {
    return template.replace(/\{(\w+)\}/g, (_, k) => String(vars?.[k] ?? ''));
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function msToTime(ms) {
    if (!Number.isFinite(ms)) return '—';
    const s = Math.round(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  }

  function sfx(type) {
    audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(sfxGain);

    const now = audioCtx.currentTime;

    if (type === 'click') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(900, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.07);
      return;
    }

    if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.25, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.2);
      return;
    }

    if (type === 'success') {
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.25, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      const o2 = audioCtx.createOscillator();
      const g2 = audioCtx.createGain();
      o2.connect(g2);
      g2.connect(sfxGain);

      o2.type = 'sine';
      g2.gain.setValueAtTime(0.0001, now);
      g2.gain.exponentialRampToValueAtTime(0.22, now + 0.01);
      g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      osc.frequency.setValueAtTime(660, now);
      o2.frequency.setValueAtTime(880, now + 0.06);

      osc.start(now);
      o2.start(now + 0.06);
      osc.stop(now + 0.24);
      o2.stop(now + 0.26);
      return;
    }
  }

  let voices = [];
  let recognition = null;

  let continuousEnabled = false;
  let keepListening = false;
  let listenTimeoutId = null;
  const listenTimeoutMs = 9000;

  let target = 0;
  let minRange = 1;
  let maxRange = 100;
  let startTime = performance.now();
  let lastHintText = '—';
  let lastResultConfidence = 0;

  let multiplayer = false;
  let currentPlayer = 1;

  let p1Attempts = 0;
  let p2Attempts = 0;
  let p1History = [];
  let p2History = [];

  let sessionWins = 0;
  let sessionLosses = 0;

  let persisted = {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    bestAttempts: null,
    timesMs: [],
    attemptsBuckets: Array(10).fill(0),
    achievements: {
      lucky: false,
      skilled: false,
      dedicated: false,
      pronunciation: false
    }
  };

  function loadPersisted() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      persisted = {
        ...persisted,
        ...parsed,
        achievements: { ...persisted.achievements, ...(parsed.achievements || {}) }
      };
      if (!Array.isArray(persisted.timesMs)) persisted.timesMs = [];
      if (!Array.isArray(persisted.attemptsBuckets) || persisted.attemptsBuckets.length !== 10) persisted.attemptsBuckets = Array(10).fill(0);
    } catch {}
  }

  function savePersisted() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch {}
  }

  function updateBadges() {
    const items = [
      { key: 'lucky', label: '🍀 Lucky (win in 1)' },
      { key: 'skilled', label: '🏆 Skilled (≤ 5)' },
      { key: 'dedicated', label: '🔥 Dedicated (10 games)' },
      { key: 'pronunciation', label: '🎙️ Clear speech (high confidence)' }
    ];
    badgesEl.innerHTML = '';
    for (const it of items) {
      const div = document.createElement('div');
      div.className = 'badge' + (persisted.achievements[it.key] ? '' : ' locked');
      div.textContent = it.label;
      badgesEl.appendChild(div);
    }
  }

  function updateStatsUI(lastTimeMs) {
    elGamesPlayed.textContent = String(persisted.gamesPlayed);
    elWins.textContent = String(persisted.wins);
    elLosses.textContent = String(persisted.losses);

    const total = persisted.wins + persisted.losses;
    elWinRatio.textContent = total > 0 ? `${Math.round((persisted.wins / total) * 100)}%` : '—';

    elBestAttempts.textContent = persisted.bestAttempts == null ? '—' : String(persisted.bestAttempts);
    elLastTime.textContent = lastTimeMs == null ? '—' : msToTime(lastTimeMs);

    const avg = persisted.timesMs.length
      ? persisted.timesMs.reduce((a,b)=>a+b,0) / persisted.timesMs.length
      : null;
    elAvgTime.textContent = avg == null ? '—' : msToTime(avg);

    updateBadges();
    drawAttemptsChart();
  }

  function bucketIndex(attempts) {
    if (attempts <= 1) return 0;
    if (attempts === 2) return 1;
    if (attempts === 3) return 2;
    if (attempts === 4) return 3;
    if (attempts === 5) return 4;
    if (attempts <= 7) return 5;
    if (attempts <= 10) return 6;
    if (attempts <= 15) return 7;
    if (attempts <= 20) return 8;
    return 9;
  }

  function drawAttemptsChart() {
    const ctx = statsCtx;
    const w = statsCanvas.width;
    const h = statsCanvas.height;

    ctx.clearRect(0, 0, w, h);

    const labels = ['1','2','3','4','5','6–7','8–10','11–15','16–20','21+'];
    const data = persisted.attemptsBuckets;
    const maxVal = Math.max(1, ...data);

    const pad = 18;
    const chartW = w - pad * 2;
    const chartH = h - pad * 2;
    const barW = chartW / data.length;

    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(pad, pad, chartW, chartH);

    ctx.font = '12px system-ui, Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';

    for (let i = 0; i < data.length; i++) {
      const v = data[i];
      const bh = (v / maxVal) * (chartH - 28);
      const x = pad + i * barW + 8;
      const y = pad + chartH - 18 - bh;

      ctx.fillStyle = 'rgba(255,77,184,0.7)';
      ctx.fillRect(x, y, barW - 16, bh);

      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(String(v), x, y - 4);

      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(labels[i], x, pad + chartH - 4);
    }
  }

  function drawRangeCanvas() {
    const ctx = rangeCtx;
    const w = rangeCanvas.width;
    const h = rangeCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const minV = 1;
    const maxV = maxRange;

    const padX = 18;
    const padY = 20;
    const barY = Math.floor(h / 2);
    const barH = 18;
    const barW = w - padX * 2;

    const leftElimW = ((minRange - minV) / (maxV - minV)) * barW;
    const rightElimW = ((maxV - maxRange) / (maxV - minV)) * barW;
    const remainW = barW - leftElimW - rightElimW;

    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(padX, barY - barH / 2, barW, barH);

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(padX, barY - barH / 2, leftElimW, barH);

    ctx.fillStyle = 'rgba(59,228,122,0.35)';
    ctx.fillRect(padX + leftElimW, barY - barH / 2, remainW, barH);

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(padX + leftElimW + remainW, barY - barH / 2, rightElimW, barH);

    const guesses = multiplayer ? [...p1History, ...p2History] : [...p1History];
    for (const g of guesses) {
      if (!Number.isFinite(g)) continue;
      if (g < minV || g > maxV) continue;
      const x = padX + ((g - minV) / (maxV - minV)) * barW;
      ctx.fillStyle = 'rgba(255,204,102,0.9)';
      ctx.fillRect(x - 1, barY - 22, 2, 44);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '12px system-ui, Arial';
    ctx.fillText(String(minV), padX, padY);
    ctx.fillText(String(maxV), padX + barW - 28, padY);

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '13px system-ui, Arial';
    ctx.fillText(`Remaining: ${minRange}–${maxRange}`, padX, h - 10);
  }

  function setUIFromState() {
    elPlayerLabel.textContent = multiplayer ? `Player ${currentPlayer}` : 'Player 1';
    elAttempts.textContent = String(multiplayer ? (currentPlayer === 1 ? p1Attempts : p2Attempts) : p1Attempts);
    elRange.textContent = `${minRange}–${maxRange}`;
    titleP2.classList.toggle('muted', !multiplayer);
    listP2.style.display = multiplayer ? '' : 'none';
  }

  function setHint(text) {
    lastHintText = text;
    elHint.textContent = text;
  }

  function addHistory(player, guess, note) {
    const li = document.createElement('li');
    li.textContent = note ? `${guess} — ${note}` : String(guess);

    if (player === 1) {
      p1History.push(guess);
      listP1.prepend(li);
    } else {
      p2History.push(guess);
      listP2.prepend(li);
    }
  }

  function clearHistories() {
    p1History = [];
    p2History = [];
    listP1.innerHTML = '';
    listP2.innerHTML = '';
  }

  function difficultyConfig() {
    const d = selDifficulty.value;
    if (d === 'easy') return { min: 1, max: 50 };
    if (d === 'hard') return { min: 1, max: 1000 };
    return { min: 1, max: 100 };
  }

  function newTarget() {
    const cfg = difficultyConfig();
    minRange = cfg.min;
    maxRange = cfg.max;
    target = Math.floor(Math.random() * (cfg.max - cfg.min + 1)) + cfg.min;
  }

  function resetGame(announce = true) {
    multiplayer = selMultiplayer.value === 'on';
    currentPlayer = 1;

    p1Attempts = 0;
    p2Attempts = 0;

    clearHistories();

    newTarget();
    startTime = performance.now();
    elTranscribed.textContent = '—';
    setHint('—');
    setUIFromState();
    drawRangeCanvas();

    if (announce) speak(t('restart'));
  }

  function parseGuess(raw, lang) {
    const cleaned = raw.toLowerCase().trim();

    const direct = parseInt(cleaned, 10);
    if (Number.isFinite(direct)) return { type: 'guess', value: direct, raw: cleaned };

    const map = wordNumbers[lang] || wordNumbers['en-US'];
    if (Object.prototype.hasOwnProperty.call(map, cleaned)) return { type: 'guess', value: map[cleaned], raw: cleaned };

    const mapEn = wordNumbers['en-US'];
    if (Object.prototype.hasOwnProperty.call(mapEn, cleaned)) return { type: 'guess', value: mapEn[cleaned], raw: cleaned };

    return { type: 'unknown', raw: cleaned };
  }

  function normalizeCommand(raw) {
    const s = raw.toLowerCase().trim();
    const phrases = {
      giveUp: ['give up','surrender','i give up','quit','stop game','aufgeben','abandonner','rendirse','me rindo'],
      restart: ['new game','restart','start over','reset','neu starten','nouvelle partie','reiniciar','reinicia'],
      repeat: ['repeat','say again','again','wiederholen','répéter','repetir','repite'],
      help: ['help','instructions','how to play','hilfe','aide','ayuda']
    };

    for (const k of Object.keys(phrases)) {
      if (phrases[k].some(p => s.includes(p))) return k;
    }
    return null;
  }

  function hotColdHint(diff, span) {
    const pct = diff / span;
    if (pct >= 0.5) return 'Very cold';
    if (pct >= 0.25) return 'Cold';
    if (pct >= 0.12) return 'Warm';
    return 'Hot';
  }

  function speak(text) {
    if (!synth) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = selLanguage.value;
    u.rate = Number(rngRate.value);
    u.pitch = Number(rngPitch.value);
    u.volume = Number(rngTtsVol.value);

    const voiceId = selVoice.value;
    const v = voices.find(vx => String(vx.voiceURI) === voiceId) || null;
    if (v) u.voice = v;

    synth.cancel();
    synth.speak(u);
  }

  function setListeningUI(on) {
    elListenStatus.textContent = on ? 'Listening…' : 'Not listening';
  }

  function startListening() {
    if (!recognition) return;
    audioCtx.resume();
    sfx('click');

    keepListening = true;
    setListeningUI(true);
    setHint('—');
    speak(t('start'));

    clearListenTimeout();
    listenTimeoutId = window.setTimeout(() => {
      speak(t('timeout'));
    }, listenTimeoutMs);

    try {
      recognition.start();
    } catch {}
  }

  function stopListening() {
    if (!recognition) return;
    keepListening = false;
    clearListenTimeout();
    setListeningUI(false);
    try {
      recognition.stop();
    } catch {}
  }

  function clearListenTimeout() {
    if (listenTimeoutId != null) {
      clearTimeout(listenTimeoutId);
      listenTimeoutId = null;
    }
  }

  function endOfTurn() {
    if (multiplayer) currentPlayer = currentPlayer === 1 ? 2 : 1;
    setUIFromState();
    drawRangeCanvas();
  }

  function markWin(winnerPlayer, attemptsUsed) {
    const elapsed = performance.now() - startTime;

    persisted.gamesPlayed += 1;
    persisted.wins += 1;
    sessionWins += 1;

    persisted.timesMs.push(elapsed);
    if (persisted.timesMs.length > 200) persisted.timesMs.shift();

    if (persisted.bestAttempts == null || attemptsUsed < persisted.bestAttempts) persisted.bestAttempts = attemptsUsed;

    persisted.attemptsBuckets[bucketIndex(attemptsUsed)] += 1;

    if (attemptsUsed === 1) persisted.achievements.lucky = true;
    if (attemptsUsed <= 5) persisted.achievements.skilled = true;
    if (persisted.gamesPlayed >= 10) persisted.achievements.dedicated = true;
    if (lastResultConfidence >= 0.9) persisted.achievements.pronunciation = true;

    savePersisted();
    updateStatsUI(elapsed);
    updateBadges();

    setHint(t('won'));
    speak(t('won'));
    sfx('success');

    resetGame(false);
  }

  function markLoss() {
    persisted.gamesPlayed += 1;
    persisted.losses += 1;
    sessionLosses += 1;

    savePersisted();
    updateStatsUI(null);
  }

  function handleGiveUp() {
    persisted.gamesPlayed += 1;
    persisted.losses += 1;
    sessionLosses += 1;

    savePersisted();
    updateStatsUI(null);

    const msg = format(t('giveUp'), { n: target });
    setHint(msg);
    speak(msg);
    sfx('error');

    resetGame(false);
  }

  function handleGuess(guess, raw) {
    const cfg = difficultyConfig();
    const span = cfg.max - cfg.min;

    if (!Number.isFinite(guess)) {
      setHint(t('invalid'));
      speak(t('invalid'));
      sfx('error');
      return;
    }

    if (guess < cfg.min || guess > cfg.max) {
      setHint(`${t('invalid')} (${cfg.min}–${cfg.max})`);
      speak(t('invalid'));
      sfx('error');
      return;
    }

    elTranscribed.textContent = raw;

    if (!multiplayer || currentPlayer === 1) p1Attempts += 1;
    else p2Attempts += 1;

    const attemptsUsed = multiplayer ? (currentPlayer === 1 ? p1Attempts : p2Attempts) : p1Attempts;
    elAttempts.textContent = String(attemptsUsed);

    const diff = Math.abs(guess - target);
    const tempHint = hotColdHint(diff, span);

    if (guess === target) {
      addHistory(currentPlayer, guess, 'Correct');
      drawRangeCanvas();
      markWin(currentPlayer, attemptsUsed);
      return;
    }

    if (guess < target) {
      minRange = Math.max(minRange, guess + 1);
      addHistory(currentPlayer, guess, `${t('tooLow')} (${tempHint})`);
      setHint(`${t('tooLow')} (${tempHint})`);
      speak(`${t('tooLow')} ${tempHint}`);
    } else {
      maxRange = Math.min(maxRange, guess - 1);
      addHistory(currentPlayer, guess, `${t('tooHigh')} (${tempHint})`);
      setHint(`${t('tooHigh')} (${tempHint})`);
      speak(`${t('tooHigh')} ${tempHint}`);
    }

    drawRangeCanvas();

    if (minRange > maxRange) {
      handleGiveUp();
      return;
    }

    endOfTurn();
  }

  function setupRecognition() {
    if (!SpeechRecognitionCtor) return;

    recognition = new SpeechRecognitionCtor();
    recognition.lang = selLanguage.value;
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      clearListenTimeout();

      const res = event.results?.[0]?.[0];
      const transcript = (res?.transcript || '').trim();
      lastResultConfidence = Number(res?.confidence ?? 0);

      elTranscribed.textContent = transcript || '—';

      const cmd = normalizeCommand(transcript);
      if (cmd === 'help') {
        setHint(t('help'));
        speak(t('help'));
        return;
      }
      if (cmd === 'repeat') {
        const msg = format(t('repeat'), { hint: lastHintText || '—' });
        setHint(msg);
        speak(msg);
        return;
      }
      if (cmd === 'restart') {
        resetGame(true);
        return;
      }
      if (cmd === 'giveUp') {
        handleGiveUp();
        return;
      }

      const parsed = parseGuess(transcript, selLanguage.value);
      if (parsed.type !== 'guess') {
        setHint(t('invalid'));
        speak(t('invalid'));
        sfx('error');
        return;
      }

      handleGuess(parsed.value, transcript.toLowerCase().trim());
    };

    recognition.onerror = (e) => {
      clearListenTimeout();
      const err = e?.error || '';
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        setHint(t('micDenied'));
        speak(t('micDenied'));
      } else if (err === 'no-speech') {
        setHint(t('noSpeech'));
        speak(t('noSpeech'));
      } else if (err === 'network') {
        setHint(t('network'));
        speak(t('network'));
      } else if (err === 'aborted') {
        setHint(t('aborted'));
      } else {
        setHint(`${t('invalid')}`);
      }
      sfx('error');
    };

    recognition.onend = () => {
      clearListenTimeout();
      setListeningUI(false);

      if (selListenMode.value === 'continuous') {
        recognition.continuous = true;
        if (keepListening) {
          setTimeout(() => {
            if (keepListening) startListening();
          }, 250);
        }
      }
    };
  }

  function populateVoices() {
    voices = synth.getVoices() || [];
    const lang = selLanguage.value;
    const filtered = voices.filter(v => (v.lang || '').toLowerCase().startsWith(lang.toLowerCase().slice(0,2)));

    const list = filtered.length ? filtered : voices;

    selVoice.innerHTML = '';
    for (const v of list) {
      const opt = document.createElement('option');
      opt.value = String(v.voiceURI);
      opt.textContent = `${v.name} (${v.lang})`;
      selVoice.appendChild(opt);
    }
    if (!selVoice.value && selVoice.options.length) selVoice.selectedIndex = 0;
  }

  function setSupportUI(ok, msg) {
    elSupport.textContent = msg;
    elSupport.style.borderColor = ok ? 'rgba(59,228,122,0.5)' : 'rgba(255,90,90,0.6)';
    elSupport.style.background = ok ? 'rgba(59,228,122,0.12)' : 'rgba(255,90,90,0.12)';
  }

  function wireUI() {
    btnListen.addEventListener('click', () => {
      if (!recognition) return;
      if (selListenMode.value === 'push') {
        startListening();
      } else {
        if (keepListening) {
          stopListening();
        } else {
          startListening();
        }
      }
    });

    btnNewGame.addEventListener('click', () => resetGame(true));

    btnHelp.addEventListener('click', () => {
      setHint(t('help'));
      speak(t('help'));
    });

    selListenMode.addEventListener('change', () => {
      continuousEnabled = selListenMode.value === 'continuous';
      if (recognition) recognition.continuous = continuousEnabled;
      if (!continuousEnabled && keepListening) stopListening();
    });

    selDifficulty.addEventListener('change', () => resetGame(true));

    selMultiplayer.addEventListener('change', () => resetGame(true));

    selLanguage.addEventListener('change', () => {
      if (recognition) {
        try { recognition.abort(); } catch {}
      }
      setupRecognition();
      populateVoices();
      resetGame(false);
    });

    rngRate.addEventListener('input', () => {});
    rngPitch.addEventListener('input', () => {});
    rngTtsVol.addEventListener('input', () => {});
  }

  loadPersisted();
  updateStatsUI(null);

  if (!SpeechRecognitionCtor || !synth) {
    setSupportUI(false, t('notSupported'));
    btnListen.disabled = true;
    btnNewGame.disabled = true;
    btnHelp.disabled = true;
    return;
  }

  setSupportUI(true, 'Web Speech supported');
  setupRecognition();
  wireUI();

  synth.onvoiceschanged = () => {
    populateVoices();
    speak(t('ready'));
  };

  populateVoices();
  resetGame(false);
  drawRangeCanvas();
  drawAttemptsChart();
  updateBadges();
});
