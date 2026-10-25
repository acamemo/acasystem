# REP-20261015-003 — Regressioni e completamento dei 20 widget operativi

| Campo                   | Valore                                                                                                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Stato                   | Software, collaudo isolato e banco 0.9.10 completati; criteri M11 e ISSUE-062 ancora aperti.                                                                                                     |
| Data                    | 2026-10-15, Europe/Rome                                                                                                                                                                          |
| Autore / modello        | Codex; identificativo esatto non disponibile.                                                                                                                                                    |
| Commit di partenza      | `7298d4df0d33bc92123517776d9ebc7c12ecefa6`                                                                                                                                                       |
| Richiesta e fonte umana | Piano completo «ACA SYSTEM: correggere le regressioni e completare i 20 widget» nella conversazione corrente. Successiva richiesta di ripresa dopo il limite di utilizzo, con tablet scollegato. |
| Autorizzazione          | ISSUE-065…073, venti tipi incluse le capacità prima dimostrative quando supportate, verifiche isolate/M11, ISSUE-062, backup e Docker 0.9.10. Nessun commit, aggiornamento dipendenze o HA.      |

## Perimetro e criteri

Working tree iniziale: 205 file modificati, 4 eliminati, 138 voci non tracciate, preesistenti. Preservati i contributi precedenti. L'audit REP-20261015-002 è l'evidenza di partenza; l'autorizzazione deriva dalla successiva richiesta umana esplicita.

Comandi di prova esclusivamente nel banco isolato 3003; nessun azionamento di impianti fisici. Foto/video in una cartella privata configurata e autorizzata in HA: senza destinazione il requisito mancante è esplicito. Nessun archivio ACA per foto/video o download automatico sul tablet. Simulazione dello scatto allarme confinata al kit/test.

Completamento software e collaudo isolato sono distinti dal collaudo fisico, escluso per scelta, e da quello M11, ora non eseguibile. Il piano richiede inoltre: suite complete frontend/backend e controlli statici/build; quattro taglie e responsive; backup a freddo e immagine completa con ripristino; dati/sessioni conservati; stato documentale fedele. Prestazioni finali, TalkBack, testo effettivamente ingrandito e standalone non possono essere chiusi con soli test automatici.

## Implementazione

- Componente adattivo comune in `components/widgets/adaptive`, con ID, `settingsKey`, impostazioni complete, dimensione e callback. Il kit riusa presentazione/gesti attraverso re-export; i dati dimostrativi restano separati dal percorso operativo. CSS importato direttamente dal componente operativo, senza dipendere dalla visita al kit.
- Anteprima del gesto separata da dispatch e conferma HA; throttle 180 ms, ultimo valore deduplicato, un invio per azione di tastiera, nessun nuovo invio all'annullamento. Richiesta pendente, rifiuto, timeout e riconciliazione riusano gli strumenti esistenti; rimossa la mappa ottimistica permanente.
- Serrature: secondo tocco e codice attraverso il controllo nativo, anche nei dettagli Auto. Allarme: PIN, transitori, modalità supportate e stato scattato reale, senza azione di simulazione in produzione.
- Profili con tutte le associazioni, catalogo servizi e feature reali; corretti volume, umidità, gruppi, robot e comandi collettivi. Un attributo leggibile non abilita la scrittura. Rafforzate anche accensione/spegnimento di ventilatore e clima aggregato e temperatura nei dettagli Auto/Stanza.
- Visibilità/ordine tipizzati e persistenti, fallback ai controlli frequenti e associazioni aggiuntive esplicite. Configurazioni senza preferenze ancora valide; selezione vuota conservata. I dettagli mantengono anche le capacità nascoste nella tessera.
- Compatta 2×1, Standard 2×2, Grande 3×3 e Pagina 4×4 collaudate. I minimi precedenti, compresi 1×1, e i massimi più ampi già disponibili restano validi; nessun riallargamento automatico di una tessera salvata. Estesi soltanto i limiti necessari a rendere raggiungibili Grande/Pagina. Test specifico conserva una disposizione 1×1 e la tessera adiacente. Standard/Grande misurano lo spazio; Pagina scorre internamente.
- Storici della grandezza rappresentata (stato, attributo o evento), unità reali, caricamento/errore/assenza dati espliciti, limiti di punti conservati. Richieste e stream limitati alla pagina visibile. Nessuna serie simulata nel percorso operativo.
- Attività: lista reale e modifica con riscontro dopo aggiornamento. Corretto il fallback di `todo.get_items`: l'array vuoto truthy mascherava gli involucri successivi. Anteprima camera contenuta nello spazio assegnato; pausa locale distinta dalla potenza.
- Conservati materiale soft-well, pressione 500 ms, tolleranza 14 px, feedback 60 ms e miglioramenti del login. Nessuna ottimizzazione prestazionale speculativa.

### Copertura software dei venti tipi

| Tipo          | Contratto implementato e condizionato alle capacità                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Sensore       | Stato reale, interruttori/comandi quando supportati, storico della grandezza associata.                                         |
| Luce          | Potenza, luminosità, colore/saturazione/bianco, effetti e transizione; niente scrittura dedotta dal solo attributo.             |
| Ventilatore   | Potenza, percentuale, oscillazione, direzione e preset effettivi.                                                               |
| Clima         | Temperatura/intervallo, umidità, modalità, ventilazione e oscillazioni supportate; unità HA.                                    |
| Tapparella    | Apertura/chiusura/arresto, posizione e lamelle solo con feature e servizi corrispondenti.                                       |
| Serratura     | Controllo nativo con secondo tocco, codice e stati transitori; cronologia eventi.                                               |
| Multimedia    | Lettore selezionato fra quelli associati, trasporto, volume, sorgenti, contenuti e gruppi configurati.                          |
| Sonos         | Come multimedia, più coda, timer, sveglie associate, snapshot/ripristino quando esposti.                                        |
| Android TV    | Lettore e telecomando esplicitamente associato, sorgenti/trasporto/volume supportati.                                           |
| Apple TV      | Lettore e telecomando esplicitamente associato, sorgenti/trasporto/volume supportati.                                           |
| Allarme       | Stato reale, modalità supportate, PIN e richieste native; nessun comando di simulazione scatto in produzione.                   |
| Videocamera   | Anteprima visibile, pausa locale distinta dalla potenza, movimento, foto/record in cartella privata HA, cast e ONVIF espliciti. |
| Aspirapolvere | Feature HA corrette, comandi e aree reali; entità aggiuntive solo associate. Nessuna zona o parametro universale inventato.     |
| Tosaerba      | Comandi, zone/altezza o manutenzione soltanto con servizi/entità effettivi.                                                     |
| Auto          | Letture, ricarica/limiti, clima, serratura e azioni delle associazioni complete.                                                |
| Stanza        | Letture aggregate e comandi collettivi sui soli target configurati e disponibili.                                               |
| Attività      | Lista HA reale, completamento, aggiunta, modifica verificata e rimozione; campi opzionali per feature della lista.              |
| Costi         | Periodi con sorgenti e intervalli effettivamente distinti, unità reali e assenza storico esplicita.                             |
| Nordpool      | Serie oggi/domani da dati reali, unità dell'entità e assenza dati esplicita.                                                    |
| Separatore    | Aspetto e spaziatura persistenti locali, nessun servizio HA.                                                                    |

La matrice descrive il codice e le fixture rappresentative; non certifica la presenza di tutte le integrazioni sul banco né il collaudo di dispositivi fisici.

## Verifiche

| Controllo                                | Esito ed evidenza                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Otto sonde dell'audit                    | Trasferite in `AdaptiveRegressions.test.tsx`, superate.                                                                                                                                                                                                                                                                                                                                   |
| Profili dei 20 tipi                      | Completi, ridotti, target/mappature, assenza, indisponibilità, preferenze e fonti storiche coperti da test permanenti.                                                                                                                                                                                                                                                                    |
| Errori/conferme                          | 16 tipi con comandi verificati sui target configurati, inclusi serratura e allarme; Attività con riscontro della modifica. Per Costi/Nordpool/Separatore verificati dati e impostazioni locali, senza comandi HA.                                                                                                                                                                         |
| Suite mirate finali                      | 232 test in 5 file superati; compatibilità griglie/posizioni 162 in 3 file.                                                                                                                                                                                                                                                                                                               |
| Frontend completo                        | **156 file / 2111 test superati**, esecuzione completa iniziata 22:41:05, durata 3687,92 s. Dopo l’ultima guardia socket: **4 file / 125 test mirati superati**, inclusi quattro test nuovi e i percorsi operativi/accesso/helper interessati.                                                                                                                                            |
| Backend completo                         | 17 file / 141 test superati, ultima esecuzione 22:24:58, 4,82 s.                                                                                                                                                                                                                                                                                                                          |
| Controlli statici                        | Typecheck frontend/backend, lint frontend/backend, tipografia, colori, Prettier dei file interessati e build superati.                                                                                                                                                                                                                                                                    |
| Banco isolato                            | `isolated-server.check.mjs` superato: HTML di produzione identico, REST HA non inoltrato, soli servizi/target delle fixture. Server senza client/proxy in uscita; token fittizio, CSP same-origin.                                                                                                                                                                                        |
| Browser PC                               | Due passate da 240 viste: 20 tipi × 4 taglie × 390/1280/1920 px. Dettagli da tastiera, configurazione/persistenza, gesto/throttle/conferma, movimento ridotto; zero errori di pagina e overflow orizzontale. Seconda passata verifica camera e ultimo controllo Pagina. Verifica funzionale finale dopo compatibilità/feature: altre 240 viste superate sul dist definitivo, zero errori. |
| Banco reale                              | **0.9.10 healthy**, health locale/LAN 200, proxy HA 200, tutti i 90 asset conformi, versione UI isolata 0.9.10; tabelle SQLite identiche prima/dopo.                                                                                                                                                                                                                                      |
| M11                                      | Non eseguito dopo la ripresa: tablet scollegato. Nessuna impostazione Android modificata.                                                                                                                                                                                                                                                                                                 |
| ISSUE-062                                | Aperto: mancano tre aperture/tre chiusure della variante finale, ≤1 frame >50 ms e nessun blocco GPU >40 ms per animazione. Nessun risultato precedente promosso a misura finale.                                                                                                                                                                                                         |
| TalkBack, testo 125/150%, PWA standalone | Non eseguiti realmente; nessun passaggio umano attribuito senza evidenza. Manifest, emulazione viewport e `font_scale` non bastano.                                                                                                                                                                                                                                                       |
| Dispositivi fisici                       | Esclusi per scelta; nessun comando di collaudo inviato.                                                                                                                                                                                                                                                                                                                                   |

Browser e suite separati; ogni invocazione Vitest usa `--maxWorkers=4`. Un solo Chromium di prova, GPU disabilitata. Log selezionati e risultati sotto `backup/rep003` e file temporanei `aca-003-*`. Detector Impeccable eseguito una volta: `[]`; due passate di ispezione visiva, poi sola verifica funzionale dopo le guardie di compatibilità/capacità.

Esecuzioni durante la lavorazione: baseline completa 2058/2058; successiva 2082 superati e un caso Stanza fallito con modulo già caricato prima della correzione. Riesecuzione finale mirata 185/185 superata; ulteriori controlli di compatibilità/capacità 162/162 e 232/232. Una suite avviata prima dell'ultima guardia di compatibilità è stata interrotta, non contata come superata. Prima prova browser fermata su Stanza nascosta dalla logica legacy; correzione verificata nelle successive passate. Conservare gli esiti falliti/interrotti come intermedi, senza presentarli come risultato finale.

## Backup, recupero e rete

Il 2026-10-15 alle 22:21, con `aca-tunet-tunet-1` fermo (arresto dopo timeout, exit 137), salvati:

| Artefatto locale, escluso da Git                            |     Dimensione | SHA-256                                                            |
| ----------------------------------------------------------- | -------------: | ------------------------------------------------------------------ |
| `backup/banco/rep003-20261015-pre-0.9.10-volume-freddo.tgz` |    406112 byte | `51f696f25f25adb171e839aa4ad76552e3ca72b8c4285500975faece42edb013` |
| `backup/banco/rep003-20261015-container-ripristino.tar`     | 223015936 byte | `92ad2b7d3a0ed357eb63e47e9d468185fd5f89c7f9736a7d67279555dbb1fd02` |

Snapshot filesystem: `aca-system:rep003-20261015-ripristino`, ID `sha256:d038885f8e422fbcd1436d7a41b073d6097991e0025478e17927c0a264ea3cd4`. Include il dist modificato che il vecchio tag 0.9.9 non rappresenta. Il volume è separato e contiene DB, WAL e SHM. Manifest in `backup/rep003/recovery-manifest.json`.

Il riavvio ha rilevato un cambio di rete: `192.168.1.7` non era più assegnato al PC. Osservato Wi-Fi `192.168.1.19`, aggiornato il binding specifico Compose. Ripristinata temporaneamente la snapshot con override immagine/versione 0.9.9: health 200 su localhost e LAN, hash dei vecchi JS/CSS identici, dati invariati. Questo verifica il ripristino del filesystem/container; il volume reale non è stato sostituito. Un avvio diretto della snapshot come helper aveva fallito sul binding storico: per la verifica dati è stata usata l'immagine applicativa senza rete.

Verificata inoltre l'estrazione del backup in tmpfs, in un helper senza rete e senza volume reale: `PRAGMA integrity_check=ok` e SHA-256 delle tre tabelle identiche. Conteggi: 0 profili, 12 impostazioni correnti, 188 revisioni storiche. Le impronte confrontano i contenuti senza stamparli. HA non aggiornato né riavviato.

Dati e storage del browser non vengono cancellati. Il nuovo indirizzo LAN è un'origine diversa per il browser: accesso/sessione e disposizione sul M11 al nuovo URL restano da verificare; nessuna promessa di sessione autenticata su quel dispositivo senza prova.

### Procedura di ripristino

Dalla radice del repository, verificare prima l'indirizzo LAN nel Compose. Per tornare al filesystem precedente conservando i dati correnti:

```powershell
docker load -i backup/banco/rep003-20261015-container-ripristino.tar
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep003/compose.recovery.override.yaml up -d --no-build --pull never tunet
```

Override conservato in `backup/rep003/compose.recovery.override.yaml`:

```yaml
services:
  tunet:
    image: aca-system:rep003-20261015-ripristino
    environment:
      ACASYSTEM_VERSION: "0.9.9"
```

Controllare health/versione, hash Df7kljmP/HD4WDER4 e database. Non usare il solo tag originale 0.9.9. Se occorre recuperare anche i dati, fermare il servizio, salvare prima il volume corrente e recuperare il tgz in un **nuovo volume dedicato**, associandolo tramite override: non sovrascrivere il volume corrente. L'estrazione isolata è stata verificata; non è stato eseguito un ripristino dati sul volume reale.

## Rilascio finale

Immagine completa 0.9.10 costruita dal Dockerfile/Compose, con `npm ci` dal lockfile esistente. Nessuna copia manuale nel container. Immagine finale `sha256:8bc011a9abf0d1cee52ba6ec4314de0fa9f4e6cfa117e3b57f89e6788fa64fb1`: tutti i 90 file identici al dist locale. Index `3e5f79921dc97d68220dcc99c78a8fd9c00a5a349d1b62f77c2c513a9136a976`; JS `index-DErCxP8Y.js` `d1084fbe7a7e2eb8023effe25a5026a6442fe55b9575fa8373df047abc06da49`; CSS `index-BxkHuO5G.css` `5d24032b58b45aa820b0dfbb51d7dbca4131aae7f49425d2d41a219fa03e86b4`. Distribuzione via Compose conclusa alle 23:48: API 0.9.10 locale/LAN, healthy, proxy HA 200. `release.check.mjs` supera confronto dei 90 file serviti, versione resa in Sistema isolato e chiusura reale del socket senza nuovi comandi. La pagina autentica M11 non è stata ricaricata. Avviso build: principale circa 818 kB e HLS 574,55 kB; prestazioni M11 non misurate.

## Fonti primarie

Consultate il 2026-10-15, versione banco HA 2026.9.4: [Camera](https://www.home-assistant.io/integrations/camera/), [Sonos](https://www.home-assistant.io/integrations/sonos/), [ONVIF](https://www.home-assistant.io/integrations/onvif/), [servizi Sonos versionati](https://github.com/home-assistant/core/blob/2026.9.4/homeassistant/components/sonos/services.yaml), [sveglie Sonos](https://github.com/home-assistant/core/blob/2026.9.4/homeassistant/components/sonos/switch.py), [feature e servizi Fan](https://github.com/home-assistant/core/blob/2026.9.4/homeassistant/components/fan/__init__.py), [feature Climate](https://github.com/home-assistant/core/blob/2026.9.4/homeassistant/components/climate/const.py). Il catalogo effettivo e le capacità dell'entità prevalgono sulla disponibilità teorica documentata.

## Chiusura e punto di ripresa

Completati software dei venti tipi, correzioni, collaudo PC isolato e banco 0.9.10. Alla riconnessione del M11 riprendere: ricaricamento e sessione al nuovo URL, due orientamenti/dettagli/configurazione/gesti, prestazioni finali ISSUE-062, TalkBack, ingrandimento effettivo 125/150% e PWA standalone. Questi criteri restano aperti e non costituiscono completamento generale del piano. Nessun commit Git, aggiornamento dipendenze/stack/HA, remote o comando agli impianti fisici.

## Ultima guardia di disconnessione e consegna

Dopo la suite completa è stata verificata una lacuna reale non rappresentata dalla sola fixture `conn: null`: HA conserva l’oggetto `Connection` con socket chiuso. Il runtime ora propaga null durante la disconnessione; il client API rifiuta anche `connected === false` prima di inviare/accodare servizi e letture. Contratto dei client leggeri senza proprietà `connected` conservato. Quattro test nuovi e gruppo mirato **125/125** superati; browser con chiusura reale del WebSocket simulato conferma messaggio offline, controlli assenti/disabilitati e **zero nuovi comandi**. ISSUE-074 registra questa regressione di disponibilità e la sua soluzione. Primo controllo browser troppo restrittivo cercava soltanto pulsanti disabilitati: corretto per accettare anche controlli rimossi quando il catalogo è indisponibile. Nessuna ulteriore modifica visiva. La suite completa 2111/2111 precede questa sola guardia finale, verificata dal gruppo mirato e dal browser; non è presentata come una nuova esecuzione completa dei sorgenti successivi.

Ultima copia a freddo alle **23:48**, immediatamente prima della sostituzione: `backup/banco/rep003-20261015-pre-release-volume-freddo.tgz`, 406105 byte, SHA-256 `a613ed9f2259b3cf13f8335c27575eec07bf94f178f771e884db63ad22645026`. Anche questa copia è stata estratta in tmpfs senza rete, con SQLite integro e impronte identiche ai dati del rilascio. Per recuperare i dati usare preferibilmente questa copia più recente. Il volume effettivo `aca-tunet_tunet-data` e lo storage browser non sono stati cancellati.

Esito consegna: completamento software e collaudo isolato dei venti tipi; nessun collaudo di dispositivi fisici. M11 e prestazioni/accessibilità manuali ancora aperti. HEAD invariato, nessun commit o aggiornamento dipendenze/HA.

Nota sul metodo: la breve suite backend delle 22:24 si è sovrapposta all’avvio di una suite frontend poi interrotta; entrambe avevano `--maxWorkers=4`. La suite completa conclusiva frontend e il gruppo finale della guardia socket hanno lavorato con il solo proprio pool, senza browser o altre suite concorrenti.
