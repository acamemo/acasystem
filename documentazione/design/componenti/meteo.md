# Meteo e Meteo di casa

Modo: **Operate**. Richiesta umana del 2026-11-12 «procedi», dopo la proposta di completare insieme le due varianti. Attuazione completata e verificata localmente nella .69, registrata nel [REP001](../../reports/REP-20261112-001-area-meteo.md), coerente con REQ-18/19 e ADR-0049. Design ACA Vetro Bianco, primitive e transizioni condivise, senza nuovo tema o blur.

## Fonti e compatibilità

`weather` conserva `weatherId`, il sensore opzionale `tempId`, `subtitle` e `graphHistoryHours`. Una sola associazione condivisa si presenta dalle impostazioni della categoria e dei widget storici. I selettori si chiamano **Fonte meteo** e **Temperatura locale**. Si accettano fonti `weather.*` e sensori di temperatura riconosciuti dai metadati: classe temperature oppure, se la classe manca, unità nativa °C/°F/K. Il nome dell’entità non ne dimostra la funzione. Un sensore momentaneamente indisponibile può rimanere associato.

`cover_weather` conserva il tipo e l’identità del widget. Senza override `weatherId`, mantiene la fonte automatica già esistente: elenco degli ID weather ordinato, preferendo fra weather.home e weather.forecast_home la prima voce in quell’ordine; se assenti, prima fonte dell’elenco. La scelta manuale vale per quel widget. **Automatica della casa** cancella soltanto l’override weatherId; non cancella tempId né modifica altri widget o la Copertina. Nessuna richiesta di geolocalizzazione, ricerca per nome della città o fetch verso un provider aggiunto da ACA. La Copertina autonoma conserva la sua politica automatica.

Un riferimento esplicito assente, incompatibile o malformato resta nei dati ed è visibile come collegamento da correggere. Non si devia silenziosamente verso un’altra fonte. Nessuna pulizia al mount, conversione dei profili o rimozione di integrazioni HA. L’utente sceglie una sostituzione o scollega soltanto ACA.

## Uso quotidiano

La tessera raccoglie condizione, temperatura e nome della fonte con una gerarchia leggibile; le varianti compatte riducono i dettagli. La schermata completa usa la stessa lettura per entrambi i tipi, espone le previsioni e mantiene fonte e informazioni tecniche secondarie. Le unità sono quelle pubblicate da HA, con il sistema della centrale come fallback soltanto per i valori meteo che HA espone in quel sistema. La temperatura locale mantiene l’unità propria; non viene rietichettata con quella della previsione.

Previsione oraria e giornaliera sono viste distinte secondo capacità e risposte effettive. TWICE_DAILY non viene rinominata giornaliera. Quantità e probabilità delle precipitazioni restano grandezze distinte; temperatura minima, condizione e orario non sono completati usando i valori correnti. Gli attributi forecast storici rimangono un fallback riconoscibile, senza sostituire una risposta HA vuota valida. Nessun nuovo sottoscrittore meteo o endpoint.

L’eventuale andamento della temperatura locale mostra soltanto campioni realmente ricevuti, con unità compatibile e timestamp validi. Previsioni e storico non vengono saldati in una sola curva e il valore corrente non viene aggiunto come campione. Non si ricostruisce uno storico dal solo stato attuale. I grafici e gli intervalli disponibili dipendono dalle fonti, senza obbligare l’apertura della UI ad attendere dati remoti.

## Interazione e salvataggio

Ogni scelta invia soltanto la patch del relativo campo. Associazione, memoria e adozione della configurazione seguono le regole storiche in un’unica modifica. Per Meteo selezionato, weatherId resta l’identità; la variante di casa non diventa un altro prodotto fisico e non modifica i contratti condivisi delle quattordici famiglie.

Il form rimane bloccato fino al riscontro della centrale. La sola modifica della bozza non viene dichiarata salvata: offline, errore o ACK negativo conservano la bozza e richiedono un nuovo tentativo esplicito. Apertura, ricerca e cambio dei pannelli non salvano o comandano. Una risposta dopo chiusura, cambio profilo/editor o connessione non va applicata nel nuovo contesto; nessun reinvio automatico. I dettagli meteo sono di lettura, senza nuove azioni HA.

Attesa, errore e assenza di dati sono presentati senza sovrapporre messaggi. Risultati correnti ancora disponibili restano leggibili quando una richiesta di previsione fallisce. Nomi lunghi e unità vanno a capo, il formato compatto mantiene valore e unità leggibili; controlli, selettori e focus riusano le primitive comuni. Nessuna animazione di blur, sfondo o singole righe.

## Evidenze e limiti

Fonti primarie consultate il 2026-11-12: [Weather entity HA](https://contributors.home-assistant.io/core/entities/weather/), [Core 2026.10.4 weather](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/weather/__init__.py) e [capacità](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/weather/const.py). Non attestano la versione del banco o la compatibilità di ogni fornitore. Esiti finali, artefatti e limiti delle prove in REP001; aggiornamento del banco, pubblicazione e dispositivi reali sono operazioni distinte.


## Consegna locale verificata

126/126 test Meteo in sei file PASS; ultimi esiti pertinenti frontend: 572 PASS e due aspettative DEMO preesistenti su 574 casi/24 file, riprodotte sul checkpoint .68 esatto. 28 backend, strict frontend/backend/UI, build, tre test UI e sei asset PASS. Lint generale: sette diagnosi preesistenti invariate, tipografia una, colori zero. Questi risultati non costituiscono una CI generale verde.

QA sul pacchetto finale .69: sei flussi e sei riaperture a freddo PASS, incluse due selezioni pubbliche reali nell’interfaccia simulata con cambio fonte e ripristino, fonte solo giornaliera compresa. Cinque verifiche visuali PASS: le immagini del Gate2 sono riutilizzate esplicitamente dal Gate2b sullo stesso identico artefatto. Tessere con area fisica 122×122 e 48×48 verificate; niente collaudo di un telefono fisico o di un fornitore meteo reale. La ricarica fredda riguarda il seed della DEMO, non dimostra persistenza autenticata o sincronizzazione domestica.

Sorgenti: 1976 file, SHA256 `c97d9e72d4431676ffb7b5463afdf637d5313638c33301fb9e784d76fe9fe454`; 18 file modificati, nove nuovi, nessun rimosso o cambio EOL rispetto al checkpoint .68. ZIP web SHA256 `ee3948bcd6621ad79f704f87ffcbb9b18c38718c2abda48e7ec96875b9d8edde`. [Anteprima locale](http://127.0.0.1:4199/?screen=app#/mockup). Le prove sono simulate: account, profili, banco e HA reale non modificati; pubblicazione e installazione escluse. Copertura limitata alle viste oraria e giornaliera: twice_daily resta fuori dall’interfaccia del lotto. Nessun incarico software Meteo residuo entro questo perimetro.
