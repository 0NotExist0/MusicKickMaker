# ⚡ KickForge 303 - Hardcore & Techno Kick/Bass Synthesizer Studio

Un sintetizzatore audio Web Audio API ad alte prestazioni per creare colpi di cassa (Kick) e linee di basso (Bassline) devastanti per **Techno, Hardcore, Frenchcore, Uptempo, Industrial, Early Gabber e Acidcore**, con motore **Roland TB-303 Attack & Acid Filter** ed esportazione WAV pronta per qualsiasi DAW.

![KickForge 303 Screenshot](screenshot.png) <!-- Opzionale -->

---

## 🚀 Caratteristiche Principali

- 🧪 **Modulo 303 Attack & Acid Transient**: Emulazione filtro risonante a cascata di diodi TB-303 con cutoff, risonanza estrema squelchy, decay, pre-drive e click snap.
- ⚡ **Corpo & Pitch Envelope Sweep**: Inviluppo di picco, frequenza del pugno fisico, intonazione fondamentale della nota e modulazione FM industriale.
- 🔊 **Sub & Techno Rumble Generator**: Riverbero sub con sidechain ducking automatico per il tipico sound dei warehouse rave berlinesi.
- 🔫 **Layer Screech / Laser (Piep)**: Oscillatore distorto con sweep di pitch tonale e regolabile (pitch iniziale/finale, durata, timbro bandpass, risonanza, drive) per il classico "laser/piep" di Uptempo e Frenchcore, discendente o ascendente.
- 🥊 **Punch & Transient Designer**: Beater d'attacco dedicato (quantità, tono, durata) più controllo di *Trasparenza Punch* (attacco compressore) e rapporto di compressione per uno schiaffo fisico più deciso.
- 💥 **Massimizzatore "Super Botta"**: Slider dinamico per spingere l'impatto sul petto e interruttore *Modo Ultra Devastante*.
- 🎛️ **Sintetizzatore Bassline Completo**: 7 tipi di basso (303 Acid, Rolling Techno 16th, Frenchcore Gallop, Industrial Reese Detuned, Uptempo Zaag Screech, Deep Sub Donk, Gabber Offbeat).
- 🎹 **Sequencer 16 Step Polifonico/Multi-traccia**:
  - Traccia Cassa con accenti e velocità.
  - Traccia Basso con selettore note (C1 - C3), tasto **ACC (Accent)** e tasto **SLD (Slide 303 Glide)**.
  - Traccia Charleston / Hi-Hat in levare.
- 🤖 **Generatore Cassa con AI**: Descrivi il suono a parole ("cassa uptempo con laser discendente e punch estremo a 200 BPM") e un LLM open-source imposta tutti i parametri per te. Vedi la sezione *Configurazione AI* sotto.
- 💾 **Preset Modificabili**: Salva, **sovrascrivi** (Salva Modifiche), **duplica** qualsiasi preset (anche di fabbrica) come copia modificabile, ed **esporta/importa** i preset come file `.json`.
- 💡 **Guida Interattiva con Hover di 2 Secondi**: Passa il mouse su qualsiasi controllo per vedere la spiegazione dettagliata in italiano.
- 📥 **Esportazione Audio Professionale WAV (24-bit / 16-bit / 32-bit Float)**:
  - Loop completo Cassa + Basso (1 Battuta 4/4)
  - Solo Cassa (One-Shot o Loop)
  - Solo Basso (Bassline Loop)

---

## 🛠️ Come Pubblicare su Vercel

1. Crea un repository su [GitHub](https://github.com/new).
2. Carica questo codice con i comandi git:
   ```bash
   git remote add origin https://github.com/TUO-USERNAME/NOME-REPO.git
   git branch -M main
   git push -u origin main
   ```
3. Vai su [Vercel](https://vercel.com) e fai il login con GitHub.
4. Clicca su **"Add New..." -> "Project"** e seleziona il tuo repository GitHub.
5. Clicca su **"Deploy"** (non serve alcuna configurazione di build, è un sito statico pronto all'uso!).

---

## 🤖 Configurazione AI (Generatore Preset)

Il generatore AI usa una **Serverless Function** (`api/generate-preset.js`) che chiama un LLM open-source con endpoint compatibile OpenAI. La chiave API resta **nascosta lato server**, mai nel browser. Funziona automaticamente su Vercel; in locale serve `vercel dev`.

**Passi (provider consigliato: Groq — gratuito e velocissimo):**

1. Crea una API key gratuita su [console.groq.com](https://console.groq.com) (menu *API Keys*).
2. Su Vercel: **Project → Settings → Environment Variables**, aggiungi:
   - `AI_API_KEY` = la tua key Groq  *(unica obbligatoria)*
3. **Redeploy** il progetto. Fatto: il pulsante *✨ Genera Cassa* è attivo.

**Variabili opzionali** (per cambiare provider/modello):

| Variabile | Default | Note |
|-----------|---------|------|
| `AI_API_KEY` | — | **Obbligatoria**. La key del provider. |
| `AI_BASE_URL` | `https://api.groq.com/openai/v1` | Endpoint OpenAI-style. Es. OpenRouter: `https://openrouter.ai/api/v1` |
| `AI_MODEL` | `llama-3.3-70b-versatile` | Qualsiasi modello del provider (Llama, Qwen, Mistral…). |

> Provider alternativi compatibili: **OpenRouter, Together, Fireworks, DeepInfra** o un **Ollama** self-hosted. Basta impostare `AI_BASE_URL` e `AI_MODEL`.

**Test in locale con le funzioni AI attive:**
```bash
npm i -g vercel
vercel dev            # avvia sito + /api con le env var del progetto
```

---

## 📜 Licenza
MIT License
