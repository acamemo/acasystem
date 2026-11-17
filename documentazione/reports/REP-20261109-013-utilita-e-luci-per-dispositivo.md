# Trova dispositivi, Tavano e Luci per dispositivo

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261109-013 |
| Stato | Completato localmente; build .58, banco .57 conservato |
| Data | 2026-11-09, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta di riferimento | «PLEASE IMPLEMENT THIS PLAN: Trova dispositivi, Tavano e widget di prodotto», piano integrale nella chat corrente |
| Autorizzazione | Redesign delle due utilità, accesso diretto dal catalogo, percorso comune di associazione/posizionamento e prima famiglia Luci. Build locale; banco e pubblicazione successivi e distinti. |

## Obiettivo e perimetro

Catalogo: Trova dispositivi e Tavano primi due accessi diretti, mantenendo l'aggiunta delle utilità alla Home come azione secondaria. Una vista per ciascuno strumento, tema ACA Vetro Bianco e primitive condivise. Tavano conserva giorni0–6, paginazione30, dettagli, copia ed export depurati.

Nuove Luci: un widget per dispositivo HA, con canali e funzioni compatibili; entità aggiuntive soltanto dello stesso device_id. Collegamento HA e creazione widget sono fasi distinte. Prima di Conferma nessuna scrittura del profilo: seed associato, planner e commit autorevole della .57. Dispositivi già rappresentati raggiungono il widget esistente, con scelta per duplicati storici e risoluzione di pile/nascosti. Famiglie non migrate conservano i flussi attuali. Nessuna migrazione globale di identità, abilitazione di entità, privilegio nuovo, dipendenza o comando automatico.

Fonti: [REQ-18/19/26 e prodotto](../funzionalita/product.md), [design corrente](../design/design.md), [catalogo](../design/componenti/catalogo-widget.md), ADR-0004/0005/0019/0022/0024 e [REP012](REP-20261109-012-widget-da-catalogo-a-posizionamento.md). Excel umano HomeAssistant_Integrazioni_2026-11-04.xlsx: snapshot dev d5fc37f, matrice documentale e non dipendenza runtime. I modelli e la copertura hardware non sono contenuti nel foglio.

Baseline: banco .57/r99;1819sorgenti byte-identici alla fonte REP012;628voci Git preesistenti. Checkpoint sorgenti e Git in backup/rep070/, prima di qualunque modifica applicativa. Account, profili, banco, HA/D1 e distribuzioni installate restano fuori dalle mutazioni autorizzate.

## Criteri di completamento

- Accessi diretti e ordine esatto, nessun salvataggio per la consultazione.
- Trova con ricerca e stati Da collegare/Pronti/Già aggiunti; flussi HA e fallimenti reali, risultati conservati.
- Binding condiviso con identità distinta e matrice di copertura; hub non aggregati arbitrariamente, Luci multicanale complete e controlli supportati.
- Posizionamento associato con Conferma/Annulla, ACK e ID stabile; raggiungimento di widget storici, pile e nascosti senza modificare visibilità.
- Utilità e Luci responsive, tastiera/reduced motion; gesti e foto fissa conservati, niente nuove sovrapposizioni o blur animato.
- Test pertinenti, strict frontend/UI, build e QA browser locale; evidenze e limiti distinti dal debito ISSUE-134 e da prove hardware.

## Avanzamento e modifiche

Attività suddivise per proprietà dei file. Impeccable già caricato nel piano, craft-floor letto prima delle modifiche UI; surgical-coding applicato. Nessuna installazione o pubblicazione.

Catalogo: activation=open-tool per le prime due voci, priorità prima dei gruppi senza duplicare tile. Trova e Tavano aprono direttamente contenuti condivisi con i widget Home; pin secondario riusa il planner .57. Callback di uscita reale della Console/PanelPresence per evitare ghost sotto un dialogo in uscita; proprietari distinti della scena impediscono a una utilità precaricata ma chiusa di liberare la Home dell'altra. La barra dimostrativa non traspare più attraverso l'intestazione della Console.

Trova: ricerca e tre stati; registri/aree letti separatamente, refresh conservativo, nessuna attesa fittizia o stagger dei risultati. PIN, consensi, nascondi/undo e percorsi delle altre famiglie conservati. La rilettura post-collegamento enumera tutti i device del config_entry prima della classificazione: anche hub tecnico+una sola luce non è dichiarato un dispositivo singolo. Helper e CSS condivisi scendono nello strato corretto; i vecchi ingressi template sono shim. Lookup async protetto da token, visibilità e scope: chiudere Trova invalida sincronicamente l'intento, perciò una risposta tardiva non lascia la Home inert in attesa di un'uscita già terminata.

Luci: contratto v1 con deviceId, famiglia, entità principale, canali, secondarie e classificazione tecnica; associazioni soltanto del device esatto, senza abilitazioni. Un seed già associato, nome reale e preview inerte precedono un unico commit/ACK. Controlli principali conservano gli ID, i canali secondari li distinguono; Misure e Tecnica separate. Griglia privata4colonne desktop/2telefono verificata, senza cambiare altre famiglie. Un'associazione manuale diversa invalida il vecchio aggregate nel renderer/lookup senza riscrivere i profili. Il binding strutturale non viene copiato dalla memoria di configurazione.

Destinazioni derivate da layout e binding: pagina logica/segmento, settingsKey e pila corretti; scelta per duplicati storici, apertura dei dettagli per nascosti senza unhide. La pila appartiene alla pagina che effettivamente la contiene. Tavano conserva le API e la conservazione, ma rende l'azione leggibile prima dei metadati, filtri senza UUID visibili e copy/export depurati. Matrice e ADR49 registrano tutti45domini e28tipi, distinguendo aggregazione nel lotto e copertura dei parametri HA ancora parziale.

## Verifiche ed evidenze

| Controllo | Procedura | Esito | Evidenza e limiti |
|---|---|---|---|
| Baseline | Confronto SHA1819sorgenti con REP012 | Superato | backup/rep070/source-before.json;0differenze,628voci Git conservate |
| Regressioni | vitest run,23file; successivo lookup6casi dopo rifinitura della pila | Superato | 404/404 nel gruppo,6/6 lookup;405scenari unici/410asserzioni eseguite. combined-final-tests.json, lookup-final-tests.json, tests-final-summary.json |
| Protezioni e canali | Test root/owner: identità, token tardivo, PIN/consenso, multicanale,403, rebind, ACK/bozze | Superato | Nessun retry fisico automatico o associazione fra device diversi nei casi sintetici. Test owner inclusi nel gruppo, non sommati due volte |
| UI/design/strict | npm run test:ui; typecheck:ui; test:design; prebuild frontend typecheck | Superato | 3UI+6design; log typecheck/UI e build. Non equivale a CI generale |
| Lint generale | npm run lint -w frontend; confronto ESLint del sorgente checkpoint | Debito preesistente | 7errori identici alla baseline:4Launcher,2HomeStartupContext,1BottomDrawer. Nessuna nuova diagnosi; lint-comparison-final.json. Non dichiarato lint generale verde |
| Build | ACASYSTEM_VERSION=0.9.58 npm run build -w frontend | Superato | build-final-0.9.58.log; warning chunk>500kB, nessuna variazione di dipendenze o promessa GPU |
| Browser reale della demo | Chromium privato1916×882/390×844, poi pacchetto produzione esatto su4187 | Superato | Tavano/filtri/copia, testo estremo, ordine/direct tools e Luce con binding; zero errori JS/comandi automatici e zero scritture profilo prima di Conferma. production-qa/qa-package-summary.json |
| Byte e perimetro | Snapshot, manifest owner, EOL e confronto asset HTTP/dist/ZIP | Superato |1834sorgenti,34modificati/15nuovi,0rimossi/estranei; gestiY,tema,Cover e backend immutati.13CSS, entry e index identici al ZIP |
| Documentazione | Collegamenti locali dei documenti coinvolti | Superato | docs-link-check.json; nessuna modifica degli archive |
| Banco | Osservazione Docker selezionata, senza env/segreti o comandi mutativi | Superato | ACA .57 stessa immagine e HA/D1 invariati; bank-readonly-observation.json. Nessuna verifica account invasiva o lettura di credenziali |

Il primo gruppo più ampio ha dato385/400:15aspettative dei vecchi ingressi Discovery non erano aggiornate al corpo comune. Conservato in combined-feature-tests.json, corrette le aspettative di etichette/filtri/uscita asincrona e il conteggio per prefisso che includeva GET/scoperti/ignorati; PIN, polling15s e stop restano verificati. I negativi dei soli harness browser (selettori/spazi, attesa iniziale, gesto sintetico e tre builtinCover) sono conservati, non promossi a risultati positivi.

Sul telefono Conferma in Copertina materializza tre builtin già presenti nel DOM prima della conferma, come .57: cover_clock/calendar/weather. Ammessi soltanto con Cover già abilitata e invariata, esattamente questi tre ID e nessun altro extra/rimosso, configurati solo in Cover e layout.ts byte-identico. È una sola nuova Luce, non quattro nuove istanze di prodotto; la qualifica è nel report QA.

## Controllo del diff e decisioni

Perimetro approvato dal piano umano, [ADR-0049](../decisions/ADR-0049-widget-prodotti-per-dispositivo.md).49delta applicativi attesi, senza rimozioni o estranei; nessun cambiamento a dipendenze, backend, gesti verticali, materiale o semantica Cover. La revisione indipendente ha individuato la race del lookup dopo chiusura, ora corretta e testata nel Launcher. Fonti storiche preservate; il nuovo percorso completo si attiva per Luci e le altre famiglie non sono dichiarate complete. ISSUE-134 resta aperta.

## Chiusura e punto di ripresa

Completato localmente: ACA0.9.58, fonte1834/SHA cad07996e1b783c7383f5cd330e8da0cdb7498f3039e23d8d921907a71a14501. ZIP2710049byte/SHA42f38ca9a5785ef3d3203d0bd220512fd5e5c4891088c8ec532a1479f9049e35, entry index-DmO9XvJn.js/SHA055335b7b7e5a000b417a9c0568fdd86c6b37dd4552c869b9370e0846165c4df. Build e manifest in backup/rep070/; [istruzioni locali](../../backup/rep070/PROVA-0.9.58.md).

[Anteprima produzione locale](http://127.0.0.1:4187/?screen=app#/mockup) mantenuta disponibile con dati simulati; browser QA chiusi, server di sviluppo4186 chiuso dopo le prove. Banco .57/account/profili/HA/D1 e pubblica .34 non aggiornati, nessun commit o push. Nessun incarico software residuo dentro questa prima consegna; aggiornamento del banco e famiglie successive richiedono i rispettivi incarichi. Pairing hardware, telefono fisico, Lenovo M11 e prestazioni GPU non certificati da Chromium sintetico.
