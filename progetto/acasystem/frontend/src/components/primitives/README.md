# Primitive ACA

Primo livello della gerarchia `primitives → system → widgets → templates → pages` ([ADR-0004](../../../../../../documentazione/decisions/ADR-0004-principi-frontend.md), [ADR-0008](../../../../../../documentazione/decisions/ADR-0008-struttura-frontend-backend.md)). Le primitive non conoscono Home Assistant e non importano da `system`, `widgets`, `templates`, `pages`, servizi, contesti o hook dell'app: lo verificano la regola ESLint `no-restricted-imports` e `MetalMaterial.test.jsx`. Stile in `src/themes/acasystem` (kit «Metallo», [ADR-0006](../../../../../../documentazione/decisions/ADR-0006-sistema-metallo.md) e [ADR-0007](../../../../../../documentazione/decisions/ADR-0007-acasystem-os.md)).

| Gruppo     | Primitive                                                                                                                                                              |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Materiale  | MaterialLayers, materialClass: socket → guscio → faccia → contenuto, comportamenti press/static/well, modificatore `aca-m--well-soft` (pozzetto tenue)                 |
| Componenti | Button, Surface, Toggle, Segmented, Field, Slider, ProgressRing, Badge, SelectTrigger, Icon, Sheet, SideSheet, ConfirmSheet, Popover, DialogShell, Modal, Skeleton, PanelPresence |
| Legacy     | Card, Container, Input, Choice, Switch: classi del CSS precedente, mantenute per il codice non ancora migrato                                                          |
| Tipografia | Display, Title, Heading, Body, Label, Caption, Numeric, IconText, Text                                                                                                 |
| Layout     | Flex, Grid                                                                                                                                                             |
| Utilità    | useScrollLock                                                                                                                                                          |

## Stati

- **Hover, click, focus:** dal CSS. Le classi `.is-hover`, `.is-active` e `.is-focus` li forzano nella pagina di prova e stanno negli stessi selettori.
- **Selezione:** `aria-pressed`, `aria-current`, `aria-selected` o `aria-expanded` su un elemento press. Pressione morbida, LED blu e inchiostro blu.
- **Disabilitato:** `disabled`, oppure `aria-disabled` su Surface. Segmented accetta `disabled`.
- **Caricamento:**
  - Button `loading`: `aria-busy`, breve pulsazione, click ignorati, focus mantenuto.
  - Toggle e Slider `pending`: valore richiesto ma non ancora confermato, con `aria-busy`, riempimento al 45% e pulsazione.
  - Contenuti: Skeleton.
- **Pozzetto tenue:** modificatore `aca-m--well-soft` su un materiale `static` (per esempio `materialClass({ behavior: 'static', shape: 'card' }, 'aca-m--well-soft')`), per incavi ripetuti molte volte che devono restare sotto il contenuto, come le celle libere del launcher. Mostra il colore della pagina, senza anello grafite né ombra del foro (`::after` resta solo su `aca-m--well`), con un bordo chiaro in alto a sinistra e un labbro illuminato in basso a destra; il contenuto è in inchiostro muted e porta il significato (il «+»). Su un `button` aggiunge hover e focus (faccia del pozzetto, inchiostro pieno), click (pressione e scala del kit) e disabilitato; il focus ha l'anello blu di ogni materiale. Socket, guscio e faccia mantengono 4, 3 e 7 + LED strati d'ombra in ogni stato. Selezione, caricamento ed errore non sono previsti.
- **Azione distruttiva:** Button `variant="danger"` (rimuovi, elimina). Inchiostro rosso `--aca-danger-ink` (≥ 4,5:1 su ogni faccia), mai l'arancione di `primary` né il LED, che segnala un errore. Cambia solo l'inchiostro: hover, click, focus, disabilitato e caricamento sono quelli degli altri pulsanti, con lo stesso numero di strati d'ombra. Selezione ed errore non sono previsti; l'etichetta nomina l'azione, così il colore non è l'unico segnale.
- **Errore:**
  - Toggle e Slider `error`: `aria-invalid`, LED rosso e segno sul pomello; il messaggio lo collega il proprietario con `aria-describedby`.
  - Field `error="…"`: messaggio visibile collegato.
  - Surface `error`: LED rosso.

## API principali

- **Tipografia:**
  - Display: `as`, `size` sm/md/lg, `tone`.
  - Title: `level` 1–3.
  - Heading: `level` obbligatorio; `size` sm/md/lg facoltativo, senza `size` resta compatibile col codice esistente.
  - Body: `as`, `size` sm/md.
  - Label: etichetta incisa, `as` span/label, `size`.
  - Caption: muted di default.
  - Numeric: `tabular-nums`, `nowrap`, `as` span/data/time.
  - IconText: `icon`, `iconSize`, `iconTone` active/info/danger, `tone`.
  - Toni: ink, muted, engraved, active (arancione), info (blu), danger.
- **Button:** `variant` `primary` (azione arancione, una per stato della vista), `secondary`, `control`, `danger`, `plain` (senza materiale); `shape`, `size`, `loading`, `contentClassName`.
- **Area di tocco:** ogni `button.aca-m` (Button, Toggle, voci del Segmented e dei menu) ha un `::before` trasparente che porta l'area ad almeno 44 px senza cambiare l'aspetto. Un contenitore che ritaglia (traccia del Segmented, lista scorrevole) la ferma al proprio bordo; voci più vicine di 44 px tra i centri si dividono lo spazio tra loro.
- **Field:** tutto il pozzetto mette a fuoco l'input; una pressione sul pozzetto di un campo già a fuoco non lo sfoca.
- **Icon:** `size` sm/md/lg in em, oppure pixel e lunghezze come prima.
- **Sheet:**
  - Proprietà: `open`, `onClose`, `title`, `description`, `closeLabel` (default «Chiudi»), `footer`.
  - Comportamento: `<dialog>` modale nativo; focus su autofocus, poi sul primo controllo del contenuto; Escape e clic sullo sfondo chiamano `onClose`; scroll bloccato; focus restituito; movimento ridotto senza scorrimento. Il corpo scorrevole lascia spazio alle ombre delle righe in rilievo.
  - Coreografia (REP-20261023-006, blocco 2): sale in 280 ms e scende in 200 ms; mentre sale mostra la sola struttura e il contenuto compare all'arrivo (`data-arrived`); mentre scende titolo, descrizione, contenuto e piè di pagina restano quelli dell'ultimo render aperto, anche se il proprietario ha già azzerato il suo stato; due fogli di seguito si sovrappongono per circa 100 ms. Dove il browser non anima (jsdom) non c'è alcuna attesa.
- **SideSheet** (proposta grafica per la Casa 3D, R1, da annotare in design.md):
  - Proprietà: `open`, `onClose`, `title`, `closeLabel` (default «Chiudi»), `className`.
  - Comportamento: pannello laterale su `<dialog>` modale nativo, da sinistra, largo min(20rem, 85vw) e alto 100dvh; focus sul primo controllo, Escape e clic sullo sfondo chiamano `onClose`; scroll bloccato; focus restituito; movimento ridotto senza scorrimento. Piatto di proposito: nessuna ombra e un filo sul bordo, perché sta sopra un disegno che continua a ridisegnarsi.
- **ConfirmSheet:**
  - Proprietà: `open`, `title` (la domanda), `description`, `confirmLabel` (il nome dell'azione, mai «Sì»), `cancelLabel` (default «Annulla»), `danger`, `code` (`label`, `mode` numeric/text, `maxLength`, `error`), `onConfirm(code?)`, `onCancel`.
  - Comportamento: un Sheet. Prende il posto di `confirm()`: il tasto sicuro («Annulla») riceve il focus, con `code` lo riceve il campo; Invio nel campo conferma, Escape annulla; senza codice digitato il tasto di conferma resta spento. Il codice vive solo nel componente aperto: mai salvato né registrato.
- **Popover:**
  - Proprietà: `trigger={(props) => <Button {...props} />}`, `label`, `placement`, `onOpenChange`, `children` o `children(close)`.
  - Comportamento: API popover nativa (top layer, chiusura leggera, Escape), posizionato sotto o sopra il pulsante e tenuto nel viewport. Il contenuto si monta solo da aperto e resta durante la dissolvenza di chiusura; `data-autofocus` riceve il focus quando compare; `close()` restituisce il focus al trigger.
- **DialogShell:** semantica modale su div, con la stessa API e lo stesso comportamento del vecchio AccessibleModalShell. Modal lo usa e mantiene la propria API. Lo scroll si blocca su `<html>`, quindi si combina con il blocco su `<body>` del codice legacy.

Controlli da `progetto/acasystem/frontend`:

```text
npx tsc -p tsconfig.strict.json --noEmit
npx eslint src/components/primitives src/pages/kit
npx vitest run src/__tests__/MetalKit.test.tsx src/__tests__/MetalMaterial.test.jsx src/__tests__/Kit*.test.tsx src/__tests__/FixKit*.test.tsx
node scripts/lint-typography.mjs
```
