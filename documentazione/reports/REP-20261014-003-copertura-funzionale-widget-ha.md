# Copertura funzionale dei concept Widget rispetto a Home Assistant

| Campo | Valore |
|---|---|
| Stato | Audit completato; nessuna implementazione assegnata |
| Data | 2026-10-14 |
| Autore | Codex |
| Richiesta | Valutare se i singoli widget coprono tutte le azioni possibili grazie a Home Assistant. |
| Perimetro | Confronto statico fra galleria, widget/pannelli operativi e documentazione ufficiale. Nessuna modifica ai componenti, nessun comando ai dispositivi, commit o deploy. |

## Criteri e limite della valutazione

La galleria contiene 20 concept con stato locale, non comandi HA. «Presente» nella matrice significa visibile nel concept, non implementato o verificato su HA. Per i widget reali l'ispezione del codice dimostra presenza dei percorsi, non riuscita su hardware.

La copertura totale delle azioni HA non è dimostrata: i domini offrono capacità opzionali e le integrazioni possono aggiungere entità e servizi propri. La documentazione pubblica consultata il 2026-10-14 mostra 2026.10.1; il banco HA è documentato come 2026.9.4, non interrogato in questo audit. Le nuove azioni documentate vanno confrontate con i servizi effettivi del banco e del dispositivo; nessun inventario live o test hardware eseguito.

## Matrice dei 20 concept

| Tipo | Nel concept | Lacune e valutazione |
|---|---|---|
| Sensore o entità | Temperatura, grafico e letture | Adeguato solo a un sensore in lettura. Il tipo applicativo include anche comandi: mancano switch, pulsanti, script/scenari, selezioni e valori numerici; useSensorControls.ts contiene già percorsi per diversi di questi casi. |
| Luce | Accensione, luminosità, Lettura/Relax | Mancano colore, temperatura colore, effetti/transizioni quando supportati. LightDetails.tsx offre già tonalità e temperatura colore, ma non prova una copertura completa di tutti gli effetti HA. I preset della galleria sono campioni locali. |
| Ventilatore | Accensione, percentuale e tre pulsanti | Mancano oscillazione, direzione e preset forniti dal dispositivo; già presenti in FanDetails.tsx. Le tre modalità dimostrative non cambiano la percentuale né sono preset HA. |
| Tapparella | Apri, chiudi, stop e posizione | Copertura primaria buona; manca il controllo delle lamelle (tilt). useCoverControl.ts e CoverDetails.tsx già prevedono tilt. Il simbolo grafico del concept non varia con la percentuale. |
| Stanza | Temperatura, umidità, presenza, luci e clima | Aggregato ACA, non dominio unico HA. Il concept manca dei comandi dei singoli dispositivi e delle azioni collettive/controlli climatici già presenti in RoomDetails.tsx. La copertura dipende dalle entità associate. |
| Clima | Accensione, temperatura, Auto/Caldo/Freddo | Mancano altre modalità HVAC, preset, ventola, swing verticale/orizzontale, umidità target e intervallo di temperature se supportati. ClimateDetails.tsx offre già modalità, preset, ventola e swing; non dimostra supporto di tutti i casi. Range 16–30 e passi di 1 °C della demo non sono limiti universali HA. |
| Serratura | Blocca/sblocca | Mancano apertura dello scrocco e codice quando richiesto, già previsti nel controllo operativo. «Porta chiusa» non segue dalla serratura bloccata: occorre un sensore porta distinto per affermarlo. |
| Videocamera | Anteprima e pausa/ripresa della vista | Non copre accensione camera, rilevamento movimento, snapshot, registrazione o invio stream a un lettore. PTZ e audio dipendono dall'integrazione; pausa della vista non equivale allo spegnimento camera. |
| Allarme | Toggle e In casa/Fuori casa/Notte | Mancano PIN, modalità aggiuntive esposte, stati di armamento/ritardo/scatto e altri comandi opzionali. AlarmDetails.tsx prevede già PIN e selezione delle azioni. «Tutti i sensori regolari» è solo un dato di esempio. |
| Android TV | Power, riproduzione e volume | Mancano telecomando direzionale/OK/indietro/home, sorgenti/app e mute. TvDetails.tsx offre già telecomando, sorgenti e mute. Altri servizi sono specifici dell'integrazione. |
| Apple TV | Power, riproduzione e volume | Stesse lacune del concept Android TV; comandi e sorgenti devono provenire dall'integrazione Apple TV effettivamente associata. |
| Multimedia | Play/pausa, precedente/successivo, volume | Mancano mute, stop, seek, repeat, shuffle, sorgenti, modalità audio, scelta dei contenuti e gruppi. useMediaControls.ts e MediaDetails.tsx offrono già diversi di questi controlli. |
| Sonos | Stessi controlli della musica | Oltre alle lacune media: coda, timer sonno, sveglie, snapshot/ripristino e altre azioni Sonos documentate. I gruppi media sono già nel pannello operativo; non tutte le funzioni specifiche Sonos risultano da questo audit del codice. |
| Aspirapolvere | Avvio/pausa e base | Mancano stop, localizzazione, potenza, pulizia spot/aree e comandi specifici. VacuumDetails.tsx contiene già potenza, aree, lavaggio e manutenzione quando disponibili. La percentuale di avanzamento e l'area non sono dati universali HA. |
| Tosaerba | Avvio/pausa e base | Manca stop distinto da pausa nella documentazione pubblica corrente. Zona, altezza di taglio e altre capacità dipendono da integrazione/entità ulteriori; mowerSpec operativo espone avvio, pausa e base. |
| Auto | Autonomia/batteria e ricarica | Aggregato ACA, nessuna lista universale di azioni veicolo. CarDetails.tsx include già clima, limite ricarica, serratura, aggiornamento e accensione dove associati. Il concept non li rappresenta. |
| Attività | Segna completata/non completata | Mancano aggiunta, modifica, rimozione e pulizia delle completate; date/descrizioni dipendono dalle capacità della lista. useTodoList.ts già contiene aggiunta e rimozione oltre al cambio stato. |
| Costi energetici | Costo giornaliero/mensile e grafico | Principalmente lettura; nessuna azione universale «costi» da aggiungere. Pulsanti Giorno/Mese della demo non cambiano i dati del grafico: non sono ancora una navigazione reale. |
| Prezzo energia | Prezzo e grafico | Principalmente lettura; interrogazioni e dati dipendono dall'integrazione (es. Nord Pool). Nessuna azione universale di controllo dell'energia implicita. |
| Separatore | Linea/spazio | Elemento di layout ACA: nessuna azione HA da coprire. |

## Componenti esistenti della Copertina

Non riprogettati, come richiesto. Orologio/data sono presentazione; meteo è lettura di stati/previsioni. Il calendario con eventi è distinto dalla card Data: mantenere il design non dimostra copertura di creazione/rimozione eventi o selezione calendari. Tale copertura non è stata collaudata in questo audit.

## Proposta, non implementazione

Mantenere la card minimale con azioni frequenti e rendere accessibili i controlli avanzati in un pannello di dettaglio. Riutilizzare i contratti e i pannelli operativi prima di aggiungere funzioni: evitare di perderne durante l'integrazione grafica. Mostrare controlli in base a supported_features, attributi, supported_color_modes, liste modalità e servizi disponibili; numeri/unità/range provengono dalle entità. Modellare disconnessione, unknown/unavailable, comando pendente, conferma HA, errore e configurazione mancante. Mai dedurre stato porta, progressi o salute sensori da attributi non disponibili. Proposta registrata come ISSUE-063; non autorizza sviluppo.

## Fonti primarie consultate il 2026-10-14

- [Light](https://www.home-assistant.io/integrations/light/), [Fan](https://www.home-assistant.io/integrations/fan/), [Cover](https://www.home-assistant.io/integrations/cover/), [Climate](https://www.home-assistant.io/integrations/climate/), [Climate entity](https://developers.home-assistant.io/docs/core/entity/climate/).
- [Lock](https://www.home-assistant.io/integrations/lock/), [Alarm control panel](https://www.home-assistant.io/integrations/alarm_control_panel/), [Camera](https://www.home-assistant.io/integrations/camera/).
- [Media player](https://www.home-assistant.io/integrations/media_player/), [Remote](https://www.home-assistant.io/integrations/remote/), [Sonos](https://www.home-assistant.io/integrations/sonos/).
- [Vacuum](https://www.home-assistant.io/integrations/vacuum/), [Lawn mower](https://www.home-assistant.io/integrations/lawn_mower/), [To-do](https://www.home-assistant.io/integrations/todo/).
- [Sensor](https://www.home-assistant.io/integrations/sensor/), [Weather](https://www.home-assistant.io/integrations/weather/), [Calendar](https://www.home-assistant.io/integrations/calendar/).

## Verifiche e chiusura

Ispezionati WidgetDesignGallery.tsx, catalogo, pannelli e hook operativi indicati nella matrice; confrontate le fonti primarie online. Nessun test di prodotto o esecuzione di servizi HA: non necessari a questo audit statico e non equivalenti alla prova su dispositivi. Audit concluso; nessun codice applicativo modificato. Il prossimo incarico richiede la scelta umana delle azioni da rappresentare nei dettagli e l'inventario delle entità dell'impianto.
