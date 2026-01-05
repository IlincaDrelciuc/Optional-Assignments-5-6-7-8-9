window.onload = function () {
  const canvas = document.getElementById('chartCanvas');
  const context = canvas.getContext('2d');

  const width = canvas.width;
  const height = canvas.height;

  const xIncrement = 150;
  const yIncrement = 100;
  const valueIncrement = 20;
  const textOffset = 5;

  
  const series = [
    { name: 'Series A', color: 'green', lineWidth: 5, data: [] },
    { name: 'Series B', color: 'dodgerblue', lineWidth: 4, data: [] },
    { name: 'Series C', color: 'crimson', lineWidth: 4, data: [] }
  ];

  function drawVerticalLines() {
    context.strokeStyle = 'gray';
    context.lineWidth = 1;

    for (let i = 0; i < width; i += xIncrement) {
      context.beginPath();
      context.moveTo(i, 0);
      context.lineTo(i, height);
      context.stroke();
    }
  }

  function drawHorizontalLines() {
    context.strokeStyle = 'gray';
    context.lineWidth = 1;

    for (let i = 0; i < height; i += yIncrement) {
      context.beginPath();
      context.moveTo(0, i);
      context.lineTo(width, i);
      context.stroke();
    }
  }

  function drawVerticalLabels() {
    context.fillStyle = 'black';
    context.font = '14px Arial';

    for (let i = 0; i < height; i += yIncrement) {
      context.fillText(String(height - i), textOffset, i + 2 * textOffset);
    }
  }

  function drawHorizontalLabels() {
    context.fillStyle = 'black';
    context.font = '14px Arial';

    for (let i = 0; i < width; i += xIncrement) {
      context.fillText(String(i), i + textOffset, height - textOffset);
    }
  }

  function generateRandomNumber() {
    return Math.floor(Math.random() * height);
  }

  function generateData() {
    const pointsCount = Math.floor(width / valueIncrement) + 1;

    for (const s of series) {
      s.data = [];
      for (let i = 0; i < pointsCount; i++) {
        s.data.push(generateRandomNumber());
      }
    }
  }

  function drawSeriesLine(s) {
    if (!s.data || s.data.length === 0) return;

    context.strokeStyle = s.color;
    context.lineWidth = s.lineWidth;

    context.beginPath();
    context.moveTo(0, height - s.data[0]);

    for (let i = 1; i < s.data.length; i++) {
      context.lineTo(i * valueIncrement, height - s.data[i]);
    }

    context.stroke();
  }

  function drawCharts() {
    for (const s of series) {
      drawSeriesLine(s);
    }
  }

  function draw() {
    context.clearRect(0, 0, width, height);
    drawVerticalLines();
    drawHorizontalLines();
    drawVerticalLabels();
    drawHorizontalLabels();
    drawCharts();
  }

  function generateNewValues() {
    for (const s of series) {
      s.data.push(generateRandomNumber());
      s.data.shift();
    }
  }


  setInterval(() => {
    generateNewValues();
    draw();
  }, 1000);

  generateData();
  draw();
};
