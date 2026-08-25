/**
 * KickForge 303 - High-Precision Web Audio Step Sequencer
 * Supporto per traccia Cassa (Kick), Charleston (Hi-Hat) e Linea di Basso (Bassline con Note, Accent e Slide)
 */

export class StepSequencer {
  constructor(audioEngine, onStepCallback) {
    this.audioEngine = audioEngine;
    this.onStepCallback = onStepCallback || (() => {});

    this.isPlaying = false;
    this.bpm = 140;

    // 16 Step Cassa
    this.kickSteps = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
    this.kickVelocities = [1.0, 0.7, 0.7, 0.7, 0.95, 0.7, 0.7, 0.7, 0.95, 0.7, 0.7, 0.7, 0.95, 0.7, 0.7, 0.7];

    // 16 Step Hi-Hat
    this.hihatEnabled = true;
    this.hihatSteps = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0];

    // 16 Step Bassline (con note, accent e slide)
    this.bassEnabled = true;
    this.bassPattern = [
      { note: "C2", active: 1, accent: 1, slide: 0 },
      { note: "C2", active: 1, accent: 0, slide: 1 },
      { note: "D#2", active: 1, accent: 1, slide: 0 },
      { note: "C2", active: 0, accent: 0, slide: 0 },
      { note: "G1", active: 1, accent: 0, slide: 1 },
      { note: "A#1", active: 1, accent: 1, slide: 0 },
      { note: "C2", active: 1, accent: 0, slide: 0 },
      { note: "D2", active: 1, accent: 1, slide: 1 },
      { note: "C2", active: 1, accent: 1, slide: 0 },
      { note: "C2", active: 0, accent: 0, slide: 0 },
      { note: "F2", active: 1, accent: 1, slide: 1 },
      { note: "D#2", active: 1, accent: 0, slide: 0 },
      { note: "C2", active: 1, accent: 0, slide: 1 },
      { note: "A#1", active: 1, accent: 1, slide: 0 },
      { note: "G1", active: 1, accent: 0, slide: 0 },
      { note: "B1", active: 1, accent: 1, slide: 0 }
    ];

    // Scheduler lookahead
    this.currentStep = 0;
    this.nextNoteTime = 0.0;
    this.lookahead = 20.0; // ms
    this.scheduleAheadTime = 0.1; // seconds
    this.timerId = null;

    this.getKickParamsCallback = () => ({});
    this.getBassParamsCallback = () => ({});
  }

  setKickParamsGetter(fn) {
    this.getKickParamsCallback = fn;
  }

  setBassParamsGetter(fn) {
    this.getBassParamsCallback = fn;
  }

  setBpm(bpm) {
    this.bpm = Math.max(40, Math.min(300, bpm));
  }

  toggleStep(track, stepIndex) {
    if (track === "kick") {
      this.kickSteps[stepIndex] = this.kickSteps[stepIndex] ? 0 : 1;
      return this.kickSteps[stepIndex];
    } else if (track === "hihat") {
      this.hihatSteps[stepIndex] = this.hihatSteps[stepIndex] ? 0 : 1;
      return this.hihatSteps[stepIndex];
    } else if (track === "bass") {
      this.bassPattern[stepIndex].active = this.bassPattern[stepIndex].active ? 0 : 1;
      return this.bassPattern[stepIndex].active;
    }
    return 0;
  }

  setBassStepNote(stepIndex, note) {
    if (this.bassPattern[stepIndex]) {
      this.bassPattern[stepIndex].note = note;
    }
  }

  toggleBassStepAccent(stepIndex) {
    if (this.bassPattern[stepIndex]) {
      this.bassPattern[stepIndex].accent = this.bassPattern[stepIndex].accent ? 0 : 1;
      return this.bassPattern[stepIndex].accent;
    }
    return 0;
  }

  toggleBassStepSlide(stepIndex) {
    if (this.bassPattern[stepIndex]) {
      this.bassPattern[stepIndex].slide = this.bassPattern[stepIndex].slide ? 0 : 1;
      return this.bassPattern[stepIndex].slide;
    }
    return 0;
  }

  setBassPattern(newPattern) {
    if (Array.isArray(newPattern) && newPattern.length === 16) {
      this.bassPattern = JSON.parse(JSON.stringify(newPattern));
    }
  }

  setKickPattern(type) {
    if (type === "4onTheFloor") {
      this.kickSteps = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
    } else if (type === "gallop") {
      this.kickSteps = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0];
    } else if (type === "industrial_roll") {
      this.kickSteps = [1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1, 0, 0];
    } else if (type === "uptempo_piep") {
      this.kickSteps = [1, 1, 0, 0, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0];
    }
  }

  nextNote() {
    const secondsPer16th = (60.0 / this.bpm) * 0.25;
    this.nextNoteTime += secondsPer16th;
    this.currentStep = (this.currentStep + 1) % 16;
  }

  scheduleNote(stepNumber, time) {
    const stepDuration = (60.0 / this.bpm) * 0.25;

    // 1. Suona Cassa (Kick)
    if (this.kickSteps[stepNumber]) {
      const vel = this.kickVelocities[stepNumber] || 1.0;
      const kParams = this.getKickParamsCallback();
      this.audioEngine.buildKickVoice(this.audioEngine.ctx, this.audioEngine.kickBus, kParams, time, vel);
    }

    // 2. Suona Basso (Bassline) — con ducking se sullo stesso step c'è la cassa
    if (this.bassEnabled && this.bassPattern[stepNumber]?.active) {
      const bParams = this.getBassParamsCallback();
      const duck = !!this.kickSteps[stepNumber];
      this.audioEngine.triggerBassNote(bParams, this.bassPattern[stepNumber], time, stepDuration, duck);
    }

    // 3. Suona Hi-Hat
    if (this.hihatEnabled && this.hihatSteps[stepNumber]) {
      this.audioEngine.triggerHiHat(0.65, time);
    }

    // Aggiornamento grafico del cursore di riproduzione
    const drawTime = Math.max(0, (time - this.audioEngine.ctx.currentTime) * 1000);
    setTimeout(() => {
      if (this.isPlaying) {
        this.onStepCallback(stepNumber);
      }
    }, drawTime);
  }

  scheduler() {
    while (this.nextNoteTime < this.audioEngine.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.currentStep, this.nextNoteTime);
      this.nextNote();
    }
    if (this.isPlaying) {
      this.timerId = setTimeout(() => this.scheduler(), this.lookahead);
    }
  }

  start() {
    if (this.isPlaying) return;
    this.audioEngine.init();
    this.audioEngine.resumeIfNeeded();

    this.isPlaying = true;
    this.currentStep = 0;
    this.nextNoteTime = this.audioEngine.ctx.currentTime + 0.05;
    this.scheduler();
  }

  stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.onStepCallback(-1);
  }

  toggle() {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.start();
    }
    return this.isPlaying;
  }
}
