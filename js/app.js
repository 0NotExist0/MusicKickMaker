/**
 * KickForge 303 - App Orchestrator V2
 * Gestione Preset con Categorie, Super Botta Punch Booster e Sequencer
 */

import { KickSynthEngine } from "./audio-engine.js";
import { PresetManager, PRESETS, PRESET_CATEGORIES } from "./presets.js";
import { Visualizer } from "./visualizer.js";
import { StepSequencer } from "./sequencer.js";
import { UIManager } from "./ui.js";

class KickForgeApp {
  constructor() {
    this.audioEngine = new KickSynthEngine();
    this.presetManager = new PresetManager();
    this.uiManager = new UIManager(this);

    this.currentCategory = "all";
    this.currentParams = { ...PRESETS[0].params };
    this.currentBpm = PRESETS[0].bpm || 175;
    this.currentPresetId = PRESETS[0].id;

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
    this.sequencer.setParamsGetter(() => this.currentParams);
    this.sequencer.setBpm(this.currentBpm);

    this.uiManager.initKnobs((paramName, value) => {
      this.currentParams[paramName] = value;
      if (!this.sequencer.isPlaying) {
        this.debounceTrigger();
      }
    });

    this.renderCategoryTabs();
    this.renderPresets();
    this.bindEvents();

    this.loadPreset(this.currentPresetId);
  }

  debounceTrigger() {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      this.triggerKick();
    }, 35);
  }

  triggerKick(vel = 1.0) {
    this.audioEngine.init();
    this.visualizer.setAnalyser(this.audioEngine.analyserNode);
    this.audioEngine.triggerKick(this.currentParams, vel);

    const pad = document.getElementById("trigger-pad-btn");
    if (pad) {
      pad.classList.add("active");
      setTimeout(() => pad.classList.remove("active"), 90);
    }
  }

  renderCategoryTabs() {
    const container = document.getElementById("category-tabs-container");
    if (!container) return;

    container.innerHTML = "";
    PRESET_CATEGORIES.forEach(cat => {
      const btn = document.createElement("button");
      btn.className = `cat-tab-btn ${cat.id === this.currentCategory ? "active" : ""}`;
      btn.textContent = cat.label;
      btn.addEventListener("click", () => {
        this.currentCategory = cat.id;
        document.querySelectorAll(".cat-tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.renderPresets();
      });
      container.appendChild(btn);
    });
  }

  renderPresets() {
    const presetSelect = document.getElementById("preset-select");
    const quickGrid = document.getElementById("quick-presets-grid");

    const filtered = this.presetManager.getPresetsByCategory(this.currentCategory);

    if (presetSelect) {
      presetSelect.innerHTML = "";
      filtered.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = `${p.name} [${p.bpm} BPM]`;
        presetSelect.appendChild(opt);
      });
      presetSelect.value = this.currentPresetId;
    }

    if (quickGrid) {
      quickGrid.innerHTML = "";
      if (filtered.length === 0) {
        quickGrid.innerHTML = `<span class="empty-msg">Nessun preset in questa categoria. Salva il tuo con "Salva Suono"!</span>`;
      } else {
        filtered.forEach(p => {
          const btn = document.createElement("button");
          btn.className = `quick-preset-btn ${p.id === this.currentPresetId ? "active" : ""}`;
          btn.innerHTML = `<span class="p-name">${p.name}</span><span class="p-bpm">${p.bpm} BPM</span>`;
          btn.addEventListener("click", () => {
            this.loadPreset(p.id);
            this.triggerKick();
          });
          quickGrid.appendChild(btn);
        });
      }
    }
  }

  loadPreset(presetId) {
    const preset = this.presetManager.getPresetById(presetId);
    if (!preset) return;

    this.currentPresetId = preset.id;
    this.currentParams = { ...preset.params };
    this.currentBpm = preset.bpm || 140;

    this.sequencer.setBpm(this.currentBpm);
    const bpmInput = document.getElementById("bpm-input");
    const bpmSlider = document.getElementById("bpm-slider");
    if (bpmInput) bpmInput.value = this.currentBpm;
    if (bpmSlider) bpmSlider.value = this.currentBpm;

    // Aggiorna controlli "Super Botta"
    const bottaSlider = document.getElementById("super-botta-slider");
    const extremeToggle = document.getElementById("toggle-extreme-mode");
    if (bottaSlider) {
      bottaSlider.value = this.currentParams.super_botta || 1.8;
      this.updateSuperBottaText(this.currentParams.super_botta || 1.8);
    }
    if (extremeToggle) {
      extremeToggle.checked = !!this.currentParams.extreme_mode;
    }

    // Aggiorna tutte le manopole
    Object.keys(this.currentParams).forEach(param => {
      this.uiManager.setKnobValue(param, this.currentParams[param]);
    });

    // Aggiorna selettori onde e interruttori
    this.updateControlsFromParams();

    const presetSelect = document.getElementById("preset-select");
    if (presetSelect) presetSelect.value = presetId;

    const descEl = document.getElementById("preset-description");
    if (descEl) descEl.textContent = preset.description || "";

    // Mostra/Nascondi tasto elimina per preset personalizzati
    const deleteBtn = document.getElementById("delete-current-preset-btn");
    if (deleteBtn) {
      deleteBtn.style.display = preset.isCustom ? "inline-flex" : "none";
    }

    document.querySelectorAll(".quick-preset-btn").forEach(btn => {
      const isMatch = btn.querySelector(".p-name")?.textContent === preset.name;
      btn.classList.toggle("active", isMatch);
    });

    this.uiManager.showToast(`Caricato: ${preset.name}`, "info");
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

  updateControlsFromParams() {
    const wave303 = document.querySelector(`input[name="attack303_waveform"][value="${this.currentParams.attack303_waveform}"]`);
    if (wave303) wave303.checked = true;

    const waveBody = document.querySelector(`input[name="body_waveform"][value="${this.currentParams.body_waveform}"]`);
    if (waveBody) waveBody.checked = true;

    const driveType = document.querySelector(`input[name="drive_type"][value="${this.currentParams.drive_type}"]`);
    if (driveType) driveType.checked = true;

    const toggle303 = document.getElementById("toggle-attack303");
    if (toggle303) toggle303.checked = !!this.currentParams.attack303_enabled;

    const toggleBody = document.getElementById("toggle-body");
    if (toggleBody) toggleBody.checked = !!this.currentParams.body_enabled;

    const toggleRumble = document.getElementById("toggle-rumble");
    if (toggleRumble) toggleRumble.checked = !!this.currentParams.rumble_enabled;
  }

  bindEvents() {
    // 1. Super Botta Slider
    const bottaSlider = document.getElementById("super-botta-slider");
    if (bottaSlider) {
      bottaSlider.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value);
        this.currentParams.super_botta = val;
        this.updateSuperBottaText(val);
        this.debounceTrigger();
      });
    }

    const extremeToggle = document.getElementById("toggle-extreme-mode");
    if (extremeToggle) {
      extremeToggle.addEventListener("change", (e) => {
        this.currentParams.extreme_mode = e.target.checked;
        this.debounceTrigger();
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
          ? `<span class="icon">⏹</span> FERMA LOOP`
          : `<span class="icon">▶</span> ASCOLTA IN LOOP`;
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

    // 5. Sequencer Step Buttons
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

    document.querySelectorAll(".pattern-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const pattern = btn.dataset.pattern;
        this.sequencer.setPattern(pattern);
        this.refreshSequencerStepsUI();
        document.querySelectorAll(".pattern-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });

    // 6. Preset Selector Dropdown
    const presetSelect = document.getElementById("preset-select");
    if (presetSelect) {
      presetSelect.addEventListener("change", (e) => {
        this.loadPreset(e.target.value);
        this.triggerKick();
      });
    }

    // Radio controls for waveforms and drive
    document.querySelectorAll('input[name="attack303_waveform"]').forEach(input => {
      input.addEventListener("change", (e) => {
        this.currentParams.attack303_waveform = e.target.value;
        this.debounceTrigger();
      });
    });

    document.querySelectorAll('input[name="body_waveform"]').forEach(input => {
      input.addEventListener("change", (e) => {
        this.currentParams.body_waveform = e.target.value;
        this.debounceTrigger();
      });
    });

    document.querySelectorAll('input[name="drive_type"]').forEach(input => {
      input.addEventListener("change", (e) => {
        this.currentParams.drive_type = e.target.value;
        this.debounceTrigger();
      });
    });

    // Module enable switches
    const toggle303 = document.getElementById("toggle-attack303");
    if (toggle303) {
      toggle303.addEventListener("change", (e) => {
        this.currentParams.attack303_enabled = e.target.checked;
        this.debounceTrigger();
      });
    }

    const toggleBody = document.getElementById("toggle-body");
    if (toggleBody) {
      toggleBody.addEventListener("change", (e) => {
        this.currentParams.body_enabled = e.target.checked;
        this.debounceTrigger();
      });
    }

    const toggleRumble = document.getElementById("toggle-rumble");
    if (toggleRumble) {
      toggleRumble.addEventListener("change", (e) => {
        this.currentParams.rumble_enabled = e.target.checked;
        this.debounceTrigger();
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

    // 7. WAV Export
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
        startExportBtn.textContent = "Preparazione file WAV...";

        const exportType = document.querySelector('input[name="export_type"]:checked')?.value || "oneshot";
        const bitDepth = parseInt(document.getElementById("export-bitdepth")?.value || "24", 10);
        const sampleRate = parseInt(document.getElementById("export-samplerate")?.value || "44100", 10);

        try {
          const wavBlob = await this.audioEngine.renderKickToWav(this.currentParams, {
            isLoop: exportType === "loop",
            bpm: this.currentBpm,
            bitDepth,
            sampleRate
          });

          const currentPreset = this.presetManager.getPresetById(this.currentPresetId);
          const cleanName = (currentPreset?.name || "KickForge_Cassa").replace(/[^a-zA-Z0-9_-]/g, "_");
          const fileName = `${cleanName}_${this.currentBpm}BPM_${exportType}.wav`;

          const url = URL.createObjectURL(wavBlob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 10000);

          this.uiManager.showToast(`✅ File "${fileName}" scaricato!`, "success");
          if (exportModal) exportModal.classList.remove("open");
        } catch (err) {
          console.error("Export error:", err);
          this.uiManager.showToast("Errore durante il download del file WAV.", "error");
        } finally {
          startExportBtn.disabled = false;
          startExportBtn.textContent = "📥 Scarica Subito il File WAV";
        }
      });
    }

    // 8. Save Preset Modal
    const savePresetBtn = document.getElementById("open-save-preset-btn");
    const saveModal = document.getElementById("save-preset-modal");
    const closeSaveBtn = document.getElementById("close-save-modal-btn");
    const confirmSaveBtn = document.getElementById("confirm-save-preset-btn");

    if (savePresetBtn && saveModal) {
      savePresetBtn.addEventListener("click", () => saveModal.classList.add("open"));
    }
    if (closeSaveBtn && saveModal) {
      closeSaveBtn.addEventListener("click", () => saveModal.classList.remove("open"));
    }
    if (confirmSaveBtn) {
      confirmSaveBtn.addEventListener("click", () => {
        const nameInput = document.getElementById("custom-preset-name");
        const catInput = document.getElementById("custom-preset-category");
        const name = nameInput?.value.trim() || "Mia Cassa Banger";
        const cat = catInput?.value.trim() || "I Miei Preset";

        const newPreset = this.presetManager.saveCustomPreset(name, cat, this.currentParams, this.currentBpm);
        this.currentCategory = "all";
        this.renderCategoryTabs();
        this.renderPresets();
        this.loadPreset(newPreset.id);
        if (saveModal) saveModal.classList.remove("open");
        this.uiManager.showToast(`Preset "${name}" salvato nei tuoi preferiti!`, "success");
      });
    }

    // 9. Delete Custom Preset Button
    const deleteBtn = document.getElementById("delete-current-preset-btn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
        if (confirm("Vuoi davvero eliminare questo preset personalizzato?")) {
          this.presetManager.deleteCustomPreset(this.currentPresetId);
          this.renderPresets();
          this.loadPreset(PRESETS[0].id);
          this.uiManager.showToast("Preset eliminato.", "info");
        }
      });
    }

    // 10. Hotkeys
    window.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

      if (e.code === "Space") {
        e.preventDefault();
        const isPlaying = this.sequencer.toggle();
        if (playBtn) {
          playBtn.classList.toggle("playing", isPlaying);
          playBtn.innerHTML = isPlaying
            ? `<span class="icon">⏹</span> FERMA LOOP`
            : `<span class="icon">▶</span> ASCOLTA IN LOOP`;
        }
      } else if (e.code === "Enter" || e.code === "KeyK") {
        e.preventDefault();
        this.triggerKick(1.0);
      }
    });
  }

  refreshSequencerStepsUI() {
    document.querySelectorAll(".seq-step[data-track='kick']").forEach((btn, idx) => {
      btn.classList.toggle("active", !!this.sequencer.kickSteps[idx]);
    });
    document.querySelectorAll(".seq-step[data-track='hihat']").forEach((btn, idx) => {
      btn.classList.toggle("active", !!this.seq_hihatSteps ? !!this.seq_hihatSteps[idx] : !!this.sequencer.hihatSteps[idx]);
    });
  }

  updateSequencerUI(activeStep) {
    document.querySelectorAll(".seq-step").forEach(btn => {
      const stepIdx = parseInt(btn.dataset.step, 10);
      btn.classList.toggle("current-playing-step", stepIdx === activeStep);
    });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  window.kickForgeApp = new KickForgeApp();
});
