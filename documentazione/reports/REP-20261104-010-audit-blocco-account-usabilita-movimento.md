# Blocco 1 — riesame di usabilità e animazioni

| Campo | Valore |
|---|---|
| ID / stato | REP-20261104-010 — Audit completato; rilievi aperti, nessuna correzione applicata |
| Data / autore | 2026-11-04, Codex; nome esatto del modello non disponibile |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta umana | «ricontrolla il blocco a cui stiamo lavorando, animazioni e usabilità» |
| Perimetro | Riesame del blocco 1 della mappa: registrazione, accesso, account, ingresso nel profilo e transizioni correlate, con Liquid Glass installato .42. Audit e documentazione, nessuna modifica applicativa, deploy, registrazione reale o comando fisico. |

## Obiettivo e criteri

Verificare chiarezza e continuità dei flussi desktop/telefono, validazione e recupero errori, tastiera/focus/touch, personalizzazione personale e movimento effettivo con preferenze di accessibilità. Distinguere difetti riprodotti, inferenze da codice, proposte e scelte umane già approvate. Non trasformare l’audit in una riscrittura dei flussi o in una nuova palette.

Il banco .42 è healthy; i sorgenti e le evidenze di REP008/009 sono il punto di partenza, non sostituiscono le nuove prove. Le prove anonime possono leggere il banco; invii/login/registrazioni si provano soltanto con fixture isolate e dati sintetici. Non usare credenziali reali o modificare account/profili esistenti. Preservare le 521 voci Git preesistenti.

## Metodo e avanzamento

Impeccable audit come guida di controllo tecnico/UX, review-animations e relativi standard per il movimento; fonti progettuali canoniche in product/design, ADR0040/0042 e mappa blocchi. Riesame indipendente dei flussi, del movimento/accessibilità e delle regressioni su fixture esistenti. Materiali selezionati e tentativi in `backup/rep037/`.

Le verifiche precedenti del solo tema non sono estese automaticamente a tutto il blocco. La griglia non è un audit del launcher; QR/HAOS rimangono blocco 0. Uso esclusivo del profilo, login esplicito dopo creazione e nome casa al primo avvio sono decisioni correnti, non difetti automaticamente da rimuovere.

## Riscontri prioritari

L’audit è completato, ma **non approva il blocco come privo di difetti**. Il rilievo prioritario è la callback di registrazione successiva all’abbandono del flusso. I riscontri grafici e di touch sono misurati su componenti reali con dati sintetici. Gravità di sintesi: **P1** per l’accettazione tardiva; **P2** per i difetti di personalizzazione e gesto, e per gli attriti da valutare. Il sottoaudit movimento assegna una priorità più alta ai casi visivi/touch e un verdetto Block limitato al gesto; qui non si attenua la loro evidenza né si dichiara il blocco risolto.

| ID / gravità | Prima: riscontro e fonte | Dopo raccomandato, non implementato | Prova e limite |
|---|---|---|---|
| **A — P1, callback tardiva dopo registrazione** | `RegistrationForm.tsx:73–81` prosegue dopo `await verifyRegisteredSession` e chiama onSession senza verificare abbandono/generazione. `ConnectPage.tsx:72–74` accetta direttamente quella callback. | Invalidare l’accettazione dopo l’abbandono e gestire i grant transitori; coordinare l’attesa esterna col form. | Il componente reale viene smontato mentre la verifica è sospesa; risolvendola, onSession è chiamata1volta. **1FAIL atteso** sull’invariante «nessuna callback dopo unmount». Il gesto Annulla completo e il doppio grant non sono stati riprodotti in browser: non si attribuisce un effettivo cambio di account umano. |
| **B — P2, colori personali non distinguibili** | `AccountView.tsx:91–95` usa sei span `.aca-connect__color` privi di definizione CSS; ciascuno misura0×0px con fondo trasparente, benché il token del colore sia presente sul pulsante. | Ripristinare campioni visibili tramite il design condiviso; preservare colore libero e selezione. | AccountView reale, CSS correnti e API intercettate; computed e screenshot `motion-accessibility-audit.account-black-swatches.png`. Il salvataggio resta disponibile, ma la scelta è al buio. |
| **C — P2, contrasto dell’iniziale** | `AccountAvatar.tsx:20`, `account.css:11`: lo sfondo libero nero conserva testo rgb(34,34,53), contrasto1,348:1. La pill di signup usa invece testo bianco sul medesimo nero. | Riutilizzare il criterio di contrasto dell’iniziale senza cambiare il colore salvato o la precedenza della foto. | Confronto rendered AccountView e preview signup; il nome testuale/accessibile continua a identificare la persona. Nessuna certificazione globale WCAG inferita dal campione. |
| **D — P2, alert dopo retry riuscito** | `AccountView.tsx:25,29,104,106`: reload aggiorna account senza cancellare l’errore precedente; dopo successo il pulsante Riprova sparisce ma l’alert rimane. | Separare gli errori di lettura/immagine e chiudere quello superato dal retry. | **Confermato staticamente**, non riprodotto dal browser in questo incarico. Test suggerito: prima lettura fallita, seconda riuscita, controlli disponibili e vecchio alert assente. |
| **E — P2, crop con due dita** | `AccountImageCropper.tsx:42–51` non conserva il pointerId proprietario del drag. Dopo15px X=0,20; secondo dito più1px del primo porta X=-0,98, salto1,18. | Conservare il puntatore del drag e gestire up/cancel/lost-capture; non aggiungere automaticamente pinch o nuove gesture. | Due touch sintetizzati tramite CDP/Chromium, non hardware iPhone/Android. Il movimento perde continuità; il sottoaudit motion lo considera Block del gesto. |
| **F — P2, controlli crop** | `AccountImageCropper.tsx:53–55`: tre range hanno nome accessibile ma nessuna etichetta visibile. Durante invio, `:35` ignora Chiudi/Escape mentre il pulsante X del Sheet appare abilitato (`Sheet.tsx:231`). | Rendere comprensibili i cursori e allineare lo stato del comando Chiudi alla policy di attesa, senza promettere annullamento di un invio già partito. | Screenshot e PUT locale intercettata/mantenuta pendente; nessuna foto reale salvata. Tastiera e nomi accessibili dei range funzionano. |
| **G — P2, coesione temporale del crop** | `Sheet.tsx:142–150` e `design/themes/acasystem/components.css:776,816`: salita280ms poi corpo160ms, completamento misurato450,8ms. `AccountView.tsx:107` smonta il crop alla chiusura: dismiss entro9,7ms, nessuna exit transition. | Valutare una sequenza più diretta coerente fra entrata/uscita, preservando movimento ridotto e focus. | **Attrito misurato e proposta**, non nuova regressione Liquid Glass: la coreografia eredita la scelta storica D-M5. La exit200ms/ease-in del CSS condiviso non viene eseguita qui e non viene attribuita al crop. |

Percorsi frontend della tabella sotto `progetto/acasystem/frontend/src/`; `Sheet.tsx` è in `progetto/acasystem/ui/primitives/components/`. I numeri indicano le fonti della variante0.9.42, non modifiche già applicate. Registro unico dei gruppi in [ISSUE-145](../project-status.md#issue-145--audit-del-blocco1-account-accesso-e-movimento); dettagli e impronte locali in `backup/rep037/flow-audit.md/json`, `test-audit.md` e `motion-accessibility-audit.md/.summary.json`.

### Usabilità della registrazione e proposte distinte

La prova rendered a390px conferma che LoginForm vuoto evidenzia **2campi con aria-invalid**, descrizioni associate e focus su username. Per signup vuota, password corta e conferma diversa, l’alert è presente ma **0campi aria-invalid** e focus ancora sul pulsante Crea account. L’username viene normalizzato. Questo è un attrito di feedback P2 da valutare, non una creazione account impossibile: `RegistrationForm.tsx:51–53` e `AccountCreationFields.tsx:33–35` non usano gli errori inline disponibili nella primitiva Field. Misure in `visual-block-audit-results.json`.

Altre proposte non implementate: consentire un’uscita/cambio account esplicito dai gate di profilo occupato o colore in attesa, senza takeover o rimozione dell’uso esclusivo; riutilizzare il picker libero anche dopo la registrazione, dove AccountView presenta sei preset. Non sono nuovi comportamenti approvati dal solo audit.

### Cosa funziona e rimane invariato

Nome utente unico, login esplicito dopo creazione, nome casa solo nel primo setup e ruoli owner/membro distinti sono conservati. Il nome dispositivo non è richiesto; label/client/sessioni interni rimangono separati. Non è offerta l’opzione token manuale. Il profilo dell’account è selezionato automaticamente quando non c’è un’ambiguità conservativa; il suo uso esclusivo è una decisione successiva approvata, non un difetto da rimuovere.

Login ordinario: focus ed errori specifici, password rifiutata svuotata, MFA, attesa aria-busy e un solo invio. I test coprono sessioni/rinnovo/revoca e journal registrazione senza password. Crop: target almeno44px nel campione, slider da tastiera, focus iniziale su Chiudi e ritorno a Carica foto profilo. Movimento ridotto: transform none, fade120ms e corpo immediato. L’avatar con foto sostituisce il colore; la cover resta nella vista account.

## Verifiche ed evidenze

| Controllo | Procedura / ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Frontend mirato esistente | Vitest16file, comandi completi in `backup/rep037/test-audit.md` | **126/126PASS** | `test-audit.frontend.json`; non è la suite generale. |
| Backend mirato esistente | Vitest5file, registrazione/setup/account/auth | **54/54PASS** | `test-audit.backend.json`; nessun HA personale o container del banco. |
| Repro registrazione tardiva | `vitest run --config backup/rep037/test-audit.race.config.mjs`, componente reale/API differita | **1FAIL atteso**, conferma A | `test-audit.race.test.tsx/.json/.log`; test solo in backup, nessun test del prodotto modificato. |
| Percorsi auth reali isolati | `node backup/rep037/test-audit.browser.mjs`, bundle0.9.42/FakeHA/SQLite memory, Chromium390×844 | **5/6PASS, ultimo limitato429** | Login vuoto/errato/pending/MFA, signup invalida/username presente riusciti. Sesta creazione201 ma login429 dopo ripetizioni: non regressione né PASS completo.0erroriJS/esterne/comandi fisici nell’ultima esecuzione. |
| Focus e signup rendered | `node backup/rep037/visual-block-audit.mjs`, fixture4184 | Misure valide, harness fermo sul gate atteso | Login2errori inline/focus, signup0errori inline/focusCTA;0overflow a320/390/844 nel campione. Il successivo wait del gear fallisce perché il nuovo account è nella normale scelta profilo, **non** per un bug dell’app. |
| Account/crop/movimento | `node backup/rep037/motion-accessibility-audit.mjs`, componenti reali/Vite4182/API intercettate/Chromium | Sei sezioni completate, **run parziale** | Avatar, swatch, crop normale/2touch/pending/reduced validi. La coda Button/target form termina per interoperabilità React del harness: non un errore Account/Crop; non dichiarato PASS globale. Grezzo e due preparazioni fallite preservati. |

Le fixture sono vincolate a loopback e usano dati sintetici; le richieste account del crop sono intercettate, non scritture reali. Nessun accesso autenticato al banco3002, password/token umano, registrazione reale, comando fisico, modifica HA/D1, build o installazione. Non sono nuove prove Safari/iPhone/Android/M11 fisici né misure FPS/GPU. Le prove del solo tema REP008/009 non vengono retroattivamente invalidate o estese a questa copertura; questo audit rileva ulteriori difetti nei flussi che allora non erano tutti sotto esame.

## Controllo del diff e decisioni

Modificati solo report/indice/stato/verifiche/diario e materiali locali esclusi da Git. Le521voci preesistenti sono preservate. Nessuna nuova dipendenza, ruolo, API, migrazione, selettore o palette. **Nessuna correzione applicata e nessun deploy**; proposte e difetti rimangono aperti in ISSUE-145. Nessun ADR nuovo necessario per un audit; le scelte ADR0036/0037/0040/0042 restano fonti correnti.

## Chiusura e punto di ripresa

Audit richiesto completato; priorità di correzione e prove di regressione sono reviewabili in ISSUE-145, senza autorizzazione implicita a implementarli. Il blocco non è dichiarato privo di problemi: il P1 sulla callback dopo abbandono va risolto prima di approvare quel recupero del flusso.

L’utente ha nel frattempo assegnato una **prova grafica successiva**, gestita separatamente dal coordinatore con **REP011 in preparazione**. Non è una correzione del P1 o degli altri rilievi finché una modifica e la relativa verifica non lo dimostrano. Banco0.9.42, account/profili e release pubblica0.9.34 rimangono invariati da questo audit.
