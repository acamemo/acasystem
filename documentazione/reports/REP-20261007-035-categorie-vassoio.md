# REP-20261007-035 — Vassoio per categorie con la forma dei widget (F5)

| Campo | Valore |
|---|---|
| Stato | Completato; banco aggiornato |
| Data | 2026-10-08, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Richiesta | Piano «Personalizzazione come Android» approvato in chat il 2026-10-07, fase F5. |
| Fonte | Selettore dei widget di Launcher3 e Pixel, raggruppato con ricerca e anteprime ([support.google.com 13590881](https://support.google.com/googlepixeltablet/answer/13590881), Launcher3 `strings.xml`); consultate il 2026-10-07. |

## Modifiche

- **Categorie:** il vassoio ha in alto le categorie «Tutti», Luci e comandi, Clima e meteo, Sicurezza, Multimedia, Casa e info, Energia, Utilità (`WIDGET_CATEGORIES` in `catalog.ts`).
  - Raggruppano per uso nella casa, non per app come Android.
  - La ricerca cerca in tutte le categorie.
- **Forma del widget:** ogni scheda mostra quante celle occupa il widget (riquadri) e la misura «2 × 2». Il trascinamento usa quella misura.

## Verifiche

- **`WidgetTrayCategories.test.tsx`:**
  - ogni tipo del catalogo è in una categoria;
  - la categoria filtra e la ricerca la ignora;
  - le celle della forma corrispondono alla misura.
- **Test esistenti:** aggiornati al gruppo «Tipi di widget» (ora i gruppi sono due).
