# Pubblicazione ACA 0.9.33

| Campo | Valore |
|---|---|
| ID | REP-20261102-003 |
| Stato | Completato: immagine, catalogo e release pubblici; download anonimi verificati |
| Data | 2026-11-02, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit locale di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta / autorizzazione | U38: «Sì, pubblica la versione 0.9.33», in risposta alla domanda esplicita su repository pubblico acamemo/acasystem-releases, immagine ghcr.io/acamemo/acasystem, sorgenti, bundle web e script HAOS già preparati |

## Obiettivo e perimetro

Pubblicare i materiali locali verificati in [REP-20261102-002](REP-20261102-002-ripristino-client-mini-pc-e-onboarding-web.md), nell'ordine immagine GHCR, catalogo HA e release GitHub. Aggiornare le istruzioni e il changelog del catalogo al comportamento già implementato. Preservare le numerose modifiche preesistenti e il checkpoint VM; nessun refactor, nuova build applicativa, aggiornamento dipendenze, installazione su mini PC o avvio VM. L'autorizzazione riguarda il repository di distribuzione; nessun commit del workspace locale richiesto.

## Criteri di completamento

1. Immagine 0.9.33 pubblicata e scaricabile senza credenziali; digest remoto registrato.
2. Catalogo pubblico aggiornato a 0.9.33 soltanto dopo la disponibilità dell'immagine, preservando gli altri file del repository.
3. Release v0.9.33 con manifest, bundle web, sorgenti, bootstrap e istruzioni/checksum corrispondenti ai file locali. Nessuna release incompleta resa latest.
4. Download pubblici e hash verificati; documentazione di stato/guida/diario aggiornata. Limiti del collaudo fisico invariati.

## Avanzamento e modifiche

Verificati HEAD e stato Git, repository pubblico e permessi del connettore. Immagine linux/amd64 pubblicata con `docker push ghcr.io/acamemo/acasystem:0.9.33`: digest **sha256:99816f0c8d9751d0f920d910608e74b7e54ae1b03b96e6fa385ac62fe112c9e2**. Accesso anonimo al manifest OCI e SHA dei suoi byte verificati prima di promuovere il catalogo.

Catalogo aggiornato tramite connettore GitHub, preservando gli altri file: `acasystem/config.yaml`, `CHANGELOG.md`, `DOCS.md`. Commit remoto **6171905ee7c2e82b81c8f28097a935ed1e260b65**, parent **1dbbd9040f6d5979b02c2b10c8902f22f9254d68**; ref main aggiornato con controllo della revisione attesa. Nessun remote o commit locale creato. Istruzioni/changelog del template locale corrispondono a quelli pubblicati.

Il connettore non espone creazione release o upload asset: usata l'API GitHub dai canali locali già configurati, con credenziale mantenuta soltanto in memoria. Bozza creata, sette asset caricati e confrontati per dimensione/digest, poi resa pubblica. [Release v0.9.33](https://github.com/acamemo/acasystem-releases/releases/tag/v0.9.33), ID **431297617**, pubblicata alle **10:01:10 UTC / 11:01:10 Europe/Rome**, latest confermata. Tag definitivo sul commit del catalogo.

Documentazione bootstrap resa durevole prima dell'upload, rimuovendo lo stato temporaneo «non pubblicato». Copie dei materiali precedenti in `backup/rep013/pre-publication/`. Source ZIP rigenerato senza build: **1.577 entry**, unica variazione README bootstrap; tutte le altre entry byte-identiche e tutte confrontate ai sorgenti attuali. Immagine, web, manifest e script eseguibile invariati. Il documento allegato PUBBLICAZIONE.md conserva la nota datata della preparazione in corso: l'esito finale è questo report e la release pubblica.

| Asset pubblico | Byte | SHA-256 |
|---|---:|---|
| acasystem-src-0.9.33.zip | 6.670.806 | 43bf723aafd2eb7cc1f83be4284a87c9e5ff7e4c9b20f50a7a514acd08b336dd |
| acasystem-web-0.9.33.zip | 3.091.701 | 38289dd788575c8c011ecbecb39a558fa99ee67e9f78979e62308bf7b5f56a5f |
| manifest.json | 251 | 69552f71e4626154590dee9b1180a2336a6af5a493e27ea596bb68be854ba34c |
| bootstrap-haos.sh | 5.495 | 753e3500d3e79be788fc59c53e9f8861ad000068b0f524762c17833aafa426ac |
| BOOTSTRAP.md | 5.711 | f5da8ddeacfbe0fa2c39eb517da10ce28fee25d9f64453f4664e5a36ea73b0f0 |
| PUBBLICAZIONE.md | 1.186 | bc13ba2313ff6b4aaf5b93560fec44ff5da471181050b7ae3fd8fc9706e86718 |
| SHA256SUMS | 508 | ff365c222653a3a08c557cfcb6fe2ba7e801a987eec491dc3b869975c0adc4d9 |

## Verifiche ed evidenze

| Controllo | Procedura effettiva | Esito e limiti |
|---|---|---|
| Materiali e sorgenti | SHA256SUMS; decompressione/confronto SHA delle 1.577 entry | Superato; ritocco soltanto documentale, nessuna nuova build applicativa necessaria |
| GHCR pubblico | Push Docker; richiesta anonima token pull, GET manifest e hash byte | Superato, schema OCI 2 con 18 layer, digest uguale all'immagine pubblicata; nessuna installazione HAOS |
| Catalogo | Connettore GitHub blob/tree/commit/ref; tre download raw anonimi dal commit preciso | Superato, tre SHA identici ai locali; resto del repository preservato |
| Asset in bozza | API upload, confronto size/digest dei sette asset prima della pubblicazione | Superato, tutti uploaded |
| Release pubblica/latest/tag | API pubblica senza credenziali, controllo ID/tag/commit | Superato, v0.9.33 sul commit 6171905e… |
| Download | GET pubblico di tutti i sette allegati, SHA contro i file locali e i digest GitHub | Superato, nessuna credenziale e zero differenze |
| Audit indipendente | Latest/tag/metadata pubblici; manifest e checksum scaricati in memoria | Superato, nessun difetto bloccante |

Evidenze locali ignorate: `backup/rep013/registry-public.json`, `catalog-public.json`, `documentation-assets-update.json`, `upload-verified.json`, `published-release.json`, `download-verified.json`, `temporary-tag-cleanup.json`, directory `downloads/`. Nessuna credenziale salvata nelle evidenze.

Anomalia intermedia: modificando la bozza senza ripetere `tag_name`, GitHub ha mantenuto il proprio tag temporaneo. La prima pubblicazione aveva tutti gli asset completi ma tag errato; il controllo lo ha rilevato. Corretto esplicitamente a `v0.9.33`, verificato il ref sul commit atteso ed eliminato soltanto il tag temporaneo creato in questo lotto, dopo controllo SHA e release definitiva. Nessuna release storica o suo tag modificati. Il primo parsing PowerShell del manifest OCI aveva trattato i byte come valori separati: controllo ripetuto decodificando UTF-8 e verificando SHA/schema/layer; soltanto il risultato corretto è nelle evidenze.

## Chiusura e punto di ripresa

Pubblicazione U38 completata e verificata; nessuna attività di pubblicazione autorizzata resta aperta. Windows ZIP/NSIS e APK rimangono locali, non allegati alla release. Non eseguiti installazione su mini PC/HAOS, flash, collaudo Android/iPhone fisici o uso H24: il prossimo passo operativo è individuare il mini PC e provare il bootstrap su HAOS già installato. Il risultato della pubblicazione non certifica quelle prove.

Aggiornati stato, indice, guida, memoria della riprogettazione, infrastruttura e verifiche; nota datata aggiunta al report U37 chiuso senza riscriverne gli esiti. App e VM non avviate per pubblicare; checkpoint preservato. Nessun aggiornamento dipendenze, nuovo servizio o commit locale.

Controllo conclusivo: 14 documenti, 1.008 destinazioni locali, nessun nuovo link mancante o conflitto/whitespace nel report nuovo; rimane il riferimento preesistente LEGGIMI → WidgetTray. Diff pertinente superato con soli avvisi CRLF. ZIP checkpoint ricalcolato identico a09a8e147…eded18 e HEAD locale invariato. Tag temporaneo assente anche al controllo pubblico finale (HTTP404). Evidenza `backup/rep013/doc-final-check.json`.

**Seguito U39, 2026-11-02:** la prova su HAOS reale in VM ha rilevato il cambio nome contenitore addon_/app_ nel Supervisor2026.10.5. [REP-20261102-004](REP-20261102-004-prova-bootstrap-su-vm-haos.md) registra fallimento QR e correzione r2, provata in VM e distribuita con il consenso U38 alla stessa ACA0.9.33. Aggiunti quattro asset r2 e note operative alla medesima release (ora undici allegati), preservando i sette originali/digest di questo report, immagine e catalogo. Usare i materiali r2 per il bootstrap; nessun collaudo fisico o H24 dedotto dalla prova VM.
