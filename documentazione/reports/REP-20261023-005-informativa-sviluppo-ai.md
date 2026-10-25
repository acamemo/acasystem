# REP-20261023-005 — Icona e informativa sull’uso dell’AI nello sviluppo

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261023-005 — Informativa sul processo di sviluppo |
| Stato | Completato; verifica locale, banco non aggiornato |
| Data | 2026-10-23 (Europe/Rome) |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit di partenza | `7298d4df0d33bc92123517776d9ebc7c12ecefa6`, con modifiche locali preesistenti |
| Richiesta di riferimento | Utente, chat del 2026-10-23: convertire l’icona allegata in SVG, farle seguire l’accento dell’app e inserire in alto a destra nelle impostazioni un pulsante «AI» che apre un’informativa sul supporto AI allo sviluppo. Richiesta anche una valutazione dell’utilità legale della nota. |
| Autorizzazione | Realizzazione di questa modifica circoscritta mentre Claude lavora sui documenti di D1. Nessuna autorizzazione a riprendere il resto della 0.9.27, creare commit o aggiornare il banco. |

## Obiettivo e perimetro

Aggiungere l’accesso all’informativa nell’intestazione esistente di Sistema usando le primitive Button, Sheet e Body (ADR-0004). Il popup è un dialogo modale nativo con lo stile dei fogli già in uso. L’icona è una rielaborazione vettoriale della forma fornita dall’utente, senza dipendenze nuove, e segue il token di accento esistente.

Il repository contiene molte modifiche locali di altri incarichi, anche in `SystemLayout.tsx`. Copia PRIMA del file interessato: `backup/ai-notice/pre/SystemLayout.tsx`. Non vengono modificate le primitive condivise, il tema, i widget, i permessi, Home Assistant o l’infrastruttura. I documenti di D1 restano fuori incarico.

## Criteri di completamento

- Pulsante con icona e testo «AI» in alto a destra in Sistema.
- SVG vettoriale e icona che cambia colore con il token di accento, compresi gli accenti derivati dallo sfondo.
- Popup leggibile su desktop e telefono, apertura e chiusura da tastiera, ripristino del fuoco sul pulsante.
- Testo fedele alla richiesta: MeMo Srl e Mattia Pentagallo, supporto alla programmazione, automazione di attività ripetitive, preparazione dei test, miglioramento e rifattorizzazione. Nessuna promessa di compatibilità con tutti i dispositivi né affermazione di collaudo completo.
- Verifiche statiche e controlli pertinenti registrati; nessun rilascio al banco.

## Avanzamento e modifiche

Lette le istruzioni, lo stato del progetto, i principi frontend e i componenti esistenti. Consultate le fonti ufficiali UE per distinguere trasparenza sullo sviluppo e obblighi sui sistemi AI o sui contenuti sintetici. Nessuna conclusione di conformità legale del prodotto.

- Nuovi `AiDevelopmentNotice.tsx`, `aiDevelopmentNotice.css` e `ai-development.svg` in `frontend/src/pages/system/`.
- Due righe aggiunte a `SystemLayout.tsx`: import del componente e montaggio alla destra del titolo. Nessun’altra modifica al file rispetto alla copia PRIMA.
- L’SVG contiene solo tracciati e cerchi, con `currentColor`, senza immagini raster incorporate o riferimenti esterni. La maschera CSS usa `--k2-accent` con ripiego su `--aca-accent`; il cambio d’accento non richiede di rigenerare l’asset.
- Testo italiano riformulato senza promesse di prestazioni su tutti i dispositivi: preparazione dei test e analisi su risorse limitate, responsabilità delle decisioni e del rilascio in capo al team. Provenienza e licenza Tunet in «Informazioni» conservate.
- La vecchia anteprima `preview-system.html` carica solo il tema Metallo. La verifica del tema corrente è stata eseguita con una pagina temporanea che monta i componenti reali `SystemLayout`, `AppearanceSection` e `AboutSection` e importa Kit 2, senza servizi HA. Copia della pagina di prova in `backup/ai-notice/preview.html`; il file temporaneo nel frontend è rimosso alla chiusura.

## Fonti esterne

- Commissione europea, [FAQ sugli obblighi di trasparenza dell’articolo 50](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act), consultata il 2026-10-23, versione corrente senza numero: codice sorgente escluso dagli output soggetti alla marcatura descritta nelle linee guida; obblighi specifici per interazione con AI, deepfake e determinate pubblicazioni.
- Commissione europea, [linee guida sulla trasparenza](https://digital-strategy.ec.europa.eu/en/policies/guidelines-ai-transparency-obligations), consultate il 2026-10-23, versione corrente: perimetro dell’articolo 50. Queste fonti non provano l’adempimento degli altri obblighi del prodotto.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Stato iniziale e copia PRIMA | `git status --short --untracked-files=no`, `git rev-parse HEAD`; copia di `SystemLayout.tsx` | Eseguito | Modifiche locali preservate; nessun commit |
| Tipi strict | `npm.cmd run typecheck` (frontend) | Superato | Eseguito anche dopo la scelta finale della primitiva Sheet |
| ESLint circoscritto | `npm.cmd exec -- eslint src/pages/system/AiDevelopmentNotice.tsx src/pages/system/SystemLayout.tsx` | Superato | Nessun rilievo |
| Formattazione | `npm.cmd exec -- prettier --check src/pages/system/AiDevelopmentNotice.tsx src/pages/system/aiDevelopmentNotice.css src/pages/system/SystemLayout.tsx` | Superato | Il solo nuovo componente è stato formattato; file preesistente non riformattato |
| Tipografia e colori | `npm.cmd run lint:typography`; `npm.cmd run lint:theme-colors` | Superato | 0 violazioni, rispettivamente 515 e 341 file |
| Test esistenti pertinenti | `npm.cmd exec -- vitest run src/__tests__/SystemPage.test.tsx src/__tests__/SystemSheets.test.tsx src/__tests__/FixSystemFocus.test.tsx --maxWorkers=2` | Superato | 3 file, 63 test sulla versione finale; suite completa non eseguita |
| Build separata | `npm.cmd exec -- vite build --outDir <repository>/backup/ai-notice/dist` | Superato | Output in cartella dedicata; avviso di chunk oltre 500 kB, nessuna ottimizzazione fuori perimetro. Build di rilascio preesistente non sovrascritta |
| Controllo meccanico del design | `impeccable.cmd detect --json` sui due TSX e sul nuovo CSS | Superato | Risposta `[]` |
| Browser, temi e accenti | Browser integrato, server Vite dedicato `127.0.0.1:5187`, pagina di prova con componenti reali; cornici 360×560 e 1280×800 | Superato | Popup leggibile con corpo scorrevole e chiusura raggiungibile; chiaro e scuro; icona viola, poi verde con Bosco + «Dallo sfondo». Screenshot in `backup/ai-notice/` |
| Chiusura e fuoco | Browser: apertura con Invio, Esc, pulsante di chiusura e tocco sullo sfondo | Superato | Esc e tocco esterno restituiscono il fuoco al pulsante AI; sola informativa, nessun consenso richiesto |
| Diff circoscritto | `git diff --no-index -- backup/ai-notice/pre/SystemLayout.tsx progetto/acasystem/frontend/src/pages/system/SystemLayout.tsx`; `git diff --check` sul file | Superato | Solo le due righe attese rispetto alla copia PRIMA; tutte le altre modifiche locali restano preesistenti |
| Banco, hardware, valutazione legale del prodotto | Non eseguiti | Non eseguito | Nessun aggiornamento del banco, nessun test sul Tab M11 o telefono fisico; nessuna certificazione di conformità |

## Controllo del diff e decisioni

Il diff corrisponde alla richiesta. La richiesta umana autorizza il comportamento; nessun nuovo ADR necessario per la composizione locale delle primitive esistenti. Il resto della 0.9.27 e i documenti di D1 non sono modificati. Indice dei report e stato del progetto ricevono soltanto una voce relativa a questo intervento.

## Chiusura e punto di ripresa

Intervento completato nei sorgenti e verificato localmente. Nessun incarico di realizzazione resta attivo per questa nota. Nessun commit o deploy. L’aggiornamento del banco e la ripresa della 0.9.27 rimangono incarichi distinti; chi li esegue dovrà preservare i tre nuovi file e le due righe in `SystemLayout.tsx`.

Anteprima selezionata: `backup/ai-notice/popup-preview.png`. Altre evidenze: `mobile-popup.png`, `mobile-header-violet.png`, `mobile-header-green.png`, `desktop-dark-popup.png`. La pagina temporanea e il server dedicato sono rimossi/fermati alla chiusura.

## Annotazione del 2026-10-23 (inclusa nella 0.9.27 e verificata sul tablet)

*Annotazione datata: non riscrive il resto. Scritta da Claude Code (claude-sonnet-5-5) alla chiusura della tappa Z di [REP-20261022-002](REP-20261022-002-piano-blocchi-thread.md), su richiesta dell'utente («includi anche l'informativa AI di REP-20261023-005 e verificane la presenza nelle impostazioni sul tablet»).*

- **Inclusione.** L'informativa è entrata nella **0.9.27**: i tre file (`AiDevelopmentNotice.tsx`, `aiDevelopmentNotice.css`, `ai-development.svg`) e le due righe di `SystemLayout.tsx` sono stati preservati, senza modifiche, da tutte le tappe del blocco e sono nel bundle servito dal banco (`index-CnNjysVo.js`, `index-CEvWC0TJ.css`). Il banco è `aca-system:0.9.27` su 192.168.1.7:3002. La dicitura «banco non aggiornato» nel campo «Stato» era vera alla data della nota e non lo è più.
- **Verifica sul Tab M11** (gesti sintetici, schermo acceso, banco 0.9.27 su `http://localhost:3002` via `adb reverse`): in Sistema, in alto a destra (x 1129-1216 su 1280), c'è il pulsante «AI» con l'icona nel colore d'accento (`oklch(0.573 0.233 279)`, uguale a `--aca-accent`). Apre «Uso dell'AI nello sviluppo di Acasystem», con testo a 16 px e scorrevole (427 su 414 px, `scrollTop` da 0 a 12,7). Si chiude con «Chiudi», con Esc e con un tocco fuori, e in tutti e tre i casi il fuoco torna sul pulsante. Schermate: `backup/issue-109/Z/informativa-ai-impostazioni-tablet.png` e `backup/issue-109/Z/sistema-pulsante-AI-tablet.png`.
- **Limiti.** Verifica con gesti sintetici, non col dito; non provata sul telefono; il testo non è stato riletto da un legale e questa nota non è una valutazione di conformità.
