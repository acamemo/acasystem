# REP-20261029-002 — Widget TV confrontato con Home Assistant

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261029-002 |
| Stato | Fatto e provato su `/mockup`; non committato; prove sulla LG UA751C0LA da fare |
| Data | 2026-10-29 (Europe/Rome) |
| Autore / modello | Claude Code, `claude-opus-5-5` (analisi, controllo e revisione); implementazione con agenti Sonnet |
| Commit di partenza | `5c321b9` |
| Richiesta di riferimento | «Voglio analizzare e migliorare la nostra dashboard React (Acasystem) confrontandola punto per punto con Home Assistant, procedendo un widget per volta…»; scelto il widget TV. |
| Autorizzazione | «Implementa i gap 1-5 e i miglioramenti UI 1-4 del widget TV, con prova su /mockup.» Poi: «aggiungi nei dettagli della TV un'azione «Configura l'accensione» che apre il passo di accensione esistente.» Poi: «Implementa la 1 (uscita audio LG) e la 2 (scegli contenuto per la TV), con prova su /mockup. Prima verifica i parametri sulla documentazione di HA.» Nessun commit. |

## Fonti

- Home Assistant, entità `media_player`: stati (`off`, `on`, `idle`, `playing`, `paused`, `buffering`; `standby` deprecato) e bit `MediaPlayerEntityFeature` ([contributors.home-assistant.io/core/entities/media-player](https://contributors.home-assistant.io/core/entities/media-player/), letta il 2026-10-29).
- `webostv.select_sound_output`: dato obbligatorio `sound_output`; valori comuni `tv_speaker`, `external_speaker`, `external_optical`, `external_arc`, `headphone`; l'uscita in uso è nell'attributo `sound_output`; nessun elenco delle uscite disponibili ([home-assistant.io/actions/webostv.select_sound_output](https://www.home-assistant.io/actions/webostv.select_sound_output/), documentazione 2026.10.4, letta il 2026-10-29). Sorgente `home-assistant/core`, ramo `dev`, `webostv/media_player.py` e `const.py`: con `external_speaker` o `lineout` cade `VOLUME_SET`; nessun `BROWSE_MEDIA`.
- Sfoglia contenuti, sorgente `home-assistant/core` `dev` letto il 2026-10-29: `apple_tv` (cartella delle app, poi media source), `androidtv_remote` (app configurate in HA, tipo `app`) dichiarano `BROWSE_MEDIA`; `samsungtv` e `webostv` no.

## Modifiche

**Mancanze 1–5 e miglioramenti 1–4 dell'interfaccia**
- Stati a parole per tutte le TV: «In pausa», «Caricamento…», «In standby», «Non raggiungibile» (`model/tv.ts`, `adaptiveState.ts`). `standby` conta come spento.
- LG spenta: HA la segna `unavailable`. Se può essere svegliata dalla rete (TURN_ON dichiarato ora o l'ultima volta che si è vista, oppure ricetta di accensione configurata sul server) mostra «Spento» e il tasto di accensione resta attivo (`hooks/useTvWake.ts`). `config_entry_id` arriva dal registro delle entità (`utils/entityRegistryMetadata.ts`).
- Accensione senza risposta: dopo 10 s «La TV non ha risposto. Riprova.» con «Riprova» (`useConfirmedCommand` con `timeoutMessage`, `hooks/useTvPower.ts`).
- Tasti tenuti premuti: frecce del telecomando e canale ± ripetono (400 ms, poi ogni 150 ms; `hooks/useHoldRepeat.ts`).
- Tasto di accensione disabilitato con la spiegazione «Per accenderla da qui serve l’accensione dalla rete».

**«Configura l’accensione»**
- Nei dettagli e nella console di una TV LG con voce di configurazione: «Configura l’accensione» quando la ricetta manca, «Modifica l’accensione» quando c'è. Apre sul posto il passo esistente `PowerStep`, ospitato dal launcher con `hooks/launcher/PowerSetupContext.tsx` e `templates/devices/PowerSetup.tsx`; senza launcher non compare.
- Alla chiusura `refreshTvWake` rilegge la ricetta: il tasto di accensione si abilita subito.
- Solo LG: la ricetta del server si basa sul trigger `webostv.turn_on`. Samsung e le altre TV non hanno l'azione.

**«Uscita audio» (LG, a TV accesa)**
- Le cinque uscite della documentazione con nomi semplici; l'uscita in uso, se è un'altra, si aggiunge. Il pulsante segnato segue l'attributo `sound_output`.
- Rifiuto o nessun cambio entro 10 s: «La TV non ha questa uscita collegata» (`model/tvSound.ts`, `parts/tv/TvChoices.tsx`).

**«Scegli contenuto» (TV con `BROWSE_MEDIA`, a TV accesa)**
- Riusa `MediaChooser` del lettore, con i video ammessi e senza le app, che restano nella sezione «App». Per le TV si apre su «Libreria».
- Android TV remote: la sezione «App» prende le app restituite dalla navigazione; se nessuna o in errore resta l'elenco fisso dei link della documentazione (`hooks/useTvBrowsedApps.ts`, `model/tvApps.ts`, `model/choices.ts`).

**Demo `/mockup`** (solo `src/utils/mockup/*`)
- LG: si spegne in `unavailable` e si risveglia dopo circa 3 s; `sound_output` modificabile (accetta altoparlanti, ARC, altoparlante esterno; le altre uscite mostrano l'errore). Ricetta di accensione salvabile con `POST /accensione/:entryId`.
- Samsung della cucina senza modo di risveglio; Apple TV con pausa → caricamento → riproduzione, cartella delle app e «Video».
- Scenario «TV che non risponde»; registro delle chiamate in `__acaDemo.calls()`.

## Verifiche ed evidenze

| Controllo | Comando/procedura | Esito | Evidenza e limiti |
|---|---|---|---|
| Statici frontend | `npm run typecheck`, `lint`, `lint:typography`, `lint:theme-colors`, `build` | Superato | 0 violazioni; build con il solito avviso sulla dimensione dei blocchi |
| Test mirati | `TvStates`, `TvHold`, `useHoldRepeat`, `useConfirmedCommand`, `TvPowerSetup`, `TvSoundOutput`, `TvBrowse`, `TvDetailsHa`, `TvConsole`, `TvPowerApps`, `TvAppLaunch`, `AvTv`, `AvMedia*`, `MediaConsole`, `MockupHa`… | Superato | Ultimo giro dell'orchestratore: 11 file, 171 test |
| Suite completa frontend | `npx vitest run` | Superato con instabilità note | 3670/3673; i 3 falliti (`FixLauncherUiShell` ×2, `ShellLauncher` ×1) passano rilanciati da soli (2 file, 33/33): tempi sotto carico, già visti in REP-20261029-001 |
| Fine riga | `git diff --stat` = `git diff --ignore-cr-at-eol --stat` | Superato | 32 file |
| `/mockup` nel browser | Server della build su `:3016`, 1280×665 e 390×844 | Superato | LG spenta «Spento» e risveglio; pausa/caricamento; messaggio di tempo scaduto e «Riprova»; ripetizione tenendo premuto; configurazione dell'accensione fino al risveglio; uscita audio (soundbar, errore sull'ottica, altoparlante esterno con volume a passi); Apple TV «Scegli contenuto» → «Concerto dal vivo». A 390 px nessuno scorrimento orizzontale |
| Revisione del diff | Lettura dell'orchestratore dei file sorgente nuovi e cambiati | Fatto | Nessun errore trovato; corretto l'avvio del pannello su «Preferiti» vuoto |
| LG UA751C0LA reale | — | Non eseguito | Vedi questioni residue |

## Seconda verifica sulle fonti e demo 1:1 (2026-10-29, pomeriggio)

Richiesta: «leggi dalla documentazione ufficiale ha se le API per il funzionamento sono corrette… Riusciamo anche a rilevare su che canale si trova la tv?». Autorizzazione: «rendi la LG e la Samsung della demo 1:1 con le funzioni reali di HA (TV in diretta compresa), correggi la riga di stato della LG in diretta, rinomina avanti/indietro in canale successivo/precedente quando la TV è in diretta e aggiungi il tasto Guida per LG. Prova su /mockup, senza commit.»

**Fonti lette:** sorgente `home-assistant/core` `dev` di `webostv/media_player.py`, `samsungtv/media_player.py`, `samsungtv/remote.py`, `samsungtv/entity.py` e `androidtv_remote/media_player.py`; pagine `integrations/webostv` e `actions/webostv.button`.

**Esito sulle chiamate:** tutte coerenti con HA. Da provare sulla TV vera:
- i tasti LG `REWIND`/`FASTFORWARD`, che non sono nell'elenco dei nomi noti («altri tasti possono funzionare»);
- lo stop della Samsung: HA lo dichiara, ma nel file letto non c'è l'implementazione.

**Canale:**
- LG: sulla TV in diretta `media_title` è il nome del canale (non il numero né il programma) e `media_content_type` è `channel`.
- Samsung e Android TV: nessun canale.
- Avanti e indietro: sulla LG in diretta cambiano canale; sulla Samsung sono sempre `KEY_CHUP`/`KEY_CHDOWN`.

**Accensione LG:** con l'automazione di accensione, che è la ricetta del server, la TV spenta è `off` e dichiara TURN_ON; senza, è `unavailable` (documentazione). Il rischio del punto 1 sotto vale quindi solo senza ricetta.

**Modifiche:**
- La demo LG ora ha le funzioni reali: niente barra di avanzamento, casuale, ripeti o navigazione; è su «Live TV», con titolo «Rai 1» e contenuto di tipo `channel`. Canali in cerchio, `play_media` di canale, sorgenti e volume seguono `sound_output`. Si spegne in `off` con la ricetta e in `unavailable` senza.
- La demo Samsung ha le funzioni reali, senza livello di volume (manca UPnP) e senza titolo.
- Widget:
  - riga di stato «Acceso · TV in diretta · Rai 1», con la sorgente prima di «Schermata Home»;
  - «Canale precedente/successivo» sulla TV in diretta e sempre sulla Samsung;
  - tasto «Guida» per LG;
  - sottotitolo del lettore vuoto a TV spenta (correzione dell'orchestratore).

**Verifiche:**
- typecheck, lint, `lint:typography`, `lint:theme-colors` e build superati;
- 15 file di test, 206 test (agente), poi 6 file, 137 test dopo la correzione dell'orchestratore;
- fine riga invariati (36 file).
- Browser a 375×812: dettagli della LG «Acceso · TV in diretta · Rai 1», nessuno scorrimento orizzontale, solo il cursore del volume, «Canale precedente/successivo» da 44 px, «Guida» presente.

**Osservazione:** sulla TV in diretta la LG mostrava il canale due volte, con «Canale −/+» nei comandi rapidi e «Canale precedente/successivo» nella riproduzione.

**Annotazione 2026-10-29:** su richiesta («quando avanti/indietro cambiano canale, toglili dalla riproduzione e lascia solo «Canale −/+»»), la riproduzione non mostra più avanti e indietro quando cambiano canale e la TV ha già «Canale − / +» (`parts/tv/TvPlayer.tsx`). Le etichette «Canale precedente/successivo» restano solo per una TV senza «Canale − / +».

Verifiche:
- `TvDetailsHa` aggiornato e formattato con Prettier (HEAD era formattato);
- 6 file, 143 test superati;
- typecheck e build superati; fine riga invariati.

Su `/mockup` i dettagli della LG mostrano «Canale», «Canale −», «Canale +», «Riproduci» e «Ferma», senza avanti né indietro. Quattro «Canale +» portano da Rai 1 a Canale 5, poi altri due a La7. Il pannello del browser ritarda la resa degli aggiornamenti (timer della pagina rallentati); la sequenza è stata confermata anche con un test temporaneo su sessione e connessione della demo, poi cancellato.

## Loghi dei marchi e ombre tagliate (2026-10-29, sera)

**Loghi** («Metti il logo del marchio nel widget TV e nei dettagli al posto dell'icona generica, accanto al nome»):
- Il logo, letto da HA tramite `/api/dispositivi/loghi/:domain`, sostituisce l'icona generica nell'intestazione dei dettagli e della console e nella copertina del lettore (ordine: immagine del contenuto, logo dell'app, logo del marchio, icona).
- Scelta: per piattaforma (`webostv`, `samsungtv`, `apple_tv`…); per `androidtv_remote` e `cast` prima il produttore registrato, poi l'integrazione.
- Demo: scritte neutre «LG», «SAMSUNG», «Apple TV» disegnate in codice, nessun file di marchio.
- Nella home del `/mockup` le TV sono widget adattivi e non mostrano il logo.
- Controlli: typecheck, lint, build, 10 file e 190 test.
- Da confermare con un HA vero: disponibilità dei loghi, resa nelle proporzioni reali, produttore «Google Inc.» che precede il logo di Cast.

**Ombre tagliate** (screenshot dell'utente su «Collega la TV», poi «correggi le ombre tagliate dei punti 1-5…»):
- **«Collega la TV»:** la regola `.aca-media-widget__message > *` (`overflow: hidden` per i puntini del testo) tagliava anche la riga dei pulsanti. Corretto in `media.css`. Non verificato a schermo: nessuna TV della demo è collegata solo via Cast.
- **Scansione automatica di `/mockup`:** Playwright senza interfaccia, home e dettagli di 23 widget a 1280×665 e 390×844, per ogni ombra esterna confrontata con il primo contenitore che taglia. Trovati altri cinque casi, corretti:
  1. selettori a segmenti (`themes/acasystem/components.css`: la guida non taglia più);
  2. lettori a 390 px (`media.css`: spazio tra i tasti che si riduce);
  3. lista della spesa (`home.css`: spazio interno compensato);
  4. «Soglia» del widget adattivo (`adaptiveWidget.css`: spazio interno compensato);
  5. tessere ai bordi della pagina (`launcher.css`: `overflow-clip-margin`).
- Nuovo token `--aca-shadow-reach: 1rem` in `tokens.css`.
- Dopo le correzioni restano solo i tasti al bordo di aree che scorrono (tastierino dell'allarme, frecce del telecomando), che non sono difetti.
- Controlli: typecheck, lint, build, 14 file e 264 test; fine riga invariati.
- Limiti:
  - il punto 5 si nota solo durante lo scorrimento tra le pagine, non osservato;
  - nella lista della spesa, se un elenco fosse tagliato in altezza, fino a 16 px della riga successiva resterebbero visibili.

## Questioni residue

1. **Accensione di una LG `unavailable`.** HA di solito non esegue azioni verso un'entità non disponibile: senza ricetta di accensione `media_player.turn_on` potrebbe essere ignorato. Con la ricetta la TV spenta è `off` (vedi sopra). Da provare sulla UA751C0LA.
2. Valori reali di `sound_output` sulla UA751C0LA, comportamento con un'uscita non collegata, caduta di `VOLUME_SET` con l'altoparlante esterno, presenza dell'attributo `platform`.
3. Forma reale dell'albero di navigazione su Apple TV, Chromecast e Android TV.
4. Una lettura della ricetta fallita per rete conta come «non configurata» per 60 s: la LG appare non raggiungibile finché non si rilegge.
5. Non svolte per scelta (proposte): spegnere solo lo schermo, messaggi sulla TV, scrittura di testo, ricerca, annunci vocali, modalità Arte.
6. Decisione aperta da REP-20261029-001: la tessera piccola mostra un solo comando.

## Chiusura e punto di ripresa

**Stato:** fatto e provato su `/mockup`; non committato.

**Punto di ripresa:** prova sulla LG UA751C0LA (punti 1 e 2), poi commit su richiesta; poi il prossimo widget del confronto con HA.
