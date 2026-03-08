# 📋 RapportiniApp

> Applicazione desktop per la compilazione automatica di rapportini tecnici, disponibile su **Windows**, **macOS** e **Linux**.

[![Build Tauri App](https://github.com/TUO_USERNAME/RapportiniApp/actions/workflows/build-tauri.yml/badge.svg)](https://github.com/TUO_USERNAME/RapportiniApp/actions/workflows/build-tauri.yml)

---

## 📖 Descrizione

**RapportiniApp** è un'applicazione desktop che semplifica e automatizza la compilazione di rapportini tecnici aziendali. Permette di:

- **Caricare template DOCX** personalizzati (fino a 3 template salvati localmente)
- **Estrarre automaticamente** i campi da compilare dai template Word (segnaposti come `{NOME_CAMPO}`)
- **Auto-compilare i moduli** da documenti PDF sorgente (DDT, ordini, ecc.)
- **Generare il documento finale** in formato DOCX, pronto per la stampa o l'invio

L'applicazione è completamente **offline** — nessun dato viene inviato a server esterni. Tutto viene elaborato localmente sul tuo dispositivo.

---

## ✨ Funzionalità Principali

| Funzione | Descrizione |
|---|---|
| 📁 **Gestione Template** | Carica e salva fino a 3 template DOCX in slot predefiniti |
| 🔍 **Estrazione Campi** | Rileva automaticamente tutti i segnaposti `{CAMPO}` nel template |
| 📄 **Import da PDF** | Legge DDT/ordini PDF e compila automaticamente i campi corrispondenti |
| ☑️ **Checkbox Word** | Gestisce le checkbox native di Word come opzioni selezionabili |
| 📝 **Righe Dinamiche** | Aggiunge automaticamente righe articolo se le voci nel PDF superano quelle nel template |
| 💾 **Salvataggio Locale** | I template sono persistiti tramite IndexedDB nel browser Tauri |
| ⬇️ **Export DOCX** | Genera e scarica il rapportino compilato in formato Word |

---

## 💻 Download e Installazione

Vai alla sezione [**Releases**](https://github.com/TUO_USERNAME/RapportiniApp/releases) del repository e scarica l'installer per il tuo sistema operativo:

| Sistema Operativo | File da scaricare |
|---|---|
| **Windows** | `RapportiniApp_x.x.x_x64_en-US.msi` oppure `.exe` |
| **macOS (Apple Silicon M1/M2/M3)** | `RapportiniApp_x.x.x_aarch64.dmg` |
| **macOS (Intel)** | `RapportiniApp_x.x.x_x64.dmg` |
| **Linux (Ubuntu/Debian)** | `RapportiniApp_x.x.x_amd64.deb` |
| **Linux (generico)** | `RapportiniApp_x.x.x_amd64.AppImage` |

> **Nota per macOS**: Se compare l'avviso *"Apple non può verificare questa app"*, vai su **Impostazioni di Sistema → Privacy e Sicurezza** e clicca **"Apri comunque"**.

> **Nota per Linux (.AppImage)**: Rendi il file eseguibile con `chmod +x RapportiniApp_*.AppImage` prima di eseguirlo.

---

## 🚀 Guida all'Utilizzo

### 1. Prima configurazione — Carica i tuoi Template

1. Apri l'applicazione
2. Clicca su **⚙️ Impostazioni** (icona ingranaggio in alto a destra)
3. Vedrai 3 slot disponibili per i template
4. Per ciascuno slot, clicca il pulsante di upload e seleziona il tuo file `.docx`
5. Una volta caricato, lo slot mostrerà il nome del file

> I template vengono salvati localmente e saranno disponibili ad ogni riapertura dell'app.

### 2. Schermata Home — Seleziona il Template

1. Dalla schermata principale (**Home**), vedrai i pulsanti corrispondenti ai template caricati
2. Clicca sul template che vuoi usare per compilare il rapportino
3. L'app ti porterà automaticamente alla schermata del modulo

### 3. Compilazione del Modulo

#### Compilazione Manuale
- Tutti i campi estratti dal template vengono mostrati come caselle di testo
- I campi con checkbox Word vengono mostrati come selettori (radio button o dropdown)
- Compila i campi necessari e clicca **"Genera DOCX"**

#### Auto-compilazione da PDF (DDT/Ordini)
1. Nella schermata del modulo, trova il pulsante **"Carica PDF"** (o la sezione dedicata)
2. Seleziona il file PDF del DDT o dell'ordine da cui estrarre i dati
3. L'app leggerà automaticamente il PDF e compilerà i campi corrispondenti:
   - Ragione sociale, indirizzo, CAP, città del destinatario
   - Numero richiesta/DDT e data
   - Reparto/ambulatorio di destinazione
   - Elenco articoli (descrizione, quantità) — con aggiunta automatica di righe se necessario
4. Verifica e correggi eventuali campi non compilati correttamente
5. Clicca **"Genera DOCX"** per scaricare il documento finale

### 4. Download del Rapportino

- Clicca **"Genera DOCX"** — il file verrà scaricato automaticamente nella cartella Download
- Il nome del file sarà basato sul template selezionato

---

## 🛠️ Sviluppo Locale

Se vuoi contribuire o eseguire l'app in modalità sviluppo:

### Prerequisiti

- [Node.js](https://nodejs.org/) (v18 o superiore)
- [Rust](https://www.rust-lang.org/tools/install) (stable)
- Su Linux: dipendenze di sistema WebKit

```bash
# Linux - installa le dipendenze di sistema
sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

### Clona e Avvia

```bash
# Clona il repository
git clone https://github.com/TUO_USERNAME/RapportiniApp.git
cd RapportiniApp

# Installa le dipendenze Node
npm install

# Avvia in modalità sviluppo (con hot-reload)
npm run tauri dev
```

### Compila per la Distribuzione

```bash
# Genera l'installer per il sistema operativo corrente
npm run tauri build
```

L'installer verrà generato in `src-tauri/target/release/bundle/`.

---

## 🤖 Build Automatiche (GitHub Actions)

Il repository include un workflow GitHub Actions che compila automaticamente l'applicazione per tutte le piattaforme.

### Come creare una nuova Release

1. Assicurati che tutte le modifiche siano committate e pushate su `main`
2. Crea un tag con il numero di versione:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
3. GitHub Actions partirà automaticamente e compilerà per **Windows**, **macOS (Intel + ARM)** e **Linux**
4. Al termine (~15-20 minuti), troverai una nuova **Draft Release** nella sezione Releases con tutti i file allegati
5. Modifica la release (aggiungi note di rilascio se vuoi) e clicca **"Publish release"**

---

## 📁 Struttura del Progetto

```
RapportiniApp/
├── src/                    # Codice sorgente React + TypeScript
│   ├── App.tsx             # Componente principale dell'applicazione
│   ├── utils/              # Utility per parsing DOCX e PDF
│   └── ...
├── src-tauri/              # Configurazione e codice Tauri (Rust)
│   ├── tauri.conf.json     # Configurazione dell'app desktop
│   ├── icons/              # Icone dell'applicazione
│   └── src/                # Entry point Rust
├── .github/
│   └── workflows/
│       └── build-tauri.yml # Pipeline CI/CD cross-platform
├── public/                 # Asset statici
└── index.html              # Entry point HTML
```

---

## 📄 Licenza

Questo progetto è ad uso interno aziendale.
