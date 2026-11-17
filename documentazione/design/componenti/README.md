Agenda, Stanze e Gateway Zigbee: [Agenda](agenda.md), [Stanze](stanze.md), [Zigbee](gateway-zigbee.md), attuazione locale .70 nel [REP002](../../reports/REP-20261112-002-widget-rimanenti.md).

Meteo e Meteo di casa: [brief](meteo.md), attuazione .69 completata e verificata localmente (126 test dedicati, QA 6 flussi/6 cold/5 viste simulate); fonte e temperatura locale esplicite, previsioni e storico distinti, [REP001](../../reports/REP-20261112-001-area-meteo.md).

#Area Multimedia attuata e verificata localmente nella .65: [TV, Sonos e lettori](multimedia.md), [REP003](../../reports/REP-20261111-003-area-multimedia.md). Stessa identità Vetro Bianco, gruppi storici conservati.

 Catalogo delle reference UI

Area Robot assegnata2026-11-11: [Aspirapolvere e Tagliaerba](robot.md), [REP002](../../reports/REP-20261111-002-area-robot-aspirapolvere-tagliaerba.md); estensione delle famiglie operative attuata e verificata localmente nella .64.

Sicurezza per dispositivo, incarico2026-11-11: [Serrature](serrature.md), [Allarme](allarme.md) e [Videocamere](videocamere.md). [REP001](../../reports/REP-20261111-001-serrature-allarme-videocamere.md) distingue avanzamento e verifiche. Primitive e identità ACA esistenti.

Quinta famiglia operativa: [Ventilatori](ventilatori.md), richiesta confermata del 2026-11-10 e [REP004](../../reports/REP-20261110-004-ventilatori-per-dispositivo.md). Home sintetica, dettagli per canale e funzioni effettive, nel design ACA esistente.

Quarta famiglia operativa: [Tapparelle, tende e veneziane](tapparelle-tende.md), richiesta confermata del 2026-11-10 e [REP003](../../reports/REP-20261110-003-tapparelle-tende-per-dispositivo.md). Stato osservato e target distinti, Stop indipendente e dettagli per canale, nel design ACA esistente.

Terza famiglia operativa: [Clima](clima-prodotto.md), richiesta umana del 2026-11-10 e [REP002](../../reports/REP-20261110-002-clima-per-dispositivo.md). Home sintetica, canali indipendenti e funzioni effettive di termostati e climatizzatori; identità ACA Vetro Bianco conservata.

Seconda famiglia operativa: [Prese e interruttori](prese-interruttori.md), piano approvato del2026-11-10 e [REP001](../../reports/REP-20261110-001-prese-interruttori-per-dispositivo.md). Tessera multicanale sintetica e uscite, misure e tecnica separate; stessa identità ACA Vetro Bianco.

Superfici operative: [Trova dispositivi e Luci](trova-dispositivi-e-luci.md), piano umano del2026-11-09 e [REP013](../../reports/REP-20261109-013-utilita-e-luci-per-dispositivo.md). Primo accesso del catalogo, binding per dispositivo e canali distinti; [Tavano](tavano.md) è il secondo accesso diretto. Nessuna nuova reference originale o tema.

Flusso condiviso: [catalogo widget a tendina](catalogo-widget.md), assegnato il2026-11-06 e completato localmente nel [REP006](../../reports/REP-20261106-006-catalogo-widget-tendina.md). Scroll sulla Home, salita con dissolvenza e anteprime orizzontali intere; nessuna nuova reference originale o nuovo tema.

Flusso condiviso: [caricamento e ingresso Home](caricamento-home.md), assegnato il2026-11-06 e completato localmente nel [REP004](../../reports/REP-20261106-004-caricamento-home-unitario.md). Loader, prima vista pronta e ingresso coerente, con collaudi e limiti espliciti; nessuna nuova reference originale o nuovo tema.

Rifinitura operativa: [vetro del widget in spostamento](trascinamento-widget.md), proposta accettata e implementata nel [REP002](../../reports/REP-20261105-002-vetro-trascinamento-widget.md), 2026-11-05. Copia2px, origine/destinazione a contorno, nessuna nuova reference originale o modifica dei materiali a riposo.

Comportamento condiviso: [dal widget alla schermata](widget-schermata.md), richiesta del 2026-11-05, [REP001](../../reports/REP-20261105-001-transizione-generica-widget.md). Dissolvenze coordinate ed espansione delle schermate esistenti; nessuna nuova reference originale acquisita.

Superficie aggiornata: [Sistema e identità personale](sistema.md), richiesta umana del 2026-11-04 e consegna sul banco 0.9.46 il 2026-11-05, [REP017](../../reports/REP-20261104-017-sistema-e-personalizzazione-account-unica.md). Editor comune tra registrazione e account; gli originali acquisiti rimangono invariati.

Superfici applicative correnti, distinte dagli originali acquisiti: [Tavano — lista, giorni e paginazione](tavano.md), richiesta umana2026-11-04, [REP016](../../reports/REP-20261104-016-tavano-lista-giorni-paginazione.md). Il brief descrive l'adattamento ACA, non introduce una nuova reference originale o un sistema grafico alternativo.

Acquisite dal 2026-10-05, secondo il [piano approvato e report](../../reports/REP-20261005-003-raccolta-componenti-microinterazioni.md); UI-008 e UI-009 aggiunte il 2026-10-06 con [REP-20261006-001](../../reports/REP-20261006-001-acasystem-os.md) come trascrizioni dalla chat, UI-012 ricevuta in U54 il 2026-11-02, UI-015 acquisita per il tema Liquid Glass il 2026-11-04. Gli **originali raccolti restano invariati e non sono importati dall'app**. Le composizioni applicative adattate, quando autorizzate, sono distinte nella tabella finale: U54 autorizza l'ispirazione di UI-012 per la vista account ACA; [REP008](../../reports/REP-20261104-008-tema-liquid-glass.md) assegna il tema da UI-015. Lo stile e le interazioni correnti sono in [design.md](../design.md); il catalogo non attesta il collaudo degli originali.

## Catalogo

I campioni di codice React dichiarano import da **React** e **styled-components**, senza versioni; le immagini non hanno dipendenze eseguibili. Questi import descrivono i campioni: la raccolta non installa o adotta una nuova dipendenza.

| ID | Descrizione e originale | Dipendenze dichiarate | Ruolo progettuale | Osservazioni statiche per il lavoro futuro |
|---|---|---|---|---|
| UI-015 | [Reference Liquid Glass](originali/UI-015-liquid-glass.png) | Immagine PNG | Fonte visiva scelta dall’utente2026-11-04 per realizzare e applicare il nuovo tema condiviso, [ADR-0042](../../decisions/ADR-0042-tema-liquid-glass.md). | Card traslucida su forme morbide colorate, bordo luminoso e azioni distinte. Originale preservato byte per byte; ispirazione ottica CSS, senza import dell’immagine, rifrazione SVG o nuovi campi/flussi. Implementazione e QA locali concluse, con limiti hardware in REP008. |
| UI-014b | [Dettaglio testi e divisore QR](originali/UI-014b-haos-collegamento-testi.png) | Immagine | Precisazione utente2026-11-04: scritte inglesi e divisore uguali alla reference. | Originale distinto/hash nel registro. Anteprima iterazione2, senza pulsanti o input. |
| UI-014 | [Card centrale di collegamento QR](originali/UI-014-haos-collegamento-qr.png) | Immagine | Reference utente2026-11-04 per anteprima HAOS: card centrata, QR e stringa IP, senza pulsanti. | Originale PNG preservato/hash nel registro. Materiali, font e colori ACA; proposta da approvare in REP-20261104-001, nessuna integrazione boot. |
| UI-013 | [Sign-in/sign-up](originali/UI-013-sign-in-sign-up.jsx.txt): form compatto e collegamento alternativo nel footer | React, styled-components | Ispirazione di gerarchia fornita dall'utente durante [REP016](../../reports/REP-20261102-016-modifica-immediata-e-ingresso-profilo.md). | Trascrizione inline integra, hash nel registro. ACA conserva materiale, primitive, username HA e occhiolino; nessuna dipendenza o autenticazione email adottata. |
| UI-012 | [Card account con cover e avatar sovrapposto](originali/UI-012-account-cover-avatar.jsx.txt) | React, styled-components | Reference di composizione fornita in U54,2026-11-02; gerarchia adattata nella vista account ACA su autorizzazione umana. | Originale byte per byte dell'allegato, SHA256 nel registro. L'app usa primitive ACA senza importare il campione o adottarne dipendenze, palette e pulsanti social; verifiche nel report012. |
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
| UI-015 | Immagine allegata alla richiesta Liquid Glass del2026-11-04 | Sconosciuto | Sconosciuta | Sconosciuta |
| UI-001–UI-006 | Sei esempi nel messaggio dell'utente, nell'ordine sopra | Sconosciuto | Sconosciuta | Sconosciuta |
| UI-007 | Allegato denominato Testo incollato.txt | Sconosciuto | Sconosciuta | Sconosciuta |
| UI-008 | Testo incollato in chat il 2026-10-05 | Sconosciuto | Sconosciuta; il codice cita come ispirazione «五金行日曆 2020» (shoppingdesign.com.tw/post/view/4618) e fonti dei calcoli | Sconosciuta |
| UI-009 | Testo incollato in chat il 2026-10-05 | Sconosciuto | Sconosciuta; il codice cita come ispirazione un'immagine Dribbble | Sconosciuta |
| UI-010 | Testo incollato in chat il 2026-10-09 | Sconosciuto | Sconosciuta | Sconosciuta |
| UI-011 | Testo incollato in chat il 2026-10-27 | Sconosciuto | Sconosciuta | Sconosciuta |
| UI-012 | Allegato della chat U54 del 2026-11-02 | Sconosciuto | Sconosciuta | Sconosciuta |
| UI-014b | Dettaglio immagine allegato alla revisione testi2026-11-04 | Sconosciuto | Sconosciuta | Sconosciuta |
| UI-014 | Immagine allegata alla richiesta del2026-11-04 | Sconosciuto | Sconosciuta | Sconosciuta |
| UI-013 | Testo inline nella chat del 2026-11-02 durante REP016 | Sconosciuto | Sconosciuta | Sconosciuta |

L'utente è il fornitore delle reference, non un autore o titolare dei diritti accertato. I nomi SVGRepo presenti nel markup Wi-Fi non identificano un URL, un autore o una licenza verificati. Il riuso applicativo richiede verifica della provenienza e delle condizioni, registrata in [compliance.md](../../compliance.md#registro-dei-vincoli).

## Acquisizione e integrità

- I sei esempi sono catturati in UTF-8 con terminazioni LF in [messaggio-2026-10-05.txt](fonti/messaggio-2026-10-05.txt). La cattura contiene soltanto il codice incollato, senza testo esplicativo aggiunto al codice. Non esiste un file sorgente esterno del messaggio per attestarne l'identità di byte o terminazioni originali.
- UI-001–UI-006 sono porzioni contigue di quella cattura, separate all'inizio di ciascun import React; la loro concatenazione deve coincidere byte per byte con la cattura. Nomi dei componenti, import, CSS e spazi ricevuti restano conservati.
- UI-007 è una copia byte per byte dell'allegato, incluse le terminazioni presenti nel file.
- UI-015 è una copia byte per byte dell’immagine allegata alla richiesta Liquid Glass; il file originale e la copia locale del coordinatore hanno lo stesso SHA-256. Nessun ritaglio, ricodifica o adattamento dell’originale.
- [integrita.json](integrita.json) registra byte, intervalli e SHA-256 della prima acquisizione. Git mantiene i byte delle aree fonti/ e originali/ senza conversione delle terminazioni. Le estensioni .jsx.txt identificano reference testuali, non moduli dell'app.

Gli hash documentano l'integrità del materiale acquisito, non paternità, licenza o correttezza del codice.

## Regole di accumulo e adattamento

Assegnare a nuovi campioni l'ID successivo, mai riutilizzato. Conservare gli originali e aggiornare catalogo, provenienza e integrità. Non sovrascrivere un originale per correggere CSS, attributi o palette; una nuova fonte o rettifica va conservata come revisione distinta e annotata.

Le versioni adattate devono essere separate e collegare l'originale, l'incarico autorizzato e le verifiche eseguite; quelle realizzate nei successivi incarichi sono elencate sotto. Prima dell'adattamento verificare temi, arancione, focus e nome accessibile, ID univoci, stati reali/attesa/errore, movimento ridotto e compatibilità con Tunet. I tempi e gli effetti presenti nei campioni sono reference, non valori approvati da copiare automaticamente.

Sequenza richiesta: **accumulo → preparazione HA con incarico dedicato → lavoro sulla UI con incarico dedicato**.

## Adattamenti applicativi

Gli originali restano invariati e non sono importati dall'app. Le versioni adattate vivono nel codice e collegano reference, incarico e verifiche:

| Reference | Adattamento | Incarico e verifiche |
|---|---|---|
| UI-015 | Tema ACA Liquid Glass nella [fonte comune del design](../../../progetto/acasystem/design/README.md): vetro satinato per pannelli, riflessi ottici CSS per navigazione/controlli, font e colori ACA conservati. Classico resta distinto; l’immagine originale e la UI browser del campione non sono importate. | [ADR-0042](../../decisions/ADR-0042-tema-liquid-glass.md), [REP008](../../reports/REP-20261104-008-tema-liquid-glass.md): implementazione/build e QA locali concluse; hardware e aggiornamento del banco distinti. |
| UI-012 | Composizione della [vista account](../../../progetto/acasystem/frontend/src/components/account/AccountView.tsx): copertina, avatar sovrapposto, nome/client e controlli di personalizzazione. Foto o colore, ritaglio e copertina locale alla vista sono comportamenti ACA di U54; materiali, tipografia e controlli usano le primitive condivise. Nessun import dell'originale o dipendenza styled-components. | U54, [ADR-0035](../../decisions/ADR-0035-profili-live-client-e-tavano.md), [report012](../../reports/REP-20261102-012-profili-client-editing-tavano.md). Prove software/browser distinte dal collaudo su dispositivi fisici; autore/licenza del campione non accertati. |
| UI-003 | Materiale a pressione di pulsanti, card di stato ed emblema: socket, guscio e faccia con hover/click del riferimento, riscritto in CSS nativo e colori dei temi ACA. Nessuna dipendenza, nessun styled-components. Sezione [Materiale a pressione](../design.md#materiale-a-pressione-implementato) del design; src/styles/neumorphism.css; primitiva Card. | [REP-20261005-011](../../reports/REP-20261005-011-materiale-pressione.md) e [verification.md](../../verification.md). Provenienza e licenza restano sconosciute: C-10 e ISSUE-014 non sono risolti da questo adattamento. |
| UI-010 | Nuvoletta delle icone senza testo dell'editor delle pagine (classe `tooltip` dell'originale): fondo d'accento di Kit 2 scurito (luminosità fino a 0,45, saturazione ridotta con essa, tinta invariata) con testo bianco di almeno 4,5:1; raggio 5 px, ombra `0 10px 10px` al 10 %, triangolino 8×8 che indica l'icona anche contro il bordo (`data-side`, `--aca-tip-arrow-x`); testo Inter 16 px peso 500; comparsa con la curva `cubic-bezier(0.68, -0.55, 0.265, 1.55)` in 300 ms, solo dissolvenza di 120 ms con il movimento ridotto. Attivazione con pressione lunga, mouse e fuoco. Nessuna dipendenza, nessun styled-components, nessun `transition: all`, nessun logo. Blocco `.aca-edit-tip` di `components/system/edit/edit.css` e `IconAction.tsx`. | [REP-20261009-003](../../reports/REP-20261009-003-vista-pagine-animazione.md) (B5) e [verification.md](../../verification.md#pageshell-vista-pagine-a-trasformazioni-e-nuvoletta-ui-010--2026-10-09). Provenienza e licenza restano sconosciute: C-10 e ISSUE-014 non sono risolti da questo adattamento. Prova sul Lenovo non eseguita. |

Area Sensori assegnata il 2026-11-11, in corso: [Sensori e helper distinti](sensori.md), [REP004](../../reports/REP-20261111-004-area-sensori.md). Nessun nuovo originale o tema; letture del dispositivo, cronologia pertinente e associazione distinta dagli helper.

Area Energia e consumi assegnata il 2026-11-11 e in corso: [fonti e prezzi espliciti](energia-consumi.md), [REP005](../../reports/REP-20261111-005-energia-consumi.md). Quattro fonti per Energia e consumi e una per i prezzi, senza nuova reference originale o materiale grafico.

Area Auto completata e verificata localmente nella .68 il 2026-11-11: [fonti esplicite e comandi osservabili](auto.md), [REP006](../../reports/REP-20261111-006-area-auto.md). Associazione condivisa fra categorie e widget storici, copertura manuale parziale senza risolutore universale; nessuna nuova reference originale o materiale grafico. Banco, hardware e pubblicazione distinti.
