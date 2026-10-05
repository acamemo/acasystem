# REP-20261005-007 — Conversione dell'applicativo allo stile Neumorphism

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261005-007 |
| Stato | In corso |
| Data | 2026-10-05, Europe/Rome |
| Autore / modello | Antigravity |
| Commit di partenza | 5f21bd6a3c97272a676b5fe7564f9e464e6f39c9 |
| Richiesta di riferimento | «conversione dell'attuale applicativo dallo stile attuale a neuromorphism, mediante subagents che in parallelo fanno la modifica per ogni componente, e tu che fai da orchestratore» e successiva conferma «procedi». |
| Autorizzazione | Conversione dello stile applicativo di Tunet a Neumorphism per entrambi i temi (scuro con base `#222222`, chiaro con base soft, accento arancione `#ef8231`), mediante orchestrazione modulare per componenti e primitive condivise in conformità ad ADR-0004, ADR-0005 e design.md. |

## Obiettivo e perimetro

Realizzare l'infrastruttura di stile Neumorphism e convertire i componenti dell'applicativo Tunet partendo dalle fondamenta (token/temi e primitive condivise) fino ai componenti dell'interfaccia (shell/layout, bottoni, card dei dispositivi e modali).

Ambiti inclusi:
- Definizione dei token semantici neumorfici nei temi (`themes.js`) e nelle classi/fogli di stile (`dashboard.css`, `index.css`): superfici in rilievo, incassate, ombre a doppia sorgente (highlight luce + ombra profonda) per tema chiaro e tema scuro, con accento `#ef8231`.
- Aggiornamento delle primitive condivise (`src/primitives`): `Button` con varianti neumorfiche (`neu-raised`, `neu-pressed`, `neu-flat`, `neu-accent`), `Container` con variante card neumorfica (`neu-card`, `neu-inset`).
- Applicazione dello stile Neumorfico alla shell e ai componenti HOME (Header, PageNavigation, EditToolbar, SettingsDropdown, HomeEmptyState).
- Adattamento e conversione delle card principali (`LightCard`, `SensorCard`, `RoomCard`) e dei componenti di controllo verso il Neumorphism ispirato alle reference [UI-001](../design/componenti/originali/UI-001-switch-principale.jsx.txt) e [UI-007](../design/componenti/originali/UI-007-switch-wifi.jsx.txt).
- Verifiche di non regressione su compilazione TypeScript (`npm run typecheck`), linting (`npm run lint`), suite di test (`npm test`) e corretto funzionamento sul banco di prova Docker (`http://127.0.0.1:3002`).

Esclusioni:
- Nessun refactor delle logiche di sincronizzazione o del backend Home Assistant.
- Nessuna introduzione di librerie esterne non autorizzate.

## Criteri di completamento

1. Token neumorfici completi e documentati per entrambi i temi (chiaro e scuro) con contrasto accessibile WCAG e palette approvata (`#222222` base scura, arancione `#ef8231`).
2. Primitive condivise (`Button`, `Container`/`Card`, `Icon`, tipografia) conformi ad ADR-0004 estese con varianti neumorfiche pulite.
3. Componenti di interfaccia aggiornati allo stile neumorfico senza alterare le funzionalità e i comandi operativi.
4. Controlli `typecheck` strict, `lint` e suite di test automatizzati superati con esito positivo.
5. Container locale Tunet aggiornato, attivo e verificato sul browser.
6. Documentazione, report e registro dei problemi aggiornati con diff pulito e privo di segreti.

## Avanzamento e modifiche

In avvio: definizione token CSS neumorfici e primitive condivise.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| NEU-01 | Definizione token neumorfici in themes.js e dashboard.css | In corso | |
| NEU-02 | Typecheck strict HOME / primitive | Pianificato | |
| NEU-03 | Test suite Vitest | Pianificato | |
| NEU-04 | Ricostruzione container e verifica locale 127.0.0.1:3002 | Pianificato | |

## Controllo del diff e decisioni

In corso.

## Chiusura e punto di ripresa

In corso.
