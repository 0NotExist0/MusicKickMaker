/**
 * KickForge 303 - Libreria Preset per Sottogeneri e Gestione Preset Utente
 */

/**
 * Set completo dei parametri della cassa con valori di default neutri.
 * Ogni preset viene fuso sopra questa base: garantisce che il motore abbia
 * sempre tutti i valori, che i knob si resettino correttamente al cambio preset
 * e che i preset vecchi (senza i nuovi controlli) restino retrocompatibili.
 */
export const DEFAULT_KICK_PARAMS = {
  super_botta: 1.6,
  extreme_mode: false,

  // Attacco 303
  attack303_enabled: true,
  attack303_volume: 0.85,
  attack303_waveform: "sawtooth",
  attack303_cutoff: 2800,
  attack303_resonance: 14.0,
  attack303_envMod: 0.85,
  attack303_decay: 0.04,
  attack303_pitch: 350,
  attack303_drive: 4.0,
  click_volume: 0.7,
  click_tone: 6500,

  // Screech / Laser (piep) — spento di default per retrocompatibilità
  screech_enabled: false,
  screech_volume: 0.7,
  screech_waveform: "sawtooth",
  screech_pitchStart: 1800,
  screech_pitchEnd: 220,
  screech_decay: 0.12,
  screech_drive: 6.0,
  screech_cutoff: 2600,
  screech_resonance: 6.0,

  // Punch / Transient — neutro di default (0 = come prima)
  punch_amount: 0.0,
  punch_tone: 3000,
  punch_decay: 0.006,
  comp_attack: 3.0,
  comp_ratio: 8.0,

  // Corpo & Botta
  body_enabled: true,
  body_waveform: "sine",
  body_startFreq: 480,
  body_punchFreq: 150,
  body_tailFreq: 50,
  body_punchDecay: 0.038,
  body_tailStartDelay: 0.0,
  body_tailDecay: 0.30,
  body_tailLevel: 1.0,
  body_volume: 1.0,
  fm_amount: 90,
  fm_ratio: 2.0,

  // Sub & Rimbombo
  rumble_enabled: true,
  rumble_volume: 0.5,
  rumble_decay: 0.35,
  rumble_cutoff: 120,
  rumble_ducking: 0.8,
  sub_boost: 4.0,

  // Distorsione & Tono
  drive_type: "tube",
  drive_amount: 4.0,
  fold_amount: 2.5,
  eq_low: 4.0,
  eq_midFreq: 600,
  eq_midGain: 0.0,
  eq_high: 3.0,
  master_gain: 1.15
};

export const PRESET_CATEGORIES = [
  { id: "all", label: "Tutti i Preset" },
  { id: "acid", label: "🧪 303 & Acid" },
  { id: "techno", label: "🏭 Techno & Industrial" },
  { id: "hardcore", label: "💀 Hardcore & Gabber" },
  { id: "frenchcore", label: "🚀 Frenchcore" },
  { id: "uptempo", label: "💥 Uptempo" },
  { id: "custom", label: "💾 I Miei Preset" }
];

export const PRESETS = [
  {
    id: "acid_hardcore_303",
    name: "⚡ 303 Acidcore Destroyer",
    category: "acid",
    categoryLabel: "Acidcore / Hardcore",
    bpm: 175,
    description: "Attacco TB-303 urlante con risonanza acida estrema e botta distruttiva per cassa Acidcore.",
    params: {
      super_botta: 1.8,
      extreme_mode: true,

      // Attacco 303
      attack303_enabled: true,
      attack303_volume: 0.88,
      attack303_waveform: "sawtooth",
      attack303_cutoff: 3200,
      attack303_resonance: 16.0,
      attack303_envMod: 0.9,
      attack303_decay: 0.045,
      attack303_pitch: 340,
      attack303_drive: 5.0,
      click_volume: 0.75,
      click_tone: 5600,

      // Corpo & Botta
      body_enabled: true,
      body_waveform: "sine",
      body_startFreq: 480,
      body_punchFreq: 145,
      body_tailFreq: 48,
      body_punchDecay: 0.038,
      body_tailDecay: 0.28,
      body_volume: 1.0,
      fm_amount: 140,
      fm_ratio: 2.0,

      // Sub & Rimbombo
      rumble_enabled: true,
      rumble_volume: 0.45,
      rumble_decay: 0.32,
      rumble_cutoff: 130,
      rumble_ducking: 0.75,
      sub_boost: 4.5,

      // Distorsione & Tono
      drive_type: "tube",
      drive_amount: 6.0,
      fold_amount: 3.5,
      eq_low: 4.5,
      eq_midFreq: 450,
      eq_midGain: -3.0,
      eq_high: 3.2,
      master_gain: 1.25
    }
  },
  {
    id: "industrial_rumble",
    name: "🏭 Industrial Warehouse Rumble",
    category: "techno",
    categoryLabel: "Industrial Techno",
    bpm: 138,
    description: "Cassa cupa da club warehouse berlinese con rimbombo cavernoso e click secco che buca il mix.",
    params: {
      super_botta: 1.6,
      extreme_mode: false,

      attack303_enabled: true,
      attack303_volume: 0.55,
      attack303_waveform: "square",
      attack303_cutoff: 1800,
      attack303_resonance: 8.5,
      attack303_envMod: 0.65,
      attack303_decay: 0.025,
      attack303_pitch: 240,
      attack303_drive: 3.0,
      click_volume: 0.9,
      click_tone: 6800,

      body_enabled: true,
      body_waveform: "sine",
      body_startFreq: 340,
      body_punchFreq: 110,
      body_tailFreq: 42,
      body_punchDecay: 0.042,
      body_tailDecay: 0.38,
      body_volume: 1.0,
      fm_amount: 45,
      fm_ratio: 1.5,

      rumble_enabled: true,
      rumble_volume: 0.85,
      rumble_decay: 0.48,
      rumble_cutoff: 115,
      rumble_ducking: 0.82,
      sub_boost: 6.0,

      drive_type: "diode",
      drive_amount: 4.0,
      fold_amount: 1.8,
      eq_low: 6.0,
      eq_midFreq: 380,
      eq_midGain: -5.0,
      eq_high: 2.0,
      master_gain: 1.15
    }
  },
  {
    id: "early_gabber_909",
    name: "💀 Early 90s Rotterdam Gabber",
    category: "hardcore",
    categoryLabel: "Early Hardcore",
    bpm: 172,
    description: "Il classico 909 mandato al massimo con saturazione calda, pugno duro e botta ruvida a 170+ BPM.",
    params: {
      super_botta: 2.2,
      extreme_mode: true,

      attack303_enabled: true,
      attack303_volume: 0.75,
      attack303_waveform: "sawtooth",
      attack303_cutoff: 3600,
      attack303_resonance: 11.0,
      attack303_envMod: 0.8,
      attack303_decay: 0.038,
      attack303_pitch: 380,
      attack303_drive: 6.5,
      click_volume: 0.65,
      click_tone: 4600,

      body_enabled: true,
      body_waveform: "triangle",
      body_startFreq: 540,
      body_punchFreq: 165,
      body_tailFreq: 54,
      body_punchDecay: 0.048,
      body_tailDecay: 0.34,
      body_volume: 1.0,
      fm_amount: 180,
      fm_ratio: 3.0,

      rumble_enabled: false,
      rumble_volume: 0.2,
      rumble_decay: 0.2,
      rumble_cutoff: 90,
      rumble_ducking: 0.5,
      sub_boost: 3.0,

      drive_type: "tube",
      drive_amount: 8.0,
      fold_amount: 4.8,
      eq_low: 4.5,
      eq_midFreq: 600,
      eq_midGain: 4.5,
      eq_high: 4.0,
      master_gain: 1.35
    }
  },
  {
    id: "frenchcore_bouncy",
    name: "🚀 Frenchcore 200 BPM Bouncy",
    category: "frenchcore",
    categoryLabel: "Frenchcore",
    bpm: 200,
    description: "Cassa rimbalzante velocissima a 200 BPM, punch nitido e coda tonalizzata per bassline galoppanti.",
    params: {
      super_botta: 2.0,
      extreme_mode: true,

      attack303_enabled: true,
      attack303_volume: 0.95,
      attack303_waveform: "sawtooth",
      attack303_cutoff: 4400,
      attack303_resonance: 13.0,
      attack303_envMod: 0.94,
      attack303_decay: 0.028,
      attack303_pitch: 450,
      attack303_drive: 4.5,
      click_volume: 0.85,
      click_tone: 7400,

      // Laser tonale galoppante frenchcore
      screech_enabled: true,
      screech_volume: 0.7,
      screech_waveform: "sawtooth",
      screech_pitchStart: 2200,
      screech_pitchEnd: 260,
      screech_decay: 0.13,
      screech_drive: 6.5,
      screech_cutoff: 3000,
      screech_resonance: 7.0,

      // Punch nitido
      punch_amount: 0.6,
      punch_tone: 3600,
      punch_decay: 0.005,
      comp_attack: 5.0,
      comp_ratio: 9.0,

      body_enabled: true,
      body_waveform: "sine",
      body_startFreq: 700,
      body_punchFreq: 195,
      body_tailFreq: 58,
      body_punchDecay: 0.026,
      body_tailDecay: 0.22,
      body_volume: 1.0,
      fm_amount: 85,
      fm_ratio: 2.0,

      rumble_enabled: false,
      rumble_volume: 0.1,
      rumble_decay: 0.15,
      rumble_cutoff: 100,
      rumble_ducking: 0.9,
      sub_boost: 4.5,

      drive_type: "diode",
      drive_amount: 5.0,
      fold_amount: 2.8,
      eq_low: 5.2,
      eq_midFreq: 800,
      eq_midGain: 2.0,
      eq_high: 5.0,
      master_gain: 1.25
    }
  },
  {
    id: "uptempo_piep",
    name: "💥 Uptempo Piep & Screech",
    category: "uptempo",
    categoryLabel: "Uptempo Hardcore",
    bpm: 225,
    description: "Kick estremo a 220+ BPM con transient piep/laser acutissimo e botta iper-compressa.",
    params: {
      super_botta: 2.5,
      extreme_mode: true,

      attack303_enabled: true,
      attack303_volume: 1.0,
      attack303_waveform: "square",
      attack303_cutoff: 5800,
      attack303_resonance: 19.0,
      attack303_envMod: 0.98,
      attack303_decay: 0.042,
      attack303_pitch: 780,
      attack303_drive: 7.0,
      click_volume: 1.0,
      click_tone: 8800,

      // Screech / Laser acutissimo (il "piep" uptempo)
      screech_enabled: true,
      screech_volume: 0.85,
      screech_waveform: "square",
      screech_pitchStart: 3200,
      screech_pitchEnd: 320,
      screech_decay: 0.16,
      screech_drive: 8.0,
      screech_cutoff: 3400,
      screech_resonance: 9.0,

      // Punch aggressivo che buca
      punch_amount: 0.7,
      punch_tone: 4200,
      punch_decay: 0.006,
      comp_attack: 6.0,
      comp_ratio: 10.0,

      body_enabled: true,
      body_waveform: "triangle",
      body_startFreq: 880,
      body_punchFreq: 270,
      body_tailFreq: 64,
      body_punchDecay: 0.032,
      body_tailDecay: 0.18,
      body_volume: 1.0,
      fm_amount: 240,
      fm_ratio: 4.0,

      rumble_enabled: false,
      rumble_volume: 0.0,
      rumble_decay: 0.1,
      rumble_cutoff: 80,
      rumble_ducking: 1.0,
      sub_boost: 3.5,

      drive_type: "hard",
      drive_amount: 9.0,
      fold_amount: 6.5,
      eq_low: 3.5,
      eq_midFreq: 1200,
      eq_midGain: 6.5,
      eq_high: 7.0,
      master_gain: 1.4
    }
  },
  {
    id: "acid_tb303_overload",
    name: "🧪 Acid TB-303 Squelch Master",
    category: "acid",
    categoryLabel: "Acid Techno",
    bpm: 142,
    description: "Il massimo della risonanza TB-303 pura, per casse acide taglienti e liquide.",
    params: {
      super_botta: 1.7,
      extreme_mode: false,

      attack303_enabled: true,
      attack303_volume: 1.0,
      attack303_waveform: "sawtooth",
      attack303_cutoff: 3500,
      attack303_resonance: 21.0,
      attack303_envMod: 0.98,
      attack303_decay: 0.065,
      attack303_pitch: 370,
      attack303_drive: 5.8,
      click_volume: 0.9,
      click_tone: 6400,

      body_enabled: true,
      body_waveform: "sine",
      body_startFreq: 400,
      body_punchFreq: 135,
      body_tailFreq: 46,
      body_punchDecay: 0.04,
      body_tailDecay: 0.35,
      body_volume: 0.95,
      fm_amount: 95,
      fm_ratio: 1.0,

      rumble_enabled: true,
      rumble_volume: 0.58,
      rumble_decay: 0.38,
      rumble_cutoff: 135,
      rumble_ducking: 0.8,
      sub_boost: 4.5,

      drive_type: "tube",
      drive_amount: 5.5,
      fold_amount: 3.0,
      eq_low: 4.8,
      eq_midFreq: 950,
      eq_midGain: 2.5,
      eq_high: 4.5,
      master_gain: 1.2
    }
  },
  {
    id: "berghain_hypnotic",
    name: "🌌 Berghain Hypnotic Deep",
    category: "techno",
    categoryLabel: "Raw & Hypnotic Techno",
    bpm: 134,
    description: "Sub profondo, rimbombo morbido e caldo a 134 BPM per groove ipnotici e scuri.",
    params: {
      super_botta: 1.4,
      extreme_mode: false,

      attack303_enabled: true,
      attack303_volume: 0.4,
      attack303_waveform: "sine",
      attack303_cutoff: 1400,
      attack303_resonance: 4.0,
      attack303_envMod: 0.5,
      attack303_decay: 0.02,
      attack303_pitch: 200,
      attack303_drive: 1.5,
      click_volume: 0.5,
      click_tone: 4200,

      body_enabled: true,
      body_waveform: "sine",
      body_startFreq: 280,
      body_punchFreq: 95,
      body_tailFreq: 40,
      body_punchDecay: 0.045,
      body_tailDecay: 0.42,
      body_volume: 1.0,
      fm_amount: 20,
      fm_ratio: 1.0,

      rumble_enabled: true,
      rumble_volume: 0.9,
      rumble_decay: 0.52,
      rumble_cutoff: 105,
      rumble_ducking: 0.88,
      sub_boost: 6.5,

      drive_type: "tube",
      drive_amount: 2.5,
      fold_amount: 1.0,
      eq_low: 6.5,
      eq_midFreq: 320,
      eq_midGain: -6.0,
      eq_high: 0.5,
      master_gain: 1.1
    }
  },
  {
    id: "laser_punch_destroyer",
    name: "🔫 Laser Punch Destroyer",
    category: "uptempo",
    categoryLabel: "Uptempo / Frenchcore",
    bpm: 210,
    description: "Cassa con laser tonale discendente e punch estremo: transiente che buca il petto e screech acido in coda.",
    params: {
      super_botta: 2.3,
      extreme_mode: true,

      attack303_enabled: true,
      attack303_volume: 0.7,
      attack303_waveform: "square",
      attack303_cutoff: 4200,
      attack303_resonance: 15.0,
      attack303_envMod: 0.92,
      attack303_decay: 0.03,
      attack303_pitch: 520,
      attack303_drive: 6.0,
      click_volume: 0.9,
      click_tone: 7800,

      screech_enabled: true,
      screech_volume: 0.9,
      screech_waveform: "sawtooth",
      screech_pitchStart: 2800,
      screech_pitchEnd: 180,
      screech_decay: 0.18,
      screech_drive: 8.5,
      screech_cutoff: 3200,
      screech_resonance: 10.0,

      punch_amount: 0.85,
      punch_tone: 4000,
      punch_decay: 0.006,
      comp_attack: 7.0,
      comp_ratio: 11.0,

      body_enabled: true,
      body_waveform: "sine",
      body_startFreq: 760,
      body_punchFreq: 210,
      body_tailFreq: 55,
      body_punchDecay: 0.03,
      body_tailDecay: 0.2,
      body_volume: 1.0,
      fm_amount: 120,
      fm_ratio: 2.5,

      rumble_enabled: false,
      rumble_volume: 0.1,
      rumble_decay: 0.15,
      rumble_cutoff: 100,
      rumble_ducking: 0.9,
      sub_boost: 4.0,

      drive_type: "hard",
      drive_amount: 7.5,
      fold_amount: 4.0,
      eq_low: 4.0,
      eq_midFreq: 1000,
      eq_midGain: 4.0,
      eq_high: 6.0,
      master_gain: 1.3
    }
  }
];

export class PresetManager {
  constructor() {
    this.customPresetsKey = "kickforge_custom_presets_v2";
    this.customPresets = this.loadCustomPresets();
  }

  loadCustomPresets() {
    try {
      const data = localStorage.getItem(this.customPresetsKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn("Could not load custom presets:", e);
      return [];
    }
  }

  saveCustomPreset(name, category, params, bpm = 140) {
    const newPreset = {
      id: "custom_" + Date.now(),
      name: `💾 ${name}`,
      category: "custom",
      categoryLabel: category || "I Miei Preset",
      bpm: bpm,
      description: `Preset personalizzato creato dall'utente a ${bpm} BPM.`,
      params: { ...params },
      isCustom: true
    };
    this.customPresets.unshift(newPreset);
    try {
      localStorage.setItem(this.customPresetsKey, JSON.stringify(this.customPresets));
    } catch (e) {
      console.error("Failed to save custom preset:", e);
    }
    return newPreset;
  }

  deleteCustomPreset(id) {
    this.customPresets = this.customPresets.filter(p => p.id !== id);
    try {
      localStorage.setItem(this.customPresetsKey, JSON.stringify(this.customPresets));
    } catch (e) {
      console.error("Failed to update custom presets:", e);
    }
  }

  // Sovrascrive un preset personalizzato esistente (salva le modifiche)
  updateCustomPreset(id, params, bpm) {
    const idx = this.customPresets.findIndex(p => p.id === id);
    if (idx === -1) return null;
    this.customPresets[idx] = {
      ...this.customPresets[idx],
      params: { ...params },
      bpm: bpm ?? this.customPresets[idx].bpm
    };
    try {
      localStorage.setItem(this.customPresetsKey, JSON.stringify(this.customPresets));
    } catch (e) {
      console.error("Failed to update custom preset:", e);
    }
    return this.customPresets[idx];
  }

  // Importa un preset da oggetto JSON esterno, salvandolo come personalizzato
  importPreset(obj) {
    const name = (obj && obj.name) ? String(obj.name).replace(/^💾\s*/, "") : "Preset Importato";
    const bpm = (obj && obj.bpm) ? obj.bpm : 140;
    const params = (obj && obj.params) ? obj.params : {};
    return this.saveCustomPreset(name, "Importati", params, bpm);
  }

  getAllPresets() {
    return [...this.customPresets, ...PRESETS];
  }

  getPresetsByCategory(catId = "all") {
    if (catId === "all") return this.getAllPresets();
    if (catId === "custom") return this.customPresets;
    return PRESETS.filter(p => p.category === catId);
  }

  getPresetById(id) {
    return this.getAllPresets().find(p => p.id === id) || PRESETS[0];
  }
}
