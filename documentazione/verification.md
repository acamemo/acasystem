# Verifiche ed evidenze

Aggiornato: 2026-10-02. Questo documento distingue controlli documentali eseguiti e scenari di prodotto previsti. La realizzazione dei requisiti resta in [project-status.md](project-status.md).

## Criteri per gli esiti

Un controllo è **Superato** soltanto con procedura realmente eseguita ed evidenza; **Fallito** quando l'esito non soddisfa il criterio; **Non eseguito** quando è soltanto previsto. Ogni evidenza identifica data, versione/commit o ambiente osservato, comando/procedura e limiti. Un test documentale non collauda l'applicazione.

## Controlli documentali

I controlli DOC-01–DOC-06 riportano gli esiti alla chiusura di REP-20261002-002, prima del trasferimento delle cartelle. Conteggi e numero dei commit riferiscono quella versione del repository. I controlli successivi sono registrati separatamente.

| ID | Criterio | Esito alla chiusura di REP-20261002-002 | Evidenza |
|---|---|---|---|
| DOC-01 | Originale acquisito e copia uguali byte per byte; SHA-256 registrato | Superato, 2026-10-02 | Confronto dei byte con i due blob del primo commit e hash nel [report REP-20261002-002](reports/REP-20261002-002-documentazione.md). |
| DOC-02 | Link locali e ancore validi; REQ-00–REQ-16 presenti e tracciabili | Superato, 2026-10-02 | 16 file Markdown, 80 link locali, 17 requisiti/criteri/scenari e 14 problemi; esito nel report. |
| DOC-03 | Stati reali, ipotesi e proposte distinti; nessuna approvazione tecnica inventata | Superato, 2026-10-02, revisione documentale | Solo ADR-0001 accettata; requisiti applicativi Proposti/Non iniziati; evidenze e scenari futuri distinti. |
| DOC-04 | Un lettore senza chat ricostruisce incarico, stato e punto di ripresa | Superato, 2026-10-02, revisione documentale | Percorso README → AGENTS → stato → report/ADR; non è un test eseguito da un secondo modello. |
| DOC-05 | File modificati dentro il perimetro; controlli di segreti e regole Git | Superato, 2026-10-02 | Revisione dei 17 file staged, diff senza errori di whitespace, controlli di esclusione e ricerca di firme comuni di segreti. |
| DOC-06 | Due commit coerenti; originale preservato; repository locale senza remote | Superato, 2026-10-02 | Due commit, 18 file versionati, nessun remote, working tree pulita e hash del blob archiviato coincidente; esito nel report. |

I controlli finali usano comandi locali e una verifica temporanea dei documenti. Non costituiscono una pipeline CI o un validatore permanente.

### Riorganizzazione delle cartelle — 2026-10-02

Evidenze e limiti nel [report REP-20261002-003](reports/REP-20261002-003-organizzazione-cartelle.md).

| ID | Criterio | Esito | Evidenza |
|---|---|---|---|
| DOC-07 | Originale integro; link e identificativi validi dopo il trasferimento | Superato, 2026-10-02 | 21 Markdown, 121 link locali, archivio identico ai byte originali e SHA-256 invariato; 17 REQ/AC/V e 14 ISSUE validi. |
| DOC-08 | Tre aree con istruzioni reperibili; contenuto del PRD conservato | Superato, 2026-10-02 | PRD invariato salvo percorsi dei link; istruzioni in radice; backup/progetto con il solo README; revisione del percorso di lettura. |
| DOC-09 | Backup esclusi, archivio versionabile senza conversione, diff limitato | Superato, 2026-10-02 | 23 file versionati, sei casi di esclusione verificati, attributo `text: unset`, archivio staged uguale all'originale e diff coerente senza errori di whitespace. |
| DOC-10 | Commit locale di riorganizzazione; due commit iniziali preservati | Superato, 2026-10-02 | 3 commit, 23 file versionati, due commit iniziali preservati come antenati diretti, working tree pulita, 0 remote e archivio versionato integro. |

## Scenari di prodotto previsti

**Tutti gli scenari V-00–V-16 sono Non eseguiti.** Sono proposte di accettazione da precisare nell'incarico di progettazione/implementazione pertinente. Nessun ambiente applicativo è disponibile nel repository.

| ID | Requisito | Scenario proposto e risultato atteso |
|---|---|---|
| V-00 | REQ-00 | Inventario del banco e prove di lettura/comando per i dispositivi scelti; protocolli e alimentazioni confermati nel relativo ambito fisico. |
| V-01 | REQ-01 | Installazione ripetibile nell'ambiente autorizzato, salute dei servizi e prova di ripristino con dati di test; versioni e configurazioni documentate. |
| V-02 | REQ-02 | Automazione locale con cloud irraggiungibile, riconnessione e riavvio; verificare separatamente disponibilità del controllo client offline. |
| V-03 | REQ-03 | Stati e comandi reali dopo riconnessione, versioni compatibili e condizioni di utilizzo delle dipendenze risolte. |
| V-04 | REQ-04 | Login Google/email autorizzati, account email non verificato rifiutato e sessione scaduta gestita secondo il progetto approvato. |
| V-05 | REQ-05 | Credenziali accettate dal gateway, associazione corretta, rinnovo/revoca e rifiuto dell'accesso a un altro impianto; comportamento offline definito. |
| V-06 | REQ-06 | Assegnazione e revoca dei privilegi; account non autorizzati rifiutati anche tramite API dirette. |
| V-07 | REQ-07 | Abilitazione/revoca dei moduli rispettata dai punti di autorizzazione; comandi vietati rifiutati anche con UI modificata. |
| V-08 | REQ-08 | Sincronizzazione riuscita, client/gateway disconnesso ed errore parziale; versione e stato effettivo visibili, recupero secondo il progetto scelto. |
| V-09 | REQ-09 | Formati ammessi, caricamento invalido e accessi; piantina coerente su viewport approvati senza alterare le coordinate relative. |
| V-10 | REQ-10 | Posizionamento persistente, ridimensionamento e comandi sul dispositivo corretto; entità rimossa gestita senza comandare un'altra entità. |
| V-11 | REQ-11 | Richiesta trasformata in bozza ispezionabile, intenti ambigui chiariti, assenza di attivazione prima dell'approvazione. |
| V-12 | REQ-12 | Modello e licenza identificati, carico/contesto e concorrenza dichiarati nel benchmark; timeout e indisponibilità gestiti. |
| V-13 | REQ-13 | Entità inesistente, schema invalido e azione fuori limiti rifiutati; correzioni visibili al revisore, scenario attivato uguale a quello approvato. |
| V-14 | REQ-14 | Ricerca/tag, associazione agli impianti e versioni; distribuzione della versione approvata e comportamento con dispositivo non disponibile. |
| V-15 | REQ-15 | Associazione tablet e kiosk, riavvio senza internet, sessione scaduta e ritorno della rete; nessuna concessione implicita di privilegi tecnici. |
| V-16 | REQ-16 | Valutazione R&D separata con compatibilità/prestazioni misurate sui dispositivi scelti; esito documentato prima di una decisione sul 3D. |

## Regressioni da conservare quando esiste codice

Una modifica a identità, permessi, trasporto, esecuzione locale o distribuzione degli scenari deve conservare verifiche dei relativi confini. Per un difetto riproducibile registrare il caso, il comportamento atteso e una verifica pertinente dopo la correzione.

L'infrastruttura richiederà prove di recupero e di perdita della connessione; l'AI richiederà casi di rifiuto e confronto tra bozza approvata e scenario attivato. Le misure prestazionali riportano hardware, versioni, carico, durata e criterio di aggregazione: <30ms/<2s non sono valori già garantiti.

## Controlli automatici futuri

CI, controlli dei collegamenti, verifiche di licenze/manifest e protezioni di revisione sono **Pianificati, non implementati né assegnati**. Comandi e strumenti verranno scelti quando esisterà lo stack approvato e un incarico per introdurli. Il controllo manuale del diff non può dimostrare da solo l'assenza di ogni regressione comportamentale.
