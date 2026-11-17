# Prova del vetro bianco su paesaggio naturale

| Campo | Valore |
|---|---|
| ID / stato | REP-20261104-011 — Prova grafica pronta e verificata nel campione locale |
| Data / autore | 2026-11-04, Codex; nome esatto del modello non disponibile |
| Commit | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta | «tema considerando unico colore bianco, bg trasparente con radial blur e backdrop filter, ombra sui bordi bianca verso l’interno […] anche primitive, bottoni […] sfondo […] paesaggio naturale […] prova» |

## Perimetro e brief

Prova grafica sulle schermate/componenti reali, variante nominata `design/themes/glass-white/`, senza modificare autenticazione, dati, gesti, dipendenze o banco0.9.42. Il bianco con diverse opacità definisce pannelli, controlli e testo; colori funzionali e riscontri d’interazione conservati. Un paesaggio statico dietro rende visibile il vetro. La foto riceve un velo neutro per la leggibilità; niente sfondi animati, blur animato o shader di rifrazione.

Riflesso bianco interno, tinta trasparente, gradiente radiale del riflesso e backdrop-filter sui piani principali. Evitare filtri multipli sui singoli controlli annidati; QR non filtrato. Fallback opaco accessibile, preferenze riduzione trasparenza/movimento e vincoli Casa3D/gear conservati. Il paesaggio è generato con imagegen, salvato nel workspace e codificato WebP senza ritocco compositivo.

## Criteri

Anteprima navigabile di accesso, componenti, app dimostrativa e QR con il materiale unico. Verifica desktop/telefono, foto locale senza dipendenze remote, controlli e focus leggibili, fallback e assenza di cambiamenti del banco. Non estendere il verdetto ad hardware M11/Safari o a bug funzionali rilevati nell’audit010.

## Avanzamento

Asset generato con lo strumento image_gen integrato; originale conservato in `backup/rep038/landscape-original.png`. La variante è opt-in nel server di anteprima, non un nuovo selettore del prodotto. [Audit precedente](REP-20261104-010-audit-blocco-account-usabilita-movimento.md) separato: le sue proposte/criticità non sono implicitamente corrette da questa prova grafica.

Realizzata la variante opt-in con tinta bianca9%, controlli6%, bordo interno bianco e backdrop blur16px su pseudo-elementi principali mascherati radialmente. Maschera e riflesso non filtrano testo/QR. I controlli annidati non aggiungono filtri; restano esclusioni Casa3D/gear. Il velo neutro sulla foto è stato portato dal68% al58% per dare più presenza al paesaggio, con nuova misura del campione testuale. Nessun blur o sfondo animato.

Un server locale di anteprima usa le schermate/componenti della build reale0.9.42 con il nuovo ingresso CSS. Il proxy accetta solo la fixture FakeHA4184 identificata, senza fallback al banco3002; API in memoria e comandi fisici assenti. Barra di prova separata dal prodotto: Accesso, Kit, Casa dimostrativa e QR. Il paesaggio è un asset locale206122byte WebP SHA256 `2ad845944f28db72071ee412e0e7cc7f4674b002dc4b80ebda7c60360ddecc92`; originale PNG conservato, nessuna fonte fotografica remota.

## Verifiche ed evidenze

| Controllo | Esito e limiti |
|---|---|
| Risorse condivise | `node --test progetto/acasystem/design/copy-assets.test.mjs`,6/6PASS: nuovo ingresso/immagine inclusi e import locali risolvibili, default/Classico conservati. |
| Resa e interazioni |17viste nella matrice locale e6ricatture finali dopo velo58%/spazio header: kit/accesso1366/390/320, QR, Casa, preferenze e fallback.0overflow/annidamento dei filtri/erroriJS/esterne/mutazioni nel campione. |
| Filtri | Kit2pseudopannelli+nav; accesso1pseudopannello. Blur con maschera radiale, nessun filtro aggiuntivo sui controlli figli nel campione. Controllo CSS non è misura GPU/FPS. |
| Preferenze | Trasparenza ridotta, contrasto aumentato, forced-colors e fallback senza enhancement opachi con0blur; movimento ridotto0s. Emulazioni Chromium, non supporto universale o prova hardware. |
| Tastiera | Focus visibile nel kit; colorpicker signup verificato dopo readiness, Conferma→occhiolino→Personalizza, outline2px. Il primo dato focused:false era un’attesa insufficiente della fixture, non prova di un bug. |
| Contrasto | Campionamento pixel testuale sulle viste finali: minimo P95 osservato6,135:1, accesso7,293–9,097 nel campione. Non è rapporto minimo per ogni pixel/stato o certificazione: antialias, immagini arbitrarie e altri contenuti restano limiti. |
| Banco | Stessi ID, immagini e StartedAt di ACA/HA/D1 rispetto alla verifica post-installazione .42; `bank-unchanged.json`. Nessun account, profilo o volume reale toccato. |

Evidenze, script, impronte e screenshot in `backup/rep038/`; audit e limiti ulteriori nel relativo handoff QA. Il titolo kit inizialmente passava sotto la barra mobile dell’anteprima: corretto solo lo spazio del chrome di prova, senza modificare il layout del prodotto. Non sono state rieseguite le regressioni funzionali dell’audit010, né le sue criticità sono dichiarate risolte. M11, Safari/iPhone e Android fisici non collaudati; popup sopra media arbitrari e costo dei filtri richiedono ulteriori prove prima di una promozione generale.

## Consegna e punto di ripresa

[Anteprima navigabile](http://127.0.0.1:4185/), [Kit](http://127.0.0.1:4185/kit), [Casa dimostrativa](http://127.0.0.1:4185/?screen=home#/mockup), [QR](http://127.0.0.1:4185/qr). Fonte e istruzioni: [Glass White](../../progetto/acasystem/design/themes/glass-white/README.md); [asset e prompt finale](../../progetto/acasystem/design/themes/glass-white/asset-origin.md).

La prova richiesta è completata; attendere il riscontro grafico dell’utente, senza promuovere autonomamente la variante al default o reinstallare il banco. Il banco rimane alla0.9.42 Liquid Glass precedente e la release pubblica alla0.9.34. Nessuna nuova produzione/build immagine o pubblicazione effettuata. I difetti funzionali aperti in ISSUE-145 sono un incarico distinto da questa prova del materiale.

## Annotazione successiva — 2026-11-04

L'utente riferisce che la resa precedente gli piace e richiede di vedere l'intera interfaccia ACA, aggiungendo poi ingressi animati simili al proprio keyframe. Nuovo incarico [REP012](REP-20261104-012-interfaccia-completa-vetro-bianco.md): lo stesso URL4185 ora apre direttamente la Home dimostrativa, con il menu di prova collassato in basso. Questa evoluzione non altera retroattivamente i risultati della prima matrice e non aggiorna il banco con i dati reali.
