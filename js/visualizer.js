/**
 * KickForge 303 - Real-time Visualizer
 * Dual Mode: Time-Domain Oscilloscope & FFT Frequency Spectrum with Frequency Zone Markers
 */

export class Visualizer {
  constructor(canvas, analyserNode) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.analyser = analyserNode;
    this.mode = "combined"; // 'combined', 'oscilloscope', 'spectrum', 'pitch'
    this.animationId = null;

    this.timeData = new Uint8Array(this.analyser ? this.analyser.fftSize : 2048);
    this.freqData = new Uint8Array(this.analyser ? this.analyser.frequencyBinCount : 1024);

    this.peakLevels = new Float32Array(64).fill(0);
    this.decayRate = 0.95;

    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  setAnalyser(analyserNode) {
    this.analyser = analyserNode;
    if (this.analyser) {
      this.timeData = new Uint8Array(this.analyser.fftSize);
      this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
    }
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = (rect.width || 800) * dpr;
    this.canvas.height = (rect.height || 220) * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width || 800;
    this.height = rect.height || 220;
  }

  start() {
    if (this.animationId) return;
    const render = () => {
      this.draw();
      this.animationId = requestAnimationFrame(render);
    };
    this.animationId = requestAnimationFrame(render);
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  setMode(mode) {
    this.mode = mode;
  }

  draw() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Background clearing with sleek dark gradient
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0c0d10";
    ctx.fillRect(0, 0, w, h);

    // Subtle grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < w; x += 40) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0; y < h; y += 30) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    // Center baseline
    ctx.strokeStyle = "rgba(245, 158, 11, 0.15)";
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    if (!this.analyser) {
      this.drawIdleState(ctx, w, h);
      return;
    }

    this.analyser.getByteTimeDomainData(this.timeData);
    this.analyser.getByteFrequencyData(this.freqData);

    if (this.mode === "combined" || this.mode === "spectrum") {
      this.drawSpectrum(ctx, w, h);
    }
    if (this.mode === "combined" || this.mode === "oscilloscope") {
      this.drawOscilloscope(ctx, w, h);
    }

    // Zone labels overlay (Sub, Punch, Body, 303 Attack, Crisp)
    this.drawZoneLabels(ctx, w, h);
  }

  drawIdleState(ctx, w, h) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.font = "12px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("PREMI [SPAZIO] O CLICCA SU UN PRESET PER ASCOLTARE", w / 2, h / 2 + 4);
  }

  drawSpectrum(ctx, w, h) {
    const numBars = 54;
    const barWidth = (w - (numBars - 1) * 2) / numBars;

    for (let i = 0; i < numBars; i++) {
      // Logarithmic index mapping for musical frequency distribution
      const logIndex = Math.floor(Math.pow(i / numBars, 1.7) * (this.freqData.length * 0.45));
      const val = this.freqData[logIndex] || 0;
      const barHeight = (val / 255) * (h * 0.75);

      // Peak decay
      if (val / 255 > this.peakLevels[i]) {
        this.peakLevels[i] = val / 255;
      } else {
        this.peakLevels[i] *= this.decayRate;
      }

      const x = i * (barWidth + 2);
      const y = h - barHeight;

      // Gradient color based on frequency band
      const grad = ctx.createLinearGradient(0, h, 0, 0);
      if (i < 8) {
        // Sub: Deep Amber
        grad.addColorStop(0, "rgba(245, 158, 11, 0.7)");
        grad.addColorStop(1, "rgba(251, 191, 36, 0.9)");
      } else if (i < 22) {
        // Punch / Body: Electric Orange
        grad.addColorStop(0, "rgba(239, 68, 68, 0.7)");
        grad.addColorStop(1, "rgba(249, 115, 22, 0.9)");
      } else if (i < 38) {
        // 303 Attack: Neon Acid Green
        grad.addColorStop(0, "rgba(34, 197, 94, 0.7)");
        grad.addColorStop(1, "rgba(74, 222, 128, 0.95)");
      } else {
        // High Transient / Click: Cyan / White
        grad.addColorStop(0, "rgba(6, 182, 212, 0.6)");
        grad.addColorStop(1, "rgba(56, 189, 248, 0.9)");
      }

      ctx.fillStyle = grad;
      ctx.fillRect(x, y, barWidth, barHeight);

      // Peak dot
      const peakY = h - this.peakLevels[i] * (h * 0.75) - 2;
      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      ctx.fillRect(x, Math.max(0, peakY), barWidth, 2);
    }
  }

  drawOscilloscope(ctx, w, h) {
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#22c55e"; // Acid Green
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#22c55e";

    ctx.beginPath();
    const sliceWidth = w / this.timeData.length;
    let x = 0;

    for (let i = 0; i < this.timeData.length; i++) {
      const v = this.timeData[i] / 128.0;
      const y = (v * h) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    ctx.stroke();
    ctx.shadowBlur = 0; // Reset glow
  }

  drawZoneLabels(ctx, w, h) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.font = "9px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";

    // Frequency Zone tags at top of visualizer
    const zones = [
      { text: "SUB (40-80Hz)", x: 12, color: "#f59e0b" },
      { text: "PUNCH (120-250Hz)", x: w * 0.22, color: "#f97316" },
      { text: "303 ATTACK (1-4kHz)", x: w * 0.48, color: "#22c55e" },
      { text: "CLICK (>5kHz)", x: w * 0.82, color: "#38bdf8" }
    ];

    zones.forEach(z => {
      ctx.fillStyle = z.color;
      ctx.fillRect(z.x - 6, 10, 3, 9);
      ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
      ctx.fillText(z.text, z.x, 18);
    });
  }
}
