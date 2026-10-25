# REP-20261007-014 — Barra di stato flottante, ora sempre visibile, icone senza bordo

| Campo | Valore |
|---|---|
| Stato | Completato; banco aggiornato |
| Data | 2026-10-07, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Richiesta | Chat del 2026-10-07, con la schermata della barra in alto: «la topbar teniamola sempre con orario, però la farei diventare una barra floating, e farei le icone senza bordo». |

## Modifiche

- `templates/launcher/LauncherScreen.tsx`: la barra riceve sempre l'ora, anche sulla copertina (prima la nascondeva lasciandone il posto). La possibilità di nasconderla resta nel componente.
- `components/system/status-bar/statusBar.css`:
  - barra flottante: pillola in rilievo con la coppia d'ombre del kit, staccata dai bordi (margine superiore e laterale `--aca-gutter`), sul fondo della pagina;
  - Modifica e Sistema (`aca-status-bar__icon`) senza ombre a riposo; restano hover d'accento, pressione incassata e anello di focus;
  - «Fine» invariato.
- `StatusBar.tsx`: classe delle icone e commento.
- Test `PolishCornice.test.tsx` aggiornato a margini, imbottitura e ombra della barra flottante.

## Verifiche

Typecheck, lint, lint dei colori, lint tipografico, vitest 1333/1333 e build verdi. Banco `sha256:461e5418e00522291a717f4fdd35001ce516780ac3baf6e12148ff946056915a`, healthy. Non verificato a vista: la barra esiste solo nel launcher, che richiede l'accesso.
