/**
 * MelodyForge Studio - AI Melody Generator & Evolution Engine
 * Modulo intelligente per:
 * 1. Generazione di melodie da prompt in linguaggio naturale (stile, atmosfera, ritmo, strumento).
 * 2. Variazione ed evoluzione di melodie intonate alla musica precedente (o completamente nuove se deselezionato).
 * 3. Gestione memoria cronologica delle melodie (undo/redo, storico evoluzioni).
 */

import { CHROMATIC_NOTES, SCALES, isNoteInScale, quantizeToScale, noteNameToMidi, midiToNoteName } from "./scales.js";
import { INSTRUMENT_PRESETS, MELODY_TEMPLATES } from "./instruments.js";

export class MelodyAIEngine {
  constructor() {
    this.history = [];
    this.historyIndex = -1;
    this.pinnedMelody = null;
  }

  /**
   * Salva una snapshot della melodia nella cronologia
   */
  pushHistory(notes, meta = {}) {
    // Se eravamo tornati indietro nella cronologia, rimuovi il futuro
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    const snapshot = {
      notes: JSON.parse(JSON.stringify(notes)),
      meta: { ...meta, timestamp: Date.now() }
    };
    this.history.push(snapshot);
    if (this.history.length > 25) this.history.shift();
    this.historyIndex = this.history.length - 1;
  }

  canUndo() {
    return this.historyIndex > 0;
  }

  canRedo() {
    return this.historyIndex < this.history.length - 1;
  }

  undo() {
    if (!this.canUndo()) return null;
    this.historyIndex--;
    return this.history[this.historyIndex];
  }

  redo() {
    if (!this.canRedo()) return null;
    this.historyIndex++;
    return this.history[this.historyIndex];
  }

  /**
   * Generatore di melodia da prompt testuale naturale (AI Comprehension)
   * Analizza generi, sentimenti, velocità, complessità e timbrica
   */
  generateFromPrompt(promptText, currentRootNote = "F", currentScaleId = "minor_natural", numSteps = 16) {
    const text = (promptText || "").toLowerCase();

    // 1. Riconoscimento Genere e Stile
    let detectedGenre = "anthem";
    let targetInstrument = "rave_supersaw";
    let targetScale = currentScaleId;
    let targetBpm = null;

    if (text.includes("acid") || text.includes("303") || text.includes("tb-303")) {
      detectedGenre = "acid";
      targetInstrument = "acid_303_lead";
      targetScale = "minor_natural";
      targetBpm = 145;
    } else if (text.includes("dark") || text.includes("industrial") || text.includes("underground") || text.includes("berlin")) {
      detectedGenre = "dark_techno";
      targetInstrument = "hardstyle_screech";
      targetScale = "phrygian";
      targetBpm = 150;
    } else if (text.includes("hardstyle") || text.includes("euphoric") || text.includes("inno") || text.includes("anthem") || text.includes("rawstyle") || text.includes("hardcore")) {
      detectedGenre = "anthem";
      targetInstrument = "rave_supersaw";
      targetScale = "minor_harmonic";
      targetBpm = 155;
    } else if (text.includes("trance") || text.includes("pluck") || text.includes("progressive")) {
      detectedGenre = "trance";
      targetInstrument = "trance_pluck";
      targetScale = "minor_natural";
      targetBpm = 138;
    } else if (text.includes("piano") || text.includes("pianoforte") || text.includes("classica") || text.includes("emozionale") || text.includes("tasti")) {
      detectedGenre = "piano";
      targetInstrument = "grand_piano";
      targetScale = text.includes("allegro") ? "major" : "minor_natural";
      targetBpm = 130;
    } else if (text.includes("pad") || text.includes("strings") || text.includes("ambient") || text.includes("atmosfer") || text.includes("spaziale")) {
      detectedGenre = "ambient";
      targetInstrument = "dark_techno_pad";
      targetScale = "dorian";
      targetBpm = 128;
    } else if (text.includes("synthwave") || text.includes("cyberpunk") || text.includes("80s") || text.includes("ottanta") || text.includes("blade runner")) {
      detectedGenre = "cyberpunk";
      targetInstrument = "cyberpunk_brass";
      targetScale = "pentatonic_minor";
      targetBpm = 125;
    } else if (text.includes("8bit") || text.includes("8-bit") || text.includes("chiptune") || text.includes("arcade") || text.includes("gameboy")) {
      detectedGenre = "chiptune";
      targetInstrument = "chiptune_8bit";
      targetScale = "pentatonic_minor";
      targetBpm = 140;
    } else if (text.includes("orientale") || text.includes("giapponese") || text.includes("japan") || text.includes("misterios")) {
      detectedGenre = "orientale";
      targetInstrument = "wood_marimba";
      targetScale = "hirajoshi";
    }

    // 2. Riconoscimento Tonalità nel prompt (es. "in re minore", "in F#", "in la", "in sol")
    let targetRoot = currentRootNote;
    const noteMatches = [
      { rx: /\b(do|c)\b/i, note: "C" },
      { rx: /\b(do#|c#)\b/i, note: "C#" },
      { rx: /\b(re|d)\b/i, note: "D" },
      { rx: /\b(re#|d#)\b/i, note: "D#" },
      { rx: /\b(mi|e)\b/i, note: "E" },
      { rx: /\b(fa|f)\b/i, note: "F" },
      { rx: /\b(fa#|f#)\b/i, note: "F#" },
      { rx: /\b(sol|g)\b/i, note: "G" },
      { rx: /\b(sol#|g#)\b/i, note: "G#" },
      { rx: /\b(la|a)\b/i, note: "A" },
      { rx: /\b(la#|a#)\b/i, note: "A#" },
      { rx: /\b(si|b)\b/i, note: "B" }
    ];
    for (const nm of noteMatches) {
      if (nm.rx.test(text)) {
        targetRoot = nm.note;
        break;
      }
    }

    // 3. Generazione Pattern Melodico secondo le specifiche dello stile
    const notes = this._composeStyleMelody(detectedGenre, targetRoot, targetScale, numSteps, text);

    return {
      notes: notes,
      rootNote: targetRoot,
      scaleId: targetScale,
      instrumentId: targetInstrument,
      bpm: targetBpm,
      name: `AI: ${promptText ? promptText.slice(0, 32) : detectedGenre.toUpperCase()}`,
      description: `Generata melodia in ${targetRoot} (${SCALES[targetScale]?.name || targetScale}) con timbrica ${targetInstrument}.`
    };
  }

  /**
   * Cambia la melodia ed evolve in una nuova variante.
   * Se keepInTuneWithPrevious === true: analizza la melodia precedente ed estrae
   * relazioni armoniche, call-and-response, estensione del tema o variazione ritmica intonata.
   * Se keepInTuneWithPrevious === false: crea una melodia totalmente nuova e slegata.
   */
  evolveMelody(currentNotes, rootNote = "F", scaleId = "minor_natural", keepInTuneWithPrevious = true, numSteps = 16) {
    const scale = SCALES[scaleId] || SCALES.minor_natural;
    const rootIndex = CHROMATIC_NOTES.indexOf(rootNote);
    const scaleIntervals = scale.intervals;
    const baseMidi = 60 + rootIndex; // C4 + root

    // Se non vogliamo legami con la precedente o se non ci sono note: genera melodia fresca
    if (!keepInTuneWithPrevious || !currentNotes || currentNotes.length === 0) {
      const freshTemplates = ["euphoric_anthem", "dark_techno_riff", "cyberpunk_arp", "acid_hook"];
      const chosenTmpl = freshTemplates[Math.floor(Math.random() * freshTemplates.length)];
      const tmpl = MELODY_TEMPLATES[chosenTmpl];
      const degrees = tmpl.generate(rootNote, scaleId, numSteps);
      const newNotes = [];
      degrees.forEach((deg, s) => {
        if (deg === null || deg === undefined) return;
        const oct = Math.floor(deg / scaleIntervals.length);
        const degMod = deg % scaleIntervals.length;
        const semitone = scaleIntervals[degMod] + oct * 12;
        newNotes.push({
          step: s,
          midi: baseMidi + semitone,
          velocity: 0.8 + Math.random() * 0.15,
          gate: 1,
          active: 1
        });
      });
      return {
        notes: newNotes,
        type: "fresh",
        description: `Nuova melodia indipendente generata su ${rootNote} ${scale.name}`
      };
    }

    // =========================================================================
    // INTONAZIONE & EVOLUZIONE ARMONICA DALLA MELODIA PRECEDENTE
    // =========================================================================
    // 1. Analisi della melodia precedente
    const activeSteps = currentNotes.map(n => n.step).sort((a, b) => a - b);
    const usedMidis = currentNotes.map(n => n.midi);
    const minMidi = Math.min(...usedMidis);
    const maxMidi = Math.max(...usedMidis);
    const avgMidi = Math.round(usedMidis.reduce((a, b) => a + b, 0) / usedMidis.length);

    // Mappa semitoni usati
    const usedDegrees = currentNotes.map(n => {
      const relSemitone = ((n.midi - baseMidi) % 12 + 12) % 12;
      const degIndex = scaleIntervals.indexOf(relSemitone);
      return degIndex !== -1 ? degIndex : 0;
    });

    // 2. Scegli strategia di evoluzione musicale (5 varianti collegate)
    const evolutionModes = [
      "call_and_response",    // Mantiene la prima parte, risponde nella seconda parte
      "thematic_variation",   // Stesso ritmo, note melodiche variate per tensione e risoluzione
      "harmonic_elevation",   // Spostamento di ottava / Climax festival drop
      "rhythmic_syncopation", // Stesse note/altezze, ma ritmo sincopato e rimodellato
      "inverted_contour"      // Inverte la salita/discesa melodica per creare la contro-melodia
    ];

    const mode = evolutionModes[Math.floor(Math.random() * evolutionModes.length)];
    const evolvedNotes = [];

    if (mode === "call_and_response") {
      // Metà 1 (step 0..7): conservazione del tema precedente
      currentNotes.forEach(n => {
        if (n.step < numSteps / 2) {
          evolvedNotes.push({ ...n });
        }
      });
      // Metà 2 (step 8..15): risposta melodica che conclude con risoluzione tonale
      const halfStep = Math.floor(numSteps / 2);
      for (let s = halfStep; s < numSteps; s++) {
        // Se sullo step c'era una nota o creiamo risposta
        if (activeSteps.includes(s) || (s % 2 === 0)) {
          // Conclusione sull'ultimo step sempre sulla fondamentale (root) o quinta
          const isEnding = s >= numSteps - 2;
          let degreeIndex = isEnding ? 0 : (scaleIntervals.length - 1 - (s % 3));
          if (degreeIndex < 0) degreeIndex = 0;
          const semitone = scaleIntervals[degreeIndex % scaleIntervals.length];
          const midi = baseMidi + semitone + (s % 4 === 0 ? 12 : 0);
          evolvedNotes.push({
            step: s,
            midi: quantizeToScale(midi, rootNote, scaleId),
            velocity: isEnding ? 0.95 : 0.85,
            gate: isEnding ? 2 : 1,
            active: 1
          });
        }
      }
    } else if (mode === "thematic_variation") {
      // Mantiene la posizione ritmica degli step, ma varia le altezze delle note
      currentNotes.forEach((n, idx) => {
        // Variazione del grado della scala (+1 o +2 gradi rispetto a prima)
        const shiftDegrees = [1, 2, -1, 3][Math.floor(Math.random() * 4)];
        const prevDegree = usedDegrees[idx] || 0;
        const newDegree = Math.max(0, (prevDegree + shiftDegrees) % (scaleIntervals.length * 2));
        const oct = Math.floor(newDegree / scaleIntervals.length);
        const degMod = newDegree % scaleIntervals.length;
        const semitone = scaleIntervals[degMod] + oct * 12;
        evolvedNotes.push({
          step: n.step,
          midi: quantizeToScale(baseMidi + semitone, rootNote, scaleId),
          velocity: Math.min(1.0, (n.velocity || 0.85) * (0.9 + Math.random() * 0.2)),
          gate: n.gate || 1,
          active: 1
        });
      });
    } else if (mode === "harmonic_elevation") {
      // Alza le note più incisive di un'ottava per creare un climax intonato
      currentNotes.forEach(n => {
        const raiseOctave = n.step % 4 === 0 || Math.random() < 0.45;
        const newMidi = raiseOctave && n.midi <= 72 ? n.midi + 12 : n.midi;
        evolvedNotes.push({
          step: n.step,
          midi: quantizeToScale(newMidi, rootNote, scaleId),
          velocity: raiseOctave ? 0.95 : 0.85,
          gate: n.gate || 1,
          active: 1
        });
      });
    } else if (mode === "rhythmic_syncopation") {
      // Stesse note precedenti ma anticipate o ritardate di 1 sedicesimo per creare sincopi ballabili
      currentNotes.forEach((n, idx) => {
        const offset = Math.random() < 0.5 ? 1 : -1;
        let newStep = n.step + offset;
        if (newStep < 0) newStep = 0;
        if (newStep >= numSteps) newStep = numSteps - 1;
        // Evita sovrascritture di step
        if (!evolvedNotes.some(en => en.step === newStep)) {
          evolvedNotes.push({
            step: newStep,
            midi: n.midi,
            velocity: n.velocity || 0.85,
            gate: 1,
            active: 1
          });
        } else {
          evolvedNotes.push({ ...n });
        }
      });
    } else {
      // Inverted Contour: rovescia la curva melodica intorno alla media
      currentNotes.forEach(n => {
        const diff = n.midi - avgMidi;
        const invertedMidi = avgMidi - diff;
        evolvedNotes.push({
          step: n.step,
          midi: quantizeToScale(invertedMidi, rootNote, scaleId),
          velocity: n.velocity || 0.85,
          gate: n.gate || 1,
          active: 1
        });
      });
    }

    // Assicura che ci sia almeno una nota
    if (evolvedNotes.length === 0) {
      evolvedNotes.push({ step: 0, midi: baseMidi, velocity: 0.85, gate: 1, active: 1 });
    }

    return {
      notes: evolvedNotes,
      type: mode,
      description: `Evoluzione intonata (${mode.replace(/_/g, " ")}) collegata alla melodia precedente.`
    };
  }

  /**
   * Cambia solo il ritmo (mantiene le note/altezze usate)
   */
  variateRhythmOnly(currentNotes, numSteps = 16) {
    if (!currentNotes || currentNotes.length === 0) return currentNotes;
    const midis = currentNotes.map(n => n.midi);
    const newNotes = [];
    let midiIdx = 0;

    for (let s = 0; s < numSteps; s++) {
      // Densità tipica dance (circa 50-65% degli step)
      if (Math.random() < 0.55 || s % 4 === 0) {
        newNotes.push({
          step: s,
          midi: midis[midiIdx % midis.length],
          velocity: 0.8 + Math.random() * 0.18,
          gate: Math.random() < 0.25 ? 2 : 1,
          active: 1
        });
        midiIdx++;
      }
    }
    return newNotes;
  }

  /**
   * Cambia solo le note (mantiene la scansione ritmica esatta)
   */
  variatePitchesOnly(currentNotes, rootNote, scaleId) {
    if (!currentNotes || currentNotes.length === 0) return currentNotes;
    const scale = SCALES[scaleId] || SCALES.minor_natural;
    const intervals = scale.intervals;
    const baseMidi = 60 + CHROMATIC_NOTES.indexOf(rootNote);

    return currentNotes.map(n => {
      const randDeg = intervals[Math.floor(Math.random() * intervals.length)];
      const randOct = Math.random() < 0.35 ? 12 : 0;
      return {
        ...n,
        midi: baseMidi + randDeg + randOct
      };
    });
  }

  /**
   * Compositore interno per stile
   */
  _composeStyleMelody(genre, rootNote, scaleId, numSteps, prompt) {
    const scale = SCALES[scaleId] || SCALES.minor_natural;
    const rootIndex = CHROMATIC_NOTES.indexOf(rootNote);
    const intervals = scale.intervals;
    const baseMidi = 60 + rootIndex;

    const notes = [];

    if (genre === "anthem") {
      // Inno Hardstyle: struttura ad arco con salti melodici trionfali e climax
      const anthemMotif = [0, 0, 2, 4, 3, 2, 4, 7, 6, 4, 2, 3, 4, 7, 9, 7];
      for (let s = 0; s < numSteps; s++) {
        const deg = anthemMotif[s % anthemMotif.length];
        const oct = Math.floor(deg / intervals.length);
        const semitone = intervals[deg % intervals.length] + oct * 12;
        notes.push({
          step: s,
          midi: baseMidi + semitone,
          velocity: (s % 4 === 0) ? 0.95 : 0.82,
          gate: (s === 7 || s === 15) ? 2 : 1,
          active: 1
        });
      }
    } else if (genre === "dark_techno") {
      // Dark Techno: riff serrato su 2-3 note con pause sincopate
      const riff = [0, null, 1, 0, null, 0, 3, 0, null, 1, 0, null, 0, 4, 1, 0];
      for (let s = 0; s < numSteps; s++) {
        const deg = riff[s % riff.length];
        if (deg !== null) {
          const semitone = intervals[deg % intervals.length];
          notes.push({
            step: s,
            midi: baseMidi + semitone,
            velocity: (s % 4 === 0) ? 0.9 : 0.78,
            gate: 1,
            active: 1
          });
        }
      }
    } else if (genre === "acid") {
      // Acid 303: salti d'ottava e pause
      const acidSteps = [0, 12, 0, 7, null, 3, 2, null, 0, null, 10, 12, null, 0, 3, 2];
      for (let s = 0; s < numSteps; s++) {
        const deg = acidSteps[s % acidSteps.length];
        if (deg !== null) {
          notes.push({
            step: s,
            midi: quantizeToScale(baseMidi + deg, rootNote, scaleId),
            velocity: (s % 4 === 2) ? 0.95 : 0.85,
            gate: 1,
            active: 1
          });
        }
      }
    } else if (genre === "piano" || genre === "ambient") {
      // Melodia cantabile con note lunghe e accordi
      for (let s = 0; s < numSteps; s += 2) {
        const deg = intervals[(s / 2) % intervals.length];
        notes.push({
          step: s,
          midi: baseMidi + deg,
          velocity: 0.85,
          gate: 2,
          active: 1
        });
      }
    } else {
      // Arpeggio fluido di default
      for (let s = 0; s < numSteps; s++) {
        const deg = intervals[s % intervals.length];
        const oct = (s % 8 >= 4) ? 12 : 0;
        notes.push({
          step: s,
          midi: baseMidi + deg + oct,
          velocity: 0.85,
          gate: 1,
          active: 1
        });
      }
    }

    return notes;
  }
}
