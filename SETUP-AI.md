# ⚙️ Ultimi 3 passi per accendere il "groove che cresce da solo"

Tutto il codice è già pronto e caricato. Restano solo 3 azioni **sul sito
github.com** (sei già loggato nel browser — non serve nessun terminale).
Repo: **0NotExist0/MusicKickMaker**

## 1) Aggiungi il secret con la key Groq  (~30 sec)
- Vai su **Settings → Secrets and variables → Actions**
- Clicca **New repository secret**
- **Name:** `AI_API_KEY`
- **Secret:** incolla la tua key Groq (`gsk_…`)
- **Add secret**

## 2) Dai il permesso di scrittura alle Actions  (~15 sec)
- Vai su **Settings → Actions → General**
- Scorri fino a **Workflow permissions**
- Seleziona **Read and write permissions**
- **Save**

## 3) Fai partire il workflow una volta  (~10 sec)
- Vai sul tab **Actions** (in alto)
- A sinistra scegli **Grow Groove Library**
- Clicca **Run workflow** → **Run workflow**
- Dopo ~1 minuto vedrai un commit automatico `chore: crescita automatica libreria groove`

Da lì in poi gira **da solo ogni notte** (03:00 UTC) e la libreria cresce.

---

## 🔐 Importante: rigenera la key
La key è passata dalla chat, quindi consideralla "vista". Dopo il setup:
- vai su **console.groq.com → API Keys**, crea una key nuova,
- aggiorna il secret `AI_API_KEY` (passo 1) con quella nuova,
- revoca la vecchia.

## In alternativa, da terminale (GitHub CLI già installata)
```
gh auth login                 # completa il login nel browser fino a "Logged in as 0NotExist0"
gh secret set AI_API_KEY --repo 0NotExist0/MusicKickMaker
gh api -X PUT repos/0NotExist0/MusicKickMaker/actions/permissions/workflow -f default_workflow_permissions=write
gh workflow run "Grow Groove Library" --repo 0NotExist0/MusicKickMaker
```
