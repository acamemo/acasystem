# REP-20261007-020 — Indicatore fuori centro con il tablet in verticale

| Campo | Valore |
|---|---|
| Stato | Completato; banco aggiornato |
| Data | 2026-10-07, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Richiesta | Chat del 2026-10-07, con le schermate di un iPad Mini in verticale (744×1133): «se metto il tablet in verticale, ho il bug all'elemento cerchiato» (indicatore di pagina spostato a destra). |

## Causa

Regressione di REP-20261007-018. Le barre di modifica restano montate anche quando sono nascoste. Da 40rem in su il piè di pagina ha colonne laterali `minmax(min-content, 1fr)`, che si dimensionavano sulla larghezza delle barre nascoste e spingevano l'indicatore fuori centro. Sugli schermi larghi lo spazio bastava e il difetto non si vedeva.

## Modifica

`templates/app-shell/appShell.css`: con le barre nascoste, `.aca-shell__footer:has(> .aca-edit-toolbar--hidden)` usa colonne `minmax(0, 1fr) minmax(0, auto) minmax(0, 1fr)`. In modifica restano le colonne di prima, con l'adattamento di `footerBand.ts`.

## Verifiche

Vitest 1341/1341 e build verdi. Anteprima locale, piè di pagina ricostruito a 744 px con le barre nascoste: centro del piè di pagina e centro dell'indicatore coincidono (372 px), colonne `246.4px 168px 246.4px`. Banco `sha256:ac9f86647d82293c366ebd29dff410865a53750f1b3f9773544eac0005326117`, healthy. Non verificato sul tablet reale né in modalità modifica in verticale.

## Banco

Al primo avvio dopo il build il container non è partito: `192.168.1.42:3002` non era più disponibile, perché il PC era passato a un'altra rete Wi-Fi con indirizzo `172.20.10.6`. È il limite indicato in REP-20261007-011. In `compose.tunet.yaml` l'indirizzo Wi-Fi è stato aggiornato a `172.20.10.6`; il banco gira (healthy) e risponde sia su `127.0.0.1:3002` sia su `172.20.10.6:3002`.
