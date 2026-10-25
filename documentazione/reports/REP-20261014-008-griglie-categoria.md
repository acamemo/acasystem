# Griglie iniziali proporzionate alle categorie

| Campo | Valore |
|---|---|
| ID | REP-20261014-008 |
| Stato | Completato |
| Data | 2026-10-14 |
| Autore | Codex |
| Commit di partenza | 7298d4df0d33bc92123517776d9ebc7c12ecefa6 |
| Richiesta | Verificare il riuso dei componenti del kit; griglia iniziale definita in base ai widget di ogni pagina, senza celle vuote. |

## Perimetro e criteri

Il codice usa le primitive del kit e i widget operativi del registro, non i nuovi concept simulati della galleria. Questa distinzione è stata comunicata all'utente. L'incarico modifica le griglie iniziali, non converte i concept simulati in nuove API HA.

Comporre tutti i widget della categoria in una griglia piena per ogni classe di schermo, rispettando i limiti del registro. Riutilizzare griglie modificabili, persistenza e gesti esistenti. Aggiornare le disposizioni precedenti solo se ancora identiche alla disposizione iniziale; conservare personalizzazioni, dispositivi e categorie eliminate. Nessun commit, deploy o aggiornamento Docker.

## Avanzamento e verifiche

`categoryPageGrid.ts` compone rettangoli pieni per ogni classe di schermo, rispettando i minimi/massimi del registro. Preferisce le dimensioni iniziali; può ingrandire un widget entro i limiti consentiti quando serve a completare la griglia. `categoryGrids` conserva la base della pagina nel salvataggio e nelle istantanee; una scelta esplicita di colonne resta prioritaria. Le griglie iniziali non richiedono continuazioni e non mostrano celle libere «+».

La migrazione confronta le disposizioni precedenti con quelle generate dal vecchio algoritmo. Aggiorna soltanto famiglie complete ancora in tale disposizione; non ripristina widget o pagine eliminate. Salva sulla pagina principale le impostazioni dei widget provenienti dalle continuazioni. Posizioni, colonne, pile, differenze di configurazione e continuazioni rinominate/nascoste/scelte come pagina principale bloccano l'aggiornamento automatico per conservare la personalizzazione.

Il calcolo condiviso delle celle mantiene distanze regolari per queste pagine iniziali; la distribuzione generale degli spazi rimane il default delle altre griglie. I margini esterni necessari a mantenere le celle quadrate restano centrati.

| Categoria | Telefono | Desktop/tablet landscape | Widget |
|---|---|---|---|
| Luci e comandi | 2 × 5 | 5 × 2 | 5 |
| Clima e meteo | 4 × 5 | 6 × 2 | 3 |
| Sicurezza | 2 × 5 | 6 × 3 | 3 |
| Multimedia | 4 × 4 | 8 × 2 | 4 |
| Casa e info | 4 × 8 | 8 × 4 | 7 |
| Energia | 2 × 4 | 4 × 2 | 2 |
| Utilità | 4 × 1 | 4 × 1 | 1 |

I numeri rappresentano celle, non numero di card: ciascun widget può occupare più celle.

## Verifiche ed evidenze

| Controllo | Esito |
|---|---|
| Test | Prima verifica: 30/30 (griglie, controller, categorie, pile). Dopo la correzione delle distanze: 152/152 nei quattro file CategoryPageGrid, LauncherController, LauncherGeometry e LauncherScreen. Dopo le guardie sulle continuazioni personalizzate: rieseguiti i 22 casi griglie/controller, tutti superati. Massimo quattro worker. |
| Statici | Typecheck, lint, tipografia/colori e Prettier sui file interessati superati. Zero violazioni tipografia/colori. git diff --check superato; detector Impeccable senza segnalazioni. |
| Build | Superata anche dopo l'ultima modifica; warning preesistente del chunk hls >500 kB. |
| Browser | `backup/check-griglie-categoria.cjs`, Chromium senza GPU separato dai test: sette categorie × 390/1280/1920. Zero celle libere, tutti i 25 widget presenti, nessun overflow orizzontale della pagina o errore browser. Secondo passaggio conferma dopo la correzione delle distanze. Immagini locali in backup/griglie-*.png. |
| Kit | Ispezionati CategoryWidgetContent, registro operativo e galleria: confermata la distinzione comunicata all'utente, registrata in ISSUE-064. |

## Chiusura

Griglie completate nel frontend di sviluppo, con preservazione delle disposizioni già personalizzate. Nessun commit, deploy o aggiornamento Docker. Il trasferimento dei 20 nuovi concept nelle pagine operative non è realizzato da questa correzione delle griglie; richiede un incarico distinto di integrazione con dati/comandi reali. Nessun collaudo su dispositivi HA fisici.
