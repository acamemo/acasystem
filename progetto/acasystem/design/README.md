# Design condiviso ACA

Questa cartella è la fonte comune del CSS della webapp, delle distribuzioni e delle nuove
interfacce HTML. Il default è **Vetro Bianco / Glass White** ([guida](themes/glass-white/README.md));
conserva gli ingressi Liquid Glass e ACA Classico con i materiali precedenti. Le copie
distribuite nei client si generano da qui e non si modificano separatamente.

## Ingressi

| File | Contenuto |
|---|---|
| `base.css` | Font locali, token ACA e Kit 2, reset HTML nel layer `base`, layout e utilità accessibili delle primitive |
| `index.css` | Ingresso comune di Vetro Bianco, usato da webapp, shell e anteprima HAOS |
| `themes/glass-white/index.css` | Tema corrente: vetro bianco su paesaggio locale, accento leggibile, composizione interna e movimento con fallback |
| `themes/liquid-glass/index.css` | Base conservata: Classico e strato di token/materiali ottici, con fallback opaco e controlli accessibili |
| `themes/classic/index.css` | Tema precedente conservato: base, materiali, tipografia, componenti ACA e skin neumorfica Kit 2, nello stesso ordine |
| `themes/acasystem/index.css` | Materiale ACA prima dell'applicazione della skin Kit 2 |
| `themes/kit2/components.css` | Componenti della galleria Kit 2, caricati soltanto dalla galleria |
| `components/toast.css`, `layout/` | CSS condiviso di toast, AppShell, PageIndicator, Pager e layout delle primitive; importabili separatamente |

ACA Classico mantiene lo stesso ordine dei fogli già usati dalla webapp: font, token ACA,
token Kit 2, reset, materiali, tipografia, componenti ACA, skin Kit 2 e wallpaper. Non copia
le definizioni e non introduce una nuova veste. La policy runtime non applica le preferenze
storiche di palette/wallpaper del profilo. Gli adattatori HTML usano il medesimo ingresso
e non hanno selettori di tema. La successiva richiesta Vetro Bianco sostituisce il look
predefinito con superfici bianche trasparenti, accento lavanda e fotografia locale statica;
non riattiva personalizzazioni globali. Promozione e banco: ADR-0043 e REP014 nella documentazione.

I fogli storici conservano le regole di tema chiaro/scuro, accenti e wallpaper per la compatibilità
con la galleria e i suoi campioni. Queste regole restano nel CSS distribuito: l'ingresso Classico
non dichiara una riduzione del bundle né la loro eliminazione. Il token `--aca-color-scheme`
resta ereditabile dagli adattatori nello Shadow DOM; il contratto non imposta la proprietà
globale `color-scheme`. Avatar e copertina dell'account, colori di errore, allarme e stato restano
indipendenti dalla palette dell'interfaccia.

Il CSS non richiede React o Tailwind. Le regole dei componenti usano il layer `components` e
le primitive esistenti `.aca-*`; il reset usa il layer `base`. Il markup dei materiali resta
quello di `MaterialLayers`: socket, `.aca-m__outer`, `.aca-m__face`, `.aca-m__content`. Le
primitive React che lo producono hanno la fonte comune in `ui/primitives`.

Per comporre nuovi controlli, usare le [primitive React](../ui/primitives/README.md)
oppure il [markup HTML delle shell](../../client/windows/shell/index.html), che contiene gli stessi
strati e stati. La sola classe sul tag, senza gli strati interni previsti, non riproduce il materiale.

## Uso in un'altra interfaccia HTML

Durante la preparazione delle risorse, importare `copyDesignAssets` da
[copy-assets.mjs](./copy-assets.mjs) e passare l'URL della cartella di destinazione. Per esempio,
da uno script collocato in `progetto/acasystem`, accanto alla cartella `design`:

```js
import { copyDesignAssets } from './design/copy-assets.mjs';

await copyDesignAssets(new URL('./dist/design-aca/', import.meta.url));
```

Nell'interfaccia importare il tema completo dalla copia generata:

```css
@import './design-aca/index.css';
```

La cartella di distribuzione include gli import CSS relativi e i font locali; non richiede
accesso ai sorgenti del workspace frontend durante l'avvio. Include anche `components/` e
`layout/`: il tema completo non importa automaticamente tutti questi stili. Ogni interfaccia
conserva accanto ai propri file il CSS delle composizioni specifiche e usa i materiali e i
layout condivisi dove applicabili.

## Copertura di popup, animazioni e layout

Con U44 anche la parte React riusabile ha una fonte comune in [ui](../ui/README.md): 45 moduli
delle primitive, popup, gestione di focus/Escape e scroll, movimento/presenza, toast, AppShell,
Pager e PageIndicator. Layout e navigazione ricevono contenuti e callback tramite slot e
proprietà; non importano account o Home Assistant. I percorsi frontend precedenti sono rimandi
agli stessi moduli e conservano l'identità di context e singleton.

Qui rimane il CSS: Sheet/SideSheet/Popover, materiali, token di durata/curve/livelli, movimento
ridotto e stili dei layout estratti. Grid/Flex hanno CSS autonomo senza richiedere Tailwind.
`ui/styles.css` è un ingresso completo facoltativo per un nuovo consumatore React; gli import
dei singoli moduli sono preferibili quando si compone solo una parte della UI. Il copier di
questa cartella distribuisce CSS/font, non il codice React.

PageShell, WidgetGrid e controller legati a configurazione, account o Home Assistant restano
nel frontend con le composizioni applicative. La fonte condivisa semplifica i sorgenti e la
manutenzione; non garantisce una riduzione del bundle, che dipende dagli import e dalla build.
Stato e verifiche U44: [REP-20261102-006](../../../documentazione/reports/REP-20261102-006-ui-movimento-layout-condivisi.md).

## Responsabilità

- Modificare qui font, token, materiali e aspetto dei controlli condivisi.
- Modificare in `ui/` componenti e comportamenti generici; preferire import dai loro sottopercorsi.
- Mantenere accanto a pagine, launcher e widget il CSS di composizione e i comportamenti applicativi.
- Usare i token `--aca-*` e `--k2-*` nei componenti specifici anziché replicare colori e ombre.
- Mantenere separati gli adattamenti della piattaforma e dello Shadow DOM dai valori comuni.
- Preservare gli originali di terze parti e le reference documentali.

I vecchi ingressi sotto `frontend/src/design` e `frontend/src/themes` sono rimandi di
compatibilità. Non contengono una seconda definizione del tema. La fonte resta dentro il
contesto `progetto/acasystem`, così la stessa struttura può essere inclusa nelle build Docker.

## Font e licenza

Inter 5.3.0 proviene dalla dipendenza già fissata `@fontsource/inter`: pesi normali 300, 400 e
500, sette sottoinsiemi per peso. I 21 WOFF2 e la licenza SIL OFL 1.1 sono in `fonts/`;
`fonts.css` mantiene gli URL relativi e gli intervalli Unicode originali. Non serve scaricare
font dalla rete all'avvio.

Il CSS definisce la presentazione. La console testuale di HAOS richiede un visualizzatore
distinto; questa condivisione non installa o avvia una schermata grafica sul sistema operativo.
