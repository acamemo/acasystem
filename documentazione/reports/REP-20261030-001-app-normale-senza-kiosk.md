# ACA come app normale senza kiosk

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261030-001 |
| Stato | Completato |
| Data | 2026-10-30, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile. |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta di riferimento | Precisazione umana U17: ACA deve aprirsi e chiudersi come un'app normale, senza kiosk né interfaccia HA; eventuale avvio più lento ipotizzato, senza tempi assegnati. Testo integrale nel diario del 2026-10-30. |
| Autorizzazione | Registrazione della decisione e aggiornamento documentale nel percorso già autorizzato; nessuna installazione, configurazione o modifica del codice. |

## Obiettivo e perimetro

Conservare la precisazione senza trasformare chiusura delle schermate in arresto automatico di HA. Registrare il vincolo umano sull'esperienza, la distinzione da servizio Android e il rapporto con le precedenti note kiosk del PRD. La continuità del motore resta da dimostrare e la sua realizzazione non è assegnata.

Modifiche preesistenti in progetto/, documentazione/ e file non tracciati preservate. Copie iniziali dei documenti interessati, stato Git e censimenti SHA256 di sorgenti e materiali conservati in directory temporanea.

## Criteri di completamento

- Diario con testo integrale U17, decisione con fonte umana, punti di ripresa e indici coerenti.
- Nessuna nuova garanzia di prestazioni, scelta di servizio o modalità di arresto inventata.
- Precedente riferimento kiosk segnalato come da riesaminare per il nuovo scenario; nessun REQ riutilizzato o cancellato.
- Verifica di collegamenti/diff e integrità di codice e materiali.

## Avanzamento e modifiche

Creati [diario del 2026-10-30](../riprogettazione/diario/2026-10-30.md) con U17 integrale/A17 come sintesi e [ADR-0027](../decisions/ADR-0027-app-normale-senza-kiosk.md) con la fonte umana. Aggiornati studio di continuità, ingresso/indicazioni della riprogettazione, stato, LEGGIMI e indici di report/decisioni. Aggiunta al PRD una precisazione sul precedente kiosk, conservando ID e storico. Undici documenti interessati, inclusi tre nuovi.

Disambiguata l'introduzione dello studio U16: Stop App attive/Arresto forzato non sono normale uscita dalle schermate. Nessuna impostazione Android, sequenza di avvio o durata adottata; lo studio del servizio resta distinto dal vincolo UI accettato. Nessuna modifica agli archivi o ai report chiusi.

## Verifiche ed evidenze

| Controllo | Comando/procedura | Esito | Limiti |
|---|---|---|---|
| Stato iniziale | git status --short; git rev-parse HEAD; censimento SHA256 | Superato | Modifiche preesistenti identificate. |
| Fonti tecniche | Lettura delle pagine Android foreground services/lock task mode il 2026-10-30, collegate in ADR-0027 | Superato | Documentano la distinzione tra servizio e kiosk; non provano ACA sul tablet. |
| Interpretazione della richiesta | Revisione indipendente di U17, ADR-0026 e studio U16 da parte di un altro agente | Superato | Non rilevata una revoca della continuità; nessuna autorizzazione a spegnere HA a ogni uscita, rimuovere frontend o bloccare route. |
| Documenti e link | UTF-8 rigoroso, controllo delle aggiunte rispetto a copie iniziali, link locali/ancore, git -c core.safecrlf=false diff --check -- documentazione | Superato | 34 link introdotti e 8 ancore locali validi; nessuno spazio finale introdotto. |
| Codice e lavoro preesistente | rg --files --hidden progetto con esclusioni node_modules/.git/dist/.tmp; Get-FileHash SHA256; confronto git status --porcelain=v1 --untracked-files=all fuori documentazione/ | Superato | 1.643 file censiti, zero differenze; stato Git esterno ai documenti invariato. |
| Materiali U11 | Get-FileHash SHA256 e confronto con censimento iniziale | Superato | Tre materiali invariati, pin conservati. |
| Prove applicative | Apertura/chiusura, background e avvio sul tablet | Non eseguito | Nessuna implementazione o installazione autorizzata. |

## Controllo del diff e decisioni

Diff confrontato con la precisazione umana: modificati soltanto documenti pertinenti. ADR-0027 registra il vincolo accettato; non adotta automaticamente l'architettura del servizio. REQ-15/AC-15 restano identificabili e sono contestualizzati per il nuovo scenario. Nessun codice, installazione, commit o deploy.

## Chiusura e punto di ripresa

Registrazione completata. ACA è richiesta come app ordinaria, con UI HA non mostrata; il dispositivo non deve essere bloccato in kiosk. La continuità e i tempi di avvio rimangono da verificare sul Lenovo, senza promesse di prestazioni o funzionamento H24. Il perimetro successivo dipende dalle domande dell'utente.

Nessun incarico esecutivo resta attivo; non avviare automaticamente preparazione Linux, P0-P4, servizio Android, installazioni o prove.

