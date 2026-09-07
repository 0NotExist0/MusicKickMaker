/**
 * MelodyForge Studio - Interactive Piano Roll & Sequencer
 * Gestisce l'editor visuale delle note, la griglia dei sedicesimi (16/32 step),
 * l'evidenziazione e blocco della scala armonica, e la tastiera suonabile dal vivo.
 */

import { CHROMATIC_NOTES, isNoteInScale, midiToNoteName, quantizeToScale } from "./scales.js";

export class PianoRoll {
  constructor(options = {}) {
    this.container = options.container;
    this.synthEngine = options.synthEngine;
    this.onNotesChange = options.onNotesChange || (() => {});

    // Range di note visualizzate: da C3 (48) a B5 (83) - 3 ottave complete
    this.startMidi = 48; // C3
    this.endMidi = 83;   // B5
    this.numSteps = options.numSteps || 16;
    this.polyphonic = true; // permette accordi

    this.rootNote = "F";
    this.scaleId = "minor_natural";
    this.scaleLock = false; // se attivo forza solo note in scala

    // Mappa note attive: Map(key "step-midi", noteObj)
    this.notes = new Map();

    // Stato drag/editing
    this.isMouseDown = false;
    this.currentPlayheadStep = -1;

    this.render();
  }

  setTuning(rootNote, scaleId) {
    this.rootNote = rootNote;
    this.scaleId = scaleId;
    this.updateScaleHighlighting();
  }

  setNumSteps(steps) {
    this.numSteps = steps;
    // Rimuovi note oltre il limite
    for (const [key, n] of this.notes.entries()) {
      if (n.step >= steps) this.notes.delete(key);
    }
    this.render();
    this.onNotesChange(this.getNotesArray());
  }

  getNotesArray() {
    return Array.from(this.notes.values());
  }

  setNotesArray(arr) {
    this.notes.clear();
    arr.forEach(n => {
      const key = `${n.step}-${n.midi}`;
      this.notes.set(key, { ...n, active: 1 });
    });
    this.render();
    this.onNotesChange(this.getNotesArray());
  }

  clear() {
    this.notes.clear();
    this.render();
    this.onNotesChange(this.getNotesArray());
  }

  transpose(semitones) {
    const updated = [];
    this.notes.forEach(n => {
      let newMidi = n.midi + semitones;
      if (newMidi >= this.startMidi && newMidi <= this.endMidi) {
        if (this.scaleLock) {
          newMidi = quantizeToScale(newMidi, this.rootNote, this.scaleId);
        }
        updated.push({ ...n, midi: newMidi });
      }
    });
    this.notes.clear();
    updated.forEach(n => {
      this.notes.set(`${n.step}-${n.midi}`, n);
    });
    this.render();
    this.onNotesChange(this.getNotesArray());
  }

  /**
   * Disegna l'intera interfaccia del Piano Roll
   */
  render() {
    if (!this.container) return;
    this.container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "pianoroll-wrapper";

    // Colonna sinistra: tasti pianoforte e nomi note
    const keyboardCol = document.createElement("div");
    keyboardCol.className = "pianoroll-keyboard-col";

    // Griglia centrale: step x note
    const gridArea = document.createElement("div");
    gridArea.className = "pianoroll-grid-area";

    // Header numeri step (1 .. 16 / 32)
    const stepsHeader = document.createElement("div");
    stepsHeader.className = "pianoroll-steps-header";

    // Spazio vuoto sopra la colonna tastiera
    const cornerHeader = document.createElement("div");
    cornerHeader.className = "pianoroll-corner-header";
    cornerHeader.innerHTML = `<span class="pr-scale-info">${this.rootNote}</span>`;
    wrapper.appendChild(cornerHeader);

    for (let s = 0; s < this.numSteps; s++) {
      const stepBadge = document.createElement("div");
      stepBadge.className = `pr-step-badge ${s % 4 === 0 ? "pr-beat-start" : ""}`;
      stepBadge.dataset.step = s;
      stepBadge.textContent = s + 1;
      stepsHeader.appendChild(stepBadge);
    }
    gridArea.appendChild(stepsHeader);

    // Corpo griglia (dalla nota più acuta alla più grave)
    const gridBody = document.createElement("div");
    gridBody.className = "pianoroll-grid-body";

    for (let midi = this.endMidi; midi >= this.startMidi; midi--) {
      const noteName = midiToNoteName(midi);
      const isSharp = noteName.includes("#");
      const isRoot = noteName.startsWith(this.rootNote) && (noteName[this.rootNote.length] >= "0" && noteName[this.rootNote.length] <= "9");
      const inScale = isNoteInScale(midi, this.rootNote, this.scaleId);

      // Tasto a sinistra
      const keyEl = document.createElement("div");
      keyEl.className = `pr-key ${isSharp ? "pr-key-black" : "pr-key-white"} ${isRoot ? "pr-key-root" : ""} ${inScale ? "pr-key-in-scale" : "pr-key-out-scale"}`;
      keyEl.dataset.midi = midi;
      keyEl.innerHTML = `
        <span class="pr-key-name">${noteName}</span>
        ${isRoot ? '<span class="pr-root-dot" title="Nota fondamentale cassa">●</span>' : ''}
      `;

      // Cliccando sul tasto a sinistra, suona la nota
      keyEl.addEventListener("mousedown", (e) => {
        e.preventDefault();
        if (this.synthEngine) {
          this.synthEngine.initAudio();
          this.synthEngine.triggerNote(midi, 0.4);
        }
      });
      keyboardCol.appendChild(keyEl);

      // Riga della griglia
      const rowEl = document.createElement("div");
      rowEl.className = `pr-row ${isSharp ? "pr-row-black" : "pr-row-white"} ${isRoot ? "pr-row-root" : ""} ${inScale ? "pr-row-in-scale" : "pr-row-out-scale"}`;
      rowEl.dataset.midi = midi;

      for (let s = 0; s < this.numSteps; s++) {
        const cell = document.createElement("div");
        const isBeat = s % 4 === 0;
        cell.className = `pr-cell ${isBeat ? "pr-beat-cell" : ""}`;
        cell.dataset.step = s;
        cell.dataset.midi = midi;

        const noteKey = `${s}-${midi}`;
        if (this.notes.has(noteKey)) {
          const noteData = this.notes.get(noteKey);
          const noteBlock = this.createNoteElement(noteData);
          cell.appendChild(noteBlock);
          cell.classList.add("has-note");
        }

        cell.addEventListener("mousedown", (e) => this.handleCellClick(s, midi, e));
        rowEl.appendChild(cell);
      }
      gridBody.appendChild(rowEl);
    }

    gridArea.appendChild(gridBody);
    wrapper.appendChild(keyboardCol);
    wrapper.appendChild(gridArea);
    this.container.appendChild(wrapper);

    this.stepsHeaderEl = stepsHeader;
    this.gridBodyEl = gridBody;
  }

  /**
   * Crea l'elemento visuale del blocco nota dentro una cella
   */
  createNoteElement(noteData) {
    const block = document.createElement("div");
    block.className = "pr-note-block";
    block.dataset.step = noteData.step;
    block.dataset.midi = noteData.midi;
    block.style.opacity = Math.max(0.4, noteData.velocity || 0.85);

    // Testo nota compatto
    const nameLabel = document.createElement("span");
    nameLabel.className = "pr-note-label";
    nameLabel.textContent = midiToNoteName(noteData.midi);
    block.appendChild(nameLabel);

    // Maniglia durata / gate (allungare la nota)
    const gateHandle = document.createElement("div");
    gateHandle.className = "pr-note-gate-handle";
    gateHandle.title = "Doppio click per estendere la durata";
    gateHandle.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      noteData.gate = ((noteData.gate || 1) % 4) + 1;
      block.dataset.gate = noteData.gate;
      this.onNotesChange(this.getNotesArray());
    });
    block.appendChild(gateHandle);

    return block;
  }

  /**
   * Gestisce il click su una cella (aggiunta/rimozione nota)
   */
  handleCellClick(step, midi, event) {
    // Se premuto su un blocco esistente, rimuovi la nota
    const key = `${step}-${midi}`;
    if (this.notes.has(key)) {
      this.notes.delete(key);
      this.render();
      this.onNotesChange(this.getNotesArray());
      return;
    }

    // Se la modalità Scale Lock è attiva e la nota non è in scala, quantizza
    let finalMidi = midi;
    if (this.scaleLock && !isNoteInScale(midi, this.rootNote, this.scaleId)) {
      finalMidi = quantizeToScale(midi, this.rootNote, this.scaleId);
    }

    // Se non è polifonico, rimuovi eventuali altre note su questo step
    if (!this.polyphonic) {
      for (let m = this.startMidi; m <= this.endMidi; m++) {
        this.notes.delete(`${step}-${m}`);
      }
    }

    // Aggiungi nuova nota
    const newNote = {
      step: step,
      midi: finalMidi,
      velocity: 0.85,
      gate: 1,
      active: 1
    };
    this.notes.set(`${step}-${finalMidi}`, newNote);

    // Suona subito l'anteprima sonora della nota
    if (this.synthEngine) {
      this.synthEngine.initAudio();
      this.synthEngine.triggerNote(finalMidi, 0.25, 0.85);
    }

    this.render();
    this.onNotesChange(this.getNotesArray());
  }

  /**
   * Aggiorna al volo le classi di evidenziazione della scala senza ricostruire l'intero DOM
   */
  updateScaleHighlighting() {
    this.render();
  }

  /**
   * Sposta l'indicatore visuale del playhead durante la riproduzione in loop
   */
  setPlayhead(step) {
    this.currentPlayheadStep = step;
    if (!this.stepsHeaderEl) return;

    // Rimuovi classe attiva precedente
    const prevHeader = this.stepsHeaderEl.querySelector(".pr-step-badge.active");
    if (prevHeader) prevHeader.classList.remove("active");

    const prevCells = this.container.querySelectorAll(".pr-cell.playhead-active");
    prevCells.forEach(c => c.classList.remove("playhead-active"));

    if (step >= 0 && step < this.numSteps) {
      const activeBadge = this.stepsHeaderEl.children[step];
      if (activeBadge) activeBadge.classList.add("active");

      const currentCells = this.container.querySelectorAll(`.pr-cell[data-step="${step}"]`);
      currentCells.forEach(c => c.classList.add("playhead-active"));
    }
  }
}
