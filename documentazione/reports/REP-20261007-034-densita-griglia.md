# REP-20261007-034 — Densità della griglia (F6)

| Campo | Valore |
|---|---|
| Stato | Completato; banco aggiornato; da provare sul tablet |
| Data | 2026-10-08, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Richiesta | Piano «Personalizzazione come Android» approvato in chat il 2026-10-07, fase F6. Extra scelto dall'utente: «Densità della griglia». |
| Fonte | Griglia della schermata Home di Pixel (Sfondo e stile → Layout, [support.google.com 7289143](https://support.google.com/pixelphone/answer/7289143)) e di One UI; consultata il 2026-10-07. |

## Modifiche

- **Sistema → Schermata Home → Griglia:** Compatta, Normale o Ampia, salvata in `layout.density`.
- **Griglie** (`DENSITY_GRIDS` in `deviceClass.ts`):

  | Classe | Compatta | Normale | Ampia |
  |---|---|---|---|
  | tablet | 6×4 | 8×5 | 10×6 |
  | tablet verticale | 5×7 | 6×8 | 7×10 |
  | telefono | 3×5 | 4×6 | 5×7 |
  | telefono orizzontale | 5×2 | 6×2 | **8×3** |

  Il telefono orizzontale è la griglia 6×2 vista sul tablet ingrandito (ISSUE-028): in Ampia diventa 8×3.
- **Una disposizione per densità:**
  - le posizioni si salvano per classe e densità (`DeviceClass` è ora, per esempio, `tablet` o `tablet@wide`);
  - una densità mai usata viene riempita dalla disposizione esistente con il meccanismo che c'era già (`ensureDeviceClass`);
  - tornando a una densità precedente si ritrova la sua disposizione.
- **Adeguamenti:**
  - `gridFor`, `baseClassOf` e `classWithDensity` sostituiscono le letture dirette delle griglie;
  - il validatore accetta le 12 classi;
  - la copertina predefinita si dispone anche sulle griglie strette e basse (una riga che divide le colonne).

## Verifiche

- **Test nuovi:**
  - in `LauncherHomeOptions.test.ts`: griglie per densità, disposizione nuova ricavata da quella normale, che resta intatta, validatore;
  - in `SystemPage`: la scelta «Ampia».
- **Suite completa:** 1403/1403; controllo delle dimensioni dei chunk verde.
- **Banco:** `sha256:143fee7752269157f2ffd909f214abe6ef0c038fa07cfa5a2555c154d4786ec8`.
