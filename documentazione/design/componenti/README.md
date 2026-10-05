# Catalogo delle reference UI

Acquisite il 2026-10-05, secondo il [piano approvato e report](../../reports/REP-20261005-003-raccolta-componenti-microinterazioni.md). Le sette reference sono **raccolte, non adattate, integrate o collaudate**. Lo stile e le interazioni da perseguire sono in [design.md](../design.md).

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

Sono osservazioni del testo, non risultati di esecuzione. Nessun campione realizza ancora la regolazione continua della luminosità richiesta.

## Provenienza

| Reference | Materiale ricevuto | Autore originale | URL / fonte originale | Licenza |
|---|---|---|---|---|
| UI-001–UI-006 | Sei esempi nel messaggio dell'utente, nell'ordine sopra | Sconosciuto | Sconosciuta | Sconosciuta |
| UI-007 | Allegato denominato Testo incollato.txt | Sconosciuto | Sconosciuta | Sconosciuta |

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
