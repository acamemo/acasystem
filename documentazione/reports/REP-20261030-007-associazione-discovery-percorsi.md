# Associazione della casa ricerca della centrale e cambio locale remoto

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261030-007 |
| Stato | Completato: analisi e documentazione, nessuna implementazione. |
| Data | 2026-10-30, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile. |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta di riferimento | [U23](../riprogettazione/diario/2026-10-30.md#u23-trovare-la-centrale-e-cambiare-collegamento): «Ok, approfondiamo come ACA può trovare la centrale domestica e passare automaticamente dal collegamento locale a quello remoto, senza configurazioni complicate per il cliente. Per ora senza installare nulla né modificare il codice.» |
| Autorizzazione | Analisi, ricerca primaria e memoria documentale locale; nessuna installazione, modifica applicativa, discovery attiva o attivazione remota. |

## Obiettivo e perimetro

Definire il percorso comprensibile per il cliente e i relativi contratti da progettare: associazione, identità stabile della casa, ricerca/verifica locale, collegamento remoto e cambio percorso con dati e comandi coerenti. Confrontare capacità attuali ed esigenze future senza scegliere o attivare un fornitore. Restano validi app normale, HA non mostrato e fattibilità Android ancora aperta.

Preservate le modifiche preesistenti riportate da Git. Copie iniziali di sette documenti e censimenti SHA256 di sorgenti/materiali in directory temporanea; nessun runtime interrogato o avviato.

## Criteri di completamento

- Percorso cliente senza IP, router o configurazioni VM manuali come proposta, non implementazione attestata.
- Ricerca distinta da identità/autorizzazione, Internet distinto dalla LAN, passaggio percorso distinto da trasferimento HA.
- Requisiti di collegamento, sessione, sincronizzazione e gestione comandi espliciti, fonti primarie datate e limiti delle piattaforme.
- Stato del codice verificato in lettura e limiti attribuiti con precisione.
- Diario, indici e stato aggiornati; controlli documentali e integrità eseguiti, prove future indicate NON ESEGUITE.

## Avanzamento e modifiche

- Creato lo [studio associazione e percorsi](../riprogettazione/blocchi/01-associazione-discovery-locale-remoto.md): percorso cliente, identità/casa/nodo/endpoint, ricerca verificata e cambio locale/remoto, connettore gestito e alternative, TLS e condizioni offline.
- Riletti i client e le evidenze pertinenti: configurazione IPv4 LAN/HTTP, health priva di identità persistente, reset al cambio origine, proxy e recupero connessione. L'analisi distingue osservazioni del codice da funzionalità proposte; nessuna applicazione avviata.
- Approfonditi protocolli e piattaforme tramite fonti primarie HA, Android, Microsoft, Electron e IETF. Conservato riferimento Core 2026.10.4; nessuna versione o dipendenza cambiata. Credenziali, API ACA/HA e comandi in volo distinti.
- Registrati U23 integrale e A23 come sintesi. Aggiornati ingresso, decisioni, stato, LEGGIMI e indice dei report; aggiunto collegamento al seguito nello studio U22. Nove documenti interessati, due nuovi e sette aggiornati; report chiusi e archivio preservati.

## Verifiche ed evidenze

| Controllo | Comando/procedura | Esito | Evidenza e limiti |
|---|---|---|---|
| Avvio | git status --short; git rev-parse HEAD; lettura AGENTS e stato | Superato | Modifiche preesistenti da preservare, HEAD indicato sopra. |
| Coerenza tecnica e memoria | Letture selettive con rg/Get-Content; confronto testo U23; revisione indipendente studio e A23 | Superato | Nessun rilievo sostanziale su auth/TLS/cambio percorso. Non è collaudo applicativo. |
| Link e forma | Script PowerShell sui nove documenti e aggiunte rispetto alle copie iniziali; git -c core.safecrlf=false diff --check -- documentazione | Superato | 29 collegamenti locali introdotti e 4 ancore; UTF-8 rigoroso e nessuno spazio finale introdotto. |
| Integrità applicativa | rg --files --hidden progetto, esclusi node_modules/.git/dist/.tmp; Get-FileHash SHA256 e Compare-Object | Superato | 1643 file visibili confrontati, zero differenze dall'inizio U23. Nessuna suite di test eseguita. |
| Materiali e perimetro | SHA256 dei tre materiali U11 e confronto git status --porcelain=v1 --untracked-files=all fuori documentazione | Superato | Tre materiali invariati; stato Git esterno alla documentazione invariato. |
| Discovery, associazione e cambio rete | Prove applicative e fra dispositivi | Non eseguito | Nessuna installazione, connessione applicativa o scansione autorizzata. |

## Controllo del diff e decisioni

Diff incrementale dei sette documenti confrontato con le copie di inizio U23, più studio e report nuovi. Modifiche limitate alla richiesta e memoria corrente, nessun cambiamento applicativo. La proposta di collegamento gestito non è un provider adottato o una garanzia di operatività; nessun nuovo REQ o ADR. U23 autorizza l'approfondimento, non adotta relay, account ACA, VPN o provider né assegna un porting.

## Chiusura e punto di ripresa

Analisi completata. Il cliente potrebbe associare la casa una volta e lasciare ad ACA ricerca/verifica e scelta del percorso; servono identità stabile, sessioni e dati preservati, trasporto verificato e gestione coordinata di API/WebSocket. Il reset odierno al cambio origine è un ostacolo concreto da affrontare in un futuro incarico, conservando l'isolamento fra case diverse.

Restano aperti fiducia TLS, bootstrap mini PC, contratto API e login senza UI HA, servizio remoto e condizioni offline; fattibilità Android separata. Tutte le prove future nello studio sono NON ESEGUITE. Nessuna installazione, discovery attiva, attivazione remota/account o modifica applicativa/configurazione; nessun commit. Pin/materiali invariati, iOS rinviato. Proseguire dalle domande dell'utente; nessun incarico esecutivo resta assegnato.
