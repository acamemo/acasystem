# Glass White — vetro bianco su paesaggio

Variante sperimentale richiesta dall’utente il 2026-11-04: un unico pigmento bianco su
superfici trasparenti, paesaggio naturale dietro, bordi luminosi verso l’interno. Gli stati
funzionali e il focus possono usare colore; non viene cambiata l’identità personale dell’account.

`index.css` estende Liquid Glass con `white.css`, `motion.css` e `layout.css`. Dopo la prova
opt-in, l'utente ne richiede l'uso nell'app reale: [ADR-0043](../../../../../documentazione/decisions/ADR-0043-vetro-bianco-banco.md)
lo adotta nell'ingresso predefinito `design/index.css`, senza aggiungere selettori o preferenze.
Installazione e conservazione dei dati del banco sono registrate nel [REP014](../../../../../documentazione/reports/REP-20261104-014-banco-vetro-bianco.md).

Il pannello usa una tinta bianca al9%; i controlli interni al6%, senza un filtro per pulsante.
Il backdrop blur16px è su un solo pseudo-elemento per pannello principale, con maschera
radiale che lo sfuma verso i bordi; nei popup il filtro arriva al bordo per evitare testo
leggibile sotto la finestra. Il contenuto resta su un livello separato e il QR rimane
nero su bianco. Il bordo è composto da luce bianca interna, non da un riempimento opaco.
Il paesaggio riceve un velo neutro statico per sostenere il testo bianco. Nessun filtro animato,
nuovo gesto o motore grafico. La resa/costo su tablet richiedono prove reali.

Senza supporto al filtro o con trasparenza ridotta/contrasto aumentato, il materiale torna
bianco opaco con testo scuro; in forced-colors prevalgono i colori di sistema. Le eccezioni
Casa3D/ingranaggio includono anche gli pseudo-elementi: niente blur su quelle zone.

L’immagine locale `landscape.webp` è206122byte. [Origine e prompt](asset-origin.md): generazione
image_gen integrata; solo codifica WebP dell’originale, nessun servizio fotografico remoto.

La [rifinitura degli allineamenti e dell'accento](../../../../../documentazione/reports/REP-20261104-013-allineamenti-accento-vetro-bianco.md)
dispone gli header in alto e i comandi su righe coerenti; nei sensori grandi il grafico usa
lo spazio disponibile. `layout.css` modifica la composizione interna, senza riscrivere
coordinate, ordine o dimensioni dei widget. I pannelli affiancati del kit hanno altezze
uniformi e azioni48px. L'accento attivo è lavanda chiaro sul vetro, con un pomello scuro
nei toggle; fallback opaco scuro su bianco. Colori personali/semantici distinti.

## Anteprima

[Apri l'interfaccia ACA](http://127.0.0.1:4185/): parte direttamente con i widget della casa
simulata. Navigazione e impostazioni sono quelle reali; il menu collassato «Anteprima · dati
simulati», in basso a destra, aggiunge scorciatoie a Sistema/account, frecce per le pagine,
Accesso, Kit e QR. Può essere nascosto. Il server `backup/rep039/serve-white-app.mjs` usa la
build reale e unicamente la fixture isolata FakeHA4184 con SQLite in memoria; rifiuta
l’avvio se manca il suo identificativo. Non c’è fallback alla centrale3002. Credenziali e
comandi dell’impianto reale non sono necessari. Le modifiche demo restano nella visita:
ricaricando si riparte dai dati simulati. Tavano contiene eventi esplicitamente dimostrativi;
il crop e la copertina account sono esplorabili, mentre il manifest foto avatar è escluso
dalla modalità demo preesistente.

Nel catalogo Kit il menu di anteprima è nella testata, nel flusso della pagina: non copre
la toolbar dei dati o i controlli del catalogo nei telefoni stretti.

L'app entra una volta con salita16px, scala.97 e dissolvenza280ms. Le Sheet usano la stessa
direzione in280ms, i popover una versione più breve200ms con origine sul proprio trigger.
La presenza nativa mantiene le uscite e l'interruzione delle transizioni; niente animazioni
del filtro o di ogni widget durante lo scorrimento. Movimento ridotto: dissolvenza120ms,
senza salita/scala. Fonte del nuovo incarico e QA: [REP012](../../../../../documentazione/reports/REP-20261104-012-interfaccia-completa-vetro-bianco.md).

La demo grafica non risolve i difetti funzionali emersi nel precedente audit del blocco1.
Stato, verifiche e limiti in [REP011](../../../../../documentazione/reports/REP-20261104-011-prova-vetro-bianco-paesaggio.md).
