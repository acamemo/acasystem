# Usare il design ACA condiviso

Aggiornato: 2026-11-02, U44. [Decisione CSS U42](../../decisions/ADR-0032-design-condiviso-workspaces.md), [risultati U42](../../reports/REP-20261102-005-design-aca-condiviso-workspaces.md), [intervento UI U44](../../reports/REP-20261102-006-ui-movimento-layout-condivisi.md).

## Fonte e responsabilità

Il CSS ha la fonte unica in [progetto/acasystem/design](../../../progetto/acasystem/design/README.md). Contiene font Inter e licenza, token, reset, materiali, tipografia, componenti e skin neumorfica Kit2 già usati dalla webapp, oltre agli stili dei layout estratti. `index.css` è l'ingresso del tema completo; `base.css` include font/token/reset e il CSS di base delle primitive. I colori e le ombre si modificano qui, poi entrano nelle nuove build dei consumatori.

Con U44 la fonte dei componenti React riusabili è [progetto/acasystem/ui](../../../progetto/acasystem/ui/README.md): 45 moduli delle primitive, popup e focus/scroll, animazioni e presenza, toast, layout AppShell e navigazione Pager/PageIndicator. I vecchi percorsi frontend riesportano gli stessi moduli e mantengono un'unica istanza di provider, context e singleton. Slot, proprietà e callback consentono il riuso senza importare account o Home Assistant.

| Consumatore | Come usa la fonte |
|---|---|
| Webapp e launcher applicativo | Gli import frontend storici sono shim verso design/ e ui/; nel frontend restano composizioni, controller e CSS applicativi |
| Windows Electron | Il build genera shell/design-aca e il launcher HTML usa le classi e MaterialLayers reali della webapp |
| Android Capacitor | Lo stesso copier genera www/design-aca; usa gli stessi materiali e il CSS di composizione della shell |
| Casa 3D Lit | I token ereditano attraverso lo Shadow DOM tramite override; scena/Three.js e controlli piatti del canvas restano separati |
| Nuove interfacce React in browser/WebView/Electron | Usare i sottopercorsi di ui/ con React, React DOM e mx-icons esistenti; ui/styles.css è l'ingresso CSS completo facoltativo |
| Future interfacce HTML | Importare index.css o generare design-aca con copyDesignAssets; usare il markup delle primitive, senza duplicarne la grafica o richiedere React |

Le copie dentro shell/design-aca, www e build Android sono generate. I CSS dei layout riusabili sono condivisi; impaginazioni e singoli widget conservano il proprio CSS di composizione. PageShell, WidgetGrid e controller di account/configurazione/Home Assistant restano nel frontend per le loro dipendenze applicative e compongono le primitive comuni. La UI richiede un renderer web e non crea una finestra nella console HAOS.

Per una nuova interfaccia React preferire gli import dai sottopercorsi dei moduli richiesti. `ui/styles.css` raccoglie il tema e gli stili UI estratti, mentre `ui/pager.css` consente di includere separatamente lo stile del Pager. Il copier design distribuisce CSS/font; non distribuisce React. La condivisione semplifica sorgenti e manutenzione, ma non garantisce un bundle più piccolo: questo dipende dai moduli effettivamente importati e dalla build.

## Materiali locali U42 da provare

**Verifiche U44:** UI strict autonoma e frontend, controlli di confine/identità, regressioni popup/motion/layout e lint superati. Banco Electron indipendente senza frontend/Tailwind/API: popup annidati, focus/Escape/Indietro, scroll e toast verificati; quattro PNG webapp prima/dopo identici. Sorgenti frontend di produzione ridotti di8301righe trasferite alle fonti comuni; totale bundle JS+CSS gzip772157→772169byte (+12, praticamente invariato). Build frontend/Casa3D/client web e Docker riuscite; immagine locale aca-system:ui-shared-local. I pacchetti nativi U42 sotto non sono stati ricompilati per U44. Dettagli, comandi e limiti nel [report006](../../reports/REP-20261102-006-ui-movimento-layout-condivisi.md).

| Materiale | Percorso |
|---|---|
| Windows portabile | [Acasystem-design-condiviso-win-x64.zip](../../../progetto/client/windows/release/design-condiviso-20261102/Acasystem-design-condiviso-win-x64.zip), estrarre tutto e aprire Acasystem.exe |
| Android debug | [app-debug.apk](../../../progetto/client/android/android/app/build/outputs/apk/debug/app-debug.apk), compilato senza installazione su dispositivo |
| Webapp/Casa 3D | Build locali nelle rispettive dist; immagine Docker di verifica aca-system:design-shared-local |

La release pubblica 0.9.33 e il bootstrap r2 non sono stati aggiornati da questo lavoro. ZIP Windows precedenti sono conservati; l'APK precedente è in backup/rep015. Nessuna installazione, pubblicazione o avvio VM eseguiti per U42.

## Verifiche U42 e limiti

Quattro schermate della webapp prima/dopo (due temi e due dimensioni) hanno PNG e stili effettivi identici. Windows/Android hanno 24 confronti fra materiali delle shell e Button/Field/Surface React reali; font locali, focus/click, assenza overflow e smoke IP verificati. Casa 3D ha test del bridge e 30 confronti browser con Lit/Shadow DOM reali su tre combinazioni tema/accento, senza caricare il viewer WebGL.

Build frontend, Casa 3D, Windows, Android/APK e Docker riuscite. In ZIP e APK i 37 asset CSS/font coincidono per SHA con la fonte. Restano il collaudo su Android/iPhone fisici e quello complessivo della scena 3D su hardware: queste prove host non li sostituiscono. Dettagli e hash nel report.

Questi risultati e artefatti riguardano U42. Stato, verifiche e limiti dell'estrazione React U44 sono registrati nel report REP-20261102-006; non implicano l'aggiornamento o la pubblicazione delle distribuzioni elencate.
