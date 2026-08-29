/**
 * KickForge 303 - Libreria Completa di Preset per Bassi (Tutti i Sottogeneri)
 * Techno, Acidcore, Industrial, Frenchcore, Uptempo, Rawstyle, EBM, Deep Sub, Zaag
 */

/**
 * Parametri di default del basso. Ogni preset viene fuso sopra questa base,
 * così i knob si resettano correttamente e il motore ha sempre tutti i valori.
 */
export const DEFAULT_BASS_PARAMS = {
  bass_enabled: true,
  bass_type: "acid303",
  bass_osc1_wave: "sawtooth",
  bass_osc2_wave: "square",
  bass_osc2_mix: 0.5,
  bass_detune: 8,
  bass_cutoff: 1800,
  bass_resonance: 12,
  bass_envMod: 0.8,
  bass_attack: 0.004,
  bass_decay: 0.18,
  bass_gateLength: 1.0,
  bass_startOffset: 0.0,
  bass_drive: 4.0,
  bass_glide: 0.08,
  bass_sidechain: 0.7,
  bass_sidechainRelease: 0.12,
  bass_sub_level: 0.6,
  bass_volume: 0.9
};

export const BASS_PRESET_CATEGORIES = [
  { id: "all", label: "Tutti i Bassi" },
  { id: "acid303", label: "🧪 Basso 303 Acid" },
  { id: "rolling", label: "🌀 Rolling Techno" },
  { id: "frenchcore", label: "🚀 Frenchcore Gallop" },
  { id: "industrial", label: "🏭 Reese & Industrial" },
  { id: "uptempo_zaag", label: "💥 Zaag & Screech" },
  { id: "sub_donk", label: "🔊 Deep Sub & Donk" },
  { id: "custom", label: "💾 I Miei Bassi" }
];

export const BASS_PRESETS = [
  {
    id: "acid_303_squelch",
    name: "🧪 Basso 303 Acidcore Squelch",
    category: "acid303",
    categoryLabel: "Acidcore / Acid Techno",
    bpm: 175,
    description: "La classica linea di basso Roland TB-303 con risonanza acida urlante, scivolamenti (slide) e saturazione a diodo.",
    pattern: [
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
    ],
    params: {
      bass_enabled: true,
      bass_type: "acid303",
      bass_osc1_wave: "sawtooth",
      bass_osc2_wave: "square",
      bass_osc2_mix: 0.35,
      bass_detune: 5,
      bass_cutoff: 2400,
      bass_resonance: 16.5,
      bass_envMod: 0.85,
      bass_decay: 0.18,
      bass_drive: 5.5,
      bass_glide: 0.08,
      bass_sidechain: 0.75,
      bass_sub_level: 0.6,
      bass_volume: 0.9
    }
  },
  {
    id: "techno_rolling_16th",
    name: "🌀 Rolling Techno 16th Sub",
    category: "rolling",
    categoryLabel: "Peak Time & Raw Techno",
    bpm: 138,
    description: "Il leggendario basso 'Rolling' a 16esimi tipico dei club di Berlino: ipnotico, continuo e sincronizzato con la cassa.",
    pattern: [
      { note: "F1", active: 0, accent: 0, slide: 0 }, // Cassa sul battere
      { note: "F1", active: 1, accent: 0, slide: 0 },
      { note: "F1", active: 1, accent: 1, slide: 0 },
      { note: "F1", active: 1, accent: 0, slide: 0 },
      { note: "F1", active: 0, accent: 0, slide: 0 },
      { note: "F1", active: 1, accent: 0, slide: 0 },
      { note: "F1", active: 1, accent: 1, slide: 0 },
      { note: "F1", active: 1, accent: 0, slide: 0 },
      { note: "F1", active: 0, accent: 0, slide: 0 },
      { note: "F1", active: 1, accent: 0, slide: 0 },
      { note: "F1", active: 1, accent: 1, slide: 0 },
      { note: "F1", active: 1, accent: 0, slide: 0 },
      { note: "F1", active: 0, accent: 0, slide: 0 },
      { note: "F1", active: 1, accent: 0, slide: 0 },
      { note: "D#1", active: 1, accent: 1, slide: 0 },
      { note: "F1", active: 1, accent: 0, slide: 0 }
    ],
    params: {
      bass_enabled: true,
      bass_type: "rolling",
      bass_osc1_wave: "sawtooth",
      bass_osc2_wave: "sine",
      bass_osc2_mix: 0.8,
      bass_detune: 8,
      bass_cutoff: 420,
      bass_resonance: 4.5,
      bass_envMod: 0.45,
      bass_decay: 0.12,
      bass_drive: 2.8,
      bass_glide: 0.02,
      bass_sidechain: 0.92,
      bass_sub_level: 0.95,
      bass_volume: 0.95
    }
  },
  {
    id: "frenchcore_gallop",
    name: "🚀 Frenchcore Bouncy Gallop",
    category: "frenchcore",
    categoryLabel: "Frenchcore",
    bpm: 200,
    description: "Basso galoppante rimbalzante in levare a 200 BPM, energico e con glide morbido per tracce Frenchcore.",
    pattern: [
      { note: "G1", active: 0, accent: 0, slide: 0 },
      { note: "G1", active: 1, accent: 0, slide: 0 },
      { note: "G1", active: 1, accent: 1, slide: 1 },
      { note: "G1", active: 0, accent: 0, slide: 0 },
      { note: "G1", active: 0, accent: 0, slide: 0 },
      { note: "G1", active: 1, accent: 0, slide: 0 },
      { note: "G1", active: 1, accent: 1, slide: 1 },
      { note: "G1", active: 0, accent: 0, slide: 0 },
      { note: "G1", active: 0, accent: 0, slide: 0 },
      { note: "G1", active: 1, accent: 0, slide: 0 },
      { note: "A#1", active: 1, accent: 1, slide: 1 },
      { note: "G1", active: 0, accent: 0, slide: 0 },
      { note: "G1", active: 0, accent: 0, slide: 0 },
      { note: "G1", active: 1, accent: 0, slide: 0 },
      { note: "F1", active: 1, accent: 1, slide: 0 },
      { note: "G1", active: 0, accent: 0, slide: 0 }
    ],
    params: {
      bass_enabled: true,
      bass_type: "frenchcore",
      bass_osc1_wave: "sawtooth",
      bass_osc2_wave: "triangle",
      bass_osc2_mix: 0.6,
      bass_detune: 12,
      bass_cutoff: 1200,
      bass_resonance: 8.0,
      bass_envMod: 0.75,
      bass_decay: 0.14,
      bass_drive: 4.8,
      bass_glide: 0.05,
      bass_sidechain: 0.88,
      bass_sub_level: 0.8,
      bass_volume: 0.95
    }
  },
  {
    id: "industrial_reese_growl",
    name: "🏭 Industrial Reese Dark Growl",
    category: "industrial",
    categoryLabel: "Industrial Techno / Schranz",
    bpm: 145,
    description: "Basso 'Reese' mostruoso con due oscillatori scordati (detuned), saturazione fusa e wavefolding industriale.",
    pattern: [
      { note: "E1", active: 1, accent: 1, slide: 1 },
      { note: "E1", active: 0, accent: 0, slide: 0 },
      { note: "E1", active: 1, accent: 0, slide: 0 },
      { note: "G1", active: 1, accent: 1, slide: 1 },
      { note: "E1", active: 1, accent: 0, slide: 0 },
      { note: "E1", active: 0, accent: 0, slide: 0 },
      { note: "A#1", active: 1, accent: 1, slide: 1 },
      { note: "E1", active: 1, accent: 0, slide: 0 },
      { note: "E1", active: 1, accent: 1, slide: 0 },
      { note: "E1", active: 0, accent: 0, slide: 0 },
      { note: "D1", active: 1, accent: 0, slide: 1 },
      { note: "E1", active: 1, accent: 1, slide: 0 },
      { note: "E1", active: 0, accent: 0, slide: 0 },
      { note: "E1", active: 1, accent: 0, slide: 1 },
      { note: "F1", active: 1, accent: 1, slide: 0 },
      { note: "E1", active: 0, accent: 0, slide: 0 }
    ],
    params: {
      bass_enabled: true,
      bass_type: "reese",
      bass_osc1_wave: "sawtooth",
      bass_osc2_wave: "sawtooth",
      bass_osc2_mix: 0.9,
      bass_detune: 22,
      bass_cutoff: 850,
      bass_resonance: 9.5,
      bass_envMod: 0.6,
      bass_decay: 0.25,
      bass_drive: 7.2,
      bass_glide: 0.09,
      bass_sidechain: 0.85,
      bass_sub_level: 0.85,
      bass_volume: 0.9
    }
  },
  {
    id: "uptempo_zaag_screech",
    name: "💥 Uptempo Zaag Screech Bass",
    category: "uptempo_zaag",
    categoryLabel: "Uptempo Hardcore / Raw",
    bpm: 220,
    description: "Il famosissimo 'Zaag Kick/Bass': dente di sega ad altissima distorsione e pitch piep acuto e violento.",
    pattern: [
      { note: "A1", active: 1, accent: 1, slide: 0 },
      { note: "A1", active: 1, accent: 0, slide: 0 },
      { note: "A1", active: 1, accent: 1, slide: 0 },
      { note: "A1", active: 1, accent: 0, slide: 0 },
      { note: "C2", active: 1, accent: 1, slide: 1 },
      { note: "A1", active: 1, accent: 0, slide: 0 },
      { note: "A1", active: 1, accent: 1, slide: 0 },
      { note: "D#2", active: 1, accent: 1, slide: 1 },
      { note: "A1", active: 1, accent: 1, slide: 0 },
      { note: "A1", active: 1, accent: 0, slide: 0 },
      { note: "A1", active: 1, accent: 1, slide: 0 },
      { note: "A1", active: 1, accent: 0, slide: 0 },
      { note: "F2", active: 1, accent: 1, slide: 1 },
      { note: "E2", active: 1, accent: 1, slide: 0 },
      { note: "A1", active: 1, accent: 0, slide: 0 },
      { note: "A1", active: 1, accent: 1, slide: 0 }
    ],
    params: {
      bass_enabled: true,
      bass_type: "zaag",
      bass_osc1_wave: "sawtooth",
      bass_osc2_wave: "sawtooth",
      bass_osc2_mix: 0.95,
      bass_detune: 18,
      bass_cutoff: 4800,
      bass_resonance: 14.0,
      bass_envMod: 0.95,
      bass_decay: 0.12,
      bass_drive: 9.5,
      bass_glide: 0.04,
      bass_sidechain: 0.65,
      bass_sub_level: 0.7,
      bass_volume: 1.0
    }
  },
  {
    id: "deep_donk_bounce",
    name: "🔊 Deep Sub Donk & Bounce",
    category: "sub_donk",
    categoryLabel: "Hard House / Hard Techno",
    bpm: 150,
    description: "Basso 'Donk' gommoso e profondo generato via sintesi FM, con attacco rotondo e pancia potentissima.",
    pattern: [
      { note: "D1", active: 0, accent: 0, slide: 0 },
      { note: "D1", active: 1, accent: 1, slide: 0 },
      { note: "D1", active: 0, accent: 0, slide: 0 },
      { note: "D1", active: 1, accent: 0, slide: 0 },
      { note: "D1", active: 0, accent: 0, slide: 0 },
      { note: "D1", active: 1, accent: 1, slide: 0 },
      { note: "F1", active: 1, accent: 0, slide: 1 },
      { note: "D1", active: 0, accent: 0, slide: 0 },
      { note: "D1", active: 0, accent: 0, slide: 0 },
      { note: "D1", active: 1, accent: 1, slide: 0 },
      { note: "D1", active: 0, accent: 0, slide: 0 },
      { note: "D1", active: 1, accent: 0, slide: 0 },
      { note: "D1", active: 0, accent: 0, slide: 0 },
      { note: "G1", active: 1, accent: 1, slide: 1 },
      { note: "F1", active: 1, accent: 0, slide: 0 },
      { note: "D1", active: 0, accent: 0, slide: 0 }
    ],
    params: {
      bass_enabled: true,
      bass_type: "donk",
      bass_osc1_wave: "sine",
      bass_osc2_wave: "triangle",
      bass_osc2_mix: 0.5,
      bass_detune: 0,
      bass_cutoff: 950,
      bass_resonance: 6.0,
      bass_envMod: 0.88,
      bass_decay: 0.16,
      bass_drive: 3.5,
      bass_glide: 0.03,
      bass_sidechain: 0.9,
      bass_sub_level: 1.0,
      bass_volume: 0.95
    }
  },
  {
    id: "offbeat_gabber_punch",
    name: "💀 Offbeat Gabber Distorted Sub",
    category: "industrial",
    categoryLabel: "Early Hardcore",
    bpm: 172,
    description: "Il classico basso in levare distorto che risponde alla cassa 909 a 170+ BPM.",
    pattern: [
      { note: "E1", active: 0, accent: 0, slide: 0 },
      { note: "E1", active: 1, accent: 1, slide: 0 },
      { note: "E1", active: 0, accent: 0, slide: 0 },
      { note: "E1", active: 1, accent: 1, slide: 0 },
      { note: "E1", active: 0, accent: 0, slide: 0 },
      { note: "E1", active: 1, accent: 1, slide: 0 },
      { note: "E1", active: 0, accent: 0, slide: 0 },
      { note: "E1", active: 1, accent: 1, slide: 0 },
      { note: "E1", active: 0, accent: 0, slide: 0 },
      { note: "E1", active: 1, accent: 1, slide: 0 },
      { note: "E1", active: 0, accent: 0, slide: 0 },
      { note: "E1", active: 1, accent: 1, slide: 0 },
      { note: "E1", active: 0, accent: 0, slide: 0 },
      { note: "E1", active: 1, accent: 1, slide: 0 },
      { note: "G1", active: 1, accent: 1, slide: 0 },
      { note: "E1", active: 0, accent: 0, slide: 0 }
    ],
    params: {
      bass_enabled: true,
      bass_type: "offbeat",
      bass_osc1_wave: "triangle",
      bass_osc2_wave: "sawtooth",
      bass_osc2_mix: 0.7,
      bass_detune: 10,
      bass_cutoff: 1400,
      bass_resonance: 7.5,
      bass_envMod: 0.7,
      bass_decay: 0.15,
      bass_drive: 7.0,
      bass_glide: 0.02,
      bass_sidechain: 0.95,
      bass_sub_level: 0.9,
      bass_volume: 0.95
    }
  }
];

export class BassPresetManager {
  constructor() {
    this.customBassKey = "kickforge_custom_bass_presets_v1";
    this.customPresets = this.loadCustomPresets();
  }

  loadCustomPresets() {
    try {
      const data = localStorage.getItem(this.customBassKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn("Could not load custom bass presets:", e);
      return [];
    }
  }

  saveCustomPreset(name, category, params, pattern, bpm = 140) {
    const newPreset = {
      id: "custom_bass_" + Date.now(),
      name: `💾 ${name}`,
      category: "custom",
      categoryLabel: category || "I Miei Bassi",
      bpm: bpm,
      description: `Basso personalizzato a ${bpm} BPM.`,
      pattern: pattern ? JSON.parse(JSON.stringify(pattern)) : BASS_PRESETS[0].pattern,
      params: { ...params },
      isCustom: true
    };
    this.customPresets.unshift(newPreset);
    try {
      localStorage.setItem(this.customBassKey, JSON.stringify(this.customPresets));
    } catch (e) {
      console.error("Failed to save custom bass preset:", e);
    }
    return newPreset;
  }

  deleteCustomPreset(id) {
    this.customPresets = this.customPresets.filter(p => p.id !== id);
    try {
      localStorage.setItem(this.customBassKey, JSON.stringify(this.customPresets));
    } catch (e) {
      console.error("Failed to delete custom bass preset:", e);
    }
  }

  getAllPresets() {
    return [...this.customPresets, ...BASS_PRESETS];
  }

  getPresetsByCategory(catId = "all") {
    if (catId === "all") return this.getAllPresets();
    if (catId === "custom") return this.customPresets;
    return BASS_PRESETS.filter(p => p.category === catId);
  }

  getPresetById(id) {
    return this.getAllPresets().find(p => p.id === id) || BASS_PRESETS[0];
  }
}
