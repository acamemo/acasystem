# Widget adattivi con gesti, dettagli e configurazione

| Campo | Valore |
|---|---|
| Stato | Completato e verificato nel kit locale |
| Data | 2026-10-14 |
| Autore | Codex |
| Richiesta/autorizzazione | Implementare il piano «Widget adattivi con controlli gestuali, dettagli e configurazione», approvato esplicitamente in questa chat. |
| Commit di partenza | 7298d4df0d33bc92123517776d9ebc7c12ecefa6 |

## Perimetro

Solo 20 concept della galleria UI kit, con dispositivi simulati: capacità tipizzate condivise, dimensioni progressive, dettagli completi, configurazione di dispositivo/visibilità/ordine, stato locale e gesti verticali. Riutilizzare le primitive. Preservare modifiche preesistenti. Nessun cambiamento a widget operativi, HA, Copertina, API operative, dipendenze, Scenari o banco Docker; nessun commit/deploy.

## Criteri

Copertura di tutti i concept; gesto 6 px/160 px, limiti e ciclo tonalità, annullamento e tastiera; selezione/ordine conservati nelle viste grandi; capacità del dispositivo simulate e salvataggio/annullamento; responsive 390/1280/1920 px; controlli statici, test con quattro processi, build e browser senza GPU separato dai test. ISSUE-063 è trattata solo nella simulazione: non si dichiara copertura HA su dispositivi reali.

## Avanzamento e verifiche

## Modifiche

- Nuovo modello locale tipizzato `widgetDesignModel.ts`: capacità e profili dei 20 concept, preferenze compatibili, valori iniziali, range/unità/passi e ciclo tonalità. Profili luce RGB/bianco/sola accensione; altri esempi completi/essenziali dove pertinenti. Sono fixture dichiarate, non inventario HA.
- `GestureControl.tsx` riusa i riferimenti 6 px/160 px del controllo luminosità operativo, senza modificarlo: cattura puntatore, anteprima, rilascio/annullamento, soppressione click, frecce/Home/End, feedback grigio→accento, tonalità reale dell'icona colore e bianco caldo/freddo. Slider e +/− nei dettagli.
- `WidgetDesignSpecimen.tsx`: card, dettagli e configurazione usano gli stessi valori; quattro dimensioni con ResizeObserver e correzione del numero di controlli in base all'altezza realmente occupata. Solo i selezionati anche a pagina intera; scorrimento interno della vista Pagina. Liste attività abbreviate nelle card piccole e complete nei dettagli.
- Sheet dettagli/configurazione con salvataggio e annullamento, visibilità/ordine, cambio dispositivo, stati simulati e focus ripristinato. PIN di esempio non salvato per le azioni di serratura/allarme. Nessuna protezione di ruoli operativi introdotta.
- Galleria: sessione in memoria preservata tra filtri, nessuna scrittura di profili o localStorage. Rimossi soltanto i layout dei concept precedenti sostituiti dalla nuova composizione.
- Corrispondenza dei controlli: sensore 8, luce RGB 7, ventilatore 5, tapparella 8, stanza 8, clima 11, serratura 3, videocamera 9, allarme 4, Android/Apple TV 14 ciascuno, multimedia 16, Sonos 21, aspirapolvere 13, tosaerba 8, auto 9, attività 1 gruppo con gestione lista, costi/prezzo energia 4 ciascuno, separatore 2. Il profilo essenziale riduce le capacità. Alcune azioni hanno esiti dimostrativi testuali: non sono operazioni su media/file/dispositivi reali.

## Verifiche ed evidenze

| Controllo | Esito e limiti |
|---|---|
| `npm run typecheck`, `npm run lint` | Superati. |
| `npm run lint:typography`, `npm run lint:theme-colors` | 0 violazioni: 434 e 308 file. |
| Prettier sui file del kit e test pertinenti | Superato. |
| `npm run test -- --maxWorkers=4 src/__tests__/WidgetDesignGallery.test.tsx src/__tests__/WidgetDesignModel.test.ts src/__tests__/WidgetGestureControl.test.tsx src/__tests__/MetalKit.test.tsx` | 4 file, 25/25 test, 23,11 s. I primi giri hanno rilevato nomi corrotti nell'encoding dei test e una query non limitata al dialogo: corretti, suite finale verde. |
| `npm run build` | Superato dopo le correzioni finali; galleria lazy circa 26,8 KB. Resta l'avviso Vite su hls >500 KB, estraneo al lavoro. |
| Browser Chromium senza GPU, 390/1280/1920 px × Compatta/Standard/Grande/Pagina × 20 concept | Nessun overflow orizzontale o verticale con le selezioni iniziali. Il fit evita l'eccesso di controlli nella card Clima Standard. |
| Selezione di tutte le capacità di Luce, Clima, Sonos, Aspirapolvere, Attività a 390 px | Card piccole adattano il numero visibile; Pagina mostra tutti i selezionati e scorre internamente quando necessario; nessun overflow orizzontale. |
| Gesti nel browser | Luminosità 65→40 con 40 px verso il basso; hue 250→70 con 80 px verso l'alto; luminosità resta 40. Cursore dettagli mostra lo stesso valore. Annullamento e pointer capture loss coperti dai test. |
| Dettagli e configurazione | Tutti i 20 pannelli aperti; hue escluso dalla card resta nei dettagli, ordine salvato power→brightness; profilo bianco esclude hue; indisponibile/attesa/errore bloccano i controlli e disponibile li riabilita. Focus torna al pulsante Dettagli; Escape chiude. |
| Movimento ridotto | Transizione dell'icona a 0 s; feedback colore/valore preservato. |
| Ispezione screenshot e detector | Card Luce/Clima/Videocamera e pannelli su telefono ispezionati. Detector senza rilievi. Evidenze in `backup/adattivi-*.png`, script `backup/check-adattivi*.cjs`, esclusi da Git. |

## Chiusura e punto di ripresa

Completato nel kit: `http://127.0.0.1:5173/#/ui-kit?tab=widgets`. Preservate le modifiche preesistenti, originali e widget della Copertina. Nessuna nuova dipendenza, API operativa, chiamata HA, Docker, deploy o commit. Suite completa e prova con dito sul tablet non eseguite; il banco 3002 non include il lavoro.

Il prossimo passo è il parere umano su dimensioni e gesti. L'integrazione con entità e servizi reali, permessi del sistemista e Scenari richiede incarichi distinti; ISSUE-063 resta aperta per la copertura operativa.
