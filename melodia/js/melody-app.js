/**
 * MelodyForge Studio - Main Application Controller
 * Coordina l'interfaccia utente, il sintetizzatore Web Audio, il Piano Roll,
 * il sequencer con scheduling ad alta precisione, l'intonazione e l'esportazione.
 */

import { CHROMATIC_NOTES, SCALES, isNoteInScale, KICK_TUNING_PRESETS, detectNoteFromFrequency, midiToFreq, noteNameToMidi } from "./scales.js";
import { INSTRUMENT_PRESETS, MELODY_TEMPLATES } from "./instruments.js";
import { MelodySynthEngine } from "./synth-engine.js";
import { PianoRoll } from "./piano-roll.js";
import { MidiExporter } from "./midi-export.js";

class MelodyApp {
  constructor() {
    this.synth = new MelodySynthEngine();
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

    // Metronomo & Kick Reference
    this.metronomeActive = false;
    this.kickReferenceActive = true;
    this.synth.kickEnabled = true;

    this.initDOM();
    this.initPianoRoll();
    this.initInstruments();
    this.initScalesUI();
    this.initControls();
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
  }

  initPianoRoll() {
    const container = document.getElementById("pianoroll-container");
    this.pianoRoll = new PianoRoll({
      container: container,
      synthEngine: this.synth,
      numSteps: this.numSteps,
      onNotesChange: (notes) => {
        // Callback se necessario per salvare o aggiornare statistiche
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

  applyInstrumentPreset(presetId) {
    const preset = INSTRUMENT_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    this.synth.params = { ...this.synth.params, ...preset.params };
    this.updateKnobsUI();
    this.showToast(`🎸 Caricato strumento: ${preset.name}`, "info");

    // Aggiorna descrizione
    const descEl = document.getElementById("instrument-description");
    if (descEl) descEl.textContent = preset.description;
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
      // Prova a leggere l'ultimo preset o la coda della cassa memorizzata
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

    // Fallback intuitivo: chiedi o applica la nota più potente per il genere (Fa / F)
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

    // Template Generator Dropdown/Buttons
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

  setBPM(bpm) {
    this.bpm = Math.max(60, Math.min(240, bpm));
    if (this.bpmInput) this.bpmInput.value = this.bpm;
    if (this.bpmDisplay) this.bpmDisplay.textContent = this.bpm;
  }

  bindDspSliders() {
    const sliderIds = [
      // OSC
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
      // VCF
      { id: "filter-type", param: "filter_type", type: "val" },
      { id: "filter-cutoff", param: "filter_cutoff", type: "float" },
      { id: "filter-resonance", param: "filter_resonance", type: "float" },
      { id: "filter-env-amt", param: "filter_env_amount", type: "float" },
      // AMP ADSR
      { id: "amp-attack", param: "amp_attack", type: "float" },
      { id: "amp-decay", param: "amp_decay", type: "float" },
      { id: "amp-sustain", param: "amp_sustain", type: "float" },
      { id: "amp-release", param: "amp_release", type: "float" },
      // FILTER ADSR
      { id: "filt-attack", param: "filter_attack", type: "float" },
      { id: "filt-decay", param: "filter_decay", type: "float" },
      { id: "filt-sustain", param: "filter_sustain", type: "float" },
      { id: "filt-release", param: "filter_release", type: "float" },
      // LFO
      { id: "lfo-target", param: "lfo_target", type: "val" },
      { id: "lfo-rate", param: "lfo_rate", type: "float" },
      { id: "lfo-depth", param: "lfo_depth", type: "float" },
      // FX
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

    sliderIds.forEach(item => {
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
    Object.keys(p).forEach(key => {
      const el = document.querySelector(`[data-param="${key}"]`) || document.getElementById(key.replace(/_/g, "-"));
      if (el) {
        el.value = p[key];
        const valDisplay = document.getElementById(`${el.id}-val`);
        if (valDisplay) {
          const v = p[key];
          valDisplay.textContent = typeof v === "number" ? v.toFixed(v % 1 === 0 ? 0 : 2) : v;
        }
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
    // Visualizza 2 ottave da C4 (60) a B5 (83)
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

    // Gestione tastiera fisica del computer
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
  }

  scheduleStep(step, time) {
    // 1. Aggiorna indicatore visuale in sync con il rendering visivo
    const delayMs = Math.max(0, (time - this.synth.ctx.currentTime) * 1000);
    setTimeout(() => {
      if (this.isPlaying) this.pianoRoll.setPlayhead(step);
    }, delayMs);

    // 2. Esegui Cassa di Riferimento se abilitata (ogni battere di 1/4: step 0, 4, 8, 12...)
    if (step % 4 === 0) {
      this.synth.triggerReferenceKick(time, this.rootNote);
    }

    // 3. Esegui tutte le note del synth posizionate su questo step
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

    // Genera note
    const degrees = tmpl.generate(this.rootNote, this.scaleId, this.numSteps);
    const newNotes = [];

    // Ottava base (4 o 5)
    const baseMidi = 60 + rootIndex; // C4 + root offset

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

  /**
   * Generatore algoritmico casuale sempre intonato sulla scala attiva
   */
  generateRandomMelodyInScale() {
    const scale = SCALES[this.scaleId] || SCALES.minor_natural;
    const rootIndex = CHROMATIC_NOTES.indexOf(this.rootNote);
    const intervals = scale.intervals;
    const baseMidi = 60 + rootIndex;

    const newNotes = [];
    for (let s = 0; s < this.numSteps; s++) {
      // 70% di probabilità di avere una nota sullo step
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

  /**
   * Esportazione del file audio WAV ad alta definizione
   */
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

  /**
   * Esportazione del file standard MIDI (.MID) per DAW
   */
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
