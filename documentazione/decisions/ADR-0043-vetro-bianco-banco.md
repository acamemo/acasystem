# ADR-0043 — Vetro Bianco nella build del banco

| Campo | Valore |
|---|---|
| ID / stato | ADR-0043 — Accettata; build e banco0.9.43 installati/verificati in REP014 |
| Data / autore | 2026-11-04, Codex; nome esatto del modello non disponibile |
| Decisore e autorizzazione | L'utente, dopo le prove complete e la correzione di layout/colore: «mettiamo la versione sul banco? così posso vedere il risultato sull'app». |
| Collegamenti | [REP014](../reports/REP-20261104-014-banco-vetro-bianco.md), [design](../design/design.md), [rifinitura REP013](../reports/REP-20261104-013-allineamenti-accento-vetro-bianco.md) |
| Sostituisce | [ADR-0042](ADR-0042-tema-liquid-glass.md) per il materiale/default della build corrente del banco; restano primitive condivise, ingressi precedenti conservati e vincoli tecnici. |

## Contesto e decisione

Vetro Bianco è stato realizzato su componenti reali nella prova4185: paesaggio locale, pannelli bianchi trasparenti, accento lavanda leggibile, allineamenti interni e ingressi brevi. L'utente ne richiede ora l'uso nell'app del banco con i propri dati.

L'ingresso condiviso `design/index.css` adotta `themes/glass-white/index.css` per la nuova build locale0.9.43/r99. I precedenti ingressi Liquid Glass e Classico restano disponibili come sorgenti, senza nuovo menu o preferenze. Non si riscrivono i profili o il loro aspetto storico per selezionare il tema. Il paesaggio è un asset statico locale, non riattiva la personalizzazione globale del wallpaper.

## Confini e conseguenze

Installare solo ACA sul banco PC dopo backup verificato; HA, D1, identità, volumi e configurazioni conservati. Il materiale, le animazioni e il layout interno dei widget cambiano secondo la versione già provata; la geometria, l'ordine e le azioni dell'utente restano quelle persistenti. Colori funzionali/personali e fallback opachi conservati, nessun filtro sull'intera cornice/Casa3D/ingranaggio o su controlli annidati.

Niente pubblicazione, nuovo installer, aggiornamento HAOS o attivazione di servizi remoti. La toolbar della preview e gli eventi dimostrativi non fanno parte dell'app autenticata. Le correzioni della primitiva Popover già verificate in REP012 fanno parte della build; non assegnano un refactor di altri popup o i rimedi di ISSUE-145.

## Verifiche e revisione

Esiti nel REP014: provenienza e delta runtime, backup/dati/identità, salute e UI banco. La prova emulata non dimostra prestazioni M11/Safari/Android o un nuovo collaudo autenticato PC/iPhone. Non richiedere una nuova creazione account; l'utente potrà provare il risultato con la propria sessione dopo l'aggiornamento.
