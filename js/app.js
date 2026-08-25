/**
 * KickForge 303 - App Orchestrator V3 (Cassa & Basso Completo)
 */

import { KickSynthEngine } from "./audio-engine.js";
import { PresetManager, PRESETS, PRESET_CATEGORIES, DEFAULT_KICK_PARAMS } from "./presets.js";
import { BassPresetManager, BASS_PRESETS, BASS_PRESET_CATEGORIES, DEFAULT_BASS_PARAMS } from "./bass-presets.js";
import { Visualizer } from "./visualizer.js";
import { StepSequencer } from "./sequencer.js";
import { UIManager } from "./ui.js";

const AVAILABLE_NOTES = [
  "C1", "C#1", "D1", "D#1", "E1", "F1", "F#1", "G1", "G#1", "A1", "A#1", "B1",
  "C2", "C#2", "D2", "D#2", "E2", "F2", "F#2", "G2", "G#2", "A2", "A#2", "B2",
  "C3"
];

class KickForgeApp {
  constructor() {
    this.audioEngine = new KickSynthEngine();
    this.presetManager = new PresetManager();
    this.bassPresetManager = new BassPresetManager();
    this.uiManager = new UIManager(this);

    this.currentKickCategory = "all";
    this.currentBassCategory = "all";

    this.currentKickParams = { ...DEFAULT_KICK_PARAMS, ...PRESETS[0].params };
    this.currentBassParams = { ...DEFAULT_BASS_PARAMS, ...BASS_PRESETS[0].params };

    // Livelli mixer (cassa/basso)
    this.mixKickLevel = 1.0;
    this.mixBassLevel = 1.0;

    this.currentBpm = PRESETS[0].bpm || 175;
    this.currentKickPresetId = PRESETS[0].id;
    this.currentBassPresetId = BASS_PRESETS[0].id;

    this.visualizer = null;
    this.sequencer = null;

    this.init();
  }

  init() {
    const canvas = document.getElementById("visualizer-canvas");
    this.visualizer = new Visualizer(canvas, null);
    this.visualizer.start();

    this.sequencer = new StepSequencer(this.audioEngine, (step) => {
      this.updateSequencerUI(step);
    });
    this.sequencer.setKickParamsGetter(() => this.currentKickParams);
    this.sequencer.setBassParamsGetter(() => this.currentBassParams);
    this.sequencer.setBpm(this.currentBpm);

    this.uiManager.initKnobs((paramName, value) => {
      if (paramName.startsWith("bass_")) {
        this.currentBassParams[paramName] = value;
        if (!this.sequencer.isPlaying) {
          this.audioEngine.triggerBassNote(this.currentBassParams, { note: "C2", active: 1, accent: 1 }, null, 0.25, true);
        }
      } else {
        this.currentKickParams[paramName] = value;
        if (!this.sequencer.isPlaying) {
          this.debounceKickTrigger();
        }
      }
    });

    this.renderKickCategoryTabs();
    this.renderKickPresets();

    this.renderBassCategoryTabs();
    this.renderBassPresets();

    this.renderBassSequencerGrid();
    this.bindEvents();

    this.loadKickPreset(this.currentKickPresetId);
    this.loadBassPreset(this.currentBassPresetId);
  }

  debounceKickTrigger() {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      this.triggerKick();
    }, 35);
  }

  triggerKick(vel = 1.0) {
    this.audioEngine.init();
    this.visualizer.setAnalyser(this.audioEngine.analyserNode);
    this.audioEngine.triggerKick(this.currentKickParams, vel);

    const pad = document.getElementById("trigger-pad-btn");
    if (pad) {
      pad.classList.add("active");
      setTimeout(() => pad.classList.remove("active"), 90);
    }
  }

  // ==========================================
  // GESTIONE PRESET CASSA
  // ==========================================
  renderKickCategoryTabs() {
    const container = document.getElementById("category-tabs-container");
    if (!container) return;

    container.innerHTML = "";
    PRESET_CATEGORIES.forEach(cat => {
      const btn = document.createElement("button");
      btn.className = `cat-tab-btn ${cat.id === this.currentKickCategory ? "active" : ""}`;
      btn.textContent = cat.label;
      btn.addEventListener("click", () => {
        this.currentKickCategory = cat.id;
        container.querySelectorAll(".cat-tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.renderKickPresets();
      });
      container.appendChild(btn);
    });
  }

  renderKickPresets() {
    const presetSelect = document.getElementById("preset-select");
    const quickGrid = document.getElementById("quick-presets-grid");
    const filtered = this.presetManager.getPresetsByCategory(this.currentKickCategory);

    if (presetSelect) {
      presetSelect.innerHTML = "";
      filtered.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = `${p.name} [${p.bpm} BPM]`;
        presetSelect.appendChild(opt);
      });
      presetSelect.value = this.currentKickPresetId;
    }

    if (quickGrid) {
      quickGrid.innerHTML = "";
      if (filtered.length === 0) {
        quickGrid.innerHTML = `<span class="empty-msg">Nessuna cassa in questa categoria. Salva la tua!</span>`;
      } else {
        filtered.forEach(p => {
          const btn = document.createElement("button");
          btn.className = `quick-preset-btn ${p.id === this.currentKickPresetId ? "active" : ""}`;
          btn.innerHTML = `<span class="p-name">${p.name}</span><span class="p-bpm">${p.bpm} BPM</span>`;
          btn.addEventListener("click", () => {
            this.loadKickPreset(p.id);
            this.triggerKick();
          });
          quickGrid.appendChild(btn);
        });
      }
    }
  }

  loadKickPreset(presetId) {
    const preset = this.presetManager.getPresetById(presetId);
    if (!preset) return;

    this.currentKickPresetId = preset.id;
    this.currentKickParams = { ...DEFAULT_KICK_PARAMS, ...preset.params };
    this.currentBpm = preset.bpm || 140;

    this.sequencer.setBpm(this.currentBpm);
    const bpmInput = document.getElementById("bpm-input");
    const bpmSlider = document.getElementById("bpm-slider");
    if (bpmInput) bpmInput.value = this.currentBpm;
    if (bpmSlider) bpmSlider.value = this.currentBpm;

    const bottaSlider = document.getElementById("super-botta-slider");
    const extremeToggle = document.getElementById("toggle-extreme-mode");
    if (bottaSlider) {
      bottaSlider.value = this.currentKickParams.super_botta || 1.8;
      this.updateSuperBottaText(this.currentKickParams.super_botta || 1.8);
    }
    if (extremeToggle) {
      extremeToggle.checked = !!this.currentKickParams.extreme_mode;
    }

    Object.keys(this.currentKickParams).forEach(param => {
      this.uiManager.setKnobValue(param, this.currentKickParams[param]);
    });

    this.updateKickControlsFromParams();

    const presetSelect = document.getElementById("preset-select");
    if (presetSelect) presetSelect.value = presetId;

    const descEl = document.getElementById("preset-description");
    if (descEl) descEl.textContent = preset.description || "";

    const deleteBtn = document.getElementById("delete-current-preset-btn");
    if (deleteBtn) {
      deleteBtn.style.display = preset.isCustom ? "inline-flex" : "none";
    }
    const updateBtn = document.getElementById("update-current-preset-btn");
    if (updateBtn) {
      updateBtn.style.display = preset.isCustom ? "inline-flex" : "none";
    }

    document.querySelectorAll(".quick-presets-grid .quick-preset-btn").forEach(btn => {
      const isMatch = btn.querySelector(".p-name")?.textContent === preset.name;
      btn.classList.toggle("active", isMatch);
    });

    this.uiManager.showToast(`Cassa caricata: ${preset.name}`, "info");
  }

  updateSuperBottaText(val) {
    const textEl = document.getElementById("super-botta-text");
    if (!textEl) return;
    const num = parseFloat(val);
    let label = "NORMALE";
    if (num >= 2.4) label = "💥 DISTRUTTIVA / EXTREME";
    else if (num >= 1.9) label = "⚡ DEVASTANTE";
    else if (num >= 1.4) label = "🔥 MOLTO FORTE";
    textEl.textContent = `${num.toFixed(1)}x (${label})`;
  }

  updateKickControlsFromParams() {
    const wave303 = document.querySelector(`input[name="attack303_waveform"][value="${this.currentKickParams.attack303_waveform}"]`);
    if (wave303) wave303.checked = true;

    const waveBody = document.querySelector(`input[name="body_waveform"][value="${this.currentKickParams.body_waveform}"]`);
    if (waveBody) waveBody.checked = true;

    const driveType = document.querySelector(`input[name="drive_type"][value="${this.currentKickParams.drive_type}"]`);
    if (driveType) driveType.checked = true;

    const waveScreech = document.querySelector(`input[name="screech_waveform"][value="${this.currentKickParams.screech_waveform}"]`);
    if (waveScreech) waveScreech.checked = true;

    const toggleScreech = document.getElementById("toggle-screech");
    if (toggleScreech) toggleScreech.checked = !!this.currentKickParams.screech_enabled;

    const toggle303 = document.getElementById("toggle-attack303");
    if (toggle303) toggle303.checked = !!this.currentKickParams.attack303_enabled;

    const toggleBody = document.getElementById("toggle-body");
    if (toggleBody) toggleBody.checked = !!this.currentKickParams.body_enabled;

    const toggleRumble = document.getElementById("toggle-rumble");
    if (toggleRumble) toggleRumble.checked = !!this.currentKickParams.rumble_enabled;
  }

  // ==========================================
  // GENERATORE CASSA CON AI
  // ==========================================
  applyKickParams(params, bpm, description = "") {
    this.currentKickParams = { ...DEFAULT_KICK_PARAMS, ...params };
    if (bpm) {
      this.currentBpm = bpm;
      this.sequencer.setBpm(bpm);
      const bpmInput = document.getElementById("bpm-input");
      const bpmSlider = document.getElementById("bpm-slider");
      if (bpmInput) bpmInput.value = bpm;
      if (bpmSlider) bpmSlider.value = bpm;
    }

    const bottaSlider = document.getElementById("super-botta-slider");
    const extremeToggle = document.getElementById("toggle-extreme-mode");
    if (bottaSlider) {
      bottaSlider.value = this.currentKickParams.super_botta || 1.6;
      this.updateSuperBottaText(this.currentKickParams.super_botta || 1.6);
    }
    if (extremeToggle) extremeToggle.checked = !!this.currentKickParams.extreme_mode;

    Object.keys(this.currentKickParams).forEach(param => {
      this.uiManager.setKnobValue(param, this.currentKickParams[param]);
    });
    this.updateKickControlsFromParams();

    if (description) {
      const descEl = document.getElementById("preset-description");
      if (descEl) descEl.textContent = description;
    }
  }

  async generateWithAI(prompt, opts = {}) {
    const target = opts.target === "bass" ? "bass" : "kick";
    const tweak = !!opts.tweak;
    const genBtn = document.getElementById("ai-generate-btn");
    const modBtn = document.getElementById("ai-modify-btn");
    const status = document.getElementById("ai-gen-status");
    const setStatus = (msg, type) => {
      if (!status) return;
      status.textContent = msg;
      status.className = `ai-gen-status ${type ? "status-" + type : ""}`;
      status.style.display = msg ? "block" : "none";
    };
    const targetLabel = target === "bass" ? "basso" : "cassa";

    [genBtn, modBtn].forEach(b => { if (b) b.disabled = true; });
    setStatus(`🎛️ L'AI sta ${tweak ? "modificando" : "progettando"} il ${targetLabel}…`, "info");

    try {
      const current = tweak
        ? { params: target === "bass" ? this.currentBassParams : this.currentKickParams }
        : undefined;

      const res = await fetch("/api/generate-preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, target, current })
      });

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        // Tipico in locale (server statico) dove /api non esiste
        throw new Error("La funzione AI non è raggiungibile qui. Funziona dopo il deploy su Vercel (o con `vercel dev`) con la chiave AI configurata.");
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.hint ? `${data.error} ${data.hint}` : (data.error || "Errore di generazione."));
      }

      if ((data.target || target) === "bass") {
        this.applyBassParams(data.params);
      } else {
        this.applyKickParams(data.params, data.bpm, `🤖 ${data.name} — ${tweak ? "modificata" : "generata"} dall'AI (${data.model || "modello"}).`);
        this.triggerKick();
      }

      setStatus(`✅ "${data.name}" ${tweak ? "modificato" : "generato"}! Rifinisci e premi 💾 Salva Suono per tenerlo.`, "success");
      this.uiManager.showToast(`AI: ${data.name}`, "success");
    } catch (err) {
      console.error("AI generate error:", err);
      setStatus(`⚠️ ${err.message}`, "error");
      this.uiManager.showToast("Operazione AI non riuscita.", "error");
    } finally {
      [genBtn, modBtn].forEach(b => { if (b) b.disabled = false; });
    }
  }

  // ==========================================
  // APPLICA PARAMETRI BASSO (per variazioni / AI)
  // ==========================================
  applyBassParams(params) {
    this.currentBassParams = { ...DEFAULT_BASS_PARAMS, ...params };
    Object.keys(this.currentBassParams).forEach(p => this.uiManager.setKnobValue(p, this.currentBassParams[p]));

    const wave1 = document.querySelector(`input[name="bass_osc1_wave"][value="${this.currentBassParams.bass_osc1_wave}"]`);
    if (wave1) wave1.checked = true;
    const wave2 = document.querySelector(`input[name="bass_osc2_wave"][value="${this.currentBassParams.bass_osc2_wave}"]`);
    if (wave2) wave2.checked = true;
    const toggleBass = document.getElementById("toggle-bass-module");
    if (toggleBass) toggleBass.checked = !!this.currentBassParams.bass_enabled;

    if (!this.sequencer.isPlaying) {
      this.audioEngine.triggerBassNote(this.currentBassParams, { note: "C2", active: 1, accent: 1 }, null, 0.25, true);
    }
  }

  // ==========================================
  // CREA VARIAZIONI (mutazione musicale dei parametri)
  // ==========================================
  mutateParams(params, intensity) {
    const out = { ...params };
    document.querySelectorAll(".rotary-knob").forEach(knob => {
      const p = knob.dataset.param;
      if (!(p in out) || typeof out[p] !== "number") return;
      const min = parseFloat(knob.dataset.min);
      const max = parseFloat(knob.dataset.max);
      const step = parseFloat(knob.dataset.step || 0);
      const range = max - min;
      let v = out[p] + (Math.random() * 2 - 1) * intensity * range;
      v = Math.min(max, Math.max(min, v));
      if (step > 0) v = Math.round((v - min) / step) * step + min;
      out[p] = v;
    });
    return out;
  }

  variateKick(intensity = 0.22) {
    const p = this.mutateParams(this.currentKickParams, intensity);
    if (Math.random() < 0.35) p.screech_enabled = !p.screech_enabled;
    if (Math.random() < 0.30) p.drive_type = ["tube", "diode", "hard"][Math.floor(Math.random() * 3)];
    if (Math.random() < 0.25) p.body_waveform = Math.random() < 0.5 ? "sine" : "triangle";
    this.applyKickParams(p, this.currentBpm, "🎲 Variazione della cassa — regola e premi 💾 Salva Suono se ti piace.");
    if (!this.sequencer.isPlaying) this.triggerKick(); // in live il loop prende i nuovi parametri da solo
    this.uiManager.showToast("🎲 Variazione cassa creata", "info");
  }

  variateBass(intensity = 0.22) {
    const p = this.mutateParams(this.currentBassParams, intensity);
    if (Math.random() < 0.30) p.bass_osc1_wave = Math.random() < 0.5 ? "sawtooth" : "square";
    if (Math.random() < 0.30) p.bass_osc2_wave = Math.random() < 0.5 ? "square" : "sawtooth";
    this.applyBassParams(p);
    this.uiManager.showToast("🎲 Variazione basso creata", "info");
  }

  // Varia l'ORDINE del groove: pattern di cassa, hi-hat e note/ottave del basso.
  // Funziona anche in play: il sequencer legge i pattern ad ogni step.
  variatePattern() {
    const seq = this.sequencer;

    // CASSA: SEMPRE il "tunz tunz tunz" — four-on-the-floor, il fondamento di
    // tutta la famiglia techno. Non si randomizza: varia solo il resto attorno.
    seq.kickSteps = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
    seq.kickVelocities = [1.0, 0.7, 0.7, 0.7, 0.95, 0.7, 0.7, 0.7, 0.95, 0.7, 0.7, 0.7, 0.95, 0.7, 0.7, 0.7];

    // HI-HAT: classico levare techno (l'"off-beat" tra un tunz e l'altro),
    // con qualche 16esimo in più per movimento.
    const nh = new Array(16).fill(0);
    for (let i = 0; i < 16; i++) {
      const offbeat = (i % 4 === 2);   // levare: 3° sedicesimo di ogni movimento
      nh[i] = Math.random() < (offbeat ? 0.85 : 0.2) ? 1 : 0;
    }
    seq.hihatSteps = nh;

    // BASSO: nuovo ordine di note e ottave, restando sulle note già usate (tonalità)
    const usedRoots = [...new Set(
      seq.bassPattern.filter(s => s.active).map(s => s.note.replace(/-?\d+/, ""))
    )];
    const roots = usedRoots.length ? usedRoots : ["C", "D#", "F", "G", "A#"];
    const octs = ["1", "2", "2"]; // mix ottava 1 (profonda) e 2
    for (let i = 0; i < 16; i++) {
      const s = seq.bassPattern[i];
      s.active = Math.random() < 0.55 ? 1 : 0;
      if (s.active) {
        const root = roots[Math.floor(Math.random() * roots.length)];
        const cand = root + octs[Math.floor(Math.random() * octs.length)];
        s.note = AVAILABLE_NOTES.includes(cand)
          ? cand
          : (AVAILABLE_NOTES.includes(root + "2") ? root + "2" : "C2");
        s.accent = Math.random() < 0.4 ? 1 : 0;
        s.slide = Math.random() < 0.3 ? 1 : 0;
      } else {
        s.accent = 0;
        s.slide = 0;
      }
    }
    if (!seq.bassPattern.some(s => s.active)) seq.bassPattern[0].active = 1;

    // Aggiorna la UI (griglie cassa, hi-hat, basso)
    this.refreshKickSequencerStepsUI();
    this.refreshHiHatStepsUI();
    this.renderBassSequencerGrid();
    document.querySelectorAll(".pattern-btn").forEach(b => b.classList.remove("active"));
    this.uiManager.showToast("🎲 Nuovo groove: cassa, basso (note/ottave) e hi-hat", "info");
  }

  refreshHiHatStepsUI() {
    document.querySelectorAll(".seq-step[data-track='hihat']").forEach((btn, idx) => {
      btn.classList.toggle("active", !!this.sequencer.hihatSteps[idx]);
    });
  }

  // ==========================================
  // FILL / TRICK — variazioni rapide "one-shot"
  // In play: il fill suona per ~1 battuta poi torna al groove precedente.
  // Da fermo: viene applicato in modo persistente (così lo vedi/senti).
  // ==========================================
  applyFill(type) {
    const seq = this.sequencer;

    // se un fill è già attivo, ripristina subito prima di lanciarne un altro
    if (this._fillTimer) { clearTimeout(this._fillTimer); this._fillTimer = null; this._restoreFill(); }

    // snapshot del groove attuale
    this._fillSnapshot = {
      kick: seq.kickSteps.slice(),
      kickVel: seq.kickVelocities.slice(),
      hihat: seq.hihatSteps.slice(),
      hihatEnabled: seq.hihatEnabled,
      bass: JSON.parse(JSON.stringify(seq.bassPattern))
    };

    const roots = [...new Set(seq.bassPattern.filter(s => s.active).map(s => s.note.replace(/-?\d+/, "")))];
    const pool = roots.length ? roots : ["C"];
    const setBass = (i, root, oct, acc, sld) => {
      const cand = root + oct;
      seq.bassPattern[i] = {
        note: AVAILABLE_NOTES.includes(cand) ? cand : (AVAILABLE_NOTES.includes(root + "2") ? root + "2" : "C2"),
        active: 1, accent: acc ? 1 : 0, slide: sld ? 1 : 0
      };
    };

    let label = "Fill";
    if (type === "kick") {
      label = "Rullata Cassa";
      for (let i = 12; i < 16; i++) seq.kickSteps[i] = 1;             // roll di cassa sull'ultima battuta
      seq.kickVelocities[12] = 0.85; seq.kickVelocities[13] = 0.9;
      seq.kickVelocities[14] = 0.95; seq.kickVelocities[15] = 1.0;   // crescendo
    } else if (type === "hats") {
      label = "Roll Hats";
      for (let i = 0; i < 16; i++) seq.hihatSteps[i] = 1;            // shimmer 16esimi
      seq.hihatEnabled = true;
    } else if (type === "bass") {
      label = "Rullata Basso";
      for (let i = 0; i < 16; i++) {
        const root = pool[i % pool.length];
        setBass(i, root, (i % 2 === 0) ? "1" : "2", i % 4 === 0, i % 2 === 1); // 16esimi con salti d'ottava
      }
    } else if (type === "break") {
      label = "Break";
      for (let i = 0; i < 16; i++) {
        seq.kickSteps[i] = (i % 2 === 0) ? 1 : (Math.random() < 0.5 ? 1 : 0);
        seq.hihatSteps[i] = 1;
      }
      seq.hihatEnabled = true;
      for (let i = 0; i < 16; i++) {
        const root = pool[Math.floor(Math.random() * pool.length)];
        setBass(i, root, (i % 2 ? "2" : "1"), i % 4 === 0, i % 3 === 0);
      }
    }

    this.refreshKickSequencerStepsUI();
    this.refreshHiHatStepsUI();
    this.renderBassSequencerGrid();
    this.uiManager.showToast(`💥 ${label}!`, "info");

    // one-shot: in play torna al groove dopo una battuta (4/4)
    if (seq.isPlaying) {
      const barMs = (60 / this.currentBpm) * 4 * 1000;
      this._fillTimer = setTimeout(() => { this._fillTimer = null; this._restoreFill(); }, barMs);
    }
  }

  _restoreFill() {
    if (!this._fillSnapshot) return;
    const seq = this.sequencer;
    seq.kickSteps = this._fillSnapshot.kick;
    seq.kickVelocities = this._fillSnapshot.kickVel;
    seq.hihatSteps = this._fillSnapshot.hihat;
    seq.hihatEnabled = this._fillSnapshot.hihatEnabled;
    seq.bassPattern = this._fillSnapshot.bass;
    this._fillSnapshot = null;
    this.refreshKickSequencerStepsUI();
    this.refreshHiHatStepsUI();
    this.renderBassSequencerGrid();
  }

  // ==========================================
  // GESTIONE PRESET BASSO
  // ==========================================
  renderBassCategoryTabs() {
    const container = document.getElementById("bass-category-tabs-container");
    if (!container) return;

    container.innerHTML = "";
    BASS_PRESET_CATEGORIES.forEach(cat => {
      const btn = document.createElement("button");
      btn.className = `cat-tab-btn ${cat.id === this.currentBassCategory ? "active" : ""}`;
      btn.textContent = cat.label;
      btn.addEventListener("click", () => {
        this.currentBassCategory = cat.id;
        container.querySelectorAll(".cat-tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.renderBassPresets();
      });
      container.appendChild(btn);
    });
  }

  renderBassPresets() {
    const presetSelect = document.getElementById("bass-preset-select");
    const filtered = this.bassPresetManager.getPresetsByCategory(this.currentBassCategory);

    if (presetSelect) {
      presetSelect.innerHTML = "";
      filtered.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = `${p.name} (${p.categoryLabel})`;
        presetSelect.appendChild(opt);
      });
      presetSelect.value = this.currentBassPresetId;
    }
  }

  loadBassPreset(presetId) {
    const preset = this.bassPresetManager.getPresetById(presetId);
    if (!preset) return;

    this.currentBassPresetId = preset.id;
    this.currentBassParams = { ...DEFAULT_BASS_PARAMS, ...preset.params };

    if (preset.pattern) {
      this.sequencer.setBassPattern(preset.pattern);
      this.renderBassSequencerGrid();
    }

    Object.keys(this.currentBassParams).forEach(param => {
      this.uiManager.setKnobValue(param, this.currentBassParams[param]);
    });

    const wave1 = document.querySelector(`input[name="bass_osc1_wave"][value="${this.currentBassParams.bass_osc1_wave}"]`);
    if (wave1) wave1.checked = true;

    const wave2 = document.querySelector(`input[name="bass_osc2_wave"][value="${this.currentBassParams.bass_osc2_wave}"]`);
    if (wave2) wave2.checked = true;

    const toggleBass = document.getElementById("toggle-bass-module");
    if (toggleBass) toggleBass.checked = !!this.currentBassParams.bass_enabled;

    const presetSelect = document.getElementById("bass-preset-select");
    if (presetSelect) presetSelect.value = presetId;

    this.uiManager.showToast(`Basso caricato: ${preset.name}`, "info");
  }

  // ==========================================
  // RENDERING GRIGLIA SEQUENCER BASSO A 16 STEP
  // ==========================================
  renderBassSequencerGrid() {
    const grid = document.getElementById("bass-steps-grid");
    if (!grid) return;

    grid.innerHTML = "";
    this.sequencer.bassPattern.forEach((step, idx) => {
      const col = document.createElement("div");
      col.className = `bass-step-column ${step.active ? "active" : ""}`;
      col.dataset.step = idx;

      // 1. Tasto Trigger Step
      const triggerBtn = document.createElement("button");
      triggerBtn.className = `seq-step seq-bass-step ${step.active ? "active" : ""}`;
      triggerBtn.dataset.step = idx;
      triggerBtn.textContent = idx + 1;
      triggerBtn.addEventListener("click", () => {
        const active = this.sequencer.toggleStep("bass", idx);
        col.classList.toggle("active", !!active);
        triggerBtn.classList.toggle("active", !!active);
        if (active && !this.sequencer.isPlaying) {
          this.audioEngine.triggerBassNote(this.currentBassParams, step, null, 0.25, !!this.sequencer.kickSteps[idx]);
        }
      });

      // 2. Selettore Nota Musicale
      const noteSelect = document.createElement("select");
      noteSelect.className = "bass-note-select";
      AVAILABLE_NOTES.forEach(n => {
        const opt = document.createElement("option");
        opt.value = n;
        opt.textContent = n;
        noteSelect.appendChild(opt);
      });
      noteSelect.value = step.note || "C2";
      noteSelect.addEventListener("change", (e) => {
        this.sequencer.setBassStepNote(idx, e.target.value);
        if (!this.sequencer.isPlaying) {
          this.audioEngine.triggerBassNote(this.currentBassParams, this.sequencer.bassPattern[idx], null, 0.25, !!this.sequencer.kickSteps[idx]);
        }
      });

      // 3. Tasto Accent
      const accBtn = document.createElement("button");
      accBtn.className = `step-flag-btn acc-btn ${step.accent ? "active" : ""}`;
      accBtn.textContent = "ACC";
      accBtn.title = "Accento 303 (Più volume e squelch acido)";
      accBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const acc = this.sequencer.toggleBassStepAccent(idx);
        accBtn.classList.toggle("active", !!acc);
      });

      // 4. Tasto Slide
      const sldBtn = document.createElement("button");
      sldBtn.className = `step-flag-btn sld-btn ${step.slide ? "active" : ""}`;
      sldBtn.textContent = "SLD";
      sldBtn.title = "Slide 303 (Scivolamento fluido alla nota successiva)";
      sldBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const sld = this.sequencer.toggleBassStepSlide(idx);
        sldBtn.classList.toggle("active", !!sld);
      });

      col.appendChild(triggerBtn);
      col.appendChild(noteSelect);
      col.appendChild(accBtn);
      col.appendChild(sldBtn);
      grid.appendChild(col);
    });
  }

  bindEvents() {
    // 1. Super Botta Slider
    const bottaSlider = document.getElementById("super-botta-slider");
    if (bottaSlider) {
      bottaSlider.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value);
        this.currentKickParams.super_botta = val;
        this.updateSuperBottaText(val);
        this.debounceKickTrigger();
      });
    }

    const extremeToggle = document.getElementById("toggle-extreme-mode");
    if (extremeToggle) {
      extremeToggle.addEventListener("change", (e) => {
        this.currentKickParams.extreme_mode = e.target.checked;
        this.debounceKickTrigger();
      });
    }

    // 2. Pad Trigger
    const triggerPad = document.getElementById("trigger-pad-btn");
    if (triggerPad) {
      triggerPad.addEventListener("mousedown", (e) => {
        e.preventDefault();
        this.triggerKick(1.0);
      });
      triggerPad.addEventListener("touchstart", (e) => {
        e.preventDefault();
        this.triggerKick(1.0);
      }, { passive: false });
    }

    // 3. Sequencer Play/Stop
    const playBtn = document.getElementById("seq-play-btn");
    if (playBtn) {
      playBtn.addEventListener("click", () => {
        const isPlaying = this.sequencer.toggle();
        playBtn.classList.toggle("playing", isPlaying);
        playBtn.innerHTML = isPlaying
          ? `<span class="icon">⏹</span> FERMA GROOVE`
          : `<span class="icon">▶</span> ASCOLTA GROOVE (LOOP)`;
      });
    }

    // 4. BPM Controls
    const bpmSlider = document.getElementById("bpm-slider");
    const bpmInput = document.getElementById("bpm-input");
    const updateBpm = (val) => {
      const bpm = parseInt(val, 10);
      this.currentBpm = bpm;
      this.sequencer.setBpm(bpm);
      if (bpmSlider) bpmSlider.value = bpm;
      if (bpmInput) bpmInput.value = bpm;
    };

    if (bpmSlider) bpmSlider.addEventListener("input", (e) => updateBpm(e.target.value));
    if (bpmInput) bpmInput.addEventListener("change", (e) => updateBpm(e.target.value));

    // Tap Tempo
    let tapTimes = [];
    const tapBtn = document.getElementById("tap-tempo-btn");
    if (tapBtn) {
      tapBtn.addEventListener("click", () => {
        const now = Date.now();
        tapTimes.push(now);
        if (tapTimes.length > 4) tapTimes.shift();
        if (tapTimes.length > 1) {
          let diffs = [];
          for (let i = 1; i < tapTimes.length; i++) {
            diffs.push(tapTimes[i] - tapTimes[i - 1]);
          }
          const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
          const calcBpm = Math.round(60000 / avg);
          if (calcBpm >= 60 && calcBpm <= 280) {
            updateBpm(calcBpm);
          }
        }
      });
    }

    document.querySelectorAll(".tempo-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const bpm = parseInt(chip.dataset.bpm, 10);
        updateBpm(bpm);
      });
    });

    // 5. Sequencer Step Buttons (Kick & Hi-Hat)
    document.querySelectorAll(".seq-step[data-track='kick']").forEach((btn, idx) => {
      btn.addEventListener("click", () => {
        const active = this.sequencer.toggleStep("kick", idx);
        btn.classList.toggle("active", !!active);
      });
    });

    document.querySelectorAll(".seq-step[data-track='hihat']").forEach((btn, idx) => {
      btn.addEventListener("click", () => {
        const active = this.sequencer.toggleStep("hihat", idx);
        btn.classList.toggle("active", !!active);
      });
    });

    const toggleHiHat = document.getElementById("toggle-seq-hihat");
    if (toggleHiHat) {
      toggleHiHat.addEventListener("change", (e) => {
        this.sequencer.hihatEnabled = e.target.checked;
      });
    }

    const toggleBassSeq = document.getElementById("toggle-seq-bass");
    if (toggleBassSeq) {
      toggleBassSeq.addEventListener("change", (e) => {
        this.sequencer.bassEnabled = e.target.checked;
      });
    }

    const toggleBassModule = document.getElementById("toggle-bass-module");
    if (toggleBassModule) {
      toggleBassModule.addEventListener("change", (e) => {
        this.currentBassParams.bass_enabled = e.target.checked;
      });
    }

    document.querySelectorAll(".pattern-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const pattern = btn.dataset.pattern;
        this.sequencer.setKickPattern(pattern);
        this.refreshKickSequencerStepsUI();
        document.querySelectorAll(".pattern-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });

    // 6. Preset Selectors
    const kickSelect = document.getElementById("preset-select");
    if (kickSelect) {
      kickSelect.addEventListener("change", (e) => {
        this.loadKickPreset(e.target.value);
        this.triggerKick();
      });
    }

    const bassSelect = document.getElementById("bass-preset-select");
    if (bassSelect) {
      bassSelect.addEventListener("change", (e) => {
        this.loadBassPreset(e.target.value);
      });
    }

    // Radio waveforms Basso
    document.querySelectorAll('input[name="bass_osc1_wave"]').forEach(input => {
      input.addEventListener("change", (e) => {
        this.currentBassParams.bass_osc1_wave = e.target.value;
      });
    });

    document.querySelectorAll('input[name="bass_osc2_wave"]').forEach(input => {
      input.addEventListener("change", (e) => {
        this.currentBassParams.bass_osc2_wave = e.target.value;
      });
    });

    // Radio controls Cassa
    document.querySelectorAll('input[name="attack303_waveform"]').forEach(input => {
      input.addEventListener("change", (e) => {
        this.currentKickParams.attack303_waveform = e.target.value;
        this.debounceKickTrigger();
      });
    });

    document.querySelectorAll('input[name="body_waveform"]').forEach(input => {
      input.addEventListener("change", (e) => {
        this.currentKickParams.body_waveform = e.target.value;
        this.debounceKickTrigger();
      });
    });

    document.querySelectorAll('input[name="drive_type"]').forEach(input => {
      input.addEventListener("change", (e) => {
        this.currentKickParams.drive_type = e.target.value;
        this.debounceKickTrigger();
      });
    });

    document.querySelectorAll('input[name="screech_waveform"]').forEach(input => {
      input.addEventListener("change", (e) => {
        this.currentKickParams.screech_waveform = e.target.value;
        this.debounceKickTrigger();
      });
    });

    // Moduli switch Cassa
    const toggle303 = document.getElementById("toggle-attack303");
    if (toggle303) {
      toggle303.addEventListener("change", (e) => {
        this.currentKickParams.attack303_enabled = e.target.checked;
        this.debounceKickTrigger();
      });
    }

    const toggleBody = document.getElementById("toggle-body");
    if (toggleBody) {
      toggleBody.addEventListener("change", (e) => {
        this.currentKickParams.body_enabled = e.target.checked;
        this.debounceKickTrigger();
      });
    }

    const toggleRumble = document.getElementById("toggle-rumble");
    if (toggleRumble) {
      toggleRumble.addEventListener("change", (e) => {
        this.currentKickParams.rumble_enabled = e.target.checked;
        this.debounceKickTrigger();
      });
    }

    const toggleScreech = document.getElementById("toggle-screech");
    if (toggleScreech) {
      toggleScreech.addEventListener("change", (e) => {
        this.currentKickParams.screech_enabled = e.target.checked;
        this.debounceKickTrigger();
      });
    }

    // Visualizer modes
    document.querySelectorAll(".vis-mode-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.mode;
        this.visualizer.setMode(mode);
        document.querySelectorAll(".vis-mode-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });

    // 7. WAV Export (Cassa & Basso)
    const exportBtn = document.getElementById("open-export-modal-btn");
    const exportModal = document.getElementById("export-modal");
    const closeExportBtn = document.getElementById("close-export-modal-btn");
    const startExportBtn = document.getElementById("confirm-export-btn");

    if (exportBtn && exportModal) {
      exportBtn.addEventListener("click", () => exportModal.classList.add("open"));
    }
    if (closeExportBtn && exportModal) {
      closeExportBtn.addEventListener("click", () => exportModal.classList.remove("open"));
    }

    if (startExportBtn) {
      startExportBtn.addEventListener("click", async () => {
        startExportBtn.disabled = true;
        startExportBtn.textContent = "Rendering WAV in corso...";

        const exportMode = document.querySelector('input[name="export_elements"]:checked')?.value || "both";
        const bitDepth = parseInt(document.getElementById("export-bitdepth")?.value || "24", 10);
        const sampleRate = parseInt(document.getElementById("export-samplerate")?.value || "44100", 10);

        try {
          const wavBlob = await this.audioEngine.renderProjectToWav(
            this.currentKickParams,
            this.currentBassParams,
            this.sequencer,
            {
              exportMode,
              isLoop: true,
              bpm: this.currentBpm,
              bitDepth,
              sampleRate,
              kickLevel: this.mixKickLevel,
              bassLevel: this.mixBassLevel
            }
          );

          const fileName = `KickForge303_${exportMode.toUpperCase()}_${this.currentBpm}BPM.wav`;
          const url = URL.createObjectURL(wavBlob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 10000);

          this.uiManager.showToast(`✅ File audio "${fileName}" scaricato!`, "success");
          if (exportModal) exportModal.classList.remove("open");
        } catch (err) {
          console.error("Export error:", err);
          this.uiManager.showToast("Errore durante il rendering del file WAV.", "error");
        } finally {
          startExportBtn.disabled = false;
          startExportBtn.textContent = "📥 Scarica Subito il File WAV";
        }
      });
    }

    // 8. Save Preset Modals (Cassa & Basso)
    const saveKickBtn = document.getElementById("open-save-preset-btn");
    const saveKickModal = document.getElementById("save-preset-modal");
    const closeSaveKickBtn = document.getElementById("close-save-modal-btn");
    const confirmSaveKickBtn = document.getElementById("confirm-save-preset-btn");

    if (saveKickBtn && saveKickModal) {
      saveKickBtn.addEventListener("click", () => saveKickModal.classList.add("open"));
    }
    if (closeSaveKickBtn && saveKickModal) {
      closeSaveKickBtn.addEventListener("click", () => saveKickModal.classList.remove("open"));
    }
    if (confirmSaveKickBtn) {
      confirmSaveKickBtn.addEventListener("click", () => {
        const name = document.getElementById("custom-preset-name")?.value.trim() || "Mia Cassa";
        const cat = document.getElementById("custom-preset-category")?.value.trim() || "I Miei Preset";
        const newPreset = this.presetManager.saveCustomPreset(name, cat, this.currentKickParams, this.currentBpm);
        this.currentKickCategory = "all";
        this.renderKickCategoryTabs();
        this.renderKickPresets();
        this.loadKickPreset(newPreset.id);
        if (saveKickModal) saveKickModal.classList.remove("open");
        this.uiManager.showToast(`Cassa "${name}" salvata!`, "success");
      });
    }

    // Elimina preset personalizzato corrente
    const deleteBtn = document.getElementById("delete-current-preset-btn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
        const preset = this.presetManager.getPresetById(this.currentKickPresetId);
        if (!preset || !preset.isCustom) return;
        if (!confirm(`Eliminare il preset "${preset.name}"? L'operazione non è reversibile.`)) return;
        this.presetManager.deleteCustomPreset(preset.id);
        this.renderKickCategoryTabs();
        this.renderKickPresets();
        this.loadKickPreset(PRESETS[0].id);
        this.uiManager.showToast("Preset eliminato.", "info");
      });
    }

    // Sovrascrivi (salva modifiche) sul preset personalizzato corrente
    const updateBtn = document.getElementById("update-current-preset-btn");
    if (updateBtn) {
      updateBtn.addEventListener("click", () => {
        const preset = this.presetManager.getPresetById(this.currentKickPresetId);
        if (!preset || !preset.isCustom) return;
        this.presetManager.updateCustomPreset(preset.id, this.currentKickParams, this.currentBpm);
        this.renderKickPresets();
        this.uiManager.showToast(`✅ Modifiche salvate su "${preset.name}"`, "success");
      });
    }

    // Duplica il preset corrente (anche di fabbrica) come nuovo personalizzato modificabile
    const duplicateBtn = document.getElementById("duplicate-preset-btn");
    if (duplicateBtn) {
      duplicateBtn.addEventListener("click", () => {
        const preset = this.presetManager.getPresetById(this.currentKickPresetId);
        const baseName = (preset?.name || "Cassa").replace(/^💾\s*/, "").replace(/^[^\w]+\s*/, "");
        const newPreset = this.presetManager.saveCustomPreset(`${baseName} (copia)`, "I Miei Preset", this.currentKickParams, this.currentBpm);
        this.currentKickCategory = "all";
        this.renderKickCategoryTabs();
        this.renderKickPresets();
        this.loadKickPreset(newPreset.id);
        this.uiManager.showToast("Copia modificabile creata!", "success");
      });
    }

    // Esporta preset corrente come file .json
    const exportPresetBtn = document.getElementById("export-preset-btn");
    if (exportPresetBtn) {
      exportPresetBtn.addEventListener("click", () => {
        const preset = this.presetManager.getPresetById(this.currentKickPresetId);
        const data = {
          name: (preset?.name || "Cassa").replace(/^💾\s*/, ""),
          bpm: this.currentBpm,
          params: this.currentKickParams,
          _app: "KickForge303",
          _type: "kick_preset"
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${data.name.replace(/[^\w\-]+/g, "_")}.kickforge.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        this.uiManager.showToast("Preset esportato in .json", "success");
      });
    }

    // Importa preset da file .json
    const importPresetInput = document.getElementById("import-preset-input");
    if (importPresetInput) {
      importPresetInput.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const obj = JSON.parse(ev.target.result);
            if (!obj || !obj.params) throw new Error("File non valido");
            const newPreset = this.presetManager.importPreset(obj);
            this.currentKickCategory = "all";
            this.renderKickCategoryTabs();
            this.renderKickPresets();
            this.loadKickPreset(newPreset.id);
            this.uiManager.showToast(`Preset "${newPreset.name}" importato!`, "success");
          } catch (err) {
            console.error("Import error:", err);
            this.uiManager.showToast("File preset non valido.", "error");
          }
        };
        reader.readAsText(file);
        e.target.value = "";
      });
    }

    // Salva Basso Modal
    const saveBassBtn = document.getElementById("open-save-bass-btn");
    const saveBassModal = document.getElementById("save-bass-modal");
    const closeSaveBassBtn = document.getElementById("close-save-bass-modal-btn");
    const confirmSaveBassBtn = document.getElementById("confirm-save-bass-btn");

    if (saveBassBtn && saveBassModal) {
      saveBassBtn.addEventListener("click", () => saveBassModal.classList.add("open"));
    }
    if (closeSaveBassBtn && saveBassModal) {
      closeSaveBassBtn.addEventListener("click", () => saveBassModal.classList.remove("open"));
    }
    if (confirmSaveBassBtn) {
      confirmSaveBassBtn.addEventListener("click", () => {
        const name = document.getElementById("custom-bass-name")?.value.trim() || "Mio Basso";
        const newPreset = this.bassPresetManager.saveCustomPreset(name, "I Miei Bassi", this.currentBassParams, this.sequencer.bassPattern, this.currentBpm);
        this.currentBassCategory = "all";
        this.renderBassCategoryTabs();
        this.renderBassPresets();
        this.loadBassPreset(newPreset.id);
        if (saveBassModal) saveBassModal.classList.remove("open");
        this.uiManager.showToast(`Basso "${name}" salvato!`, "success");
      });
    }

    // 9. Generatore AI (cassa / basso, genera o modifica)
    const aiInput = document.getElementById("ai-prompt-input");
    this.aiTarget = "kick";

    const setAiTarget = (t) => {
      this.aiTarget = t === "bass" ? "bass" : "kick";
      document.querySelectorAll(".ai-target-btn").forEach(b => b.classList.toggle("active", b.dataset.target === this.aiTarget));
    };
    document.querySelectorAll(".ai-target-btn").forEach(btn => {
      btn.addEventListener("click", () => setAiTarget(btn.dataset.target));
    });

    const getPrompt = () => (aiInput?.value || "").trim();
    const needPrompt = () => {
      if (!getPrompt()) {
        this.uiManager.showToast("Scrivi prima cosa vuoi.", "info");
        aiInput?.focus();
        return false;
      }
      return true;
    };

    const aiGenBtn = document.getElementById("ai-generate-btn");
    const aiModBtn = document.getElementById("ai-modify-btn");
    if (aiGenBtn) aiGenBtn.addEventListener("click", () => { if (needPrompt()) this.generateWithAI(getPrompt(), { target: this.aiTarget, tweak: false }); });
    if (aiModBtn) aiModBtn.addEventListener("click", () => { if (needPrompt()) this.generateWithAI(getPrompt(), { target: this.aiTarget, tweak: true }); });
    if (aiInput) {
      aiInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); if (needPrompt()) this.generateWithAI(getPrompt(), { target: this.aiTarget, tweak: false }); }
      });
    }

    document.querySelectorAll(".ai-example-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        if (aiInput) aiInput.value = chip.dataset.prompt || "";
        setAiTarget(chip.dataset.target || "kick");
        this.generateWithAI(getPrompt(), { target: this.aiTarget, tweak: false });
      });
    });

    // 10. Mixer Cassa / Basso
    const mixKickSlider = document.getElementById("mix-kick-slider");
    const mixBassSlider = document.getElementById("mix-bass-slider");
    const mixKickVal = document.getElementById("mix-kick-val");
    const mixBassVal = document.getElementById("mix-bass-val");
    const applyMix = () => this.audioEngine.setMix(this.mixKickLevel, this.mixBassLevel);
    if (mixKickSlider) {
      mixKickSlider.addEventListener("input", (e) => {
        this.mixKickLevel = parseFloat(e.target.value);
        if (mixKickVal) mixKickVal.textContent = `${Math.round(this.mixKickLevel * 100)}%`;
        applyMix();
      });
    }
    if (mixBassSlider) {
      mixBassSlider.addEventListener("input", (e) => {
        this.mixBassLevel = parseFloat(e.target.value);
        if (mixBassVal) mixBassVal.textContent = `${Math.round(this.mixBassLevel * 100)}%`;
        applyMix();
        if (!this.sequencer.isPlaying) {
          this.audioEngine.triggerBassNote(this.currentBassParams, { note: "C2", active: 1, accent: 1 }, null, 0.25, true);
        }
      });
    }

    // 11. Crea Variazione (tasti in alto + tasti "varia live" nel transport)
    document.querySelectorAll(".js-variate-kick").forEach(b => b.addEventListener("click", () => this.variateKick()));
    document.querySelectorAll(".js-variate-bass").forEach(b => b.addEventListener("click", () => this.variateBass()));
    document.querySelectorAll(".js-variate-pattern").forEach(b => b.addEventListener("click", () => this.variatePattern()));

    // Fill / Trick (variazioni rapide one-shot)
    document.querySelectorAll(".js-fill-kick").forEach(b => b.addEventListener("click", () => this.applyFill("kick")));
    document.querySelectorAll(".js-fill-hats").forEach(b => b.addEventListener("click", () => this.applyFill("hats")));
    document.querySelectorAll(".js-fill-bass").forEach(b => b.addEventListener("click", () => this.applyFill("bass")));
    document.querySelectorAll(".js-fill-break").forEach(b => b.addEventListener("click", () => this.applyFill("break")));

    // Hotkeys
    window.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;

      if (e.code === "Space") {
        e.preventDefault();
        const isPlaying = this.sequencer.toggle();
        if (playBtn) {
          playBtn.classList.toggle("playing", isPlaying);
          playBtn.innerHTML = isPlaying
            ? `<span class="icon">⏹</span> FERMA GROOVE`
            : `<span class="icon">▶</span> ASCOLTA GROOVE (LOOP)`;
        }
      } else if (e.code === "Enter" || e.code === "KeyK") {
        e.preventDefault();
        this.triggerKick(1.0);
      }
    });
  }

  refreshKickSequencerStepsUI() {
    document.querySelectorAll(".seq-step[data-track='kick']").forEach((btn, idx) => {
      btn.classList.toggle("active", !!this.sequencer.kickSteps[idx]);
    });
  }

  updateSequencerUI(activeStep) {
    document.querySelectorAll(".seq-step").forEach(btn => {
      const stepIdx = parseInt(btn.dataset.step, 10);
      btn.classList.toggle("current-playing-step", stepIdx === activeStep);
    });

    document.querySelectorAll(".bass-step-column").forEach(col => {
      const stepIdx = parseInt(col.dataset.step, 10);
      col.classList.toggle("current-playing-step", stepIdx === activeStep);
    });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  window.kickForgeApp = new KickForgeApp();
});
