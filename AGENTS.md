# Regole di lavoro per ACA SYSTEM 2.0

## Perimetro e autorizzazione

- La richiesta umana corrente è il perimetro autorizzato. La presenza di una funzione in `documentazione/product.md`, di una proposta in un report o di una voce nel backlog non autorizza a implementarla.
- Procedi autonomamente con le scelte esecutive e le verifiche necessarie a completare l'incarico. Nuovi comportamenti, refactor estranei, sostituzioni tecnologiche e ampliamenti richiedono autorizzazione umana identificabile, anche se già fornita nella sessione.
- Registra le idee fuori incarico come proposte nel registro dei problemi. Non applicarle e non promuovere autonomamente una proposta ad approvata.
- Preserva le modifiche preesistenti e limita il diff al lavoro richiesto. Non aggiornare dipendenze, cambiare lo stack, creare remote o effettuare deploy per iniziativa propria.

## Avvio, ripresa e cambio di modello

1. Controlla lo stato Git, le istruzioni applicabili e `documentazione/project-status.md`.
2. Individua la richiesta corrente e il report da riprendere. Per un nuovo intervento significativo usa `documentazione/templates/report.md`, compilando richiesta, perimetro e criteri di completamento prima delle modifiche sostanziali.
3. Leggi i documenti pertinenti: `documentazione/product.md` per requisiti, architettura e ADR per confini tecnici, infrastruttura per operazioni, conformità per vincoli, verifiche per controlli.
4. Ricostruisci l'avanzamento da file, diff e risultati disponibili. Le affermazioni di un agente precedente non sostituiscono l'evidenza.

Il cambio di agente, modello o chat non annulla le decisioni approvate e non amplia l'incarico. Se manca un'informazione, cercala nel repository; chiarisci soltanto le ambiguità che impediscono il lavoro corretto. Continua le parti indipendenti già autorizzate.

## Documenti e decisioni

- La radice è il repository comune: `documentazione/` contiene le fonti progettuali, `progetto/` il futuro codice, `backup/` le copie locali escluse da Git. Mantieni `AGENTS.md` nella radice. Per i documenti segui l'indice in `documentazione/README.md`.

- `documentazione/product.md` è la specifica evolutiva; conserva gli ID `REQ` e non riutilizzare quelli ritirati. Stato dei requisiti e problemi: `documentazione/project-status.md`. Evidenze dei controlli: `documentazione/verification.md` e report collegati.
- Distingui requisito proposto/approvato da implementazione non iniziata/in corso/implementata/verificata. Inizialmente le funzioni applicative sono proposte, non implementate.
- Una decisione significativa usa `documentazione/templates/decision.md`. L'accettazione richiede una fonte umana esplicita; una scelta esecutiva interna al perimetro non richiede un ADR né una nuova conferma a ogni passaggio.
- Un conflitto tra codice, PRD e ADR va registrato. Non usare uno stato storico per ignorare una successiva richiesta umana esplicita; aggiorna le fonti pertinenti mantenendo la motivazione.
- Non modificare `documentazione/archive/`. Non cancellare ADR superati: aggiungi il collegamento alla decisione sostitutiva. Rettifica i report chiusi con un'annotazione datata, preservando quanto riportato in precedenza.
- Riporta fonti primarie e data per fatti esterni; versione/revisione se disponibile. Distingui osservazioni, valutazioni, proposte e risultati. Non inventare approvazioni, risultati, configurazioni, commit o nome esatto del modello.

## Verifica, chiusura e passaggio di consegne

- Confronta il diff con richiesta e criteri di completamento. Esegui i controlli pertinenti; per una regressione aggiungi una verifica del comportamento interessato quando esiste codice da verificare.
- Aggiorna i documenti che cambiano insieme al comportamento o alla configurazione. Non riscrivere documenti estranei solo per uniformarne lo stile.
- Registra comandi, esiti e limiti delle verifiche. Segna come non eseguito un controllo senza evidenza; non dichiarare CI attiva, conformità raggiunta o prodotto collaudato sulla sola base della documentazione.
- Per gli interventi significativi chiudi il report con modifiche, risultati, questioni residue e punto di ripresa; aggiorna il relativo indice e lo stato dell'incarico. Per correzioni minime sono sufficienti diff, commit e resoconto proporzionato.
- Crea commit coerenti se autorizzati dall'incarico. Includi soltanto il lavoro pertinente e verifica i file prima di aggiungerli. Non alterare la storia già condivisa.
- Non versionare credenziali, token, chiavi private, log sensibili o dati personali non necessari. Gli esempi sono privi di segreti; le evidenze sono selezionate e anonimizzate.

## Stato iniziale e ambito

Il repository è stato preparato con documentazione, Git locale e cartelle per backup e futuro codice. L'incarico corrente è indicato in `documentazione/project-status.md`; applicazione, server, backup automatici e test di prodotto richiedono incarichi espliciti. Il registro di conformità riguarda software e cloud; le installazioni fisiche sono un ambito separato con dipendenze da segnalare.

Le regole guidano gli agenti; il controllo del diff e le verifiche ne valutano il rispetto. Non sono un blocco tecnico contro qualsiasi modifica. Le istruzioni Codex sono descritte nella [documentazione ufficiale OpenAI](https://learn.chatgpt.com/docs/agent-configuration/agents-md).
