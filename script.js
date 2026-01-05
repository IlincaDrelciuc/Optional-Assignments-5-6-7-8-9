window.addEventListener('DOMContentLoaded', async () => {
  const keyboardEl = document.getElementById('keyboard');
  const volumeEl = document.getElementById('volume');
  const waveformEl = document.getElementById('waveform');
  const octDown = document.getElementById('octDown');
  const octUp = document.getElementById('octUp');
  const toggleLabelsBtn = document.getElementById('toggleLabels');
  const midiStatusBtn = document.getElementById('midiStatus');

  const recBtn = document.getElementById('rec');
  const stopBtn = document.getElementById('stop');
  const playRecBtn = document.getElementById('playRec');
  const exportAudioBtn = document.getElementById('exportAudio');

  const attackEl = document.getElementById('attack');
  const decayEl = document.getElementById('decay');
  const sustainEl = document.getElementById('sustain');
  const releaseEl = document.getElementById('release');

  const fxDelayEl = document.getElementById('fxDelay');
  const fxDistEl = document.getElementById('fxDist');
  const fxReverbEl = document.getElementById('fxReverb');

  const metroToggle = document.getElementById('metroToggle');
  const bpmEl = document.getElementById('bpm');
  const bpmValue = document.getElementById('bpmValue');

  const noteDisplay = document.getElementById('noteDisplay');

  const spectrumCanvas = document.getElementById('spectrum');
  const spectrumCtx = spectrumCanvas.getContext('2d');

  const rollCanvas = document.getElementById('pianoRoll');
  const rollCtx = rollCanvas.getContext('2d');

  const seqToggle = document.getElementById('seqToggle');
  const seqSpeedEl = document.getElementById('seqSpeed');
  const seqSpeedValue = document.getElementById('seqSpeedValue');
  const sequencerEl = document.getElementById('sequencer');

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  const masterGain = audioCtx.createGain();
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;

  const out = audioCtx.createGain();
  out.gain.value = 1;

  const inputToFx = audioCtx.createGain();
  const dryGain = audioCtx.createGain();
  const wetGain = audioCtx.createGain();
  dryGain.gain.value = 1;
  wetGain.gain.value = 0;

  const delayNode = audioCtx.createDelay(2.0);
  const delayFb = audioCtx.createGain();
  delayNode.delayTime.value = 0.22;
  delayFb.gain.value = 0.35;
  delayNode.connect(delayFb);
  delayFb.connect(delayNode);

  const distNode = audioCtx.createWaveShaper();
  const distPre = audioCtx.createGain();
  distPre.gain.value = 1;

  const convolver = audioCtx.createConvolver();
  const reverbGain = audioCtx.createGain();
  reverbGain.gain.value = 0.35;

  inputToFx.connect(dryGain);
  dryGain.connect(masterGain);

  const fxSum = audioCtx.createGain();
  wetGain.connect(fxSum);
  fxSum.connect(masterGain);

  masterGain.connect(analyser);
  analyser.connect(out);
  out.connect(audioCtx.destination);

  const mediaDest = audioCtx.createMediaStreamDestination();
  out.connect(mediaDest);

  function makeImpulse(seconds, decay) {
    const rate = audioCtx.sampleRate;
    const length = Math.floor(rate * seconds);
    const impulse = audioCtx.createBuffer(2, length, rate);
    for (let c = 0; c < 2; c++) {
      const ch = impulse.getChannelData(c);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
      }
    }
    convolver.buffer = impulse;
  }

  makeImpulse(2.2, 3.0);

  function makeDistCurve(amount) {
    const n = 44100;
    const curve = new Float32Array(n);
    const k = amount;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((3 + k) * x * 20 * Math.PI / 180) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  distNode.curve = makeDistCurve(60);
  distNode.oversample = '4x';

  function rebuildFxChain() {
    inputToFx.disconnect();
    inputToFx.connect(dryGain);

    let node = inputToFx;

    const wantsDelay = fxDelayEl.checked;
    const wantsDist = fxDistEl.checked;
    const wantsRev = fxReverbEl.checked;

    let wetStart = node;

    if (wantsDist) {
      distPre.disconnect();
      distNode.disconnect();
      wetStart.connect(distPre);
      distPre.connect(distNode);
      wetStart = distNode;
    }

    if (wantsDelay) {
      delayNode.disconnect();
      delayFb.disconnect();
      wetStart.connect(delayNode);
      delayNode.connect(delayFb);
      delayFb.connect(delayNode);
      wetStart = delayNode;
    }

    if (wantsRev) {
      convolver.disconnect();
      reverbGain.disconnect();
      wetStart.connect(convolver);
      convolver.connect(reverbGain);
      wetStart = reverbGain;
    }

    wetStart.connect(wetGain);

    wetGain.gain.value = (wantsDelay || wantsDist || wantsRev) ? 1 : 0;
  }

  fxDelayEl.addEventListener('change', rebuildFxChain);
  fxDistEl.addEventListener('change', rebuildFxChain);
  fxReverbEl.addEventListener('change', rebuildFxChain);
  rebuildFxChain();

  function midiToFreq(m) {
    return Math.pow(2, (m - 69) / 12) * 440;
  }

  const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  function midiToNoteName(m) {
    const name = NOTE_NAMES[m % 12];
    const oct = Math.floor(m / 12) - 1;
    return `${name}${oct}`;
  }

  function isBlack(m) {
    const n = m % 12;
    return n === 1 || n === 3 || n === 6 || n === 8 || n === 10;
  }

  const START = 36;
  const END = 96;

  const activeNotes = new Map();
  const activeSamples = new Map();

  let sustainDown = false;
  const sustained = new Set();
  const pitchBend = { semis: 0 };

  const samples = new Array(128);
  const sampleBasePath = '../notes/';
  function preloadSamples() {
    for (let m = START; m <= END; m++) {
      const name = midiToNoteName(m).replace('#', 's');
      const a = new Audio(`${sampleBasePath}${name}.mp3`);
      a.preload = 'auto';
      samples[m] = a;
    }
  }

  preloadSamples();

  function setVolume() {
    masterGain.gain.setValueAtTime((Number(volumeEl.value) / 100), audioCtx.currentTime);
  }

  setVolume();
  volumeEl.addEventListener('input', () => {
    audioCtx.resume();
    setVolume();
  });

  let keyboardOctaveShift = 0;

  function applyPitchToOsc(osc, baseMidi) {
    const f = midiToFreq(baseMidi + pitchBend.semis);
    osc.frequency.setValueAtTime(f, audioCtx.currentTime);
  }

  function adsr() {
    return {
      a: Number(attackEl.value),
      d: Number(decayEl.value),
      s: Number(sustainEl.value),
      r: Number(releaseEl.value)
    };
  }

  function highlight(m, on) {
    const el = keyboardEl.querySelector(`[data-midi-code="${m}"]`);
    if (el) el.classList.toggle('activeKey', on);
  }

  function updateNoteDisplay() {
    if (activeNotes.size === 0 && activeSamples.size === 0) {
      noteDisplay.textContent = '—';
      return;
    }
    const mids = [...new Set([...activeNotes.keys(), ...activeSamples.keys()])].sort((a,b)=>a-b);
    const names = mids.map(m => `${midiToNoteName(m)}(${m})`);
    noteDisplay.textContent = names.join('  ');
  }

  function speakGesture() {
    audioCtx.resume();
  }

  function playOsc(m, vel=1) {
    if (activeNotes.has(m)) return;
    speakGesture();

    const g = audioCtx.createGain();
    g.gain.value = 0.0001;

    const osc = audioCtx.createOscillator();
    osc.type = waveformEl.value;
    applyPitchToOsc(osc, m);

    osc.connect(g);
    g.connect(inputToFx);

    const now = audioCtx.currentTime;
    const { a, d, s, r } = adsr();

    const peak = Math.max(0.0001, vel);
    const sustainLevel = peak * s;

    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(peak, now + a);
    g.gain.linearRampToValueAtTime(sustainLevel, now + a + d);

    osc.start(now);

    activeNotes.set(m, { osc, g, baseMidi: m, r, vel });
    highlight(m, true);
    updateNoteDisplay();

    pushRollEvent(m, now, null);
  }

  function stopOsc(m) {
    const node = activeNotes.get(m);
    if (!node) return;

    if (sustainDown) {
      sustained.add(m);
      return;
    }

    const now = audioCtx.currentTime;
    node.g.gain.cancelScheduledValues(now);
    node.g.gain.setValueAtTime(node.g.gain.value, now);
    node.g.gain.linearRampToValueAtTime(0.0001, now + node.r);

    node.osc.stop(now + node.r + 0.02);
    activeNotes.delete(m);

    highlight(m, false);
    updateNoteDisplay();

    endRollEvent(m, now);
  }

  function playSample(m, vel=1) {
    const a = samples[m];
    if (!a) return;
    a.pause();
    a.currentTime = 0;
    a.volume = Math.max(0, Math.min(1, vel)) * (Number(volumeEl.value) / 100);
    a.play().catch(()=>{});
    activeSamples.set(m, { a });
    highlight(m, true);
    updateNoteDisplay();
    const now = audioCtx.currentTime;
    pushRollEvent(m, now, null);
  }

  function stopSample(m) {
    const node = activeSamples.get(m);
    if (!node) return;

    if (sustainDown) {
      sustained.add(m);
      return;
    }

    node.a.pause();
    node.a.currentTime = 0;
    activeSamples.delete(m);
    highlight(m, false);
    updateNoteDisplay();
    const now = audioCtx.currentTime;
    endRollEvent(m, now);
  }

  function stopNote(m) {
    stopOsc(m);
    stopSample(m);
  }

  function stopAll() {
    for (const m of [...activeNotes.keys()]) {
      sustainDown = false;
      sustained.delete(m);
      stopOsc(m);
    }
    for (const m of [...activeSamples.keys()]) {
      sustainDown = false;
      sustained.delete(m);
      stopSample(m);
    }
  }

  waveformEl.addEventListener('change', () => {
    for (const v of activeNotes.values()) v.osc.type = waveformEl.value;
  });

  function buildKeyboard() {
    keyboardEl.innerHTML = '';
    let whiteIndex = 0;
    const whiteLeft = new Map();

    for (let m = START; m <= END; m++) {
      if (!isBlack(m)) {
        const k = document.createElement('div');
        k.className = 'key white';
        k.dataset.midiCode = String(m);
        k.dataset.note = midiToNoteName(m);
        const s = document.createElement('span');
        s.textContent = k.dataset.note;
        k.appendChild(s);
        keyboardEl.appendChild(k);
        whiteLeft.set(m, 12 + whiteIndex * 40);
        whiteIndex++;
      }
    }

    for (let m = START; m <= END; m++) {
      if (isBlack(m)) {
        const prev = whiteLeft.get(m - 1);
        if (prev == null) continue;
        const k = document.createElement('div');
        k.className = 'key black';
        k.dataset.midiCode = String(m);
        k.dataset.note = midiToNoteName(m);
        k.style.left = `${prev + 26}px`;
        k.style.top = `12px`;
        const s = document.createElement('span');
        s.textContent = k.dataset.note;
        k.appendChild(s);
        keyboardEl.appendChild(k);
      }
    }
  }

  buildKeyboard();

  let mouseDown = false;
  keyboardEl.addEventListener('mousedown', (e) => {
    const key = e.target.closest('.key');
    if (!key) return;
    mouseDown = true;
    const m = Number(key.dataset.midiCode);
    playOsc(m, 1);
  });

  keyboardEl.addEventListener('mouseover', (e) => {
    if (!mouseDown) return;
    const key = e.target.closest('.key');
    if (!key) return;
    const m = Number(key.dataset.midiCode);
    playOsc(m, 1);
  });

  window.addEventListener('mouseup', () => {
    mouseDown = false;
    stopAll();
  });

  const emulatedKeysBase = {
    'z': 48, 's': 49, 'x': 50, 'd': 51, 'c': 52, 'v': 53, 'g': 54, 'b': 55, 'h': 56, 'n': 57, 'j': 58, 'm': 59,
    'q': 60, '2': 61, 'w': 62, '3': 63, 'e': 64, 'r': 65, '5': 66, 't': 67, '6': 68, 'y': 69, '7': 70, 'u': 71,
    'i': 72, '9': 73, 'o': 74, '0': 75, 'p': 76, '[': 77, '=': 78, ']': 79
  };

  const keyDownSet = new Set();

  function shiftedMidi(m) {
    return m + keyboardOctaveShift * 12;
  }

  function clampToRange(m) {
    return Math.max(START, Math.min(END, m));
  }

  function handleKeyNoteDown(key) {
    const base = emulatedKeysBase[key];
    if (base == null) return null;
    const m = clampToRange(shiftedMidi(base));
    playOsc(m, 1);
    return m;
  }

  function handleKeyNoteUp(key) {
    const base = emulatedKeysBase[key];
    if (base == null) return null;
    const m = clampToRange(shiftedMidi(base));
    stopOsc(m);
    return m;
  }

  function updateOctaveButtons() {
    octDown.disabled = keyboardOctaveShift <= -2;
    octUp.disabled = keyboardOctaveShift >= 2;
  }

  updateOctaveButtons();

  octDown.addEventListener('click', () => {
    keyboardOctaveShift = Math.max(-2, keyboardOctaveShift - 1);
    updateOctaveButtons();
  });

  octUp.addEventListener('click', () => {
    keyboardOctaveShift = Math.min(2, keyboardOctaveShift + 1);
    updateOctaveButtons();
  });

  let labelsOn = true;
  toggleLabelsBtn.addEventListener('click', () => {
    labelsOn = !labelsOn;
    keyboardEl.classList.toggle('hide-labels', !labelsOn);
    toggleLabelsBtn.textContent = labelsOn ? 'Labels: ON' : 'Labels: OFF';
  });

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;

    const k = e.key;

    if (e.ctrlKey && (k === 'r' || k === 'R')) { toggleRecording(); return; }
    if (e.ctrlKey && (k === 'p' || k === 'P')) { playRecording(); return; }
    if (k === ' ') { toggleMetronome(); e.preventDefault(); return; }
    if (k === 'ArrowUp') { octUp.click(); return; }
    if (k === 'ArrowDown') { octDown.click(); return; }
    if (e.ctrlKey && (k === 'w' || k === 'W')) {
      const idx = ['sine','square','sawtooth','triangle'].indexOf(waveformEl.value);
      waveformEl.value = ['sine','square','sawtooth','triangle'][(idx + 1) % 4];
      waveformEl.dispatchEvent(new Event('change'));
      return;
    }

    if (keyDownSet.has(k)) return;
    const m = handleKeyNoteDown(k);
    if (m != null) keyDownSet.add(k);
  });

  window.addEventListener('keyup', (e) => {
    const k = e.key;
    if (!keyDownSet.has(k)) return;
    handleKeyNoteUp(k);
    keyDownSet.delete(k);
  });

  const chordMap = {
    Cmaj: [60,64,67],
    Gmaj: [67,71,74],
    Amin: [69,72,76],
    Fmaj: [65,69,72]
  };

  document.querySelectorAll('.chord').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.chord;
      const notes = chordMap[name] || [];
      const baseShift = keyboardOctaveShift * 12;
      for (const n of notes) playOsc(clampToRange(n + baseShift), 1);
      setTimeout(() => {
        for (const n of notes) stopOsc(clampToRange(n + baseShift));
      }, 450);
    });
  });

  const presets = {
    piano: { waveform:'sawtooth', a:0.01, d:0.12, s:0.7, r:0.25, vol:0.3 },
    organ: { waveform:'sine', a:0.005, d:0.05, s:0.95, r:0.08, vol:0.28 },
    strings: { waveform:'triangle', a:0.08, d:0.25, s:0.75, r:0.6, vol:0.26 },
    brass: { waveform:'square', a:0.03, d:0.1, s:0.65, r:0.25, vol:0.28 },
    lead: { waveform:'sawtooth', a:0.005, d:0.08, s:0.8, r:0.12, vol:0.24 }
  };

  function applyPreset(p) {
    waveformEl.value = p.waveform;
    waveformEl.dispatchEvent(new Event('change'));
    attackEl.value = String(p.a);
    decayEl.value = String(p.d);
    sustainEl.value = String(p.s);
    releaseEl.value = String(p.r);
    volumeEl.value = String(Math.round(p.vol * 100));
    setVolume();
  }

  document.querySelectorAll('.preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = presets[btn.dataset.preset];
      if (p) applyPreset(p);
    });
  });

  let metroOn = false;
  let metroTimer = null;

  function metroTick() {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = 1000;
    const t0 = audioCtx.currentTime;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);
    osc.connect(g);
    g.connect(inputToFx);
    osc.start(t0);
    osc.stop(t0 + 0.07);
  }

  function startMetronome() {
    const bpm = Number(bpmEl.value);
    const ms = Math.floor(60000 / bpm);
    metroTimer = setInterval(metroTick, ms);
  }

  function stopMetronome() {
    if (metroTimer) clearInterval(metroTimer);
    metroTimer = null;
  }

  function toggleMetronome() {
    metroOn = !metroOn;
    metroToggle.textContent = metroOn ? 'Metronome: ON' : 'Metronome: OFF';
    if (metroOn) startMetronome();
    else stopMetronome();
  }

  metroToggle.addEventListener('click', () => {
    speakGesture();
    toggleMetronome();
  });

  bpmEl.addEventListener('input', () => {
    bpmValue.textContent = String(bpmEl.value);
    if (metroOn) {
      stopMetronome();
      startMetronome();
    }
  });

  bpmValue.textContent = String(bpmEl.value);

  const rollEvents = [];
  const activeRoll = new Map();
  const rollWindowSec = 6;

  function pushRollEvent(m, start, end) {
    activeRoll.set(m, { m, start, end });
  }

  function endRollEvent(m, end) {
    const ev = activeRoll.get(m);
    if (!ev) return;
    ev.end = end;
    rollEvents.push({ ...ev });
    activeRoll.delete(m);
  }

  function drawRoll() {
    const w = rollCanvas.width;
    const h = rollCanvas.height;
    rollCtx.clearRect(0,0,w,h);

    const now = audioCtx.currentTime;
    const t0 = now - rollWindowSec;

    const minM = START;
    const maxM = END;
    const rows = maxM - minM + 1;

    function yFor(m) {
      const idx = m - minM;
      return h - (idx + 1) * (h / rows);
    }

    rollCtx.fillStyle = 'rgba(255,255,255,0.06)';
    rollCtx.fillRect(0,0,w,h);

    const merged = rollEvents.filter(e => (e.end ?? now) >= t0).slice(-400);
    for (const [m, ev] of activeRoll.entries()) {
      merged.push({ m, start: ev.start, end: now });
    }

    for (const e of merged) {
      const xs = ((e.start - t0) / rollWindowSec) * w;
      const xe = ((e.end - t0) / rollWindowSec) * w;
      const y = yFor(e.m);
      const rh = h / rows;
      rollCtx.fillStyle = 'rgba(255,77,184,0.7)';
      rollCtx.fillRect(xs, y, Math.max(2, xe - xs), rh);
    }

    requestAnimationFrame(drawRoll);
  }

  drawRoll();

  function drawSpectrum() {
    const w = spectrumCanvas.width;
    const h = spectrumCanvas.height;
    const arr = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(arr);
    spectrumCtx.clearRect(0,0,w,h);
    const n = arr.length;
    const barW = w / n * 2.2;
    let x = 0;
    for (let i = 0; i < n; i += 2) {
      const v = arr[i] / 255;
      const bh = v * h;
      spectrumCtx.fillStyle = 'rgba(59,228,122,0.7)';
      spectrumCtx.fillRect(x, h - bh, barW, bh);
      x += barW + 0.5;
      if (x > w) break;
    }
    requestAnimationFrame(drawSpectrum);
  }

  drawSpectrum();

  let isRecording = false;
  let recordStart = 0;
  let recordEvents = [];
  let activeRec = new Map();

  function nowSec() {
    return audioCtx.currentTime;
  }

  function startRecording() {
    isRecording = true;
    recordEvents = [];
    activeRec.clear();
    recordStart = nowSec();
    recBtn.textContent = '● Recording…';
  }

  function stopRecording() {
    isRecording = false;
    recBtn.textContent = '● Record';
    for (const [m, s] of activeRec.entries()) {
      recordEvents.push({ note:m, time:s - recordStart, duration: nowSec() - s });
    }
    activeRec.clear();
  }

  function toggleRecording() {
    speakGesture();
    if (!isRecording) startRecording();
    else stopRecording();
  }

  recBtn.addEventListener('click', toggleRecording);
  stopBtn.addEventListener('click', () => {
    speakGesture();
    stopAll();
    if (isRecording) stopRecording();
  });

  function onNoteStartForRecord(m) {
    if (!isRecording) return;
    activeRec.set(m, nowSec());
  }

  function onNoteEndForRecord(m) {
    if (!isRecording) return;
    const s = activeRec.get(m);
    if (s == null) return;
    activeRec.delete(m);
    recordEvents.push({ note:m, time:s - recordStart, duration: nowSec() - s });
  }

  const originalPlayOsc = playOsc;
  const originalStopOsc = stopOsc;

  playOsc = function(m, vel=1) {
    originalPlayOsc(m, vel);
    onNoteStartForRecord(m);
  };

  stopOsc = function(m) {
    originalStopOsc(m);
    onNoteEndForRecord(m);
  };

  const originalPlaySample = playSample;
  const originalStopSample = stopSample;

  playSample = function(m, vel=1) {
    originalPlaySample(m, vel);
    onNoteStartForRecord(m);
  };

  stopSample = function(m) {
    originalStopSample(m);
    onNoteEndForRecord(m);
  };

  function playRecording() {
    speakGesture();
    if (!recordEvents.length) return;
    stopAll();
    const t0 = nowSec();
    for (const ev of recordEvents) {
      setTimeout(() => playOsc(ev.note, 1), Math.max(0, (ev.time) * 1000));
      setTimeout(() => stopOsc(ev.note), Math.max(0, (ev.time + ev.duration) * 1000));
    }
  }

  playRecBtn.addEventListener('click', playRecording);

  let recorder = null;
  let chunks = [];
  exportAudioBtn.addEventListener('click', async () => {
    speakGesture();
    chunks = [];
    recorder = new MediaRecorder(mediaDest.stream);
    recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'piano-recording.webm';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    };
    recorder.start();
    playRecording();
    const totalMs = Math.max(...recordEvents.map(e => (e.time + e.duration) * 1000)) + 250;
    setTimeout(() => { recorder.stop(); }, totalMs);
  });

  const seqRows = 8;
  const seqSteps = 16;
  const seqNotes = [60,62,64,65,67,69,71,72];
  let seqGrid = Array.from({length:seqRows}, () => Array(seqSteps).fill(false));
  let seqOn = false;
  let seqTimer = null;
  let seqStep = 0;

  function buildSequencer() {
    sequencerEl.innerHTML = '';
    for (let r = 0; r < seqRows; r++) {
      for (let c = 0; c < seqSteps; c++) {
        const cell = document.createElement('div');
        cell.className = 'seqCell';
        cell.dataset.r = String(r);
        cell.dataset.c = String(c);
        cell.addEventListener('click', () => {
          const rr = Number(cell.dataset.r);
          const cc = Number(cell.dataset.c);
          seqGrid[rr][cc] = !seqGrid[rr][cc];
          cell.classList.toggle('on', seqGrid[rr][cc]);
        });
        sequencerEl.appendChild(cell);
      }
    }
  }

  function setPlayhead(col) {
    const cells = sequencerEl.querySelectorAll('.seqCell');
    cells.forEach(cell => cell.classList.remove('playhead'));
    for (let r = 0; r < seqRows; r++) {
      const idx = r * seqSteps + col;
      const cell = cells[idx];
      if (cell) cell.classList.add('playhead');
    }
  }

  function seqTick() {
    setPlayhead(seqStep);
    for (let r = 0; r < seqRows; r++) {
      if (seqGrid[r][seqStep]) {
        const m = seqNotes[r];
        playOsc(m, 0.8);
        setTimeout(() => stopOsc(m), 120);
      }
    }
    seqStep = (seqStep + 1) % seqSteps;
  }

  function startSeq() {
    const ms = Number(seqSpeedEl.value);
    seqTimer = setInterval(seqTick, ms);
  }

  function stopSeq() {
    if (seqTimer) clearInterval(seqTimer);
    seqTimer = null;
    setPlayhead(-1);
  }

  function toggleSeq() {
    speakGesture();
    seqOn = !seqOn;
    seqToggle.textContent = seqOn ? 'Sequencer: ON' : 'Sequencer: OFF';
    seqStep = 0;
    if (seqOn) startSeq();
    else stopSeq();
  }

  seqToggle.addEventListener('click', toggleSeq);
  seqSpeedEl.addEventListener('input', () => {
    seqSpeedValue.textContent = String(seqSpeedEl.value);
    if (seqOn) {
      stopSeq();
      startSeq();
    }
  });
  seqSpeedValue.textContent = String(seqSpeedEl.value);
  buildSequencer();

  function releaseSustain() {
    for (const m of [...sustained]) {
      sustained.delete(m);
      stopNote(m);
    }
  }

  function applyPitchBendToAll() {
    for (const v of activeNotes.values()) applyPitchToOsc(v.osc, v.baseMidi);
  }

  async function setupMIDI() {
    if (!navigator.requestMIDIAccess) {
      midiStatusBtn.textContent = 'MIDI: unsupported';
      return;
    }
    try {
      const access = await navigator.requestMIDIAccess();
      midiStatusBtn.textContent = 'MIDI: ready';
      midiStatusBtn.disabled = false;

      function attachInput(input) {
        input.onmidimessage = (m) => {
          const d0 = m.data[0];
          const d1 = m.data[1];
          const d2 = m.data[2];

          const cmd = d0 & 0xF0;

          if (cmd === 0x90) {
            const vel = d2 / 127;
            if (d2 > 0) {
              playSample(d1, vel);
            } else {
              stopSample(d1);
            }
            return;
          }

          if (cmd === 0x80) {
            stopSample(d1);
            return;
          }

          if (cmd === 0xB0) {
            if (d1 === 64) {
              sustainDown = d2 >= 64;
              if (!sustainDown) releaseSustain();
            }
            return;
          }

          if (cmd === 0xE0) {
            const lsb = d1;
            const msb = d2;
            const value = (msb << 7) | lsb;
            const norm = (value - 8192) / 8192;
            pitchBend.semis = norm * 2;
            applyPitchBendToAll();
            return;
          }
        };
      }

      for (const input of access.inputs.values()) attachInput(input);

      access.onstatechange = () => {
        let count = 0;
        for (const _ of access.inputs.values()) count++;
        midiStatusBtn.textContent = count ? `MIDI: ${count} input(s)` : 'MIDI: ready';
      };
    } catch {
      midiStatusBtn.textContent = 'MIDI: blocked';
    }
  }

  setupMIDI();
});
