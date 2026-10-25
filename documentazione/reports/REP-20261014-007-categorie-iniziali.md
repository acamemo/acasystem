# Categorie presenti dalla prima apertura

| Campo | Valore |
|---|---|
| ID | REP-20261014-007 |
| Stato | Completato |
| Data | 2026-10-14 |
| Autore | Codex |
| Commit di partenza | 7298d4df0d33bc92123517776d9ebc7c12ecefa6 |
| Richiesta | Tutte le pagine per categoria presenti di base, senza aggiungerle; quelle inutili vengono rimosse. |

## Perimetro e criteri

Correzione autorizzata di REP-006: inizializzazione automatica nel launcher operativo, una volta sola anche per le disposizioni precedenti. Preservare pagine, collegamenti e modifiche esistenti; non duplicare categorie già create. Conservare la rimozione dopo riavvio, importazione e cambio schermo. Nessun commit o aggiornamento Docker. Il diff preesistente resta preservato.

## Avanzamento e verifiche

Il launcher operativo e la sua anteprima inizializzano automaticamente tutte le sette categorie con i 25 widget, senza passare dalla creazione manuale. Le disposizioni precedenti sono estese conservando le pagine esistenti; categorie già create, anche rinominate, non duplicate. L'apertura resta su Principale.

Il campo `categoryDefaultsVersion: 1` della disposizione registra il completamento una tantum. Il validatore e l'importazione delle istantanee lo conservano. Dopo eliminazione non vengono ricreate né le pagine né i widget, anche cambiando classe di schermo. La scelta manuale rimane disponibile per pagine aggiuntive, senza essere necessaria all'avvio. Nessun nuovo controllo nell'interfaccia.

| Verifica | Esito ed evidenza |
|---|---|
| Test | 28/28: LauncherController, CategoryPages, LauncherStacks e Polish2LauncherPreview; massimo quattro worker. Coperti inizializzazione automatica, apertura su Principale, categoria rinominata, rimozione e riapertura con istantanea validata su telefono. |
| Statici/build | Typecheck, lint, colori/tipografia (zero violazioni) e build superati. Warning hls >500 kB preesistente. |
| Browser | `backup/check-categorie-base.cjs`, Chromium senza GPU separato dai test, a 390/1280/1920. Primo avvio senza clic su Nuova pagina: 25 widget e sette categorie, nessun errore. Eliminazione di Sicurezza e reload: pagina assente e marcatore preservato a tutte le larghezze. |
| Diff | git diff --check superato; modifiche preesistenti conservate. |

## Chiusura

Correzione completata nel frontend di sviluppo. Nessun commit, deploy o aggiornamento Docker: il banco 3002 resta precedente. Nessun nuovo incarico attivo. HA fisico resta non collaudato; questa correzione cambia l'inizializzazione della disposizione.
