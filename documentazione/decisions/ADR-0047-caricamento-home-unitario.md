# ADR-0047 — Caricamento e ingresso unitari della Home

| Campo | Valore |
|---|---|
| Stato | Accettata; attuata e verificata localmente in REP004 |
| Data e autore | 2026-11-06, Codex; nome esatto del modello non disponibile |
| Decisore e autorizzazione | Utente: «ok partiamo col piano», dopo il [piano operativo](../riprogettazione/caricamento-home-piano.md) consegnato. [Incarico REP004](../reports/REP-20261106-004-caricamento-home-unitario.md). |
| Collegamenti | [ADR-0004](ADR-0004-principi-frontend.md), [ADR-0046](ADR-0046-apertura-widget-come-finestra.md), [analisi](../reports/REP-20261106-002-analisi-caricamento-home-e-widget.md) |
| Sostituisce / sostituita da | Integra ADR-0046 per il primo ingresso/reload della Home; non cambia il modello di apertura dei dettagli o le relative funzioni. Sostituisce in quel solo percorso l'intro alla scala0,97 avviata dal mount. |

## Decisione

Coordinare le attese esistenti con uno stato comune di presentazione, senza duplicare profilo/dati/permessi. Loader circolare e comparsa della prima vista quando configurazione, snapshot/catalogo, misure/fit e risorse locali/fallback sono concordi. Identità verificata e concessione restano nelle autorità attuali. I dati secondari conservano stati locali e non bloccano la Home.

La fonte completa di comportamento, parametri e collaudi è il [piano assegnato](../riprogettazione/caricamento-home-piano.md). I retry sono mirati, senza cancellare dati validi o ripetere automaticamente comandi; la generazione visuale non invalida quella dei proprietari dei dati. La preparazione non nasconde i box con display:none e non spegne i caricamenti necessari tramite la visibilità.

## Conseguenze e motivazioni

Si riusano griglia, proiezione, primitive e stack attuali. Nessun nuovo schema, API backend, cache ottimistica o obbligo di rifare tutti i widget. Skeleton dettagliati e ottimizzazioni delle richieste sono separati dal primo lotto. Il paesaggio resta fisso e il materiale non deve cambiare quando termina la dissolvenza.

Il loader rende esplicita l'attesa; un guadagno di prestazioni richiede misure. L'implementazione non dimostra da sola compatibilità hardware o continuità offline diversa da quella già consentita. Banco e pubblicazione restano operazioni distinte. Esiti locali, confronto e limiti sono registrati in REP004; nessun risparmio di rete dimostrato o collaudo autenticato/hardware implicito.
