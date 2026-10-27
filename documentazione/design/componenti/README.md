# Catalogo delle reference UI

Acquisite il 2026-10-05, secondo il [piano approvato e report](../../reports/REP-20261005-003-raccolta-componenti-microinterazioni.md); UI-008 e UI-009 aggiunte il 2026-10-06 con [REP-20261006-001](../../reports/REP-20261006-001-acasystem-os.md) come trascrizioni dalla chat. Le reference sono **raccolte, non adattate, integrate o collaudate**. Lo stile e le interazioni da perseguire sono in [design.md](../design.md).

## Catalogo

Tutti gli esempi dichiarano import da **React** e **styled-components**, senza versioni. Questi import descrivono i campioni: la raccolta non installa o adotta una nuova dipendenza.

| ID | Descrizione e originale | Dipendenze dichiarate | Ruolo progettuale | Osservazioni statiche per il lavoro futuro |
|---|---|---|---|---|
| UI-001 | [Switch principale](originali/UI-001-switch-principale.jsx.txt): cursore arrotondato, indicatori e ombre multiple | React, styled-components | **Riferimento principale** per profondità, rilievo, movimento e illuminazione di tutti gli altri design. | Checkbox con defaultChecked e display:none; palette HSL incorporata, durata 0,6s e transition:all. Stato demo locale, senza conferma HA. |
| UI-002 | [Switch con grip](originali/UI-002-switch-grip.jsx.txt): cursore compatto con dodici punti | React, styled-components | Variante per materiale e movimento. | Colori grigi e giallo #f3b519 incorporati; input trasparente, nome accessibile e focus da verificare. |
| UI-003 | [Pulsante a pressione](originali/UI-003-pulsante-pressione.jsx.txt): guscio e interno con rilievi | React, styled-components; font Inter indicato nel CSS | Reference di pressione e transizioni del pulsante. | Hover/active, ombre e clip-path; all:unset, testo a gradiente e disponibilità font da valutare. Non definisce attesa, errore o disabilitazione. |
| UI-004 | [Switch con LED](originali/UI-004-switch-led.jsx.txt): indicatore luminoso sul cursore | React, styled-components | Variante di feedback luminoso. | ID fisso toggle-switch, input display:none, LED giallo e dimensioni fisse. Necessari adattamenti futuri per più istanze, temi e stati reali. |
| UI-005 | [Card incassata](originali/UI-005-card-incassata.jsx.txt): superficie vuota con ombre interne | React, styled-components | Reference di contenitore incassato. | lightgrey, geometria fissa 190×254 e raggio 30px; nessun contenuto o stato operativo. |
| UI-006 | [Card stratificata](originali/UI-006-card-stratificata.jsx.txt): guscio, overlay e contenuto dimostrativo | React, styled-components; monospace indicato nel CSS | Reference di livelli e materiale del contenitore. | Colori incorporati, testo dimostrativo, trama repeating-conic-gradient e filter; leggibilità, densità e costo di rendering da verificare. |
| UI-007 | [Switch Wi-Fi](originali/UI-007-switch-wifi.jsx.txt): pulsante circolare con icona SVG e animazione luminosa | React, styled-components; SVG inline | **Riferimento aggiuntivo** per feedback luminoso e animazioni. | ID fisso checkbox, input display:none, accento blu e animazioni infinite da 0,3s. Il futuro design usa arancione e anima azioni/attese, mantenendo stabile lo stato attivo. |
| UI-008 | [Calendario a strappo](originali/UI-008-calendario-strappo.txt): calendario da ferramenta con gancio, puntine, data grande, mini-mese, giorno lunare, orologio e pulsante luce | Pug, Sass, JavaScript; font Anton/Roboto/Oswald/Roboto Mono e Material Icons richiamati | Reference della copertina del launcher (ADR-0007). | Testi tutto maiuscolo e letter-spacing, colori #139AB4/#FED538, data lunare cinese e pulsante luce: in ACA vanno rispettivamente tolti, sostituiti dagli accenti e omessi. Calcoli del mese riutilizzabili come logica, non come codice. |
| UI-009 | [Indicatore a pallina](originali/UI-009-indicatore-pallina.txt): range nativo trasparente con numeri incisi e sfera arancione che scorre | HTML, SCSS, JavaScript | Reference dell'indicatore di pagina del launcher (ADR-0007). | Numeri a peso 900 con testo a gradiente; massimo fisso a 7; formula di posizione dichiarata imprecisa nel commento dell'autore. |

| UI-010 | [Nuvoletta (tooltip)](originali/UI-010-tooltip.jsx.txt): fumetto con triangolino, sopra icone circolari; inviata il 2026-10-09 per la nuvoletta dell'editor delle pagine | React, styled-components; font Poppins indicato nel CSS; SVG inline di marchi social | Reference della **nuvoletta** (solo la classe `tooltip`, come indicato dall'utente) per le icone senza testo: comparsa dal basso con opacità e curva con rimbalzo, ombra morbida, triangolo ruotato. | Testo bianco su fondo bianco a riposo; colori dei marchi social all'hover; 14 px; appare solo all'hover (niente tocco, tastiera o pressione lunga); `transition: all`. Da adattare: colori del tema, contrasto ≥ 4,5:1, misura del testo, attivazione al tocco e al fuoco, movimento ridotto; i loghi social non vanno usati. |
| UI-011 | [Riproduttore «Now Playing»](originali/UI-011-riproduttore-now-playing.html.txt): card scura con riquadro copertina, titolo e sottotitolo, barra di avanzamento sottile con i tempi, tre tasti rotondi centrati; inviata il 2026-10-27 per il riproduttore della consolle TV | HTML con classi Tailwind (`glass-effect`, `progress-width` non definite nel campione); SVG inline | Reference del **riproduttore** della consolle: gerarchia copertina + titolo, barra sottile con i tempi, tasti di trasporto uniformi e distanziati. | Fondo nero e vetro con `backdrop-blur`, ombre interne multiple e `hover:scale`: in ACA vanno sostituiti dai materiali e colori del tema, senza blur né ombre animate (GPU del tablet). Testi inglesi («Now Playing», «Previous track»), barra senza interazione e tempi fissi; tasti da 36 px. |

Sono osservazioni del testo, non risultati di esecuzione. Nessun campione realizza ancora la regolazione continua della luminosità richiesta.

## Provenienza

| Reference | Materiale ricevuto | Autore originale | URL / fonte originale | Licenza |
|---|---|---|---|---|
| UI-001–UI-006 | Sei esempi nel messaggio dell'utente, nell'ordine sopra | Sconosciuto | Sconosciuta | Sconosciuta |
| UI-007 | Allegato denominato Testo incollato.txt | Sconosciuto | Sconosciuta | Sconosciuta |
| UI-008 | Testo incollato in chat il 2026-10-05 | Sconosciuto | Sconosciuta; il codice cita come ispirazione «五金行日曆 2020» (shoppingdesign.com.tw/post/view/4618) e fonti dei calcoli | Sconosciuta |
| UI-009 | Testo incollato in chat il 2026-10-05 | Sconosciuto | Sconosciuta; il codice cita come ispirazione un'immagine Dribbble | Sconosciuta |
| UI-010 | Testo incollato in chat il 2026-10-09 | Sconosciuto | Sconosciuta | Sconosciuta |
| UI-011 | Testo incollato in chat il 2026-10-27 | Sconosciuto | Sconosciuta | Sconosciuta |

L'utente è il fornitore delle reference, non un autore o titolare dei diritti accertato. I nomi SVGRepo presenti nel markup Wi-Fi non identificano un URL, un autore o una licenza verificati. Il riuso applicativo richiede verifica della provenienza e delle condizioni, registrata in [compliance.md](../../compliance.md#registro-dei-vincoli).

## Acquisizione e integrità

- I sei esempi sono catturati in UTF-8 con terminazioni LF in [messaggio-2026-10-05.txt](fonti/messaggio-2026-10-05.txt). La cattura contiene soltanto il codice incollato, senza testo esplicativo aggiunto al codice. Non esiste un file sorgente esterno del messaggio per attestarne l'identità di byte o terminazioni originali.
- UI-001–UI-006 sono porzioni contigue di quella cattura, separate all'inizio di ciascun import React; la loro concatenazione deve coincidere byte per byte con la cattura. Nomi dei componenti, import, CSS e spazi ricevuti restano conservati.
- UI-007 è una copia byte per byte dell'allegato, incluse le terminazioni presenti nel file.
- [integrita.json](integrita.json) registra byte, intervalli e SHA-256 della prima acquisizione. Git mantiene i byte delle aree fonti/ e originali/ senza conversione delle terminazioni. Le estensioni .jsx.txt identificano reference testuali, non moduli dell'app.

Gli hash documentano l'integrità del materiale acquisito, non paternità, licenza o correttezza del codice.

## Regole di accumulo e adattamento

Assegnare a nuovi campioni l'ID successivo, mai riutilizzato. Conservare gli originali e aggiornare catalogo, provenienza e integrità. Non sovrascrivere un originale per correggere CSS, attributi o palette; una nuova fonte o rettifica va conservata come revisione distinta e annotata.

Eventuali versioni adattate devono essere separate e collegare l'originale, l'incarico autorizzato e le verifiche eseguite. Non sono create in questa fase. Prima dell'adattamento verificare temi, arancione, focus e nome accessibile, ID univoci, stati reali/attesa/errore, movimento ridotto e compatibilità con Tunet. I tempi e gli effetti presenti nei campioni sono reference, non valori approvati da copiare automaticamente.

Sequenza richiesta: **accumulo → preparazione HA con incarico dedicato → lavoro sulla UI con incarico dedicato**.

## Adattamenti applicativi

Gli originali restano invariati e non sono importati dall'app. Le versioni adattate vivono nel codice e collegano reference, incarico e verifiche:

| Reference | Adattamento | Incarico e verifiche |
|---|---|---|
| UI-003 | Materiale a pressione di pulsanti, card di stato ed emblema: socket, guscio e faccia con hover/click del riferimento, riscritto in CSS nativo e colori dei temi ACA. Nessuna dipendenza, nessun styled-components. Sezione [Materiale a pressione](../design.md#materiale-a-pressione-implementato) del design; src/styles/neumorphism.css; primitiva Card. | [REP-20261005-011](../../reports/REP-20261005-011-materiale-pressione.md) e [verification.md](../../verification.md). Provenienza e licenza restano sconosciute: C-10 e ISSUE-014 non sono risolti da questo adattamento. |
| UI-010 | Nuvoletta delle icone senza testo dell'editor delle pagine (classe `tooltip` dell'originale): fondo d'accento di Kit 2 scurito (luminosità fino a 0,45, saturazione ridotta con essa, tinta invariata) con testo bianco di almeno 4,5:1; raggio 5 px, ombra `0 10px 10px` al 10 %, triangolino 8×8 che indica l'icona anche contro il bordo (`data-side`, `--aca-tip-arrow-x`); testo Inter 16 px peso 500; comparsa con la curva `cubic-bezier(0.68, -0.55, 0.265, 1.55)` in 300 ms, solo dissolvenza di 120 ms con il movimento ridotto. Attivazione con pressione lunga, mouse e fuoco. Nessuna dipendenza, nessun styled-components, nessun `transition: all`, nessun logo. Blocco `.aca-edit-tip` di `components/system/edit/edit.css` e `IconAction.tsx`. | [REP-20261009-003](../../reports/REP-20261009-003-vista-pagine-animazione.md) (B5) e [verification.md](../../verification.md#pageshell-vista-pagine-a-trasformazioni-e-nuvoletta-ui-010--2026-10-09). Provenienza e licenza restano sconosciute: C-10 e ISSUE-014 non sono risolti da questo adattamento. Prova sul Lenovo non eseguita. |
