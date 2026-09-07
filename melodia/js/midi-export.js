/**
 * MelodyForge Studio - Standard MIDI File (.MID) Exporter
 * Genera file binari Standard MIDI File (SMF Format 0) per importazione immediata
 * in qualsiasi DAW (FL Studio, Ableton Live, Logic Pro, Cubase, Reaper, ecc.)
 */

export class MidiExporter {
  /**
   * Converte un intero in sequenza di byte a lunghezza variabile (Variable-Length Quantity)
   */
  static writeVarLen(value) {
    const bytes = [];
    bytes.push(value & 0x7F);
    while ((value >>= 7)) {
      bytes.unshift((value & 0x7F) | 0x80);
    }
    return bytes;
  }

  /**
   * Genera un file MIDI completo a partire dal pattern di note
   * @param {Array} notesPattern Array di { step, midi, gate, velocity, active }
   * @param {number} bpm Battiti per minuto
   * @param {number} numSteps Numero di step (16 o 32)
   * @param {string} trackName Nome traccia
   * @returns {Blob} Blob binario con mime-type audio/midi
   */
  static generateMidiBlob(notesPattern, bpm = 150, numSteps = 16, trackName = "MelodyForge Lead") {
    const ticksPerQuarter = 480;
    const ticksPer16th = Math.round(ticksPerQuarter / 4); // 120 ticks per sedicesimo

    // Microsecondi per quarto (tempo)
    const mpqn = Math.round(60000000 / bpm);

    // Raccoglie tutti gli eventi ordinati nel tempo
    // Ogni evento: { tick, type: "on"|"off", midi, velocity }
    const events = [];

    notesPattern.forEach(n => {
      if (!n.active) return;
      const startTick = n.step * ticksPer16th;
      const gateSteps = Math.max(0.5, n.gate || 1);
      const durationTicks = Math.max(ticksPer16th * 0.5, Math.round(gateSteps * ticksPer16th * 0.95));
      const endTick = startTick + durationTicks;
      const vel = Math.round((n.velocity || 0.85) * 127);

      events.push({ tick: startTick, type: "on", midi: n.midi, velocity: Math.max(1, Math.min(127, vel)) });
      events.push({ tick: endTick, type: "off", midi: n.midi, velocity: 0 });
    });

    // Ordina eventi per tick crescente (gli 'off' prima degli 'on' allo stesso tick)
    events.sort((a, b) => {
      if (a.tick !== b.tick) return a.tick - b.tick;
      if (a.type === "off" && b.type === "on") return -1;
      if (a.type === "on" && b.type === "off") return 1;
      return 0;
    });

    // Byte del track chunk
    const trackBytes = [];

    // Meta Event: Track Name (FF 03 len name)
    trackBytes.push(...this.writeVarLen(0)); // Delta time 0
    trackBytes.push(0xFF, 0x03, trackName.length);
    for (let i = 0; i < trackName.length; i++) {
      trackBytes.push(trackName.charCodeAt(i));
    }

    // Meta Event: Time Signature 4/4 (FF 58 04 04 02 18 08)
    trackBytes.push(...this.writeVarLen(0));
    trackBytes.push(0xFF, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08);

    // Meta Event: Set Tempo (FF 51 03 tt tt tt)
    trackBytes.push(...this.writeVarLen(0));
    trackBytes.push(0xFF, 0x51, 0x03, (mpqn >> 16) & 0xFF, (mpqn >> 8) & 0xFF, mpqn & 0xFF);

    let lastTick = 0;
    events.forEach(ev => {
      const delta = ev.tick - lastTick;
      trackBytes.push(...this.writeVarLen(delta));
      lastTick = ev.tick;

      if (ev.type === "on") {
        // Note On su Canale 0: 0x90, nota, velocity
        trackBytes.push(0x90, ev.midi & 0x7F, ev.velocity & 0x7F);
      } else {
        // Note Off su Canale 0: 0x80, nota, 0
        trackBytes.push(0x80, ev.midi & 0x7F, 0x00);
      }
    });

    // Meta Event: End of Track (FF 2F 00)
    trackBytes.push(...this.writeVarLen(0));
    trackBytes.push(0xFF, 0x2F, 0x00);

    // Creazione Header Chunk: MThd (length = 6, format = 0, ntracks = 1, division = ticksPerQuarter)
    const headerBytes = [
      0x4D, 0x54, 0x68, 0x64, // 'MThd'
      0x00, 0x00, 0x00, 0x06, // chunk size 6
      0x00, 0x00,             // format 0
      0x00, 0x01,             // 1 track
      (ticksPerQuarter >> 8) & 0xFF, ticksPerQuarter & 0xFF
    ];

    // Track Chunk Header: MTrk + lunghezza
    const trackHeaderBytes = [
      0x4D, 0x54, 0x72, 0x6B, // 'MTrk'
      (trackBytes.length >> 24) & 0xFF,
      (trackBytes.length >> 16) & 0xFF,
      (trackBytes.length >> 8) & 0xFF,
      trackBytes.length & 0xFF
    ];

    const totalBytes = new Uint8Array(headerBytes.length + trackHeaderBytes.length + trackBytes.length);
    totalBytes.set(headerBytes, 0);
    totalBytes.set(trackHeaderBytes, headerBytes.length);
    totalBytes.set(trackBytes, headerBytes.length + trackHeaderBytes.length);

    return new Blob([totalBytes], { type: "audio/midi" });
  }

  /**
   * Avvia il download del file .mid nel browser
   */
  static downloadMidi(notesPattern, bpm, numSteps, rootNote, scaleName) {
    const filename = `melodia_${rootNote}_${scaleName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${bpm}bpm.mid`;
    const blob = this.generateMidiBlob(notesPattern, bpm, numSteps, `MelodyForge ${rootNote}`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
