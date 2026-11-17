# Banco PC con gesti catalogo da tutte le pagine Home

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261109-006 |
| Stato | Completato; banco ACA0.9.51/r99 installato e verificato |
| Data | 2026-11-09, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta di riferimento | «Ok, aggiorna anche il banco sul PC con queste modifiche», chat corrente dopo REP005. |
| Autorizzazione | Aggiornamento del solo banco ACA locale, con backup e conservazione di account/profili. Nessuna pubblicazione, installazione nativa o modifica ad HA. |

## Obiettivo e perimetro

Installare localmente ACA0.9.51/r99 con la fonte già verificata in [REP005](REP-20261109-005-gesti-catalogo-tutte-pagine.md): catalogo verso l'alto da tutte le pagine Home, ritorno verso il basso e misura corretta delle speciali. Fonte1816file/SHA256 `42e16a7777d01787b86bc03b7ea5c520ba35bb1b95aad4b4e3d0c4f824f2ba0c`. Nessun nuovo comportamento applicativo o cambiamento di dipendenze. Baseline banco .50, pubblica .34 invariata; richiesta riferita a [REQ-32](../funzionalita/product.md) e [ADR-0048](../decisions/ADR-0048-catalogo-widget-tendina.md).

Worktree iniziale619voci preesistenti; preservare tutte le modifiche e verificare la fonte corrente contro il sigillo REP005. Materiali e prove operativi in `backup/rep063/`, escluso da Git. La ricetta derivata già verificata ricostruisce frontend/Casa3D usando builder vincolato e runtime .46 esatto, con backend/contratti/manifeste invariati; niente installazioni runtime nuove. Il rollback conserva l'intera catena .50 e i dati correnti.

## Criteri di completamento

- Fonte immutata e artefatti .51 coerenti: immagine, sorgenti e bundle web, audit isolato prima del banco.
- Backup freddo nuovo, estratto e SQLite integro prima del breve riavvio del solo ACA.
- Account/profili e tabelle applicative conservati; distinguere eventuali soli timestamp di attività verificati con audit ristretto, senza nascondere esiti negativi.
- Identità HA/servizio, mount e container/avvii HA/D1 invariati.
- Banco .51 healthy/ready su PC e LAN; frontend effettivo e QA anonima senza login o comandi.
- Documenti di avvio/rollback e verifiche aggiornati. Collaudi hardware e sessione autenticata umana distinti dalle prove automatizzate.

## Avanzamento e modifiche

Preflight: banco .50 in esecuzione; LAN Wi-Fi192.168.1.37. Cartelle rep063 e output .51 non preesistenti. Nessuna nuova domanda di approvazione: l'utente ha autorizzato l'aggiornamento corrente.

Fonte confrontata con REP005 e immutata. Build derivata completata:180file backend/contratti/manifeste invariati, builder vincolato e runtime .46 esatto; ricetta SHA558ba87a8be5cce65e470060a0ace315745dbe2be7aae8a05679bbf43d30fc90. Immagine base `sha256:755a34951072ec113794da2e5e9c56845834688506593fe62b3c8fb55257c0d8`; wrapper locale `sha256:5cf943e30549773853433b105020df3df68d46dd06310f260fc8c9ef827d083d`. Pacchetti locali .51/r99 preparati, senza push; web3372268byte/SHAba3312a86a07e003abcbe92ce6ef601345480ab260ba50f0f8cab92029b982a9, minimo server .51 e shell .1.0.

Dopo audit e prova UI isolata, creato il gate `artifacts-ready.json` verificando nuovamente la fonte corrente. Fermato soltanto ACA, prodotto un nuovo backup freddo, estratto e controllato con SQLite; poi ricreato soltanto il servizio tunet. Nuovo archivio `backup/rep063/cold-bank-pre-0.9.51/aca-data-pre-0.9.51.tgz`,209507byte, SHA256 `36cf50995b04f02e09252f86285cdf46bb6fbf85d25453f82a7e9c424e4badd7`, integrità ok.27/27tabelle immediate identiche, nessuna colonna aggiunta.

Il controllo successivo esatto ha dato5/6: il solo confronto delle tabelle live è fallito. L'esito resta in `ops-preservation-audit.json`; non è stato sostituito con un rerun verde. L'audit separato cold→live in transazione ha confermato26tabelle esatte e30righe token con tutti i campi fissi identici; una sola `seen_at` avanzata monotonicamente,0variazioni impreviste e integrità ok. Non sono cambiati profili, account, associazioni o token. Identità HA/provider e segreto tecnico uguali; HA/D1 stessi container/immagini/avvii, mount tutti conservati. Nessun rollback necessario.

## Verifiche ed evidenze

| Controllo | Procedura | Esito | Limiti |
|---|---|---|---|
| Fonte e checkpoint | `node backup/rep063/prepare-root.mjs`: snapshot confrontato con sigillo REP005 | Superato |1816file/SHA42e16a77 invariati;619voci dirty preservate |
| Build | `node backup/rep063/build-frozen-base.mjs`; `node progetto/ha-app/prepare.mjs --version 0.9.51 --revision 99 --base-image aca-system:0.9.51` | Superato | Ricetta derivata, frontend/Casa3D ricostruiti,180fonti runtime identiche; nessuna installazione pacchetti runtime |
| Audit artefatti |4helper audit in rep063,3container isolati senza rete/volumi live | Superato |7checksum,1816fonti,127web,117runtime,3marker/hash gesti;7versioni e19APK identici alla .50, container rimossi |
| Helper operativi | AST PowerShell, Node/Python/YAML e contratto statico | Superato | Baseline14compose, candidato15; nessuna operazione live durante la preparazione |
| UI candidata impacchettata | Browser privato, estratto dal ZIP esatto .51, touch CDP UP/DOWN sul widget reale | Superato | Stessa pagina/layout e0comandi/API/WS/errori; helper59981 e browser chiusi, nessun account reale |
| Backup e aggiornamento | `node backup/rep063/capture-bank-state.mjs before`; `& ./backup/rep063/Update-AcaCatalogBank.ps1` | Superato | Backup209507byte verificato; solo ACA ricreato .51/healthy,27tabelle immediate identiche |
| Conservazione stretta | `node backup/rep063/capture-bank-state.mjs after`; `node backup/rep063/ops-audit-preservation.mjs` |5/6, negativo preservato | Backup, identità, mount/container e health superati; confronto live distinto dall'istantanea immediata |
| Conservazione concorrente | `audit-live-preservation.mjs` in container senza rete, DB live/backup readonly e estrazione tmpfs | Superato |26tabelle esatte;30righe token/campi fissi uguali, solo1seen_at monotona,0imprevisti |
| Banco e LAN | GET health PC/LAN e setup; browser anonimo390 | Superato | .51/ready; entry index-CMk9ozva e ZIP/hash esatti,0overflow/demo/errori/login/mutazioni/WS |

## Controllo del diff e decisioni

Solo materiali operativi locali e documentazione. La fonte applicativa deve rimanere identica a REP005; non correggere debito estraneo o modificare lo stack durante il rilascio locale.

Fonte invariata1816/SHA42e16a77: i94test mirati/9UI e13scenari browser di REP005 sono evidenza precedente conservata, non dichiarati rieseguiti durante l'installazione. Nuovi controlli qui: compilazione/strict nel build, audit dei pacchetti, touch sul pacchetto e vista anonima del banco. Nessuna modifica di dipendenze, .env, firewall, registrazione, credenziali o browser umano. Account/profili preservati tramite audit dati separato dalla QA anonima.

## Chiusura e punto di ripresa

Completato: ACA0.9.51/r99 healthy e casa ready su [PC](http://127.0.0.1:3002/) e [LAN](http://192.168.1.37:3002/). Ricaricare la scheda ACA conCtrl+F5 sul PC per ottenere i nuovi asset. Non occorre ricreare account o profili. Browser/context/3container e helper privati chiusi; anteprima utente4185 conservata. Avvio e rollback alla .50, mantenendo i dati correnti, in [infrastruttura](../infrastructure.md).

Hardware Android/iPhone/M11 e sessione autenticata umana non collaudati implicitamente. Pubblica .34 invariata, nessun commit/push o installazione sul sistema domestico. ISSUE-134 e il distinto profilo iniziale composto soltanto da speciali restano non risolti da un collaudo globale. Nessun incarico software residuo implicito.

Sigillo `backup/rep063/final-validation.json` superato: fonte corrente1816/SHA42e16a77, immagine effettiva .51/healthy, backup/hash, conservazione dati/identità/HA/D1, UI impacchettata e anonima, entry servita esatta, PC/LAN ready e helper privati chiusi.11documenti/1538collegamenti locali validi e nessun nuovo whitespace; conservato lo spazio finale storico di product.md identico a HEAD. L'esito operativo stretto5/6 rimane esplicitamente distinto dal controllo ristretto superato.

## Rettifica2026-11-09 — controllo YAML degli helper

Il riepilogo «Node/Python/YAML» della preparazione non identifica un parser YAML autonomo eseguito: quel parser risultava indisponibile e l'override fu confrontato come testo canonico. L'installazione Compose .51 realmente eseguita ha comunque letto la catena completa. Nella correzione successiva [REP007](REP-20261109-007-ritorno-catalogo-trackpad.md) il preflight esplicito `docker compose … config --quiet` sulla nuova catena16file è stato aggiunto e superato, senza stampare segreti. Questa nota rettifica soltanto il metodo dichiarato, preservando esiti di installazione e audit già registrati.
