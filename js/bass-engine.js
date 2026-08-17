/**
 * KickForge 303 - Bass Synthesizer Engine (DSP)
 * Motore di sintesi per linee di basso 303 Acid, Rolling Sub, Reese, Frenchcore Gallop, Zaag e Donk
 */

export const NOTE_FREQUENCIES = {
  "C1": 32.70, "C#1": 34.65, "D1": 36.71, "D#1": 38.89, "E1": 41.20, "F1": 43.65, "F#1": 46.25, "G1": 49.00, "G#1": 51.91, "A1": 55.00, "A#1": 58.27, "B1": 61.74,
  "C2": 65.41, "C#2": 69.30, "D2": 73.42, "D#2": 77.78, "E2": 82.41, "F2": 87.31, "F#2": 92.50, "G2": 98.00, "G#2": 103.83, "A2": 110.00, "A#2": 116.54, "B2": 123.47,
  "C3": 130.81, "C#3": 138.59, "D3": 146.83, "D#3": 155.56, "E3": 164.81, "F3": 174.61, "F#3": 185.00, "G3": 196.00, "G#3": 207.65, "A3": 220.00, "A#3": 233.08, "B3": 246.94
};

export class BassSynthEngine {
  constructor(audioEngine) {
    this.mainEngine = audioEngine;
    this.lastNoteFreq = 65.41; // C2 default
  }

  getNoteFreq(noteName) {
    return NOTE_FREQUENCIES[noteName] || 65.41;
  }

  /**
   * Genera la voce del basso all'interno di un AudioContext (tempo reale o offline)
   */
  buildBassVoice(targetCtx, destination, params, stepData, startTime = 0, duration = 0.2) {
    if (!params.bass_enabled || !stepData.active) return;

    const now = startTime;
    const targetFreq = this.getNoteFreq(stepData.note || "C2");
    const isAccent = !!stepData.accent;
    const isSlide = !!stepData.slide;
    const velocity = isAccent ? 1.25 : 0.95;

    // Bus sommattore basso
    const bassBus = targetCtx.createGain();
    bassBus.gain.value = 1.0;

    // Inviluppo di ampiezza
    const ampGain = targetCtx.createGain();
    const bDecay = Math.max(0.04, (params.bass_decay || 0.18) * (isAccent ? 1.3 : 1.0));
    const totalDuration = isSlide ? duration * 1.2 : Math.min(duration * 0.95, bDecay + 0.05);

    ampGain.gain.setValueAtTime(0.0001, now);
    ampGain.gain.linearRampToValueAtTime((params.bass_volume || 0.9) * velocity, now + 0.004);
    ampGain.gain.exponentialRampToValueAtTime(0.0001, now + totalDuration);

    // ==========================================
    // OSCILLATORE 1 & OSCILLATORE 2 (Detuned Pair)
    // ==========================================
    const osc1 = targetCtx.createOscillator();
    const osc2 = targetCtx.createOscillator();
    const osc2Gain = targetCtx.createGain();

    osc1.type = params.bass_osc1_wave || "sawtooth";
    osc2.type = params.bass_osc2_wave || "square";

    const detuneCents = (params.bass_detune || 8) * (isAccent ? 1.2 : 1.0);
    osc2.detune.setValueAtTime(detuneCents, now);
    osc2Gain.gain.setValueAtTime(params.bass_osc2_mix || 0.5, now);

    // Gestione Glide / Portamento 303 Slide
    const glideTime = isSlide ? Math.max(0.04, params.bass_glide || 0.08) : 0.002;
    if (isSlide && this.lastNoteFreq) {
      osc1.frequency.setValueAtTime(this.lastNoteFreq, now);
      osc2.frequency.setValueAtTime(this.lastNoteFreq, now);
      osc1.frequency.exponentialRampToValueAtTime(targetFreq, now + glideTime);
      osc2.frequency.exponentialRampToValueAtTime(targetFreq, now + glideTime);
    } else {
      osc1.frequency.setValueAtTime(targetFreq, now);
      osc2.frequency.setValueAtTime(targetFreq, now);
    }
    this.lastNoteFreq = targetFreq;

    // Sub-Oscillatore dedicato (Sine 1 ottava sotto per pancia sismica)
    let subOsc = null;
    let subGain = null;
    if ((params.bass_sub_level || 0.6) > 0.05) {
      subOsc = targetCtx.createOscillator();
      subGain = targetCtx.createGain();
      subOsc.type = "sine";
      const subFreq = Math.max(20, targetFreq * 0.5);
      if (isSlide) {
        subOsc.frequency.setValueAtTime(subFreq, now);
      } else {
        subOsc.frequency.setValueAtTime(subFreq, now);
      }
      subGain.gain.setValueAtTime(params.bass_sub_level || 0.6, now);
      subOsc.connect(subGain);
    }

    // ==========================================
    // FILTRO RISONANTE 303 / BASS LADDER FILTER
    // ==========================================
    const filter = targetCtx.createBiquadFilter();
    filter.type = "lowpass";

    const baseCutoff = Math.max(60, params.bass_cutoff || 1800);
    const reso = Math.min(22, Math.max(1, (params.bass_resonance || 12) * (isAccent ? 1.3 : 1.0)));
    filter.Q.setValueAtTime(reso, now);

    // Inviluppo del filtro acido
    const envMod = (params.bass_envMod || 0.8) * (isAccent ? 1.25 : 1.0);
    const peakCutoff = Math.min(18000, baseCutoff + envMod * 8000);
    filter.frequency.setValueAtTime(peakCutoff, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, baseCutoff * 0.2), now + bDecay);

    // ==========================================
    // DISTORSIONE BASSO & SATURATORE
    // ==========================================
    const driveShaper = targetCtx.createWaveShaper();
    const driveAmt = Math.max(0.5, (params.bass_drive || 4.0) * (isAccent ? 1.3 : 1.0));
    driveShaper.curve = this.mainEngine.getDistortionCurve(driveAmt, "diode");
    driveShaper.oversample = "2x";

    // Connessioni
    osc1.connect(filter);
    osc2.connect(osc2Gain);
    osc2Gain.connect(filter);

    filter.connect(driveShaper);
    driveShaper.connect(ampGain);
    ampGain.connect(bassBus);

    if (subGain) {
      // Sub pulito diretto nel bus per evitare che la distorsione rovini i sub bassi
      subGain.connect(ampGain);
    }

    bassBus.connect(destination);

    // Avvio e arresto
    osc1.start(now);
    osc2.start(now);
    if (subOsc) subOsc.start(now);

    osc1.stop(now + totalDuration + 0.05);
    osc2.stop(now + totalDuration + 0.05);
    if (subOsc) subOsc.stop(now + totalDuration + 0.05);
  }
}
