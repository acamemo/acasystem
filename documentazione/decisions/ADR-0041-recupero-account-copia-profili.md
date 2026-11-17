# ADR-0041 — Nuovo account e copia conservativa dei profili del banco

| Campo | Valore |
|---|---|
| Stato | Accettata; eseguita e verificata, widget recuperati confermati dall’utente |
| Data / autore | 2026-11-04, Codex; nome esatto del modello non disponibile |
| Fonte umana | «Autorizzo un nuovo account e la copia dei profili conservati», risposta alla scelta di recupero ISSUE-144/P-144-A. |
| Collegamenti | [REP005](../reports/REP-20261104-005-recupero-account-banco.md), [REP004](../reports/REP-20261104-004-ingresso-semplificato-banco.md), [ADR-0040](ADR-0040-nome-unico-accesso-personale.md) |

## Decisione

Ripristinare il servizio del banco e creare un nuovo accesso personale tramite UI locale, senza chiedere la password in chat. Copiare i due profili ACA conservati verso l’identità di destinazione verificata, mantenendo gli originali recuperabili. Non fingere continuità dell’identità HA perduta, non alterare i permessi ordinari degli utenti e non introdurre un recupero pubblico o automatico per nome utente. Backup e verifica isolata precedono il trasferimento effettivo.

Il recupero è un’operazione autorizzata sul banco PC, distinta dal codice dell’ingresso 0.9.40 e dalla futura installazione domestica. L’esito effettivo e i limiti rimangono nel report.
