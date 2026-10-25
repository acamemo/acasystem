# REP-20261007-033 — Blocca la disposizione e pagina principale (F3, F4)

| Campo | Valore |
|---|---|
| Stato | Completato; banco aggiornato; da provare sul tablet |
| Data | 2026-10-07/08, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Richiesta | Piano «Personalizzazione come Android» approvato in chat il 2026-10-07, fasi F3 e F4. |
| Fonti | Samsung [ANS10000945](https://www.samsung.com/us/support/answer/ANS10000945/) («Lock Home screen layout») e [personalizzazione del tablet](https://www.samsung.com/ca/support/mobile-devices/galaxy-tablet-customize-the-home-screens/) (pagina principale con l'icona casa); consultate il 2026-10-07. |

## Modifiche

- **Layout:**
  - nuovi campi facoltativi `locked`, `homePageId` e `density` (`density` per F6) in `@types/launcher.ts`, controllati dal validatore;
  - `controller.setLayoutOptions` li cambia;
  - `basePageId` preferisce la pagina principale scelta, se è visibile;
  - `canRemovePage` protegge la pagina principale invece di «home» fisso.
- **Sistema → Schermata Home** (`HomeScreenSection.tsx`): interruttore «Blocca la disposizione».
- **Da bloccato** (`LauncherScreen.tsx`):
  - la pressione lunga e «Modifica» non aprono la modifica né la vista pagine;
  - compare la pillola «Disposizione bloccata: sbloccala in Sistema → Schermata Home»;
  - se si blocca mentre si modifica, la modifica si chiude.
- **Vista delle pagine:**
  - icona casa «Imposta come principale», in accento sulla pagina principale;
  - il launcher si apre su quella pagina;
  - la principale non si elimina, e «Principale» diventa eliminabile se un'altra pagina è la principale.

## Verifiche

- **vitest:**
  - `LauncherHomeOptions.test.ts`: validatore, pagina principale, nascosta, eliminabilità;
  - in `LauncherScreen`: icona casa, blocco con pressione lunga e Modifica;
  - in `SystemPage`: interruttore che chiama `setLayoutOptions({ locked: true })`.
- Suite completa 1389/1389.
- **Banco:** `sha256:91dd2aa3a751671d1f3010fb1c19bc38c0b52d0b703e8d7386107eae43f255cd`.
