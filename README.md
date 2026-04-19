# 📋 TekReport Pro

> **TekReport Pro** è una suite desktop avanzata per la gestione tecnica, la compilazione automatica di rapportini e la manutenzione di database riparazioni. Sviluppata con **Tauri**, **React** e **Python**, è disponibile per **Windows**, **macOS** (Intel/Apple Silicon) e **Linux**.

---

## 📖 Descrizione

TekReport Pro non è solo un generatore di documenti, ma un ecosistema completo per l'automazione del flusso di lavoro tecnico:
- **Generazione Rapportini**: Compila template Word (.docx/.doc) partendo da dati estratti da PDF o inseriti manualmente.
- **Smart Data Extraction**: Motore AI integrato (Ollama) per estrarre informazioni da email e documenti complessi.
- **Database Management**: Gestione avanzata di file Excel (Pandetta e Sterlink) tramite core Python dedicato per la massima affidabilità.
- **Pianificazione**: Integrazione bidirezionale con Google Calendar per la gestione degli interventi.
- **Archiviazione Nativa**: I dati e i template sono salvati localmente nel file system di sistema (AppData), garantendo persistenza e sicurezza.

---

## ✨ Funzionalità principali

| Modulo | Descrizione |
|---|---|
| 🏠 **Dashboard Home** | Accesso rapido a tutte le funzioni principali dell'app. |
| 📄 **Rapportino Pro** | Supporto per template DOCX e legacy DOC (auto-conversione). Estrazione campi `{CAMPO}` e checkbox native. |
| 🧠 **Estrazione AI** | Utilizza Ollama localmente per analizzare PDF e email, trasformandoli in dati strutturati. |
| 📊 **Pandetta Manager** | Gestione elenco assistenze su Excel con supporto a righe dinamiche e salvataggio persistente. |
| 🛠️ **Sterlink Manager** | Database dedicato per la gestione delle riparazioni e dei materiali. |
| 📅 **Calendario Google** | Sincronizzazione automatica degli interventi con Google Calendar. |
| ⚙️ **Settings Tabbed** | Configurazione modulare di: Percorsi, Tecnici, API AI, Google Auth e Update. |
| 💾 **Backup & Restore** | Esportazione e importazione completa di tutte le impostazioni e dei template. |

---

## 🚀 Guida all'utilizzo

### 1. Configurazione Iniziale
- Apri le **⚙️ Impostazioni** e configura la cartella di destinazione dei rapportini.
- Aggiungi i nomi dei tecnici che utilizzeranno l'app.
- Carica i tuoi template Word negli slot dedicati (Tab Modelli).

### 2. Generazione Rapportini
- Scegli un template dalla **Dashboard** o dalla sezione **Modelli**.
- L'app estrarrà automaticamente i segnaposti.
- Puoi caricare un PDF per auto-compilare i campi o usare l'**Estrazione AI** per dati più complessi.
- Il sistema calcola automaticamente il prossimo numero documento basandosi sui file già esistenti nella cartella.

### 3. Gestione Database (Pandetta/Sterlink)
- Trascina il tuo file Excel nel manager corrispondente.
- L'app crea una cache locale per operare in velocità e sovrascrive il file originale in modo sicuro solo al salvataggio.
- Utilizza i filtri avanzati per cercare interventi passati.

---

## 🏗️ Architettura Tecnica

L'app utilizza un'architettura **Sidecar** per combinare la velocità di una UI web con la potenza del calcolo nativo:
- **Frontend**: React 19 + TypeScript + Tailwind CSS 4.
- **Backend Host**: Tauri 2.0 (Rust).
- **Processing Engine**: Python 3.12 (compilato in binari nativi) per il parsing Excel complesso.
- **AI Engine**: Ollama (locale) tramite API REST.
- **Storage**: Plugin Store (JSON) e Plugin FS (Binari) nativi di Tauri.

---

## 🛠️ Sviluppo Locale

### Prerequisiti
- **Node.js** v20+
- **Rust** 1.75+
- **Python 3.12** (per la build dei binari sidecar)

### Setup
```bash
# Installa dipendenze Node
npm install

# Installa dipendenze Python per i binari
make install

# Genera i binari sidecar per la tua piattaforma
make build
```

### Avvio
```bash
# Frontend + Tauri Dev
npm run tauri dev
```

---

## 📦 Build e Release

### Script di utilità
L'app include strumenti per la gestione automatizzata del ciclo di vita:
- **`npm run build:binaries`**: Compila gli script Python in eseguibili nella cartella `src-tauri/binaries`.
- **`node bump-version.cjs --set=X.X.X`**: Aggiorna sincronizzatamente la versione in tutti i file di config (package, cargo, tauri).
- **`node push-release.cjs`**: Crea il tag git e avvia la pipeline di build su GitHub.

### CI/CD
Il workflow **GitHub Actions** compila automaticamente i pacchetti (MSI, DMG, DEB, AppImage) e crea una release ad ogni nuovo tag `v*`.

---

## 📄 Licenza

Distribuito sotto licenza **MIT**. 2026 © TekReport Team.

