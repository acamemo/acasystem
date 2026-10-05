# ACA SYSTEM — Specifica di design

Aggiornato: 2026-10-05. Questo documento è la fonte delle scelte visive e delle proposte UI/UX. Requisiti, ruoli e comportamento dell'app sono nel [modulo funzionalità](../funzionalita/README.md); stato effettivo e incarichi in [project-status.md](../project-status.md). HOME, controlli condivisi e finestre di gestione schede/pagine hanno il primo materiale Neumorphism, verificato sul banco locale; card dispositivo, dimmer con riscontro HA e altre schermate restano da convertire.

## Scopo e responsabilità

Descrivere come presentare le funzionalità autorizzate: stile, colori, gerarchia, componenti e feedback. Il design non aggiunge funzionalità, permessi o automazioni. Una schermata proposta non autorizza lo sviluppo del comportamento rappresentato.

La fase 1 minima è Home Assistant personalizzato graficamente, con Tunet come punto di partenza React e pilota in ufficio. Il suo perimetro è in [pilot-scope.md](../funzionalita/pilot-scope.md). L'analisi tecnica di Tunet deve precedere la scelta di componenti e librerie da integrare.

## Indicazioni umane confermate

| Elemento | Indicazione | Fonte / stato |
|---|---|---|
| Stile | Neumorphism, o neumorfismo | Utente, 2026-10-05: «Neumorphism si chiama lo stile». |
| Temi | Tema chiaro e tema scuro | Piano di raccolta approvato dall'utente, 2026-10-05. |
| Base chiara | Colore chiaro preciso da definire nella fase UI | Indicazione successiva: sostituire la base grigia con un colore chiaro. Nessun valore chiaro ancora scelto. |
| Riferimento scuro | `#222222` | Colore iniziale conservato come riferimento del tema scuro nel piano approvato. |
| Accento | Arancione `#ef8231` in entrambi i temi | Piano di raccolta approvato dall'utente, 2026-10-05. |
| Reference principale | Primo switch, UI-001 | Base per profondità, rilievo, movimento e illuminazione degli altri design. |
| Reference di animazione | Switch Wi-Fi, UI-007 | Riferimento aggiuntivo per feedback luminoso e animazioni. |
| Microinterazioni | Priorità esplicita, con feedback durante il gesto | Indicazioni e risposte umane riprese nel piano approvato. |
| Reference | [Articolo Clay](https://clay.global/blog/neumorphism-ui) e tre immagini fornite in chat | Ispirazione estetica; non schermate ACA approvate. |
| Logo | Non ancora disponibile | Da definire; nessun logo generato o adottato. |
| Lingua delle nuove interfacce | Italiano | Precisazione umana durante REP-20261005-006; data/ora nel locale it-IT. Traduzione legacy ancora parziale. |
| Icone dei componenti migrati | mx-icons | Pacchetto npm confermato dall'utente; prima adozione 1.1.2 in HOME, currentColor per seguire i temi. |

La prima [migrazione HOME](../reports/REP-20261005-006-migrazione-home-typescript.md) conserva l'aspetto Tunet per isolare la conversione; testi e icone sono gli adattamenti richiesti. [ADR-0005](../decisions/ADR-0005-typescript-italiano-icone.md) delimita questa adozione. Button/Container/Icon, Heading/Text e Flex costituiscono il primo strato condiviso; varianti, token e materiale Neumorphism completi restano da progettare nel relativo incarico.

## Primo materiale HOME implementato

[REP-20261005-008](../reports/REP-20261005-008-home-neumorphism.md) documenta la ripresa da Antigravity, autorizzata nella chat: «stoppo e prosegui tu?» e conferma di Gemini fermo. La HOME vuota, intestazione, navigazione, modifica, menu impostazioni e gestore pagine usano il materiale comune. I due pulsanti legacy Entità/Indicatori adottano Button/Icon senza convertire la logica JSX dei rispettivi adattatori.

| Ruolo | Scuro | Chiaro | Natura della scelta |
|---|---|---|---|
| Superficie | #222222 | #f2f3f5 | Scuro confermato; chiaro scelto nell'esecuzione della UI, non nuova approvazione umana. |
| Testo principale / secondario | #f5f5f7 / #a1a1aa | #1e293b / #475569 | Coppie opache verificate nei test di contrasto. |
| Azione principale | #ef8231 con testo #222222 | #ef8231 con testo #222222 | Accento umano confermato; testo scuro evita il contrasto insufficiente del bianco. |
| Testo/icona selezionati e focus | #ef8231 | #9b3f10 | Arancione più scuro sul tema chiaro per leggibilità; l'accento delle azioni rimane #ef8231. |
| Ombra / luce | #141414 / #303030 | #cbd0d7 / #ffffff | Direzione coerente dall'alto a sinistra; rilievo a riposo, incasso per selezione/pressione. |

Button centralizza primary/secondary/control; plain conserva i componenti legacy. Container espone superfici raised/inset. Materiale in src/styles/neumorphism.css, token in themes.js. Il simbolo di benvenuto è decorativo, non dichiara uno stato di impianto. Focus separato dal rilievo; selezione stabile tramite aria-current/pressed/expanded; movimento e illuminazione durante interazioni, senza cicli infiniti. Transizioni dei controlli 180 ms; pulsanti azione 56 px, controlli 44 px CSS. Il wrapper mobile preesistente può ridimensionare le entità dell'intestazione.

Il fondo segue la superficie nei temi dark/light e modalità Follow theme; sfondi personalizzati e temi legacy conservano i meccanismi precedenti. Il selettore del tema esistente resta responsabile della persistenza. La base chiara iniziale di Antigravity #e0e5ec è stata schiarita a #f2f3f5; l'originale acquisito è conservato nel backup di passaggio.

Controlli eseguiti: coppie testo/superficie opache, focus nel browser, due temi, desktop, mobile e tablet. La regola prefers-reduced-motion disattiva transizioni/animazioni della porzione; verificata nel CSS distribuito, non mediante cambio della preferenza del sistema operativo. Non è attestata conformità WCAG complessiva, leggibilità sul tablet fisico o copertura di tutte le schermate/stati. Reference originali conservate; nessun codice originale importato o nuova dipendenza.

La separazione in moduli e la creazione di questo file sono richieste dall'utente nel presente [incarico](../reports/REP-20261005-002-moduli-documentali-design.md). Le indicazioni precedenti e i calcoli sui colori sono conservati nell'[annotazione del report del pilota](../reports/REP-20261005-001-direzione-pilota.md#annotazione-del-2026-10-05--risposte-successive-e-stile-grafico).

La successiva richiesta di [raccolta e microinterazioni](../reports/REP-20261005-003-raccolta-componenti-microinterazioni.md) aggiorna la direzione inizialmente scura: sono richiesti entrambi i temi, con arancione comune. Le [sette reference](componenti/README.md) sono conservate come originali testuali; non sono una UI implementata né autorizzano installazioni. Sequenza richiesta: accumulo, preparazione HA e poi UI, con incarichi dedicati alle fasi successive.

## Finestre di gestione implementate

[REP-20261005-009](../reports/REP-20261005-009-gestione-schede-pagine.md) estende il materiale ad aggiunta scheda, nuova pagina, modifica pagina e selettore icone. Modal separa intestazione, corpo scorrevole e azioni sempre raggiungibili; Input usa incasso e focus; Choice usa selezione stabile; Switch espone un pulsante nativo con role switch, indicatore luminoso e corsa del pomello. Movimento ridotto elimina le transizioni conservando posizione e stato. Le reference originali rimangono intatte.

Testi italiani e mx-icons per i controlli; nomi e catalogo delle icone già salvate restano compatibili. La griglia del selettore calcola le colonne dalla larghezza disponibile per mantenere coerente la virtualizzazione su mobile. Verificati dialoghi a 320/390 px e desktop, senza comandi fisici o creazione di pagine sul banco reale. Impostazioni/profili e pagine dispositivo non sono convertiti da questo gruppo.

## Spiegazione dello stile

Il neumorfismo, chiamato anche soft UI, usa luce e ombra per far apparire i controlli come parti della superficie: alcuni emergono in rilievo, altri sembrano incassati. Fondo ed elementi hanno tonalità vicine; una coppia di ombre, chiara e scura, suggerisce volume. Forme arrotondate e una direzione della luce coerente completano l'effetto. Questa descrizione segue l'[articolo Clay](https://clay.global/blog/neumorphism-ui), aggiornato il 2026-03-05 e consultato il 2026-10-05.

Le reference ricevute mostrano tre varianti: chiara neutra con accento viola, scura grafite con accento verde e chiara lilla con accenti colorati. Per ACA i colori confermati sono quelli della tabella precedente; verde, viola e lilla delle immagini non diventano colori di prodotto.

**Direzione confermata:** due temi, chiaro e scuro, con accento `#ef8231`; `#222222` resta il riferimento scuro. Il primo switch UI-001 guida la qualità del materiale: volume, parti in rilievo, corsa e illuminazione del controllo. Gli altri componenti devono derivare da questo linguaggio, senza diventare una collezione di stili indipendenti. UI-007 aggiunge la reference del feedback luminoso.

**Dettagli ancora da progettare:** colore della base chiara, superfici, ombre, testi e colori semantici per ciascun tema. Tempi, geometrie e colori degli originali non vengono approvati integralmente; il lampeggio infinito Wi-Fi originale è conservato come fonte, mentre il comportamento ACA approvato mantiene stabile lo stato attivo. Modalità di scelta del tema, impostazione iniziale e persistenza saranno definite nella fase UI.

## Microinterazioni richieste

Le microinterazioni sono una priorità del design. Devono accompagnare il gesto e rendere comprensibili richiesta, attività in corso e risultato; non bastano transizioni decorative al passaggio del mouse. Questa sezione descrive comportamenti confermati per la futura UI, non eseguiti dalla raccolta.

### Regolazione della luminosità

- Il gesto sull'icona permette di regolare la luminosità quando il dispositivo e il perimetro funzionale prevedono tale controllo.
- L'anteprima nell'icona varia immediatamente con il gesto: intensità luminosa interna e percentuale visibile. Il valore richiesto deve restare distinguibile da quello confermato da HA.
- Come scelto dall'utente, anche la luce reale cambia durante il gesto, senza attendere soltanto il rilascio. La futura integrazione deve limitare la frequenza degli invii: strategia, frequenza e gestione del valore finale saranno progettate con HA.
- Distinguere valore richiesto, aggiornamento in corso e valore confermato. Un errore o un dispositivo non disponibile non deve apparire come un cambiamento riuscito; dettaglio del recupero e dei timeout da definire nella fase di integrazione.
- Prevedere un'alternativa senza trascinamento, per esempio `+`/`−`, oltre all'operabilità da tastiera. Direzione del gesto, area, sensibilità, passo e limiti saranno concordati nella fase UI.

### Animazione e stati

- Animazioni ricche durante azioni e attese, con effetti coerenti di rilievo, movimento e illuminazione.
- Stato attivo stabile, senza lampeggio continuo. Pulsazioni temporanee possono comunicare connessione o aggiornamento in corso; non devono trasformarsi in animazione permanente di ogni dispositivo acceso.
- Prevedere movimento ridotto, conservando informazione e feedback di stato. Effetti e tempi del catalogo sono riferimenti da adattare, non durate obbligatorie del prodotto.

Riferimenti primari consultati il 2026-10-05: [WCAG 2.2, alternativa al trascinamento](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html), criterio 2.5.7 livello AA, e [animazioni da interazione](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html), criterio 2.3.3 livello AAA, sulle animazioni di movimento non essenziali. Sono riferimenti progettuali; nessuna conformità è attestata.

## Uso proposto nell'app

Queste sono proposte progettuali da precisare, non componenti implementati o un layout definitivo.

- **Superfici:** rilievo contenuto per gruppi di controlli e dispositivi; dati, grafici e messaggi devono restare facilmente leggibili. Evitare di moltiplicare rilievi e contenitori senza una funzione nella gerarchia.
- **Colori:** arancione per azioni principali e selezione, con un ruolo coerente tra schermate. Colori di successo, avviso ed errore restano da definire; il colore non è l'unica informazione sullo stato.
- **Testi e icone:** caratteri leggibili e peso sufficiente; proposta di testi chiari sulle superfici scure, testi scuri sulla base chiara e `#222222` sui pulsanti arancioni. Font, dimensioni e set di icone restano aperti.
- **Interazione:** la pressione può modificare il rilievo; le microinterazioni richieste seguono la sezione precedente. Lo stato del dispositivo deve arrivare dal sistema; l'aspetto premuto non conferma l'esecuzione di un comando.
- **Touch e tastiera:** comandi identificabili, aree di tocco da dimensionare sul client scelto e focus visibile. Il funzionamento non deve dipendere dal passaggio del mouse.
- **Asset:** valutare disponibilità locale di font, icone e altri asset per sostenere l'obiettivo offline. La disponibilità non è ancora verificata.

## Componenti e stati da progettare

| Elemento candidato | Aspetto da definire | Feedback da distinguere |
|---|---|---|
| Card dispositivo | Nome, icona, stato e comando autorizzato | Dato aggiornato, comando in corso, errore o dispositivo non disponibile. |
| Pulsante | Rilievo, etichetta e gerarchia dell'azione | Normale, focus, pressione, attesa, disabilitazione. |
| Interruttore | Indicazione leggibile di accensione e spegnimento | Stato reale separato dalla richiesta di cambio. |
| Regolazione | Valore, unità e interazione appropriata alla funzione prevista | Valore confermato, aggiornamento in corso e limite applicabile. |
| Messaggio di stato | Testo e simbolo coerenti | Informazione, errore, indisponibilità e riconnessione. |

Sono candidati del futuro kit di componenti: schermate, comandi e copertura devono essere concordati nel perimetro funzionale. Forme, raggi, spaziature, ombre e tempi di transizione non hanno ancora valori approvati. Le viste per ruoli avanzati e funzioni future non entrano automaticamente nella fase 1.

## Leggibilità e controlli previsti

Riferimenti primari consultati il 2026-10-05:

- [WCAG 2.2, contrasto del testo](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html): almeno 4,5:1 per testo ordinario e 3:1 per testo grande, con le eccezioni del criterio.
- [WCAG 2.2, contrasto non testuale](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html): le informazioni visive necessarie a identificare controlli e stati devono essere distinguibili secondo il criterio 1.4.11. Le ombre decorative non sostituiscono queste informazioni.
- [WCAG 2.2, uso del colore](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html): colore accompagnato da altri segnali visivi quando comunica significato.

Calcoli già eseguiti su coppie sRGB opache, riportati nel report del pilota:

| Coppia | Contrasto calcolato | Risultato limitato alla soglia del testo ordinario |
|---|---|---|
| `#ef8231` e `#222222` | Circa 5,99:1 | Supera 4,5:1. |
| `#ffffff` e `#ef8231` | Circa 2,66:1 | Non raggiunge 4,5:1; evitare testo bianco ordinario su arancione. |
| `#ffffff` e `#222222` | Circa 15,91:1 | Supera 4,5:1. |

Questi risultati non provano il contrasto delle reference, dei componenti futuri, di trasparenze o degli stati. Non costituiscono un collaudo del frontend o una conformità complessiva.

**Controlli da pianificare nel futuro incarico UI:** entrambi i temi e l'accento, contrasto delle varianti effettive, chiarezza degli stati, focus/touch, alternativa senza trascinamento, movimento ridotto, anteprima dell'icona e percentuale durante la regolazione, aggiornamento della luce con frequenza limitata e conferma HA, errore/indisponibilità, leggibilità sul client e nell'illuminazione dell'ufficio, adattamento alle dimensioni concordate e conservazione dei comandi previsti. Sono Non eseguiti; evidenze future in [verification.md](../verification.md) e report pertinenti.

## Pannelli e caricamenti implementati

Richiesta umana del 2026-10-05, [REP-20261005-010](../reports/REP-20261005-010-pannelli-skeleton.md): apertura stile macOS con scala iniziale 0,96, dissolvenza, piccolo superamento 1,008 e assestamento a 1 in 360 ms; chiusura con scala 0,97 e opacità zero in 180 ms. Sono scelte esecutive entro la direzione spring richiesta. Il backdrop sfuma separatamente. Copertura: 31 slot dell'orchestrazione, inclusi dialoghi dispositivi e pannelli Aspetto/Disposizione/Intestazione; il menu impostazioni conserva la propria transizione precedente.

Skeleton condiviso in TypeScript per liste, riepiloghi compatti, grafici e caricamento lazy dei pannelli, con shimmer delle forme decorative e un solo stato annunciato in italiano. Sono applicati a stanze/dispositivi dell'area, profili, attività, calendario, cronologia sensori, consumi e temperature. I selettori multimediali avevano già placeholder: aggiunta la variante senza movimento. Gli indicatori di scrittura, aggiornamento firmware e dispositivo in azione restano distinti dai fetch di contenuti.

Le liste già disponibili restano visibili durante il refresh; stanze e profili riservano almeno 216 px anche a risultato vuoto o errore. Grafici placeholder: sensore 350 px, consumi 320 px (contenitore minimo 352 px con padding anche per le barre da 220 px), temperature 140 px, corrispondenti agli ingombri dei rispettivi contenuti. Il numero effettivo di elementi può estendere le liste: non è dichiarato CLS nullo in ogni schermata. Il fallback lazy è un telaio generico, non una replica esatta di ogni pannello legacy.

Con movimento ridotto le animazioni di pannello/backdrop e lo shimmer sono disattivati; l'uscita viene completata senza attesa animata. Durante l'uscita il contenuto è inert e aria-hidden; focus e scroll sono preservati anche nel passaggio tra dialoghi. Le prove e i loro limiti sono in [verification.md](../verification.md).

## Questioni aperte e continuità

Logo, font, palette completa, scala delle spaziature, geometria e ombre, schermate, client e librerie restano aperti ([ISSUE-012](../project-status.md#issue-012)). Nessuna nuova dipendenza è adottata dalla sola scelta dello stile.

Per riprendere il design: leggere incarico attivo, questo documento, requisiti pertinenti e stato; rispettare stile e colori confermati; registrare ogni proposta distinguendola dalle indicazioni umane. Quando una proposta viene approvata, riportare fonte e data. Se cambia un comportamento, aggiornare anche il modulo funzionalità; se cambia soltanto la presentazione, aggiornare il design e le verifiche pertinenti.
