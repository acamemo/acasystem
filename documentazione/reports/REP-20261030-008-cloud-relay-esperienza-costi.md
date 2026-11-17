# Home Assistant Cloud e relay ACA esperienza cliente e costi

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261030-008 |
| Stato | Completato: analisi e documentazione, nessuna implementazione. |
| Data | 2026-10-30, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile. |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta di riferimento | [U24](../riprogettazione/diario/2026-10-30.md#u24-home-assistant-cloud-o-relay-aca): «Ok, confrontiamo Home Assistant Cloud e un relay ACA: quale soluzione offre l’accesso remoto più semplice per il cliente, senza mostrare HA, e con quali costi? Per ora senza installare nulla né modificare il codice.» |
| Autorizzazione | Analisi comparativa, ricerca primaria e memoria locale; nessuna installazione, modifica applicativa, account/acquisto o attivazione di servizi. |

## Obiettivo e perimetro

Confrontare semplicità per cliente e gestione ACA, onboarding/account/autenticazione senza UI HA, copertura delle API e costi pubblici rispetto a ipotesi esplicite di relay. Distinguere prezzi con/senza IVA, per istanza e condivisi, infrastruttura e costo completo, listini e stime. Nessuna offerta OEM o capacità di carico presunta.

Sette documenti copiati e stato Git/censimenti SHA256 conservati in directory temporanea prima delle modifiche sostanziali. Modifiche preesistenti preservate; report chiusi e archivio esclusi. Restano aperti fattibilità Android, TLS/login ACA e bootstrap già documentati.

## Criteri di completamento

- Risposta chiara alla scelta per esperienza cliente interamente ACA, distinta dalla facilità operativa per il produttore.
- Prezzo UE verificato su fonte ufficiale e limiti per istanze/account; eventuali condizioni OEM indicate sconosciute.
- Costi relay separati in sviluppo, infrastruttura, gestione e variabili; scenari con assunzioni e limiti, nessun preventivo o listino ACA inventato.
- Fonti primarie datate, diario integrale e sintesi riconoscibili, indici/stato aggiornati.
- Verifiche documentali e integrità eseguite; qualsiasi prova runtime resta NON ESEGUITA.

## Avanzamento e modifiche

- Creato lo [studio esperienza/costi](../riprogettazione/blocchi/01-cloud-relay-esperienza-costi.md): confronto cliente/gestione, API e onboarding senza UI HA, modello pubblico e condizioni OEM non verificate, sviluppo/esercizio relay e raccomandazione condizionata.
- Verificati listino pubblico UE e metadati EUR dell'HTML corrente Nabu Casa tramite lettura HTTP senza salvataggi; distinta la presentazione Link dal cambio di nome annunciato per dicembre. Letti FAQ su istanze, B2C, dominio, tunnel e API Core 2026.10.4.
- Verificati componenti Hetzner UE, IPv4 e percentuale backup; calcoli in JavaScript. I carrelli non sono un dimensionamento o il prezzo del servizio. Modello di traffico e budget operativo dichiarati ipotesi; costo sviluppo iniziale non inventato.
- Riletta configurazione add-on ACA, Ingress disabilitato e porta separata. Nessuna app eseguita o dipendenza acquisita. U24 conservato integralmente, A24 come sintesi; aggiornati ingresso, decisioni, stato, LEGGIMI, indice report e collegamento al seguito nello studio U23.
- Nove documenti interessati, due nuovi e sette aggiornati. Nessun REQ, ADR, canone o budget approvato; report chiusi e archivio preservati.

## Verifiche ed evidenze

| Controllo | Procedura | Esito | Limiti |
|---|---|---|---|
| Avvio | git status --short; git rev-parse HEAD; letture stato/regole/studio U23; SHA256 | Superato | Modifiche preesistenti preservate. |
| Fonti e numeri | Letture web primarie e Invoke-WebRequest della pagina pubblica; calcoli JavaScript | Superato | Prezzi componenti e ipotesi distinti; nessun account, checkout o fattura simulati. |
| Coerenza e memoria | Confronto U24 integrale; revisione indipendente di costi/unità e di UI/auth/OEM | Superato | Nessun rilievo sostanziale. Una verifica testuale iniziale ha avuto errore di quoting PowerShell, corretta con here-string e rieseguita con esito positivo; nessuna modifica prodotta dal tentativo fallito. |
| Link e forma | Script PowerShell sui nove documenti e aggiunte rispetto alle copie iniziali; git -c core.safecrlf=false diff --check -- documentazione | Superato | 21 collegamenti locali introdotti e 4 ancore, UTF-8 rigoroso e nessuno spazio finale introdotto. |
| Integrità applicativa | rg --files --hidden progetto esclusi node_modules/.git/dist/.tmp, Get-FileHash SHA256 e Compare-Object | Superato | 1643 file visibili confrontati, zero differenze dall'inizio U24. Nessuna suite applicativa eseguita. |
| Materiali e perimetro | SHA256 dei tre materiali U11 e confronto git status --porcelain=v1 --untracked-files=all fuori documentazione | Superato | Tre materiali invariati; stato Git esterno alla documentazione invariato. |
| Acquisti, account, installazione e collegamento | Attività operative | Non eseguito | Fuori perimetro; nessuna prova o attivazione. |

## Controllo del diff e decisioni

Diff incrementale dei sette documenti confrontato con le copie di inizio U24, più studio e report nuovi. Solo confronto richiesto e memoria corrente; nessuna modifica applicativa o a report chiusi/archivio. Il vincolo no UI HA non è trasformato in divieto non richiesto di account/pagamento terzi. Non dichiarati Cloud impossibile da integrare o relay già più economico. Approfondimento autorizzato, nessun fornitore, abbonamento o prezzo commerciale ACA adottato.

## Chiusura e punto di ripresa

Analisi completata. Per trasporto gestito e canone pubblico prevedibile suggerito di valutare prima l'integrazione Cloud senza UI HA; per account e servizio interamente ACA il relay offre più controllo, con sviluppo e gestione propri. Entrambe le strade richiedono verifica del percorso cliente e delle API ACA necessarie. Condizioni OEM, perimetro relay, costo completo e capacità restano aperti.

Tutte le prove future sono NON ESEGUITE. Nessun account, acquisto, contatto esterno, installazione, servizio attivato o codice/configurazione modificati; nessun commit. Pin/materiali invariati, iOS rinviato. Proseguire dalle domande dell'utente; nessun incarico esecutivo resta assegnato.
