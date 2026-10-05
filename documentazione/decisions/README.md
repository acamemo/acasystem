# Registro delle decisioni

Aggiornato: 2026-10-05. Usare il [modello di decisione](../templates/decision.md).

| ID | Titolo | Stato | Fonte dell'approvazione |
|---|---|---|---|
| [ADR-0001](ADR-0001-documentazione-e-storico.md) | Documentazione evolutiva, storico locale e continuità degli incarichi | Accettata | Richiesta umana di implementare il piano e scelte esplicite riportate nell'ADR. |
| [ADR-0002](ADR-0002-organizzazione-cartelle.md) | Separazione di documentazione, backup e progetto | Accettata | Richiesta umana delle tre cartelle; nomi e percorsi sono scelte esecutive. |
| [ADR-0003](ADR-0003-home-assistant-locale-fase1.md) | Home Assistant locale e fase 1 grafica in ufficio | Accettata | Risposte umane e precisazioni del 2026-10-05 nel report collegato. |
| [ADR-0004](ADR-0004-principi-frontend.md) | Primitive e composizione delle interfacce | Accettata per i principi frontend | Risposta umana durante REP-20261005-005: componenti, tipografia, layout e composizione per pagina. |
| [ADR-0005](ADR-0005-typescript-italiano-icone.md) | Prima migrazione TypeScript, italiano e mx-icons | Accettata per l'ambito descritto | Richiesta della migrazione HOME e successive precisazioni umane su lingua e pacchetto icone. |

Gli stati consentiti sono Proposta, Accettata, Rifiutata e Superata. Numero progressivo a quattro cifre, mai riutilizzato. Non registrare una nuova soluzione tecnica come accettata sulla base di una valutazione dell'agente.

Una decisione superata mantiene contesto e motivazioni; aggiungere data e link alla sostitutiva. Il nuovo ADR collega quello precedente e chiarisce l'impatto su requisiti, verifiche e infrastruttura. Le decisioni rifiutate restano visibili.

ADR-0001 e ADR-0002 restano valide per processo e struttura. ADR-0003 approva Home Assistant locale, riferimento React Tunet e fase 1 grafica, ritirando Hetzner. Banco prova Container/Tunet disponibile; metodo finale, condizioni di distribuzione, ruoli e remoto restano da progettare. ADR-0004 registra i principi frontend dell'utente; organizzazione concreta e migrazione attendono il relativo incarico.
