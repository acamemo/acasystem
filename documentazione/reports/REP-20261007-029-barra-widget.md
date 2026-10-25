# REP-20261007-029 — Barra del widget selezionato e animazione della nuova pagina

| Campo | Valore |
|---|---|
| Stato | Completato; banco aggiornato; da provare sul tablet |
| Data | 2026-10-07, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Richiesta | Chat del 2026-10-07, con la schermata del tablet in modifica: «i trigger dei controlli sono troppo piccoli, inoltre al posto di mettere un icona per lato, mettere solo 2 icone in alto che fanno l'animazione di alzare la topbar e di abbassare "Principale", in maniera tale da avere in basso, come fatto per il piano precedente, l'icona per confermare la grandezza scelta o per rimuoverla». Durante il lavoro: «durante l'animazione di nuova pagina, puoi mettere un animazione e non farlo a scatto improvviso?» |
| Scelte dell'utente | Domande in chat, stesso giorno: «Selezione → barre» (il tocco seleziona; barra in alto su, «Principale» giù; 2 maniglie grandi in alto; barra in basso con Conferma e Rimuovi); ridimensionamento trascinando i **bordi** del widget, senza icone sui lati. |
| Perimetro | Sostituisce la «×», il pomello d'angolo e il menu del widget di REP-20261007-027; nessuna nuova dipendenza. |

## Modifiche

- **Widget non selezionati:** nessuna icona. Sono spariti la «×» sull'angolo e il pomello di ridimensionamento; un tocco seleziona, un trascinamento sposta.
- **Widget selezionato** (`WidgetHost.tsx`, `ResizeHandle.tsx`, `edit.css`):
  - anello d'accento, come prima;
  - due pomelli grandi sugli angoli in alto, di 3 rem con un bersaglio di 3,5 rem: «sposta» a sinistra, «ridimensiona» a destra, che muove i lati destro e superiore;
  - i quattro lati e i due angoli in basso ridimensionano quando li trascini, attraverso fasce invisibili larghe 2,75 rem;
  - il componente `WidgetEditControls`, con la «×» e il menu, è stato tolto.
- **Barra del widget** (`WidgetActionBar.tsx`, `LauncherScreen.tsx`):
  - quando un widget è selezionato, la barra in alto sale, l'indicatore «Principale» scende e anche le barre di modifica scendono;
  - al loro posto sale la barra con:
    - **Rimuovi**: cestino, con conferma;
    - **Impostazioni**;
    - **Sposta con le frecce** e **Ridimensiona con le frecce**, l'alternativa al trascinamento;
    - **Annulla**: rimette il layout com'era quando il widget è stato selezionato (nuova funzione `restoreLayout` nel controller); un primo trascinamento conta già, perché il layout viene preso da prima del rilascio;
    - **Conferma**: tiene misura e posizione e toglie la selezione.
  - Mentre i comandi a frecce sono aperti, la barra lascia loro il posto.
- **Tastiera:**
  - Tab seleziona il widget raggiunto e Invio porta il focus su «Conferma», ma solo se il focus è ancora sul widget;
  - Canc apre la conferma di rimozione della barra.
- **Selezione:** segue il widget quando cambia pagina con le frecce.
- **Animazione della nuova pagina** (`Pager.tsx`, `launcher.css`):
  - nella vista delle pagine, una scheda nuova apre il suo spazio partendo da larghezza zero, entra in dissolvenza e si ingrandisce, invece di comparire di scatto;
  - lo scorrimento la segue con un'accelerazione morbida, che vale anche per l'eliminazione;
  - con il movimento ridotto non c'è animazione.

## Verifiche

- **Controlli:** typecheck, eslint, prettier, lint dei colori e tipografico (0 violazioni), build e dimensioni dei chunk: tutti verdi.
- **Test:** vitest 1373/1373.
  - Nuovi: selezione senza icone prima e con pomelli e fasce dopo; Conferma; Annulla; la barra in `PolishCornice`.
  - Aggiornati a «tocco = selezione e barra»: `FixLauncherUiShell`, `LauncherScreen`, `Polish2Cornice`, più i finti controller con `restoreLayout`.
- **Prova a video** su `launcher.html?modifica=1`:
  - widget senza icone;
  - tocco: barra in alto su, indicatore giù, due pomelli, barra in basso;
  - bordo destro trascinato: da 2 a 1 colonna;
  - Annulla: torna a 2;
  - Conferma: le barre tornano.
- **Animazione della nuova pagina:** controllate le transizioni registrate (`flex-basis` 360 ms, `opacity` 300 ms, `scale` 360 ms). Il pannello del browser era nascosto, quindi non ho visto il movimento a schermo.
- **Correzione trovata dai test:** «Conferma» prendeva il focus un fotogramma dopo anche quando il focus era già sui comandi a frecce.
- **Banco:** `sha256:0d553493d3375d1890b0f93d4e112c0edc17d0ce8312cd6b4eecf36a7ac8dfd7`, `healthy`; `/api/health` ok su `172.20.10.6:3002`.

## Limiti

- **Tablet:** da provare.
- **Pomelli in alto:** sulla prima riga sporgono di 1,5 rem, esattamente il margine della pagina sopra la griglia.
- **Bug del pulsante:** quello citato in REP-20261007-027 è ancora da fare.
