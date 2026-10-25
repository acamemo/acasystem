# Verifiche ed evidenze

Aggiornato: 2026-10-14. Questo documento distingue controlli documentali, verifiche del banco prova e scenari di prodotto previsti. La realizzazione dei requisiti resta in [project-status.md](project-status.md).

## Criteri per gli esiti

**2026-10-14 — kit Widget adattivo:** [REP-20261014-004](reports/REP-20261014-004-widget-adattivi-gesti.md): 25/25 test pertinenti, typecheck/lint/tipografia/colori/formato/build superati. Browser senza GPU: 20 concept × quattro dimensioni × 390/1280/1920 px, gesti luce, dettagli/configurazione, capacità differenti, ordine/visibilità, stati simulati e focus. Pagina scorre con tutte le capacità selezionate; card piccole si adattano. Nessuna prova sui dispositivi HA reali, suite completa, aggiornamento banco o test con dito.

**2026-10-14 — galleria design Widget:** [REP-20261014-002](reports/REP-20261014-002-design-widget-kit.md) registra 3/3 test pertinenti, typecheck/lint/tipografia/colori e build superati. Chromium senza GPU a 390 e 1280 px: 25 card, filtro categorie e assenza di overflow dei contenuti misurati; dati e controlli simulati. Nessun collaudo di prodotto, aggiornamento del banco o prova tablet.

**2026-10-14 — vassoio Widget stabile e animato:** verifiche locali superate in [REP-20261014-001](reports/REP-20261014-001-vassoio-stabile-animato.md): typecheck, lint, tipografia/colori, formato dei file toccati, 85/85 test pertinenti con quattro processi. Chromium senza GPU a 390/1280/1920 px: altezza costante per categorie/risultati vuoti, tessere 104 × 128 px, misure intere, filtro rapido e movimento ridotto. Aggiunta via tastiera, clic e trascinamento provata nella preview. Non eseguiti suite completa, aggiornamento banco e prova sul tablet.

Un controllo è **Superato** soltanto con procedura realmente eseguita ed evidenza; **Fallito** quando l'esito non soddisfa il criterio; **Non eseguito** quando è soltanto previsto. Ogni evidenza identifica data, versione/commit o ambiente osservato, comando/procedura e limiti. Un test documentale non collauda l'applicazione.

**2026-10-25 — ottimizzazione della coreografia 0.9.28, opzione B ([REP-20261023-006](reports/REP-20261023-006-coreografia-animazioni.md)):** tre giri di correzioni (K1-K5, K6a, D1, D2, W1-W3, J1) e tre misure sul Tab M11 con gesti sintetici CDP, 5 giri alternati più il giro 0, contro la 0.9.27 (`dist-banco-0.9.27`); build `backup/v0928/dist-g3`. Controlli statici superati: typecheck strict, `eslint src`, `lint:typography` (0 violazioni, 522 file), `lint:theme-colors` (0 violazioni, 343 file); Vitest `--maxWorkers=4`, suite completa 203 file e 3064 test superati; build Vite riuscita. **Esito della misura: obiettivo non raggiunto**; dopo il giro 3 restano peggiori della 0.9.27 JUMP (somma 262 contro 195 ms, numero 3 contro 2), il task singolo prima della scena all'apertura (+7-11 ms), la somma dei task all'uscita da Sistema (290 contro 264 ms) e il rilascio nel volo in S3cD (blocco 90 contro 0 ms); la dissolvenza di entrata in Sistema è peggiore ma accettata dall'utente il 2026-10-25. Non eseguiti: prova col dito dell'utente, TalkBack, nuovo banco, e2e; le misure sintetiche non sostituiscono la prova a video. Nessun commit.

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

## Acasystem «OS» — 2026-10-06

Evidenze in [REP-20261006-001](reports/REP-20261006-001-acasystem-os.md) (ondate con subagenti; le verifiche finali seguono l'integrazione).

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Divisione frontend/backend senza cambi di versione | Superato | Lockfile confrontato: 0 versioni cambiate; aggiunti solo i workspace e i pacchetti di tipi autorizzati. |
| Backend TypeScript a livelli | Superato | 83 test, tsc e ESLint a 0, ripetuti dall'orchestratore; database e schema invariati. Volume reale non ancora provato in Docker. |
| Nucleo frontend TypeScript strict | Superato | Strict e non strict a 0 errori; suite 795/799 con 4 fallimenti noti delle schermate legacy. |
| Kit bilanciato, accenti, tipografia | Superato, checkpoint 1 approvato | 65 test; matrice degli stati; contrasti calcolati; lint:typography a 0 nelle cartelle a strati. Senza tablet fisico. |
| Launcher, widget, sistema, integrazione, revisione | In corso | Ondate 2–4. |

## Chiusura della revisione e banco Acasystem 0.1 — 2026-10-07

Fonte corrente: [REP-20261006-002](reports/REP-20261006-002-ripresa-revisione.md), annotazioni del 2026-10-07. Gli esiti «In corso» del 2026-10-06 sopra sono storici.

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Identità dei sorgenti alla ripresa | Superato | 921 file correnti uguali al manifesto SHA-256 di v009; copia integra. Nessuna correzione applicativa aggiunta in questa ripresa. |
| Chiusura documentale | Superato | 111 collegamenti locali dei sei documenti aggiornati validi; confronto con v009 limitato a quei documenti, codice e fonti protette invariati. Istantanea v010. |
| Revisione documentale indipendente | Superato dopo rettifica | 70 collegamenti, inclusi gli anchor, nei tre documenti operativi principali. ISSUE-018/021 aggiornati distinguendo audit storico e nuovo applicativo; istantanea v011, stesso codice. |
| Backend, verifica indipendente ripetuta | Superato | Typecheck strict ed ESLint a 0; 13 suite, 93/93 test. Autenticazione solo presso URL HA configurati sul server. |
| Frontend, autenticazione e configurazione | Superato | SystemConnect, SystemPage, ShellApp, useConnectionSetup, oauthStorage, apiAuth: 6 suite, 66/66 test ripetuti. |
| Suite frontend completa | Esito precedente con fallimenti | 1476/1481 nell'annotazione precedente; 5 fallimenti del legacy escluso, ISSUE-029. Suite completa non ripetuta in questa ripresa. Dopo la cancellazione del legacy: 1161/1161 (sezione seguente). |
| Banco Docker | Superato | aca-system:0.1, healthy; immagine be0f93a…7b09c8; health ok versione 0.1.0, volume aca-tunet_tunet-data invariato. Configurazione e digest completo in infrastructure.md. |
| Browser con sessione HA reale | Superato, perimetro limitato | Dopo ricaricamento: UI Metallo, OAuth2 conservato, «Collegato» in Sistema, navigazione e focus Sistema/launcher, Principale/Copertina da tastiera. Schermata nel report. Nessun comando fisico o salvataggio profilo/layout. |
| Backup e ripristino | Copia presente; ripristino non eseguito | Copia manuale a freddo del volume, 8516 byte, precedente all'aggiornamento. Nessuna prova di recupero, backup automatico o nuovo backup HA. |
| Dispositivi, offline, LAN/remoto | Non eseguito | Il banco browser/Docker non prova il prodotto sul tablet e sull'impianto. Nessuna CI attiva. |

## Home Assistant dietro Acasystem — 2026-10-07

Fonte: [REP-20261007-002](reports/REP-20261007-002-ha-dietro-acasystem.md), [ADR-0009](decisions/ADR-0009-home-assistant-dietro-acasystem.md).

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Proxy, test e revisione | Superato | Backend 138/138; 40 tentativi di aggirare il login, 29 risposte malformate, mutazioni 9/10. |
| Accesso end-to-end con finto HA | Superato | Credenziali errate, due fattori, ricarica, rinnovo, revoca, token kiosk, HA spento, limite. |
| Frontend completo | Superato | 1327/1327; build e budget ok. |
| Banco con HA reale | Superato senza credenziali | Provider 200, percorsi vietati 404, WebSocket fino a `auth_required`; il login reale lo esegue l'utente. |

## Launcher: polish, layout e celle «+» — 2026-10-07

Fonte: [REP-20261007-001](reports/REP-20261007-001-launcher-polish.md).

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Valutazioni isolate (layout, pre-scansione, kit) | Eseguito | 21 + 13 + 26 rilievi, poi corretti in due giri o motivati come residui (ISSUE-028) e come decisioni per l'utente. |
| Revisione visiva indipendente | Superato con residui | Sette viewport da 360×740 a 1920×920; griglia identica tra vista e modifica; widget nella cella toccata; tastiera e focus; 0 errori in console. Su Chromium a DPR 1 e 2: non provati la scala reale al 125%, altri browser e dispositivi touch. |
| Statici e suite | Superato | tsc, ESLint, tipografia, colori a 0; Vitest 113 file, 1281/1281. |
| Build, budget, immagine | Superato | index 677,1/900 KB; `aca-system:0.2` provata sulla porta 3012. Banco non aggiornato. |

## Cancellazione del legacy Tunet — 2026-10-07

Fonte: [REP-20261006-001](reports/REP-20261006-001-acasystem-os.md), annotazione del 2026-10-07; [ISSUE-029](project-status.md#issue-029).

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Elenco del legacy | Superato | Tracciamento statico delle importazioni da index.html, kit.html, launcher.html, le preview-*.html, i test TypeScript e il setup dei test: 213 file mai raggiunti, nessuna importazione irrisolta. Aggiunti 7 moduli TypeScript usati solo dal legacy, gli e2e di Tunet e 3 script di Tunet: 232 file (`backup/legacy-da-cancellare.txt`). |
| Cancellazione | Superato | Eseguita dall'utente da WSL: il classificatore dei permessi l'ha negata all'agente. 0/232 file residui; cartelle vuote rimosse. Copia completa in `usa-come-git/v009`–`v011`. |
| Statici | Superato | `tsc -p tsconfig.strict.json` 0 errori, ESLint 0, tipografia 0 violazioni (384 file), colori 0 (273 file). |
| Suite frontend completa | Superato | 102 file, 1161/1161 test, nessun fallimento (prima 1476/1481: 320 test e 51 file del legacy rimossi). |
| Build e budget | Superato | `npm run build` e `check-bundle-size.mjs`: index 666,7/900 KB, vendor nei limiti. Il CSS passa da 219 a 104 KB: 1533 classi Tailwind generate solo per il legacy; nessuna è usata come classe nel codice nuovo. |
| Immagine Docker | Superato | `aca-system:0.1.1-check` costruita e provata sulla porta 3012: health ok, root 200, `lang="it"`, titolo «Acasystem». Container rimosso. Il banco resta su `aca-system:0.1` per la demo. |
| Anteprime | Superato | Playwright a 1280×800 e 390×844: copertina, Casa, Luci, Clima, Multimedia senza overflow né errori in console; aspetto uguale alle schermate precedenti. |

## Modifica semplificata e griglia per pagina — 2026-10-08

Fonte: [REP-20261008-001](reports/REP-20261008-001-modifica-semplificata-griglia-per-pagina.md). Comandi in `progetto/acasystem/frontend`; per ogni incremento due giri di revisione avversaria con riproduzioni e mutazioni temporanee, esiti nel report.

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Statici | Superato | `tsc -p tsconfig.strict.json` 0 errori, ESLint 0, tipografia 0 violazioni (425 file), colori 0 (301 file). `format:check` fallisce solo su `eslint.config.js` e `public/sw.js`, non toccati e invariati rispetto all'ultimo commit. |
| Suite frontend completa | Superato | Verifica finale: 131 file, 1549/1549, 313,4 s; `i18n:check` 4/4. Dopo le correzioni visive: 131 file, 1550/1550, 309,9 s. Punto di partenza: 128 file, 1403/1403. |
| Build e budget | Superato | `npm run build` in 2,21 s con l'avviso preesistente sui chunk oltre 500 kB; `check-bundle-size.mjs` nei limiti, index 718,6/900 KB. Eseguita prima delle correzioni visive (CSS e dati dell'anteprima): la ripete la costruzione dell'immagine del banco. |
| Residui | Superato | Nessun riferimento a `RemoveZone`, `WidgetPositionControls`, `keyboardMode` o `PageSettingsSheet`; `[data-widget-knob]` resta solo in un'asserzione di assenza. |
| Prova visiva nell'anteprima | Superato, perimetro limitato | Playwright Chromium, mouse, DPR 1, `launcher.html` (pelle Metallo, entità finte) su Vite: viste a 960×445, 960×552, 960×600, 390×844, 844×390 e 600×860, interazioni a 960×445 e 390×844. Griglia piena entro il tetto del gap, celle a scarto 0 px, nessuno scorrimento orizzontale, console senza errori. Due difetti trovati e corretti, poi ricontrollati a 960×445, 390×844, 844×390 e 600×860. Doppio tocco simulato con due clic a 140 ms. |
| Geometria dell'editor delle pagine | Superato, misura una tantum | Script Playwright: a 960×445, 1024×472, 844×390, 390×844 e 360×740 nessun comando sotto la pillola dei messaggi, schede di altezza uguale; a 1152×700 e 1280×800 la riga sotto la scheda sta su una riga con un nome di 27 caratteri. Non è una suite e2e. |
| Lenovo Tab M11, tocco reale, TalkBack, tastiera virtuale, HA reale | Non eseguito | Da fare con l'immagine del banco aggiornata. |

**Misura della scala dagli screenshot del Lenovo Tab M11.** Eseguita prima di fissare `REFERENCE_AREAS.phoneLandscape`, senza codice, sugli screenshot inviati in chat il 2026-10-08: copie da 1600×1000 dello schermo 1920×1200, Chrome in orizzontale.

| Grandezza | Valore | Come |
|---|---|---|
| Scala (DPR) | 1,875 | La pillola della barra di stato, 52 px CSS (`statusBar.css`), è alta 81 px nella copia (y 217,5 → 298,5): 81 × 1920/1600 ÷ 52 = 1,87, quindi 1920/1024. |
| Controprova orizzontale | Coerente | Passo delle celle 187 px nella copia = 119,7 px CSS = cella 110 + gap 10; griglia 6×2 larga 1107,5 px = 708,8 px CSS, attesi 710. |
| Finestra | ≈1024×472 px CSS | Contenuto da y 198 a y 935 nella copia. Lato corto < 600, quindi classe `phoneLandscape`. |
| Area della griglia | 973×230 px CSS | La cella di 110 px è limitata dall'altezza: 2 × 110 + 10 = 230. |
| Cornice verticale | ≈242 px | Il CSS ne prevede 200: il piè di pagina finisce circa 40 px CSS sopra il fondo della finestra. Causa dedotta, non misurata: safe-area o barra di Android. |

Valori fissati in `deviceClass.ts`: `phoneLandscape` 973×230 (misura); `tablet` 973×440, lo stesso schermo a schermo intero (1024×640) con la cornice del CSS; `tabletPortrait` 568×540 e `phone` 358×576, stime del piano. Conseguenze sul Lenovo in Chrome: da 2 a 6 colonne una sola riga, da 7 a 9 due righe; la pagina automatica è 8×2 con cella 110 (gapX circa 12,8, gapY 10), la stessa cella della 6×2 di prima.

Limiti: `innerWidth`, `innerHeight`, `devicePixelRatio` e `safe-area-inset-bottom` non sono misurati in Chrome sul dispositivo. Le due aree di riferimento usano cornici diverse: con 242 px anche a schermo intero l'area sarebbe 973×398 e 8 colonne darebbero 3 righe invece di 4. L'anteprima di sviluppo a 1024×472 dà invece un'area di 973×272, con la cornice di 200 px. La stima iniziale di 960×445 a scala 2 è superata da questa misura.

## Editor delle pagine con icone e nuvoletta — 2026-10-09

Fonte: [REP-20261009-002](reports/REP-20261009-002-editor-pagine-icone.md). Comandi in `progetto/acasystem/frontend`; due giri di revisione avversaria con riproduzioni e mutazioni temporanee, esiti nel report.

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Statici | Superato | `tsc -p tsconfig.strict.json` 0 errori, ESLint 0, tipografia 0 violazioni (425 file), colori 0 (302 file). `format:check` fallisce solo su `eslint.config.js` e `public/sw.js`, fuori dall'incarico. |
| Suite frontend completa | Superato, con nota | Verifica finale: 132 file, 1562/1562, 472,6 s; `i18n:check` 4/4. Dopo le ultime correzioni, solo CSS e asserzioni sul CSS: 1561/1562, con un fallimento in un test di tastiera dei widget mentre server di sviluppo e Playwright caricavano la macchina; il file da solo 77/77; suite non ripetuta. |
| Build e budget | Superato | `npm run build` in 1,99 s e, dopo le ultime correzioni, in 2,57 s, con l'avviso preesistente sui chunk oltre 500 kB; `check-bundle-size.mjs` nei limiti, index 720,0/900 KB. |
| Prova visiva nell'anteprima | Superato, perimetro limitato | Playwright Chromium, `launcher.html` (Kit 2, entità finte) su Vite, 1024×472 e 390×844, chiaro e scuro, tocco via CDP, mouse e tastiera. Barra dentro lo schermo, bersagli di 44 px, «Nuova» senza menu, rinomina nella barra, riga sotto la scheda senza testi, nuvoletta alla pressione di 600 ms senza azione, al fuoco e al mouse; icone 10,62:1 e 12,83:1, casetta premuta 5,54:1 e 3,6:1; console senza errori. Un difetto (avviso del nome vuoto a 1,78:1 nello scuro) corretto a 6,13:1. Script una tantum, non una suite e2e. |
| Lenovo Tab M11, pressione lunga nativa di Chrome per Android, TalkBack, tastiera virtuale, HA reale | Non eseguito | Da fare con l'immagine del banco aggiornata. |
| Banco | In corso | Aggiornamento a cura dell'agente principale; esito nel report e in [infrastructure.md](infrastructure.md). |

## PageShell, vista pagine a trasformazioni e nuvoletta UI-010 — 2026-10-09

Fonti: [REP-20261009-004](reports/REP-20261009-004-pageshell.md) e [REP-20261009-003](reports/REP-20261009-003-vista-pagine-animazione.md), [ADR-0012](decisions/ADR-0012-pageshell.md). Comandi in `progetto/acasystem/frontend`. Cinque blocchi con uno o due giri di revisione avversaria ciascuno (riproduzioni in Chromium, mutazioni temporanee), poi verifica d'insieme e prova visiva. Le prove nel browser sono script una tantum su server Vite propri, in Chromium senza GPU (`--disable-gpu`, SwiftShader), un browser alla volta; non sono una suite e2e. Il PC si è spento più volte durante le prove precedenti (crash del driver grafico) e una volta durante la chiusura: causa non accertata.

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Statici | Superato | `tsc -p tsconfig.strict.json` 0 errori, ESLint 0, tipografia 0 violazioni (428 file), colori 0 (303 file), `i18n:check` 4/4. `format:check` fallisce solo su `eslint.config.js` e `public/sw.js`, preesistenti. |
| Suite frontend completa | Superato, con nota | Ultima esecuzione completa con `--maxWorkers=4`: 139 file, 1644 test passati (405 s). Nei passaggi intermedi, sotto carico del PC, test di `LauncherScreen`, `PolishKit` e altri sono andati in timeout da 15 s (nessuna asserzione fallita); rilanciati da soli, con meno processi o con timeout più lungo sono passati. |
| Build e budget | Superato | `npm run build` riuscita con l'avviso preesistente sui chunk oltre 500 kB; `check-bundle-size.mjs` nei limiti, index 725,6/900 KB. |
| Pressione, tablet 1024×472 e telefono 390×844, chiaro e scuro, modifica e vista | Superato | Scarto del centro 0,00 px fino a 1000 ms; scala a 950 ms 0,908–0,910; nessuna rotazione né animazione prima del sollevamento. Copia: parte a 0,9, torna a 1 entro circa 200 ms, oscilla tra −0,9° e +0,9°. Sfondo e scheda della vista a 0,908–0,910 con centro fermo. Movimento ridotto: scala 1, nessuna oscillazione. |
| Ritorno dell'orologio in copertina (P2) | Superato, caso esatto non riprodotto | 8 giri su 8 (tablet e telefono, chiaro e scuro, due varianti); rilascio dopo il giro di pagina accettato. Test dell'aggancio al centro e della geometria a metà scorrimento. Il layout reale del banco non è disponibile (D4): resta «da confermare sul banco». |
| Pozzetti della copertina (D5) | Superato | Fuori dalla modifica pozzetti `span` `aria-hidden` senza «+», non focalizzabili, visibili a riposo e a 600 ms di pressione; in modifica e durante il trascinamento bottoni con «+»; la Home non cambia. |
| Barra in alto e «Fine» (D1) | Superato | Copertina senza barra in alto in vista e in modifica; «Fine» solo nella barra in basso (72×44 px); nessuna sovrapposizione a 320 e 360 px; fuoco: matita → «Fine» all'ingresso, «Fine»/Esc → matita o «Pagina» sulla copertina. Impronta geometrica prima/dopo identica in 5 scene, salvo D1. Casi residui di fuoco e del vassoio aperto: aperti nei report. |
| Vista pagine: layout stabile | Superato | `distinctPageLayoutWidths = 1`, `distinctCellValues = 1`, `resizeObserverCalls = 0` in tablet e telefono, chiaro e scuro, anche con movimento ridotto (prima: 13 larghezze, 10 valori, 90 callback, 186 modifiche, fotogramma massimo 66,7 ms). |
| Vista pagine: fotogrammi lenti | Parziale | Server di sviluppo: 1 fotogramma da 50–67 ms al commit dell'apertura, a freddo a volte un secondo da 33 ms. Build di produzione, 4 contesti a freddo: 0 fotogrammi oltre 18 ms; con CPU rallentata 4 volte al più uno. Ambiente senza GPU; tablet non misurato. |
| Vista pagine: pan, uscita, tastiera, riordino | Superato | Pan con mouse e tocco CDP senza salti al rilascio; uscita senza salti; Tab (10 volte) senza spostare le schede; Alt+frecce, trascinamento con pressione lunga, nuova pagina ed eliminazione su tablet e telefono. Rotella e trackpad non scorrono le schede (limite). |
| Nuvoletta UI-010 | Superato | Contrasto minimo 6,39:1 sugli accenti provati; test su 77 accenti (≥ 4,5:1, deriva di tinta ≤ 3°). 16 px, Inter 500, raggio 5 px, ombra `0 10px 10px`, triangolino con errore di puntamento 0 px anche contro il bordo; solo dissolvenza di 120 ms con movimento ridotto; nessun `transition: all`. |
| Scambio delle barre in basso | Superato | Su build di produzione la barra di modifica scende a opacità 0,14 quando quella della vista parte da 0,02; test `EditToolbarHidden`. |
| Console | Superato | Nessun errore di console o di pagina nelle prove di pressione, copertina, vista e nuvoletta. |
| Lenovo Tab M11, pressione lunga nativa di Chrome per Android, pan e flick a dito, TalkBack, HA reale | Non eseguito | Soglie del flick tarate con eventi CDP. Da fare con l'immagine del banco aggiornata. |
| Banco | In corso | Aggiornamento a cura dell'agente principale; esito nei report e in [infrastructure.md](infrastructure.md). |

## Nome della pagina animato, ombre non ritagliate e tocco lento — 2026-10-10

Fonti: [REP-20261009-005](reports/REP-20261009-005-barra-nome-animata.md), [REP-20261009-006](reports/REP-20261009-006-ombre-non-ritagliate.md) e la coda di [REP-20261009-004](reports/REP-20261009-004-pageshell.md) (annotazione del 2026-10-10). Comandi in `progetto/acasystem/frontend`. Tre blocchi con uno o due giri di revisione avversaria ciascuno (riproduzioni in Chromium, mutazioni temporanee), poi verifica d'insieme, prova visiva e una correzione dopo la prova. Le prove nel browser sono script una tantum su server Vite propri, in Chromium headless senza GPU (`--disable-gpu`, SwiftShader), un browser alla volta; non sono una suite e2e. Suite sempre con `--maxWorkers=4`.

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Statici | Superato | `npm run typecheck` 0 errori, `npm run lint` 0, tipografia 0 violazioni (428 file), colori 0 (303 file), `i18n:check` 4/4. `format:check` fallisce solo su `eslint.config.js` e `public/sw.js`, preesistenti. |
| Suite frontend completa | Superato | Ultima esecuzione completa, dopo la correzione che segue la prova visiva: 141 file, 1676 test passati, 0 falliti. Una esecuzione precedente: 141 file, 1674 test passati in 409 s. |
| Build e budget | Superato | `npm run build` riuscita, ripetuta dopo le ultime correzioni, con il solo avviso preesistente sui chunk oltre 500 kB; `check-bundle-size.mjs` nei limiti, index 726,6/900 KB (misurato prima della correzione finale). |
| Tocco lento al bordo dell'apertura (blocco C) | Superato in Chromium | Riprodotto prima della correzione (tocco di 700–900 ms a 4 e 8 px dal bordo: i dettagli non si aprono). Dopo: si aprono; pressione lunga di 1,4 s entra ancora in modifica senza aprire; rilascio dopo 20 px non apre nulla. 5 test nuovi in `LauncherScreen.test.tsx`, 4 falliscono con il codice precedente. Caso simmetrico (tocco lento su un comando vicino al lato esterno) non corretto, proposta registrata. |
| Rinomina animata e nome a riposo | Superato | `PageOverviewBarRename.test.tsx` 17 test. Tablet 1024×472 e telefono 390×844, chiaro e scuro: andata 365 → 448 px in circa 250 ms con icone a opacità 0 entro 113 ms; ritorno 448 → 516 px in circa 280 ms, icone dopo circa 240 ms; Esc animata; nome di 43 caratteri dentro la barra e la fascia; Invio, `submit` del form, uscita valida, nome vuoto rifiutato, fuoco sul nome; movimento ridotto immediato; console senza errori. Nessuna matita, separatori da 1 × 20 px, nome 72 × 44 px. Tab e Maiusc+Tab, e la centratura verticale del campo, sono coperti da test e misura nel report, non da una nuova prova nel browser. |
| Etichette della scheda | Superato | Nessun `.aca-pager__badge` nel DOM né nei sorgenti (resta un'asserzione negativa nel test); nome accessibile «Apri Casa, principale» / «Apri Casa 2, nascosta» invariato. |
| Ombre ai bordi delle barre | Parziale | Geometria identica prima e dopo (celle, gap, griglia, k 0,7200, passo 761,28 e 304,80 px, corpi delle schede) a 1024×472 e 390×844; cambia solo il riquadro del pager. Con un'ombra rossa diagnostica il pager vecchio ritaglia a y = 64 con un bordo netto, il nuovo no. Con le ombre reali del Kit 2 la scansione dei pixel non mostra differenze misurabili sopra la scheda sollevata (l'ombra visibile arriva a circa 7 px) né sopra i widget della prima riga; l'unica differenza osservata è a y = 384–388 sul tablet, al bordo del footer. Il sintomo segnalato non si riproduceva già prima di questo incarico, dopo che la scheda sollevata non cresce più. |
| Tocchi sulle fasce e pulsanti | Superato, dopo la correzione | La prima versione faceva passare al pager i tocchi sulle fasce vuote (pressione lunga, scorrimento): rilevato dalla prova visiva e corretto con fasce sorde. Dopo: `elementFromPoint` nelle fasce restituisce la shell e nell'area delle pagine la pagina, a 1024×472 e 390×844; i pulsanti delle barre ricevono il puntatore al centro (verifica fatta prima dell'ultima correzione). Pan e pressione dalla fascia nella vista pagine coperti da test Vitest, non da una nuova prova nel browser. |
| Telefono con la riga dei chip | Limite noto | Il bordo di ritaglio sta a y = 43,25 invece che a 0; nessun contenuto vicino, nessun taglio visibile. |
| Console | Superato | Nessun errore di console o di pagina nelle prove. |
| Lenovo Tab M11, tastiera Android («Fatto»), tocco reale, TalkBack | Non eseguito | Da fare con l'immagine del banco aggiornata. |
| Banco | In corso | Aggiornamento a cura dell'agente principale; esito nei report e in [infrastructure.md](infrastructure.md). |

## Grandezza tra pagine, nome della copertina, livelli grafici, versione e banco 0.9 — 2026-10-12

Fonti: [REP-20261012-001](reports/REP-20261012-001-widget-tra-pagine-grandezza-visiva.md), [REP-20261012-002](reports/REP-20261012-002-nome-copertina-separatori.md), [REP-20261012-003](reports/REP-20261012-003-lag-tablet-prestazioni.md) (tappa 1) e [REP-20261012-004](reports/REP-20261012-004-versione-da-env.md). Comandi in `progetto/acasystem/frontend` e, dove indicato, `backend`. Il blocco grafico di REP-20261012-003 ha avuto un'implementazione, due revisioni avversarie di Opus e due giri di correzioni; il blocco L2 non era iniziato a quella chiusura (annotazione del 2026-10-13: completato nel codice, vedi la sezione «Blocco L2 (0.9.1)» più sotto). Le prove nel browser sono script una tantum in Chromium headless con raster software (SwiftShader), un browser alla volta, contro una copia del codice prima del blocco; le misure sul tablet delle demo (Lenovo Idea Tab TB336ZU, Chrome 154, 1280×665 DPR 2, 90 Hz, HA reale) sono via USB e CDP. Suite sempre con `--maxWorkers=4`. Nessuna è una suite e2e permanente.

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Statici frontend | Superato | Dopo l'ultima correzione: `npm run typecheck` 0 errori, `npm run lint` 0, `npm run lint:typography` 0 violazioni (428 file), `npm run lint:theme-colors` 0 (303 file), `npx prettier --check` sui file toccati dal blocco grafico. `format:check` completo e `i18n:check`: nessuna esecuzione registrata in questa serie, quindi non eseguiti. |
| Suite frontend completa | Superato, con nota | Ultima esecuzione, dopo la correzione finale: 142 file, 1706 test passati (`npx vitest run --maxWorkers=4`, 961 s). Esecuzioni intermedie: 1704 test (826 s) e 1705 (926 s). Due esecuzioni sotto carico del PC avevano dato fallimenti solo per timeout da 15 s (`LauncherScreen`, `SystemPage`) e un fallimento reale del test di CORR-7, poi corretto. |
| Trascinamento e menu tra pagine (REP-001) | Superato | `LauncherDragDrop.test.tsx` 36 test, con la conversione, l'orologio della copertina, il rimpicciolimento del solo widget spostato e la misura reale dal menu; i due test nuovi della revisione falliscono senza la correzione. |
| Nome della copertina (REP-002) | Superato | `PageOverviewBarRename.test.tsx` 18 test: `span` con le stesse lineette, nessun pulsante, nessun campo. |
| Regole CSS del blocco grafico (REP-003) | Superato, perimetro limitato | `LagLayers.test.ts` 22 test; con `OverviewPan`, `PageShell`, `LauncherGestures` e `PagerOverview` 103 test (prima dell'ultima correzione). Leggono il testo del CSS: la cascata reale è provata dalle sonde nel browser, non dai test. |
| Build | Superato | `npm run build` riuscita dopo il giro 1, con il solo avviso preesistente sui chunk oltre 500 kB; le cinque regole `@property` sopravvivono alla minificazione e sono registrate in Chromium. Ripetuta nella costruzione dell'immagine 0.9 (bundle `index-DG_i_to_.js`). |
| Backend (REP-004) | Superato | `npx vitest run`: 17 file, 141 test, compreso `version.test.ts` (variabile, ripiego, `unknown`); `npm run typecheck`, `npm run lint`, `npx prettier --check`: nessun errore. |
| Compose (REP-004) | Superato | `docker compose -f progetto/compose.tunet.yaml config`: immagine `aca-system:0.9`, `args` e `environment` con «0.9»; con `ACASYSTEM_VERSION=x` nella shell vale «x». |
| Misure sul PC, finestra del tablet | Eseguito, perimetro limitato | 1280×665 DPR 2, A/B alternato, due ripetizioni. Pan della vista: elementi ricalcolati da 54 445-54 788 a 335, RasterTask da 2079-2155 a 385, fotogrammi oltre 33 ms da 30-46 a 1-3. Apertura e chiusura: RasterTask da 1790-1940 a 588-670. Scorrimento: ricalcoli da 2476-2481 a 1366-1371, RasterTask da 167 a 125, ma Paint da 58-59 a 280-282; livelli da 61 a 146. **I fotogrammi lunghi dell'apertura e della chiusura non migliorano sul PC** (oltre 33 ms da 4-5 a 5-6; il più lungo da 200-317 a 300-383 ms nella rimisura del revisore). Il raster software non riproduce la GPU Mali. Tabelle complete nel report. |
| Aspetto sul PC | Parziale | Forme, colori e geometrie coincidono, ma i pixel non sono identici: a riposo 21 230 pixel con differenza oltre 8 (massimo 189) a 1280×665 DPR 2 e 22 766 (massimo 190) a 1024×472 DPR 1,875, con il testo di alcuni widget 1 px CSS più in basso. Con `will-change: auto` forzato su widget e celle l'immagine coincide con la base: causa nei livelli promossi. Il confronto allineato di ±3 px dell'implementazione nascondeva spostamenti ed è stato sostituito dai diff grezzi. |
| Misure sul tablet delle demo, 0.8 → 0.9 | Eseguito | Intervalli di `requestAnimationFrame`: scorrimento 68-79 fps (fino a 267 ms) → 86-89 fps (33-67 ms); apertura della vista 38 fps (356 ms) → 80-81 fps (133-156 ms); chiusura 54 fps (467 ms) → 75-76 fps (122-144 ms); quiete ed entrata in modifica 88-90 fps, invariate. Tracce CDP, blocco massimo del processo GPU: apertura 157-170 → 18 ms; chiusura 230-236 → 80 ms; scorrimento 47-250 → 11 ms. Restano blocchi del thread principale nella vista: commit di React 77 ms, layout forzato 41,6 ms, ricalcolo di stile 34 ms. |
| Criterio «nessun blocco della GPU oltre 40 ms» | Parziale | Rispettato in scorrimento (11 ms) e apertura (18 ms); **non rispettato in chiusura (80 ms)**. |
| Criterio «al più 1 fotogramma oltre 50 ms per animazione» | Non dimostrato | Il fotogramma più lungo supera 50 ms nell'apertura e nella chiusura della vista (122-156 ms); il numero di fotogrammi oltre 50 ms non è registrato. Dipende dal thread principale (L2). |
| Banco 0.9 | Superato | Copia a freddo del volume `backup/banco/tunet-data-20261012-pre-0.9-freddo.tgz` (126 028 byte, SHA-256 `c7fd1a8e…a362`); costruzione e avvio con `progetto/compose.tunet.yaml`; immagine `aca-system:0.9` `sha256:9a66d934…fc533` creata il 2026-10-12T15:23:02Z; container `healthy`; `/api/health` `{"status":"ok","version":"0.9"}` e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.7`; bundle `index-DG_i_to_.js`. Il ripristino della copia non è stato provato. Dettagli in [infrastructure.md](infrastructure.md). |
| Screenshot sul tablet prima e dopo; misura sul Lenovo Tab M11 da 4 GB (memoria GPU); orologio tra pagine e riga «Versione» di Sistema a schermo; TalkBack; angoli alla chiusura a vista | Non eseguito | Da fare con la 0.9. Il blocco L2 (React e impaginazione) era rimandato alla 0.9.1 e non iniziato a quella data; annotazione del 2026-10-13: completato nel codice, resta la misura sul tablet. |

## Blocco L2 (0.9.1) di REP-20261012-003 — 2026-10-13

Fonte: [REP-20261012-003](reports/REP-20261012-003-lag-tablet-prestazioni.md#blocco-l2-091). Comandi in `progetto/acasystem/frontend`, sul working tree dopo due giri di revisione e correzione. Prove nel browser: script una tantum in Chromium headless con raster software (SwiftShader), un browser alla volta, contro una copia del codice prima di L2 (`567531f`); suite sempre con `--maxWorkers=4`. Nessuna misura sul tablet in questa serie.

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Statici frontend | Superato | `npm run typecheck` 0 errori, `npm run lint` 0, `npm run lint:typography` 0 violazioni (429 file), `npm run lint:theme-colors` 0 (303 file), `npm run i18n:check` exit 0 (4 test), `npx prettier --check` sui file toccati. `npm run format:check` completo: exit 1 solo per `eslint.config.js` e `public/sw.js`, preesistenti. |
| Test del blocco | Superato | `PagerOverview` 27 test, `LauncherScreen` (render dei widget) 3, `PageDescriptor` e `LagRenders` 16, `LagLayers` verde. Prova di mutazione: con il codice pre-L2 (`Pager`, `LauncherScreen`, `LauncherUiContext`, `useLauncherController`, filtro di `footerBand`) i test nuovi falliscono; i test dei due giri di revisione falliscono senza la rispettiva correzione. |
| Suite frontend completa | Superato | `npx vitest run --maxWorkers=4` dopo l'ultima modifica: 143 file, 1727 test passati, 650 s. Una esecuzione intermedia (1720 test, 1144 s) era verde; un lancio dopo il giro 1 aveva dato un fallimento non identificato (output troncato), non ripetuto: causa non dimostrata, probabile timeout da carico. |
| Build | Superato | `npm run build` exit 0 con il solo avviso preesistente sui chunk oltre 500 kB; `node scripts/check-bundle-size.mjs` exit 0 (index 729,4 KB su 900). Con `ACASYSTEM_VERSION=0.9.1` la stringa «0.9.1» è in `dist/assets/index-rqrtF8mx.js`. L'immagine 0.9.1 non è stata costruita. |
| Render e layout forzati sul PC | Eseguito, perimetro limitato | 1024×472 DPR 1,875, mediana di 3 giri: apertura della vista render 1023 → 291, layout forzati 1 → 0, stile forzato 28,9 → 2,6 ms; cambio di pagina 1294 → 305 render, layout e stile forzati 2 + 2 → 0 (in modifica 8 + 13 → 0 + 2); chiusura con «Fine» stile forzato 65,2 → 0,9 ms (647 render: finisce la modifica); chiusura toccando una scheda 1765 → 581 render, layout forzati 6 → 5. Rimisure dei revisori a 1280×665 DPR 2: apertura 1230 → 291 render, chiusura 1972 → 581, cambio di pagina 1710 → 305. I millisecondi sono rumorosi con raster software e PC carico; il raster software non riproduce la GPU Mali. |
| Copertina spenta | Superato | Prima del giro 2 l'apertura ridisegnava ancora griglie e widget (render 1230 → 778); dopo la correzione il caso a copertina spenta di `LauncherScreen.test.tsx` e di `LagRenders.test.tsx` conferma che i widget non si ridisegnano. Non rimisurato nel browser dopo il giro 2. |
| Aspetto sul PC | Parziale | 22 screenshot per finestra: 19 identici a 1024×472 e 18 a 1280×665; differenze spiegate da orologio reale della copertina (mezzanotte passata tra le esecuzioni), fase della transizione di pressione (identico a regime) e riflusso di un widget a trascinamento iniziato. Console senza errori né avvisi. |
| Percorsi di navigazione | Superato, con limite | Apertura e chiusura della vista per 3 cicli, pan, riordino, nuova pagina, rinomina, trascinamento tra pagine, indicatore, ridimensionamento della finestra: stati uguali alla base. Due regressioni trovate dai revisori (indicatore durante lo scorrimento morbido, apertura della vista subito dopo uno scorrimento) sono corrette e coperte da test. La scrollata a tocco via CDP senza GPU è lenta: l'allineamento `scrollLeft = indice × larghezza` è verificato a riposo. |
| Riga «Versione» di Sistema | Non eseguito | L'anteprima di sviluppo mostra 0.1.0 (ripiego sul `package.json`, REP-20261012-004); 0.9.1 non è stata vista a schermo. |
| Banco 0.9.1; misura sul tablet delle demo (blocco GPU in chiusura, fotogrammi oltre 50 ms) e sul Tab M11; memoria GPU; TalkBack | Non eseguito | A cura dell'agente principale. I criteri del report restano non valutati per L2. |

## Barra unica in basso (ADR-0013), tappe 1-6 — 2026-10-13/14

Fonte: [REP-20261013-002](reports/REP-20261013-002-piano-barra-unica.md#verifiche-delle-tappe-1-6-2026-10-1314), con tutti i dettagli. Comandi in `progetto/acasystem/frontend`, sul working tree. Prove nel browser: Chromium headless con `--disable-gpu --use-angle=swiftshader --disable-gpu-compositing` (raster software, non il Mali-G57), un browser alla volta, contro `launcher.html`; server Vite fermati a fine prova. Suite con `--maxWorkers=4`. Nessun docker, adb o commit; banco ancora `aca-system:0.9.2`.

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Statici frontend | Superato | `npm run typecheck` 0 errori, `npm run lint` 0, `npm run lint:typography` 0 violazioni (429 file), `npm run lint:theme-colors` 0 (303 file), `npm run i18n:check` 4 test, `npx prettier --check` sui file toccati. `npm run format:check`: exit 1 solo per `eslint.config.js` e `public/sw.js`, preesistenti. |
| Suite frontend completa | Superato | `npx vitest run --maxWorkers=4` dopo l'ultima modifica: 145 file, 1815 test passati, 392 s. Percorso: T1 143 file / 1757; T2 144 / 1778; T3 145 / 1812; T4-5 145 / 1813; dopo la verifica visiva 145 / 1815. Non valgono come suite verde: l'esecuzione della T1 con 3 timeout sotto carico (15-18 s; i due file rieseguiti da soli 103/103) e quella della T3 con 62 errori «Worker exited unexpectedly» (worker non avviati per il carico del PC). |
| Guardie di griglia e dati | Superato | `LauncherGeometry` (righe e chiavi per 4 classi e 2-10 colonne, `cellMetrics` 75 e 88, `sizeAcrossKeys`) e `Polish2Cornice` (esiti di `fitBand` della barra della modifica, larghezze misurate il 2026-10-13): fissati sulla 0.9.2, verdi a fine lavoro. `REFERENCE_AREAS` invariata. |
| Cache della fascia | Superato, in jsdom | `FooterBandCache.test.tsx` (16 test): nessuna lettura di layout mostrando o nascondendo una barra a parità di chiave; rimisura per nota ↔ «+ Widget», testo e fase della connessione, larghezza, font, nome della pagina. jsdom non ha `ResizeObserver` (simulato nei test): il ciclo di circa 60 misure al secondo della prima versione si vide solo in Playwright. Nessuna misura sul tablet. |
| Build | Superato | `npm run build` riuscita dopo le ultime correzioni (solo l'avviso sui chunk oltre 500 kB); `node scripts/check-bundle-size.mjs`: index 733,2 KB su 900, misurato prima di due correzioni CSS. |
| Celle prima → dopo | Superato | Playwright, «prima» da uno stash del punto di partenza: 1024×640 75 → 88; 1280×800 107 → 120; 1280×665 80 → 93; 1024×472 112 → 112; 1024×568 112 → 112; 640×1024 89 → 89; 844×390 90 → 91; 390×844 81 → 82; 390×700 57 → 75. Coincidono con il piano. |
| Griglia e fascia identiche tra gli stati | Superato | 9 viewport; copertina, normale, modifica, selezione, vista pagine; chiaro e scuro con 0 differenze. Fascia di 88 px (152 sotto 40rem). |
| Sovrapposizioni, bersagli, scroll | Superato | Zero sovrapposizioni tra pillole, traccia, nome e gruppi delle barre; nessuno scroll orizzontale; in 11 viste × 3 fasi della connessione (33 combinazioni) nessun figlio fuori dalla pillola. Ingranaggio 44×44, «Modifica» 134,8×44, «Fine» 72,5×44, chip multimedia premibile 44 px con area di tocco. |
| Scambio «Modifica» ↔ «Fine», doppio tocco, fuoco | Superato | Opacità mai entrambe sopra 0,15 a 1024×640, anche con movimento ridotto; doppio tocco touch trattenuto a 150 ms e a 120 ms dopo «Fine»; fuoco Modifica → Fine → Modifica; ordine di tabulazione pagina, Sistema, chip, «Modifica». |
| Sistema con la disposizione bloccata | Superato | Ingranaggio visibile e cliccabile a 1024×640, 390×844, 844×390; «Modifica» mostra l'avviso del blocco sopra la fascia. La pagina Sistema vera non è nel banco di prova (il ritorno del fuoco è coperto da `FixSystemFocus`). |
| Vista pagine e «Annulla» | Superato, con compromesso | Distanza pillola-scheda da 16 a 73 px in 9 viewport, prima sovrapposta a 1024×640 (−12,7), 1024×472 (−36,2) e 1280×665 (−9,2). Con la riserva `k` scende a 1024×472 (0,72 → 0,6146) e a 844×390 (0,647 → 0,5099): schede −15 % e −21 % in larghezza (ISSUE-061). |
| Connessione in fase anomala | Superato, con limite | `role=status` sempre nel DOM; nessuna sovrapposizione. La parola va in ellissi: circa 11 px a 640×1024 con 5 pagine, 29 px a 360×640, 0 px a 320×568 (ISSUE-059). |
| Console | Superato, con limite | Nessun `pageerror` né errore in console in 18 combinazioni; l'evento «ResizeObserver loop…» arriva solo a `window.onerror` e a Vite (ISSUE-060). |
| Prestazioni sul tablet, banco 0.9.3, TalkBack, gesto dal bordo superiore, soglia 40rem con testo ingrandito, margine di 12 px, profilo 0.9.2 → 0.9.3, riga «Versione», misure del viewport (tappa 0) | Non eseguito | Tappe 0 e 7, a cura dell'agente principale. `LagRenders` verde e livelli `will-change` ora sulle pillole non sono una misura sul dispositivo. |

## Materiale a pressione — 2026-10-05

Evidenze, scelte e limiti in [REP-20261005-011](reports/REP-20261005-011-materiale-pressione.md); specifica in [design.md](design/design.md#materiale-a-pressione-implementato). Riguarda barra superiore, card di stato (SensorCard), emblema e pulsanti di benvenuto; non converte le altre card.

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Contratto del materiale (PressureMaterial.test.jsx) | Superato | Stesso numero di strati nelle ombre di ogni stato, regole di hover/click/selezione, card, movimento ridotto, contrasto dell'inchiostro sul volto arancione, primitiva Card. Mutazione temporanea di un elenco di ombre: test fallito come previsto, file ripristinato. |
| Card in SensorCard | Superato | Classe del materiale nei due layout fuori dalla modifica, assente in modifica. |
| Browser, tema scuro e chiaro, desktop e 390 px | Superato, perimetro limitato | Pillola selezionata, Modifica/Impostazioni circolari, emblema, pulsanti d'azione, hover e finestre Aggiungi scheda/Modifica pagina. Card osservata su replica del markup e degli stili inline: nessuna sessione Home Assistant nel browser di verifica. |
| Tipi, lint, colori, suite | Superato | Typecheck JS + strict HOME; lint senza errori; colori 43 file; 95 file / 752 test sull'host. |
| Build, budget e banco | Superato | Build Compose Node 26, chunk nei limiti; `aca-tunet:1.22.1-aca-press-neu1` healthy, 26 asset iniziali HTTP 200, stesso volume, HA non ricreato. |
| Stato premuto (`:active`), movimento ridotto del sistema, tablet fisico, dispositivi | Non eseguito | `:active` coperto solo dal test sul CSS; preferenza OS non emulata. |

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

## Banco 0.9.3 e Tab M11 — 2026-10-14

Fonti: [REP-20261012-003](reports/REP-20261012-003-lag-tablet-prestazioni.md#tab-m11-2026-10-14) e [REP-20261013-002](reports/REP-20261013-002-piano-barra-unica.md). Misure dell'agente principale via USB (adb + CDP) con gli script in `backup/strumenti-tablet/`; app in primo piano a schermo acceso; HA reale.

| Controllo | Esito | Evidenza / limite |
|---|---|---|
| Banco 0.9.3 | Superato | Copia a freddo prima della build; container `healthy`; `/api/health` con «0.9.3» e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.7`; riga «Versione» di Sistema a «0.9.3» sul M11. Dettagli in [infrastructure.md](infrastructure.md). |
| Viewport del Tab M11 (TB330FU, Chrome 155) | Misurato | Orizzontale 1280×665, verticale 800×1145, DPR 1,5, `screen` 1280×800, carattere di Android al 100 %. Schermo intero e app installata non misurati. |
| L2 sul tablet delle demo (0.9.2) | Misurato | Scorrimento 86-88 fps; vista pagine: apertura 79-82, chiusura 81-85 (era 75-76 con la 0.9). |
| Prestazioni sul Tab M11 (0.9.2 e 0.9.3) | Parziale | Scorrimento 82-88 fps, modifica 88-90. Vista pagine: un fotogramma di 190-370 ms all'apertura e di 156-200 ms alla chiusura. Il criterio «al più 1 fotogramma oltre 50 ms» non è rispettato nella vista pagine. Causa: raster GPU delle ombre dentro le pagine, provata con A/B ([ISSUE-062](project-status.md#issue-062)). Memoria GPU non misurata. |
| TalkBack, gesto dal bordo, margine di 12 px, testo ingrandito, profilo 0.9.2 → 0.9.3, prova con la persona | Non eseguito | Richiedono l'utente sul tablet. |

## Regressioni da conservare quando esiste codice

Una modifica a identità, permessi, trasporto, esecuzione locale o distribuzione degli scenari deve conservare verifiche dei relativi confini. Per un difetto riproducibile registrare il caso, il comportamento atteso e una verifica pertinente dopo la correzione.

L'infrastruttura richiederà prove di recupero e di perdita della connessione; l'AI richiederà casi di rifiuto e confronto tra bozza approvata e scenario attivato. Le misure prestazionali riportano hardware, versioni, carico, durata e criterio di aggregazione: <30ms/<2s non sono valori già garantiti.

## Controlli automatici futuri

CI, controlli dei collegamenti, verifiche di licenze/manifest e protezioni di revisione sono **Pianificati, non implementati né assegnati**. Comandi e strumenti verranno scelti quando esisterà lo stack approvato e un incarico per introdurli. Il controllo manuale del diff non può dimostrare da solo l'assenza di ogni regressione comportamentale.


### 2026-10-14 — Grafici nelle card del kit (REP-20261014-005)

26/26 test galleria/modello/gesti/MetalKit superati, massimo quattro worker. Typecheck, lint, tipografia/colori (zero violazioni), Prettier sui file cambiati e build superati; warning chunk hls preesistente. Chromium senza GPU e separato dai test: 20 card, quattro dimensioni, larghezze 390/1280/1920; grafico e controlli con altezze uguali. Corrette serratura compatta e fascia oraria Nordpool (ricontrollo mirato senza overflow); Pagina conserva scorrimento interno. Verificati gesti luminosità/colore indipendenti, dettagli, ordine, profili, stati, focus e movimento ridotto. Evidenze e limiti in [report 005](reports/REP-20261014-005-grafici-widget.md); serie simulate, nessuna prova su storico HA.

Riesecuzione finale dopo le correzioni geometriche: 15/15 test galleria, modello e gesti superati (tre file, massimo quattro worker); git diff --check superato.


### 2026-10-14 — Pagine per categoria (REP-20261014-006)

151 test pertinenti complessivamente superati: 131 casi LauncherScreen/SystemSheets/LauncherStacks nell’ultima suite, più 20 CategoryPages/LauncherController nella riesecuzione dopo correzioni alle aspettative dei test. Massimo quattro worker. Typecheck, lint, tipografia/colori e build superati; warning hls preesistente. Browser software separato dai test, 390/1280/1920: sette categorie, 25 widget, persistenza della luce associata dopo reload, nessun errore/fallback/overflow orizzontale della pagina; una continuazione a 390. A 1280 verificati pressione lunga, spostamento, ridimensionamento da tastiera, rimozione/Annulla e movimento ridotto. HA fisico e scelta di una vera area non eseguiti. Evidenze e limiti nel [report 006](reports/REP-20261014-006-pagine-categoria.md).


### 2026-10-14 — Categorie iniziali (REP-20261014-007)

28/28 test pertinenti superati, massimo quattro worker. Typecheck, lint, tipografia/colori e build superati; warning hls preesistente. Browser senza GPU e separato dai test a 390/1280/1920: 25 widget creati automaticamente senza azioni di aggiunta; rimozione Sicurezza e reload senza ricreazione, nessun errore. Marcatore di inizializzazione conservato dal validatore e dall’importazione delle istantanee; cambio classe verificato nei test. Evidenze in [report 007](reports/REP-20261014-007-categorie-iniziali.md).


### 2026-10-14 — Griglie di categoria (REP-20261014-008)

152/152 test griglie/controller/geometria/schermata superati; dopo le guardie aggiuntive sulle continuazioni personalizzate, 22/22 griglie/controller rieseguiti e superati. Precedente suite categorie/pile/griglie/controller 30/30. Massimo quattro worker. Typecheck, lint, tipografia/colori, formattazione e build superati; warning hls preesistente. Browser software separato dai test, sette categorie a 390/1280/1920: 25 widget, zero celle libere, nessun errore/overflow orizzontale della pagina. Secondo passaggio dopo la regolarizzazione delle distanze. Migrazione conservativa e persistenza verificate nei test. Distinzione tra primitive del kit e nuovi concept ancora simulati registrata in ISSUE-064. [Report 008](reports/REP-20261014-008-griglie-categoria.md).

### 2026-10-14 — Banco 0.9.7 e tablet collegato (REP-20261014-009)

Richiesta umana di distribuzione su 3002 e prove UI/UX/prestazioni; [report 009](reports/REP-20261014-009-banco-tablet.md). Tab M11 TB330FU reale, Chrome via USB/ADB/CDP, GPU del tablet; eventi touch/tastiera sintetizzati, senza browser locale GPU e separati da Vitest.

| Controllo | Esito | Evidenza e limiti |
|---|---|---|
| Codice | Superato dopo correzioni | Frontend completo 1.849/1.850: un selettore trovava due orologi; corretto, file 10/10. Dopo correzione visibilità 131/131; dopo regressione scroll/tap 47/47. Backend 141/141. Massimo quattro worker. Typecheck/lint, tipografia/colori (0 violazioni), formattazione e build superati; index 411,3 KiB/900, warning hls preesistente. Detector launcher senza rilievi. |
| Banco e dati | Superato nel perimetro | 0.9.7 healthy, health/versione/provider HA/index/asset 200 su loopback e LAN; bundle effettivo sul tablet. Copie a freddo e stesso volume; HA invariato. Ripristino dati non eseguito. |
| Categorie e griglie | Superato | Nove pagine, 25 card di categoria più tre Copertina. Sette categorie a 1280 × 664/665 e 800 × 1144/1145: zero celle libere/sovrapposizioni/fuori griglia, nessun overflow orizzontale. Ripristinata priorità CSS della build: margini e contenuto fuori dalla barra. |
| Associazione e pannelli | Superato per le entità disponibili | 21 pannelli aperti; focus contenuto, testi/scroll e risultati vuoti. Sensore reale scelto, opzioni rese disponibili, lettura/dettagli e scollegamento dopo prova. Card prima dell'associazione visibili, comandi inert. Molti domini senza dispositivi adatti; comandi fisici non provati. |
| Vassoio e modifica | Superato | Otto categorie e ricerca/nessun risultato: pannello 268,79 px costante, fila 144 px, tessere 104 × 128 px. «4 × 1», filtri rapidi, ricerca su tutte le categorie, movimento ridotto (0 animazioni). Tap e drag verticale con preview; scroll touch 1.696 px senza aggiunta/dialogo dopo fix. Pressione lunga, rimozione/Annulla, frecce/Spazio/Escape e reload; card temporanee rimosse. |
| Kit sul banco | Superato come anteprima | Scheda Widget disponibile su 3002, 20 concept e nessun overflow. Dati/controlli/grafici simulati; card operative nelle categorie distinte, ISSUE-064. |
| Fluidità | Parziale | Quiete 90 fps; scorrimento ordinario 82,5–84,7, categorie 81–88, modifica 88,4–88,8. Due giri. Vista pagine: max 345–411 ms apertura e 222 ms chiusura, fino a 6 frame oltre 50 ms. ISSUE-062 rimane aperto. Intervalli rAF, non misura certificata della latenza del dito. |
| Prova umana e copertura estesa | Non eseguito | Dito umano, TalkBack, testo ingrandito, memoria GPU, WAN assente, recovery e comandi/dispositivi mancanti. Calendario/Attività non associati con skeleton e gruppi poco distinguibili registrati come osservazioni UX. Non attestata accettazione o conformità complessiva. |

Evidenze in `backup/tablet-009/`, escluse da Git e prive di autenticazione esportata. Ultima copia `tunet-data-20261014-pre-0.9.7-freddo.tgz`, 218.283 byte; hash, comandi, immagini e limiti nel report. Sessione e disposizione personale mantenute, associazione di prova annullata, rotazione ripristinata; nessun commit o deploy remoto.


### 2026-10-14 — Sistemazione issue e banco 0.9.8 (REP-20261014-010)

[Report 010](reports/REP-20261014-010-sistemazione-issue.md). Vitest sempre con `--maxWorkers=4`, nessun browser sul PC insieme alle suite; Tab M11 via USB/ADB/CDP.

| Controllo | Esito | Evidenza e limiti |
|---|---|---|
| Frontend | Superato | `npx vitest run --maxWorkers=4`: 150/150 file, 1858/1858 test, 397 s. Mirati: 29/29 (categorie, griglie, controller) e 106 (LagLayers e geometria). I due test su Calendario/Attività falliscono senza la correzione; quello su Multimedia/Sonos fissa i nomi. Dopo la revisione Opus: +1 test (la luce non associata resta «Luce»), 1859 test; il file CategoryPages è tornato a LF. |
| Backend | Superato | 17/17 file, 141/141. |
| Statici e build | Superati | typecheck, lint, tipografia (0 su 440 file), colori (0 su 314), i18n 4/4, build e budget; avviso non bloccante sui chunk hls e index. |
| Suite del 2026-10-15 (banco 0.9.9) | Superato | Frontend `npx vitest run --maxWorkers=4`: 150/150 file, 1859/1859 test, 413 s; backend 17/17 file, 141/141; typecheck, lint, tipografia (0/440 file) e colori (0/314 file) senza errori. Nessun test in timeout. Il banco in esecuzione è la 0.9.9 (voce in infrastructure.md). |
| Banco 0.9.8 | Superato | healthy; health 0.9.8 e provider HA 200 su loopback e LAN; bundle `index-BgxLazso.js` anche sul tablet. |
| Calendario/Attività e gruppi sul M11 | Parziale | Zero skeleton; testo di scelta del widget invece di «non associato»; Multimedia e Sonos con nomi distinti ma stesso aspetto. |
| Vista pagine sul M11 | Non conclusivo | Apertura 73,6 fps, massimo medio 215 ms; chiusura 56,0 fps, 226 ms (peggiore 245). Intervalli rAF, tre giri; guadagno non confermato ([ISSUE-062](project-status.md#issue-062)). |
| Revisione finale con Opus | Non eseguito | Richiesta dall'utente; da registrare nel report. |
| TalkBack, testo ingrandito, schermo intero | Non eseguito | Richiedono l'utente. |

### 2026-10-15 — Audit indipendente del resoconto e dell'integrazione adattiva

[REP-20261015-002](reports/REP-20261015-002-audit-resoconto.md). Controlli sul working tree, nessun browser lanciato dall'audit e Vitest sempre con `--maxWorkers=4`. Applicazione e banco non modificati.

| Controllo | Esito | Evidenza e limiti |
|---|---|---|
| Frontend completo | Superato | 153 file, **1913/1913 test**, 398,66 s. Include il test dedicato mostra/nascondi password e le suite gesti. |
| Backend completo | Superato | 17 file, **141/141 test**, 4,47 s. |
| Sonde indipendenti delle regressioni | Fallito | **8/8**: doppi invii da tastiera, throttle aggirato, stato ottimistico permanente, crash entità assente, serratura senza conferma/codice, volume con servizio errato, umidità senza comando, cover con slider non supportato. Mock locali; nessun dispositivo comandato. Configurazione e log in backup/audit-20261015, esclusi da Git. |
| Typecheck / lint frontend e backend | Superato | `npm run typecheck`, `npm run lint` dalla radice acasystem. |
| Tipografia / colori | Superato | Zero violazioni su 448/321 file. |
| Build isolata | Superato | ACASYSTEM_VERSION=0.9.9, outDir in backup/audit-20261015/dist; dist applicativo preservato. Avviso hls >500 kB. |
| Formattazione mirata | Fallito | Quattro dei nove file controllati: LoginForm, AdaptiveCategoryWidget, GestureControl operativo, haEntityToCapabilities. Nessuna riscrittura. |
| Banco in sola lettura | Parziale | HTTP/hash confermano Df7kljmP/HD4WDER4, health 0.9.9 e container healthy. docker diff mostra dist modificato rispetto all'immagine; nuova build audit YZmyFge5 diversa. Riproducibilità e ripristino non provati. |
| Prestazioni finali M11 | Non eseguito | Le misure riportate per la variante con bordo tratteggiato/display:none non convalidano il fade finale; la stessa tabella conserva 4–5 frame >50 ms e picco 222 ms. ISSUE-062 resta aperto. |
| TalkBack, testo effettivamente ingrandito, standalone | Non eseguito | Lo script precedente estrae AXTree/euristiche, imposta font_scale e ruota il display; non dimostra navigazione TalkBack, ingrandimento effettivo del testo web o display-mode standalone. |

I test esistenti superati non dimostrano la copertura dei comportamenti rilevati dalle sonde. ISSUE-064 resta implementato con regressioni aperte, non verificato come integrazione completa; fonte corrente in project-status.md.


## 2026-10-15 — REP-20261015-003, widget operativi e regressioni

Fonte umana: piano completo dei venti tipi nella conversazione e successiva ripresa con tablet scollegato. Otto sonde dell'audit trasferite nella suite permanente. Profili completi/ridotti, target, associazioni mancanti, indisponibilità, rifiuto/conferma, preferenze, dettagli, storici e CSS diretto verificati. Ultimo gruppo capacità/Auto/Stanza: **232/232**, compatibilità minimi/disposizioni: **162/162**. Backend completo finale **141/141**; frontend completo **156 file / 2111 test superati**. Successiva guardia socket, separata dalla suite completa: **125/125** mirati e browser con WebSocket realmente chiuso, zero nuovi comandi.

Banco 3003 privo di proxy/client HTTP in uscita e credenziali reali, CSP same-origin, endpoint HA non simulati respinti. Self-check superato: stesso HTML della build di produzione, target estranei rifiutati. **240 viste** per passata (20 tipi × 4 taglie × 390/1280/1920), due passate di verifica visiva e conferma funzionale finale dopo compatibilità/feature: dettagli da tastiera, impostazioni e riavvio, gesto/throttle/riscontro HA, movimento ridotto, zero errori di pagina e overflow orizzontale. Ultimo controllo Pagina raggiungibile; anteprima camera contenuta.

Typecheck frontend/backend, lint, tipografia/colori, formattazione pertinente e build superati. Ogni invocazione Vitest ha massimo quattro worker; browser separato dalle suite, una sola istanza di prova e GPU disabilitata. Detector eseguito una volta (`[]`), non usato come certificazione.

Volume salvato a freddo e snapshot del filesystem 0.9.9 modificato conservati. Verificato recupero container con gli stessi vecchi asset/dati; backup volume estratto in tmpfs senza rete, SQLite integro e impronte delle tabelle coincidenti. Binding LAN aggiornato a **192.168.1.19**, osservato sul Wi-Fi attuale. Rilascio finale **0.9.10 healthy**, API locale/LAN e proxy HA 200, tutti i **90 file serviti** conformi all’immagine, versione UI isolata 0.9.10, DB integro e tabelle identiche prima/dopo: evidenze in [REP-20261015-003](reports/REP-20261015-003-widget-operativi.md).

**Non eseguito:** M11 nei due orientamenti, ricaricamento e sessione al nuovo URL, ISSUE-062 sulla variante finale (tre aperture/chiusure, ≤1 frame >50 ms e nessun blocco GPU >40 ms), TalkBack, ingrandimento effettivo 125/150% e PWA standalone. Tablet scollegato per comunicazione dell'utente; nessuna impostazione Android modificata e nessun passaggio manuale attribuito all'utente. Dispositivi fisici esclusi per scelta: nessun comando di collaudo agli impianti. Completamento software/PC e accettazione sul tablet restano distinti.

Ultimo backup immediatamente prima del rilascio (23:48): `rep003-20261015-pre-release-volume-freddo.tgz`, 406105 byte, SHA-256 `a613ed9f2259b3cf13f8335c27575eec07bf94f178f771e884db63ad22645026`. Estratto in tmpfs senza rete e confrontato con i dati del rilascio: integrità ok e tutte le impronte coincidenti.

## 2026-10-19 — Prova sul Tab M11 della 0.9.10 (REP-20261019-001)

Ambiente: Tab M11 TB330FU, Chrome 155, 1280×665 @1,5, 90 Hz, via USB (`adb reverse tcp:3002`, CDP su 127.0.0.1:9225), banco `aca-system:0.9.10`, schermo sveglio. Eventi sintetici via CDP; nessun comando a impianti; nessun Vitest.

| Controllo | Esito | Limiti |
|---|---|---|
| 9 pagine, dettagli/configurazione di 21 tipi più separatore, barra e Sistema (versione 0.9.10) | Superato: nessun ErrorBoundary, overflow o sovrapposizione; Esc e fuoco corretti | Nessun widget di categoria associato: scheda «Dettagli» e dati reali non verificati. Rilievi ISSUE-075/076. |
| Flussi di modifica (pressione lunga circa 450 ms, vassoio, aggiunta, trascinamento, ridimensionamento, cestino con Annulla, vista pagine) | Superato salvo ISSUE-077 | Frecce di pagina, colonne, cestino pagina, «Nuova pagina», occhio e casetta non toccati. |
| Console | 0 eccezioni; 1 evento 409 (ISSUE-078) | |
| ISSUE-062, criterio storico (≤1 frame >50 ms; nessun blocco GPU >40 ms) | **Fallito**: chiusura 53,2-58,3 fps, 4-5 frame >50 ms, picchi 233-311 ms; apertura 54,7-60,2 fps, 3-4 frame, picchi 256-378 ms; `GPUTask` massimo 26,7-33,4 ms ma raster continuo 145-246 ms | Tracing +10-15%; un solo tablet e layout; quota GPU inferita. Cause e A/B nel report. |
| Disposizione localStorage del launcher | Identica prima/dopo (tre giri; due chiavi e `tunet_card_settings` ripristinate) | Chiavi Tunet predefinite scritte da Sistema lasciate. |

Non eseguito: TalkBack, testo effettivo 125/150%, app installata, flussi e prestazioni in verticale, comandi dei widget associati. Rettifica a [REP-20261015-001](reports/REP-20261015-001-ripresa-issue062-issue064.md): la dichiarazione di risoluzione di ISSUE-062 è smentita dalle misure sopra.

## 2026-10-19 — Correzioni N1-N5 di ISSUE-062, ISSUE-075 e ISSUE-077, versione 0.9.11 (REP-20261019-002)

Ambiente: PC Windows, Chromium di Playwright headless con GPU disabilitata, CPU rallentata 4× dove indicato, banco isolato `e2e/isolated-server.mjs` su 127.0.0.1:3003 (nessun HA, nessun comando a impianti), un solo browser alla volta; nessun accesso al tablet, al banco Docker o a Git. Il tablet **non** è stato misurato.

| Controllo | Esito | Limiti |
|---|---|---|
| Suite frontend `npx vitest run --maxWorkers=4` | Superato: 159 file, 2142/2142 (primo giro 2136/2140 con 4 fallimenti in `OverviewPan.test.tsx`, corretti) | Backend non rieseguito (nessun file modificato). |
| `npm run typecheck`, `npm run lint`, `lint:typography`, `lint:theme-colors` | Superato (0 violazioni; 459 e 331 file) | Alla fine, dopo l'ultima modifica a `LauncherScreen.tsx`. |
| Costo di stile del pager (CPU 4×, 5800 elementi) | `is-overview` 219-247 → 22-29 ms; `is-closing` 180-279 → 15-20 ms; ricalcolo dei giri apertura 522 → 256 ms, chiusura 758 → 360 ms | Tempi del PC, non del M11; frame >50 ms e picchi del PC (raster software) non confrontabili. |
| Aspetto prima/dopo | 0 pixel diversi in vista pagine e in chiusura congelata a 160 ms; differenze minime solo dove c'è moto o tempo (oscillazione in Modifica, pallino e orologio della fascia) | Non è un confronto di tutti i fotogrammi. |
| Tocco prima/dopo (CDP `Input.dispatchTouchEvent`, `pointercancel` contati) | Identico campo per campo in tre esecuzioni; trascinamenti in chiusura senza `pointercancel` | Headless con CDP, non il dito sul M11. Un pseudo-elemento al posto del livello dei varchi dava `pointercancel`: scartato. |
| Fascia in basso, densità per fotogramma (1280 e 390 px) | Sequenze identiche prima/dopo, zero errori | Lettura dopo i `requestAnimationFrame`. |
| ISSUE-077 (browser del PC) | Dopo «Tutti» 1516 → 8; alla riapertura 1696 → 8 | Non sul tablet. |
| ISSUE-075 (struttura sintetica in 222 px) | Riga 290 senza troncamento → 222 con ellissi | Non una tessera Stanza associata. |
| Build `ACASYSTEM_VERSION=0.9.11` (`vite build` in `backup/rep20261019-002/dist-0911`) | `0.9.11` nel bundle | `dist/` e banco non rigenerati; `e2e/release.check.mjs` fallisce finché il banco non è aggiornato. |

Non eseguito: Tab M11 (criterio storico di ISSUE-062), TalkBack, banco Docker, backend, dati reali. [ISSUE-062](project-status.md#issue-062) resta aperto.

### Annotazione 2026-10-19 — banco 0.9.11, tablet e controlli complessivi (REP-20261019-002)

| Controllo | Esito | Limiti |
|---|---|---|
| Suite frontend `npx vitest run --maxWorkers=4` (passaggio di verifica) | Superato: 159 file, 2143/2143, 420 s | Un test in più del giro precedente (2142), non analizzato. |
| typecheck, lint, `lint:typography`, `lint:theme-colors`, `i18n:check` | Superati (uscite 0) | `format:check` non eseguito. |
| `npm run build`, `check-bundle-size.mjs` | Superati; index 800,5 KB su 900 KB | Avviso Vite sui chunk >500 kB. |
| Backend `npm run test -w backend -- --maxWorkers=4` | 17/17 file, 141/141 | Nessun file backend modificato. |
| Banco 0.9.11 | Immagine `aca-system:0.9.11` (`sha256:90869e9c...ecd4`); healthy; `/api/health` 0.9.11 e `/ha/auth/providers` 200 su 127.0.0.1 e 192.168.1.7; copia a freddo di 428858 byte, SHA-256 `02897625...6508` | Ripristino non provato in questo incarico. |
| Tab M11, ISSUE-075 | Titolo intero (43 = 43), sottotitolo con ellissi (253 > 204) | Tessera non associata, eventi sintetici. |
| Tab M11, ISSUE-077 | scrollLeft 1696 → 8 dopo «Tutti» e alla riapertura | Eventi sintetici. |
| Tab M11, tocco nella vista pagine | Come prima (scorrimento, trascinamento tra le schede, apertura di una scheda, chiusura, Fine) | Eventi touch CDP, non il dito. |
| Tab M11, prestazioni vista pagine | Apertura 61,6-66,3 fps, 3-5 frame >50 ms; chiusura 60,2-65,0 fps, 4-6 frame >50 ms (0.9.10: 54,7-60,2 / 3-4 e 53,2-58,3 / 4-5) | **Criterio storico non rispettato**; ISSUE-062 aperto; nessuna traccia a schermo acceso. |
| Revisione: Layerize e Paint (PC, CPU 4×) | Layerize circa raddoppiato (ingresso 99-116 → 196 ms, uscita 79-88 → 172-176 ms); Paint all'uscita 141-160 → 261-290 ms; occupazione totale all'uscita 847-904 contro 1107-1187 ms | Sonde del revisore, non rieseguite qui; non misurato sul M11. |

Non eseguito: TalkBack, testo 125/150%, app installata, verticale, widget associati con entità reali, confronto pixel automatico sul tablet. Console del tablet: un `409 Conflict` su `/api/settings/current` durante la prova del vassoio (layout invariato; ISSUE-078).

## 2026-10-19 — ISSUE-076, widget non associati (opzione B), banco 0.9.12 (REP-20261019-003)

Ambiente: PC Windows, Vitest con `--maxWorkers=4`, un solo Chromium headless con GPU disabilitata alla volta (mai insieme alla suite), poi il Tab M11 (TB330FU, 1280×665 a DPR 1,5, `adb reverse 3002`). Nessun comando a impianti, nessuna credenziale, nessun commit.

| Controllo | Esito | Limiti |
|---|---|---|
| Test del perimetro `CategoryPages` e correlati (`--maxWorkers=4`) | CategoryPages 20/20; 12 file 314/314 | Test nuovi su pulsante unico, nome e descrizione per 19 tipi, taglia a una riga, etichetta in modifica, nessun servizio, `unknown`, Calendario/Attività, assenza di `opacity`, layer che ritaglia. |
| `npx vitest run --maxWorkers=4` (suite frontend) | 159 file, 2155/2155, nessun timeout | Un giro. |
| `npm run typecheck`, `lint`, `lint:typography`, `lint:theme-colors`, `i18n:check` | Superati (459 e 331 file) | `format:check` non eseguito. |
| `npm run build`, `check-bundle-size.mjs` | Superati; index 820,77 kB (gzip 242,33 kB), 801,5 KB su 900 KB | Avviso Vite sui chunk >500 kB. |
| Backend `npm run test -w backend -- --maxWorkers=4` | 17 file, 141/141 | Nessun file backend modificato. |
| Browser headless, 112 viste (1280×665 e 390×844, chiaro/scuro, fuori/in modifica, normale e a una riga) | 110 senza problemi; 2 con un contatto di circa 6 px nella tessera Tosaerba a 390 px (dichiarato, non corretto) | Controllo del rosso su testo, riempimenti, tratti, sfondi, bordi, contorni e LED; PC, non tablet. |
| `interazione.mjs` a 1280×665 | Tessere associate e Calendario/Attività invariati; caso senza cornice: il bersaglio non esce dalla tessera | Nessuna richiesta verso altri host. |
| Banco 0.9.12 | Immagine `aca-system:0.9.12` (`sha256:eeff9370...d4e6`); healthy; `/api/health` 0.9.12 e `/ha/auth/providers` 200 su 127.0.0.1 e 192.168.1.7; copia a freddo di 429401 byte, SHA-256 `40fd0b5a...97c3a`, `tar -tzf` 4 voci | Ripristino non provato. |
| Tab M11, widget non associati, sette pagine di categoria | Un solo «Collega <tipo>» per widget, dentro la tessera; pillola 151×51 px, cerchio 48×48 px (tessere 222×89 e 89×89); nessun «Non disponibile»; Calendario/Attività invariati | Eventi sintetici e CDP, non il dito. |
| Tab M11, in modifica | Nessun pulsante; «Da collegare» in tutti i 19 non associati, un solo elemento per tessera | Spostamento/ridimensionamento col dito non provati. |
| Tab M11, tocco su «Collega Ventilatore» | Apre «Impostazioni del widget»; Esc chiude; nessun salvataggio | Nessuna associazione. |
| Tab M11, `localStorage` del launcher | 34 chiavi, identiche prima e dopo | Token omessi. |
| Tab M11, prestazioni (0.9.12 contro 0.9.11) | Scorrimento 80,8-84,7 fps (80-85); apertura vista pagine 62,6 fps (62-66); **chiusura 58,9-59,0 fps (60-65), picco 267 ms (178-256)**; quiete 90 fps; entrata in modifica 81,5 fps; uscita 90 fps; sette categorie 80,1-85,4 fps | Equivalenti, salvo la chiusura della vista pagine, circa 1 fps sotto la fascia: da seguire. Il criterio storico di ISSUE-062 resta non rispettato. |

Non eseguito: prova col dito in modifica, TalkBack, testo al 125/150%, verticale, app installata, widget associati con entità reali, `release.check.mjs` (manifest della 0.9.10). [ISSUE-076](project-status.md#issue-076) resta in attesa della conferma dell'utente sul grado di attenuazione. Dettagli: [REP-20261019-003](reports/REP-20261019-003-issue076-widget-da-collegare.md).

## 2026-10-19 — ISSUE-076, anteprima attenuata corretta, banco 0.9.13 (REP-20261019-003)

Ambiente: PC Windows, Vitest con `--maxWorkers=4`, un solo Chromium headless con GPU disabilitata alla volta (mai insieme alla suite), poi il Tab M11 (HA2KZKYB, 1280×665 a DPR 1,5, `adb reverse 3002`). Nessun comando a impianti, nessuna credenziale, nessun commit.

| Controllo | Esito |
|---|---|
| `npm run typecheck`, `npm run lint`, `lint:typography` (459 file), `lint:theme-colors` (331 file), `i18n:check` | Superati |
| Vitest, suite completa (`--maxWorkers=4`) | 159 file, 2160 test superati (`suite-1.txt`); CategoryPages 25/25 |
| `npm run build`, `scripts/check-bundle-size.mjs` | Superati; `index-BtTvMahl.js` 802,5 kB su 900 kB |
| Backend, `npm run test -w backend -- --maxWorkers=4` | 17 file, 141 test superati |
| Browser headless (`verifica-browser.mjs`, `rete.mjs`, `interazione.mjs`) | 200 tessere su 200 senza problemi (due disposizioni); nessuna richiesta a host esterni in 25 s sulla videocamera; interazione invariata |
| Banco 0.9.13 | Immagine `aca-system:0.9.13` (`sha256:bb5962d5...78c4b35`); healthy; `/api/health` 0.9.13, `/ha/auth/providers` 200 su 127.0.0.1 e 192.168.1.7; copia a freddo di 428046 byte (SHA-256 `141df0df...433f39`) |
| Tab M11, schermate | Fuori dalla modifica nessun «Non disponibile», pulsante dentro la tessera (151×51 px; 48×48 px a una riga); in modifica «<Tipo> / Da collegare» senza pulsante, «Senso…» non più troncato; il tocco apre «Impostazioni del widget» (Ventilatore e Tapparella); `localStorage` identico (34 chiavi) |
| Tab M11, prestazioni (0.9.13 contro 0.9.12) | Scorrimento 78,8-82,7 fps (0.9.12: 80,8-84,7); apertura vista pagine 57,7-61,2 fps (62,6); chiusura 53,8-58,0 fps (59); entrata in modifica 78,8-80,3 fps; sette categorie 79,4-85,4 fps con un picco di 111 ms al primo passo. Nel rumore, circa 1-2 fps in meno; il criterio storico di ISSUE-062 resta non rispettato |

**Problemi residui sul tablet (non risolti):** nome del tipo assente in molte tessere (solo icona), Allarme quasi vuoto, pulsante sovrapposto al riquadro della Videocamera e alla fila dei controlli di Multimedia e Sonos, «Sensore o entità» troncato nelle 1×1, tessere 1×1 con solo cerchio e nome sotto.

Non eseguito: prova col dito in modifica, TalkBack, testo al 125/150%, verticale, app installata, widget associati con entità reali, `release.check.mjs` (manifest della 0.9.10), altri browser. [ISSUE-076](project-status.md#issue-076) resta in attesa dell'utente. Dettagli: [REP-20261019-003](reports/REP-20261019-003-issue076-widget-da-collegare.md).

## 2026-10-19 — ISSUE-076, revisione della sesta passata (settima passata, REP-20261019-003)

Ambiente: PC Windows, Vitest con `--maxWorkers=4`, un solo Chromium headless con GPU disabilitata alla volta (mai insieme alla suite). Nessun comando a impianti, nessuna credenziale, nessun commit. Il banco non è stato aggiornato e il tablet non è stato usato.

| Controllo | Esito | Limiti |
|---|---|---|
| `verifica-browser.mjs` (19 tipi; 1280×665, 1280×646 con griglia 8×5 del tablet, 390×844; chiaro/scuro; fuori/in modifica) in tre disposizioni: originale, tessere 1×1, tessere 2×1 | **228 su 228** per disposizione, con sagome neutre, `shapes === 0` ora errore per ogni tipo e misura estesa agli pseudo-elementi; in più 20 su 20 a 390×680 (1×1 di 71×71) | Emulazione del tablet; il numero di elementi disegnati per tipo non prova la riconoscibilità (screenshot); eccezione dichiarata: 1×1 senza icona del tipo |
| Stesso controllo con `FONT=125` e `FONT=150` (dimensione del carattere radice, 1280×646 e 390×844) | Tessere a una riga 76/76 (125%, chiaro e scuro) e 38/38 (150%); tessere piene 38/38 e 38/38; nessun cerchio fuori dalla tessera | Approssimazione, non lo zoom del testo di Chrome Android; con testo ingrandito nome, icona, distanza, tagli e anteprima sono limiti notati (a 150% nella 2×2 da 128 px il pulsante sporge di circa 2 px) |
| Rete: richieste dal primo `goto`, altri host e percorsi `/ha/`, `/api/`, `camera_proxy` dello stesso host; `rete.mjs` con controllo positivo | 0 richieste verso altri host o HA/videocamera in tutti i contesti (7512 e 10512 richieste dal primo caricamento per disposizione, di cui 0 dopo il caricamento; `rete.mjs`: 375 per contesto, solo il WebSocket di Vite); controllo positivo visto | Anteprima con fixture, senza il proxy del banco; garantito dal codice: `getEntityImageUrl: () => null`, `conn: null`, nessuna sorgente nel layer |
| `esc-probe.mjs` (disposizione del tablet, tocco CDP + Escape) | `[role=dialog]` sempre 1 (`div.aca-popover` nascosto), `dialog[open]` 0, 1, 0, 1, 0: Esc chiude; l'osservazione sul tablet era un artefatto del selettore | PC, non tablet; nelle prove future sul tablet usare `dialog[open]` |
| `interazione.mjs` | Invariata (un solo pulsante 151×51 px per tessera; tocco, Invio e dito aprono «Impostazioni del widget», Esc la chiude; Calendario e Attività; tessera senza cornice) | PC |
| Vitest `CategoryPages` | 31/31 (29 + 2 test nuovi; mutazioni del CSS: falliscono) | |
| `npx vitest run --maxWorkers=4` (suite frontend) | 159 file, 2166/2166, nessun timeout (420 s) | Un giro. |
| `npm run typecheck`, `lint`, `lint:typography` (460 file), `lint:theme-colors` (331 file), `prettier --check` sui file toccati | Superati | Backend, build e `i18n:check` non rieseguiti (nessun file interessato oltre al frontend). |

Non eseguito: banco nuovo, misura e prova sul Tab M11 (costo delle barre e di `useClearPath`), prova col dito, TalkBack, testo ingrandito con lo zoom vero di Chrome Android, widget associati con entità reali. Dettagli: [REP-20261019-003](reports/REP-20261019-003-issue076-widget-da-collegare.md), sezione «Settima passata».

## 2026-10-19 — ISSUE-076, cinque punti del Tab M11 (sesta passata, REP-20261019-003)

Ambiente: PC Windows, Vitest con `--maxWorkers=4`, un solo Chromium headless con GPU disabilitata alla volta (mai insieme alla suite). Nessun comando a impianti, nessuna credenziale, nessun commit. Il banco non è stato aggiornato e il tablet non è stato usato (in sospensione).

| Controllo | Esito | Limiti |
|---|---|---|
| `verifica-browser.mjs` (19 tipi; 1280×665, 1280×646 con griglia 8×5 del tablet, 390×844; chiaro/scuro; fuori/in modifica) in tre disposizioni: originale, tessere 1×1, tessere 2×1 | 228 tessere su 228 senza problemi per disposizione: nome del tipo visibile, una sola icona, ≥ 8 px dall'anteprima, pulsante ≥ 48 px (≥ 44 nelle 1×1) dentro la tessera, nessun testo vietato né rosso, nessuna richiesta di rete (anche 12 s sulla Videocamera), nessun elemento tagliato o sopra il pulsante; in più 20 su 20 a 390×680 (1×1 di 71×71) | Emulazione del tablet, non lo schermo; eccezioni dichiarate: 1×1 senza icona del tipo, Meteo/Stanza/Costi/Prezzo senza altra forma, «Ventilatore» troncato a 71×71. I controlli sono stati provati con mutazioni del CSS. |
| `interazione.mjs` | Un solo pulsante 151×51 px per tessera; tocco sull'angolo, Invio e dito aprono «Impostazioni del widget» col fuoco dentro, Esc la chiude; Calendario/Attività invariati | PC, non tablet; Esc con tasto vero sul tablet non riprovato (rettificato nella settima passata: Esc chiude anche sul tablet, l'osservazione era un artefatto del selettore `[role=dialog]`). |
| Vitest `CategoryPages` e 10 file correlati | 29/29; 298/298 | |
| `npx vitest run --maxWorkers=4` (suite frontend) | 159 file, 2164/2164, nessun timeout (420 s) | Un giro. |
| `npm run typecheck`, `lint`, `lint:typography` (460 file), `lint:theme-colors` (331 file), `prettier --check` sui file toccati | Superati | Backend, build e `i18n:check` non rieseguiti (nessun file interessato oltre al frontend). |

Non eseguito: banco nuovo, misura e prova sul Tab M11, Esc con tasto vero, prestazioni di `useClearPath`, prova col dito, TalkBack, testo al 125/150%, verticale, app installata, widget associati con entità reali. Dettagli: [REP-20261019-003](reports/REP-20261019-003-issue076-widget-da-collegare.md), sezione «Sesta passata».

## 2026-10-19 — ISSUE-076, rifinitura e banco 0.9.14 (REP-20261019-003)

Ambiente: PC Windows, Vitest con `--maxWorkers=4`, un solo Chromium headless con GPU disabilitata alla volta (mai insieme alla suite), poi il Tab M11 (HA2KZKYB, 1280×665 a DPR 1,5, CDP via `adb forward 9225`, `adb reverse 3002`). Nessun comando a impianti, nessuna credenziale, nessun commit.

| Controllo | Esito | Limiti |
|---|---|---|
| `npm run typecheck`, `lint`, `lint:typography` (460 file), `lint:theme-colors` (331 file), `i18n:check` (4 test) | Superati | |
| `npx vitest run --maxWorkers=4` (frontend) | 159 file, 2166/2166, nessun timeout, nessun rerun (`suite-1.txt`) | Un giro. |
| `npm run build`, `scripts/check-bundle-size.mjs` | Superati; chunk entro i limiti | Avviso non bloccante di chunk vendor sopra 500 kB. |
| Backend, `npm run test -w backend -- --maxWorkers=4` | 17 file, 141/141 | |
| `verifica-browser.mjs` (19 tipi, tre viste, chiaro/scuro, fuori/in modifica) | 228 su 228 in tre disposizioni; 20 su 20 a 390×680 | A testo 125% e 150% **non sono prove superate**: la modalità `FONT` trasforma in note i fallimenti dei controlli a, b, c, g e «forma»; «76/76 e 38/38» delle voci precedenti misurano solo dimensione del pulsante, rosso, parole vietate e ordine di sovrapposizione (rettifica della seconda revisione). Il carattere radice approssima, non è lo zoom di Chrome Android. |
| Seconda revisione sul layout reale del tablet (1280×646, DPR 1,5) | Cinque punti passati a testo 100%; nessun elemento a meno di 8 px dal nome o dal pulsante; rete a zero verso HA e videocamera con controllo positivo | **Due rilievi bassi non corretti:** barra orfana e frammento al bordo a testo 125% (Allarme, Prezzo dell'energia); `visible()` e modalità `FONT` misurano meno di quanto dichiarato. |
| Banco 0.9.14 | Immagine `aca-system:0.9.14` (`sha256:b6b2af01...4995`); healthy; `/api/health` 0.9.14, `/ha/auth/providers` 200 su 127.0.0.1 e 192.168.1.27; copia a freddo di 428218 byte (SHA-256 `5fbe0050...3814`) | Le verifiche sopra non sono state rieseguite dal passo del banco. IPv4 del PC cambiato in 192.168.1.27. |
| Tab M11, schermate (bundle `index-D_SGyR0e.js`, cache svuotata) | Fuori dalla modifica icona e nome del tipo una sola volta in tutte le tessere normali (nome 19 px, senza troncamenti); Allarme con nome e anteprima; pulsante 151×51 px (48×48 px compatte) dentro la tessera, 0 elementi sotto su Videocamera, Multimedia e Sonos; 1×1 con il nome su due righe (30 px) e cerchio 48 px; in modifica «<tipo> / Da collegare» senza pulsante; nessun «Non disponibile», «Spento» o rosso; Calendario, Attività, Orologio e Spaziatore senza pulsante | Falsi allarmi dei controlli: `nameOverBtn` sul Sensore 1×1 (scarto di 1 px del line box) e `shapes0` sulla Stanza (pseudo-elemento non contato), verificati sugli screenshot. |
| Tab M11, tocco e Esc (`Input.dispatchTouchEvent`, `Input.dispatchKeyEvent`) | «Collega» su Ventilatore e su Sensore 1×1 apre «Impostazioni del widget»; Esc la chiude 2 su 2 e «Chiudi» 2 su 2, senza salvare, fuoco sulla maniglia del widget; `localStorage` identico (34 chiavi) | Punto 5 non è un difetto. Dopo la chiusura la sessione di modifica del widget resta attiva (chiusa con «Fine»). Esc con Indietro (`adb input keyevent 111`) non provato. |
| Tab M11, prestazioni (0.9.14 contro 0.9.13, 2 giri) | Scorrimento 73,3-78,1 fps (78,8-82,8); sette categorie 76,2-80,1 fps (79,4-85,4); ritorno a Principale 49,0-52,3 fps (35,7-49,3); entrata in modifica 77,2-78,1 fps; apertura vista pagine 55,9-58,4 fps, picchi 345 ms (57,7-61,2; 333-334); **chiusura 52,1-52,7 fps, picchi 378-389 ms (53,8-58,0; 256-278)**; quiete e uscita 90 fps | Due giri non separano il costo del nuovo codice dal rumore. Picchi della chiusura circa 40-45% più alti: da seguire con ISSUE-062, che resta non rispettato. |

Non eseguito: prova col dito in modifica, TalkBack, zoom vero del testo, verticale, app installata, widget associati con entità reali, Videocamera con rete reale, `release.check.mjs` (manifest della 0.9.10), correzione dei due rilievi bassi. [ISSUE-076](project-status.md#issue-076) resta in attesa dell'utente. Dettagli: [REP-20261019-003](reports/REP-20261019-003-issue076-widget-da-collegare.md), sezione «Rifinitura e banco 0.9.14».

## 2026-10-20 — Widget non associati: widget completo spento con etichetta, ISSUE-075 (REP-20261020-001)

Ambiente: PC Windows, Vitest con `--maxWorkers=4`, un solo Chromium headless con `--disable-gpu --use-angle=swiftshader --disable-gpu-compositing` alla volta (mai insieme alla suite), vite sul PC e fixture senza Home Assistant. **Nessuna prova sul Tab M11**, nessun banco nuovo (il 3002 resta `aca-system:0.9.14`), nessun comando a impianti. Script ed esiti in `backup/rep20261020-001/` (esclusa da Git).

| Controllo | Esito | Limiti |
|---|---|---|
| `npm run typecheck`, `lint`, `lint:typography` (459 file), `lint:theme-colors` (331 file), `prettier --check` sui cinque file toccati | Superati | Typecheck strict su tutto `src`, test inclusi. |
| `npx vitest run --maxWorkers=4` (frontend), dopo l'ultima modifica al codice | 159 file, **2164/2164**, 829 s, nessun rerun (`suite-3.txt`, dopo la revisione); prima della revisione 2162/2162 (`suite-2.txt`) | Una prima suite intermedia 2161/2161 (`suite-1.txt`). Backend non rieseguito (nessun file toccato). |
| `CategoryPages.test.tsx` e `TextAndTrayFixes.test.tsx` | 27/27 e 6/6 | Per i 19 tipi: widget completo senza guasto né rosso, stato per tipo, nessuno stato falso su serratura/allarme/videocamera, etichetta fuori e in modifica, un solo bersaglio «Collega <tipo>», nessun servizio né rete, nessun pulsante grande, `useClearPath` assente; **Allarme senza icona di stato e Serratura mai con un solo tasto in 2×2, 2×1, 1×1 e 1×2 (falliscono senza le regole del CSS)**; bersaglio di Calendario e Attività come prima. |
| Regressione ISSUE-075 senza la correzione | **Fallisce** con `utilities.css` precedente (1 test), supera con la correzione | |
| `verifica-browser.mjs` (adattato ai nuovi criteri), tre disposizioni (originale, una cella, due celle) × 1280×665, 1280×646 con griglia 8×5, 390×844 × chiaro/scuro × fuori/in modifica | **684 misure di tessera, 0 con problemi** (ripetute dopo la revisione con i controlli nuovi su Allarme, Serratura e Stanza) | Etichetta dentro la tessera e leggibile, nessuna sovrapposizione con nome e controlli (più di 3 px per lato; testo `sr-only` e aperture trasparenti esclusi), nessun testo di guasto o di sicurezza, nessun rosso, un solo bersaglio per tessera, rete a 0 verso altri host/HA/videocamera. Note dichiarate: Meteo e serratura 1×1 senza nome, Multimedia/Sonos senza forma nella 2×2 del tablet, tasti attenuati in modifica, etichetta ridotta all'icona sotto 8 rem. Testo al 125/150% non provato. |
| Cinque guasti voluti (`mutazioni.sh`); due guasti nuovi (icona dell'Allarme, tasto singolo della Serratura) | Tutti rilevati; il giro senza guasti 8 tessere, 0 problemi | I due nuovi con `INJECT_CSS` su `verifica-browser.mjs` (`shots-mut/`). |
| `interazione.mjs` (mouse e tastiera veri, 1280×646, chiaro/scuro) | 38/38 | Tocco su centro, etichetta, cornice e comandi apre «Impostazioni del widget», Esc chiude, Tab arriva sul bersaglio con l'anello dentro la tessera, Invio apre; in modifica nessun tocco apre. Non è la prova col dito sul tablet. |
| `issue075.mjs` (Stanza senza dispositivi a 194, 174 e 256 px, chiaro/scuro; `LAYOUT=orig`, `row2`, `row1`) | 2×2: due righe senza tagli in 6 contesti su 6; con la regola precedente (`MUTATE=1`) una riga tagliata in 6 su 6. 2×1 e 1×1 (rettifica della revisione): una riga con l'ellissi in 12 contesti su 12, misure identiche alla regola precedente | Scheda `room_card_*` senza tipo di categoria; una Stanza di categoria associata a un'area reale vuota non provata. Il box del dettaglio resta più basso del testo (17 su 18,7 px sul tablet, 11 px sul telefono) come prima. |

**Terza passata (2026-10-20):** `CategoryPages.test.tsx` + `TextAndTrayFixes.test.tsx` 34/34 (con il `launcher.css` precedente falliscono 2 test); typecheck, lint, tipografia (0 su 459), colori (0 su 331), prettier superati; `run-review2.sh` (3 disposizioni, 684 misure di tessera, **0 problemi**, 0 richieste di rete esterne) e `issue075.mjs` in 3 disposizioni superati; guasti nuovi rilevati (`mutazioni2.sh`: Serratura 1×1 senza nome, Videocamera con «Anteprima»). Suite completa **non rieseguita** in questa passata (ultima: 159 file, 2164/2164). Meteo: provato a nascondere la nuvola, 12 contesti con «nessuna forma del widget», regola tolta (dichiarato). Evidenze in `backup/rep20261020-001/`.

Non eseguito: banco 0.9.15 e misura sul Tab M11 (fluidità: da confrontare con 0.9.13 e 0.9.14; il rilievo di revisione «fluidità non verificata» resta aperto), prova col dito, TalkBack, testo ingrandito, verticale, app installata, widget associati con entità reali. [ISSUE-075](project-status.md#issue-075) corretto nel software; [ISSUE-076](project-status.md#issue-076) in attesa della misura sul tablet. Dettagli: [REP-20261020-001](reports/REP-20261020-001-widget-spenti-stanza.md).

## 2026-10-20 — Banco 0.9.15 e misure sul Tab M11 (REP-20261020-001)

| Controllo | Esito | Note |
|---|---|---|
| `npm run typecheck`, `lint`, `lint:typography` (0 su 459), `lint:theme-colors` (0 su 331), `i18n:check` (4/4) | Superati | Frontend, prima della build. |
| `npx vitest run --maxWorkers=4` (frontend, completa) | 159 file, 2165/2165, 863 s | Da sola, senza browser. |
| `npm run test -w backend -- --maxWorkers=4` | 17 file, 141/141 | |
| `npm run build`, `check-bundle-size.mjs` | Superati | Indice 801,8 KB su 900 KB; avviso Vite su chunk >500 kB (hls 574 kB, indice). |
| Banco 0.9.15 | Healthy, `/api/health` 0.9.15 | Bundle `index-BGkr_FM2.js` con «Da collegare», senza `aca-category-widget__button` né `useClearPath`. Copia a freddo prima. |
| Tab M11, 7 pagine, fuori dalla modifica | Superato | 19 tessere non collegate su 22: widget completi non attenuati, etichetta dentro la tessera, senza sovrapposizioni, senza «Non disponibile», rosso, immagine di videocamera o falso stato di sicurezza; Calendario, Attività, Orologio, Data, Meteo di casa invariati. |
| Tab M11, modifica | Superato | Etichetta in 19 tessere, nessun bersaglio «Collega», uscita riuscita. |
| Tab M11, tocco (`Input.synthesizeTapGesture`) | Superato | Ventilatore 222×195 e Luce 1×1 89×89 aprono «Impostazioni del widget»; chiusura senza salvare. `localStorage` 34 chiavi prima e dopo. |
| Tab M11, prestazioni (0.9.15 contro 0.9.13 e 0.9.14) | Fluidità ai livelli della 0.9.13 | 0.9.15: scorrimento 78,9-84,7 fps (picchi 56-100 ms); sette categorie 80,7-86,0 fps (44-89 ms); apertura vista pagine 57,9 fps (344-367 ms); chiusura 58,1-60,3 fps (200-245 ms); entrata in modifica 81,5-81,8 fps; quiete 90 fps. 0.9.13: 78,8-82,8; 79,4-85,4; apertura 57,7-61,2 (333-334 ms); chiusura 53,8-58,0 (256-278 ms). 0.9.14: 73,3-78,1; 76,2-80,1; apertura 55,9-58,4 (345 ms); chiusura 52,1-52,7 (378-389 ms). Ritorno a Principale 50,9-52,9 fps (max 200-222 ms), non confrontato. `container-type: size` non isolato con prova A/B. Due giri. |

Non eseguito: prova col dito in modifica, TalkBack, testo al 125/150%, verticale, app installata, widget associati con entità reali, criterio storico di ISSUE-062 (frame >50 ms). [ISSUE-062](project-status.md#issue-062) e [ISSUE-076](project-status.md#issue-076) restano da chiudere dopo il controllo dell'utente.

## 2026-10-20 — Widget non associati in grigio (quarta passata, REP-20261020-001)

| Controllo | Esito | Note |
|---|---|---|
| `npx vitest run --maxWorkers=4 src/__tests__/CategoryPages.test.tsx` | 31/31 | 3 test nuovi (grigi, chiusura dei token derivati, TV senza «!» e con «Spento» una volta); con il `launcher.css` precedente falliscono 5 test. |
| `npx vitest run --maxWorkers=4` (frontend, completa) | 159 file, 2168/2168, 452 s | Da sola, senza browser. Backend non rieseguito (nessun file toccato). |
| `npm run typecheck`, `lint`, `lint:typography` (0 su 459), `lint:theme-colors` (0 su 331); `prettier --check` sui due file toccati | Superati | |
| Browser headless, controllo del grigio `k:` (`backup/rep20261020-001b/verifica-browser.mjs`): nessun colore calcolato con saturazione HSL > 15% (e spread dei canali > 20/255) in `color`, sfondi e gradienti, bordi, `outline`, `fill`, `stroke`, `stop-color`, `box-shadow`, `text-shadow`, `filter`, `::before`/`::after`; contrasto del testo ≥ 4,5:1 (3:1 se grande); nessuna icona di avviso; nessuno stato ripetuto | 684 misure di tessera (1280×665, 1280×646 con griglia 8×5, 390×844; chiaro e scuro; fuori e in modifica; originale, una cella, due celle), **0 con problemi**; contrasto minimo fuori dalla modifica 5,01:1 (chiaro) e 6,93:1 (scuro); rete: 0 richieste verso altri host, HA o videocamera | In modifica «Avvia» di Aspirapolvere e Tosaerba (tasto inattivo attenuato al 45% come in ogni widget, 2,41:1 e 3,62:1) è dichiarato, non un guasto (WCAG 1.4.3: componente inattivo). Misura dei colori calcolati, non dei pixel. Solo PC (rasterizzatore software), non Tab M11. |
| Prova con guasti voluti (`mutazioni.sh`, `INJECT_CSS`, chiaro e scuro) | Senza guasto 0 su 19; con ciascun guasto rilevato: testo blu, token blu rimesso, sfumatura blu, tratto blu delle icone, bordo blu, bagliore blu, pseudo-elemento blu, etichetta blu, viola del Kit 2 rimesso, icone blu, riga di stato della TV rimessa (icona di avviso e «Spento» ripetuto), testo grigio a contrasto insufficiente | `esito-mutazioni-light.txt`, `esito-mutazioni-dark.txt`. |
| **Rettifica datata 2026-10-20** alle due righe `k:` sopra (REP-20261020-001, quinta passata): `stop-color` e i `::-webkit-slider-*` risultavano elencati ma **non erano misurati** (gli `<stop>` hanno riquadro 0×0 e venivano scartati; `fill`/`stroke: url(#id)` non contengono colori; `getComputedStyle` dei `::-webkit-slider-*` dà `content: normal`). Ora: i gradienti SVG sono letti risolvendo `url(#id)` (anche via `href`) e leggendo `stop-color` × `stop-opacity`; i `::-webkit-slider-*` non sono misurati (solo i loro token); regola stretta (spread > 3/255, alfa ≥ 0,02) per inchiostro, tratti, bordi, ombre e stop; controllo diretto dei 69 token ridichiarati dalla tessera (croma zero); anello di focus del bersaglio. Trovata e corretta una tinta lieve in scuro (`--k2-light` nelle coppie di ombre, croma 0,01) | Senza guasto 0 su 19 (chiaro e scuro); guasti M1-M18, compresi gradiente SVG blu nel riempimento e nel tratto (via `href`), inchiostro con croma 0,012, bagliore blu con alfa 0,06, anello di focus blu e `--k2-light` con tinta, **tutti rilevati** in chiaro e in scuro (M9 in scuro con `#c8c8c8` dà 0 come atteso). Tre disposizioni complete: 684 misure di tessera, 0 con problemi; `CategoryPages.test.tsx` 31/31 (con il `launcher.css` precedente 1 test fallisce); suite 159 file, 2168/2168; typecheck, lint, tipografia, colori e prettier superati | Limiti: colori calcolati, non pixel; non misurati `::-webkit-slider-*`, immagini, `mask`, `border-image`, cornice e ombra della tessera (domanda aperta, ISSUE-082); le forme con `url(#id)` nei segnaposto reali sono 0 (prova con markup iniettato, `INJECT_SVG`); solo PC, non Tab M11. |

Non eseguito: prova sul Tab M11 (nessun banco nuovo: il 3002 resta `aca-system:0.9.15` con il blu), `interazione.mjs` con eventi veri (tocco e tastiera sulla tessera grigia), TalkBack, testo ingrandito, widget associati con entità reali.

## 2026-10-20 — Banco 0.9.16 e grigio sul Tab M11 (REP-20261020-001)

Il «Non eseguito» della sezione «Widget non associati in grigio» (nessun banco nuovo, nessuna prova sul Tab M11) è superato per questa parte; il testo resta come storico.

| Controllo | Esito | Evidenza |
|---|---|---|
| `typecheck`, `lint`, `lint:typography` (0 su 459), `lint:theme-colors` (0 su 331), `i18n:check` (4/4) | Superati | Prima della build |
| `npx vitest run --maxWorkers=4` (frontend) | 159 file, 2168/2168 | `backup/rep20261020-001b/suite-1.txt` |
| `npm run test -w backend -- --maxWorkers=4` | 17 file, 141/141 | |
| `npm run build`, `scripts/check-bundle-size.mjs` | Superati | vendor-react 177,5 KB su 200 KB |
| Banco 0.9.16 | Healthy; `/api/health` 0.9.16; `/ha/auth/providers` 200 su 127.0.0.1 e 192.168.1.27 | Immagine `aca-system:0.9.16` ID `sha256:d4f8e3e6401a`, creata 2026-10-20T12:22:12Z; bundle `index-vfVqDHyF.js`; copia a freddo prima (SHA-256 `55fbb0e1e89bc24440b3ca21c689a7a173a8912200f941943058fe2d5b0d5a3c`) |
| Tab M11, 19 tessere non collegate, fuori e in modifica | Nessun colore principale (scarto dei canali oltre 20/255), nessun «!», «Non disponibile», rosso, `filter`, `opacity`; etichetta una per tessera; «Spento» al più una volta; un solo «Collega <tipo>» fuori dalla modifica, zero in modifica | `backup/rep20261020-001b/tablet/` |
| Tab M11, tocco | `Input.synthesizeTapGesture` su Ventilatore e Luce 1×1 apre «Impostazioni del widget» | Chiusa senza salvare; `localStorage` 34 chiavi invariate |
| Tab M11, prestazioni (0.9.16 contro 0.9.15) | Scorrimento 76,8-84,6 fps (56-89 ms) contro 78,9-84,7 (56-100); sette categorie 80,7-85,4 (56-111) contro 80,7-86,0 (44-89); apertura vista pagine 57,7-60,7 (322-378) contro 57,9 (344-367); chiusura 56,0-61,6 (267-278) contro 58,1-60,3 (200-245) | Due giri: la chiusura è un po' peggiore, non distinguibile dal rumore; due giri di scorrimento sotto il minimo di 0,9 |

Non eseguito: prova col dito in modifica, TalkBack, testo ingrandito, verticale, app installata, widget associati con entità reali. Residuo noto: tinta azzurrina di fondo del widget e cornice (ISSUE-082).

## 2026-10-20 — Casa 3D, T1: misura della demo NeonPlan 3D sul Tab M11 (REP-20261020-002)

Solo osservazione: demo pubblica dell'autore (`https://neonplan3d.mastershort.de/`, v1.21.0, dati inventati, `hass` simulato) sul Tab M11 TB330FU (Chrome 155, Mali-G52 MC2, 4 GB, 1280×665 a DPR 1,5 in orizzontale); nessuna modifica a codice di Acasystem, banco, Git o Android. Strumenti e risultati in `backup/casa3d-t1/` (escluso da Git). Nessun test di prodotto, build o suite eseguiti (nessun codice modificato).

| Controllo | Esito | Evidenza e limiti |
|---|---|---|
| Avvio a freddo e a caldo | Eseguito: 3 prove per modo | Casa visibile da screencast a circa 2,6 s a caldo e tra 2,5 e 5,19 s a freddo; rAF successivo al primo disegno 2,26-2,54 s (caldo) e 4,6-5,4 s (freddo); scena completa 4,5-5,0 s e 5,7-6,5 s; 535 KB a freddo, 11 KB a caldo. Il «primo disegno» (1,5 s a caldo) non è la casa visibile. A freddo = cache disattivata solo nella scheda; prima visita assoluta non misurata |
| Livelli Auto / Tablet / High: orbita, zoom, riposo | Eseguito: 8 prove per livello e gesto, due ordini | Tablet 58,8 fps (orbita) con 0-2 intervalli >50 ms, ma 33-36 fps nella vista d'insieme; Auto e High 15-21 fps con 13-19 intervalli. Camera non controllata; gesti sintetici; finestre di circa 2,2 s, non 5 s; il criterio di T11 per gesto è rispettato da 11 gesti su 16 a Tablet |
| Editor: apertura, spostamento di un mobile, «3D beside» | Eseguito: 3 prove, 2 passate | Apertura circa 60 ms; spostamento 22-30 fps con fotogrammi fino a 206 ms; «3D beside» circa 4 fps. **Pan del piano non verificato** (3 pointermove su circa 90, nessuno screenshot) |
| Perdita del contesto WebGL | Eseguito: 3 cicli con ripristino, 1 senza | Ripresa in circa 0,5 s dopo `restoreContext()`; senza ripristino vista vuota, nessun messaggio, nessuna ripresa in 20 s. Perdita simulata, non un reset del driver |
| Memoria (PSS di tutti i processi Chrome, heap, MemAvailable) | Eseguito: un campione per stato | +190 MB a Tablet, +240-260 MB a High o dopo cambi, circa +310 MB dopo 5 cambi di livello; heap 10-23 MB; nessun residuo dopo la chiusura. Il PSS include la scheda Acasystem dell'utente (differenze) |
| Verifica indipendente di Opus (sola lettura, senza tablet) | Eseguita | Numeri corrispondenti ai JSON con le imprecisioni elencate nella sezione T1 del report; correzioni applicate |
| Pulizia del tablet | Eseguita | Scheda della demo chiusa; scheda Acasystem dell'utente in primo piano, senza ricarica né accesso al suo `localStorage`; inoltro adb rimosso; nessuna impostazione Android modificata. Resta il `localStorage` della demo (origine esterna) |

Non eseguito: tablet in verticale, telefoni, PC con l'editor, dito reale, tempo GPU, uso per 30 minuti, TalkBack, scena reale e codice di Acasystem, lettura di `antialias` e delle impostazioni per livello, logica di Auto della demo.

## 2026-10-20 — Casa 3D, T2a: copia e rinomina, con le correzioni della revisione (REP-20261020-002)

Comandi eseguiti da `progetto/acasystem/casa3d/` (pacchetto non ancora workspace della radice); log in `backup/casa3d/T2a/` (prima esecuzione) e `backup/casa3d/T2a-correzioni/` (dopo le correzioni). Nessun codice di Acasystem modificato; nessun browser, tablet, banco Docker o suite Vitest usati; nessun commit.

| Controllo | Comando | Esito | Evidenza e limiti |
|---|---|---|---|
| Base di confronto | `node --test "upstream/frontend/src/**/*.test.ts"` | 66 file, 412 test, tutti verdi (prima esecuzione) | `T2a/baseline-upstream-test.log` |
| Test dei sorgenti | `npm test` (`node --test "src/**/*.test.ts"`) | Dopo le correzioni: **66 file, 415 test, 415 verdi, 0 falliti**. Prima: 65 file, 406 test | `T2a-correzioni/verifica-test.log`. Differenza dalla base: −6 test (`diagnostics.test.ts`, tolto con la telemetria) e +9 (`overrides/i18n.test.ts`, test di `i18n.ts`). Le altre patch non hanno un test proprio |
| Tipi | `npm run typecheck` (`tsc --noEmit`, TypeScript 7.0.2, strict) | 0 errori | `T2a-correzioni/verifica-typecheck.log` |
| Marchio, indirizzi, rete | `npm run marchio` e `grep -rliE` del nome originale sull'intero pacchetto | ok su 191 file; nome originale solo nei file che devono nominarlo (`upstream/`, `upstream.sha256`, `NOTICE`, `LICENSE-*`, `UPSTREAM.md`, `PATCHES.md`, `tools/rinomina.mjs`); 0 indirizzi di terzi; 0 API di rete proprie; chiamate per indirizzo solo nei nove file elencati | `T2a-correzioni/verifica-marchio.log`. È un controllo statico per riga: non vede un indirizzo costruito a runtime fuori dai file elencati |
| Ripetibilità | `npm run rinomina` due volte, impronta di `src/`, `lang/` e `PATCHES.md` | identica | `T2a-correzioni/verifica-rinomina.log` |
| Impronte di `upstream/` | controllate da `rinomina.mjs` a ogni esecuzione | 205 file corrispondenti a `upstream.sha256` | |
| Dipendenze | `npm install --save-exact --ignore-scripts @types/node@26.6.4` | un pacchetto cambiato; versioni esatte | `package-lock.json`; elenco in `casa3d/UPSTREAM.md` |

Non eseguito: build (T2b), bundle e peso, prove a runtime in browser, `npm audit`, Vitest, lint e `lint:typography`/`lint:theme-colors` di Acasystem (nessun suo file toccato), prove sul tablet. Copia di sicurezza dello stato corretto: `backup/casa3d/T2a-correzioni/fase2-src-corretta.tar.gz`.

**Nota datata 2026-10-20 (controlli di regressione su Acasystem, eseguiti dopo la sezione sopra; log in `backup/casa3d/T2a/`):** frontend `typecheck`, `lint:typography` (0 su 459 file), `lint:theme-colors` (0 su 331), `i18n:check` (4 su 4), `vitest run --maxWorkers=4` (159 file, 2168 test), `build` e `check-bundle-size` (index 801,8 kB su 900) verdi; backend `test -w backend` (17 file, 141 test) verde. `npm run lint` non ha un esito numerico catturato (era in pipe). Build di `casa3d` non eseguita (nessuno script prima di T2b). La riga «Non eseguito» sopra è storica.

## 2026-10-20 — Casa 3D, T2b: build, servizio e immagine, con le correzioni della revisione (REP-20261020-002)

Comandi dalla radice `progetto/acasystem/` (`casa3d` è ora workspace); log in `backup/casa3d/T2b/`. Vitest con `--maxWorkers=4`, un solo processo pesante per volta. Un Chromium headless (`--disable-gpu --use-angle=swiftshader --disable-gpu-compositing`) per la prova in browser; nessun tablet, nessun banco toccato; nessun commit.

| Controllo | Comando | Esito | Evidenza |
|---|---|---|---|
| Test del pacchetto | `npm run test -w casa3d` | 415 su 415, 0 falliti | `casa3d-test.log` |
| Tipi e marchio | `npm run build -w casa3d` (prebuild: `tsc --noEmit`, `npm run marchio`) | 0 errori; `controlla-marchio` ok su 192 file | `build2.log` |
| Build del pacchetto | `npm run build -w casa3d` | **due build locali riuscite** con manifest identico; la prima era fallita (URL di un commento GLSL, nome di un file di licenza nel manifest) e poi corretta. Budget rispettati: principale 425,3 KB, 3D 778,6 su 780, editor 687,4, viaggio nel tempo 100,0, voce 29,1, extra 20,9 | `build1.log` (fallita), `build2.log`, `build3.log` |
| Backend | `npx vitest run --maxWorkers=4`, `typecheck`, `lint` | 18 file, 150 test verdi (9 nuovi di `casa3dRoutes.test.ts`); 0 errori | `backend-*.log` |
| Frontend | `typecheck` (strict), `lint`, `lint:typography` (0 su 459), `lint:theme-colors` (0 su 331), build, `check-bundle-size` | verdi; `index` 801,8 KB su 900 | `frontend-checks.log`, `frontend-build.log`, `check-bundle-size.log` |
| Service worker | `ServiceWorkerCasa3d.test.ts` (contesto isolato, cache finta) | 7 su 7 | `frontend-sw-test.log` |
| Immagine (prima build) | `docker compose -f progetto/compose.tunet.yaml build`, tag `0.9.16-t2b-prova` | riuscita; `/app/casa3d/dist` con sei bundle, `.LEGAL.txt`, manifest, lingue, avvisi | `docker-build.log`, `docker-image-contents.log` |
| Immagine (dopo la correzione) | stesso comando, tag `0.9.16-t2b-prova2`, `npm ci --ignore-scripts` nello stadio di build | riuscita; npm segnala solo `better-sqlite3` tra i pacchetti con script (esbuild non esegue il `postinstall`); sei bundle con le stesse impronte; tag rimosso | `docker-build-ignore-scripts.log`, `Dockerfile.corretto` |
| Prova in browser | `smoke-browser.mjs` su un backend locale (porta 3099, chiuso a fine prova) con la build di produzione | principale e cinque bundle da `/casa3d/` con la CSP dell'app; definiti `fp3d-view3d`, `fp3d-room-panel`, `fp3d-editor`; `lang/en.json` (1806 testi); 11 richieste, tutte alla stessa origine; nessun errore di console né violazione della CSP; nome vecchio e cartella: 404 | `smoke-browser.log` |
| Terminazioni di riga | `git diff --stat -- package.json package-lock.json` dopo il ritorno a LF | 9 e 645 righe (prima: 53 e 17.343 per i CRLF); JSON valido | rettifica in REP-20261020-002 |

Non eseguito: suite completa di Vitest del frontend (di Acasystem è toccato solo `sw.js`; era verde in T2a, 2168 test), Playwright E2E, tablet e banco, `npm audit`, prova del service worker in un browser reale, avvio del contenitore dell'immagine, prova a runtime di `better-sqlite3` nell'immagine dopo `--ignore-scripts` (stadio finale invariato). Copie: `fase1-pacchetto-build.tar.gz`, `fase2-servizio-docker.tar.gz`, `package*.json.lf-corretto`.

## 2026-10-20 — Casa 3D, T3: adattatore in sola lettura e pagina di prova (REP-20261020-002)

Comandi dalla radice `progetto/acasystem/` (frontend e `casa3d`); log in `backup/casa3d/T3/`. Vitest con `--maxWorkers=4`, un solo processo pesante per volta. Un Chromium headless (`--disable-gpu --use-angle=swiftshader --disable-gpu-compositing`) per la prova in browser; **nessun tablet, nessun banco toccato**; nessun commit.

| Controllo | Comando | Esito | Evidenza |
|---|---|---|---|
| Adattatore, loader, hook, pagina, rotta | `npx vitest run --maxWorkers=4 src/__tests__/Casa3d*` (frontend) | 4 file nuovi, tutti verdi; forma dell'oggetto, `entity_picture` sotto `/ha`, utente nullo = non admin, `callService` e comandi di scrittura rifiutati, registri con admin / un registro rifiutato / tutti rifiutati, piano d'esempio e pin, loader, pagina in Light | file di test in `frontend/src/__tests__/` |
| Suite completa del frontend | `npx vitest run --maxWorkers=4` | 164 file, **2229 test**, tutti verdi (prima 159 e 2168; rettifica 2026-10-20: dei 61 test in più, 54 sono di T3 (4 file `Casa3d*`) e 7 di `ServiceWorkerCasa3d.test.ts`, di T2b) | `suite.txt` |
| Pacchetto | `npm run test -w casa3d`, `typecheck`, `npm run marchio -w casa3d`, `npm run rinomina` | 422 su 422 (415 + `hass-contract.test.ts` e `esempio.test.ts`); 0 errori; marchio ok su 196 file; rigenerazione ripetibile. Il controllo dei tipi del contratto fallisce con una modifica voluta (1 errore) e torna a 0 | `casa3d-test.log`, `casa3d-build.log` |
| Frontend, controlli statici | `typecheck` (strict), `lint`, `lint:typography` (0 su 466 file), `lint:theme-colors` (0 su 331), `prettier --check` sui file nuovi | verdi | `typecheck.log`, `lint.log`, `lint-typography.log`, `lint-theme-colors.log`, `prettier.log` |
| Build | `npm run build -w frontend`, `node scripts/check-bundle-size.mjs`, `npm run build -w casa3d` | `index` 802,2 KB su 900 (la pagina di prova è un blocco a parte, 16 KB); bundle di `casa3d` con le stesse impronte e gli stessi pesi di T2b (3D 778,6 su 780) | `frontend-build.log`, `check-bundle-size.log` |
| Prova in browser, admin | backend locale (porta 3099, build di produzione) + Home Assistant finto (`mock-ha.mjs`, porta 38123, token di prova), `prova-browser.mjs`, viewport 1280×665 | bundle caricato da `/casa3d/`; sei stanze, cinque legate alle aree, nove pin con gli stati e pannello stanza (21,5 °C, 48 %); `quality = low`; `callService` rifiutato e riportato in pagina; 23 richieste, tutte alla stessa origine; **nessun `call_service`** inviato; nessun errore di console né di pagina; 4 avvisi del driver GL «GPU stall due to ReadPixels» (renderer software), solo all'avvio | `prova-browser/admin.json`, `admin-1-vista.png`, `admin-2-dopo-tocchi.png`, `sonda-readpixels.mjs` |
| Prova in browser, non admin | stessa prova con `test-guest` | «Utente: non amministratore», stesso esito | `prova-browser/guest.json` |
| Prova in browser, non admin con registri rifiutati | il finto Home Assistant risponde `unauthorized` ai registri delle aree e dei dispositivi per chi non è admin | la vista si apre, «non letti: areas, devices», nessuna stanza legata né pin, nessun errore | `prova-browser/guest-registri-rifiutati.json` |
| Registri di Home Assistant 2026.9.4 | lettura del sorgente (`config/entity_registry.py`, `area_registry.py`, `floor_registry.py`, `device_registry.py`, `helpers/entity_registry.py` del tag 2026.9.4 su `raw.githubusercontent.com`, riassunte dallo strumento di lettura delle pagine) | i quattro comandi `list` usati non hanno `require_admin`; forma compatta di `list_for_display` confermata (ultime 8918 lettere di `helpers/entity_registry.py` non lette) | REP-20261020-002, sezione T3 |

**Non eseguito:** fase «banco» (nessuna copia a freddo, nessun cambio di `progetto/.env`, nessuna immagine: il banco resta `aca-system:0.9.16`); **«stanze e stati reali sul banco» e un utente non amministratore vero** (servono l'accesso dell'utente e un secondo account; le prove usano dati finti con le forme documentate); Docker, tablet, Playwright E2E del frontend, `npm audit`, browser con la GPU. Un tentativo di leggere il codice sorgente di Home Assistant dal contenitore (`docker exec`) è stato negato dal sistema di autorizzazioni e non è stato aggirato: la fonte è il sorgente pubblico del tag. Copie: `fase1-adattatore.tar.gz`, `fase2-pagina-rotta-docs.tar.gz`, file prima delle modifiche in `pre/`.

## 2026-10-20 — Casa 3D, T3: fase «banco» 0.9.17 e Tab M11 (REP-20261020-002)

Verifica successiva alla sezione precedente (stesso incarico). Evidenze in `backup/casa3d/T3-banco/` e `backup/casa3d/T3/` (log).

| Controllo | Comando o procedura | Esito | Evidenza |
|---|---|---|---|
| Controlli del PC prima dell'immagine | `typecheck`, `lint`, `lint:typography`, `lint:theme-colors`, `i18n:check`, Vitest frontend `--maxWorkers=4`, Vitest backend, `npm run test -w casa3d`, build frontend e `casa3d`, `check-bundle-size.mjs` | Superato: 164 file / 2229 test; backend 18 file / 150 test; `casa3d` 422; `index` 802,2 KB su 900; marchio ok su 196 file | `backup/casa3d/T3/` (`suite.txt`, `build.txt`, `backend.txt`, `casa3d-test.txt`, `casa3d-build.txt`) |
| Banco 0.9.17 | copia a freddo, `ACASYSTEM_VERSION=0.9.17`, `docker compose up -d --build` | Superato: immagine `aca-system:0.9.17`, in salute dopo circa 24 s; `/api/health` 0.9.17; `/ha/auth/providers` 200 su 127.0.0.1 e 192.168.1.27; `/casa3d/manifest.json` 200; bundle 200 (797236 byte); `/casa3d/` 404 per scelta; log senza errori | `backup/casa3d/T3-banco/`; copia a freddo SHA-256 `a9332c3a221765c430c07caa5b83d623dd1397037585b6497bd5e62a30eb4652` |
| Tab M11, amministratore, Home Assistant vero | `adb reverse`, CDP sulla 9225, `#/casa3d-prova`, `prova.cjs` | Superato: 6 stanze (3 legate ad aree), Light (`low`), 3 aree / 4 dispositivi / 15 entità / 18 stati, `callService` rifiutato, 0 `call_service`, 0 richieste a terzi, 0 messaggi di console; `localStorage` del launcher invariato | `prova-risultato.json`, `tablet-casa3d-prova.png`, `ls-prima.json`, `ls-dopo.json` |

**Non eseguito o con limiti:** utente non amministratore vero (ISSUE-090); pin e luci nelle stanze (0 dispositivi collocati con i dati reali); misura della fluidità e prova al tocco sul tablet; lettura dei file dei registri di Home Assistant (`docker exec` negato, non aggirato); Playwright E2E, `npm audit`, TalkBack. Il criterio «Fatto quando» di T3 è soddisfatto per l'amministratore, non per un non amministratore vero.

## 2026-10-20 — Casa 3D, T4a: guscio della pagina (REP-20261020-002)

Comandi dalla cartella `progetto/acasystem/frontend` (salvo `casa3d`); log, script e schermate in `backup/casa3d/T4a/`. Vitest con `--maxWorkers=4`, un solo processo pesante per volta. Un solo Chromium headless (`--disable-gpu --use-angle=swiftshader --disable-gpu-compositing`, 1280×665, tocco) sul PC, su un backend locale (porta 3099, build di produzione, base dati di prova in `backup/casa3d/T4a/data-4`) collegato a un Home Assistant finto (`mock-ha.mjs`, porta 38123, token di prova); server e browser chiusi a fine prova. **Nessun tablet e nessun banco toccati**; nessun commit.

| Controllo | Comando | Esito | Evidenza |
|---|---|---|---|
| Migrazione e tipo | `npx vitest run src/__tests__/Casa3dMigration.test.tsx` | Superato: 14 test (tipo, validatore, identità, registro, `installCasa3dPage`, controller: profilo nuovo, profilo esistente, ricarica dopo la rimozione, riordino) | `Casa3dMigration.test.tsx` |
| Guscio: Riposo, Vista, sospensione, caricamento anticipato | `npx vitest run src/__tests__/Casa3dShell.test.tsx` | Superato: 13 test (a riposo nessuna vista; 500 ms prima di crearla; scorrimento che passa sopra non crea nulla; modifica e vista pagine non la creano mai; nascosta fuori scena e rilasciata dopo 60 s; stessa vista se si torna entro il minuto; `modulepreload` solo con la pagina accanto; elenco stanze; tempi di `useCasa3dMounted`; link `modulepreload` con gli indirizzi dell'`import()`, nessun doppione, nome fuori cartella ignorato) | `Casa3dShell.test.tsx` |
| Suite completa del frontend | `npx vitest run --maxWorkers=4` | **166 file, 2256 test**, tutti verdi (prima 164 e 2229) | `frontend-suite.txt` |
| Controlli statici | `npm run typecheck`, `npm run lint`, `npm run lint:typography`, `npm run lint:theme-colors`, `npx prettier --check` sui file toccati | Superato: tutti verdi, 0 violazioni | `typecheck.txt`, `lint.txt`, `lint-typography.txt`, `lint-theme-colors.txt`, `prettier.txt` |
| Pacchetto `casa3d` | `npm test -w casa3d` (dalla radice) | 422 su 422 (nessun file del pacchetto toccato) | `casa3d-test.txt` |
| Build e peso | `npm run build`, `node scripts/check-bundle-size.mjs` | Superato: `index` 803,5 KB su 900 (prima 801,8); `Casa3dPage` 3,1 KB e `Casa3dVista` 1,4 KB in blocchi propri | `frontend-build.txt`, `check-bundle-size.txt` |
| Pagina in un browser, contatore dei contesti WebGL | `node shell-browser.mjs http://127.0.0.1:3099 ./browser` (con `NODE_PATH` della radice) | Superato: **34 controlli su 34**, uscita 0. Ultima pagina e una sola; a riposo 0 contesti e 0 viste; nessun `modulepreload` di `/casa3d/` da lontano, due da accanto; vista pagine e spostamento della pagina con Alt+freccia: 0 contesti; vista viva: 1 vista e **1** contesto; il pulsante è alto 57,6 px; la vista non prende il puntatore e uno scorrimento col dito sposta il pager; modifica sulla pagina: Riposo, vista nascosta, nessun nuovo contesto; fuori scena un minuto: elemento rimosso, nessun contesto in più; nuova visita: 2 contesti in tutto; tutte le richieste alla stessa origine; nessun `call_service`; nessun errore di console oltre due avvisi noti (4 «GPU stall due to ReadPixels» e il `409` di `PUT /api/settings/current`) | `browser-esito.txt`, `browser/shell-browser.json`, `browser/*.png` |
| Il 409 non è della pagina | `node conflitto-409-confronto.mjs casa` e `nocasa` | Superato come confronto: stesso `PUT 409` seguito da `200` spostando «Casa 3D» o «Energia» (ISSUE-094) | `conflitto-409-confronto.mjs` |

**Rettifica della revisione (2026-10-20):** il controllo `prettier --check` della riga «Controlli statici» non valeva per `src/@types/launcher.ts`, riscritto con CRLF; riportato a LF, `prettier --check` sui file delle due fasi, `typecheck`, `lint`, `lint:typography` (0 su 476) e `lint:theme-colors` (0 su 332) sono verdi di nuovo (log rigenerati). Dopo le correzioni (fine riga, `legacyPageKind` solo dal tipo, anteprima `aria-hidden` con la vista viva) sono rieseguiti 21 file e 429 test (`Casa3d*`, `LauncherLayout`, `Launcher*`), verdi; suite completa e `shell-browser.mjs` non rieseguiti. T4a è «fatta per i criteri automatizzabili, criteri sul tablet aperti».

**Non eseguito o con limiti:** TalkBack e testo ingrandito al 125 e 150% (prove umane); Tab M11 e ISSUE-062 (non misurati); fluidità e tempo di avvio della vista; trascinamento della scheda con il dito; service worker in un browser reale (cache `tunet-casa3d-v1` non ispezionata); banco 0.9.17 (non contiene T4a); un utente non amministratore vero (ISSUE-090). Lo scorrimento col dito è un gesto sintetico del protocollo DevTools nel Chromium senza GPU: il pager non si aggancia a metà strada (la misura è lo spostamento di `scrollLeft`: 719 px nella prova finale), non la pagina di arrivo. I due avvisi di console sono noti: gli `ReadPixels` vengono da T3 (origine non identificata, per T5), il `409` è ISSUE-094.

## 2026-10-20 — Casa 3D, T4b: gesti Vista/Esplora (REP-20261020-002)

Comandi dalla cartella `progetto/acasystem/frontend` (salvo `casa3d`); log, script e schermate in `backup/casa3d/T4b/`. Vitest con `--maxWorkers=4`, un solo processo pesante per volta. Un solo Chromium headless (`--disable-gpu --use-angle=swiftshader --disable-gpu-compositing`, 1280×665, tocco del protocollo DevTools) sul PC, su un backend locale (porta 3099, build di produzione, base dati di prova in `backup/casa3d/T4b/data`) collegato a un Home Assistant finto (`../T4a/mock-ha.mjs`, porta 38123, token di prova); server e browser chiusi a fine prova. **Nessun tablet e nessun banco toccati**; nessun commit.

| Controllo | Comando | Esito | Evidenza |
|---|---|---|---|
| Regole della tastiera | `npx vitest run src/__tests__/Casa3dExploreKeys.test.ts` | Superato: 6 test, con una vera shadow root (il `target` alla finestra è l'elemento della vista, le regole leggono `composedPath()`) | `vitest-mirati.txt` |
| Esplora nella pagina | `npx vitest run src/__tests__/Casa3dExplore.test.tsx` | Superato: 15 test (tocco che entra; scorrimento, pressione lunga e `pointercancel` che non entrano; blocco del pager; pulsanti; Esc; Esc con un `dialog` aperto; Delete e Ctrl+Z; 60 s; indicatore; pagina che esce e modifica; elenco stanze; cronologia). Messi alla prova togliendo `stopPropagation` e `usePageLock`: 5 falliscono | `vitest-mirati.txt` |
| Vitest mirati | `npx vitest run --maxWorkers=4 src/__tests__/Casa3d src/__tests__/Launcher src/__tests__/Pager src/__tests__/OverviewPan src/__tests__/FixLauncher` | Superato: 34 file, 562 test alla seconda esecuzione; alla prima un `waitFor` scaduto sotto carico (561 su 562), non ripresentato | `vitest-mirati.txt` |
| Suite completa del frontend | `npx vitest run --maxWorkers=4` | **168 file, 2277 test**, tutti verdi (prima 166 e 2256) | `frontend-suite.txt` |
| Controlli statici | `npm run typecheck`, `npm run lint`, `npm run lint:typography`, `npm run lint:theme-colors`, `npx prettier --check` sui file toccati | Superato: tutti verdi, 0 violazioni (479 e 332 file analizzati); nessun file con CR | `typecheck.txt`, `lint.txt`, `lint-typography.txt`, `lint-theme-colors.txt`, `prettier.txt` |
| Pacchetto `casa3d` | `npm test -w casa3d` (dalla radice) | 422 su 422 (nessun file del pacchetto toccato) | `casa3d-test.txt` |
| Build e peso | `npm run build`, `node scripts/check-bundle-size.mjs` | Superato: `index` 803,8 KB su 900 (prima 803,5); `Casa3dPage` 6,3 KB (prima 3,1) | `frontend-build.txt`, `check-bundle-size.txt` |
| Gesti nel browser | `node gesti-browser.mjs http://127.0.0.1:3099 ./browser` (con `NODE_PATH` della radice) | Superato: **39 controlli su 39**, uscita 0. Swipe che cambia pagina a riposo e in Vista; in Esplora `is-locked`, nessun cambio di pagina, azimut della camera e raggio cambiati da tocco e rotella; pressione lunga: in Vista apre la vista pagine, in Esplora no; Esc, Delete, Backspace, Ctrl+Z; uscite con «Fine», tasto indietro, indicatore, 60 s (con un tocco a 40 s), pagina che esce, tastiera; «Fine» alto 57,6 px; una voce di cronologia messa e tolta; al più un contesto WebGL; tutte le richieste alla stessa origine; nessun `call_service`; nessun errore di console oltre i 4 avvisi `GPU stall due to ReadPixels` | `browser-esito.txt`, `browser/gesti-browser.json`, `browser/esplora.png` |

**Non eseguito o con limiti:** dito vero e Tab M11 (ISSUE-062 non misurato); zoom a due dita (provata la rotella); TalkBack con Esplora e testo ingrandito al 125 e 150% (prove umane); Esc in un campo di testo della vista (nessun campo visibile in modalità `clean`: solo test unitari); modalità sviluppo con `StrictMode`; il banco 0.9.17 (non contiene T4a né T4b); l'azione della pressione lunga della vista in Esplora. Delete, Backspace e Ctrl+Z non hanno gestori nel launcher: la prova del browser verifica l'invariante, i test unitari la regola.

## 2026-10-20 — Casa 3D, T4b: correzioni dopo la revisione (REP-20261020-002)

Comandi dalla cartella `progetto/acasystem/frontend`; log e script in `backup/casa3d/T4b/rettifica/`. Vitest con `--maxWorkers=4`, un solo processo pesante per volta; un solo Chromium headless (`--disable-gpu --use-angle=swiftshader --disable-gpu-compositing`, 1280×665) su un backend locale (porta 3099, copia della base dati di prova in `rettifica/data`) con il finto Home Assistant (`../T4a/mock-ha.mjs`, porta 38123, token di prova); server e browser chiusi a fine prova. Nessun tablet, banco o commit.

| Controllo | Comando | Esito | Evidenza |
|---|---|---|---|
| Tocco durante lo scorrimento del pager | `npx vitest run src/__tests__/Casa3dExplore.test.tsx` | Superato: 16 test (1 nuovo). Con `pagerMoving` spenta il test nuovo fallisce (provato) | `vitest-casa3d.txt` |
| Vitest `Casa3d*` | `npx vitest run --maxWorkers=4 src/__tests__/Casa3d` | Superato: 8 file, 103 test | `vitest-casa3d.txt` |
| Controlli statici | `npm run typecheck`, `npm run lint`, `npm run lint:typography`, `npm run lint:theme-colors`, `npx prettier --check` sui file toccati | Superato: 0 violazioni (479 e 332 file) | `typecheck.txt`, `lint.txt`, `lint-typography.txt`, `lint-theme-colors.txt`, `prettier.txt` |
| Build e peso | `npm run build`, `node scripts/check-bundle-size.mjs` | Superato: tutti i chunk entro i limiti | `frontend-build.txt`, `check-bundle-size.txt` |
| Gesti nel browser | `node gesti-browser.mjs http://127.0.0.1:3099 ./rettifica/browser` (con `NODE_PATH` della radice) | Superato: **40 controlli su 40**, uscita 0. Partenza da `#/`; D4, G2 e I2 con hash e indice del router uguali prima, durante e dopo Esplora; O1 con un solo contesto WebGL (misurato 1); C4 nuova | `browser-esito.txt` |

**Rettifica alla registrazione di T4b (sopra):** Canc, Backspace e Ctrl/Cmd+Z fermati sulla guaina non raggiungono i gestori **in bolla** di `window` e `document` né i `onKeyDown` di React; i gestori **in cattura** della finestra (`LauncherScreen`, `usePageDrag`, `useWidgetDrag`, `IconAction`) li ricevono comunque. Oggi nessuno li usa.

**Non eseguito o con limiti:** il tocco che ferma il pager con un dito vero (C4 nel browser passa anche senza la correzione: il tocco sintetico non riproduce il caso; la prova che distingue è il test unitario); B1 falliva nella prima esecuzione per uno swipe entro ~100 ms da uno scorrimento programmatico (indipendente dalla correzione, provato con la build senza di essa), ora lo script aspetta 200 ms (`browser-esito-prima-esecuzione.txt`); TalkBack con la nuova regione viva; la voce di cronologia orfana aprendo Sistema da Esplora (ISSUE-097, non provata); il Tab M11 e il banco.

**Annotazione 2026-10-20 (T4b, larghezza frazionaria del pager):** `pagerMoving` usa ora `getBoundingClientRect().width` invece della `clientWidth` arrotondata; `Casa3dExplore.test.tsx` passa a 17 test (caso 411,43 px, indice 9). Controlli finali dal frontend: `npx vitest run --maxWorkers=4` **168 file, 2279 test verdi**; `npm run typecheck`, `npm run lint`, `lint:typography` (0 su 479), `lint:theme-colors` (0 su 332), `npm run i18n:check` (4/4), `npm run build` e `check-bundle-size` (`index` 803,8 KB su 900) verdi; backend `npm run test -w backend -- --maxWorkers=4` 18 file e 150 test; `npm run test` di `casa3d` 422 su 422 e `npm run build` di `casa3d` (196 file, 6 bundle 2041,1 KB entro i limiti). Log in `backup/casa3d/T4b/`. Non eseguito: browser con viewport o zoom frazionari, Tab M11, banco.

## 2026-10-20 — Casa 3D, T5: qualità e contesto (REP-20261020-002)

Comandi dalla cartella `progetto/acasystem/frontend` (salvo `casa3d`); log, script e schermate in `backup/casa3d/T5/`. Vitest con `--maxWorkers=4`, un solo processo pesante per volta. Un solo Chromium headless (`--disable-gpu --use-angle=swiftshader --disable-gpu-compositing`, 1280×665, DPR 1,5, tocco del protocollo DevTools) sul PC, su un backend locale (porta 3099, build di produzione, base dati di prova in `backup/casa3d/T5/data`) collegato a un Home Assistant finto (`mock-ha.mjs`, porta 38123, token di prova); server e browser chiusi a fine prova. **Nessun tablet e nessun banco toccati**; nessun commit.

| Controllo | Comando | Esito | Evidenza |
|---|---|---|---|
| Livelli e regola dei fotogrammi | `npm test` in `casa3d` (`viewer/quality.test.ts`) | Superato: 12 test (tre livelli, nomi sconosciuti e «auto» e «low» = Light, rapporto pixel 1 / 1,25 / 2, nomi del viaggio nel tempo, distanza fra i fotogrammi a 60, 90 e 120 Hz) | `casa3d/src/viewer/quality.test.ts` |
| Pacchetto `casa3d` | `npm run rinomina`, `npm run typecheck`, `npm test`, `npm run build` | Superato: **434 su 434** (prima 422); `marchio` ok; sei bundle nei budget (3D **779,9 KB su 780**, prima 778,6; principale 425,6 su 620; editor 687,4 su 840) | terminale; `PATCHES.md` (P104-P128) |
| Quality, picker, copia nelle impostazioni, regola del contesto | `npx vitest run src/__tests__/Casa3dQuality.test.tsx` | Superato: 37 test (valore salvato e ricarica, browser che rifiuta di scrivere, scheda che cambia, dispositivo debole e conferma di High, snapshot senza e con la sezione `device`, mai da un profilo, regola di `contextGuard` con tre perdite restituite, perdita dopo una vista rifatta, cinque perdite, «Riprova», attesa di 5 s) | `frontend-suite.txt` |
| Pagina: menu, perdite, messaggi | `npx vitest run src/__tests__/Casa3dQualityPage.test.tsx` | Superato: 14 test (partenza da Light e dal valore salvato, menu che cambia livello senza rifare la vista, tre perdite restituite, contesto che non torna e vista rifatta in Light con il livello salvato intatto, anteprima statica e «Riprova», vista che non si può creare, Esplora che finisce, offerta di Light, tocco su un messaggio che non entra in Esplora). Messo alla prova togliendo `.c3d-notice` dai bersagli: il test fallisce | `frontend-suite.txt` |
| Vista: eventi e livello | `npx vitest run src/__tests__/Casa3dVista.test.tsx` | Superato: 7 test (livello e `statsEvents`, stesso elemento al cambio di livello, nuovo elemento a ogni `generation`, `context-state`, offerta una volta sola, il conteggio riparte e il riposo non conta) | `frontend-suite.txt` |
| Sistema | `npx vitest run src/__tests__/SystemPage.test.tsx` | Superato: 19 test (la sezione «Casa 3D» e la scelta salvata) | `frontend-suite.txt` |
| Suite completa del frontend | `npx vitest run --maxWorkers=4` | **171 file, 2338 test**, tutti verdi (prima 168 e 2279: +3 file e +59 test); durata 572 s | `frontend-suite.txt` |
| Controlli statici | `npm run typecheck`, `npm run lint`, `npm run lint:typography`, `npm run lint:theme-colors`, `npx prettier --check` sui file toccati | Superato: tutti verdi, 0 violazioni (484 e 333 file analizzati) | terminale |
| Build e peso | `npm run build -w frontend`, `node scripts/check-bundle-size.mjs` | Superato: `index` 806,4 KB su 900 (prima 803,8); `Casa3dPage` 9,4 KB; `Casa3dVista` 1,9 KB | terminale |
| Livelli, contesto e scelta salvata nel browser | `node qualita-browser.mjs http://127.0.0.1:3099 ./browser 1.5` (con `NODE_PATH` della radice) | Superato: **36 controlli su 36**, uscita 0. Light a rapporto pixel 1 (buffer 1224 px = CSS), Medium 1,25, High 1,5; sei cambi di livello (Medium, High, Medium, Light, High, Light) con un solo contesto vivo e il vecchio già perso, primo disegno dopo 509-709 ms e al più 369 ms di thread bloccato (renderer software); `stats` solo sopra Light; fotogrammi in Light distanti almeno 31 ms (Medium 10 ms); tre perdite restituite (messaggio dopo 4-24 ms, vista di nuovo dopo 227-228 ms, nessun contesto nuovo); perdita senza ripristino (messaggio dopo 6 ms, vista rifatta in Light dopo 5,25 s, livello salvato intatto, nota nel menu); perdita dopo una vista rifatta (anteprima statica, nessun contesto vivo, «Riprova»); scelta dal menu e da Sistema, richiesta `PUT /api/settings/current` con `device.casa3dQuality`, ricarica che mantiene Medium; browser pulito che riparte da Light; dispositivo con 4 GB (High chiede conferma, «Annulla» non cambia, «Passa a High» sì); tutte le richieste alla stessa origine (salvo le tessere della mappa di Sistema); nessun `call_service`; nessun errore o avviso di console oltre i 4 `ReadPixels` | `browser-esito.txt`, `browser/qualita-browser.json`, `browser/spaziatura.json`, `browser/cambi-livello.json`, `browser/*.png` |
| Origine degli avvisi `ReadPixels` | `node readpixels-origine.mjs http://127.0.0.1:3099 light ./readpixels-origine-light.txt` (e `high`) | Trovata: la sola lettura indietro nel percorso è `texSubImage2D` con un canvas 2D (8×32 in Light; più 1024×1024, 768×512 e 64×64 sopra Light), seguita dai 4 avvisi del driver software | `readpixels-origine-light.txt`, `readpixels-origine-high.txt` |
| Programma di misura per il tablet | `node misura-tablet.mjs ./misura-pc --gestures=2 --seconds=2` contro un Chromium senza GPU con la porta DevTools aperta (`browser-cdp-pc.mjs`) | Superato: completa senza errori (gesti, cambi, tre perdite e una senza ripristino, ricarica). I numeri del renderer software non valgono per il tablet | `misura-pc.log`, `misura-pc/misura-tablet.json` |

**Non eseguito o con limiti:** il Tab M11 e il banco (Light entro i criteri di T11, Medium e High senza blocchi sul tablet, perdite e ripristini sul tablet, preferenza dopo la ricarica sul tablet, ISSUE-062, PSS); telefoni, verticale e PC con GPU vera; TalkBack sul menu e sui messaggi e testo al 125 e 150% (prove umane); una perdita reale del contesto (simulata con `WEBGL_lose_context`); più utenti sullo stesso browser. La Light del PC (circa 29 fps in un gesto) è software: non dice nulla sul tablet. Il blocco su D16, ISSUE-091 e D18 non è risolto (T5 eseguita oltre, come T4a e T4b).


## 2026-10-20 — Casa 3D, T5: seconda revisione (REP-20261020-002, «Seconda rettifica»)

Annotazione datata; copie in `backup/casa3d/T5-fix2/`. Vitest con `--maxWorkers=4`, nessun browser né tablet.

| Controllo | Comando | Esito | Evidenza |
|---|---|---|---|
| Round trip di sincronizzazione con snapshot veri | `npx vitest run src/__tests__/useSettingsSyncDevice.test.ts` (in `frontend`) | Superato: 5 test (righe di un altro dispositivo seguite da altre, con livelli diversi, con il solo altro o il solo questo dispositivo, modifica locale vera che blocca, blocco proprio inviato). Con `withoutDeviceBlock` neutralizzato 4 su 5 falliscono | terminale |
| Sincronizzazione, qualità, pagina | `npx vitest run src/__tests__/useSettingsSync.test.ts src/__tests__/Casa3dQuality.test.tsx src/__tests__/Casa3dQualityPage.test.tsx` insieme al precedente | Superato: 87 su 87 (azione `released` nel riduttore e perdita a pagina nascosta con un minuto fuori nella pagina) | terminale |
| Tipi e stile | `npx tsc -p tsconfig.strict.json --noEmit`, `eslint` e `prettier --end-of-line auto --check` sui file toccati | Superato (eslint ignora i file di test per configurazione) | terminale |
| Pacchetto `casa3d` | `node tools/rinomina.mjs`, `npm run typecheck`, `npm run marchio`, `npm test`, `npm run build` | Superato: 438 su 438; `marchio` ok; sei bundle nei budget (3D 780,0 KB su 780) | terminale |
| Nuovo tentativo di `load3d` dopo un errore | nessuno | **Non eseguito:** prova in Chromium con richiesta prima bloccata e poi consentita; patch solo tipizzata e compilata | - |

## 2026-10-21 — Casa 3D, T5: banco 0.9.18 e Tab M11 (REP-20261020-002, «T5 — esito del banco»)

Annotazione datata. Evidenze e script in `backup/casa3d/T5-banco/`. Vitest con `--maxWorkers=4`, un solo processo pesante per volta; il tablet e le suite non sono stati usati insieme.

| Controllo | Comando | Esito | Evidenza |
|---|---|---|---|
| Frontend: tipi, lint, tipografia, colori, i18n | `npm run typecheck`, `npm run lint`, `npm run lint:typography`, `npm run lint:theme-colors`, `npm run i18n:check` (in `frontend`) | Superato: 0 errori; 0 violazioni su 485 e 333 file; i18n 4 test su 4 | terminale |
| Suite completa del frontend | `npx vitest run --maxWorkers=4` | Superato: **172 file, 2355 test**, circa 936 s, nessun timeout | `backup/casa3d/T5/suite.txt` |
| Build e peso | `npm run build`, `node scripts/check-bundle-size.mjs` | Superato: `index` 806,9 KB su 900; avviso Vite sui chunk oltre 500 kB (`index` 826 kB, 244 kB gzip) | terminale |
| Backend | `npm run test -w backend -- --maxWorkers=4` | Superato: 18 file, 150 test | terminale |
| Pacchetto `casa3d` | `npm run typecheck`, `npm test`, `npm run marchio`, `npm run build` | Superato: 438 su 438; marchio ok su 200 file; sei bundle nei budget, 2043,1 KB in tutto (3D 780,0 KB su 780, al limite) | terminale |
| Banco | `docker compose up -d --build` dopo copia a freddo | Superato: `aca-system:0.9.18` in salute; `/api/health` 0.9.18; `/ha/auth/providers` 200 su 127.0.0.1 e 172.20.10.6; `/casa3d/manifest.json` 0.9.18; log senza errori | `T5-banco/build.txt` |
| Tab M11, Light | `misura-sintetica.mjs` (gesti `Input.synthesize*Gesture`, 8 per tipo da 5 s dalla vista d'insieme, camera azzerata) | Superato: **30 gesti su 32 (94%)**, obiettivo ≥90%; orbita 45-59 fps, pizzico 40-56 fps; 9 chiamate di disegno; rapporto pixel 1 | `T5-banco/misura2/`, `misura3/` |
| Tab M11, Medium e High | stesso programma | Selezionabili, blocco massimo 476 ms; **non fluidi** (circa 24 fps orbita, 21 pizzico); ritorno a Light 175-204 ms | `T5-banco/misura2/`, `misura3/` |
| Tab M11, perdita del contesto | stesso programma | Superato: tre perdite con ripristino (messaggio 71-89 ms, vista 272-396 ms); perdita definitiva: vista rifatta in Light dopo circa 5,4 s | `T5-banco/` |
| Tab M11, preferenza dopo la ricarica | stesso programma | Parziale: Medium resta Medium nelle due passate complete; tre prove brevi hanno letto `light` (non spiegato, ISSUE-100) | `T5-banco/stato-*.json` |
| ISSUE-062 | `measure.cjs base`, 4 giri | Picchi non peggiori della 0.9.16; chiusura 54,6-57,3 fps (due giri a 54,6 e 54,8 sotto il minimo storico 56,0) | `T5-banco/measure-base*.txt` |
| Memoria | `adb shell dumpsys meminfo com.android.chrome` (PSS) | Nessuna crescita: 193 MB prima, 160-175 durante, 169 dopo | `T5-banco/pss-*.txt` |
| Rete e comandi | console, richieste di rete, trame websocket | Nessuna richiesta a terzi; nessun `call_service`; console senza errori oltre a tre 409 della sincronizzazione delle impostazioni (due schede della stessa origine, convergono) | `T5-banco/` |
| `localStorage` del launcher | confronto prima e dopo (token esclusi) | Invariato tranne la migrazione attesa (pagina `casa3d` in coda, 8 a 9; `aca_casa3d_quality`) | `T5-banco/ls-*.json` |
| `misura-tablet.mjs` | gesti con `Input.dispatchTouchEvent` | **Non valido** per il tablet: round trip del protocollo, gesti di 12-16 s (ISSUE-101) | `T5-banco/misura/` |

**Non eseguito o con limiti:** dito reale (T11 chiede almeno 3 gesti); telefoni, verticale e PC con GPU vera; TalkBack e testo al 125 e 150%; 30 minuti di uso e schermo spento; heap; utente non amministratore (ISSUE-090); nuovo tentativo di `load3d` dopo un errore. Nessuna CI attiva dichiarata. Il banco è costruito dall'albero di lavoro non committato.

## 2026-10-21 — Casa 3D, T6: persistenza (REP-20261020-002, «T6 — Persistenza»)

Comandi dalle cartelle `progetto/acasystem/backend`, `frontend` e `casa3d`; log, script e copie in `backup/casa3d/T6/` (copie dei file prima delle modifiche in `pre/`, prova a tre contesti in `due-client/`). Vitest con `--maxWorkers=4`, un solo processo pesante per volta; la prova del browser è stata eseguita da sola, con un solo Chromium headless (`--disable-gpu --use-angle=swiftshader --disable-gpu-compositing`); **nessun tablet e nessun banco toccati**, nessun comando a impianti reali, nessuna credenziale; nessun commit.

| Controllo | Comando | Esito | Evidenza |
|---|---|---|---|
| Backend: suite | `npx vitest run --maxWorkers=4` | Superato: **21 file, 191 test** (prima 18 e 150) | `backend-test.txt` |
| Backend: rotte, ruolo, immagini, schema | `npx vitest run --maxWorkers=4 src/__tests__/casa3d` | Superato: 4 file, 50 test (database in memoria): piano vuoto a revisione 0 e primo salvataggio; **409** con la revisione attuale e piano intatto, due scritture con la stessa base (ne vince una); base mancante o non intera e piano non valido (400); corpo oltre il limite (413); **403** per un utente che non è amministratore né proprietario su ogni scrittura e sulla lettura di cronologia e backup, **401** senza utente, ruolo dichiarato dal client ignorato, amministratore e proprietario scrivono, rotte dietro l'autenticazione HA vera; immagini PNG, JPEG e WebP con tipo rilevato, `nosniff` e CSP chiusa; **SVG rifiutato** qualunque sia l'intestazione; **indirizzo esterno** come corpo o come id rifiutato; **immagine troncata o danneggiata rifiutata**; tipo diverso dai byte (415) senza toccare l'immagine salvata; limiti di byte, lato, numero e totale; cancellazione; punto di ripristino a richiesta e automatico solo oltre 600 s, mai per un piano vuoto, al più 20; ripristino, esportazione e importazione con punto di ripristino e pacchetti saltati; limiti di piani, stanze, punti ed elementi come l'originale; **URL esterni** nelle immagini di schermi e sfondi rifiutati; cifratura `enc_only` | `backend-casa3d-test.txt` |
| Backend: tipi e lint | `npx tsc -p tsconfig.json --noEmit`, `npx eslint src` | Superato: nessun errore | `backend-typecheck.txt`, `backend-lint.txt` |
| Frontend: test nuovi | `npx vitest run --maxWorkers=4 src/__tests__/Casa3dPlanApi.test.ts …Casa3dPlanRequest.test.ts …Casa3dHassHook.test.tsx` | Superato: 3 file, 44 test (comando → rotta, revisione mandata a ogni salvataggio, salvataggio senza lettura rifiutato, 409 con codice e revisione, 403/404/413/415/422/400/5xx, immagini in binario con rifiuto prima della richiesta di indirizzi esterni, SVG, id non validi e testo non base64, cronologia, esportazione e importazione, elenco pacchetti vuoto, controllo della revisione solo a pagina visibile e senza errori se offline, bozza tolta al cambio di utente, richiesta con token e un solo nuovo tentativo dopo un 401 con OAuth, Home Assistant ancora in sola lettura con il piano API) | `frontend-t6-test.txt` |
| Frontend: Casa 3D | `npx vitest run --maxWorkers=4 src/__tests__/Casa3d` | Superato: 14 file, 218 test (compreso `Casa3dHaShim.test.ts`, invariato, e `Casa3dRoute.test.tsx`: la rotta di prova non è raggiungibile in produzione) | `frontend-casa3d-test.txt` |
| Frontend: controlli statici | `npm run typecheck`, `npm run lint`, `npm run lint:typography`, `npm run lint:theme-colors`, `npx prettier --check` sui file toccati | Superato: 0 errori; 0 violazioni su 487 e 333 file | `frontend-typecheck.txt`, `frontend-lint*.txt` |
| Pacchetto `casa3d` | `npm test`, `npm run typecheck`, `npm run marchio`, `npm run rinomina` | Superato: **438 su 438**; `marchio` ok su 200 file; `rinomina` lascia `src/` e `lang/` identici (impronta del contenuto uguale prima e dopo; cambia solo `PATCHES.md`). La build del pacchetto non è stata rifatta: nessun sorgente è cambiato | `casa3d-test.txt`, `casa3d-typecheck.txt`, `casa3d-marchio.txt` |
| Build e peso | `npm run build`, `node scripts/check-bundle-size.mjs` | Superato: `index` 806,5 KB su 900; nessun file `Casa3dProva` né stringa `casa3d-prova` in `dist/` | `bundle-size.txt` |
| Prova a tre contesti e copia a freddo (PC) | `node due-client.mjs esito` (`due-client/`) | Superato: **37 controlli su 37**, uscita 0. Tre contesti di un solo Chromium (A e B amministratore, G ospite) con il codice vero di `planApi.ts` e `planRequest.ts` contro il processo vero del backend (file SQLite, porta 3098) e un Home Assistant finto (`mock-ha.mjs`, token di prova): lettura del server vuoto, salvataggio, rilettura identica da un altro dispositivo, revisione vista dal controllo ogni 0,4 s, **409** su una revisione vecchia con il piano di B intatto, **403** per l'ospite su piano, immagini, cronologia, esportazione, punto di ripristino e cancellazione e **401** senza token, PNG vero riletto byte per byte con `nosniff` e CSP chiusa, **SVG rifiutato** (dichiarato PNG o SVG, 415), **PNG troncato rifiutato** (422, non salvato), oltre 6 MB (413) con il server ancora vivo, **URL esterno** come immagine di uno schermo e come sfondo (400), 21 piani (400), la revisione resta 3, punto di ripristino, ripristino, esportazione, importazione con un pacchetto saltato, nessun errore di pagina. Poi backend fermato e cartella dei dati copiata: la copia, aperta da sola, contiene il piano alla stessa revisione (6) e con lo stesso contenuto dell'ultima lettura, l'immagine con la stessa impronta, 4 punti di ripristino e nessuna immagine rifiutata | `due-client/esito/esito.json`, `esito-consola.txt`, `copia-a-freddo/` |

**Non eseguito o con limiti:**
- **Fase «banco» di T6:** immagine con T6, salvataggio e rilettura da un tablet e dal browser del PC con Home Assistant vero, piano presente nel tgz della copia a freddo del volume Docker. L'app non ha ancora una schermata che salvi il piano (T10), e un accesso al banco non lo inserisce l'agente (ISSUE-103).
- I «due dispositivi» della prova sono tre contesti di un solo browser (stesso motore, stesso PC, nessuna rete reale fra i client), non un tablet e un PC; il «volume del banco» è una copia di una cartella con un backend fermato con un segnale di terminazione (nel file `-wal` ci sono ancora le ultime scritture, ed è corretto aprirlo con SQLite).
- Home Assistant è finto: il ruolo viene da `auth/current_user` di un finto; con un Home Assistant vero il ruolo di un utente non amministratore non è provato (ISSUE-090); dietro l'ingress del Supervisor nessuno scrive (dedotto dal codice del middleware, non provato, ISSUE-102).
- La struttura delle immagini è verificata, i pixel no (ISSUE-104); WebP e JPEG sono provati con file costruiti nei test, non con le immagini di un editor.
- La Vista del launcher non legge il piano del server (ISSUE-103); la suite completa del frontend non è stata rieseguita (T6 tocca soli file di `casa3d/`: l'adattatore, il hook e i test nuovi).
- Nessuna CI attiva dichiarata.

**Rettifica 2026-10-21 (rerun finale, nessun codice modificato):** il primo tentativo di suite completa (`npx vitest run --maxWorkers=4`, `backup/casa3d/T6/suite-1.txt`) non è un verdetto valido: 84 file su 173 passati (1344 test) con 91 errori «Worker exited unexpectedly with exit code 3221225794 during starting state», cioè worker uccisi all'avvio da Windows (0xC0000142, carico/risorse della macchina), non test falliti; gli altri file non sono stati eseguiti. Rieseguita a quattro blocchi con `npx vitest run --maxWorkers=2 --shard=N/4` (meno carico, un processo alla volta): **173 file, 2403 test, tutti verdi** (44/559, 44/806, 44/571, 43/467), nessun errore, uscita 0 (`suite-2-shard1..4.txt`, `suite-2-exit.txt`). Nello stesso giro: backend `npm run test -w backend` **21 file, 200 test** (nel primo giro 191: i test dell'API Casa 3D sono stati ampliati dopo), typecheck e lint del backend e del frontend con 0 errori, `casa3d` typecheck, **438/438** test e `npm run build -w casa3d` riuscita (6 bundle, 2043,1 KB, tutti nel budget) (`backend-test-2.txt`, `backend-typecheck-2.txt`, `backend-lint-2.txt`, `frontend-typecheck-2.txt`, `frontend-lint-2.txt`, `casa3d-typecheck-2.txt`, `casa3d-test-2.txt`, `casa3d-build-2.txt`). Limite: la suite non è stata eseguita con `--maxWorkers=4` in un unico giro; due lanci concorrenti per errore (il PC è andato in sospensione) sono stati fermati e i loro file scartati prima del giro valido.

## 2026-10-21 — Casa 3D, T6: banco 0.9.19 e Tab M11 (REP-20261020-002, «T6 — esito»)

| Controllo | Esito |
|---|---|
| Copie a freddo PRIMA e DOPO | Superato: `backup/banco/tunet-data-casa3d-T6-pre-0.9.19-freddo.tgz` (SHA-256 `aa2a0a92…`) e `...-post-0.9.19-freddo.tgz` (`c368fb3c…`); il DOPO contiene il piano alla revisione 6 (1 piano, 6 stanze, impronta `9b909c96125f09b6`), 0 immagini, 1 punto di ripristino, `integrity_check` ok (`node:sqlite`, `--network none`; `backup/casa3d/T6/banco/verifica-db.txt`) |
| Banco 0.9.19 | Superato: immagine `aca-system:0.9.19`; `healthy`; `/api/health` 0.9.19 e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.7`; `/casa3d/manifest.json` servito; tre tabelle `casa3d_*`; nessun errore all’avvio; `casa3d-prova` assente |
| Tab M11, 16 controlli sul canale | Superato: 401 senza token e con token falso; lettura 200; salvataggio da A (3→4), rilettura da B con stessa revisione e stesso contenuto, B salva (5), A su 4 riceve 409 con revisione 5, il piano di B resta, A rilegge e salva (6), B vede 6; SVG 415; URL esterno 400; revisione invariata dopo i rifiuti (`esito-prova.json`, `prova-log.txt`) |
| 403 sul banco | **Non eseguito**: manca un utente non amministratore e non si è creato un account; coperto dai test del backend e dalla prova sul PC (Home Assistant finto) |
| Secondo dispositivo | **Non eseguito**: A e B sono due documenti dello stesso tablet con la stessa sessione e lo stesso `localStorage` |
| `localStorage` del launcher | 37 chiavi prima e dopo, identiche (token escluso e non letto) |
| Suite frontend completa (seconda esecuzione) | 175 file, 2403 test verdi; la prima si fermò per circa 87 minuti in `LauncherScreen.test.tsx` e fu interrotta a mano (il file da solo 97/97; causa non accertata); `backup/casa3d/T6/suite-2.txt` |
| Backend, `casa3d`, build | Backend 21 file e 200 test; `casa3d` 438 test; `typecheck`, `lint`, `lint:typography`, `lint:theme-colors`, `i18n:check`, `check-bundle-size` verdi; `casa3d-prova` assente da `dist/` |
| Rilievo aperto | Il limite delle immagini (600 al minuto) è coperto dal limite globale di `/api` (300 al minuto): sonda su `createApp` con 320 richieste, primo 429 alla 301ª; i test esistenti non lo vedono (ISSUE-104) |

Nessuna CI attiva dichiarata. La prova a tre contesti (37/37) è anteriore alle correzioni di revisione e non è stata rieseguita.

## 2026-10-21 — Interazioni G1-G2 e interruttore dei comandi della Casa 3D (REP-20261021-003)

| Controllo | Esito |
|---|---|
| Baseline prima delle modifiche | `LauncherScreen.test.tsx`, `LauncherGestures.test.tsx`, `LagLayers.test.ts`: 3 file, 163 test verdi (`--maxWorkers=4`) |
| Test mirati dopo le modifiche | 29 file, 646 test verdi (`--maxWorkers=4`): `LauncherScreen`, `LauncherGestures`, `LagLayers`, tutti i `Casa3d*`, `LauncherDragDrop`, `AvWidgetOpen`, `ShellLauncher`, `Polish2LauncherScreen`, `PolishLauncherScreen`, `FixLauncherUiShell`, `CategoryPages`, `ControlsFrame`, `ComfortContract`. In un giro precedente, 29 file e 461 test verdi su altri file del launcher (`Fix*`, `Polish2*`, `PageShell`, `PagerBands`, `SystemSheets`, `ShellApp` e simili) |
| I nuovi test vedono il difetto | Con i tre file del launcher ripristinati dalle copie PRIMA, 7 dei test nuovi o aggiornati falliscono; riportati i file, tornano verdi |
| `tsc -p tsconfig.strict.json --noEmit` | 0 errori |
| `eslint` sui sorgenti toccati (`templates/launcher`, `hooks/launcher`, `casa3d`) | 0 errori (i file di test sono esclusi dalla configurazione) |
| `lint:typography`, `lint:theme-colors` | 0 violazioni (492 e 334 file) |
| `prettier --check` sui file toccati | Superato; `casa3d/Casa3dPage.tsx` non conforme per i fine riga CRLF di partenza, non toccati |
| Interruttore dei comandi della Casa 3D | Spento per impostazione: con il runtime presente, in Esplora e con `commands` aperti, `callService` rifiuta e la `callService` dell'app non è raggiunta (`Casa3dCommands.test.tsx`, `Casa3dHaShim.test.ts`); acceso con `VITE_CASA3D_COMMANDS=on` i test delle barriere e del percorso restano verdi |
| Suite completa, `e2e`, banco, Tab M11, TalkBack | **Non eseguiti** |
| Gesto reale su dispositivo (pressione lunga su pulsante, cursore e manopola; tocco immediato) | **Non eseguito**: la prova dell'utente sul Tab M11 è il passo aperto |
| `e2e/isolated-browser.check.mjs` | **Non eseguito**; il doppio clic su «Apri dettagli» (r.126) non apre più le impostazioni: da aggiornare |

Nessuna CI attiva dichiarata. Nessun commit Git. Copie PRIMA in `backup/g1-g2/pre/`.

## 2026-10-21 — Interazioni G1-G2 — esito (suite completa, banco 0.9.20, Tab M11)

Integra la sezione precedente «Interazioni G1-G2 e interruttore dei comandi» (che indicava suite completa, banco e Tab M11 come non eseguiti).

| Controllo | Esito |
|---|---|
| `npm run typecheck`, `npm run lint`, `lint:typography`, `lint:theme-colors`, `i18n:check` (frontend) | Superati (0 violazioni in 492 e 334 file; i18n 4 test su 4) |
| `vitest run --maxWorkers=4` (frontend, suite completa) | Superato: 179 file, 2493 test, 526 s; uscita in `backup/g1-g2/suite-1.txt`; nessun file bloccato |
| `npm run build` (frontend) e `check-bundle-size.mjs` | Superati; indice 803,5 KB su 900 KB (avviso Vite su chunk oltre 500 KB: `hls` e indice) |
| Backend `--maxWorkers=4` | Superato: 21 file, 200 test |
| `npm run test -w casa3d` e `npm run build -w casa3d` | Superati: 440 test; 6 bundle, 2042,8 KB; il bundle 3D è a 780,0 KB su 780 KB di budget, esattamente sul limite |
| Copia a freddo PRIMA | Superato: `backup/banco/tunet-data-g1g2-pre-0.9.20-freddo.tgz`, 413346 byte, SHA-256 `1a3453c57d1793b0f7b80cf2e24b1e8eb18852ea0ef39de60186a831991823a2`, `tar -tzf` 4 voci |
| Banco 0.9.20 | Superato: `docker compose up -d --build`; `healthy`; `/api/health` 0.9.20 e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.7` (IPv4 Wi-Fi uguale al binding) |
| Tab M11, pressione lunga di 800 ms sul corpo di Orologio, Calendario e Meteo | Superato: nessuna modifica, nessun `is-pressing`, rettangolo invariato (397×397) |
| Tab M11, pressione lunga su 5 widget non collegati e sul pulsante «Chiudi Tapparella» | Superato: nessuno spostamento, restringimento, avviso o modifica |
| Tab M11, pressione lunga sullo spazio vuoto | Come prima di G1: entra nella panoramica pagine (`pager is-overview`, barra pagine e «Fine»), ordine invariato; **non** la barra widget (C2a, non autorizzata) |
| Tab M11, «Modifica»: selezione, sollevamento, trascinamento del widget Luce | Superato: ha seguito il dito (y da 25 a 81), tornato a 1061,25, nessun cambio di layout; uscita con «Fine» |
| `localStorage` del launcher | 35 chiavi prima e dopo, identiche (token escluso) |
| Tocco immediato e secondo tocco senza impostazioni sul dispositivo | **Non eseguito** |
| Pressione lunga su cursore e manopola della luce col dito, TalkBack, G0, `e2e` | **Non eseguiti** |

Nessuna CI attiva dichiarata. Nessun commit Git. Nessun comando a impianti reali.


## 2026-10-21 — Interazioni G3-G5 (REP-20261021-003, «G3-G5 — realizzazione»)

| Controllo | Esito |
|---|---|
| Baseline | `LauncherScreen`, `CategoryPages`, `LauncherGestures`, `LauncherDragDrop`, `LauncherStacks` con il codice nuovo e i test vecchi: 15 test falliti su 246 (attesi: tocco, sollevamento con attesa, «Collega»); elenco in `backup/g3-c3/run1.txt` |
| Test mirati dopo le modifiche | `WidgetCommands` (29, nuovo), `LauncherScreen`, `CategoryPages` (31), `LauncherGestures`: verdi (`--maxWorkers=4`; `backup/g3-c3/run2.txt` e nuova esecuzione di `CategoryPages`) |
| I nuovi test vedono il difetto | Con gli otto sorgenti di G3-G5 (`LauncherScreen`, `WidgetHost`, `StackView`, `CategoryWidgetContent`, `LauncherUiContext`, `AdaptiveCategoryWidget`, `adaptiveWidget.css`, `launcher.css`) ripristinati dalle copie PRIMA: 46 test falliscono su 218; poi rimessi e confrontati con `cmp`; `backup/g3-c3/old-code.txt` |
| `vitest run --maxWorkers=4` (frontend, suite completa) | Superato: 182 file, 2567 test, 553 s; `backup/g3-c3/suite-1.txt` |
| `tsc -p tsconfig.strict.json --noEmit`, `eslint src` | 0 errori |
| `lint:typography`, `lint:theme-colors` | 0 violazioni (502 e 335 file) |
| `prettier --check` sui file toccati | Superato dopo `--write` sui due file di test (solo le righe nuove) |
| Banco, copia a freddo, Tab M11, TalkBack, `e2e` | **Non eseguiti**: nessun banco è stato aggiornato in questo passo; `e2e/isolated-browser.check.mjs` è stato aggiornato (modifica, tocco, secondo tocco, Esc) ma non rieseguito |
| Gesto reale col dito (tocco sul corpo di un adattivo, trascinamento immediato, secondo tocco, pressione lunga nelle pagine piene) | **Non eseguito** |

Nessuna CI attiva dichiarata. Nessun commit Git. Copie PRIMA in `backup/g3-c3/pre/`.

## 2026-10-21 — Interazioni C1-C3 (REP-20261021-003, «C1-C3 — realizzazione»)

| Controllo | Esito |
|---|---|
| Baseline | Suite completa con il codice nuovo e i test vecchi: 82 test falliti su 2567 (attesi: barra di stato, indicatore, «Modifica», celle con «+» in uso, pressione lunga che apre la vista pagine, formule della cornice); `backup/g3-c3/c-suite-1.txt` |
| Test riscritti o aggiunti | `FrameGearCommands` (15, nuovo), `LauncherScreen` (115, da 110), `SystemPage` (23, da 20) e i file aggiornati per decisione elencati nel report; verdi con `--maxWorkers=4` |
| `vitest run --maxWorkers=4` (frontend, suite completa) | Superato: 183 file, 2588 test, 879 s; `backup/g3-c3/c-suite-2.txt` |
| `tsc -p tsconfig.strict.json --noEmit`, `eslint src` | 0 errori |
| `lint:typography`, `lint:theme-colors` | 0 violazioni (507 e 338 file) |
| `prettier --check` sui file toccati | Superato (dopo `--write` sui file nuovi e riscritti) |
| Prova headless sul PC | Eseguita: un Chromium con `--disable-gpu --use-angle=swiftshader --disable-gpu-compositing` su `launcher.html` (fixture, nessun Home Assistant), 1280×665 e 390×844; griglia identica in uso e in modifica (1219×594 a 1280×665), pressione lunga di 750 ms sullo spazio vuoto in modifica, vista pagine da «Pagine», cenno dell'indicatore di 2 s, comandi senza viso al primo Tab, fuoco su «Modifica la disposizione» dopo «Fine», nessun errore di pagina; schermate e `risultati.json` in `backup/g3-c3/shots/` |
| Banco, copia a freddo, Tab M11, TalkBack, `e2e` | **Non eseguiti**: nessun banco è stato aggiornato; `e2e/m11-overview.check.mjs` e `isolated-browser.check.mjs` aggiornati ma non rieseguiti |
| Gesto reale col dito (pressione lunga sullo spazio vuoto e sul corpo nelle pagine piene, cestino sotto la barra, ingranaggio nell'angolo con 20 px riservati, cenno e suggerimento) | **Non eseguito** |

Nessuna CI attiva dichiarata. Nessun commit Git. Copie PRIMA in `backup/g3-c3/pre/c1c3/`.

## 2026-10-21 — Interazioni G3-G5 e C1-C3 — esito (REP-20261021-003, «G3-G5 e C1-C3 — esito»)

| Controllo | Esito |
|---|---|
| Frontend `npm run typecheck`, `lint`, `lint:typography`, `lint:theme-colors`, `i18n:check` | Superati (dopo la revisione e le correzioni) |
| `vitest run --maxWorkers=4` (frontend, suite completa) | Superato: 183 file, 2591 test, circa 559 s; `backup/g3-c3/suite-1.txt`. Rettifica: i 2588 test di «Interazioni C1-C3» sono il conteggio prima delle correzioni di revisione |
| Test aggiunti in revisione | `AdaptiveCategoryWidget` (tocco mentre il pager è tra due pagine: nessuna apertura; a riposo: una), `FixLauncherUi` (variante dell'avviso senza puntatore); `FixSystemFocus` e `LagLayers` riscritti; mirati verdi (158, 220, 12 e 93 test in esecuzioni separate) |
| `npm run build` e `node scripts/check-bundle-size.mjs` (frontend) | Superati |
| Backend `npm run test -w backend -- --maxWorkers=4` | Superato: 21 file, 202 test |
| `casa3d`: `npm run test -w casa3d`, `npm run build -w casa3d` | Superati: 440 test; 6 bundle entro budget, 2042,8 KB |
| Copia a freddo PRIMA del banco | Superata: `backup/banco/tunet-data-g3c3-pre-0.9.22-freddo.tgz`, 414866 byte, SHA-256 `4a238c93cf1007b28884068a2c156c47287cbe746be1627fce00d576ce69a2d4`, `tar -tzf` 4 voci, container fermo |
| Banco 0.9.22 | Superato: `up -d --build`, `healthy`, `/api/health` 0.9.22, `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.7` |
| Tab M11 (HA2KZKYB, Chrome), un dito, senza service worker né cache | Superato per quanto elencato nel report: uso a schermo intero con ingranaggio e suggerimento, celle senza «+», indicatore a ogni cambio pagina, avviso sul widget da collegare, pressione lunga sullo spazio vuoto, trascinamento immediato, «Collega» con un tocco in modifica, «Pagine» e «Fine», ingranaggio e ritorno. Schermate in `backup/g3-c3/tablet/` |
| Misura rapida della vista pagine sul Tab M11 (display a 90 Hz, due giri) | Apertura 46,9-47,6 fps, picchi 411-412 ms; chiusura 55,7-57,4 fps, picchi 278 ms; modifica 88-90 fps; confronto con la 0.9.18 non omogeneo (display a 90 Hz); picco di apertura più alto di circa 90 ms (ISSUE-107) |
| Tocco sul corpo di un widget collegato (dettagli), doppio tocco, pressione lunga nelle pagine piene, cestino sotto la barra, TalkBack, `e2e` | **Non eseguiti** (nessun widget del banco è collegato; nessun comando a impianti reali) |
| Rilievi dalla prova | Titolo della pagina sovrapposto ai chip «Da collegare» con l'indicatore acceso (ISSUE-105); «Annulla» grigio dopo un trascinamento che non è stato annullato (ISSUE-106) |

Nessuna CI attiva dichiarata. Nessun commit Git. Copie PRIMA della correzione in `backup/g3-c3/pre/fix/`.

## 2026-10-21 — Ripristino 0.9.23: D-2 e D-8 rovesciate (REP-20261021-003, «Ripristino 0.9.23»)

| Controllo | Esito |
|---|---|
| Frontend `npm run typecheck`, `eslint src`, `lint:typography` (508 file), `lint:theme-colors` (339 file) | Superati, 0 violazioni |
| `vitest run --maxWorkers=4` mirati: `PagerBands`, `PagerOverview`, `FixLauncherUiShell`, `FrameGearCommands`, `FixSystemFocus`, `LauncherGestures`, `Casa3dShell`, `CategoryPages`, `SystemPage`, `ShellLauncher`, `Polish2LauncherKit`, `WidgetCommands`, `LauncherDragDrop`, `Polish2Cornice`, `PolishCornice`, `StatusBarBand`, `FooterBandCache`, `LauncherColumns`, `LauncherCoverGrid`, `PageDescriptor`, `PolishLauncherScreen`, `Polish2LauncherScreen`, `FixLauncherUi`, `LagLayers`, `LauncherIndicatorCover` | Superato: 25 file, 508 test |
| `vitest run --maxWorkers=4` su `LauncherScreen`, `FixLauncherUi`, `AdaptiveCategoryWidget`, `SystemPage` | Superato: 4 file, 175 test (`LauncherScreen.test.tsx` ha 119 test) |
| Guardia dei test sul difetto | Con `LauncherScreen.tsx`, `FlashingPageIndicator.tsx` e `pageDescriptor.ts` rimessi come prima del ripristino (copie PRIMA) falliscono 47 test; file poi rimessi e identici (`cmp`) |
| Prova headless sul PC (un Chromium con `--disable-gpu --use-angle=swiftshader --disable-gpu-compositing`, `launcher.html` con le fixture, nessun Home Assistant, 1280×665 e 390×844) | Superata: pressione lunga (mouse e dito sintetico) = `is-pressing` poi `is-overview` con la barra in alto a (350, 8), 580×68, che non copre le schede (inizio a 100 px a 1280, a 88 px a 390); «Fine» riporta tutto a riposo; tocco su una scheda = modifica con «Aggiungi widget / Modifica le pagine / Fine»; 16 celle «+» in uso a 1280, tocco = «Aggiungi un widget»; widget in uso tenuto 1,2 s: nessun cambio; scorrimento con il dito pagina 2 → 3; nessun errore di pagina. Script, risultati e schermate in `backup/ripristino-0.9.23/shots/` |
| Suite completa, banco, copia a freddo, Tab M11, TalkBack, `e2e` | **Non eseguiti** (nessun banco toccato; nessun comando a impianti reali) |

Nessuna CI attiva dichiarata. Nessun commit Git. Copie PRIMA in `backup/ripristino-0.9.23/pre/src/`.

## 2026-10-21 — Ripristino 0.9.23, widget: «Collega» al tocco e pressione lunga che evidenzia e trascina (REP-20261021-003, «Ripristino 0.9.23 — widget»)

| Controllo | Esito |
|---|---|
| Frontend `npm run typecheck`, `eslint src`, `lint:typography` (508 file), `lint:theme-colors` (339 file) | Superati, 0 violazioni |
| `vitest run --maxWorkers=4` su `LauncherScreen`, `CategoryPages`, `FixLauncherUi`, `LauncherGestures`, `LagLayers`, `FrameGearCommands` | Superato: 6 file |
| `vitest run --maxWorkers=4` sui file di launcher, Polish, pile, shell, widget operativi, categorie, adattivi, pager, modifica | Superato: 51 file, 939 test |
| Suite completa, banco, copia a freddo, Tab M11, TalkBack, `e2e` | **Non eseguiti** |

Nessuna CI attiva dichiarata. Nessun commit Git. Copie PRIMA in `backup/ripristino-0.9.23/pre/widget/`.

## 2026-10-21 — Casa 3D, R1: schermo intero, anteprima, piano del server (REP-20261021-002, «R1 — esito»)

| Controllo | Esito |
|---|---|
| `npm run typecheck`, `lint`, `lint:typography`, `lint:theme-colors` (frontend) | Superati (0 violazioni in 502 e 335 file) |
| `vitest run --maxWorkers=4` (frontend, suite completa) | Superato: 181 file, 2522 test, 549 s; uscita in `backup/casa3d/R1/log/frontend-suite.txt` |
| Test mirati dopo le ultime correzioni CSS (`Casa3d*`, `SystemPage`, fogli) | Superati: 22 file, 367 test |
| Backend: `typecheck`, `lint`, `vitest run --maxWorkers=4` | Superati: 21 file, 202 test (ruolo di scrittura: nessun 403, 401 senza sessione, dichiarazioni del client ignorate) |
| `casa3d`: `typecheck`, `npm test`, `marchio` | Superati: 440 test; marchio ok (202 file) |
| Banco isolato sul PC (`backup/casa3d/R1/banco`, porta 3013, un solo Chromium con `--disable-gpu --use-angle=swiftshader --disable-gpu-compositing`, nessuna richiesta fuori dal banco, Home Assistant e rotte `/api/casa3d` simulati), 1280×665 e 390×844 | Tutti i controlli superati in entrambi i formati: anteprima SVG senza canvas; un tocco apre `#/casa`; casa a tutto schermo; vista 3D pronta; menu con le sei voci; Esc chiude e il fuoco torna alla freccina; indietro chiude prima il menu; nessun dialogo chiuso esposto; «Ricomincia» salva la casa vuota con un punto di ripristino (revisione 6 → 7); Esc dalla piantina torna a Esplora; «Esci» riporta al launcher con il fuoco sul pulsante; nessun errore di pagina. Schermate in `backup/casa3d/R1/shots/` |
| Build di prova fuori da `dist` (`--outDir` nel banco) | Superata; `dist` e `check-bundle-size` non rieseguiti sul codice finale |
| Tab M11, telefoni, dito vero, TalkBack, swipe reale sul pager, ISSUE-062 | **Non eseguiti** |
| Comandi a impianti reali | Nessuno; l'interruttore dei comandi resta spento |

Nessuna CI attiva dichiarata. Nessun commit Git.

### Aggiornamento 2026-10-21 — Casa 3D, R1: controlli finali, banco 0.9.21 e Tab M11

| Controllo | Esito |
|---|---|
| Frontend `typecheck`, `lint`, `lint:typography`, `lint:theme-colors`, `i18n:check` | Superati |
| `vitest run --maxWorkers=4` (frontend, suite completa, dopo le correzioni di revisione) | Superato: 181 file, 2525 test; `backup/casa3d/R1/suite-1.txt` |
| `npm run build` e `node scripts/check-bundle-size.mjs` (frontend) | Superati; index 806,6 KB su limite 900 KB; avviso di chunk sopra 500 kB non bloccante |
| Backend `vitest run --maxWorkers=4`; `casa3d` `npm test`, `build` (typecheck e marchio) | Superati: 21 file e 202 test; 440 test, 202 file di marchio, 6 bundle entro budget |
| Casi aggiunti in revisione (`Casa3dHistory.test.tsx`): casa aperta dal suo indirizzo con menu o piantina poi «Esci»; due «Esci» ravvicinati | Superati |
| Copia a freddo PRIMA del banco | Superata: `backup/banco/tunet-data-casa3d-R1-pre-0.9.21-freddo.tgz`, 413806 byte, SHA-256 `ae0a1cb6c0c4ff7ff5a9e65f18ffb6e7c6854b683935a9da6d259793651c83e5`, `tar -tzf` 4 voci |
| Banco 0.9.21 | Superato: `up --build`, `healthy`, `/api/health` 0.9.21, `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.7` |
| Tab M11 (HA2KZKYB, Chrome 1280×665), un dito, senza service worker né cache | Superato per quanto elencato: sul Tab M11 (Chrome 1280×665) la pagina «Casa 3D» del launcher mostra l'anteprima ferma e un tocco apre `#/casa` a schermo intero con la vista 3D pronta; il trascinamento a un dito ruota la casa e il pizzico la ingrandisce e la riduce; la freccina apre la barra con Esplora, Modifica la piantina, Piani, Elenco stanze, Qualità ed Esci; «Esci», il tasto indietro ed Esc riportano al launcher, e con la barra aperta indietro ed Esc chiudono prima la barra; «Ricomincia» sulla casa d'esempio rimasta da T6 chiede conferma e lascia la casa vuota (anteprima «Nessuna casa disegnata»); Sistema → Casa 3D apre la casa e indietro torna a Sistema. Chiavi `localStorage` invariate (38). |
| Telefoni, TalkBack, swipe reale sul pager, ISSUE-062, misura dei 4 s, pressione lunga sull'anteprima | **Non eseguiti** |

Nessuna CI attiva dichiarata. Nessun commit Git.

## 2026-10-21 — Ripristino 0.9.23: suite completa, build e banco (REP-20261021-003, «Ripristino 0.9.23 — banco e tablet»)

| Comando o prova | Esito |
|---|---|
| `npm run typecheck`, `npm run lint`, `npm run lint:typography` (508 file), `npm run lint:theme-colors` (339 file), `npm run i18n:check` (4/4) | Superati, nessuna violazione |
| `npx vitest run --maxWorkers=4` | 183/183 file, 2598/2598 test superati (circa 563 s; output in `backup/ripristino-0.9.23/suite-1.txt`) |
| `npm run build`, `node scripts/check-bundle-size.mjs` | Superati; index 807,7 KB su limite 900 KB; avviso chunk >500 kB non bloccante |
| Banco 0.9.23: `/api/health` e `/ha/auth/providers` | 0.9.23 e 200 su `127.0.0.1` e `192.168.1.27`; container `healthy` |
| Tab M11, prove al tocco (elenco in REP-20261021-003) | Esiti attesi, tranne pressione lunga + trascinamento nello stesso tocco (`pointercancel`, widget non spostato). Non eseguiti: TalkBack, `e2e` |

Nessuna CI attiva dichiarata. Nessun commit Git.

## 2026-10-22 — Rilascio dopo la pressione lunga e collaudo delle animazioni, banco 0.9.25 (REP-20261022-001)

| Comando o prova | Esito |
|---|---|
| `vitest run --maxWorkers=4` su `LauncherGestures`, `LauncherScreen`, `Casa3dShell`, `FixLauncherUi` | Superato: 4 file, 207 test; le due prove nuove sul rilascio falliscono senza la correzione |
| `npx vitest run --maxWorkers=4 --shard=1/2` e `--shard=2/2` | Superati: 183 file, 2611 test (1500 + 1111); `backup/animazioni-0.9.25/suite-1a.txt`, `suite-1b.txt` |
| `npm run typecheck`, `npm run lint`, `npm run lint:typography`, `npm run lint:theme-colors`, `npm run i18n:check` | Superati |
| `npm run build`, `node scripts/check-bundle-size.mjs` | Superati; index 808,7 KB su limite 900 KB; avviso di chunk oltre 500 kB non bloccante |
| Banco 0.9.25: copia a freddo PRIMA, `up -d --build`, `/api/health` e `/ha/auth/providers` | Superati: `healthy`, 0.9.25 e 200 su `127.0.0.1` e `192.168.1.27` |
| Tab M11, rilascio dopo una pressione lunga di 700 ms a 60 px dai bordi | Superato; **non copre le tenute oltre circa 1,3 s** |
| Tab M11, S1-S8 con 3 ripetizioni e passata senza sonda, gesti sintetici | Eseguito: scorrimento, fogli, pillola, suggerimento e movimento ridotto fluidi; **difetto del rilascio presente con tenute di 1,5 s (3/3 per lato)**; blocchi del thread di 160-490 ms e altri glitch in ISSUE-108…114; numeri in REP-20261022-001 |
| Chromium software 390×844 e 360×780, S1-S8 | Eseguito: solo glitch logici (tempi non realistici); difetto del rilascio presente con tenute di 1,4-2,5 s; ritorno da Sistema, frecce e chiusura del foglio con layout-shift |
| Dito vero, telefono reale, widget collegati, TalkBack, testo ingrandito, tastiera, Casa 3D con dati, avviso di disposizione bloccata, prove A/B delle cause | **Non eseguiti** |

Incidente: nella passata a misura di telefono `taskkill /F /IM chrome.exe /T` ha terminato tutti i processi `chrome.exe` della macchina; effetto sulle finestre dell'utente non verificato. Prove in `backup/animazioni-0.9.25/` (fuori da Git).

Nessuna CI attiva dichiarata. Nessun commit Git.

## 2026-10-22 (seconda) — Correzione del rilascio dopo tenute lunghe (ISSUE-108, REP-20261021-003)

| Comando o prova | Esito |
|---|---|
| `vitest run --maxWorkers=4` su `LauncherGestures`, `LauncherScreen`, `Casa3dShell`, `FixLauncherUi` | Superato: 4 file, 221 test; 16 prove nuove al posto di quella «dopo 800 ms»; 13 (tenute di 1,5, 2,5 e 5 s, trascinamento, `pointercancel`, altro dito) falliscono con il sorgente precedente |
| `tsc -p tsconfig.strict.json --noEmit`, `eslint src/hooks/launcher/useLongPress.ts`, `prettier --check`, `lint:typography`, `lint:theme-colors` | Superati, 0 violazioni |
| Prova headless 1280×665 DPR 1.5, tocco CDP, Chromium con GPU spenta, server isolato (`backup/rilascio-0.9.26/prova/hold.cjs`): bordo sinistro, destro e centro con tenute di 0,7, 1,5 e 2,5 s | Build nuova 9/9 senza apertura né cambio di pagina; build precedente 3/9 (falliscono 1,5 e 2,5 s in tutti i punti). Valida per la logica, non per i tempi |
| Suite completa, prova col dito sul Tab M11, telefono reale, nuovo banco | **Non eseguiti** |

Nessuna CI attiva dichiarata. Nessun commit Git.

## 2026-10-22 (terza) — Rilascio del banco 0.9.26 (ISSUE-108)

| Comando o prova | Esito |
|---|---|
| `vitest run --maxWorkers=4` (suite completa, `backup/rilascio-0.9.26/suite-main.txt`) | Superato: 183 file, 2626 test, durata 984,8 s |
| `npm run typecheck`, `npm run lint`, `npm run lint:typography`, `npm run lint:theme-colors`, `npm run i18n:check` | Superati: tipi e lint senza output; tipografia 0 violazioni su 508 file; colori 0 violazioni su 339 file; i18n 4 test |
| `npm run build` e controllo dimensioni (`build.txt`, `bundle.txt`) | Superati: index 809,0 KB su limite 900 KB, tutti i pacchetti nei limiti; avviso di chunk oltre 500 kB (hls) non bloccante |
| Banco 0.9.26: copia a freddo PRIMA (464901 byte, SHA-256 `d73a5ce5...9d89c`, `tar -tzf` leggibile), `up -d --build`, `/api/health` 0.9.26 e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.27` | Superati; container `healthy` |
| Tab M11, 36 tenute (3 punti x 0,7/1,5/2,5/4 s x 3 ripetizioni) con rilascio nello stesso punto e «Fine» | Superato 36/36, gesti sintetici |
| Tab M11, widget: pressione lunga più trascinamento di circa 6 s nello stesso tocco, «Annulla» | Superato 3/3 (un primo giro con il selettore sbagliato di «Annulla» ha richiesto il ripristino delle chiavi del launcher; firma finale identica) |
| Prova col dito vero, telefono reale | **Non eseguita** |

Nessuna CI attiva dichiarata. Nessun commit Git.

## 2026-10-23 — Prova di rete P0 (Wake on LAN con MAC fittizio) e preparazione della VM `acasystem-ha` (REP-20261023-003, «Esito P0, I1 e I2»)

Richiesta: risposte dell'utente del 2026-10-23 («Sì, entrambi» per D-I1 e P0), registrate in REP-20261023-003, sezione «Risposte dell'utente». Eseguito da Claude Code (Sonnet 5.5, `claude-sonnet-5-5`). Nessuna modifica al container o alla configurazione di HA, a Docker, alla rete di Windows o al tablet; nessun comando a dispositivi reali; nessuna credenziale né token; nessun browser né suite di test; nessun commit.

**P0 — pacchetto magico con MAC fittizio `02:00:00:00:00:01`** (indirizzo localmente amministrato, nessun dispositivo reale; 102 byte = 6 × `ff` + 16 × MAC).

| Passo | Comando e ora | Esito |
|---|---|---|
| Ascoltatore sul tablet | `adb shell "timeout 3 nc -u -l -p 9 -o-"` (Tab M11, `192.168.1.46` sulla stessa rete `192.168.1.0/24` del PC; toybox 0.8.11, `nc -u` disponibile), 11:11 circa | **Non possibile:** `nc: bind: Permission denied`. La shell adb gira come `uid=2000(shell)` e non può aprire la porta 9 (sotto 1024, serve root). Non è stato installato nulla né cambiata alcuna impostazione. **Ripiego come da incarico: ascoltatore sul PC** |
| Ascoltatore sul PC | `powershell.exe -File p0-listener.ps1` (socket UDP su `0.0.0.0:9`, PID 37652, si chiude da solo dopo 45 s), avviato alle 11:13:31 | Attivo 11:13:31-11:14:16, terminato da solo; nessun altro processo toccato |
| Invio dal container `homeassistant` | 11:13:40: `docker exec homeassistant python3 -c '…socket UDP, SO_BROADCAST, sendto(pkt, (dest, 9))…'` verso `192.168.1.255:9` e `255.255.255.255:9` (un datagramma ciascuno). Container `172.17.0.2/16` (rete `bridge`), Python 3.14.6 | Entrambe le `sendto` riuscite (102 byte). L'ascoltatore del PC ha ricevuto **un solo datagramma** (11:13:40.938, 102 byte, contenuto corretto), con sorgente **`192.168.1.7`:60642**, cioè l'indirizzo Wi-Fi del PC, non `172.17.0.2`: Docker Desktop lo riemette dallo stack del PC. L'ascoltatore non registra l'indirizzo di destinazione, quindi **non si sa quale dei due invii sia arrivato**; il secondo non è stato visto |
| Controllo positivo dal PC | 11:13:44: `p0-send-pc.ps1` (UdpClient con `EnableBroadcast`, sorgente fissata a `192.168.1.7`) verso `192.168.1.255:9` e `255.255.255.255:9` | Ricevuti **2 su 2** dall'ascoltatore del PC (11:13:44.438 e .441). Prova che l'ascoltatore funziona |

**Esito P0.** «Arriva» **solo al PC**, cioè lo stesso apparecchio che ospita Docker Desktop, e per **uno solo dei due invii** dal container, con sorgente riscritta all'IP del PC. **Non dimostrato né smentito** che il pacchetto arrivi a un altro apparecchio della LAN: l'ascoltatore sul tablet non è realizzabile con questi strumenti e un ascoltatore sul PC non distingue un pacchetto uscito sulla LAN da uno consegnato localmente dal NAT di Docker Desktop. Il sospetto del piano (dal bridge il pacchetto probabilmente non esce) resta **non verificato**. La riscrittura della sorgente a `192.168.1.7` indica che il pacchetto passa dallo stack di rete del PC, il che è compatibile con un'uscita sulla LAN [NV]. Per un esito concludente servirebbe un ascoltatore su un secondo apparecchio senza il vincolo della porta 9 (un PC o telefono con app di rete, oppure root sul tablet): richiede una nuova autorizzazione. La prova va comunque ripetuta dalla VM in I5.

Evidenze: `backup/dispositivi/p0/` (`p0-listener.ps1`, `p0-listener.log`, `p0-send-pc.ps1`, `p0-send-container.txt`), esclusa da Git.

**I1 — scaricamento (autorizzato con D-I1).**

| Controllo | Esito |
|---|---|
| Release: API GitHub `releases/tags/18.3` (11:14), `home-assistant/operating-system`, pubblicata il 2026-09-17T15:52:18Z, non bozza né prerelease; asset `haos_ova-18.3.vdi.zip` | Nome e dimensione dichiarata **559 213 211 byte** corrispondenti alla richiesta |
| Checksum pubblicato | La release non ha un file di checksum tra i 35 asset; GitHub riporta per l'asset il campo `digest`: `sha256:c626ffe0db7dd717270b41240ee3cbb5ada78a364239795f04435d6116c236d3` |
| Scaricamento | `curl -L` da `https://github.com/home-assistant/operating-system/releases/download/18.3/haos_ova-18.3.vdi.zip` verso `backup/dispositivi/haos/` (cartella nuova e vuota), 11:14:43-11:15:05: HTTP 200, **559 213 211 byte** |
| SHA-256 del file scaricato | `c626ffe0db7dd717270b41240ee3cbb5ada78a364239795f04435d6116c236d3`: **uguale** al digest di GitHub |
| Archivio | `python -I` con `zipfile`: un solo file `haos_ova-18.3.vdi` (989 987 328 byte), `testzip()` senza errori. Estrazione eseguita; il file scaricato non è stato eseguito |
| `.vdi` estratto | 989 987 328 byte, SHA-256 `62580d1c0d6384c9077d3b39df61b0adec29cb7a69df44430471a34634d7bb2b` (calcolato qui, non pubblicato dalla release) |

**I2 — VM `acasystem-ha`** (VirtualBox 7.2.4r170995, `VBoxManage`, 11:16): creata e registrata, **mai avviata** (`VMState=poweroff`, `list runningvms` vuoto). Dettaglio dei comandi e del ritorno indietro in `infrastructure.md`. Verifica con `showvminfo --machinereadable`: `firmware=EFI64`, `cpus=2`, `memory=4096`, controller SATA con il `.vdi` sulla porta 0, scheda 1 `bridged` su «Realtek RTL8852BE WiFi 6 802.11ax PCIe Adapter» con `cableconnected1=off`, scheda 2 `hostonly` su «VirtualBox Host-Only Ethernet Adapter», `autostart-enabled=off`, ordine di avvio solo disco.

**Non eseguito:** avvio della VM; migrazione con il backup di HA; collegamento della scheda a ponte; limitazione della 8123; passaggio di Acasystem al nuovo HA; Wake on LAN verso apparecchi reali; prove con il TV; prova con root o con un secondo apparecchio come ascoltatore.

## 2026-10-23 — Widget non nascondibili e memoria della configurazione per dispositivo ([ADR-0019](decisions/ADR-0019-memoria-per-dispositivo.md), [REP-20261021-003](reports/REP-20261021-003-interazioni-schermo-intero.md), annotazione «seconda»)

Eseguito da Claude Code (Sonnet 5.5, `claude-sonnet-5-5`) dalla cartella `progetto/acasystem/frontend`. Nessun commit, nessun browser, nessun tablet, nessun banco, nessuna suite completa.

| Controllo | Esito |
|---|---|
| `npx vitest run src/__tests__/DeviceMemory.test.ts src/__tests__/WidgetMemoryProvider.test.tsx --maxWorkers=4` | 2 file, 41 test verdi |
| Vitest `--maxWorkers=4` sui 118 file di prova che importano launcher, fogli, `PageContext`, istantanea, widget adattivi, profili | 118 file, 2022 test verdi |
| `npx tsc -p tsconfig.strict.json --noEmit`, `npx eslint src`, `npm run lint:typography`, `npm run lint:theme-colors` | verdi (0 violazioni; 513 e 339 file) |

**Non eseguito:** suite completa, `build`, `check-bundle-size`, `e2e`, prova sul Tab M11, sincronizzazione tra due dispositivi, profilo reale con widget nascosti.

## ISSUE-109, tappa Z — misura finale e banco 0.9.27 (2026-10-23)

Fonte: [REP-20261022-002](reports/REP-20261022-002-piano-blocchi-thread.md), annotazione «Tappa Z». Tab M11, fixture, gesti sintetici, 168 giri (14 scenari, build 0.9.26 estratta dal container contro `dist-finale`, 5 giri alternati più giro 0, 0 non validi). **Eseguito:** O3 raggiunto (0 `transitioncancel`); O1a rispettata (somme 0,46-0,73 della base, massimi 102-207 ms); blocchi ridotti a intervalli non sovrapposti in T1, T2, T3, T6, S3cD, T4, S5b, T5. **Non raggiunto:** O1 (100 ms), O4 (i «+» 92 ms dopo la fine della transizione delle pagine). **Peggiore della base (O5):** scorrimento durante il gesto (primo lancio 35 contro 60 fps, blocchi 55-80 ms contro 0) e pallino accanto (108 ms contro 0). Controllo funzionale sul banco 0.9.27 (informativa sull'AI, salto diretto, aggiunta in pagina piena, solo barra del widget): superato con gesti sintetici. **Non eseguito:** suite, lint, i18n, dimensione dei pacchetti, telefono, TalkBack, dito vero, Casa 3D vera, `release.check.mjs`.

## ISSUE-109 e 0.9.27, verifica completa del software (2026-10-23, prima della tappa Z)

Fonte: [REP-20261022-002](reports/REP-20261022-002-piano-blocchi-thread.md), «Esito del blocco (2026-10-22)». Eseguita da un passo del flusso (Claude Code, claude-sonnet-5-5) sul working tree dopo l'ultima tappa di codice («Aggiungi widget» nella vista pagine), con `--maxWorkers=4`, nella cartella `progetto/acasystem/frontend` (e `backend` dove indicato). Nessun commit.

| Comando | Esito |
|---|---|
| `vitest run --maxWorkers=4 --shard=1/4` | 48 file, 690 test verdi |
| `vitest run --maxWorkers=4 --shard=2/4` | 48 file, 932 test verdi |
| `vitest run --maxWorkers=4 --shard=3/4` | 48 file, 664 test verdi |
| `vitest run --maxWorkers=4 --shard=4/4` | 48 file, 542 test verdi |
| `npm run typecheck` | verde (tsc strict) |
| `npm run lint` | verde (eslint su `src`) |
| `npm run lint:typography` | 0 violazioni (515 file) |
| `npm run lint:theme-colors` | 0 violazioni (341 file) |
| `npm run i18n:check` | 1 file, 4 test verdi |
| `npm run build` | completata; solo l'avviso usuale sul pacchetto oltre 500 kB |
| `node scripts/check-bundle-size.mjs` | tutti i pacchetti entro i limiti |
| `npm run test -w backend -- --maxWorkers=4` | 21 file, 202 test verdi |

**Totale frontend:** 192 file, 2828 test verdi. **Limiti:** la verifica precede la tappa Z, che ha cambiato solo la versione in `.env` e negli e2e e l'indirizzo in `compose.tunet.yaml`, e non è stata rieseguita dopo; l'esito «Non eseguito: suite, lint, i18n, dimensione dei pacchetti» della sezione precedente riguarda il passo di Z, non questa verifica. Nelle esecuzioni mirate di una tappa precedente `Casa3dPage.test.tsx:241` era risultato instabile sotto carico; nelle quattro parti è verde. Non eseguiti: `e2e`, `release.check.mjs`, prove col dito, sul telefono e con TalkBack.

## 0.9.28, coreografia, blocco 1: pressione e vista pagine (2026-10-23)

Fonte: [REP-20261023-006](reports/REP-20261023-006-coreografia-animazioni.md), «Blocco 1 della realizzazione». Eseguita da un passo del flusso (Claude Code, claude-sonnet-5-5) nella cartella `progetto/acasystem/frontend`, con `--maxWorkers=4` e solo test mirati. Nessun commit, nessun tablet, banco o Docker.

| Comando | Esito |
|---|---|
| `vitest run --maxWorkers=4` su 42 file pertinenti (vista pagine, pager, launcher, barre, indicatore, gesti, kit, fogli, trascinamento, pile) | 42 file, 893 test verdi |
| `npm run typecheck` | verde (tsc strict, test compresi) |
| `npm run lint` | verde (eslint su `src`) |
| `npm run lint:typography` | 0 violazioni (516 file) |
| `npm run lint:theme-colors` | 0 violazioni (341 file) |
| `prettier --check` sui file toccati | verde |

**Guardie nuove:** `SceneStaging.test.tsx` (messa in scena in due tempi, aspetto trattenuto nell'attesa, chiusura senza timer nell'attesa, flag di occupazione per la pressione lunga, scheda che entra, che esce e spostata, indicatore che cede alla pillola), `MotionChoreography.test.ts` (token, uscite più brevi delle entrate, ordine della scena, scale entro ±10 %, nessuna rotazione nuova), cinque scenari «staged scene» e quattro «press on a «+»» in `LauncherScreen.test.tsx`, vibrazione alla soglia in `LauncherGestures.test.tsx`. **Aggiornati** i test che fissavano il comportamento superato: `LauncherGestures`, `LagLayers`, `PagerBands`, `EditToolbarHidden` (CSS), `PagerOverview` e `PagerRestyle` (tempo di sicurezza della chiusura 410 → 450 ms). **Non eseguiti:** suite completa, backend, build, i18n, misure A1-A13 sul Tab M11, prova col dito, telefono, TalkBack. I test leggono il CSS come testo: il movimento reale e il costo di stile non sono verificati.

## 0.9.28, coreografia, blocco 2: fogli, Sistema, pillole e avvisi (2026-10-23)

Fonte: [REP-20261023-006](reports/REP-20261023-006-coreografia-animazioni.md), «Blocco 2 della realizzazione». Eseguita da un passo del flusso (Claude Code, claude-sonnet-5-5) nella cartella `progetto/acasystem/frontend`, con `--maxWorkers=4` e solo test mirati. Nessun commit, nessun tablet, banco o Docker.

| Comando | Esito |
|---|---|
| `vitest run --maxWorkers=4` su 50 file pertinenti (fogli, kit, Sistema, avvisi, indicatore, barre, vista pagine, pager, launcher, gesti, Casa 3D) | 50 file, 1013 test verdi |
| `npm run typecheck` | verde (tsc strict, test compresi) |
| `npm run lint` | verde (eslint su `src`) |
| `npm run lint:typography` | 0 violazioni (519 file) |
| `npm run lint:theme-colors` | 0 violazioni (341 file) |
| `prettier --check` sui file toccati | verde |

**Guardie nuove:** `SheetSystemChoreography.test.tsx` (contenuto del foglio congelato durante l'uscita, `data-arrived` all'arrivo, sovrapposizione di due fogli, fasi della scena di Sistema, toast, avviso e etichetta che escono), `MotionChoreographyBlock2.test.ts` (token uguali agli orari del codice, regole dei fogli, livello di Sistema solo `opacity` e `scale`, nessuno scivolamento negli avvisi, «Rimuovi» senza cambio di larghezza), `SystemScene.test.tsx` (LauncherPage reale con `overlayStaged`). **Aggiornati** due test che fissavano l'attributo `hidden` su «Fine» durante il trascinamento (`LauncherGestures`, `LauncherScreen`). **Non eseguiti:** suite completa, backend, build, i18n, e2e; misure sul Tab M11 (A1-A13) e prova col dito; in particolare lo scorrimento di Sistema nel suo nuovo livello non è stato provato su un dispositivo.

## 0.9.28, coreografia, blocco 3: widget (2026-10-23)

Fonte: [REP-20261023-006](reports/REP-20261023-006-coreografia-animazioni.md), «Blocco 3 della realizzazione». Eseguita da un passo del flusso (Claude Code, claude-sonnet-5-5) nella cartella `progetto/acasystem/frontend`, con `--maxWorkers=4` e solo test mirati. Nessun commit, nessun tablet, banco o Docker, nessun browser.

| Comando | Esito |
|---|---|
| `vitest run --maxWorkers=4` su 43 file pertinenti (vista pagine, pager, launcher, widget, trascinamento, kit, fogli, Sistema, gesti, pile, scene) | 43 file, 921 test verdi (dopo due correzioni lato test, vedi il report) |
| `vitest run --maxWorkers=4` su altri 12 file che nominano le classi del launcher o i token, più `LauncherSelection`, `LauncherDragDrop`, `DragGhostLift` | 15 file, 276 test verdi |
| `npm run typecheck` | verde (tsc strict, test compresi) |
| `npm run lint` | verde (eslint su `src`) |
| `npm run lint:typography` | 0 violazioni (520 file) |
| `npm run lint:theme-colors` | 0 violazioni (341 file) |
| `prettier --check` sui file toccati | verde |

**Guardie nuove:** `MotionChoreographyBlock3.test.ts` (21: token, sagoma piatta e tratteggiata, caselle, copia ferma, volo, uscita e entrata del widget, scale entro ±10 % con tre eccezioni preesistenti), `WidgetChoreography.test.tsx` (31: fasi di `useResizeShape`, sagoma su `WidgetHost`, store, caselle, volo di `useWidgetDrag`, `DragGhost`), 7 scenari in `LauncherScreen.test.tsx`. **Aggiornati** `MotionChoreography`, `LauncherGestures`, `LauncherScreen` (copia senza oscillazione) e `PagerFarPages` (la guardia ammette due `content-visibility`: la finestra delle pagine e il contenuto di un widget sotto la sagoma). **Non eseguiti:** suite completa, backend, build, i18n, e2e; misure A1-A13 sul Tab M11, prova col dito, telefono, TalkBack. In particolare non si sa se `content-visibility: hidden` sul contenuto tolga fotogrammi oltre 22 ms, né se `@starting-style` agisca sugli pseudo-elementi (anello, ombra della copia) su Chrome del tablet.

## 0.9.28, parte 2a: verifica completa del software e misura sul Tab M11 (2026-10-23, sera)

Fonte: [REP-20261023-006](reports/REP-20261023-006-coreografia-animazioni.md), «Esito della 0.9.28». Evidenze in `backup/v0928/` (esclusa da Git: `suite-1-*.txt`, `suite-2-*.txt`, `step-*.txt`) e `backup/v0928/tablet-misura/`. Esecuzioni di passi del flusso (Claude Code, claude-sonnet-5-5), cartella `progetto/acasystem/frontend` (e `backend`), `--maxWorkers=4`. Nessun commit. Questa sezione trascrive i file di evidenza; non rieseguo i comandi.

| Controllo | Esito |
|---|---|
| Suite frontend, primo giro (4 parti) | 1 test rosso su 3002: `MetalMaterial.test.jsx`, «tiene le primitive al primo livello…», perché `components/Sheet.tsx` importava da uno strato vietato. Parti: 730, 989 (1 rosso su 990), 707, 575 test |
| Correzione | Import di `Sheet.tsx` corretto dal passo di codice |
| Suite frontend, secondo giro (4 parti) | 199 file, **3002 test verdi** (730 + 990 + 707 + 575) |
| `tsc -p tsconfig.strict.json --noEmit` | Verde |
| `eslint src` | Verde |
| `npm run lint:typography` | 0 violazioni (520 file) |
| `npm run lint:theme-colors` | 0 violazioni (341 file) |
| `npm run i18n:check` | 1 file, 4 test verdi |
| `npm run build` | Completata; solo l'avviso sui pacchetti oltre 500 kB |
| `node scripts/check-bundle-size.mjs` | Tutti i pacchetti entro i limiti |
| Backend (`npm run test -w backend`) | 21 file, 202 test verdi |

**Limite sull'ordine.** I file `step-*.txt` hanno orario 19:33-19:37, subito dopo il primo giro (ultima parte alle 19:36) e prima del secondo (19:40-19:48): tipi, lint, tipografia, colori, i18n, build, dimensioni e backend non risultano rieseguiti dopo la correzione di `Sheet.tsx`. **Da rifare prima di un commit.**

**Misura sul Tab M11 (A1-A13 di REP-20261023-006).** Tab M11, Chrome 156, 1280×665, DPR 1,5; **gesti sintetici CDP** sui fixture, non il dito; base 0.9.27 (bundle estratto dal contenitore) contro `backup/v0928/dist-finale`; 0.9.26 per lo scorrimento; 5 giri alternati più il giro 0, mediana [min-max]. Esito: raggiunti A8, A12 (trasformazioni), A11; A7 solo sul «+»; A10 in parte; **non raggiunti A1-A6, A9, A13**. Scorrimento (blocco massimo, ms, 0.9.26 / 0.9.27 / 0.9.28): SW1 62 / 75 / 110, SW2 74 / 64 / 98, SW3 77 / 81 / 95, JUMP 93 / 119 / 106. Prova a video sul PC (Chromium software, nessuna rotazione né scuotimento, scale entro il 10 %): osservazioni, non misure di prestazione.

**Non eseguito:** prova col dito dell'utente; traccia del compositore (i rAF non sono fotogrammi presentati); telefono; Casa 3D; e2e (Playwright) sulla 0.9.28; aggiornamento del banco e copia a freddo (la tappa Z si è fermata prima). **Errore del passo di misura:** le prime prove (tabelle `L-*`) avevano un widget Luce in più in 3013/3014, uguale per le due build; valgono le tabelle `M-*`.

## 0.9.28, parte 3: correzioni delle regressioni e seconda misura sul Tab M11 (2026-10-24)

Fonte: [REP-20261023-006](reports/REP-20261023-006-coreografia-animazioni.md), «Parte 3: regressioni e correzioni (2026-10-23/24)». Evidenze in `backup/v0928/` (esclusa da Git: `suite3-*.txt`, `misura3/`, `diagnosi3/`). Esecuzioni di passi del flusso (Claude Code, claude-sonnet-5-5), cartella `progetto/acasystem/frontend`, `--maxWorkers=4`. Nessun commit. Questa sezione trascrive gli esiti riportati dai passi; non rieseguo i comandi.

| Controllo | Esito |
|---|---|
| Suite frontend completa (`npx vitest run --maxWorkers=4`) | 201 file, **3016 test verdi**, 1466 s (prima 199 file e 3002 test); nuovi `SystemSceneRenders` e `RegressionCss0928`; riscritte le attese di 13 test di `PagerFarPages` e `PagerFarNear` (fissavano il comportamento 0.9.28 superato) e i test dell'hook in `SceneStaging.test.tsx` |
| Test di guardia | host di scena non rifatto alla fine dell'attesa e nessun `flushSync`; `LauncherPage` non rende il launcher nelle fasi della scena (fallisce con il file di prima: 7 contro 4 e 14 contro 11 render); nessun `data-far` né classe sul pager dall'arresto dello scorrimento al restringimento; contenuto del foglio mantenuto per tutta l'uscita lenta; regola CSS e `will-change` di Sistema |
| `tsc -p tsconfig.strict.json --noEmit` | Verde |
| `npm run lint` | Nessun avviso né errore |
| `npm run lint:typography` / `lint:theme-colors` | 0 violazioni (522 / 343 file) |
| Prettier sui file toccati | Pulito |
| `npx vite build --outDir backup/v0928/dist-parte3` | Riuscita |
| i18n | Nella suite |
| Backend | Non toccato e **non rieseguito** |

**Misura sul Tab M11** (Chrome, 1280x665 a DPR 1,5; **gesti sintetici CDP** sui fixture, non il dito; `dist-parte3` contro 0.9.27 e, per lo scorrimento, 0.9.26; 5 giri alternati più il giro 0; giri non validi 0). Esito: **migliori** la chiusura del foglio «Impostazioni del widget» (layout-shift 0 contro 0,014), il riscontro del «+» (15,7-17,5 contro 107-301 ms), il tocco breve (0 fotogrammi sotto scala 1 in 12 prove su 12) e il blocco prima del volo della copia (0 contro 119-140 ms); **scorrimento** con blocco massimo non distinguibile dalla 0.9.27 (SW1 121 [76-146] contro 85, SW2 76 contro 60, SW3 72 contro 85) ma somma peggiore su SW1 e SW2 (348 contro 144; 275 contro 118) e JUMP peggiore su tutto (133 contro 93 ms); **peggiori** apertura della vista pagine (290 contro 65 ms prima della scena), «Fine» (894 contro 748 ms), Sistema, «Annulla» della pillola (285 contro 184 ms) e della barra, commit dentro il volo della copia (blocco 143 contro 0 ms), blocchi nel ridimensionamento.

**Non eseguito:** traccia CDP del thread (non registrata, vedi la diagnosi); prova col dito; telefono; Casa 3D; e2e (Playwright) sulla 0.9.28; backend; aggiornamento del banco. **Limiti:** gesti sintetici, i rAF non sono fotogrammi presentati. Le correzioni sono state provate prima della misura solo con i test di guardia (jsdom); la misura non conferma il ritorno dello scorrimento al livello della 0.9.27.

## 2026-10-23 — D1, parte server: facciata `/api/dispositivi`, identità di servizio e ricetta di accensione (REP-20261023-003, «Parte server di D1»)

Fonte: [REP-20261023-003](reports/REP-20261023-003-piano-aggiungi-dispositivi.md), sezione «Parte server di D1 (D1a, D1s, D1b)». Eseguita da un passo del flusso (Claude Code, claude-sonnet-5-5) **in una copia di lavoro** (`backup/d1/sandbox/acasystem/backend`, giunzioni verso i `node_modules` dell'originale), con `--maxWorkers=4`. Il codice non è in `progetto/acasystem`: la patch è `backup/d1/patch/d1-server.diff`. Nessun commit, nessuna VM, rete, tablet, TV, Docker, HA reale o credenziale; HA è un modello finto dentro i test.

| Comando (nella copia di lavoro) | Esito |
|---|---|
| `vitest run --maxWorkers=4`, prima delle modifiche | 21 file, 202 test verdi |
| `vitest run --maxWorkers=4`, alla fine | 28 file, 387 test verdi, 1 saltato (modalità `0600` del file segreto: solo POSIX, su Windows non esiste) |
| `vitest run --maxWorkers=4 src/__tests__/devices*.test.ts`, ripetuto più volte | 7 file, 185 test verdi, 1 saltato, a ogni ripetizione |
| `tsc -p tsconfig.json --noEmit` (strict) | verde |
| `eslint src` | verde |
| `node src/cli/deviceServiceIdentity.ts status` / `activate` senza terminale / senza argomenti, con `DATA_DIR` temporaneo | «non è stato attivato» (uscita 1) / rifiuto (uscita 2) / istruzioni (uscita 2) |
| `git apply --check -p1` e applicazione di `d1-server.diff` su una copia dell'albero vivo, poi `diff -r` con la copia di lavoro | riuscite; alberi identici |
| Sei mutazioni a mano del codice | quattro bloccate dai test, una equivalente, una scoperta e chiusa con un test |

**Guardie nuove (sette file):** `devicesHelpers.test.ts`, `devicesFlows.test.ts`, `devicesService.test.ts`, `devicesPower.test.ts`, `devicesIdentity.test.ts`, `devicesWiring.test.ts`, `devicesArchitecture.test.ts`, con l'HA finto in `fakeHomeAssistant.ts` e il banco di prova in `devicesHarness.ts`. Verificano, tra l'altro: 403 per gestore fuori elenco e per il flusso di un altro utente; «servizio non attivo» senza ripiego (segreto assente, illeggibile, sospeso, revocato, scaduto, non amministratore); abbinamento con la chiamata aperta per 10 s; flussi cancellati alla scadenza e al riavvio del backend; nessun valore di prova (indirizzo del TV `192.0.2.10`, MAC `02:00:00:00:00:01`, token, password) in risposte, intestazioni, log, console, registro e tabelle di `tunet.db`; il tunnel `/ha` porta solo il token dell'utente e non passa le rotte di configurazione; nessun modulo che invii pacchetti sulla LAN o legga la tabella ARP; catalogo delle 32 chiamate a HA (5 pubbliche, 27 interne) come unico punto che nomina rotte e comandi.

**Limiti di queste prove:**

- L'HA finto è un modello costruito leggendo il sorgente di HA e i piani, **non una registrazione**: nel repository non esiste alcuna fixture registrata da un HA vero. I test di contratto CT-01…CT-14 sulle fixture non esistono ancora e restano per D1g; queste prove non dicono che un HA reale risponda come il modello.
- Il comando di attivazione è provato con risposte simulate al posto di una persona e con un terminale simulato per l'input nascosto; **non è mai stato lanciato in un terminale vero né contro un HA vero**.
- Il controllo dei permessi `0600` non gira su Windows.
- `auth/delete_all_refresh_tokens` non è verificata (evidenza `unverified` nel catalogo).

**Non eseguiti:** applicazione della patch a `progetto/acasystem`, costruzione dell'immagine, suite del frontend e suite completa del progetto, prova con HA 2026.9.4 o 2026.10.2 reale, registrazione delle fixture, prova su Linux.
