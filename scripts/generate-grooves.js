/**
 * KickForge 303 - Generatore automatico della libreria di groove.
 * Eseguito da GitHub Actions su schedule: genera qualche groove (basso + hi-hat)
 * nei vari sottogeneri techno e li appende a groove-library.json.
 *
 * Env: AI_API_KEY (obbligatoria), AI_BASE_URL, AI_MODEL, AI_REASONING_EFFORT,
 *      GROOVES_PER_RUN (default 3).
 */

const fs = require("fs");
const path = require("path");

const AVAILABLE_NOTES = [
  "C1", "C#1", "D1", "D#1", "E1", "F1", "F#1", "G1", "G#1", "A1", "A#1", "B1",
  "C2", "C#2", "D2", "D#2", "E2", "F2", "F#2", "G2", "G#2", "A2", "A#2", "B2", "C3"
];
const SUBGENRES = ["techno", "hard techno", "acidcore", "gabber", "frenchcore", "uptempo", "industrial"];

const LIB_PATH = path.join(__dirname, "..", "groove-library.json");
const PER_RUN = Math.max(1, Math.min(12, parseInt(process.env.GROOVES_PER_RUN || "3", 10)));
const MAX_LIB = 250;

function buildGroovePrompt() {
  return `You design grooves for KickForge 303, a synth for the TECHNO family.
The KICK is ALWAYS four-on-the-floor and fixed — do NOT design it.
Design a 16-step BASS line and a 16-step HI-HAT pattern.

Return ONLY valid JSON:
{ "name": string, "subgenre": string,
  "bass": [ 16 objects: {"note": one of C1..C3, "active":0|1, "accent":0|1, "slide":0|1} ],
  "hats": [ 16 numbers, each 0 or 1 ] }

Rules: EXACTLY 16 entries each. Allowed notes: ${JSON.stringify(AVAILABLE_NOTES)}.
Keep it hypnotic and rhythmic; rests for groove; slides/accents like a 303.
Hi-hats usually on off-beats (steps 2,6,10,14). Strictly parseable JSON, no markdown.`;
}

function sanitizeGroove(parsed) {
  const toBool = v => (v === 1 || v === true || v === "1") ? 1 : 0;
  const bassIn = Array.isArray(parsed.bass) ? parsed.bass : [];
  const hatsIn = Array.isArray(parsed.hats) ? parsed.hats : [];
  const bass = [];
  for (let i = 0; i < 16; i++) {
    const s = bassIn[i] || {};
    bass.push({
      note: AVAILABLE_NOTES.includes(s.note) ? s.note : "C2",
      active: toBool(s.active), accent: toBool(s.accent), slide: toBool(s.slide)
    });
  }
  const hats = [];
  for (let i = 0; i < 16; i++) hats.push(toBool(hatsIn[i]));
  return { bass, hats };
}

async function genOne(subgenre) {
  const apiKey = process.env.AI_API_KEY || process.env.GROQ_API_KEY;
  const baseUrl = (process.env.AI_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/$/, "");
  const model = process.env.AI_MODEL || "openai/gpt-oss-120b";

  const payload = {
    model, temperature: 0.9, max_tokens: 6000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildGroovePrompt() },
      { role: "user", content: `Subgenre: ${subgenre}. Make it fresh, hypnotic and different from the usual.` }
    ]
  };
  if (/gpt-oss/i.test(model)) payload.reasoning_effort = process.env.AI_REASONING_EFFORT || "low";

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`provider ${res.status}: ${(await res.text()).slice(0, 160)}`);

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || "{}";
  let parsed;
  try { parsed = JSON.parse(content); }
  catch { const m = content.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : {}; }

  const g = sanitizeGroove(parsed);
  if (!g.bass.some(s => s.active)) throw new Error("groove senza note");
  return {
    name: (typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim() : "Groove").slice(0, 60),
    subgenre, bass: g.bass, hats: g.hats, t: Date.now()
  };
}

(async () => {
  if (!(process.env.AI_API_KEY || process.env.GROQ_API_KEY)) {
    console.error("AI_API_KEY mancante — imposta il secret su GitHub.");
    process.exit(1);
  }

  let lib = { updated: "", grooves: [] };
  try { lib = JSON.parse(fs.readFileSync(LIB_PATH, "utf8")); } catch (e) {}
  if (!Array.isArray(lib.grooves)) lib.grooves = [];

  let added = 0;
  for (let i = 0; i < PER_RUN; i++) {
    const sub = SUBGENRES[Math.floor(Math.random() * SUBGENRES.length)];
    try {
      const g = await genOne(sub);
      lib.grooves.push(g);
      added++;
      console.log(`+ [${g.subgenre}] ${g.name}`);
    } catch (e) {
      console.warn(`skip (${sub}): ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 1800)); // pausa anti rate-limit
  }

  if (lib.grooves.length > MAX_LIB) lib.grooves = lib.grooves.slice(-MAX_LIB);
  lib.updated = new Date().toISOString();
  fs.writeFileSync(LIB_PATH, JSON.stringify(lib, null, 2));
  console.log(`Libreria aggiornata: +${added}, totale ${lib.grooves.length}`);
})();
