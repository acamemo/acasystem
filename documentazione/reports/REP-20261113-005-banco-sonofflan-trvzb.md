# Collegamento di prova SONOFF TRVZB tramite SonoffLAN

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261113-005 |
| Stato | Completato: installazione, collegamento eWeLink e widget confermati funzionanti dall'utente |
| Data | 2026-11-13, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit di partenza | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69` |
| Richiesta di riferimento | Continuazione di «quindi come ci vogliamo muovere? che facciamo?». Dopo la procedura proposta, l'utente conferma alimentazione/Wi-Fi/eWeLink già configurati, termovalvola associata e modello «TRVZB», identificativo firmware «SN-MG22-TRVZB-01». Identificativo univoco del dispositivo omesso dalla documentazione. |
| Autorizzazione / interpretazione del perimetro | Preparazione del collegamento di prova sul banco HA, nel percorso SonoffLAN già proposto e proseguito dall'utente. Questa è una continuazione operativa dell'incarico, non una dichiarazione di autorizzazione separata testuale a ogni comando. Accesso eWeLink completato dall'utente nell'interfaccia locale; nessun comando fisico dell'agente, flash o aggiornamento Core. Correzione del campo password necessaria al percorso richiesto, già oggetto della precedente richiesta umana di maschera/occhiolino; nessuna funzione ACA nuova. |

## Obiettivo e perimetro

Rendere disponibile sul banco il percorso SonoffLAN per il bridge originale e la termovalvola TRVZB. Conservare immagine HA, dati/account e profili ACA. Riprendere le evidenze del [REP004](REP-20261113-004-compatibilita-sonoff-zbbridge-p.md), distinguendo compatibilità esterna, installazione, login e prova fisica. Il piano iniziale conservava ACA .71: la verifica ha poi trovato un difetto nel campo password che ha richiesto la sola correzione descritta sotto, distribuita come .72.

894 voci Git preesistenti conservate all'avvio; nessun commit o pulizia. Nessuna installazione di HACS necessaria: usare il componente SonoffLAN originale e versionato. Materiali operativi locali in `backup/rep086/`, esclusi da Git. Password, chiavi, elenco dei dispositivi e dati eWeLink non fanno parte delle evidenze versionate.

## Criteri di completamento

- Supporto TRVZB confermato su sorgente primario v3.13.3; compatibilità preliminare con HA 2026.9.4 qualificata.
- Pacchetto acquisito dal tag, file controllati e prova isolata prima dell'installazione.
- Backup HA a freddo integro e rollback circoscritto documentati prima di mutazioni.
- Componente presente e importabile senza aggiornare HA o firmware e senza modificare la rete per iniziativa propria. Correzione strettamente necessaria del campo password ACA, con regressione prima/dopo e conservazione dei dati.
- Login eWeLink eseguito solo dall'utente e controlli del dispositivo distinti dall'installazione. Eventuali dipendenze umane restano esplicite.

## Avanzamento e modifiche

### Supporto effettivo del dispositivo

SonoffLAN **v3.13.3**, commit tag `3f329db36477fcc6ebc148db7b35e1187c20097d`, acquisito dal progetto ufficiale. ZIP124522byte/SHA`f4f11279fc37dc51464fc6d5e3e0118cec42e024be41073afa9b4f35eb72e532`; percorsi controllati prima dell'estrazione. Copiati48file originali, tutti uguali alla sorgente, senza patch del componente.

La TRVZB è UIID7017, famiglia climate, **solo cloud in questa integrazione**. La riga LAN del bridge non estende il controllo LAN ai figli: `can_local()` esclude i figli dello ZBBridge-P; `auto` non rende la valvola indipendente da Internet. Informazione comunicata all'utente prima dell'accesso. Controlli previsti dal codice: manuale/heat, eco/off e auto, setpoint4–35°C/passaggio0,5°C, temperatura e batteria secondo dati restituiti. Non sono ancora letture osservate sull'esemplare.

Fonti primarie consultate2026-11-13: [elenco dispositivi](https://github.com/AlexxIT/SonoffLAN/blob/v3.13.3/DEVICES.md), [climate](https://github.com/AlexxIT/SonoffLAN/blob/v3.13.3/custom_components/sonoff/climate.py), [registri/LAN](https://github.com/AlexxIT/SonoffLAN/blob/v3.13.3/custom_components/sonoff/core/ewelink/__init__.py), [config flow](https://github.com/AlexxIT/SonoffLAN/blob/v3.13.3/custom_components/sonoff/config_flow.py).

### Installazione HA

Prova isolata sullo stesso imageID HA, senza rete o volumi domestici: **17 moduli importati, PASS**, Core2026.9.4. La prima prova emetteva il warning di ordine import voluptuous; ripetuta con `homeassistant` importato per primo come nel runtime, senza warning. Nessun aggiornamento Core o pacchetto Python.

HA fermato e copia completa a freddo `/config` creata in `backup/rep086/ha-config-pre-sonofflan.tgz`: **226043byte**, SHA`1dd84ca9ff06730d67455e8ef819ab06fe1b0456db8fd26a3d4659a130403b2f`. Estrazione isolata,33file identici e SQLite integro; auth, provider e config entries presenti. Archivio contenente segreti conservato soltanto nel backup ignorato, senza stamparne i contenuti. Componente copiato in `/config/custom_components/sonoff`, stessa immagine/container/mount/rete HA riavviati. Confronto tramite digest dei dati JSON selezionati: utenti/credenziali di auth e dati provider/config entries invariati prima dell'accesso eWeLink. Non è un confronto byte-per-byte dei tre file completi né dei token HA esclusi dal digest auth. Identità/profili/sessioni ACA nelle sei tabelle controllate invariati.

### Difetto necessario da correggere prima delle credenziali

Sonoff dichiara `password` come normale stringa Voluptuous. La serializzazione del banco è rappresentabile da ACA, ma il modello generico la classificava come testo, mostrandola senza maschera e rimuovendo gli spazi iniziali/finali. Il difetto è stato riprodotto su fixture derivata dallo schema reale, **prima di chiedere la password all'utente**.

Applicazione circoscritta della richiesta umana già presente in chat di usare mostra/nascondi «in campi come la password»: `backend/src/services/devices/flowModel.ts:273` riconosce il nome standard `password` nel ramo stringa. Riusa il tipo password e la primitiva con occhiolino già esistenti; nessun componente nuovo. Due test verificano schema Sonoff, maschera/occhiolino e payload con spazi conservati, usando soltanto valori finti. Una riga runtime e29righe per ciascun test; nessun cambio EOL/dipendenze/contratti. Snapshot precedente e delta esatto in `backup/rep086/password-before/` e `password-source-delta.patch`.

### Consegna locale e aggiornamento ACA .72

Fonte2003file/SHA`7acad0170acfa74af2465e599a50b01ab19fc7caa15be90873acadfef33a264d`: differisce dalla .71 soltanto nei tre file sopra. Frontend ricostruito con versione .72; nessun cambiamento grafico o comportamento widget assegnato. ZIPweb110file/SHA`37c7c5de36e3e571e6a5b95655ddaee4198b4242c768b71e95bc9e23bf60248d`, entry`index-bVHxi_72.js`/SHA`32f7438ffa0880746b38a6ae8d11ae62b16f066ac1e612ce51f00369e7108c9b`.

Base derivata dall'immagine live .71 e preservata negli strati, con il solo runtime `flowModel.ts` nuovo e dist .72. Il primo `FROM sha256:<imageID>` è stato interpretato da BuildKit come nome repository e ha fallito prima della build; corretto usando il tag locale verificato contro l'ID prima/dopo, senza effetto sul banco. Wrapper preparato dagli strumenti esistenti, senza installazioni/pull di pacchetti: **`ghcr.io/acamemo/acasystem:0.9.72.99`**, ID`sha256:9cf608acd9f3139037b657cb9ce9ed263c4deae4c30b1c796fcae280277f9bf7`. Client bundle e sorgenti/provenienza rigenerati, nessuna pubblicazione.

Prima del cambio ACA: backup freddo225853byte/SHA`cc901cbdb81b74f9abec8f18d229578669910e82ff2b451312b22ab20732dc88`, SQLite integro e27/27tabelle corrispondenti. Segreto tecnico conservato nel volume separato, escluso dal tar. Catena precedente23Compose con sola aggiunta di `backup/rep086/compose-widgets-local.yaml`: validazione ammette soltanto immagine/versione. Ricreato soltanto ACA; confronto immediato27/27tabelle esatte, auth HA e sei tabelle identità ACA invariate. HA e D1 non riavviati durante questa seconda operazione, mount e rete ACA conservati.

## Verifiche ed evidenze

| Controllo | Procedura / evidenza | Esito | Limiti |
|---|---|---|---|
| Supporto TRVZB | Sorgenti upstream v3.13.3 | Confermato dal progetto | Percorso cloud, non collaudo fisico |
| Import HA | `preflight.py`, container isolato |17moduli PASS | Nessun account eWeLink o rete reale |
| Backup/installazione HA | `verify-backup.py`, `install.py`, `installed-files.json` |33file backup/48componente esatti, SQLite PASS | Archivio privato ignorato |
| Regres. password | `password-change-summary.json`, quattro log test/strict | RED originale;71backend+9frontend e strict backend/frontend PASS | Fixture senza credenziali reali |
| Build e immagine | buildfrontend, `build-password-base.mjs`, `audit-password-image.mjs` | Fonte esatta;228file immagine/110frontend, smoke isolato e passwordKind PASS | 0volumi reali, rete none; warning bundle grande preesistente |
| Cambio ACA | `Update-WidgetBank.ps1`, `update-result.json`, `backup-table-audit.json`, `sqlite-preservation-after.json` | Backup integro,27/27tabelle esatte prima/dopo | Verifica immediata; normale attività successiva può aggiornare cache/log |
| Runtime installato | `final-preservation.json` | .72healthy/casa ready, entryHTTP esatta, passwordKind effettivo; HA/D1 conservati | Non è il login umano né una verifica di causalità fisica |
| Revisione indipendente | Letture selezionate runtime, fonte, immagine e componente |2003fonti,118backend/contratti+110frontend e48file Sonoff esatti | Dati HA selezionati, non interi file auth; prove fisiche distinte |
| UI reale | Browser integrato su3002 | Schermata Accedi osservata | Nessun bypass, credenziale inserita o modulo Sonoff aperto dall'agente |
| Accesso eWeLink / TRV | Utente conferma inserimento; lettura metadati registri HA |1entry Sonoff,3dispositivi (bridge+2TRVZB),2climate attivi/36entità | Letture dei registri distinte dalla prova d'uso |
| Inserimento e uso del widget | Risposta umana del2026-11-13: «inserito il widget, funziona tutto» | Confermato dall'utente | Risposta duplicata conteggiata come una sola conferma; nessuna misura strumentale o sequenza di comandi fisici specificata |

I controlli generali widget della .71 non sono stati ripetuti: nessun loro runtime cambiato. Il debito storico ISSUE-134/161 resta distinto; nessuna CI generale verde dichiarata.

## Controllo del diff e decisioni

Il piano iniziale non prevedeva codice ACA; la verifica ha reso necessaria la correzione del solo campo password prima del collegamento richiesto. Motivazione e risultati sopra, preservando la traccia del piano iniziale. Nessun adattatore Sonoff per il pannello Gateway Zigbee, famiglia nuova, modifica rete, aggiornamento Core o firmware. Confronto dei sorgenti con la .71: soltanto modello del flow e due test pertinenti. Nessun commit o distribuzione pubblica.

## Chiusura e punto di ripresa

Installazione e preparazione sicura completate. L'utente ha eseguito il collegamento e segnala «il widget non è stato inserito». Letture selezionate successive dei registri HA confermano1entry Sonoff con credenziali presenti (controllate soltanto come booleani, non stampate),3dispositivi,36entità di cui2climate attivi. Modelli:1ZBBridge-P e2TRVZB. Una lettura intermedia subito dopo l'accesso vedeva0dispositivi nel registro persistente; cache cloud già con3. La successiva persistenza conferma entrambi i termostati, senza riavvii, nuove configurazioni o ripetizioni del login. Nessun errore setup/login rilevato nel campione selezionato del log; nessun contenuto personale/log grezzo esportato.

Poiché l'integrazione espone più dispositivi, il comportamento previsto di `DiscoveryContent.finishFlow` conserva la lista anziché scegliere un widget arbitrario. È stata quindi richiesta la scelta della valvola in Trova → Pronti e Conferma del posizionamento. Non è stata assegnata una nuova creazione automatica del widget per tutti i figli del bridge.

Dopo la lettura dei registri, richiesto all'utente Trova → Pronti → eventuale Aggiorna → «Crea il widget» sulla valvola → anteprima Home → Conferma. **L'utente conferma il2026-11-13: «inserito il widget, funziona tutto».** Inserimento e prova d'uso risultano quindi riusciti secondo la fonte umana. Non vengono dedotti specifici setpoint, misure fisiche, causalità o funzionamento senza Internet: la TRVZB resta sul percorso cloud eWeLink. Nessuna nuova associazione/reset della valvola né comando fisico impartito dall'agente. Incarico concluso; nessun lavoro operativo residuo assegnato.

Rollback ACA: mantenere la catena precedente fino a rep085 e rimuovere soltanto rep086; immagine .71 conservata. Rollback SonoffLAN: fermare HA e rimuovere solo la nuova cartella del componente, dopo verifica del percorso; per eventuale recupero completo usare il backup fresco di questo intervento, non volumi HA storici che potrebbero non corrispondere all'identità tecnica ACA corrente. Nessun rollback applicato.
