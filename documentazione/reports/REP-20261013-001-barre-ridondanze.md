# REP-20261013-001 — Barra in alto e barra in basso: si possono togliere?

| Campo | Valore |
|---|---|
| Stato | Completato (verifica in sola lettura); decisioni all'utente |
| Data | 2026-10-12/13, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`), workflow `wf_41066dcd-ed3`: due censimenti e un giudizio critico |
| Commit di partenza | `7298d4df0d33bc92123517776d9ebc7c12ecefa6` più il working tree non committato |
| Richiesta di riferimento | Chat del 2026-10-12. |
| Autorizzazione | Solo la verifica. Nessuna modifica: le proposte richiedono l'assenso dell'utente e, per la struttura, una decisione registrata. |

## Richiesta

> «la topbar e la bottom bar attuale, controllando le sue funzionalità, possono essere rimosse? Se ci sta una ripetizione di funzionalità secondo me sì»

## Esito

**Barra in basso: no, non si può togliere.** Quasi ogni sua funzione è l'unico modo per fare qualcosa:
- **Indicatore delle pagine:** unico cambio di pagina da tastiera o lettore di schermo; senza, probabilmente si viola WCAG 2.1.1.
- **Nome della pagina:** unico nome visibile.
- **«Fine»:** unica uscita dalla modifica al tocco. Acasystem non gestisce il tasto Indietro, ed Esc vale solo da tastiera.
- **Cestino «Rimuovi»:** unica rimozione al tocco.
- **«Annulla»:** unico annullamento degli spostamenti.
- **Gestione delle pagine:** tutta lì (elimina, nuova, principale, rinomina, nascondi).

Gli altri percorsi sono gesti nascosti (pressione lunga, scorrimento) o tasti fisici, e per la persona di 65 anni non sono equivalenti. L'unico doppione vero è **«Conferma»** nella barra del widget: non salva nulla e crea l'uscita in due tocchi «Conferma» e poi «Fine» (G08).

**Barra in alto: solo in parte.** Si può togliere la striscia con la sua fascia di 64 px, ma le sue funzioni non sono ripetizioni e vanno spostate:
- **Ingranaggio «Sistema»:** è l'unico accesso a Sistema, e quindi anche allo sblocco della disposizione bloccata. È il rischio più alto.
- **Matita «Modifica»:** unico ingresso visibile e da tastiera.
- **Stato della connessione:** unico segnale positivo e delle fasi di riconnessione; l'avviso di errore compare solo dopo 5-15 s.
- **Ora:** unica su tutte le pagine.
- **Chip:**
  - persone: l'unico posto dove si vede chi è in casa;
  - allarme: un tema di sicurezza;
  - gruppi e batterie;
  - multimedia: questo è un vero doppione del widget Lettore.

**Spazio guadagnato:**
- **Tablet a schermo intero (kiosk, product.md:157-158):** la cella passa da circa 75 a circa 88 px, cioè +17 %.
- **Chrome sul Lenovo e sui telefoni:** le celle sono limitate dalla larghezza, quindi il guadagno è quasi nullo.

È una stima con le formule del codice, non una misura.

## Opzioni proposte, non applicate

- **A. Una sola barra in basso.**
  - In vista normale ospita: a sinistra l'ora grande e la connessione; al centro l'indicatore; a destra «Modifica» e «Sistema» con testo e un pulsante «Casa» con persone, gruppi e batterie.
  - «Allarme scattato» diventa un avviso visibile in tutti gli stati, come quello della connessione.
  - Richiede di rivedere ADR-0007, ADR-0012 (D1) e design.md:58 e 63.
- **B. Tenere entrambe le barre e togliere i doppioni interni.**
  - «Conferma» viene sostituito da «Fine».
  - Testo su «Modifica» e «Sistema».
  - Ora più grande.
  - Rischio minimo e nessun guadagno di spazio.
- **C. Barre a scomparsa.** Il guadagno è massimo, ma i comandi sono nascosti e i widget cambiano misura entrando in modifica. Non è consigliata per la persona di 65 anni.

**Raccomandazione del giudizio:**
1. Applicare B subito, se l'utente approva.
2. Misurare il viewport reale del Lenovo in kiosk.
3. Decidere dove collocare persone, allarme e Sistema.
4. Solo dopo, con una decisione registrata, valutare A.

## Domande all'utente

1. Il tablet a muro sarà in kiosk a schermo intero (Fully Kiosk o APK) oppure in Chrome?
2. In kiosk la barra di Android (ora, Wi-Fi) resta visibile?
3. Chi deve poter aprire Sistema: la persona o solo l'installatore? Deve restare raggiungibile con la disposizione bloccata.
4. Il riepilogo di chi è in casa serve? Se sì, dove?
5. «Allarme scattato» deve essere visibile su ogni pagina?
6. Approvi di sostituire «Conferma» con «Fine» nella barra del widget?
7. Approvi il testo su «Modifica» e «Sistema»?
8. Approvi di rivedere le decisioni sulle barre se si sceglie A?
9. Preferisci un'ora grande su ogni pagina, oppure basta l'orologio della copertina?

## Risposte dell'utente (2026-10-13)

> «L'app deve essere installabile come app sul play store in modo tale da soddisfarre il requisito di poter impostare le automazioni anche in remoto fuori casa oltre che da tablet a muro, poi per le automazioni ci pensiamo più avanti ma dobbiamo predisporre l'app»
>
> Va bene «Fine» al posto di «Conferma»? «siì»
>
> Sistema: «il ruolo dell'installatore o sistemista è quello di scaricare l'app sul tablet e configurarla per il cliente»
>
> Chi è in casa: «come widget, pensavamo di connetterlo tramite riconoscimento alle schede di rete dei cellulari degli utenti, che individuati i dispositivi (magari riconoscendone il modello) ti permette di mettere un nome utente e un immagine di profilo»

**Cosa se ne ricava:**
- **App installabile dal Play Store.** Gira a schermo intero, sul tablet a muro e fuori casa, quindi il guadagno di spazio togliendo la barra in alto è reale e l'opzione A diventa sensata.
  - Servono anche l'accesso remoto fuori casa e, più avanti, le automazioni. È un requisito e una decisione di architettura (impacchettamento dell'app, accesso remoto sicuro a HA) da preparare con un ADR. Non è iniziato.
- **Sistema è per l'installatore,** che scarica e configura l'app per il cliente. Può stare meno in vista per la persona, ma deve restare raggiungibile, anche con la disposizione bloccata. Il PIN dell'installatore è ISSUE-023.
- **Chi è in casa diventa un widget,** con il riconoscimento dei telefoni sulla rete (dispositivi ed eventualmente modello), nome e immagine di profilo per ogni persona. È una funzione nuova, non iniziata.

## Applicato

- **«Fine» al posto di «Conferma» nella barra del widget selezionato** (approvato dall'utente).
  - Un solo tocco tiene le modifiche ed esce dalla modifica, mentre prima servivano «Conferma» e poi «Fine» (G08).
  - Tab dalla barra porta ancora al widget successivo; per deselezionare restando in modifica si tocca lo spazio vuoto.
  - File toccati:
    - `components/system/edit/WidgetActionBar.tsx`: `onDone`, `data-widget-action="done"`;
    - `edit.css`;
    - `templates/launcher/LauncherScreen.tsx`: `onDone`, cioè deseleziona e chiama `finishEditing`;
    - i test di `LauncherScreen`, `LauncherGestures`, `PolishCornice` e `PageOverviewBarRename`.
  - Verifica: typecheck, lint, tipografia (429 file) e colori (303) a 0; 4 file di test, 165 test verdi; suite completa 143 file, 1727/1727 (`--maxWorkers=4`). Sul banco `aca-system:0.9.2` dal 2026-10-13 alle 17:45; dettagli in [infrastructure.md](../infrastructure.md).
- **Non applicato, in attesa di decisione:** l'opzione A (una sola barra in basso). Richiede la revisione registrata di ADR-0007, ADR-0012 e design.md e un piano su dove collocare ora, connessione, Sistema, persone e allarme.

## Evidenze

- **Censimenti con file:riga:** journal del workflow `wf_41066dcd-ed3`, nello scratchpad della sessione.
- **Giudizio critico:** verifiche dirette su `LauncherScreen.tsx`, `StatusBar.tsx`, `useLongPress.ts`, `Pager.tsx`, `footerBand.ts`, `appShell.css`, `deviceClass.ts`.
- **Limiti:**
  - solo lettura del codice: niente browser e niente TalkBack;
  - il confronto con i launcher Android è conoscenza generale, da verificare su fonti primarie prima di citarlo in un ADR.

## Annotazione del 2026-10-14

Il report resta chiuso com'era il 2026-10-13. L'opzione A («Non applicato, in attesa di decisione», sopra) è stata approvata dall'utente il 2026-10-13 e pianificata in [REP-20261013-002](REP-20261013-002-piano-barra-unica.md), con [ADR-0013](../decisions/ADR-0013-barra-unica.md) accettata. Le tappe 1-6 sono nel codice dal 2026-10-14 (barra di stato nella fascia in basso, Sistema a sinistra, «Modifica» nell'angolo di «Fine»); il banco resta `aca-system:0.9.2`. Le risposte dell'utente riportate qui (Play Store a schermo intero, Sistema per l'installatore, chi è in casa come widget) sono le premesse di quella decisione. Il confronto con i launcher Android resta conoscenza generale non verificata su fonti primarie: ADR-0013 non lo cita come evidenza.
