# REP-20261014-010 - Calendario/Attività non associati e Multimedia/Sonos

## Richiesta e perimetro
Incarico umano 2026-10-14: «prendi tu le redini e sistema gli issue trovati» (osservazioni UX di REP-20261014-009). Nessun commit; diff minimo in `CategoryWidgetContent.tsx` e test.

## Modifiche
- Calendario e Attività non associati: il segnaposto iniettato non poteva caricare (nessuna connessione), quindi lo skeleton restava per sempre. Ora i due tipi non ricevono il segnaposto e mostrano la propria nota «non associato» (tocco per configurare invariato).
- Multimedia e Sonos: il nome predefinito prima dell'associazione usa l'etichetta di catalogo («Multimedia», «Sonos») invece dell'etichetta condivisa «Gruppo di lettori». Nessun nuovo layout, icona o funzione.

## Verifiche
- Due test in `CategoryPages.test.tsx`: falliscono senza la correzione, passano con essa.
- Vitest (CategoryPages, CategoryPageGrid, LauncherController, `--maxWorkers=4`): 29/29. typecheck, lint, lint:typography, lint:theme-colors: senza errori.
- Non eseguita la verifica sul tablet. Copie in `backup/rep010/`.

## Rettifica del 2026-10-14 (revisione Opus)
- Allegato del report principale [REP-20261014-010-sistemazione-issue](REP-20261014-010-sistemazione-issue.md); stesso ID, non un incarico separato.
- Il testo realmente mostrato sul tablet non è «non associato» ma «Scegli i calendari da mostrare…» / «Scegli una lista di attività…». La verifica sul Tab M11 è stata poi eseguita (nessuno skeleton).
- L'etichetta di catalogo per il nome segnaposto cambiava il nome di tutti i tipi non associati (Luce→Luci, Tosaerba→Tagliaerba, ecc.), contro «nessun nuovo layout». Corretto: ora vale solo per Multimedia e Sonos, con un test sulla luce. Il codice è cambiato dopo la costruzione della 0.9.8: serve ricostruire il banco.
