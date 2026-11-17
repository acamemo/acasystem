# ADR-0044 — Spazio per gli avvisi e gerarchia delle anteprime

| Campo | Valore |
|---|---|
| ID / stato | ADR-0044 — Scelta esecutiva nel perimetro della correzione richiesta; implementata/verificata e installata0.9.44 in REP015 |
| Data / autore | 2026-11-04, Codex; nome esatto del modello non disponibile |
| Fonte umana | «risolvi queste sovrapposizioni grafiche» e successivamente ridurre pagina precedente/successiva mantenendo quella in visualizzazione, con screenshot del banco. |
| Collegamenti | [REP015](../reports/REP-20261104-015-sovrapposizioni-sync-e-anteprime-pagine.md), [ADR-0016](ADR-0016-schermo-intero-interazioni.md), [design](../design/design.md) |
| Sostituisce | Eccezione alla sola policy di avvisi sempre sovrapposti di ADR-0016; nessuna sostituzione di gesti, permessi o dati. |

## Contesto ed evidenze

Messaggi del profilo e indicatore si posizionano indipendentemente in alto. Un avviso con testo/azioni può essere più alto della fascia libera; un semplice offset elimina l'intersezione reciproca ma sposta l'indicatore sui widget. La richiesta richiede una correzione grafica leggibile, non la rimozione di messaggi/azioni o una nuova procedura di recupero.

## Scelta esecutiva

Gli avvisi dispongono di una fascia reale sopra l'app, con altezza limitata e scorrimento interno per contenuti molto lunghi. AppShell coordina avviso connessione e indicatore e adatta temporaneamente l'area disponibile, senza salvare alcun riordino o cambiamento dimensionale nei profili. In assenza di avvisi rimane la disposizione ordinaria. Contenuto e focus dell'app non vengono rimontati alla comparsa/scomparsa del messaggio; le azioni di bozza restano quelle esistenti.

In panoramica la pagina centrale usa la scala base già esistente; le laterali applicano0,90 aggiuntivo. L'interpolazione segue il gesto e i tempi del pager; il centro non riceve un'ulteriore riduzione. La scala base può sempre adattarsi all'area effettiva del renderer, come negli altri cambiamenti di viewport. Il valore0,90 è un dettaglio esecutivo del concept richiesto, non una preferenza dell'account.

## Conseguenze e verifiche

Nessuna nuova libreria, stato del coordinatore, protocollo di lease, salvataggio, cancellazione o riconciliazione. Nessun filtro sull'intera cornice o sulla scena3D. Le card fisicamente troppo piccole riusano la presentazione compatta e la capacità esistenti, con observer sul border box e ritorno alla forma nominale, senza riscrivere preferenze o dimensioni logiche. Verificati avvisi, ripristino DOM/input e configurazione, swipe/drag/hit-test e movimento ridotto; file IndexedDB invariati, nessuna verifica dei contenuti del browser umano. Esiti e limiti nel REP015, incluso aggiornamento locale del solo ACA.
