# Vassoio Widget stabile e animato

| Campo | Valore |
|---|---|
| ID | REP-20261014-001 |
| Stato | Completato e verificato localmente |
| Data | 2026-10-14 |
| Autore | Codex |
| Commit di partenza | 7298d4df0d33bc92123517776d9ebc7c12ecefa6 |
| Richiesta e autorizzazione | L'utente chiede esplicitamente di implementare il piano «Vassoio Widget stabile e animato» in questa chat. |

## Obiettivo e perimetro

Tessere 6,5 × 8 rem, fila 9 rem, nomi su due righe riservate, misure non spezzate, fade e ricomposizione al cambio categoria. Conservare icone, categorie, aggiunta, trascinamento, ricerca e contratti pubblici. Modifiche applicative limitate a WidgetTray.tsx e edit.css, con test pertinenti e documentazione. Working tree già ampiamente modificato e con WidgetTray.tsx non tracciato: preservare tutto il lavoro preesistente. Nessun commit, deploy o aggiornamento Docker autorizzato.

## Criteri di completamento

- Altezza invariata fra tutte le categorie, ricerca e risultati vuoti; ombre e misure leggibili a 390, 1280 e 1920 px.
- Uscita 140 ms, ricomposizione 220 ms, entrata 160 ms dopo 60 ms; scelta immediata, interruzione su nuove scelte e trascinamento, movimento ridotto senza animazioni.
- Controlli statici e test pertinenti; browser senza GPU, separato da Vitest con massimo quattro processi.

## Avanzamento e verifiche

WidgetTray.tsx mantiene il contratto pubblico; edit.css fissa la geometria. Transizioni Web Animations API: FLIP delle conservate, fade delle nuove e copie inerti/non accessibili delle escluse. Annullamento su nuove scelte, ricerca, pointer down, aggiunta, chiusura, trascinamento e smontaggio. Esteso WidgetTrayCategories.test.tsx; nessuna dipendenza aggiunta.

| Controllo | Esito e limiti |
|---|---|
| `npm run typecheck`, `npm run lint` | Superati. |
| `npm run lint:typography`, `npm run lint:theme-colors` | 0 violazioni, 429 e 303 file. |
| `npx prettier --check` sui due file applicativi e test del vassoio | Superato. |
| `npm run test -- --maxWorkers=4 src/__tests__/WidgetTrayCategories.test.tsx src/__tests__/LauncherDragDrop.test.tsx src/__tests__/LauncherGestures.test.tsx` | 3 file, 85/85 test, 40,86 s. |
| Chromium headless senza GPU, preview, larghezze 390/1280/1920 e altezza 844 | Tutte le categorie: pannello 268,796875 px, top 563,203125 px, fila 144 px, tessere 104 × 128 px. Risultati vuoti: altezza identica. Nomi/misure dentro le tessere; scorrimento orizzontale presente; cambi rapidi terminano sull'ultima scelta; 0 animazioni con movimento ridotto; 0 errori JavaScript. |
| Invio su categoria/tessera, clic e trascinamento su cella libera | In tre prove separate il numero di separatori passa da 0 a 1. Mouse/tastiera nella preview, non dito sul tablet. |
| Screenshot Kit 2, Casa e info e Utilità | Ispezionati: ombre visibili, gruppo centrato, «4 × 1» su una riga. Evidenze `backup/vassoio-*-casa.png`, `backup/vassoio-*-utilita.png`; script `backup/test-vassoio.cjs`, esclusi da Git. |
| Detector Impeccable | Solo avviso sull'easing elastico preesistente della nuvoletta, estraneo al vassoio; conservato. |

## Controllo del diff

Modifiche applicative limitate ai due file previsti e test pertinenti; aggiornati design, verifiche, stato e indice. Preservato il lavoro preesistente. Nessun commit, Docker, ADB o deploy. Suite completa e prova sul tablet non eseguite.

## Punto di ripresa

Intervento concluso in locale. Anteprima `http://127.0.0.1:5173/launcher.html?modifica=1`; banco Docker resta 0.9.3. Aggiornamento del banco e prova con dito richiedono incarico successivo. Pagine precompilate e attivazione dei widget sono fuori da questo intervento.
