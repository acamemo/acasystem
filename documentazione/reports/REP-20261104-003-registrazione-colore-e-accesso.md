# Registrazione: colore libero e semplificazione dell’accesso

| Campo | Valore |
|---|---|
| ID | REP-20261104-003 |
| Stato | Completato: pill e build locali verificate; analisi nome/accesso conclusa, banco invariato |
| Data | 2026-11-04, Europe/Rome |
| Autore / modello | Codex; nome esatto non disponibile |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Fonte umana | Tre punti con screenshot: valutare un solo nome nella registrazione; sostituire dettagli e colori predefiniti con pill in riga, iniziale colorata, separatore, pennino e «Personalizza»; approfondire alternative al token manuale a lunga durata. |
| Autorizzazione | Realizzare la pill richiesta; analizzare nome unico e accesso senza token manuale. La domanda sul nome e l’approfondimento dell’autenticazione non autorizzano a cambiare credenziali, sessioni esistenti o meccanismi di login. |

## Obiettivo e perimetro

Sostituire il selettore colore della registrazione con una sola pill nel design ACA Classico, anteprima aggiornata e scelta libera tramite picker nativo. Riutilizzare primitive, icona e token esistenti; nessuna dipendenza. Il colore personale resta distinto dalla palette globale fissa, secondo REQ-23/REQ-30 e ADR-0039. Il backend accetta già colori esadecimali: verificare questa capacità senza introdurre una nuova API.

503 voci Git preesistenti da preservare. Checkpoint dei file interessati ed evidenze in `backup/rep030/`. Nessun aggiornamento del banco, pubblicazione, modifica di HA o del futuro pacchetto base.

## Criteri di completamento

- Nessun menu dettagli o tavolozza predefinita nel form; cerchio con iniziale, linea e «Personalizza» con pennino sulla stessa riga anche su telefono.
- Scelta colore accessibile da tastiera, anteprima e payload coerenti; tentativi pendenti conservano identità e colore senza duplicazioni.
- Avatar leggibile anche con colori molto chiari o scuri; nessun salvataggio di password nel recupero.
- Risposta concreta su nome unico e sessione rinnovabile, distinguendo stato attuale, proposta e limiti; fonti HA primarie datate.
- Verifiche pertinenti, build locale e documentazione aggiornata; niente collaudo fisico o distribuzione dedotto dai test.

## Avanzamento

Rilevati due campi nome nella registrazione, sei colori nel menu dettagli e percorso token alternativo nel login. Il servizio di registrazione ammette già `#RRGGBB`. Analisi separate in sola lettura per vincoli dei nomi e percorsi OAuth/sessioni.

## Esito dell’analisi: nome e accesso

**Nome unico, proposta.** Un solo campo «Nome utente», usato inizialmente anche come nome visualizzato, elimina il passaggio senza migrare gli account. Il contratto HA può conservare `name` e `username`; gli account esistenti e i loro accessi restano invariati. Evitare di trasformare automaticamente un nome libero con spazi in un login inatteso e di aggiungere suffissi agli omonimi senza scelta dell’utente. La registrazione libera ACA oggi limita lo username a 1–64 caratteri ASCII (`a-z`, numeri, punto, trattino e underscore); HA distingue nome visualizzato e credenziale. I tentativi pendenti devono conservare il `name` originale: cambiarlo con lo stesso identificativo provoca `REGISTRATION_CHANGED`. La vista account attuale non permette di rinominare il nome HA; nessuna futura rinomina viene promessa come funzione già esistente.

Riscontri: `RegistrationForm.tsx`, `CentralSetupGate.tsx`, `LoginForm.tsx` e `backend/src/v2/registrationService.ts`; fonte primaria versionata [provider HA 2026.10.4](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/auth/providers/homeassistant.py), consultata nell’audit il 2026-11-04. Nessun nome o login reale letto o cambiato.

**Accesso senza token manuale, raccomandazione.** Il login ACA integra già utente/password, eventuale MFA, scambio del codice e rinnovo della sessione. `haLogin.ts`, `haSession.ts` e `apiAuth.ts` implementano il flusso; `oauthStorage.ts` conserva access/refresh per origine, quindi un cambio di indirizzo o cancellazione dello storage può richiedere un nuovo login. Logout pulisce subito i dati locali e tenta la revoca; l’indisponibilità della rete non equivale a una revoca confermata. I dispositivi usano accessi distinti dello stesso utente.

La [documentazione ufficiale HA sull’autenticazione](https://contributors.home-assistant.io/core/internals/auth-api/), aggiornata il 2026-10-12 e consultata il 2026-11-04, prevede rinnovo con refresh token e revoca; riserva i token a lunga durata agli usi che non effettuano il normale login. Per ACA la soluzione più semplice è usare il percorso personale già esistente e ritirare il campo manuale dall’ingresso. I token rimangono un meccanismo interno automatico; nessuna password deve essere memorizzata. Il token dell’identità tecnica sul server, usato dai servizi predisposti, resta distinto e non è richiesto al cliente.

Incoerenza concreta rilevata: `ConnectPage.tsx` offre ancora il percorso manuale per il vecchio caso kiosk, ma `ClientAccessGate.tsx` interrompe tale modalità e `v2/auth.ts` richiede un refresh HA normale. Proposta registrata in ISSUE-142. Rimuovere la sola UI e accompagnare i vecchi accessi al login personale è un intervento successivo distinto dall’analisi richiesta; nessuna sessione viene revocata automaticamente in questo task. Un nuovo sistema ACA con sessioni gestite interamente sul server cambierebbe il modello di autenticazione e non è necessario per eliminare il campo manuale.

## Verifiche ed evidenze

| Controllo | Esecuzione | Esito e limiti |
|---|---|---|
| Registrazione | `npx vitest run src/__tests__/RegistrationForm.test.tsx`, frontend | 8/8 PASS: anteprima, colore arbitrario, contrasto bianco/nero, password, recupero dello stesso tentativo, indisponibilità e conferma. |
| TypeScript e lint | `npx tsc -p tsconfig.strict.json --noEmit`; ESLint mirato sul form | PASS. |
| Colori | `node scripts/lint-theme-colors.mjs` | PASS, 594 file e zero violazioni dopo l’eccezione motivata per l’inchiostro funzionale. |
| Build | `npm run build`, `ACASYSTEM_VERSION=0.9.39` temporaneo e ripristinato | PASS; warning chunk oltre 500 kB già noto. Build locale di sviluppo, nessun nuovo wrapper o release. Primo tentativo interrotto prima di eseguire npm per percorso log errato, poi corretto. |
| Browser isolato | FakeHA e SQLite in memoria, nuova fixture locale | Desktop 1366 e telefono 390 px completi PASS. A 320 px pill, contrasto e tastiera PASS; overflow del form 39 px identico nel precedente bundle 0.9.39.99, registrato in ISSUE-143. Registrazione con `#123abc`, login e colore account backend confermati; picker disabilitato durante richiesta pendente. Zero errori JS, richieste esterne e comandi fisici. |

La pill usa `Surface shape="pill"`, l’icona `edit` già presente e un solo input colore nativo sovrapposto all’intera area di tocco. La lettera segue nome, poi username, con fallback A. Un calcolo locale sceglie inchiostro bianco o nero per il colore personale: i due valori sono esplicitamente ammessi dal lint come dati funzionali e non come nuova palette. Il default resta il valore personale precedente; non c’è più una tavolozza. Busy e tentativi pendenti bloccano il picker, mantenendo colore e identificativo originari. I quattro file modificati sono form, CSS di composizione, test del form ed eccezione lint; diff e hash prima/dopo in `backup/rep030/final-source.diff` e `source-evidence.json`.

## Chiusura e punto di ripresa

Pill completata e verificata localmente, con screenshot normale e form desktop/telefono in `backup/rep030/`; coordinatore ha ispezionato form e dettaglio della pill. Nessun aggiornamento della centrale: il banco resta al precedente artefatto 0.9.39/r99 e la modifica non è ancora visibile lì. La build di sviluppo non sostituisce i pacchetti immutabili in `ha-app/out/0.9.39.99`. Nessuna nuova dipendenza, commit o pubblicazione.

Il primo controllo browser ha rilevato l’overflow a 320 px e si è fermato; JSON originale preservato come `qa-registration-pill-attempt1-results.json`. La diagnosi e la prova del bundle precedente (`qa-pill-baseline320-results.json`) ne dimostrano la preesistenza. La verifica finale distingue due formati completi dal solo controllo della pill a 320 px, senza dichiarare risolto il form. La successiva esecuzione completa le prove funzionali residue. Il picker nativo è focusabile e viene aggiornato dai test; il suo dialogo di sistema e il tocco su iPhone/Android fisici non sono stati collaudati.

Controllo del diff: quattro file di codice/controlli, tutti riferiti alla pill; nessuno spazio finale aggiunto. Verificati 198 nuovi link documentali senza collegamenti locali mancanti e gli hash dei pacchetti nativi conservati. Il debito SystemPage/ISSUE-134 del task precedente resta distinto e non è stato rieseguito: nessuna pretesa di suite generale verde.

L’incarico è concluso. Raccomandazioni consegnate: unico nome utente iniziale e ritiro del campo token manuale usando il login con rinnovo già esistente. Queste due scelte restano da definire con l’utente (ISSUE-142); correzione form 320 px in ISSUE-143. Nessun ulteriore incarico viene avviato automaticamente.

## Annotazione successiva, 2026-11-04

L’utente approva esplicitamente i due punti e richiede l’aggiornamento del banco PC includendo la pill. Nuovo incarico [REP-20261104-004](REP-20261104-004-ingresso-semplificato-banco.md), decisione [ADR-0040](../decisions/ADR-0040-nome-unico-accesso-personale.md). La distribuzione non eseguita al momento di chiusura di questo report appartiene al nuovo incarico; i risultati precedenti e il limite del form a 320 px restano preservati.
