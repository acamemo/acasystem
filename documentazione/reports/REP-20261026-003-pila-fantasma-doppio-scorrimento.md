# REP-20261026-003 — Pila fantasma e doppio scorrimento (0.9.29 e 0.9.30)

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261026-003; ISSUE-116 (pila di Multimedia) e ISSUE-117 (secondo scorrimento ignorato) |
| Stato | Completato nel software e sul banco; conferma col dito dell'utente da fare |
| Data | 2026-10-26 |
| Autore / modello | Claude Code, modello claude-sonnet-5-5, subagenti di un flusso di lavoro; documenti redatti da un ultimo passo che ha riletto i file dopo un tentativo interrotto alle 11:4x |
| Commit di partenza | `4e198c5cd2d01cd5d50ac3a28275a3f8b3d24808`; il working tree contiene la 0.9.28 del banco non ancora committata. Nessun commit in questo incarico |
| Richiesta di riferimento | Utente, 2026-10-26: «ok, procedi con (a) e con la correzione dello scorrimento». Poi, sulla pila di Multimedia: «Mostra la pila» |
| Autorizzazione | Regola (a) di ISSUE-116 e correzione P1 di ISSUE-117 (richiesta del 2026-10-26); opzione (1) «Mostra la pila» per la visibilità delle pile in uso (scelta dell'utente, 2026-10-26); portare il risultato sul banco 3002. Nessun commit né invio su GitHub |

## Obiettivo e perimetro

- **ISSUE-116 (a):** le caselle di una pila senza alcun widget risolvibile si mostrano libere, con il «+», senza toccare il layout salvato (nessun `ids` cancellato; `withoutEmptyStacks` invariato).
- **ISSUE-117 P1:** `inert` e `aria-hidden` tolti anche alle pagine incrociate dallo scorrimento in corso (`reach.lo..reach.hi`); a riposo i vicini restano `inert`. Da non fare: accorciare `SETTLE_MS`, dare `pointer-events: auto` al pager.
- **Scelta dell'utente sulla pila di Multimedia:** la regola (a) alla lettera non cambiava la pagina (i membri della pila si risolvono: sono preimpostati non collegati). L'utente ha scelto «Mostra la pila»: la visibilità di una pila in uso segue i suoi membri.
- Esclusi: altri cambi di comportamento, dipendenze, commit, push, VM (spenta), `backup/d1/sandbox/`. Informativa AI preservata.
- Preesistenti: modifiche del working tree (0.9.28, giro 4, banco) preservate; copie prima di ogni passo in `backup/v0929/pre/`.

## Criteri di completamento

1. Un secondo scorrimento che parte entro 0,6-0,7 s da un colpo veloce non viene più ignorato; il costo non peggiora (SW1-SW3, JUMP, T1 sul Tab M11).
2. Una pila senza membri risolvibili lascia caselle libere con «+», layout salvato intatto; aggiungere o spostare sulle sue caselle non cancella la pila.
3. La pila di Multimedia (e quella della Copertina) si vede in uso e al tocco apre «Collega».
4. Controlli statici, suite completa e build verdi; banco aggiornato.

## Avanzamento e modifiche

**0.9.29 (frontend, working tree):**
- `Pager.tsx`: `crossed` (pagina fra `reach.lo` e `reach.hi`); `inert`/`aria-hidden` valgono `(!overview && off && !crossed) || undefined`. Nessuna modifica a `SETTLE_MS`, `pointer-events`, `narrow()`. Contingenza P1b (limitare `crossed` agli scorrimenti col dito) non applicata.
- Pile fantasma: `isGhostStack` e `placementsFor` in `useLauncherController.ts`; `WidgetGrid.tsx` e `LauncherScreen.tsx` non disegnano né riservano la pila fantasma; `liftGhostStacks`/`reseatGhostStacks` in `utils/launcher/layout.ts` sollevano la pila per l'operazione dell'utente e la rimettono (stesso rettangolo se libero, altrimenti primo libero della stessa misura, poi più piccola, poi pagina successiva o nuova). Solo per azioni dell'utente, mai per scritture automatiche; la pila non viene cancellata.
- Rettifica della causa di ISSUE-116 (annotata in `project-status.md`): le caselle di Multimedia restavano riservate perché `LauncherPage.isWidgetHidden` passava l'id `stack_…` a `isCardHiddenByLogic`, che lo tratta come entità sconosciuta e lo nasconde in uso a entità caricate.

**0.9.30 (frontend, working tree):** funzione pura `isWidgetHiddenByLogic` in `pages/launcher/widgetVisibility.ts`: una pila è nascosta in uso solo se lo sono tutti i suoi membri, con le regole dei widget normali; senza membri o non presente in `layout.stacks` resta nascosta; prima del caricamento delle entità nulla è nascosto. `isCardHiddenByLogic` e il layout salvato invariati.

**Banco:** `aca-system:0.9.29` poi `0.9.30` su 192.168.1.7:3002 (voci «Banco 0.9.29» e «Banco 0.9.30» in `infrastructure.md`; copie a freddo `backup/banco/tunet-data-pre-0.9.29-freddo.tgz` e `…0.9.30-freddo.tgz`).

## Verifiche ed evidenze

Dettaglio dei comandi in [verification.md](../verification.md), voci del 2026-10-26 su 0.9.29 e 0.9.30.

| Controllo | Procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Software 0.9.29 | `typecheck`, `lint`, `lint:typography`, `lint:theme-colors`, `i18n:check`, `build`, `check-bundle-size`, Vitest a 4 shard con `--maxWorkers=4` | Superato | 204 file, 3109 test |
| Software 0.9.30 | stessi comandi | Superato | shard 746 + 1006 + 745 + 619 = 3116 test; typografia 0 violazioni su 524 file, colori su 344 |
| Doppio scorrimento, tocco reale (`dopp3.cjs`, `adb input swipe`, 5 attese da 133 a 733 ms, 2 versi, 3 ripetizioni) | Tab M11, fixture 3013-3017 | Migliore | 0.9.28 ignora 24/30 (18/18 sotto 650 ms), 0.9.29 0/30; verso opposto indice a 4 in 15/15, stesso verso a 6 in 15/15 |
| Doppio scorrimento, tocco CDP (`dopp2.cjs`) | 50 prove per versione | Migliore | 0.9.28 11/50 ignorati, 0.9.29 1/50 (un primo scorrimento tornato per aggancio alla pagina 4; non ripetuto) |
| Costo (5 giri alternati più giro 0, mediana e min-max) | SW1, SW2, SW3, JUMP, T1 | Non distinguibile; nessuna misura peggiore su blocco massimo, somma dei blocchi >= 50 ms, compiti lunghi iniziali | JUMP pallino accanto +1: 123 [84-129] contro 132 [88-142] ms; P1b non necessaria. SW3: 10 righe di fotogrammi segnate «peggiore» dallo strumento ma non confrontabili (la 0.9.28 ignora il secondo colpo: landed 3 contro 4); con SW3L (stesso lavoro) tutto non distinguibile. `trace4.cjs` non eseguito |
| Pila fantasma (due ids senza definizione) | fixture con pila di prova | Superato | 0.9.28: caselle riservate senza «+»; 0.9.29: due «+» in uso e in modifica; dopo l'aggiunta la pila passa da 0,0 a 4,0 e `stacks` è identico; trascinamento valido; scollegamento/ricollegamento senza spostamenti (6 letture su 6) |
| Pila di Multimedia con la sola regola (a) | pila con membri preimpostati | Invariata, come atteso | Due caselle senza «+»: motivo della scelta dell'utente |
| Pila con due widget collegati, in uso | fixture | Non superato in 0.9.28 e 0.9.29 | `isCardHiddenByLogic` nascondeva ogni pila in uso; corretto in 0.9.30 (guardie unitarie; non riprovato col fixture) |
| Riposo, vista pagine, fuoco | CDP con `focus()` | Superato | A riposo solo la pagina corrente senza `inert`; durante lo scorrimento tolto alle pagine incrociate, restringimento circa 350 ms dopo l'atterraggio; vista pagine senza sezioni `inert` |
| Banco 0.9.29, tocchi reali adb | 192.168.1.7:3002 | Parzialmente superato | Doppio scorrimento 3/3 per verso; «+», pressione lunga, «Fine», pallini, trascinamento (con tocco CDP), Sistema e pulsante «AI» funzionano. Multimedia restava senza «+» (atteso dalla sola regola (a)) |
| Banco 0.9.30, tocchi reali adb | 192.168.1.7:3002 | Superato con scostamento | Pila di Multimedia visibile (3 widget, 0 caselle riservate, 2 pallini); il tocco apre «Impostazioni del widget» con «Dispositivo da collegare: Non collegato»; Copertina mostra la sua pila; doppio scorrimento 3/3 per verso; Sistema mostra 0.9.30. **Scostamento:** l'elenco di «Cambia» è vuoto, perché l'HA del banco non espone media player: il collegamento non è stato provato |
| `localStorage` di 3002 | Prima/dopo | Invariato | 38 chiavi non sensibili, nessuna differenza; nessun token toccato |

Limiti: tutte le prove usano eventi di `adb input` o CDP, non il dito; trascinamento dei widget, pallini e telefono non rieseguiti sulla 0.9.30; e2e, TalkBack, `trace4.cjs` e screenshot della Copertina in 0.9.29 non eseguiti. Una prima versione dello strumento di riposo inviò tasti Tab via CDP e il fuoco uscì nella barra degli indirizzi di Chrome (scritto «XXXX»): ripulito senza navigazione, strumento corretto. Un primo script di ricarica si bloccò e fu terminato per PID; la cancellazione delle cache sulla scheda 3002 in secondo piano andò in timeout (bundle comunque aggiornato).

## Controllo del diff e decisioni

- Nessun ADR nuovo. Annotato [ADR-0018](../decisions/ADR-0018-pagine-fuori-vista.md) (pagine incrociate raggiungibili durante lo scorrimento).
- Scoperta preesistente, uguale in 0.9.28 e 0.9.29, risolta in 0.9.30 per scelta dell'utente: ogni pila in uso era nascosta con HA caricato. Non verificato se la 0.9.27 le mostrava, quindi non è una regressione dimostrata.
- Una pila fantasma conta come widget nei conteggi (cancellazione di pagina, vista pagine); una pila spostata in una pagina nuova crea una pagina di sole caselle libere. Limiti noti, non corretti.
- Nella 0.9.29 la pila di Multimedia comparve per un istante dopo il ritorno da Sistema; nella 0.9.30 non si è ripresentato.
- `REP-20261023-003-piano-aggiungi-dispositivi.md` e `REP-20261026-001-…` risultano modificati o aggiunti da altri agenti nello stesso periodo; non fanno parte di questo incarico.

## Chiusura e punto di ripresa

Nessun incarico di codice resta attivo qui. Da fare, in ordine: (1) prova a dito dell'utente sul Tab M11 (doppio scorrimento, pila di Multimedia e della Copertina, tocco su «Collega»); (2) quando l'utente lo chiede, commit e invio su GitHub (nessun commit dopo `4e198c5`); (3) poi D1. Per provare «Collega» servono media player esposti da Home Assistant. Backlog distinto dal lavoro autorizzato: P1b e P2 di ISSUE-117 non applicate; ISSUE-115 (residui di prestazioni) resta aperta.

## Rettifiche successive

Nessuna.
