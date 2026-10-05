# Primitive ACA — primo incremento HOME

La schermata HOME viene migrata progressivamente a TypeScript secondo [ADR-0004](../../../../documentazione/decisions/ADR-0004-principi-frontend.md). Questo strato non conosce entità, account o servizi Home Assistant.

| Gruppo | Primitive disponibili | Contratto |
|---|---|---|
| Componenti | Button, Container, Icon | Proprietà native React; Button ha varianti plain/primary/secondary/control e type button iniziale. Container espone surface raised/inset. Icon espone soltanto i nomi mx-icons selezionati, con currentColor. |
| Tipografia | Heading, Text | Heading richiede livello 1–6; Text usa span o p. Semantica HTML preservata. |
| Layout | Flex | Contenitore div con display flex e proprietà native. |

Le varianti primary/secondary centralizzano i due pulsanti di azione HOME; control serve navigazione e strumenti, plain preserva i controlli legacy. Token themes.js e materiale styles/neumorphism.css definiscono rilievo/incasso, focus, pressione e movimento ridotto. aria-current, aria-pressed e aria-expanded comunicano selezioni stabili. Il primo materiale HOME non converte tutte le interfacce. Non creare primitive senza un uso concreto; Card e Grid verranno introdotti quando serviranno alle interfacce assegnate.

Lo stato vuoto e l'icona della pagina risiedono in components/pages/home. Header, navigazione e toolbar condivisi restano nei percorsi esistenti, ora in TSX; PageManagerPopover è privato del file PageNavigation. DashboardLayout, DashboardGrid e App continuano a collegare il codice JS alle interfacce migrate.

Controlli da progetto/tunet:

```text
npm run typecheck:home
npm run typecheck
npm run lint
npm test
```

La build esegue typecheck:home prima di Vite. tsconfig.home.json controlla rigorosamente primitive, contratti, componenti migrati e il test HOME; allowJs consente il confine con il codice precedente, che non diventa per questo rigorosamente tipizzato. ESLint controlla anche TSX e regole React/hooks. Il parser Babel serve soltanto al lint: non cambia la pipeline Vite.
