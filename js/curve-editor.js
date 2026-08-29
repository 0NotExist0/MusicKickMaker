/**
 * KickForge 303 - Interactive Curve & Envelope Editor (Canvas DSP Editor)
 * Permette di modellare con curve e linee la coda/pitch del kick e il timing/inviluppo/durata del basso
 */

export class CurveEditor {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.mode = options.mode || "kick_tail"; // 'kick_tail', 'kick_pitch', 'bass_timing', 'bass_sidechain'

    this.onParamChange = options.onParamChange || (() => {});
    this.onUserInteracted = options.onUserInteracted || (() => {});

    this.kickParams = {};
    this.bassParams = {};
    this.bpm = 140;

    // Stato interazione drag & drop
    this.activeNodeIndex = -1;
    this.hoverNodeIndex = -1;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };

    this.nodes = [];
    this.width = 800;
    this.height = 240;

    this.padding = { top: 28, right: 36, bottom: 32, left: 56 };

    this.initCanvas();
    this.bindEvents();
  }

  initCanvas() {
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width || 800;
    this.height = rect.height || 240;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.resetTransform?.() || this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this.buildNodesFromParams();
    this.draw();
  }

  setParams(kickParams, bassParams, bpm = 140) {
    if (kickParams) this.kickParams = { ...kickParams };
    if (bassParams) this.bassParams = { ...bassParams };
    if (bpm) this.bpm = bpm;
    this.buildNodesFromParams();
    this.draw();
  }

  setMode(mode) {
    this.mode = mode;
    this.activeNodeIndex = -1;
    this.hoverNodeIndex = -1;
    this.buildNodesFromParams();
    this.draw();
  }

  // =========================================================================
  // COSTRUZIONE DEI NODI GRAFICI IN BASE AI PARAMETRI ATTUALI
  // =========================================================================
  buildNodesFromParams() {
    const pw = this.width - this.padding.left - this.padding.right;
    const ph = this.height - this.padding.top - this.padding.bottom;

    if (this.mode === "kick_tail") {
      // Curva d'ampiezza & Coda Kick:
      // Parametri: punchDecay (0.01-0.12s), tailStartDelay (0-0.15s), tailLevel (0.05-1.5x), tailDecay (0.05-1.0s)
      const pDecay = Math.max(0.01, this.kickParams.body_punchDecay || 0.038);
      const tDelay = Math.max(0, this.kickParams.body_tailStartDelay || 0);
      const tLevel = Math.min(1.5, Math.max(0.05, this.kickParams.body_tailLevel ?? 1.0));
      const tDecay = Math.max(0.05, this.kickParams.body_tailDecay || 0.30);
      const totalTime = Math.max(0.4, pDecay + tDelay + tDecay + 0.1);

      this.maxTime = Math.min(1.2, totalTime);
      this.maxVal = 1.5;

      const t0 = 0;
      const tPunch = pDecay;
      const tTailStart = Math.min(this.maxTime * 0.9, pDecay + tDelay);
      const tEnd = Math.min(this.maxTime, tTailStart + tDecay);

      this.nodes = [
        { id: "start", time: 0, val: 0.0, label: "Start (0ms)", lockTime: true, color: "#22c55e" },
        { id: "punch_peak", time: 0.003, val: 1.0, label: "Punch Hit", lockTime: true, color: "#f59e0b" },
        { id: "punch_decay", time: tPunch, val: 0.7, label: `Punch Fall (${Math.round(tPunch * 1000)}ms)`, lockTime: false, color: "#f59e0b" },
        { id: "tail_start", time: tTailStart, val: Math.min(1.0, tLevel * 0.75), label: `Tail Start (+${Math.round(tDelay * 1000)}ms)`, lockTime: false, color: "#06b6d4" },
        { id: "tail_end", time: tEnd, val: 0.001, label: `Tail End (${Math.round((tEnd - tTailStart) * 1000)}ms)`, lockVal: true, color: "#06b6d4" }
      ];
    } else if (this.mode === "kick_pitch") {
      // Curva Pitch Sweep Kick:
      // Parametri: startFreq (200-950Hz), punchFreq (80-300Hz), punchDecay, tailFreq (30-85Hz), tailDecay
      const startF = this.kickParams.body_startFreq || 480;
      const punchF = this.kickParams.body_punchFreq || 150;
      const tailF = this.kickParams.body_tailFreq || 50;
      const pDecay = Math.max(0.01, this.kickParams.body_punchDecay || 0.038);
      const tDecay = Math.max(0.05, this.kickParams.body_tailDecay || 0.30);
      const totalTime = Math.max(0.4, pDecay + tDecay + 0.1);

      this.maxTime = Math.min(1.0, totalTime);
      this.minFreq = 20;
      this.maxFreq = 1000;

      const tPunch = pDecay;
      const tEnd = Math.min(this.maxTime, pDecay + tDecay);

      this.nodes = [
        { id: "pitch_start", time: 0, val: startF, label: `Start (${Math.round(startF)}Hz)`, lockTime: true, color: "#ef4444" },
        { id: "pitch_punch", time: tPunch, val: punchF, label: `Punch (${Math.round(punchF)}Hz)`, lockTime: false, color: "#f59e0b" },
        { id: "pitch_tail", time: tEnd, val: tailF, label: `Tail Sub (${Math.round(tailF)}Hz)`, lockTime: false, color: "#06b6d4" },
        { id: "pitch_end", time: Math.min(this.maxTime, tEnd + 0.08), val: Math.max(20, tailF * 0.8), label: "Sub Fade", color: "#3b82f6" }
      ];
    } else if (this.mode === "bass_timing") {
      // Curva & Timing Basso (Inviluppo Ampiezza, Offset Partenza e Durata Nota):
      // Parametri: bass_startOffset (-0.03s a +0.12s), bass_attack (0.001-0.08s), bass_decay (0.04-0.6s), bass_gateLength (0.2-2.0x), bass_volume
      const offset = this.bassParams.bass_startOffset || 0.0; // in secondi
      const bAtt = Math.max(0.002, this.bassParams.bass_attack || 0.004);
      const bDecay = Math.max(0.04, this.bassParams.bass_decay || 0.18);
      const bGate = Math.max(0.2, this.bassParams.bass_gateLength || 1.0);
      const bVol = this.bassParams.bass_volume ?? 0.9;

      // 1 step di sedicesimo a BPM corrente
      const step16th = (60 / this.bpm) * 0.25;
      const noteDuration = Math.max(0.04, Math.min(step16th * bGate, bDecay + 0.05));
      this.maxTime = Math.max(0.4, step16th * 2.0);
      this.minOffset = -0.04;
      this.maxOffset = 0.16;

      const tStart = Math.max(0, 0.06 + offset);
      const tPeak = tStart + bAtt;
      const tEnd = tStart + noteDuration;

      this.nodes = [
        { id: "bass_start", time: tStart, val: 0.0, label: `Partenza (${offset >= 0 ? "+" : ""}${Math.round(offset * 1000)}ms)`, lockVal: true, color: "#a855f7" },
        { id: "bass_peak", time: tPeak, val: bVol, label: `Attacco (${Math.round(bAtt * 1000)}ms)`, lockTime: false, color: "#22c55e" },
        { id: "bass_sustain", time: tStart + noteDuration * 0.6, val: bVol * 0.65, label: `Corpo (${Math.round(noteDuration * 1000)}ms)`, lockTime: false, color: "#a855f7" },
        { id: "bass_end", time: tEnd, val: 0.0, label: `Fine Nota (${Math.round(noteDuration * 1000)}ms)`, lockVal: true, color: "#ef4444" }
      ];
    } else if (this.mode === "bass_sidechain") {
      // Curva Sidechain / Ducking sotto la cassa:
      // Parametri: bass_sidechain (0-1.0), bass_sidechainRelease (0.04-0.35s)
      const scAmt = this.bassParams.bass_sidechain ?? 0.85;
      const scRel = Math.max(0.04, this.bassParams.bass_sidechainRelease || 0.12);
      const duckLevel = Math.max(0.0, 1.0 - scAmt);

      this.maxTime = 0.35;
      this.nodes = [
        { id: "sc_hit", time: 0, val: duckLevel, label: `Kick Hit (${Math.round((1 - duckLevel) * 100)}% Duck)`, lockTime: true, color: "#ef4444" },
        { id: "sc_hold", time: 0.015, val: duckLevel, label: "Hold Svuotamento", color: "#f59e0b" },
        { id: "sc_rise", time: 0.015 + scRel * 0.5, val: duckLevel + (1.0 - duckLevel) * 0.65, label: "Risalita Respiro", color: "#22c55e" },
        { id: "sc_full", time: 0.015 + scRel, val: 1.0, label: `Ripristino (+${Math.round(scRel * 1000)}ms)`, color: "#06b6d4" }
      ];
    }
  }

  // =========================================================================
  // TRASFORMAZIONE COORDINATE (Pixel <-> Tempo/Valore)
  // =========================================================================
  timeToX(t) {
    const pw = this.width - this.padding.left - this.padding.right;
    const maxT = this.maxTime || 0.5;
    return this.padding.left + (t / maxT) * pw;
  }

  xToTime(x) {
    const pw = this.width - this.padding.left - this.padding.right;
    const maxT = this.maxTime || 0.5;
    const norm = Math.max(0, Math.min(1, (x - this.padding.left) / pw));
    return norm * maxT;
  }

  valToY(v) {
    const ph = this.height - this.padding.top - this.padding.bottom;
    if (this.mode === "kick_pitch") {
      // Scala logaritmica per le frequenze Hz
      const minF = Math.log(this.minFreq || 20);
      const maxF = Math.log(this.maxFreq || 1000);
      const logV = Math.log(Math.max(this.minFreq || 20, Math.min(this.maxFreq || 1000, v)));
      const norm = (logV - minF) / (maxF - minF);
      return this.padding.top + (1 - norm) * ph;
    } else {
      const maxV = this.maxVal || 1.0;
      const norm = Math.max(0, Math.min(1, v / maxV));
      return this.padding.top + (1 - norm) * ph;
    }
  }

  yToVal(y) {
    const ph = this.height - this.padding.top - this.padding.bottom;
    const norm = Math.max(0, Math.min(1, 1 - (y - this.padding.top) / ph));
    if (this.mode === "kick_pitch") {
      const minF = Math.log(this.minFreq || 20);
      const maxF = Math.log(this.maxFreq || 1000);
      const logV = minF + norm * (maxF - minF);
      return Math.exp(logV);
    } else {
      const maxV = this.maxVal || 1.0;
      return norm * maxV;
    }
  }

  // =========================================================================
  // DISEGNO DEL CANVAS GRAFICO
  // =========================================================================
  draw() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const pl = this.padding.left;
    const pr = this.padding.right;
    const pt = this.padding.top;
    const pb = this.padding.bottom;
    const pw = w - pl - pr;
    const ph = h - pt - pb;

    // Sfondo dark studio
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0a0c10";
    ctx.fillRect(0, 0, w, h);

    // Area attiva interna
    const bgGrad = ctx.createLinearGradient(0, pt, 0, pt + ph);
    bgGrad.addColorStop(0, "rgba(18, 22, 32, 0.95)");
    bgGrad.addColorStop(1, "rgba(10, 12, 18, 0.98)");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(pl, pt, pw, ph);

    // Griglia Temporale e Verticale
    this.drawGrid(ctx, pl, pt, pw, ph);

    // Disegno della Curva Interpolata
    this.drawCurveLine(ctx, pl, pt, pw, ph);

    // Disegno dei Nodi Interattivi
    this.drawNodes(ctx);

    // Titolo e Indicatore Modalità
    this.drawHeaderInfo(ctx, pl, pt, pw, ph);
  }

  drawGrid(ctx, pl, pt, pw, ph) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;

    // Griglia orizzontale
    const numY = 4;
    for (let i = 0; i <= numY; i++) {
      const y = pt + (ph / numY) * i;
      ctx.beginPath();
      ctx.moveTo(pl, y);
      ctx.lineTo(pl + pw, y);
      ctx.stroke();

      // Etichette asse Y
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.textAlign = "right";
      const val = this.yToVal(y);
      let text = "";
      if (this.mode === "kick_pitch") {
        text = `${Math.round(val)}Hz`;
      } else {
        text = `${Math.round((val / (this.maxVal || 1.0)) * 100)}%`;
      }
      ctx.fillText(text, pl - 8, y + 3);
    }

    // Griglia verticale (tempo ms e suddivisioni 16esimi)
    const maxT = this.maxTime || 0.5;
    const stepMs = maxT > 0.6 ? 100 : 50;
    const totalMs = maxT * 1000;

    for (let ms = 0; ms <= totalMs; ms += stepMs) {
      const t = ms / 1000;
      const x = this.timeToX(t);
      if (x > pl + pw) continue;

      ctx.strokeStyle = (ms % (stepMs * 2) === 0) ? "rgba(255, 255, 255, 0.09)" : "rgba(255, 255, 255, 0.04)";
      ctx.beginPath();
      ctx.moveTo(x, pt);
      ctx.lineTo(x, pt + ph);
      ctx.stroke();

      // Etichetta tempo asse X
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${ms}ms`, x, pt + ph + 16);
    }

    // Linea di inizio battuta / kick sync
    const x0 = this.timeToX(0);
    ctx.strokeStyle = "rgba(245, 158, 11, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x0, pt);
    ctx.lineTo(x0, pt + ph);
    ctx.stroke();

    // Bordo box grafico
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1;
    ctx.strokeRect(pl, pt, pw, ph);
  }

  drawCurveLine(ctx, pl, pt, pw, ph) {
    if (!this.nodes || this.nodes.length < 2) return;

    // Colore primario della curva in base alla modalità
    let primaryColor = "#22c55e"; // 303 Green
    let glowColor = "rgba(34, 197, 94, 0.4)";
    let areaGrad = ctx.createLinearGradient(0, pt, 0, pt + ph);

    if (this.mode === "kick_tail") {
      primaryColor = "#06b6d4"; // Ciano
      glowColor = "rgba(6, 182, 212, 0.4)";
      areaGrad.addColorStop(0, "rgba(6, 182, 212, 0.28)");
      areaGrad.addColorStop(1, "rgba(6, 182, 212, 0.0)");
    } else if (this.mode === "kick_pitch") {
      primaryColor = "#f59e0b"; // Ambra
      glowColor = "rgba(245, 158, 11, 0.4)";
      areaGrad.addColorStop(0, "rgba(245, 158, 11, 0.25)");
      areaGrad.addColorStop(1, "rgba(245, 158, 11, 0.0)");
    } else if (this.mode === "bass_timing") {
      primaryColor = "#a855f7"; // Viola Basso
      glowColor = "rgba(168, 85, 247, 0.45)";
      areaGrad.addColorStop(0, "rgba(168, 85, 247, 0.3)");
      areaGrad.addColorStop(1, "rgba(168, 85, 247, 0.0)");
    } else if (this.mode === "bass_sidechain") {
      primaryColor = "#22c55e";
      glowColor = "rgba(34, 197, 94, 0.4)";
      areaGrad.addColorStop(0, "rgba(34, 197, 94, 0.25)");
      areaGrad.addColorStop(1, "rgba(34, 197, 94, 0.0)");
    }

    // Costruzione punti in pixel
    const points = this.nodes.map(n => ({
      x: Math.max(pl, Math.min(pl + pw, this.timeToX(n.time))),
      y: Math.max(pt, Math.min(pt + ph, this.valToY(n.val)))
    }));

    // Ordina i punti per asse X per evitare inversioni
    points.sort((a, b) => a.x - b.x);

    // 1. Disegna Area Piena sotto la curva
    ctx.beginPath();
    ctx.moveTo(points[0].x, pt + ph);
    ctx.lineTo(points[0].x, points[0].y);

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      ctx.bezierCurveTo(cx, p0.y, cx, p1.y, p1.x, p1.y);
    }

    ctx.lineTo(points[points.length - 1].x, pt + ph);
    ctx.closePath();
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // 2. Disegna Linea Curva Principale con Glow Neon
    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      ctx.bezierCurveTo(cx, p0.y, cx, p1.y, p1.x, p1.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  drawNodes(ctx) {
    const pl = this.padding.left;
    const pr = this.padding.right;
    const pt = this.padding.top;
    const pb = this.padding.bottom;
    const pw = this.width - pl - pr;
    const ph = this.height - pt - pb;

    this.nodes.forEach((n, idx) => {
      const x = Math.max(pl, Math.min(pl + pw, this.timeToX(n.time)));
      const y = Math.max(pt, Math.min(pt + ph, this.valToY(n.val)));
      const isActive = (this.activeNodeIndex === idx);
      const isHover = (this.hoverNodeIndex === idx);
      const color = n.color || "#22c55e";

      // Cerchio esterno alone
      if (isActive || isHover) {
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.1)";
        ctx.fill();
      }

      // Nodo principale
      ctx.beginPath();
      ctx.arc(x, y, isActive ? 6.5 : 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();

      // Etichetta e Valore sopra il nodo
      const labelY = (y < pt + 28) ? y + 20 : y - 10;
      ctx.fillStyle = isActive ? "#ffffff" : "rgba(255, 255, 255, 0.85)";
      ctx.font = isActive ? "bold 10px 'JetBrains Mono', monospace" : "9px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(n.label || "", x, labelY);
    });
  }

  drawHeaderInfo(ctx, pl, pt, pw, ph) {
    let modeTitle = "CURVA CASSA & BASSO";
    let modeDesc = "Trascina i nodi per modificare la curva e i tempi in tempo reale";

    if (this.mode === "kick_tail") {
      modeTitle = "🎯 CURVA CODA & AMPIEZZA CASSA (KICK TAIL)";
      modeDesc = "Modifica la partenza della coda, il decadimento del punch, il volume e la lunghezza del sub";
    } else if (this.mode === "kick_pitch") {
      modeTitle = "⚡ CURVA PITCH SWEEP CASSA (PITCH ENVELOPE)";
      modeDesc = "Modifica l'intonazione di partenza, il punch sul petto e la nota fondamentale della coda";
    } else if (this.mode === "bass_timing") {
      modeTitle = "🎸 CURVA & TIMING DEL BASSO (OFFSET & GATE)";
      modeDesc = "Decidi se il basso parte con la cassa, in anticipo o in ritardo (+ms), e quanto deve durare";
    } else if (this.mode === "bass_sidechain") {
      modeTitle = "🌊 CURVA SIDECHAIN DUCKING (RESPIRO BASSO)";
      modeDesc = "Plasmare lo svuotamento del basso sotto il kick e la velocità di risalita";
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = "bold 11px 'Orbitron', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(modeTitle, pl + 4, 16);

    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "9px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText(modeDesc, pl + pw, 16);
  }

  // =========================================================================
  // GESTIONE EVENTI MOUSE & TOUCH PER DRAGGING NODI
  // =========================================================================
  bindEvents() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };

    const findHitNode = (pos) => {
      const pl = this.padding.left;
      const pr = this.padding.right;
      const pt = this.padding.top;
      const pb = this.padding.bottom;
      const pw = this.width - pl - pr;
      const ph = this.height - pt - pb;

      const threshold = 18; // raggio di click generoso per touch/mouse
      for (let i = 0; i < this.nodes.length; i++) {
        const n = this.nodes[i];
        const nx = Math.max(pl, Math.min(pl + pw, this.timeToX(n.time)));
        const ny = Math.max(pt, Math.min(pt + ph, this.valToY(n.val)));
        const dist = Math.hypot(pos.x - nx, pos.y - ny);
        if (dist <= threshold) return i;
      }
      return -1;
    };

    const onStart = (e) => {
      const pos = getPos(e);
      const hit = findHitNode(pos);
      if (hit !== -1) {
        this.activeNodeIndex = hit;
        this.isDragging = true;
        this.canvas.style.cursor = "grabbing";
        this.draw();
        e.preventDefault();
      }
    };

    const onMove = (e) => {
      const pos = getPos(e);

      if (!this.isDragging) {
        const hit = findHitNode(pos);
        if (hit !== this.hoverNodeIndex) {
          this.hoverNodeIndex = hit;
          this.canvas.style.cursor = hit !== -1 ? "grab" : "default";
          this.draw();
        }
        return;
      }

      if (this.activeNodeIndex === -1) return;
      e.preventDefault();

      const node = this.nodes[this.activeNodeIndex];
      const pl = this.padding.left;
      const pr = this.padding.right;
      const pt = this.padding.top;
      const pb = this.padding.bottom;
      const pw = this.width - pl - pr;
      const ph = this.height - pt - pb;

      const clampedX = Math.max(pl, Math.min(pl + pw, pos.x));
      const clampedY = Math.max(pt, Math.min(pt + ph, pos.y));

      if (!node.lockTime) {
        node.time = this.xToTime(clampedX);
      }
      if (!node.lockVal) {
        node.val = this.yToVal(clampedY);
      }

      this.applyNodeChangesToParams(node);
      this.draw();
    };

    const onEnd = () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.canvas.style.cursor = "default";
        this.onUserInteracted();
        this.draw();
      }
    };

    this.canvas.addEventListener("mousedown", onStart);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);

    this.canvas.addEventListener("touchstart", onStart, { passive: false });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
  }

  // =========================================================================
  // SINCRONIZZAZIONE MODIFICHE GRAFICHE -> PARAMETRI AUDIO SINTETIZZATORE
  // =========================================================================
  applyNodeChangesToParams(node) {
    if (this.mode === "kick_tail") {
      if (node.id === "punch_decay") {
        const pDecay = Math.max(0.01, Math.min(0.09, node.time));
        this.kickParams.body_punchDecay = pDecay;
        node.label = `Punch Fall (${Math.round(pDecay * 1000)}ms)`;
        this.onParamChange("body_punchDecay", pDecay);
      } else if (node.id === "tail_start") {
        const pDecay = this.kickParams.body_punchDecay || 0.038;
        const delay = Math.max(0, Math.min(0.12, node.time - pDecay));
        this.kickParams.body_tailStartDelay = delay;
        const tLevel = Math.max(0.1, Math.min(1.5, node.val / 0.75));
        this.kickParams.body_tailLevel = tLevel;
        node.label = `Tail Start (+${Math.round(delay * 1000)}ms)`;
        this.onParamChange("body_tailStartDelay", delay);
        this.onParamChange("body_tailLevel", tLevel);
      } else if (node.id === "tail_end") {
        const tStart = (this.kickParams.body_punchDecay || 0.038) + (this.kickParams.body_tailStartDelay || 0);
        const decay = Math.max(0.05, Math.min(1.0, node.time - tStart));
        this.kickParams.body_tailDecay = decay;
        node.label = `Tail End (${Math.round(decay * 1000)}ms)`;
        this.onParamChange("body_tailDecay", decay);
      }
    } else if (this.mode === "kick_pitch") {
      if (node.id === "pitch_start") {
        const f = Math.max(200, Math.min(950, Math.round(node.val)));
        this.kickParams.body_startFreq = f;
        node.label = `Start (${f}Hz)`;
        this.onParamChange("body_startFreq", f);
      } else if (node.id === "pitch_punch") {
        const f = Math.max(80, Math.min(350, Math.round(node.val)));
        const t = Math.max(0.01, Math.min(0.09, node.time));
        this.kickParams.body_punchFreq = f;
        this.kickParams.body_punchDecay = t;
        node.label = `Punch (${f}Hz / ${Math.round(t * 1000)}ms)`;
        this.onParamChange("body_punchFreq", f);
        this.onParamChange("body_punchDecay", t);
      } else if (node.id === "pitch_tail") {
        const f = Math.max(30, Math.min(85, Math.round(node.val)));
        const t = Math.max(0.05, Math.min(0.8, node.time));
        this.kickParams.body_tailFreq = f;
        this.kickParams.body_tailDecay = t;
        node.label = `Tail Sub (${f}Hz)`;
        this.onParamChange("body_tailFreq", f);
        this.onParamChange("body_tailDecay", t);
      }
    } else if (this.mode === "bass_timing") {
      if (node.id === "bass_start") {
        const rawOffset = node.time - 0.06;
        const offset = Math.max(-0.03, Math.min(0.12, rawOffset));
        this.bassParams.bass_startOffset = offset;
        node.label = `Partenza (${offset >= 0 ? "+" : ""}${Math.round(offset * 1000)}ms)`;
        this.onParamChange("bass_startOffset", offset);
      } else if (node.id === "bass_peak") {
        const att = Math.max(0.002, Math.min(0.06, node.time - (Math.max(0, 0.06 + (this.bassParams.bass_startOffset || 0)))));
        const vol = Math.max(0.1, Math.min(1.0, node.val));
        this.bassParams.bass_attack = att;
        this.bassParams.bass_volume = vol;
        node.label = `Attacco (${Math.round(att * 1000)}ms)`;
        this.onParamChange("bass_attack", att);
        this.onParamChange("bass_volume", vol);
      } else if (node.id === "bass_end") {
        const tStart = Math.max(0, 0.06 + (this.bassParams.bass_startOffset || 0));
        const dur = Math.max(0.04, Math.min(0.6, node.time - tStart));
        const step16th = (60 / this.bpm) * 0.25;
        const gate = Math.max(0.2, Math.min(2.0, dur / step16th));
        this.bassParams.bass_decay = dur;
        this.bassParams.bass_gateLength = gate;
        node.label = `Fine Nota (${Math.round(dur * 1000)}ms)`;
        this.onParamChange("bass_decay", dur);
        this.onParamChange("bass_gateLength", gate);
      }
    } else if (this.mode === "bass_sidechain") {
      if (node.id === "sc_hit") {
        const sc = Math.max(0, Math.min(1.0, 1.0 - node.val));
        this.bassParams.bass_sidechain = sc;
        node.label = `Kick Hit (${Math.round(sc * 100)}% Duck)`;
        this.onParamChange("bass_sidechain", sc);
      } else if (node.id === "sc_full") {
        const rel = Math.max(0.04, Math.min(0.35, node.time - 0.015));
        this.bassParams.bass_sidechainRelease = rel;
        node.label = `Ripristino (+${Math.round(rel * 1000)}ms)`;
        this.onParamChange("bass_sidechainRelease", rel);
      }
    }
  }

  // =========================================================================
  // PRESET DI CURVE VELOCI
  // =========================================================================
  applyCurvePreset(presetId) {
    if (presetId === "punch_dry") {
      // Cassa secca, punch cortissimo, coda breve
      this.kickParams.body_punchDecay = 0.024;
      this.kickParams.body_tailStartDelay = 0.0;
      this.kickParams.body_tailLevel = 0.6;
      this.kickParams.body_tailDecay = 0.14;
      this.onParamChange("body_punchDecay", 0.024);
      this.onParamChange("body_tailStartDelay", 0.0);
      this.onParamChange("body_tailLevel", 0.6);
      this.onParamChange("body_tailDecay", 0.14);
    } else if (presetId === "acid_long_tail") {
      // Coda lunga con sub profondo
      this.kickParams.body_punchDecay = 0.042;
      this.kickParams.body_tailStartDelay = 0.015;
      this.kickParams.body_tailLevel = 1.25;
      this.kickParams.body_tailDecay = 0.55;
      this.kickParams.body_tailFreq = 44;
      this.onParamChange("body_punchDecay", 0.042);
      this.onParamChange("body_tailStartDelay", 0.015);
      this.onParamChange("body_tailLevel", 1.25);
      this.onParamChange("body_tailDecay", 0.55);
      this.onParamChange("body_tailFreq", 44);
    } else if (presetId === "rolling_offset") {
      // Basso rolling con ritardo post-kick di 25ms per non impastare
      this.bassParams.bass_startOffset = 0.025;
      this.bassParams.bass_attack = 0.005;
      this.bassParams.bass_decay = 0.16;
      this.bassParams.bass_gateLength = 0.95;
      this.bassParams.bass_sidechain = 0.85;
      this.onParamChange("bass_startOffset", 0.025);
      this.onParamChange("bass_attack", 0.005);
      this.onParamChange("bass_decay", 0.16);
      this.onParamChange("bass_gateLength", 0.95);
      this.onParamChange("bass_sidechain", 0.85);
    } else if (presetId === "french_gallop") {
      // Basso a galoppo con offset rapido
      this.bassParams.bass_startOffset = 0.045;
      this.bassParams.bass_decay = 0.12;
      this.bassParams.bass_gateLength = 0.8;
      this.onParamChange("bass_startOffset", 0.045);
      this.onParamChange("bass_decay", 0.12);
      this.onParamChange("bass_gateLength", 0.8);
    } else if (presetId === "preshift_tight") {
      // Basso in leggero anticipo (-10ms) per incastro stretto
      this.bassParams.bass_startOffset = -0.010;
      this.bassParams.bass_attack = 0.003;
      this.bassParams.bass_decay = 0.14;
      this.onParamChange("bass_startOffset", -0.010);
      this.onParamChange("bass_attack", 0.003);
      this.onParamChange("bass_decay", 0.14);
    } else if (presetId === "delayed_tail_fade") {
      // Coda che entra ritardata dopo il transiente iniziale
      this.kickParams.body_tailStartDelay = 0.040;
      this.kickParams.body_tailLevel = 1.2;
      this.kickParams.body_tailDecay = 0.45;
      this.onParamChange("body_tailStartDelay", 0.040);
      this.onParamChange("body_tailLevel", 1.2);
      this.onParamChange("body_tailDecay", 0.45);
    }

    this.buildNodesFromParams();
    this.draw();
    this.onUserInteracted();
  }
}
