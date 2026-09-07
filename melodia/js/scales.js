/**
 * MelodyForge Studio - Scales & Harmonic Tuning Engine
 * Gestisce tonalità, scale musicali, calcolo frequenze e intonazione in armonia con la cassa.
 */

// Tutte le 12 note semitonali
export const CHROMATIC_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Nomi note italiani / internazionali
export const NOTE_NAMES_IT = {
  "C": "Do", "C#": "Do#", "D": "Re", "D#": "Re#", "E": "Mi", "F": "Fa",
  "F#": "Fa#", "G": "Sol", "G#": "Sol#", "A": "La", "A#": "La#", "B": "Si"
};

// Dizionario scale musicali con intervalli in semitoni
export const SCALES = {
  minor_natural: {
    id: "minor_natural",
    name: "Minore Naturale (Eolia)",
    badge: "Techno / Hardstyle",
    description: "La scala per eccellenza per melodie epiche, scure ed emozionali.",
    intervals: [0, 2, 3, 5, 7, 8, 10]
  },
  minor_harmonic: {
    id: "minor_harmonic",
    name: "Minore Armonica",
    badge: "Anthem / Euphoric",
    description: "Sapore drammatico, teatrale e potente tipico degli inni Hardstyle e Trance.",
    intervals: [0, 2, 3, 5, 7, 8, 11]
  },
  phrygian: {
    id: "phrygian",
    name: "Frigia (Dark Phrygian)",
    badge: "Dark Techno / Hardcore",
    description: "Tensione aggressiva con il secondo grado diminuito, perfetta per riff industriali.",
    intervals: [0, 1, 3, 5, 7, 8, 10]
  },
  dorian: {
    id: "dorian",
    name: "Dorica (Melodic Dorian)",
    badge: "Melodic Techno",
    description: "Minore con una sesta maggiore luminosa, usata nella moderna Melodic Techno e Progressive.",
    intervals: [0, 2, 3, 5, 7, 9, 10]
  },
  major: {
    id: "major",
    name: "Maggiore (Ionica)",
    badge: "Happy / Uplifting",
    description: "Aperta, solare ed energica per brani euforici e melodie celebrative.",
    intervals: [0, 2, 4, 5, 7, 9, 11]
  },
  pentatonic_minor: {
    id: "pentatonic_minor",
    name: "Pentatonica Minore",
    badge: "Rock / Synthwave",
    description: "Impossibile sbagliare una nota: riff fluidi, grintosi e immediati.",
    intervals: [0, 3, 5, 7, 10]
  },
  hirajoshi: {
    id: "hirajoshi",
    name: "Hirajoshi Giapponese",
    badge: "Exotic / Cyberpunk",
    description: "Scala pentatonica nipponica misteriosa e ipnotica, ideale per synthwave e ambient scuro.",
    intervals: [0, 2, 3, 7, 8]
  },
  blues: {
    id: "blues",
    name: "Blues / Grunge Synth",
    badge: "Acid / Raw",
    description: "Contiene la 'blue note' diminuita per creare hook stridenti e acidi.",
    intervals: [0, 3, 5, 6, 7, 10]
  }
};

/**
 * Calcola la frequenza in Hz di una nota MIDI (A4 = 440 Hz, MIDI 69)
 */
export function midiToFreq(midiNote) {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

/**
 * Converte nome nota (es. "F4", "C#3") in numero nota MIDI
 */
export function noteNameToMidi(noteName) {
  const match = noteName.match(/^([A-G]#?)(-?\d+)$/);
  if (!match) return 60; // C4 default
  const note = match[1];
  const octave = parseInt(match[2], 10);
  const noteIndex = CHROMATIC_NOTES.indexOf(note);
  if (noteIndex === -1) return 60;
  return (octave + 1) * 12 + noteIndex;
}

/**
 * Converte numero MIDI in nome nota (es. 60 -> "C4")
 */
export function midiToNoteName(midiNote) {
  const noteIndex = midiNote % 12;
  const octave = Math.floor(midiNote / 12) - 1;
  return `${CHROMATIC_NOTES[noteIndex]}${octave}`;
}

/**
 * Restituisce l'insieme dei numeri di semitono (0..11) appartenenti alla scala data la fondamentale
 */
export function getScaleSemitones(rootNote, scaleId = "minor_natural") {
  const rootIndex = CHROMATIC_NOTES.indexOf(rootNote);
  if (rootIndex === -1) return new Set();
  const scale = SCALES[scaleId] || SCALES.minor_natural;
  const semitones = new Set();
  scale.intervals.forEach(interval => {
    semitones.add((rootIndex + interval) % 12);
  });
  return semitones;
}

/**
 * Verifica se una nota appartiene alla scala corrente
 */
export function isNoteInScale(noteNameOrMidi, rootNote, scaleId = "minor_natural") {
  const midi = typeof noteNameOrMidi === "number" ? noteNameOrMidi : noteNameToMidi(noteNameOrMidi);
  const semitone = midi % 12;
  const scaleSemitones = getScaleSemitones(rootNote, scaleId);
  return scaleSemitones.has(semitone);
}

/**
 * Quantizza una nota alla nota più vicina all'interno della scala
 */
export function quantizeToScale(midiNote, rootNote, scaleId = "minor_natural") {
  const scaleSemitones = getScaleSemitones(rootNote, scaleId);
  if (scaleSemitones.has(midiNote % 12)) return midiNote;

  // Cerca verso l'alto o verso il basso il semitono più vicino
  for (let offset = 1; offset <= 6; offset++) {
    if (scaleSemitones.has((midiNote + offset) % 12)) return midiNote + offset;
    if (scaleSemitones.has((midiNote - offset + 12) % 12)) return midiNote - offset;
  }
  return midiNote;
}

/**
 * Mappa frequenze fondamentali tipiche del kick ai semitoni corrispondenti
 */
export const KICK_TUNING_PRESETS = [
  { note: "C",  freq: 32.7, label: "Do (C1 ~ 32.7 Hz) - Sub Profondo / Deep Techno" },
  { note: "C#", freq: 34.6, label: "Do# (C#1 ~ 34.6 Hz) - Dark & Heavy" },
  { note: "D",  freq: 36.7, label: "Re (D1 ~ 36.7 Hz) - Potente & Rotondo" },
  { note: "D#", freq: 38.9, label: "Re# (D#1 ~ 38.9 Hz) - Standard Techno/Acid" },
  { note: "E",  freq: 41.2, label: "Mi (E1 ~ 41.2 Hz) - Pressione Subwoofer" },
  { note: "F",  freq: 43.6, label: "Fa (F1 ~ 43.6 Hz) - Re dell'Hardstyle / Hardcore" },
  { note: "F#", freq: 46.2, label: "Fa# (F#1 ~ 46.2 Hz) - Aggressivo / Frenchcore" },
  { note: "G",  freq: 49.0, label: "Sol (G1 ~ 49.0 Hz) - Massimo Pugno al Torace" },
  { note: "G#", freq: 51.9, label: "Sol# (G#1 ~ 51.9 Hz) - Uptempo / Fast Punch" },
  { note: "A",  freq: 55.0, label: "La (A1 ~ 55.0 Hz) - Veloce / Punch Alto" },
  { note: "A#", freq: 58.3, label: "La# (A#1 ~ 58.3 Hz) - Tight & Percussivo" },
  { note: "B",  freq: 61.7, label: "Si (B1 ~ 61.7 Hz) - Molto acuto / Industrial" }
];

/**
 * Trova la nota musicale più vicina a partire da una frequenza in Hz (es. subFreq o tailFreq della cassa)
 */
export function detectNoteFromFrequency(hz) {
  if (!hz || hz <= 10) return { note: "F", midi: 29, octave: 1, diffCents: 0 };
  const midiExact = 69 + 12 * Math.log2(hz / 440);
  const midiRound = Math.round(midiExact);
  const diffCents = Math.round((midiExact - midiRound) * 100);
  const noteIndex = ((midiRound % 12) + 12) % 12;
  const octave = Math.floor(midiRound / 12) - 1;
  return {
    note: CHROMATIC_NOTES[noteIndex],
    octave: octave,
    midi: midiRound,
    diffCents: diffCents
  };
}
