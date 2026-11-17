# Accesso essenziale e visibilità della password

| Campo | Valore |
|---|---|
| ID | REP-20261102-014 |
| Stato | Completato localmente sul banco |
| Data | 2026-11-02, Europe/Rome |
| Autore / modello | Codex; nome esatto non disponibile |
| Commit iniziale | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richieste umane | Dallo screenshot «Configura la tua casa»: «basta il titolo e la parte di accesso senza i testi». Poi: «aggiungere in campi come la password l'iconcina dell'occhiolino chiuso e occhiolino aperto per visualizzare la password». |
| Perimetro | Eliminare spiegazioni statiche dal primo setup, conservare titolo/form/azioni e feedback necessari; comando mostra/nascondi sui campi password di creazione proprietario, registrazione e accesso. Verifica e aggiornamento locale del banco per la prova in corso. Pubblicazione di una nuova versione distinta dal presente intervento. |

## Criteri

- Primo setup essenziale, senza i paragrafi mostrati nello screenshot; etichette, errori e controlli accessibili conservati.
- Password inizialmente nascosta, occhio aperto/chiuso, comando accessibile indipendente per password e conferma; nessun invio del form dal toggle e nessuna persistenza della visibilità o del segreto.
- Primitive/stile ACA, nessuna nuova dipendenza o modifica dell'autenticazione; sorgenti/dati preesistenti preservati.
- Test pertinenti, strict/build e controllo visivo telefono/desktop; banco aggiornato localmente con dati conservati. La release pubblica0.9.34 rimane identificabile e distinta.

## Avanzamento

Stato/istruzioni e componenti letti, copia iniziale del gate e stato Git in backup/rep021. Coordinatore: copy del gate, integrazione e banco. Flusso parallelo: componente password condiviso e test mirati, evitando conflitti sul gate.

Tolti i cinque paragrafi illustrativi dal gate e il messaggio di successo ridondante dopo la normale creazione: titolo, form, azioni, errori/riscontri necessari conservati. Nessun cambiamento a API, autorizzazioni o sequenza della configurazione.

Nuovo `PasswordField` canonico in `ui/primitives/components/`, composto su Field e sul suo slot action, con shim/esportazione frontend. Integrato in creazione proprietario, conferma, LoginForm e RegistrationForm; sostituisce il toggle duplicato del solo login. Password inizialmente nascosta con eyeSlash, visibile con eye; pulsante type=button, label Mostra/Nascondi specifica per password/conferma, aria-pressed/controls e stato indipendente. Valore, ref, onChange, errori, disabled, autocomplete e vincoli passano invariati. Default spellCheck=false/autoCapitalize=none/autoCorrect=off conservati durante il reveal; nessun nuovo CSS o dipendenza.

### Banco locale

Build **ACA0.9.35 locale**, wrapper **`ghcr.io/acamemo/acasystem:0.9.35.99`** solo nel Docker locale, digest **`sha256:96246f88be6827d94bb728ddf4d64888c3435c610d5fe2ae871104ef26656c05`**. Snapshot1738file, SHA **`5730001fe4f3fa43a23872258716950a8a506ea1b7860045ffc98223e2982b7f`**. Source/bundle preparati come materiali locali di prova, non pubblicabili come release senza il relativo riallineamento/preflight. Release pubblica0.9.34 e suoi asset immutati; nessun push o nuova release.

Backup a freddo del solo volume ACA, verificato con SQLite: `backup/rep021/cold-bank-pre-ui/aca-data-pre-ui.tgz`,454.774byte, SHA **`292976360463a5c2c06e1d788a5bc0db0f9cd8bd5ed48852424520aec8e55b7d`**, segreto servizio escluso. Dopo update26tabelle identiche per hash/conteggio e integrity_check=ok; HA/D1 su stessi ID/immagini/avvii. Backup U55 e vecchie immagini preservati.

Usato override locale `backup/rep021/compose-ui-local.yaml`: la configurazione principale e `.env` continuano a identificare la0.9.34 pubblica; l'override seleziona il wrapper locale e versione0.9.35. Per riprodurre il banco corrente dalla radice:

```powershell
docker compose -f progetto/compose.tunet.yaml -f backup/rep021/compose-ui-local.yaml up -d --no-build --pull never tunet
```

`http://192.168.1.11:3002/` invariato, servizio healthy e bundle0.9.35 incluso per browser/client. Avviare soltanto il compose principale seleziona nuovamente la0.9.34 pubblica; non occorre ripristinare dati per questa sola differenza di UI, ma ogni intervento successivo deve preservare eventuali nuovi salvataggi dell'utente.

## Verifiche e chiusura

| Verifica | Esito | Evidenza in backup/rep021 |
|---|---|---|
| PasswordField, login/MFA, registrazione, owner |31PASS/4suite |password-field-tests.log, prima dell'ultimo test/default attributi |
| PasswordField finale |4/4PASS |password-defaults-final-tests.log: valore/ref/focus, no submit/onChange da toggle, disabled/errore/constraint e tastiera mobile |
| Strict e lint mirato |PASS |password-frontend-typecheck.log; password-ui-typecheck-final.log; password-scoped-lint-final.log |
| Contratti UI autonoma |3/3PASS |password-ui-contract.log |
| Build frontend/Casa3D/base/wrapper |PASS |base-build.log, wrapper-prepare.log; prebuild strict compreso |
| Provenienza |PASS |source-check.json:1738file e snapshot coerenti |
| Backup/dati/servizi |PASS |cold-bank-pre-ui/manifest.json, data-comparison.json, other-services-before/after.txt |
| Browser su banco reale |2/2PASS |owner-form-results.json: desktop1280 e telefono390×844; statoowner-required reale, nessuna fixture |

QA browser: titolo/4campi/pulsante, spiegazioni statiche assenti e due occhi chiusi iniziali; reveal/hide indipendenti con valori sintetici invariati; focus mouse e tastiera Space verificati. Campi svuotati prima degli screenshot e password nascoste dopo reload. Nessun overflow orizzontale, errore JavaScript, richiesta nonGET, WebSocket o traffico esterno. Nessun account creato o segreto reale inserito. Screenshot `owner-form-desktop.png` e `owner-form-phone.png`; il secondo è Chromium touch emulato, non un nuovo collaudo Safari/iPhone fisico.

Diff limitato alle richieste UI e alle fonti/documenti necessari, modifiche preesistenti preservate; HEAD locale invariato. Nessuna nuova dipendenza, pubblicazione, modifica HA o credenziale. Il debito generale ISSUE-134 resta distinto: non è stata ripetuta né dichiarata verde la suite generale per una variazione di questa portata.

Controllo finale: diff whitespace riuscito con gestione CRLF,281collegamenti locali verificati nei4documenti delegati senza destinazioni mancanti; scan incrementale e hash nativi ancora corretti. Screenshot dell'utente conservato senza modifiche in backup/rep021, insieme alle prove aggiornate. Helper e browser di QA chiusi; rimangono i tre servizi del banco.

Consegna completata sul banco locale: ricaricare ACA per vedere la schermata essenziale e i pulsanti password. Pubblicazione della correzione e collaudi hardware ulteriori restano incarichi separati.
