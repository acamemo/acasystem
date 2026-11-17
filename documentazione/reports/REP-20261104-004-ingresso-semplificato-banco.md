# Nome utente unico e accesso personale sul banco PC

| Campo | Valore |
|---|---|
| ID | REP-20261104-004 |
| Stato | Implementazione e installazione concluse; recupero dell’account autorizzato e proseguito in REP005 |
| Data | 2026-11-04, Europe/Rome |
| Autore / modello | Codex; nome esatto non disponibile |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Fonte umana | «Ok, procedi anche con un solo campo “Nome utente” e rimuovi l’opzione del token manuale. Poi aggiorna il banco sul PC includendo la nuova pill colore, così posso provare tutto.» |
| Autorizzazione | Campo unico per le nuove iscrizioni e primo proprietario; ritiro dell’opzione token manuale dall’ingresso; build locale e aggiornamento del solo banco ACA sul PC, con la pill già verificata in REP003. Nessuna pubblicazione. |

## Obiettivo e perimetro

Attuare le due proposte di ISSUE-142 ora approvate, preservando account e profili esistenti, tentativi di registrazione pendenti, sessioni OAuth indipendenti e identità tecnica HA sul server. Il nuovo account usa inizialmente lo stesso nome utente anche come nome visualizzato; il payload mantiene i contratti HA esistenti. I vecchi tentativi conservano il nome originario senza rigenerare identificativi. Il primo proprietario resta un percorso distinto con un solo campo nome utente.

Rimuovere solo il percorso manuale dall’interfaccia di ingresso, mantenendo il login/password, MFA e rinnovo automatico esistenti. La compatibilità di lettura per vecchi token accompagna al login personale e non giustifica una cancellazione o revoca automatica. Nessuna modifica dell’autenticazione tecnica sul server.

504 voci Git preesistenti preservate; checkpoint ed evidenze in `backup/rep031/`. Riusare ACA Classico e la pill di REP003; non introdurre dipendenze o il futuro pacchetto base. ISSUE-143, relativo al vecchio form a 320 px, resta distinto. Target locale ACA 0.9.40, revisione 99; pubblico 0.9.34 invariato.

## Criteri di completamento

- Registrazione libera e primo proprietario mostrano soltanto «Nome utente», password e conferma; nuovo nome visualizzato coerente con il login normalizzato.
- Tentativi vecchi pendenti/completati/falliti e username occupati conservano le garanzie di recupero e non duplicano utenti; account esistenti non rinominati.
- Nessun ingresso con token manuale o menu «Altre opzioni» residuo; login/MFA e rinnovo non alterati. Il vecchio accesso token può richiedere esplicitamente il login personale senza perdere profili.
- Test pertinenti, strict/lint e build; QA isolata su creazione, login esistente e pill senza segreti reali o comandi fisici.
- Artefatti locali con provenienza verificata, backup a freddo verificato prima del riavvio del solo ACA, confronto conservativo del database e HA invariato.
- Banco rispondente su loopback e IP LAN effettivo; istruzioni di prova e limiti documentati. Nessuna conferma iPhone dedotta dal solo PC.

## Avanzamento e modifiche

Avvio: letti stato, report precedente, ADR-0036 e percorsi registrazione/accesso. La pill è già nei sorgenti ma non nel banco 0.9.39/r99. I token tecnici restano separati. Distribuzione e backup saranno eseguiti dopo verifiche e controllo degli artefatti.

Docker Desktop era spento: il primo inspect fallisce per assenza della pipe del motore. Avviato con `docker desktop start --detach`, attesa limitata e conferma motore 29.8.2. I servizi con politica di riavvio sono ripartiti automaticamente; la baseline per il successivo aggiornamento ACA viene acquisita dopo questo avvio. HA e D1 running dal 2026-11-04T10:28:05Z; banco 0.9.39/r99 healthy, immagine attesa `d13fc15e…97da95`. Wi-Fi 192.168.1.19; override 0.9.40 validato su loopback e questo indirizzo. Nessun aggiornamento Docker, cambio rete o protezione Windows.

Implementazione: nuova registrazione crea `name=username` normalizzato soltanto in assenza di un tentativo; i record salvati precedenti vengono riusati integralmente con nome, UUID e colore originali. Il primo proprietario usa lo stesso campo unico. `ConnectPage` ritira import, stato e markup del percorso manuale; login/MFA, «Annulla» e compatibilità con vecchi dati restano. Nessuna migrazione DB o conversione dei vecchi nomi. CSS/pill di REP003 conservati.

## Verifiche ed evidenze

Pianificate: test registrazione/owner/ingresso; QA FakeHA/SQLite effimera; build web/Docker e provenienza; backup e controlli banco. Nessun esito attribuito prima dell’esecuzione.

Prime verifiche concluse: quattro suite core **39/39 PASS** (RegistrationForm 11, CentralSetupGate 7, HaAccessPage 15, SystemConnect 6), strict e lint sui tre moduli di produzione PASS, lint colori 594 file/zero violazioni. Test di compatibilità standalone del vecchio token conservati; non ne riattivano l’ingresso. Build web con `ACASYSTEM_VERSION=0.9.40` temporaneo riuscita e variabile ripristinata, warning chunk oltre 500 kB già noto. JSON e log in `backup/rep031/`. QA browser e audit artefatti ancora in corso.

Verifiche concluse successivamente: QA FakeHA/SQLite **4 scenari PASS**, nuovo account/colore libero, ripresa sessione e profilo, account storico con MFA e nome diverso non rinominato, tentativo legacy reale recuperato con UUID/nome originali. Screenshot desktop/390 ispezionati; a 320 px resta l’overflow storico del form (ISSUE-143), pill corretta. Zero errori JS, richieste esterne e comandi fisici; fixture fermata. Primo proprietario coperto da 7 unit, non provato nel browser FakeHA che non implementa l’onboarding. Nessun collaudo fisico dedotto.

Suite shell separata: **7 PASS/6 FAIL**, tutti sulla vecchia aspettativa «Accedi ad Acasystem» rispetto al titolo «Accedi». Aspettativa e titolo effettivo sono immutati nel checkpoint; nessuna riesecuzione completa della vecchia baseline viene dichiarata. Totale osservato dei cinque file: **46 PASS/6 FAIL**, distinto dal gruppo core e dal debito ISSUE-134. Otto file frontend con checkpoint/hash prima-dopo in `frontend-source-evidence.json` e diff selettivo; nessun backend o contratto modificato.

Audit indipendente PASS: 7 checksum, 1748 sorgenti ZIP/proof/working tree, 22 strumenti e 2 generati, 119 asset web/Casa3D e 116 runtime identici ai materiali verificati. Smoke network none/read-only/tmpfs/SQLite memory: health/manifest/root 200 e bootstrap anonimo 401. Pacchetto locale `ghcr.io/acamemo/acasystem:0.9.40.99`, digest `sha256:27a0fa2ac3a4ccdc5f413ef62ba316afdac4f33b6c7b4c4007e4a04643915470`; base `sha256:e856a61ddbcfe6c8d5e748d6bfcef8769470eda32f06d347ff5381f510c6cede`; source SHA256 `346d5f64c6da69cc531d895e96b8aeb9752e1680194794aeb0a95d51e05741cb`. Bundle 3127775 byte SHA256 `c4a8ec9b9e4d2e22e3d50cfad291098cc2a1fc98b3d16a0004ea6527f74668fa`, minServer 0.9.40/minShell 0.1.0. Output `progetto/ha-app/out/0.9.40.99`; nessun push o rilascio pubblico.

Comandi eseguiti:

```powershell
node progetto/ha-app/build-base.mjs --version 0.9.40 --tag aca-system:signin-local
node progetto/ha-app/prepare.mjs --version 0.9.40 --revision 99 --base-image aca-system:signin-local
```

## Chiusura e punto di ripresa

Codice e aggiornamento ACA eseguiti, ma la prova dell’account reale richiede recupero HA descritto sotto. Non dichiarare il banco interamente collaudabile con l’account recente né ricrearlo automaticamente.

## Aggiornamento e problema del montaggio HA

ACA 0.9.40/r99 installato e healthy: loopback e LAN 192.168.1.19 rispondono 200, manifest atteso e browser anonimo reale confermano nome unico, pill e assenza del token manuale. Backup freddo `cold-bank-pre-0.9.40/aca-data-pre-0.9.40.tgz`, 222295 byte, SHA256 `daf31eaaae45da4c6caf34a7acd4faa5cc0452be01a6b931ad64780604aab974`, estrazione/integrità confermate e segreto tecnico escluso. Tutte le 27 tabelle ACA identiche, nessuna colonna nuova. Durante il solo aggiornamento ACA, orari e stato HA/D1 erano invariati.

Il controllo completo rivela HA `owner-required` dopo l’avvio automatico di Docker. Il container storico `homeassistant`, stessa immagine 2026.9.4 e stesso ID documentato il 2 novembre, vede una cartella `/config` nuova; il suo bind dichiarato `/mnt/c/homeassistant/config` non corrisponde inizialmente alla configurazione Windows. Il caso è già documentato in infrastructure.md per il 26–27 ottobre. HA 2026.10.4 nei report precedenti era QA separata, non questo banco.

Preservate senza sovrascriverle sia la configurazione attualmente montata (copia locale ignorata), sia quella Windows storica: `ha-mount-recovery/windows-historic-config.tgz`, 1815418 byte, SHA256 `ed448fba0ef555ab6ed0a60817e07c8236f3428c327723a5245c9e3e43e5b08e`. Eseguito un singolo riavvio diagnostico dello stesso container HA con timeout 30, senza cambiare immagine, mount o creare utenti. La configurazione storica torna montata e lo stato diventa `ready`; D1 non viene riavviato. Questo riavvio HA è successivo e distinto dal riavvio del solo ACA, annunciato durante la diagnosi; non affermare che HA non sia stato mai riavviato nell’intero incarico.

Confronto opaco degli identificativi, senza stamparli o leggere valori di credenziali: l’unico account ACA non corrisponde a nessuno dei due utenti HA storici. Restano recuperabili i due profili ACA e i due client. La registrazione reale restituisce `ready:false` perché l’identità tecnica appartiene alla configurazione recente non ritrovata. Nessun account rinominato, creato o trasferito per aggirare il problema. Il browser anonimo mostra correttamente la nuova UI ma ciò non certifica registrazione/login reali. Il primo controllo UI anonimo si era fermato attendendo «Accedi» mentre HA proponeva l’owner; esito preservato nel log, prova ripetuta soltanto dopo il riaggancio.

Ricerca mirata nei backup rep015–030 e banco: nove archivi successivi al 2 novembre controllati per elenco, nessuna copia HA auth/provider/onboarding identificata; i backup ACA non includono la configurazione HA. Le copie HA2026.10.4 in rep012 sono fixture e non vanno usate come dati dell’utente. Questa ricerca non prova l’assenza di eventuali backup personali altrove.

## P-144-A — Percorso di recupero da scegliere

1. Se disponibile, individuare un backup HA successivo alla creazione dell’account e verificarne la corrispondenza con l’account ACA senza sovrascrivere alcuna configurazione. Preparare il ripristino conservando i checkpoint attuali.
2. In assenza del backup, accedere all’amministratore HA storico soltanto nell’interfaccia locale, riattivare il servizio della centrale e creare il nuovo accesso personale. Password esclusivamente nell’interfaccia, mai in chat/log. Copiare i due profili ACA conservati verso l’account verificato, senza cancellare gli originali o fingere che l’identità HA sia rimasta la stessa. Questo recupero e l’eventuale assistenza sulle credenziali richiedono una scelta umana distinta: non sono la rimozione di un campo del form.

Nessun ripristino di backup, ricreazione di identità, modifica manuale dell’archivio HA o riassegnazione di profili viene applicato automaticamente. La decisione necessaria e le evidenze sono registrate in ISSUE-144; il lavoro di codice richiesto resta installato sul banco.

## Passaggio al recupero autorizzato

L’utente risponde «Autorizzo un nuovo account e la copia dei profili conservati». Prosecuzione in [REP-20261104-005](REP-20261104-005-recupero-account-banco.md) e [ADR-0041](../decisions/ADR-0041-recupero-account-copia-profili.md), mantenendo l’obiettivo della prova reale. Questo report chiude l’implementazione, le verifiche software e l’installazione0.9.40; non certifica un login reale con il nuovo account prima dell’esito del recupero.
