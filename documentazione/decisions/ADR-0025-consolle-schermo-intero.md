# ADR-0025 — Consolle a schermo intero per i dettagli dei widget

| Campo | Valore |
|---|---|
| ID e titolo | ADR-0025, consolle a schermo intero per i dettagli dei widget |
| Stato | Accettata |
| Data e autore | 2026-10-27; scheda dell'agente Claude Code (Opus 5.5) |
| Decisore e autorizzazione | Utente, 2026-10-27. Richiesta: «modificare la tendina al tap e fare un interfaccia dedicata per ogni widget a schermo intero come una consolle di controllo completa sul singolo widget». Scelte nel piano approvato: «Prima la TV, poi le altre (Recommended)», «Due colonne (Recommended)», «Si allarga dal widget (Recommended)». |
| Collegamenti | [REP-20261027-002](../reports/REP-20261027-002-consolle-widget.md), [REP-20261026-006](../reports/REP-20261026-006-rileva-dispositivi.md), [ADR-0004](ADR-0004-principi-frontend.md), REP-20261023-006 (coreografia delle tendine) |
| Sostituisce / sostituita da | Nessuna |

## Contesto ed evidenze

Il tocco su uno spazio vuoto di un widget apre una tendina dal basso (`DetailsSheet`, primitiva `Sheet`). La stessa tendina contiene i dettagli di 23 widget.

Per la TV i dettagli sono cresciuti molto (REP-20261026-006):
- tasti base;
- volume e canali;
- app e ingressi;
- telecomando;
- riproduttore.

Sul tablet di riferimento (Chrome 1280×665) bisogna scorrere a lungo.

## Proposta o decisione

Decisione dell'utente: un widget può avere, al posto della tendina, una **consolle a schermo intero**.

**Consolle:**
- è una primitiva condivisa, `Console`, con le colonne `ConsoleColumns`;
- si allarga dal widget toccato e ci ritorna quando si chiude;
- ha due colonne sul tablet orizzontale e una sul telefono;
- si chiude con la freccia, il tasto Indietro di Android, Esc o scorrendo in basso dall'intestazione.

**Ambito:**
- la TV per prima;
- gli altri widget restano sulla tendina finché l'utente non sceglie quali convertire.

La definizione del widget dichiara `Console` accanto a `Details`. Il launcher apre la consolle se c'è, altrimenti la tendina.

## Alternative e motivazioni

L'agente ha proposto tre alternative per ciascuna scelta, e l'utente ha scelto le opzioni raccomandate.

| Scelta | Alternative proposte | Motivo della scelta |
|---|---|---|
| Ambito | tutti i widget insieme; solo la TV senza struttura comune | lavoro graduale, con una base comune riusabile |
| Disposizione | una colonna che scorre; schede in alto | si vede quasi tutto senza scorrere |
| Apertura | dal basso come la tendina | continuità visiva con il widget toccato |

## Conseguenze

**Comportamento:** la TV non usa più la tendina dei dettagli; i comandi restano gli stessi.

**Aspetti tecnici nuovi:**
- **Tasto Indietro:** la consolle aggiunge una voce alla cronologia del browser per gestire il tasto Indietro. È la prima gestione della cronologia nell'interfaccia.
- **Animazione:** usa solo transform e opacity, senza ombre animate, per il limite della GPU del tablet (Mali-G52).

## Verifiche e revisione

Le verifiche e i loro esiti sono in [REP-20261027-002](../reports/REP-20261027-002-consolle-widget.md).

Questa decisione va rivista se:
- la consolle si dimostra lenta sul tablet;
- il tasto Indietro entra in conflitto con il guscio dell'app client (ADR-0023).
