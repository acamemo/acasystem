# REP-20261110-002 — Clima per dispositivo

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261110-002 |
| Stato | Completato localmente e verificato |
| Data | 2026-11-10, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile. |
| Commit iniziale | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69` |
| Richiesta e autorizzazione | «vai procediamo con clima», dopo la proposta Clima: termostati e climatizzatori, Home con temperatura attuale/desiderata/stato, dettagli con modalità/ventilazione/oscillazione/preset supportati, misure e manutenzione separate; un widget per dispositivo e percorso Trova → anteprima → Conferma. Build locale, banco invariato. |

## Obiettivo e perimetro

Terza famiglia di [ADR-0049](../decisions/ADR-0049-widget-prodotti-per-dispositivo.md), dopo [Luci](REP-20261109-013-utilita-e-luci-per-dispositivo.md) e [Prese](REP-20261110-001-prese-interruttori-per-dispositivo.md). Usare il tipo esistente `climate`, il contratto prodotto versione1, lo stesso device_id per canali e secondarie e i controlli/servizi effettivi. Conservare i widget Clima storici, i loro ID e preferenze; nessuna migrazione automatica o comando collettivo fra canali. Un dispositivo multicanale mostra un riepilogo in Home e i singoli canali nei dettagli.

Git iniziale667voci preesistenti, checkpoint esatto dei1843file .59 in `backup/rep072/source-checkpoint.zip`, manifest e Git iniziali nello stesso percorso. Preservare le modifiche preesistenti. Fonte progettuale: [prodotto](../funzionalita/product.md), [matrice](../riprogettazione/matrice-widget-ha.md), [design](../design/design.md). Stack, dipendenze, autenticazione, tema e gesti restano quelli esistenti. Nessun aggiornamento/installazione banco o pubblicazione. ISSUE-134 e gesto postnuova pagina ISSUE-152 sono distinti.

## Criteri di completamento

- Risolutore climate e guardia del contratto, canali ordinari visibili/abilitati, secondarie dello stesso dispositivo e tecnica separata; nessuna aggregazione di hub o case.
- Trova e associazione manuale condividono il risolutore; destinazioni esistenti aperte invece di duplicare, anteprima inerte e conferma autorevole, ID stabile e annullamento conservati.
- Nuovo prodotto Clima: attuale, desiderata e stato veritieri; modalità, preset, ventola, oscillazioni e temperature supportate, limiti/passi/unità effettivi, nessun valore di comando inventato se manca un attributo necessario. Canali e target distinti, indisponibilità e negazioni esplicite; nessun comando all'apertura.
- Primitive/materiali/transizioni comuni; desktop/telefono, nomi lunghi, tastiera e movimento ridotto. Nessun nuovo blur o zoom dello sfondo.
- Test pertinenti, regressione Clima storico/Luci/Prese, strict/build/controlli comuni e confronto con debito preesistente; QA e pacchetto locale con provenienza verificata. Hardware e login reale distinti.

## Avanzamento e modifiche

Implementata la famiglia nel tipo esistente `climate`, senza nuove dipendenze o endpoint:

- Contratto versione 1 e risolutore per esatto device_id. Canali ordinari visibili/abilitati, secondarie e tecnica da registro; entità configurative non usate come prodotto principale. Nessuna aggregazione fra apparecchi dello stesso hub.
- Trova, destinazioni e anteprima associano `climateId` e metadati corretti; destinazione già presente, duplicati storici e percorso di conferma esistente restano condivisi. Associazione manuale estratta nel componente neutro `ProductBindingSection`, riutilizzato da Prese e Clima; export compatibile di Prese mantenuto. Scrittura principale/metadati/nome in un'unica operazione.
- Nuovi renderer prodotto per Home e Console. Attuale, desiderata e attività osservata; obiettivo singolo o intervallo, umidità, modalità, ventola, preset e oscillazioni solo secondo feature, attributi e catalogo servizi. Unità/limiti/passo mancanti non diventano numeri di comando predefiniti. Per accendere via modalità si usa un'unica scelta non ambigua; niente modalità heat inventata.
- Home multicanale con riepilogo, comandi singoli nei dettagli. Misure d'uso e tecnica separate, target esatti per ogni canale e percorso personale tracciato. Nessun comando all'apertura o in anteprima. Nuovo prodotto con minimo 2×2; i widget storici mantengono minimo, preferenze e percorso originale quando non hanno metadati coerenti.
- DEMO isolata con termostato semplice, climatizzatore a due canali, misure e tecnica esplicitamente simulate. Nessuna corrispondenza dichiarata con modelli fisici. L'Excel resta una fonte progettuale versionata; non viene letto all'avvio né modificato.

La review ha trovato un difetto del nuovo controllo: su dispositivi con solo TURN_ON o TURN_OFF, il comando inverso mancante cancellava prematuramente l'attesa. Corretto distinguendo blocco runtime e indisponibilità della sola azione inversa; quattro regressioni prima RED 0/4, poi PASS, con rifiuto/indisponibilità e nessun reinvio. QA ha individuato anche il wrapper di centratura mancante della Console e i comandi affiancati troppo larghi nella card telefono: ripristinato l'involucro comune e separata la riga della temperatura. Infine, il confronto dello screenshot con nome lungo ha rilevato che un valore testuale di StatList ereditava il nowrap numerico: correzione locale ai dettagli Clima per andare a capo nella propria cella, senza cambiare la primitiva o altre famiglie. Il primo pacchetto e il falso verde degli assert generali sono conservati come evidenza superata; il controllo finale misura anche i valori interni. Questi rilievi appartengono al lotto, non al debito storico.

## Verifiche ed evidenze

| Controllo | Procedura | Stato | Limiti |
|---|---|---|---|
| Checkpoint | Hash e ZIP .59 dei1843file | Superato | Byte esatti prima delle modifiche. |
| Frontend pertinente | 41 file nel gruppo ampio; gruppi finali degli ambiti modificati | 754 scenari unici, ultimi esiti PASS | Non è la suite generale completa. Gruppo ampio 711/714: tre attese di Conferma non concluse entro timeout. Non riprodotte nel gruppo mirato finale 126/126, senza rimuovere assert o aumentare attese. Causa non accertata; negativi conservati. |
| Clima dopo le correzioni | ClimateProduct/Console/ComfortClimate, maxWorkers=1 | 44/44 PASS | Include 24 casi prodotto e quattro regressioni del comando unidirezionale. |
| Backend profili | collaboration.test.ts e profileService.test.ts | 17/17 PASS | Servizi controllati, non installazione su centrale reale. |
| Strict e build | prebuild frontend; typecheck backend e UI; Vite con ACASYSTEM_VERSION=0.9.60 | Superato | Avviso bundle HLS oltre 500 kB già presente. |
| Contratti comuni | npm run test:ui; npm run test:design | 3/3 UI e 6/6 asset PASS | Pacchetti condivisi e generazione, nessun aggiornamento dipendenze. |
| Lint e tipografia | eslint JSON finale confrontato alla .59; lint-theme-colors; lint-typography | 0 nuove diagnosi | ESLint 7 errori identici per fingerprint; 1 tipografia connect.css:103, file byte-identico. ISSUE-134 aperta. |
| Sorgenti e pacchetto | Checkpoint, diff, EOL, ZIP e HTTP | Superato | 23 modificati/10 nuovi/0 rimossi, sigillo sotto. |
| Browser del pacchetto finale | 1916×882 e 390×844; termostato, multicanale e manuale | 6/6 percorsi, 6/6 cold, 4/4 visuali PASS | Negativo pagina piena, conferma/annullamento/lookup, target esatti, testi lunghi, indisponibilità, tastiera, movimento ridotto e transizioni. Solo dati simulati. |

Comandi ed esiti completi: `backup/rep072/tests-summary.json`, i JSON/log Vitest elencati al suo interno, `checks-results.json`, `build-sealed.log`, `lint-comparison-final.json`. I gruppi sovrapposti sono deduplicati per file/nome del caso con precedenza all'ultimo esito: 754 non è la somma dei contatori. Le prove iniziali fallite e quelle superate restano separate.

QA definitiva in `backup/rep072/qa-final-wrap/qa-final-summary.json`, `qa-climate.json` e `visual/qa-visual.json`: sei comandi espliciti alla sola connessione DEMO (due intervalli 20→21 mantenendo il limite alto 24, due obiettivi 20,5→21, due umidità 50→55), nessun altro canale o comando reale. Nessun errore JS/richiesta esterna, browser chiusi. Tutti i controlli Home sono contenuti nella tessera; dettagli desktop larghi 640 px e centrati, telefono 350 px nel viewport 390. Valori testuali misurati nella propria cella e screenshot letti dopo il fix. Campioni RAF verificano sfondo/viewport/filtri invariati, non prestazioni FPS o GPU fisica.

Il cold iniziale monta tre renderer Clima preassociati con controlli/geometrie identici dopo 600 ms, ma sono fuori dalla prima pagina visibile DEMO: questa misura non viene presentata come prova di Clima visibile al primo frame. Il test naviga poi alla tessera preassociata. Il comportamento del gesto postnuova pagina già qualificato in ISSUE-152 non viene riassegnato; il collaudo usa i controlli pubblici disponibili.

## Diff e decisioni

Il rendering prodotto richiede metadati validi e `climateId === primaryEntityId`. Un ricollegamento manuale incoerente non invia comandi ai vecchi canali; il comportamento storico rimane disponibile. Nessuna sostituzione globale di `widgetDeviceKey`/ADR-0019. Scelte esecutive comprese nella richiesta, attuate in [ADR-0049](../decisions/ADR-0049-widget-prodotti-per-dispositivo.md), [matrice versione 3](../riprogettazione/matrice-widget-ha.md) e [brief](../design/componenti/clima-prodotto.md).

Confronto byte con checkpoint: 1843 → 1853 file applicativi, 23 modificati, 10 nuovi, 0 rimossi; EOL conservati e nessuno spazio finale aggiunto. Il vecchio export di Prese è uno shim compatibile; i controlli storici Clima non sono riscritti. Diff e manifest completi in `backup/rep072/source-audit.json`, `source-delta.diff`, `source-after.json`. Git iniziale e originali conservati, nessun commit/deploy.

## Fonti primarie e compatibilità

Consultate il 2026-11-10: [ClimateEntity](https://developers.home-assistant.io/docs/core/entity/climate/), [costanti HA Core 2026.10.4](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/climate/const.py), [integrazione Climate](https://www.home-assistant.io/integrations/climate/). La revisione fissata guida feature e attributi, inclusi intervalli, umidità e oscillazione orizzontale; il rendering runtime verifica comunque i dati e i servizi effettivi. Non dichiara compatibile ogni integrazione dello snapshot Excel `dev` o ogni versione/modello fisico.

## Build locale e prova

Anteprima: [ACA .60](http://127.0.0.1:4190/?screen=app#/mockup). Dati simulati, nessun accesso ai dati del banco. Nel catalogo aprire Trova dispositivi e scegliere Termostato camera o Climatizzatore studio; anteprima, Conferma, tocco sulla tessera per i dettagli. Il climatizzatore ha due canali, funzioni diverse e misure/tecnica separate. È disponibile anche l'associazione manuale del tipo Clima.

Pacchetto: `backup/rep072/acasystem-web-0.9.60-local.zip`, 2716358 byte, SHA-256 `627358fd3bcbbad5f26cc2060f11a52b86587fdc5b86b46c557f9672530b826d`. Tutti i 110 file del dist corrispondono ai byte del ZIP; index ed entry HTTP verificati. Entry `index-B5L9y3Tl.js`, SHA `b9d345112b27548a2b04d488cfbaf6e21ebb913b7a4a7daa98f634507025a7ac`; fonte 1853 file SHA `dc64842e52727203905493caa6a78292a93403b83d2dc4a36684bb997a334a4b`. `artifact-manifest.json` conserva il sigillo. Versione di build impostata solo nel processo figlio con ACASYSTEM_VERSION=0.9.60.

Il reload DEMO ricrea i dati iniziali: il controllo cold usa il termostato preassociato, senza dichiarare persistenza dei widget aggiunti nella visita precedente. Hardware HA, Lenovo M11, Safari/iPhone reale, autenticazione e revoche reali non sono provati da questa DEMO. Account, profili e configurazione del banco non sono stati aperti o modificati.

## Chiusura e punto di ripresa

Consegna locale .60 completata: criteri del lotto verificati entro i limiti dichiarati, sorgenti/pacchetto/HTTP coerenti e istruzioni di prova sopra. Nessun incarico residuo della famiglia o implementazione automatica delle prossime. Lint generale ISSUE-134 e gesto ISSUE-152 rimangono separati. Un eventuale aggiornamento del banco richiede un incarico distinto; account, profili, HA e release pubblica restano invariati.
