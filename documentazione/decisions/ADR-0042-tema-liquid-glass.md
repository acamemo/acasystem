# ADR-0042 — ACA Liquid Glass come tema predefinito condiviso

| Campo | Valore |
|---|---|
| ID e titolo | ADR-0042: UI kit e tema ACA Liquid Glass |
| Stato | Accettata dalla richiesta umana; implementata e verificata nel software/build locali in REP008. Hardware, banco e pubblicazione distinti. |
| Data e autore | 2026-11-04, Codex; nome esatto del modello non disponibile |
| Decisore e autorizzazione | L’utente: «realizziamo il nuovo ui kit tema liquid glass e applichiamolo, basiamoci su come è stato realizzato la reference». La fonte visiva è [UI-015](../design/componenti/originali/UI-015-liquid-glass.png); richiesta, brief e perimetro sono in [REP-20261104-008](../reports/REP-20261104-008-tema-liquid-glass.md). |
| Collegamenti | [Design](../design/design.md), [design condiviso](ADR-0032-design-condiviso-workspaces.md), [UI condivisa](ADR-0033-ui-movimento-layout-condivisi.md), [Casa 3D](ADR-0014-casa-3d.md), [schermo intero e interazioni](ADR-0016-schermo-intero-interazioni.md) |
| Sostituisce / sostituita da | Sostituisce [ADR-0039](ADR-0039-palette-fissa-tema-classico.md) soltanto per il tema predefinito e il rinvio del nuovo look; conservazione di Classico, palette controllata e dati storici restano valide. Successivamente sostituita da [ADR-0043](ADR-0043-vetro-bianco-banco.md) per materiale/default della build corrente del banco. |

## Contesto ed evidenze

ACA dispone di fonti comuni per materiali, font, primitive e movimento. ACA Classico conserva il materiale precedente come ingresso nominato. La nuova richiesta descrive il tema finora rimandato e ne autorizza la realizzazione e l’applicazione; non richiede una nuova architettura di componenti o un menu di temi.

UI-015 è un’immagine fornita dall’utente, acquisita senza adattamenti e registrata nel [catalogo con integrità](../design/componenti/README.md). Mostra una card traslucida sopra forme morbide colorate, bordi luminosi e azioni ben distinte. Autore originale, URL e licenza non sono accertati. L’immagine è una reference documentale: non viene importata nell’app come sfondo, asset o codice e non determina automaticamente nuovi campi, pulsanti o flussi.

Le skill locali impeccable, ui-ux-pro-max e apple-design sono ausili operativi richiesti dall’utente e consultati dal coordinatore; la ricerca di stile e il brief sono registrati in REP008. Non sono nuove dipendenze runtime, una certificazione di accessibilità o evidenza di prestazioni sui dispositivi.

## Decisione e scelte esecutive

**ACA Liquid Glass diventa il tema predefinito** dell’ingresso comune del design. ACA Classico rimane conservato e raggiungibile tramite il proprio ingresso esplicito, senza alterarne le definizioni per farlo diventare un alias del nuovo default. Non introdurre un selettore utente, nuove preferenze o conversioni massive dei profili.

Usare vetro satinato per i pannelli e un trattamento ottico più leggero per navigazione e controlli: superfici chiare traslucide, bordo luminoso sottile, ombre diffuse e riflessi CSS. Conservare viola ACA, font Inter locale, colori funzionali di allarme/errore/stato e personalizzazioni di avatar/copertina. Un fondo statico rende percepibile il materiale; non riattiva foto, wallpaper personalizzati o tema automatico/scuro.

Il trattamento liquid è **ottico e realizzato in CSS**, senza filtri di rifrazione SVG, risorse remote o nuove dipendenze. Limitare il blur ai pannelli principali a circa **10–12 px**, senza blur annidato nei loro controlli. Riflessi, gradienti e bordi possono suggerire la lente nei figli senza moltiplicare i filtri. Non animare blur, filtri o ombre; mantenere movimento ridotto e gli spostamenti di navigazione già governati dai relativi componenti.

Rimangono i vincoli di ADR-0014 e ADR-0016: nessun blur sugli overlay o sui contenitori della scena Casa 3D; in Light/Medium gli overlay restano piatti, senza ombre. Nessun filtro sull’intera cornice dell’app o sulle pagine. L’ingranaggio Sistema rimane statico, senza backdrop-filter o will-change aggiunti. Il nuovo tema non modifica il rendering della scena o i livelli di qualità.

Prevedere superfici opache quando il filtro non è disponibile e nei casi di trasparenza ridotta, contrasto aumentato o forced-colors. Focus, stati selezionati/disabilitati/di attesa ed errori devono restare distinguibili senza affidarsi alla trasparenza. Il QR conserva moduli neri, fondo bianco e quiet zone; né il codice né il testo sono sfocati o distorti.

Applicare il tema attraverso le fonti comuni a webapp, risorse HTML dei client e anteprima QR. Il copier esistente conserva import e font locali. L’anteprima QR non diventa per questo una schermata avviata da HAOS: l’integrazione al boot resta distinta.

## Alternative e motivazioni

Conservare solo Classico non attuerebbe la nuova richiesta. Duplicare tutte le primitive o introdurre una libreria esterna creerebbe fonti parallele non necessarie. Una rifrazione SVG o filtri su ogni controllo amplierebbero costo e fragilità senza essere necessari al brief: la scelta esecutiva è un tema condiviso con effetti CSS limitati e fallback.

## Conseguenze e confini

Cambiano la presentazione e il default del design; autenticazione, permessi, comandi HA, profili, bozze, layout logico e gesti restano quelli già autorizzati. I dati storici dell’aspetto rimangono recuperabili e non vengono riscritti per applicare il tema. I campioni e gli originali precedenti restano conservati.

Il materiale è atteso uniforme fra consumatori della fonte condivisa, ma la sua presenza nei sorgenti non prova che una distribuzione o il banco siano stati aggiornati. Pubblicazione, installazione domestica e avvio grafico HAOS non sono autorizzati da questa decisione. Nessuna garanzia di fluidità sul Lenovo Tab M11 viene dedotta dalla reference o da una prova emulata.

## Verifiche e revisione

Verificare gli ingressi default/Classico, la copia completa dei CSS e font, il contrasto, i fallback, focus e stati dei controlli; confrontare desktop e telefono, popup, navigazione e QR. Controllare assenza di blur annidato, esclusioni Casa 3D/ingranaggio e conservazione dei comportamenti esistenti. Build e controlli pertinenti devono distinguere regressioni introdotte e debito preesistente.

Esiti finali e limiti in [REP008](../reports/REP-20261104-008-tema-liquid-glass.md): build web/Windows/Android e controlli di copia/UI riusciti; 16 viste app e 15 kit/QR, più verifiche mirate dell’overlay finale. Un test Sistema e un controllo tipografico restano fallimenti preesistenti distinti dalle regressioni risolte del tema. Nessuna prova hardware M11, Safari/iPhone o Android fisico, nessun aggiornamento del banco o release. Una successiva richiesta di scelta tra temi, rifrazione diversa o nuovi comportamenti richiede un incarico identificabile; non deriva dalla sola presenza della reference.
