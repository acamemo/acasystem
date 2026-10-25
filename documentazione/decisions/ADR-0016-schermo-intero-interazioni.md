# ADR-0016 — Schermo intero e interazioni con le dita

| Campo | Valore |
|---|---|
| ID e titolo | ADR-0016 — Schermo intero e interazioni con le dita. Il numero va assegnato al salvataggio con il primo libero: ADR-0015 è proposta da REP-20261021-001 («Hub e bridge»), ADR-0016 è prenotata da REP-20261021-002 (Casa 3D) |
| Stato | **Accettata il 2026-10-21 dall'utente** (vedi «Accettazione del 2026-10-21» in fondo) |
| Data e autore | 2026-10-21; scheda redatta da Claude Code (Opus 5.5, `claude-opus-5-5`) e rivista dopo una critica di completezza |
| Decisore e autorizzazione | Proposta dell'agente, scritta su richiesta dell'utente del 2026-10-21 (testo in REP-20261021-003). **Decisioni già espresse dall'utente:** «ingranaggio sempre visibile», «in uso solo l'avviso», «procedi col piano». La proposta sul modello dei gesti è accettata nella sostanza. La scheda diventa Accettata solo con una frase dell'utente che la approvi, da citare qui. Non autorizza l'implementazione. **Aggiornamento 2026-10-21:** accettata con la frase citata in «Accettazione del 2026-10-21»; l'implementazione autorizzata è solo G1-G2 |
| Collegamenti | Piano: [REP-20261021-003](../reports/REP-20261021-003-interazioni-schermo-intero.md). Report: REP-20261013-001, REP-20261013-002, REP-20261019-002, REP-20261019-003, REP-20261020-001, [REP-20261021-002](../reports/REP-20261021-002-casa-3d-piano-rivisto.md). Decisioni: ADR-0004, ADR-0005, ADR-0007, ADR-0012, [ADR-0013](ADR-0013-barra-unica.md), ADR-0014. Problemi: ISSUE-023, ISSUE-049, ISSUE-062 |
| Sostituisce / sostituita da | **Supera in parte ADR-0013**: punti 1-6 e 8, e la decisione accettata dall'utente «Sistema a sinistra, lontano da Modifica» («consigliato»). Restano validi il punto 7 (`REFERENCE_AREAS`, nessuna migrazione) e il punto 9. Modifica il punto 3 di ADR-0012 e annota ADR-0007. Rivede design.md:58, 63, 67, 210, 284-291, 318 e 478 |

## Contesto ed evidenze

**Segnalazione dell'utente (2026-10-21).** Toccando una volta un widget si apre il collegamento, e il widget toccato si restringe. Se si tiene premuto un comando, parte lo spostamento del widget. L'utente chiede interazioni solo con le dita, la griglia a tutto schermo e barre che compaiono alla pressione lunga sullo spazio vuoto.

**Fatti verificati sul working tree del 2026-10-21** (base `7298d4d` più modifiche non committate; percorsi relativi a `progetto/acasystem/frontend/src`):

- **Pressione lunga.** `onPagerPointerDown` (templates/launcher/LauncherScreen.tsx:1090-1108) fa partire la pressione lunga per ogni pointerdown. Esclude solo `NO_LONG_PRESS` (r.128). Su un widget chiama `liftWidget` (r.1037, r.1086); fuori dai widget apre la vista pagine.
- **Restringimento.** `.is-pressing` riduce il widget a 0,9 anche in uso (launcher.css:545-550). Sullo spazio vuoto la classe va sul pager stesso (LauncherScreen.tsx:1789), cioè un cambio di classe sul pager, della stessa famiglia di costo di ISSUE-062.
- **Widget da collegare.** In uso il primo tocco apre le impostazioni (CategoryWidgetContent.tsx:146-156).
- **Adattivi.** Aprono i dettagli solo dal pallino (AdaptiveCategoryWidget.tsx:435-446).
- **Scorrimento orizzontale tenuto dal widget.** Gli impilati si tengono lo scorrimento orizzontale (launcher.css:1037-1045; StackView.tsx:99). I cursori orizzontali sono `input type=range` nativi.
- **Tastiera.**
  - L'indicatore è l'unico modo di cambiare pagina da tastiera, e «Modifica» l'unico modo di entrare in modifica.
  - «Modifica le pagine» è già il nome del pulsante «Pagine» (EditToolbar.tsx:104).
- **Tasto Indietro.** Non esce dalla modifica: non c'è gestione di popstate e Sistema si chiude con un push (AppRoutes.tsx:47). Esc invece esce.
- **Cestino.** È un bersaglio geometrico (useWidgetDrag.ts:243-250).
- **Sistema.** Si apre dall'ingranaggio della StatusBar (StatusBar.tsx:130-140) e da «Accedi di nuovo» nell'avviso di connessione.
- **Misure reali.** Sul Tab M11, il 2026-10-14: 1280×665 con cella da 89 px. Il tablet del cliente è a muro, con le barre di Android nascoste (ADR-0013).

**Stime (non misure).** Con la formula di `cellMetrics` a 1280×665, la griglia 8×5 passa da 93 a 110 px. La differenza con gli 89 px misurati va riconciliata. Nell'ipotesi a muro (circa 1280×800, stima fatta a mano) la cella passa da circa 120 a circa 137 px. Su telefoni e Tab M11 in verticale il guadagno è circa 0.

**Inferenze da verificare:**
- TalkBack;
- WCAG 2.2: criteri 2.1.1, 2.4.7, 2.4.11, 2.5.1, 2.5.7, 2.5.8, 4.1.3, 1.4.11, 2.2.1;
- comportamento predefinito della tastiera virtuale in Chrome Android;
- viewport reale;
- costo GPU sul Mali-G52;
- gesto «Indietro» di Android vicino ai bordi.

## Proposta o decisione

Proposta dell'agente, salvo i punti marcati come «deciso dall'utente».

1. **Precedenza.** In uso, i comandi di un widget vincono sempre. La pressione lunga del launcher vale solo fuori da `[data-widget-id]`: è il default invertito in `onPagerPointerDown`. Sui widget in uso sono vietati menu contestuale, selezione e callout, anche sulle immagini.
2. **Tocco.**
   - In uso, sul comando agisce subito. Sul resto del widget apre i dettagli, senza aspettare un secondo tocco e senza aprirli se il tocco ferma uno scorrimento (hook `pagerMoving` comune con la Casa 3D). Per gli adattivi decide D-3.
   - In modifica i comandi sono inerti. Il tocco seleziona; un tocco sul widget già selezionato apre le impostazioni; trascinando si sposta; con le maniglie si ridimensiona.
3. **Eccezioni allo scorrimento.** Impilati e cursori orizzontali si tengono il gesto orizzontale (D-13).
4. **Nessun restringimento in uso.** Spariscono la scala e la classe `is-pressing` sul pager. La scala resta solo per il sollevamento in modifica.
5. **Ingresso in modifica.** Pressione lunga sullo spazio vuoto: l'indicatore scende dall'alto con una dissolvenza e la barra di modifica sale dal basso. Si esce con «Fine» o con Esc. Con il tasto Indietro solo se D-12 lo approva: è lavoro nuovo, da coordinare con la cronologia della Casa 3D.
6. **Widget da collegare** (*deciso dall'utente*). In uso un tocco mostra solo un avviso, con una variante quando la disposizione è bloccata. «Collega» si apre in modifica.
7. **Griglia a tutto schermo.** Le barre della modifica si sovrappongono alla griglia (opzione A), con protezioni per il cestino, le maniglie, le righe di bordo e il focus (D-11).
8. **Ingranaggio sempre visibile** (*deciso dall'utente*). In alto a destra, piccolo e discreto, con bersaglio da 44 px e contrasto almeno 3:1. Sostituisce quello della StatusBar senza duplicati e supera «Sistema a sinistra». È inerte durante un trascinamento; D-14 stabilisce il comportamento quando lo si tocca in modifica.
9. **Escono dall'uso.** StatusBar (ora, «Sincronizzato», chip, «Modifica»), indicatore e barra di modifica. L'avviso di connessione resta, sovrapposto in alto, ed è condiviso con la Casa 3D.
10. **Equivalenti obbligatori.** Ingresso in modifica, pagina precedente e pagina successiva devono restare raggiungibili da tastiera e da lettore di schermo nella stessa consegna che toglie «Modifica» e l'indicatore. Il nome deve essere diverso da «Modifica le pagine». La forma, per esempio comandi invisibili rivelati dal focus, è proposta.
11. **Proposte da confermare a parte:**
    - indicatore breve, non intercettante e lontano dai comandi;
    - suggerimento la prima volta;
    - voce in Sistema;
    - pallino sull'ingranaggio;
    - destino dei chip;
    - disposizione bloccata consigliata e uscita per inattività (D-15).
12. **Invariati.** `REFERENCE_AREAS`, righe, chiavi, dati, vista pagine (da «Pagine»), disposizione bloccata.

## Alternative e motivazioni

- **Marcatori widget per widget.** Scartata: ogni pulsante dimenticato resterebbe un «ladro».
- **Barre sempre visibili (ADR-0013).** Superata dalla richiesta esplicita dell'utente. Il rischio per la persona di 65 anni resta: si mitiga con l'ingranaggio, con gli equivalenti obbligatori e con le proposte del punto 11.
- **Opzione B, pagina scalata.** Cella di circa 86 px, geometria del trascinamento da correggere, costo GPU della famiglia di ISSUE-062.
- **Opzione C, griglia ridotta.** Salto da 110 a 93 px. Toglierebbe però i conflitti di D-11: va rivalutata se le protezioni dell'opzione A risultano insufficienti.
- **Pressione lunga sul corpo del widget = modifica.** Ripiego per le pagine piene; resta la questione D-4.

**Questioni irrisolte:** D-2…D-16 in REP-20261021-003.

## Conseguenze

- **Comportamento.**
  - I comandi diventano affidabili; spariscono il restringimento e il ritardo di 280 ms.
  - Le impostazioni dei widget si aprono solo in modifica.
  - Sistema diventa raggiungibile ovunque.
  - In uso si perdono ora, «Sincronizzato» e chip; per le persone non c'è un sostituto finché ISSUE-049 resta aperta.
  - La modifica può partire per sbaglio dai margini (D-15).
- **Dati e API.** Nessuna modifica.
- **Codice.** Circa 12-14 file sorgente.
- **Test.** Sei file di guardia (2.182 righe) da riscrivere, più LagLayers, FixSystemIndicator, Casa3dExplore, SystemPage, PagerOverview e LauncherScreen. Gli script `e2e/m11-overview.check.mjs` (entra con «Modifica») e `isolated-browser.check.mjs` (pallino «Apri dettagli») vanno aggiornati.
- **Prestazioni.**
  - Nessun cambio di classe o di padding sul pager all'ingresso nella vista pagine e alla pressione.
  - Le barre usano solo transform e opacità; l'ingranaggio è statico, senza `will-change` e senza `backdrop-filter`.
  - Celle più grandi significano circa il 39 % in più di area da rasterizzare per tessera sul M11.
  - Prima delle tappe sulla cornice serve una misura di base (G0).
- **Casa 3D.** Valgono le regole già elencate in REP-20261021-003, sezione «Coerenza»: anteprima, hook comune, rotta e cronologia condivise, indicatore di connessione unico, uscita da Esplora, test di R1a allineato a D-2.
- **Documenti.** Annotazioni datate in ADR-0013 (compresa «Sistema a sinistra»), ADR-0012, ADR-0007, design.md e REP-20261013-002. Le proposte vanno registrate come nuove ISSUE.

## Verifiche e revisione

**Esistenti.** La lettura B riporta verdi, 135 su 135, le guardie LauncherGeometry, PagerBands, StatusBarBand, FooterBandCache e Polish2Cornice. Descrivono la cornice da superare. La critica non ha rieseguito alcun test.

**Da fare:**
- misura di base sul Tab M11 (G0);
- test della pressione lunga sui comandi non marcati e sulle immagini;
- tocco immediato e `pagerMoving`;
- avviso del widget da collegare, anche con la disposizione bloccata;
- impilati e cursori;
- cestino e maniglie sotto le barre;
- equivalenti da tastiera e annunci;
- guardie della geometria;
- tasto Indietro, se approvato;
- prova sul Tab M11 con il dito dell'utente: TalkBack, testo al 125 e al 150 %, tastiera virtuale, viewport a muro, gesto dal bordo;
- profilo con adb e CDP.

**Revisione** se:
- la prova mostra aperture accidentali, ingressi involontari in modifica o una scoperta insufficiente;
- il viewport reale annulla il guadagno;
- le protezioni di D-11 non bastano (si torna all'opzione C);
- ISSUE-049 introduce il widget delle persone.

## Accettazione del 2026-10-21

**Frase dell'utente (2026-10-21), testo fedele:**

> «ok alle proposte, approvo e procedi con G1-G2 il cliente può spostare, chi modifica tutti anche i clienti, ceh se dovessero mai spostare un divano sulla piantina non deve uscire? sei scemo?»

**Interpretazione registrata** (concordata dall'agente principale): «approvo» accetta questa scheda; «ok alle proposte» accetta tutte le proposte di REP-20261021-003, cioè le questioni D-2…D-16 con la risposta consigliata dal piano; «procedi con G1-G2» autorizza **ora soltanto** la realizzazione delle tappe G1 e G2. Le altre tappe (G0, G3 e seguenti, C1-C2c) restano da autorizzare. La seconda parte della frase riguarda la Casa 3D (ADR-0017, REP-20261021-002), non questa scheda.

**Le 14 proposte accettate:**
1. Pressione lunga sullo spazio vuoto = modifica, con le due barre (indicatore in alto, barra di modifica in basso).
2. Tocco sul corpo del widget = dettagli, anche per gli adattivi; il pallino «Apri dettagli» viene tolto.
3. Pagine piene: la pressione lunga sul corpo del widget (non sui comandi) entra in modifica senza sollevare il widget.
4. In modifica il trascinamento parte subito; il cambio pagina avviene dall'indicatore o dai bordi.
5. In modifica un tocco seleziona il widget, un secondo tocco apre le impostazioni; su un widget da collegare un tocco apre «Collega».
6. In uso nessun «+» sulle celle vuote.
7. I chip delle persone sono tolti fino a ISSUE-049.
8. Indicatore di pagina visibile circa 2 s al cambio pagina.
9. Avviso di connessione solo in caso di problema, con un pallino sull'ingranaggio.
10. Comandi invisibili per ingresso in modifica, pagina precedente e successiva, raggiungibili da tastiera e TalkBack, con nome diverso da «Modifica le pagine».
11. Suggerimento la prima volta e voce «Modifica le pagine» in Sistema.
12. Testo dell'avviso del widget da collegare: «<nome> non è ancora collegato. Tieni premuto uno spazio vuoto per modificare, poi tocca il widget.»
13. Colore delle luci: basta che lo spostamento del widget non parta più dalla pressione lunga sul comando; nessun nuovo gesto per il colore.
14. Ingranaggio sempre visibile in alto a destra, con 20 px riservati in alto sul Tab M11 (non sopra l'angolo della tessera).

**Limiti.** Restano fuori da G1-G2 le questioni che il piano rinvia alle tappe successive (per esempio il tasto Indietro, D-12, e la protezione di cestino e maniglie, D-11). Nessun commit Git: l'utente non l'ha chiesto.

## Rettifica del 2026-10-21 (sera): D-2 e D-8 rovesciate dall'utente

Dopo la prova sul Tab M11 del banco 0.9.22 l'utente ha scritto: «sono scomparsi i + e non funziona più l'animazione che tenendo premuto mi apre le pagine, c'è stata una regressione importante». Le due cose sono gli effetti delle proposte **1** (pressione lunga sullo spazio vuoto = modifica) e **6** (niente «+» in uso), accettate in blocco con «ok alle proposte» ma contrarie a quanto l'utente aveva descritto in origine: «la barra con la pallina al centro in alto a comparsa come la bottombar con animazioni invertite (comparsa con fade dall'alto verso il basso) solo quando si tiene premuto sullo schermo per modificare le pagine». La richiesta esplicita più recente prevale: sono **rovesciate** D-2 e D-8; il resto di ADR-0016 resta valido.

- **Proposta 1 (D-2), ora.** La pressione lunga sullo spazio vuoto (e, nelle pagine piene, sul corpo di un widget, mai sui comandi) restringe la pagina mentre è tenuta (`is-pressing`) e al termine apre la **vista pagine**, come nella 0.9.21; da lì un tocco su una pagina porta alla modifica dei widget. Con la disposizione bloccata resta la pillola. Valgono G1 (nessuna pressione su un widget in uso fuori dalle pagine piene) e la pagina piena (D-4), che apre la vista pagine e non più la modifica.
- **Barra in alto.** L'indicatore delle pagine (la pallina) è la barra in alto della vista pagine: compare con dissolvenza dall'alto verso il basso, speculare alla barra in basso che sale, e si chiude con l'animazione inversa. Solo opacità e transform (ISSUE-062, ISSUE-107). Resta attivo in modifica e come cenno passivo di circa 2 s a ogni cambio pagina in uso.
- **Proposta 6 (D-8), ora.** In uso le celle vuote tornano con il «+» e al tocco aprono l'aggiunta del widget, come nella 0.9.21 (`addCells: 'always'` per le pagine di widget; la copertina resta senza «+» in uso).
- **Ingresso in modifica.** Resta raggiungibile dalla vista pagine (tocco su una pagina, poi «+ Widget», «Pagine», «Fine»), dai comandi invisibili e da Sistema → «Modifica le pagine». Il suggerimento della prima volta («Tieni premuto uno spazio vuoto per modificare le pagine.») resta vero. Il testo dell'avviso del widget da collegare (proposta 12) diventa «<nome> non è ancora collegato. Tieni premuto uno spazio vuoto, tocca la pagina, poi tocca il widget.» (**testo scelto dall'agente**, il minimo che descriva il nuovo percorso; stessa modifica nel suggerimento del foglio delle pagine di categoria). Realizzazione e prove: REP-20261021-003, «Ripristino 0.9.23».


## Seconda rettifica del 2026-10-21 (sera): il tocco e la pressione lunga sul widget

**Frase dell'utente (2026-10-21), testo fedele:** «se faccio pressione sul widget avevamo detto che faceva highlight per ridimensionare e se trascinato in highlight diventava spostabile, altrimenti con il tap sul singolo widget in uno spazio non occupato da un pulsante apriva la sezione relativa alla lista dei dispositivi collegabili rilevati per quel widget specifico». Risposte alle domande di chiarimento: tocco sul corpo di un widget da collegare = «Lista se da collegare» (si apre «Collega»; un widget già collegato apre i suoi dettagli come prima); pressione lunga sul corpo = «Evidenzia e trascina» (il widget si evidenzia con le maniglie di ridimensionamento e compaiono le barre di modifica; se il dito si muove senza essere alzato il widget si sposta; nessun restringimento).

Questo rovescia l'avviso al tocco del widget da collegare (proposta 12, G4) e la regola «sul corpo di un widget in uso la pressione lunga non fa nulla» (G1, D-4 nelle pagine piene). Resta quanto non è toccato:

- **Tocco sul corpo di un widget da collegare, in uso.** Apre subito «Collega» (le impostazioni del widget con la lista dei dispositivi rilevati), come nella 0.9.21. L'avviso «… non è ancora collegato …» non si mostra più. Invio e Spazio fanno lo stesso (il bersaglio è un pulsante). Un tocco che ferma soltanto lo scorrimento del pager non apre nulla (`pagerMoving`). **Scelta mia:** con la disposizione bloccata «Collega» si apre comunque, come nella 0.9.21: il collegamento cambia il widget, non la disposizione. Widget già collegati: invariati.
- **Pressione lunga (500 ms) sul corpo di un widget in uso**, mai su un comando (pulsanti, cursori, manopole, pile che scorrono, campi): vibrazione breve, ingresso in modifica con le barre, il widget resta selezionato con la cornice di ridimensionamento e, se il dito si muove senza essere alzato, si sposta nello stesso gesto (`liftWidget` della 0.9.21). Né la pagina né il widget si restringono; nessun clic inghiottito sui comandi. Con la disposizione bloccata resta la pillola «Disposizione bloccata…». Il caso delle pagine piene (D-4) è assorbito da questa regola.
- **Sullo spazio vuoto** resta la pressione lunga che restringe la pagina e apre la vista pagine (rettifica precedente).
- **In modifica** non cambia nulla: trascinamento immediato, tocco = selezione, secondo tocco = impostazioni, «Collega» al tocco sul widget da collegare.
- **Testi (scelta mia, minimi).** Suggerimento della prima volta: «Tieni premuto uno spazio vuoto per modificare le pagine, o un widget per spostarlo.» Suggerimento del foglio delle pagine di categoria: «Collega i dispositivi toccando il widget da collegare.» L'etichetta del bersaglio torna «Collega <nome>». Rimossi `unboundNotice` e il comando `noticeUnbound`.

Realizzazione e prove: REP-20261021-003, «Ripristino 0.9.23 — widget».

## Terza rettifica del 2026-10-23: la modifica dei widget esiste solo con un widget selezionato

**Frasi dell'utente (2026-10-23, prova della 0.9.26 sul Tab M11), testo fedele:** «se premo per avere l'animazione della pagina, la schermata dopo l'animazione è corretta, però nel momento in cui ritorno sulla pagina o clicco su un altra pagina con i widget presenti, questi hanno l'animazione shake attiva, inoltre sono presenti il pulsante "+ Widget" che è ridondante siccome siamo pieni di segni + per aggiungere i widget e un pulsante con pagine e fine che sono anche essi ridondanti». Risposte alle domande: tocco su una pagina nella vista pagine = «Torna alla pagina in uso»; barra: «se ho un widget premuto per la modifica il pulsante con icona elimina, annulla e fine li possiamo anche mantenere ma è inutile nel caso specifico quando si presente "+ widget" e "pagine fine" perché per confermare la modifica dovrei cliccare 2 volte su fine, quindi manterrei solo per caso in cui si tiene premuto il widget la barra col pulsante fine»; tremolio in modifica = «Nessuno» (il widget premuto è solo evidenziato con le maniglie). Seconda richiesta dello stesso giorno: «dopo l'aggiunta del widget, vorrei si partisse col widget con highlight e modifica, la stessa animazione che c'è quando tieni premuto un widget, così è evidenziato e si capisce dove è posizionato».

Questo rovescia il punto «Ingresso in modifica» della rettifica del 2026-10-21 (sera, ripristino 0.9.23), «Resta raggiungibile dalla vista pagine (tocco su una pagina, poi «+ Widget», «Pagine», «Fine»)», e le barre di modifica di G4-G5. Resta quanto non è toccato: l'uso a schermo intero, l'ingranaggio, i comandi senza viso, la pressione lunga sul vuoto che apre la vista pagine e sul corpo di un widget che lo evidenzia e lo sposta, il tocco sulle celle «+» in uso.

- **Vista pagine.** Il tocco su una scheda, «Fine» ed Esc chiudono la vista pagine e la modifica insieme e portano alla pagina in uso: niente barre, niente tremolio. La barra della vista pagine non cambia.
- **Barre.** «+ Widget · Pagine · Fine» e il vassoio dei tipi non si mostrano più. La modifica ha la sola barra del widget selezionato (Rimuovi, Annulla, Fine): un tocco su «Fine» esce.
- **La modifica esiste solo con un widget selezionato.** Entra con la pressione lunga su un widget, con «Modifica la disposizione» (che seleziona il widget con il fuoco o il primo della pagina; senza widget non apre nulla e lo dice) e con l'aggiunta di un widget; esce con «Fine», con un tocco fuori da widget e celle, con Esc e con la rimozione del widget. Una cella libera con un widget selezionato resta «Sposta qui». Sistema → «Modifica le pagine» apre la vista pagine.
- **Nessun tremolio** su nessun widget in modifica; il selezionato ha la cornice e le maniglie.
- **Aggiunta.** Solo dalle celle «+»; a fogli chiusi il widget nuovo compare selezionato in modifica, con la stessa cornice, le stesse maniglie e la stessa barra della pressione lunga. Non c'è più un ingresso per aggiungere su una pagina piena né direttamente sulla copertina (dichiarato).
- **Testi (scelta mia, minimi).** Annuncio di ingresso «Modifica della disposizione. Trascina il widget per spostarlo, tocca un widget selezionato per le impostazioni. Fine o Esc per terminare.»; pagina senza widget «Nessun widget da modificare in questa pagina. Per le pagine: Sistema, Modifica le pagine.»; pagina nascosta toccata nella vista pagine «La pagina è nascosta: tocca Mostra per rivederla.» Il suggerimento della prima volta resta vero.

Realizzazione e prove: REP-20261021-003, annotazione del 2026-10-23.
