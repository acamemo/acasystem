# UI condivisa ACA

Questa cartella è la fonte comune dei componenti React riutilizzabili di ACA. Il CSS, i font
e i temi hanno una fonte separata in [design](../design/README.md). L'estrazione U44 è descritta
nel [report REP-20261102-006](../../../documentazione/reports/REP-20261102-006-ui-movimento-layout-condivisi.md).

| Percorso | Responsabilità |
|---|---|
| `primitives/` | 45 moduli: materiali, controlli, tipografia, Grid/Flex, popup e relative utilità; [contratti e API](./primitives/README.md) |
| `motion.ts`, `hooks/useLeaving.ts` | Helper DOM per transizioni, movimento ridotto e permanenza degli elementi durante l'uscita |
| `toast/` | Unico ToastProvider/context, useToast e ToastHost con coda e tempi esistenti |
| `layout/` | AppShell a slot e misurazione della fascia inferiore |
| `navigation/` | Pager, PageIndicator e supporto a gesti, presenza e visibilità delle pagine |

Popup, focus, Escape, ritorno del focus, blocco scroll e animazioni sono condivisi insieme
ai componenti. AppShell riceve i contenuti negli slot; Pager e PageIndicator ricevono pagine,
indici e callback tramite proprietà. Non accedono ad account, configurazione della casa o API
Home Assistant. I vecchi percorsi sotto `frontend/src` riesportano questi stessi moduli:
provider, context e stato condiviso mantengono una sola istanza, senza una seconda implementazione.

## Uso

Preferire gli import dal sottopercorso del componente richiesto. Per esempio, da un modulo
direttamente in `frontend/src`:

```tsx
import { Button } from '../../ui/primitives/components/Button';
import { Sheet } from '../../ui/primitives/components/Sheet';
import { Pager } from '../../ui/navigation/Pager';
import { ToastProvider, useToast } from '../../ui/toast/ToastContext';
```

`index.ts` offre anche un ingresso aggregato. I sottopercorsi rendono esplicite le dipendenze
e gli eventuali import CSS dei moduli scelti. Il percorso relativo va adattato alla posizione
del consumatore; non è stato introdotto un pacchetto npm separato.

Per una nuova interfaccia React, `ui/styles.css` è un ingresso CSS completo facoltativo:
include tema ACA, toast, AppShell, PageIndicator e stile del Pager. Importarlo una volta
nell'ingresso dell'interfaccia. Un consumatore che compone gli stili separatamente può usare
`design/index.css` per il tema e `ui/pager.css` quando usa Pager. AppShell, PageIndicator e
ToastHost importano già il proprio CSS. La webapp conserva il proprio ordine di caricamento.

La UI usa React e React DOM del consumatore e `mx-icons`, già presenti nel progetto; non
aggiunge dipendenze. Va mantenuta una sola copia di React e dei moduli canonici per evitare
provider o singleton separati. I componenti interattivi richiedono il DOM: sono destinati a
browser, WebView e renderer Electron. Le interfacce HTML senza React possono usare soltanto
il [design CSS](../design/README.md); le interfacce native richiedono un adattatore distinto.
Grid/Flex e gli elementi accessibili delle primitive hanno CSS condiviso e non richiedono
la generazione delle utility Tailwind del frontend.

## Confine applicativo

Tutto il codice riusabile estratto ha qui la propria fonte. PageShell, WidgetGrid, controller
di account/connessione Home Assistant e composizioni dei widget restano nel frontend perché
dipendono da modelli e comportamenti dell'applicazione. Compongono la UI comune e conservano
localmente i propri adattamenti e CSS specifici.

La condivisione snellisce l'organizzazione dei sorgenti e la manutenzione. Non garantisce un
bundle più piccolo: la dimensione dipende dai moduli importati e dalla build del consumatore.
Stato delle verifiche e limiti dell'intervento sono nel report U44; questa guida non indica
una nuova distribuzione pubblicata.
