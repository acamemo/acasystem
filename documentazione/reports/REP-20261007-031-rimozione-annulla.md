# REP-20261007-031 — Rimozione come Android: zona «Rimuovi» e «Annulla» (F1)

| Campo | Valore |
|---|---|
| Stato | Completato; banco aggiornato; da provare sul tablet |
| Data | 2026-10-07/08, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Richiesta | Piano «Personalizzazione come Android» approvato in chat il 2026-10-07, fase F1. Scelta dell'utente: «Come Android (Consigliato)», cioè rimozione immediata, zona «Rimuovi» durante il trascinamento e messaggio con Annulla. |
| Fonti | Launcher3 [strings.xml](https://android.googlesource.com/platform/packages/apps/Launcher3/+/refs/heads/main/res/values/strings.xml): «Remove», «Item removed», «Undo»; consultate il 2026-10-07. |

## Modifiche

- **Zona «Rimuovi»** (`RemoveZone.tsx`, `useWidgetDrag.ts`, `LauncherScreen.tsx`):
  - quando si sposta un widget, la barra in alto sale e scende una zona con cestino e «Rimuovi»;
  - con il dito sopra diventa rossa, e rilasciando lì il widget viene rimosso;
  - per riconoscere il dito sopra la zona si usa la sua posizione di arrivo (`offsetTop` e simili), non quella a metà animazione;
  - il ridimensionamento e il trascinamento dal vassoio non rimuovono mai.
- **Cestino della barra del widget e tasto Canc:** rimuovono subito, senza conferma.
- **«Widget rimosso · Annulla»** (`UndoSnackbar.tsx`):
  - pillola sopra la fascia del piè di pagina per 5 s;
  - Annulla rimette il layout com'era (`controller.restoreLayout`);
  - le impostazioni del widget restano salvate, come prima.
- **Pagine:** non cambiano; chiedono conferma se contengono widget (REP-20261007-028).

## Verifiche

- vitest: zona Rimuovi nell'hook (si illumina, rilascio = rimozione, ridimensionamento escluso); rimozione con Annulla nella schermata; Canc con il focus sul widget successivo; cestino senza conferma.
- **Prova a video su `launcher.html`:** rilasciando nella zona compare «Orologio rimosso · Annulla», e Annulla dalla barra rimette il widget.
  - Con il rilascio nella zona, invece, Annulla non funzionava, ma per un effetto della prova: gli eventi simulati, mandati alla finestra e non al pager, lasciavano partire la pressione lunga, che ingoia il clic successivo.
  - Il layout da ripristinare era corretto. Col dito gli eventi passano dal pager.
- **Banco:** `sha256:91dd2aa3a751671d1f3010fb1c19bc38c0b52d0b703e8d7386107eae43f255cd`.
