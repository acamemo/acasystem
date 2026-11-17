# Mappa dei blocchi e dei flussi ACA

| Campo | Valore |
|---|---|
| Stato | Completato |
| Data / autore | 2026-11-04, Codex; nome esatto del modello non disponibile |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta | Salvare in un file i blocchi e i flussi: 0 installazione HAOS/ACA/QR e app Windows/Android; 1 registrazione/accesso/account; mappare i successivi in seguito. |
| Perimetro | Solo documentazione e collegamenti d’ingresso. Nessun nuovo comportamento, codice, installazione o deploy. Stato Git rilevato alla ripresa: 516 voci; modifiche preesistenti da preservare. |

## Criteri

Un file di orientamento con numerazione 0/1, ingressi/uscite e flussi correnti, stato realizzato/da completare e fonti esistenti. Conservare i nomi storici degli studi senza rinominare file. Blocchi successivi da definire con l’utente, senza assegnare funzioni o priorità. Non duplicare PRD, design o prove.

## Avanzamento

Consultati stato corrente, indici e schede di installazione/onboarding, anteprima QR e recupero account. Controllo indipendente in sola lettura sui confini: HAOS + bootstrap distinto da immagine personalizzata, QR grafico solo anteprima, scanner Android/IP desktop, account/profilo/sessione e uso esclusivo, banco 0.9.41 distinto dalla release pubblica.

Creata la [mappa unica](../riprogettazione/mappa-blocchi-flussi.md), collegata agli ingressi documentali e al diario. Nessun file storico rinominato o funzione futura assegnata.

## Verifiche e chiusura

- Controllo dei nuovi collegamenti relativi: `python backup/rep019/check-docs.py`, 264 collegamenti senza riferimenti interrotti; confronto byte/SHA degli artefatti client preesistenti PASS. Controllo dedicato: 7 documenti dell’incarico, 896 collegamenti relativi esistenti, nessuno interrotto e nessun nuovo spazio finale. Delta e risultati in `backup/rep034/`.
- Confronto indipendente in sola lettura dei confini e degli stati con le fonti correnti; precisate la distinzione client/sessione/istanza e le limitazioni della presenza mobile. Nessuna nuova approvazione o risultato di prodotto dedotto dalla mappa.
- Test di prodotto non eseguiti: l’incarico modifica soltanto documenti e indici.

Consegna: blocchi 0 e 1 descritti in un unico ingresso, con riferimenti e parti aperte. Prossimo passo: ricevere dall’utente il blocco successivo da mappare. Nessuna modifica all’applicativo, installazione, pubblicazione o commit.
