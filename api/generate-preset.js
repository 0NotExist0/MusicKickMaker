/**
 * KickForge 303 - Generatore preset con AI (Serverless Function per Vercel)
 *
 * Genera o MODIFICA i parametri di una CASSA o di un BASSO a partire da un
 * prompt in linguaggio naturale, tramite un LLM open-source (endpoint
 * compatibile OpenAI). I parametri vengono validati e "clampati" lato server.
 *
 * Body della richiesta (POST):
 *   { prompt: string, target?: "kick"|"bass", current?: { params: {...} } }
 *   - target: cosa generare (default "kick")
 *   - current: se presente, si lavora in modalità MODIFICA partendo da questi
 *              parametri (variazione a parole), altrimenti generazione da zero.
 *
 * Environment Variables:
 *   AI_API_KEY          (obbligatoria)
 *   AI_BASE_URL         (opzionale, default https://api.groq.com/openai/v1)
 *   AI_MODEL            (opzionale, default openai/gpt-oss-120b)
 *   AI_REASONING_EFFORT (opzionale, per gpt-oss: low|medium|high, default low)
 */

const NUM = (min, max) => ({ type: "num", min, max });
const ENUM = (values) => ({ type: "enum", values });
const BOOL = { type: "bool" };

// ---- Schema CASSA -------------------------------------------------------
const KICK_SCHEMA = {
  super_botta: NUM(1.0, 3.0),
  extreme_mode: BOOL,

  attack303_enabled: BOOL,
  attack303_volume: NUM(0, 1),
  attack303_waveform: ENUM(["sawtooth", "square", "sine", "triangle"]),
  attack303_cutoff: NUM(200, 8000),
  attack303_resonance: NUM(1, 22),
  attack303_envMod: NUM(0, 1),
  attack303_decay: NUM(0.01, 0.12),
  attack303_pitch: NUM(100, 900),
  attack303_drive: NUM(1, 10),
  click_volume: NUM(0, 1),
  click_tone: NUM(2000, 9000),

  screech_enabled: BOOL,
  screech_volume: NUM(0, 1),
  screech_waveform: ENUM(["sawtooth", "square"]),
  screech_pitchStart: NUM(80, 5000),
  screech_pitchEnd: NUM(40, 5000),
  screech_decay: NUM(0.02, 0.5),
  screech_drive: NUM(1, 12),
  screech_cutoff: NUM(200, 9000),
  screech_resonance: NUM(0.5, 24),

  punch_amount: NUM(0, 1),
  punch_tone: NUM(500, 8000),
  punch_decay: NUM(0.002, 0.03),
  comp_attack: NUM(0.1, 20),
  comp_ratio: NUM(1, 20),

  body_enabled: BOOL,
  body_waveform: ENUM(["sine", "triangle", "sawtooth", "square"]),
  body_startFreq: NUM(200, 950),
  body_punchFreq: NUM(80, 300),
  body_tailFreq: NUM(30, 85),
  body_punchDecay: NUM(0.01, 0.09),
  body_tailDecay: NUM(0.08, 0.65),
  body_tailLevel: NUM(0.05, 1.5),
  body_volume: NUM(0, 1),
  fm_amount: NUM(0, 300),
  fm_ratio: NUM(0.5, 6),

  rumble_enabled: BOOL,
  rumble_volume: NUM(0, 1),
  rumble_decay: NUM(0.1, 0.8),
  rumble_cutoff: NUM(60, 200),
  rumble_ducking: NUM(0, 1),
  sub_boost: NUM(0, 8),

  drive_type: ENUM(["tube", "diode", "hard"]),
  drive_amount: NUM(0.5, 10),
  fold_amount: NUM(1, 8),
  eq_low: NUM(-6, 8),
  eq_midFreq: NUM(200, 2000),
  eq_midGain: NUM(-10, 8),
  eq_high: NUM(-6, 10),
  master_gain: NUM(0.5, 1.6)
};

// ---- Schema BASSO -------------------------------------------------------
const BASS_SCHEMA = {
  bass_enabled: BOOL,
  bass_osc1_wave: ENUM(["sawtooth", "square", "sine", "triangle"]),
  bass_osc2_wave: ENUM(["sawtooth", "square", "sine", "triangle"]),
  bass_osc2_mix: NUM(0, 1),
  bass_detune: NUM(0, 35),
  bass_cutoff: NUM(80, 7000),
  bass_resonance: NUM(1, 22),
  bass_envMod: NUM(0, 1),
  bass_decay: NUM(0.04, 0.45),
  bass_drive: NUM(0.5, 10),
  bass_glide: NUM(0.01, 0.2),
  bass_sidechain: NUM(0, 1),
  bass_sub_level: NUM(0, 1),
  bass_volume: NUM(0, 1)
};

const clampNum = (v, min, max) => {
  const n = Number(v);
  if (!isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
};

function sanitizeParams(raw, schema) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [key, rule] of Object.entries(schema)) {
    if (!(key in raw)) continue;
    const val = raw[key];
    if (rule.type === "num") {
      const c = clampNum(val, rule.min, rule.max);
      if (c !== null) out[key] = c;
    } else if (rule.type === "bool") {
      out[key] = val === true || val === "true" || val === 1;
    } else if (rule.type === "enum") {
      if (rule.values.includes(val)) out[key] = val;
    }
  }
  return out;
}

// Filtra i parametri correnti tenendo solo le chiavi valide dello schema.
function pickKnown(raw, schema) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  for (const key of Object.keys(schema)) {
    if (key in raw) out[key] = raw[key];
  }
  return out;
}

function schemaForPrompt(schema) {
  const lines = [];
  for (const [key, rule] of Object.entries(schema)) {
    if (rule.type === "num") lines.push(`  "${key}": number ${rule.min}..${rule.max}`);
    else if (rule.type === "bool") lines.push(`  "${key}": boolean`);
    else if (rule.type === "enum") lines.push(`  "${key}": one of ${JSON.stringify(rule.values)}`);
  }
  return lines.join(",\n");
}

const KICK_GUIDE = `- "screech_*" is the laser/piep layer: enable it for uptempo/frenchcore "laser" sounds. Descending laser = screech_pitchStart much higher than screech_pitchEnd; invert for an ascending piep.
- "punch_amount" (0..1) adds an attack beater; raise it (0.5..0.9) with comp_attack ~6-10 for more punch.
- "body_tailLevel" and "body_tailDecay" shape the kick TAIL: raise them for a longer/boomier tail, lower for a short punchy kick.
- Genre hints: Techno/Acid super_botta 1.4-1.8; Hardcore/Gabber 2.0-2.4 (drive_type tube/diode); Uptempo/Frenchcore 2.0-2.5 (drive_type hard, screech_enabled true, high fold_amount).`;

const BASS_GUIDE = `- "bass_sidechain" (0..1) ducks the bass under the kick: keep 0.7-0.9 for a clean groove.
- "bass_resonance" + "bass_envMod" give the acid 303 squelch; "bass_detune" + "bass_osc2_mix" give a wide Reese.
- "bass_sub_level" adds a pure sub sine one octave down; "bass_glide" is the 303 slide time.
- Genre hints: Acid 303 -> high resonance/envMod, sawtooth; Rolling techno -> short decay, moderate resonance; Reese/Industrial -> high detune + osc2_mix; Uptempo Zaag -> high drive + square.`;

function buildSystemPrompt(target, isTweak) {
  const isBass = target === "bass";
  const schema = isBass ? BASS_SCHEMA : KICK_SCHEMA;
  const thing = isBass ? "BASS line" : "KICK drum";
  const guide = isBass ? BASS_GUIDE : KICK_GUIDE;
  const shape = isBass
    ? `{
  "name": string (short, catchy, may include one emoji),
  "params": {
${schemaForPrompt(schema)}
  }
}`
    : `{
  "name": string (short, catchy, may include one emoji),
  "bpm": number 60..260,
  "params": {
${schemaForPrompt(schema)}
  }
}`;

  const task = isTweak
    ? `You MODIFY an existing ${thing} preset for KickForge 303 based on the user's instruction.
You will receive the CURRENT parameters. Apply ONLY the change the user asks for, keep everything else as close as possible to the current values. Return the FULL params object.`
    : `You are a sound-design expert for KickForge 303. Given the user's request (any language), design a ${thing} preset.`;

  return `${task}

Return ONLY valid JSON with this exact shape:
${shape}

Rules:
- Stay within the numeric ranges. Never invent keys. Only use keys listed above.
${guide}
- Output must be strictly parseable JSON, no comments, no markdown fences.`;
}

// ---- Groove (basso + hi-hat; la cassa è sempre 4/4 e non si genera) -------
const AVAILABLE_NOTES = [
  "C1", "C#1", "D1", "D#1", "E1", "F1", "F#1", "G1", "G#1", "A1", "A#1", "B1",
  "C2", "C#2", "D2", "D#2", "E2", "F2", "F#2", "G2", "G#2", "A2", "A#2", "B2", "C3"
];

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

function buildGroovePrompt() {
  return `You design grooves for KickForge 303, a synth for the TECHNO family (techno, hard techno, acidcore, gabber, frenchcore, uptempo, industrial).
The KICK is ALWAYS four-on-the-floor and fixed — do NOT design it.
Design a 16-step BASS line and a 16-step HI-HAT pattern that groove over that steady kick.

Return ONLY valid JSON:
{
  "name": string (short, may include one emoji),
  "subgenre": string,
  "bass": [ 16 objects: {"note": one of C1..C3, "active": 0 or 1, "accent": 0 or 1, "slide": 0 or 1} ],
  "hats": [ 16 numbers, each 0 or 1 ]
}

Rules:
- EXACTLY 16 entries in "bass" and 16 in "hats". Allowed notes: ${JSON.stringify(AVAILABLE_NOTES)}.
- Keep it hypnotic and rhythmic; use rests (active:0) for groove; use slides/accents like a TB-303.
- Hi-hats usually land on the off-beats (steps 2,6,10,14) with some 16th variation.
- If a CURRENT groove or SEED grooves are given, EVOLVE from them: keep the vibe, change details.
- Strictly parseable JSON, no comments, no markdown.`;
}

async function readBody(req) {
  if (req.body) {
    if (typeof req.body === "string") {
      try { return JSON.parse(req.body); } catch { return {}; }
    }
    return req.body;
  }
  return await new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => { try { resolve(JSON.parse(data || "{}")); } catch { resolve({}); } });
    req.on("error", () => resolve({}));
  });
}

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: "Metodo non consentito. Usa POST." }));
  }

  const apiKey = process.env.AI_API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.statusCode = 501;
    return res.end(JSON.stringify({
      error: "AI non configurata.",
      hint: "Imposta la variabile d'ambiente AI_API_KEY su Vercel (es. una key gratuita di Groq) e ridistribuisci."
    }));
  }

  const baseUrl = (process.env.AI_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/$/, "");
  const model = process.env.AI_MODEL || "openai/gpt-oss-120b";

  const body = await readBody(req);
  const prompt = (body && typeof body.prompt === "string") ? body.prompt.slice(0, 600).trim() : "";
  const target = (body && ["bass", "groove"].includes(body.target)) ? body.target : "kick";

  // Costruzione del messaggio in base al target
  let systemContent, userContent;
  let schema = null;

  if (target === "groove") {
    systemContent = buildGroovePrompt();
    const subgenre = (body && typeof body.subgenre === "string") ? body.subgenre.slice(0, 60) : "techno";
    const seeds = (body && Array.isArray(body.seeds)) ? body.seeds.slice(0, 3) : [];
    const current = (body && body.current) ? body.current : null;
    let u = `Subgenre: ${subgenre}.`;
    if (prompt) u += ` Extra: ${prompt}.`;
    if (current) u += `\nCURRENT groove (evolve from this):\n${JSON.stringify(current).slice(0, 1500)}`;
    if (seeds.length) u += `\nSEED grooves the user liked (keep this vibe):\n${JSON.stringify(seeds).slice(0, 1500)}`;
    userContent = u;
  } else {
    schema = target === "bass" ? BASS_SCHEMA : KICK_SCHEMA;
    const currentParams = body && body.current ? pickKnown(body.current.params || body.current, schema) : null;
    const isTweak = !!currentParams && Object.keys(currentParams).length > 0;
    if (!prompt) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: "Prompt mancante." }));
    }
    systemContent = buildSystemPrompt(target, isTweak);
    userContent = isTweak
      ? `CURRENT parameters (JSON):\n${JSON.stringify(currentParams)}\n\nInstruction: ${prompt}`
      : prompt;
  }

  const payload = {
    model,
    temperature: 0.8,
    max_tokens: 6000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemContent },
      { role: "user", content: userContent }
    ]
  };
  if (/gpt-oss/i.test(model)) {
    payload.reasoning_effort = process.env.AI_REASONING_EFFORT || "low";
  }

  // I modelli di reasoning (gpt-oss) ogni tanto falliscono il JSON mode quando il
  // ragionamento esaurisce i token: riproviamo una volta prima di arrenderci.
  let lastErr = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const aiRes = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify(payload)
      });

      if (!aiRes.ok) {
        lastErr = (await aiRes.text()).slice(0, 500);
        continue;
      }

      const data = await aiRes.json();
      const content = data?.choices?.[0]?.message?.content || "{}";

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        const m = content.match(/\{[\s\S]*\}/);
        parsed = m ? JSON.parse(m[0]) : {};
      }

      const name = (typeof parsed.name === "string" && parsed.name.trim())
        ? parsed.name.trim().slice(0, 60)
        : (target === "groove" ? "🤖 Groove AI" : target === "bass" ? "🤖 Basso AI" : "🤖 Cassa AI");

      let result;
      if (target === "groove") {
        const g = sanitizeGroove(parsed);
        if (!g.bass.some(s => s.active)) { lastErr = "Groove senza note di basso."; continue; }
        result = {
          name, target, model,
          subgenre: (typeof parsed.subgenre === "string" ? parsed.subgenre.slice(0, 40) : "techno"),
          bass: g.bass, hats: g.hats
        };
      } else {
        const params = sanitizeParams(parsed.params || parsed, schema);
        if (Object.keys(params).length === 0) {
          lastErr = "Il modello non ha prodotto parametri validi.";
          continue;
        }
        result = { name, params, model, target };
        if (target !== "bass") result.bpm = clampNum(parsed.bpm, 60, 260) ?? 175;
      }

      res.statusCode = 200;
      return res.end(JSON.stringify(result));
    } catch (err) {
      lastErr = String(err).slice(0, 300);
    }
  }

  res.statusCode = 502;
  return res.end(JSON.stringify({ error: "L'AI non è riuscita a generare un preset valido. Riprova.", detail: lastErr }));
};
