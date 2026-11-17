# Banco PC con il tema Vetro Bianco

| Campo | Valore |
|---|---|
| ID / stato | REP-20261104-014 — Completato e verificato sul banco |
| Data / autore | 2026-11-04, Codex; nome esatto del modello non disponibile |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta / autorizzazione | «mettiamo la versione sul banco? così posso vedere il risultato sull'app» |

## Obiettivo e perimetro

Installare soltanto ACA del banco PC con il tema Vetro Bianco completo e rifinito nei [REP011](REP-20261104-011-prova-vetro-bianco-paesaggio.md), [REP012](REP-20261104-012-interfaccia-completa-vetro-bianco.md) e [REP013](REP-20261104-013-allineamenti-accento-vetro-bianco.md). Versione locale prevista0.9.43/r99, da0.9.42/r99. Fonte del design condiviso impostata sul tema richiesto, senza introdurre un selettore. Desktop e browser che ricevono la webapp dalla centrale vedranno gli stessi asset; nessuna nuova installazione di shell richiesta.

Preservare account HA, identità tecnica, dati ACA, profili, dimensioni/ordine e volumi. Non riavviare né ricreare HA dedicato/storico o D1. Nessun rilascio pubblico, push, modifica di autenticazione/schema/permessi o nuova dipendenza. Dati/toolbar dimostrativi rimangono solo nella demo, mai aggiunti alla configurazione reale. Le530voci Git preesistenti sono elencate in `backup/rep041/git-status-before.txt` e preservate.

## Criteri di completamento

Build locale con snapshot/provenienza coerenti e audit del delta rispetto alla0.9.42; backend/contratti/dipendenze verificati. Backup freddo corrente estratto e controllato prima della sostituzione, fotografia dati e identità, rollback alla precisa0.9.42. Aggiornamento limitato a `tunet`, confronto dopo riavvio di tabelle, volumi e identità; HA/D1 invariati. Health/versione e resa effettiva del tema sul banco, senza credenziali artificiali o comandi fisici. Aggiornare guida di avvio, stato e verifiche.

## Avanzamento

Letti gli helper del precedente aggiornamento [REP009](REP-20261104-009-banco-liquid-glass.md). Non riutilizzare invariati gli script che attendono0.9.41 e ne prevedono il rollback. Nuovo prefisso di evidenze/backup `backup/rep041/`; audit indipendenti di sorgenti e procedura in preparazione.

[ADR-0043](../decisions/ADR-0043-vetro-bianco-banco.md) registra la promozione richiesta. Ingresso condiviso impostato su Vetro Bianco, test del grafo aggiornato e6/6controlli delle risorse PASS. README del design coerenti prima del congelamento finale. La prima build, precedente alla chiusura dei README, è stata superata da una nuova build coerente; nessuna immagine intermedia installata.

Materiali locali ottenuti con `node progetto/ha-app/build-base.mjs --version 0.9.43 --tag aca-system:glass-white-local` e `node progetto/ha-app/prepare.mjs --version 0.9.43 --revision 99 --base-image aca-system:glass-white-local`. Nessun push. Snapshot1772file SHA256 `12776e57fe6030b75b9526aef37f4e3253d001b42e217a6ea0cab9c52525e1ea`; base `sha256:c386ed135f288e638273131e39e89db1e83126359f430930fc2a4b282cbfea79`, wrapper `sha256:d3c2a2e8237f0f37a6dee96d709432c37df9f0d7df7c535fd5eaf055b4a357cd`. Bundle3341292byte SHA256 `09c9508e8cc8ecf182a537fe3c23db8bb195662ff020624b1ffa811418469dba`, manifest/minServer0.9.43 e minShell0.1.0.

Audit indipendente del delta contro .42:15file (9nuovi/6modificati), soltanto design/default/test, fixture mockup e Popover già verificati.163filebackend,9contratti,116file runtime,8file package/lock/Dockerfile e22strumenti di build identici. Il gate di avvio demo è immutato: il banco autenticato non riceve contenuti o toolbar simulati.

Nuovi helper `Backup-AcaWhiteBank.ps1` e `Update-AcaWhiteBank.ps1` riletti indipendentemente, parser PASS. Verificati digest nuovo e vecchio/rollback prima dello stop, volumi e LAN. Backup nuovo senza sovrascrivere i precedenti; sostituito solo `tunet` con base+rep032+rep033+rep036+rep041 e `--no-deps --no-build --pull never`. Rollback predisposto alla precisa .42 omettendo soltanto rep041. HA e D1 non ricreati o fermati.

## Verifiche ed evidenze

| Controllo | Esito | Limiti |
|---|---|---|
| Fonte/immagine/bundle | Superato | Audit indipendente:7checksum,1772sorgenti,22strumenti+2generati,120asset web immagine=ZIP,116runtime e11fonti Classico conservate.14marker CSS del tema e fotografia locale verificati. |
| Smoke isolato | Superato | Contenitori senza rete o volumi dell'utente, SQLite in memoria/tmpfs: health0.9.43/root/manifest200, bootstrap anonimo401. Contenitori temporanei rimossi. |
| Backup freddo corrente | Superato | `backup/rep041/cold-bank-pre-0.9.43/aca-data-pre-0.9.43.tgz`,203154byte SHA256 `e78a034698c99ebc9cd3fc216c2ea9b9e419cc8bb1d99662d7992f9e5cd68efb`. Estratto e verificato prima dell'installazione; audit indipendente ricalcola SHA/riestrae e confronta27tabelle. Segreto tecnico escluso. |
| Dati dopo riavvio | Superato | Integrità `ok`,27/27tabelle identiche alla nuova fotografia prima dello stop; nessuna colonna aggiunta. Copie recuperate, originali e configurazioni conservati, senza migrazione. |
| Identità e servizi | Superato |3utenti HA/2credenziali e segreto tecnico con stesse impronte prima/dopo; ricalcolo indipendente dal vivo. Stessi mount, HA/D1 stessi ID/immagini/StartedAt. |
| Salute effettiva | Superato | ACA0.9.43/r99 running/healthy, setupready e manifest0.9.43; health200 loopback e LAN192.168.1.19. |
| UI reale | Superato nel campione |5/5viste anonime1366/390/320 e preferenze ridotte: foto locale decodificata1672×941 e SHA/206122byte corretti, film9%, pseudoBlur16, lavanda, ingresso280ms/solo fade120ms in ridotto, fallback opaco0filtri.0overflow/erroriJS/HTTP/esterne/mutazioni; nessun chrome o flag demo. Nessuna credenziale, form o comando inviato. |

Evidenze selezionate in `backup/rep041/`: `source-scope-audit.md/json`, `artifact-0.9.43-handoff.md` e relativo audit, `bank-update.log`, `data-comparison.json`, `identity-before/after.json`, `services-before/after.json`, `ops-preservation-audit.md/json`, `ops-live-identity-audit.json`, `bank-white-ui-handoff.md/results.json`, `runtime-final.json` e screenshot. Nel primo helper indipendente delle identità il nome del campo JSON atteso era diverso (`technicalIdentity`/`technicalSecret`): errore del verificatore, valori già uguali; tentativo preservato e ricalcolo corretto PASS, nessun cambiamento del banco per risolverlo.

Il confronto dei dati non è una nuova prova autenticata con l'account umano o di comandi fisici; iPhone/Safari, Android/M11 fisici e GPU/FPS restano da collaudare. LAN verificata dal PC, non da un telefono esterno. Il debito ISSUE-134 e i difetti dell'audit ISSUE-145 non diventano risolti per questo aggiornamento grafico. Nessuna nuova suite generale viene dichiarata tutta verde.

## Chiusura e punto di ripresa

ACA0.9.43 con Vetro Bianco installato e verificato sul banco. Aprire [ACA sul PC](http://127.0.0.1:3002/) o [ACA sulla LAN](http://192.168.1.19:3002/). Ricaricare il browser (Ctrl+F5 sul PC), oppure chiudere e riaprire la finestra ACA per richiedere il nuovo frontend. Usare l'account esistente, senza nuova creazione o recupero profili.

Comando corrente e rollback alla .42 in [infrastructure.md](../infrastructure.md). Nessun ulteriore incarico attivo per questo aggiornamento. Nessuna pubblicazione, installazione HAOS, nuova dipendenza o commit. I client non vengono ricostruiti o reinstallati: il loro accesso alla centrale e la versione del bundle sono verificati con il manifest esistente, prova fisica distinta.
