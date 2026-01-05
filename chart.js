window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('chartCanvas');
  const ctx = canvas.getContext('2d');

  const toggleRunBtn = document.getElementById('toggleRun');
  const speedEl = document.getElementById('speed');
  const speedValueEl = document.getElementById('speedValue');
  const minEl = document.getElementById('minVal');
  const maxEl = document.getElementById('maxVal');
  const gridEl = document.getElementById('toggleGrid');
  const smoothEl = document.getElementById('toggleSmooth');
  const smoothWinEl = document.getElementById('smoothWindow');
  const smoothValueEl = document.getElementById('smoothValue');
  const typeEl = document.getElementById('chartType');
  const themeEl = document.getElementById('theme');
  const resetEl = document.getElementById('reset');
  const exportEl = document.getElementById('exportPng');
  const tooltip = document.getElementById('tooltip');
  const statsEl = document.getElementById('stats');

  const width = canvas.width;
  const height = canvas.height;

  const xIncrement = 150;
  const yIncrement = 100;
  const valueIncrement = 20;
  const padding = 36;

  const pointsCount = Math.floor((width - padding * 2) / valueIncrement) + 1;

  let running = true;
  let tickMs = Number(speedEl.value);
  let minValue = Number(minEl.value);
  let maxValue = Number(maxEl.value);

  let lastMouse = null;

  function cssVar(name, fallback) {
    const v = getComputedStyle(document.body).getPropertyValue(name).trim();
    return v || fallback;
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function safeRange() {
    if (!Number.isFinite(minValue)) minValue = 0;
    if (!Number.isFinite(maxValue)) maxValue = height;
    if (maxValue <= minValue + 1) maxValue = minValue + 2;
  }

  function valueToY(v) {
    safeRange();
    const t = (v - minValue) / (maxValue - minValue);
    return padding + (1 - clamp(t, 0, 1)) * (height - padding * 2);
  }

  function indexToX(i) {
    return padding + i * valueIncrement;
  }

  function randInRange() {
    safeRange();
    return minValue + Math.random() * (maxValue - minValue);
  }

  function movingAverage(arr, windowSize) {
    const w = Math.max(1, Math.floor(windowSize));
    if (w === 1) return arr.slice();
    const out = new Array(arr.length);
    let sum = 0;
    let q = [];
    for (let i = 0; i < arr.length; i++) {
      const x = arr[i];
      q.push(x);
      sum += x;
      if (q.length > w) sum -= q.shift();
      out[i] = sum / q.length;
    }
    return out;
  }

  const series = [
    { name: 'Series A', colorVar: '--s1', data: [], gen: null },
    { name: 'Series B', colorVar: '--s2', data: [], gen: null },
    { name: 'Series C', colorVar: '--s3', data: [], gen: null }
  ];

  let phase = 0;

  function initGenerators() {
    series[0].gen = () => {
      const last = series[0].data.length ? series[0].data[series[0].data.length - 1] : randInRange();
      const step = (Math.random() - 0.5) * (maxValue - minValue) * 0.08;
      return clamp(last + step, minValue, maxValue);
    };

    series[1].gen = () => {
      phase += 0.22;
      const mid = (minValue + maxValue) / 2;
      const amp = (maxValue - minValue) * 0.32;
      return clamp(mid + Math.sin(phase) * amp, minValue, maxValue);
    };

    series[2].gen = () => {
      const mid = (minValue + maxValue) / 2;
      const amp = (maxValue - minValue) * 0.42;
      return clamp(mid + (Math.random() - 0.5) * 2 * amp, minValue, maxValue);
    };
  }

  function generateInitialData() {
    safeRange();
    initGenerators();
    for (const s of series) {
      s.data = [];
      for (let i = 0; i < pointsCount; i++) s.data.push(randInRange());
    }
  }

  function shiftAndAppend() {
    safeRange();
    initGenerators();
    for (const s of series) {
      const next = s.gen();
      s.data.push(next);
      while (s.data.length > pointsCount) s.data.shift();
    }
  }

  function clearCanvas() {
    ctx.clearRect(0, 0, width, height);
  }

  function drawGrid() {
    const gridColor = cssVar('--grid', 'rgba(255,255,255,0.2)');
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;

    for (let x = padding; x <= width - padding; x += xIncrement) {
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    for (let y = padding; y <= height - padding; y += yIncrement) {
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
  }

  function drawAxesAndLabels() {
    const axisColor = cssVar('--axis', 'rgba(255,255,255,0.8)');
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    ctx.fillStyle = axisColor;
    ctx.font = '12px system-ui, Arial';

    const ySteps = 6;
    for (let i = 0; i <= ySteps; i++) {
      const t = i / ySteps;
      const v = maxValue - t * (maxValue - minValue);
      const y = padding + t * (height - padding * 2);
      ctx.fillText(String(Math.round(v)), 6, y + 4);
    }

    const xSteps = Math.floor((width - padding * 2) / xIncrement);
    for (let i = 0; i <= xSteps; i++) {
      const x = padding + i * xIncrement;
      const idx = Math.round((x - padding) / valueIncrement);
      ctx.fillText(String(idx), x - 6, height - 10);
    }

    ctx.fillText('Value', 6, 14);
    ctx.fillText('Index', width - 44, height - 10);
  }

  function drawLine(points, color, lineWidth) {
    if (!points.length) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(indexToX(0), valueToY(points[0]));
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(indexToX(i), valueToY(points[i]));
    }
    ctx.stroke();
  }

  function drawArea(points, color) {
    if (!points.length) return;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    ctx.moveTo(indexToX(0), height - padding);
    ctx.lineTo(indexToX(0), valueToY(points[0]));
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(indexToX(i), valueToY(points[i]));
    }
    ctx.lineTo(indexToX(points.length - 1), height - padding);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawBars(points, color) {
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.55;
    const barW = Math.max(2, valueIncrement - 2);
    for (let i = 0; i < points.length; i++) {
      const x = indexToX(i) - barW / 2;
      const y = valueToY(points[i]);
      const h = (height - padding) - y;
      ctx.fillRect(x, y, barW, h);
    }
    ctx.globalAlpha = 1;
  }

  function drawScatter(points, color) {
    ctx.fillStyle = color;
    for (let i = 0; i < points.length; i++) {
      const x = indexToX(i);
      const y = valueToY(points[i]);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawAllSeries() {
    const chartType = typeEl.value;
    const doSmooth = smoothEl.checked;
    const w = Number(smoothWinEl.value);

    for (const s of series) {
      const color = cssVar(s.colorVar, '#00ff00');
      const points = doSmooth ? movingAverage(s.data, w) : s.data;

      if (chartType === 'line') {
        drawLine(points, color, 3);
      } else if (chartType === 'area') {
        drawArea(points, color);
        drawLine(points, color, 2.5);
      } else if (chartType === 'bar') {
        drawBars(points, color);
      } else if (chartType === 'scatter') {
        drawScatter(points, color);
      }
    }
  }

  function computeStats(values) {
    if (!values.length) return { cur: 0, min: 0, max: 0, avg: 0, trend: '—' };
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    for (const v of values) {
      if (v < min) min = v;
      if (v > max) max = v;
      sum += v;
    }
    const cur = values[values.length - 1];
    const avg = sum / values.length;
    const prev = values.length >= 2 ? values[values.length - 2] : cur;
    const trend = cur > prev ? '↑' : cur < prev ? '↓' : '→';
    return { cur, min, max, avg, trend };
  }

  function renderStats() {
    const rows = series.map((s) => {
      const st = computeStats(s.data);
      return {
        name: s.name,
        color: cssVar(s.colorVar, '#fff'),
        cur: st.cur,
        min: st.min,
        max: st.max,
        avg: st.avg,
        trend: st.trend
      };
    });

    let html = '<table class="statsTable">';
    html += '<thead><tr><th>Series</th><th>Current</th><th>Min</th><th>Max</th><th>Avg</th><th>Trend</th></tr></thead><tbody>';
    for (const r of rows) {
      html += `<tr>
        <td><span class="badge" style="border-color:${r.color};">${r.name}</span></td>
        <td>${Math.round(r.cur)}</td>
        <td>${Math.round(r.min)}</td>
        <td>${Math.round(r.max)}</td>
        <td>${Math.round(r.avg)}</td>
        <td>${r.trend}</td>
      </tr>`;
    }
    html += '</tbody></table>';
    statsEl.innerHTML = html;
  }

  function redraw() {
    safeRange();
    clearCanvas();
    if (gridEl.checked) drawGrid();
    drawAxesAndLabels();
    drawAllSeries();
    renderStats();
    if (lastMouse) updateTooltipFromMouse(lastMouse);
  }

  function findNearestPoint(mx, my) {
    const doSmooth = smoothEl.checked;
    const w = Number(smoothWinEl.value);
    const radius = 10;

    let best = null;

    for (const s of series) {
      const points = doSmooth ? movingAverage(s.data, w) : s.data;
      for (let i = 0; i < points.length; i++) {
        const x = indexToX(i);
        const y = valueToY(points[i]);
        const dx = mx - x;
        const dy = my - y;
        const d2 = dx * dx + dy * dy;
        if (d2 <= radius * radius) {
          if (!best || d2 < best.d2) {
            best = { series: s, i, value: points[i], x, y, d2 };
          }
        }
      }
    }
    return best;
  }

  function updateTooltipFromMouse(evt) {
    const rect = canvas.getBoundingClientRect();
    const mx = evt.clientX - rect.left;
    const my = evt.clientY - rect.top;

    const hit = findNearestPoint(mx, my);

    if (!hit) {
      tooltip.style.display = 'none';
      return;
    }

    const color = cssVar(hit.series.colorVar, '#fff');
    tooltip.style.display = 'block';
    tooltip.innerHTML = `<div style="font-weight:800; margin-bottom:4px; color:${color};">${hit.series.name}</div>
      <div>Index: <b>${hit.i}</b></div>
      <div>Value: <b>${Math.round(hit.value)}</b></div>`;

    const left = clamp(hit.x + 14, 8, rect.width - 220);
    const top = clamp(hit.y - 10, 8, rect.height - 80);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  canvas.addEventListener('mousemove', (e) => {
    lastMouse = e;
    updateTooltipFromMouse(e);
  });

  canvas.addEventListener('mouseleave', () => {
    lastMouse = null;
    tooltip.style.display = 'none';
  });

  function applyTheme(className) {
    document.body.classList.remove('theme-dark', 'theme-light', 'theme-contrast');
    document.body.classList.add(className);
    redraw();
  }

  function resetAll() {
    minValue = Number(minEl.value);
    maxValue = Number(maxEl.value);
    phase = 0;
    generateInitialData();
    redraw();
  }

  function exportPng() {
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chart.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  let timerId = null;

  function scheduleTick() {
    if (!running) return;
    timerId = window.setTimeout(() => {
      shiftAndAppend();
      redraw();
      scheduleTick();
    }, tickMs);
  }

  function start() {
    if (running) return;
    running = true;
    toggleRunBtn.textContent = '⏸ Pause';
    scheduleTick();
  }

  function stop() {
    running = false;
    toggleRunBtn.textContent = '▶ Start';
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  toggleRunBtn.addEventListener('click', () => {
    if (running) stop();
    else start();
  });

  speedEl.addEventListener('input', () => {
    tickMs = Number(speedEl.value);
    speedValueEl.textContent = String(tickMs);
    if (running) {
      stop();
      start();
    }
  });

  smoothWinEl.addEventListener('input', () => {
    smoothValueEl.textContent = String(smoothWinEl.value);
    redraw();
  });

  smoothEl.addEventListener('change', redraw);
  gridEl.addEventListener('change', redraw);
  typeEl.addEventListener('change', redraw);

  minEl.addEventListener('change', () => {
    minValue = Number(minEl.value);
    redraw();
  });

  maxEl.addEventListener('change', () => {
    maxValue = Number(maxEl.value);
    redraw();
  });

  themeEl.addEventListener('change', () => applyTheme(themeEl.value));

  resetEl.addEventListener('click', resetAll);
  exportEl.addEventListener('click', exportPng);

  speedValueEl.textContent = String(speedEl.value);
  smoothValueEl.textContent = String(smoothWinEl.value);

  generateInitialData();
  redraw();
  scheduleTick();
});
