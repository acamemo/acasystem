# Aggiornamento banco e verifica sul tablet collegato

| Campo | Valore |
|---|---|
| ID | REP-20261014-009 |
| Stato | Completato; verifiche del banco e dei flussi disponibili concluse, lag e limiti di copertura registrati |
| Data | 2026-10-14 |
| Autore | Codex |
| Commit di partenza | 7298d4df0d33bc92123517776d9ebc7c12ecefa6 |
| Richiesta | Portare il lavoro su localhost:3002, testare il tablet collegato e verificare funzionamento, lag, UI e UX. |
| Autorizzazione | Richiesta umana corrente: aggiornamento del banco Docker locale e prove sul tablet. Supera il precedente vincolo di non aggiornare il banco; nessun commit richiesto. |

## Perimetro e criteri

Costruire e avviare il frontend/backend corrente come nuova immagine locale, conservando il volume e una copia a freddo. Verificare salute, versione, proxy HA e asset. Usare il tablet USB collegato (Tab M11 TB330FU), con sessione già aperta; misurare fluidità e verificare pagine, griglie, configurazione, modifica, persistenza e pannelli. Evitare comandi fisici non necessari su impianti. Conservare il diff e la disposizione personale; prove reversibili e ripristino dopo le azioni di modifica.

Il codice corrente comprende i concept nel kit e i widget operativi nelle pagine, come chiarito in REP-008. Questa distribuzione non converte i concept simulati in nuove funzioni HA. Nessun commit, nuova dipendenza, installazione o aggiornamento di HA.

## Stato iniziale

Banco `aca-system:0.9.3`, immagine `sha256:1cba363b6f6e4fc54390ebfb13383b7a0f2c75966efc1684d82175106cbbc80a`, container healthy; volume `aca-tunet_tunet-data`. Tablet USB in Chrome, schermo acceso. Dettagli e risultati da registrare dopo esecuzione.

## Controlli del codice e prima distribuzione

Suite completa frontend: 1.849/1.850 superati (150 file, 582 s, quattro worker). Un selettore del test di visibilità della Copertina trovava anche l'orologio introdotto nella categoria Casa; ora seleziona quello della Copertina. Il file rieseguito passa 10/10. Backend 141/141 (17 file); typecheck e lint dei due workspace superati; tipografia 0 violazioni/440 file, colori 0/314; detector sui template launcher senza rilievi (`[]`). Nessun allargamento delle funzionalità per risolvere il test.

Prima immagine `aca-system:0.9.4`, SHA-256 `b1e01a4e34a459905bdb144933e2c17d3df42d0ec4e8a94f871f66fc7b9fd5f4`, creata il 2026-10-14T13:32:11Z. Build e budget superati (index 411,0 KiB/900); warning del chunk hls preesistente. Copia a freddo `backup/banco/tunet-data-20261014-pre-0.9.4-freddo.tgz`: 203.637 byte, SHA-256 `0931a902552c53aca8f86e9bd29412f6bbbddece8d266f4c01a8e633a5da3b4d`. Container healthy; health/versione, index, bundle `index-CWjtVFX3.js` e provider HA rispondono 200 su loopback e LAN; stesso volume. Home Assistant non ricreato.

Dopo il reload del tablet, asset 0.9.4 verificato, sessione conservata, nove pagine e marker di inizializzazione presente. La verifica reale ha però rilevato 19/25 card di categoria visibili: il filtro operativo preesistente nascondeva sensore, ventilatore, multimedia, Sonos e i due robot privi di associazione. Difetto non riprodotto dalla preview senza il filtro HA.

Correzione limitata a LauncherPage: i preset non associati rimangono visibili; quelli associati passano l'id del dispositivo effettivo al filtro. La scelta esplicita di nascondere una card rimane valida. Aggiunte verifiche per tutti i 25 preset con entità HA caricate e per ventilatore associato/nascosto. Suite mirata 131/131, typecheck/lint superati. Distribuita come 0.9.5: sul tablet 25 card di categoria, tre della Copertina e nove pagine.

La prima ispezione delle schermate compilate ha rilevato padding azzerati e contenuto sotto la barra: i CSS dei widget caricati prima del foglio principale registravano `components` prima di `base`, quindi il reset Tailwind prevaleva. `index.html` ora dichiara l'ordine dei layer prima degli asset. La 0.9.6 ripristina gli spazi già previsti dal kit (pagina 24 px verticali/28 px orizzontali sul M11), senza nuovi colori o ridisegno. Secondo passaggio: sette categorie in orizzontale (1280 × 664/665) e verticale (800 × 1144/1145), zero celle libere, sovrapposizioni o elementi fuori griglia; margini e barra corretti. Rotazione automatica ripristinata. Build/budget e formattazione superati.

Prove su 0.9.6: 21 pannelli di associazione aperti, focus dentro e nessun overflow orizzontale; il falso allarme sul rettangolo esterno di Stanza è stato controllato sul pannello visibile (titolo e superficie entro viewport). Sensore HA reale scelto tra dieci candidati: opzioni dopo associazione, lettura disponibile e dettagli; associazione rimossa dopo la prova. Pressione lunga sul ventilatore non associato, rimozione e Annulla riusciti. Vassoio: fila 144 px, tutte le tessere 104 × 128 px, pannello 268,79 px in otto categorie e risultati vuoti; ricerca trasversale, filtro rapido e movimento ridotto (0 animazioni), Separatore «4 × 1» verificati. Aggiunta con tap e trascinamento con preview riusciti; widget temporanei rimossi.

La prova touch orizzontale ha individuato un click residuo dopo la cancellazione del puntatore, che apriva l'aggiunta. Correzione: il vassoio ignora quel click lasciando validi tastiera e nuovo tap; il drag di aggiunta su touch parte sull'asse verticale, mentre sull'asse orizzontale cede allo scroll. Test regressione e suite vassoio/drag 47/47, typecheck/lint/formattazione superati. Conferma su 0.9.7: scroll di 1.696 px, nessun dialogo o widget aggiunto; drag iniziato verticalmente, preview valida e una card aggiunta. Card temporanea rimossa; frecce/Spazio per aggiungere e Escape per chiudere provati. Versione in Sistema 0.9.7; dopo reload nove pagine, 28 widget e marker 1. Kit sul banco: 20 card e nessun overflow della pagina.

## Esito finale e prestazioni

Immagine corrente `aca-system:0.9.7`, SHA-256 `7754c47acc67c4800083ba0c3e62c6e6eef7afdaeaaacbc17d0d13ac56c84668`, creata il 2026-10-14T14:20:58Z; container healthy. Bundle `index-C1c5Y-MI.js`, 421.189 byte, SHA-256 `7fd79b83e325fc7b479e1ed59bfbe16e22e39d048be9e8b90186300ff56eac1e`, verificato dal server e sul tablet. Health e provider HA 200 su loopback e LAN. Budget finale 411,3 KiB/900 per index, altri chunk entro soglia; warning hls preesistente. Tipografia e colori rieseguiti: zero violazioni. `git diff --check` superato (avvisi CRLF/LF preesistenti).

Prima della 0.9.7: copia a freddo `backup/banco/tunet-data-20261014-pre-0.9.7-freddo.tgz`, 218.283 byte, SHA-256 `7710515876df5e50796fa6226b35d327a14319adbb27fd56ed49c02ed0bc02e9`. Copie intermedie: pre-0.9.5 203.632 byte, SHA-256 `19b4e5c53b89d573a34cadcfdfaf51898f8307716607e0a466d1d387aaa9aa71`; pre-0.9.6 210.683 byte, SHA-256 `a951a5922ecc0e583621362e9d32a7132046ed3b2f059560105032f403d5083b`. Nessun ripristino dati eseguito.

Due giri di `measure.cjs base` sulla 0.9.7, schermo acceso/app visibile, senza altri test browser o Vitest concorrenti. Intervalli requestAnimationFrame, non misura certificata della latenza del dito. Nove pagine rispetto alle due della baseline: carichi diversi, confronto indicativo.

| Scenario | Baseline 0.9.3 | Finale 0.9.7 |
|---|---|---|
| Quiete | 89,7–90,1 fps | 90,0 fps, nessun frame oltre 50 ms |
| Scorrimento Copertina/Principale | 84,4–86,7 fps | 82,5–84,7 fps; massimo 67–89 ms, un frame oltre 50 ms per passaggio |
| Ingresso modifica | 87,3–87,7 fps | 88,4–88,8 fps; massimo 33–44 ms, zero frame oltre 50 ms |
| Apertura vista pagine | 67,1–68,0 fps; massimo 333–367 ms | 58,8–62,9 fps; massimo 345–411 ms, 2–4 frame oltre 50 ms |
| Chiusura vista pagine | 67,7–68,7 fps; massimo 189–211 ms | 54,3–55,2 fps; massimo 222 ms, 5–6 frame oltre 50 ms |

Percorse tutte le sette categorie due volte: 81–88 fps, massimo 67 ms entrando in Luci e comandi; altre categorie massimo 22–45 ms, nessun frame oltre 50 ms. P95 dei passaggi ordinari 11,2 ms. Lo scatto della vista pagine rimane e non rispetta il criterio storico di al più un frame oltre 50 ms. ISSUE-062 aperto: nessuna rimozione delle ombre o altra proposta grafica applicata per nasconderlo.

## Evidenze, limiti e punto di ripresa

Comandi principali: test frontend completo `npm run test -w frontend -- --maxWorkers=4`; file corretti/mirati 10/10, poi 131/131 e 47/47; backend `npm run test -w backend -- --maxWorkers=4` 141/141; typecheck/lint dei workspace, tipografia/colori, Prettier e build Compose. Browser fisico separato da Vitest; sul PC nessun browser GPU avviato. Build successive per i tre difetti, senza dipendenze aggiornate.

Evidenze locali escluse da Git in `backup/tablet-009/`: preferenze selezionate prima del reload (senza autenticazione), schermate a due orientamenti, controlli dei pannelli, gesti e misure 0.9.5/0.9.7. Strumenti `avvio-tablet009.cjs`, `check-tablet009.cjs`, `flows-tablet009.cjs`, `gestures-tablet009.cjs`, `post-tablet009.cjs`, oltre ai precedenti in `backup/strumenti-tablet/`. Le prove sono eventi touch/tastiera sintetizzati in Chrome sul tablet reale, con GPU del tablet. Non prova con dito umano o TalkBack.

Molti domini non hanno entità adatte in questo HA: nessuna prova di comandi fisici per luce, ventilatore, tapparella, serratura, allarme, TV, robot o videocamera live. Associazione/lettura/dettagli del sensore reale verificati; assenza dispositivi verificata nei pannelli. Nessun comando a impianti inviato. Non eseguiti offline, recovery del volume, memoria GPU, testo ingrandito/TalkBack o accettazione umana UX. I concept/grafici adattivi restano simulati nel kit, le categorie usano le card operative (ISSUE-064). Calendario/Attività non associati restano con skeleton e Multimedia/Sonos sono poco distinguibili: osservazioni UX per il successivo incarico, non correzioni applicate.

Stato finale: sessione HA conservata, associazione di prova rimossa, widget temporanei eliminati, Principale vuota come all'inizio, sette categorie presenti; nessun dialogo/modifica attivi. Rotazione ripristinata ai valori iniziali (automatica 1, rotazione utente 0). HA invariato, nessun commit o deploy remoto. Incarico concluso; punto di ripresa: decisione umana sulla vista pagine (ISSUE-062) e sul trasferimento dei concept nelle card operative (ISSUE-064), con dispositivi disponibili per la prova dei comandi.

## Misure prima dell'aggiornamento

Tab M11 TB330FU, Chrome in primo piano, viewport 1280 × 665 CSS px, DPR 1,5. Sessione HA preesistente conservata. Due esecuzioni di `measure.cjs base` via CDP/ADB, senza browser locale concorrente: quiete 89,7–90,1 fps; scorrimento Copertina/Principale 84,4–86,7 fps; ingresso modifica 87,3–87,7 fps. Vista pagine: apertura 67,1–68,0 fps con massimo 333–367 ms, chiusura 67,7–68,7 fps con massimo 189–211 ms. Conferma del rallentamento già registrato in ISSUE-062; nessuna modifica grafica applicata alla baseline.

Comandi ADB con selezione del tablet collegato (seriale omesso): `adb reverse tcp:3002 tcp:3002`, `adb forward tcp:9222 localabstract:chrome_devtools_remote`; `NODE_PATH` al `node_modules` del workspace, `APP_URL=http://localhost:3002`, `node backup/strumenti-tablet/measure.cjs base` (due giri). Gli identificatori di sessione e i dati di autenticazione non sono stati esportati nelle evidenze.
