# UI kit e tema ACA Liquid Glass

| Campo | Valore |
|---|---|
| ID / stato | REP-20261104-008 — Completato nel software e nelle build locali; hardware distinto |
| Data / autore | 2026-11-04, Codex; nome esatto del modello non disponibile |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta umana | «realizziamo il nuovo ui kit tema liquid glass e applichiamolo, basiamoci su come è stato realizzato la reference»; impeccable guida, ui-ux-pro-max e apple-design fonti; glassmorphism superfici e liquid glass navigazione/controlli. |
| Autorizzazione | Nuovo tema e applicazione al kit esistente. La richiesta successiva descrive il pacchetto atteso da ADR-0039. Nessun rilascio pubblico o aggiornamento del banco domestico disposto qui. |

## Obiettivo e perimetro

Nuovo ingresso `design/themes/liquid-glass/` e applicazione attraverso l’ingresso condiviso, conservando ACA Classico come sorgente recuperabile. Nessun nuovo selettore o personalizzazione globale, dipendenza, stack, flusso account, permesso o funzione domotica. Checkpoint dei sorgenti/documenti e stato Git in `backup/rep035/`; preservare il lavoro preesistente.

## Brief prima del codice

- **Uso:** Operate, controllo della casa su PC, Android e browser iPhone; gerarchia, dati e azioni esistenti invariati. Reference scelta dall’utente come autorità visiva, non nuovo giro di proposte da approvare.
- **Materiali:** superfici bianche traslucide, bordi luminosi sottili, ombre diffuse, fondo statico per rendere visibile il vetro. Viola ACA per azioni e selezione; font Inter e colori funzionali conservati. QR nero su bianco non filtrato.
- **Gerarchia:** pannelli in vetro satinato; controlli e navigazione con riflesso/lente ottica leggera. Nessuna rifrazione SVG, blur animato, sfondo in movimento o doppio vetro annidato.
- **Confini:** rispettare ADR-0014/0016 mantenendo Casa 3D e cornice/ingranaggio senza blur; dati, layout logico, gesti e autenticazione non cambiano. Schermata QR solo anteprima, nessun avvio grafico OS.
- **Accessibilità e prestazioni:** fallback opaco senza supporto, trasparenza ridotta/contrasto aumentato/forced-colors, focus visibile e movimento ridotto; blur limitato ai pannelli principali. Lenovo M11 non disponibile: nessun risultato hardware inventato.

## Criteri di completamento

Tema e kit condivisi applicati a webapp, risorse client e preview QR; Classico conservato; demo locale e build verificabili. Controlli pertinenti di build/tipi, asset condivisi, contrasto, desktop/mobile, stati e dati lunghi, fallback e riduzione movimento. Rendicontare limiti e debito preesistente separatamente. Aggiornare design/decisione e fonti d’ingresso.

## Avanzamento

Letti gli ingressi del design e ADR-0039, consultate le skill richieste. Ricerca ui-ux-pro-max limitata a `--domain style`: glassmorphism (blur 10–20 px) e liquid-glass (ruolo navigazione/controlli, fallback e contrasto). Il launcher impeccable ha individuato il design esistente ma non il PRD per la radice documentale; si usano le fonti canoniche del repository, senza duplicare PRODUCT.md/DESIGN.md o introdurre infrastruttura del tool. Il brief umano è già concreto; non si arresta l’implementazione per un’intervista o una scelta estetica ulteriore.

Realizzati token/materiale in `progetto/acasystem/design/themes/liquid-glass/`, con catalogo HTML/JS locale e guida. Default condiviso applicato da `design/index.css`; webapp tramite shim default separato e label Aspetto aggiornata, shim Classico collegato al suo ingresso stabile. Classico e sorgenti Metallo/Kit2 non alterati. Le copie dei consumatori si generano con gli strumenti già presenti; nessuna dipendenza o modifica ai dati.

Pannelli controllati al 66% e popup/barre all’86% sopra immagini o contenuti arbitrari; nessun blur per tessera o controllo ripetuto. SideSheet resta il pannello piatto esistente senza MaterialLayers. La reference è acquisita byte per byte come UI-015, non importata nell’app. Il catalogo mostra campi/pulsanti/switch/dialog e fixture normali, lunghe e vuote; l’app vera si prova in `#/mockup` con HA simulato. La scelta visiva è la reference richiesta: non è stato introdotto un torneo di varianti o un selettore nel prodotto.

La revisione `animate` / `review-animations` e le prove di robustezza `break-ui`, insieme ad audit/polish di impeccable, hanno portato a correzioni dentro il tema: focus limitato al campo; ring errore conservato anche sul primary; specificità forced-colors non prevale sugli stati; confini dei campi più leggibili; overlay più coprente e specificità corretta con `:where(main.card)`. Nessun nuovo motore di gesti o animazione, nessun loop o blur/ombra animati.

Fonti esterne consultate il 2026-11-04: [MDN backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter), [MDN prefers-reduced-transparency](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-transparency). Il secondo è indicato come supporto limitato/sperimentale: il tema non promette rilevamento universale della preferenza. L’apertura delle HIG Apple ha restituito una pagina che richiede JS; nessuna ulteriore affermazione è dedotta da quel contenuto, distinta dalla skill locale apple-design effettivamente letta.

## Verifiche ed evidenze

| Controllo | Esecuzione ed esito | Evidenza e limiti |
|---|---|---|
| Web e tipi strict | `npm run build -w frontend` PASS, build finale dopo le correzioni CSS | `backup/rep035/frontend-build-final.log`; warning chunk >500 kB, senza nuove dipendenze. |
| Windows / Android | `npm run build` nei due workspace PASS | Log finali in `backup/rep035/`; risorse e compilazione Windows, web Android. Non APK installato o prova Electron/hardware. |
| Design condiviso | `node --test design/copy-assets.test.mjs`, 6/6 PASS | Classico conserva il grafo originale; default/shim Liquid e copia completa delle risorse verificati. |
| UI condivisa | `npm run typecheck:ui` e `npm run test:ui`, 3/3 PASS | Confini UI/React e compilazione degli ingressi comuni conservati. |
| Account/Aspetto/Sistema | Appearance + SystemPage: 28 PASS, 1 failure preesistente | `SystemPage.test.tsx:261`: ricerca `/indirizzo/i` trova una didascalia QR; non dipende dal nome tema. Nessuna correzione estranea applicata. |
| Lint | Colori 0/596; lint effettivo dei 4 moduli TS/TSX modificati PASS | Prima invocazione ESLint dal cwd frontend ignorava i file: non contata come controllo. Ripetuto dalla base comune con config esplicita e percorsi `frontend/src/...`. |
| Tipografia | 1 failure preesistente | `connect.css:157`, peso 600: file byte-identico al checkpoint. Due primi comandi lint chiamati dal workspace errato mancavano dello script; corretti con `-w frontend`. Confronto con il debito [ISSUE-134](../project-status.md), non suite generale dichiarata verde. |
| App reale simulata | 16 viste PASS: accesso, Home, Sistema, popup, dati lunghi/estremi, 320/390/1366, testo ingrandito | `qa-liquid-glass-results.json`; Chromium headless/Vite loopback, 0 overflow, filtri annidati, richieste esterne o comandi HA nel campione. |
| Fallback e preferenze | 5 scenari PASS: fallback opaco, trasparenza ridotta, contrasto, forced-colors, movimento ridotto | `qa-liquid-accessibility-results.json`; fallback simulato disattivando gli enhancement @supports, non vero browser privo della proprietà. Le preferenze supportate sono emulazioni Chromium, non collaudo di ogni OS. |
| Kit e QR | 15 viste PASS, interazioni mouse/tastiera, Escape/focus, dati normali/lunghi/vuoti e zoom | `qa-liquid-kit-qr-results.json`; QR con URL .19 e quiet zone 4 moduli, confronto con generatore esatto, non decodifica hardware indipendente. |
| Audit stati/movimento/contrasto | Approve per il delta esaminato | `motion-review.md`: primary/error, campi, focus, stati forced-colors, priorità utility; Sheet/Popover reali aperti al 86% e blur 12 px, SideSheet esclusa. Campioni di contrasto, non certificazione generale. |
| Prestazioni | Stima desktop quieta: 90 campioni rAF, mediana 16 ms, p95 17 ms, 0 intervalli >50 ms | Headless/dev e pagina ferma dopo riscaldamento: non misura scroll, drag o GPU M11. Nessuna equivalenza a prestazioni del tablet. |
| Hardware | Non eseguito | Inventario ADB: nessun dispositivo collegato. M11, Safari/iPhone e Android fisici restano da verificare. |

I primi tentativi di harness sono conservati separatamente: CSS Vite inlined non intercettato dal primo fallback; attesa dell’uscita nativa del dialog; server QR inizialmente spento e poi avviato. Corrette le fixture/attese, nessun finto PASS attribuito ai tentativi falliti. La prova finale mirata dei popup dopo l’overlay86 è separata dalla prima matrice.

Rapporti campione: testo principale 14,80:1 sul solido, muted 5,96:1 sul fondo canonico, bianco 4,86:1 sul punto chiaro del primary; muted su overlay86 sopra nero circa 5,4:1. Confine campo composito circa 3,52:1 sul fondo campione. Questi valori non certificano ogni widget/stato/contenuto possibile.

Confronto delle copie generate, integrità degli originali, collegamenti e delta finale: `backup/rep035/`. Nessuna modifica del banco, delle password, dei token o dei profili reali. Un avvio tramite Start-Process è stato respinto dalla policy; i server locali sono stati avviati con sessioni exec controllate, senza elevazione o installazioni.

## Chiusura e punto di ripresa

Consegnati tema applicato ai sorgenti e build locali, catalogo interattivo e anteprima QR. Punti di prova: kit `http://127.0.0.1:4183/themes/liquid-glass/kit.html`, app simulata `http://127.0.0.1:4182/#/mockup`, QR `http://127.0.0.1:4178/`. Server limitati al loopback; non sono la centrale sulla porta 3002.

Nessun incarico software ulteriore attivo da questa richiesta. Resta da misurare l’effetto su M11 reale e verificare Safari/Android hardware; per il tablet confrontare la stessa schermata ferma, scroll e apertura popup in più acquisizioni, con filtri attivi e fallback opaco, senza comandi fisici. Pubblicazione, aggiornamento del banco e integrazione boot HAOS restano operazioni separate. Nessun commit creato.

## Seguito autorizzato, 2026-11-04

La successiva richiesta umana assegna l’aggiornamento del banco PC mantenendo account/profili. [REP009](REP-20261104-009-banco-liquid-glass.md) lo completa alla0.9.42/r99 con backup verificato,27tabelle e identità immutate, HA/D1 senza riavvio e tema reale controllato. Questo seguito supera la sola limitazione di installazione locale alla chiusura sopra; pubblicazione e hardware rimangono distinti.
