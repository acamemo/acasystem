# REP-20261009-001 — Test UX del nuovo frontend con la persona di 65 anni

| Campo | Valore |
|---|---|
| Stato | Completato; prova sul tablet fisico a cura dell'utente |
| Data | 2026-10-09, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Commit di partenza | `7298d4df0d33bc92123517776d9ebc7c12ecefa6`, più il working tree non committato di REP-20261007-008…038 e REP-20261008-001. Banco su `aca-system:0.6` (`sha256:cf27d8a…780c`). |
| Richiesta di riferimento | Chat del 2026-10-08. |
| Autorizzazione | Test in sola lettura sul codice. Le proposte di correzione non sono autorizzate e restano proposte. |

## Richiesta

Chat del 2026-10-08:
- l'agente fa da tester del nuovo frontend: «la parte di testing che mi interessa è la user experience, sopratutto sulle nuove funzionalità che vanno ad imitare android e la personalizzazione UI»;
- «ho bisogno che ti immedesimi in un utente medio che userà questa app: un 65 enne […], vorrei che mi dicessi come si troverebbe con questa ui»;
- il 2026-10-09: «continua», dopo la consegna di REP-20261008-001.

## Obiettivo e perimetro

- **Prova della 0.6:** esperienza d'uso della versione 0.6.
  - Funzioni «come Android»: launcher a pagine, modifica, pressione lunga, pallini, cestino, doppio tocco, editor delle pagine, colonne, pile, vassoio.
  - Personalizzazione: tema, accento, sfondo, aspetto dei widget, griglia.
- **Persona:** utente di 65 anni poco pratico di tecnologia. Ci si immedesima con attività concrete.
- **Strumenti e ambienti:**
  - Playwright su `launcher.html` con il tema Kit 2 applicato nella pagina di prova;
  - `#/ui-kit`;
  - browser integrato sull'app reale con la sessione dell'utente: solo osservazione e flussi reversibili, nessun comando a dispositivi reali;
  - lettura del codice.
- **Viewport:** Lenovo Tab M11 in Chrome (≈1024×472 CSS, DPR 1,875) e telefono (390×844).
- **Esclusi:**
  - correzioni del codice;
  - nuove dipendenze;
  - modifiche al banco;
  - comandi a dispositivi;
  - prova sul tablet fisico, che spetta all'utente.

## Criteri di completamento

- Racconto della persona attività per attività: cosa capisce, dove si blocca, cosa può rompere.
- Rilievi con gravità, evidenza riproducibile (passi, screenshot, misure, file:riga) e proposta di correzione. I rilievi alti e medi vanno verificati in modo indipendente.
- Misure di accessibilità rilevanti per l'età:
  - dimensioni e pesi dei testi;
  - bersagli;
  - contrasti in ogni tema, accento e sfondo;
  - tempi;
  - gesti senza alternativa.
- Esito per i punti aperti di REP-20261008-001 dal punto di vista della persona: tocco su cella libera, una riga con poche colonne, blocco, modalità del tablet.
- Registro dei limiti: anteprima con dati finti, nessun tocco reale né TalkBack.

## Avanzamento e modifiche

- **2026-10-09 00:00.** Docker Desktop era chiuso e il banco irraggiungibile. Dopo il riavvio, HA montava una cartella vuota e rispondeva `onboarding_required`; `docker restart homeassistant` ha ripristinato la configurazione vera, senza perdita di dati.
- **2026-10-09 00:20.** Docker si è chiuso di nuovo con la sessione: l'agente l'aveva avviato dentro la sessione. L'ho rilanciato tramite `explorer.exe` e HA è stato riavviato allo stesso modo. Il banco era ripartito senza porte per un nuovo cambio di rete del PC: binding portato a `192.168.1.11:3002`. Dettagli in `infrastructure.md`.
- **2026-10-09 00:24-01:37.** Workflow di test con quattro tester in parallelo, ciascuno con il proprio server Vite su una porta dedicata (5191-5194), poi fermato. Poi quattro verifiche incrociate, in cui ogni tester ricontrolla i rilievi di un altro, e il racconto.
- **2026-10-09 00:25-00:30.** Giro dell'agente principale sull'app reale del banco, con la sessione HA dell'utente: sezione «Osservazioni sull'app reale».
- **Esito della verifica incrociata:** 40 rilievi alti e medi ricontrollati.
  - 34 confermati, 6 confermati in parte, 0 non riprodotti.
  - Gravità dopo la verifica: 6 alte, 28 medie, 6 basse.
  - Altri rilievi bassi non sono stati ricontrollati: nella tabella sono marcati «n.v.».
- Nessun file del repository modificato dai tester. Script, misure e screenshot sono nella cartella temporanea della sessione (`scratchpad/ux/`), non versionata.

## Risultati: resoconto del test

**Parole usate.** *Widget*: un riquadro della schermata, per esempio la luce o la temperatura. *Modalità modifica*: lo stato in cui si spostano, si ingrandiscono o si tolgono i riquadri. *Copertina*: la prima pagina, con orologio, data e meteo. *Pila*: più riquadri messi uno sopra l'altro nello stesso posto, che si sfogliano col dito. *Colonne* o *griglia*: le caselle in cui stanno i riquadri. *Contrasto*: quanto un testo si stacca dal fondo; 4,5:1 è il minimo per il testo normale secondo le WCAG 2.2, le linee guida W3C per l'accessibilità (Raccomandazione dell'ottobre 2023). *px*: pixel dello schermo; sul Lenovo 1 px vale circa 0,23 mm.

---

## 1. In breve

Giuseppe riesce a fare le cose di tutti i giorni: accendere una luce, alzare il riscaldamento di mezzo grado alla volta, cambiare pagina. Ci riesce però solo se tocca in fretta. Lui preme a lungo, e se il dito resta fermo un secondo o più l'interruttore della luce e il «+» del termostato non fanno nulla. Al loro posto si apre la modalità modifica: spariscono l'ora e il pulsante «Fine», e nessuna scritta visibile gli dice come uscire.

L'ora sulla pagina iniziale è piccola (16 px), i testi più piccoli (13,3 px) senza occhiali non li legge, e il meteo non si è potuto provare.

Quando prova a «sistemare le schermate», come gli dice il nipote, può fare danni senza accorgersene:
- un tocco su una freccia cambia la pagina da cui parte il tablet;
- un riquadro tolto si recupera solo entro 5 secondi;
- una pagina speciale si cancella con un tocco;
- il blocco della disposizione si aggira dai «+».

Lo sfondo scelto in «Aspetto» non compare mai.

**Verdetto:** la 0.6 non è pronta per Giuseppe da solo. Due correzioni piccole renderebbero l'uso quotidiano quasi sicuro: far funzionare i comandi anche con la pressione lenta e rendere davvero completo il blocco della disposizione.

---

## 2. Una giornata di Giuseppe

Il tablet è in cucina, aperto in Chrome: lo spazio utile è di 1024×472 px. Alcune prove sono state ripetute a schermo intero (1024×640) e sul telefono, in verticale (390×844) e in orizzontale (844×390).

**T1. Guardare l'ora e il meteo.**
- **Tablet:** Giuseppe prende il tablet e trova la pagina «Casa», non la copertina. L'ora c'è solo nella barra in alto: «00:08», 16 px, in un riquadro di 46×20 px. Accanto ci sono scritte da 13,3 px («A casa», «Lavoro») che senza occhiali non legge. Scorrendo a destra trova la copertina: orologio a lancette, ora digitale da 32,6 px a tratto sottile (peso 300), «Venerdì 9».
- **Meteo:** al posto del meteo c'è un riquadro vuoto di 272×272 px, perché l'anteprima non ha dati meteo. Non è un difetto provato. Il codice però mostrerebbe un buco senza spiegazione quando il meteo manca, e userebbe come luogo il nome tecnico di Home Assistant (probabilmente «Forecast…», dedotto e non letto).
- **Telefono:** succede lo stesso, con l'ora della copertina a 20,6 px.
- **Esito:** riuscita con fatica sul tablet e sul telefono. Il meteo non è verificato.

**T2. Accendere una luce e abbassarla.**
- **Tablet:** le luci sono su «Casa 2», a uno scorrimento. Un tocco di 0,3 s sull'interruttore «Cucina» (78×42 px) scrive subito «acceso» e dopo 0,67 s si accende anche la lampadina disegnata.
- **Luminosità:** la luce di prova non è regolabile, quindi nel riquadro e nei dettagli manca il comando. È un limite dell'anteprima: con una luce vera il prodotto mostra la percentuale, il cursore e i pulsanti − e +. Nella pagina di prova dei comandi, dopo il primo tocco su «−» compare «In attesa di conferma…» e il pulsante scende di 19 px.
- **Telefono:** il cursore funziona (arriva al 39 %). Poi Giuseppe vuole spegnere e tocca la lampadina con un tremore di 8 px: la luce non si spegne, la luminosità scende al 34 %.
- **Pressione lenta:** Giuseppe preme a lungo. Con 1,2 s sull'interruttore la luce resta spenta: il riquadro si solleva, compaiono pallini viola e la barra «Annulla · Conferma», e la barra in alto sparisce. Se poi tocca l'interruttore di «Bagno», ottiene solo di selezionare quel riquadro.
- **Esito:** riuscita con fatica sul tablet e sul telefono con un tocco breve. Con la pressione lenta (1 s o più) fallisce: riprodotto e verificato.

**T3. Leggere la temperatura e alzarla di un grado.**
- **Tablet:** «Clima» è la quinta pagina su sei, a tre scorrimenti da «Casa». Il riquadro mostra «20,5 °C» (33 px, tratto sottile) e «21 °C Obiettivo», con «Obiettivo» a 13,3 px. Su «Casa» c'è anche «Temperatura soggiorno 21.5», un dato finto: Giuseppe non sa quale numero sia «la temperatura di casa».
- **Il «+»:** misura 44×44 px e aggiunge mezzo grado. Due tocchi, anche sbagliati di 10-12 px, portano a 22 °C. Lui però crede che un tocco valga un grado, e la scritta «Aumenta di mezzo grado» la sente solo il lettore di schermo.
- **Pressione lenta:** 1,2 s sul «+» non cambiano nulla e aprono la modalità modifica.
- **Tema scuro:** dal codice, la temperatura richiesta in attesa di conferma sarebbe arancione su nero, con contrasto di circa 1,8:1.
- **Esito:** riuscita con fatica su entrambi. Con la pressione lenta fallisce.

**T4. Cambiare pagina e tornare alla principale.**
- Gli scorrimenti lenti cambiano pagina in modo affidabile, e uno scorrimento corto non la cambia. Toccando il secondo pallino in basso (bersaglio di 44 px) Giuseppe torna su «Casa», sia sul tablet sia sul telefono.
- Il nome della pagina sotto i pallini è a 13,3 px.
- In orizzontale c'è una pagina in più, «Casa 2», e Giuseppe può pensare che la casa sia «doppia».
- **Esito:** riuscita su entrambi.

**T5. Tenere il dito fermo 1,2 s su un riquadro «per pensare».**
- **Cosa succede:** dopo circa 1,1 s il riquadro si solleva. Al rilascio spariscono ora e pallini delle pagine. Compaiono otto pallini viola, caselle con il simbolo ⇆ e una barra con un cestino senza scritta, «Annulla» grigio e «Conferma». Sul telefono, mentre il dito è ancora giù, appare in basso una grande pillola rossa «Rimuovi».
- **I tentativi di uscire:** Giuseppe tocca il riquadro, poi il vuoto in alto, poi il vuoto in basso, e non cambia niente. Esce solo toccando «Conferma» e poi «Fine», in alto a destra: due tocchi in punti lontani. La spiegazione esiste solo per il lettore di schermo.
- **Cosa vale davvero (verifica):** toccare le fessure strette tra le caselle deselezionerebbe il riquadro. Le zone vuote grandi, invece, sono caselle «Sposta qui»: toccandole il riquadro si sposta.
- **Tasto Indietro:** sul telefono esce dall'app.
- **Su una casella vuota:** 1,2 s aprono l'editor delle pagine, con «Elimina», «Nuova», «Principale», «Nascondi». Con circa 2,2 s di pressione, il rilascio richiude l'editor appena aperto (rilievo nuovo emerso in verifica).
- **Esito:** riuscita con fatica su entrambi.

**T6. Due tocchi per sbaglio.**
- **Tablet:** con due tocchi lenti si aprono i dettagli della luce o del clima, che sono innocui. Si chiudono con la X (44×44) o toccando fuori.
- **Telefono:** l'esito dipende dalla velocità. Con 180 ms tra i tocchi si apre «Impostazioni del widget», piena di termini tecnici, con il cursore già nel campo «Nome»: sul telefono vero potrebbe aprirsi la tastiera. Con 250 ms o più si aprono i dettagli.
- **Due tocchi rapidi da tremore:** aprono le impostazioni, e lì un solo tocco su «Nascondi il widget» fa sparire il riquadro.
- **Riquadro che lampeggia:** su alcuni riquadri il foglio si apre e si richiude in un attimo. Succede anche sul clima vero.
- **Esito:** riuscita sul tablet, riuscita con fatica sul telefono.

**T7. Spostare un riquadro nell'angolo in alto a sinistra.**
- **Tablet:** Giuseppe tiene premuto, trascina piano e appoggia il dito sull'angolo. La copia dice «Colonna 1, riga 1», ma dopo 0,45 s la pagina gira da sola sulla copertina. Lì la copia diventa rossa: «Non c'è spazio qui». Al rilascio il riquadro torna a posto, ma Giuseppe resta sulla copertina, in modifica, con una barra «Rimuovi Temperatura soggiorno» di un riquadro che non vede. Con il dito al centro della casella lo spostamento riesce.
- **A schermo intero:** succede lo stesso con il dito a 60 px dal bordo.
- **Pila involontaria:** se lascia il dito al centro di un altro riquadro nasce una pila, e il suo riquadro sparisce alla vista.
- **Telefono:** le zone che girano pagina occupano il 37 % della larghezza, e lo spostamento riesce solo guardando l'angolo della copia invece del dito. Quando riesce, il riquadro «Benvenuto» si rimpicciolisce e il messaggio lo sente solo il lettore di schermo.
- **Esito:** riuscita con fatica sul tablet, fallita sul telefono.

**T8. Ingrandire un riquadro.**
- **Tablet:** i pallini sono di 16 px. Se il dito parte 20-25 px dentro il bordo, il riquadro si sposta invece di ingrandirsi; «Annulla» rimedia. Le impostazioni si aprono solo con due tocchi veloci e mostrano in alto un nome tecnico («Widget: preview_value_temperatura»).
- **Telefono:** la fascia di presa è alta 48 px, e anche una mira imprecisa ingrandisce.
- **Esito:** riuscita con fatica sul tablet, riuscita sul telefono.

**T9. Togliere un riquadro per sbaglio e rimetterlo.**
- **Tablet:** il cestino non ha scritta e toglie il riquadro subito. Compare «… rimosso · Annulla»: funziona entro circa 3-5 s, poi sparisce. Per rimettere il riquadro bisogna sapere che la temperatura sta sotto «Sensore o entità», in un elenco di 25 tipi.
- **Telefono:** basta una scivolata del dito di circa 120 px verso il basso per far cadere il riquadro sulla pillola «Rimuovi». Giuseppe legge piano, e a 6,5 s l'Annulla non c'è più. Il titolo del vassoio è tagliato («Trascina un wi…») e cercando «Consumo» non trova nulla.
- **Esito:** riuscita con fatica sul tablet (solo se è veloce), fallita sul telefono.

**T10. Rinominare «Casa» in «Cucina».**
- Il percorso: la matita senza scritta, poi «Pagine», poi «Casa ✎». Il campo ha il testo già selezionato; Giuseppe scrive e preme Invio, e compare «Nome cambiato: Cucina.».
- Il campo è alto solo 19 px. Nelle miniature i nomi sono spezzati («Cu-cina»). La tastiera di Android non è stata provata.
- **Esito:** riuscita sul tablet, riuscita con fatica sul telefono.

**T11. Avere quadrati più grandi (meno colonne).**
- **Tablet:** due «−» portano la pagina a una sola riga (6×1). I quadrati crescono da 112 a 153 px, ma i riquadri mostrano meno. «Consumo casa» finisce su una pagina nuova senza che nulla lo dica (le pagine diventano 7). «Annulla» torna indietro di un solo passo. Con due «+» si torna a 8×2 senza perdere nulla.
- **Telefono:** Giuseppe scambia le frecce «← Casa ✎ →» per frecce che scorrono le pagine. Tocca «→»: «Casa» viene spostata dopo «Luci», e «Luci» diventa la pagina principale, quella da cui parte il tablet. Non compare nessun Annulla. Il «−» seguente riduce le colonne di «Luci». Anche dopo aver ricaricato, l'app parte da «Luci».
- **Esito:** riuscita con fatica sul tablet, fallita sul telefono.

**T12. Bloccare tutto.**
- Il percorso vero (ingranaggio → Sistema → Schermata Home → «Blocca la disposizione») non è provabile nell'anteprima. Il blocco è stato quindi simulato.
- **Cosa protegge:** la pressione lunga mostra un avviso chiaro e stabile: «Disposizione bloccata: sbloccala in Sistema → Schermata Home.».
- **Cosa non protegge:** le caselle «+» restano attive, e con tre tocchi si aggiunge un riquadro, che poi non si toglie senza sbloccare. La matita sembra attiva.
- **Esito:** non provata sul tablet (l'attivazione); riuscita con fatica, in simulazione, sul telefono.

| | Attività | Tablet | Telefono |
|---|---|---|---|
| T1 | Ora e meteo | riuscita con fatica | riuscita con fatica |
| T2 | Luce | riuscita con fatica; fallisce con la pressione lenta | riuscita con fatica; fallisce con la pressione lenta |
| T3 | Temperatura | riuscita con fatica; fallisce con la pressione lenta | riuscita con fatica |
| T4 | Pagine | riuscita | riuscita |
| T5 | Dito fermo 1,2 s | riuscita con fatica | riuscita con fatica |
| T6 | Due tocchi per sbaglio | riuscita | riuscita con fatica |
| T7 | Spostare in alto a sinistra | riuscita con fatica | **fallita** |
| T8 | Ingrandire | riuscita con fatica | riuscita |
| T9 | Togliere e rimettere | riuscita con fatica | **fallita** |
| T10 | Rinominare | riuscita | riuscita con fatica |
| T11 | Meno colonne | riuscita con fatica | **fallita** |
| T12 | Bloccare | non provata | riuscita con fatica (simulata) |

---

## 3. Cosa funziona bene

- **Interruttore della luce reattivo.** La scritta «acceso» compare in 6 ms e la lampadina in 0,67 s: il riscontro arriva in meno di un secondo.
- **Termostato tollerante.** Il «+» da 44×44 px accetta errori di mira di 10-12 px, e il numero cambia a mezzo grado per tocco in modo leggibile.
- **Pagine.** Lo scorrimento lento è affidabile e quello corto (150 px) non cambia pagina. I pallini hanno bersagli di 44 px e il tocco sul pallino riporta a «Casa», su tablet e telefono.
- **Soglia della pressione lunga netta.** A 919 ms non succede nulla, a 1094 ms si entra in modifica, come deciso (U1). Un tremore di ±5 px è tollerato.
- **Blocco.** L'avviso è leggibile (16 px) e resta visibile per più di 10 s. Il doppio tocco è spento e la pressione sul vuoto non apre l'editor.
- **Fogli.** Si chiudono in due modi, con la X da 44×44 o toccando fuori.
- **Annulla.** L'Annulla dopo una rimozione, finché resta visibile, rimette il riquadro al suo posto. Quello della barra scioglie una pila o annulla uno spostamento o un ingrandimento.
- **Colonne reversibili.** Con due «Più colonne» si torna a 8×2, la pagina in più sparisce e non si perde nulla.
- **Contrasti del testo nell'uso normale.** Il testo principale va da 10,5 a 12,8:1, quello secondario da 5,0 a 7,0:1, le icone da 5,0 a 12,9:1, in entrambi i temi e con ogni colore.
- **Nomi accessibili.** Nessun elemento è senza nome per il lettore di schermo (0 su tutte le schermate misurate).
- **Aspetto reversibile.** Tornare a «Chiaro» rende tutto leggibile (12,8:1) e «Griglia → Normale» ripristina la disposizione identica. I pulsanti di «Aspetto» sono alti da 42 a 68 px.

---

## 4. Problemi in ordine di gravità

«n.v.» = non verificata in modo indipendente: la gravità è quella del tester. La sigla tra parentesi indica la prova di origine: tab = tablet, tel = telefono, pers = personalizzazione, audit = analisi del codice.

| ID | Gravità verificata | Area | Problema | Evidenza breve | Proposta |
|---|---|---|---|---|---|
| G01 | **alta** | Comandi dei riquadri | Tenuti premuti ≥1 s, l'interruttore della luce non regolabile, il «+/−» e l'accensione del clima non eseguono il comando: si entra in modifica. Con il blocco compare solo l'avviso. Tapparelle: stesso rischio, visto nel codice | Cucina: 607 ms accesa; 1109 e 1398 ms modifica, luce spenta. «+» a 1149 ms: resta 21 °C (audit F1) | Escludere tutti i comandi dalla pressione lunga |
| G02 | **alta** | Editor delle pagine | Le frecce ← → riordinano le pagine e cambiano la principale, senza Annulla. Le azioni seguenti colpiscono un'altra pagina | Riprodotto a 390×844, 1024×472 e 640×952; dopo la ricarica parte da «Luci» (tel F1) | Frecce con scritta, «Spostata · Annulla», riordino che non cambia la principale |
| G03 | **alta** | Rimozione | Cestino senza scritta né conferma; Annulla di 5 s, poi nessun recupero; pillola «Rimuovi» a 32 px dalla riga bassa | Pillola sparita a 5,1 s; al telefono bastano 118 px di scivolata (tel F3; tab F05, media) | Annulla ≥10 s o fino a «Fine»; «Rimossi di recente»; scritta «Rimuovi» |
| G04 | **alta** | Eliminazione di una pagina | Una pagina speciale (es. Multimedia) si elimina con un tocco, senza conferma né Annulla, e la sua configurazione va persa. Ci si arriva con due gesti | Pagine da 5 a 4, impostazioni di `media_salotto` cancellate (audit F3) | Conferma sempre, con «Non si può annullare», o «Pagina eliminata · Annulla» |
| G05 | **alta** (telefono) · media (tablet) | Trascinamento al bordo | La zona di 72 px dal bordo della finestra fa girare la pagina sulla copertina; il rilascio viene rifiutato e la barra parla di un riquadro invisibile | Zona del 36,9 % della larghezza al telefono, 14,1 % al tablet; fallisce anche a 1024×640 (tel F2, tab F01, audit F10) | Zona dal bordo della griglia o solo con movimento verso l'esterno; dopo un rifiuto, ritorno alla pagina d'origine |
| G06 | **alta** | Sfondo e trasparenza | Lo sfondo scelto non compare mai; la trasparenza dei riquadri non ha effetto | 0 px diversi tra Nessuno, Notte e Mare; Alta e Opaco differiscono per lo 0,004 % (pers F1) | Radice trasparente con sfondo attivo, insieme a G22 |
| G07 | media | Blocco | Con il blocco, le caselle «+» aggiungono riquadri che poi non si tolgono; la matita sembra attiva | Da 2 a 3 e da 14 a 15 riquadri con il blocco attivo (tab F06, tel F4, audit F2) | Nascondere i «+» o mostrare l'avviso; matita con lucchetto |
| G08 | media | Uscita dalla modifica | Con un riquadro selezionato spariscono ora, «Fine» e pallini; nessuna scritta visibile; il piè di pagina non deseleziona | Testi visibili: solo «Annulla» e «Conferma» (tab F04, tel F8 parziale, audit F6) | Riga visibile «Stai sistemando la schermata · Fine» |
| G09 | media | Tasto Indietro | In modifica o con un foglio aperto, Indietro esce dall'app | Riprodotto in Chromium (audit F9) | Una voce di cronologia per modifica, editor e vassoio |
| G10 | media | «+» fuori dalla modifica | Le caselle «+» sono sempre attive: sotto 1 s aprono «Aggiungi un widget», da 1,1 s l'editor delle pagine | 12 su Clima al telefono, 36 sul tablet verticale (tel F5, audit F4). È una scelta di progetto | Da decidere: «+» solo in modifica |
| G11 | media | «Sposta qui» (E2) | Con un riquadro selezionato, toccare il «vuoto» lo sposta | Le caselle coprono il 56,8 % dell'area libera (audit F5) | Spostamento solo dopo un comando «Sposta» o con conferma |
| G12 | media | Doppio tocco | Finestra di 280 ms: il doppio tocco lento non apre le impostazioni, il tremore sì, anche fuori dalla modifica; «Nascondi il widget» con un tocco; foglio che si apre e si richiude | 120 ms → impostazioni; 330-600 ms → nessun foglio (tab F08, tel F7, audit F11) | Pulsante «Impostazioni» nella barra; niente impostazioni fuori dalla modifica |
| G13 | media | Foglio delle impostazioni | Si apre con il cursore nel campo «Nome»: su Android può aprirsi la tastiera | Da confermare sul dispositivo (tel F6) | Fuoco sul titolo o su «Chiudi» |
| G14 | media | Lampadina della luce | Un tremore di 7-8 px regola la luminosità invece di spegnere | Dal 39 al 34 %; soglia di 6 px (tel F9) | Soglia di 12-16 px |
| G15 | media | Pile | Rilasciando al centro di un altro riquadro nasce una pila e il riquadro sparisce | Succede anche senza sosta (tab F03) | Conferma alla prima pila, numero e puntini grandi |
| G16 | media | Ingrandimento | Pallini di 16 px; dall'interno solo 16 px di margine, poi il riquadro si sposta | «spostato: 2 per 2, colonna 6» (tab F07) | Pallini ≥24 px, fascia interna più spessa |
| G17 | media | Colonne | Il 6×1 lascia una riga sola; un riquadro passa su una pagina nuova senza avviso; Annulla di un solo passo | 7 pagine; si ripristina con «+» ×2 (tab F02 parziale) | Avviso dei riquadri spostati; Annulla dell'intera sessione |
| G18 | media | Testo | Testo minimo 13,3 px (didascalie, unità, nome della pagina); numeri a tratto sottile | Circa 3,1 mm sul Lenovo (audit F12) | Minimo 16 px, peso ≥400 |
| G19 | media | Tema scuro | Colori d'accento, informazioni ed errori a circa 1,8:1 (opzione scelta, «Comando non riuscito») | Da 1,73 a 2,03 (pers F3) | Inchiostri chiari nel tema scuro |
| G20 | media | Pulsanti colorati | Il bianco sul colore d'accento resta sotto 4,5:1 | «Fine»: 3,67 viola, 2,36 ciano (pers F4) | Testo scuro sui colori chiari |
| G21 | media | Segni grafici | Anello, pallini e pagina attiva sotto 3:1 con Ciano e Arancione; pallino inattivo a 2,25 | Anello ciano 2,56 (pers F5) | Tono più scuro o contorno |
| G22 | media (alta se si corregge solo G06) | Sfondo e tema | Con lo sfondo visibile, i testi scenderebbero a 1,0-2,4:1 | Simulazione (pers F2) | Testo adattato allo sfondo, velo, trasparenza limitata |
| G23 | media | Tempi | Tempi fissi: la pillola di 5 s non si ferma al tocco; la rotazione delle pile non si azzera | 5005 ms (audit F8 parziale) | Pillola persistente o ≥10 s; «Tempi più lunghi» |
| G24 | media (noto) | Sistema | L'ingranaggio apre Sistema senza PIN: chiunque toglie il blocco | ISSUE-023 (audit F15) | Nessuna nuova proposta |
| G25 | da classificare (nuovo) | Pressione molto lunga | Con circa 2,2 s su una casella vuota, il rilascio richiude l'editor appena aperto | Protezione di 800 ms (verifica di tab F04) | Da registrare |
| G26 | bassa | Annulla della pillola | Annulla anche le modifiche confermate nel frattempo | audit F7 | Annullare solo la rimozione |
| G27 | bassa | Spostamento | Al telefono, spostando un riquadro, «Benvenuto» si rimpicciolisce; l'avviso è solo vocale | tel F10 | Pillola visibile con Annulla |
| G28 | bassa | Ora e meteo | Ora a 16 px all'avvio; meteo vuoto senza spiegazione; luogo dal nome tecnico | tab F10, tel F11, audit T1 | «Meteo non disponibile», ora più grande |
| G29 | bassa | «In attesa di conferma» | La riga sposta i comandi: «−» di 19 px, cursore di 27 px | tab F09 parziale | Spazio riservato |
| G30 | bassa | Aspetto: testi | Gruppi senza titolo, «Material You», «Dallo sfondo» spento senza motivo | pers F6 | Titoli visibili, segno di spunta |
| G31 | bassa | Aspetto: ritorno | Nessun «Torna all'aspetto iniziale» | pers F7 | Pulsante di ripristino |
| G32 | bassa (n.v.) | Griglia | «Compatta» dà celle più grandi; «Ampia» rimpicciolisce del 20 % | pers F8 | «Più grandi / Normali / Più piccole» |
| G33 | bassa (n.v.) | «Cornice» | Il suggerimento descrive lo stato opposto | tel F15, pers F9 | Testo per entrambi gli stati |
| G34 | bassa (n.v.) | Bersagli | Interruttore 78×42; nomi alti 21 px; campo di rinomina alto 19 px | tab F13 (in parte riquadri di prova) | Altezza ≥44 px |
| G35 | bassa (n.v.) | Parole e icone | Gergo, da 5 a 19 icone senza scritta, nome tecnico come titolo, testi tagliati, ISSUE-031 | tab F14, tel F13-F14, audit F13 | Parole semplici, etichette sotto le icone |
| G36 | bassa (n.v.) | Pile | Puntini di 6 px non toccabili | audit F14 (solo codice) | Puntini toccabili ≥44 px |
| G37 | osservazione | Tremore | Un tremore di ±8 px annulla la pressione lunga | audit F16 | — |

**Falsi allarmi e rettifiche (non sono difetti):**
- Il trascinamento veloce che ferma la pagina a metà è un artefatto del banco: lo fa anche una pagina di controllo.
- Il meteo vuoto e la luminosità mancante dipendono dall'anteprima, senza dati meteo e con una luce di prova non regolabile.
- La perdita del titolo a 6×1 riguarda solo il riquadro finto: il sensore vero mostra il nome.
- «Disposizione bloccata» che sostituisce l'Annulla è irraggiungibile.
- Non è vero che la rotazione delle pile riparta dal riquadro sbagliato.
- «Il tocco sul vuoto non deselezionerebbe»: le fessure della griglia deselezionano, il piè di pagina no.
- «Rimosso senza accorgersene»: serve un tocco sul cestino e la pillola resta 5 s.
- La pila nasce anche senza la sosta di 1,5 s indicata dal tester: il rischio è più ampio di quanto descritto, non più piccolo.
- I tipi di riquadro sono 25, non 22.
- Le letture «Widget/Pagine 1,2:1» sono artefatti di misura; «Annulla» a 2,43:1 è solo disattivato; «Venerdì» supera la soglia del testo grande.
- Per «Fine» vale il 3,67:1 della verifica, non il 4,29:1 del tester.

### Dettagli dei problemi alti

**G01: i comandi non rispondono a chi preme lentamente.**
- **Cosa succede:** la pressione lunga di 1 s serve a entrare in modifica. Ne sono esclusi solo campi, cursori e gli elementi segnati apposta. Non lo sono l'interruttore delle luci non regolabili, il «+/−» e l'accensione del clima, né «Apri / Ferma / Chiudi» delle tapparelle (questi ultimi visti solo nel codice). Giuseppe preme a lungo per abitudine e per paura di sbagliare: la luce non si accende e lui si ritrova in uno schermo che non conosce. Con il blocco attivo il comando comunque non parte e compare solo l'avviso.
- **Evidenza:** con un tocco reale, la luce cambia a 607 ms e non cambia a 1109 e 1398 ms. Il «+» del clima funziona a 333 e 616 ms e non a 1149 ms. Codice: LauncherScreen.tsx:127, 1015-1020 e 1029-1032; BrightnessKnob.tsx:124; ClimateWidget.tsx:121-170; CoverWidget.tsx:20-67.
- **Limite:** sul tablet vero la pressione lunga nativa di Chrome (circa 0,4-0,5 s) potrebbe intervenire anche prima. Il fallimento da 1 s in su dipende invece dal codice del launcher.
- **Proposta:** escludere tutti i comandi dei riquadri dalla pressione lunga, lasciandola solo sul corpo del riquadro. La durata decisa in U1 non cambia.

**G02: le frecce dell'editor cambiano la pagina principale.**
- **Cosa succede:** al telefono le frecce non hanno scritta (sul tablet hanno «Prima» e «Dopo»), e sembrano frecce per scorrere le pagine. Un tocco su «→» sposta «Casa» dopo «Luci». Siccome non c'è una principale scelta esplicitamente, la principale diventa la prima pagina, cioè «Luci» (layout.ts:986-991). Non compare nessun Annulla: c'è solo l'annuncio vocale «Casa: posizione 3 di 5.». Dopo la ricarica il tablet parte da «Luci». Anche con la scritta «Dopo» il risultato a video è lo stesso di «vai alla pagina dopo».
- **Riproduzione:** `launcher.html?reset=1`, poi matita, «Pagine», «→» sotto Casa, «Fine», e ricarica.
- **Proposta:** frecce con scritta o dentro un menu; pillola «Casa spostata · Annulla»; riordino che non cambia la principale, oppure un avviso visibile quando la cambia.

**G03: un riquadro tolto è perso dopo 5 secondi.**
- **Cosa succede:** la pillola «… rimosso · Annulla» dura 5 s (UNDO_MS, LauncherScreen.tsx:133). Dopo non resta nessuna strada semplice: il vassoio elenca tipi, non i riquadri tolti, e per ricostruirne uno bisogna scegliere di nuovo tipo ed entità, perdendo nome e misura. La zona del cestino comincia 32 px sotto l'ultima riga: al telefono bastano 118 px di scivolata, al tablet orizzontale 168 px.
- **Perché pesa:** Giuseppe legge piano e non arriva a toccare «Annulla» in tempo.
- **Proposta:** Annulla di almeno 10 s, oppure fino all'uscita dalla modifica, che si fermi al tocco; «Rimossi di recente» nel vassoio; scritta «Rimuovi» accanto al cestino.

**G04: una pagina si elimina con un tocco.**
- **Cosa succede:** per le pagine speciali (Multimedia, Luci, Stanze, Sonos, Batterie) il conteggio dei riquadri vale 0, quindi «Elimina» non chiede conferma e non offre Annulla (LauncherScreen.tsx:1181-1211; PageOverviewBar.tsx:175-215). La configurazione dell'installatore viene cancellata. Ci si arriva con due gesti: 1,25 s sul fondo della pagina, poi «Elimina», che è il primo pulsante a sinistra. Per le pagine di riquadri la conferma esiste, ma non dice che l'eliminazione non si può annullare.
- **Valutazione:** con ogni probabilità non rispetta WCAG 3.3.4 (AA), che chiede di poter annullare, controllare o confermare la cancellazione di dati dell'utente.
- **Proposta:** conferma sempre, con «Non si può annullare», oppure «Pagina eliminata · Annulla».

**G05: il bordo che gira pagina mentre si sposta un riquadro.**
- **Cosa succede:** la zona di 72 px è misurata dal bordo della finestra (useWidgetDrag.ts:136-138, 386-397), non dal bordo della griglia, quindi copre la prima colonna: sul tablet a 1024×472 i primi 45 px. Dopo 0,45 s fermo, la pagina gira. La copertina rifiuta il riquadro con «Non c'è spazio», un messaggio fuorviante perché su «Casa» lo spazio c'è. Giuseppe resta in modifica sulla copertina, con la barra di un riquadro invisibile. Il riquadro non si perde. Al telefono le due zone occupano il 36,9 % della larghezza, e da qui la gravità alta.
- **Proposta:** zona misurata dal bordo della griglia o attiva solo con un movimento verso l'esterno; nessun giro verso una pagina che rifiuta il riquadro; dopo un rifiuto, ritorno alla pagina d'origine.

**G06: lo sfondo non si vede.**
- **Cosa succede:** il gradiente è disegnato sul fondo della pagina (wallpapers.css:34-48), ma il contenitore principale dell'app ha un fondo pieno (appShell.css:8-10) e lo copre, anche nel launcher vero (AppRoutes.tsx:74). La trasparenza dei riquadri si mescola con lo stesso colore e non produce effetto. Il testo «Lo sfondo resta dietro le pagine» (AppearanceSection.tsx:131) promette una cosa che non succede.
- **Perché pesa:** Giuseppe vede il pulsante premuto e la schermata identica, e conclude «non funziona».
- **Attenzione:** correggere solo questo fa emergere G22 (testi a 1:1). Le due correzioni vanno fatte insieme, con una verifica visiva.

---

## 5. Personalizzazione

**Cosa capisce Giuseppe delle opzioni:**
- **Arrivarci.** In alto a destra ci sono due icone senza scritta, la matita e l'ingranaggio. Il nipote gli ha detto «l'ingranaggio». In Sistema il sottotitolo non nomina i colori, e «Aspetto» è la settima voce su otto, dopo parole che non conosce (Profili, Barra di stato, Copertina, Schermata Home). Ci arriva per esclusione.
- **Chiaro, Scuro, Automatico.** Lo capisce. «Scuro» si applica e si salva subito, ma l'etichetta dell'opzione scelta diventa illeggibile (circa 1,8:1). «Chiaro» invece si legge bene (12,8:1), quindi l'errore si recupera. «Automatico» cambia tema da solo, per esempio di sera, e lui non lo collegherebbe alla scelta fatta.
- **Sfondo (Mare, Notte…).** La riga non ha un titolo visibile. Tocca «Mare», il pulsante si incassa, ma la schermata resta uguale: «non funziona» (G06).
- **Colore.** È l'unica riga con un effetto visibile. La parola «accento» a video non c'è, «Material You» sì. «Dallo sfondo» è spento senza un motivo scritto. Con Ciano o Arancione «Fine» e «Conferma» si leggono peggio.
- **Aspetto del riquadro.** Il suggerimento di «Cornice» dice il contrario dello stato dell'interruttore. «Trasparenza» a 1280×800 sta sotto il pulsante «Fatto» e va scorsa per vederla. «Alta» non cambia nulla di visibile.
- **Griglia.** «Compatta» gli fa pensare a «più piccolo», invece dà caselle più grandi. Se cerca scritte più grandi e sceglie «Ampia», i riquadri si rimpiccioliscono del 20 % circa. «Normale» ripristina tutto.
- **Blocca la disposizione.** È l'opzione più utile per lui, ma il suggerimento parla di «pressione lunga» e «Modifica».

**Contrasti sotto soglia.** La matrice completa ha 2.000 righe, 432 sotto soglia. Nell'uso reale le righe sono 1.000, di cui 136 sotto soglia.

| Elemento | Viola | Rosso | Ciano | Arancione | Soglia |
|---|---|---|---|---|---|
| «Fine», bianco sul colore (tema chiaro e scuro) | 3,67 | 3,17 | 2,36 | 2,49 | 4,5 |
| «Conferma» | 4,82 | 4,03 | 2,89 | 2,99 | 4,5 |
| Contatore del chip (13 px) | 4,80 | 4,02 | 2,85 | 2,99 | 4,5 |
| Anello di selezione (chiaro) | 4,31 | 3,61 | 2,56 | 2,68 | 3 |
| Pallini di ingrandimento (chiaro) | 4,01 | 3,37 | 2,39 | 2,50 | 3 |
| Pallino della pagina attiva (chiaro) | 4,15 | 3,75 | 2,83 | 2,93 | 3 |
| Pallino della pagina non attiva | 2,25 (scuro 3,48) | = | = | = | 3 |
| Giorno della copertina (51 px, chiaro; non rimisurato) | 3,97 | 3,33 | 2,36 | 2,47 | 3 |
| Opzione scelta in Aspetto (scuro) | 1,80 | 1,74 | 2,00 | 1,79 | 4,5 |
| Colori di informazione ed errore (scuro) | 1,73-2,03 | | | (errore 1,78) | 4,5 |

- **«Dallo sfondo»**, bianco sul colore ricavato: Alba 4,15, Mare 3,53, Bosco 3,47, Tramonto 4,31, Notte 4,21. Tutti sotto 4,5.
- **Sfondo visibile (simulato, oggi non accade):**
  - tema chiaro con Notte: nome della pagina 1,17, «+» 2,07, «°C» su riquadro Media 1,91, «Consumo casa» su riquadro Alta circa 1,0;
  - tema scuro con Alba: «+» 1,66, «Consumo casa» (Alta) 2,36, nome della pagina 3,24.

**Rischi:**
1. Correggere lo sfondo senza adattare i colori del testo rende illeggibili proprio i testi che stanno sullo sfondo (G22).
2. Nel tema scuro Giuseppe non leggerebbe l'opzione scelta né un messaggio «Comando non riuscito» (G19).
3. I colori chiari peggiorano i pulsanti con cui si esce dalla modifica (G20).
4. Sistema non ha PIN: chiunque, nipote compreso, cambia aspetto o toglie il blocco (ISSUE-023).
5. Nulla in «Aspetto» si rompe in modo irreversibile, ma manca un «torna com'era» (G31).

---

## 6. Misure

Soglie: WCAG 2.2 livello AA (comprende i criteri di livello A). Le «indicazioni per anziani» sono valutazioni dei tester, non requisiti delle WCAG.

| Misura | Valore | Soglia | Esito |
|---|---|---|---|
| Testo minimo | 13,3 px (≈3,07 mm, 8,7 pt sul Lenovo) | ≥16 px (indicazione per presbiti; le WCAG non fissano una misura) | non OK |
| Numeri a tratto sottile (peso 300) | «21.5» 47,8 px; «20,5 °C» 33 px; ora della copertina 32,6 px | peso ≥400 (indicazione) | non OK |
| Ora nella barra | 16 px, peso 500 | ≥24 px per leggerla senza occhiali (indicazione) | non OK |
| Contrasto del testo, uso reale | principale 10,5-12,8; secondario 5,0-7,0 | 4,5:1 (1.4.3) | OK |
| Bianco sui pulsanti colorati | «Fine» 2,36-3,67 | 4,5:1 (1.4.3) | non OK |
| Testo grande colorato «Venerdì» | 4,01 chiaro, 3,59 scuro | 3:1 (1.4.3, testo grande) | OK |
| Colori di testo nel tema scuro | 1,73-2,03 | 4,5:1 | non OK |
| Segni grafici (anello, pallini) | fino a 2,25-2,56 | 3:1 (1.4.11) | non OK con Ciano e Arancione |
| Interruttore della luce | 78×42 px | AA 24 px (2.5.8); 44 px (2.5.5 AAA e indicazione) | AA OK, 44 no |
| Nomi toccabili / campo di rinomina | alti 21 px / 19 px | 24 px (2.5.8, salvo eccezione per spaziatura) | da verificare, probabilmente non OK |
| Pallini delle pagine, cestino, «Fine» | 44 px | 44 px | OK |
| Presa dei pallini di ingrandimento | fascia di 48 px, solo 16 px verso l'interno | ≥25 px per chi trema (indicazione) | non OK |
| Puntini delle pile | 6×6 px, non toccabili | segno leggibile | non OK |
| Pressione lunga | 919 ms nulla, 1094 ms modifica | 1000 ms (decisione U1) | OK; ma vedi G01 |
| Tremore durante la pressione | ±5 px OK, ±8 px annulla | — | osservazione |
| Soglia di trascinamento della lampadina | 6 px | spostamento tipico di Android ~8 dp | non OK |
| Doppio tocco | 280 ms tra i due rilasci | tocco lento di un anziano 400-500 ms (indicazione) | non OK |
| Annulla dopo una rimozione | 5 s, non si ferma | tempo regolabile (2.2.1, A); ≥10 s (indicazione) | non OK |
| Rotazione delle pile | ogni 10 s, senza pausa al tocco | pausa o arresto (2.2.2, A) | rischio (si attiva a scelta) |
| Zona del bordo nel trascinamento | 72 px, 0,45 s; dal 14 al 37 % della larghezza | nessuna sovrapposizione con le caselle | non OK |
| Caselle «Sposta qui» | 56,8 % dell'area libera | — | non OK per la persona |
| Alternativa al trascinamento | spostamento con un tocco, misura dal foglio, luminosità con −/+ nei dettagli (dal codice) | 2.5.7 (AA) | presente, ma poco scopribile |
| Riscontro della luce | 6 ms la scritta, 668 ms la lampadina | <1 s | OK |
| Elementi senza nome accessibile | 0 | 0 (4.1.2) | OK |
| Icone senza scritta | Casa 5 (19 a 640), modifica 7, editor 5 | il meno possibile | non OK |
| Scorrimento orizzontale della pagina (telefono) | nessuno | nessuno | OK |

---

## 7. I punti aperti di REP-20261008-001 visti da Giuseppe

1. **«Sposta qui» toccando una casella libera (E2/U8).** Per Giuseppe è una trappola. Dopo una pressione lunga involontaria, quello che sembra spazio vuoto è per il 56,8 % fatto di caselle che spostano il riquadro. Il simbolo ⇆ non gli dice nulla, e i veri vuoti che deselezionano sono fessure di circa 11 px. In emulazione, un tocco appena sotto la griglia ha selezionato il riquadro vicino. L'alternativa al trascinamento richiesta dalle WCAG (2.5.7) serve. Dal suo punto di vista però dovrebbe partire da un comando esplicito («Sposta», poi la casella), come prevede U8 («il tocco singolo non sposta»). «Annulla» della barra rimedia. La decisione resta all'utente.
2. **Una riga sola con poche colonne.** Giuseppe chiede «quadrati più grandi» e ottiene una riga sola. I riquadri si abbassano, uno finisce su una pagina nuova senza avviso, «Annulla» torna indietro di un solo passo. Non perde dati, perché due «+» ripristinano tutto, ma il risultato non è quello che cercava. Dal suo punto di vista conviene un minimo di 2 righe sul Lenovo in Chrome, oppure un «−» spento con il motivo scritto. Al telefono non arriva nemmeno a provarci, per le frecce (G02).
3. **Impostazioni con il blocco.** Il blocco è la protezione che lo aiuta di più. Oggi il doppio tocco è spento fuori dalla modifica, ed è un bene: con le impostazioni aperte un solo tocco su «Nascondi il widget» fa sparire il riquadro. Dal suo punto di vista nome e aspetto dovrebbero restare chiusi con il blocco. Il blocco però va completato su tre fronti: i «+» (G07), i comandi tenuti premuti (G01) e Sistema senza PIN (ISSUE-023).
4. **Tablet in Chrome o a schermo intero.** In Chrome (1024×472) le caselle sono di 112 px e Giuseppe ha 6 pagine, compresa una «Casa 2» di continuazione. A schermo intero (1024×640) le caselle scendono a 75 px, le pagine sono 5 e su «Casa» ci sono 19 icone senza scritta, comprese le caselle «+». Il difetto del bordo (G05) c'è in entrambi i casi. Chrome ha due rischi in più: la barra degli indirizzi e il tasto Indietro, che esce dall'app (G09). Lo schermo intero dà caselle più piccole, peggio per un presbite, e non è stato provato sul dispositivo. Nessuna delle due modalità è preferibile senza la prova sul Lenovo. Se si sceglie lo schermo intero, servono caselle più grandi.

---

## 8. Proposte prioritarie

Sono proposte non autorizzate, da registrare nel registro dei problemi. Alcune toccano decisioni dell'utente (U1, U8, CE-01, E2). Il costo è una stima.

| # | Proposta | Costo | Beneficio per Giuseppe |
|---|---|---|---|
| 1 | Escludere dalla pressione lunga tutti i comandi dei riquadri: interruttori, «+/−», tapparelle, accensione del clima (G01) | piccolo | La luce e il termostato rispondono anche quando preme a lungo; sparisce l'ingresso involontario più frequente in modifica |
| 2 | Blocco completo: niente «+» attivi e matita con lucchetto quando è bloccato (G07) | piccolo | L'installatore o il nipote possono «chiudere» davvero il tablet |
| 3 | Editor delle pagine sicuro: frecce con scritta e Annulla, riordino che non cambia la principale, eliminazione sempre confermata (G02, G04) | piccolo | Nessun danno permanente nascosto dietro un tocco |
| 4 | Rimozione recuperabile: Annulla ≥10 s o fino a «Fine», che si fermi al tocco; «Rimossi di recente»; annullare solo la rimozione (G03, G23, G26) | medio | Ha il tempo di leggere e rimediare |
| 5 | Modifica sempre riconoscibile: riga visibile «Stai sistemando la schermata · Fine», «Fine» sempre raggiungibile, il vuoto deseleziona, Indietro chiude la modifica (G08, G09) | medio | Sa dove si trova e come tornare indietro |
| 6 | Bordo di cambio pagina misurato dalla griglia o attivo solo verso l'esterno; dopo un rifiuto, ritorno alla pagina d'origine (G05) | piccolo/medio | Lo spostamento nell'angolo riesce al primo colpo |
| 7 | Pulsante «Impostazioni» visibile nella barra del riquadro; niente impostazioni con il doppio tocco fuori dalla modifica; il fondo ignorato nei primi 300 ms (G12, G13) | piccolo | Niente fogli tecnici aperti per un tremore, niente riquadri nascosti per sbaglio |
| 8 | Sfondo e trasparenza funzionanti insieme a testi adattati allo sfondo, con verifica a schermo (G06, G22) | medio | La scelta fatta si vede, e si legge ancora tutto |
| 9 | Contrasti del Kit 2: colori chiari per i testi nel tema scuro, testo scuro sui colori chiari, «Fine» senza schiarimento sotto la scritta, contorno su anello e pallini (G19-G21) | medio | Ogni colore che sceglie resta leggibile |
| 10 | Testo più grande: minimo 16 px per didascalie, unità e nome della pagina, peso ≥400 per i numeri, ora più grande; oppure «Testo più grande» in Aspetto (G18, G28) | medio | Legge temperatura, obiettivo e ora senza occhiali |

Le altre proposte (caselle «+» solo in modifica, «Sposta qui» con un comando, soglia della lampadina, conferma delle pile, parole semplici) restano nella tabella della sezione 4.

---

## 9. Limiti del test e cosa provare sul tablet

**Limiti:**
- **Ambiente.** Chromium senza interfaccia (Playwright) con tocchi simulati via CDP: tablet a 1024×472 e 1024×640 (scala 1,875), telefono 390×844 e 844×390 (scala 3), personalizzazione a 1280×800 (scala 1,5). Non è il Lenovo Tab M11 fisico. Non sono stati provati vibrazione, pressione lunga nativa di Chrome per Android, tastiera virtuale, tasto Indietro reale, TalkBack e movimento ridotto.
- **Anteprima.** `launcher.html` usa la stessa schermata del prodotto ma con dati finti. Mancano meteo, tapparelle, pile e luci regolabili. Al telefono la luce regolabile è stata simulata in memoria. Il clima di prova non conferma mai («In attesa» resta). Pillole tecniche e valori incoerenti (21.5 contro 20,5) sono solo dell'anteprima.
- **Tema iniettato.** Il Kit 2 è stato applicato nella pagina di prova; l'iniezione è verificata. Nell'app vera è stata vista solo la pagina `#/ui-kit`.
- **Eventi simulati.** Il blocco è stato simulato scrivendo nella memoria del browser, e Sistema non è raggiungibile dal launcher di prova. Le tapparelle (T5 dell'analisi) e il nome del meteo vengono solo dal codice.
- **Contrasti.** Misurati sui pixel: i valori vicini a 4,5 vanno confermati.
- **Nessun collegamento reale.** Nessuna prova ha usato Home Assistant, il banco su :3002, Docker o Git, e nessun file del repository è stato modificato. Script, JSON e screenshot sono in `C:/Users/matti/AppData/Local/Temp/claude/C--Users-matti-Desktop-Siti-web-Lavori-Memo-6-Acasystem2-0/2d52377b-d21d-40f5-be7b-fbd580ce6c85/scratchpad/ux/`, nelle cartelle `giuseppe/`, `g-tel-5192/`, `persona/`, `audit5194/` e in quelle delle verifiche.

**Cosa provare sul Lenovo (checklist):**
1. Apri in Chrome e annota quanto spazio resta; ripeti a schermo intero.
2. Tieni premuto 1,5 s l'interruttore di una luce non regolabile, il «+» del termostato e «Apri» di una tapparella. Il comando parte o si apre la modifica? Compare il menu di Chrome o una vibrazione prima del secondo? Ripeti con il blocco attivo.
3. Entra in modifica per sbaglio: riesci a uscire senza aiuto? Cosa fa il tasto Indietro di Android?
4. Fai due tocchi veloci sulla luce: si apre la tastiera nel campo «Nome»?
5. Trascina un riquadro nell'angolo in alto a sinistra tenendo fermo il dito: la pagina gira?
6. Togli un riquadro e aspetta 6 s: riesci a ritrovarlo?
7. Editor delle pagine: tocca «→» (o «Dopo») e ricarica. Da quale pagina riparte?
8. Attiva «Blocca la disposizione» da Sistema → Schermata Home e tocca un «+».
9. In Aspetto scegli «Mare»: lo sfondo si vede? Passa a «Scuro»: leggi l'opzione scelta?
10. Copertina con Home Assistant vero: il meteo compare? Che nome ha il luogo?
11. A 60-80 cm, senza occhiali: leggi l'ora nella barra, «Obiettivo» e il nome della pagina?
12. Con TalkBack: gli annunci di modifica e di rimozione arrivano?

## Osservazioni sull'app reale (banco `aca-system:0.6`, con Home Assistant)

Le ho raccolte io nel browser integrato, con la sessione HA dell'utente e la viewport emulata a 1024×472 (Lenovo M11 in Chrome).
- La finestra di Claude era ridotta a icona: niente screenshot affidabili, solo misure dal DOM.
- Nessun comando a dispositivi. La modifica è stata aperta e chiusa con «Fine» senza cambiare nulla.

- **Principale del banco**:
  - pagina vuota con 16 celle «+», cioè 8×2 (chiave phoneLandscape@8x2);
  - le celle «+» si vedono anche fuori dalla modifica;
  - nessun contenuto domestico: per la persona è un muro di «+» tutti uguali.
- **Misure sulla Principale** (testi visibili, con il colore risolto da canvas sullo sfondo opaco più vicino):
  - testo minimo 16 px, pesi 400 e 500;
  - nessun testo sotto 4,5:1 («Sincronizzato» 5,0:1, ora 10,6:1);
  - 18 bersagli, tutti ≥ 44 px.
  - Limite: fondi con gradiente o immagine non considerati.
- **Pulsanti solo icona sulla barra di stato:**
  - «Modifica» (matita) e «Sistema» (ingranaggio): nessuna scritta visibile;
  - le 16 celle «+» hanno solo l'icona;
  - il nome accessibile c'è, ma per la persona non c'è testo da leggere.
- **Entrata in modifica** con «Modifica»:
  - il pulsante diventa «Fine» e si apre la barra «Modifica della disposizione»;
  - l'annuncio per il lettore di schermo dice «Tieni premuto un widget per spostarlo, tocca due volte per le impostazioni. Esc per terminare.». «Esc» non esiste sul tablet.
- **Sistema**:
  - una pagina sola con le sezioni Collegamento («Collega di nuovo», «Esci»), Profili (esporta, importa, salva), Barra di stato, Copertina, Schermata Home («Blocca la disposizione», griglia Compatta/Normale/Ampia), Posizione (latitudine e longitudine, «Salva la posizione»), Aspetto (Chiaro/Scuro/Automatico; sfondo Nessuno/Alba/Mare/Bosco/Tramonto/Notte/Una foto…; accento Viola/Rosso/Ciano/Arancione/Dallo sfondo) e Informazioni;
  - per la persona le azioni quotidiane (Aspetto) stanno accanto ad azioni amministrative e rischiose (Esci, Importa da un file, Salva la posizione su HA);
  - nessuna protezione: chiunque tocchi l'ingranaggio può arrivarci (ISSUE-023).
- **Ambiente:**
  - dopo i riavvii di Docker, HA montava una cartella vuota (onboarding);
  - il banco è ripartito senza porte per il cambio di rete del PC.
  - Per la persona che usa il tablet: se il PC cambia rete, l'app «sparisce» e serve l'installatore. È un rischio del banco, non del prodotto finale, ma va detto.

**Confronto con l'anteprima:**
- Sulla Principale reale, quella vuota del banco, il testo minimo è 16 px. I testi a 13,3 px della sezione 6 compaiono sulle pagine con widget dell'anteprima: didascalie, unità e nome della pagina.
- Il resto è coerente: pulsanti solo icona in alto, «Esc» negli annunci, Sistema senza protezione.

## Verifiche ed evidenze

| Controllo | Procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Prova sul tablet (T1-T12) | Playwright Chromium; tocchi CDP; 1024×472 e 1024×640 con scala 1,875; `launcher.html` con il Kit 2 iniettato | Eseguito | 4 attività fallite o riuscite solo con il tocco breve; dettagli nella sezione 2. Dati finti. |
| Prova sul telefono (T1-T12) | Come sopra; 390×844 e 844×390 con scala 3 | Eseguito | 3 attività fallite (T7, T9, T11). |
| Personalizzazione e contrasti | `#/ui-kit` e `launcher.html` con il Kit 2; 2 temi × 5 accenti × 6 sfondi | Eseguito | 1.000 righe d'uso reale, 136 sotto soglia; lo sfondo non compare (G06). |
| Analisi del codice | Lettura di launcher, modifica, fogli e Sistema | Eseguito | 16 rilievi con file:riga. |
| Verifica incrociata | Ogni tester ricontrolla i rilievi alti e medi di un altro, con server proprio | Eseguito | 34 confermati, 6 parziali, 0 smentiti. |
| App reale | Browser integrato, viewport emulata 1024×472, misure dal DOM | Eseguito, parziale | Finestra ridotta a icona: niente screenshot; solo Principale vuota, modifica e Sistema in lettura. |
| Tablet fisico, TalkBack, tastiera virtuale, HA con entità reali | — | Non eseguito | Checklist per l'utente nella sezione 9. |

## Controllo del diff e decisioni

- **Perimetro.** Il perimetro è stato rispettato: nessuna modifica al codice, nessuna nuova dipendenza, nessun comando a dispositivi. Le modifiche ai documenti sono questo report, `project-status.md`, `reports/README.md` e `infrastructure.md`, per gli incidenti del banco. Al compose sono stati cambiati solo l'indirizzo Wi-Fi e l'immagine 0.6, già autorizzata.
- **Registro.** I sei problemi alti sono registrati come ISSUE-032…037; gli altri sono raggruppati in ISSUE-038. Le proposte della sezione 8 sono registrate, non applicate.
- **Decisioni dell'utente da riaprire alla luce del test:**
  - U1, pressione di 1 s: G01 chiede di escluderne i comandi, la durata resta;
  - U2, solo doppio tocco per le impostazioni: G12 propone un pulsante visibile;
  - E2/U8, «Sposta qui» (G11);
  - densità e colonne minime sul Lenovo (G17).

## Chiusura e punto di ripresa

Test completato; nessun incarico di correzione è aperto.

**Prossimo passo dell'utente:**
- la prova sul Lenovo con la checklist della sezione 9;
- la scelta di quali proposte autorizzare. Le più utili e meno costose sono 1, 2 e 3: comandi esclusi dalla pressione lunga, blocco completo, editor delle pagine sicuro.

**Banco:** `aca-system:0.6` su `http://192.168.1.11:3002`.
