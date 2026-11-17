# Catalogo widget: gesti da tutte le pagine Home

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261109-005 |
| Stato | Completato localmente; banco .50 invariato |
| Data | 2026-11-09, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta di riferimento | «scorrimento dal basso verso l'alto da acasystem indipendentemente dalla pagina: compare l'interfaccia dei widget, se da quell'interfaccia c'è scorrimento inverso si ritorna sulle pagine». Chat corrente, screenshot della Home con celle libere e Tavano. |
| Autorizzazione | Completare il comportamento del catalogo già esistente sulle pagine Home. Nessuna pubblicazione o nuova installazione sul banco in questo incarico. |

## Obiettivo e perimetro

Swipe del dito verso l'alto da qualunque pagina del carosello Home, comprese Copertina, celle «+» e pagine speciali; catalogo a tutto schermo dal basso, Home in dissolvenza. Swipe verso il basso nel catalogo: ritorno alla stessa pagina, senza pulsanti aggiuntivi. Conservare navigazione orizzontale, comandi, scroll interni, editing e permessi.

L'apertura non aggiunge né salva dati. L'eventuale scelta da una pagina speciale usa una pagina widget valida già presente, senza scrivere configurazioni nella pagina speciale. Il blocco della disposizione mantiene la protezione esistente; Sistema, dettagli e moduli aperti non vengono intercettati. Non modificare l'aspetto, il protocollo di avvio, i widget o le API. Riferimenti: [REQ-32](../funzionalita/product.md), [ADR-0048](../decisions/ADR-0048-catalogo-widget-tendina.md), [brief](../design/componenti/catalogo-widget.md).

La fonte iniziale è quella verificata della build locale .50:1816file, SHA256 `9d6864d3496789eaabe43023a0e08cb58056fb488e1bd0ed0964bd768ef94a1b`. Il worktree contiene618voci preesistenti; il confronto usa il checkpoint ignorato `backup/rep062/`, senza ripristinare modifiche altrui. Banco .50, account e profili rimangono fuori dalle prove isolate.

## Criteri di completamento

- Apertura con touch nativo su pagina widget piena/vuota, Copertina e pagina speciale; nessun click o comando residuo dopo il gesto.
- Chiusura verso il basso e ritorno alla pagina di partenza; swipe orizzontale Home/catalogo e tap di scelta conservati.
- Controlli operativi, campi, scroll interni, long press, blocchi e schermate aperte mantengono il proprio comportamento.
- Apertura/chiusura senza scritture; eventuale aggiunta soltanto alla destinazione valida, verificata con dati sintetici.
- Test mirati, strict/build e prova browser touch isolata; hardware Android/iPhone reale distinto e non dichiarato collaudato.
- Diff limitato alla richiesta e documentazione aggiornata; nessuna dipendenza o tecnologia nuova.

## Avanzamento e modifiche

Diagnosi iniziale: il hook esclude le celle «+» e l'opener Casa3D come pulsanti; il comando di apertura riusa l'aggiunta alla pagina corrente e rifiuta i tipi speciali. Il touch nativo deve inoltre essere verificato prima che lo scroll del browser cancelli il PointerEvent. La chiusura del catalogo e la paginazione orizzontale sono già presenti e saranno verificate.

La prova nativa della catena completa ha confermato un ulteriore impedimento pertinente: passando da una pagina widget a una speciale, la misura del wrapper `display: contents` restituisce zero e rende la Home inerte. Il figlio visibile ha dimensioni positive. Per soddisfare «indipendentemente dalla pagina» occorre correggere questa misura, senza forzare uno stato pronto fittizio. Il checkpoint aggiuntivo di `PageShell.tsx` corrisponde alla fonte .50. Questa evidenza estende il caso già registrato come ISSUE-149; il problema non può restare escluso se blocca il gesto richiesto.

Implementati tre interventi: il hook Home riconosce il touch nativo, distingue gli assi e ammette esplicitamente celle libere/opener Casa3D; `LauncherScreen` separa consultazione e destinazione dell'aggiunta sulle speciali; `PageShell` misura e osserva il figlio con box reale. Nessuna modifica a BottomDrawer, materiali, durate o paginazione: la chiusura verso il basso resta la primitiva esistente. Il ramo Pointer di fallback non apre una seconda volta e il click residuo viene soppresso; comandi e contenuti realmente scorrevoli conservano i propri gesti.

Il catalogo mantiene la pagina di provenienza finché si consulta o annulla. Scegliere davvero un widget continua a usare il flusso di aggiunta già presente: sulla pagina corrente quando accetta widget, altrimenti sulla principale valida già esistente. Rimangono permessi, uso esclusivo e blocco della disposizione. Nessun nuovo pulsante o movimento di blur.

## Verifiche ed evidenze

| Controllo | Procedura | Esito | Limiti |
|---|---|---|---|
| Checkpoint | `node backup/rep062/checkpoint.mjs`: fonte .50 identica, copia11file pertinenti e stato Git | Superato |1816file/SHA9d6864d3; prima delle modifiche al codice |
| Regressioni gesture | `npm --prefix progetto/acasystem/frontend run test -- src/__tests__/HomeCatalogScroll.test.tsx src/__tests__/WidgetCatalogLauncher.test.tsx src/__tests__/PageShell.test.tsx src/__tests__/BottomDrawer.test.tsx src/__tests__/WidgetCatalogPager.test.tsx --reporter=json --outputFile=../../../backup/rep062/catalog-gesture-final-pass-tests.json` |42/42 superati | Touch/Pointer, click residuo, scroll, lock e destinazione; misura positiva/zero e ResizeObserver |
| Avvio e anteprime | `npm run test -w frontend -- src/__tests__/HomeStartup.test.tsx src/__tests__/HomeStartupAssets.test.tsx src/__tests__/HomeStartupGates.test.tsx src/__tests__/HomeStartupCatalog.test.tsx src/__tests__/WidgetCatalogPreview.test.tsx --reporter=json --outputFile=../../../backup/rep062/startup-adjacent-tests.json` da progetto/acasystem |52/52 superati | Suite mirate, non intera applicazione |
| Strict/build | `npm --prefix progetto/acasystem/frontend run typecheck:strict`; `npm run build -w frontend` da progetto/acasystem | Superato | Warning dei bundle grandi conservato; nessun refactor estraneo |
| UI e asset condivisi | `npm run test:ui`; `npm run test:design` da progetto/acasystem |3+6 superati | Primitive e distribuzione asset; nessuna dipendenza aggiornata |
| Browser touch | CDP nativo sul Launcher reale con catena completa e runtime sintetico |5/5 scenari principali e7/7 regressioni superati | Griglia «+», Copertina, speciale Luci, corpo passivo e scheda Luce; UP/DOWN e stessa pagina. Orizzontale Home/catalogo, comandi/tap, range, scroll interno/bordo, pinch, long press/drag/cancel conservati |
| Anteprima ordinaria | Browser privato su `http://127.0.0.1:4185/?screen=app#/mockup`, touch nativo sul corpo della Luce |1/1 superato | Apertura/chiusura sulla stessa pagina, entry/hash uguali al dist locale; nessuna API, WS, scrittura layout o comando. PNG apertura/ritorno visionati |
| Conservazione banco | `node backup/rep062/bank-unchanged.mjs` | Superato | ACA/HA/D1: stessi container, immagini, avvii e mount; nessuna operazione di aggiornamento |

## Controllo del diff e decisioni

Confronto finale con checkpoint e whitelist dei file interessati. L'estensione alle pagine speciali è esplicitamente richiesta dall'utente; la destinazione già valida conserva il modello esistente. La misura di `PageShell` è inclusa soltanto perché il negativo browser dimostra che impedisce il gesto su quelle pagine. La causa geometrica di ISSUE-149 è corretta localmente e verificata nel cambio widget→speciale; il collaudo browser completo di un profilo iniziale composto soltanto da speciali resta non eseguito. Stato del problema aggiornato senza attribuire questa correzione al banco .50.

`source-final-audit.json`:1816file, SHA256 `42e16a7777d01787b86bc03b7ea5c520ba35bb1b95aad4b4e3d0c4f824f2ba0c`; esattamente6delta (3produzione/3test), nessun file aggiunto/rimosso o estraneo. Manifesto e terminatori originali verificati; review indipendente senza blocker in `gesture-cross-review-final.json`. Il diff è confrontato col checkpoint, non con l'intero worktree storico.

Evidenze negative preservate: regressione PageShell prima del fix0/1, primo candidato41/42 per mock di coordinamento incompleto nel nuovo test di aggiunta. Corretto il mock, mantenute le asserzioni, poi42/42; produzione invariata tra i due giri. La prima lettura Git no-index suggeriva una conversione dei terminatori: il confronto dei byte e degli hash del checkpoint ha verificato invece che CRLF/LF originali sono conservati; usato un diff normalizzato soltanto per la lettura.

## Chiusura e punto di ripresa

Completato: gesto verso l'alto da tutte le pagine Home valide, inverso per il ritorno alla stessa pagina, navigazione orizzontale e interazioni protette.94test mirati,9UI/asset, strict/build e13scenari browser superati. Il campionamento RAF del ritorno e gli screenshot confermano la transizione esistente senza nuovi filtri o materiali. Le prove native riguardano input touch del browser automatizzato, non hardware Android/M11 o Safari/iPhone fisico.

Evidenze browser in `native-gesture-candidate.json`, `native-regressions-candidate.json`, `normal-preview-smoke.json`; negativi iniziali e correzioni dei soli selettori dei harness conservati e distinti dai difetti di prodotto. Alcuni PointerCancel successivi all'apertura sono compatibili con la disattivazione della Home; non è dichiarata assenza totale di PointerCancel. Browser e server del fixture privato chiusi; l'anteprima ordinaria4185 resta disponibile per l'utente. Banco .50/account/profili/HA/D1 e pubblica .34 invariati, nessun commit o push.

Nessun incarico software residuo implicito. Aggiornamento del banco e prova su dispositivo fisico rimangono operazioni distinte.

Sigillo finale `backup/rep062/final-validation.json` superato: fonte corrente uguale al manifesto,94test/9UI e13scenari browser,9documenti/1206collegamenti locali validi, nessun nuovo whitespace. La riga storica con spazio finale in product.md è identica a HEAD e conservata. Verificati arresto della porta privata53555, disponibilità e entry esatta dell'anteprima4185 e conservazione del banco.
