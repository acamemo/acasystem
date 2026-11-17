# REP-20261111-002 — Area Robot: Aspirapolvere e Tagliaerba

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261111-002 |
| Stato | Completato localmente |
| Data | 2026-11-11, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile. |
| Commit iniziale | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta / autorizzazione | «vai con area robot», dopo la proposta di Aspirapolvere prima e Tagliaerba dopo, sul modello un widget per dispositivo, Home sintetica e manutenzione separata. Attuazione locale verificata; banco e pubblicazione distinti. |

## Obiettivo e perimetro

Proseguire REQ-18/19, ADR-0049 e matrice per le due famiglie esistenti vacuum e mower. Riutilizzare React/TypeScript, primitive ACA Vetro Bianco, API/registri e associazione/posizionamento/Conferma/ACK. Contratto prodotto v1, chiave storica bindingEntityId conservata per entrambe. Esatto device_id, canali ordinari e secondarie coerenti; una centrale/hub non diventa un unico robot. Uso e tecnica/manutenzione separati. Legacy, ID, widget, memoria, preferenze, account e profili conservati senza migrazione automatica.

Git iniziale734voci preesistenti; checkpoint .63 di1899file/SHA57b09d7b9e1d014c13e5a69806bfc3fc129ee75b54dc73a9edd63110807bfce0 verificato integralmente in backup/rep076. Non modificare documentazione/archive, dipendenze, stack, streaming, autenticazione, gateway o gesti globali. Build finale locale .64 verificata; nessun commit, installazione o aggiornamento del banco.

## Criteri di completamento

- Aspirapolvere, quindi Tagliaerba; ricerche e preparazione indipendenti possono procedere in parallelo.
- Un widget per esatto dispositivo, tutti i canali ordinari della famiglia e controlli univoci; Home multicanale sintetica senza comando collettivo. Nascondere/disabilitare non equivale a concedere l'attivazione.
- Stati reali e comandi disponibili secondo HA: avvio, pausa, arresto, ritorno alla base e funzioni soltanto quando esposte. Distinguere accettazione software, richiesta e stato osservato. Nessun reinvio automatico, azione su mount/anteprima o coda offline; arresto/pausa/ritorno supportati non soffocati da una regolazione pendente, senza promessa di ordine fisico nel gateway (ISSUE-154).
- Batteria, modalità, velocità/zone e misure solo se realmente presenti e pertinenti. Nessuna capacità inventata da un marchio, nome o valore predefinito. Stanze/mappe solo attraverso capacità o associazioni esplicite dello stesso prodotto; niente scanner, protocolli o servizi custom universali nuovi. Preferenze esplicite storiche conservate, fallback legacy se metadati non coerenti.
- Trova e selezione manuale sul medesimo risolutore; ghost associato inerte, Conferma e risposta autorevole, retry stabile, Annulla/no-space senza nuove pagine; widget esistenti, duplicati, pile e pagine nascoste.
- UI italiana, primitive condivise, dettagli centrati, testi lunghi/320/390/desktop/tastiera/movimento ridotto, transizioni esistenti senza blur/zoom/tagli aggiunti.
- Test delle due famiglie e percorsi comuni, regressioni mirate sugli8lotti precedenti, strict/build/contratti e debito ISSUE-134 separato. QA browser su ZIP esatto; dati simulati, HA reale e hardware distinti.

## Avanzamento e modifiche

| Fase | Stato |
|---|---|
| Fondazione | Contratto v1 per vacuum/lawn_mower,44test puri e strict PASS;8resolver precedenti e priorità preservati. |
| Aspirapolvere | Attuato;57UI e194raccordi sovrapposti PASS. Primo checkpoint1912/SHA58d4734b, QA6flussi/6cold/5visuali qualificata; correzioni successive incluse nel pacchetto finale. |
| Tagliaerba | Attuato;59UI e28raccordi sovrapposti PASS. Corretti i gate delle richieste in volo, riquadro piccolo e scenario simulato indisponibile; QA finale6flussi/6cold/5visuali PASS. |

- Guard di famiglia e risolutori per esatto device_id: solo canali ordinari abilitati/visibili, secondarie/tecnica distinte. Image/camera proprie consentono una mappa Vacuum senza raccogliere l'intera integrazione; camera tecniche solo stato. Metadati identitari senza URL, token o configurazioni complete.
- Trova, associazione manuale, anteprima inerte, nomi e metadati atomici, Conferma/riscontro, destinazioni esistenti e cache aggiornati per entrambe le famiglie. bindingEntityId conservato, nuovi prodotti minimi2×2; nessuna conversione o creazione automatica di pagine.
- Home sintetica singola o multicanale, nessun comando collettivo. Dettagli per canale e uso/tecnica separati, stato osservato distinto da richieste/riscontro software. Return non equivale ad arrivo e docked non dimostra carica. Capacità e servizi effettivi; pause/stop/ritorno indipendenti da altre richieste, senza promessa di priorità fisica (ISSUE-154).
- Vacuum: velocità da stringhe HA; aree dal mapping già configurato e registro esatto, nessuna chiamata admin get_segments. Risultati fenced per conn/entity/deviceId/capacità; script, selettori e numeri espliciti conservati con limiti/passaggi reali. Preferenze mappa ID/mostra/scala conservate; URL immagini transitori, data/blob non alterati dal refresh. Letture tecniche non duplicate nell'uso quotidiano; manutenzione esplicita nella sezione tecnica.
- Mower: start_mowing1/pause2/dock4/stop8; zone/altezza da secondarie o associazioni esplicite, nessuna scala inventata. Image/camera solo informazioni, nessun nuovo video. Chiamate in volo distinte dal tracker dello stato per impedire invii duplicati senza bloccare definitivamente un'azione già osservata.
- Primitive Vetro Bianco, Console, selettori e transizioni esistenti; nessun nuovo blur/zoom del paesaggio. CSS Mower locale nei contenitori bassi, gap2px senza ridurre font, dati o target40px. Campo generico controlli nascosto solo nei nuovi prodotti; restanti associazioni/pannelli conservati, testi distinti dai rilevamenti euristici legacy.
- Nessun package, lockfile, backend, autenticazione, trasporto o gesto globale modificato.4corpi legacy ricostruiti byte-identici, manifest e scope revisionati indipendentemente.

## Verifiche ed evidenze

Evidenze in backup/rep076, escluse da Git. I contatori sovrapposti non si sommano.

| Controllo | Esito / evidenza | Limiti |
|---|---|---|
| Checkpoint .63 |1899file/SHA57b09d7b e ZIP verificati prima delle modifiche |734voci Git preesistenti conservate. |
| Binding Robot |44/44PASS, strict scoped |Funzioni e array di priorità precedenti immutati. |
| Vacuum UI |57/57PASS, strict/lint scoped |Prima51, poi6regressioni aggiuntive per fence/capacità/copy/esito incerto; log WIP importMower assente conservati e non contati come test. |
| Mower UI |59/59PASS, strict/lint scoped |Due RED reali conservati, nessuna modifica agli helper globali. |
| Raccordi |194/194prima fase,28/28seconda |Unità sovrapposte a gruppi UI e binding. |
| Regressione ampia |78file,1426/1427PASS e1RED |Il RED è il gate visuale Mower durante avvio in volo; sorgente corretta e rieseguita sotto. Il primo JSON non viene riscritto. |
| Correzioni finali |120/120PASS in MowerProduct59+MockupHa61 |Dopo OR in-flight, CSS compatto e fixture unavailable. Ultimi esiti perfile:1427/1427in78file, qualificati in tests-summary.json; non si dichiara verde il primo run né tutta la suite del repository. |
| Backend pertinente |28/28PASS activityCommands/collaboration/profileService |Nessun backend modificato; permessi e comandi reali distinti. |
| Strict/build |Frontend build .64, backend eUI PASS |Warning dimensione chunk preesistente; nessun aggiornamento dipendenze. |
| Contratti/design |3UI/6asset PASS, colori PASS |Tipografia1preesistente connect.css:103, nessun nuovo debito dichiarato. |
| Lint generale |7fingerprint uguali alla .63 |ISSUE-134 separata; eslint-corrected-final.json e lint-comparison-final.json sul sorgente finale. |
| QA browser finale |PASS sul ZIP esatto, porte effimere GET/HEAD, dati finti |320/390/1916, per famiglia6/6flussi+6/6cold+5/5visuali; nessun banco. |
| Provenienza |1918/SHA7318cd94,25modificati/19nuovi/0rimossi/estranei/EOL o whitespace nuovi |ZIP110file/2738428byte SHAe0aeecdd, entryDlwNIQsJ; identici a dist e HTTP4194. source-final-0.9.64.zip verificato integralmente. |

### Negativi conservati e correzioni

- Review Vacuum: mappa tecnica esplicita, lettura tecnica duplicata, lavaggio numerico scomparso, data/blob corrotto dal cache-bust e button unknown prima pressione. Corrette solo le nuove diramazioni, con test e riuso dei controlli esistenti. Aree vecchie dopo cambio deviceId e bit CLEAN_AREA perso sono invalidati; placeholder italiani e messaggi prudenti sugli esiti incerti.
- Mower: sending ref non liberato se il target era già osservato; aggiunto stato della chiamata in volo separato dal tracker. RED successivo startheld→mowing→docked con Dock disabilitato: condizione render allineata al fresh handler tramite inFlight; caso59verde dopo il fix. Il primo run78file conserva lo stesso negativo.
- Browser candidato2deb: Home320 tagliava i pulsanti40px dentro la card138px; corretta solo la spaziatura locale sotto8rem. Scenario unavailable non includeva il prebound tagliaerba: aggiunto dev_tagliaerba alla fixture e assert che il singolo libero resti disponibile.
- Primo harness Vacuum cercava Alla base nel testo del comando Torna alla base e generava falso positivo sui dettagli indisponibili: corretto per osservare lo stato del canale, senza togliere controlli o alzare timeout. Originale negativo e retake qualificato conservati.
- Stage7dd0e67 e candidato2debf26d restano distinti dal pacchetto finale e non ne anticipano l'accettazione. La ripresa dopo interruzione ha riavviato soltanto l'anteprima4194 prima di completare il controllo HTTP; nessuna modifica al banco.

### Fonti primarie

Lette2026-11-11, tag2026.10.4: [vacuum/const.py](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/vacuum/const.py), [vacuum/services.py](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/vacuum/services.py), [vacuum/websocket.py](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/vacuum/websocket.py), [lawn_mower/const.py](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/lawn_mower/const.py), [lawn_mower/services.py](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/lawn_mower/services.py). Non certificano ogni integrazione dell'Excel, la versione attuale del banco o un robot fisico. Il mapping options.vacuum.area_mapping associa area_id a list[str] di segmenti; l'app invia area_id e lascia ad HA la risoluzione, senza privilegi aggiuntivi.

## Controllo del diff e decisioni

Scope finale verificato indipendentemente:1918hash correnti corrispondono,25modificati/19nuovi pertinenti. API/backend, trasporti, dipendenze, modello globale delle identità, corpi legacy e fonti originali conservati. Solo scelte esecutive entro la richiesta umana; ISSUE-134/152/153/154/155/156 e nuova proposta157 restano distinti. Nessuna approvazione dedotta dal backlog.

## Consegna e chiusura

Area Robot completata localmente nella .64. Ultimi esiti qualificati perfile:1427casi frontend/78file PASS, con il primo RED ampio conservato e120/120correzioni ripetute separatamente;28/28backend, strict/build,3UI/6asset e colori PASS. Non è una dichiarazione di suite generale completa o CI attiva. Lint7/tipografia1 preesistenti e ISSUE-134 distinti.

QA sul sigillo finale: ciascuna famiglia6/6flussi,6/6cold e5/5visuali PASS, totali12/12/10. Comandi espliciti, associazione manuale/Trova, Annulla/no-space e raggiungimento del widget esistente senza duplicati nei casi provati. Vacuum ha mappe proprie dataSVG realmente decodificate e aree esatte per canale; Mower copre i quattro comandi supportati. Zero errori JavaScript/richieste esterne inattese/WS; zero comandi nei visuali. Browser/contesti e server privati chiusi; anteprima4194 lasciata disponibile. Nessun benchmark fisico o GPU/FPS.

Root ha visionato MowerHome320 e VacuumDetails390; revisione indipendente anche i dettagli390/1916 di entrambe. Home320 card138×138: i due comandi40×40 terminano a129.9375px, con oltre8px di margine. Tutti20targetHome delle10varianti40×40 e contenuti; dettagli centrati, larghezze280/350/640 rispettivamente320/390/1916, nessun overflow orizzontale. Otto tabelle di campioni delle transizioni mantengono sfondo CSS/viewport costanti e nessun blurfullscreen; ciò non prova invarianti pixel né prestazioni hardware.

Fonti finali1918/SHA `7318cd941542154c9e5d76f2b659f563f8664be1aa59b7f1e11cfdde9ead727f`:25modificati/19nuovi/0rimossi/0estranei/0EOL o whitespace nuovi, hash/manifests verificati indipendentemente. source-final-0.9.64.zip integro. Build110file/2738428byte, ZIP SHA `e0aeecdd803f8e08c98e16b78ccae8ad3828080573046da8ddc4bc6850e23eef`; entry index-DlwNIQsJ.js/SHA50eb3c90. ZIP uguale a dist e HTTP4194. Sigillo qa-robot-final-seal.json, riepiloghi per famiglia, source-audit.json e artifact-manifest.json in backup/rep076.

[Aprire l’anteprima locale](http://127.0.0.1:4194/?screen=app#/mockup). Build in backup/rep076/acasystem-web-0.9.64-local.zip e istruzioni in PROVA-LOCALE.md nella stessa cartella. Trova offre Aspirapolvere studio/Robot pulizia e Tagliaerba esterno/Robot giardino; i prebound dimostrano la compatibilità dei percorsi.

Account, profili, widget reali e dati della centrale conservati: banco, HA e release pubblica non aggiornati. Nessun commit o installazione. Collaudo fisico, integrazioni reali, prestazioni tablet e distribuzione sono operazioni distinte. Le proposte e il debito documentati non sono incarichi impliciti. Nessun lavoro software residuo dell'area Robot assegnata.
