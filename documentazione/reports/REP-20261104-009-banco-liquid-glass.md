# Banco PC con ACA Liquid Glass

| Campo | Valore |
|---|---|
| ID / stato | REP-20261104-009 — Completato e verificato sul banco PC |
| Data / autore | 2026-11-04, Codex; nome esatto del modello non disponibile |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta / autorizzazione | «Ok, aggiorna anche il banco sul PC con il nuovo tema Liquid Glass, mantenendo account e profili, così posso provarlo nell’app reale.» |

## Obiettivo e perimetro

Aggiornare soltanto ACA del banco PC, da 0.9.41/r99 alla nuova build locale 0.9.42/r99 contenente il tema già realizzato/verificato in [REP008](REP-20261104-008-tema-liquid-glass.md). Preservare account HA, identità tecnica e dati ACA, incluse le copie recuperate dei profili in REP005 e ogni modifica successiva. HA dedicato persistente, HA storico e D1 non vanno riavviati o sostituiti. Nessun rilascio pubblico, nuova funzione, dipendenza o installazione hardware. Stato Git iniziale: 520 voci preesistenti da preservare.

## Criteri di completamento

Nuova immagine locale con provenienza verificata e manifest coerente; backup freddo attuale estratto e verificato prima della sostituzione; rollback alla precisa .41 precedente. Stessi volumi, conservazione documentata di account/profili/dati, salute e versione attese sul PC/LAN, tema visibile nella webapp reale senza autenticazioni artificiali o comandi fisici. Confrontare HA/D1 con fotografia iniziale. Aggiornare guida di avvio e documentazione con esiti e limiti.

## Preparazione

Baseline verificata con Docker: ACA0.9.41 healthy su loopback/LAN .19, HA dedicato attivo e D1 attivo. Metadata selezionati, checkpoint documentale e helper di sola lettura in `backup/rep036/`. I vecchi script rep033 non sono riusati invariati: attendevano la .40 e il loro rollback era alla .40, mentre i profili recuperati richiedono una nuova fotografia dei dati correnti.

Override previsto: base compose + rep032 (HA dedicato) + rep033 (baseline .41) + rep036 (nuova ACA .42). Il rollback omette soltanto rep036. Aggiornamento con `--no-deps --no-build --pull never`, senza ricreare HA o D1. Backup del solo volume dati ACA; segreto tecnico resta nel volume separato e non viene esposto nelle evidenze.

## Avanzamento e verifiche

Costruita la base da snapshot congelato con `node progetto/ha-app/build-base.mjs --version 0.9.42 --tag aca-system:liquid-glass-local`, poi wrapper/materiali con `node progetto/ha-app/prepare.mjs --version 0.9.42 --revision 99 --base-image aca-system:liquid-glass-local`. Nessun push. Audit separato del delta contro .41: 18 file diversi (10 modificati, 8 aggiunti) soltanto design/frontend; 116 runtime backend/contratti identici, nessuna dipendenza/lock/Dockerfile o migrazione modificata.

| Materiale | Risultato |
|---|---|
| Wrapper locale | `sha256:c0d2e934544aea4e2f3176eaabd718bfec4cce0d1202843e0749a647da9dd80c` |
| Base | `sha256:1e86317f423bcbcbccb4e070992c7d3d39b13059188e969d25d3a1103b88786a` |
| Snapshot sorgenti | 1763 file, SHA256 `92c2cc28dcb67105f496422563909bd29907dc7e3288a4ad60ea63136b6b26b0` |
| Bundle web | 3130918 byte, SHA256 `d5f9d026af5bc83b9b61650bb2365ff229d9c8ed88e6d2321c77e04dfe8c5ac0` |
| Manifest | Versione/minServer0.9.42, minShell0.1.0, stessi byte nell’immagine e nei materiali locali |

Audit indipendente PASS: 7 checksum, 1763 sorgenti/proof, 22 strumenti +2generati, 119 asset web immagine/ZIP, 116 file runtime, 11 fonti Classico e marker del nuovo tema/fallback. Smoke isolato senza rete/volumi dell’utente: health/root/manifest200, bootstrap anonimo401; contenitori temporanei rimossi. Evidenze `artifact-0.9.42-*` in `backup/rep036/`. I controlli del tema e il debito preesistente in REP008 non sono presentati come una nuova suite generale tutta verde.

Prima della sostituzione verificati il tag .41 per rollback, i pin delle immagini e l’IP .19. I nuovi script locali sono stati riletti indipendentemente e passano il parser PowerShell. Aggiornamento limitato a `tunet` con i quattro compose previsti. Nessuna migrazione dei profili, nuova registrazione o ripetizione della copia di recupero.

### Conservazione e verifica reale

| Controllo | Esito ed evidenza |
|---|---|
| Backup freddo corrente | `backup/rep036/cold-bank-pre-0.9.42/aca-data-pre-0.9.42.tgz`, 179723 byte, SHA256 `19783e5d73a30f1a30aab09d4013a23177e357cdd2e4585941ab7417ffc2233d`. Estratto in tmpfs separata, SQLite integrity `ok`; segreto tecnico escluso. |
| Dati ACA dopo riavvio | 27/27 tabelle identiche alla fotografia nuova prima del riavvio, nessuna colonna aggiunta, integrità `ok`; `data-comparison.json`. Tutti i profili, compresi originali e copie recuperate, rimangono conservati. |
| Account HA e identità tecnica | Tre utenti HA/due credenziali: impronte utenti e provider prima/dopo identiche; file del segreto tecnico identico, nessun contenuto segreto mostrato. `identity-before/after.json`. |
| HA/D1 e volumi | Stessi ID, immagini, stato e orario di avvio; stessi volumi dati e segreto ACA. `services-before/after.json`. HA storico non interessato. |
| Servizio effettivo | Container0.9.42/r99 healthy; health `ok` e setup `ready` su loopback e LAN .19, `runtime-final.json`. |
| UI reale | Browser anonimo sul banco3002, desktop1366 e390: «Accedi», materiale Liquid Glass al66%/blur12px, token overlay86%, zero overflow/errori/richieste esterne/mutazioni. Screenshot `bank-liquid-login-*.png` e `bank-liquid-ui-results.json`. Nessuna credenziale inserita o form inviato. |

Primo tentativo del controllo UI non contato come PASS: la fixture pretendeva la grafia CSS `86%`, mentre la build minificata esponeva l’equivalente `#ffffffdb`. Conservato in `bank-liquid-ui-attempt1-results.json`; verificatore corretto per confrontare il colore risolto dal browser, poi2/2viste PASS. Non è stata necessaria alcuna correzione del prodotto o del banco.

Il confronto crittografico verifica conservazione di dati e identità; non equivale a una nuova prova autenticata con l’account umano o di un comando fisico. Nessuna prova iPhone/Safari, M11 o Android fisico effettuata in questo aggiornamento. La LAN è verificata dal PC, non da un telefono remoto.

Revisione indipendente delle evidenze di conservazione PASS in `preservation-audit.md/json`: SHA del backup ricalcolato, log di integrità effettivamente eseguito e confronti dati/identità/servizi coerenti. Controllo finale `prepare.mjs --check` conferma lo snapshot corrente contro la base. Documentazione:317nuovi collegamenti relativi senza riferimenti interrotti, pacchetti nativi precedenti invariati per byte/SHA; nessuno spazio finale aggiunto nei documenti confrontati col checkpoint. Backup privato escluso da Git, verificato con `git check-ignore`. Ultimo controllo Docker ancora0.9.42healthy, HA/D1 attivi con stessi avvii.

## Chiusura e punto di ripresa

ACA Liquid Glass installato e verificato sul banco. Aprire http://127.0.0.1:3002/ sul PC oppure http://192.168.1.19:3002/ sulla LAN; ricaricare le schede già aperte per ottenere il nuovo frontend, senza ricreare account o profili. L’uso esclusivo del profilo resta quello già concordato.

Override corrente: base + rep032 + rep033 + rep036; comando completo e rollback conservativo in [infrastructure.md](../infrastructure.md). Vecchia immagine .41 e backup attuale conservati. Nessun incarico ulteriore attivo, nessuna pubblicazione, installazione sul mini PC o modifica HAOS, dipendenza o commit.
