# REP-20261014-010 - Sistemazione degli issue emersi dal banco 0.9.7

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261014-010, sistemazione degli issue trovati in [REP-20261014-009](REP-20261014-009-banco-tablet.md). Il dettaglio di una parte del lavoro è in [REP-20261014-010-calendario-sonos](REP-20261014-010-calendario-sonos.md). |
| Stato | Completato nel codice, nei test e sul banco 0.9.9 (la 0.9.8 è storica); **revisione finale con Opus eseguita il 2026-10-14, correzioni applicate nel codice ma non ancora sul banco (serve ricostruire il banco).** Aggiornamento 2026-10-14 (sera): le correzioni sono sul banco 0.9.9, vedi «Banco 0.9.9». |
| Data | 2026-10-14 |
| Autore / modello | Agente principale; esecutori Sonnet e Haiku, revisione finale prevista con Opus. Nome esatto dei modelli esecutori non disponibile. |
| Commit di partenza | `7298d4d` su `master`; working tree con modifiche non committate di altri incarichi, preservate. |
| Richiesta di riferimento | «prendi tu le redini in mano e sistema gli issue trovati, ma usa modelli leggeri perché ho poco credito, poi fai un check finale con opus» |
| Autorizzazione | La richiesta sopra (2026-10-14). Nessun commit autorizzato. |

## Obiettivo e perimetro

Perimetro scelto dall'agente principale:
- incongruenze nei documenti;
- suite completa non ripetuta dopo le correzioni del report 009;
- Calendario e Attività non associati che restano in skeleton;
- Multimedia e Sonos poco distinguibili;
- [ISSUE-062](../project-status.md#issue-062), lo scatto della vista pagine sul Tab M11.

Esclusi perché funzioni nuove o decisioni dell'utente: ISSUE-063, ISSUE-064 e le proposte ISSUE-040…061. Escluse le prove che richiedono l'utente: TalkBack, testo ingrandito, schermo intero. Nessun commit, nessuna dipendenza nuova, Home Assistant sul tablet non toccato, nessun comando a impianti reali.

## Criteri di completamento

- Calendario e Attività non associati non mostrano più lo skeleton.
- Multimedia e Sonos hanno nomi distinti prima dell'associazione.
- Regola per ISSUE-062 solo nella vista pagine, con test e misura sul tablet.
- Suite completa, typecheck, lint, build e backend verdi.
- Banco 0.9.8 costruito dopo copia a freddo e provato sul Tab M11.

## Avanzamento e modifiche

- **Calendario e Attività** (`CategoryWidgetContent.tsx`): il widget iniettava un id segnaposto con connessione nulla, quindi le letture restavano in caricamento. Ora questi due tipi non ricevono il segnaposto e mostrano la propria nota. Due test di regressione in `CategoryPages.test.tsx`, verificati: falliscono senza la correzione.
- **Multimedia e Sonos**: il nome segnaposto usa l'etichetta di catalogo. L'etichetta accessibile «Collega …» resta quella della definizione per non cambiare il nome di altri widget; l'allineamento è una scelta a parte. Icone non toccate.
- **ISSUE-062** (`launcher.css`, sezione della vista pagine): `.aca-pager:is(.is-overview, .is-closing) .aca-launcher-cell { display: none !important; }`, la «Opzione A» della diagnosi. Solo nella vista pagine; riposo e modifica invariati. Test in `LagLayers.test.ts` che fissa la regola. Una prima modifica con Python aveva convertito i due file da LF a CRLF e rotto un test sul movimento ridotto; riportati a LF, il diff di `launcher.css` è di 10 righe aggiunte.
- **Diagnosi sul tablet** (nessun codice modificato): il costo dominante sono le ombre delle 40 celle «+» di Principale (circa 120 su circa 318 nodi con ombra). Togliere le ombre solo durante la vista non aiuta (il cambio di classe costa quanto fa risparmiare); le ombre dei widget da sole non cambiano nulla; restano circa 110-200 ms non spiegati dalle ombre. Opzione B (ombre delle celle tolte sempre, frame massimo 133-174 ms) non applicata perché cambia l'aspetto in modifica.
- **Banco 0.9.8**: vedi [infrastructure.md](../infrastructure.md).

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Vitest mirati | `--maxWorkers=4` su CategoryPages, CategoryPageGrid, LauncherController | Superato | 3 file, 29/29. |
| Vitest mirati ISSUE-062 | LagLayers, PagerBands, Polish2Cornice, LauncherGeometry | Superato | 4 file, 106 test. |
| Suite frontend completa | `npx vitest run --maxWorkers=4` | Superato | 150/150 file, 1858/1858 test, 397 s. |
| Backend | `npm run test -w backend -- --maxWorkers=4` | Superato | 17/17 file, 141/141. |
| Statici | typecheck, lint, lint:typography (0 su 440 file), lint:theme-colors (0 su 314), i18n:check (4/4) | Superati | Exit 0. |
| Build e budget | `npm run build`, `check-bundle-size.mjs` | Superati | Avviso Vite non bloccante sui chunk oltre 500 kB (hls, index). |
| Banco | Container `healthy`; `/api/health` 0.9.8 e `/ha/auth/providers` 200 su 127.0.0.1 e 192.168.1.7 | Superato | Bundle `index-BgxLazso.js`, lo stesso sul tablet. |
| Calendario/Attività sul M11 | Pagina Casa e info, screenshot | Parziale | Nessuno skeleton in nessuna pagina (0 elementi). Il testo mostrato è «Scegli i calendari da mostrare nelle impostazioni del widget» / «Scegli una lista di attività nelle impostazioni del widget», non la dicitura «non associato» attesa: è la nota del widget stesso. |
| Multimedia/Sonos sul M11 | Pagina Multimedia, screenshot | Parziale | I due widget hanno nomi distinti, ma stesso aspetto: icona di avviso e «Non disponibile». Si distinguono solo per l'etichetta. |
| Prestazioni vista pagine sul M11 | `ov2.cjs`, 3 giri, banco 0.9.8 | Non conclusivo | Apertura 67,9/76,5/76,5 fps (media 73,6), frame massimo medio 215 ms (peggiore 245). Chiusura 56,0 fps, massimo medio 226 ms (peggiore 245). Prima della regola: apertura circa 62 fps e 245 ms, chiusura circa 53 fps e 213-304 ms. Con lo stesso effetto ottenuto con CSS iniettato in diagnosi: 159 ms (apertura) e 193 ms (chiusura). |

Che la regola sia nell'immagine 0.9.8 è verificato nel CSS servito (`index-CFYwusGM.css`, 2026-10-14, revisione Opus). I numeri non sono confrontabili con quelli della 0.9.7 del report 009 (durate di apertura/chiusura, non frame massimi).

## Controllo del diff e decisioni

Diff limitato a `CategoryWidgetContent.tsx`, `launcher.css` e due file di test, più i documenti. Nessun ADR creato. Copie dei file originali in `backup/rep010/` (escluso da Git). La revisione finale con Opus è richiesta dall'utente e va registrata qui quando eseguita.

## Chiusura e punto di ripresa

- **Aperto:** ISSUE-062. Sul banco la misura non mostra il guadagno atteso; serve capire perché (regola non servita: esclusa, vedi sopra; restano rumore di misura o costo diverso da quello delle ombre) prima di dichiararlo risolto.
- **Da fare dentro l'incarico:** revisione finale con Opus del diff e di questi documenti.
- **Input dell'utente:** conferma dell'Opzione A di ISSUE-062 (applicata in base alla richiesta generica, in attesa di conferma; *2026-10-15: confermata dall'utente, «Tienila»*), ISSUE-061, ISSUE-063/064 e le proposte; prove con TalkBack, testo ingrandito, schermo intero.
- Nessun altro incarico attivo.

## Check finale (Opus)

| Gravità | Rilievo | Esito |
|---|---|---|
| Media | Il nome segnaposto usava l'etichetta di catalogo per tutti i tipi (Luce→Luci, Tosaerba→Tagliaerba…), fuori perimetro. | Corretto: l'etichetta di catalogo solo per `media` e `sonos`; test sulla luce non associata. Test mirato 8/8, typecheck, prettier. **Serve ricostruire il banco** (0.9.8 contiene il codice precedente). |
| Media | Regola di ISSUE-062 applicata ma la voce la classifica come scelta d'aspetto dell'utente. | Documentato: applicazione basata sulla richiesta generica, in attesa di conferma (*confermata dall'utente il 2026-10-15*); riga «Non applicata» annotata come superata. La regola non è stata tolta. |
| Bassa | Commento di `launcher.css` presentava come misurato un guadagno non confermato sulla 0.9.8. | Corretto: misura da CSS iniettato, non confermata, rimando a ISSUE-062. |
| Bassa | Scatto visivo possibile delle celle «+» (toggle istantaneo). | Registrato in ISSUE-062; non verificato sul tablet (richiede prova a occhio). |
| Bassa | `CategoryPages.test.tsx` in CRLF. | Riconvertito a LF. |
| Bassa | Frasi dei documenti non corrispondenti (indice, rettifica, verification.md, «001–009», doppio ID). | Corrette; il report di dettaglio è marcato allegato con rettifica datata. |
| Bassa | Ipotesi «regola non servita» lasciata aperta. | Verificata la presenza nel CSS servito; ipotesi tolta. |

## Banco 0.9.9 (correzione del nome segnaposto)

Data 2026-10-14 (sera). Motivo: la correzione del check finale (etichetta di catalogo solo per `media` e `sonos`) era nel codice ma non nell'immagine 0.9.8, costruita prima. Eseguito da un agente delegato su richiesta dell'agente principale; nessun commit, nessun comando a impianti reali, Home Assistant sul tablet non toccato.

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Vitest mirati | `npx vitest run src/__tests__/CategoryPages.test.tsx src/__tests__/CategoryPageGrid.test.ts src/__tests__/LauncherController.test.tsx src/__tests__/LagLayers.test.ts --maxWorkers=4` in `progetto/acasystem/frontend` | Superato | 4 file, 54/54 test, 18,4 s. La suite completa non è stata ripetuta dopo la correzione. |
| Statici | `npm run typecheck` (`tsc -p tsconfig.strict.json --noEmit`), `npm run lint` (`eslint src`) | Superati | Nessun messaggio di errore nell'output. |
| Rete | `Get-NetIPAddress` su PowerShell | Superato | Wi-Fi `192.168.1.7` (DHCP), uguale al binding di `progetto/compose.tunet.yaml` (altre interfacce: `192.168.56.1`, `172.23.160.1` di WSL). Nessuna modifica al compose. |
| Copia a freddo | `docker compose -f progetto/compose.tunet.yaml stop tunet`, poi `docker run --rm` con Alpine, volume `aca-tunet_tunet-data` in sola lettura e `tar czf` in `backup/banco` | Superato | `tunet-data-20261014-pre-0.9.9-freddo.tgz`, 406.802 byte, SHA-256 `e2289e9e8bb4ca422cc94a12dd126dd49877d534b4e90baebb57e68489720e8c`; `tar -tzf`: `./`, `./tunet.db-wal`, `./tunet.db`, `./tunet.db-shm`. Il container si è fermato con codice 137; il WAL è nella copia. Ripristino dati non provato. |
| Ricostruzione | `ACASYSTEM_VERSION=0.9.9` in `progetto/.env`, poi `docker compose -f progetto/compose.tunet.yaml up -d --build` | Superato | Immagine `aca-system:0.9.9`, `sha256:5a9ed917768d0ff98d660216ad61f60356a58fcfb5655e2c5a3f89c5041aa891`, creata il 2026-10-14T15:51:16Z; container ricreato sullo stesso volume. |
| Banco | Container `healthy`; `/api/health` e `/ha/auth/providers` su `127.0.0.1` e `192.168.1.7` | Superato | `/api/health` `{"status":"ok","version":"0.9.9"}`; provider HA 200 su entrambi (nessun `onboarding_required`, nessun riavvio di HA); bundle `index-BjUHSvp_.js` su entrambi. Nel bundle servito la condizione per l'etichetta di catalogo è limitata ai tipi `media` e `sonos`; la parola «Tagliaerba» resta nel catalogo dell'aggiunta (`catalog.ts` e `it.json`). |
| Tablet Tab M11 | `adb reverse tcp:3002 tcp:3002`, `adb forward tcp:9222 localabstract:chrome_devtools_remote`, Playwright `connectOverCDP` | Superato | Pagina `http://localhost:3002` ricaricata: script da `index-BgxLazso.js` a `index-BjUHSvp_.js`, `/api/health` 0.9.9 dalla pagina, schermo acceso (`visible`), nove pagine, nessun accesso richiesto. Disposizione non modificata; l'app è rimasta su Principale. |

Nomi mostrati dai widget nelle pagine di categoria, letti dal DOM del tablet (pagine non visibili lette senza navigare; nessuno screenshot):

| Pagina | Nomi letti |
|---|---|
| Luci e comandi | Stanza, Ventilatore, Sensore o entità, Tapparella, **Luce** (non «Luci») |
| Clima e meteo | Clima; il widget della temperatura e quello del meteo non hanno un nome testuale (mostrano «—» e «Poco nuvoloso») |
| Sicurezza | Videocamera, Allarme, Serratura |
| Multimedia | Android TV, Apple TV, **Multimedia**, **Sonos** |
| Casa e info | Calendario, Aspirapolvere, **Tosaerba** (non «Tagliaerba»), Auto, Attività, più orologio e calendario della copertina |
| Energia | Costi energetici, Prezzo dell'energia |
| Utilità | Nessun nome (spaziatore) |

Limiti: letture dal DOM, non a occhio; la corrispondenza con la definizione dei widget è stata letta nel codice (`CategoryWidgetContent.tsx`), non confrontata widget per widget con un test sul tablet. Il comportamento di Calendario/Attività non associati, già verificato sulla 0.9.8, non è stato riprovato. Ripristino: vedi [infrastructure.md](../infrastructure.md).
## Rettifiche successive

2026-10-15: regola di ISSUE-062 confermata dall'utente («Tienila»). ISSUE-062 resta aperto solo per la chiusura della vista pagine (frame peggiore circa 211-233 ms sul M11); l'apertura è mitigata (da 345-411 a 156-178 ms).

2026-10-15: suite ripetuta sui sorgenti attuali (banco 0.9.9): frontend `npx vitest run --maxWorkers=4` 150/150 file, 1859/1859 test (413 s); backend `npm run test -w backend -- --maxWorkers=4` 17/17 file, 141/141 test; `npm run typecheck`, `npm run lint`, `npm run lint:typography` (0 violazioni, 440 file) e `npm run lint:theme-colors` (0 violazioni, 314 file) senza errori.

2026-10-14 (sera): il «Serve ricostruire il banco» del check finale è soddisfatto dal banco 0.9.9 (sezione «Banco 0.9.9»); quanto sopra resta valido per la 0.9.8.
