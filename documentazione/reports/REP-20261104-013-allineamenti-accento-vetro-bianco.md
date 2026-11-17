# Allineamenti e accento leggibile del vetro bianco

| Campo | Valore |
|---|---|
| ID / stato | REP-20261104-013 — Completato come rifinitura dell'anteprima |
| Data / autore | 2026-11-04, Codex; nome esatto del modello non disponibile |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta | «concept molto bello, però è tutto molto disallineato, i layout sono gestiti male […] la scelta del viola […] per alcuni pulsanti […] troppo scuro»; due screenshot Home/kit allegati in chat. |
| Autorizzazione | Rifinitura della prova grafica corrente: allineamenti, spaziature e accento leggibile sulle superfici in vetro. |

## Obiettivo e perimetro

Correggere i difetti concreti evidenziati nella [prova completa REP012](REP-20261104-012-interfaccia-completa-vetro-bianco.md), mantenendo materiale, paesaggio e animazioni già richiesti. Titoli e controlli dei widget devono seguire allineamenti coerenti; pannelli dimostrativi e azioni del kit devono avere proporzioni e spaziature consistenti. Accenti chiari per testo/icone/selezioni sopra il vetro scuro, conservando colori funzionali e identità personali.

Fonte opt-in `design/themes/glass-white/`, nessun cambiamento di default o banco, accessi, dati, gesti, librerie, coordinate/ordine/dimensioni dei profili. Eventuali problemi di geometria della configurazione dimostrativa vanno distinti dal CSS interno: non riscrivere layout persistenti per nascondere il problema. [Specifica di design](../design/design.md), ADR-0004/ADR-0042 e vincoli Casa3D/gear conservati. Le modifiche preesistenti (529voci nello stato Git iniziale) sono salvate come elenco in `backup/rep040/git-status-before.txt` e preservate.

## Criteri di completamento

- Header dei widget equivalenti alla stessa quota interna; sezioni e azioni con allineamenti e spaziature stabili nelle dimensioni desktop/telefono.
- Pannelli affiancati del kit coerenti in altezza e azioni leggibili, senza overflow a1440/390/320px.
- Eliminare il viola troppo scuro dai controlli generici sul vetro; focus/selezione riconoscibili e fallback opaco leggibile.
- Verificare le viste interessate e un campione di categorie/popup, preservando la geometria del launcher e il banco reale.

## Avanzamento e modifiche

Rilievo iniziale: le card adaptive distribuiscono contenuti con `space-evenly`, quindi un numero diverso di controlli sposta anche il titolo; il kit allinea i pannelli all'inizio e non ne uniforma l'altezza. Alcuni percorsi di icone/grafici usano direttamente token viola scuro anziché il ruolo di testo chiaro. Correzioni circoscritte al tema, senza sostituire il sistema di layout dell'app.

Baseline osservata in `backup/rep040/baseline-alignment.json`: offset degli header Home1440 da12 a54,64px rispetto al contenitore interno; pannelli kit372,89 e316,52px (delta56,38px), azioni67,19px e switch42px. Il grande sensore deriva dalla geometria dimostrativa: si conserva la dimensione e si usa meglio la superficie per il grafico, senza cambiare coordinate o profili.

Nuovo `glass-white/layout.css`, importato solo dalla variante: header in alto, griglia dei comandi coerente per icona/valore/didascalia e adattamento nei formati stretti. Il sensore grande usa lo spazio per il grafico; il kit estende i pannelli affiancati alla medesima altezza, azioni48px e target switch44px. Le viste dettagli/compatte e la geometria del launcher mantengono i propri contratti.

`white.css` distingue ruoli leggibili: `--k2-accent` lavanda chiaro `#e0d5ff` corregge le vie Kit2 che saltavano gli ink già impostati; riposo bianco e attivo chiaro. Toggle con pista lavanda e pomello scuro `#28213d`; variante opaca con accento scuro su bianco. Identità/avatar personali e colori funzionali delle entità restano indipendenti.

Durante la QA il menu della sola anteprima copriva il comando «Dati lunghi» della toolbar del kit sui telefoni. Spostarlo sopra la toolbar lasciava possibili sovrapposizioni con altri controlli: il server locale di prova `backup/rep039/serve-white-app.mjs` ora lo dispone nel normale flusso della testata del solo kit, evitando un secondo overlay fisso. Nessuna modifica alla navigazione del prodotto. Risultato iniziale interrotto conservato; ripetizione limitata alle viste affette.

A320px una prima prova nascondeva didascalie ritenute duplicate: scelta scartata nella revisione, perché il nome di un'azione non è sempre una ripetizione del widget. La variante finale mantiene le etichette visibili, usando tutta la larghezza sotto l'icona o sotto la coppia icona/valore. Nessun comando o etichetta utile viene eliminato per far entrare il contenuto. I nomi lunghi possono mantenere l'ellissi prevista dal componente; dettagli ed etichetta accessibile restano disponibili.

## Verifiche ed evidenze

| Controllo | Esito | Limiti |
|---|---|---|
| Header e proporzioni | Superato nel campione | Home1440 tutti5header a12px invece dello scarto12–54,64px; a390 tutti8px, a320 tutti4px. Kit desktop: pannelli entrambi337,70px, azioni48px, switch44px. |
| Layout responsive e geometria | Superato nel campione | Home/Kit1440/390/320, popup luce/kit, fallback e8categorie desktop. Geometria serializzata del launcher1440 identica alla baseline; nessun overflow interno/comando fuori card nelle categorie provate. |
| Ricontrolli affetti | Superato |7/7dopo le prime correzioni; poi solo Home320 normale/opaco2/2dopo l'ultima disposizione delle etichette. Caption leggibili intere e nessuna eliminata. I primi esiti sono preservati, senza presentarli come matrice finale unica. |
| Comandi dell'anteprima | Superato | Ultime3viste kit1440/320normale/lungo: menu e toolbar nel flusso della testata, hit-test e click mouse dei mode button e switch riusciti, senza occultamento da overlay o forceclick. |
| Accento | Superato nel campione | Icona Luce: colore nominale contro676pixel dello sfondo senza SVG, minimo1,002→4,111:1, mediana1,179→5,342:1; toggle pista/pomello11,003:1. Non è certificazione di ogni icona/pixel/stato/immagine. Dati e limiti nel relativo handoff. |
| Fallback | Superato | Variante opaca senza fotografia/filtri renderizzati nel campione; accento scuro e pomello bianco conservano leggibilità sul bianco. |
| Risorse e diff | Superato | `node --test progetto/acasystem/design/copy-assets.test.mjs`,6/6PASS; `git diff --check` pertinente senza errori. Nessuna modifica TS/contratti/runtime applicativo: build/suite generale non rieseguite né dichiarate verdi per questo intervento CSS; debito ISSUE-134 distinto. |
| Banco preservato | Superato | ACA/HA/D1 stessi ID, immagini e StartedAt di REP009; `bank-unchanged.json`. Nessun account, profilo o volume reale modificato. |

Script, screenshot e risultati in `backup/rep040/`: `baseline-alignment.json`, `final-alignment-qa.json` (interrotto dal primo conflitto del chrome, preservato), `affected-alignment-qa.json`, `final-home320-qa.json`, `kit-flow-chrome-qa.json`, `alignment-qa-handoff.md` e `accent/handoff.md`/`contrast.json`. Ultimi screenshot `final-home-1440.png`, `final-home-320.png`, `final-kit-flow-1440.png` e `final-kit-flow-worst-320.png`, ispezionati nel campione. Zero erroriJS/HTTP, richieste esterne o POST di rete nei controlli. Le immagini e le misure su Chromium non collaudano M11, Safari/iPhone o Android fisici, né certificano prestazioni GPU/contrasto universale. L'audit funzionale ISSUE-145 non è implicitamente risolto.

## Controllo del diff

Solo `glass-white/index.css`, nuovo `layout.css`, ruoli di accento in `white.css`, documentazione pertinente e server locale della prova per il chrome del kit. `motion.css`, foto, primitive React, controller, impostazioni e geometria salvata non sono modificati da questo intervento. Nessun refactor, libreria, cambiamento di stack o aggiornamento del banco.

## Chiusura e punto di ripresa

Rifinitura completata e lasciata attiva: [ACA](http://127.0.0.1:4185/?screen=app#/mockup), [Kit](http://127.0.0.1:4185/kit). Ricaricare la pagina per vedere il CSS corrente. I profili conservano dimensioni e ordine; il grande sensore rimane grande, con il grafico che utilizza la superficie disponibile.

Nessun ulteriore incarico software resta attivo per questa correzione. Ricevere il riscontro grafico dell'utente; eventuali promozione al default, installazione del tema sul banco o ulteriori cambiamenti del layout sono incarichi distinti. Nessun commit, deploy o pubblicazione.
