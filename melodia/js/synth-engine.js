/**
 * MelodyForge Studio - Polyphonic Web Audio Synthesizer Engine (DSP)
 * Motore DSP completo per la sintesi di strumenti melodici, effetti da studio,
 * gestione polifonica, cassa di riferimento intonata ed esportazione audio WAV.
 */

import { midiToFreq, noteNameToMidi, CHROMATIC_NOTES } from "./scales.js";

export class MelodySynthEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.limiter = null;
    this.eqLow = null;
    this.eqMid = null;
    this.eqHigh = null;

    // FX Nodes
    this.reverbNode = null;
    this.reverbGain = null;
    this.delayNodeL = null;
    this.delayNodeR = null;
    this.delayFeedbackL = null;
    this.delayFeedbackR = null;
    this.delayGain = null;
    this.distortionNode = null;
    this.chorusL = null;
    this.chorusR = null;
    this.chorusGain = null;

    // Kick Reference Monitor
    this.kickGain = null;
    this.kickEnabled = false;
    this.kickVolume = 0.8;

    // Active live voices (MIDI note -> voice instance)
    this.activeVoices = new Map();
    this.lastPlayedFreq = null;

    // Default patch parameters
    this.params = {
      osc1_wave: "sawtooth",
      osc1_octave: 0,
      osc1_detune: -6,
      osc1_volume: 0.8,
      osc2_wave: "sawtooth",
      osc2_octave: 0,
      osc2_detune: 7,
      osc2_volume: 0.8,
      sub_level: 0.3,
      noise_level: 0.04,
      unison_voices: 3,
      unison_detune: 18,
      unison_width: 0.8,
      filter_type: "lowpass",
      filter_cutoff: 3500,
      filter_resonance: 3.0,
      filter_env_amount: 3000,
      amp_attack: 0.005,
      amp_decay: 0.25,
      amp_sustain: 0.7,
      amp_release: 0.35,
      filter_attack: 0.005,
      filter_decay: 0.2,
      filter_sustain: 0.3,
      filter_release: 0.3,
      lfo_rate: 4.5,
      lfo_depth: 10,
      lfo_target: "pitch", // "pitch" | "cutoff" | "amp" | "none"
      lfo_wave: "sine",
      dist_drive: 0.2,
      chorus_mix: 0.35,
      delay_time: 0.375,
      delay_feedback: 0.35,
      delay_mix: 0.25,
      reverb_size: 0.7,
      reverb_decay: 2.2,
      reverb_mix: 0.3,
      eq_low: 1.0,
      eq_mid: 2.0,
      eq_high: 2.5,
      glide: 0.0,
      master_volume: 0.85
    };
  }

  /**
   * Inizializza il contesto audio e la catena master
   */
  async initAudio() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx({ latencyHint: "interactive" });
    }
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
    if (!this.masterGain) {
      this.buildMasterFXChain(this.ctx);
    }
  }

  /**
   * Costruisce la catena di missaggio ed effetti master
   */
  buildMasterFXChain(ctx) {
    // 1. Bus sintetizzatore prima degli effetti
    this.synthBus = ctx.createGain();
    this.synthBus.gain.value = 1.0;

    // 2. Distorsione / Saturazione analogica
    this.distortionNode = ctx.createWaveShaper();
    this.distortionNode.oversample = "4x";
    this.updateDistortionCurve(this.params.dist_drive);

    // 3. Catena Riverbero a Convoluzione (IR algoritmica)
    this.reverbNode = ctx.createConvolver();
    this.updateReverbImpulse(ctx, this.params.reverb_decay, this.params.reverb_size);
    this.reverbGain = ctx.createGain();
    this.reverbGain.gain.value = this.params.reverb_mix;

    // 4. Stereo Ping-Pong Delay
    this.delayNodeL = ctx.createDelay();
    this.delayNodeR = ctx.createDelay();
    this.delayFeedbackL = ctx.createGain();
    this.delayFeedbackR = ctx.createGain();
    this.delayGain = ctx.createGain();
    this.delayMerger = ctx.createChannelMerger(2);

    this.delayNodeL.delayTime.value = this.params.delay_time;
    this.delayNodeR.delayTime.value = this.params.delay_time * 1.5;
    this.delayFeedbackL.gain.value = this.params.delay_feedback;
    this.delayFeedbackR.gain.value = this.params.delay_feedback;
    this.delayGain.gain.value = this.params.delay_mix;

    // Connessione Ping-Pong incrociata
    this.delayNodeL.connect(this.delayFeedbackL);
    this.delayFeedbackL.connect(this.delayNodeR);
    this.delayNodeR.connect(this.delayFeedbackR);
    this.delayFeedbackR.connect(this.delayNodeL);

    this.delayNodeL.connect(this.delayMerger, 0, 0);
    this.delayNodeR.connect(this.delayMerger, 0, 1);
    this.delayMerger.connect(this.delayGain);

    // 5. Stereo Chorus
    this.chorusGain = ctx.createGain();
    this.chorusGain.gain.value = this.params.chorus_mix;
    this.setupChorus(ctx);

    // 6. Equalizzatore a 3 Bande
    this.eqLow = ctx.createBiquadFilter();
    this.eqLow.type = "lowshelf";
    this.eqLow.frequency.value = 140;
    this.eqLow.gain.value = this.params.eq_low;

    this.eqMid = ctx.createBiquadFilter();
    this.eqMid.type = "peaking";
    this.eqMid.frequency.value = 1600;
    this.eqMid.Q.value = 1.0;
    this.eqMid.gain.value = this.params.eq_mid;

    this.eqHigh = ctx.createBiquadFilter();
    this.eqHigh.type = "highshelf";
    this.eqHigh.frequency.value = 6500;
    this.eqHigh.gain.value = this.params.eq_high;

    // 7. Bus di Riferimento Cassa (Kick Reference Monitor)
    this.kickGain = ctx.createGain();
    this.kickGain.gain.value = this.kickVolume;

    // 8. Limiter / Compressor Master anti-clipping
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.setValueAtTime(-1.0, ctx.currentTime);
    this.limiter.knee.setValueAtTime(3.0, ctx.currentTime);
    this.limiter.ratio.setValueAtTime(16.0, ctx.currentTime);
    this.limiter.attack.setValueAtTime(0.002, ctx.currentTime);
    this.limiter.release.setValueAtTime(0.08, ctx.currentTime);

    // 9. Master Gain
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = this.params.master_volume;

    // Connessioni catena:
    // synthBus -> distortion -> Dry path + Reverb + Delay + Chorus
    this.synthBus.connect(this.distortionNode);

    // Dry
    this.distortionNode.connect(this.eqLow);

    // Reverb Send
    this.distortionNode.connect(this.reverbNode);
    this.reverbNode.connect(this.reverbGain);
    this.reverbGain.connect(this.eqLow);

    // Delay Send
    this.distortionNode.connect(this.delayNodeL);
    this.delayGain.connect(this.eqLow);

    // Chorus Send
    if (this.chorusNode) {
      this.distortionNode.connect(this.chorusNode);
      this.chorusGain.connect(this.eqLow);
    }

    // EQ -> Master Limiter -> Master Gain -> Destination
    this.eqLow.connect(this.eqMid);
    this.eqMid.connect(this.eqHigh);
    this.eqHigh.connect(this.limiter);

    // Kick Reference si connette direttamente al limiter (dry e potente)
    this.kickGain.connect(this.limiter);

    this.limiter.connect(this.masterGain);
    this.masterGain.connect(ctx.destination);
  }

  /**
   * Generatore di curva per la saturazione/distorsione
   */
  updateDistortionCurve(drive = 0.2) {
    if (!this.distortionNode) return;
    const k = drive * 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      if (k === 0) {
        curve[i] = x;
      } else {
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }
    }
    this.distortionNode.curve = curve;
  }

  /**
   * Genera una risposta all'impulso (Impulse Response) procedurale per il riverbero da studio
   */
  updateReverbImpulse(ctx, decay = 2.0, roomSize = 0.7) {
    if (!this.reverbNode) return;
    const rate = ctx.sampleRate;
    const length = rate * Math.max(0.5, Math.min(6.0, decay));
    const impulse = ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = length - i;
      const t = i / rate;
      // Esponenziale decrescente con modulazione di diffusione spaziale
      const env = Math.pow(n / length, 2.5 + roomSize * 1.5) * Math.exp(-t / (decay * 0.4));
      left[i] = (Math.random() * 2 - 1) * env;
      right[i] = (Math.random() * 2 - 1) * env;
    }
    this.reverbNode.buffer = impulse;
  }

  /**
   * Configura il nodo stereo chorus
   */
  setupChorus(ctx) {
    const delayL = ctx.createDelay();
    const delayR = ctx.createDelay();
    delayL.delayTime.value = 0.015;
    delayR.delayTime.value = 0.022;

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 1.2;
    lfoGain.gain.value = 0.003;

    lfo.connect(delayL.delayTime);
    lfo.connect(delayR.delayTime);
    lfo.start();

    const merger = ctx.createChannelMerger(2);
    delayL.connect(merger, 0, 0);
    delayR.connect(merger, 0, 1);
    merger.connect(this.chorusGain);

    this.chorusNode = delayL;
  }

  /**
   * Suona una singola nota all'interno di un AudioContext (tempo reale o offline)
   */
  triggerNote(midiNote, duration = 0.4, velocity = 0.85, startTime = null, customCtx = null, destination = null) {
    const ctx = customCtx || this.ctx;
    if (!ctx) return;
    const now = startTime !== null ? startTime : ctx.currentTime;
    const dest = destination || this.synthBus;

    const p = this.params;
    const baseFreq = midiToFreq(midiNote);

    // ==========================================
    // INVOLUCRO D'AMPIEZZA (Amp ADSR)
    // ==========================================
    const ampGain = ctx.createGain();
    const attackTime = Math.max(0.002, p.amp_attack);
    const decayTime = Math.max(0.01, p.amp_decay);
    const sustainLevel = Math.max(0.0, Math.min(1.0, p.amp_sustain));
    const releaseTime = Math.max(0.02, p.amp_release);
    const peakVolume = Math.max(0.01, p.osc1_volume * velocity);

    ampGain.gain.setValueAtTime(0.0001, now);
    ampGain.gain.exponentialRampToValueAtTime(peakVolume, now + attackTime);
    ampGain.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, peakVolume * sustainLevel),
      now + attackTime + decayTime
    );

    const noteOffTime = now + duration;
    ampGain.gain.setValueAtTime(Math.max(0.0001, peakVolume * sustainLevel), noteOffTime);
    ampGain.gain.exponentialRampToValueAtTime(0.0001, noteOffTime + releaseTime);

    // ==========================================
    // FILTRO VCF & INVOLUCRO FILTRO (Filter ADSR)
    // ==========================================
    const filter = ctx.createBiquadFilter();
    filter.type = p.filter_type || "lowpass";
    filter.Q.value = p.filter_resonance || 2.0;

    const baseCutoff = Math.max(20, Math.min(20000, p.filter_cutoff));
    const envAmount = p.filter_env_amount || 0;
    const fAttack = Math.max(0.002, p.filter_attack);
    const fDecay = Math.max(0.01, p.filter_decay);
    const fSustain = Math.max(0.0, Math.min(1.0, p.filter_sustain));
    const fRelease = Math.max(0.02, p.filter_release);

    const targetPeak = Math.max(20, Math.min(20000, baseCutoff + envAmount));
    const targetSustain = Math.max(20, Math.min(20000, baseCutoff + envAmount * fSustain));

    filter.frequency.setValueAtTime(Math.max(20, baseCutoff), now);
    filter.frequency.exponentialRampToValueAtTime(targetPeak, now + fAttack);
    filter.frequency.exponentialRampToValueAtTime(targetSustain, now + fAttack + fDecay);
    filter.frequency.setValueAtTime(targetSustain, noteOffTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, baseCutoff), noteOffTime + fRelease);

    // ==========================================
    // LFO MODULATION
    // ==========================================
    let lfoOsc = null;
    let lfoGainNode = null;
    if (p.lfo_target && p.lfo_target !== "none" && p.lfo_depth > 0) {
      lfoOsc = ctx.createOscillator();
      lfoOsc.type = p.lfo_wave || "sine";
      lfoOsc.frequency.setValueAtTime(p.lfo_rate || 4.0, now);

      lfoGainNode = ctx.createGain();
      lfoGainNode.gain.setValueAtTime(p.lfo_depth, now);
      lfoOsc.connect(lfoGainNode);

      if (p.lfo_target === "pitch") {
        // Modula detune degli oscillatori
      } else if (p.lfo_target === "cutoff") {
        lfoGainNode.connect(filter.frequency);
      } else if (p.lfo_target === "amp") {
        lfoGainNode.connect(ampGain.gain);
      }
      lfoOsc.start(now);
      lfoOsc.stop(noteOffTime + releaseTime);
    }

    // ==========================================
    // OSCILLATORI & UNISON DETUNE
    // ==========================================
    const oscVoices = [];
    const unisonCount = Math.max(1, p.unison_voices || 1);
    const unisonSpread = (p.unison_detune || 15) / 100; // in semitoni

    for (let i = 0; i < unisonCount; i++) {
      let detuneOffset = 0;
      let panOffset = 0;
      if (unisonCount > 1) {
        const factor = (i / (unisonCount - 1)) * 2 - 1; // da -1 a +1
        detuneOffset = factor * (p.unison_detune || 15);
        panOffset = factor * (p.unison_width || 0.8);
      }

      // OSC 1
      const osc1 = ctx.createOscillator();
      osc1.type = p.osc1_wave || "sawtooth";
      const osc1Pitch = baseFreq * Math.pow(2, (p.osc1_octave || 0));
      osc1.frequency.setValueAtTime(osc1Pitch, now);
      osc1.detune.setValueAtTime((p.osc1_detune || 0) + detuneOffset, now);

      if (p.glide > 0 && this.lastPlayedFreq) {
        osc1.frequency.setValueAtTime(this.lastPlayedFreq, now);
        osc1.frequency.exponentialRampToValueAtTime(osc1Pitch, now + p.glide);
      }

      // Connessione LFO pitch se attivo
      if (p.lfo_target === "pitch" && lfoGainNode) {
        lfoGainNode.connect(osc1.detune);
      }

      // OSC 2
      const osc2 = ctx.createOscillator();
      osc2.type = p.osc2_wave || "sawtooth";
      const osc2Pitch = baseFreq * Math.pow(2, (p.osc2_octave || 0));
      osc2.frequency.setValueAtTime(osc2Pitch, now);
      osc2.detune.setValueAtTime((p.osc2_detune || 0) - detuneOffset, now);

      if (p.glide > 0 && this.lastPlayedFreq) {
        osc2.frequency.setValueAtTime(this.lastPlayedFreq, now);
        osc2.frequency.exponentialRampToValueAtTime(osc2Pitch, now + p.glide);
      }

      if (p.lfo_target === "pitch" && lfoGainNode) {
        lfoGainNode.connect(osc2.detune);
      }

      // Stereo Panner per l'unison
      let voiceDest = filter;
      if (ctx.createStereoPanner && panOffset !== 0) {
        const panner = ctx.createStereoPanner();
        panner.pan.setValueAtTime(Math.max(-1, Math.min(1, panOffset)), now);
        panner.connect(filter);
        voiceDest = panner;
      }

      const voiceGain = ctx.createGain();
      voiceGain.gain.value = 1.0 / Math.sqrt(unisonCount);
      osc1.connect(voiceGain);
      osc2.connect(voiceGain);
      voiceGain.connect(voiceDest);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(noteOffTime + releaseTime + 0.1);
      osc2.stop(noteOffTime + releaseTime + 0.1);

      oscVoices.push(osc1, osc2);
    }

    // Sub-Oscillator (1 ottava sotto per corposità nel mix)
    if (p.sub_level > 0.01) {
      const subOsc = ctx.createOscillator();
      subOsc.type = "sine";
      subOsc.frequency.setValueAtTime(baseFreq * 0.5, now);
      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(p.sub_level * 0.6, now);
      subOsc.connect(subGain);
      subGain.connect(filter);
      subOsc.start(now);
      subOsc.stop(noteOffTime + releaseTime + 0.1);
      oscVoices.push(subOsc);
    }

    // Noise Generator (transiente d'attacco o fruscio sintetico)
    if (p.noise_level > 0.01) {
      const bufferSize = ctx.sampleRate * Math.min(0.2, duration);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(p.noise_level * 0.3, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + Math.min(0.08, duration));
      whiteNoise.connect(noiseGain);
      noiseGain.connect(filter);
      whiteNoise.start(now);
      whiteNoise.stop(now + 0.1);
    }

    // Connessione finale della voce: Filter -> AmpGain -> synthBus/destination
    filter.connect(ampGain);
    ampGain.connect(dest);

    this.lastPlayedFreq = baseFreq;

    return {
      noteOff: (offTime = ctx.currentTime) => {
        ampGain.gain.cancelScheduledValues(offTime);
        ampGain.gain.setValueAtTime(ampGain.gain.value, offTime);
        ampGain.gain.exponentialRampToValueAtTime(0.0001, offTime + releaseTime);
        oscVoices.forEach(osc => {
          try { osc.stop(offTime + releaseTime + 0.05); } catch (e) {}
        });
      }
    };
  }

  /**
   * Esegue una nota dal vivo da tastiera (Note On persistente)
   */
  liveNoteOn(midiNote, velocity = 0.85) {
    this.initAudio();
    if (this.activeVoices.has(midiNote)) {
      this.liveNoteOff(midiNote);
    }
    const voice = this.triggerNote(midiNote, 60.0, velocity);
    this.activeVoices.set(midiNote, voice);
  }

  /**
   * Rilascia la nota suonata dal vivo (Note Off)
   */
  liveNoteOff(midiNote) {
    if (this.activeVoices.has(midiNote)) {
      const voice = this.activeVoices.get(midiNote);
      if (voice && typeof voice.noteOff === "function") {
        voice.noteOff();
      }
      this.activeVoices.delete(midiNote);
    }
  }

  /**
   * Suona un colpo di cassa di riferimento intonata alla tonalità (Kick Reference)
   */
  triggerReferenceKick(startTime = null, rootNote = "F") {
    if (!this.kickEnabled) return;
    const ctx = this.ctx;
    if (!ctx) return;
    const now = startTime !== null ? startTime : ctx.currentTime;

    // Calcola frequenza fondamentale del kick in base alla root note (ottava 1 ~ 35-65 Hz)
    const midiKick = noteNameToMidi(`${rootNote}1`);
    const kickFreq = midiToFreq(midiKick);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Pitch sweep rapido dal punch verso il sub
    osc.frequency.setValueAtTime(kickFreq * 7.0, now);
    osc.frequency.exponentialRampToValueAtTime(kickFreq * 1.8, now + 0.03);
    osc.frequency.exponentialRampToValueAtTime(kickFreq, now + 0.09);

    // Inviluppo ampiezza cassa
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(1.0, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.7, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc.connect(gain);
    gain.connect(this.kickGain);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  /**
   * Aggiorna i parametri dal vivo e applica le modifiche immediate ai nodi FX
   */
  updateParam(key, val) {
    this.params[key] = val;
    if (!this.ctx) return;

    if (key === "master_volume" && this.masterGain) {
      this.masterGain.gain.setValueAtTime(val, this.ctx.currentTime);
    } else if (key === "dist_drive" && this.distortionNode) {
      this.updateDistortionCurve(val);
    } else if (key === "reverb_mix" && this.reverbGain) {
      this.reverbGain.gain.setValueAtTime(val, this.ctx.currentTime);
    } else if (key === "reverb_decay" && this.reverbNode) {
      this.updateReverbImpulse(this.ctx, val, this.params.reverb_size);
    } else if (key === "delay_mix" && this.delayGain) {
      this.delayGain.gain.setValueAtTime(val, this.ctx.currentTime);
    } else if (key === "delay_time" && this.delayNodeL) {
      this.delayNodeL.delayTime.setValueAtTime(val, this.ctx.currentTime);
      this.delayNodeR.delayTime.setValueAtTime(val * 1.5, this.ctx.currentTime);
    } else if (key === "delay_feedback" && this.delayFeedbackL) {
      this.delayFeedbackL.gain.setValueAtTime(val, this.ctx.currentTime);
      this.delayFeedbackR.gain.setValueAtTime(val, this.ctx.currentTime);
    } else if (key === "chorus_mix" && this.chorusGain) {
      this.chorusGain.gain.setValueAtTime(val, this.ctx.currentTime);
    } else if (key === "eq_low" && this.eqLow) {
      this.eqLow.gain.setValueAtTime(val, this.ctx.currentTime);
    } else if (key === "eq_mid" && this.eqMid) {
      this.eqMid.gain.setValueAtTime(val, this.ctx.currentTime);
    } else if (key === "eq_high" && this.eqHigh) {
      this.eqHigh.gain.setValueAtTime(val, this.ctx.currentTime);
    }
  }

  /**
   * Rendering offline di alta qualità e scaricamento audio in file .WAV
   */
  async renderWavBlob(notesPattern, bpm = 150, numSteps = 16, rootNote = "F", includeKick = false) {
    const stepDuration = 60 / (bpm * 4); // sedicesimi in secondi
    const totalPatternDuration = numSteps * stepDuration;
    const tailTime = 2.0; // coda di riverbero e delay
    const totalDuration = totalPatternDuration + tailTime;

    const sampleRate = 44100;
    const offlineCtx = new OfflineAudioContext(2, Math.ceil(totalDuration * sampleRate), sampleRate);

    // Costruisci catena FX sull'offline context
    const offlineEngine = new MelodySynthEngine();
    offlineEngine.params = { ...this.params };
    offlineEngine.buildMasterFXChain(offlineCtx);

    // Esegui tutte le note del pattern
    notesPattern.forEach(noteItem => {
      if (!noteItem.active) return;
      const startTime = noteItem.step * stepDuration;
      const noteDur = (noteItem.gate || 1) * stepDuration * 0.95;
      offlineEngine.triggerNote(
        noteItem.midi,
        noteDur,
        noteItem.velocity || 0.85,
        startTime,
        offlineCtx,
        offlineEngine.synthBus
      );
    });

    // Se richiesto, renderizza anche la cassa di riferimento intonata
    if (includeKick) {
      const quarterDuration = 60 / bpm;
      const totalBeats = Math.floor(numSteps / 4);
      for (let beat = 0; beat < totalBeats; beat++) {
        const beatTime = beat * quarterDuration;
        offlineEngine.kickEnabled = true;
        offlineEngine.triggerReferenceKick(beatTime, rootNote);
      }
    }

    const renderedBuffer = await offlineCtx.startRendering();
    return this.audioBufferToWav(renderedBuffer);
  }

  /**
   * Codifica un AudioBuffer in formato RIFF WAVE a 16-bit PCM standard
   */
  audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const length = buffer.length * numChannels * 2;
    const bufferArray = new ArrayBuffer(44 + length);
    const view = new DataView(bufferArray);

    function writeString(offset, string) {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    }

    // RIFF identifier
    writeString(0, "RIFF");
    // file length
    view.setUint32(4, 36 + length, true);
    // RIFF type
    writeString(8, "WAVE");
    // format chunk identifier
    writeString(12, "fmt ");
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (1 = PCM)
    view.setUint16(20, 1, true);
    // channel count
    view.setUint16(22, numChannels, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * numChannels * 2, true);
    // block align (channel count * bytes per sample)
    view.setUint16(32, numChannels * 2, true);
    // bits per sample
    view.setUint16(34, 16, true);
    // data chunk identifier
    writeString(36, "data");
    // data chunk length
    view.setUint32(40, length, true);

    // Scrittura dei campioni interlacciati normalizzati a 16-bit PCM
    const channels = [];
    for (let i = 0; i < numChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        let sample = channels[ch][i];
        sample = Math.max(-1, Math.min(1, sample));
        const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, int16, true);
        offset += 2;
      }
    }

    return new Blob([bufferArray], { type: "audio/wav" });
  }
}
