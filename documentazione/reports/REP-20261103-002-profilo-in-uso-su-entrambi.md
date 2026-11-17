# Profilo indicato in uso su PC e telefono

| Campo | Valore |
|---|---|
| ID | REP-20261103-002 |
| Stato | Completato: accesso PC sbloccato dopo chiusura dell’app desktop, confermato dall’utente |
| Data | 2026-11-03, Europe/Rome |
| Autore / modello | Codex; nome esatto non disponibile |
| Commit iniziale | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta | «sia da telefono che da pc il profilo risulta in uso» |
| Autorizzazione | Diagnosi e correzione del blocco entro ADR-0037; nessun nuovo comportamento, takeover o rilascio forzato. |

## Obiettivo e perimetro

Distinguere una terza istanza aperta dal rifiuto errato di tutte le istanze dopo il banco0.9.38/r99. Preservare le486 voci Git preesistenti, account, sessioni, profili e bozze. Solo letture sul banco; fixture isolate per riproduzione. Nessun accesso a credenziali personali, comando fisico, nuova pubblicazione o modifica a HA/VM. Un'eventuale correzione applicativa e la sua verifica devono avere causa dimostrata; non cancellare le riserve per mascherare il problema.

## Criteri di completamento

- Identificare evidenza della causa, distinguendo osservazioni e ipotesi.
- Un'istanza legittima può accedere; le altre restano bloccate finché il titolare è aperto.
- Chiusura del titolare rende possibile il passaggio, preservando dati e login.
- Correggere e ricollaudare il comportamento se emerge una regressione software; documentare limiti e riscontro umano.

## Avanzamento

Banco0.9.38/r99 running/healthy da15ore, HA/D1 non riavviati. Inventario Computer Use: una finestra Edge intitolata Acasystem con altre2pagine e un'app desktop Acasystem separata, da progetto/client/windows/release/vm-current/win-unpacked. Questo dimostra due superfici ACA aperte, non chi detiene il profilo. Ipotesi: app desktop o altra scheda titolare in secondo piano, coerente con la regola umana che mantiene l'uso fino alla chiusura.

Lettura di Edge interrotta da Computer Use perché non può verificare l'URL con sufficiente certezza. Nessun input o successivo tentativo di aggirare il blocco. Chiesto all'utente di chiudere solo l'app desktop, mantenere una sola scheda ACA e premere Riprova. Agenti leggono frontend/backend e cercano riproduzioni isolate, senza modificare sorgenti o dati reali.

## Verifiche ed evidenze

Git:486voci preesistenti; stato iniziale in backup/rep025/git-status-before.txt. Inventario finestre tramite API Computer Use documentate; nessuna autenticazione o lettura di token. Nessun esito positivo del recupero ancora osservato. StrictMode nella build di produzione non duplica da solo gli effetti; non attribuire una causa senza riproduzione.

## Chiusura e punto di ripresa

Attendere risposta sulla chiusura della sola app desktop, con una scheda ACA Edge rimasta aperta. La causa reale non è confermata; non dichiarare risolto il blocco prima del riscontro. Se resta occupato, chiudere tutte le altre istanze ACA e attendere fino180s dall’ultima attività del titolare prima di riprovare un solo dispositivo. Riprendere da questo punto senza cambiare la regola di uso esclusivo.

## Esiti delle analisi indipendenti

Backend: acquire/renew/require/release eliminano le riserve scadute. Senza rinnovo il titolare non mantiene il blocco oltre180s; SSE non rinnova il possesso e grazia/cleanup duplicati non prolungano i3s. Un blocco durevole può quindi dipendere da un’altra istanza viva oppure da un rifiuto diverso rappresentato con lo stesso messaggio. Nessuna ispezione dei token, database personale o stato interno del processo sul banco.

QA sul bundle0.9.38.99 immutabile, app React completa e FakeHA isolato: accesso normale PC/telefono bloccato e3reload normali con concorrente riusciti. Riprodotto il caso limite risposta201 trattenuta dopo concessione, poi reload prima di riceverla: il vecchio documento non conosce l’ID da rilasciare, il nuovo cambia identità d’istanza e anche il telefono vede423. Entrambi senza widget, zero erroriJS/comandi fisici. Questo non dimostra la causa del banco né un blocco permanente: la scadenza180s non è stata attesa nel browser. File backup/rep025/qa-both-blocked-results.json, qa-both-blocked-handoff.md e screenshot both-busy-pc/phone.png. Sintassi dei due script node --check PASS; fixture fermata e porta non raggiungibile.

Possibile correzione da valutare dopo riscontro: distinguere concessione iniziale e conferma, per recuperare una risposta iniziale persa senza sottrarre il profilo a una sessione già attiva. È una proposta tecnica, non implementata. Nessun sorgente applicativo, dipendenza, immagine, dato, sessione o runtime del banco modificato in questo intervento; nessun nuovo deploy. Prima isolare il titolare effettivo, evitando di attribuire al caso limite riprodotto la causa reale senza evidenza.

## Riscontro umano e chiusura, 2026-11-03

Alla richiesta «Chiudi soltanto la finestra dell’app desktop Acasystem, lasciando aperta una sola scheda ACA in Edge. Poi premi Riprova in Edge: il PC si sblocca?» l’utente ha risposto **«Sì, il PC si sblocca»**.

L’osservazione dell’app desktop aperta e il recupero dopo la sua chiusura confermano operativamente la diagnosi di un’ulteriore istanza che manteneva occupato il profilo. Il comportamento è coerente con ADR-0037: app desktop e scheda Edge sono due istanze distinte anche sullo stesso computer; il secondo piano mantiene l’uso. Non era necessario cambiare la regola o revocare le sessioni.

La diagnosi di questo incidente è conclusa, senza correzioni applicative o nuovo deploy. Il caso limite della risposta iniziale persa rimane separato in ISSUE-139, non dimostrato come causa dell’incidente e non implementato. I paragrafi precedenti conservano lo stato della diagnosi prima del riscontro.

Punto di ripresa del collaudo: con app desktop chiusa, chiudere anche la scheda ACA in Edge e provare l’ingresso dall’iPhone dopo circa3s, usando Riprova se necessario. Il passaggio fisico PC→iPhone e lo spostamento di Tavano non sono confermati da questa risposta; non dichiarare il collaudo generale completato.

## Annotazione successiva, 2026-11-03 — passaggio fisico

L’utente conferma successivamente PC→iPhone e, dopo un’attesa e Riprova, recupero iPhone→Edge. Esiti e limite di immediatezza Safari in [REP-20261103-003](REP-20261103-003-ritorno-iphone-edge.md), ISSUE-140. Questa integrazione supera il precedente punto di ripresa sul solo passaggio, preservando la diagnosi dell’app desktop; Tavano trascinato non ancora confermato.
