# Blocco 1 Home Assistant Cloud o relay ACA esperienza cliente e costi

Aggiornato: 2026-10-30. Fonte umana: [U24](../diario/2026-10-30.md#u24-home-assistant-cloud-o-relay-aca). [Ingresso](../README.md), [report](../../reports/REP-20261030-008-cloud-relay-esperienza-costi.md). Analisi completata; nessuna scelta commerciale, installazione, attivazione o modifica applicativa.

**Valutazione dell'assistente:** Home Assistant Cloud è la prima alternativa da valutare per avere un trasporto remoto già gestito e un prezzo pubblico prevedibile. Un relay ACA offre più controllo sull'esperienza, soprattutto se si desiderano anche account, inviti e assistenza interamente ACA; comporta sviluppo e gestione propri. Nascondere il frontend HA, da solo, non obbliga a costruire un relay.

Il vincolo umano è non mostrare HA nel percorso utente. Non è stato stabilito un divieto assoluto di mostrare un fornitore terzo nel pagamento o creare un account Nabu Casa: questo è un criterio ulteriore da distinguere. Nessuna delle due strade è già integrata e verificata nei client ACA. Fattibilità Android, identità/associazione, TLS e login restano quelli dello [studio U23](01-associazione-discovery-locale-remoto.md).

## Confronto sull'esperienza richiesta

| Aspetto | Home Assistant Cloud | Relay ACA da sviluppare |
|---|---|---|
| Apertura ordinaria di ACA fuori casa | ACA può usare API autenticate attraverso il tunnel HA; non occorre mostrare la dashboard HA per ogni comando. | ACA raggiunge la centrale attraverso il proprio connettore. |
| Primo collegamento senza configurare router/IP pubblico | Trasporto gestito esistente; va integrata o predisposta l'attivazione dentro il percorso ACA. | Connettore domestico uscente e associazione progettati da ACA. |
| Nessuna schermata HA anche durante attivazione/login | Da sviluppare e verificare; il normale percorso HA non lo garantisce. Non è dimostrato impossibile. | Da sviluppare anche qui: il solo relay non sostituisce utenti e permessi HA. |
| Account, inviti, recupero e pagamento tutti ACA | Non è un'offerta pubblica pronta verificata; integrazione e condizioni OEM restano aperte. | Libertà progettuale, con responsabilità del servizio a carico ACA. |
| API specifiche ACA oltre a HA | Non sono automaticamente esposte da una porta separata; serve adattamento. | Possono essere previste nel connettore, con autenticazione e autorizzazione proprie. |
| Gestione del servizio remoto | Infrastruttura del fornitore; integrazione e assistenza ACA restano proprie. | Disponibilità, aggiornamenti, identità, monitoraggio e supporto sono da organizzare. |
| Costo per il cliente | Tariffa pubblica per istanza; eventuale inclusione nel canone ACA non concordata. | Prezzo commerciale da decidere; il noleggio server non determina da solo il canone cliente. |

Nabu Casa documenta un tunnel TCP cifrato dalla propria infrastruttura all'HTTP HA e l'accesso agli add-on predisposti per Ingress. È quindi plausibile utilizzare REST/WebSocket da ACA senza aprire la dashboard; non equivale a raggiungere automaticamente ogni porta ACA. Fonte primaria: [Remote access Deep dive](https://support.nabucasa.com/hc/en-us/articles/25619268678557-Remote-access-Deep-dive), aggiornata il 2026-02-09, consultata il 2026-10-30.

Nel pacchetto ACA attuale, [config.yaml](../../../progetto/ha-app/repository/acasystem/config.yaml), righe 21-26, dichiara Ingress disabilitato e porta 3002. Lettura del 2026-10-30: l'adattamento delle API ACA non è già risolto dal solo abbonamento.

Il Core 2026.10.4 contiene API cloud amministrative per registrazione, login, recupero e gestione del collegamento. Consentono di studiare schermate ACA dedicate; sono evidenza dell'implementazione HA, non un contratto pubblico OEM stabile per fatturazione e gestione di tutti i clienti. Non attribuire automaticamente quei privilegi a ogni client. Fonte: [cloud/http_api.py al tag 2026.10.4](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/cloud/http_api.py), consultata il 2026-10-30.

Il [dominio personalizzato](https://support.nabucasa.com/hc/en-us/articles/26497540527517-Using-remote-access-with-a-custom-domain-for-Home-Assistant) è supportato, con configurazione nell'account Nabu Casa e DNS; non rende automaticamente propri di ACA email, checkout e recupero account. Fonte aggiornata il 2026-06-08, consultata il 2026-10-30. Non proporre tale configurazione manuale al cliente come se fosse il percorso semplice già richiesto.

## Prezzo pubblico Home Assistant Cloud per Italia e UE

Prezzi verificati il **2026-10-30**, IVA inclusa:

| Piano pubblico | Spesa |
|---|---:|
| Mensile | 7,50 € al mese |
| Annuale | 75 € all'anno, equivalenti a 6,25 €/mese pagati annualmente |

Dodici mensilità costano 90 €; il risparmio annuale è 15 €. È pubblicata una prova di 31 giorni senza carta. Fonte: [pagina ufficiale e listino](https://www.nabucasa.com/link/). Il vecchio URL pricing reindirizza qui; i dati EUR del contenuto HTML attuale sono stati letti direttamente, non desunti soltanto dall'indice del motore di ricerca. La pagina presenta Home Assistant Link e annuncia il cambio di nome per il 2 dicembre: questo studio conserva il nome usato nella domanda, senza anticipare quella data.

Il pacchetto comprende anche backup esterno, voce e altre funzioni: il suo prezzo non è quello di un puro relay. Un relay ACA dedicato al controllo remoto non le replica automaticamente. Hardware domestico, energia e connettività restano necessari con entrambe le strade.

Ogni **installazione HA richiede account Nabu Casa e abbonamento propri**; non è una tariffa per telefono della stessa istanza. Due istanze indipendenti richiedono due abbonamenti anche se sono nella stessa abitazione. La FAQ non prevede sconti multiistanza. Esempio aritmetico: 100 installazioni con piano annuale pubblico = 7.500 €/anno IVA inclusa, prima dell'eventuale lavoro ACA. Fonte: [FAQ account e installazioni](https://support.nabucasa.com/hc/en-us/articles/26178633145885-Can-I-use-a-single-account-for-multiple-Home-Assistant-installations), aggiornata il 2026-05-11, consultata il 2026-10-30.

Il servizio standard è presentato come B2C; la FAQ non offre l'aggiunta della partita IVA in fattura. Il listino non dimostra un contratto di rivendita sotto marchio ACA, gestione aggregata o prezzo all'ingrosso. Un accordo specifico resta non verificato, non escluso per principio. Fonte: [politica di fatturazione](https://support.nabucasa.com/hc/en-us/articles/26179753444381-Adding-VAT-ID-or-tax-information-to-invoices), aggiornata il 2026-09-01, consultata il 2026-10-30. Nessun fornitore contattato o accordo presunto.

## Costi relay ACA da tenere separati

| Voce | Contenuto | Stato del costo |
|---|---|---|
| Sviluppo iniziale | Connettori, associazione, account/recupero, autorizzazioni, integrazione HA/API ACA, riconnessione e verifiche Android/Windows. | Da stimare dopo il perimetro tecnico; nessun preventivo in euro o numero di ore affidabile già disponibile. |
| Infrastruttura | Macchine, indirizzi, archivio identità, ingresso remoto, backup, eventuale ridondanza. | Alcuni componenti illustrati sotto; architettura e capacità non dimensionate. |
| Servizi e variabili | Email, dominio, monitoraggio/log, traffico, eventuali identità/pagamenti gestiti. | Da quotare in base alle scelte; nessun piano gratuito assunto sufficiente. |
| Esercizio e assistenza | Aggiornamenti, allarmi, incidenti, recupero, supporto a utenti e centrali. | Ore continuative proprie o fornitore dedicato; non comprese nel prezzo di una VPS. |
| Prezzo al cliente | Eventuale canone, margine e servizi inclusi nel kit. | Decisione commerciale ancora assente. |

Non occorre un server per ogni cliente: un'infrastruttura condivisa può instradare più centrali, con isolamento degli accessi da progettare. Non è però misurato quante centrali sostenga una macchina, né quanto costi assisterle. I costi evitati nel Cloud diventano in parte lavoro operativo ACA.

## Due carrelli infrastrutturali illustrativi

Esempio con Hetzner in Germania/Finlandia, prezzo a mese intero, **IVA esclusa**; nessun prodotto acquistato o adottato:

| Componenti | Una VPS | Due VPS |
|---|---:|---:|
| CPX22 | 19,49 € | 38,98 € |
| IPv4 primaria, una per macchina | 0,50 € | 1,00 € |
| Backup, 20% del prezzo server | 3,898 € | 7,796 € |
| Totale componenti arrotondato | **23,89 €/mese** | **47,78 €/mese** |

Fonti primarie consultate il 2026-10-30: [listino server dal 15 giugno 2026](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/), [IPv4](https://docs.hetzner.com/cloud/servers/primary-ips/overview/), [backup e fatturazione](https://docs.hetzner.com/cloud/billing/faq/). Arrotondamento dell'esempio, non simulazione di una fattura reale. L'aliquota non è sostituita con quella delle pagine tedesche; il confronto con il prezzo consumer IVA inclusa richiede basi fiscali coerenti.

**Questi sono prezzi di componenti, non il costo di un servizio ACA completo.** Una macchina resta un punto unico di guasto; due macchine non danno automaticamente alta disponibilità. Mancano progettazione/prezzi di ingresso e failover, stato condiviso, servizi accessori e gestione. Nessuna capacità per 100 o 1.000 case, continuità o SLA è dimostrata da questi carrelli.

Il listino traffico indica 20 TB/mese inclusi per CPX UE; il riferimento pubblicato per eccedenze è 1 €/TB. Sono conteggiate le uscite secondo le regole del fornitore: non sommare automaticamente quote di macchine diverse. Fonti: [traffico Hetzner](https://docs.hetzner.com/robot/general/traffic/), [fatturazione](https://docs.hetzner.com/cloud/billing/faq/), consultate il 2026-10-30.

Il consumo dipende anche dagli aggiornamenti di stato e dalle sessioni aperte. Esempio solo aritmetico, senza video: 1.000 case a 1 KiB/s medio in uscita ciascuna per 30 giorni generano circa 2,65 TB; a 10 KiB/s diventano circa 26,54 TB. KiB = 1.024 byte, TB = 10¹² byte. Non sono misure ACA; restano CPU/RAM, socket, picchi di riconnessione e overhead da misurare. Telecamere/audio cambierebbero il profilo e richiedono un confronto separato.

## Come stimare il costo completo senza inventare un prezzo

Costo iniziale = ore di sviluppo e verifica × tariffa. Costo mensile = infrastruttura + servizi/traffico + ore operative × tariffa + assistenza. Per confrontare il prodotto nel tempo va aggiunta una quota dello sviluppo iniziale, scegliendo esplicitamente su quanti mesi ripartirla.

Esempio di budget **ipotetico dell'assistente**, non preventivo né dimensionamento: 100 €/mese destinati a infrastruttura/servizi e 8 ore operative al mese a 50 €/ora danno 500 €/mese prima di IVA, sviluppo iniziale e assistenza clienti. Ripartiti aritmeticamente su 100 case sarebbero 5 €/casa/mese per quelle sole voci. Non implica che 100 case richiedano proprio quel carico o quelle ore; volume e supporto possono far salire il costo.

Non confrontare i soli 23,89 € della VPS con cento abbonamenti completi e concludere che il relay sia già più economico. Mancano sviluppo, lavoro, equivalenza delle funzioni e basi IVA comparabili. Il costo marginale condiviso può diminuire al crescere dei clienti, ma il pareggio economico è ancora sconosciuto.

## Raccomandazione per continuare la discussione

Per **semplicità iniziale e costo prevedibile**, approfondire prima la fattibilità di Cloud con percorso ACA: attivazione senza schermate HA, sessioni e API ACA necessarie. Permettere eventualmente un account/pagamento Nabu Casa è una decisione distinta dal mostrare HA. Non è un incarico di attivare l'abbonamento o svolgere prove.

Se l'obiettivo diventa anche **un solo account e servizio interamente ACA**, il relay è la strada con maggiore controllo progettuale, purché siano previsti sviluppo e gestione. La sua valutazione va basata sul costo completo; il relay da solo non risolve login HA, permessi, certificati o fattibilità Android. Si può mantenere distinto il trasporto dall'identità della casa, ma neppure due trasporti alternativi sono già implementati o approvati.

Verifiche future tutte **NON ESEGUITE**: prototipo dell'onboarding senza UI HA, copertura HTTP/WebSocket di HA e ACA, revoca/rinnovo sessione, cambio LAN/remoto, carico e riconnessione simultanea, consumo reale senza video e ripristino dei dati del servizio. Prima di un uso commerciale servono condizioni del servizio e responsabilità operative definite; nessun accordo OEM, budget o canone cliente è stato accettato.

Analisi e memoria completate. Nessun account, acquisto, contatto esterno, installazione, servizio attivato o codice/configurazione modificati. Pin e materiali U11 invariati; iOS rinviato. Proseguire dalle domande dell'utente.
