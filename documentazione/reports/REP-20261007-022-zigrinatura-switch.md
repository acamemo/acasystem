# REP-20261007-022 — Zigrinatura dello switch più distanziata

| Campo | Valore |
|---|---|
| Stato | Completato; banco aggiornato |
| Data | 2026-10-07, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Richiesta | Chat del 2026-10-07: «distanziare meglio i singoli pallini interni facendoli espandere verticalmente e orizzontalmente in modo omogeneo». |

## Modifica

`themes/acasystem/components.css`, `.aca-toggle__grip`:
- distanza tra i 12 puntini da 0,125em a 0,1875em, uguale nei due assi (righe fisse di 0,125em);
- la zigrinatura passa da 0,625 × 0,875em a 0,75 × 1,0625em;
- l'angolo più lontano resta a 0,65em dal centro, dentro il raggio di 0,6875em del pomello.

## Verifiche

Vitest 1341/1341 e build verdi. Anteprima locale, switch compatto: distanza di 3,75 px in orizzontale e in verticale, zigrinatura centrata (scarto 0 px), puntino più lontano a 13,01 px dal centro su un raggio di 13,75 px. Banco `sha256:8a482838492f97cf55d35563550bfd172d47f378f14da0cc5ab2a9c0a88c35db`.
