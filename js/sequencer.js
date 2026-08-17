/**
 * KickForge 303 - High-Precision Web Audio Step Sequencer
 * Lookahead scheduler for rock-solid timing at any BPM (120 - 280 BPM)
 */

export class StepSequencer {
  constructor(audioEngine, onStepCallback) {
    this.audioEngine = audioEngine;
    this.onStepCallback = onStepCallback || (() => {});

    this.isPlaying = false;
    this.bpm = 140;

    // 16 Steps configuration
    // Default 4/4 kicks on steps 0, 4, 8, 12
    this.kickSteps = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
    this.kickVelocities = [1.0, 0.7, 0.7, 0.7, 0.95, 0.7, 0.7, 0.7, 0.95, 0.7, 0.7, 0.7, 0.95, 0.7, 0.7, 0.7];

    // Offbeat hi-hat on steps 2, 6, 10, 14
    this.hihatEnabled = true;
    this.hihatSteps = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0];

    // Timing lookahead scheduler
    this.currentStep = 0;
    this.nextNoteTime = 0.0;
    this.lookahead = 25.0; // ms
    this.scheduleAheadTime = 0.1; // seconds
    this.timerId = null;

    this.getParamsCallback = () => ({});
  }

  setParamsGetter(fn) {
    this.getParamsCallback = fn;
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
    }
    return 0;
  }

  setPattern(type) {
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
    // Schedule Kick
    if (this.kickSteps[stepNumber]) {
      const vel = this.kickVelocities[stepNumber] || 1.0;
      const params = this.getParamsCallback();
      this.audioEngine.buildKickVoice(this.audioEngine.ctx, this.audioEngine.masterGainNode, params, time, vel);
    }

    // Schedule Hi-Hat
    if (this.hihatEnabled && this.hihatSteps[stepNumber]) {
      this.audioEngine.triggerHiHat(0.65, time);
    }

    // Schedule UI step update
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
    this.onStepCallback(-1); // Reset highlight
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
