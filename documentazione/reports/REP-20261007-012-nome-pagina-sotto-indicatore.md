# REP-20261007-012 — Nome della pagina sotto l'indicatore

| Campo | Valore |
|---|---|
| Stato | Completato; banco aggiornato |
| Data | 2026-10-07, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Richiesta | Chat del 2026-10-07, con la schermata della Principale: «ora la scritta "principale" e le altre scritte mettiamole sotto allo slider con la pallina». |

## Modifiche

- `components/system/page-indicator/pageIndicator.css`:
  - l'indicatore è una colonna centrata: scanalatura e, sotto, il nome della pagina su una riga, con troncamento se è troppo lungo;
  - la scanalatura usa tutta la banda (`100cqw`): non toglie più lo spazio del nome ai lati.
- `templates/app-shell/appShell.css`: nuova `--aca-indicator-height` (scanalatura + spazio + una riga di testo). La prima riga del piè di pagina e la sua altezza fissa crescono di conseguenza, sia nella disposizione su una riga sia in quella su due.
- Test di indicatore e piè di pagina aggiornati alla nuova posizione: `PolishCornice`, `Polish2Cornice`, `FixSystemIndicator`.

## Verifiche

Typecheck, lint, lint dei colori, lint tipografico, vitest 1333/1333 e build verdi. Banco `sha256:f6f0d2a5b761cfcb0f680b590972e3648123fcc8904dddec93445f3aa2f4b857`, healthy, raggiungibile anche da `192.168.1.42:3002`. Non verificato a vista: il launcher richiede l'accesso a Home Assistant; da controllare anche con la barra di modifica aperta.
