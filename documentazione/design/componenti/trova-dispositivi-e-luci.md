# Trova dispositivi e Luci

Modalità: **Operate**. Fonte umana: piano approvato e incarico di implementazione del2026-11-09, [REP013](../../reports/REP-20261109-013-utilita-e-luci-per-dispositivo.md), [ADR-0049](../../decisions/ADR-0049-widget-prodotti-per-dispositivo.md). Materiale e animazioni rimangono quelli del [design ACA](../design.md).

## Trova dispositivi

Primo accesso diretto del catalogo, stesso corpo del widget Home. Ricerca per nome e Aggiorna nella stessa riga quando c'è spazio; sul telefono il refresh mantiene un target44px senza un secondo bottone testuale a tutta larghezza. Da collegare, Pronti e Già aggiunti usano tre colonne leggibili, con conteggi di risultati effettivi e ricerca applicata ai nomi. La voce Aggiungi alla Home è secondaria nel footer, senza sottrarre altezza alla lista iniziale.

Righe allineate a sinistra: nome, funzione, stato e stanza se conosciuta; marca e dettagli come approfondimento. Un'azione principale apre il percorso corretto: collega, prepara il widget, oppure raggiunge quello presente. Nascosti/Annulla e collegamento per integrazione conservati. Il collegamento a HA può richiedere PIN/consensi o autenticazione; questi passi sono parte del flusso reale, non una schermata di successo simulata.

Prima lettura con caricamento reale, senza ricerca fittizia di30s o ritardi di comparsa delle righe. Se il refresh fallisce, avviso singolo e risultati precedenti consultabili. Nessun vuoto/loader sovrapposto allo stesso errore. Chiudere lo strumento invalida le letture in sospeso: una risposta tardiva non può riaprire finestre o avviare bozze. Il passaggio al posizionamento attende la rimozione reale della finestra.

## Luci

Una tessera per dispositivo HA; il nome iniziale è quello del dispositivo. I canali restano riconoscibili per nome e controlli indipendenti. Nella schermata completa, i controlli si dispongono nella larghezza disponibile, senza una lunga colonna vuota su desktop; due colonne dove la larghezza mobile lo permette. Misure di uso e Tecnica/manutenzione sono separate tramite categorie del registro HA, senza indovinare dal testo dei nomi.

Accensione, luminosità, colore, bianco, effetti e regolazioni compaiono soltanto se supportati dal runtime/adattatore. Non dichiarare coperti tutti i parametri HA del foglio Comandi: confini espliciti nella [matrice](../../riprogettazione/matrice-widget-ha.md). Nessuna entità nascosta/disabilitata viene attivata. Stato indisponibile e permesso negato non diventano un successo; nessun reinvio automatico incerto.

L'anteprima associata mostra nome e stato reali come contenuto inerte. Il widget e i collegamenti vengono salvati insieme soltanto dopo Conferma/ACK. La configurazione HA già completata rimane disponibile se manca spazio o si annulla il posizionamento. Widget vecchi/manuali mantengono il renderer precedente; ricollegare manualmente l'entità principale esclude eventuali metadati del dispositivo precedente senza una pulizia automatica del profilo.

## Verifiche

Desktop e telefono; nomi lunghi, canali multipli, servizi/attributi mancanti, permessi negati e indisponibilità. Ricerca, tre filtri, refresh fallito, PIN/consenso, hub con più apparecchi, chiusura durante lookup, tastiera e movimento ridotto. Pagine nascoste/pile/duplicati storici si raggiungono senza modificare layout o visibilità. Nessuna prova browser sintetica certifica pairing hardware, iPhone fisico o prestazioni Lenovo M11.
