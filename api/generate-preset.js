/**
 * KickForge 303 - Generatore preset cassa con AI (Serverless Function per Vercel)
 *
 * Riceve un prompt in linguaggio naturale e chiede a un LLM open-source
 * (default: Llama 3.3 70B su Groq) di restituire un set di parametri validi
 * per il motore della cassa. I parametri vengono validati e "clampati"
 * lato server: il client riceve sempre un preset sicuro.
 *
 * Configurazione (Environment Variables su Vercel):
 *   AI_API_KEY   (obbligatoria)  - la tua API key del provider
 *   AI_BASE_URL  (opzionale)     - default https://api.groq.com/openai/v1
 *   AI_MODEL     (opzionale)     - default llama-3.3-70b-versatile
 *
 * Provider compatibili (endpoint OpenAI-style /chat/completions):
 *   Groq, OpenRouter, Together, Fireworks, DeepInfra, Ollama (self-host), ...
 */

// Schema autorevole: nomi, range numerici, enum e booleani ammessi.
const NUM = (min, max) => ({ type: "num", min, max });
const ENUM = (values) => ({ type: "enum", values });
const BOOL = { type: "bool" };

const SCHEMA = {
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

const clampNum = (v, min, max) => {
  const n = Number(v);
  if (!isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
};

// Filtra e normalizza l'output del modello contro lo SCHEMA.
function sanitizeParams(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [key, rule] of Object.entries(SCHEMA)) {
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

// Descrizione compatta dello schema da mettere nel prompt di sistema.
function schemaForPrompt() {
  const lines = [];
  for (const [key, rule] of Object.entries(SCHEMA)) {
    if (rule.type === "num") lines.push(`  "${key}": number ${rule.min}..${rule.max}`);
    else if (rule.type === "bool") lines.push(`  "${key}": boolean`);
    else if (rule.type === "enum") lines.push(`  "${key}": one of ${JSON.stringify(rule.values)}`);
  }
  return lines.join(",\n");
}

const SYSTEM_PROMPT = `You are a sound-design expert for KickForge 303, a web synthesizer that builds hardcore/techno KICK drums.
Given a user's request (any language), output ONE JSON object describing the kick preset.

Return ONLY valid JSON with this exact shape:
{
  "name": string (short, catchy, may include one emoji),
  "bpm": number 60..260,
  "params": {
${schemaForPrompt()}
  }
}

Rules:
- Include only keys you intentionally set; omit the rest (defaults will fill in).
- Stay within the numeric ranges. Never invent keys.
- "screech_*" is the laser/piep layer: set screech_enabled true for uptempo/frenchcore "laser" sounds. For a DESCENDING laser make screech_pitchStart much higher than screech_pitchEnd; invert them for an ASCENDING piep.
- "punch_amount" (0..1) adds an attack beater; raise it (0.5..0.9) plus comp_attack ~6-10 for more punch.
- Genre hints: Techno/Acid super_botta 1.4-1.8; Hardcore/Gabber 2.0-2.4 with drive_type tube/diode; Uptempo/Frenchcore 2.0-2.5, drive_type hard, screech_enabled true, high fold_amount.
- Output must be strictly parseable JSON, no comments, no markdown fences.`;

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
    req.on("end", () => {
      try { resolve(JSON.parse(data || "{}")); } catch { resolve({}); }
    });
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
  const model = process.env.AI_MODEL || "llama-3.3-70b-versatile";

  const body = await readBody(req);
  const prompt = (body && typeof body.prompt === "string") ? body.prompt.slice(0, 600).trim() : "";
  if (!prompt) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: "Prompt mancante." }));
  }

  try {
    const aiRes = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.75,
        max_tokens: 900,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      res.statusCode = 502;
      return res.end(JSON.stringify({ error: "Errore dal provider AI.", detail: errText.slice(0, 500) }));
    }

    const data = await aiRes.json();
    const content = data?.choices?.[0]?.message?.content || "{}";

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      // fallback: estrai il primo blocco {...}
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }

    const params = sanitizeParams(parsed.params || parsed);
    const bpm = clampNum(parsed.bpm, 60, 260) ?? 175;
    const name = (typeof parsed.name === "string" && parsed.name.trim())
      ? parsed.name.trim().slice(0, 60)
      : "🤖 Cassa AI";

    if (Object.keys(params).length === 0) {
      res.statusCode = 422;
      return res.end(JSON.stringify({ error: "Il modello non ha prodotto parametri validi. Riprova con un prompt più specifico." }));
    }

    res.statusCode = 200;
    return res.end(JSON.stringify({ name, bpm, params, model }));
  } catch (err) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: "Errore interno durante la generazione.", detail: String(err).slice(0, 300) }));
  }
};
