# REP-20261007-027 — Modifica manuale dei widget con il trascinamento

| Campo | Valore |
|---|---|
| Stato | Completato; banco aggiornato; da provare sul tablet |
| Data | 2026-10-07, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Richiesta | Chat del 2026-10-07, con due schermate del tablet in modifica: «durante l'aggiunta di un widget, c'è un pannello che ti mette davanti la scelta della dimensione, la ricerca per nome o id del dispositivo […] sarebbe meglio sviluppare la funzione di ridimensionamento, spostamento widget nella cella, tutto manuale mediante drag n drop, però rendendo questa funzionalità più estesa e completa». |
| Scelte dell'utente | Domande in chat, stesso giorno: dimensione **tolta** dal pannello; estensioni **tutte** (maniglie su tutti i lati, anteprima dal vivo, trascinamento dal catalogo, riordino automatico); il «bug del pulsante» citato si tratta **dopo**, fuori da questo incarico. Piano approvato in chat. |
| Perimetro | Modifica del launcher (ADR-0007 prevede già trascinamento e ridimensionamento dopo la pressione lunga, con l'alternativa da tastiera): nessun nuovo permesso, nessuna nuova dipendenza. |

## Criteri di completamento

1. Il pannello «Aggiungi un widget» non chiede più la dimensione: il widget nasce alla misura predefinita.
2. Ridimensionamento trascinando ogni lato e ogni angolo, salvo l'angolo della «×».
3. Durante il ridimensionamento il widget vero cambia misura dal vivo; spostandolo, sotto il dito c'è la sua copia.
4. Un vassoio di tipi permette di trascinare un nuovo widget nella cella voluta.
5. Se manca spazio, gli altri widget si ricompattano e si riducono fino al minimo prima che la mossa venga rifiutata.
6. Restano l'alternativa senza trascinamento (WCAG 2.5.7) e il movimento ridotto.

## Modifiche

- **Pannello di aggiunta** (`AddWidgetSheet.tsx`):
  - tolta la scelta della dimensione, con l'anteprima `SizePreview` e le funzioni `sizeChoices`/`sizeKey`/`sizeLabel` di `catalog.ts`;
  - al loro posto una riga: «Dopo l'aggiunta trascina i lati o gli angoli del widget per cambiarne la misura»;
  - nuove proprietà `initialType` e `autoAdd`: dal vassoio il pannello parte dai dettagli del tipo;
  - i tipi senza scelte (attività, auto, separatore) si aggiungono subito, senza mostrare il pannello.
- **Griglia** (`utils/launcher/grid.ts`):
  - `resizeRect` sposta un lato verso la linea della griglia più vicina al dito e tiene fermo il lato opposto, nei limiti min/max del widget e della griglia;
  - `tryMoveWithReflow`:
    1. prova lo spostamento minimo di prima;
    2. se non basta, i widget d'intralcio cercano il posto libero più vicino riducendosi fino al minimo;
    3. come ultima risorsa, tutta la pagina si ricompatta in ordine di lettura;
    4. rifiuta solo se nemmeno così entrano tutti.
  - `resizedIds` elenca i widget ridotti, per l'annuncio («… ridotto a 1 per 1 per fare spazio»).
  - `layout.ts`: spostamenti e ridimensionamenti salvati usano lo stesso algoritmo dell'anteprima, con i minimi delle definizioni.
- **Trascinamento** (`useWidgetDrag.ts`):
  - la sessione ha un lato (`edge`) e una terza modalità, `add`, per il tipo trascinato dal vassoio;
  - vibrazione breve (`navigator.vibrate`, dove disponibile) quando cambia la cella di destinazione.
- **Selezione e maniglie** (`WidgetHost.tsx`, `ResizeHandle.tsx`, `edit.css`, `launcher.css`):
  - in modifica il primo tocco seleziona il widget e il secondo apre il menu di prima;
  - il widget selezionato ha un anello d'accento, i tre angoli con il pomello centrati sullo spigolo come la «×», e quattro barre d'accento sui lati;
  - il widget non selezionato mostra solo il pomello in basso a destra, come prima;
  - un tocco fuori dai widget o l'uscita dalla modifica tolgono la selezione; da tastiera il widget raggiunto con Tab è già selezionato, quindi Invio apre il menu;
  - il clic che seleziona annulla anche l'apertura nativa del popover (`preventDefault`), trovata nella prova a video.
- **Anteprima dal vivo**:
  - **ridimensionamento:** il widget prende subito la misura sotto il dito e il contenuto si ridispone;
  - **spostamento:** sotto il puntatore c'è una copia statica del widget vero, sollevata e inclinata, con «Colonna, riga» in una pillola sotto; al rilascio il widget compare nella nuova cella con un breve assestamento, senza ripercorrere la strada dalla cella vecchia;
  - con il movimento ridotto non ci sono inclinazione né animazioni.
- **Vassoio** (`WidgetTray.tsx`, `LauncherScreen.tsx`):
  - «+ Widget» apre un pannello flottante che sale dal basso, con i tipi in una fila scorrevole e un campo di ricerca;
  - trascinando una scheda verso l'alto il nuovo widget segue il dito alla sua misura predefinita e il vassoio scende;
  - al rilascio il widget va nella cella mostrata, dove gli altri hanno fatto spazio; un tocco sulla scheda lo aggiunge dove c'è posto;
  - la fila scorre in orizzontale (`touch-action: pan-x`), quindi solo un trascinamento verso l'alto prende la scheda.
- **Anteprima di sviluppo:** `.claude/launch.json` ha `acasystem-frontend-dev` (vite, porta 5179), per `launcher.html?modifica=1` con dati finti e senza Home Assistant. L'esempio in `/ui-kit` previsto nel piano non è stato fatto: l'anteprima del launcher è la schermata reale.

## Verifiche

- **Controlli eseguiti:**
  - typecheck, eslint, prettier, lint dei colori (0 violazioni), lint tipografico (0 violazioni), build e controllo delle dimensioni dei chunk: tutti verdi;
  - vitest 1360/1360: +15 test, tra cui il nuovo `LauncherDragDrop.test.tsx` (12 test: lati e angoli, riordino, layout salvato uguale all'anteprima, spostamento completo con il puntatore, ridimensionamento dal lato sinistro, trascinamento dal vassoio con vibrazione), la selezione in `LauncherScreen.test.tsx` e i due casi del vassoio in `SystemSheets.test.tsx`.
- **Test aggiornati al nuovo comportamento:**
  - `SystemSheets`: niente dimensione nel pannello;
  - `FixLauncherUiShell`, `LauncherScreen`: primo tocco = selezione;
  - `PolishLauncherScreen`, `ShellLauncher`: «+ Widget» apre il vassoio.
- **Prove a video** su `launcher.html?modifica=1`:
  - trascinamento della scheda «Luce» dal vassoio, scelta della luce e widget nella cella del rilascio;
  - selezione senza menu e le sette maniglie;
  - lato destro trascinato: larghezza al massimo consentito, contenuto ridisposto in orizzontale;
  - copia sollevata durante lo spostamento, incavo di destinazione e selezione dopo il rilascio.
- **Banco:** `sha256:4dd4436c47541413c953d5e731e8335b19ecf749eb6278d18ee77259868e3eda`, `healthy`; `/api/health` ok su `172.20.10.6:3002`.

## Limiti e questioni residue

- **Tablet e Home Assistant:** non provato sul tablet reale né con una sessione vera. Restano da misurare tocco, vibrazione e scorrimento del vassoio rispetto al trascinamento.
- **Griglia del tablet:** con la griglia 6×2 vista sul tablet (ISSUE-028), il riordino ha poco spazio e riduce presto i widget. La griglia per il tablet è una decisione separata.
- **Copertura dei test:** i test sono jsdom, senza e2e (la cartella `e2e` è vuota).
- **Vassoio e ultima riga:** il vassoio copre l'ultima riga della griglia finché è aperto; scende durante il trascinamento.
- **Bug del pulsante:** quello citato dall'utente è rinviato, come chiesto.

## Ripresa

Prova sul tablet a `http://172.20.10.6:3002` (pressione lunga o «Modifica», poi «+ Widget»); poi il «bug del pulsante».
