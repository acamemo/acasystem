# ADR-0040 — Nome utente unico e accesso personale

| Campo | Valore |
|---|---|
| Stato | Accettata; implementata e verificata nel software, banco 0.9.40 aggiornato; prova account HA in attesa di recupero |
| Data / autore | 2026-11-04, Codex; nome esatto non disponibile |
| Decisore e autorizzazione | L’utente approva esplicitamente un solo «Nome utente», rimozione del token manuale e aggiornamento del banco PC con la pill colore. |
| Collegamenti | [REP-20261104-004](../reports/REP-20261104-004-ingresso-semplificato-banco.md), ISSUE-142, REQ-23 |
| Relazione | Precisa [ADR-0036](ADR-0036-account-e-modifiche-immediate.md): ingresso essenziale e account comune. Conserva sessioni, autorizzazioni HA e [ADR-0039](ADR-0039-palette-fissa-tema-classico.md). |

## Decisione e confini

Nuove iscrizioni e creazione del proprietario chiedono un solo nome utente. Il valore normalizzato identifica il login e il nome visualizzato iniziale; le API continuano a distinguere `name` e `username`. Non rinominare gli utenti esistenti. I tentativi precedenti mantengono il nome originale, il colore e lo stesso identificativo fino all’esito definitivo.

L’ingresso propone login personale e creazione account. Ritirare l’opzione token manuale per il vecchio uso kiosk: la sessione personale gestisce già rinnovo e revoca indipendente per dispositivo. Nessuna eliminazione dei token interni necessari all’autenticazione e dell’identità tecnica server; nessuna revoca automatica degli accessi esistenti. I vecchi client in modalità token vengono accompagnati al login già disponibile.

La pill colore libera di REP003 viene inclusa nella build locale successiva. Aggiornamento del solo banco ACA sul PC autorizzato in questa richiesta, con backup verificato; HA e pubblicazione sono operazioni distinte. Nessun nuovo provider di identità, archivio password o sistema di sessioni ACA viene introdotto.

## Verifiche

Risultati e limiti nel report collegato; distinguere simulazione, provenienza artefatti, salute del banco e collaudo fisico.
