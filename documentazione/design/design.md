# ACA SYSTEM — Specifica di design

Aggiornato: 2026-10-05. Questo documento è la fonte delle scelte visive e delle proposte UI/UX. Requisiti, ruoli e comportamento dell'app sono nel [modulo funzionalità](../funzionalita/README.md); stato effettivo e incarichi in [project-status.md](../project-status.md). Nessuna interfaccia è implementata o collaudata.

## Scopo e responsabilità

Descrivere come presentare le funzionalità autorizzate: stile, colori, gerarchia, componenti e feedback. Il design non aggiunge funzionalità, permessi o automazioni. Una schermata proposta non autorizza lo sviluppo del comportamento rappresentato.

La fase 1 minima è Home Assistant personalizzato graficamente, con Tunet come punto di partenza React e pilota in ufficio. Il suo perimetro è in [pilot-scope.md](../funzionalita/pilot-scope.md). L'analisi tecnica di Tunet deve precedere la scelta di componenti e librerie da integrare.

## Indicazioni umane confermate

| Elemento | Indicazione | Fonte / stato |
|---|---|---|
| Stile | Neumorphism, o neumorfismo | Utente, 2026-10-05: «Neumorphism si chiama lo stile». |
| Colore principale | `#222222` | Utente, 2026-10-05: colore main dell'app. |
| Colore secondario | Arancione `#ef8231` | Utente, 2026-10-05: secondo colore. |
| Reference | [Articolo Clay](https://clay.global/blog/neumorphism-ui) e tre immagini fornite in chat | Ispirazione estetica; non schermate ACA approvate. |
| Logo | Non ancora disponibile | Da definire; nessun logo generato o adottato. |

La separazione in moduli e la creazione di questo file sono richieste dall'utente nel presente [incarico](../reports/REP-20261005-002-moduli-documentali-design.md). Le indicazioni precedenti e i calcoli sui colori sono conservati nell'[annotazione del report del pilota](../reports/REP-20261005-001-direzione-pilota.md#annotazione-del-2026-10-05--risposte-successive-e-stile-grafico).

## Spiegazione dello stile

Il neumorfismo, chiamato anche soft UI, usa luce e ombra per far apparire i controlli come parti della superficie: alcuni emergono in rilievo, altri sembrano incassati. Fondo ed elementi hanno tonalità vicine; una coppia di ombre, chiara e scura, suggerisce volume. Forme arrotondate e una direzione della luce coerente completano l'effetto. Questa descrizione segue l'[articolo Clay](https://clay.global/blog/neumorphism-ui), aggiornato il 2026-03-05 e consultato il 2026-10-05.

Le reference ricevute mostrano tre varianti: chiara neutra con accento viola, scura grafite con accento verde e chiara lilla con accenti colorati. Per ACA i colori confermati sono quelli della tabella precedente; verde, viola e lilla delle immagini non diventano colori di prodotto.

**Interpretazione proposta:** base scura `#222222`, superfici vicine al fondo e accenti arancioni `#ef8231`. La palette confermata orienta una versione scura; eventuali altri temi, colori delle ombre e sfumature delle superfici richiedono definizione. Lo stile viene mantenuto senza lasciare che testi e controlli si confondano con lo sfondo.

## Uso proposto nell'app

Queste sono proposte progettuali da precisare, non componenti implementati o un layout definitivo.

- **Superfici:** rilievo contenuto per gruppi di controlli e dispositivi; dati, grafici e messaggi devono restare facilmente leggibili. Evitare di moltiplicare rilievi e contenitori senza una funzione nella gerarchia.
- **Colori:** arancione per azioni principali e selezione, con un ruolo coerente tra schermate. Colori di successo, avviso ed errore restano da definire; il colore non è l'unica informazione sullo stato.
- **Testi e icone:** caratteri leggibili e peso sufficiente; proposta di testi chiari sulle superfici scure e `#222222` sui pulsanti arancioni. Font, dimensioni e set di icone restano aperti.
- **Interazione:** la pressione può modificare il rilievo, con feedback breve. Lo stato del dispositivo deve arrivare dal sistema; l'aspetto premuto non conferma l'esecuzione di un comando.
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

**Controlli da pianificare nel futuro incarico UI:** contrasto delle varianti effettive, chiarezza degli stati, focus/touch, leggibilità sul client e nell'illuminazione dell'ufficio, adattamento alle dimensioni concordate e conservazione dei comandi previsti. Sono Non eseguiti; evidenze future in [verification.md](../verification.md) e report pertinenti.

## Questioni aperte e continuità

Logo, font, palette completa, scala delle spaziature, geometria e ombre, schermate, client e librerie restano aperti ([ISSUE-012](../project-status.md#issue-012)). Nessuna nuova dipendenza è adottata dalla sola scelta dello stile.

Per riprendere il design: leggere incarico attivo, questo documento, requisiti pertinenti e stato; rispettare stile e colori confermati; registrare ogni proposta distinguendola dalle indicazioni umane. Quando una proposta viene approvata, riportare fonte e data. Se cambia un comportamento, aggiornare anche il modulo funzionalità; se cambia soltanto la presentazione, aggiornare il design e le verifiche pertinenti.
