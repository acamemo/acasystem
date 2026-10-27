# REP-20261023-006 — Coreografia delle animazioni del launcher (proposta per la 0.9.28)

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261023-006. Coreografia delle animazioni del launcher: un documento di progetto, senza codice. È il passo «coreografia» della 0.9.28. |
| Stato | **Completato come proposta. In attesa di input:** l'utente deve approvare o correggere i comportamenti visibili elencati in «Comportamenti visibili da approvare» (D-M1…D-M25, dopo la critica del 2026-10-23). Questo documento non autorizza alcuna realizzazione. **Annotazione del 2026-10-23 (più tardi):** l'utente ha risposto a D-M1…D-M25 (vedi «Risposte dell'utente (2026-10-23)») e il **blocco 1** (pressione e vista pagine) è realizzato nel working tree, senza commit e senza misure sul tablet (vedi «Blocco 1 della realizzazione»); i blocchi dei fogli e di Sistema, dei widget e delle pillole/avvisi non sono ancora fatti. **Annotazione del 2026-10-23 (ancora più tardi):** il **blocco 2** (fogli, Sistema, pillole e avvisi: D-M5, D-M12, D-M19, D-M14) è realizzato nel working tree, senza commit e senza misure (vedi «Blocco 2 della realizzazione»); restano i widget. **Annotazione del 2026-10-23 (infine):** il **blocco 3** (widget: sagoma del ridimensionamento, caselle «+», volo nella casella, rimozione e ripristino, widget aggiunto, ombre: D-M6…D-M11, D-M17, D-M22, D-M23) è realizzato nel working tree, senza commit e senza misure (vedi «Blocco 3 della realizzazione»); con i tre blocchi tutte le voci approvate hanno una realizzazione, restano le misure sul tablet e la prova col dito. **Annotazione del 2026-10-23 (sera):** misurata sul Tab M11 contro la 0.9.27 (vedi «Esito della 0.9.28»): raggiunti A8, A12 (trasformazioni) e A11, A7 solo sul «+», A10 in parte; **non raggiunti A1-A6, A9, A13; lo scorrimento è peggiore della 0.9.26 e di parte della 0.9.27**. Il banco non è stato aggiornato (resta 0.9.27); serve una decisione dell'utente. |
| Data | 2026-10-23 (Europe/Rome). |
| Autore / modello | Claude Code, subagente di un flusso di lavoro. Modello: claude-opus-5-5. |
| Commit di partenza | `7298d4df0d33bc92123517776d9ebc7c12ecefa6` (master). Il working tree contiene le modifiche non committate fino alla 0.9.27 e il lavoro in corso sulla 0.9.28 (punti 1 e 2), fatto da altri passi dello stesso flusso. |
| Richiesta di riferimento | Richiesta dell'utente del 2026-10-23, dopo la 0.9.27 sul banco: «procedi con la 0.9.28 con i punti 1 e 2, ciò che non va è che se clicco su un + al posto di farmi l'animazione sul + mi fa l'animazione di hold sulla pagina per il tempo del click prima di aprire i widget, poi questa animazione è presente ad ogni click che si inizia a diminuire la grandezza come per modificare la pagina, ci deve essere un counter che rileva la pressione e dopo che è arrivato al punto di trigger di tempo per una pressione sostenuta si attiva l'animazione che fa diminuire la grandezza della pagina e va in modifica della pagina, poi come hai notato tu il calo di prestazioni e le animazioni vanno definite meglio il pre, durante e post di un animazione con i vari fade e move durante le interazioni, per avere un risultato smooth, ad esempio per la pagina l'animazione che fa scomparire le caselle serve appunto per non avere elementi caricati che diano disturbo durante l'animazione, ricordati che ci devono essere molte animazioni ma temporizzate per non creare scatti visivi di dimensione il tutto per far godere gli occhi e giustificare eventuali ottimizzazioni, quindi va controllato anche questo oltre i punti indicati e devi misurare le animazioni. Reworkerei anche la comparsa delle icone durante l'ingrandimento di un widget e se può favorire le prestazioni al posto di mostrare il widget che cambia durante l'animazione mostrare tipo una preview senza il contenuto del widget così non dobbiamo curare l'aspetto di ogni widget durante l'animazione, meno lavoro per la gpu, poi programmerei un lavoro per realizzare le varie versioni di ogni widget per grandezza 1x1, 1x2, 2x1 ecc, non so se hai capito la mia intenzione di tutto il messaggio». I punti 1 e 2 sono quelli del resoconto della 0.9.27: (1) la regressione dello scorrimento durante il gesto; (2) la pila vuota di Multimedia. |
| Autorizzazione | La richiesta autorizza la 0.9.28 con i punti 1 e 2. Chiede inoltre: il contatore della pressione; animazioni definite meglio prima, durante e dopo; la loro misura; la revisione della comparsa delle icone durante l'ingrandimento di un widget, con un'anteprima senza contenuto «se può favorire le prestazioni». Il lavoro sulle versioni dei widget per dimensione è indicato come da programmare in seguito. **A questo passo spetta solo il documento della coreografia:** lettura delle misure e del codice, senza codice, browser né tablet. Due punti della coreografia sono decisioni umane esplicite: (a) nessun rimpicciolimento della pagina durante il conteggio della pressione; (b) l'anteprima senza contenuto nel ridimensionamento, da tenere solo se la misura conferma il beneficio. Tutto il resto è proposta dell'agente. |

## Obiettivo e perimetro

**Risultato richiesto.** Una coreografia scritta per ogni interazione principale del launcher. Per ciascuna una tabella PRIMA / DURANTE / DOPO con:

- elementi che sfumano;
- elementi che si muovono;
- elementi nascosti per alleggerire;
- ordine e sfasamento dei tempi;
- curve e proprietà animate;
- comportamento se l'utente interrompe;
- movimento ridotto.

Per il ridimensionamento serve la proposta della **sagoma**, cioè un'anteprima senza contenuto. Il documento comprende inoltre:

- obiettivi misurabili sul Tab M11 e il metodo per misurarli con gli strumenti esistenti;
- l'elenco separato dei comportamenti visibili da approvare;
- la relazione con il lavoro futuro delle versioni dei widget per dimensione.

**Dentro il perimetro:** questo file e una riga nell'indice dei report.

**Fuori dal perimetro:**

- **Codice:** il codice dell'app e ogni realizzazione, compresi il contatore della pressione e la sagoma. Il contatore è trattato in un altro passo della 0.9.28: qui se ne descrive solo la coreografia.
- **Misure nuove:** nessun browser e nessun tablet in questa parte.
- **Punti 1 e 2 della 0.9.28:** la correzione della regressione dello scorrimento e la pila vuota di Multimedia. Sono altri passi dello stesso flusso.
- **Versioni dei widget:** la pianificazione delle versioni per dimensione.
- **Il resto:** commit, dipendenze, deploy.

**Vincoli rispettati dalla proposta:**

| Fonte | Vincolo |
|---|---|
| [ADR-0011](../decisions/ADR-0011-kit2-base-grafica.md) | Il materiale Kit 2 resta invariato: colori, ombre e raggi a riposo. La coreografia cambia tempi, ordine e ciò che si vede durante il movimento. Dove tocca l'aspetto durante un gesto, lo dice (D-M7). |
| [ADR-0004](../decisions/ADR-0004-principi-frontend.md) | La sagoma si costruisce sulla cornice comune del widget, non dentro ogni widget. |
| [ADR-0012](../decisions/ADR-0012-pageshell.md) | PageShell resta senza geometria. |
| [ADR-0016](../decisions/ADR-0016-schermo-intero-interazioni.md) | Gesti, soglie e barre restano come sono, salvo il contatore chiesto dall'utente. |
| [ADR-0018](../decisions/ADR-0018-pagine-fuori-vista.md) | Finestra delle pagine disegnate e condizione «nessuna scheda vuota nell'uso normale». La proposta D-M15 la contraddirebbe ed è quindi sconsigliata. |
| [design.md](../design/design.md) | Movimento ridotto. |
| [REP-20261023-005](REP-20261023-005-informativa-sviluppo-ai.md) | L'informativa sull'AI non è toccata. |

**Modifiche preesistenti.** Il working tree contiene il lavoro non committato fino alla 0.9.27 e i passi in corso della 0.9.28; nella cartella `backup/v0928/pre/` c'è anche `scorrimento/` di un altro passo. Questo incarico aggiunge solo:

- il file `documentazione/reports/REP-20261023-006-coreografia-animazioni.md`;
- una riga nell'indice `documentazione/reports/README.md`, con copia PRIMA in `backup/v0928/pre/coreografia/reports-README.md` (SHA-256 `b48269db…7e8ffa`, uguale al file prima della modifica).

Il codice è stato solo letto. I riferimenti alle righe valgono per i file come erano letti il 2026-10-23 durante questo passo: altri passi della 0.9.28 possono cambiarli.

## Criteri di completamento

- Una tabella PRIMA / DURANTE / DOPO per ognuna delle interazioni richieste:
  - pressione lunga verso la vista pagine e ritorno;
  - tocco su una scheda e «Fine»;
  - tocco sul «+»;
  - pressione lunga sul widget, sollevamento, trascinamento, rilascio e «Annulla»;
  - ridimensionamento;
  - cambio pagina, con scorrimento e salto diretto;
  - fogli;
  - Sistema;
  - widget aggiunto;
  - barre;
  - pillole e avvisi.
- La sagoma per il ridimensionamento, con il modo di costruirla senza curare ogni widget.
- Obiettivi misurabili sul Tab M11 a 90 Hz:
  - fotogrammi oltre 22 ms e oltre 50 ms;
  - durata dei blocchi;
  - nessun salto di dimensione;
  - nessun elemento che compare già al posto finale.

  Per ognuno, il metodo di misura con gli strumenti esistenti.
- Elenco separato dei comportamenti visibili da approvare, con la proposta per ciascuno.
- Relazione con le versioni dei widget per dimensione, senza pianificarle.
- Distinzione dichiarata tra misure, letture del codice e valutazioni.
- Indice dei report aggiornato; nessun commit; nessun codice.

## Fonti

- **Collaudo delle animazioni sulla 0.9.25:** [REP-20261022-001](REP-20261022-001-collaudo-animazioni.md). Scenari S1-S8 sul Tab M11 e a misura di telefono, esiti F-01…F-16 e T-01…T-11. Strumenti in `backup/animazioni-0.9.25/strumenti/`.
- **Piano di ISSUE-109 e misura finale Z sulla 0.9.27:** [REP-20261022-002](REP-20261022-002-piano-blocchi-thread.md), con la diagnosi, gli obiettivi O1-O6, l'annotazione «Tappa Z» e l'«Esito del blocco». Dati in `backup/issue-109/Z/`: `tabella-ab.md`, `tabella-o34.md` e gli strumenti in `Z/strumenti/`.
- **[ADR-0018](../decisions/ADR-0018-pagine-fuori-vista.md):** livello 1 in uso, stato finale del 2026-10-23.
- **[design.md](../design/design.md):** sezioni «PageShell, pressione, vista pagine e nuvoletta», «Animazioni su livelli», «Barra unica in basso» e le annotazioni del 2026-10-21 e del 2026-10-23.
- **Codice, in sola lettura, nella cartella `progetto/acasystem/frontend/src/`:**
  - `templates/launcher/`: `launcher.css`, `Pager.tsx`, `LauncherScreen.tsx`, `DragGhost.tsx`, `WidgetGrid.tsx`, `FlashingPageIndicator.tsx`;
  - `components/system/edit/`: `edit.css`, `ResizeHandle.tsx`;
  - `hooks/launcher/`: `useLongPress.ts`, `gestures.ts`, `useWidgetDrag.ts`;
  - `pages/launcher/LauncherPage.tsx`;
  - fogli e avvisi: `themes/acasystem/components.css` (fogli), `templates/app-shell/appShell.css`, `components/system/page-indicator/pageIndicator.css`, `components/system/status-bar/statusBar.css`, `components/system/toast/toast.css`.
- **Principi di movimento:** continuità, interrompibilità, sfasamento breve, durata secondo la distanza, uscite più rapide delle entrate. Sono quelli indicati dall'incarico e diffusi nelle linee guida di movimento delle piattaforme mobili, per esempio Material Design e Apple Human Interface Guidelines. **Non sono stati riletti oggi su una fonte primaria:** i numeri scelti in questo documento sono **valutazioni dell'agente**, da confermare con la misura e a vista. Per il movimento ridotto il riferimento resta quello già citato in `design.md`: WCAG 2.2, criterio 2.3.3, consultato il 2026-10-05.

## Punto di partenza: cosa dicono le misure

Tutte le misure sono state prese sul Tab M11 (Chrome, 1280×665 a DPR 1,5, schermo a 90 Hz) con gesti sintetici. Non è stato usato il dito.

| Fatto misurato | Numeri | Fonte |
|---|---|---|
| Le transizioni dei cambi di stato perdono quasi tutti i fotogrammi | 3-6 fotogrammi su 25-50 attesi (0.9.25) | REP-20261022-001; REP-20261022-002, «Diagnosi» |
| Il blocco cade sul cambio di stato, anche nella 0.9.27 | Blocchi massimi in Z (mediana):<br>• alla pressione che apre la vista pagine 117;<br>• «Fine» 171;<br>• tocco su una scheda 177;<br>• sollevamento, rilascio e «Annulla» 203 (rilascio 120, «Annulla» 102);<br>• ridimensionamento 164 (ingrandire 120, ridurre 125);<br>• fogli 164-182;<br>• ritorno da Sistema 149 ms | REP-20261022-002, «Tappa Z» |
| Anche senza blocchi, ogni fotogramma di animazione costa | 5-18 ms di PrePaint e Paint contro un budget di 11,1 ms a 90 Hz (O2 non coperto) | REP-20261022-002, «Diagnosi» |
| Lo scorrimento durante il gesto è peggiorato nella 0.9.27 | Primo lancio 35 contro 60 fps; blocchi di 55-80 ms contro 0; pallino accanto 108 ms contro 0. Nei 500 ms dopo l'atterraggio nessuna differenza | REP-20261022-002, «Tappa Z» (punto 1 della 0.9.28) |
| I fogli scorrono bene ma partono tardi | Animazione di 240 ms senza salti; il foglio si vede 361-380 ms dopo il tocco (F-09) | REP-20261022-001 |
| Le celle «+» tornano tardi dopo la chiusura della vista pagine | 92 [91-146] ms dopo l'ultimo `transitionend` (O4 non raggiunto) | REP-20261022-002, «Tappa Z» |
| Salti di dimensione e cambi senza transizione | • ridimensionamento: larghezza da 257 a 410 px in 1-2 fotogrammi (S3b);<br>• ingranaggio da 1 a 0,5 di colpo (F-11);<br>• etichetta dell'indicatore che salta di larghezza (F-12);<br>• widget rimosso o ripristinato senza transizione (F-13);<br>• contenuto di «Impostazioni del widget» svuotato nel primo fotogramma della chiusura (T-04) | REP-20261022-001 |
| Layout-shift nelle scene | • ritorno da Sistema 0,29-0,34;<br>• frecce della vista pagine 0,24-0,37;<br>• chiusura del foglio 0,02-0,06 | REP-20261022-001 |
| Movimento ridotto | Solo dissolvenze di 120 ms, ma **i blocchi restano** (picchi di 245-300 ms) | REP-20261022-001, S8 |

**Lettura (valutazione dell'agente).** Il difetto principale non sono le curve né le durate scelte. Pesano due cose:

1. Il lavoro sul thread principale cade **dentro** l'animazione: commit di React, ricalcolo dello stile, `showModal()`, sblocco di pagine e rimisure.
2. Diversi elementi cambiano **senza transizione** o con un salto di dimensione.

La coreografia quindi non chiede solo «più animazioni». Assegna a ogni fase che cosa può costare e che cosa deve sparire prima del movimento. Così molte animazioni possono convivere senza scatti, come chiede l'utente, e le ottimizzazioni (sagoma, caselle nascoste, pagine saltate) diventano parte visibile e giustificata del disegno.

## Cosa fa oggi il codice (inventario in sola lettura)

| Elemento | Proprietà, durata e curva | Ritardo | Fonte |
|---|---|---|---|
| Pagina premuta sul vuoto | `scale` da 1 a 0,9, lineare in 440 ms; ombra della scheda (`::after`) in 240 ms ease-out | 60 ms (`--aca-hold-delay`); scatto a 500 ms (`LONG_PRESS_MS`), tolleranza 14 px | `launcher.css:417-429`; `gestures.ts:9-11` |
| Chi la attiva | `onPressChange` mette la pagina in `is-pressing` per **qualsiasi** bersaglio che non sia un widget, quindi anche una cella «+». È la causa del difetto descritto dall'utente (lettura del codice). | — | `LauncherScreen.tsx:1115-1118`, `:1906` |
| Scheda tenuta nella vista pagine | La stessa pista progressiva. Da sollevata: `scale` 150 ms, poi un'oscillazione di 300 ms | 60 ms; oscillazione dopo 150 ms | `launcher.css:324-338` |
| Vista pagine, apertura e chiusura | `translate`, `scale` e `opacity` in 360 ms, `cubic-bezier(0.23, 1, 0.32, 1)`; ombra della scheda 360 ms. Angolo: per tutta la vista pagine il raggio è compensato (`calc(raggio / k)`, `:245`); **nella chiusura il corpo diventa quadrato all'istante** (`border-radius: 0`, `:277`, «Square at once», REP-20261012-003), così il raggio non cresce con la scheda | — | `launcher.css:192-193`, `:219-284`; `Pager.tsx:110` |
| Comandi sotto le schede | `opacity` in 180 ms | 180 ms | `launcher.css:392-396` |
| Celle vuote nella vista pagine | Uscita: `opacity` a 0 in 180 ms ease-out durante vista pagine, chiusura e assestamento. Ritorno: strato a 1 in 240 ms, `cubic-bezier(0.22, 1, 0.36, 1)`, un fotogramma dopo la fine della chiusura (R8) | — | `launcher.css:290-298`, `:733-741`; `Pager.tsx:681-693` |
| Chiusura della vista pagine | Orologio dal primo `transitionrun` (410 ms) con tetto di 1080 ms (R1) | — | `Pager.tsx:117-118`, `:634-667` |
| Widget che cambia cella | `translate`, `width` e `height` in 240 ms, `cubic-bezier(0.77, 0, 0.175, 1)`; `scale` e **`box-shadow`** in 120 ms (`:537`); ritorno di `box-shadow` in `--aca-release` (220 ms, `:565`, `:571`) | — | `launcher.css:530-538`, `:560-572` |
| Ridimensionamento | **Dal vivo:** `width`, `height` e `translate` in 120 ms ease-out. Il contenuto del widget segue la misura a ogni cella (REP-20261007-027). | — | `launcher.css:543-549`; `WidgetGrid.tsx:432-435`; `DragGhost.tsx:28` |
| Atterraggio | Nessuna transizione (`is-landing`): la copia sparisce e il widget è già al suo posto | — | `launcher.css:551-553` |
| Copia sollevata | Nasce a 0,9 (`@starting-style`, `:987-989`) e **sale a 1,04** in 150 ms (`:841-848`), con **`box-shadow` animato** da `none` (150 ms, `:847`, `:989`); poi oscilla di ±0,9° (300 ms, senza fine). Sopra «Rimuovi» scala e opacità vanno a 0,6 in 150 ms. **In uso** il sollevamento passa `lifted: true` e il widget non si rimpicciolisce prima: la copia parte da 0,9 sopra un widget a 1, quindi c'è un salto di dimensione (lettura del codice, non misurato). | oscillazione dopo 150 ms | `launcher.css:841-857`, `:984-1000`; `LauncherScreen.tsx:1098-1111` |
| Glifo «+» | `scale` 0,94 con `:active`, in 180 ms | — | `launcher.css:765-783` |
| Selezione del widget | Pallini: `opacity` e `scale` da 0,5 in 160 ms. Anello: nessuna transizione | — | `edit.css:79-98`; `launcher.css:595-603` |
| Barre in basso (widget, vista pagine) | Entrata: `transform` 360 ms ease-out più `opacity` 240 ms. Uscita: 240 e 200 ms ease-in | 180 ms per la barra che arriva in uno scambio (220 ms per il gruppo «Pagine») | `edit.css:173-220`, `:431-496` |
| Indicatore in alto | Discesa 360 e 240 ms; salita 240 e 200 ms ease-in. In uso compare **subito** a ogni cambio di pagina e resta circa 2 s (`usePageFlash`). Pallina in 220 ms. Nella vista pagine cede il posto alla pillola «Annulla» con l'attributo `hidden` (`yieldToUndo`), cioè senza transizione | — | `pageIndicator.css:91`, `:163-177`; `FlashingPageIndicator.tsx:36`, `:43` |
| Fogli | `transform` 240 ms, `cubic-bezier(0.25, 1, 0.5, 1)`; sfondo 240 ms ease-out. Apertura e chiusura uguali | — | `themes/acasystem/components.css:651-693` |
| Pillola «Annulla» | `transform` 300 ms ease-out e `opacity` 200 ms, uguali in entrata e in uscita | — | `edit.css:864-925` |
| Avviso (toast) | Entrata in 200 ms; uscita senza animazione | — | `toast.css:15-32` |
| Nuvoletta UI-010 | 300 ms con curva elastica (design dell'utente) | — | `edit.css:701-737` |
| Ingranaggio inerte, avviso di connessione | Nessuna transizione | — | `appShell.css:172-174`, `:205-240` |
| Sistema | Il launcher è nascosto con `hidden` (display: none) e i suoi widget si fermano tramite `PageVisibilityContext`; Sistema è **montato al tocco** (`{overlay && …}`); il cambio è istantaneo | — | `LauncherPage.tsx:158-159`, `:182` |
| Movimento ridotto | Dissolvenze di 120 ms lineari; né scala né traslazioni | — | `launcher.css:430-459`, `:1007-1031`; `edit.css`; `statusBar.css` |

## Principi della coreografia

*Tutti i numeri di questa sezione e delle tabelle che seguono sono proposte e valutazioni dell'agente, salvo dove una riga dice «come oggi».*

**P1. Tre fasi per ogni interazione.**

- **PRIMA: preparazione, al massimo un paio di fotogrammi.**
  - **Il costo prima del movimento.** Il cambio di stato costoso cade **prima** del primo fotogramma del movimento: commit di React, classi in alto nell'albero, `showModal()`. Intanto il dito ha già un riscontro locale ed economico sull'elemento toccato.
  - **Si nasconde ciò che disturberebbe.** Esce quello che non deve muoversi o che cambierebbe forma: caselle vuote, contenuto dei widget che cambiano misura, contenuto che un foglio non ha ancora pronto.
  - **Le misure si fissano qui.**
  - **Meccanismo in due tempi (vincolante per ogni scena).** Un ritardo CSS non basta a far partire il movimento «dopo il blocco»: le transizioni nascono nello stesso ricalcolo di stile del commit, e un blocco di 117-207 ms (Tappa Z) ne consuma i ritardi e i primi fotogrammi. Quindi:
    1. **commit dello stato** senza le classi di movimento: gli elementi che entrano sono già montati al loro valore iniziale (per esempio `opacity: 0`), quelli che escono restano fermi;
    2. **classe di scena** (per esempio `is-scene`) aggiunta in un rAF doppio dopo il commit, cioè quando il primo fotogramma dopo il blocco è stato disegnato;
    3. **T0 della scena** = quel primo fotogramma. Tutti gli sfasamenti delle tabelle partono da qui.
  - **Proprietà costose da togliere dalle transizioni.** Oggi si anima `box-shadow` su: copia sollevata (150 ms, `launcher.css:847`, da `none` a `:989`), widget che cambia cella (120 ms, `:537`) e suo ritorno (220 ms, `:565`, `:571`). REP-20261012-003 indica nel raster delle ombre il costo GPU principale sul Tab M11, e `launcher.css:339` usa già il metodo «forma che sfuma, non box-shadow» per la scheda sollevata. **Proposta:** per copia, widget e volo l'ombra diventa uno pseudo-elemento con l'ombra a riposo e si anima solo la sua `opacity` (D-M17). La forma a riposo resta quella di Kit 2.
- **DURANTE: il volo.**
  - **Solo trasformazioni e opacità.** Si animano solo `transform` (cioè `translate`, `scale`, `rotate`) e `opacity`, su elementi che hanno già un livello.
  - **Niente lavoro sul thread principale.** Nessun commit di React, nessuna lettura del layout, nessuno sblocco di pagine (`data-far`) e nessun ResizeObserver che fa `setState`.
  - **Eccezione dichiarata:** la sagoma del ridimensionamento (vedi la scheda 5).
- **DOPO: l'assestamento.**
  - Il contenuto vero ricompare con una dissolvenza breve.
  - Si tolgono gli aiuti temporanei.
  - Il fuoco si sposta al secondo fotogramma, come in R7.
  - I lavori rimandati vanno in un momento di quiete.
  - **Fine scena con segnale composto.** Una scena finisce al primo di: `transitionend` o `transitioncancel` **della proprietà attesa** sull'elemento atteso; oppure un tetto a tempo (durata + ritardo + 2 fotogrammi, come R1). Durata 0 (movimento ridotto senza transizione), misura invariata e pagina in background non producono eventi: in questi casi la fine è immediata o arriva dal tetto. Nessuno stato resta in attesa di un evento che può non arrivare.

**P2. Durata secondo la distanza e il ruolo.** Un elemento piccolo che appare o sparisce sul posto è breve; una scena che muove tutto lo schermo è più lunga. Valori proposti:

| Ruolo | Oggi | Proposta |
|---|---|---|
| Riscontro della pressione | 120 ms (`--aca-press`); glifo «+» 180 ms | 120 ms in ingresso; il ritorno resta 180-220 ms, come oggi |
| Uscita di elementi piccoli: pillole, glifi, contenuto, comandi | 200-300 ms | 120-160 ms ease-in |
| Entrata di elementi piccoli | 160-300 ms | 160-240 ms ease-out |
| Barre in basso e indicatore, distanza di circa una barra | 360 ms in entrata, 240 ms in uscita | Invariato |
| Fogli, distanza di circa l'altezza dello schermo | 240 ms in entrata e in uscita | 280 ms in entrata, 200 ms in uscita |
| Scena della pagina (vista pagine) | 360 ms | Invariato |
| Widget che cambia cella | 240 ms ease-in-out | Invariato |
| Sfasamento tra gruppi | 180-220 ms, solo nello scambio delle barre | Da 20 a 60 ms tra gruppi della stessa scena. Si tiene 180 ms solo dove due elementi con lo stesso ruolo non devono coesistere (due «Fine») |

**P3. Le uscite sono più rapide delle entrate,** circa due terzi del tempo, con una curva che accelera (ease-in). Le entrate e le scene usano `--aca-ease-out` (`cubic-bezier(0.23, 1, 0.32, 1)`). Gli spostamenti sul posto usano `--aca-ease-in-out` (`cubic-bezier(0.77, 0, 0.175, 1)`). La curva lineare serve solo per l'opacità nel movimento ridotto.

**P4. Sfasamento breve e scene corte.**

- Al massimo tre o quattro gruppi per scena, distanziati di 20-60 ms.
- Una scena completa resta entro circa 550 ms dal suo T0 (primo fotogramma dopo il blocco, P1). Il blocco che precede T0 non è movimento e si misura a parte (A2).
- Molte animazioni, ma ognuna con il suo momento: niente che parte insieme a tutto il resto né lunghe cascate.
- **Eccezioni dichiarate:**
  - **uscita di ciò che disturba prima del movimento:** le caselle della scheda 1 escono in 100 ms e la scala parte a +80, uno stacco di 80 ms. È l'ordine chiesto dall'utente («non avere elementi caricati che diano disturbo durante l'animazione»);
  - **scene in sequenza:** quando una scena deve finire prima che la successiva cominci (foglio che scende, poi widget che entra: scheda 9), sono due scene, ciascuna entro i 550 ms, legate da una sovrapposizione di 40 ms; il totale si dichiara come cambio visibile;
  - **due elementi con lo stesso ruolo** (due «Fine»): 180 ms, come oggi (P2).

**P5. Continuità.**

- Nessun elemento cambia dimensione di colpo.
- Nessun elemento compare o sparisce al suo posto finale senza almeno qualche fotogramma intermedio.
- Un elemento che passa di mano cambia mano allo stesso valore di scala e di posizione. Vale per il widget che diventa copia e per la scheda che diventa pagina.

**P6. Interrompibilità.**

- Gli stati usano transizioni CSS, che ripartono dal valore corrente, e non animazioni a fotogrammi fissi.
- Ogni fase ha un'uscita definita se l'utente cambia idea.
- Nessun timer taglia una transizione (R1).

**P7. Alleggerire per la durata della scena.**

- Le caselle vuote stanno fuori durante le scene della pagina.
- Una sagoma sostituisce il contenuto che cambierebbe forma.
- Le pagine fuori finestra restano saltate (ADR-0018).
- Nascondere qualcosa diventa una scelta visibile e coerente, non un ripiego.

**P8. Movimento ridotto.** Le fasi restano le stesse, ma con sola opacità di 120 ms lineare. Restano anche le stesse sagome e lo stesso ordine; spariscono scala, traslazioni e oscillazioni. La manipolazione diretta resta: la copia segue il dito e le pagine seguono lo scorrimento. **Cambi senza transizione ammessi solo qui** (elencati in A12): la sagoma che cambia misura di cella in cella; la vista pagine che si apre e si chiude con le schede già alla scala k o 1.

**P9. Riscontro immediato.** Ogni tocco su un **comando** (pulsante, «+», scheda, ingranaggio, pallino) cambia visibilmente l'elemento toccato entro uno o due fotogrammi (circa 22 ms a 90 Hz), anche se la scena parte dopo. Il riscontro copre l'attesa del cambio di stato. **Escluso il vuoto della pagina:** per decisione dell'utente del 2026-10-23 (contatore senza riscontro), il primo riscontro visivo sul vuoto è lo scatto della pressione lunga; la vibrazione allo scatto non sostituisce il riscontro visivo e non è garantita su ogni dispositivo.

**P10. Interruzioni di sistema.** Rotazione, ridimensionamento della finestra e app in background a metà scena: la scena salta al suo stato finale (senza movimento) e la fine composta di P1 chiude gli stati temporanei. Un rAF doppio in attesa con la pagina in background parte al ritorno, ma la scena non si rigioca: si applica direttamente lo stato finale. Al ritorno in primo piano non si recuperano animazioni perse.

## Coreografia per interazione

Convenzione: i tempi sono in ms dall'istante T0 definito per ogni interazione. «+40 · 360» significa: parte 40 ms dopo T0 e dura 360 ms. **Ts** è l'evento dell'utente (scatto, tocco, rilascio); **T0** è l'inizio della scena, cioè il primo fotogramma dopo il blocco del commit (meccanismo in due tempi di P1). Dove la tabella non dice altro, la colonna PRIMA va da Ts a T0 e la colonna DURANTE parte da T0.

### 1. Pressione lunga sul vuoto → vista pagine

Ts = scatto della pressione, 500 ms dopo il contatto (`LONG_PRESS_MS`). T0 = primo fotogramma dopo il blocco del commit (oggi 117 ms in Z).

**Oggi:** da 60 ms dopo il contatto la pagina si rimpicciolisce in modo progressivo fino a 0,9. Ogni tocco più lungo di 60 ms sul vuoto o su un «+» la fa quindi rimpicciolire per un istante. È ciò che l'utente vede «ad ogni click».

**Decisione dell'utente del 2026-10-23:** un contatore senza riscontro sulla pagina; allo scatto, la pagina si rimpicciolisce e si apre la vista pagine.

| Aspetto | PRIMA (conteggio 0-500 ms, Ts, blocco fino a T0) | DURANTE (T0 … T0+440) | DOPO (T0+440 …) |
|---|---|---|---|
| Sfumano | Nel conteggio nulla sulla pagina. Tra Ts e T0 nulla si muove: lo stato è già committato, le classi di movimento no. | • caselle vuote e «+» da 1 a 0 (0 · 100, ease-in), **finite prima** che la pagina si muova;<br>• ombra della scheda da 0 a 1 (+80 · 360, con la scala; pseudo-elemento a opacità come oggi);<br>• indicatore in alto da 0 a 1 (+120 · 240);<br>• barra della vista pagine da 0 a 1 (+160 · 240);<br>• comandi sotto le schede da 0 a 1 (+200 · 180) | Nessuno |
| Si muovono | Nulla | • pagina corrente: `scale` da 1 a k e `translate` verso il centro del gruppo (+80 · 360);<br>• schede accanto: `translate` dalla riga a ±passo, insieme alla corrente (+80 · 360);<br>• indicatore che scende (+120 · 360);<br>• barra che sale (+160 · 360) | Nulla |
| Nascosti per alleggerire | Pagine oltre la finestra: già saltate. | Caselle a 0 senza `will-change`, poi `inert` senza livello; pagine fuori dalle schede visibili ±1 saltate (ADR-0018) | Caselle nascoste per tutta la vista pagine, come oggi |
| Ordine | Ts: vibrazione e commit dello stato. Il blocco del commit (oggi 117 ms) cade qui. Classe di scena nel rAF doppio: T0. | Caselle (T0) → scala e schede (+80, a caselle uscite) → indicatore (+120) → barra (+160) → comandi (+200). Fine della scena a T0+440 (scala), entro P4 | Fuoco al secondo fotogramma dopo la fine composta della scena (R7) |
| Curve | — | `--aca-ease-out` per scala e traslazioni; ease-in solo per l'uscita delle caselle | — |
| Proprietà | — | `scale`, `translate`, `opacity` | — |
| Interruzione | Il dito si alza, o si sposta oltre 14 px, prima dello scatto: non c'è nulla da annullare, perché nulla si è mosso; uno scorrimento parte normalmente. | Un tocco su «Fine» o su una scheda durante l'apertura fa ripartire le transizioni dal valore corrente verso la chiusura, senza salti. La barra che arriva aspetta quella che va. Lo scorrimento delle schede col dito è ammesso solo dopo la fine della scena: durante l'apertura il gesto orizzontale è ignorato (oggi non verificato). | — |
| Movimento ridotto | Come sopra: nessun riscontro nel conteggio. | Come oggi la vista è immediata (eccezione di P8/A12); caselle, indicatore e barra con dissolvenze di 120 ms | — |

**Scheda tenuta nella vista pagine** (riordino): oggi segue la stessa pista progressiva. La proposta di applicare la stessa regola del contatore è la D-M2: nessun riscontro fino allo scatto, poi il sollevamento come oggi (scala in 150 ms e un'oscillazione di 300 ms).

### 2. Ritorno: «Fine» e tocco su una scheda

Ts = tocco su «Fine», su Esc o su una scheda. T0 = primo fotogramma dopo il blocco del commit (oggi 171 ms per «Fine», 177 per la scheda, in Z). Nella 0.9.27 il tocco su una scheda porta quella pagina in uso.

| Aspetto | PRIMA (Ts … T0) | DURANTE (T0 … T0+400) | DOPO (fine composta della chiusura) |
|---|---|---|---|
| Sfumano | «Fine» o la scheda premuti (120), riscontro locale a Ts | • comandi sotto le schede da 1 a 0 (0 · 120, ease-in);<br>• barra della vista pagine e indicatore da 1 a 0 (0 · 200, ease-in);<br>• ombra della scheda da 1 a 0 (+40 · 360) | Caselle e «+» da 0 a 1 (180, ease-out; oggi 240, D-M20), entro un fotogramma dalla fine (O4, invariato; oggi 92 ms dopo) |
| Si muovono | — | • barra che scende (0 · 240, ease-in);<br>• indicatore che sale (0 · 240, ease-in);<br>• schede che tornano nella riga, con scala da k a 1 (+40 · 360);<br>• la scheda toccata è quella che diventa la pagina, con lo stesso movimento e senza salto | La riga riprende lo scorrimento nello stesso fotogramma, senza cambi visibili |
| Angolo | — | **Oggi** il corpo diventa quadrato all'istante all'inizio della chiusura (`launcher.css:277`), su una scheda ancora piccola: un cambio senza fotogrammi intermedi. **Proposta (D-M21):** il raggio resta quello della vista pagine sulla scheda in movimento (a vista cresce da r a circa r/k, 1,4 volte con k = 0,72: il motivo per cui oggi si squadra subito) e si squadra soltanto alla fine, quando la scheda copre lo schermo e l'angolo coincide con quello dello schermo; in alternativa un raggio che segue la scala su un livello di ritaglio, da tenere solo se la misura (A1) lo regge. | — |
| Nascosti per alleggerire | — | Caselle a 0; le schede che escono restano disegnate finché escono | Le pagine oltre ±1 tornano saltate **dopo** l'assestamento, non prima |
| Ordine | Commit a Ts, classe di scena nel rAF doppio | Barre e comandi escono a T0; le schede partono a +40 | Caselle subito dopo la fine composta (P1) |
| Curve e proprietà | `opacity` | `--aca-ease-out`; `scale`, `translate`, `opacity` | ease-out, `opacity` |
| Interruzione | — | Una pressione lunga durante la chiusura è ignorata fino alla fine dell'assestamento (D-M18). **Da verificare:** oggi `useLongPress` è disattivato solo con `overview` (`LauncherScreen.tsx:1116`). | Un tocco durante il ritorno delle caselle lo fa finire subito |
| Movimento ridotto | Dissolvenze di 120 ms | Chiusura immediata, come oggi | Caselle in 120 ms |

La durata della chiusura resta 360 ms. La regola «uscite più rapide» vale per gli elementi che lasciano lo schermo, non per la pagina che torna a riempirlo.

### 3. Tocco sul «+» (in uso e in modifica)

T0 = contatto del dito (`pointerdown`) per la pressione; Ts = rilascio per l'apertura del foglio.

**Oggi:**

- Il glifo va a 0,94 con `:active`. Su Chrome Android `:active` al tocco arriva con il ritardo del «show press», che serve a distinguere il tocco dallo scorrimento: non è garantito entro un fotogramma.
- Per i tocchi più lunghi di 60 ms si rimpicciolisce anche la pagina intera (vedi la scheda 1).
- Il foglio si vede 361-380 ms dopo il tocco (F-09).

| Aspetto | PRIMA (contatto → rilascio) | DURANTE (rilascio → foglio arrivato) | DOPO |
|---|---|---|---|
| Sfumano | — | Sfondo del foglio da 0 a 1 (0 · 200) | Contenuto del foglio da 0 a 1 (160) **solo dopo l'arrivo** del pannello: nessun commit di React durante la salita (P1) |
| Si muovono | Glifo «+» da 1 a 0,94 e pozzetto premuto con la sequenza di pressione del kit (120). La pressione è una **classe messa a `pointerdown`** via JS, non `:active`, così arriva entro un fotogramma dal contatto. | Pannello con `translateY` da 100 % a 0 (280, ease-out). Partenza: entro 150 ms dal rilascio **solo dopo ISSUE-112**; finché `showModal()` costa circa 200 ms (0.9.26; fogli 164-182 ms in Z), l'obiettivo è il blocco misurato più 2 fotogrammi (A7) | Il glifo torna a 1 (180) quando il foglio comincia a muoversi, non prima: la pressione copre l'attesa |
| Nascosti per alleggerire | — | Contenuto pesante non montato prima della salita: un'ossatura a righe di altezza fissa | — |
| Ordine | Pressione (T0) → rilascio (Ts) → apertura del dialogo vuoto, dove cade il costo di `showModal()` (≤ 100 ms solo con ISSUE-112) → classe di scena nel rAF doppio → salita | — | Contenuto dopo l'arrivo |
| Curve e proprietà | Kit 2, `transform` | ease-out, `transform` e `opacity` | ease-out, `opacity` |
| Interruzione | Se il dito scivola oltre 14 px, o arriva `pointercancel` (inizio di uno scorrimento), la classe si toglie e il «+» torna a 1 **con una transizione** (180): uno swipe che parte da un «+» mostra al massimo una pressione breve che rientra, mai un lampo; da misurare (scenari TAP e SW). Il foglio non si apre. Se la pressione supera 500 ms si apre la vista pagine (scheda 1), perché il «+» è un punto vuoto della pagina. | Esc o un tocco fuori durante la salita: il foglio torna giù dal punto in cui è | — |
| Movimento ridotto | Pozzetto premuto senza scala del glifo, come oggi | Foglio con dissolvenza di 120 ms | Contenuto subito |

### 4. Pressione lunga sul widget, sollevamento, trascinamento, rilascio, «Annulla»

T0 = scatto. In uso scatta a 500 ms sul corpo del widget. In modifica il widget selezionato si muove subito dalla maniglia (ADR-0016, G5): lì T0 è il primo movimento.

**4a. Sollevamento e trascinamento**

| Aspetto | PRIMA (conteggio, poi T0) | DURANTE (dito in movimento) | DOPO |
|---|---|---|---|
| Sfumano | • nel conteggio nessun riscontro (in uso è già così);<br>• a T0 il «+» delle celle da 1 a 0 (0 · 120, oggi 180);<br>• ingranaggio da 1 a 0,5 (0 · 160, oggi di colpo, F-11) | • pozzo d'arrivo da 0 a 1 (120) su ogni nuova cella bersaglio;<br>• freccia del bordo (450 ms, come oggi) | — |
| Si muovono | Copia: nasce sopra il widget **alla sua stessa scala** (1, non 0,9) e sale a 1,04 (0 · 150, ease-out), come oggi da 0,9. La sua ombra è uno pseudo-elemento che va da opacità 0 a 1 nello stesso tempo, non più un `box-shadow` animato (D-M17). La barra del widget sale (+60 · 360). In uso, il commit dell'ingresso in modifica (barra, indicatore, anello) cade tra Ts e T0, prima della scena. | • copia che segue il dito (`transform`);<br>• oscillazione di ±0,9° dopo 150 ms, come oggi;<br>• gli altri widget si spostano dopo la sosta (`translate` 240, ease-in-out);<br>• la barra mostra la pillola «Rimuovi» | — |
| Nascosti per alleggerire | Widget originale `visibility: hidden` **nello stesso fotogramma** in cui compare la copia: un cambio di mano senza salto | Copia statica, un clone inerte come oggi; celle senza «+» | — |
| Interruzione | Il dito si alza prima dello scatto: è un tocco normale, che apre i dettagli | `pointercancel` (secondo dito, sistema): come un rilascio non valido (4b) | — |
| Movimento ridotto | Nessuna scala; la copia compare con una dissolvenza di 120 ms | Nessuna oscillazione; la copia segue il dito (manipolazione diretta) | — |

**4b. Rilascio, rimozione, «Annulla» e «Fine»**

**Ordine del commit (vincolante).** Il rilascio costa un blocco di 120 ms e «Annulla» 102 ms (Z). Il volo non deve cadere dentro questi blocchi. Due ordini ammessi:

- **uscite e voli della copia:** la copia vola su un livello statico (clone inerte) verso la cella **calcolata prima del rilascio**; il nuovo layout si committa **soltanto all'atterraggio** (fine composta del volo), con la copia ferma sulla cella; lo scambio copia-widget avviene nel primo fotogramma dopo quel commit, poi le entrate del DOPO partono da un nuovo T0 (rAF doppio);
- **entrate del widget vero** («Annulla», ripristino): commit prima, con il widget montato al valore iniziale, e movimento dopo il rAF doppio (P1).

| Caso | PRIMA | DURANTE | DOPO |
|---|---|---|---|
| Rilascio valido | Cella d'arrivo già nota dal trascinamento; nessun commit | La copia vola dal dito alla cella d'arrivo: `translate` più `scale` da 1,04 a 1 (200, ease-out), con l'opacità del suo pseudo-elemento d'ombra da 1 a 0 | • all'atterraggio: commit del layout con la copia ferma; nel primo fotogramma dopo il blocco copia tolta e widget visibile, stessa posizione e stessa scala (oggi non c'è transizione: la copia sparisce e il widget è già al suo posto);<br>• da quel T0: «+» delle celle da 0 a 1 (0 · 160);<br>• anello della selezione da 0 a 1 (+40 · 120);<br>• pallini (+80 · 160) |
| Rilascio non valido | — | La copia torna alla cella di partenza (240, ease-in-out); nessun commit di layout | Come il rilascio valido |
| Su «Rimuovi» | Copia a scala e opacità 0,6 (150, come oggi) | Al rilascio la copia si restringe verso il dito e sfuma (160, ease-in), prima del commit della rimozione | • commit della rimozione dopo l'uscita della copia;<br>• dal T0 successivo: pillola «Annulla» in entrata (+40 · 240, ease-out);<br>• «+» delle celle liberate da 0 a 1 (+80 · 160) |
| «Rimuovi» dalla barra (widget selezionato) | Pulsante premuto (120) | Widget: `scale` da 1 a 0,92 e `opacity` da 1 a 0 (160, ease-in); anello e pallini escono con lui; il commit della rimozione arriva **dopo** l'uscita | Come «su Rimuovi». Oggi il widget sparisce senza transizione (F-13). |
| «Annulla» della pillola (ripristino) | Commit con il widget montato a `scale` 0,92 e `opacity` 0; il blocco (102 ms in Z) cade qui | Dal T0: «+» della cella da 1 a 0 (0 · 120); il widget rientra: `scale` da 0,92 a 1 e `opacity` da 0 a 1 (+60 · 240, ease-out) | — |
| «Annulla» della barra | Commit prima, movimento dopo il rAF doppio | • stessa pagina: il widget torna al posto di prima (`translate` 240, ease-in-out, come oggi);<br>• da un'altra pagina: prima lo scorrimento, poi il widget entra (200) | Anello e pallini restano |
| «Fine» con un widget selezionato | «Fine» premuto (120) | • anello e pallini da 1 a 0 (0 · 120, ease-in, oggi l'anello sparisce di colpo);<br>• barra che scende (0 · 240);<br>• indicatore che sale (0 · 240) | Fuoco al secondo fotogramma (R7) |
| Movimento ridotto | — | Volo e rientri sostituiti da dissolvenze di 120 ms | — |

Il widget che cambia cella durante il trascinamento anima oggi anche `box-shadow` (`launcher.css:537`, `:565`, `:571`): stessa proposta della copia, ombra come pseudo-elemento a opacità (D-M17).

**Pila (stack).** Una pila è un widget per la cornice comune: sollevamento, volo, rimozione e sagoma seguono le stesse righe. Le interazioni interne alla pila (scorrimento tra le carte, aggiunta dentro la pila) e la pila vuota di Multimedia (punto 2 della 0.9.28) **non sono coreografate qui**: vedi «Rettifiche dopo la critica».

### 5. Ridimensionamento con la sagoma

Contatto su un pallino o su un lato della cornice del widget selezionato: nessuna scena. **T0 = primo cambio di cella sotto il dito**, oppure uno spostamento oltre la tolleranza di 14 px. Un tocco sulla cornice senza spostamento non nasconde nulla: nessuno spegni-riaccendi del contenuto.

**Lettura della richiesta.** «La comparsa delle icone durante l'ingrandimento di un widget» è interpretata come il contenuto del widget, icone comprese, che cambia e compare cella per cella mentre il widget cresce. Oggi il contenuto segue la misura dal vivo (`WidgetGrid.tsx:432-435`): S3b mostra la larghezza da 257 a 410 px in 1-2 fotogrammi e blocchi di 120-125 ms in Z. Se l'utente intendeva invece l'apertura dei dettagli di un widget, la stessa sagoma vale per il pannello dei dettagli (scheda 7). È da confermare (D-M6).

| Aspetto | PRIMA (T0 … T0+100) | DURANTE (dito in movimento) | DOPO (rilascio …) |
|---|---|---|---|
| Sfumano | Contenuto del widget da 1 a 0 (0 · 100, ease-in) | — | Contenuto nuovo da 0 a 1 (200, ease-out), **dopo il commit degli osservatori** dei widget, non dopo un numero fisso di fotogrammi |
| Si muovono | — | Sagoma: larghezza e altezza seguono la cella sotto il dito (120, ease-out, come oggi); anello e pallini seguono la sagoma | La sagoma si ferma sulla misura finale (120) |
| Nascosti per alleggerire | Contenuto saltato dal browser (`content-visibility: hidden`) **dopo** la dissolvenza: niente layout, niente disegno, niente osservatori. Il contenuto deve avere una dimensione definita dalla cornice (o `contain-intrinsic-size`), perché il contenimento della dimensione non faccia collassare la scatola: requisito per tutti i tipi di widget, da coprire con un test | Il contenuto resta saltato: la sagoma è solo la faccia della cornice | — |
| Ordine | Il primo cambio di misura **aspetta** che il contenuto sia a 0: se il dito arriva alla cella successiva prima dei 100 ms, la misura si applica alla fine della dissolvenza (ritardo massimo 100 ms). Il contenuto non si nasconde mai di colpo. | Una cella alla volta | Rilascio → misura finale (≤ 120, fine composta) → contenuto riattivato con l'opacità a 0 → commit degli osservatori (`AdaptiveCategoryWidget`, `useMeasuredHeight`) → classe di rientro nel rAF doppio → dissolvenza (200) |
| Curve | ease-in | ease-out | ease-out |
| Proprietà | `opacity` | `width` e `height` della sola scatola vuota. È **un'eccezione dichiarata** alla regola P1: una scatola senza contenuto, con l'angolo giusto (valutazione). In alternativa, `scale` su un livello separato, che però deforma gli angoli (fino a 1,6 volte in S3b). | `opacity` |
| Interruzione | Dito alzato senza cambio di cella: nessuna scena era partita, nulla da ripristinare. Dito alzato durante la dissolvenza in uscita senza cambio di misura: il contenuto risale dal valore corrente (200). | • «Annulla»: la sagoma torna alla misura iniziale (240, ease-in-out), poi il contenuto;<br>• `pointercancel` (sistema, secondo dito): come «Annulla», la misura torna a quella iniziale;<br>• un secondo dito durante il gesto è ignorato fino al rilascio del primo | Un nuovo contatto durante la dissolvenza la fa ripartire dal valore corrente verso 0 |
| Fine della scena | — | — | Segnale composto (P1): `transitionend`/`transitioncancel` di `width` o `height` della sagoma, oppure il tetto di 120 ms + 2 fotogrammi; fine immediata con misura invariata o in movimento ridotto. Un test mirato copre durata 0 e misura invariata. |
| Movimento ridotto | Contenuto via in 120 ms lineari | La sagoma salta di cella in cella, senza transizione di misura (eccezione di P8/A12) | Contenuto in 120 ms lineari |

La costruzione è descritta nella sezione «La sagoma: come si costruisce senza curare ogni widget».

### 6. Cambio pagina: scorrimento col dito, pallino accanto, salto diretto, bordo

T0 = contatto del dito o tocco sul pallino.

**Scorrimento col dito (swipe e lancio)**

| Aspetto | PRIMA | DURANTE | DOPO (atterraggio) |
|---|---|---|---|
| Sfumano | — | — | Indicatore in alto da 0 a 1 all'atterraggio (240), resta circa 2 s e risale (240, ease-in), come oggi |
| Si muovono | — | Le pagine seguono il dito con lo scorrimento nativo sul compositore; il lancio atterra con lo snap | — |
| Nascosti per alleggerire | La finestra è già pronta: pagine ±1 disegnate a riposo | **Requisito:** nessuno sblocco di pagine e nessun commit di React durante il gesto. Oggi la finestra si allarga al primo evento di scroll; la causa probabile del costo di 55-80 ms è il punto 1 della 0.9.28 (vedi REP-20261022-002). | La finestra segue la nuova pagina in un momento di quiete; i 500 ms dopo l'atterraggio non devono peggiorare (O5) |
| Interruzione | — | Un tocco ferma il lancio sulla pagina più vicina; una pressione lunga durante lo scorrimento è ignorata, come oggi | — |
| Movimento ridotto | — | Nessuna differenza: è manipolazione diretta | Indicatore con dissolvenza di 120 ms |

**Gli altri casi:**

- **Pallino accanto:** scorrimento morbido del browser, con la stessa regola (pagina di arrivo già disegnata, nessun commit durante). La durata la decide il browser e non è controllata dalla pagina. Oggi costa 108 ms nella 0.9.27: obiettivo A3.
- **Salto diretto (pallino lontano, R10):** atterra subito, senza pagine intermedie. È la scelta dell'utente D-2 «Salto diretto» e resta il predefinito. Un'opzione **da approvare** (D-M13):
  - dissolvenza dell'area delle pagine da 1 a 0 (100, ease-in);
  - salto;
  - dissolvenza da 0 a 1 (160, ease-out).

  Non mostra pagine intermedie e toglie lo stacco netto; costa 260 ms in più.
- **Bordo durante un trascinamento:** freccia di 450 ms, la pagina gira dopo la sosta, finestra ±2 dall'inizio (non si sblocca a metà gesto), come oggi.
- **Schede della vista pagine trascinate:** le schede seguono il dito. Una scheda vuota per circa 50 ms in uno scorrimento molto veloce è il caso accettato da D-3 (ADR-0018).

### 7. Fogli: «Collega», «Aggiungi un widget», «Impostazioni del widget» e dettagli

T0 = rilascio del tocco che apre il foglio. I tempi dell'entrata sono quelli della scheda 3.

**Chiusura** (T0 = «Chiudi», Esc, tocco fuori o azione completata):

| Aspetto | PRIMA | DURANTE | DOPO |
|---|---|---|---|
| Sfumano | — | Sfondo da 1 a 0 (0 · 160, ease-in) | — |
| Si muovono | Pulsante premuto (120) | Pannello che scende (0 · 200, ease-in) | L'elemento del launcher interessato parte dopo: per esempio il widget aggiunto (scheda 9) o il widget collegato |
| Nascosti per alleggerire | Contenuto **congelato**: nessun nuovo render mentre esce. Oggi si svuota nel primo fotogramma (T-04). | — | Lo stato del foglio si azzera alla fine composta (P1: `transitionend`/`transitioncancel` di `transform` del pannello, oppure tetto di 200 ms + 2 fotogrammi; immediata in movimento ridotto senza transizione), non prima |
| Interruzione | — | Un nuovo tocco sull'apertura durante l'uscita fa risalire il foglio dal punto in cui è. Il secondo di due fogli in sequenza parte quando il primo è uscito per metà, con circa 100 ms di sovrapposizione (D-M19). | — |
| Movimento ridotto | — | Dissolvenza di 120 ms del pannello e dello sfondo | — |

Il costo di `showModal()` e `close()`, circa 200 ms di stile nella 0.9.26, resta finché ISSUE-112 non cambia il meccanismo del foglio. La coreografia lo mette **prima** del movimento, coperto dalla pressione del pulsante, e non durante la salita. Per la chiusura vale lo stesso ordine: il costo di `close()` cade dopo la discesa (il dialogo esce mentre è ancora aperto e si chiude alla fine composta), oppure prima con la discesa dopo il rAF doppio. Gli obiettivi di 100 ms e di 150 ms (scheda 3, A7) valgono solo **dopo** ISSUE-112.

### 8. Sistema: ingresso e uscita

T0 = tocco sull'ingranaggio, oppure su «Torna al launcher».

**Oggi:** il cambio è istantaneo, con `hidden` sul launcher. Al ritorno ci sono un ricalcolo e una rimisura: blocco di 149 ms in Z e layout-shift di 0,29-0,34 (F-08).

**Vincolo.** Oggi Sistema è montato al tocco (`LauncherPage.tsx:182`): una dissolvenza che partisse insieme al montaggio comprenderebbe montaggio, layout e raster della pagina intera. All'uscita, il launcher che torna visibile è il ricalcolo da 149 ms di Z, più il cambio di `PageVisibilityContext` (`:159`) che riattiva i widget. Entrambi vanno **prima** del movimento.

| Aspetto | PRIMA | DURANTE | DOPO |
|---|---|---|---|
| **Ingresso:** preparazione | Ingranaggio premuto (120) a Ts. Sistema montato a `opacity` 0 e `translateY` 16 px: montaggio, layout e primo raster cadono qui. Classe di scena nel rAF doppio: T0 | — | — |
| **Ingresso:** sfumano | — | Sistema da 0 a 1 (0 · 240, ease-out) | Il launcher sotto diventa invisibile e saltato dal browser **dopo** la fine composta, senza `display: none`; i widget si fermano in quel momento |
| **Ingresso:** si muovono | — | Sistema con `translateY` da 16 px a 0 (0 · 240, ease-out) | — |
| **Uscita:** preparazione | A Ts, sotto Sistema ancora opaco: launcher reso visibile con le misure di prima (nessuna griglia a 0) e widget riattivati (`PageVisibilityContext`). Il blocco (149 ms in Z) cade qui, nascosto da Sistema. Classe di uscita nel rAF doppio: T0 | — | — |
| **Uscita:** sfumano e si muovono | — | Sistema da 1 a 0 e `translateY` da 0 a 8 px (0 · 160, ease-in) | Smontaggio di Sistema alla fine composta (`transitionend`/`transitioncancel` di `opacity`, o tetto); fuoco sull'ingranaggio al secondo fotogramma (R7); nessun layout-shift |
| Latenza | — | L'ingresso e l'uscita partono dopo il blocco: tra il tocco e il primo movimento passano il montaggio o il ricalcolo (oggi circa 150 ms) più 2 fotogrammi, con il solo ingranaggio premuto come riscontro. È un cambio visibile (D-M12). | — |
| Interruzione | — | Un nuovo tocco sull'ingranaggio durante l'uscita fa tornare Sistema dal valore corrente | — |
| Movimento ridotto | — | Solo dissolvenze di 120 ms | — |

Per il launcher coperto si sceglierà tra `content-visibility: hidden` e `visibility: hidden` con una misura. La prima salta anche il layout, ma ha gli stessi dubbi sugli osservatori già visti in ADR-0018 (H4). L'informativa sull'AI in Sistema (REP-20261023-005) non cambia.

### 9. Comparsa del widget aggiunto

T0 = tocco su «Aggiungi il widget» nel foglio. Oggi il widget compare già selezionato: anello subito, pallini in 160 ms. È la richiesta dell'utente del 2026-10-23 («vorrei si partisse col widget con highlight e modifica»), che la proposta conserva.

Due scene in sequenza (eccezione di P4): **scena A**, il foglio che esce (scheda 7), con T0 dopo il blocco del commit che monta il widget; **scena B**, il widget che entra, con T1 = T0 + 160 (40 ms di sovrapposizione con la fine della scena A). Ciascuna resta entro 550 ms; il totale, circa 620 ms da T0, è un cambio visibile (D-M11).

| Aspetto | PRIMA (Ts … T0) | Scena A (T0 … T0+200) | Scena B (T1 = T0+160 …) |
|---|---|---|---|
| Sfumano | «Aggiungi il widget» premuto (120). Commit con il widget montato nella cella a `opacity` 0 | Sfondo del foglio da 1 a 0 (0 · 160); il «+» della cella da 1 a 0 (0 · 120) | • widget da 0 a 1 (0 · 240);<br>• anello della selezione da 0 a 1 (+40 · 120);<br>• pallini da 0,5 a 1 (+60 · 160) |
| Si muovono | — | Pannello che scende (0 · 200) | • widget: `scale` da 0,92 a 1 (0 · 240, ease-out);<br>• barra del widget che sale (+100 · 360). Fine della scena B a T1+460 |
| Nascosti per alleggerire | Il widget è già montato a `opacity` 0 e `scale` 0,92: nessun salto di layout; contenuto disegnato una volta sola, prima dell'entrata | — | — |
| Pagina piena | Prima lo scorrimento automatico verso la pagina con spazio (come il pallino accanto), poi la scena B (D-M22) | — | — |
| Interruzione | — | Un tocco altrove fa finire subito la comparsa; la selezione si toglie (anello e pallini 120, ease-in) | — |
| Movimento ridotto | — | Dissolvenza di 120 ms | Anello e pallini insieme, in 120 ms |

### 10. Barre in alto e in basso

| Aspetto | PRIMA | DURANTE | DOPO |
|---|---|---|---|
| Entrata (barra del widget, barra della vista pagine, indicatore) | — | `transform` 360 ms più `opacity` 240 ms, ease-out, come oggi | — |
| Uscita | — | 240 e 200 ms ease-in, come oggi | — |
| Scambio tra due barre con «Fine» | La barra che va parte subito | Quella che arriva aspetta 180 ms (220 ms il gruppo «Pagine»), come oggi: mai due «Fine» insieme | — |
| Barra del widget che diventa «Rimuovi» (trascinamento) | — | Il contenuto della pillola cambia con una dissolvenza incrociata (120). **Da verificare a vista** se la larghezza del gruppo salta: oggi i figli nascosti hanno `display: none` (`edit.css:836`). Proposta: la pillola «Rimuovi» prende la larghezza del gruppo. | — |
| Indicatore: etichetta della pagina | — | L'etichetta cambia con una dissolvenza incrociata (120) dentro una larghezza stabile, così non c'è salto (F-12) | — |
| Movimento ridotto | — | Solo dissolvenze di 120 ms, come oggi | — |

Le barre hanno già oggi il rapporto giusto tra entrata e uscita (360/240). I loro scatti misurati (F-06) sono blocchi del thread, non un difetto della curva.

### 11. Pillole e avvisi

| Elemento | PRIMA | DURANTE | DOPO | Oggi |
|---|---|---|---|---|
| Pillola «Annulla» (dal basso, o dall'alto nella vista pagine) | — | Entrata: `translateY` da 1 rem più `opacity` (240, ease-out). Uscita: 160 ms ease-in. | Una seconda rimozione con la pillola visibile cambia solo il testo, con una dissolvenza incrociata (120), senza uscire e rientrare | 300/200 ms, uguali in entrata e in uscita |
| Avviso (toast) | — | Entrata in 200 ms, come oggi; uscita con `opacity` più 4 px (160, ease-in) | — | Uscita senza animazione |
| Avviso di connessione | — | Entrata dall'alto con `translateY` più `opacity` (240); uscita in 160 ms | La griglia resta ferma, come oggi | Nessuna transizione |
| Ingranaggio inerte durante un trascinamento | — | `opacity` da 1 a 0,5 e ritorno (160) | — | Di colpo (F-11) |
| Nuvoletta UI-010 | — | Invariata: 300 ms con la curva elastica del design dell'utente | — | — |
| Movimento ridotto | — | Dissolvenze di 120 ms | — | — |

### 12. Vista pagine: frecce, scambio indicatore/pillola, pagine aggiunte o rimosse

Aggiunta dopo la critica. Ts e T0 come in P1.

| Interazione | PRIMA (Ts … T0) | DURANTE | DOPO | Oggi |
|---|---|---|---|---|
| Frecce della vista pagine (scheda precedente o successiva) | Freccia premuta (120); commit della nuova scheda corrente | Le schede scorrono di un passo con `translate` (0 · 240, ease-in-out); nessun cambio di misura né di posizione nel flusso: la riga resta della stessa larghezza | Fuoco sulla nuova scheda al secondo fotogramma (R7) | Layout-shift 0,24-0,37 (REP-20261022-001); obiettivo A6 = 0 |
| Indicatore che cede alla pillola «Annulla» (`yieldToUndo`) | — | Indicatore da 1 a 0 (0 · 120, ease-in), poi pillola da 0 a 1 con `translateY` (+60 · 240, ease-out). Al ritorno l'ordine inverso. Lo stesso posto non ospita mai i due insieme a piena opacità | Indicatore tolto dall'albero accessibile alla fine composta | Scambio istantaneo con `hidden` (`FlashingPageIndicator.tsx:43`) |
| Pagina aggiunta dai comandi sotto le schede | Pulsante premuto (120); commit con la nuova scheda montata a `opacity` 0 e `scale` 0,92 | Le schede a destra scorrono di un passo (`translate`, 0 · 240, ease-in-out); la nuova scheda entra (+60 · 240, ease-out) | La riga scorre sulla nuova scheda solo se è fuori vista, dopo l'entrata | Da verificare a vista (non misurato) |
| Pagina rimossa | Pulsante premuto (120) | La scheda esce (`scale` 0,92 e `opacity` 0, 0 · 160, ease-in); commit della rimozione **dopo** l'uscita; poi, da un nuovo T0, le schede a destra chiudono il vuoto (`translate`, 0 · 240, ease-in-out) | Pillola «Annulla» come sopra | Da verificare a vista (non misurato) |
| Movimento ridotto | — | Dissolvenze di 120 ms; le schede cambiano posto senza traslazione | — | — |

### 13. Regola generale per le interruzioni di sistema

Rotazione, ridimensionamento della finestra, app in background a metà scena: vale P10. In particolare il ridimensionamento con la sagoma tratta la rotazione come `pointercancel` (misura iniziale), e la vista pagine salta allo stato in cui stava andando.

## La sagoma: come si costruisce senza curare ogni widget

*Proposta, nessun codice. Valutazioni dell'agente da confermare con la misura.*

1. **Dove sta.** Sulla cornice comune che `WidgetHost` mette intorno a ogni widget, mai dentro i widget (ADR-0004):
   - `.aca-launcher-widget__frame`, con la superficie `aca-m--card` di Kit 2;
   - `.aca-launcher-widget__bare` per i widget senza cornice.

   La sagoma è la faccia della cornice senza il contenuto: stessa superficie, stesso angolo, stessa ombra. È già nel materiale e non va disegnata per ogni tipo.
2. **Come si attiva.** Si usa la classe che il widget ha già durante il gesto (`is-resizing`), più una classe di fine (per esempio `is-revealing`).
   - **All'inizio** (al primo cambio di cella, non al contatto): il contenuto (`.aca-launcher-widget__content`) va a opacità 0 in 100 ms, poi è saltato con `content-visibility: hidden`. I due passi servono perché `content-visibility` agisce subito e non lascerebbe vedere la dissolvenza.
   - **Dimensione definita.** `content-visibility: hidden` impone il contenimento della dimensione: la scatola del contenuto, e quella del widget senza cornice, devono ricevere la misura dalla cella (o da `contain-intrinsic-size`), mai dal contenuto, altrimenti collassano a 0. Un test mirato lo verifica per ogni tipo di widget registrato.
   - **Widget senza cornice:** uno pseudo-elemento con il raggio della cella e il colore del pozzetto disegna la sagoma. Durante il gesto questi widget mostrano quindi un pozzetto che oggi non hanno: cambio d'aspetto da approvare (D-M23).
3. **Come finisce.**
   - Si aspetta la misura finale con il segnale composto di P1 (`transitionend`/`transitioncancel` di `width` o `height`, o il tetto di 120 ms + 2 fotogrammi; immediato con misura invariata o senza transizione).
   - Si toglie il salto con il contenuto ancora a 0.
   - Gli osservatori dei widget (`AdaptiveCategoryWidget`, `useMeasuredHeight`) misurano **una sola volta**, invece di una volta per ogni cella attraversata, e fanno il loro `setState`.
   - Dopo quel commit, la classe di rientro nel rAF doppio (le callback di `ResizeObserver` arrivano nel primo aggiornamento del rendering dopo la riattivazione; che il loro commit preceda la classe va verificato con il contatore di A11): il contenuto entra in 200 ms. Il blocco di fine ridimensionamento ha un obiettivo proprio (A2, scenario RZ).
4. **Cosa resta visibile durante il gesto.**
   - Anello e pallini della selezione restano.
   - Il pozzo d'arrivo rosso, per le misure non ammesse, resta.
   - L'icona del tipo al centro della sagoma, come nella tessera del vassoio, è un'opzione **non consigliata** per la prima versione. Aggiunge un elemento da curare; resta come possibile variante (D-M6).
5. **Costo atteso (valutazione).** Durante il gesto resta il layout di una sola scatola vuota, al posto del widget intero con i suoi osservatori. Resta anche il disegno della faccia con la sua ombra morbida a ogni fotogramma di cambio di misura; le ombre di Kit 2 erano il costo GPU principale sul tablet (REP-20261012-003). Se la misura mostra ancora fotogrammi oltre 22 ms (A1), l'alternativa è una sagoma **piatta**: un pozzetto incassato come `.aca-launcher-drop`, senza l'ombra in rilievo, per la sola durata del gesto. Cambia l'aspetto durante il gesto: D-M7.
6. **Accessibilità.** Il nome accessibile del widget resta sulla maniglia. L'annuncio della nuova misura non cambia. In modifica i comandi del widget sono già disattivati, quindi nascondere il contenuto non sottrae comandi.
7. **Riuso.** Lo stesso meccanismo può servire per:
   - la copia trascinata tra pagine con celle di misura diversa («grandezza visiva»);
   - il widget aggiunto (scheda 9);
   - i fogli (l'ossatura a righe della scheda 3).

   Non è proposto ora: solo il ridimensionamento.

## Obiettivi misurabili sul Tab M11

Schermo a 90 Hz, cioè un fotogramma ogni 11,1 ms:

- un fotogramma oltre **22 ms** salta almeno un aggiornamento;
- un fotogramma oltre **50 ms** si vede come scatto.

La finestra di un'animazione va dal T0 della scena (primo fotogramma dopo il blocco, P1) all'ultimo fotogramma previsto, secondo i tempi delle tabelle sopra. Il blocco tra Ts e T0 si misura con A2, non con A1.

| ID | Obiettivo | Misura | Oggi |
|---|---|---|---|
| A1 | Dentro la finestra di ogni animazione: fotogrammi oltre 22 ms ≤ 10 % e **nessun** fotogramma oltre 50 ms | **Fonte preferita:** traccia del compositore via CDP (fotogrammi presentati e persi), da aggiungere agli strumenti. **Finché manca:** passata «light» con solo rAF (`run.cjs`, `measure-ov.cjs`), con il limite dichiarato che un vuoto di rAF non coincide con un fotogramma mostrato o perso (`transform` e `opacity` girano sul compositore; `width`/`height` no). Finestre ancorate al `transitionstart` misurato in una passata con sonda leggera, non ai segni dello scenario | Transizioni con 3-6 fotogrammi su 25-50 (0.9.25); picchi di 222-411 ms senza sonda |
| A2 | Blocco del cambio di stato tra Ts e T0 ≤ 100 ms (O1) e **fuori** dalla finestra: il movimento parte dopo il blocco e riceve almeno l'80 % dei fotogrammi attesi. Vale anche per il rilascio e l'atterraggio della copia (scheda 4b), per «Annulla», per Sistema e per la fine del ridimensionamento (commit degli osservatori prima della dissolvenza, scenario RZ) | Modo b (osservatore dei task lunghi); `trans.cjs` (fotogrammi di ogni transizione contro quelli attesi a 90 Hz) | Blocchi massimi di 102-207 ms in Z (rilascio 120, «Annulla» 102, Sistema 149) |
| A3 | Nessun blocco oltre 50 ms durante un gesto del dito: scorrimento, trascinamento, ridimensionamento | Modo b sulle finestre del gesto (`camp.sh` SW1-SW3, JUMP, T3, T6) | Swipe 80 ms, lancio 55 ms, pallino accanto 108 ms (Z) |
| A4 | Nessun salto di dimensione negli elementi seguiti: pagina, schede, widget, copia, sagoma, barre, pillola, etichetta dell'indicatore, ingranaggio. **Rispetto alla curva attesa:** in ogni fotogramma il valore misurato di larghezza, altezza o scala non si discosta dal valore previsto dalla curva per quell'istante di più del passo di un fotogramma della curva stessa (cioè al massimo un fotogramma di ritardo), e nessun salto supera 24 px o 0,05 di scala oltre quello previsto. Una percentuale fissa della variazione totale non funziona con `--aca-ease-out` sulle transizioni brevi (il primo fotogramma di 160 ms vale già circa il 30 %). Eccezioni: gli scatti di cella della sagoma, che sono transizioni di 120 ms valutate con la stessa regola, e quelle di movimento ridotto (A12). | Serie per fotogramma della sonda (`lib.cjs`) confrontata con la curva; rilevatori di `analyze.cjs` («size jumps», «instant changes») | S3b: da 257 a 410 px in 1-2 fotogrammi; ingranaggio; copia a 0,9 (lettura del codice) |
| A5 | Nessun elemento compare o sparisce al posto finale senza almeno 3 fotogrammi intermedi di opacità o trasformazione, per gli elementi delle schede 4, 9, 10 e 11 | `analyze.cjs` («opacity flashes», «instant changes»); provini dello screencast (`provini.cjs`) come prova visiva | Widget rimosso e ripristinato, atterraggio, avviso in uscita, ingranaggio, anello |
| A6 | Layout-shift 0 in tutte le scene | `PerformanceObserver('layout-shift')` della sonda | Sistema 0,29-0,34; frecce 0,24-0,37; chiusura del foglio 0,02-0,06 |
| A7 | Riscontro sull'elemento toccato entro 2 fotogrammi (≤ 22 ms dal `pointerdown`) **sui comandi**; il vuoto della pagina è escluso (P9: il suo primo riscontro è lo scatto). Swipe che parte da un «+»: nessun lampo, al massimo una pressione che rientra con transizione. Foglio in movimento entro 150 ms dal rilascio **solo dopo ISSUE-112**; prima, entro il blocco misurato di `showModal()` più 2 fotogrammi | `timeline.cjs`: tempo dal segno del tocco al primo cambio dell'elemento; scenari TAP e SW per il lampeggio | Foglio visibile dopo 361-380 ms |
| A8 | Tocco breve (80, 250 e 400 ms) sul vuoto o su un «+»: **0 fotogrammi** con la pagina sotto scala 1 | Serie di `scale` di `.aca-pager__body` | Oggi la pagina si rimpicciolisce da 60 ms |
| A9 | Ordine rispettato: gli inizi effettivi delle transizioni (`transitionstart`, non `transitionrun`, che scatta alla creazione e prima del ritardo) e il primo fotogramma con il valore cambiato nella serie della sonda seguono l'ordine e gli sfasamenti delle tabelle con una tolleranza di ±1 fotogramma, a partire dal T0 della scena | `timeline.cjs` | Non misurato |
| A10 | Nessun `transitioncancel` non voluto (O3); le celle «+» ripartono entro **un fotogramma** dalla fine della chiusura (O4 di REP-20261022-002, invariato) | `o34.cjs` | O3 raggiunto; O4 a 92 ms |
| A11 | Sagoma: nessuna callback degli osservatori dei widget durante il gesto; 0 fotogrammi con il contenuto vecchio nella scatola nuova; 0 fotogrammi con la scatola del contenuto a misura 0 | Contatore nuovo nella sonda (da scrivere); test mirato della dimensione definita | Non misurato |
| A12 | Movimento ridotto: nessuna trasformazione animata, solo opacità ≤ 120 ms; A2 e A6 valgono anche qui. **Eccezioni ammesse** e non valutate da A4: la sagoma che cambia misura di cella in cella; la vista pagine che si apre e si chiude con le schede già alla scala finale; le schede che cambiano posto senza traslazione (scheda 12). Si misura solo l'assenza di trasformazioni animate | Scenari S8 estesi | I blocchi restano (S8) |
| A13 | Scorrimento non peggiore della 0.9.26 (O5) | `camp.sh` SW1-SW3 e JUMP con `agg.cjs` | Non rispettato in Z (punto 1 della 0.9.28) |

**Regola statistica**, la stessa di REP-20261022-002:

- 5 giri alternati, con il giro 0 tenuto a parte;
- mediana con l'intervallo [min-max];
- «migliore» o «peggiore» solo se gli intervalli non si sovrappongono.

Per le soglie assolute (A1, A3, A8) vale il valore peggiore dei 5 giri, non la mediana.

## Metodo di misura

1. **Strumenti esistenti, usati come nella Tappa Z.**
   - `backup/issue-109/Z/strumenti/`:
     - server dei fixture (`fixture-server.mjs`);
     - campagne alternate base/variante (`camp.sh`, `agg.cjs`);
     - chiusura e celle (`o34.cjs`);
     - pagine saltate a schermo (`vis-m2.cjs`).
   - `backup/animazioni-0.9.25/strumenti/`:
     - sonda per fotogramma (`lib.cjs`): rAF, `longtask`, `layout-shift`, eventi `transition*` e serie di rettangoli e opacità;
     - analisi e confronto (`analyze.cjs`, `trans.cjs`, `timeline.cjs`, `provini.cjs`);
     - passate «light» per gli fps (`run.cjs`);
     - vista pagine (`measure-ov.cjs`).
   - Per il collegamento al tablet vale `backup/strumenti-tablet/LEGGIMI.md`.
2. **Due passate per ogni scenario.**
   - **Con sonda e screencast**, 3 ripetizioni: servono per salti, ordine, layout-shift e prova visiva.
   - **«Light»**, con solo rAF: serve per gli fps e per A1. La sonda dimezza gli fps in modifica, quindi i numeri di A1 vengono **solo** dalle passate «light». **Limite:** i rAF non sono i fotogrammi presentati; quando la traccia del compositore via CDP sarà negli strumenti, A1 userà quella. Le finestre si ancorano al `transitionstart` misurato in una terza passata con una sonda leggera (solo eventi `transition*`, senza serie di rettangoli).
3. **Scenari da aggiungere** al catalogo `scen.cjs` in una tappa futura:

   | Scenario | Cosa prova |
   |---|---|
   | TAP | Tocco sul «+» di 100, 250 e 400 ms; tocco sul vuoto di 250 ms (A8); swipe che parte da un «+» (lampeggio, A7) |
   | RZ | Ridimensionamento con la sagoma: ingrandire, ridurre, «Annulla», tocco sulla cornice senza spostamento, dito più veloce della dissolvenza, `pointercancel` (A1, A2, A4, A11) |
   | RL | Rilascio valido e non valido, «Annulla» della barra: blocco prima del volo (A2) |
   | FR | Frecce della vista pagine, pagina aggiunta e rimossa, scambio indicatore/pillola (A5, A6) |
   | AW | Widget aggiunto dal «+» e dalla vista pagine con pagina piena |
   | RM | Rimozione dalla barra e su «Rimuovi», con il ripristino dalla pillola |
   | SY | Ingresso e uscita da Sistema (A6) |
   | SH | Fogli, con il tempo dal tocco al primo movimento (A7) |
   | DJ | Salto diretto con e senza la dissolvenza di D-M13 |

   **Nuovi elementi da seguire nella sonda:**
   - la sagoma e il contenuto del widget ridimensionato;
   - lo strato delle celle;
   - l'ingranaggio;
   - l'etichetta dell'indicatore;
   - la pillola «Annulla» e l'avviso;
   - gli pseudo-elementi d'ombra di copia e widget (D-M17).
4. **Fotogrammi attesi.** Per ogni transizione: durata / 11,1 ms.
5. **Base e variante.** La base è il bundle del banco in servizio, estratto e servito sui fixture come nella Tappa Z. La variante è il bundle della tappa. Entrambe sono misurate nella stessa sessione.
6. **Regole.**
   - Schermo acceso, app in primo piano, scala 1.
   - Un solo strumento alla volta, mai insieme a suite o browser.
   - Gesti sintetici: alla fine la conferma col dito spetta all'utente.
   - Il telefono è emulato con Chromium software: vale solo per i difetti logici (A4-A6, A8), non per i tempi.
7. **Limite.** Questo passo non ha eseguito misure. Le misure appartengono alle tappe che realizzeranno le proposte approvate e alla misura finale della 0.9.28.

## Comportamenti visibili da approvare

Ogni voce cambia ciò che l'utente vede. Le voci D-M1 e D-M6 nascono dalla richiesta dell'utente; le altre sono proposte dell'agente. Il prefisso D-M (movimento) evita la confusione con le domande D-C di REP-20261023-004.

| ID | Cambio | Oggi | Proposta dell'agente | Note |
|---|---|---|---|---|
| D-M1 | Contatore della pressione sul vuoto e sul «+» | La pagina si rimpicciolisce da 60 ms | Nessun riscontro sulla pagina fino allo scatto (500 ms); allo scatto vibrazione e scena della scheda 1 | **Chiesto dall'utente** il 2026-10-23. Resta da confermare solo la soglia, oggi 500 ms e invariata. Realizzazione in un altro passo della 0.9.28. |
| D-M2 | Scheda della vista pagine tenuta per il riordino | Si rimpicciolisce in modo progressivo da 60 ms | Stessa regola di D-M1: nessun riscontro fino allo scatto, poi il sollevamento | Estensione dell'agente per coerenza: l'utente ha parlato della pagina, non delle schede. |
| D-M3 | Ordine della scena «vista pagine» | Caselle in 180 ms insieme alla scala; barra dopo 180 ms | Movimento dopo il blocco (due tempi, P1); caselle per prime (100) e **già uscite** quando la pagina si muove (scala a +80), indicatore a +120, barra a +160, comandi a +200 | Rende esplicito il ruolo delle caselle che l'utente descrive. Lo stacco di 80 ms è l'eccezione dichiarata di P4. |
| D-M4 | Riscontro del «+» | Glifo a 0,94 solo durante `:active` (con il ritardo del «show press» di Chrome Android) | Classe di pressione a `pointerdown`: pozzetto premuto e glifo a 0,94 fino alla partenza del foglio; tolta con transizione su `pointercancel` o oltre 14 px | Copre l'attesa del foglio. Uno swipe che parte da un «+» mostra una pressione breve che rientra. |
| D-M5 | Fogli | 240 ms in entrata e in uscita; contenuto costruito prima; nella chiusura il contenuto si svuota | Entrata 280 ms ease-out, uscita 200 ms ease-in; ossatura durante la salita e contenuto **solo dopo l'arrivo**; contenuto congelato in uscita | Legato a ISSUE-112: gli obiettivi di 100 e 150 ms valgono solo dopo. |
| D-M6 | Ridimensionamento con la sagoma | Il contenuto segue la misura dal vivo (REP-20261007-027) | Sagoma senza contenuto, attivata al primo cambio di cella (non al contatto); la prima misura aspetta fino a 100 ms che il contenuto sia uscito; il contenuto torna alla fine con una dissolvenza di 200 ms; anello e pallini restano; nessuna icona del tipo | **Chiesto dall'utente** «se può favorire le prestazioni»: si tiene solo se A1 e A11 lo confermano. Va confermata anche la lettura di «comparsa delle icone» (ridimensionamento o dettagli). |
| D-M7 | Sagoma piatta, senza l'ombra in rilievo, durante il gesto | — | Solo se A1 non si raggiunge con la faccia normale | Cambia l'aspetto durante il gesto (ADR-0011). |
| D-M8 | Atterraggio della copia | La copia sparisce e il widget è già al suo posto | La copia vola fino alla cella in 200 ms; il rilascio non valido torna in 240 ms. Il nuovo layout si committa all'atterraggio: la copia resta ferma sulla cella per la durata del blocco (oggi 120 ms) prima dello scambio, e «+», anello e pallini arrivano dopo | La sosta sulla cella è visibile. |
| D-M9 | Copia sollevata in uso | Nasce a 0,9 sopra un widget a 1 e sale a 1,04 in 150 ms | Nasce alla scala del widget (1) e sale a 1,04 come oggi: cambia solo il punto di partenza | Correzione di un salto, valutata dalla lettura del codice e non misurata. |
| D-M10 | Rimozione e ripristino | Senza transizione (F-13) | Uscita in 160 ms (scala 0,92 e opacità); rientro in 240 ms; «+» delle celle sfasati | ISSUE-113. |
| D-M11 | Widget aggiunto | Compare subito selezionato, con i pallini in 160 ms | Due scene: prima il foglio scende (200), poi da +160 il widget entra (240) con anello (+40), pallini (+60) e barra (+100) sfasati; circa 620 ms dal primo fotogramma dopo il blocco | La selezione chiesta dall'utente il 2026-10-23 resta. |
| D-M12 | Sistema | Cambio istantaneo con `display: none` del launcher | Dissolvenza con un piccolo spostamento (240 ms in entrata, 160 in uscita); Sistema montato a opacità 0 prima del movimento; all'uscita il launcher si riattiva sotto Sistema opaco e Sistema esce dopo il blocco; launcher saltato ma non smontato. **La latenza si allunga:** tra il tocco e il primo movimento circa 150 ms più 2 fotogrammi, con il solo ingranaggio premuto | ISSUE-110; serve una misura sugli osservatori. |
| D-M13 | Salto diretto | Istantaneo (D-2) | **Non consigliato come predefinito.** Breve dissolvenza (100 + 160 ms) da provare solo se l'utente trova brusco il salto | Rispetta «nessuna pagina intermedia». |
| D-M14 | Pillole, avvisi e dettagli | Vedi le schede 10 e 11 | «Annulla» esce in 160 ms; toast in uscita 160 ms; avviso di connessione 240/160 ms; ingranaggio 160 ms; anello in 120 ms; etichetta dell'indicatore senza salto; «Rimuovi» senza salto di larghezza | ISSUE-113. |
| D-M15 | Schede accanto come sagome durante l'apertura della vista pagine | Contenuto sempre disegnato | **Non consigliata ora.** Contraddice la condizione di ADR-0018 («nessuna scheda vuota nell'uso normale»). Da considerare solo se la misura mostra che le schede accanto causano i fotogrammi oltre 22 ms, e con una nuova decisione dell'utente. | — |
| D-M16 | Durate e curve raccolte in token | Valori sparsi nei fogli | I ruoli della tabella di P2: le uscite si accorciano (per esempio «Annulla» da 300/200 a 160 ms) | Ogni variazione di durata è un cambio visibile da confermare a vista. |
| D-M17 | Ombre di copia, widget e volo | `box-shadow` animato (copia 150 ms; widget 120 ms e ritorno 220 ms) | Ombra a riposo su uno pseudo-elemento; si anima solo la sua opacità, come la scheda sollevata (`launcher.css:339`) | Forma a riposo invariata (ADR-0011); durante la transizione l'ombra sfuma invece di allargarsi: va confermato a vista. |
| D-M18 | Pressione lunga durante la chiusura della vista pagine | Da verificare: oggi non è disattivata (`LauncherScreen.tsx:1116`) | Ignorata fino alla fine dell'assestamento | Una pressione in quel momento non fa nulla. |
| D-M19 | Due fogli in sequenza | Da verificare | Il secondo parte quando il primo è uscito per metà (circa 100 ms di sovrapposizione) | — |
| D-M20 | Ritorno delle caselle dopo la chiusura | 240 ms, `cubic-bezier(0.22, 1, 0.36, 1)` | 180 ms ease-out | Più rapido. |
| D-M21 | Angolo della scheda nella chiusura | Quadrato all'istante all'inizio della chiusura (`launcher.css:277`) | Raggio della vista pagine fino alla fine, poi quadrato quando la scheda copre lo schermo; in alternativa raggio che segue la scala su un livello di ritaglio, se la misura lo regge | Oggi è un cambio senza fotogrammi intermedi su una scheda piccola. |
| D-M22 | Widget aggiunto con la pagina piena | Da verificare | Scorrimento automatico verso la pagina con spazio prima della comparsa | — |
| D-M23 | Sagoma dei widget senza cornice | Nessuna faccia: il widget senza cornice non ha superficie | Durante il ridimensionamento un pozzetto con il raggio della cella | Cambia l'aspetto durante il gesto, come D-M7 (ADR-0011). |
| D-M24 | Vista pagine: frecce, scambio indicatore/pillola, pagine aggiunte e rimosse (scheda 12) | Frecce con layout-shift 0,24-0,37; scambio indicatore/pillola istantaneo (`hidden`); pagine aggiunte e rimosse da verificare | Scorrimento di un passo senza layout-shift (240); scambio in sequenza 120 + 240 ms; scheda nuova che entra, scheda rimossa che esce prima del commit e riga che si richiude | — |
| D-M25 | Inizio delle scene dopo il blocco (meccanismo in due tempi) | Le transizioni partono nel ricalcolo del commit e il blocco ne consuma l'inizio | Il movimento parte 1-2 fotogrammi dopo la fine del blocco, completo dall'inizio; nel frattempo resta solo il riscontro locale | Il tempo totale dal tocco alla fine della scena cresce di circa 2 fotogrammi; il movimento visibile diventa completo. |

## Relazione con le versioni dei widget per dimensione

L'utente vuole programmare in seguito un lavoro per realizzare le versioni di ogni widget per dimensione (1×1, 1×2, 2×1 …). Non è pianificato qui. Le relazioni con la coreografia sono queste, tutte valutazioni dell'agente:

1. **Si completano.** Con versioni distinte per dimensione, gli stati intermedi di un ridimensionamento non hanno senso. La sagoma evita di disegnarli: al rilascio la dissolvenza mostra direttamente la versione della misura finale. Il lavoro sulle versioni non deve quindi curare alcuna transizione tra una versione e l'altra.
2. **La sagoma non dipende dalle versioni.** È la faccia della cornice comune. Una versione potrà in seguito fornire una propria sagoma leggera, per esempio la posizione dell'icona e del valore, senza cambiare la coreografia.
3. **Ordine consigliato:** prima la sagoma, poi le versioni. Fatte prima le versioni, ognuna andrebbe resa presentabile mentre cambia misura, cioè il lavoro che l'utente vuole evitare.
4. **Altri punti di contatto, per dopo:**
   - la copia trascinata tra pagine con celle diverse, che mostrerebbe la versione d'arrivo solo all'atterraggio;
   - le anteprime per dimensione del foglio «Aggiungi un widget»;
   - la misura: ogni versione più ricca va rimisurata con A1 e A11 sulla pagina più pesante.

## Rischi e limiti

- **Solo valutazioni.** Tutti i tempi proposti sono valutazioni. In questo passo non è stato misurato nulla e non sono stati usati né browser né tablet.
- **La sagoma potrebbe non bastare.** Il suo cambio di misura anima ancora `width` e `height` di una scatola, con il disegno della faccia a ogni fotogramma. Se A1 non si raggiunge, restano D-M7 o la variante con `scale` e gli angoli deformati.
- **Le scene si allungano.** Lo sfasamento allunga la scena di 40-200 ms rispetto a oggi e il meccanismo in due tempi aggiunge circa 2 fotogrammi dopo il blocco; ogni scena resta entro circa 550 ms dal suo T0, salvo le due scene in sequenza del widget aggiunto (circa 620 ms, D-M11).
- **Un salto di layout possibile a fine gesto.** `content-visibility: hidden` sul contenuto dei widget e sul launcher coperto da Sistema ha lo stesso dubbio di ADR-0018 (H4): gli osservatori potrebbero notificare in ritardo. La sagoma lascia per questo due fotogrammi prima della dissolvenza. Va provato.
- **Il blocco a T0 resta.** Cambiare l'ordine non riduce il costo del cambio di stato (A2, O1): lo sposta fuori dal movimento. Senza le riduzioni di ISSUE-109 la scena partirà comunque 100-200 ms dopo lo scatto.
- **Gesti sintetici.** Le misure sul tablet usano gesti sintetici; la conferma col dito spetta all'utente.
- **Lavoro concorrente.** Altri passi della 0.9.28 cambiano `Pager.tsx` e `LauncherScreen.tsx` (scorrimento, pressione, pila). I numeri di riga citati valgono per la lettura di oggi.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Lettura delle misure | REP-20261022-001, REP-20261022-002 («Diagnosi», «Tappa Z», «Esito del blocco»), ADR-0018 | Eseguito | Numeri riportati con la fonte; nessun nuovo calcolo. |
| Lettura del codice | File elencati in «Fonti», in sola lettura | Eseguito | Inventario con i riferimenti alle righe. Due difetti dedotti dal codice e non misurati: la pagina in `is-pressing` per ogni bersaglio che non sia un widget; la copia che nasce a 0,9 in uso. |
| Misure, browser, tablet | — | Non eseguito | Fuori dal perimetro di questo passo. |
| Test, tipi, lint | — | Non eseguito | Nessun codice modificato. |
| Copia PRIMA | `cp` dell'indice in `backup/v0928/pre/coreografia/reports-README.md` | Eseguito | SHA-256 uguale all'originale prima della modifica. |
| Copia PRIMA della critica (2026-10-23) | `Copy-Item` del report in `backup/v0928/pre/coreografia-critica/` | Eseguito | SHA-256 `507185a8…caf83`, uguale al report prima delle rettifiche. |
| Verifica dei rilievi sul codice (2026-10-23) | Lettura di `launcher.css` (`:245`, `:277`, `:537`, `:565`, `:571`, `:843`, `:847`, `:989`), `LauncherPage.tsx:158-182`, `FlashingPageIndicator.tsx:36-43` | Eseguito | I fatti citati dai rilievi corrispondono al codice letto; nessuna misura. |
| Controllo del diff | `git status` sui file toccati | Eseguito | Nuovo questo report; modificato `reports/README.md` (una riga). |

## Controllo del diff e decisioni

- **Diff:** il nuovo report e una riga nell'indice. Il codice, gli ADR, `design.md` e `project-status.md` non sono toccati: lo stato degli incarichi della 0.9.28 lo aggiorna il passo che chiude la versione.
- **Nessun ADR creato.** La coreografia riguarda la presentazione. Dopo l'approvazione si aggiorna `design.md` con i tempi e le sagome approvati. Per Sistema senza `display: none` (D-M12) si valuta se annotare ADR-0018, che oggi riguarda solo le pagine.
- **Decisioni umane citate:**
  - il contatore della pressione;
  - la sagoma condizionata al beneficio;
  - D-2 «Salto diretto»;
  - D-3 (schede vuote nello scorrimento molto veloce);
  - la selezione del widget aggiunto (2026-10-23).

  Le altre voci sono proposte non autorizzate.

## Chiusura e punto di ripresa

- **Stato:** proposta completata; nessun incarico di realizzazione nasce da questo documento.
- **Prossimo passo:** le risposte dell'utente a D-M1…D-M25. Poi la realizzazione per gruppi indipendenti, ciascuno con i suoi obiettivi A e una misura base/variante sul tablet:
  1. pressione (D-M1, D-M2: già in corso nella 0.9.28 per D-M1);
  2. ordine della vista pagine (D-M3);
  3. «+» e fogli (D-M4, D-M5);
  4. sagoma (D-M6, D-M7);
  5. rilascio, rimozione e widget aggiunto (D-M8…D-M11);
  6. Sistema (D-M12);
  7. pillole e avvisi (D-M14);
  8. token (D-M16);
  9. ombre a opacità (D-M17), da fare insieme ai gruppi 4 e 5;
  10. vista pagine: frecce, pagine, indicatore e pillola, angolo (D-M18, D-M20, D-M21, D-M24), insieme al gruppo 2.

  D-M19 va con il gruppo 3, D-M23 con il 4, D-M22 con il 5; D-M25 (due tempi) vale per tutti i gruppi.

  Alla fine, la misura complessiva e la prova col dito dell'utente sul Tab M11.
- **Input necessari:**
  - le risposte alle voci D-M;
  - la conferma della lettura di «comparsa delle icone durante l'ingrandimento»;
  - il permesso di usare il tablet per le misure nelle tappe di realizzazione.
- Per il commit che includerà il report usare `git log -- documentazione/reports/REP-20261023-006-coreografia-animazioni.md`.

## Rettifiche dopo la critica

**2026-10-23.** Una revisione critica dello stesso flusso ha prodotto 21 rilievi. Il documento è stato corretto in place prima della consegna all'utente, con copia PRIMA in `backup/v0928/pre/coreografia-critica/REP-20261023-006-coreografia-animazioni.md` (SHA-256 `507185a8…caf83`). Le correzioni sono ancora proposte e valutazioni dell'agente, senza misure.

| # | Rilievo (gravità) | Esito | Dove |
|---|---|---|---|
| 1 | Sfasamenti consumati dal blocco del commit (alta) | Applicato: meccanismo in due tempi (commit, poi classe di scena in un rAF doppio); T0 = primo fotogramma dopo il blocco; Ts per l'evento | P1, convenzione, schede 1, 2, 4b, 8, 9, 12; A1, A2, A9; D-M25 |
| 2 | Commit durante il volo nel rilascio e nella rimozione (alta) | Applicato: volo su livello statico verso la cella calcolata prima e commit all'atterraggio; per le entrate commit prima e movimento dopo; A2 esteso al rilascio | Scheda 4b, A2, scenario RL, D-M8 |
| 3 | `box-shadow` ancora animato (alta) | Applicato: elencato tra le proprietà costose, proposta dell'ombra come pseudo-elemento a opacità | Inventario, P1, schede 4a e 4b, D-M17 |
| 4 | Sistema non realizzabile senza lavoro durante il movimento (alta) | Applicato: fase PRIMA per ingresso e uscita, smontaggio alla fine composta, latenza dichiarata | Inventario, scheda 8, D-M12 |
| 5 | Tempi dei fogli incoerenti con `showModal()` (alta) | Applicato: obiettivi di 100 e 150 ms condizionati a ISSUE-112; contenuto solo dopo l'arrivo | Schede 3 e 7, A7, D-M5 |
| 6 | La sagoma lampeggia a ogni tocco (alta) | Applicato: avvio al primo cambio di cella o oltre 14 px; prima misura ritardata fino a 100 ms; mai nascondere di colpo | Scheda 5, sagoma punto 2, D-M6 |
| 7 | Fine della sagoma e dei fogli solo su `transitionend` (media) | Applicato: segnale composto con tetto; durata 0 e misura invariata; test mirato | P1, schede 5, 7, 8, sagoma punto 3 |
| 8 | Salto con `content-visibility: hidden` (media) | Applicato: dimensione definita o `contain-intrinsic-size` con test; dissolvenza dopo il commit degli osservatori; A2 sulla fine del ridimensionamento | Scheda 5, sagoma punti 2 e 3, A2, A11 |
| 9 | A4 incompatibile con le curve (media) | Applicato: A4 riformulato rispetto alla curva attesa, con un salto massimo assoluto | A4 |
| 10 | A9 misura `transitionrun` (media) | Applicato: `transitionstart` e primo fotogramma con il valore cambiato | A9 |
| 11 | A1 misura i rAF, non i fotogrammi (media) | **Applicato in parte.** La traccia del compositore via CDP è indicata come fonte preferita, ma non esiste negli strumenti di `backup/`: scriverla è lavoro di una tappa di misura, fuori da questo passo senza browser. Fino ad allora A1 resta sui rAF con il limite dichiarato; finestre ancorate a `transitionstart` | A1, metodo punto 2 |
| 12 | Sfasamenti di P4 e durata delle scene (media) | Applicato: offset della scheda 1 a 40 ms (con lo stacco di 80 ms dichiarato); scheda 9 divisa in due scene entro 550 ms ciascuna, totale dichiarato | P4, schede 1 e 9, D-M3, D-M11 |
| 13 | Caselle non ancora uscite quando la pagina si muove (media) | Applicato: caselle 0 · 100, scala da +80 | Scheda 1, D-M3 |
| 14 | Pressione del «+» con `:active` (media) | Applicato: classe a `pointerdown`, tolta con transizione su `pointercancel` o oltre 14 px; lampeggio misurato | Scheda 3, A7, scenario TAP, D-M4 |
| 15 | Interazioni mancanti (media) | **Applicato in parte.** Aggiunte: frecce, scambio indicatore/pillola, pagine aggiunte e rimosse (scheda 12); scorrimento delle schede durante l'apertura (scheda 1); `pointercancel` e secondo dito nel ridimensionamento (scheda 5); rotazione e background (P10, scheda 13); ingresso in modifica da un widget in uso (scheda 4a). **Non coreografate le interazioni dentro una pila:** il comportamento interno delle pile non è stato letto in questo passo e il punto 2 della 0.9.28 (pila vuota di Multimedia) le sta cambiando in un altro passo dello stesso flusso; una coreografia scritta ora rischierebbe di descrivere codice superato. La pila come blocco segue le regole del widget (scheda 4b). Da riprendere dopo la chiusura del punto 2. | Schede 1, 4a, 4b, 5, 12, 13; P10 |
| 16 | Cambi visibili assenti da D-M (media) | Applicato: D-M18 (pressione ignorata in chiusura), D-M19 (fogli in sequenza), D-M23 (pozzetto dei widget senza cornice), D-M22 (scorrimento automatico), D-M20 (caselle 240 → 180), D-M21 (angolo) | D-M18…D-M23 |
| 17 | O4 rilassato senza decisione (media) | Applicato: A10 torna a «un fotogramma», O4 invariato | A10, scheda 2 |
| 18 | «Angolo subito quadrato» (bassa) | Applicato: lo stato attuale (quadrato all'istante, `launcher.css:277`) è corretto nell'inventario; proposta di squadrare alla fine o con un livello di ritaglio | Inventario, scheda 2, D-M21 |
| 19 | Errori fattuali nell'inventario (bassa) | Applicato: la copia sale a 1,04 già oggi; l'indicatore compare subito e resta circa 2 s; D-M9 ridotto alla sola nascita a 1 | Inventario, D-M9 |
| 20 | P9 contro D-M1 sul vuoto (bassa) | Applicato: vuoto escluso da P9 e A7 per decisione dell'utente; primo riscontro = scatto | P9, A7 |
| 21 | Movimento ridotto non coperto da A4 e A12 (bassa) | Applicato: eccezioni elencate in P8 e A12 | P8, A12, schede 1, 5 |

## Risposte dell'utente (2026-10-23)

Risposte alle voci D-M1…D-M25, date in chat il 2026-10-23 mentre l'utente mostra la 0.9.27 al titolare. Le citazioni sono testuali; l'interpretazione è dell'agente principale del flusso e prevale solo dove una riga lo dice. Le risposte prevalgono sulle proposte delle tabelle sopra: dove una tabella dice altro (oscillazione della scheda sollevata, abbassamento e rotazione del «+», scivolamenti, sagoma condizionata a A1), vale questa sezione.

| Gruppo | Voci | Risposta dell'utente | Interpretazione dell'agente |
|---|---|---|---|
| Pressione e vista pagine | D-M1, D-M2, D-M3, D-M4, D-M18, D-M20, D-M21, D-M24 | «evitiamo shake e movimenti, sfruttiamo invece il rimpicciolire e ingrandire, al tap col + rimpiccioliamo il quadrato e al diminuire della pagina già abbiamo definito l'animazione subito dopo l'hold, se si tiene premuta la pagina nella schermata per spostarla la facciamo ingrandire. Questi ingrandimenti piccoli non superiori o inferiori al 10%» (risposta alla domanda sulla soglia: «va bene la soglia di 0,5 secondi?»; il resto del gruppo, come proposto, è approvato) | Nessuno scuotimento, oscillazione, rotazione o spostamento decorativo nei riscontri: si tolgono la rotazione del «+» e l'abbassamento introdotti nella parte 1 e l'oscillazione delle schede sollevate. Solo scale entro ±10 %: tocco sul «+» = la casella scende a circa 0,93 finché il foglio parte; scheda tenuta nella vista pagine = alla soglia sale a circa 1,05. Entrate e uscite di pagine ed elementi con scale entro il 10 % più dissolvenza, invece di scivolamenti. Restano solo gli spostamenti necessari: passo delle frecce nella vista pagine, volo del widget nella casella, scorrimento delle pagine. Soglia della pressione 500 ms invariata. |
| Fogli e Sistema | D-M5, D-M12, D-M19 | «va bene» | Approvati come proposti: fogli 280 ms in entrata e 200 in uscita, contenuto solo all'arrivo; Sistema con dissolvenza e piccolo scorrimento (240/160 ms); sovrapposizione di circa 100 ms tra due fogli. |
| Widget | D-M6…D-M11, D-M17, D-M22, D-M23 | Alla domanda sulla «comparsa delle icone»: «comparsa delle caselle col +». Sulla sagoma: «immaginavo la sagoma piatta con i bordi che al posto di essere solidi sono spezzettati». Il resto è approvato. | La «comparsa delle icone» riguarda le celle «+» che compaiono o spariscono mentre il widget viene ridimensionato: vanno rifatte con dissolvenza e scale entro il 10 %, nessuna comparsa di colpo. La sagoma è **sempre** piatta, senza ombra, con bordo tratteggiato, non solo se A1 fallisce; vale anche per i widget senza cornice (D-M7 e D-M23 diventano la regola, non un ripiego). |
| Generali | D-M14, D-M16, D-M25 | «perfetto» | Approvati come proposti. |
| Escluse | D-M13, D-M15 | «perfetto» alla loro esclusione | Non si realizzano: il salto diretto resta istantaneo; le schede accanto restano disegnate durante l'apertura della vista pagine (ADR-0018). |

**Nota sulla realizzazione.** Il blocco 1 (pressione e vista pagine), il blocco 2 (fogli, Sistema, pillole e avvisi) e il blocco 3 (widget) sono stati realizzati il 2026-10-23, senza tablet, banco né Docker; vedi «Blocco 1 della realizzazione», «Blocco 2 della realizzazione» e «Blocco 3 della realizzazione».

## Blocco 1 della realizzazione (2026-10-23): pressione e vista pagine

**Autore.** Claude Code, subagente di un flusso di lavoro (modello: claude-sonnet-5-5), sul working tree che contiene la 0.9.27 e la parte 1 della 0.9.28 (scorrimento, pila vuota, pressione con soglia). **Perimetro.** D-M16, D-M25 e D-M1, D-M2, D-M3, D-M4 (rivisto), D-M18, D-M20, D-M21, D-M24, con le risposte sopra. **Esclusi** dal blocco: fogli e Sistema (D-M5, D-M12, D-M19), widget (D-M6…D-M11, D-M17, D-M22, D-M23), pillole e avvisi oltre la pillola «Annulla» della vista pagine (D-M14). Nessun commit, nessuna dipendenza nuova, nessun tablet, banco o Docker, nessuna misura. Copie PRIMA in `backup/v0928/pre/blocco1/` (css, tsx, themes, tests) e `backup/v0928/pre/blocco1-report/` (questo report prima delle risposte).

### Cosa è cambiato

| Voce | Realizzazione | File | Guardia |
|---|---|---|---|
| D-M16 | Token comuni su `:root`: curve (`--aca-motion-ease-*`), durate per ruolo (`--aca-dur-*`: pressione 120/180, svuotamento 100, scambio 120, uscita 160, entrata 240, ritorno delle caselle 180, sollevamento 150, barre 360/240 e 240/200, scena 360, fogli 280/200, ridotto 120), sfasamento `--aca-stagger` (40 ms) e le tre scale `--aca-scale-press` 0,93, `--aca-scale-lift` 1,05, `--aca-scale-enter` 0,92. Le barre, l'indicatore, la pillola «Annulla», le caselle, le schede e i comandi sotto le schede li usano. **Non ancora** nei fogli, nei toast e nei widget (blocchi successivi): i token per quei ruoli ci sono. | `themes/acasystem/tokens.css`, `launcher.css`, `edit.css`, `pageIndicator.css` | `MotionChoreography.test.ts` |
| D-M25 | Meccanismo in due tempi per l'apertura e la chiusura della vista pagine e per la scheda che entra: lo stato si committa con l'aspetto di prima, la classe di movimento arriva due fotogrammi dopo (`afterNextFrame` con `flushSync` nel secondo). `useStagedScene` decide l'attesa (solo con pager misurato e senza movimento ridotto), `useHeld` tiene l'aspetto di prima per le barre e l'indicatore, `Pager` riceve `staged` e dà la classe `is-overview`/`is-closing` solo alla partenza. Nell'attesa della chiusura non gira alcun timer (altrimenti chiuderebbe una scena non ancora cominciata). | `hooks/launcher/useStagedScene.ts` (nuovo), `Pager.tsx`, `LauncherScreen.tsx` | `SceneStaging.test.tsx` (hook, pager, indicatore); 5 scenari in `LauncherScreen.test.tsx` («staged scene») |
| D-M1 | Già in corso dalla parte 1 (nessun cenno sulla pagina fino alla soglia, 500 ms invariata, vibrazione alla soglia). Aggiunta la guardia della vibrazione. | `useLongPress.ts` (invariato) | `LauncherGestures.test.tsx` |
| D-M2 | Nessun riscontro sulla scheda tenuta nella vista pagine; alla soglia sale a `k × 1,05` in 150 ms, senza oscillazione (tolti `aca-hold-shake-flat` e la regola di `.is-pressing`). | `launcher.css` | `LauncherGestures`, `PagerBands`, `LagLayers`, `MotionChoreography` |
| D-M3 | Ordine dall'istante T0 della scena: caselle fuori in 100 ms (ease-in), schede e ombra a +80 (360), indicatore a +120, barra a +160, comandi sotto le schede a +200 (180). Il ritardo delle schede è una proprietà registrata non ereditata (`--aca-card-delay`), scritta su pagine e corpi e solo mentre la scena corre (`is-entering` 480 ms, `is-closing`). | `launcher.css`, `edit.css`, `pageIndicator.css`, `Pager.tsx` | `MotionChoreography`, `SceneStaging`, `LauncherScreen` («staged scene») |
| D-M4 | Tocco sul «+»: classe `is-pressed` a `pointerdown`; la casella scende a 0,93 (solo `scale`, 120 ms), resta giù fino a che il foglio parte (`transitionstart` di un `.aca-sheet` dopo il clic) o 700 ms dopo il rilascio; rientra in 180 ms. Il dito che si sposta oltre 14 px, o `pointercancel`, la rimette a posto con la transizione. Tolti la rotazione del «+», l'abbassamento (animazione a fotogrammi), la classe `is-tapped` e il 0,94 di `:active` sul glifo. Movimento ridotto: nessuna scala, la casella si attenua a 0,7. | `WidgetGrid.tsx`, `launcher.css` | `LauncherScreen.test.tsx` («a press on a «+»», 4 test), `LauncherGestures`, `MotionChoreography` |
| D-M18 | Una pressione che comincia mentre le schede tornano indietro o le pagine si assestano (o nell'attesa della scena) è ignorata, anche se resta premuta più a lungo; il flag lo scrive il pager in una ref, senza render. | `Pager.tsx` (`busyRef`), `LauncherScreen.tsx` | `SceneStaging`, `LauncherScreen` (scenario D-M18 con riprova a pagine assestate) |
| D-M20 | Caselle di ritorno in 180 ms ease-out (erano 240); in uscita 100 ms. | `launcher.css` | `LagLayers`, `MotionChoreography` |
| D-M21 | Nella chiusura il corpo della scheda non diventa più quadrato all'istante: il raggio della vista pagine resta fino alla fine (si squadra quando la classe `is-closing` cade). È la prima delle due opzioni del report; la seconda (raggio su un livello di ritaglio) non è stata fatta. | `launcher.css` | `LagLayers`, `MotionChoreography` |
| D-M24 | **Frecce:** la scheda spostata da React sta sopra quella che scorre per transizione per tutta la durata (`is-moved`, `z-index: 1`); i comandi sotto le schede sono nascosti per stato, non con `@starting-style`, quindi un nodo spostato non riparte da zero. **Indicatore e pillola:** l'indicatore cede in 120 ms (`aca-indicator--yield`), la pillola entra dopo 60 ms; al ritorno la pillola esce in 160 ms e l'indicatore rientra dopo tre sfasamenti. La pillola entra ed esce con scala 0,92 e dissolvenza, senza scivolamento (erano 300/200 ms con 1 rem). **Pagina nuova:** montata nascosta (opacità 0, scala 0,92), entra due fotogrammi dopo in 240 ms. **Pagina eliminata:** la scheda esce in 160 ms (scala 0,92 e dissolvenza) e solo dopo si committa la rimozione; poi le schede a destra chiudono il vuoto. Con movimento ridotto o pager senza misura si elimina subito. I comandi sotto le schede restano montati (inert) durante la chiusura e svaniscono in 120 ms. | `Pager.tsx`, `LauncherScreen.tsx`, `PageIndicator.tsx`, `FlashingPageIndicator.tsx`, `launcher.css`, `edit.css`, `pageIndicator.css` | `SceneStaging`, `MotionChoreography`, `LauncherScreen` (pagina eliminata) |

Nessuna scala del blocco supera ±10 % (verificato nel testo del CSS). Nessuna rotazione né scuotimento nelle schede, nelle celle, nelle barre e nell'indicatore. Vale ancora, fuori dal blocco: la **copia trascinata di un widget** ha l'oscillazione infinita `aca-hold-shake` (±0,9°) e il widget tenuto in modifica si rimpicciolisce a 0,9 in modo progressivo (`.is-pressing`): sono del blocco dei widget e non sono stati toccati.

### Scelte esecutive e scostamenti dalla specifica

- **Soglia e vibrazione:** invariate (500 ms, 10 ms di vibrazione), come da risposta dell'utente.
- **Attesa della scena solo dove c'è un movimento:** pager misurato e senza movimento ridotto. In jsdom (nessuna misura) e con movimento ridotto la classe arriva col commit, come prima.
- **Chiusura:** il tempo di sicurezza `CLOSING_SAFETY_MS` passa da 410 a 450 ms, perché le schede partono dopo 40 ms; i test dei tempi della chiusura (`PagerOverview`, `PagerRestyle`) sono aggiornati di conseguenza.
- **Pagina nuova:** nessun ritardo di 60 ms oltre ai due fotogrammi; entra in 240 ms. Le schede a destra scorrono dal commit (non dalla classe di scena): il loro movimento non è tenuto dietro il blocco.
- **Frecce:** le due cause note (ordine di sovrapposizione, comandi che ripartono da opacità 0) sono state corrette; il layout-shift 0,24-0,37 di REP-20261022-001 **non è stato rimisurato** e non si può dire risolto.
- **Pillola «Annulla» in basso** (fuori dalla vista pagine): stessa scala e dissolvenza, nessun ritardo.
- **D-M16 parziale:** i valori delle altre scene (fogli, toast, widget) restano come sono fino ai loro blocchi.
- **Rientri a capo:** i file toccati con strumenti Windows sono stati riportati a fine riga LF come nel repository (nessun cambio di contenuto altrove).

### Verifiche

| Controllo | Esito |
|---|---|
| `npm run typecheck` (`tsc -p tsconfig.strict.json --noEmit`, test compresi) | Eseguito, verde. |
| `npm run lint` (eslint `src`), `npm run lint:typography`, `npm run lint:theme-colors` | Eseguiti, verdi (0 violazioni; tipografia 516 file, colori 341). |
| `prettier --check` sui file toccati | Eseguito, verde. |
| `vitest run --maxWorkers=4` su 42 file pertinenti (vista pagine, pager, launcher, barre, indicatore, gesti, kit, fogli, trascinamento, pile) | Eseguito: 42 file, 893 test verdi. I file nuovi sono `SceneStaging.test.tsx` (19) e `MotionChoreography.test.ts` (21); aggiornati `LauncherGestures`, `LagLayers`, `PagerBands`, `PagerOverview`, `PagerRestyle`, `EditToolbarHidden`, `LauncherScreen`. |
| Suite completa, backend, build, i18n | **Non eseguiti** (incarico: solo test mirati). |
| Misure sul Tab M11, A1-A13, prova col dito | **Non eseguite** (fuori dal perimetro del blocco: niente tablet, banco, Docker). Il vantaggio reale della messa in scena sui fotogrammi e il costo di `:has()` per l'indicatore sono ipotesi da misurare. |

### Punto di ripresa

Prossimi blocchi, in ordine: fogli e Sistema (D-M5, D-M12, D-M19, con ISSUE-112); widget (D-M6…D-M11, D-M17, D-M22, D-M23: la sagoma sempre piatta e tratteggiata, le celle «+» che compaiono e spariscono nel ridimensionamento con dissolvenza e scala entro il 10 %, il volo nella casella, l'ombra su pseudo-elemento, e l'oscillazione della copia trascinata da togliere); pillole e avvisi (D-M14 oltre quanto fatto qui). Poi la misura base/variante sul tablet con gli scenari TAP, FR e della vista pagine e la prova col dito dell'utente.

## Blocco 2 della realizzazione (2026-10-23): fogli, Sistema, pillole e avvisi

**Autore.** Claude Code, subagente di un flusso di lavoro (modello: claude-sonnet-5-5), sul working tree che contiene la 0.9.27, la parte 1 della 0.9.28 e il blocco 1. **Perimetro.** D-M5, D-M12, D-M19, D-M14 (uscite più rapide; nessun salto di larghezza dell'etichetta dell'indicatore e di «Rimuovi»), con i token del blocco 1 (D-M16) e il meccanismo in due tempi (D-M25) dove si applica. Risposte dell'utente: D-M5, D-M12, D-M19 «va bene»; D-M14 «perfetto». **Esclusi:** widget (D-M6…D-M11, D-M17, D-M22, D-M23), l'anello della selezione in 120 ms (serve uno stato di uscita della selezione: va col blocco dei widget), la nuvoletta UI-010 (invariata per decisione dell'utente), ISSUE-112 (meccanismo del foglio). Nessun commit, nessuna dipendenza nuova, nessun tablet, banco o Docker, nessuna misura. L'informativa AI (`AiDevelopmentNotice.tsx`, `aiDevelopmentNotice.css`, `ai-development.svg` e le due righe in `SystemLayout.tsx`) non è stata toccata. Copie PRIMA in `backup/v0928/pre/blocco2/` (css, tsx, tests, doc).

### Cosa è cambiato

| Voce | Realizzazione | File | Guardia |
|---|---|---|---|
| D-M16 (token nuovi) | `--aca-dur-veil-in/out` (200/160), `--aca-dur-content-in` (160), `--aca-dur-toast-in` (200), `--aca-dur-system-in/out` (240/160), `--aca-scale-page` (0,96), `--aca-z-overlay` (250, sopra le barre e sotto i fogli). Gli orari che il codice aspetta (`SHEET_IN_MS`, `SHEET_OUT_MS`, `SYSTEM_IN_MS`, `SYSTEM_OUT_MS`, `TOAST_EXIT_MS`, `NOTICE_EXIT_MS`, `LABEL_SWAP_MS`) sono uguali ai token e un test lo verifica. | `themes/acasystem/tokens.css` | `MotionChoreographyBlock2.test.ts` |
| D-M5, entrata | Il pannello sale in 280 ms ease-out (regola dello stato aperto), con il velo in 200 ms. Mentre sale mostra la struttura: intestazione, e corpo e piè di pagina a opacità 0 e senza puntatore. All'arrivo (`transitionend` di `transform` sul dialogo, o tetto di 280 ms più due fotogrammi) il primitivo mette `data-arrived` e il contenuto compare in 160 ms. Con movimento ridotto, o dove non si anima, il contenuto è subito presente. | `Sheet.tsx`, `components.css`, `utils/launcher/motion.ts` (nuovo) | `SheetSystemChoreography` («the structure first…»), `MotionChoreographyBlock2` |
| D-M5, uscita | Il pannello scende in 200 ms ease-in (regola dello stato chiuso), il velo sfuma in 160 ms, e il pannello che scende non riceve il puntatore. **Contenuto congelato:** per tutta l'uscita titolo, descrizione, contenuto e piè di pagina sono quelli dell'ultimo render aperto, anche se il proprietario ha già azzerato il suo stato (T-04); si rilasciano alla fine composta (`transitionend`/`transitioncancel` di `transform`, `opacity` o `display` del dialogo, o tetto di 200 ms più due fotogrammi). Il congelamento sta nel primitivo, quindi vale per tutti i fogli, senza toccarli uno per uno. Con movimento ridotto il pannello sfuma in 120 ms lineari. | `Sheet.tsx`, `components.css` | `SheetSystemChoreography` («the content stays until the panel is gone»), `MotionChoreographyBlock2` |
| D-M19 | Due fogli di seguito: il secondo si apre quando il primo è uscito per metà (circa 100 ms di sovrapposizione). Il primitivo ricorda quando l'ultimo foglio ha cominciato a uscire; l'attesa non supera mai metà dell'uscita. Un foglio chiuso prima del suo turno non si apre. Senza animazioni (jsdom) si apre nello stesso commit, come prima. | `Sheet.tsx` | `SheetSystemChoreography` («two sheets in a row») |
| D-M12 | **Sistema è una scena.** Un livello `position: fixed` sopra il launcher (`.aca-overlay-scene`, con il suo scorrimento). Ingresso: Sistema si monta trasparente e a scala 0,96 mentre il launcher resta visibile e invariato (`wait`), due fotogrammi dopo sfuma e cresce in 240 ms ease-out (`in`), alla fine (`transitionend` di `opacity` o tetto) il launcher viene coperto e fermato (`hidden`, widget fermi tramite `PageVisibilityContext`). Uscita: il launcher torna visibile e i widget si riattivano **sotto Sistema ancora opaco** (`out-wait`, qui cade il blocco del ritorno), due fotogrammi dopo Sistema sfuma e si rimpicciolisce in 160 ms ease-in (`out`) e si smonta alla fine. Un nuovo tocco durante l'uscita lo riporta dal valore corrente; un'uscita a metà dell'ingresso torna indietro da dove è. Solo `opacity` e `scale`, nessuno scivolamento (era 16 px nella specifica: sostituito, secondo la risposta dell'utente). Movimento ridotto: dissolvenza di 120 ms, senza scala. La Casa 3D resta come prima (nessun livello, sostituisce il launcher subito). | `hooks/launcher/useOverlayScene.ts` (nuovo), `LauncherPage.tsx` (`overlayStaged`), `AppRoutes.tsx`, `appShell.css` | `SheetSystemChoreography` («Sistema over the launcher»), `SystemScene.test.tsx` (LauncherPage reale), `MotionChoreographyBlock2` |
| D-M14, toast | Entrata con dissolvenza e scala 0,92 (200 ms, senza traslazione); uscita in 160 ms ease-in con dissolvenza e scala 0,92, mantenendo l'ultimo fotogramma. Il toast che esce resta nell'albero per l'uscita ma `aria-hidden`. | `ToastHost.tsx`, `toast.css`, `hooks/launcher/useLeaving.ts` (nuovo) | `SheetSystemChoreography` («toasts and notices»), `MotionChoreographyBlock2` |
| D-M14, avviso di connessione | Entrata in 240 ms e uscita in 160 ms, con dissolvenza e scala 0,92 dall'alto; durante l'uscita è `inert` e `aria-hidden`. La griglia sotto resta ferma, come prima. | `ConnectionNotice.tsx`, `statusBar.css` | stessi |
| D-M14, ingranaggio | Con un widget trascinato si attenua a 0,5 e ritorna in 160 ms (era di colpo, F-11). | `appShell.css` | `MotionChoreographyBlock2` |
| D-M14, etichetta dell'indicatore | Il nome della pagina cambia con una dissolvenza incrociata di 120 ms, solo opacità: il nuovo entra dove è, il vecchio esce fuori dal flusso nello stesso punto sotto il solco. Nessuna animazione di larghezza o di posizione. Dove non si anima il nome cambia nello stesso elemento, come prima. | `PageIndicator.tsx`, `pageIndicator.css` | `SheetSystemChoreography` («the page name…»), `MotionChoreographyBlock2` |
| D-M14, «Rimuovi» | La barra del widget non cambia più larghezza quando si sposta un widget. «Annulla», «Fine» e il separatore stanno in un gruppo (`aca-widget-actions__rest`) che sfuma al suo posto in 120 ms ease-in (non più `hidden`/`display: none`) e torna in 180 ms; la pillola «Rimuovi» si stende sopra il gruppo e il suo testo entra in 120 ms. Il gruppo ha `min-width: min(100cqw, 20rem)` anche a riposo, la stessa larghezza di quando è bersaglio del rilascio. | `WidgetActionBar.tsx`, `edit.css` | `LauncherGestures` («the trash as drop target»), `LauncherScreen` («picks a widget not selected up»), `MotionChoreographyBlock2` |
| Già fatti nel blocco 1 | Pillola «Annulla» in 160 ms con scala e dissolvenza (D-M14), caselle fuori in 100 ms. | — | — |

### Scelte esecutive e scostamenti dalla specifica

- **Nessuna attesa dove non si anima.** Fogli, avvisi, toast, etichetta e Sistema attendono la fine dell'uscita solo se `document.documentElement.getAnimations` esiste (`canAnimate`); in jsdom tutto va come prima e i test esistenti non cambiano di comportamento. Con movimento ridotto la scena resta, con dissolvenze di 120 ms.
- **Sistema: scala 0,96, non 0,92.** È una pagina intera; la scala dei piccoli elementi (0,92) sarebbe troppo marcata. Entro il 10 % (risposta dell'utente). Token `--aca-scale-page`.
- **Sistema ha un livello con scorrimento proprio.** Per sovrapporsi al launcher durante la scena, Sistema non scorre più con il documento ma dentro `.aca-overlay-scene` (`overflow-y: auto`, `overscroll-behavior: contain`). Il livello esiste anche senza animazioni e con movimento ridotto, per coerenza. **Non provato sul tablet:** da verificare lo scorrimento di Sistema e il salto alle sezioni.
- **Il launcher coperto resta `hidden`** (display: none) a fine ingresso, come oggi; la scelta tra `content-visibility: hidden` e `visibility: hidden` della specifica non è stata fatta, perché richiede una misura sugli osservatori che qui non c'è.
- **Il foglio non ha il due tempi di D-M25.** `showModal()` e il suo costo (circa 200 ms di stile nella 0.9.26) cadono ancora dentro l'entrata: il costo di `showModal()` fuori dal movimento dipende da ISSUE-112 (meccanismo del foglio), che non fa parte di questo incarico. La struttura-poi-contenuto è fatta; il contenuto è già montato (opacità 0), non montato dopo l'arrivo. Nessuna riga di scheletro: il pannello ha l'altezza del contenuto, e una riga posticcia che sparisce non avrebbe dissolvenza.
- **Sovrapposizione dei fogli solo tra fogli del primitivo `Sheet`** e solo quando il secondo si apre entro metà dell'uscita del primo (stato a livello di modulo).
- **«Rimuovi»: cambio di aspetto a riposo.** La barra del widget ha ora una larghezza minima di 20 rem (o della banda, se più stretta) anche a riposo; prima aveva la larghezza dei suoi comandi. È il prezzo di non cambiare larghezza al passaggio.
- **Etichetta dell'indicatore.** La dissolvenza incrociata toglie lo scatto del testo; il riquadro dell'indicatore prende comunque la larghezza del nome nuovo subito, centrato. Che questo basti a far sparire i salti di larghezza di F-12 non è stato misurato.
- **Non fatto in D-M14:** anello della selezione in 120 ms (lo stato di uscita della selezione sta nel blocco dei widget).
- **Rientri a capo:** tutti i file toccati sono in LF.

### Verifiche

| Controllo | Esito |
|---|---|
| `npm run typecheck` (`tsc -p tsconfig.strict.json --noEmit`, test compresi) | Eseguito, verde. |
| `npm run lint` (eslint `src`), `npm run lint:typography`, `npm run lint:theme-colors` | Eseguiti, verdi (0 violazioni; tipografia 519 file, colori 341). |
| `prettier --check` sui 22 file toccati o nuovi | Eseguito, verde. |
| `vitest run --maxWorkers=4` su 50 file pertinenti (fogli, kit, Sistema, avvisi, indicatore, barre, vista pagine, pager, launcher, gesti, Casa 3D) | Eseguito: 50 file, 1013 test verdi. Nuovi: `SheetSystemChoreography.test.tsx` (28), `MotionChoreographyBlock2.test.ts` (19), `SystemScene.test.tsx` (4). Aggiornati: `LauncherGestures.test.tsx` e `LauncherScreen.test.tsx` (il test della barra del widget fissava l'attributo `hidden` su «Fine»: ora verifica il gruppo `inert`). |
| Suite completa, backend, build, i18n, e2e | **Non eseguiti** (incarico: solo test mirati). |
| Misure sul Tab M11 (A1-A13), prova col dito | **Non eseguite** (niente tablet, banco, Docker). Il beneficio reale di Sistema in scena, della sovrapposizione dei fogli e dell'uscita dei toast sui fotogrammi è un'ipotesi da misurare con gli scenari SH, SY e FR. |

### Punto di ripresa

Resta il blocco dei **widget** (D-M6…D-M11, D-M17, D-M22, D-M23: sagoma piatta e tratteggiata, caselle «+» che compaiono e spariscono nel ridimensionamento con dissolvenza e scala entro il 10 %, volo nella casella, rimozione e ripristino, widget aggiunto, ombra su pseudo-elemento, tolta l'oscillazione della copia trascinata) con l'anello della selezione in 120 ms. Poi la misura base/variante sul tablet con gli scenari SH, SY, FR e TAP, e la prova col dito, in particolare lo scorrimento di Sistema nel suo livello. ISSUE-112 resta il passo che porta il costo di `showModal()` fuori dal movimento.

## Blocco 3 della realizzazione (2026-10-23): widget

**Autore.** Claude Code, subagente di un flusso di lavoro (modello: claude-sonnet-5-5), sul working tree che contiene la 0.9.27, la parte 1 della 0.9.28 e i blocchi 1 e 2. **Perimetro.** D-M6 (sagoma del ridimensionamento, con la correzione dell'utente), D-M7 e D-M23 (sagoma sempre piatta, anche senza cornice), le caselle «+» che compaiono e spariscono, D-M8 (volo nella casella), D-M9 (copia che nasce a scala 1), D-M10 (rimozione e ripristino), D-M11 (widget aggiunto in due scene), D-M22 (pagina piena), D-M17 (ombre che sfumano), e la rimozione dello scuotimento della copia trascinata (risposta del gruppo «pressione», rimasta ai widget dal blocco 1). **Esclusi:** l'uscita dell'anello e dei pallini al «Fine» (serve uno stato di uscita della selezione), la barra del widget che sale sfasata nel widget aggiunto (+100 ms), D-M13 e D-M15 (escluse dall'utente), le misure. Nessun commit, nessuna dipendenza nuova, nessun tablet, banco o Docker, nessuna misura. L'informativa AI (`AiDevelopmentNotice.tsx`, `aiDevelopmentNotice.css`, `ai-development.svg` e le due righe in `SystemLayout.tsx`) non è stata toccata. Copie PRIMA in `backup/v0928/pre/blocco3/` (css, tsx, hooks, tests, doc).

**Come ho letto le risposte dell'utente.** «Comparsa delle caselle col +» alla domanda sulla «comparsa delle icone»: sono le celle «+» che compaiono o spariscono quando un widget cambia grandezza, non il contenuto del widget. Le ho rifatte con dissolvenza e scala 0,92, e la stessa regola vale per le celle liberate o occupate da uno spostamento, da una rimozione e da un ripristino (stesso meccanismo, stesso difetto). «La sagoma piatta con i bordi che al posto di essere solidi sono spezzettati»: una casella piatta, senza ombra, con bordo tratteggiato, sempre, per ogni widget (con cornice, trasparente, senza cornice).

### Cosa è cambiato

| Voce | Realizzazione | File | Guardia |
|---|---|---|---|
| D-M16 (token nuovi) | `--aca-scale-drag` (1,04), `--aca-dur-fly` (200), `--aca-dur-fly-back` (240), `--aca-dur-reveal` (200), `--aca-dur-cell` (160), `--aca-dur-ring` (120). Gli orari che il codice aspetta (`FLIGHT_MS`, `CELL_EXIT_MS`, `SHAPE_CLEAR_MS`, `SHAPE_SETTLE_MS`) sono uguali ai token e un test lo verifica. | `themes/acasystem/tokens.css` | `MotionChoreographyBlock3.test.ts` |
| D-M6, D-M7, D-M23: la sagoma | Costruita sulla scatola che ogni widget ha (`.aca-launcher-widget`, in `WidgetHost`), non dentro i widget: uno pseudo-elemento `::before` piatto (riempimento tenue, bordo tratteggiato di 2 px, nessuna ombra, nessun filtro), rosso se la misura è rifiutata (`shapeInvalid`). Al primo cambio di cella la faccia del widget (cornice, ombra e contenuto, o il contenuto del widget senza cornice) sfuma in 0,1 s e la sagoma entra insieme, solo `opacity`. Anello e pallini restano. Il pozzo rosso incassato sotto il widget non si disegna più nel ridimensionamento (la sagoma lo sostituisce). | `WidgetHost.tsx`, `WidgetGrid.tsx`, `launcher.css` | `MotionChoreographyBlock3`, `WidgetChoreography` (sagoma su `WidgetHost`) |
| D-M6: l'ordine | Hook `useResizeShape` con cinque fasi: `clearing` (la faccia esce, la scatola **non cambia misura** per al massimo 0,1 s), `shaped` (il contenuto è **saltato dal browser**, `content-visibility: hidden`, e la scatola segue la cella sotto il dito; al contenuto si dà la misura salvata, quindi nessun widget ricalcola a ogni cella), `settling` (dito alzato: la scatola raggiunge la misura finale, o quella di prima se rifiutata, per la transizione in corso, con il contenuto ancora saltato), `waking` (il contenuto è calcolato **una volta** alla misura finale, ancora trasparente; gli osservatori misurano), poi la sagoma finisce e la faccia torna con una dissolvenza di 0,2 s. Fine composta come in P1 (evento della transizione o tetto di durata più due fotogrammi). Senza animazioni (jsdom) e con movimento ridotto non c'è attesa né salto: la sagoma c'è per il gesto e se ne va con esso (con movimento ridotto sfuma in 0,12 s lineari). | `hooks/launcher/useResizeShape.ts` (nuovo), `WidgetHost.tsx` | `WidgetChoreography` (7 test sull'hook, 4 su `WidgetHost`) |
| Caselle «+» | Una casella che compare (un widget si è rimpicciolito, spostato o tolto) entra con dissolvenza e scala 0,92 in 0,16 s (animazione a fotogrammi, una volta); una che sparisce (un widget è cresciuto o è atterrato sopra) resta per l'uscita, inerte e nascosta alle tecnologie assistive, e sfuma con la stessa scala in 0,16 s. Le caselle con cui una pagina viene disegnata la prima volta non si animano. Il «+» delle caselle esce in 0,12 s (era 0,18) quando si trascina un widget. Con movimento ridotto solo dissolvenza. | `WidgetGrid.tsx` (`FreeCells`), `hooks/launcher/useLeaving.ts` (`entering`, `CELL_EXIT_MS`), `launcher.css` | `WidgetChoreography` (3 test), `MotionChoreographyBlock3` |
| D-M9 e lo scuotimento | La copia nasce alla grandezza del widget (scala 1, non 0,9) e sale a 1,04 in 0,15 s (`@starting-style`). **Tolta l'oscillazione infinita** `aca-hold-shake` (±0,9° e ±0,5 px), che era del blocco dei widget; tolti anche la regola `.is-lifting` e il `@starting-style` con `box-shadow`. Nessuna rotazione resta in `launcher.css`. | `launcher.css` | `MotionChoreography` (nessuna rotazione), `LauncherGestures`, `LauncherScreen` |
| D-M17: ombre | L'ombra della copia è `::before` della copia, a riposo uguale a prima, e sfuma in opacità (entra con la copia, esce nel volo); nessun `box-shadow` in alcuna transizione della copia. Dalla lista di transizioni del widget è tolto il `box-shadow` (non cambiava mai: il widget non ha un'ombra sua). Le ombre del kit sulla cornice (hover, pressione) sono invariate (ADR-0011). | `launcher.css` | `MotionChoreographyBlock3` |
| D-M8: il volo | Al rilascio di un widget spostato **il layout non si committa**: `useWidgetDrag` smette di ascoltare il puntatore ma tiene la sessione con un `flight`: `land` (alla casella calcolata prima del rilascio, 0,2 s ease-out, scala uniforme alla misura della casella, ombra che sfuma), `return` (rilascio rifiutato o fuori dalle griglie: alla casella di partenza, 0,24 s ease-in-out, nessun bersaglio mostrato) o `remove` (sul cestino: la copia si restringe a 0,54 e sfuma in 0,16 s dov'è il dito, il cestino resta acceso). Il commit del rilascio (`onDrop` o `onRemove`) e la rimozione della copia avvengono insieme alla fine del volo (`flightEnded`), cioè nello stesso rendering: il widget compare nella casella nel fotogramma in cui la copia sparisce, alla stessa posizione e scala. Gli altri widget si spostano al rilascio, come prima. Non si vola con l'animazione assente, con movimento ridotto, per un widget del vassoio o in una pila, né verso una casella fuori dallo schermo (un'altra pagina): lì il rilascio è immediato come prima. Dopo l'atterraggio: caselle «+» (sopra), anello (+40 ms) e pallini (+80 ms), con dissolvenza invece di esserci dal primo fotogramma. | `hooks/launcher/useWidgetDrag.ts`, `DragGhost.tsx`, `LauncherScreen.tsx`, `launcher.css` | `WidgetChoreography` (9 test sul volo, 5 sulla copia), `LauncherDragDrop` (invariati: senza animazioni è come prima) |
| D-M10: rimozione | **Dalla barra («Rimuovi») e con Canc:** il widget scende a 0,92 e sfuma in 0,16 s ease-in (anello e pallini con lui, fuori portata); **solo dopo** si committa la rimozione, quindi la pillola «Annulla» e le caselle liberate seguono un'uscita vista. **«Annulla» della pillola:** il widget si rimonta già a 0,92 e trasparente (nessun lampo) e due fotogrammi dopo entra a 1 in 0,24 s, 60 ms dopo le caselle che cedono il posto. Il segno «entra/esce» è nello store della selezione (`exiting`, `entering`), quindi si ridisegna solo il widget interessato. «Annulla» della barra (stessa pagina o altra) è invariato. | `useLauncherSelection.ts`, `LauncherScreen.tsx`, `WidgetHost.tsx`, `WidgetGrid.tsx`, `launcher.css` | `LauncherScreen` («widgets that leave and come in», 4 test), `WidgetChoreography` (store) |
| D-M11 e D-M22: widget aggiunto | Al `onAdded` il widget si monta già a 0,92 e trasparente, selezionato; quando il foglio si chiude (stato `reveal`) entra a 1 in 0,24 s, **160 ms dopo** l'inizio della discesa del foglio (che dura 0,2 s: 40 ms di sovrapposizione); anello (+40 ms) e pallini (+60 ms) dopo di lui, non prima. **Pagina piena:** se il widget è finito su un'altra pagina, prima si fa scorrere il pager a quella pagina (`goToPageId`) e il widget entra quando lo scorrimento è finito (`scrollend`, con un tetto di 0,7 s). Dove non si anima, o con movimento ridotto, il widget c'è subito come prima. Un widget che nessuno rilascia compare comunque dopo 10 s. | `LauncherScreen.tsx`, `launcher.css` | `LauncherScreen` («a widget just added comes in after the sheet», 3 test) |

Nessuna scala del blocco supera ±10 %, con tre eccezioni **preesistenti** che il blocco non cambia o cambia di poco, e che la guardia elenca: i pallini dell'anello partono da 0,5 (come prima del blocco, 160 ms), la copia sul cestino scende a 0,6 (REP-20261008-001) e al rilascio lì a 0,54. La freccia del bordo (450 ms, «come oggi» nella specifica) parte da 0,8 ed è fuori dalla guardia. Nessuna rotazione né scuotimento in `launcher.css`.

### Scelte esecutive e scostamenti dalla specifica

- **La sagoma è sempre piatta** (D-M7 e D-M23 diventano la regola), anche con la faccia normale: non dipende più da A1. Il riempimento è l'inchiostro tenue sul colore della pagina (6 %), il bordo l'inchiostro attenuato al 55 % (token del tema, nessun colore nuovo). **L'aspetto del tratteggio (spessore, lunghezza dei tratti, tinta) è una scelta dell'agente da vedere a occhio.**
- **La prima misura aspetta fino a 0,1 s** (come da specifica, scheda 5): è una latenza vera tra l'inizio del gesto e il primo cambio di grandezza. L'utente ha approvato «il resto».
- **`content-visibility: hidden` sul contenuto** durante il gesto è una scelta della specifica, non misurata: non so se tolga fotogrammi oltre 22 ms (A1) né se qualche widget ricalcoli comunque per un `ResizeObserver` sul suo contenitore. È la seconda comparsa di `content-visibility` nell'app (la prima è la finestra delle pagine, ADR-0018); la guardia di `PagerFarPages.test.tsx`, che ne fissava una sola, è aggiornata a due e nomina la nuova. Non tocca mai una pagina.
- **Il pozzo incassato non si disegna più nel ridimensionamento.** Per lettura del codice era coperto dal widget opaco, quindi in pratica non si vedeva; la didascalia «Non c'è spazio» che conteneva non c'è più nel ridimensionamento (la sagoma rossa e l'annuncio dopo il rilascio restano). Nello spostamento il pozzo c'è come prima.
- **La copia che vola** non misura nulla nel `DragGhost` (la guardia sui calcoli di stile resta); la casella d'arrivo si misura nell'hook al rilascio, dalle griglie registrate. La scala del volo è la più piccola tra i rapporti di larghezza e di altezza: su una pagina con celle uguali è 1.
- **Barra del widget:** a rilascio avvenuto, per i 200 ms del volo la barra mostra ancora «Rimuovi» come bersaglio acceso (`drop='ready'`) finché la sessione non finisce. Non cambia in modo visibile il risultato.
- **Il commit del rilascio cade dopo il volo**, quindi gli altri widget si spostano comunque al rilascio (il bersaglio con il suo ingombro è mostrato subito), ma la copia arriva prima del commit di React (circa 120 ms nella 0.9.26): la sosta sulla casella durante il blocco è visibile, come previsto da D-M8 («La sosta sulla cella è visibile»). Il due tempi di D-M25 **non** è applicato all'atterraggio: le caselle «+» che tornano cominciano nel commit.
- **Rimozione dalla barra:** si aspetta 160 ms più due fotogrammi prima del commit; per quel tempo il widget è `inert`. Un secondo «Rimuovi» o Canc durante l'uscita non fa nulla.
- **D-M10 non è fatto per «Annulla» della barra** (il widget torna al posto di prima con `translate` come oggi) né per il ritorno da un'altra pagina (prima lo scorrimento, poi il widget): restano come sono.
- **D-M11, la barra del widget** che sale a +100 ms non è stata sfasata: segue la selezione con le sue transizioni (360 ms), che partono al momento del `reveal`, cioè poco prima del widget.
- **Fuori dal blocco, non fatto:** uscita dell'anello e dei pallini al «Fine» (restano al loro posto fino alla chiusura della modifica); il widget tenuto premuto in modifica (`.is-pressing`, 0,9 progressivo) non è collegato a nulla dal G5 e non è stato toccato.
- **`@starting-style` su `::before` e `::after`** (anello, ombra della copia) non è stato provato su Chrome: se il browser non lo applica agli pseudo-elementi, l'anello e l'ombra compaiono di colpo come prima.
- **Copie PRIMA:** per `PagerFarPages.test.tsx` (una riga di guardia, da un solo `content-visibility` a due) la copia PRIMA non è stata fatta in tempo; prima la guardia verificava `css.match(/content-visibility/g)` di lunghezza 1 e solo la regola di `[data-far]`; ora ne ammette due e nomina la regola `.is-skipped`.
- **Rientri a capo:** i file toccati sono in LF. `StackView.tsx` ha fine riga CRLF dall'origine e non è stato toccato.

### Verifiche

| Controllo | Esito |
|---|---|
| `npm run typecheck` (`tsc -p tsconfig.strict.json --noEmit`, test compresi) | Eseguito, verde. |
| `npm run lint` (eslint `src`), `npm run lint:typography`, `npm run lint:theme-colors` | Eseguiti, verdi (0 violazioni; tipografia 520 file, colori 341). |
| `prettier --check` sui file toccati o nuovi | Eseguito, verde (`StackView.tsx`, con fine riga CRLF dall'origine, non è tra i file toccati). |
| `vitest run --maxWorkers=4` su 43 file pertinenti (vista pagine, pager, launcher, widget, trascinamento, kit, fogli, Sistema, gesti, pile, scene) | 43 file, 921 test verdi. La prima esecuzione ne aveva 3 rossi, tutti lato test: la guardia di `PagerFarPages` che ammetteva un solo `content-visibility` (aggiornata, vedi sopra) e due test del widget aggiunto contaminati dal test del movimento ridotto che li precedeva (ora ripristina la media query); rieseguiti verdi. |
| `vitest run --maxWorkers=4` su altri 12 file che nominano le classi del launcher, i token o i componenti toccati (`CategoryPages`, `ComfortContract`, `ControlsFrame`, `EditTipContrast`, `FixControlsReview`, `FixLauncherLogicRipresa`, `FixSheetsReview`, `FooterBandCache`, `FrameGearCommands`, `PageShell`, `PolishKit`, `SystemSheets`) più `LauncherSelection`, `LauncherDragDrop`, `DragGhostLift` | 15 file, 276 test verdi. |
| Suite completa, backend, build, i18n, e2e | **Non eseguiti** (incarico: solo test mirati). |
| Misure sul Tab M11 (A1-A13), prova col dito, browser | **Non eseguite** (niente tablet, banco, Docker; nessun browser aperto). Tutto quello che riguarda fotogrammi, `content-visibility`, `@starting-style` sugli pseudo-elementi e l'aspetto del tratteggio è ipotesi da vedere e misurare. |

**Guardie nuove:** `MotionChoreographyBlock3.test.ts` (21 test: token uguali agli orari del codice, forma piatta e tratteggiata senza ombra costruita sulla scatola e non sui tipi di widget, faccia e contenuto con la sola `opacity`, contenuto saltato in una scatola che tiene la misura, caselle «+» che entrano e escono, copia ferma senza `box-shadow` in alcuna transizione e con l'ombra come strato, volo e uscita, widget che esce e che entra, anello e pallini in sequenza, scale entro ±10 % tranne le tre eccezioni preesistenti), `WidgetChoreography.test.tsx` (31 test sul comportamento: le fasi di `useResizeShape`, la sagoma su `WidgetHost`, lo store `exiting`/`entering`, le voci `entering` della lista, le caselle che escono inerti e quelle che entrano, il volo di `useWidgetDrag` in tutti i casi, `DragGhost` con il volo), 7 scenari in `LauncherScreen.test.tsx` (rimozione dalla barra e con Canc, «Annulla» che rimonta il widget a 0,92, movimento ridotto, widget aggiunto dopo il foglio, pagina piena con scorrimento prima, senza animazioni). **Aggiornati** i test che fissavano il comportamento superato: `MotionChoreography` (nessuna rotazione nel foglio; `@starting-style` vietato solo sui comandi sotto le schede), `LauncherGestures` e `LauncherScreen` (la copia non oscilla e non nasce a 0,9), `PagerFarPages` (due `content-visibility`). Le fasi e i tempi sono provati con tempi simulati e con l'API delle animazioni prestata al test (`getAnimations`): non provano che il browser disegni quello che le regole dicono.

### Punto di ripresa

Con questo blocco tutte le voci approvate della coreografia (D-M1…D-M25 meno D-M13 e D-M15) hanno una realizzazione nel working tree, **nessuna misurata**. Restano, nell'ordine: (1) la prova col dito dell'utente sul Tab M11, in particolare la sagoma tratteggiata (aspetto), il volo nella casella con la sosta durante il blocco, il widget aggiunto con la pagina piena e lo scorrimento di Sistema nel suo livello (blocco 2); (2) la misura base/variante sul tablet con gli scenari di ridimensionamento (RZ), di trascinamento e rilascio, di rimozione e ripristino, del widget aggiunto, di fogli e Sistema (SH, SY), della vista pagine e del tocco sul «+» (FR, TAP), con gli obiettivi A1-A13; (3) i due punti non fatti, l'uscita di anello e pallini al «Fine» e la barra del widget sfasata nel widget aggiunto; (4) ISSUE-112 (costo di `showModal()` fuori dal movimento) e, se l'utente lo chiede, le versioni dei widget per dimensione.

## Rettifiche successive

### Rettifica del 2026-10-23 (revisione dei blocchi 1-3: rilievi alti, medi e bassi)

*Annotazione datata: non riscrive i blocchi precedenti, che restano come scritti. Scritta da Claude Code (claude-sonnet-5-5). Copie PRIMA in `backup/v0928/pre/rilievi-revisione/`. Nessun commit, nessuna dipendenza nuova, nessun browser, banco, Docker o tablet.*

- **Fini riga (alta).** Il lavoro su ISSUE-105 aveva salvato in CRLF `launcher.css`, `CategoryWidgetContent.tsx`, `CategoryPages.test.tsx` e [REP-20261021-003](REP-20261021-003-interazioni-schermo-intero.md); `.gitattributes` dichiara `progetto/acasystem/** -text`, quindi il diff di `launcher.css` era l'intero file e due guardie (`MotionChoreographyBlock3` «the ring and the dots come after the widget…» e `LagLayers` «with reduced motion the shadow comes at once») fallivano. Riportati a LF i quattro file, senza altri cambi di contenuto; `prettier --write` sui soli file toccati da ISSUE-105 e da questa rettifica. Le dichiarazioni «test verdi» dei blocchi 1-3 valevano per i file prima di ISSUE-105; ora lo sono di nuovo sul working tree. `StackView.tsx` (nuovo, non tracciato, della parte 1) è ancora in CRLF e `prettier --check` lo segnala: fuori dai rilievi, non toccato.
- **Sagoma al primo cambio di cella (media).** `WidgetHost` accende la sagoma quando `rect` differisce da `placement` e la tiene fino al rilascio (prima partiva con la sessione, dopo 6 px). Un piccolo spostamento su un pallino che non cambia misura non spegne più la faccia né salta il contenuto. Test: «a move that changes no cell…». La soglia di 14 px (`HOLD_TOLERANCE_PX`) non è usata: basta il cambio di cella, come dice il blocco 3.
- **Casella «+» che rientra mentre esce (media).** La transizione base di `.aca-launcher-cell.aca-m` ha ora anche `opacity` (`--aca-dur-cell`, ease-out): il ritorno da `is-leaving` riparte dal valore corrente, senza salto. Test CSS e test «a cell that comes back while it still leaves…».
- **Rimozione della pagina (bassa).** Il tempo di uscita (`CARD_EXIT_MS`) si conta dal fotogramma successivo al commit (`afterNextFrame`, poi il timer), non dal clic; l'annullamento allo smontaggio copre entrambi. Il test attende `CARD_EXIT_MS` più `TWO_FRAMES_MS`. Lo stesso schema dei widget (`removeLeaving`) resta com'è: l'aggiornamento è nello store, più leggero; **non misurato**.
- **Stop durante il volo (bassa).** `stop()` di `useWidgetDrag` esegue il rilascio già avvenuto (`landing`) prima di azzerare la sessione: la fine della modifica o lo smontaggio durante il volo committano lo spostamento o la rimozione, senza volo, una volta sola. Il test che dava per voluto il contrario è stato diviso: l'annullamento *prima* del rilascio non committa (invariato), quello *dopo* sì. Scostamento dal test precedente, deciso per il rilievo.
- **Fuoco con Canc (bassa).** Il widget in uscita non è più `inert`: tiene il fuoco, i comandi sono rifiutati dal gestore dei tasti (salvo Tab) e dal puntatore (`pointer-events: none` su tutta la scatola, maniglie comprese). Adattati i test che aspettavano `inert`.
- **Pallini (bassa).** Lo stato iniziale dei pallini nelle nuove regole (trascinamento, ingresso) è `var(--aca-scale-enter, 0.92)` invece di 0,5, entro il 10 %. Resta 0,5 l'`@starting-style` preesistente alla selezione in `edit.css`, non toccato.
- **Barre e indicatore con `translateY` (bassa) — scostamento da confermare.** La barra del widget, la barra della vista pagine, il vassoio, la barra della modifica e l'indicatore entrano ed escono ancora con uno scivolamento; solo la pillola «Annulla» è stata convertita. Non cambiato in questa rettifica (tocca anche il test della fascia di stato e la scheda 10, «come oggi»): **da confermare con l'utente** se anche le barre devono passare a scala entro il 10 % e dissolvenza.
- **`getAnimations()` nel commit (bassa).** `useResizeShape` non interroga più la scatola nel task del commit del rilascio: lo fa due fotogrammi dopo (`afterNextFrame`), poi attende `afterTransition` solo se la dimensione ancora si muove. Un dito sollevato prima che la faccia sia uscita passa direttamente al risveglio (non si salta nulla). Costo: due fotogrammi in più prima del risveglio quando nulla si muove; **non misurato**.

**Verifiche (eseguite, `--maxWorkers=4`).** `WidgetChoreography`, `MotionChoreographyBlock3`, `MotionChoreography`, `MotionChoreographyBlock2`, `LagLayers`, `CategoryPages`, `LauncherScreen`: tutti verdi (277 + 252 test, in due esecuzioni, con una prova di `LauncherScreen` corretta tra le due); `npm run typecheck` e `eslint src` senza errori; `prettier --check` verde sui file toccati. **Non eseguito:** suite completa, browser, banco, tablet.



## Prova a video sul PC (2026-10-23)

**Autore.** Claude Code, subagente di un flusso di lavoro (modello: claude-sonnet-5-5). **Perimetro.** Sola osservazione, nessuna modifica al codice. Build del working tree in `backup/v0928/dist-2a` (esclusa da Git), servita da una copia privata del server dei fixture degli e2e (`backup/v0928/video-tools/server.mjs`, porta 3017, con un launcher di tre pagine e un widget non collegato). Un solo Chromium headless con `--disable-gpu --use-angle=swiftshader --disable-gpu-compositing`, 1280×665, DPR 1,5, tocco CDP. Registrazione con `Page.startScreencast`; in parallelo un campionatore a ogni `requestAnimationFrame` di `transform`, `scale`, `rotate`, `translate` calcolati. Provini (tile ffmpeg) in `backup/v0928/video/provino-*.jpg`, fotogrammi e `transforms.json` per scena nelle cartelle `01-…10-`. Niente tablet, banco, Docker. Browser e server chiusi.

**Esito (osservazioni, non misure di prestazione: i tempi del compositore software non contano).**

- Nessuna rotazione né scuotimento nei riscontri (le sole rotazioni calcolate sono le lancette statiche dell'orologio della copertina). Scale: casella «+» toccata 0,93 con il «+» a 1,06; scheda tenuta nella vista pagine 1,05 sopra la scala a riposo, dopo la soglia dei 500 ms (a 300 ms nessun cambio); copia del widget trascinato 1,04; uscita e rientro del widget rimosso e ripristinato 0,92; celle «+» 0,92; Sistema 0,96. Tutte entro ±10 %.
- **Fuori dal ±10 %:** i pallini dell'anello di selezione partono da scala 0,5 alla comparsa dopo un trascinamento (`edit.css:96`), già elencata come eccezione preesistente nel blocco 3. La vista pagine riduce l'intera pagina a 0,659 (è la vista, non un riscontro).
- Sagoma del ridimensionamento: piatta, riempimento tenue, bordo tratteggiato, senza ombra; la faccia sfuma in modo graduale, non di colpo; al rilascio le celle e il contenuto del widget rientrano in dissolvenza. Le celle «+» non compaiono di colpo (dissolvenza graduale all'inizio del gesto e al rilascio). Non osservata la sagoma su un widget senza cornice.
- Sistema: l'ingresso e l'uscita sono una dissolvenza con scala 0,96; il pulsante «AI» è visibile nella scena e non nel launcher. Nessun chip «Da collegare» (testo assente dal DOM); il widget non collegato apre il foglio «Impostazioni del widget» (con «Non collegato» e «Cambia»).
- **Da guardare con l'occhio sul tablet:** (1) nei fogli («Aggiungi un widget», «Impostazioni del widget») il pannello sale con il solo titolo e il corpo compare dopo alcuni fotogrammi; il pannello cambia anche altezza al passo successivo; (2) durante il trascinamento la copia perde il contenuto («21,5 °C») e mostra solo il nome del widget; al rilascio il contenuto torna; (3) il widget aggiunto compare in dissolvenza nella sua casella mentre il foglio scende, senza volo; (4) dopo il rilascio di una scheda tenuta nella vista pagine il pulsante «Fine» e le frecce restano al loro posto, la copertina e le pagine laterali scorrono con la scheda.
- **Barra in alto (indicatore e nome della pagina):** occupa x 548–732, y 8–76 (nome x 609–671, y 56–76); la prima riga di widget parte da y 44. Con i widget che non attraversano il centro (le colonne sono 8, il centro cade in uno spazio) il nome copre solo 5 px laterali dei vicini; con un widget a cavallo del centro (provato) la pillola copre circa 6 px del bordo superiore e il nome una fascia di 20 px nella parte alta del widget. Il nome **copre ancora** contenuti nella parte alta di quel widget.
- **Limiti:** schermo a 1280×665 in software, nessuna prova col dito, nessuna misura di fotogrammi. Le scene «Annulla» della pillola e del ripristino sono viste solo in provino.


## Esito della 0.9.28 (2026-10-23, parte 2a e misura sul Tab M11)

*Annotazione datata: non riscrive le sezioni precedenti, che restano come scritte. Scritta da Claude Code (claude-sonnet-5-5) a partire dai resoconti dei passi del flusso (codice e revisione; prova a video; misura sul tablet; tappa Z). Nessun commit. Le cifre vengono dai file in `backup/v0928/tablet-misura/` (tabelle in `tabelle/`) e dal resoconto del passo di misura; non le ho rimisurate.*

### Cosa c'è nel working tree

- I tre blocchi della coreografia (pressione e vista pagine; fogli, Sistema, pillole e avvisi; widget), le correzioni della revisione Opus e la rettifica del 2026-10-23 descritte sopra.
- Il punto 1 della 0.9.28 (scorrimento: finestra delle pagine, [REP-20261022-002](REP-20261022-002-piano-blocchi-thread.md), annotazione «0.9.28, punto 1») e il punto 2 (pila vuota: le caselle tornano libere, [REP-20261021-003](REP-20261021-003-interazioni-schermo-intero.md), quinta annotazione).
- La pressione con soglia: la pagina si rimpicciolisce solo dopo i 500 ms (sesta annotazione) e il tocco sul «+» ha la sua animazione.
- ISSUE-105: nessun chip «Da collegare»; il testo resta nascosto per i lettori di schermo (nelle misure ha larghezza 0).
- Le risposte dell'utente a D-M1…D-M25: solo scale entro il 10 %, nessuno scuotimento, sagoma tratteggiata nel ridimensionamento, caselle «+» in dissolvenza.
- L'informativa AI di [REP-20261023-005](REP-20261023-005-informativa-sviluppo-ai.md) è preservata (pulsante «AI» presente in Sistema nella schermata `schermate/20-sistema-pulsante-AI.jpg`). Il codice del server di D1 (`backup/d1/sandbox/`) non è toccato né incluso.

### Verifica del software (esiti dei file di evidenza)

- **Primo giro** della suite frontend a quattro parti: 1 test rosso, la guardia di `MetalMaterial.test.jsx` («tiene le primitive al primo livello…»): `components/Sheet.tsx` importava da uno strato vietato. Il passo di codice ha corretto l'importazione.
- **Secondo giro** (`backup/v0928/suite-2-1…4.txt`): 199 file, 3002 test verdi (730 + 990 + 707 + 575).
- **Altri controlli** (`backup/v0928/step-*.txt`): `tsc` strict, `eslint src`, tipografia (520 file) e colori (341 file) senza violazioni, i18n 4 test, `build` completata (solo l'avviso sui pacchetti oltre 500 kB), dimensioni dei pacchetti entro i limiti, backend 21 file e 202 test verdi.
- **Limite:** questi controlli hanno data e ora (19:33-19:37) subito dopo il primo giro e prima del secondo; non risultano rieseguiti dopo la correzione di `Sheet.tsx`. La correzione riguarda un solo import, ma tipi e lint dopo di essa sono da rifare.

### Misura sul Tab M11 (base 0.9.27 contro 0.9.28)

**Condizioni.** Tab M11, Chrome 156, 1280×665 a DPR 1,5, schermo acceso. Gesti **sintetici** (CDP) sui fixture, non il dito. Base: il bundle 0.9.27 estratto dal contenitore in servizio (`index-CnNjysVo.js`, `backup/v0928/tablet-misura/dist-banco-0.9.27`, porta 3014). Variante: la build di ora del working tree (`backup/v0928/dist-finale`, `index-POA-94MA.js`, porta 3013; l'hash dei sorgenti `frontend/src` è lo stesso prima e dopo le misure). Per A13 anche la 0.9.26 (`backup/issue-109/dist-banco-0.9.26`, porta 3015). Regola della proposta: 5 giri alternati più il giro 0 a parte, mediana [min-max], «migliore» o «peggiore» solo a intervalli non sovrapposti. Giri completi con screencast: 3 per variante (F-1) e 5 per A11.

**Errore del passo di misura, dichiarato.** Nelle prime prove i layout di 3013 e 3014 avevano per errore un widget Luce in più, uguale per le due build; le tabelle `L-*` sono quella replica e **non valgono**. Valgono le tabelle `M-*` (layout canonico), rifatte dopo il ripristino.

| ID | Prima (0.9.27 misurata, o dato del report) | Dopo (0.9.28) | Esito |
|---|---|---|---|
| A1 fotogrammi oltre 22 ms ≤ 10 % e nessuno oltre 50 ms | Apertura vista pagine 40 % [33-80] oltre 22 ms; chiusura 30,8 % [20-50]; rilascio del trascinamento 66,7 %; Sistema 20 %; rimozione 15 % | Apertura 4 [2-5] fotogrammi su circa 45 attesi, 80 % [75-100] oltre 22 ms, 2 [1-3] oltre 50 ms; chiusura 23,5 % [16,7-37,5], 2 oltre 50 ms; foglio «Collega» 7,7 % ma 1 fotogramma oltre 50 ms in ogni giro; foglio «+» 11,1 %; pressione del «+» 11,5 % a 80 ms; trascinamento 36,4 %; rilascio 20,8 % (migliore); ridimensionamento 23,5-31,3 %; Sistema entrata 45,5 % (peggiore), rimozione 23,1 % (peggiore) | **Non raggiunto**: nessuna scena è priva di fotogrammi oltre 50 ms. I rAF non coincidono con i fotogrammi presentati. |
| A2 blocco prima della scena ≤ 100 ms e scena con almeno l'80 % dei fotogrammi | Apertura: 1 task da 64 ms [60-67]; chiusura 174 ms; rilascio della copia con 203 ms [192-215] prima del volo | Apertura: massimo singolo 99 ms [99-149] ma 3 task per 276 ms [260-397], più uno da 94-149 ms dentro la scena (circa il 9 % dei fotogrammi attesi); chiusura 160 ms [151-189] (invariata a intervalli sovrapposti), tocco su «Fine» fino a `is-closing` 319 ms (base 178); copia: volo che parte 42 ms [34-67] dopo il rilascio (migliore) ma il commit all'atterraggio cade dentro il volo, 152 ms [97-171] con 0,4 dei fotogrammi attesi; Sistema: entrata con 0,3 dei fotogrammi attesi, uscita con un task da 221 ms (base 171) | **Non raggiunto.** Il blocco non è sparito: si è spostato dentro la scena. |
| A3 nessun blocco oltre 50 ms durante un gesto del dito | Scorrimento 64-81 ms (massimi); trascinamento 211 ms; ridimensionamento 132-154 ms | Scorrimento SW1 110 [101-117], SW2 98 [95-105], SW3 95 [89-105], pallini JUMP 106 [105-134]; trascinamento 233 ms (peggiore); bordo 229; ridimensionamento 151 (ingrandire) e 177 (ridurre); copia indietro dal dito fino a 233-299 px (base 135-263) | **Non raggiunto.** |
| A4 nessun salto di dimensione negli elementi seguiti | Salto di 5,5 px dell'etichetta dell'indicatore in 1-2 giri su 3; `transitioncancel` del corpo pagina nei tocchi | Risolti l'etichetta dell'indicatore (0 giri) e il cancel dei tocchi. Nuovi o peggiori: pillola «Annulla» con salto di 45×102 px in un fotogramma da 278 ms; scheda tenuta con il corpo pagina +42 px in un fotogramma da 211 ms (3/3); indicatore a ±90 px negli atterraggi degli swipe | **Non raggiunto.** La causa è quasi sempre un task da 100-330 ms che lascia 1-3 fotogrammi alla transizione. |
| A5 nessun elemento compare o sparisce senza almeno 3 fotogrammi intermedi | Widget rimosso e ripristinato, atterraggio, avviso, ingranaggio, anello (collaudo REP-20261022-001) | Anello, pallini e widget aggiunto con salto di opacità 1,0 in un fotogramma da 333 ms (3/3); barra con opacità 0→1 in un fotogramma (3/3); widget rimosso con salto 0,46 (2/3); ingranaggio con salto 0,5 durante il trascinamento (3/3). Poche passate intermedie: copia trascinata (3 fotogrammi su 38 attesi), widget aggiunto (1 su 28), pillola «Annulla» (1 su 16) | **Non raggiunto.** |
| A6 layout-shift 0 | Sistema 0,29-0,34; frecce 0,24-0,37; chiusura del foglio 0,014-0,016 | Frecce 0,373 (uguale alla base, sorgente `.aca-pager__body`); ritorno da Sistema 0,340 contro 0,344 (la riga dei comandi dei widget nelle celle libere); chiusura del foglio «Impostazioni del widget» 0,089-0,094 contro 0,014-0,016 (**peggiorata**); foglio «Aggiungi widget» dopo «Luce» 0,066 uguale. Ridimensionamento 0,001 contro 0,016 (migliorato) | **Non raggiunto.** |
| A7 riscontro sul comando entro 2 fotogrammi | 100-300 ms dal tocco sul «+» | **Sul «+»: 17,5 ms [15,1-22]** (tocco di 80 ms; 16,7 a 250, 16,3 a 400); con la sonda piena la scala 0,93 si vede a +38-54 ms. Swipe che parte da un «+»: nessun lampo. **Sugli altri comandi no**: «Fine» 263 ms [259-293], «Annulla» della barra 227, «Rimuovi» 163 (base 223), «Annulla» della pillola 237 (base 172), ingranaggio 154. Foglio: movimento 174 [164-180] ms dopo il rilascio (base 173); «+» del foglio 206 [202-216]; con il blocco di `showModal()` (ISSUE-112 non fatta) vale «blocco più 2 fotogrammi» | **Raggiunto solo sul «+».** |
| A8 tocco breve: 0 fotogrammi con la pagina sotto scala 1 | 0 a 80 ms; 3-4 fotogrammi a 250 ms (scala minima 0,96); 6-8 a 400 ms (0,92); 3 sul vuoto | 0 fotogrammi in tutte e quattro le prove (80, 250, 400 ms sul «+» e sul vuoto), 0 su 3 nei giri completi. Il «+» scende a 0,930 | **Raggiunto.** |
| A9 ordine e sfasamenti delle transizioni | Apertura: schede a +587 ms, indicatore +588, barra e piede +892-896 (sfasamento di 300 ms); chiusura tutto a 0-4 ms, celle a +572 | Apertura: celle «+» in uscita a +173 ms, poi schede, ombra, indicatore, barra, piede e comandi tutti insieme a +475-478 ms (lo sfasamento previsto si riduce a 3 ms dopo i blocchi); chiusura: barra, indicatore e piede a +143 ms, schede a +238, celle a +730. Pressione lunga: primo cambiamento a 692 ms [671-758] (base 105, con la pagina che si rimpiccioliva); scheda tenuta nella vista pagine a 549 ms [547-555] (soglia 500) | **Non raggiunto.** La soglia della pressione funziona come richiesto; gli sfasamenti no. |
| A10 nessun `transitioncancel` non voluto; celle «+» entro un fotogramma | O3 raggiunto; O4 a 92 ms | Nessun cancel non voluto sulla chiusura (0 su pagine e corpi); cancel nei tocchi 3-4 contro 6-7 (migliore). Celle «+»: la transizione parte 137 ms [99-161] dopo `is-settling` (base 151 [97-158], non distinguibile); ritorno di 198 ms (base 252). «Fine» → `is-settling` 898 ms [873-907] contro 751 [734-759] (**peggiore**) | **Parziale.** |
| A11 sagoma: nessuna callback degli osservatori, contenuto mai a misura 0 | Non misurato | 0 callback durante i gesti di ingrandimento e riduzione (5 giri); 0 fotogrammi con la scatola del contenuto a misura 0 e 0 con il contenuto diverso dalla scatola di più di 2 px (6 finestre). Sagoma tratteggiata piatta visibile (`schermate/08-ridimensiona-meta.jpg`) | **Raggiunto per quanto misurabile.** Il contatore non distingue la variante dalla base (6 callback al caricamento in entrambe). |
| A12 movimento ridotto: nessuna trasformazione animata | I blocchi restavano (S8) | 5/5 giri senza transizioni di `transform`, `translate`, `scale` o `rotate`; restano solo le due animazioni a fotogrammi dell'etichetta dell'indicatore, di sola opacità (120 ms lineari, previste). Layout-shift 0. I blocchi restano: foglio dal «+» 174 ms [171-203] (base 191), «Chiudi» 97 ms | **Raggiunto per le trasformazioni.** |
| A13 scorrimento non peggiore della 0.9.26 | Non rispettato in Z (0.9.27) | Blocco massimo 0.9.26 / 0.9.27 / 0.9.28: SW1 62 [0-68] / 75 [52-94] / **110** [101-117]; SW2 74 / 64 / **98**; SW3 77 / 81 / **95**; JUMP 93 / 119 / 106. Somma dei blocchi da 50 ms in su: SW1 62 / 136 / 286; SW2 77 / 182 / 239; SW3 131 / 236 / 360; JUMP 145 / 195 / 414. Numero di blocchi: 1-2-4, 1-3-3, 2-4-4, 2-2-6 | **Non raggiunto, e peggio della 0.9.27.** Un task da 100-128 ms all'atterraggio (0.9.26: 51-61) e un secondo da circa 57 ms circa 230 ms dopo, allo scambio di etichetta e pillola. Pallini lontani: salto diretto, 0 eventi di scroll intermedi (come la 0.9.27). |

**Riassunto.** Raggiunti A8, A12 (trasformazioni) e A11 (per quanto misurabile); A7 solo sul «+»; A10 in parte; **A1-A6, A9 e A13 no**. Per A13, che la 0.9.27 già mancava, la 0.9.28 fa peggio.

### Cosa è migliorato (a intervalli non sovrapposti, tranne dove indicato)

- Il tocco breve sul «+» e sul vuoto non rimpicciolisce più la pagina (A8) e il «+» risponde in 17,5 ms contro 100-300.
- La pressione lunga ha la soglia dei 500 ms richiesta: nessun cambiamento della pagina prima della soglia.
- Rilascio della copia: il volo parte a 42 ms dal rilascio contro 203; rilascio del trascinamento con meno fotogrammi lenti (20,8 % contro 66,7 %).
- Meno `transitioncancel` nei tocchi; nessun salto di larghezza dell'etichetta dell'indicatore; layout-shift del ridimensionamento 0,001 contro 0,016.
- Sagoma: nessuna callback degli osservatori nel gesto, nessun fotogramma con contenuto a misura 0.
- Nessuna rotazione né scuotimento, scale entro il 10 %, sagoma tratteggiata, celle «+» in dissolvenza, nessun chip «Da collegare» (prova a video).

### Problemi rimasti e peggioramenti (da registrare, non nascosti)

1. **Scorrimento (A13): regressione.** Peggio della 0.9.26 e di parte della 0.9.27 (vedi la tabella). È il difetto che il punto 1 della 0.9.28 doveva correggere: la correzione non ha raggiunto il suo obiettivo sul tablet.
2. **Apertura della vista pagine:** tre task prima della scena (276 ms in tutto) e uno dentro; la scena riceve circa il 9 % dei fotogrammi attesi. Dalla pressione al primo cambiamento 692 ms (base 105, ma con una pagina che si rimpiccioliva senza motivo).
3. **Chiusura con «Fine»:** dal tocco alla fine 898 ms contro 751; dal tocco a `is-closing` 319 ms contro 178.
4. **Rilascio della copia:** il commit cade dentro il volo (152 ms, 0,4 dei fotogrammi attesi); la copia resta più indietro dal dito (233-299 px).
5. **Sistema:** entrata con 0,3 dei fotogrammi attesi, uscita con un task da 221 ms; layout-shift del ritorno invariato a 0,34 (ISSUE-110).
6. **Fogli:** chiusura di «Impostazioni del widget» con layout-shift 0,09 contro 0,014; passo «Aggiungi il widget» con uscita a 269 ms contro 232; il foglio sale per 320 ms con il corpo vuoto e il corpo compare a +666 ms (blocco di `showModal()` da 189 ms a +83); **ISSUE-112 resta aperta**.
7. **«Annulla» e «Rimuovi»:** «Annulla» della barra 140 ms dal rilascio contro 116; «Annulla» della pillola 151 ms contro 82; «Rimuovi» con 0,3 fotogrammi attesi contro 0,4.
8. **Ridimensionamento:** avvio del gesto 223 ms contro 182 (ingrandire) e 200 contro 168 (ridurre).
9. **Salti di opacità e misura in un fotogramma** (anello, pallini, pillola, ingranaggio, widget rimosso, corpo pagina della scheda tenuta), conseguenza dei task da 100-330 ms.
10. **Dalla prova a video (osservazioni, non misure):** il nome della pagina e la pillola dell'indicatore coprono ancora 6-20 px della prima riga con un widget a cavallo del centro (**ISSUE-105 resta da chiudere su questo punto**); i pallini dell'anello partono da scala 0,5 dopo un trascinamento (`edit.css`, preesistente, fuori dal 10 %); i fogli salgono con il solo titolo e il corpo compare dopo alcuni fotogrammi cambiando altezza (da guardare sul tablet); la copia trascinata perde il contenuto durante il movimento (resta il nome) e lo ritrova al rilascio.

**Lettura.** La coreografia ha dato i comportamenti visibili chiesti (soglia, sagoma, riscontro del «+», niente scuotimento), ma non il «smooth» richiesto dall'utente: il costo del commit di React e del ricalcolo dello stile non è stato tolto, è stato spostato dentro le scene, e dove prima precedeva il movimento ora lo interrompe. Questa è un'**interpretazione** del passo di misura, coerente con i numeri sopra, non una causa provata.

### Limiti della misura

- Gesti sintetici CDP e fixture, non il dito dell'utente: la prova col dito non è stata fatta.
- I rAF non sono fotogrammi presentati; la traccia del compositore non è stata scritta. La sonda piena dimezza gli fps (A4 e A5 sono misure logiche).
- A11 non distingue la base; A9 è misurato con `transitionstart` e tolleranza di ±1 fotogramma.
- Nessuna misura sul telefono. Nessun controllo di A1-A13 su Casa 3D.

### Stato del banco e ripristino

- Il passo successivo (tappa Z) **non ha aggiornato il banco**: per la regola «regressione grave dello scorrimento» si è fermato prima di fermare il contenitore. Il banco resta `aca-system:0.9.27` (`/api/health` ok, contenitore `aca-tunet-tunet-1` sano, `ACASYSTEM_VERSION=0.9.27`). Nessuna copia a freddo, nessuna modifica a `.env`, compose o e2e.
- La misura non ha lasciato modifiche: chiavi di `localStorage` della 3002 invariate (dry-run senza differenze), dati delle origini 3013-3015 cancellati, scheda di misura riportata a `about:blank`, `adb forward` 9225 e reverse 3013-3015 rimossi (resta `adb reverse tcp:3002`), i tre server dei fixture fermati per PID. Nessun commit, nessuna modifica al codice, VM `acasystem-ha` spenta e non toccata, codice di D1 non toccato.
- Dati: `backup/v0928/tablet-misura/` (tabelle `M-sw-tre-versioni.md`, `M-ui-base-finale.md`, `M-wd-base-finale.md`, `F-1-findings-*.txt`; repliche `L-*` da non usare); provini in `backup/v0928/video/`.

### Punto di ripresa

1. **Decisione dell'utente** (lunedì, presente): la regressione dello scorrimento. Le strade sono: chiedere una tappa di correzione dello scorrimento nel codice della 0.9.28 (poi nuova misura con gli strumenti di `backup/issue-109/Z/strumenti/`), tornare al comportamento dello scorrimento della 0.9.26, o accettarla dopo la prova col dito. Senza una scelta il banco resta 0.9.27 e nulla della 0.9.28 va sul tablet.
2. **Prova col dito** sul Tab M11 di ciò che la misura sintetica non vede: sagoma, volo nella casella, fogli, copia trascinata, nome della pagina sopra la prima riga (ISSUE-105).
3. Poi, a scelta dell'utente: ISSUE-112 (costo di `showModal()`), il commit che cade dentro le scene (A2), le barre con `translateY` rimaste (rettifica sopra).
4. **Commit e GitHub:** lunedì, con l'utente presente, dopo il controllo di sicurezza; poi D1 con la VM o il Dell ([REP-20261023-003](REP-20261023-003-piano-aggiungi-dispositivi.md)). Non c'è alcun commit.

## Diagnosi delle regressioni della 0.9.28 (2026-10-23, notte; parte 3)

*Annotazione datata: non riscrive le sezioni precedenti. Scritta da Claude Code (claude-opus-5-5), subagente del flusso, utente assente. Copie PRIMA in `backup/v0928/pre/parte3/`. Nessuna modifica al codice dell'app, nessun commit, nessuna dipendenza. Strumenti, estratti ed esiti in `backup/v0928/diagnosi3/` (`strumenti/USO.txt`, `prove/`, `esiti.json`).*

**Cosa non è stato fatto, e perché.** L'incarico chiedeva tracce CDP sul Tab M11 (timeline e profiler di V8) di 0.9.27 e 0.9.28. Non sono state registrate: le origini 3013-3015 del tablet non hanno più la sessione dei fixture (la misura della sera l'ha cancellata alla fine, sezione «Stato del banco e ripristino») e l'app mostra «Accedi ad Acasystem». Rimetterla vuol dire scrivere nell'origine il valore di accesso del server isolato (`ha_token`), e l'incarico vieta di usare token: mi sono fermato prima. Il tablet è stato lasciato com'era (scheda visibile di nuovo su `http://localhost:3002/#/`, chiavi della 3002 senza differenze al dry-run, server 3013-3015 avviati da me fermati per PID, reverse 3013-3015 e forward 9225 tolti, resta `adb reverse tcp:3002`). È pronta la build di profilo leggibile `backup/v0928/dist-profilo3` (stessi sorgenti di `dist-finale`: nessun file dei sorgenti è più recente di quella build) e sono pronti `trace.cjs` (categorie richieste, segni a ogni cambio di `data-far` e dello scroll vicino a una pagina) e `analyze-trace.cjs` (provato su una pagina sintetica in Chromium headless, non su una traccia del tablet). **Serve un'approvazione umana** per il passo che rimette la sessione dei fixture; la procedura è in `diagnosi3/strumenti/USO.txt`.

**Metodo usato al suo posto.** Le serie già raccolte dalla misura (`tablet-misura/probe-lib`: sonda leggera M-sw, M-ui, M-wd con 5 giri; sonda piena F-1 con le mutazioni di classi e attributi) lette per giro: task lunghi con l'ora rispetto al gesto, eventi di transizione e animazione, mutazioni nello stesso intervallo, layout-shift con le sorgenti; poi il codice. Sono **prove indirette**: dicono cosa cambia e quando, non quanto pesa React rispetto allo stile. La confidenza è indicata per voce.

| Regressione | Causa nel codice | Prova | Correzione proposta (aspetto approvato invariato) | Effetto stimato | Confidenza |
|---|---|---|---|---|---|
| Scorrimento SW1/SW2 | `Pager.tsx` 119, 473, 486-490, 947-955, 1008-1022: la finestra di ADR-0018 non si allarga più durante il gesto e si sposta solo dopo l'atterraggio (timer di 48 ms o subito) | 0.9.28: un task da 95-105 ms all'atterraggio con il commit dell'indice e il disegno della pagina oltre (SW2 5/5, SW1 2/5), oppure 53-70 ms e poi 110-117 ms a +157-230 ms (SW1 3/5: il timer slitta dietro i fotogrammi dell'indicatore). 0.9.27: lo stesso lavoro (transizioni di misura dei widget delle pagine 4-5, 28-34 facce) durante il dito, 56-94 ms a +184-215 ms, e 50-62 ms all'atterraggio. In F-1 il task cade sull'animazione dell'indicatore (etichetta annullata, fotogrammi da 100 ms) e allo sblocco 28 caselle «+» avviano `scale` e `transform` (solo 0.9.28: `launcher.css` 945-951) | Allargare la finestra al primo evento di scroll del gesto come nella 0.9.27; restringerla (pagina lasciata) in un momento libero dopo l'indicatore, non a 48 ms; nessuna transizione su widget e caselle delle pagine non correnti fuori dalla vista pagine | Atterraggio 50-70 ms; blocco massimo SW1 circa 75-94, SW2 circa 64-92 ms (livello 0.9.27), nessun task dentro l'animazione dell'indicatore. Non arriva alla 0.9.26 | Media-alta |
| Apertura della vista pagine | D-M25: `useStagedScene.ts` 18-33 (`flushSync` alla 29), usato in `LauncherScreen.tsx` 251, 1794-1796, 2092 e `Pager.tsx` 445-446: il secondo tempo rifà il render di tutto `LauncherScreen` dentro un `requestAnimationFrame` | Tre task prima della scena, 54-107, 99-141 e 94-149 ms (5/5), contro 60-67 e 115-126; scena a +834 ms contro +744 (F-1). Le transizioni dei widget in modifica (larghezza, altezza, traslazione, 31 facce) partono a +704, prima della scena | Tenere i due tempi ma fare il secondo con un attributo nel DOM (`data-staged` sulla radice, regole CSS che tengono il vecchio aspetto, `removeAttribute` nel secondo fotogramma), senza `setState` né `flushSync`; tenere sotto lo stesso attributo anche l'aspetto di modifica dei widget | Terzo task da 94-149 al solo ricalcolo della scena (≤ 50 ms: la rimozione di `is-entering` dal pager, che ristila tutte le schede, non ha mai dato task ≥ 50 ms); prima della scena circa 180-200 ms invece di 276 | Alta |
| «Fine» | Stesso meccanismo in chiusura | Commit 121-172 ms, poi `flushSync` 125-134 ms; scena a +457 contro +283; «Fine» → `is-settling` 898 contro 751 ms. I primi fotogrammi della scena sono migliori della 0.9.27 (133 e 78 contro 178 e 156 ms) | Come sopra | «Fine» → `is-settling` circa 780-800 ms, conservando i fotogrammi migliori | Alta |
| Sistema, entrata | `appShell.css` 244-259: in `wait` lo strato è a opacità 0 senza `will-change`, quindi non disegnato; `useOverlayScene.ts` 91-94 (`flushSync` che rifà il render di `LauncherPage`) e 120 (launcher nascosto solo a `on`); `LauncherPage.tsx` 56, 171-205 | Durante la dissolvenza rAF a 98 e 156 ms senza task ≥ 50 ms (thread principale libero: compositore o raster); launcher nascosto a +713 contro +337 | `will-change: opacity, scale` già in `wait`; la fase in un componente foglia che scrive `data-scene` nel DOM; se la traccia gpu lo chiede, uno o due fotogrammi di attesa in più | Fotogrammi oltre 50 ms nella dissolvenza da 2 a 0-1; la durata resta quella della scena (240 ms) | Media (raster dedotto, non tracciato) |
| Sistema, uscita | `useOverlayScene.ts` 101-104: `flushSync(out-wait → out)` rifà il render di `LauncherPage` e di `LauncherScreen` (non memorizzato, `notice` nuovo a ogni render: `LauncherPage.tsx` 171-191) nel fotogramma in cui il launcher appena mostrato va ristilato | Task 197-232 e 162-221 ms contro 144-168 e 114-171 | Componente foglia per la scena: `out-wait → out` senza render del launcher | Circa −40/60 ms sul secondo task (da verificare) | Media |
| «Annulla» della pillola | `LauncherScreen.tsx` 843-851 aggiunge `beginEntering` e `goEntering` (788-800, 817-828); widget rimontato a `is-entering` (`launcher.css` 818-832); casella «+» tenuta in uscita (`useLeaving.ts` 44-84, `WidgetGrid.tsx` 142-145, 261-278); tre aggiornamenti dello store (+0, +297, +630 ms) | Commit 129-183 ms contro 63-77; secondo task 50-57 ms a +436-453 | Da decidere con la traccia del profilo: se è render, evitare il doppio render della griglia e avviare l'entrata con una classe nel DOM; se è stile, ridurre gli elementi toccati | Non stimabile senza traccia | Bassa |
| Chiusura del foglio «Impostazioni del widget» | `Sheet.tsx` 97-112 con `motion.ts` 47: il tetto di 234 ms di `leaving` parte dal commit della chiusura, non dall'inizio della transizione; sul tablet scade prima della fine dell'uscita e il contenuto chiuso sostituisce quello congelato mentre il pannello è ancora sullo schermo | Shift 0,089-0,096 su `dialog.aca-widget-settings` a +214-242 ms dal `transitionrun`, 1-22 ms prima del `transitionend` (7 giri su 8); nella 0.9.27 0,014 all'inizio (piede) | Tenere il contenuto dell'ultima apertura per tutto il tempo in cui il foglio è chiuso (`shown = open ? frame : lastOpenFrame.current`), senza timer | Layout-shift della chiusura da 0,09 a 0, un render in meno | Alta |

**Altre osservazioni.**
- «Ts→T0» degli scorrimenti (1009 contro 92 ms in SW1) **non è una latenza**: la 0.9.27 aveva la scala del corpo pagina al tocco (prima transizione a +51 ms), tolta dalla pressione con soglia; nella 0.9.28 la prima transizione è l'indicatore all'atterraggio.
- Perché in SW2 il disegno della pagina oltre arrivi nello stesso task dell'atterraggio (ramo immediato di `Pager.tsx` 1015) non è provato: o lo scroll supera la pagina di più di 1,3 px durante il fling, o la finestra di partenza non è quella attesa. I segni `drawn:` e `scroll:` di `trace.cjs` lo diranno.
- La larghezza minima della barra del widget non compare nei task degli scenari analizzati; non è stata né esclusa né confermata.

**Punto di ripresa.** (1) Approvazione umana del ripristino della sessione dei fixture sulle origini 3013-3015 (oppure altra via indicata dall'utente), poi le tracce con `diagnosi3/strumenti/trace.cjs` e `analyze-trace.cjs` per confermare o correggere le cause di confidenza media e bassa. (2) Le correzioni proposte sono scelte esecutive dentro l'aspetto approvato; la loro realizzazione resta un passo distinto, con misura base/variante sul tablet.


## Correzioni della 0.9.28 dopo la diagnosi (2026-10-24; parte 3, correzioni)

*Annotazione datata: non riscrive le sezioni precedenti. Scritta da Claude Code (claude-sonnet-5-5), subagente del flusso, utente assente (fine settimana, «procedi da solo sulla 0.9.28»). Copie PRIMA in `backup/v0928/pre/parte3/` (le due prove `PagerFarPages` e `PagerFarNear` sono state modificate prima di essere copiate: della forma 0.9.28 resta solo l'estratto `PagerFar-0928-blocchi-sostituiti.txt`; la forma 0.9.27 intera è in `backup/v0928/pre/scorrimento/`). Nessun commit, nessuna dipendenza, nessun browser, nessun tablet, VM `acasystem-ha` spenta, `backup/d1/sandbox/` non toccato, informativa AI preservata. Il banco resta `aca-system:0.9.27`.*

**Cosa dice questa annotazione e cosa no.** Sono le correzioni della diagnosi qui sopra, nel codice, con i test che fissano l'assenza delle cause. **Nessuna è stata misurata sul tablet**: gli effetti sono le stime della diagnosi (prove indirette, nessuna traccia CDP) e restano **da verificare con la stessa misura** (5 giri alternati, strumenti di `backup/v0928/tablet-misura/`). L'aspetto approvato (solo scale entro il 10 %, nessuno scuotimento, sagoma tratteggiata, celle «+» in dissolvenza, ordine delle scene) **non cambia**: cambiano tempi e meccanismi interni.

### Correzioni applicate

| # | Regressione | Correzione | File | Scostamento dalla diagnosi |
|---|---|---|---|---|
| 1 | Scorrimento SW1/SW2/SW3 | La finestra di ADR-0018 si allarga di nuovo al primo evento `scroll` (tolto il ritorno anticipato di `follow()`); l'atterraggio non cambia alcuna finestra; il restringimento alla pagina di arrivo viene dopo 350 ms e in un momento libero (`requestIdleCallback`, limite 700 ms), annullato da un nuovo gesto; tolto il timer di 48 ms. Widget e caselle «+» delle pagine non correnti non avviano transizioni (regola CSS, esclusi vista pagine, ritorno, assestamento, entrata). | `templates/launcher/Pager.tsx`, `templates/launcher/launcher.css` | Nessuno. Il restringimento tiene la `reach` del gesto invece di una finestra a parte. Annotazione in ADR-0018. |
| 2 | Apertura della vista pagine e «Fine» | Il secondo tempo di D-M25 non rifà più il render di `LauncherScreen`. Il tempo è un valore (`Stage`) più un segnale fuori da React: pager, indicatore e barre (`HeldByStage`) lo ascoltano con `useSyncExternalStore` e si rendono da soli; niente `flushSync` (il render di un abbonamento a uno store esterno segue la funzione del fotogramma in un microtask, prima dello stile del fotogramma). | `hooks/launcher/useStagedScene.ts`, `templates/launcher/HeldByStage.tsx`, `templates/launcher/Pager.tsx`, `templates/launcher/LauncherScreen.tsx` | **Sì, sul meccanismo.** La diagnosi proponeva un attributo `data-staged` con regole CSS che tengono il vecchio aspetto e `removeAttribute`. Non l'ho fatto: duplicava in CSS l'aspetto di pager, barre, indicatore e controlli senza poterlo vedere (nessun browser) e rischiava di cambiare l'aspetto approvato. L'aspetto resta quello deciso da React nel primo commit; solo il secondo passo è piccolo. **Resta nel primo commit l'aspetto di modifica dei widget della pagina corrente** (la diagnosi voleva spostarlo nella scena): le transizioni dei widget della pagina corrente partono ancora prima della scena, come nella 0.9.27; quelle delle altre pagine non partono più (punto 1). |
| 3 | Sistema, entrata | `will-change: opacity, scale` già nella fase `wait` (lo strato è disegnato e rasterizzato fuori vista). | `templates/app-shell/appShell.css` | Nessuno. La diagnosi lo diceva "di media confidenza" (raster non tracciato). |
| 4 | Sistema, uscita (e fasi dell'entrata) | Il launcher è un elemento a sé in `LauncherPage` (`useMemo`): le fasi `wait`, `in`, `out-wait`, `out` non lo rifanno; arriva solo `covered`, per il contesto. I due `flushSync` della scena restano (devono cadere nel fotogramma) ma ora rendono lo strato e nient'altro. | `pages/launcher/LauncherPage.tsx`, `hooks/launcher/useOverlayScene.ts` (commento) | **Sì, sul meccanismo.** La diagnosi proponeva un componente foglia che scrive `data-scene` nel DOM; l'elemento memorizzato dà lo stesso risultato (il launcher non si rende) senza cambiare chi possiede la fase. |
| 5 | Chiusura del foglio «Impostazioni del widget» (layout-shift 0,09) | `afterTransition` ha l'opzione `fromRun`: al primo `transitionrun` della dialog il tetto riparte per il tempo della transizione, due fotogrammi e 100 ms (`SLOW_FRAMES_MS`). Il contenuto congelato resta fino alla fine dell'uscita, anche lenta. | `components/primitives/motion.ts`, `components/primitives/components/Sheet.tsx` | **Sì, sulla variante.** La diagnosi dava due strade; ho preso la seconda («tetto contato dal `transitionrun`») perché la prima (contenuto dell'ultima apertura sempre) lascia montati i figli del foglio chiuso, con i loro effetti. Senza `transitionrun` il tetto è quello di prima (200 ms e due fotogrammi). |

### Non applicato

- **«Annulla» della pillola (151 contro 82 ms), confidenza bassa.** La diagnosi dice che senza traccia non si può dire se il costo è render o stile e non ne stima l'effetto: non c'è una correzione fondata da applicare. Resta aperta.
- **Il commit del rilascio dentro il volo della copia** e **«Rimuovi» con 0,3 fotogrammi attesi**: non sono nella diagnosi come cause, non toccati.
- **Barra del widget con larghezza minima**: la diagnosi non l'ha esclusa né confermata, invariata.

### Test di guardia (assenza della causa)

- `SceneStaging.test.tsx`: il host di una scena **non si rende** alla fine dell'attesa (conteggio dei render del host e di una parte grande), lo fa solo ciò che ne dipende (la barra tiene l'aspetto di prima e prende il nuovo); il render segue la funzione del fotogramma **in un microtask, fuori da `act`** (non in un task dopo); **nessun `flushSync`** per la fine dell'attesa; `isStaged` per i gestori; `useHeld` confronta gli oggetti per campi.
- `SystemSceneRenders.test.tsx`: in `LauncherPage` reale con `LauncherScreen` contato, le fasi `wait`, `in`, `on`, `out-wait`, `out` **non rendono il launcher**. Verificato che fallisce con il `LauncherPage` di prima (7 contro 4 e 14 contro 11 render).
- `PagerFarPages.test.tsx` e `PagerFarNear.test.tsx`: lo swipe disegna le pagine davanti **dal primo evento** con una di scorta; **dall'arresto dello scroll fino al restringimento nessun `data-far` e nessuna classe sul pager** (osservatore di mutazioni, nessun record); il restringimento non viene prima di 350 ms (meno il tempo di arresto), parte in un momento libero con limite 700 ms, è annullato da un gesto che comincia e richiesto di nuovo al suo atterraggio; una pagina su cui lo scroll atterra non è mai saltata.
- `SheetSystemChoreography.test.tsx`: l'uscita lenta (`transitionrun` a +30 ms, fine oltre il tetto del commit) **mantiene il contenuto** finché la transizione non finisce; tetto dal `transitionrun` = tempo, due fotogrammi e 100 ms; il `transitionrun` di un elemento interno non conta; senza `transitionrun` il tetto è quello di prima.
- `RegressionCss0928.test.ts`: la regola senza transizioni per widget, facce e caselle «+» (compreso `.aca-launcher-cell__content`, scoperto mancante dal test) delle pagine non correnti, con le esclusioni (vista pagine, ritorno, assestamento, entrata); `will-change` sulla fase `wait` di Sistema.

### Verifiche

**Esito.** Suite frontend completa (`npx vitest run --maxWorkers=4`, dalla cartella `frontend`): **201 file e 3016 test verdi** in 1466 s (prima: 199 file e 3002 test; i file nuovi sono `SystemSceneRenders` e `RegressionCss0928`, più i test aggiunti ai file esistenti). `tsc -p tsconfig.strict.json --noEmit`: nessun errore. `npm run lint`: nessun avviso né errore. `npm run lint:typography`: 0 violazioni (522 file). `npm run lint:theme-colors`: 0 violazioni (343 file). Prettier sui file toccati: pulito. i18n: nella suite. Build: `npx vite build --outDir backup/v0928/dist-parte3` riuscita (la regola CSS e il `will-change` sono nel foglio di stile costruito). Backend non toccato e non rieseguito. **Non eseguiti:** misura sul tablet, prova col dito, qualsiasi browser.

### Limiti e punto di ripresa

- **Non misurato.** Tutto sopra è provato con i test (jsdom, senza stile calcolato né fotogrammi). Gli effetti attesi dalla diagnosi: atterraggio dello scorrimento 50-70 ms e blocchi massimi SW1 circa 75-94 e SW2 circa 64-92 ms (livello 0.9.27, non della 0.9.26); apertura della vista pagine con il terzo task ridotto al ricalcolo della scena; «Fine» circa 780-800 ms; Sistema in uscita −40/60 ms sul secondo task; layout-shift della chiusura del foglio vicino a 0. **Se la misura li smentisce, le cause vanno cercate con le tracce** (procedura in `backup/v0928/diagnosi3/strumenti/USO.txt`, che richiede l'approvazione umana della sessione dei fixture).
- **Il costo dello sblocco torna a cadere durante il dito** (nella 0.9.27: 56-94 ms a +184-215 ms dal tocco). È una scelta della diagnosi, fondata su una misura (blocchi massimi più bassi nella 0.9.27); la prova col dito dirà se si vede come scatto.
- Il restringimento della finestra a 350 ms dal primo tempo tiene disegnate fino a 5 pagine per un istante in più: costo di memoria e di disegno trascurabile in teoria, non misurato.
- **Punto di ripresa:** (1) costruire il banco di misura dal `dist-parte3` e rifare M-sw, M-ui, M-wd con le tre versioni (0.9.26, 0.9.27, 0.9.28 corretta); (2) se lo scorrimento torna a livello 0.9.27 o meglio e apertura, «Fine», Sistema e foglio migliorano, aggiornare il banco; altrimenti tracce CDP per le cause di confidenza media e bassa; (3) prova col dito (sagoma, volo, fogli, copia, ISSUE-105); (4) commit e primo invio su GitHub con l'utente presente. `project-status.md` non è stato aggiornato in questo passo (le sue voci sulla 0.9.28 dicono ancora «misurata e peggiore», che resta vero finché non c'è una nuova misura).


## Misura 3 della 0.9.28 corretta (2026-10-24; parte 3, misura sul Tab M11)

*Annotazione datata: non riscrive le sezioni precedenti. Scritta da Claude Code (claude-sonnet-5-5), subagente del flusso, utente assente (fine settimana). Copie PRIMA in `backup/v0928/pre/parte3/` (`REP-20261023-006-prima-misura3.md`, `REP-20261022-002-prima-misura3.md`). Nessuna modifica al codice dell'app, nessun commit, nessuna dipendenza, VM `acasystem-ha` spenta, `backup/d1/sandbox/` non toccato, informativa AI non toccata. Il banco resta `aca-system:0.9.27`. Dati, tabelle e strumenti in `backup/v0928/misura3/` (sintesi: `RISULTATI.md`).*

**Cosa è stato misurato.** La build `backup/v0928/dist-parte3` (`index-CwdFE-Br.js`, working tree con le correzioni della parte 3) contro la 0.9.27 (`dist-banco-0.9.27`) e, per lo scorrimento, anche contro la 0.9.26. Stesso metodo della misura della sera: Tab M11 (Chrome, 1280x665 a DPR 1,5, schermo acceso), gesti sintetici CDP sui fixture, server dei fixture sulle porte 3013-3015, 5 giri alternati più il giro 0, mediana [min-max], «migliore» o «peggiore» solo a intervalli non sovrapposti. Giri non validi: 0. Valore di accesso: la costante di prova del server dei fixture (non un token di Home Assistant; i token dell'origine 3002 non sono stati letti né usati).

**Esito per scenario rispetto alla 0.9.27.**

| Scenario | Esito | Cifre principali (p3 contro 0.9.27) |
|---|---|---|
| SW1 | massimo nd, somma PEGGIORE | massimo 121 [76-146] contro 85 [70-92]; somma 348 contro 144; 3 giri su 5 con un task di 121-146 ms all'atterraggio |
| SW2 | massimo nd, somma e numero PEGGIORE | 76 [70-82] contro 60 [53-80]; somma 275 contro 118; 4 task contro 2 (70-81 ms all'atterraggio e 58-64 ms circa 230 ms dopo, 5 giri su 5) |
| SW3 | nd | 72 [71-82] contro 85 [63-100]; somma 265 contro 198 |
| JUMP | PEGGIORE | massimo 133 [105-155] contro 93 [91-97]; somma 437 contro 171; 5 task contro 2 |
| Apertura vista pagine | prima della scena PEGGIORE, dentro la scena nd | 3 task prima della scena, somma 290 [282-309] contro 65; dentro la scena 103 contro 122 |
| «Fine» | PEGGIORE (tempi), migliore (fotogrammi della scena) | tocco -> `is-closing` 315 contro 175 ms; tocco -> `is-settling` 894 contro 748; fotogrammi della scena 18 contro 13 |
| Sistema, entrata e uscita | PEGGIORE | entrata: fotogrammi ricevuti/attesi 0,3 contro 0,5, fps 70,7 contro 81,9; uscita: blocco 209 contro 154 |
| «Annulla» della pillola | PEGGIORE | primo movimento 285 contro 184 ms; blocco prima 188 contro 80 |
| «Annulla» della barra | PEGGIORE (blocco prima), latenza nd su S3a | blocco prima 138 contro 102 (S3a), 134 contro 97 (S3cD) |
| «Rimuovi» | MIGLIORE prima del movimento, PEGGIORE nei fotogrammi | primo movimento 159 contro 226 ms; fotogrammi ricevuti/attesi 0,3 contro 0,4 |
| Chiusura del foglio «Impostazioni del widget» | MIGLIORE | layout-shift 0 contro 0,014 (S6a e RZ); lo 0,09 della sera non c'è più |
| Tocco sul «+» (A7) e tocco breve (A8) | MIGLIORE | riscontro 15,7-17,5 ms contro 107-301 ms; 0 fotogrammi con la pagina sotto scala 1 in 12 prove su 12 (base 2-8) |
| Rilascio della copia | misto | blocco prima del volo 0 contro 119-140 ms (migliore); ma blocco dentro il volo 143 contro 0 e fps 48,5 contro 64,8 (PEGGIORE) |
| Ridimensionamento | misto | layout-shift 0,001 contro 0,016 e sagoma senza contenuto a misura 0 (migliore); blocco nel gesto 191 contro 124 (ingrandire) e fps 47-52 contro 55-61 (PEGGIORE) |

**Riassunto.** Le correzioni hanno prodotto un solo miglioramento netto: la chiusura del foglio «Impostazioni del widget» non sposta più il layout. Il blocco massimo dello scorrimento non è più peggiore della 0.9.27 e della 0.9.26 su SW1-SW3 (a intervalli non sovrapposti), ma somma e numero dei task lunghi sono peggiori, JUMP è peggiore su tutto: **lo scorrimento non è tornato al livello della 0.9.27**. L'apertura della vista pagine ha ancora 3 task prima della scena; «Fine», Sistema, «Annulla» della pillola, il commit dentro il volo della copia e i blocchi nel ridimensionamento restano peggiori della 0.9.27. Il banco non va aggiornato con questa build.

**Limiti.** Gesti sintetici, nessuna prova col dito; i rAF non sono fotogrammi presentati; nessuna traccia CDP del thread (le cause della diagnosi di sopra restano da confermare). Le correzioni non sono state toccate in questo passo.

**Punto di ripresa.** (1) Decisione dell'utente (lunedì): proseguire con le tracce CDP (procedura in `backup/v0928/diagnosi3/strumenti/USO.txt`; la sessione di prova dei fixture sulle origini 3013-3015 è ora quella del server dei fixture, un valore di prova), oppure tornare al comportamento dello scorrimento della 0.9.26/0.9.27. (2) Prova col dito. (3) Commit e invio su GitHub solo con l'utente presente. Stato del tablet: dati delle origini 3013-3015 cancellati, scheda di misura chiusa, forward 9225 e reverse 3013-3015 tolti (resta `adb reverse tcp:3002`), chiavi del launcher della 3002 senza differenze, i tre server dei fixture fermati per PID.


## Parte 3: regressioni e correzioni (2026-10-23/24)

*Sintesi datata delle tre annotazioni che la precedono («Diagnosi delle regressioni», «Correzioni della 0.9.28 dopo la diagnosi», «Misura 3 della 0.9.28 corretta»); non le riscrive e non aggiunge esiti: ogni cifra viene da quelle sezioni e da `backup/v0928/misura3/RISULTATI.md`. Eseguita da Claude Code (claude-sonnet-5-5), subagenti del flusso, utente assente (fine settimana, «procedi da solo sulla 0.9.28»). Nessun commit, nessuna dipendenza, VM `acasystem-ha` spenta, `backup/d1/sandbox/` non toccato, informativa AI preservata. Copie PRIMA in `backup/v0928/pre/parte3/`.*

**Punto di partenza.** La misura della sera del 2026-10-23 aveva trovato la 0.9.28 peggiore della 0.9.27 nello scorrimento (blocco massimo SW1 110 contro 75 ms, SW2 98 contro 64, SW3 95 contro 81), nell'apertura della vista pagine (3 task prima della scena, somma 276 ms contro un task da 64), in «Fine» (898 contro 751 ms), in Sistema, in «Annulla» della pillola (151 contro 82 ms) e nella chiusura del foglio «Impostazioni del widget» (layout-shift 0,09 contro 0,014).

### Cause individuate (diagnosi, prove indirette)

Nessuna traccia CDP: la sessione dei fixture sulle origini 3013-3015 non c'era più e rimetterla richiedeva di scrivere un valore di accesso nell'origine, cosa vietata dall'incarico e non approvata. Le cause vengono dalle serie già raccolte e dal codice; la confidenza è per voce.

| Regressione | Causa | Confidenza |
|---|---|---|
| Scorrimento | la finestra di ADR-0018 non si allargava durante il gesto e si spostava solo dopo l'atterraggio (timer di 48 ms) | media-alta |
| Apertura della vista pagine e «Fine» | il secondo tempo di D-M25 rifaceva il render di tutto `LauncherScreen` con `flushSync` dentro un fotogramma | alta |
| Sistema, entrata | lo strato a opacità 0 non era disegnato: il primo disegno cadeva sui primi fotogrammi della dissolvenza | media |
| Sistema, uscita | `flushSync` rifaceva il render di `LauncherPage` e `LauncherScreen` | media |
| Foglio «Impostazioni del widget» | il tetto di 234 ms era contato dal commit, non dall'inizio della transizione: il contenuto chiuso sostituiva quello congelato prima della fine dell'uscita | alta |
| «Annulla» della pillola | percorso di ripristino individuato, ma render e stile non separabili senza profilo | bassa |

### Correzioni nel codice (5 su 6)

Scorrimento (finestra al primo evento `scroll`, restringimento dopo 350 ms in un momento libero, niente transizioni su widget e «+» delle pagine non correnti); secondo tempo di D-M25 senza render di `LauncherScreen` (valore più segnale fuori da React, `HeldByStage`); `will-change` di Sistema già in `wait`; launcher memorizzato in `LauncherPage`; tetto del foglio contato dal `transitionrun` (`afterTransition` con `fromRun`). Scostamenti dalla diagnosi (meccanismo del secondo tempo, elemento memorizzato al posto del componente foglia, variante del tetto del foglio) e test di guardia sono nella sezione «Correzioni della 0.9.28 dopo la diagnosi». **Non corretto:** «Annulla» della pillola, commit del rilascio dentro il volo della copia, barra del widget con larghezza minima. L'aspetto approvato non è cambiato. Rettifica a ADR-0018 (la finestra non è più ferma durante il gesto).

### Numeri prima e dopo (Tab M11, gesti sintetici CDP, 5 giri alternati, mediana [min-max]; «migliore/peggiore» solo a intervalli non sovrapposti)

| Voce | Sera, 0.9.28 | Dopo la parte 3 | 0.9.27 (riferimento) | Esito della parte 3 contro la 0.9.27 |
|---|---|---|---|---|
| Scorrimento, blocco massimo SW1 / SW2 / SW3 (ms) | 110 / 98 / 95 | 121 [76-146] / 76 [70-82] / 72 [71-82] | 85 / 60 / 85 | non distinguibile |
| Scorrimento, somma dei blocchi SW1 / SW2 / SW3 (ms) | non riportata | 348 / 275 / 265 | 144 / 118 / 198 | SW1 e SW2 peggiore, SW3 nd |
| JUMP, massimo / somma / numero | non riportato | 133 / 437 / 5 | 93 / 171 / 2 | peggiore su tutto |
| Apertura vista pagine, task prima della scena | 3 (somma 276 ms) | 3 (somma 290 [282-309] ms) | 1 (65 ms) | peggiore; dentro la scena 103 contro 122, nd |
| «Fine», tocco fino a `is-settling` (ms) | 898 | 894 | 748 | peggiore; fotogrammi della scena 18 contro 13, migliore |
| Sistema, entrata | peggiore | fotogrammi ricevuti/attesi 0,3 contro 0,5; fps 70,7 contro 81,9 | | peggiore |
| Sistema, uscita, blocco (ms) | peggiore | 209 contro 154 | 154 | peggiore |
| «Annulla» della pillola, primo movimento (ms) | 151 contro 82 (blocco) | 285 contro 184 (blocco prima 188 contro 80) | 184 | peggiore (non corretto) |
| Foglio «Impostazioni del widget», layout-shift alla chiusura | 0,09 | 0 | 0,014 | **migliore** |
| Tocco sul «+», riscontro (ms) | 17,5 | 15,7-17,5 contro 107-301 | | migliore |
| Tocco breve (A8), fotogrammi con la pagina sotto scala 1 | 0 | 0 in 12 prove su 12 (base 2-8) | | migliore |
| Rilascio della copia, blocco prima del volo (ms) | | 0 contro 119-140 | | migliore; ma blocco dentro il volo 143 contro 0 e fps 48,5 contro 64,8, peggiore |
| Ridimensionamento | | layout-shift 0,001 contro 0,016 (migliore); blocco nel gesto 191 contro 124 (peggiore) | | misto |

Giri non validi: 0. Il blocco massimo dello scorrimento non è più peggiore della 0.9.27, ma ogni atterraggio ha ancora due task (70-81 ms e circa 60 ms dopo ~230 ms) e in 3 giri su 5 di SW1 uno da 121-146 ms: **lo scorrimento non è tornato al livello della 0.9.27**, e contro la 0.9.26 somma e numero restano peggiori. Il «Ts a T0» di 1009 contro 92 ms della sera non era una latenza (la 0.9.27 scalava il corpo pagina al tocco).

### Stato del banco

Il banco resta `aca-system:0.9.27` (192.168.1.7:3002); **la 0.9.28 con le correzioni (`backup/v0928/dist-parte3`) non è stata portata sul tablet.** Verifica del software della parte 3: suite frontend 201 file e 3016 test verdi (`--maxWorkers=4`), `tsc` strict, `lint`, `lint:typography`, `lint:theme-colors`, prettier e build verdi; backend non rieseguito. Tablet lasciato com'era (dati delle origini 3013-3015 cancellati, `adb reverse tcp:3002` lasciato, forward 9225 e reverse 3013-3015 tolti, chiavi della 3002 senza differenze, server dei fixture fermati per PID).

### Problemi rimasti e punto di ripresa

Peggiori della 0.9.27 dopo la parte 3: scorrimento (somma, numero, JUMP), lavoro prima della scena all'apertura della vista pagine, «Fine» (tempi), Sistema in entrata e uscita, «Annulla» della pillola e della barra, commit dentro il volo della copia, blocchi nel ridimensionamento. Le cause di questi punti non sono confermate da tracce. **Decisione dell'utente (lunedì):** (1) tracce CDP con `backup/v0928/diagnosi3/strumenti/USO.txt` (richiede di rimettere una sessione di prova sui fixture), oppure tornare allo scorrimento della 0.9.26/0.9.27 tenendo le parti della 0.9.28 che migliorano (foglio, «+», tocco breve, sagoma); (2) prova col dito sul Tab M11; (3) commit e primo invio su GitHub solo con l'utente presente, poi D1.


## Diagnosi 4 della 0.9.28 con tracce CDP (2026-10-24)

*Annotazione datata: non riscrive le sezioni precedenti. Scritta da Claude Code (claude-opus-5-5), subagente del flusso, utente assente. Copia PRIMA in `backup/v0928/pre/parte3/REP-20261023-006-prima-diagnosi4.md`. Sola diagnosi: nessuna modifica ai sorgenti dell'app, nessun commit, VM `acasystem-ha` spenta, `backup/d1/sandbox/` non toccato. Dati, strumenti e conclusioni in `backup/v0928/diagnosi4/` (`CONCLUSIONI.md`, `esiti.json`, `strumenti/USO.txt`, `analisi/`, `tracce/`).*

**Cosa è stato fatto.** Tracce CDP sul Tab M11 (Chrome 156; timeline, timeline.stack, user timing, v8.execute, profiler di V8 «hires» a 100 µs nominali) della build di profilo leggibile `backup/v0928/dist-profilo4` (working tree attuale, non minificata, con source map) e della 0.9.27 (`dist-banco-0.9.27`) per SW1, JUMP, T1 (apertura della vista pagine e «Fine»), Sistema entrata e uscita (S5c), «Rimuovi» e «Annulla» della pillola (S6a), trascinamento, rilascio della copia e «Annulla» della barra (S3a), ridimensionamento (RZ): giri 0-2 per versione. In più: una passata delle invalidazioni di stile, una di raster e GPU per Sistema, un controllo con la build minificata `dist-parte3` (stessi tempi ed elementi della build di profilo) e, per provare le cause, due copie **diagnostiche** della build con regole tolte dal foglio di stile costruito (un giro per scenario: cifre indicative). Valore di accesso: la costante di prova del server dei fixture; i token della 3002 non sono stati letti né usati.

**Esito.** React non è la parte in più: lo script della 0.9.28 è uguale o minore della 0.9.27 nella maggior parte delle fasi. La parte in più è il **ricalcolo dello stile**: da 2 a 4 volte gli elementi ristilati, spesso in un task in più.

| # | Causa certa | Dove | Prova principale |
|---|---|---|---|
| C1 | `:has()` sulla radice: `pageIndicator.css` 211-214 e 227-228 (D-M3/D-M24, ritardo dell'indicatore nella vista pagine). Ogni nodo montato o smontato dentro `.aca-shell` ristila tutto lo shell (1230-1750 elementi, 40-160 ms) | scorrimento (anche il secondo task ~230 ms dopo l'atterraggio, dalla dissolvenza dell'etichetta, `PageIndicator.tsx` 66-76), JUMP, «Annulla» della pillola e della barra, rilascio, RZ, «Rimuovi», uscita da Sistema | invalidazioni `SUBTREE DIV.aca-shell` da `insertOrAppendPlacementNode`/`commitDeletionEffectsOnFiber`; senza la regola: SW1 242 → 122 ms (3559 → 1043 elementi), JUMP 230 → 92, «Annulla» della pillola 294 → 98 (0.9.27: 95), della barra 187 → 105 (99), RZ ingrandire 475 → 290 (442), uscita da Sistema 470 → 362 (544) |
| C2 | `transition: none` delle pagine non correnti (`launcher.css` 853-865, parte 3) legata alle classi del pager: ogni cambio di `is-entering`, `is-settling`, `is-closing`, `is-overview`, `is-current` invalida ~850 elementi | apertura della vista pagine (rimozione di `is-entering`, 109-162 ms), fine della chiusura (63-126 ms) | senza C1 e C2: prima della scena 448 → 339 ms (0.9.27: 342). Senza la regola RZ peggiora (365 → 519 ms): lo scopo resta giusto, è la forma che costa |
| C3 | Secondo tempo di D-M25 (`useStagedScene.ts`, `HeldByStage.tsx`, `Pager.tsx` 426/478): un ricalcolo separato due fotogrammi dopo il commit | «Fine»: task a +325-383 ms (1700 elementi anche senza C1/C2) e latenza tocco → `is-closing` (315 contro 175 ms) | assente nella 0.9.27 (+219 ms, 28 elementi) |
| C4 | `measureCards` (`Pager.tsx` 190-211) dal `ResizeObserver` (744) inserisce e toglie una sonda nel pager: con C1 due ristili completi | uscita da Sistema (250-261 contro 187-202 ms) | 2 × 1230 elementi forzati da `measureCards` |
| C5 | Sistema in dissolvenza sopra il launcher visibile (D-M12) | entrata in Sistema | disegno del compositore 164-196 contro 88-94 ms e raster GPU 199-223 contro 153-157 ms in 800 ms; task del thread principale uguali |
| C6 | Commit del rilascio alla fine del volo (D-M8: `DragGhost.tsx` 91, `motion.ts` 57, `useWidgetDrag.ts` 675) | rilascio della copia | render 47 ms + mutazioni a +270-279 ms, poi C1 |

**Correzioni possibili (aspetto approvato invariato).** K1: togliere il `:has()` su `.aca-shell` e dare il ritardo all'indicatore con una classe o un attributo messo da React (effetto misurato sopra: quasi tutto al livello della 0.9.27 o meglio, scompare il secondo task dell'atterraggio). K2: la regola delle pagine fuori vista su un attributo delle pagine invece che sulle classi del pager (apertura ~340 ms prima della scena, RZ invariato). K3: `is-closing` nel commit del tocco su «Fine», o accettare il secondo tempo (tocco → `is-closing` ~175 ms, un task in meno, si perdono i fotogrammi migliori della chiusura). K4: `measureCards` senza sonda nell'albero dell'app o con i valori ricordati (superflua con K1). K5: Sistema con dissolvenza più corta, senza dissolvenza o come cambio di schermata. K6: commit del rilascio al rilascio, o accettare la sosta (con K1 il blocco nel volo scende da ~140 a ~75 ms).

**Cosa costa più di quanto rende.** Il ritardo dell'indicatore nella vista pagine (120 ms di sfasamento in una scena contro un ristile di tutta l'app in ogni scena); la regola `transition: none` nella forma attuale; il secondo tempo in chiusura (140 ms di latenza su «Fine»); Sistema in dissolvenza sopra il launcher (doppio disegno sulla Mali-G52). Rendono senza costo misurabile: soglia della pressione e riscontro del «+», pila vuota, niente chip «Da collegare», chiusura del foglio senza salto, finestra dello scorrimento allargata al primo `scroll`.

**Opzioni da proporre all'utente (decisione sua).**

- **A — «0.9.28 leggera».** Sul banco solo: soglia della pressione e riscontro del «+», pila vuota, niente chip «Da collegare», chiusura del foglio senza salto, correzione dello scorrimento (`Pager.tsx`; la regola `transition: none` rivista come K2 o tolta); il resto della coreografia come nella 0.9.27 (niente secondo tempo D-M25, Sistema come cambio di schermata, etichetta senza dissolvenza, indicatore senza `:has()`, widget senza sagoma, volo ed entrate/uscite delle caselle e dei widget). Lavoro: ritorno selettivo dentro file che mescolano le parti, test dei blocchi 1-3 da togliere o adattare, suite e build, misura sul tablet: circa 1 giorno più 3-4 ore di misura. Si perde la coreografia approvata.
- **B — «continuare a ottimizzare la coreografia».** B1: K1, K2, K4 con test di guardia, suite, build e misura (M-sw, M-ui, M-wd): circa mezza giornata più 3-4 ore di misura; le build diagnostiche indicano che porta scorrimento, salto, «Annulla», rilascio, RZ e uscita da Sistema al livello della 0.9.27 o meglio. B2, dopo B1 e con esito meno sicuro: «Fine» (K3), entrata in Sistema (K5), commit del volo (K6): 1-2 giorni con una misura per scelta. Indicazione tecnica: B1 costa meno di A e toglie la maggior parte delle regressioni senza cambiare l'aspetto; A è la via per una base sicura subito.

**Limiti.** Gesti sintetici CDP sui fixture, non il dito. Le cifre «senza C1/C2» vengono da un giro per scenario (indicative, non verdetti a intervalli). Togliere una regola `:has()` dal CSSOM di una pagina già caricata non ne toglie l'effetto: per C1 valgono solo le copie della build. La passata delle invalidazioni non ricaricava la pagina tra gli scenari (vale per l'attribuzione, non per i tempi). Il PC è andato in sospensione dalle 03:36 alle 13:03 e adb ha perso forward e reverse: la passata interrotta è stata rifatta, nessun dato mischiato.

**Stato del tablet.** Dati delle origini 3013-3015 cancellati, scheda di misura chiusa, scheda `http://localhost:3002/#/` in primo piano, chiavi del launcher della 3002 senza differenze (dry-run), server dei fixture fermati per PID, forward 9225 e reverse 3013-3015 tolti, `adb reverse tcp:3002` presente (ricreato dopo la sospensione). Il banco resta `aca-system:0.9.27`.

**Punto di ripresa.** Decisione dell'utente tra A e B (B1 come primo passo se sceglie B); poi realizzazione con test di guardia e misura sul tablet con gli strumenti di `backup/v0928/misura3/` e `diagnosi4/`; prova col dito; commit e primo invio su GitHub solo con l'utente presente.

## Ottimizzazione 0.9.28, giro 1 (2026-10-24)

*Annotazione datata: non riscrive le sezioni precedenti. Scritta da Claude Code (claude-sonnet-5-5), subagente del flusso, utente assente. Scelta dell'utente del 2026-10-24: «B» (continuare a ottimizzare la coreografia invece di ridurla); su «Fine» «Risposta più rapida» (K3), su Sistema «Dissolvenza più breve» (K5). Copie PRIMA in `backup/v0928/pre/ottimizza-1/` (17 file di sorgenti e test, `design.md` e questo report). Nessun commit; informativa AI e `backup/d1/sandbox/` non toccati. Giro 1 solo di codice: nessun browser, nessun tablet, nessuna misura.*

### Modifiche (aspetto approvato invariato salvo i tempi di Sistema e i primi fotogrammi di «Fine», scelti dall'utente)

- **K1 (C1).** `pageIndicator.css`: il ritardo dell'indicatore nella vista pagine non è più `.aca-shell:has(> .aca-shell__main > .aca-pager.is-overview) .aca-indicator:not(.aca-indicator--hidden)` ma `.aca-indicator.aca-indicator--overview:not(.aca-indicator--hidden)`, anche nel gruppo del movimento ridotto. `PageIndicator.tsx`: nuova prop `overview` che dà la classe; `FlashingPageIndicator.tsx` la passa. Il valore è quello già trattenuto da `HeldByStage`, quindi la classe compare nello stesso commit in cui il pager prende `is-overview` e in cui l'indicatore perde `--hidden`: il ritardo c'è quando la transizione nasce.
- **K2 (C2).** `Pager.tsx`: ogni pagina ha `data-quiet` se è fuori vista e il pager non ha `is-overview`, `is-closing`, `is-settling`, `is-entering` (le stesse quattro condizioni di prima, calcolate dagli stessi valori). `launcher.css`: la regola `transition: none` è ora su `.aca-pager > .aca-pager__page.aca-pager__page[data-quiet] :is(...)`; la classe della pagina è scritta due volte per conservare la specificità del vecchio selettore (0,6,0), perché regole dei widget in modifica pesano fino a 0,5,0. Resta il ristile alla fine dell'assestamento, quando l'attributo torna.
- **K3 (C3).** `useStagedScene(value, enabled, stageClosing = true)`: con `stageClosing` false solo il passaggio a vero aspetta. `LauncherScreen.tsx` passa `false`: «Fine» mette `is-closing` nel commit del tocco, come la 0.9.27; l'apertura aspetta ancora due fotogrammi (D-M25). Restano la prop `staged` del pager e i suoi test.
- **K4 (C4).** `measureCards` ricorda per ogni pager il risultato della sonda (WeakMap) sotto una firma: larghezza, `fontSize` del pager e della radice, dimensioni della finestra e valori calcolati di `--aca-card-gap`, `--aca-card-footer`, `--aca-space-2`, `--aca-space-4`, `--aca-undo-room`, `--aca-overview-foot` (le sei variabili che la sonda legge; il piano ne elencava quattro, ma la sonda usa anche i due spazi). Con la stessa firma non si aggiunge né si toglie alcun nodo. L'altezza non è nella firma: la sonda non ne dipende, k sì ed è ricalcolato.
- **K5 (C5).** `--aca-dur-system-in` 240 → 140 ms e `--aca-dur-system-out` 160 → 96 ms (rapporto 160/240 conservato, 6 fotogrammi); `SYSTEM_IN_MS`/`SYSTEM_OUT_MS` e i valori di riserva di `appShell.css` allineati. Scala 0,96 e curve invariate.
- **K6a (C6, parte invisibile).** `DragGhost.tsx`: `afterTransition(..., { fromRun: true })`: il tetto del volo conta dall'inizio reale della transizione, quindi il commit del rilascio cade sul `transitionend`, con la copia ferma sulla casella, non al tetto contato dall'effetto (+270-279 ms).
- **M1.** `Pager.tsx`, `follow`: l'ultimo `scroll` dello snap (per esempio 5,003 → 4,998 → 5) non inverte più la direzione della finestra se lo spostamento contrario è al più 0,1 pagina e la posizione è entro 0,02 da una pagina; un ritorno reale (oltre 0,1 o lontano da una pagina) la inverte.
- **M2.** `LauncherScreen.tsx`: `data-aca-input` sulla radice è scritto solo se il valore cambia.

### Test di guardia e aggiornamenti

Nuovo `StyleInvalidation0928.test.ts`: nessun `:has()` su `.aca-shell`, `.aca-shell__main`, `.aca-app-root`, `html`, `:root` o `body` seguito da combinatore discendente o di fratello (eccezioni scritte: `html:has(.aca-app-root)` e le tre regole di `edit.css` già nella 0.9.27, K1b); la regola del ritardo ×3 esiste su `.aca-indicator--overview`, anche nel gruppo del movimento ridotto. Aggiornati `MotionChoreography` (selettore), `MotionChoreographyBlock2` (token e valori di riserva di Sistema: ingresso 120-160 ms, rapporto uscita/ingresso 160/240 ±0,05), `RegressionCss0928` (regola su `data-quiet`, assenza della forma vecchia), `SceneStaging` («Fine» non aspetta, apertura sì, «Fine» dentro l'attesa dell'apertura senza fotogrammi pendenti; classe dell'indicatore nello stesso commit di `is-overview`), `LauncherScreen` («Fine»: `is-closing`, barra e indicatore nello stesso `act` del tocco, senza far scorrere fotogrammi; `data-aca-input` scritto una volta), `PagerOverview` (`data-quiet` a riposo, in vista pagine, in entrata, in chiusura, in assestamento; nessuna scrittura per il cambio tra le classi del pager; sonda non ripetuta con la stessa firma, ripetuta con larghezza o variabile diverse), `PagerFarPages` (M1: l'overshoot non gira la finestra, un ritorno reale sì; verificato che il test fallisce senza la correzione), `WidgetChoreography` (con `transitionrun` ritardato il volo non finisce al vecchio tetto, e senza `transitionend` finisce al tetto contato dall'inizio) e `SheetSystemChoreography` (attesa di `SYSTEM_IN_MS`).

### Verifiche

- `npm run typecheck` (tsc strict): 0 errori. `npm run lint` (eslint src): senza segnalazioni. `npm run lint:typography`: 0 violazioni su 522 file. `npm run lint:theme-colors`: 0 violazioni su 343 file. Prettier: i file toccati sono conformi.
- `npx vitest run --maxWorkers=4` (suite intera, `backup/v0928/suite-ottimizza1.txt`): 201 file su 202 e 3035 test su 3036 superati; l'unico fallimento era un test di `SheetSystemChoreography` che aspettava 240 ms per Sistema, corretto con `SYSTEM_IN_MS` e rieseguito (31 su 31). Seconda esecuzione completa dopo la correzione (`backup/v0928/suite-ottimizza1-b.txt`): 202 file e 3036 test su 3036 superati.
- `npx vite build --outDir backup/v0928/dist-g1`: riuscita (`backup/v0928/step-build-g1.txt`), `dist/` non toccata. Nel CSS costruito non resta alcun `.aca-shell:has(` e la regola delle pagine fuori vista è su `.aca-pager__page.aca-pager__page[data-quiet]`.

### Limiti e punto di ripresa

Nessuna misura sul tablet in questo giro: le stime della diagnosi 4 (varianti con un solo giro per scenario) sono indicative e non verdetti; l'obiettivo del banco (nessuna misura peggiore della 0.9.27 a intervalli non sovrapposti) è da verificare con la regola statistica. La build di profilo leggibile (`vite build --minify false --sourcemap`) per le tracce D4 non è stata costruita. In base al piano restano probabilmente a rischio: JUMP sul pallino accanto (con K1+K2 circa 147 contro 109 ms nelle varianti diagnostiche), entrata in Sistema (K5 riduce i fotogrammi, non elimina il doppio disegno) e il blocco del rilascio nella finestra della metrica (K6a lo porta a circa 75-90 ms, ma resta peggiore del [0-0] della 0.9.27). **Proposte non applicate, da decidere:** K1b (sostituire con classi messe da React le tre regole `:has()` di `edit.css` su `is-closing` e `is-overview`; prova indicativa in `backup/v0928/ottimizza1-diag`: «Fine» da circa 306 a 283 ms nei primi due task), K2b (rimettere `data-quiet` a inattività), K6b (commit del rilascio prima del volo, widget già nella casella e nascosto finché la copia atterra: il volo parte 60-80 ms dopo il rilascio invece di 48, una differenza di tempi visibile; da decidere con l'utente), analisi del commit di JUMP accanto (`WidgetGrid.tsx` 410-414). Prossimo passo: giro 2 con build di profilo, misura sul Tab M11 (catene M3-sw, M3-ui, M3-wd più F3 per i miglioramenti da conservare, tracce D4 su SW1, JUMP, T1, S5c, S3a), salvando e ripristinando le chiavi del launcher della 3002 e cancellando alla fine i dati delle origini 3013-3015. Il banco resta `aca-system:0.9.27`.

## Misura del giro 1 sul Tab M11 (2026-10-24)

*Annotazione datata: non riscrive le sezioni precedenti. Scritta da Claude Code (claude-sonnet-5-5), subagente del flusso, utente assente. Copia PRIMA di questo report in `backup/v0928/pre/ottimizza-misura-g1/`. Nessuna modifica ai sorgenti dell'app, nessun commit; informativa AI e `backup/d1/sandbox/` non toccati; VM spenta. Dati, tabelle e strumenti in `backup/v0928/misura-g1/` (`RISULTATI.md`).*

**Cosa è stato fatto.** Build `backup/v0928/dist-g1` (non più vecchia dei sorgenti) contro la 0.9.27 (`dist-banco-0.9.27`, porta 3014) con gli strumenti e la regola della misura 3: 5 giri alternati più il giro 0, mediana [min-max], «migliore»/«peggiore» solo a intervalli non sovrapposti. Campagne leggere (SW1-SW3, JUMP; TAP, T1, S7b, HC, S2c, S5a-c, AW, S8; S3a, S3cD, RZ, S6a) e una piena a 3 giri (TAP, RZ, S3a, T1). Tutti i giri validi. La g1 è stata servita sulla porta 3016 perché 3013 e 3015 erano occupate da due server dei fixture lasciati da un passo precedente (PID 39524 e 50940, non avviati da questo passo, non terminati); scheda di misura propria selezionata per id.

**Esito rispetto alla 0.9.27 (misura 3 fra parentesi).**

| Misura | Esito |
|---|---|
| SW1, SW2, SW3 (massimo, somma, numero) | nd, con tendenza migliore (misura 3: somma e numero PEGGIORE in SW1-SW2) |
| JUMP | nd (somma 239 [181-261] contro 199 [173-209], numero 3 contro 2: tendenza peggiore, intervalli sovrapposti; un passo con latenza 54 contro 43 ms PEGGIORE) (era PEGGIORE su tutto) |
| Apertura della vista pagine | **PEGGIORE** prima della scena: 3 task, somma 256 [253-263] contro 63 [60-66] ms; dentro la scena migliore (82 contro 117) |
| «Fine» tocco -> `is-closing` / -> `is-settling` | nd: 176 contro 191 ms; 812 [787-830] contro 764 [748-815] ms (era 315 contro 175) |
| Sistema, entrata | **PEGGIORE**: fotogrammi ricevuti/attesi 0,3 contro 0,5, fps 69 contro 83, somma dei blocchi 445 contro 392 |
| Sistema, uscita | nd |
| «Annulla» della pillola | nd (era PEGGIORE) |
| «Annulla» della barra | S3a **PEGGIORE** solo la latenza (213,5 contro 201,6 ms); S3cD nd |
| Rilascio della copia | **PEGGIORE** nel volo (blocco 135 / 161 ms contro 0, fps 53 contro 62,5); MIGLIORE prima del volo (blocco 0 contro 130, latenza 47 contro 209 ms) |
| Ridimensionamento | nd, layout-shift 0,001 contro 0,016 (migliore) (blocchi e fps nel gesto erano PEGGIORE) |
| Da mantenere: riscontro del «+», tocco breve, foglio senza salto, layout-shift di RZ | tutti mantenuti: riscontro 13,7 contro 302 ms; 0 fotogrammi sotto scala 1 in 12 prove su 12; layout-shift della chiusura del foglio 0 contro 0,014; RZ 0,001 contro 0,016 |

**Lettura.** K1, K2, K3, K4 e K6a hanno portato scorrimento, JUMP (somma/numero con riserva), «Fine», «Annulla» della pillola, uscita da Sistema e ridimensionamento a «non distinguibile» o meglio. Obiettivo non raggiunto: restano peggiori l'apertura della vista pagine (nella sonda: task a +506/+585/+694 ms dal tocco contro +508/+571; `is-overview is-entering` a +698 contro +571 ms, cioè la soglia della pressione, il commit di `is-overview` e il secondo tempo di D-M25 sono tre task distinti), l'entrata in Sistema (scena a +433 ms dal tocco con un terzo task di circa 58 ms a +361), il volo del rilascio (commit di 133 ms sul `transitionend`, a +285 ms) e, di poco, la latenza di «Annulla» della barra in S3a; JUMP resta da tenere d'occhio. Effetto collaterale: dopo il riscontro del «+» il foglio ha un blocco di circa 190 ms (la base lo aveva prima del riscontro); «Aggiungi il widget» (AW) blocco prima 261 contro 223 ms PEGGIORE.

**Limiti.** Gesti sintetici CDP sui fixture, non il dito; nessuna traccia CDP in questo giro (i task sono i longtask della sonda); i valori della base variano fra sessioni (JUMP massimo 119 contro 93 della misura 3), quindi i confronti valgono dentro la sessione. Le durate «T0..fine» più lunghe in g1 sono la coreografia approvata e non sono state usate come verdetto.

**Stato del tablet e ripristino.** Dati delle origini 3013-3016 cancellati, scheda di misura chiusa, server 3014 e 3016 fermati per PID, forward 9225 e reverse 3013-3016 tolti, resta `adb reverse tcp:3002`; chiavi del launcher della 3002 senza differenze (dry-run). Restano, non toccati, i due server dei fixture di un passo precedente (3013 PID 39524 con `ottimizza1-diag/dist-diagHM`, 3015 PID 50940 con `diagnosi4/dist-diagH`) e una scheda `http://localhost:3013/#/` aperta sul tablet da quel passo: da fermare/chiudere da chi li ha avviati. Il banco resta `aca-system:0.9.27`.

**Punto di ripresa.** Giro 2 con tracce CDP (build di profilo leggibile) su apertura della vista pagine (fondere soglia della pressione, commit di `is-overview` e secondo tempo di D-M25), entrata in Sistema (terzo task e scena a +433 ms), commit del rilascio (K6b, da decidere: cambia i tempi visibili) e latenza di «Annulla» della barra in S3a; poi nuova misura con la stessa regola.

## Ottimizzazione 0.9.28, giro 2 (2026-10-24/25)

*Annotazione datata: non riscrive le sezioni precedenti. Scritta da Claude Code (claude-sonnet-5-5), subagente del flusso, utente assente. Copie PRIMA in `backup/v0928/pre/ottimizza-2/`. Nessun commit; informativa AI e `backup/d1/sandbox/` non toccati; nessuna dipendenza nuova; nessun browser e nessun tablet in questo giro. Il tentativo precedente del giro era stato interrotto a metà (passi 1-4 avviati): ripreso dai file, senza ripartire da capo.*

**Piano applicato (passi 1-9 delle tracce G2 in `backup/v0928/diagnosi-g2/`; passo 10, passo 11 e D1-D3 NON applicati: spettano all'utente).** Le cifre di guadagno sono stime dalle tracce, non misure.

1. K2b, `data-quiet` stabile nelle scene (Pager.tsx): `data-quiet={off ? '' : undefined}`, scritto solo quando cambia la pagina corrente, mai in apertura, «Fine» e assestamento. La regola di `launcher.css` resta.
2. O-E, comandi disabilitati in modifica (launcher.css): tolto l'antenato `.is-editing`; la regola è su `.aca-m:is([disabled], [aria-disabled='true'])` (specificità invariata, classe del widget scritta due volte). I widget disabilitano già i controlli con `disabled={editMode}`. Differenza minima, da far vedere: un controllo che diventa non disponibile fuori dalla modifica non transita più l'ombra.
3. K1b, niente `:has()` su `.aca-shell__main` (edit.css, LauncherScreen.tsx, EditToolbar.tsx, PageOverviewBar.tsx): classi `aca-page-overview--overview` (valore tenuto da HeldByStage, nello stesso commit delle classi del pager) e `aca-edit-toolbar--closing`. Nota: `EditToolbar` non è montata dal launcher (solo UI kit e test), la prop `closing` tiene viva la regola per chi la usa.
4. S-R, Sistema con un solo raster a scala 1 (appShell.css, useOverlayScene.ts, primitives/motion.ts): `will-change: opacity, scale` dall'attesa alla fine; l'entrata è un'animazione `aca-system-in` da opacità 0 e scala `--aca-scale-page` a 1 (stessi valori, 140 ms); la fine si ascolta su `animationend` (nuova `afterAnimation`, con tetto come `afterTransition`). Uscita invariata (transizione, 96 ms).
5. S-L, mappa di Posizione dopo la scena (useOverlayScene.ts `OverlayPhaseContext` e `useSceneReached`, LauncherPage.tsx, LocationSection.tsx): Leaflet si crea un fotogramma dopo `on`; senza scena subito. La mappa compare circa 150 ms più tardi, sotto la piega.
6. M3, formattatori della data (utils/launcher/calendar.ts): `Intl.DateTimeFormat` a livello di modulo e ultimo risultato ricordato per giorno.
7. M4, `upgradeCategoryGrids` (templates/sheets/categoryPageGrid.ts): una pagina lasciata com'è non viene riesaminata se pagina, famiglia, impostazioni, pagina principale e contesto sono gli stessi oggetti (WeakMap per pagina radice).
8. M5, `is-dragging` solo sulle pagine a portata (WidgetGrid.tsx): pagina in vista, vicine e pagina di destinazione; prima su tutte.
9. K2c, `data-quiet` della pagina lasciata dopo l'atterraggio (Pager.tsx): un timer di `NARROW_AFTER_LANDING_MS` (non un secondo `requestIdleCallback`, per non toccare il conteggio del restringimento della finestra); la nuova corrente lo perde subito.

**Test di guardia e aggiornamenti.** Nuovo `OptimiseG20928.test.tsx` (data senza nuovi formattatori; migrazione non rifatta per la stessa pagina e rifatta se cambiano impostazioni, contesto o pagina; fase della scena e mappa). Aggiornati `MotionChoreographyBlock2`, `RegressionCss0928` (Sistema come strato con una sola `will-change`, entrata come animazione), `PagerOverview` (`data-quiet` in due tempi), `PolishLauncherScreen` (`is-dragging` solo a portata) e `StyleInvalidation0928` (nessun `:has()` sullo shell; nessun antenato di stato dei widget sui controlli). Corretti in due test due regex con un carattere di controllo al posto di `\b` (scritti così nel tentativo interrotto); resta uno identico, preesistente, in `LagLayers.test.ts` riga 193, non toccato.

**Verifiche (2026-10-25).** `npm run typecheck`, `npm run lint`, `lint:typography` (0 violazioni, 522 file), `lint:theme-colors` (0 violazioni, 343 file): superati. Vitest con `--maxWorkers=4`: 77 file dei gruppi pertinenti (Pager, Launcher, Scene, Motion, Style, Regression, Edit, Overview, Category, Cover, Calendar, Indicator, Drag, Grid, Lag, Polish, Sheet, System, Location, Footer, Stage, Held, Optimise), 1290 test superati, più una riesecuzione dei 4 file toccati dopo la formattazione (121 superati). **La suite completa (201 file) NON è stata portata a termine**: una prima esecuzione è stata fermata dopo oltre 30 minuti (il PC è andato in sospensione, orologio saltato) e non ha dato un esito; i file fuori dai gruppi sopra non sono stati rieseguiti in questo giro. Build `npx vite build --outDir backup/v0928/dist-g2` riuscita (log `backup/v0928/build-g2.log`, solo l'avviso sui chunk oltre 500 kB); `dist/` non toccato. Nessuna misura su browser o tablet: gli effetti in millisecondi sopra sono stime delle tracce G2 e restano da verificare con la regola statistica.

**Limiti e punto di ripresa.** Aspetto: da vedere a video la chiusura su una carta laterale (passo 1), la micro-differenza dei controlli non disponibili fuori dalla modifica (passo 2), la mappa che compare più tardi (passo 5). Restano da decidere dell'utente: passo 10 (finestra della vista pagine in due tempi, rischio di una carta vuota per un fotogramma), passo 11 (S-A, Sistema parte dopo il raster, la rende più lenta di 100-140 ms), D1 (apertura senza secondo tempo), D2 (commit del rilascio prima del volo), D3 (Sistema, rapporto fra fotogrammi ricevuti e attesi). Prossimo passo: nuova build di profilo, traccia G2 su T1, S5c e S3a, poi misura con la regola a intervalli sulle campagne G1-sw, G1-ui, G1-wd e G1-f.

### Giro 2, decisioni dell'utente (2026-10-25)

*Annotazione datata: non riscrive le sezioni precedenti. Scritta da Claude Code (claude-sonnet-5-5), subagente del flusso. Copie PRIMA in `backup/v0928/pre/ottimizza-2-decisioni/`. Nessun commit.*

**Decisioni dell'utente in chat (2026-10-25).** (1) Apertura della vista pagine «Un tempo solo» (D1): niente secondo tempo, stessa animazione ma la scena parte nel commit della soglia, con primi fotogrammi meno fluidi come nella 0.9.27. (2) Rilascio del widget «Sistema al rilascio» (D2, K6b): commit al rilascio prima del volo, widget nella casella nascosto e visibile all'atterraggio della copia. (3) Entrata in Sistema «Accettala così»: la dissolvenza breve resta com'è anche se sul Tab M11 perde qualche fotogramma; niente S-A (passo 11) e niente taglio netto. Il passo 10 (O-W) non è stato applicato.

**D1.** `useStagedScene(value, enabled, stageClosing = true, stageOpening = true)` (useStagedScene.ts): con `stageOpening` false anche il passaggio a vero non aspetta. LauncherScreen.tsx passa `false, false`: pager, barra delle pagine e indicatore prendono il nuovo aspetto nello stesso commit della soglia, senza fotogrammi di attesa. Il meccanismo (`Stage`, `HeldByStage`, `useStaged`) resta come punto di aggancio e si riattiva passando `true`. L'ordine delle scene è ancora quello dei ritardi nei fogli di stile.

**D2.** Per un rilascio con volo di tipo `land` (solo spostamento, solo celle in vista) `useWidgetDrag` chiama `onDrop(session, true)` subito dopo `update(sessione con volo)`, nello stesso batch; `landing.current` non contiene più il commit ma `onLanded`. Al fine volo (`flightEnded`) o a un'uscita anticipata (`stop`, fine della modifica, smontaggio) il gancio chiama `onLanded` una volta e non rifà il commit. I voli `return` (rifiuto) e `remove` (cestino) restano come prima: commit alla fine del volo. In LauncherScreen `land(..., flying)` imposta `landed` (classe `is-landing`, nessuna transizione) e il nuovo `airborne` dell'archivio di selezione (`useAirborneIn`); il timer di `LAND_MS` parte alla fine del volo. In WidgetGrid il widget in volo è disegnato come trascinato (`is-dragging`, nascosto) anche se la pagina di destinazione non è quella di partenza, e le sue caselle restano libere come prima del cambio. L'aspetto resta quello approvato; cambia il momento del commit (+120-150 ms prima del volo secondo la stima del piano, la 0.9.27 partiva a +209).

**Test.** Nuovi o aggiornati: `SceneStaging` (apertura senza attesa), `LauncherScreen` (la pressione lunga mostra la scena nel commit della soglia; il rilascio con volo ha il layout nuovo subito, `is-landing` e `is-dragging` durante il volo, nessun nuovo layout alla fine, `is-landing` tolto 260 ms dopo l'atterraggio), `WidgetChoreography` (commit al rilascio con `flying`, `onLanded` una volta, uscita anticipata, rifiuto e cestino ancora a fine volo), `LauncherSelection` (`airborne`).

**Verifiche (2026-10-25).** `npm run typecheck`, `npm run lint`, `lint:typography` (0 violazioni, 522 file), `lint:theme-colors` (0 violazioni, 343 file): superati. Vitest con `--maxWorkers=4`: 12 file mirati (SceneStaging, WidgetChoreography, LauncherSelection, LauncherDragDrop, LauncherScreen, PagerOverview, FixLauncherLogic e Ripresa, LauncherStacks, LauncherGestures, LauncherColumns, MotionChoreographyBlock3) e 16 file di coreografia, pager, stile e Sistema: tutti superati (dopo l'adeguamento dei test che fissavano il comportamento precedente). Log in `backup/v0928/suite-g2-dec-*.txt`. Build in `backup/v0928/dist-g2` (`build-g2-decisioni.log`); `dist/` non toccato. Nessun browser, nessun tablet, nessuna misura: gli effetti sul banco (apertura, volo del rilascio) sono da misurare con la regola statistica.

**Limiti e punto di ripresa.** Da vedere a video: primi fotogrammi dell'apertura meno fluidi (accettati), rilascio con il widget che compare all'atterraggio anche sul passaggio di pagina al bordo, assenza di lampi sulla casella. Prossimo passo: misura sul banco con le campagne G1-sw, G1-ui, G1-wd e G1-f sulla build `dist-g2`.


## Misura del giro 2 sul Tab M11 (2026-10-25)

*Annotazione datata: non riscrive le sezioni precedenti. Scritta da Claude Code (claude-sonnet-5-5), subagente del flusso. Copia PRIMA di questo report in `backup/v0928/pre/ottimizza-misura-g2/`. Nessuna modifica ai sorgenti dell'app, nessun commit; informativa AI e `backup/d1/sandbox/` non toccati; VM spenta. Dati, tabelle e strumenti in `backup/v0928/misura-g2/` (`RISULTATI.md`).*

**Cosa è stato fatto.** Build `backup/v0928/dist-g2` (non più vecchia dei sorgenti) contro la 0.9.27 (`dist-banco-0.9.27`, porta 3014; la g2 sulla 3015 perché la 3013 aveva una scheda di un passo precedente) con gli strumenti della misura 3 e la stessa regola: 5 giri alternati più il giro 0, mediana [min-max], «migliore»/«peggiore» solo a intervalli non sovrapposti. Campagne leggere `G2-sw`, `G2-ui`, `G2-wd` e piena a 3 giri `G2-f`. `G2-sw` si è fermato al giro 2 per la protezione «USER TOUCH» (pointerdown non inviato dal banco, non attribuibile) ed è stato ripreso dal giro 2 (`START_ROUND`), stessa build e stessa scheda; in `G2-ui` sono esclusi S5a giro 0 e TAP base giro 1 (TAP: 4 giri validi per la base).

**Esito rispetto alla 0.9.27 (giro 1 fra parentesi).**

| Misura | Esito |
|---|---|
| SW1, SW2, SW3 (massimo, somma, numero) | nd (come g1) |
| JUMP | **PEGGIORE** somma 261 [213-286] contro 191 [168-199] ms e numero 3 contro 2 (g1: nd con tendenza peggiore); massimo nd; passo «pallino lontano -6»: latenza 51,3 contro 42,6 ms e blocco prima di T0 53 contro 0 PEGGIORE (task extra di 52-82 ms circa 30 ms dopo il tocco) |
| Apertura della vista pagine | **nd**: 1 task di 73 [69-73] contro 66 [60-70] ms (g1: PEGGIORE, 3 task e 256 ms); dentro la scena migliore (97 contro 119) |
| «Fine» tocco -> `is-closing` / -> `is-settling` | nd: T1 177 contro 173 e 758 contro 744 ms; S7b 141 contro 218 e 1172 contro 1173 (`is-closing` -> `is-settling` in S7b 549 contro 528, PEGGIORE di circa 21 ms, non nell'obiettivo) |
| Sistema, entrata | PEGGIORE solo per fotogrammi (0,4 contro 0,5 ricevuti/attesi; >22 ms 25 % contro 16,7 %), fps (73,6 contro 82,9) e durata; blocchi nd o migliori, layout-shift migliore: dissolvenza **accettata dall'utente il 2026-10-25** |
| Sistema, uscita | nd (blocco 147 contro 163; finestra e fotogrammi >50 ms migliori) |
| «Annulla» della pillola; «Annulla» della barra S3a e S3cD | nd (la latenza della barra in S3a è nd: 204,5 contro 194,4 ms; era PEGGIORE) |
| Rilascio della copia | **prima del volo MIGLIORE** (latenza dal pointerup all'inizio del volo 84 contro 204 ms in S3a, 107 contro 255 in S3cD; blocco prima 72 contro 162 / 64 contro 186); **nel volo PEGGIORE**: task di 103-137 ms alla fine del volo (circa +340 ms dal rilascio, al `transitionend` della copia), blocco in finestra 137 contro 0, fps 55,8 contro 60, e le dissolvenze di celle e punti partono a +480-500 contro +220 ms |
| Ridimensionamento | nd sul gesto (blocchi, somma, numero; fps nel gesto grow migliore), layout-shift 0,001 contro 0,016 migliore; fps del passo PEGGIORE (grow 50,9 contro 55,8; shrink 55,6 contro 58,4) |
| Da mantenere: riscontro del «+», tocco breve, foglio senza salto, layout-shift di RZ | tutti mantenuti: riscontro 14,7-19,4 contro 107-310 ms; 0 fotogrammi sotto scala 1 in 12 prove su 12; layout-shift della chiusura del foglio 0 contro 0,014; RZ 0,001 contro 0,016 |

**Lettura.** D1 ha portato l'apertura a «non distinguibile»; K2b/M5 e le altre modifiche del giro hanno lasciato scorrimento, «Fine», uscita da Sistema, «Annulla» e gesto di ridimensionamento a nd o meglio. Obiettivo del banco **non raggiunto**: restano peggiori JUMP (somma e numero), il rilascio nel volo (il commit anticipato di D2 ha tolto il blocco prima del volo ma c'è un task a fine volo che ritarda le dissolvenze) e, accettata, l'entrata in Sistema; fps del passo di RZ da tenere d'occhio. Effetti collaterali non nell'obiettivo: blocco di circa 190 ms nel foglio dopo il riscontro del «+» (S5b: blocco prima del foglio 186 contro 174 ms PEGGIORE), AW (255 contro 233 ms al foglio, blocco in finestra 207 contro 0), HC fps del rilascio 77,7 contro 84,2.

**Limiti.** Gesti sintetici CDP sui fixture, non il dito; nessuna traccia CDP né misura GPU in questo giro; i valori della base variano fra sessioni, i confronti valgono dentro la sessione. Le durate «T0..fine» più lunghe sono la coreografia approvata e non sono state usate come verdetto.

**Stato del tablet e ripristino.** Scheda di misura chiusa, dati delle origini 3013-3015 cancellati, server 3014 e 3015 fermati per PID, forward 9225 e reverse 3014-3015 tolti, resta `adb reverse tcp:3002`; chiavi del launcher della 3002 senza differenze (dry-run). La scheda `http://localhost:3013/#/` di un passo precedente è ancora aperta (non mia, non toccata). Il banco resta `aca-system:0.9.27`.

**Punto di ripresa.** Giro 3, se richiesto: (1) JUMP, task extra sul tocco di un pallino lontano all'indietro (`Pager.tsx`, finestra delle pagine) e il commit della terza tappa; (2) task a fine volo del rilascio (`flightEnded` / `onLanded` in `useWidgetDrag.ts`, `LauncherScreen.tsx`), da rendere leggero o da spostare dopo le dissolvenze di celle e punti; (3) blocco del foglio dopo il riscontro del «+» e AW; poi nuova misura con la stessa regola.


## Giro 3: applicazione del piano W1-W3 e J1 (2026-10-25)

*Annotazione datata: non riscrive le sezioni precedenti. Scritta da Claude Code (claude-sonnet-5-5), subagente del flusso. Copie PRIMA in `backup/v0928/pre/ottimizza-3/`. Nessun commit; informativa AI e `backup/d1/sandbox/` non toccati; VM spenta; nessuna dipendenza nuova. Nessun browser e nessun tablet in questo giro: gli effetti in millisecondi restano stime delle tracce G3 (`backup/v0928/diagnosi-g3/`) e vanno misurati con la regola a intervalli.*

**Cosa è stato applicato (il piano, senza W4).**

1. **W1, `is-dragging` solo sulle griglie che si vedono** (WidgetGrid.tsx, LauncherUiContext.tsx, LauncherScreen.tsx). La griglia prende la classe se è sullo schermo, se è il bersaglio o se è la vicina di cui il dito arma il bordo (nuovo `LauncherEdgePageContext`, l'id della pagina verso cui punta `edgeSide`, che LauncherScreen ricava da `adjacentWidgetPage`); una volta presa la tiene fino alla fine della sessione (ref nella griglia, azzerato senza sessione). Le due vicine non la prendono più alla presa. Per un ridimensionamento resta la sola griglia di partenza (il gesto non arma bordi). Nessuna regola nuova su `.aca-launcher-grid.is-dragging`.
2. **W2, atterraggio in due tempi** (useWidgetDrag.ts, DragGhost.tsx, WidgetGrid.tsx, LauncherScreen.tsx, launcher.css). Al fine volo di un `land`: tempo 1, `flushSync(onLanded)` (il widget si mostra, ridisegna la sola griglia di quella pagina) e nello stesso gestore la copia prende la classe `is-landed` (`visibility: hidden`, senza smontarla); tempo 2, `stop()` (sessione nulla: griglie senza `is-dragging`, barra, ingranaggio, anello e pallini, copia smontata) in un `afterNextFrame` con `setState` normale, quindi in un task suo. `stop()` annulla l'attesa del tempo 2 (uscita anticipata: un solo `onLanded`, nessun commit doppio). I voli `return` e `remove` sono invariati. Per non lasciare la casella vuota in un fotogramma, durante un volo `land` la sessione non nasconde più il widget (`own` falso in WidgetGrid): lo nasconde `airborne`, e per il rilascio nella stessa casella (che non chiamava `land`) `onDrop` con `flying` imposta ora `airborne` anche nel ramo «uguale» (LauncherScreen.tsx).
3. **J1, `data-quiet` della nuova corrente tolto due fotogrammi dopo** (Pager.tsx). Fuori dalle scene (niente vista pagine, `closing`, `settling` o scena a tappe) la pagina che diventa corrente tiene `data-quiet` nel commit che le dà `is-current` e lo perde in un `afterNextFrame` con `setState` normale (`arrivingKey`); un salto annullato da un altro salto non lascia pagine quiete da correnti. Nella chiusura della vista pagine su un'altra carta e in «Fine» lo perde nello stesso commit, come prima.
4. **W3, finestra del trascinamento che si stringe nel momento di quiete** (Pager.tsx). Quando `dragging` passa a falso la finestra [indice-2, indice+2] resta fino a `whenIdle` (`NARROW_AFTER_LANDING_MS` più l'idle), come dopo uno scorrimento; un nuovo trascinamento prima la mantiene. Il commit di fine sessione non scrive più `data-far` su due pagine.
5. **W4 non applicato** (contesto della sessione come archivio per pagina): era facoltativo, da fare solo se una misura mostra ancora un task di 50 ms o più nel commit di fine sessione o nella presa; senza misura non è stato autorizzato né eseguito.

**Differenze dal piano da far vedere a video.** (a) Il pozzo del bersaglio (`aca-launcher-drop`) resta un fotogramma in più sotto il widget (sta sotto per `z-index`); (b) «+», anello e pallini partono un fotogramma dopo lo scambio, come nella scheda 4b di D-M8; (c) un rilascio che il gancio considera «land» ma che il controllore rifiuta (rarissimo) mostra il widget nella casella di partenza durante il volo invece che nasconderlo; (d) la vicina armata prende la classe al momento in cui il dito entra nel bordo (450 ms prima del cambio pagina), con un ricalcolo di circa 100 celle in quel momento.

**Test di guardia.** `PolishLauncherScreen` («solo a portata» ora: solo la pagina in vista; la vicina armata prende la classe e la tiene fino alla fine della sessione, nessuna griglia dopo; ridimensionamento: solo la griglia di partenza); `WidgetChoreography` (il fine volo lascia la sessione e `onLanded` una volta, la sessione finisce dopo i fotogrammi, l'uscita anticipata fra i due tempi non commette due volte); `LauncherScreen` (atterraggio in due tempi: nello stesso `act` il widget perde `is-dragging` e la copia ha `is-landed`, la griglia ha ancora `is-dragging`; dopo i fotogrammi sessione nulla e `is-landing` tolto 260 ms dopo; rilascio nella stessa casella: widget nascosto durante il volo e mostrato allo scambio; la finestra si stringe più tardi dopo il trascinamento); `PagerOverview` (`data-quiet` in tre tempi, salto annullato, chiusura su un'altra carta e scena senza attesa); `PagerFarPages` (la finestra non cambia nel commit che chiude il trascinamento, si stringe dopo la quiete, un nuovo trascinamento la mantiene); `StyleInvalidation0928` (solo le due regole discendenti su `.aca-launcher-grid.is-dragging`; la classe `is-landed` esiste).

**Verifiche (2026-10-25).** `tsc -p tsconfig.strict.json --noEmit` (typecheck), `eslint src`, `lint:typography` (0 violazioni, 522 file) e `lint:theme-colors` (0 violazioni, 343 file): superati. Vitest con `--maxWorkers=4`: **suite completa, 203 file e 3064 test superati** (`backup/v0928/g3/vitest-completo-2.log`). Una prima esecuzione completa (`vitest-completo.log`) aveva dato 3 test falliti: uno è `PagerFarNear` (la finestra del trascinamento si stringe ora più tardi, test adeguato a W3); gli altri due (`LagLayers`, `MotionChoreographyBlock3`, che leggono i fogli di stile come testo) erano causati da un mio errore, i fine riga di `launcher.css` e di alcuni file portati a CRLF dalla scrittura dello script; ripristinati i fine riga originali (LF per Pager, LauncherUiContext, `launcher.css` e i test Pager/Polish/StyleInvalidation/LauncherScreen; CRLF per DragGhost, WidgetGrid, LauncherScreen.tsx, useWidgetDrag e il test WidgetChoreography). Build `npx vite build --outDir backup/v0928/dist-g3` riuscita (log `backup/v0928/build-g3.log`, solo l'avviso sui chunk oltre 500 kB; nessun `.aca-shell:has(`); `dist/` non toccato. Prettier non applicato (il `format:check` del repository non passa già sulla base).

**Limiti e punto di ripresa.** Nessuna misura su browser o tablet: JUMP, rilascio nel volo, RZ (fps del passo) e le stime del piano restano da verificare con la regola a intervalli sulle campagne sw, ui, wd e f, sulla build `dist-g3`, con in più il blocco in finestra del rilascio (S3a, S3cD), numero e somma di JUMP, fps del passo di RZ e, a video, lo scambio copia-widget all'atterraggio (nessun lampo, nessun doppio) e la vicina armata al bordo. Se dopo la misura resta un task di 50 ms o più nel commit di fine sessione o nella presa, W4 (archivio per pagina del contesto della sessione) è il passo successivo, da autorizzare come intervento interno più ampio.


## Misura del giro 3 sul Tab M11 (2026-10-25)

*Annotazione datata: non riscrive le sezioni precedenti. Scritta da Claude Code (claude-sonnet-5-5), subagente del flusso. Copia PRIMA di questo report in `backup/v0928/pre/ottimizza-misura-g3/`. Nessuna modifica ai sorgenti dell'app, nessun commit; informativa AI e `backup/d1/sandbox/` non toccati; VM spenta; nessuna dipendenza nuova. Dati, tabelle e strumenti in `backup/v0928/misura-g3/` (`RISULTATI.md`).*

**Cosa è stato fatto.** Build `backup/v0928/dist-g3` (non più vecchia dei sorgenti) contro la 0.9.27 (`dist-banco-0.9.27`, porta 3014; la g3 sulla 3015) con gli strumenti della misura del giro 2 e la stessa regola (5 giri alternati più il giro 0, mediana [min-max], «migliore»/«peggiore» solo a intervalli non sovrapposti). Campagne leggere `G3-sw`, `G3-ui`, `G3-wd` a 5 giri e piena `G3-f` a 3 giri; nessun giro non valido.

| Misura | Esito rispetto alla 0.9.27 |
|---|---|
| SW1, SW2, SW3 | nd; SW2 somma migliore |
| JUMP | **PEGGIORE** somma 262 [256-264] contro 195 [169-204] ms, numero 3 contro 2; passo «pallino lontano -6»: task extra di 63-80 ms a +29...+36 ms dal tocco, blocco prima di T0 66 contro 0 (invariato dal giro 2) |
| Apertura della vista pagine | **PEGGIORE** di 7-11 ms sul task prima della scena (T1 70 [68-91] contro 63 [59-67]; S7b 72 [68-80] contro 61 [59-65]; in g2: nd); dentro la scena nd o migliore |
| «Fine» tocco -> `is-closing` / -> `is-settling` | nd / nd (T1 178,9 contro 177,4 e 734 contro 700; S7b 137 contro 190 e 693 contro 707); `is-closing` -> `is-settling` in T1 554 contro 522 PEGGIORE (non nell'obiettivo) |
| Sistema, entrata | PEGGIORE solo per la dissolvenza (fps 72,4 contro 83,4, fotogrammi ricevuti/attesi 0,4 contro 0,6, durata 372 contro 120 ms): accettata dall'utente il 2026-10-25; blocchi nd o migliori |
| Sistema, uscita | massimo nd, **somma dei due task PEGGIORE** (290 [280-300] contro 264 [263-273] ms; in g2: nd) |
| «Annulla» della pillola e della barra | nd |
| Rilascio della copia | prima del volo **MIGLIORE** (latenza dal rilascio all'inizio del volo 94 contro 198 ms in S3a, 113 contro 265 in S3cD; blocco prima 85 contro 129 / 63 contro 195); nel volo task a fine volo di 50-111 ms (g2: 103-137): S3a nd, **S3cD PEGGIORE** (blocco in finestra 90 [66-111] contro 0; fotogrammi >50 ms 3 contro 2) |
| Ridimensionamento | nd sul gesto e sui fps del passo (g2: PEGGIORE), somma e numero dei blocchi migliori, layout-shift 0,001 contro 0,016 migliore |
| Da mantenere (riscontro del «+», tocco breve, foglio senza salto, layout-shift di RZ) | tutti mantenuti: 15-18 contro 97-129 ms; 0 fotogrammi sotto scala 1 in 12 prove su 12; 0 contro 0,014; 0,001 contro 0,016 |

**Lettura.** Obiettivo del banco **non raggiunto**: restano peggiori JUMP (invariato dal giro 2: il task extra sul pallino lontano all'indietro non è stato toccato da J1), il task singolo prima della scena di apertura (+7-11 ms), la somma dei task nell'uscita da Sistema (+26 ms, in particolare il secondo task, +28 ms) e il rilascio nel volo in S3cD (task a fine volo dimezzato da W2 ma presente); l'entrata in Sistema è peggiore solo per la dissolvenza, accettata. Effetti collaterali non nell'obiettivo: blocco di 190-204 ms nel foglio dopo il riscontro del «+» (S5b), «Chiudi» del foglio 8 ms più lento al pointerup, HC fps del rilascio 77,7 contro 84,2.

**Limiti.** Gesti sintetici CDP sui fixture, non il dito; nessuna traccia CDP né misura GPU; le cause del task di JUMP e del secondo task dell'uscita da Sistema non sono confermate da una traccia; i valori della base variano fra sessioni.

**Stato del tablet e ripristino.** Scheda di misura chiusa, dati delle origini 3013-3015 cancellati, server 3014 e 3015 fermati per PID, forward 9225 e reverse 3014-3015 tolti, resta `adb reverse tcp:3002`; chiavi del launcher della 3002 senza differenze (dry-run). La scheda `http://localhost:3013/#/` di un passo precedente è ancora aperta (non mia, non toccata). Il banco resta `aca-system:0.9.27`.

**Punto di ripresa.** (1) JUMP: il task di 63-80 ms a +30 ms dal tocco sul pallino lontano all'indietro (`Pager.tsx`, finestra delle pagine o `data-quiet` all'inizio del salto); (2) task a fine volo del rilascio (`flightEnded`/`onLanded` in `useWidgetDrag.ts`, `LauncherScreen.tsx`), da alleggerire o spostare dopo le dissolvenze; (3) secondo task dell'uscita da Sistema (+28 ms) e task singolo dell'apertura. Una traccia CDP su JUMP -6, S5c uscita e S3cD rilascio prima di intervenire.


## Ottimizzazione della coreografia (opzione B, 2026-10-24/25)

*Annotazione datata: sintesi dei tre giri di ottimizzazione già annotati sopra («Ottimizzazione 0.9.28, giro 1-3» e le rispettive «Misura»). Non riscrive le sezioni precedenti. Scritta da Claude Code (claude-sonnet-5-5), subagente del flusso. Copie PRIMA in `backup/v0928/pre/ottimizza-documenti/`. Nessun commit; informativa AI e `backup/d1/sandbox/` non toccati; VM spenta; nessuna dipendenza nuova.*

**Scelta dell'utente (2026-10-24):** «B», cioè continuare a ottimizzare la coreografia invece di ridurla; l'aspetto approvato resta (solo scale entro il 10%, nessuno shake, sagoma tratteggiata, celle «+» in dissolvenza, ordine delle scene), meccanismi interni e tempi si possono cambiare. **Obiettivo del banco:** con la regola statistica (5 giri alternati più il giro 0, mediana e min-max, «peggiore» solo a intervalli non sovrapposti) nessuna misura peggiore della 0.9.27, mantenendo i miglioramenti già ottenuti.

**Decisioni dell'utente su K3 e K5 (2026-10-24).** «Fine»: «Risposta più rapida» (K3: la chiusura parte nel commit del tocco, come nella 0.9.27, accettando primi fotogrammi meno fluidi). Sistema: «Dissolvenza più breve» (K5: 140 ms in entrata e 96 ms in uscita invece di 240).

**Decisioni dell'utente del 2026-10-25 (risposte in chat dopo il piano del giro 2).** (1) Apertura della vista pagine «Un tempo solo» (D1): niente secondo tempo, la scena parte nel commit della soglia, primi fotogrammi meno fluidi come nella 0.9.27. (2) Rilascio del widget «Sistema al rilascio» (D2, K6b): commit al rilascio prima del volo, widget nella casella nascosto e visibile all'atterraggio della copia. (3) Entrata in Sistema «Accettala così»: la dissolvenza breve resta com'è anche se sul Tab M11 perde qualche fotogramma; niente S-A (passo 11) e niente taglio netto. Per questo la dissolvenza di entrata in Sistema non conta per l'obiettivo.

**Diagnosi (diagnosi 4, tracce CDP reali, `backup/v0928/diagnosi4/`).** React non è il costo in più: lo è il ricalcolo dello stile (2-4 volte gli elementi). C1 la regola `:has()` sullo shell di `pageIndicator.css`; C2 la regola `transition: none` delle pagine non correnti legata alle classi del pager; C3 il secondo tempo di D-M25; C4 `measureCards` chiamata dal `ResizeObserver` al ritorno da Sistema; C5 la dissolvenza a schermo intero in entrata in Sistema (GPU); C6 il commit del rilascio alla fine del volo.

**Giri.**

| Giro | Intervento | Misura sul Tab M11 | Esito |
|---|---|---|---|
| 1 | K1 (niente `:has()` largo sullo shell, ritardo dell'indicatore su attributo), K2 (condizione delle pagine fuori vista su `data-quiet`), K3, K4, K5, K6a (parte invisibile), M1, M2; test di guardia `StyleInvalidation0928` | `dist-g1` contro 0.9.27 | peggiori: apertura (3 task prima della scena, 256 contro 63 ms), Sistema entrata, rilascio nel volo (135-161 contro 0 ms), «Annulla» della barra S3a (latenza +12 ms); JUMP a rischio |
| 2 | passi 1-9 del piano; D1 «Un tempo solo» e D2 «Sistema al rilascio» dopo le decisioni del 2026-10-25 | `dist-g2` contro 0.9.27 | apertura e «Annulla» della barra tornati nd; peggiori JUMP (somma 261 contro 191 ms, numero 3 contro 2) e rilascio nel volo (blocco in finestra 137 contro 0 ms); Sistema entrata solo per fotogrammi (accettata) |
| 3 | W1 (`is-dragging` solo sulle griglie in vista), W2 (atterraggio in due tempi), J1 (`data-quiet` della nuova corrente tolto due fotogrammi dopo), W3 (finestra del trascinamento che si stringe nel momento di quiete); W4 non applicato | `dist-g3` contro 0.9.27 | peggiori JUMP (262 [256-264] contro 195 [169-204] ms; numero 3 contro 2), task singolo prima della scena all'apertura (+7-11 ms), somma dei due task all'uscita da Sistema (290 contro 264 ms), rilascio nel volo in S3cD (blocco 90 contro 0 ms) |

**Numeri prima e dopo contro la 0.9.27** (mediana [min-max] dove disponibile; g1/g2/g3 sono le tre misure; tutti i giri validi; Tab M11, gesti sintetici CDP sui fixture, non il dito).

| Misura | Misura 3 (prima dei giri) | g3 contro 0.9.27 |
|---|---|---|
| Scorrimento SW1-SW3 | peggiore su somma/numero | nd (SW2 somma migliore: 106 contro 139 ms); solo «fling back x2» di SW3 ha blocco prima di T0 56 contro 0 |
| JUMP | peggiore | **peggiore**: somma 262 contro 195 ms, numero 3 contro 2; passo «pallino lontano -6» latenza 63,5 contro 43,9 ms |
| Apertura vista pagine | peggiore | **peggiore di 7-11 ms** sul task singolo (T1 70 contro 63; S7b 72 contro 61); in g2 nd; dentro la scena nd o migliore |
| «Fine» tocco -> `is-closing` | 315 contro 175 ms | nd (T1 178,9 contro 177,4; S7b 137 contro 190) |
| «Fine» tocco -> `is-settling` | nd | nd (T1 734 contro 700; S7b 693 contro 707) |
| Sistema entrata | peggiore | blocchi nd o migliori; dissolvenza peggiore (fps 72,4 contro 83,4; ricevuti/attesi 0,4 contro 0,6): accettata dall'utente |
| Sistema uscita | peggiore | **somma dei due task peggiore** 290 contro 264 ms (g2: nd); massimo nd |
| «Annulla» pillola e barra | peggiore | nd |
| Rilascio della copia | peggiore | prima del volo **migliore** (latenza 94 contro 198 ms in S3a; 113 contro 265 in S3cD); nel volo S3a nd, **S3cD peggiore** (90 contro 0 ms) |
| Ridimensionamento | peggiore | nd su gesto e fps; somma e numero dei blocchi migliori (566 contro 765 ms; 5 contro 7) |
| Da mantenere | | tutti mantenuti e migliori: riscontro del «+» 15-18 contro 97-129 ms; tocco breve 0 fotogrammi sotto scala 1 in 12 prove su 12; layout-shift chiusura del foglio 0 contro 0,014 e di RZ 0,001 contro 0,016 |

Effetti collaterali non nell'obiettivo, da tenere d'occhio: blocco di 190-204 ms nel foglio dopo il riscontro del «+» (S5b), «Chiudi» del foglio 8 ms più lento al pointerup, HC fps del rilascio 77,7 contro 84,2, `is-closing` -> `is-settling` di «Fine» in T1 554 contro 522 ms.

**Stato del banco.** Il banco resta `aca-system:0.9.27` (nessun nuovo banco costruito). La 0.9.28 è nel working tree, non su un banco, con build di misura `backup/v0928/dist-g3` (suite completa Vitest `--maxWorkers=4`: 203 file e 3064 test superati, typecheck strict, eslint, lint:typography e lint:theme-colors senza violazioni, build riuscita). **L'obiettivo «nessuna misura peggiore della 0.9.27» NON è raggiunto** dopo tre giri: restano peggiori JUMP, il task singolo prima della scena all'apertura (+7-11 ms), la somma dei task all'uscita da Sistema e il rilascio nel volo in S3cD; la dissolvenza di entrata in Sistema è peggiore ma accettata. Dati e tabelle: `backup/v0928/misura-g1/`, `misura-g2/`, `misura-g3/`; tracce: `diagnosi-g2/`, `diagnosi-g3/`.

**Limiti.** Misure su gesti sintetici CDP dei fixture; i valori della base variano fra sessioni e i confronti valgono dentro la sessione; le cause del task extra di JUMP «-6» e del secondo task dell'uscita da Sistema non sono confermate da una traccia dopo il giro 3.

**Punto di ripresa.** Non si procede senza una nuova scelta dell'utente: o altro giro sui residui (traccia CDP su JUMP -6, uscita da Sistema e S3cD; W4 solo se una misura mostra ancora un task di 50 ms o più), oppure accettare i residui dichiarati e portare la 0.9.28 sul banco con le voci «peggiore» scritte come limiti noti. Nessun commit né push: il primo invio su GitHub si fa con l'utente presente.


### Giro 4 (2026-10-25)

*Annotazione datata: non riscrive le sezioni precedenti. Scritta da Claude Code (claude-sonnet-5-5), subagente del flusso; solo documenti. Copie PRIMA in `backup/v0928/pre/ottimizza-4-documenti/`. Nessun commit né push; informativa AI e `backup/d1/sandbox/` non toccati; VM spenta; nessuna dipendenza nuova. Dettagli nelle tre sezioni successive («Giro 4: tracce…», «Giro 4: applicazione dei passi 1-7», «Misura del giro 4 sul Tab M11»).*

**Scelta dell'utente (2026-10-25):** «Ancora un giro mirato», sui due residui indicati dopo il giro 3 (JUMP «pallino lontano -6» e rilascio della copia su un'altra pagina, S3cD). L'aspetto approvato non cambia.

**Piano e correzioni.** Tracce CDP e simulazioni nella pagina confermano le due cause: la scrittura di `data-quiet` sulla pagina lasciata mentre ha già `data-far` (J-A) e il fotogramma dopo `stop()` del rilascio (W-A, W-I, W-P, W-B, W-L, W-V). Applicati i passi 1-7 nel working tree con test di guardia; J-B non applicato. Verifiche del software: typecheck strict, `eslint src`, `lint:typography`, `lint:theme-colors` e build `backup/v0928/dist-g4` superati; Vitest `--maxWorkers=4`, suite completa 204 file e 3089 test superati.

**Numeri della misura (Tab M11, gesti sintetici CDP, 5 giri alternati più il giro 0, mediana [min-max], «migliore» o «peggiore» solo a intervalli non sovrapposti; `dist-g4` contro 0.9.27 e, tra parentesi, il giro 3).**

| Misura | g4 contro 0.9.27 | Giro 3 |
|---|---|---|
| JUMP, «pallino lontano -6» | blocco prima di T0 0 contro 0 in 5 giri su 5: **risolto** | task extra (JUMP con 3 task contro 2) |
| JUMP, somma e numero | 196 [192-201] contro 192 [166-195]; 2 contro 2: nd | 262 contro 195; 3 contro 2 |
| JUMP, massimo | **peggiore**: 125 [123-133] contro 106 [90-116] ms (task del tocco sul pallino vicino «+1», circa 19 ms più lungo) | nd |
| Rilascio della copia nel volo (S3a, S3cD) | **risolto**: nessun task oltre +250 ms dal rilascio, 6 giri su 6; blocco in finestra 0 contro 0; somma nei 1,3 s 92 contro 195 e 66 contro 205 ms | S3cD peggiore (90 contro 0 ms) |
| Rilascio della copia prima del volo | migliore (latenza 100,6 contro 205,5 ms in S3a; 116,6 contro 215,3 in S3cD) | migliore |
| Apertura della vista pagine, task prima della scena | T1 **peggiore** 72 [68-74] contro 65 [59-67] ms (+7); S7b nd (71 contro 63) | peggiore (+7-11) |
| Sistema, uscita | somma dei due task **peggiore** 282 [278-334] contro 269 [263-275] ms (+13); massimo nd (144 contro 154) | 290 contro 264 (+26) |
| Sistema, entrata | blocchi nd; solo la dissolvenza è peggiore (fps 72,6 contro 82,8): accettata dall'utente il 2026-10-25 | uguale |
| SW1, SW2, SW3 | nd (SW2 con somma migliore, 110 contro 179; SW3 «fling back x2» ora nd) | nd, SW3 «fling back x2» peggiore |
| «Fine», «Annulla» (pillola e barra), ridimensionamento | nd o migliori (ridimensionamento: somma 498 contro 752, layout-shift 0,001 contro 0,016) | nd o migliori |
| Da mantenere | tutti mantenuti: riscontro del «+» 17 contro 106-306 ms; tocco breve 0 prove su 12 con il corpo sotto scala 1; foglio senza salto; layout-shift del ridimensionamento | |

Effetti collaterali fuori obiettivo, invariati: S5b con 183-192 ms di blocco nella finestra del foglio; HC con fps del rilascio 76,8 contro 83,4; S8 (movimento ridotto) parte dopo un blocco di 100-190 ms; «Fine» in T1, `is-closing` -> `is-settling` 545 contro 519 ms (+26, fuori obiettivo).

**Stato del banco.** Il banco resta `aca-system:0.9.27` (nessun nuovo banco). La 0.9.28 è nel working tree, non su un banco, con build di misura `backup/v0928/dist-g4`. **L'obiettivo «nessuna misura peggiore della 0.9.27» NON è raggiunto** dopo quattro giri. Peggiori restano: il massimo dei task lunghi di JUMP (125 contro 106 ms), il task singolo prima della scena all'apertura in T1 (+7 ms) e la somma dei due task all'uscita da Sistema (+13 ms); la dissolvenza di entrata in Sistema è peggiore ma accettata. Dati: `backup/v0928/misura-g4/RISULTATI.md`; tracce e simulazioni: `backup/v0928/diagnosi-g4/`.

**Limiti.** Gesti sintetici CDP sui fixture, non il dito; i valori della base variano fra sessioni e i confronti valgono dentro la sessione; non fatti la prova a video prevista dal giro 4 (scorrimento verso la vicina subito dopo un rilascio, «Annulla» e Sistema due fotogrammi dopo l'atterraggio, mouse sulle celle durante il trascinamento) e J-B; il costo di circa 19 ms del tocco «+1» in JUMP è un'ipotesi (lavoro spostato dopo la rimozione del task su «-6»), non confermata da una traccia. Domanda all'utente del piano sulla divisione in due fotogrammi della fine del rilascio: non necessaria per S3cD, che è risolto.

**Punto di ripresa.** Decisione dell'utente: accettare i tre residui come limiti noti e portare la 0.9.28 sul banco, oppure un altro giro (traccia CDP sul tocco «+1» di JUMP, sul secondo task dell'uscita da Sistema e sui 7 ms dell'apertura). Poi la prova col dito e D1. Nessun commit.


## Giro 4: tracce di JUMP «-6» e del rilascio S3cD, cause e piano (2026-10-25)

*Annotazione datata: non riscrive le sezioni precedenti. Scritta da Claude Code (claude-opus-5-5), subagente del flusso; sola lettura e piano, nessuna modifica ai sorgenti dell'app, nessun commit né push. Copia PRIMA di questo report in `backup/v0928/pre/ottimizza-4-diagnosi/`. Informativa AI e `backup/d1/sandbox/` non toccati; VM spenta; nessuna dipendenza nuova; `dist/` non toccato. Dati, tracce e strumenti in `backup/v0928/diagnosi-g4/` (`analisi/G4-sintesi.md`, `G4-confronto.md`, `G4inv-*.txt`; strumenti copiati da `diagnosi-g3/strumenti/` più `quiet4.cjs`, `recalc4.cjs`, `nav-fixture.cjs`).*

**Cosa è stato fatto.** Build di profilo dal working tree `backup/v0928/dist-profilo-g4` (`npx vite build --minify false --sourcemap`, log `backup/v0928/build-profilo-g4.log`) sulla 3015 contro la 0.9.27 (`dist-banco-0.9.27`) sulla 3014, Tab M11, una scheda mia (chiusa alla fine) e un solo client CDP. Tracce `G4` (JUMP e S3cD, 3 giri alternati per variante), `G4inv` (tracciamento delle invalidazioni, 1 giro), poi **simulazioni nella pagina** dei passi proposti (`G4sim`, `G4sim3`, `G4siminv`, `G4sim3inv`: la build non cambia, uno script nella pagina blocca o ritarda una scrittura di attributo o toglie una regola dal CSSOM; i numeri sono stime, non misure con la regola statistica). Accesso ai fixture dalla pagina `/fixture` del server di prova; chiavi di layout canoniche come nei giri precedenti.

**JUMP, passo «pallino lontano -6» (causa confermata).** Il commit del tocco dura 66-96 ms (6 tracce) e ristila **505 elementi** contro 31 della 0.9.27 (39-61 ms, 0-1 task da 50 ms). Non sono invalidazioni del commit: la traccia mostra che 350 ms dopo il salto «+6» `Pager.tsx` (timer di `leftKey`, riga 484) scrive `data-quiet` sulla pagina lasciata quando ha **già** `data-far` (`content-visibility: hidden`): il ricalcolo di quel momento è di 0 elementi, i 476 elementi dei 43 widget restano sporchi dentro il sottoalbero saltato e vengono ristilati allo sblocco, nel commit del ritorno (forzato dalla lettura `offsetWidth` di `WidgetGrid.tsx:424`). Poi J1 (riga 544) toglie `data-quiet` due fotogrammi dopo: secondo ricalcolo degli stessi 476 elementi (39-61 ms, in 2 tracce su 6 sopra i 50 ms). Simulazione «niente `data-quiet` scritto su una pagina con `data-far`» (`simQ`): commit del tocco **43-45 ms, 40 elementi**, ricalcolo di J1 sparito; resto del gesto invariato.

**S3cD, rilascio su un'altra pagina (causa confermata).** Nella 0.9.27 il rilascio di S3cD non vola: un solo fotogramma di 164-217 ms a +111 ms, prima di T0. Nella 0.9.28: commit al rilascio 60-83 ms (prima di T0), fotogramma di partenza del volo 48-54 ms, tempo 1 dell'atterraggio (`flushSync(onLanded)`) 42-48 ms con 80 elementi (widget mostrato e copia con `visibility: hidden`, `launcher.css:1231`), e il **fotogramma dopo `stop()`** (tempo 2, `useWidgetDrag.ts:718`) di **79-130 ms con 785 elementi**: `is-dragging` tolto da 3 griglie (85 celle: la regola `pointer-events: none` di `launcher.css:1026` è ereditata, quindi ricalcola ogni sottoalbero di cella), `inert` del pulsante di Sistema e del resto della barra (sottoalberi), 29 icone delle celle che passano da «+» a «Sposta qui» (`WidgetGrid.tsx:543`, `moving` solo senza sessione), punti di ridimensionamento, barra. Simulazioni del fotogramma: griglie fuori schermo che tengono `is-dragging` e `inert` ritardato (`simGI`) 58-61 ms, 329 elementi; più regola delle celle tolta (`simGPI`) 53-58 ms, 214-217 elementi; più blocco dello scorrimento ritardato (`simGPIL`) 49-52 ms, 216 elementi. Restano 29 contenuti di cella (la dissolvenza approvata), 29 icone inserite, punti, barra; disegno 15-17 ms.

**Piano in ordine di guadagno (nessun passo cambia l'aspetto approvato o i tempi visibili; stime dalle simulazioni).**

1. **J-A, pagina lasciata «nuda» finché è saltata** (`Pager.tsx` 475-485, 535-545, 1218-1220). Una pagina che smette di essere corrente non riceve `data-quiet` mentre ha `data-far`; lo riceve nello stesso commit in cui torna disegnata come vicina; se torna corrente non lo riceve mai, e J1 vale solo per una pagina che lo aveva. Effetto: commit di «-6» da 66-96 a circa 43-45 ms (sotto i 50: JUMP da 3 a 2 task, somma circa -70 ms) e niente ricalcolo di J1. Rischio per l'aspetto: nessuno (attributo su pagine fuori schermo; nel commit che toglie `data-far` lo stile nuovo ha già `transition: none`). Guardia (`PagerOverview`, `PagerFarPages`): dopo un salto lontano e `NARROW_AFTER_LANDING_MS` la pagina lasciata con `data-far` non ha `data-quiet`; al ritorno nessuna scrittura di `data-quiet` né nel commit né due fotogrammi dopo; una pagina nuda che entra nella finestra come vicina ha `data-quiet` nello stesso commit che toglie `data-far`; una pagina lasciata ancora disegnata segue il timer di oggi; nelle scene nulla cambia.
2. **W-A, griglie fuori schermo che tengono `is-dragging` fino alla quiete** (`WidgetGrid.tsx` 489-495 e 559; `useWidgetDrag.ts` 718). Al tempo 2 la griglia sullo schermo perde la classe come oggi (dissolvenza dei «+» invariata); le altre la tengono fino a `whenIdle` (come la finestra di W3) o fino al primo `pointerdown`, quando la perdono subito: sono pagine con `data-quiet`, quindi i «+» tornano senza transizione prima di poter essere visti. Effetto: fotogramma dopo `stop()` circa -20/-25 ms (785 → circa 330 elementi, con il passo 5). Rischio: nessuno visibile; da far vedere a video uno scorrimento verso la vicina subito dopo il rilascio. Guardia (`PolishLauncherScreen`, `LauncherScreen`): nel commit di fine sessione solo la griglia in vista perde `is-dragging`; le altre la perdono dopo la quiete o al `pointerdown`; un nuovo trascinamento prima la mantiene senza interruzioni.
3. **W-I, icone «Sposta qui» al rilascio** (`WidgetGrid.tsx` 543). Per un volo `land` `moving` vale già durante il volo: i contenuti delle celle sono a opacità 0 sotto `is-dragging`, quindi il cambio non si vede e lascia il fotogramma di fine. Effetto stimato -5/-8 ms (circa 60 elementi e 29 inserimenti in meno). Rischio: nessuno visibile; etichette di accessibilità cambiate durante il volo. Guardia: nel commit del rilascio le celle della griglia di destinazione hanno già l'icona di spostamento; al tempo 2 nessuna icona inserita.
4. **W-P, celle senza `pointer-events` ereditato durante il trascinamento** (`launcher.css` 1026-1028; `FreeCells` in `WidgetGrid.tsx` 134-305). Togliere la regola e ignorare in JS `pointerdown` e `click` delle celle mentre c'è una sessione o subito dopo un rilascio (`justDropped`); i «+» sono già invisibili, quindi lo stato `:hover` non si vede. Effetto -5 ms circa (-113 elementi al tempo 2, e lo stesso alla presa). Rischio medio sul comportamento con il mouse; aspetto invariato. Guardia: `StyleInvalidation0928` (nessuna regola `pointer-events` sulle celle sotto `.is-dragging`) e un test di `WidgetGrid`: tocco e clic su una cella libera durante e subito dopo un trascinamento non aprono il foglio.
5. **W-B, `inert` tolto un fotogramma dopo** (`LauncherScreen.tsx` 2008, `WidgetActionBar.tsx` 103). Messo subito all'inizio del trascinamento, tolto con `afterNextFrame` alla fine; la barra cambia aspetto nello stesso fotogramma di oggi. Effetto -3/-5 ms (circa 23 elementi). Rischio: «Annulla» e il pulsante di Sistema non rispondono per circa due fotogrammi dopo l'atterraggio. Guardia: alla fine della sessione la classe della barra cambia subito, `inert` del resto cade dopo i fotogrammi.
6. **W-L, scorrimento sbloccato due fotogrammi dopo** (`LauncherScreen.tsx` 2138). Effetto -3/-5 ms (disposizione e disegno del contenitore). Rischio: uno scorrimento iniziato entro due fotogrammi dall'atterraggio non parte. Guardia: `is-locked` cade dopo i fotogrammi, un nuovo trascinamento lo tiene.
7. **W-V, copia atterrata nascosta con `opacity: 0`** (`launcher.css` 1231; `DragGhost.tsx` 106 invariato). L'opacità non è ereditata e la copia ha già uno strato suo: il tempo 1 non ristila il sottoalbero della copia. Effetto stimato -5/-10 ms sul tempo 1 (42-48 ms), non simulato. Rischio: nessuno visibile. Guardia: `StyleInvalidation0928`, la regola `.aca-drag-ghost.is-landed` usa `opacity` e non `visibility`.
8. **J-B, solo se la misura dopo il passo 1 mostra ancora 3 task in JUMP**: la scrittura di `data-quiet` sulla pagina lasciata ancora disegnata (476 elementi, 26-72 ms, forzata nel gestore di scorrimento `Pager.tsx:1111` circa 470 ms dopo il tocco «+1») passa dal timer di riga 484 a `whenIdle`. Effetto incerto (il costo resta, ma fuori dallo scorrimento). Rischio per l'aspetto: nessuno.

**Stima complessiva.** JUMP: 2 task come la 0.9.27, somma circa 175-200 contro 195 ms. S3cD: fotogramma dopo `stop()` circa 42-50 ms (margine stretto), tempo 1 circa 38-46 ms; con entrambi sotto i 50 ms il blocco in finestra torna a 0 come nella 0.9.27. Da verificare con la regola a intervalli; le simulazioni hanno 2-3 giri.

**Domanda per l'utente (solo se dopo i passi 2-7 il fotogramma resta sopra i 50 ms).** Dividere la fine visibile in due fotogrammi: prima i «+» della pagina, anello e pallini, poi (16-33 ms dopo) la barra che torna da «Rimuovi» a «Annulla»/«Fine». Prezzo visibile: la barra cambia uno o due fotogrammi dopo le celle invece che insieme. In alternativa si accetta il residuo.

**Stato del tablet e ripristino.** Scheda di misura chiusa (per id) e scheda `http://localhost:3013/#/` del passo precedente chiusa come previsto dall'incarico; dati delle origini 3013-3015 cancellati; server 3014 e 3015 fermati per PID; forward 9225 e reverse 3014-3015 tolti, resta `adb reverse tcp:3002`; chiavi del launcher della 3002 senza differenze (dry-run eseguito sulla scheda 3002); scheda 3002 riportata in primo piano. Nota: un primo dry-run lanciato con `TAB_ID` della mia scheda leggeva la scheda sbagliata (nessuna scrittura); ripetuto senza `TAB_ID`.

**Limiti.** Gesti sintetici CDP sui fixture; tracce e simulazioni con 1-3 giri, non la regola statistica; il costo per elemento varia fra giri (476 elementi da 26 a 72 ms); le simulazioni W-A e W-B usano ritardi fissi (1200 e 600 ms) al posto di `whenIdle` e di un fotogramma; W-V e W-I non sono simulati. Il primo giro di simulazioni W-A (`G4sim`: `simG`, `simGP`, `simGPI`, `simGI`) leggeva la posizione delle griglie con `getBoundingClientRect` e forzava lo stile nel commit: quei numeri non vanno usati, valgono quelli di `G4sim3`.

**Punto di ripresa.** Applicare i passi 1-7 (8 solo dopo misura), con le guardie indicate e copie PRIMA in `backup/v0928/pre/ottimizza-4/`; poi misura con la regola a intervalli su JUMP, S3cD e sulle campagne dell'obiettivo (SW1-SW3, apertura, «Fine», Sistema, «Annulla», rilascio, ridimensionamento).

## Giro 4: applicazione dei passi 1-7 (2026-10-25)

*Annotazione datata: non riscrive le sezioni precedenti. Scritta da Claude Code (claude-sonnet-5-5), subagente del flusso. Copie PRIMA in `backup/v0928/pre/ottimizza-4/` (sorgenti, test e questo report). Nessun commit né push; informativa AI (`AiDevelopmentNotice.tsx`, `aiDevelopmentNotice.css`, `ai-development.svg`, le due righe di `SystemLayout.tsx`) e `backup/d1/sandbox/` non toccati; VM spenta; nessuna dipendenza nuova; `dist/` non toccato. Nessun browser e nessun tablet in questo giro: gli effetti in millisecondi restano le stime delle simulazioni G4 (`backup/v0928/diagnosi-g4/`) e vanno misurati con la regola a intervalli sulla build `backup/v0928/dist-g4`.*

**Applicato (passi 1-7 del piano; il passo 8 e le decisioni non sono stati toccati).**

1. **J-A, pagina lasciata «nuda» finché è saltata** (`Pager.tsx`). Il timer di `leftKey` (350 ms) legge la finestra dell'ultimo commit (`drawnNow`): se la pagina lasciata è fuori finestra (`data-far`) non le scrive `data-quiet` e la mette in `withheld`; se è ancora disegnata segue il timer di prima. `data-quiet` di una pagina fuori corrente vale «non corrente, non appena lasciata, non (in `withheld` e ancora saltata)»: lo riceve quindi nello stesso commit che toglie `data-far` se rientra come vicina; se torna corrente esce da `withheld` e non diventa `arrivingKey` (J1 vale solo per una pagina che l'aveva), così al ritorno di «-6» non c'è nessuna scrittura né nel commit né due fotogrammi dopo. Una pagina in attesa che torna saltata dopo essere stata disegnata tiene l'attributo (non lo perde). Nelle scene non cambia nulla (la guardia osserva zero scritture in apertura e chiusura della vista pagine).
2. **W-A, `is-dragging` delle griglie fuori schermo** (`WidgetGrid.tsx`, `whenIdle` esportata da `Pager.tsx`). A fine sessione la griglia sullo schermo perde la classe nello stesso commit (dissolvenza dei «+» invariata); una griglia fuori schermo che l'aveva (`live`) la tiene (`afterDrag`) fino a `whenIdle` (350 ms più idle, come W3) o al primo `pointerdown` (ascoltatore in cattura sulla finestra), e la perde subito se la pagina arriva sullo schermo. Un nuovo trascinamento prima della quiete la tiene senza interruzioni (l'attesa non scade durante la sessione e riparte alla sua fine); se il nuovo trascinamento arma la pagina, la classe passa a `live` senza vuoti. Nota: il `pointerdown` che avvia il nuovo trascinamento toglie comunque la classe alle pagine fuori schermo in attesa (come previsto dal piano: «fino al primo `pointerdown`»); sono pagine con `data-quiet`.
3. **W-I, icone «Sposta qui» già durante il volo** (`WidgetGrid.tsx`): `moving` vale anche con una sessione se il volo è `land`; i contenuti delle celle sono a opacità 0 sotto `is-dragging`, quindi non si vede, e il tempo 2 non inserisce più 29 icone. Cambiano solo le etichette di accessibilità durante il volo.
4. **W-P, celle senza `pointer-events` ereditato** (`launcher.css`, `WidgetGrid.tsx`). Tolta la regola `.aca-launcher-grid.is-dragging .aca-launcher-cell { pointer-events: none }`; `FreeCells` riceve `busy()` (stabile, `FreeCells` resta memoizzato: legge un ref aggiornato in layout effect e `justDropped()`) e ignora `pointerdown` e clic mentre c'è una sessione, durante il volo e per 400 ms dopo un rilascio. Restano `.aca-launcher-cell__content` sotto `is-dragging` (la dissolvenza) e il `pointer-events: none` di `is-leaving`, `is-well`, `is-reserved`. Il solo effetto sul mouse è lo stato `:hover` delle celle durante il trascinamento (scala del «+», già a opacità 0): invisibile.
5. **W-B, `inert` tolto due fotogrammi dopo** (nuovo `hooks/launcher/useHeldAfterFrames.ts`, `LauncherScreen.tsx`, `WidgetActionBar.tsx`). Il gancio vale vero con la sessione (stesso render) e per due fotogrammi dopo (`afterNextFrame`); l'ingranaggio di Sistema e il gruppo «Annulla»/«Fine» restano `inert` fino ad allora. La classe e l'aspetto della barra cambiano nello stesso commit di prima; `aria-hidden` del gruppo resta legato a `drop`. Rischio accettato dal piano: «Annulla» e Sistema non rispondono per circa due fotogrammi dopo l'atterraggio.
6. **W-L, blocco dello scorrimento tolto due fotogrammi dopo** (`LauncherScreen.tsx`): `locked` usa lo stesso gancio (`sessionHeld`); un nuovo trascinamento lo tiene. Rischio accettato: uno scorrimento iniziato entro due fotogrammi dall'atterraggio non parte.
7. **W-V, copia atterrata nascosta con `opacity: 0`** (`launcher.css`, regola `.aca-drag-ghost.is-landed`; `DragGhost.tsx` invariato). La radice della copia non ha transizione di opacità (solo `transform` e `scale`): il nascondere è immediato come con `visibility`.
8. **J-B non applicato**: era condizionato alla misura dopo il passo 1 (nessun browser in questo giro).

**Test di guardia (nuovi o aggiornati).** `PagerFarPages` (6 test «J-A»: la pagina lasciata saltata non riceve `data-quiet`; il ritorno non scrive nulla né nel commit né dopo; la pagina che rientra come vicina lo riceve nello stesso commit che toglie `data-far`; una pagina in attesa tornata saltata non lo perde; una pagina lasciata ancora disegnata segue il timer di oggi; una scena non scrive nulla); nuovo `Optimize0928G4` (19 test: W-A sulle griglie con `LauncherDragContext`, `LauncherEdgePageContext` e `PageVisibilityContext` finti, cioè griglia in vista che perde la classe subito, griglia fuori schermo che la tiene fino alla quiete, `pointerdown`, pagina che arriva sullo schermo, nuovo trascinamento senza vuoti nella classe, griglia mai raggiunta; W-I, etichette di spostamento nel volo `land` e non in `return`/`remove`; W-P, pressione e clic ignorati durante la sessione, il volo e dopo il rilascio; W-B, `inert` immediato e tolto al secondo fotogramma, annullato da un nuovo rilascio; il gancio `useHeldAfterFrames`); `StyleInvalidation0928` (resta la sola regola `.aca-launcher-grid.is-dragging .aca-launcher-cell__content`, nessun `pointer-events` sulle celle, `.aca-drag-ghost.is-landed` con `opacity: 0` e senza `visibility`); `LauncherScreen` (nell'atterraggio in due tempi, dopo il tempo 2, ingranaggio `inert` e pager `is-locked` fino a due fotogrammi dopo); `PolishLauncherScreen` (a fine sessione la sola pagina in vista perde `is-dragging`, la vicina armata la tiene e la perde al `pointerdown`). Verificato che 4 dei 6 test nuovi di J-A falliscono sul `Pager.tsx` di prima e 9 dei 19 di `Optimize0928G4` su `WidgetGrid.tsx` e `WidgetActionBar.tsx` di prima (gli altri descrivono comportamenti che non cambiano).

**Verifiche (2026-10-25).** `npm run typecheck` (`tsc -p tsconfig.strict.json --noEmit`), `eslint src`, `lint:typography` (0 violazioni, 523 file), `lint:theme-colors` (0 violazioni, 343 file): superati. Vitest con `--maxWorkers=4`: **suite completa, 204 file e 3089 test superati** (`backup/v0928/g4/vitest-completo.log`; prima, sui file mirati, 432 test superati senza i nuovi). Build `npx vite build --outDir backup/v0928/dist-g4` riuscita (log `backup/v0928/build-g4.log`, solo l'avviso sui chunk oltre 500 kB; `.aca-drag-ghost.is-landed{opacity:0}` presente nel CSS prodotto); `dist/` non toccato. Prettier non applicato ai file già fuori formato (`format:check` non passa sulla base, fine riga compresi); i fine riga originali sono stati ripristinati dopo la scrittura degli script (LF per `Pager.tsx`, `launcher.css`, `WidgetActionBar.tsx` e i test; CRLF per `WidgetGrid.tsx` e `LauncherScreen.tsx`) e il codice aggiunto è formattato come Prettier lo vuole.

**Limiti e punto di ripresa.** Nessuna misura su browser o tablet: gli effetti attesi (JUMP «-6» da 66-96 a circa 43-45 ms e 2 task come nella 0.9.27; fotogramma dopo `stop()` di S3cD da 79-130 a circa 42-50 ms, margine stretto; tempo 1 dell'atterraggio circa 38-46 ms) sono stime da simulazioni di 2-3 giri. Da fare: misura con la regola a intervalli (5 giri alternati più il giro 0, mediana e min-max, «peggiore» solo a intervalli non sovrapposti) sulla build `backup/v0928/dist-g4` contro la 0.9.27, su JUMP, S3cD e su tutte le campagne dell'obiettivo (SW1-SW3, apertura della vista pagine, «Fine», Sistema in e out, «Annulla» di pillola e barra, rilascio della copia, ridimensionamento), con in più, a video, uno scorrimento verso la vicina subito dopo un rilascio (i «+» devono esserci), «Annulla» e Sistema due fotogrammi dopo l'atterraggio e il mouse sulle celle durante il trascinamento. Se dopo la misura JUMP mostra ancora 3 task, applicare J-B (`Pager.tsx`, scrittura sulla pagina lasciata ancora disegnata spostata da quel timer a `whenIdle`); se il fotogramma dopo `stop()` di S3cD resta a 50 ms o più, resta la domanda all'utente del piano (dividere la fine visibile in due fotogrammi, con la barra che cambia uno o due fotogrammi dopo le celle) oppure accettare il residuo come limite noto. Apertura della vista pagine (+7-11 ms) e somma dei due task all'uscita da Sistema (+26 ms) non erano oggetto di questo giro.


## Misura del giro 4 sul Tab M11 (2026-10-25)

*Annotazione datata: non riscrive le sezioni precedenti. Scritta da Claude Code (claude-sonnet-5-5), subagente del flusso. Copia PRIMA di questo report in `backup/v0928/pre/ottimizza-4-misura/`. Nessuna modifica ai sorgenti, nessun commit né push; informativa AI e `backup/d1/sandbox/` non toccati; VM spenta; nessuna dipendenza nuova.*

Build `backup/v0928/dist-g4` (21:23) contro la 0.9.27 sul Tab M11, stessa regola e stessi strumenti del giro 3 (5 giri alternati più il giro 0, intervalli non sovrapposti), campagne `G4-sw`, `G4-ui`, `G4-wd`, `G4-f`, nessun giro non valido. Dati e tabelle in `backup/v0928/misura-g4/` (`RISULTATI.md`). Esito: **obiettivo non raggiunto**.

- Risolti: task extra di JUMP «-6» (blocco prima di T0 0 contro 0, 5 giri su 5); task a fine volo del rilascio (nessun task oltre +250 ms dal rilascio in S3a e S3cD; blocco in finestra 0 contro 0; somma nei 1,3 s 92 contro 195 e 66 contro 205 ms, migliore). JUMP: somma 196 [192-201] contro 192 [166-195] e numero 2 contro 2, nd.
- Ancora peggiori: JUMP, massimo 125 [123-133] contro 106 [90-116] ms (task del tocco sul pallino vicino «+1», più lungo di circa 19 ms; nel giro 3 non era peggiore); apertura della vista pagine, T1 72 [68-74] contro 65 [59-67] ms (S7b nd); uscita da Sistema, somma dei due task 282 [278-334] contro 269 [263-275] ms (giro 3: +26 ms, ora +13); entrata in Sistema solo per la dissolvenza (accettata dall'utente il 2026-10-25).
- SW1-SW3, «Fine», «Annulla», rilascio prima del volo, ridimensionamento e i miglioramenti da mantenere (riscontro del «+» 17 contro 106-306 ms, tocco breve, foglio senza salto, layout-shift 0,001 contro 0,016): nd o migliori.
- Punto di ripresa: capire perché il task del tocco sul pallino vicino costa circa 19 ms in più dopo l'eliminazione del task su «-6» (probabile lavoro spostato, da confermare con una traccia), il secondo task dell'uscita da Sistema e i 7 ms dell'apertura; oppure accettarli come limiti noti. Decisione all'utente.


## Banco 0.9.28 e prove sul tablet (2026-10-26)

*Annotazione datata: non riscrive le sezioni precedenti. Scritta da Claude Code (claude-sonnet-5-5), subagente del flusso. Copie PRIMA in `backup/v0928/pre/banco/` (`.env`, compose, e2e) e `backup/v0928/pre/banco-doc/` (documenti); copia a freddo dei dati in `backup/banco/tunet-data-pre-0.9.28-freddo.tgz` (451599 byte, SHA-256 `bd58a930f22b66e66bdffde185451b09d0a03eea73729e1b0cfcfa12bb3ff2b1`). Nessun commit né push; informativa AI e `backup/d1/sandbox/` non toccati; VM spenta; nessuna dipendenza nuova.*

**Decisione dell'utente, 2026-10-26:** «Mettila sul banco». Accetta i residui del giro 4 (JUMP massimo 125 contro 106 ms sul tocco del pallino accanto; apertura della vista pagine in T1 72 contro 65 ms; uscita da Sistema, somma dei due task, 282 contro 269 ms) e la dissolvenza di entrata in Sistema già accettata il 2026-10-25. **I residui restano un problema aperto, registrato in ISSUE-115** (proposta di ottimizzazione futura, non approvata; ISSUE-109: l'obiettivo «nessuna misura peggiore della 0.9.27» non è raggiunto).

**Esito:** banco `aca-system:0.9.28` su 192.168.1.27:3002 (health 0.9.28, `/ha/auth/providers` 200 su `127.0.0.1` e IP LAN). Le prove a dito simulato sul Tab M11 sono riuscite, tranne la pila vuota di Multimedia. Dettagli, comandi e ripristino in [infrastructure.md](../infrastructure.md), «Aggiornamento — banco 0.9.28, 2026-10-26»; schermate e script in `backup/v0928/tablet-banco/`.

- **Cambi del giro 4 a dito simulato:** celle libere senza effetto durante il trascinamento e 194 ms dopo il rilascio, con effetto dopo 0,4 s; ingranaggio e barra di nuovo raggiungibili 95 ms (4 fotogrammi, uno di 89 ms) dopo la fine della sessione di trascinamento; «Annulla», Sistema e uno scorrimento subito dopo l'atterraggio rispondono.
- **Non riuscito: pila vuota di Multimedia (punto 2 della 0.9.28).** Due caselle senza «+» sono ancora sulla pagina: `stack_mvjd2g21` ha `ids` non vuoti (`media_group_preset_multimedia`, `appletv_card_preset_multimedia`) e nessun widget visibile; `withoutEmptyStacks` toglie solo le pile con `ids` vuoto, quindi il layout salvato resta identico. La «Annotazione del 2026-10-23 (quinta)» di [REP-20261021-003](REP-20261021-003-interazioni-schermo-intero.md) copre solo il caso di `ids` vuoto. **Proposta, non applicata:** togliere o rendere libere le caselle di una pila i cui widget non sono risolvibili; decisione e correzione all'utente.
- **Osservazione da verificare col dito:** con il tocco sintetico, un secondo scorrimento che parte entro circa 0,5 s dal primo viene ignorato; causa non individuata e confronto con la 0.9.27 non fatto.
- **Punto di ripresa:** prova a dito dell'utente sul Tab M11; commit e invio su GitHub quando l'utente li chiede; poi D1. La pila vuota di Multimedia resta da decidere.

**Annotazione del 2026-10-26 (correzioni dopo il banco).** Su richiesta dell'utente («procedi con (a) e con la correzione dello scorrimento») sono applicate nel working tree, senza commit: ISSUE-117 P1 (`inert` e `aria-hidden` tolti anche alle pagine incrociate dallo scorrimento in corso) e ISSUE-116 regola (a) (le caselle di una pila senza widget risolvibili sono libere, con il «+»; layout salvato non toccato). Rettifica: la pila di Multimedia non ha membri irrisolvibili, quindi la pagina Multimedia non cambia; serve una scelta dell'utente (project-status, ISSUE-116). Controlli locali superati (3109 test, typecheck, lint, build in `backup/v0929/dist`); nulla provato sul tablet. Vedi [verification.md](../verification.md).
