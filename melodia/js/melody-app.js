/**
 * MelodyForge Studio - Main Application Controller
 * Coordina l'interfaccia utente, il sintetizzatore Web Audio, il Piano Roll,
 * il sequencer con scheduling ad alta precisione, l'AI per generare/variare melodie
 * e l'evoluzione armonica continua intonata alla musica precedente.
 */

import { CHROMATIC_NOTES, SCALES, isNoteInScale, KICK_TUNING_PRESETS, detectNoteFromFrequency, midiToFreq, noteNameToMidi } from "./scales.js";
import { INSTRUMENT_PRESETS, MELODY_TEMPLATES } from "./instruments.js";
import { MelodySynthEngine } from "./synth-engine.js";
import { PianoRoll } from "./piano-roll.js";
import { MidiExporter } from "./midi-export.js";
import { MelodyAIEngine } from "./melody-ai.js";

export const DSP_PARAM_MAPPINGS = [
  { id: "osc1-wave", param: "osc1_wave", type: "val" },
  { id: "osc1-octave", param: "osc1_octave", type: "int" },
  { id: "osc1-detune", param: "osc1_detune", type: "float" },
  { id: "osc2-wave", param: "osc2_wave", type: "val" },
  { id: "osc2-octave", param: "osc2_octave", type: "int" },
  { id: "osc2-detune", param: "osc2_detune", type: "float" },
  { id: "unison-voices", param: "unison_voices", type: "int" },
  { id: "unison-detune", param: "unison_detune", type: "float" },
  { id: "sub-level", param: "sub_level", type: "float" },
  { id: "noise-level", param: "noise_level", type: "float" },
  { id: "filter-type", param: "filter_type", type: "val" },
  { id: "filter-cutoff", param: "filter_cutoff", type: "float" },
  { id: "filter-resonance", param: "filter_resonance", type: "float" },
  { id: "filter-env-amt", param: "filter_env_amount", type: "float" },
  { id: "amp-attack", param: "amp_attack", type: "float" },
  { id: "amp-decay", param: "amp_decay", type: "float" },
  { id: "amp-sustain", param: "amp_sustain", type: "float" },
  { id: "amp-release", param: "amp_release", type: "float" },
  { id: "filt-attack", param: "filter_attack", type: "float" },
  { id: "filt-decay", param: "filter_decay", type: "float" },
  { id: "filt-sustain", param: "filter_sustain", type: "float" },
  { id: "filt-release", param: "filter_release", type: "float" },
  { id: "lfo-target", param: "lfo_target", type: "val" },
  { id: "lfo-rate", param: "lfo_rate", type: "float" },
  { id: "lfo-depth", param: "lfo_depth", type: "float" },
  { id: "dist-drive", param: "dist_drive", type: "float" },
  { id: "chorus-mix", param: "chorus_mix", type: "float" },
  { id: "delay-time", param: "delay_time", type: "float" },
  { id: "delay-feedback", param: "delay_feedback", type: "float" },
  { id: "delay-mix", param: "delay_mix", type: "float" },
  { id: "reverb-decay", param: "reverb_decay", type: "float" },
  { id: "reverb-mix", param: "reverb_mix", type: "float" },
  { id: "eq-low", param: "eq_low", type: "float" },
  { id: "eq-mid", param: "eq_mid", type: "float" },
  { id: "eq-high", param: "eq_high", type: "float" },
  { id: "glide-time", param: "glide", type: "float" },
  { id: "master-volume", param: "master_volume", type: "float" }
];

class MelodyApp {
  constructor() {
    this.synth = new MelodySynthEngine();
    this.aiEngine = new MelodyAIEngine();

    this.bpm = 150;
    this.numSteps = 16;
    this.rootNote = "F";
    this.scaleId = "minor_natural";

    // Sequencer Clock & Scheduling
    this.isPlaying = false;
    this.currentStep = 0;
    this.scheduleAheadTime = 0.1;
    this.lookahead = 25.0; // ms
    this.nextStepTime = 0.0;
    this.timerId = null;

    // Modalità AUTO: cambia/evolve la melodia da sola ogni N battute (intonata)
    this.autoEvolveActive = false;
    this.autoEvolveInterval = 4; // battute
    this.autoBarCount = 0;

    // Metronomo & Kick Reference
    this.metronomeActive = false;
    this.kickReferenceActive = true;
    this.synth.kickEnabled = true;
    this.currentKickRhythmFn = (step) => step % 4 === 0;
    this.kickRhythmIndex = 0;
    this.kickSoundIndex = 0;

    this.initDOM();
    this.initPianoRoll();
    this.initInstruments();
    this.initScalesUI();
    this.initControls();
    this.initAI();
    this.initVariazioniPanel();
    this.initVirtualKeyboard();
    this.loadKickForgeSession();

    // Carica pattern iniziale melodico di default
    this.loadTemplateMelody("euphoric_anthem");
  }

  initDOM() {
    this.playBtn = document.getElementById("melody-play-btn");
    this.stopBtn = document.getElementById("melody-stop-btn");
    this.bpmInput = document.getElementById("melody-bpm-input");
    this.bpmDisplay = document.getElementById("melody-bpm-display");
    this.rootSelect = document.getElementById("melody-root-select");
    this.scaleSelect = document.getElementById("melody-scale-select");
    this.instrumentSelect = document.getElementById("melody-instrument-select");
    this.scaleLockToggle = document.getElementById("scale-lock-toggle");
    this.kickRefToggle = document.getElementById("kick-ref-toggle");
    this.kickRefVol = document.getElementById("kick-ref-vol");
    this.toastContainer = document.getElementById("toast-container");
    this.stepsSelector = document.getElementById("steps-selector");

    // AI & Evoluzione Elementi
    this.aiPromptInput = document.getElementById("melody-ai-prompt-input");
    this.aiGenerateBtn = document.getElementById("melody-ai-generate-btn");
    this.aiModifyBtn = document.getElementById("melody-ai-modify-btn");
    this.aiStatusEl = document.getElementById("melody-ai-status");
    this.cambiaMelodiaBtn = document.getElementById("cambia-melodia-btn");
    this.keepTunedPrevToggle = document.getElementById("keep-tuned-prev-toggle");
    this.autoMelodyToggleBtn = document.getElementById("auto-melody-toggle-btn");
    this.autoMelodyIntervalSelect = document.getElementById("auto-melody-interval");
    this.cambiaNoteBtn = document.getElementById("cambia-note-btn");
    this.cambiaRitmoBtn = document.getElementById("cambia-ritmo-btn");
    this.undoMelodyBtn = document.getElementById("undo-melody-btn");
    this.rememberMelodyBtn = document.getElementById("remember-melody-btn");
  }

  initPianoRoll() {
    const container = document.getElementById("pianoroll-container");
    this.pianoRoll = new PianoRoll({
      container: container,
      synthEngine: this.synth,
      numSteps: this.numSteps,
      onNotesChange: (notes) => {
        // Callback se necessario
      }
    });
    this.pianoRoll.setTuning(this.rootNote, this.scaleId);
  }

  initInstruments() {
    if (!this.instrumentSelect) return;
    this.instrumentSelect.innerHTML = "";
    INSTRUMENT_PRESETS.forEach((inst, idx) => {
      const opt = document.createElement("option");
      opt.value = inst.id;
      opt.textContent = `${inst.name} [${inst.badge}]`;
      if (idx === 0) opt.selected = true;
      this.instrumentSelect.appendChild(opt);
    });

    this.instrumentSelect.addEventListener("change", (e) => {
      this.applyInstrumentPreset(e.target.value);
    });

    // Applica il primo preset
    this.applyInstrumentPreset(INSTRUMENT_PRESETS[0].id);
  }

  async applyInstrumentPreset(presetId, preview = false) {
    const preset = INSTRUMENT_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    this.synth.applyAllParams(preset.params);
    this.updateKnobsUI();
    this.showToast(`🎸 Caricato strumento: ${preset.name}`, "info");

    // Aggiorna descrizione
    const descEl = document.getElementById("instrument-description");
    if (descEl) descEl.textContent = preset.description;

    if (this.instrumentSelect) this.instrumentSelect.value = presetId;

    if (preview) {
      await this.synth.initAudio();
      this.auditionMelody();
    }
  }

  /**
   * Esegue un breve riff di anteprima per far sentire subito il nuovo timbro o le note
   */
  async auditionMelody() {
    await this.synth.initAudio();
    if (!this.synth.ctx || this.isPlaying) return;

    const notes = this.pianoRoll.getNotesArray().filter(n => n.active);
    const scale = SCALES[this.scaleId] || SCALES.minor_natural;
    const rootIndex = CHROMATIC_NOTES.indexOf(this.rootNote);
    const baseMidi = 60 + rootIndex;

    const previewMidis = notes.length >= 2
      ? [notes[0].midi, notes[1].midi, (notes[2] ? notes[2].midi : notes[0].midi)]
      : [baseMidi, baseMidi + (scale.intervals[2] || 4), baseMidi + (scale.intervals[4] || 7)];

    const now = this.synth.ctx.currentTime + 0.02;
    const stepDuration = 0.16;

    previewMidis.forEach((midi, idx) => {
      this.synth.triggerNote(midi, 0.22, 0.88, now + idx * stepDuration);
    });
  }

  initScalesUI() {
    // Popola root notes
    if (this.rootSelect) {
      this.rootSelect.innerHTML = "";
      CHROMATIC_NOTES.forEach(note => {
        const opt = document.createElement("option");
        opt.value = note;
        opt.textContent = `${note} (Tonalità)`;
        if (note === this.rootNote) opt.selected = true;
        this.rootSelect.appendChild(opt);
      });
      this.rootSelect.addEventListener("change", (e) => {
        this.rootNote = e.target.value;
        this.pianoRoll.setTuning(this.rootNote, this.scaleId);
        this.updateHarmonicBadge();
      });
    }

    // Popola scale
    if (this.scaleSelect) {
      this.scaleSelect.innerHTML = "";
      Object.keys(SCALES).forEach(scaleKey => {
        const s = SCALES[scaleKey];
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = `${s.name} • [${s.badge}]`;
        if (s.id === this.scaleId) opt.selected = true;
        this.scaleSelect.appendChild(opt);
      });
      this.scaleSelect.addEventListener("change", (e) => {
        this.scaleId = e.target.value;
        this.pianoRoll.setTuning(this.rootNote, this.scaleId);
        this.updateHarmonicBadge();
      });
    }

    // Scale Lock toggle
    if (this.scaleLockToggle) {
      this.scaleLockToggle.addEventListener("change", (e) => {
        this.pianoRoll.scaleLock = e.target.checked;
        this.pianoRoll.render();
        this.showToast(e.target.checked ? "🔒 Scale Lock ATTIVO: solo note intonate" : "🔓 Scale Lock DISATTIVO: cromatismo libero", "info");
      });
    }

    // Tasto Sincronizza con Cassa
    const syncKickBtn = document.getElementById("sync-kick-btn");
    if (syncKickBtn) {
      syncKickBtn.addEventListener("click", () => this.detectAndSyncWithKickForge());
    }

    this.updateHarmonicBadge();
  }

  updateHarmonicBadge() {
    const badge = document.getElementById("current-tuning-badge");
    const scale = SCALES[this.scaleId];
    if (badge && scale) {
      badge.textContent = `${this.rootNote} ${scale.name}`;
    }
  }

  /**
   * Cerca nella memoria del browser i dati dell'ultima cassa/basso usati in KickForge
   */
  loadKickForgeSession() {
    try {
      const savedKickBpm = localStorage.getItem("kickforge_last_bpm");
      if (savedKickBpm) {
        const parsed = parseInt(savedKickBpm, 10);
        if (parsed >= 60 && parsed <= 240) {
          this.setBPM(parsed);
        }
      }

      // Rileva nota fondamentale della cassa se presente
      const kickTuning = localStorage.getItem("kickforge_last_tuning");
      if (kickTuning && CHROMATIC_NOTES.includes(kickTuning)) {
        this.rootNote = kickTuning;
        if (this.rootSelect) this.rootSelect.value = kickTuning;
        this.pianoRoll.setTuning(this.rootNote, this.scaleId);
        this.updateHarmonicBadge();
      }
    } catch (e) {
      console.warn("Could not load KickForge session:", e);
    }
  }

  detectAndSyncWithKickForge() {
    try {
      const customPresets = JSON.parse(localStorage.getItem("kickforge_custom_presets_v2") || "[]");
      if (customPresets.length > 0) {
        const latest = customPresets[customPresets.length - 1];
        if (latest.bpm) this.setBPM(latest.bpm);
        if (latest.params && latest.params.body_tailFreq) {
          const detected = detectNoteFromFrequency(latest.params.body_tailFreq);
          this.rootNote = detected.note;
          if (this.rootSelect) this.rootSelect.value = detected.note;
          this.pianoRoll.setTuning(this.rootNote, this.scaleId);
          this.updateHarmonicBadge();
          this.showToast(`🎯 Sintonizzato con successo su ${detected.note} (${latest.params.body_tailFreq} Hz) a ${this.bpm} BPM!`, "success");
          return;
        }
      }
    } catch (e) {}

    this.rootNote = "F";
    if (this.rootSelect) this.rootSelect.value = "F";
    this.pianoRoll.setTuning(this.rootNote, this.scaleId);
    this.updateHarmonicBadge();
    this.showToast(`🎯 Impostata tonalità regina Hardstyle/Techno: Fa (F) a ${this.bpm} BPM`, "success");
  }

  initControls() {
    // Play / Stop
    if (this.playBtn) {
      this.playBtn.addEventListener("click", () => this.togglePlay());
    }
    if (this.stopBtn) {
      this.stopBtn.addEventListener("click", () => this.stop());
    }

    // Spazio per play/stop
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space" && e.target.tagName !== "INPUT" && e.target.tagName !== "SELECT") {
        e.preventDefault();
        this.togglePlay();
      }
    });

    // BPM Slider & Input
    if (this.bpmInput) {
      this.bpmInput.addEventListener("input", (e) => {
        this.setBPM(parseInt(e.target.value, 10));
      });
    }

    // Tap Tempo
    const tapBtn = document.getElementById("tap-tempo-btn");
    if (tapBtn) {
      let lastTap = 0;
      let tapDiffs = [];
      tapBtn.addEventListener("click", () => {
        const now = performance.now();
        if (lastTap > 0) {
          const diff = now - lastTap;
          if (diff < 2000) {
            tapDiffs.push(diff);
            if (tapDiffs.length > 4) tapDiffs.shift();
            const avg = tapDiffs.reduce((a, b) => a + b) / tapDiffs.length;
            const calculatedBpm = Math.round(60000 / avg);
            if (calculatedBpm >= 60 && calculatedBpm <= 240) {
              this.setBPM(calculatedBpm);
            }
          } else {
            tapDiffs = [];
          }
        }
        lastTap = now;
      });
    }

    // Steps Selector (16 o 32)
    if (this.stepsSelector) {
      this.stepsSelector.addEventListener("change", (e) => {
        const val = parseInt(e.target.value, 10);
        this.numSteps = val;
        this.pianoRoll.setNumSteps(val);
      });
    }

    // Kick Reference Monitor Controls
    if (this.kickRefToggle) {
      this.kickRefToggle.addEventListener("change", (e) => {
        this.synth.kickEnabled = e.target.checked;
        this.showToast(e.target.checked ? "🥁 Cassa di riferimento ATTIVA" : "🥁 Cassa di riferimento MUTATA", "info");
      });
    }
    if (this.kickRefVol) {
      this.kickRefVol.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value);
        this.synth.kickVolume = val;
        if (this.synth.kickGain) {
          this.synth.kickGain.gain.setValueAtTime(val, this.synth.ctx.currentTime);
        }
      });
    }

    // Template Generator Dropdown
    const templateSelect = document.getElementById("melody-template-select");
    if (templateSelect) {
      templateSelect.addEventListener("change", (e) => {
        if (e.target.value) {
          this.loadTemplateMelody(e.target.value);
          e.target.value = "";
        }
      });
    }

    // Transpose Buttons
    document.querySelectorAll("[data-transpose]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const val = parseInt(e.currentTarget.dataset.transpose, 10);
        this.pianoRoll.transpose(val);
        this.showToast(`🎶 Trasposto di ${val > 0 ? "+" + val : val} semitoni`, "info");
      });
    });

    // Clear Button
    const clearBtn = document.getElementById("clear-melody-btn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (confirm("Vuoi cancellare tutte le note del pattern?")) {
          this.pianoRoll.clear();
          this.showToast("🗑️ Pattern cancellato", "info");
        }
      });
    }

    // Randomize in Scale Button
    const randBtn = document.getElementById("random-melody-btn");
    if (randBtn) {
      randBtn.addEventListener("click", () => this.generateRandomMelodyInScale());
    }

    // Export WAV Button
    const exportWavBtn = document.getElementById("export-wav-btn");
    if (exportWavBtn) {
      exportWavBtn.addEventListener("click", () => this.handleExportWav());
    }

    // Export MIDI Button
    const exportMidiBtn = document.getElementById("export-midi-btn");
    if (exportMidiBtn) {
      exportMidiBtn.addEventListener("click", () => this.handleExportMidi());
    }

    // Setup DSP Parameter Knobs & Sliders
    this.bindDspSliders();
  }

  /**
   * Inizializzazione controlli AI e pulsante "CAMBIA MELODIA (Evolvi)"
   */
  initAI() {
    // 1. Tasto Cambia Melodia
    if (this.cambiaMelodiaBtn) {
      this.cambiaMelodiaBtn.addEventListener("click", () => this.evolveMelody(false));
    }

    // 2. Modalità AUTO Melodia (cambia da sola ogni N battute)
    if (this.autoMelodyToggleBtn) {
      this.autoMelodyToggleBtn.addEventListener("click", () => {
        this.autoEvolveActive = !this.autoEvolveActive;
        this.autoBarCount = 0;
        this.autoMelodyToggleBtn.textContent = this.autoEvolveActive ? "🔄 AUTO: ON" : "🔄 AUTO: OFF";
        this.autoMelodyToggleBtn.classList.toggle("auto-btn-active", this.autoEvolveActive);
        this.showToast(this.autoEvolveActive ? `🔄 AUTO Melodia ATTIVO: cambierà ogni ${this.autoEvolveInterval} battute` : "🔄 AUTO Melodia DISATTIVATO", "info");
      });
    }

    if (this.autoMelodyIntervalSelect) {
      this.autoMelodyIntervalSelect.addEventListener("change", (e) => {
        this.autoEvolveInterval = parseInt(e.target.value, 10);
      });
    }

    // 3. Variazioni rapide: Cambia Note e Cambia Ritmo
    if (this.cambiaNoteBtn) {
      this.cambiaNoteBtn.addEventListener("click", () => this.variatePitches());
    }
    if (this.cambiaRitmoBtn) {
      this.cambiaRitmoBtn.addEventListener("click", () => this.variateRhythm());
    }

    // 4. Undo Cronologia e Memorizzazione
    if (this.undoMelodyBtn) {
      this.undoMelodyBtn.addEventListener("click", () => this.handleUndo());
    }
    if (this.rememberMelodyBtn) {
      this.rememberMelodyBtn.addEventListener("click", () => this.handleRemember());
    }

    // 5. Prompt AI Text Generator
    if (this.aiGenerateBtn) {
      this.aiGenerateBtn.addEventListener("click", () => this.handleAIGenerate(false));
    }
    if (this.aiModifyBtn) {
      this.aiModifyBtn.addEventListener("click", () => this.handleAIGenerate(true));
    }
    if (this.aiPromptInput) {
      this.aiPromptInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.handleAIGenerate(false);
        }
      });
    }

    // 6. Chip di suggerimento rapido AI
    document.querySelectorAll("[data-ai-prompt]").forEach(chip => {
      chip.addEventListener("click", (e) => {
        const text = e.currentTarget.dataset.aiPrompt;
        if (this.aiPromptInput) this.aiPromptInput.value = text;
        this.handleAIGenerate(false);
      });
    });
  }

  /**
   * Inizializzazione del Pannello Variazioni Rapide (Suono & Ritmo)
   */
  initVariazioniPanel() {
    // SUONO
    document.getElementById("var-suono-melodia-btn")?.addEventListener("click", () => this.variateSynthSound());
    document.getElementById("var-cambia-strumento-btn")?.addEventListener("click", () => this.cycleRandomInstrument());
    document.getElementById("var-suono-cassa-btn")?.addEventListener("click", () => this.variateKickSound());

    // RITMO (pattern)
    document.getElementById("var-ritmo-melodia-btn")?.addEventListener("click", () => this.variateRhythm());
    document.getElementById("var-cambia-note-btn")?.addEventListener("click", () => this.variatePitches());
    document.getElementById("var-ritmo-cassa-btn")?.addEventListener("click", () => this.cycleKickRhythm());
    document.getElementById("var-arpeggio-btn")?.addEventListener("click", () => this.transformToArpeggio());
    document.getElementById("var-evolvi-btn")?.addEventListener("click", () => this.evolveMelody(false));
  }

  /**
   * Variazione del timbro del sintetizzatore (filtri ed effetti FX)
   */
  async variateSynthSound() {
    await this.synth.initAudio();
    const p = this.synth.params;

    const cutoffMult = [0.65, 0.8, 1.25, 1.5, 1.85][Math.floor(Math.random() * 5)];
    p.filter_cutoff = Math.max(400, Math.min(13500, Math.round(p.filter_cutoff * cutoffMult)));
    p.filter_resonance = Math.max(1.0, Math.min(15.0, +(p.filter_resonance * (0.65 + Math.random() * 0.7)).toFixed(1)));
    p.filter_env_amount = Math.max(500, Math.min(7000, Math.round(p.filter_env_amount * (0.7 + Math.random() * 0.6))));

    p.dist_drive = Math.max(0.05, Math.min(0.85, +(p.dist_drive + (Math.random() * 0.3 - 0.15)).toFixed(2)));
    p.chorus_mix = Math.max(0.05, Math.min(0.75, +(p.chorus_mix + (Math.random() * 0.25 - 0.12)).toFixed(2)));
    p.reverb_mix = Math.max(0.1, Math.min(0.65, +(p.reverb_mix + (Math.random() * 0.2 - 0.1)).toFixed(2)));
    p.delay_mix = Math.max(0.1, Math.min(0.55, +(p.delay_mix + (Math.random() * 0.2 - 0.1)).toFixed(2)));
    p.unison_detune = Math.max(5, Math.min(35, Math.round(p.unison_detune * (0.8 + Math.random() * 0.4))));

    if (Math.random() < 0.35) {
      const waves = ["sawtooth", "square", "triangle"];
      p.osc1_wave = waves[Math.floor(Math.random() * waves.length)];
    }

    this.synth.applyAllParams(p);
    this.updateKnobsUI();
    this.showToast(`🎛️ Suono melodia variato (Cutoff: ${p.filter_cutoff}Hz, Res: ${p.filter_resonance}, Drive: ${p.dist_drive})`, "info");

    if (!this.isPlaying) {
      this.auditionMelody();
    }
  }

  /**
   * Cambia strumento pescando a sorpresa tra i 12 preset di modelli disponibili
   */
  async cycleRandomInstrument() {
    await this.synth.initAudio();
    const currentId = this.instrumentSelect?.value;
    const others = INSTRUMENT_PRESETS.filter(p => p.id !== currentId);
    const chosen = others[Math.floor(Math.random() * others.length)] || INSTRUMENT_PRESETS[0];
    await this.applyInstrumentPreset(chosen.id, !this.isPlaying);
  }

  /**
   * Varia il timbro della cassa di riferimento intonata (punch / decay / sub / distorsione)
   */
  async variateKickSound() {
    await this.synth.initAudio();
    const kickModes = [
      { id: "techno", name: "Punchy Techno 909", desc: "Attacco incisivo e sub netto" },
      { id: "hardstyle", name: "Hardstyle Tok Distorto", desc: "Sweep ultra-rapido e cassa cattiva" },
      { id: "sub", name: "Sub 808 Profondo", desc: "Corpo caldo e risonanza bassa" },
      { id: "raw", name: "Raw Screech Frenchcore", desc: "Clip transiente e botta da capogiro" }
    ];
    this.kickSoundIndex = ((this.kickSoundIndex || 0) + 1) % kickModes.length;
    const mode = kickModes[this.kickSoundIndex];
    this.synth.kickSoundMode = mode.id;

    // Esegui colpo cassa di anteprima immediato
    this.synth.triggerReferenceKick(null, this.rootNote, true);
    this.showToast(`🎛️ Timbro cassa: ${mode.name} (${mode.desc})`, "info");
  }

  /**
   * Varia il ritmo della cassa di riferimento (4/4 sul battere, levare offbeat, gallop, ottavi)
   */
  async cycleKickRhythm() {
    await this.synth.initAudio();
    const rhythms = [
      { name: "4/4 Standard (Battere)", fn: (s) => s % 4 === 0 },
      { name: "Levare Offbeat (Techno / Psy)", fn: (s) => s % 4 === 2 },
      { name: "Frenchcore Gallop (1 & 4)", fn: (s) => s % 4 === 0 || s % 4 === 3 },
      { name: "Ottavi Incalzanti", fn: (s) => s % 2 === 0 }
    ];
    this.kickRhythmIndex = ((this.kickRhythmIndex || 0) + 1) % rhythms.length;
    this.currentKickRhythmFn = rhythms[this.kickRhythmIndex].fn;
    this.showToast(`🥁 Ritmo cassa: ${rhythms[this.kickRhythmIndex].name}`, "info");

    if (!this.isPlaying) {
      const now = this.synth.ctx.currentTime + 0.03;
      const stepDuration = 60.0 / (this.bpm * 4);
      for (let s = 0; s < 4; s++) {
        if (this.currentKickRhythmFn(s)) {
          this.synth.triggerReferenceKick(now + s * stepDuration, this.rootNote, true);
        }
      }
    }
  }

  /**
   * Trasforma le note correnti in un arpeggio fluido a sedicesimi
   */
  async transformToArpeggio() {
    await this.synth.initAudio();
    const currentNotes = this.pianoRoll.getNotesArray();
    this.aiEngine.pushHistory(currentNotes);
    const usedMidis = currentNotes.length ? currentNotes.map(n => n.midi) : [];
    const scale = SCALES[this.scaleId] || SCALES.minor_natural;
    const rootIndex = CHROMATIC_NOTES.indexOf(this.rootNote);
    const intervals = scale.intervals;
    const baseMidi = 60 + rootIndex;

    const pool = usedMidis.length ? [...new Set(usedMidis)] : intervals.map(i => baseMidi + i);
    pool.sort((a, b) => a - b);

    const newNotes = [];
    for (let s = 0; s < this.numSteps; s++) {
      const idx = s % (pool.length * 2 - 2 || 1);
      const noteMidi = idx < pool.length ? pool[idx] : pool[2 * pool.length - 2 - idx];
      newNotes.push({
        step: s,
        midi: noteMidi,
        velocity: (s % 4 === 0) ? 0.95 : 0.82,
        gate: 1,
        active: 1
      });
    }
    this.pianoRoll.setNotesArray(newNotes);
    this.showToast("✨ Pattern trasformato in arpeggio fluido a sedicesimi!", "success");

    if (!this.isPlaying) {
      this.auditionMelody();
    }
  }

  /**
   * Cambia ed evolve la melodia.
   * Se la casella "Intonata alla precedente" è spuntata, crea un'evoluzione armonica
   * legata alla frase precedente; altrimenti genera una melodia completamente nuova.
   */
  async evolveMelody(silent = false) {
    await this.synth.initAudio();
    let currentNotes = this.pianoRoll.getNotesArray();
    if (currentNotes.length === 0) {
      const scale = SCALES[this.scaleId] || SCALES.minor_natural;
      const rootIndex = CHROMATIC_NOTES.indexOf(this.rootNote);
      const baseMidi = 60 + rootIndex;
      currentNotes = [0, 2, 4, 6, 8, 10, 12, 14].map(step => ({
        step,
        midi: baseMidi + (scale.intervals[Math.floor(Math.random() * scale.intervals.length)] || 0),
        velocity: 0.85,
        gate: 1,
        active: 1
      }));
    }
    const keepTuned = this.keepTunedPrevToggle ? this.keepTunedPrevToggle.checked : true;

    // Salva nella cronologia prima dell'evoluzione
    this.aiEngine.pushHistory(currentNotes, {
      rootNote: this.rootNote,
      scaleId: this.scaleId,
      bpm: this.bpm
    });

    const result = this.aiEngine.evolveMelody(
      currentNotes,
      this.rootNote,
      this.scaleId,
      keepTuned,
      this.numSteps
    );

    this.pianoRoll.setNotesArray(result.notes);

    if (!silent) {
      if (keepTuned) {
        this.showToast(`🔄 Nuova melodia generata intonata a quella precedente! (${result.type.replace(/_/g, " ")})`, "success");
      } else {
        this.showToast(`🎲 Nuova melodia indipendente generata in tonalità!`, "info");
      }
      if (!this.isPlaying) {
        this.auditionMelody();
      }
    } else {
      this.showToast(`🔄 AUTO: Melodia cambiata (${result.type.replace(/_/g, " ")})`, "info");
    }
  }

  /**
   * Varia solo le altezze delle note in scala mantenendo la scansione ritmica
   */
  async variatePitches() {
    await this.synth.initAudio();
    let currentNotes = this.pianoRoll.getNotesArray();
    if (currentNotes.length === 0) {
      const scale = SCALES[this.scaleId] || SCALES.minor_natural;
      const rootIndex = CHROMATIC_NOTES.indexOf(this.rootNote);
      const baseMidi = 60 + rootIndex;
      currentNotes = [0, 2, 4, 6, 8, 10, 12, 14].map(step => ({
        step,
        midi: baseMidi + (scale.intervals[Math.floor(Math.random() * scale.intervals.length)] || 0),
        velocity: 0.85,
        gate: 1,
        active: 1
      }));
    }
    this.aiEngine.pushHistory(currentNotes);
    const newNotes = this.aiEngine.variatePitchesOnly(currentNotes, this.rootNote, this.scaleId);
    this.pianoRoll.setNotesArray(newNotes);
    this.showToast("🎲 Note variate in tonalità (ritmo invariato)", "info");

    if (!this.isPlaying) {
      this.auditionMelody();
    }
  }

  /**
   * Varia solo il ritmo e le sincopi mantenendo le stesse note intonate
   */
  async variateRhythm() {
    await this.synth.initAudio();
    let currentNotes = this.pianoRoll.getNotesArray();
    if (currentNotes.length === 0) {
      const scale = SCALES[this.scaleId] || SCALES.minor_natural;
      const rootIndex = CHROMATIC_NOTES.indexOf(this.rootNote);
      const baseMidi = 60 + rootIndex;
      currentNotes = [0, 3, 6, 8, 10, 12, 14].map(step => ({
        step,
        midi: baseMidi + (scale.intervals[Math.floor(Math.random() * scale.intervals.length)] || 0),
        velocity: 0.85,
        gate: 1,
        active: 1
      }));
    }
    this.aiEngine.pushHistory(currentNotes);
    const newNotes = this.aiEngine.variateRhythmOnly(currentNotes, this.numSteps);
    this.pianoRoll.setNotesArray(newNotes);
    this.showToast("🎶 Ritmo melodico variato e sincopato", "info");

    if (!this.isPlaying) {
      this.auditionMelody();
    }
  }

  /**
   * Torna indietro alla melodia precedente
   */
  async handleUndo() {
    await this.synth.initAudio();
    const prev = this.aiEngine.undo();
    if (prev) {
      this.pianoRoll.setNotesArray(prev.notes);
      this.showToast("⏪ Ripristinata melodia precedente", "info");
      if (!this.isPlaying) {
        this.auditionMelody();
      }
    } else {
      this.showToast("ℹ️ Nessuna melodia precedente nella cronologia", "warning");
    }
  }

  /**
   * Fissa la melodia corrente in memoria
   */
  handleRemember() {
    const currentNotes = this.pianoRoll.getNotesArray();
    this.aiEngine.pinnedMelody = JSON.parse(JSON.stringify(currentNotes));
    this.showToast("💾 Melodia memorizzata! L'AI la userà come base di riferimento.", "success");
  }

  /**
   * Gestione generazione o modifica della melodia con AI
   */
  async handleAIGenerate(tweak = false) {
    const prompt = this.aiPromptInput ? this.aiPromptInput.value.trim() : "";
    if (!prompt) {
      this.showToast("Inserisci prima un'idea o stile nel campo testo!", "warning");
      if (this.aiPromptInput) this.aiPromptInput.focus();
      return;
    }

    await this.synth.initAudio();

    if (this.aiStatusEl) {
      this.aiStatusEl.style.display = "block";
      this.aiStatusEl.textContent = `🤖 L'AI sta componendo la melodia per "${prompt}"...`;
    }

    const currentNotes = this.pianoRoll.getNotesArray();
    this.aiEngine.pushHistory(currentNotes);

    // Piccolo delay per dare sensazione di elaborazione AI
    await new Promise(r => setTimeout(r, 200));

    try {
      const result = this.aiEngine.generateFromPrompt(
        prompt,
        this.rootNote,
        this.scaleId,
        this.numSteps
      );

      // Aggiorna Tonalità se rilevata
      if (result.rootNote && result.rootNote !== this.rootNote) {
        this.rootNote = result.rootNote;
        if (this.rootSelect) this.rootSelect.value = result.rootNote;
      }
      if (result.scaleId && result.scaleId !== this.scaleId) {
        this.scaleId = result.scaleId;
        if (this.scaleSelect) this.scaleSelect.value = result.scaleId;
      }
      this.pianoRoll.setTuning(this.rootNote, this.scaleId);
      this.updateHarmonicBadge();

      // Aggiorna Strumento se suggerito
      if (result.instrumentId) {
        await this.applyInstrumentPreset(result.instrumentId, false);
      }

      // Aggiorna BPM se specificato
      if (result.bpm) {
        this.setBPM(result.bpm);
      }

      // Applica le note
      this.pianoRoll.setNotesArray(result.notes);

      if (this.aiStatusEl) {
        this.aiStatusEl.textContent = `✅ ${result.name} generata con successo in ${this.rootNote} ${SCALES[this.scaleId]?.name}!`;
      }
      this.showToast(`✨ ${result.name} pronta!`, "success");

      if (!this.isPlaying) {
        this.auditionMelody();
      }
    } catch (err) {
      console.error("AI Error:", err);
      if (this.aiStatusEl) {
        this.aiStatusEl.textContent = `⚠️ Errore di generazione: ${err.message}`;
      }
      this.showToast("Operazione AI non riuscita.", "warning");
    }
  }

  setBPM(bpm) {
    this.bpm = Math.max(60, Math.min(240, bpm));
    if (this.bpmInput) this.bpmInput.value = this.bpm;
    if (this.bpmDisplay) this.bpmDisplay.textContent = this.bpm;
  }

  bindDspSliders() {
    DSP_PARAM_MAPPINGS.forEach(item => {
      const el = document.getElementById(item.id);
      if (!el) return;

      const updateVal = (val) => {
        let finalVal = val;
        if (item.type === "int") finalVal = parseInt(val, 10);
        else if (item.type === "float") finalVal = parseFloat(val);
        this.synth.updateParam(item.param, finalVal);

        const valDisplay = document.getElementById(`${item.id}-val`);
        if (valDisplay) {
          valDisplay.textContent = typeof finalVal === "number" ? finalVal.toFixed(finalVal % 1 === 0 ? 0 : 2) : finalVal;
        }
      };

      el.addEventListener("input", (e) => updateVal(e.target.value));
      el.addEventListener("change", (e) => updateVal(e.target.value));
    });
  }

  updateKnobsUI() {
    const p = this.synth.params;
    DSP_PARAM_MAPPINGS.forEach(item => {
      const el = document.getElementById(item.id);
      if (!el || p[item.param] === undefined) return;
      el.value = p[item.param];
      const valDisplay = document.getElementById(`${item.id}-val`);
      if (valDisplay) {
        const v = p[item.param];
        valDisplay.textContent = typeof v === "number" ? v.toFixed(v % 1 === 0 ? 0 : 2) : v;
      }
    });
  }

  /**
   * Virtual On-Screen & Keyboard Jamming
   */
  initVirtualKeyboard() {
    const container = document.getElementById("virtual-keyboard-container");
    if (!container) return;

    container.innerHTML = "";
    const keyMap = {
      "KeyA": 60, "KeyW": 61, "KeyS": 62, "KeyE": 63, "KeyD": 64,
      "KeyF": 65, "KeyT": 66, "KeyG": 67, "KeyY": 68, "KeyH": 69, "KeyU": 70, "KeyJ": 71, "KeyK": 72
    };

    const keysWrapper = document.createElement("div");
    keysWrapper.className = "vk-keys-wrapper";

    for (let midi = 60; midi <= 83; midi++) {
      const name = CHROMATIC_NOTES[midi % 12];
      const octave = Math.floor(midi / 12) - 1;
      const isSharp = name.includes("#");
      const inScale = isNoteInScale(midi, this.rootNote, this.scaleId);
      const isRoot = name === this.rootNote;

      const keyEl = document.createElement("div");
      keyEl.className = `vk-key ${isSharp ? "vk-key-black" : "vk-key-white"} ${isRoot ? "vk-key-root" : ""} ${inScale ? "vk-key-in-scale" : ""}`;
      keyEl.dataset.midi = midi;
      keyEl.innerHTML = `<span class="vk-label">${name}${octave}</span>`;

      keyEl.addEventListener("mousedown", (e) => {
        e.preventDefault();
        this.synth.liveNoteOn(midi, 0.85);
        keyEl.classList.add("vk-pressed");
      });

      window.addEventListener("mouseup", () => {
        this.synth.liveNoteOff(midi);
        keyEl.classList.remove("vk-pressed");
      });

      keysWrapper.appendChild(keyEl);
    }
    container.appendChild(keysWrapper);

    window.addEventListener("keydown", (e) => {
      if (e.repeat || e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
      if (keyMap[e.code]) {
        const midi = keyMap[e.code];
        this.synth.liveNoteOn(midi, 0.85);
        const keyEl = keysWrapper.querySelector(`[data-midi="${midi}"]`);
        if (keyEl) keyEl.classList.add("vk-pressed");
      }
    });

    window.addEventListener("keyup", (e) => {
      if (keyMap[e.code]) {
        const midi = keyMap[e.code];
        this.synth.liveNoteOff(midi);
        const keyEl = keysWrapper.querySelector(`[data-midi="${midi}"]`);
        if (keyEl) keyEl.classList.remove("vk-pressed");
      }
    });
  }

  /**
   * Sequencer Playback Scheduler
   */
  async togglePlay() {
    await this.synth.initAudio();
    if (this.isPlaying) {
      this.stop();
    } else {
      this.start();
    }
  }

  start() {
    this.isPlaying = true;
    if (this.playBtn) {
      this.playBtn.innerHTML = `<span class="btn-icon">⏸</span> PAUSA`;
      this.playBtn.classList.add("btn-active-glow");
    }
    this.currentStep = 0;
    this.autoBarCount = 0;
    this.nextStepTime = this.synth.ctx.currentTime + 0.05;
    this.scheduler();
  }

  stop() {
    this.isPlaying = false;
    if (this.playBtn) {
      this.playBtn.innerHTML = `<span class="btn-icon">▶</span> RIPRODUCI`;
      this.playBtn.classList.remove("btn-active-glow");
    }
    clearTimeout(this.timerId);
    this.pianoRoll.setPlayhead(-1);
  }

  scheduler() {
    if (!this.isPlaying) return;

    while (this.nextStepTime < this.synth.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleStep(this.currentStep, this.nextStepTime);
      this.advanceStep();
    }

    this.timerId = setTimeout(() => this.scheduler(), this.lookahead);
  }

  advanceStep() {
    const secondsPer16th = 60.0 / (this.bpm * 4);
    this.nextStepTime += secondsPer16th;
    this.currentStep = (this.currentStep + 1) % this.numSteps;

    // Se completata una battuta (ritorno allo step 0), gestisci l'AUTO evolve
    if (this.currentStep === 0) {
      this.autoBarCount++;
      if (this.autoEvolveActive && (this.autoBarCount % this.autoEvolveInterval === 0)) {
        this.evolveMelody(true);
      }
    }
  }

  scheduleStep(step, time) {
    const delayMs = Math.max(0, (time - this.synth.ctx.currentTime) * 1000);
    setTimeout(() => {
      if (this.isPlaying) this.pianoRoll.setPlayhead(step);
    }, delayMs);

    // Esegui Cassa di Riferimento se abilitata
    const shouldKick = this.currentKickRhythmFn ? this.currentKickRhythmFn(step) : (step % 4 === 0);
    if (shouldKick) {
      this.synth.triggerReferenceKick(time, this.rootNote);
    }

    // Esegui note synth sullo step
    const notes = this.pianoRoll.getNotesArray().filter(n => n.step === step && n.active);
    const secondsPer16th = 60.0 / (this.bpm * 4);

    notes.forEach(noteItem => {
      const noteDuration = (noteItem.gate || 1) * secondsPer16th * 0.95;
      this.synth.triggerNote(
        noteItem.midi,
        noteDuration,
        noteItem.velocity || 0.85,
        time
      );
    });
  }

  /**
   * Carica un template melodico preimpostato intonato alla tonalità attuale
   */
  loadTemplateMelody(templateId) {
    const tmpl = MELODY_TEMPLATES[templateId];
    if (!tmpl) return;

    const scale = SCALES[this.scaleId] || SCALES.minor_natural;
    const rootIndex = CHROMATIC_NOTES.indexOf(this.rootNote);
    const scaleSemitones = scale.intervals;

    const degrees = tmpl.generate(this.rootNote, this.scaleId, this.numSteps);
    const newNotes = [];
    const baseMidi = 60 + rootIndex;

    degrees.forEach((deg, step) => {
      if (deg === null || deg === undefined) return;
      const octaveShift = Math.floor(deg / scaleSemitones.length);
      const degreeInScale = deg % scaleSemitones.length;
      const semitoneOffset = scaleSemitones[degreeInScale] + octaveShift * 12;
      const targetMidi = baseMidi + semitoneOffset;

      newNotes.push({
        step: step,
        midi: targetMidi,
        velocity: 0.85,
        gate: 1,
        active: 1
      });
    });

    this.pianoRoll.setNotesArray(newNotes);
    this.showToast(`✨ Caricato pattern: ${tmpl.name}`, "success");
  }

  generateRandomMelodyInScale() {
    const scale = SCALES[this.scaleId] || SCALES.minor_natural;
    const rootIndex = CHROMATIC_NOTES.indexOf(this.rootNote);
    const intervals = scale.intervals;
    const baseMidi = 60 + rootIndex;

    const newNotes = [];
    for (let s = 0; s < this.numSteps; s++) {
      if (Math.random() < 0.72) {
        const randInterval = intervals[Math.floor(Math.random() * intervals.length)];
        const randOctave = Math.random() < 0.3 ? 12 : 0;
        const midi = baseMidi + randInterval + randOctave;
        newNotes.push({
          step: s,
          midi: midi,
          velocity: 0.7 + Math.random() * 0.3,
          gate: Math.random() < 0.25 ? 2 : 1,
          active: 1
        });
      }
    }

    this.pianoRoll.setNotesArray(newNotes);
    this.showToast(`🎲 Nuova melodia generata su ${this.rootNote} ${scale.name}!`, "success");
  }

  async handleExportWav() {
    const notes = this.pianoRoll.getNotesArray();
    if (notes.length === 0) {
      this.showToast("⚠️ Il pattern è vuoto! Aggiungi qualche nota prima di esportare.", "warning");
      return;
    }

    const includeKick = confirm("Vuoi includere anche il colpo di cassa intonato nel file WAV esportato?\n(Consigliato per testare il mix e il groove)");
    this.showToast("⏳ Rendering audio WAV ad alta definizione in corso...", "info");

    try {
      const wavBlob = await this.synth.renderWavBlob(notes, this.bpm, this.numSteps, this.rootNote, includeKick);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `melodyforge_${this.rootNote}_${this.scaleId}_${this.bpm}bpm.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.showToast("✅ File audio WAV scaricato con successo!", "success");
    } catch (err) {
      console.error("WAV render error:", err);
      this.showToast("❌ Errore durante il rendering del file WAV", "warning");
    }
  }

  handleExportMidi() {
    const notes = this.pianoRoll.getNotesArray();
    if (notes.length === 0) {
      this.showToast("⚠️ Il pattern è vuoto! Aggiungi note prima di esportare.", "warning");
      return;
    }

    const scaleName = SCALES[this.scaleId]?.name || "Scale";
    MidiExporter.downloadMidi(notes, this.bpm, this.numSteps, this.rootNote, scaleName);
    this.showToast("🎹 File MIDI (.mid) esportato! Trascinalo nella tua DAW.", "success");
  }

  showToast(message, type = "info") {
    if (!this.toastContainer) return;
    const toast = document.createElement("div");
    toast.className = `app-toast app-toast-${type}`;
    toast.textContent = message;
    this.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("toast-fade-out");
      setTimeout(() => toast.remove(), 400);
    }, 3200);
  }
}

// Avvia l'applicazione quando il DOM è pronto
document.addEventListener("DOMContentLoaded", () => {
  window.melodyApp = new MelodyApp();
});

export { MelodyApp };
