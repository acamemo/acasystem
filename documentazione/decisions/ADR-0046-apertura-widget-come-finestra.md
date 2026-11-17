# ADR-0046 — Entrata dal basso di Sistema e dettagli

| Campo | Valore |
|---|---|
| Stato | Accettata su richiesta umana; attuata e verificata localmente il2026-11-06 in REP006 |
| Data e autore | 2026-11-05, Codex; nome esatto del modello non disponibile |
| Decisore e autorizzazione | Prima richiesta: «non mi soddisfa l'animazione, la voglio in stile apple quando apri una finestra». Steering successivo esplicito: Sistema e dettagli devono comparire dal basso verso l'alto, con fade degli elementi precedenti, e i dettagli devono avere un fondo più simile a Sistema. Fonte in [REP006](../reports/REP-20261105-006-apertura-widget-finestra-apple.md). Parametri e implementazione sono scelte esecutive, non ulteriori approvazioni umane separate. |
| Collegamenti | [ADR-0004](ADR-0004-principi-frontend.md), [ADR-0016](ADR-0016-schermo-intero-interazioni.md), [brief](../design/componenti/widget-schermata.md) |
| Sostituisce / sostituita da | Sostituisce [ADR-0045](ADR-0045-transizione-widget-schermata.md) per il modello geometrico e la sequenza delle dissolvenze; conserva il percorso condiviso dei widget e i confini funzionali. |

## Contesto ed evidenze

**Integrazione successiva,2026-11-06:** [ADR-0047](ADR-0047-caricamento-home-unitario.md) coordina il solo primo ingresso/reload della Home con loader e disponibilità reale. Mantiene il movimento dal basso e i dettagli definiti qui; [REP004](../reports/REP-20261106-004-caricamento-home-unitario.md) ne registra l'attuazione locale.

Il riscontro umano rifiuta il movimento ottenuto con l'espansione dalla tessera anche dopo il perfezionamento frame per frame di REP005. Test e metriche geometriche non equivalgono all'accettazione estetica. La screenshot mostra la schermata finale e non costituisce una misura del comportamento delle finestre Apple.

## Decisione e scelte esecutive

Il primo candidato centrato a scala uniforme è stato implementato e provato, poi sostituito nel medesimo incarico dalla richiesta più precisa dell'utente. Sistema e Console comune entrano dal basso con opacità, senza ridimensionamento; la schermata precedente sfuma. Contenuto, titolo e comandi appartengono alla stessa unità visiva, senza ingresso ritardato del body. Uscita coerente e inversa; movimento ridotto con sola dissolvenza. Dimensioni finali e controlli ACA conservati; paesaggio fisso e nessun velo di vetro esteso all'intera schermata dei dettagli.

Preferire primitive, token e capacità esistenti, senza installare una libreria o introdurre un nuovo sistema di animazioni. Eventuali misure della tessera o timer resi inutili dal cambiamento vengono rimossi soltanto nel percorso sostituito; compatibilità e dipendenze verificate nel codice.

## Conseguenze e verifiche

Non cambiano account, profili, comandi, permessi, backend, dimensioni finali o disponibilità delle schermate. Conservare focus, Escape/Back e precedenza dei menu, scroll e gesture. [REP006](../reports/REP-20261105-006-apertura-widget-finestra-apple.md) raccoglie parametri, prove e limiti. Il risultato è ispirato alla sensazione di una finestra Apple, senza attribuire ad Apple valori esatti non verificati.

Anteprima e build locali; banco, pubblicazione e collaudo hardware sono distinti.
