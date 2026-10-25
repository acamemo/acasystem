# ADR-0017 — Casa 3D a schermo intero, Esplora ed editor a quadretti

| Campo | Valore |
|---|---|
| ID e titolo | ADR-0017 — Casa 3D a schermo intero, Esplora come voce della barra, editor nostro a quadretti da 50 cm, scrittura aperta a tutti gli utenti |
| Stato | **Accettata** il 2026-10-21 dall'utente (citazioni in «Decisore e autorizzazione» e «Accettazione del 2026-10-21») |
| Data e autore | 2026-10-21. Scheda redatta da Claude Code (Sonnet 5.5, `claude-sonnet-5-5`) per l'incarico «parti» (tappa R1), a partire dal piano REP-20261021-002 scritto con Opus 5.5 (`claude-opus-5-5`) |
| Decisore e autorizzazione | Decisore: l'utente. Citazioni fedeli, riportate in REP-20261021-002.<br><br>(1) L'idea del 2026-10-21: «il mio dubbio è come fare ad editare la casa, secondo me la base appena fatta già è una base di partenza eccezzionale, ma si deve ristrutturare, innanzitutto il 3d a pagina piena, 100%dvh di altezza e larghezza per avere la preview a schermo intero, un chevron menu in alto a sinistra che cliccato fa apparire una barra laterale, possibilità di editare la mappa con un editor a blocchi stile geometry dash, una griglia a righe di quaderno, possibilità di mettere una stanza come un quadratino e allargarlo come si fa sulla griglia delle pagine per creare la stanza, assegnargli il nome, e ciò che viene scritto in 2d è visualizzabile nella preview e nell'esplorazione 3d, che deve essere attiva di base, con scroll e con ingrandimento previsti di base, esplora come opzione da barra laterale, possibilità di aggiungere dalla piantina tutti gli oggetti che sono già presenti nel 3d attuale, come tavoli, sedie, poltrone, porte, messe poi dalla piantina e che generano la preview 3d che visualizziamo».<br><br>(2) Sulle migliorie proposte: «sì, fermala e prepara il piano, 50 cm va bene».<br><br>(3) Sul piano: «ok alle proposte, approvo e procedi con G1-G2 il cliente può spostare, chi modifica tutti anche i clienti, ceh se dovessero mai spostare un divano sulla piantina non deve uscire? sei scemo?». Le due correzioni dell'utente alle proposte sono: **il cliente può spostare i mobili e modificare la piantina**; **chi modifica = tutti, anche i clienti**.<br><br>(4) Avvio della tappa R1: «parti» (2026-10-21).<br><br>**Limite.** «ok alle proposte» accetta il piano rivisto; la sua formula non autorizza tappe diverse da quelle avviate. L'implementazione autorizzata è la sola R1; R2-R8 e la T7 (comandi) richiedono l'avvio esplicito dell'utente. I comandi della Casa 3D restano spenti fino a R7 |
| Collegamenti | Piano: [REP-20261021-002](../reports/REP-20261021-002-casa-3d-piano-rivisto.md) (UX, architettura, tappa R1 con «Fatto quando», «Risposte dell'utente (2026-10-21)»). Antecedenti: [REP-20261020-002](../reports/REP-20261020-002-casa-3d-piano.md) (T2a-T6), [ADR-0014](ADR-0014-casa-3d.md), [ADR-0016](ADR-0016-schermo-intero-interazioni.md) (in uso un tocco su un widget agisce subito; G1-G2 fatte). Requisiti: REQ-06/AC-06, REQ-07, REQ-09, REQ-10, REQ-16, REQ-17. Issue: ISSUE-062, ISSUE-089…097, ISSUE-102 (decisa), ISSUE-103, ISSUE-104. ADR: ADR-0004, ADR-0005, ADR-0009, ADR-0011, ADR-0012, ADR-0013 |
| Sostituisce / sostituita da | **Supera in parte [ADR-0014](ADR-0014-casa-3d.md)**, solo sui punti elencati in «Cosa supera di ADR-0014». Il resto di ADR-0014 resta valido. Nessuna sostituita da |

## Contesto ed evidenze

ADR-0014 ha portato la Casa 3D nel launcher come ultima pagina, con il pacchetto `casa3d/` copiato da neonplan3d (MIT), qualità Light/Medium/High, persistenza T6 nel backend e diritti. Il piano REP-20261021-002 ha verificato lo stato di partenza (fatti, con file e righe, in quel report; qui se ne riportano solo gli utili alla decisione):

- La pagina ha tre stati (Riposo, Vista, Esplora): Esplora si attiva con un tocco e blocca il pager. Usa ancora il piano d'esempio; il canale di T6 (`planApi`) non è collegato (ISSUE-103).
- L'editor copiato (`components/editor.ts`, 15.070 righe, 42 patch in `rinomina.mjs`, 703.926 B, il 33,6% di `dist`) non è mai stato misurato dentro Acasystem. Nella demo, spostare un mobile dà 22-30 fps con fotogrammi fino a 206 ms. Cronologia e backup esistono solo in quell'editor.
- La scrittura del piano (T6) è oggi riservata a chi Home Assistant dichiara amministratore o proprietario, ed è un'interpretazione provvisoria di D13 (ISSUE-102). Dietro l'ingress l'utente fidato ha `is_admin: false`, quindi nessuno scrive.
- Il router è un `HashRouter` dichiarativo; Sistema è già un overlay su rotta (`AppRoutes.tsx`).
- Viewport del Tab M11: 1280×665 CSS a DPR 1,5. Misure di rebuild, memoria e fps dell'editor nuovo: non eseguite.

Inferenze non verificate: costo del rebuild della vista a ogni modifica sul Tab M11, memoria con il launcher nascosto più la vista, scelta degli zoom minimi per modificare.

## Proposta o decisione

Decisione umana accettata (frasi in tabella); i dettagli esecutivi sono scelte dell'agente dentro il perimetro, rivedibili tappa per tappa.

### 1. Casa a schermo intero fuori dal pager

- La casa è una rotta a schermo intero (`#/casa`, con `#/casa/piantina` per l'editor) con il modello di Sistema: 100dvh × 100dvw, aree sicure.
- Il 3D è interattivo di base (rotazione, spostamento, zoom con dita, rotella e tastiera).
- Sempre visibile: il pulsante **«Esci»** in alto a destra, oltre alla voce «Esci» del menu; con «Rimetti la vista» e l'indicatore di connessione.
- Si esce con «Esci», con il tasto indietro o con Esc; prima si chiude ciò che è aperto sopra (barra, foglio, editor). Il fuoco torna al pulsante che ha aperto la casa.

### 2. Barra laterale (chevron in alto a sinistra)

Pannello modale da sinistra, piatto (nessuna ombra sopra il canvas). Nomi delle voci, accettati: **Esplora, Modifica la piantina, Piani, Elenco stanze, Qualità, Esci**.

- **«Esplora»** è la modalità *guarda-e-comanda*, **alternativa a «Modifica la piantina»**. È una voce della barra, non più un tocco sul canvas. La passeggiata ad altezza d'occhi già presente nel bundle non è il significato di Esplora.
- «Elenco stanze» è l'alternativa equivalente al disegno (TalkBack).

### 3. Pagina del launcher come anteprima

- La pagina «Casa 3D» nel launcher diventa un'**anteprima ferma** che un tocco (o «Apri la casa» da 56 px) apre a schermo intero. Swipe e pressione lunga restano al launcher; nella vista pagine e in modifica non si apre nulla.
- La casa si apre anche da **Sistema → Casa 3D**.
- La casa d'esempio rimasta sul banco dalla prova di T6 si cancella e si riparte da vuoto con **«Ricomincia»**.

### 4. Editor nostro a quadretti

- Un editor nuovo, in React con le primitive (ADR-0004), a griglia a righe di quaderno da **50 cm** (più marcata ogni metro): stanza nuova di 2×2 quadretti da allargare con le maniglie, misura mostrata dal vivo, inserimento numerico, muri automatici, aperture sul muro, tavolozza di arredi, piani come schede, annulla e ripeti, salvataggio automatico con avviso di conflitto.
- Il `Building` resta l'unica fonte; la griglia si ricava. Gli oggetti fuori passo di un piano esistente restano dove sono finché non vengono spostati.
- Le tappe dell'editor sono R2-R6; **solo R1** è avviata da «parti». La rimozione dell'editor copiato avviene solo dopo le interfacce nuove di cronologia e backup (R5b) e resta soggetta all'approvazione dell'utente.

### 5. Scrittura per tutti gli utenti

- **Chi modifica = tutti, anche i clienti**; il cliente può spostare i mobili e modificare la piantina. Non esiste un ruolo installatore, un PIN o un file di diritti per la scrittura del piano.
- Il compare-and-swap con 409 resta come protezione dai conflitti, non come controllo dei ruoli. I limiti (dimensioni, immagini, frequenza) restano.
- Chiude ISSUE-102 con questa scelta. La parte backend (togliere il filtro `is_admin || is_owner` in `helpers/casa3dRole.ts`, eventuale campo di ruolo nella risposta) è lavoro di R1b.

## Cosa supera di ADR-0014

| ADR-0014 | Con ADR-0017 |
|---|---|
| Sezione 2: Riposo/Vista/Esplora nella pagina del pager; Esplora con un tocco, pager bloccato | La casa è una rotta a schermo intero **fuori dal pager**; la pagina del launcher è un'anteprima ferma; **Esplora è una voce della barra** |
| Sezione 2: «Editor dell'installatore», overlay fuori dal pager | **Editor nostro a quadretti** (R2-R6), non più l'editor copiato; l'overlay resta fuori dal pager |
| Sezione 9: divergenza accettata sull'editor copiato (editor non portato) | L'editor copiato non si porta avanti: va tolto dopo R5b, se approvato |
| Sezione 4 e annotazione T6 (D13): scrittura solo dell'installatore verificato dal server | **Scrittura per tutti gli utenti** (anche i clienti) |
| Anteprima statica come immagine catturata | Anteprima ferma disegnata dal piano vero (SVG); scostamento già in uso, ora dichiarato |

**Resta valido** di ADR-0014: copia congelata e registro delle patch, workspace `casa3d/`, `/casa3d/` per i bundle, prefisso `fp3d`, qualità Light/Medium/High e perdita del contesto, persistenza T6 (tabelle, immagini, cronologia), diritti e `ACASYSTEM_PAYMENTS`, tema, lingua, accessibilità, eccezioni perimetrate.

## Alternative e motivazioni

- **Casa come pagina del pager con Esplora a tocco** (stato attuale): scartata per le richieste dell'utente (schermo intero, barra laterale) e perché il tocco che entra in Esplora confligge con gli swipe del launcher.
- **Esplora = passeggiata ad altezza d'occhi**: scartata; scelto «guarda e comanda».
- **Mantenere l'editor copiato**: scartata come direzione (peso, prestazioni non misurate, UX non a quadretti); sostituzione graduale, con rimozione solo dopo R5b.
- **Scrittura solo dell'installatore o con PIN**: scartata dall'utente («chi modifica tutti anche i clienti»).

Questioni irrisolte: le altre decisioni D-R del piano (D-R3…D-R21, tra cui passo di 25 cm, altezza dei muri, nuove aree in HA, rilascio della vista, uscita per inattività, popup e allarmi) sono coperte da «ok alle proposte» solo nella forma proposta dal piano; i dettagli si verificano in ciascuna tappa. Restano aperti il significato di REQ-06 per il cliente senza privilegi (ISSUE-102 chiusa solo per la scrittura del piano), D8 (visibilità e cifratura) e la decisione sulla T7.

## Conseguenze

- **Comportamento.** Nuova rotta a schermo intero; la pagina del launcher diventa anteprima; voce «Apri la casa» in Sistema; scrittura aperta a tutti gli utenti dopo R1b.
- **API e dati.** Backend: nessun filtro di ruolo sulla scrittura del piano. Rischio accettato dall'utente: un cliente può modificare o cancellare la casa; mitigazione: cronologia a 20 punti di ripristino, 409 e backup.
- **Frontend.** Nuove primitive (es. `SideSheet`, proposta grafica da annotare in `design.md` quando introdotta); chunk lazy dell'editor con soglia di budget propria.
- **Prestazioni.** Misura del rebuild sul Tab M11 prima di R2a; apertura ≤4 s a caldo in R1a; ISSUE-062 non deve peggiorare.
- **Comandi.** Restano spenti (`casa3dCommandsEnabled`, `VITE_CASA3D_COMMANDS`) fino a R7; nessun comando a impianti reali senza l'autorizzazione esplicita dell'utente.
- **Manutenzione.** Il codice dell'editor diventa tutto nostro; il registro delle patch cala con la rimozione dell'editor copiato.

## Verifiche e revisione

- Esistenti: nessuna per questa decisione (solo documentazione). Le verifiche di R1 sono in REP-20261021-002 («Fatto quando»): Vitest su rotta, uscite, fuoco e cronologia; Playwright su swipe, pressione lunga, vista pagine e `touch-action`; Tab M11 per apertura e ISSUE-062. Non eseguite alla data.
- **Revisione da aprire se:** il rebuild o la memoria sul Tab M11 rendono insostenibile la vista nascosta; REQ-06 richiede una separazione dei ruoli anche per il piano; l'utente cambia il significato di Esplora o la scrittura per tutti; R5b non fornisce cronologia e backup equivalenti.
- Annotazioni datate: [ADR-0014](ADR-0014-casa-3d.md) rimanda a questa scheda; il registro è in [README](README.md).

## Accettazione del 2026-10-21

L'utente ha accettato le proposte del piano REP-20261021-002 con le citazioni (2) e (3) di sopra e ha avviato la tappa R1 con «parti». Nessun commit Git è autorizzato; vale la regola dell'utente di nessun commit finché non lo chiede.
