window.addEventListener('DOMContentLoaded', () => {
  const keyboardEl = document.getElementById('keyboard');
  const volumeEl = document.getElementById('volume');
  const waveformEl = document.getElementById('waveform');
  const noteDisplay = document.getElementById('noteDisplay');

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const masterGain = audioCtx.createGain();
  masterGain.connect(audioCtx.destination);

  function setVolume() {
    masterGain.gain.setValueAtTime(Number(volumeEl.value) / 100, audioCtx.currentTime);
  }

  setVolume();

  volumeEl.addEventListener('input', () => {
    audioCtx.resume();
    setVolume();
  });

  const START_MIDI = 60;
  const END_MIDI = 83;

  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  function midiToNote(m) {
    return `${NOTE_NAMES[m % 12]}${Math.floor(m / 12) - 1}`;
  }

  function midiToFreq(m) {
    return Math.pow(2, (m - 69) / 12) * 440;
  }

  function isBlack(m) {
    return [1, 3, 6, 8, 10].includes(m % 12);
  }

  const active = new Map();

  function buildKeyboard() {
    keyboardEl.innerHTML = '';
    let whiteIndex = 0;
    const whitePos = new Map();

    for (let m = START_MIDI; m <= END_MIDI; m++) {
      if (!isBlack(m)) {
        const k = document.createElement('div');
        k.className = 'key white';
        k.dataset.midiCode = m;
        k.dataset.note = midiToNote(m);
        const s = document.createElement('span');
        s.textContent = k.dataset.note;
        k.appendChild(s);
        keyboardEl.appendChild(k);
        whitePos.set(m, 14 + whiteIndex * 40);
        whiteIndex++;
      }
    }

    for (let m = START_MIDI; m <= END_MIDI; m++) {
      if (isBlack(m)) {
        const prev = whitePos.get(m - 1);
        if (prev == null) continue;
        const k = document.createElement('div');
        k.className = 'key black';
        k.dataset.midiCode = m;
        k.dataset.note = midiToNote(m);
        k.style.left = `${prev + 26}px`;
        k.style.top = `14px`;
        const s = document.createElement('span');
        s.textContent = k.dataset.note;
        k.appendChild(s);
        keyboardEl.appendChild(k);
      }
    }
  }

  function highlight(m, on) {
    const k = keyboardEl.querySelector(`[data-midi-code="${m}"]`);
    if (k) k.classList.toggle('activeKey', on);
  }

  function play(m) {
    if (active.has(m)) return;
    audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = waveformEl.value;
    osc.frequency.setValueAtTime(midiToFreq(m), audioCtx.currentTime);
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.01);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    active.set(m, { osc, gain });
    highlight(m, true);
    noteDisplay.textContent = `${midiToNote(m)} (MIDI ${m})`;
  }

  function stop(m) {
    const n = active.get(m);
    if (!n) return;
    const t = audioCtx.currentTime;
    n.gain.gain.linearRampToValueAtTime(0.0001, t + 0.03);
    n.osc.stop(t + 0.04);
    active.delete(m);
    highlight(m, false);
    if (active.size === 0) noteDisplay.textContent = '—';
  }

  keyboardEl.addEventListener('mousedown', e => {
    const k = e.target.closest('.key');
    if (!k) return;
    play(Number(k.dataset.midiCode));
  });

  window.addEventListener('mouseup', () => {
    for (const m of [...active.keys()]) stop(m);
  });

  waveformEl.addEventListener('change', () => {
    for (const v of active.values()) v.osc.type = waveformEl.value;
  });

  buildKeyboard();
});
