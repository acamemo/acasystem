# Verifiche ed evidenze

Aggiornato: 2026-10-05. Questo documento distingue controlli documentali, verifiche del banco prova e scenari di prodotto previsti. La realizzazione dei requisiti resta in [project-status.md](project-status.md).

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

### Direzione del pilota — 2026-10-05

Evidenze in [REP-20261005-001](reports/REP-20261005-001-direzione-pilota.md). Gli esiti DOC precedenti restano quelli delle rispettive versioni storiche.

| ID | Criterio | Esito | Evidenza |
|---|---|---|---|
| DOC-11 | Originale integro, ID conservati, link e matrici validi | Superato, 2026-10-05 | 24 Markdown, 18 REQ/AC/V, 15 ISSUE; priorità originali conservate, stati coerenti e originale integro. Conteggio finale dei link nel report. |
| DOC-12 | Direzione umana tracciata, fase minima distinta dalle estensioni e dalla realizzazione | Superato, 2026-10-05, revisione documentale | Risposte e ADR-0003 tracciabili; fase minima grafica, ruoli/estensioni e dettaglio tecnico distinti. Nessun risultato applicativo inventato. |
| DOC-13 | Diff documentale, storico conservato e commit locale coerente | Superato, 2026-10-05 | 15 file Markdown modificati/aggiunti, 26 file versionati, 4 commit con storico preesistente preservato, working tree pulita, 0 remote e archivio versionato integro; esclusioni dei backup conservate. |

### Moduli funzionalità e design — 2026-10-05

Evidenze e limiti in [REP-20261005-002](reports/REP-20261005-002-moduli-documentali-design.md). La separazione documentale non cambia requisiti o stato degli scenari applicativi.

| ID | Criterio | Esito | Evidenza |
|---|---|---|---|
| DOC-14 | Originale integro, requisiti e stati preservati | Superato, 2026-10-05 | Confronto byte/hash con il primo commit; 18 righe REQ e ID REQ/AC invariati, stati dei requisiti identici al commit di partenza. |
| DOC-15 | Moduli distinti, fonti e collegamenti validi | Superato, 2026-10-05 | 28 Markdown; verifica temporanea delle destinazioni e ancore locali. Indici di funzionalità e design, fonte visiva unica design.md e documenti comuni. |
| DOC-16 | Diff pertinente e storico preservato | Superato, 2026-10-05 | Diff senza errori di whitespace; quattro report storici preservati salvo destinazioni di link annotate; progetto e backup con i soli README, nessun codice o installazione aggiunti. |

Le verifiche UI di design.md sono previste e Non eseguite. I calcoli numerici dei colori rimangono evidenze limitate del report precedente; nessuna conformità del frontend è dichiarata.

### Raccolta componenti e microinterazioni — 2026-10-05

Evidenze e limiti in [REP-20261005-003](reports/REP-20261005-003-raccolta-componenti-microinterazioni.md). Il [catalogo](design/componenti/README.md) contiene reference originali, senza adattamenti o prove UI.

| ID | Criterio | Esito | Evidenza |
|---|---|---|---|
| DOC-17 | Sette originali e acquisizione verificabile | Superato, 2026-10-05 | Sette ID/file/hash; sei porzioni contigue ricostruiscono la cattura inline di 14.602 byte, Wi-Fi identico ai 5.027 byte dell'allegato. Originali/fonti con attributo text: unset. |
| DOC-18 | Catalogo, fonti, specifiche e link coerenti | Superato, 2026-10-05 | 30 Markdown, destinazioni e ancore locali verificate; principale UI-001 e animazione UI-007 identificati, autore/URL/licenza sconosciuti, dipendenze dichiarate separate dall'adozione. |
| DOC-19 | Perimetro e storico preservati | Superato, 2026-10-05 | Archivio originale integro, cinque report storici invariati, 18 righe REQ e stati preservati, progetto/backup invariati. Revisione documentale e diff; nessuna installazione o nuova dipendenza. |

L'identità byte per byte del testo inline è verificata rispetto alla cattura acquisita dal messaggio, non a un file sorgente esterno inesistente. Le verifiche del design e del collegamento HA restano Non eseguite. Gli originali conservano anche spazi e colori della fonte; non vengono corretti per superare controlli di stile.

## Scenari di prodotto previsti

**Gli scenari applicativi attivi sono Non eseguiti; V-01 è Non applicabile perché REQ-01 è Ritirato.** V-00–V-17 conservano la mappatura dei requisiti, incluso quello ritirato. Criteri da precisare nell'incarico pertinente; nessun ambiente applicativo è disponibile. La fase 1 è delimitata in [pilot-scope.md](funzionalita/pilot-scope.md).

| ID | Requisito | Scenario proposto e risultato atteso |
|---|---|---|
| V-00 | REQ-00 | Inventario dell'ufficio, Linux 64 bit ARM64/x86-64, client e dispositivi scelti; prove pertinenti e ambito fisico documentati. |
| V-01 | REQ-01 | Non applicabile al piano corrente: provisioning Hetzner Ritirato in ADR-0003; scenario storico nell'archivio/Git. Non è un controllo superato. |
| V-02 | REQ-02 | Frontend locale, stati/comandi e automazioni selezionati senza internet, inclusi riavvio client/gateway e riconnessione; dipendenze cloud identificate. Remoto nel suo incarico. |
| V-03 | REQ-03 | Confronto grafico delle schermate concordate, copertura delle funzioni HA, stati/comandi e riconnessione; base Tunet, versioni e condizioni di distribuzione verificate. Per la futura UI: temi chiaro/scuro con arancione, microinterazioni, stato attivo stabile, movimento ridotto e alternativa al trascinamento; dove incluso, anteprima dell'icona/percentuale e luce reale durante il gesto, invii limitati e conferma HA. Non eseguito. |
| V-04 | REQ-04 | Login Google/email autorizzati, account email non verificato rifiutato e sessione scaduta gestita secondo il progetto approvato. |
| V-05 | REQ-05 | Credenziali accettate dal gateway, associazione corretta, rinnovo/revoca e rifiuto dell'accesso a un altro impianto; comportamento offline definito. |
| V-06 | REQ-06 | Sessione admin aperta solo per il primo setup, configurazione, logout e login cliente; nessun privilegio admin residuo e rifiuto delle operazioni non autorizzate anche via API. |
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
| V-17 | REQ-17 | Amministratore condominiale configura dispositivi comuni autorizzati; configurazione dei dispositivi privati rifiutata anche via API. Letture/comandi secondo la policy da approvare. |

## Banco prova Tunet — 2026-10-05

Evidenze in [REP-20261005-004](reports/REP-20261005-004-installazione-tunet.md), Tunet 1.22.1 / HA 2026.9.4. Questi controlli non completano V-02/V-03/V-05 né certificano la grafica ACA.

| ID | Controllo | Esito | Evidenza e limiti |
|---|---|---|---|
| ENV-01 | Acquisizione sorgenti e configurazione Compose | Superato | 407 file confrontati byte per byte con l'estrazione upstream; impronte in tunet-origin.json. docker compose config --quiet valido. |
| ENV-02 | Build e avvio locale | Superato | npm ci/build nel Dockerfile upstream; container healthy, porta 127.0.0.1:3002, /api/health 200 e versione 1.22.1. |
| ENV-03 | Pagina e asset iniziali | Superato | HTTP 200 per pagina e 22 JS/CSS referenziati; dashboard visibile nel browser. Non è un audit di tutti gli asset o delle schermate. |
| ENV-04 | Rete e autenticazione di base | Superato | Challenge HA auth_required dal container; /api/profiles senza credenziali restituisce 401. Utente completa OAuth; System → Connection mostra CONNECTED / Authenticated via OAuth2. Nessuna credenziale nel report. |
| ENV-05 | Profili e persistenza predisposta | Superato, controllo parziale | Volume Docker montato in /app/data; UI profili senza errore, auto-sync attivo e ultima sincronizzazione visibile. Salvataggio/caricamento manuale profili, riavvio e ripristino non eseguiti. |
| ENV-06 | Dispositivi, offline, ruoli e grafica ACA | Non eseguito | Nessun comando fisico inviato, nessuna prova WAN assente o admin → cliente; nessuna personalizzazione. |
| DOC-20 | Integrità e riferimenti ACA dopo l'installazione | Superato | 407 sorgenti integri, 19 file protetti invariati, 31 Markdown / 247 link locali validi, 18 requisiti conservati. |
| DOC-21 | Perimetro e integrità del commit locale | Superato | 422 file pertinenti; 407 blob upstream byte per byte identici; esclusioni di ZIP/database/dipendenze/.env e diff delle fonti ACA verificati. |

## Audit frontend Tunet — 2026-10-05

Esiti in [REP-20261005-005](reports/REP-20261005-005-audit-struttura-tunet.md), revisione upstream 5dec995; principi di confronto in ADR-0004. Controlli eseguiti in container audit effimeri, senza rete esterna o mount dei dati reali. Nessuna CI attivata.

| ID | Controllo | Esito | Limiti |
|---|---|---|---|
| AUD-01 | Mappa statica e confronto con primitive/pagine | Superato come analisi | Componenti riusabili presenti; disallineamento dei gruppi tipografia/layout e della composizione predominante. Non è verifica della conformità del frontend ACA. |
| AUD-02 | Ambiente audit dal target builder upstream | Superato | Dockerfile/lockfile conservati; container applicativi non ricreati. |
| AUD-03 | ESLint | Superato | 222 file, 0 errori/warning; esclusi test e backend dalla configurazione upstream. |
| AUD-04 | Typecheck | Superato | checkJs, strict/noImplicitAny false; non dimostra tipizzazione rigorosa. |
| AUD-05 | Vitest | Superato | 90 file / 705 test passati in jsdom e test backend; non collaudo sui dispositivi. |
| AUD-06 | Colori e budget bundle upstream | Superato | 43 file per i colori, chunk entro i budget; non prova completa della grafica o delle prestazioni ACA. |
| AUD-07 | E2E, coverage, profilazione, WAN assente, audit sicurezza completo | Non eseguito | Da delimitare nei relativi incarichi. |
| AUD-08 | Integrità, perimetro e collegamenti | Superato | 407 sorgenti integri, 20 file storici invariati, 33 documenti / 279 collegamenti validi; soltanto otto documenti interessati. |

## Prima migrazione HOME — 2026-10-05

Evidenze e comandi in [REP-20261005-006](reports/REP-20261005-006-migrazione-home-typescript.md); criteri umani in ADR-0004/0005. I controlli strict riguardano la porzione migrata, non l'intero frontend.

| ID | Controllo | Esito | Evidenza / limite |
|---|---|---|---|
| MIG-01 | Typecheck precedente + HOME strict e relativo test | Superato | Compilatore upstream mantenuto, niente soppressioni/any nei nuovi contratti. Il confine JS resta parzialmente tipizzato. |
| MIG-02 | ESLint JS/TSX con regole React/hooks | Superato | 233 file, 0 errori/warning; no-undef/unused TS demandati a tsc nella porzione strict. |
| MIG-03 | Suite regressioni nel builder isolato | Superato | 91 file / 712 test, sette casi nuovi per HOME e lingua. Nessun volume reale o rete esterna nei container di verifica. |
| MIG-04 | Colori e budget bundle | Superato | 43 file per i colori; budget upstream rispettati. Non benchmark sul pilota. |
| MIG-05/06 | Build, avvio locale, health, asset e mount | Superato | Servizio healthy, HTTP 200, stesso volume; HA non ricreato. Non prova di backup/ripristino. |
| MIG-07 | Browser desktop/mobile, italiano e azioni | Superato | Locale it-IT, preferenza persistente dopo reload, apertura pannelli, modifica/menu/Escape; viewport 390×844 senza overflow orizzontale, ripristinato. Nessun dispositivo o profilo creato. |
| MIG-08 | Baseline, storico, link e diff | Superato | 407 file baseline e ZIP integri, 20 fonti protette immutate, 301 collegamenti locali validi e 48 percorsi nel perimetro; evidenze nel report. |
| MIG-09 | Fisico, offline, ruoli, salvataggio/caricamento profili, benchmark | Non eseguito | Restano nei futuri incarichi pertinenti. |

## Primo materiale Neumorphism HOME — 2026-10-05

Evidenze, passaggio da Antigravity e limiti in [REP-20261005-008](reports/REP-20261005-008-home-neumorphism.md). La conversione delle altre schermate e delle card non è dichiarata completata.

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Tipi, lint e build | Superato | Node 26 nel builder isolato; strict HOME; 233 file lint, 0 errori/warning; build locale aggiornata, nessuna dipendenza aggiunta. |
| Regressioni | Superato | 91 file / 715 test; dopo l'adattamento tipografico mobile, 2 file / 9 test pertinenti passati. Tre nuove regressioni per contrasto dei temi e menu chiuso. |
| Colori/bundle | Superato | 43 file nel controllo colori upstream; chunk nei budget. Non audit completo di ogni componente. |
| Testo e focus HOME | Superato, perimetro limitato | Coppie opache: testo principale 14,61:1 scuro / 13,18:1 chiaro; secondario 6,21 / 6,83; selezione/focus 5,99 / 6,08; testo su pulsante arancione 5,99 in entrambi. Focus visibile verificato da tastiera. Nessuna conformità WCAG complessiva attestata. |
| Browser desktop/mobile/tablet | Superato | Due temi desktop e 390×844, vista tablet 1024×768 senza overflow orizzontale rilevato; impostazioni, aggiunta scheda, profili, modifica/Fine e gestore pagine/Escape. Nessun dato d'impianto creato. |
| Movimento ridotto | Implementato; verifica statica | Media query presente nel CSS distribuito: animation-name none, transition none e transform none. Preferenza OS non modificata né emulata. |
| Build e servizio locale | Superato | Tunet healthy, stesso volume /app/data, HA non ricreato. Non prova offline, backup o ripristino. |
| Integrità e collegamenti | Superato | 407 file baseline e ZIP integri; 21 fonti protette e report Antigravity immutati; 38 documenti, 312 collegamenti locali validi e 31 percorsi nel perimetro. |

## Finestre di gestione schede e pagine

Evidenze in [REP-20261005-009](reports/REP-20261005-009-gestione-schede-pagine.md); risultato circoscritto al primo gruppo della prosecuzione.

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Tipi e lint | Superato | Controllo precedente + strict sulle finestre TSX e test gestione; lint senza errori/warning nel builder Node 26, nessuna dipendenza aggiunta. |
| Regressioni | Superato | 93 file / 728 test. Nuovi casi per selezione/ricerca, sei azioni creazione pagina, impostazioni/eliminazione pagina, focus/Escape e compatibilità delle chiavi icona. |
| Build e bundle | Superato | Index passato da 900,9 KB (oltre budget 900) a 885,3 KB; mx-icons separato in vendor-icons-mx 34,0 KB, limite 500. Soglie invariate. |
| Browser | Superato, perimetro limitato | Aggiunta scheda desktop scuro/chiaro e mobile chiaro 390×844; nuova pagina scuro e catalogo icone a 390/320 px; modifica pagina chiaro desktop/mobile, focus switch 84×48. Nessun salvataggio dati pagina o comando HA. |
| Movimento ridotto | Implementato | Media query estesa ai dialoghi e discendenti; posizione dello switch conserva lo stato. Preferenza OS non modificata/emulata. Non conformità globale. |
| Integrità e link | Superato | 407 file baseline e ZIP integri; 23 fonti protette; 39 documenti, 320 link locali validi e 32 percorsi nel perimetro. |

## Transizioni e skeleton

[REP-20261005-010](reports/REP-20261005-010-pannelli-skeleton.md) registra il perimetro e le evidenze.

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Tipi/lint/temi | Superato | typecheck precedente + strict primitive; ESLint senza errori/warning; lint colori 43 file. |
| Regressioni | Superato | 94 file / 740 test nel builder Node 26 isolato; 12 casi nuovi su uscita, riapertura, Escape ripetuto, focus/scroll sovrapposti, timer/evento di fine, movimento ridotto, lazy fallback, fetch stanze e refresh attività. |
| Build/budget | Superato | Index 886,7 KB, sotto 900 KB; tutte le soglie invariate e rispettate. |
| Browser reale | Superato, limitato | Apertura/chiusura desktop: aca-panel-in 0,36 s, uscita aca-panel-out con inert; passaggio Aspetto→Disposizione; fallback lazy osservato. Aggiunta scheda 390×844: stato di caricamento stanze osservato, lista HA poi disponibile, ingombro minimo 216 px, nessun overflow orizzontale. Viewport finale 778×710, un dialogo aperto; nessun comando HA o salvataggio pagina/profilo. |
| Movimento ridotto | Implementato e testato nel ciclo di presenza | Media query disattiva pannelli/backdrop/shimmer; test matchMedia per uscita immediata. Preferenza OS non modificata/emulata nel browser. |
| Servizio locale | Superato | Runtime healthy; root, health e 23 asset iniziali HTTP 200. Stesso volume e stesso container HA; non prova collaudo dei dispositivi, offline o ripristino. |
| Integrità e link | Superato | 407 file baseline e ZIP integri; 24 fonti protette, 40 documenti / 330 link locali, 32 file nel perimetro. |

## Regressioni da conservare quando esiste codice

Una modifica a identità, permessi, trasporto, esecuzione locale o distribuzione degli scenari deve conservare verifiche dei relativi confini. Per un difetto riproducibile registrare il caso, il comportamento atteso e una verifica pertinente dopo la correzione.

L'infrastruttura richiederà prove di recupero e di perdita della connessione; l'AI richiederà casi di rifiuto e confronto tra bozza approvata e scenario attivato. Le misure prestazionali riportano hardware, versioni, carico, durata e criterio di aggregazione: <30ms/<2s non sono valori già garantiti.

## Controlli automatici futuri

CI, controlli dei collegamenti, verifiche di licenze/manifest e protezioni di revisione sono **Pianificati, non implementati né assegnati**. Comandi e strumenti verranno scelti quando esisterà lo stack approvato e un incarico per introdurli. Il controllo manuale del diff non può dimostrare da solo l'assenza di ogni regressione comportamentale.
