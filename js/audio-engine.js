/**
 * KickForge 303 - Web Audio DSP Synthesis Engine
 * Con motore Super Botta (Punch Maximizer), 303 Acid Attack e Distorsione Hardcore Multi-Stadio
 */

import { BassSynthEngine } from "./bass-engine.js";

export class KickSynthEngine {
  constructor() {
    this.ctx = null;
    this.masterGainNode = null;
    this.analyserNode = null;
    this.isInitialized = false;

    this.bassEngine = new BassSynthEngine(this);

    // Distortion Curve Caches
    this.distortionCurves = new Map();
    this.wavefoldCurves = new Map();
  }

  init() {
    if (this.isInitialized) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass({ latencyHint: "interactive" });

    this.analyserNode = this.ctx.createAnalyser();
    this.analyserNode.fftSize = 2048;
    this.analyserNode.smoothingTimeConstant = 0.8;

    this.masterGainNode = this.ctx.createGain();
    this.masterGainNode.gain.value = 1.0;

    // Bus di mix dedicati: permettono di bilanciare cassa e basso in modo indipendente
    this.kickBus = this.ctx.createGain();
    this.bassBus = this.ctx.createGain();
    this.kickBus.gain.value = this.mixKickLevel ?? 1.0;
    this.bassBus.gain.value = this.mixBassLevel ?? 1.0;
    this.kickBus.connect(this.masterGainNode);
    this.bassBus.connect(this.masterGainNode);

    // Limiter master: cattura i picchi quando cassa+basso+hi-hat si sovrappongono,
    // evitando il clipping brutale che su mobile può azzerare l'audio.
    this.masterLimiter = this.ctx.createDynamicsCompressor();
    this.masterLimiter.threshold.value = -1.5;
    this.masterLimiter.knee.value = 0;
    this.masterLimiter.ratio.value = 20;
    this.masterLimiter.attack.value = 0.001;
    this.masterLimiter.release.value = 0.12;

    this.masterGainNode.connect(this.masterLimiter);
    this.masterLimiter.connect(this.analyserNode);
    this.analyserNode.connect(this.ctx.destination);

    this.isInitialized = true;
  }

  // Imposta i livelli del mixer (cassa/basso) in tempo reale
  setMix(kickLevel, bassLevel) {
    if (kickLevel != null) this.mixKickLevel = kickLevel;
    if (bassLevel != null) this.mixBassLevel = bassLevel;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const running = this.ctx.state === "running";
    const set = (node, v) => {
      if (!node) return;
      if (running) node.gain.setTargetAtTime(v, now, 0.01); // rampa morbida senza click
      else node.gain.value = v;                              // istantaneo se il contesto è fermo
    };
    set(this.kickBus, this.mixKickLevel ?? 1.0);
    set(this.bassBus, this.mixBassLevel ?? 1.0);
  }

  async resumeIfNeeded() {
    if (!this.isInitialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
  }

  // Curve di distorsione avanzate
  getDistortionCurve(amount = 2, type = "tube") {
    const key = `${type}_${amount.toFixed(2)}`;
    if (this.distortionCurves.has(key)) {
      return this.distortionCurves.get(key);
    }

    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    const k = Math.max(0.1, amount);

    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;

      if (type === "tube") {
        const x_biased = x + 0.12 * x * x;
        if (x_biased > 0) {
          curve[i] = (1 - Math.exp(-k * x_biased)) / (1 - Math.exp(-k));
        } else {
          curve[i] = -((1 - Math.exp(k * x_biased)) / (1 - Math.exp(-k)));
        }
      } else if (type === "diode") {
        const diode = Math.tanh(k * x) + 0.3 * Math.sin(Math.PI * x * (k * 0.4));
        curve[i] = Math.max(-0.96, Math.min(0.96, diode / (1 + k * 0.18)));
      } else {
        const hard = ((3 + k) * x * 22 * deg) / (Math.PI + k * Math.abs(x));
        curve[i] = Math.max(-0.99, Math.min(0.99, hard * 0.65));
      }
    }

    this.distortionCurves.set(key, curve);
    return curve;
  }

  // Curva di Wavefolding (distorsione a piegatura d'onda)
  getWavefoldCurve(amount = 1) {
    const key = `fold_${amount.toFixed(2)}`;
    if (this.wavefoldCurves.has(key)) {
      return this.wavefoldCurves.get(key);
    }

    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const k = amount;

    for (let i = 0; i < n_samples; i++) {
      const x = (i * 2) / n_samples - 1;
      if (k <= 1.0) {
        curve[i] = x;
      } else {
        curve[i] = Math.sin(x * Math.PI * 0.5 * k);
      }
    }

    this.wavefoldCurves.set(key, curve);
    return curve;
  }

  /**
   * Costruzione del circuito audio del kick
   */
  buildKickVoice(targetCtx, destination, params, startTime = 0, velocity = 1.0) {
    const t0 = startTime;
    const now = t0;

    const layerBus = targetCtx.createGain();
    const superBotta = Math.max(1.0, params.super_botta || 1.0);
    const extremeMode = params.extreme_mode ? 1.4 : 1.0;
    layerBus.gain.value = velocity * extremeMode;

    const punchDecay = Math.max(0.01, params.body_punchDecay || 0.035);
    const tailDecay = Math.max(0.05, params.body_tailDecay || 0.3);
    const totalKickDuration = punchDecay + tailDecay + 0.2;

    // ==========================================
    // LAYER 1: ATTACCO 303 & FISCHIO ACIDO
    // ==========================================
    if (params.attack303_enabled) {
      const attackGain = targetCtx.createGain();
      const attVol = (params.attack303_volume || 0.8) * 0.9 * (1 + (superBotta - 1) * 0.3);
      attackGain.gain.setValueAtTime(0, now);
      attackGain.gain.linearRampToValueAtTime(attVol, now + 0.001);

      const attDecay = Math.max(0.01, params.attack303_decay || 0.04);
      attackGain.gain.exponentialRampToValueAtTime(0.0001, now + attDecay);

      const osc303 = targetCtx.createOscillator();
      const waveType = params.attack303_waveform || "sawtooth";
      osc303.type = waveType === "pulse" ? "square" : waveType;

      const base303Pitch = params.attack303_pitch || 350;
      osc303.frequency.setValueAtTime(base303Pitch * 2.8, now);
      osc303.frequency.exponentialRampToValueAtTime(base303Pitch * 0.6, now + attDecay * 0.8);

      const filter303 = targetCtx.createBiquadFilter();
      filter303.type = "lowpass";
      const baseCutoff = Math.max(100, params.attack303_cutoff || 2800);
      const res = Math.min(24, Math.max(1, params.attack303_resonance || 14));
      filter303.Q.setValueAtTime(res, now);

      const envMod = params.attack303_envMod || 0.85;
      const peakCutoff = Math.min(19000, baseCutoff + envMod * 10000);
      filter303.frequency.setValueAtTime(peakCutoff, now);
      filter303.frequency.exponentialRampToValueAtTime(Math.max(60, baseCutoff * 0.12), now + attDecay);

      const drive303 = targetCtx.createWaveShaper();
      const driveAmt = Math.max(1, (params.attack303_drive || 4.0) * (1 + (superBotta - 1) * 0.25));
      drive303.curve = this.getDistortionCurve(driveAmt, "diode");
      drive303.oversample = "2x";

      osc303.connect(drive303);
      drive303.connect(filter303);
      filter303.connect(attackGain);
      attackGain.connect(layerBus);

      osc303.start(now);
      osc303.stop(now + attDecay + 0.05);

      if ((params.click_volume || 0.7) > 0.01) {
        const clickOsc = targetCtx.createOscillator();
        const clickGain = targetCtx.createGain();
        const clickTone = params.click_tone || 6500;

        clickOsc.type = "triangle";
        clickOsc.frequency.setValueAtTime(clickTone, now);
        clickOsc.frequency.exponentialRampToValueAtTime(80, now + 0.007);

        const clickVol = (params.click_volume || 0.7) * (1 + (superBotta - 1) * 0.4);
        clickGain.gain.setValueAtTime(clickVol, now);
        clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.008);

        clickOsc.connect(clickGain);
        clickGain.connect(layerBus);

        clickOsc.start(now);
        clickOsc.stop(now + 0.02);
      }
    }

    // ==========================================
    // LAYER 1.5: SCREECH / LASER (Piep Uptempo & Frenchcore)
    // Oscillatore distorto con sweep di pitch tonale e controllabile
    // (su o giù), filtro risonante per il carattere "laser/screech".
    // ==========================================
    if (params.screech_enabled) {
      const scrGain = targetCtx.createGain();
      const scrVol = (params.screech_volume ?? 0.7) * (1 + (superBotta - 1) * 0.3);
      const scrDecay = Math.max(0.02, params.screech_decay ?? 0.12);

      scrGain.gain.setValueAtTime(0, now);
      scrGain.gain.linearRampToValueAtTime(scrVol, now + 0.0015);
      scrGain.gain.exponentialRampToValueAtTime(0.0001, now + scrDecay);

      const scrOsc = targetCtx.createOscillator();
      const scrWave = params.screech_waveform || "sawtooth";
      scrOsc.type = scrWave === "pulse" ? "square" : scrWave;

      const pStart = Math.max(20, params.screech_pitchStart ?? 1800);
      const pEnd = Math.max(20, params.screech_pitchEnd ?? 220);
      scrOsc.frequency.setValueAtTime(pStart, now);
      scrOsc.frequency.exponentialRampToValueAtTime(pEnd, now + scrDecay * 0.9);

      const scrFilter = targetCtx.createBiquadFilter();
      scrFilter.type = "bandpass";
      scrFilter.frequency.setValueAtTime(Math.min(18000, Math.max(100, params.screech_cutoff ?? 2600)), now);
      scrFilter.Q.setValueAtTime(Math.min(24, Math.max(0.5, params.screech_resonance ?? 6)), now);

      const scrDrive = targetCtx.createWaveShaper();
      const scrDriveAmt = Math.max(1, (params.screech_drive ?? 6) * (1 + (superBotta - 1) * 0.3));
      scrDrive.curve = this.getDistortionCurve(scrDriveAmt, "hard");
      scrDrive.oversample = "4x";

      scrOsc.connect(scrDrive);
      scrDrive.connect(scrFilter);
      scrFilter.connect(scrGain);
      scrGain.connect(layerBus);

      scrOsc.start(now);
      scrOsc.stop(now + scrDecay + 0.05);
    }

    // ==========================================
    // LAYER 1.6: PUNCH BEATER (Transiente d'attacco dedicato)
    // Click tonale brevissimo con sweep verso il grave: aggiunge
    // lo "schiaffo" fisico iniziale senza toccare corpo e coda.
    // ==========================================
    const punchAmt = params.punch_amount ?? 0.0;
    if (punchAmt > 0.01) {
      const pOsc = targetCtx.createOscillator();
      const pGain = targetCtx.createGain();
      const pTone = Math.max(200, params.punch_tone ?? 3000);
      const pDecay = Math.max(0.002, params.punch_decay ?? 0.006);

      pOsc.type = "triangle";
      pOsc.frequency.setValueAtTime(pTone, now);
      pOsc.frequency.exponentialRampToValueAtTime(Math.max(40, pTone * 0.05), now + pDecay);

      const pVol = punchAmt * 1.15 * (1 + (superBotta - 1) * 0.4);
      pGain.gain.setValueAtTime(pVol, now);
      pGain.gain.exponentialRampToValueAtTime(0.0001, now + pDecay);

      pOsc.connect(pGain);
      pGain.connect(layerBus);

      pOsc.start(now);
      pOsc.stop(now + pDecay + 0.02);
    }

    // ==========================================
    // LAYER 2: CORPO & BOTTA PRINCIPALE (Sweep Pitch)
    // ==========================================
    if (params.body_enabled) {
      const bodyGain = targetCtx.createGain();
      const bodyVol = (params.body_volume || 1.0) * (1 + (superBotta - 1) * 0.35);
      // Livello della coda: quanto è forte la parte lunga rispetto al pugno iniziale
      const tailLevel = Math.min(1.5, Math.max(0.05, params.body_tailLevel ?? 1.0));
      bodyGain.gain.setValueAtTime(0.0001, now);
      bodyGain.gain.linearRampToValueAtTime(bodyVol, now + 0.0015);
      bodyGain.gain.setValueAtTime(bodyVol, now + punchDecay * 0.55);
      bodyGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, bodyVol * tailLevel), now + punchDecay);
      bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + punchDecay + tailDecay);

      const bodyOsc = targetCtx.createOscillator();
      const bodyWave = params.body_waveform || "sine";
      bodyOsc.type = bodyWave;

      const startFreq = (params.body_startFreq || 480) * (1 + (superBotta - 1) * 0.2);
      const punchFreq = params.body_punchFreq || 150;
      const tailFreq = params.body_tailFreq || 50;

      bodyOsc.frequency.setValueAtTime(startFreq, now);
      bodyOsc.frequency.exponentialRampToValueAtTime(Math.max(20, punchFreq), now + punchDecay);
      bodyOsc.frequency.exponentialRampToValueAtTime(Math.max(20, tailFreq), now + punchDecay + tailDecay);

      if ((params.fm_amount || 0) > 5) {
        const fmOsc = targetCtx.createOscillator();
        const fmGain = targetCtx.createGain();
        const fmRatio = params.fm_ratio || 2.0;

        fmOsc.type = "sine";
        fmOsc.frequency.setValueAtTime(tailFreq * fmRatio, now);
        fmOsc.frequency.exponentialRampToValueAtTime(tailFreq, now + punchDecay);

        fmGain.gain.setValueAtTime(params.fm_amount * (1 + (superBotta - 1) * 0.25), now);
        fmGain.gain.exponentialRampToValueAtTime(0.1, now + punchDecay * 1.6);

        fmOsc.connect(fmGain);
        fmGain.connect(bodyOsc.frequency);

        fmOsc.start(now);
        fmOsc.stop(now + punchDecay + 0.05);
      }

      bodyOsc.connect(bodyGain);
      bodyGain.connect(layerBus);

      bodyOsc.start(now);
      bodyOsc.stop(now + punchDecay + tailDecay + 0.05);
    }

    // ==========================================
    // LAYER 3: BASSI SUB & RIMBOMBO WAREHOUSE
    // ==========================================
    if (params.rumble_enabled && (params.rumble_volume || 0) > 0.01) {
      const rumbleGain = targetCtx.createGain();
      const rVol = params.rumble_volume || 0.5;
      const rDecay = Math.max(0.1, params.rumble_decay || 0.35);
      const rDuck = Math.min(0.95, params.rumble_ducking || 0.8);

      rumbleGain.gain.setValueAtTime(rVol * (1 - rDuck), now);
      rumbleGain.gain.linearRampToValueAtTime(rVol * (1 - rDuck), now + 0.025);
      rumbleGain.gain.linearRampToValueAtTime(rVol, now + 0.055);
      rumbleGain.gain.exponentialRampToValueAtTime(0.0001, now + rDecay + 0.1);

      const subOsc = targetCtx.createOscillator();
      subOsc.type = "sine";
      const tailF = params.body_tailFreq || 45;
      subOsc.frequency.setValueAtTime(tailF, now);

      const rumbleFilter = targetCtx.createBiquadFilter();
      rumbleFilter.type = "lowpass";
      rumbleFilter.frequency.setValueAtTime(params.rumble_cutoff || 120, now);
      rumbleFilter.Q.setValueAtTime(2.2, now);

      const noiseBuffer = targetCtx.createBuffer(1, targetCtx.sampleRate * (rDecay + 0.2), targetCtx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseData.length; i++) {
        noiseData[i] = (Math.random() * 2 - 1) * 0.35;
      }
      const noiseNode = targetCtx.createBufferSource();
      noiseNode.buffer = noiseBuffer;

      const noiseFilter = targetCtx.createBiquadFilter();
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.setValueAtTime(params.rumble_cutoff || 120, now);
      noiseFilter.Q.setValueAtTime(4.0, now);

      const noiseGain = targetCtx.createGain();
      noiseGain.gain.setValueAtTime(0.35, now);

      noiseNode.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(rumbleFilter);

      subOsc.connect(rumbleFilter);
      rumbleFilter.connect(rumbleGain);
      rumbleGain.connect(layerBus);

      subOsc.start(now);
      noiseNode.start(now);
      subOsc.stop(now + rDecay + 0.2);
      noiseNode.stop(now + rDecay + 0.2);
    }

    // ==========================================
    // CATENA DI EFFETTI & DISTORSIONE HARDCORE
    // ==========================================
    const driveShaper = targetCtx.createWaveShaper();
    const driveType = params.drive_type || "tube";
    const driveAmt = Math.max(0.1, (params.drive_amount || 4.0) * (1 + (superBotta - 1) * 0.3));
    driveShaper.curve = this.getDistortionCurve(driveAmt, driveType);
    driveShaper.oversample = "4x";

    const wavefolder = targetCtx.createWaveShaper();
    const foldAmt = Math.max(1.0, (params.fold_amount || 1.0) * (1 + (superBotta - 1) * 0.2));
    wavefolder.curve = this.getWavefoldCurve(foldAmt);
    wavefolder.oversample = "4x";

    const eqLow = targetCtx.createBiquadFilter();
    eqLow.type = "lowshelf";
    eqLow.frequency.setValueAtTime(85, now);
    const subBoost = (params.sub_boost || 4.0) + (params.eq_low || 4.0) + (superBotta - 1) * 2.5;
    eqLow.gain.setValueAtTime(subBoost, now);

    const eqMid = targetCtx.createBiquadFilter();
    eqMid.type = "peaking";
    eqMid.frequency.setValueAtTime(params.eq_midFreq || 550, now);
    eqMid.Q.setValueAtTime(1.6, now);
    const midGain = (params.eq_midGain || 0) + (superBotta - 1) * 1.5;
    eqMid.gain.setValueAtTime(midGain, now);

    const eqHigh = targetCtx.createBiquadFilter();
    eqHigh.type = "highshelf";
    eqHigh.frequency.setValueAtTime(4500, now);
    eqHigh.gain.setValueAtTime(params.eq_high || 3.0, now);

    const punchComp = targetCtx.createDynamicsCompressor();
    punchComp.threshold.setValueAtTime(-14 - (superBotta - 1) * 6, now);
    punchComp.knee.setValueAtTime(6, now);
    const compRatio = Math.max(1, (params.comp_ratio ?? 8) + (superBotta - 1) * 4);
    punchComp.ratio.setValueAtTime(compRatio, now);
    // comp_attack in millisecondi: più alto = lascia passare più transiente (più punch)
    const compAttack = Math.min(0.05, Math.max(0.0001, (params.comp_attack ?? 3) / 1000));
    punchComp.attack.setValueAtTime(compAttack, now);
    punchComp.release.setValueAtTime(0.06, now);

    const masterClipper = targetCtx.createWaveShaper();
    masterClipper.curve = this.getDistortionCurve(1.8 * superBotta, "tube");

    const outGain = targetCtx.createGain();
    const mGain = (params.master_gain || 1.15) * 0.9 * (1 + (superBotta - 1) * 0.25);
    outGain.gain.setValueAtTime(mGain, now);

    layerBus.connect(driveShaper);
    driveShaper.connect(wavefolder);
    wavefolder.connect(eqLow);
    eqLow.connect(eqMid);
    eqMid.connect(eqHigh);
    eqHigh.connect(punchComp);
    punchComp.connect(masterClipper);
    masterClipper.connect(outGain);
    outGain.connect(destination);

    return {
      duration: totalKickDuration
    };
  }

  /**
   * Suona colpo singolo kick
   */
  triggerKick(params, velocity = 1.0) {
    if (!this.isInitialized) this.init();
    this.resumeIfNeeded();
    const now = this.ctx.currentTime;
    return this.buildKickVoice(this.ctx, this.kickBus, params, now, velocity);
  }

  /**
   * Suona singola nota di basso
   */
  triggerBassNote(params, stepData, startTime = null, duration = 0.2, duckUnderKick = false) {
    if (!this.isInitialized) this.init();
    this.resumeIfNeeded();
    const now = startTime !== null ? startTime : this.ctx.currentTime;
    this.bassEngine.buildBassVoice(this.ctx, this.bassBus, params, stepData, now, duration, duckUnderKick);
  }

  /**
   * Suona hi-hat in levare
   */
  triggerHiHat(velocity = 0.7, startTime = null) {
    if (!this.isInitialized) this.init();
    const now = startTime !== null ? startTime : this.ctx.currentTime;

    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.15, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(7500, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(velocity * 0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGainNode);

    noise.start(now);
    noise.stop(now + 0.09);
  }

  /**
   * Esportazione offline ad altissima fedeltà in formato WAV (Kick, Bass, o Entrambi)
   */
  async renderProjectToWav(kickParams, bassParams, sequencer, options = { exportMode: "both", isLoop: true, bpm: 140, bitDepth: 24, sampleRate: 44100 }) {
    const sampleRate = options.sampleRate || 44100;
    const isLoop = options.isLoop || false;
    const bpm = options.bpm || 140;
    const mode = options.exportMode || "both"; // "kick_only", "bass_only", "both"

    let renderDuration = 0.9;
    if (isLoop) {
      renderDuration = 4 * (60 / bpm); // 1 bar 4/4
    }

    const offlineCtx = new OfflineAudioContext(2, Math.ceil(sampleRate * renderDuration), sampleRate);
    const stepDuration = (60 / bpm) * 0.25;

    // Bus di mix anche in offline, così l'export rispecchia il bilanciamento e il sidechain
    const kickBus = offlineCtx.createGain();
    const bassBus = offlineCtx.createGain();
    kickBus.gain.value = options.kickLevel ?? this.mixKickLevel ?? 1.0;
    bassBus.gain.value = options.bassLevel ?? this.mixBassLevel ?? 1.0;
    kickBus.connect(offlineCtx.destination);
    bassBus.connect(offlineCtx.destination);

    if (isLoop) {
      for (let step = 0; step < 16; step++) {
        const time = step * stepDuration;

        // Render Kick
        if (mode !== "bass_only" && sequencer.kickSteps[step]) {
          const vel = sequencer.kickVelocities[step] || 1.0;
          this.buildKickVoice(offlineCtx, kickBus, kickParams, time, vel);
        }

        // Render Bass (con ducking quando coincide con la cassa)
        if (mode !== "kick_only" && sequencer.bassPattern && sequencer.bassPattern[step]?.active) {
          const duck = !!sequencer.kickSteps[step];
          this.bassEngine.buildBassVoice(offlineCtx, bassBus, bassParams, sequencer.bassPattern[step], time, stepDuration, duck);
        }
      }
    } else {
      if (mode !== "bass_only") {
        this.buildKickVoice(offlineCtx, kickBus, kickParams, 0, 1.0);
      }
      if (mode === "bass_only") {
        const firstActive = sequencer.bassPattern?.find(s => s.active) || { note: "C2", active: 1 };
        this.bassEngine.buildBassVoice(offlineCtx, bassBus, bassParams, firstActive, 0, 0.4, false);
      }
    }

    const renderedBuffer = await offlineCtx.startRendering();
    return this.audioBufferToWav(renderedBuffer, options.bitDepth || 24);
  }

  // Alias per retrocompatibilità
  async renderKickToWav(params, options) {
    return this.renderProjectToWav(params, {}, { kickSteps: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], kickVelocities: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] }, { ...options, exportMode: "kick_only" });
  }

  audioBufferToWav(buffer, bitDepth = 24) {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * (bitDepth / 8);
    const bufferLength = 44 + length;
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);
    const sampleRate = buffer.sampleRate;

    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + length, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numOfChan, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numOfChan * (bitDepth / 8), true);
    view.setUint16(32, numOfChan * (bitDepth / 8), true);
    view.setUint16(34, bitDepth, true);
    writeString(36, "data");
    view.setUint32(40, length, true);

    let offset = 44;
    const channels = [];
    for (let i = 0; i < numOfChan; i++) {
      channels.push(buffer.getChannelData(i));
    }

    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numOfChan; ch++) {
        let sample = channels[ch][i];
        sample = Math.max(-1, Math.min(1, sample));

        if (bitDepth === 16) {
          const s = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
          view.setInt16(offset, s, true);
          offset += 2;
        } else if (bitDepth === 24) {
          const s = sample < 0 ? sample * 0x800000 : sample * 0x7fffff;
          const intSample = Math.floor(s);
          view.setUint8(offset, intSample & 0xff);
          view.setUint8(offset + 1, (intSample >> 8) & 0xff);
          view.setUint8(offset + 2, (intSample >> 16) & 0xff);
          offset += 3;
        } else if (bitDepth === 32) {
          view.setFloat32(offset, sample, true);
          offset += 4;
        }
      }
    }

    return new Blob([arrayBuffer], { type: "audio/wav" });
  }
}
