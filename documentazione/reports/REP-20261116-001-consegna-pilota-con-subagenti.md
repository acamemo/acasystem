# Consegna del pilota ACA con lavoro parallelo

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261116-001 |
| Stato | Preparazione locale completata; qualifica operativa e consegna al destinatario aperte |
| Data | 2026-11-16, Europe/Rome |
| Autore / modello | Codex; identificativo esatto del modello non disponibile |
| Richiesta | «continuiamo la realizzazione dell'applicativo da dare al mio capo, ma con subagenti così facciamo prima» |
| Autorizzazione | Proseguire la realizzazione locale del pilota e le verifiche pertinenti, dividendo il lavoro. Nessuna attivazione Hyper-V, riavvio host, accesso al PC destinatario o sostituzione del banco dedotti. |

## Base e perimetro

Ripresa del [REP007](REP-20261113-007-installer-aggiornamenti-pilota.md) e dei criteri del [REP006](REP-20261113-006-piano-pilota-capo.md). L'altra chat risulta conclusa con materiali candidati e logica verificata, non una consegna operativa finale. All'avvio902voci Git preesistenti; nessuna pulizia o staging. Banco reale/account/profili conservati. Sonoff UX generale e MINIR4M non sono riassegnati.

## Criteri di completamento

- Setup guidato Windows con immagine HAOS vergine, bootstrap SonoffLAN/ACA e consegna client, versioni/checksum coerenti.
- Aggiornamento coordinato: manutenzione persistente, backup/recupero e selezione compatibile, senza esecuzioni duplicate o perdita di dati.
- Pipeline di pubblicazione preparata e verificabile, senza presentare una definizione YAML come CI già attiva.
- Build/pacchetto locale e istruzioni semplici; prove simulate, processi reali isolati e HAOS/Hyper-V distinti.
- Limiti del PC attuale Home e del destinatario Pro espliciti; nessun esito hardware inventato.

## Ripartizione

Tre subagenti lavorano su file distinti: setup PowerShell; adapter aggiornamento Supervisor; packaging/contratti release/workflow. Il coordinatore integra manutenzione/startup, controlla le prove, confeziona il risultato e aggiorna i documenti. Skill surgical-coding applicata, nessuna nuova dipendenza assegnata.

## Avanzamento e verifiche

In corso; esiti da registrare dopo esecuzione. Nessuna build, pubblicazione o installazione nuova dichiarata al momento dell'apertura.

### Precisazioni umane successive

L'utente conferma che per ora è disponibile soltanto il PC corrente. Richiede poi come prerequisito per un utente medio la creazione di una VM e precisa **«Intendo VirtualBox»**. Il kit viene adattato al percorso manuale VirtualBox/HAOS, senza installare l'hypervisor o modificare VM esistenti. Il setup Hyper-V preparato resta separato. Il precedente difetto timer ISSUE-129 non è dichiarato risolto dalla scelta umana.

### Verifiche di integrazione già eseguite

- Backend: ultimo comando mirato `npm test -- --run src/__tests__/updateMaintenance.test.ts src/__tests__/updateRequests.test.ts src/__tests__/server.test.ts src/__tests__/profileUsage.test.ts src/__tests__/devicesUpdateMaintenance.test.ts src/__tests__/devicesRepair.test.ts src/__tests__/devicesWiring.test.ts`: **84/84 PASS, 7 file**; strict backend PASS. Sono server HTTP reali su loopback, database e file temporanei, timer simulati dove indicato.
- Revisione incrociata: corretti SSE che restava occupato dopo chiusura, fingerprint di immagini account/associazioni, attesa dei producer interni, gate ingress e riavvio con manutenzione persistita. Nessuna scrittura al banco per queste prove.
- Prima compilazione client Windows0.1.1 riuscita e smoke Electron **9/9 PASS** con server simulati e archivio locale isolato; non usa account o HA del banco. ZIP ancora da rigenerare dopo le correzioni di race startup individuate dalla review.
- Updater: **27/27 PASS** su adapter Supervisor/image authority/coordinatore, con HTTP/pipe e SQLite temporanei. Nessun socket Docker reale o restore HAOS dedotto.
- Primo setup Hyper-V candidato: 32 verifiche runtime,2 scenari VM,8 guardie e5 argomenti nativi PASS con cmdlet simulati, parser PowerShell5.1/7 verificati; non equivalgono a Hyper-V funzionante qui. Nuovo percorso VirtualBox in preparazione separata.

## Risultato locale finale

- **Percorso PC:** `pilot/Start.cmd` usa `Start-AcaVirtualBoxSetup.ps1`; prerequisito VirtualBox già installato, VM HAOS creata/configurata/avviata dall'utente. Il launcher non crea né modifica VM; prepara VDI ufficiale verificato e una chiave unica per il bootstrap. CONFIG pubblica, versione Core, chiave host e revoca mantengono verifiche esplicite. Il setup Hyper-V rimane separato e conservato.
- **Client:** Windows0.1.1 compilato; core di avvio condiviso anche con Android. Controllo della sola centrale prima del bundle/provider/WS,20s per `checking`,45s per `updating`; health riletta dopo cambio versione/restart. Browser con loader/recupero condivisi e demo esclusa; invito QR conservato attraverso l'eventuale reload. Nessun APK nuovo dichiarato.
- **Centrale candidata:** ACA0.9.73/app0.9.73.1, backend+bundle coerenti. API di manutenzione abilitate soltanto con credenziale privata distinta dal token HA; pausa/attesa di richieste, comandi, editor, WS/SSE e producer interni. Fingerprint dei dati personali, stato durevole e rifiuto di altri transactionId. Nessuna nuova elevazione del normale add-on.
- **Aggiornamenti:** adapter Supervisor esterno e controller banco Container, backup freddo/restore circoscritto e journal. Workflow `.github/workflows/pilot-bank.yml` preparato per push su main, canale bank e revisione CI per esecuzione, collisioni GitHub/GHCR rifiutate. Nessun runner, servizio Windows, credenziale remota o workflow attivato. Dettagli operativi in [UPDATES.md](../../progetto/ha-app/pilot/UPDATES.md).

## Artefatti e provenienza

| Materiale locale | Identificazione |
|---|---|
| Kit completo finale | `backup/rep089/pilot-candidate-final-r2/acasystem-pilot-candidate-0.9.73.1.zip`,153759612byte,22file |
| SHA-256 kit | `97390cd1025ade6fdf33ebd2d06fcb146bf80a6ecb3444d9ee2b0517dd7f8504` |
| Audit kit | `backup/rep089/pilot-candidate-final-r2-audit.json`: CRC/checksum e bootstrap annidato,14corrispondenze ai file sorgenti, client e fonte runtime esatti |
| Client Windows incluso | ZIP153774730byte, SHA `a0d1cba540832bf4fd83414163e825a08ed476a75bfef520a9a3154b8fea8ec6` |
| Fonte runtime congelata |2010file, SHA `9b470e0af4c644dd2f581187ed13240e63e301670f4e6956df08d1dd12a107f6` |
| Wrapper finale locale | `ghcr.io/acamemo/acasystem:0.9.73.1`, manifest `sha256:175af57657d9a9b30535ca225569eb2d9d0ecf7c406c55e8ac710c0c074e4c3a`; **non pushato** |
| Sorgenti/bundle/bootstrap/catalogo candidati | `progetto/ha-app/out/0.9.73.1/`,2073file nell'archivio sorgente con strumenti,7,7MB; rigenerati dopo il congelamento degli script finali |

`SOURCE-PROVENANCE.json` dichiara correttamente working tree **dirty** e HEAD storico `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69`: nessun commit nuovo inventato o staging globale. Il kit intermedio senza le due ultime correzioni è conservato in `pilot-candidate-final/`, ma **r2** è il riferimento finale. Nessun dato del banco o chiave privata nel kit. I checksum locali non equivalgono a firma del produttore o release pubblicata.

## Verifiche finali e limiti

- **84/84 backend** su7file e typecheck PASS. **61/61 Node**,0skip:58pilot,2provenienza e1bundle; archivio originale Sonoff passato esplicitamente tramite `ACA_TEST_SONOFF_ARCHIVE`.
- **13/13 VirtualBox** su Windows PowerShell5.1 e PowerShell7 PASS, con cmdlet/file/processi simulati. Corrette precedenza USB CONFIG e falsa dichiarazione di prontezza al riuso di un checkpoint: ora health e manifesto vengono riletti senza reinstallare.32runtime/8guardie/5argomenti e2scenari Hyper-V distinti.
- **Electron9/9** percorso IP/cache/cambio centrale; **4/4** nuovo avvio update con503transitorio, ordine health→bundle→UI/WS, race `current` e404legacy. Evidenza nuova: `backup/rep088/startup-update-smoke-2a53070877424fa1af5c006f0f5a3278/startup-update-smoke.json` e3PNG. Profili temporanei rimossi.
- **Immagine finale8/8**: rete disabilitata, DB vuoto, nessun mount del banco; health .73, revisione .1, bundle/fingerprint/manutenzione coerenti. Risultato `backup/rep089/final-image-smoke.json`. SQLite nativo provato nella base. Build strict frontend/Casa3D PASS; dipendenze/versioni applicative non aggiornate per iniziativa propria.
- **Inventario reale sola lettura:** VirtualBox7.2.22, Windows64bit,15,7GiB, virtualizzazione/hypervisor e OpenSSH rilevati. Nessun comando di gestione VM impartito. `Ready` dell'inventario non dimostra boot o prestazioni.
- **Banco reale:** controllo finale `/api/health` restituisce `.72/ok`; stesso container `5880dabad9da…`,avvio2026-11-13T11:05:27Z. Nessuna migrazione, sostituzione o creazione di account sul banco. HA/D1 e VM storiche non sono stati gestiti da questo incarico.
- **Controlli generali:** estensione QR/mockup61PASS/4FAIL, con3errori Router nei test e1aspettativa widget; non importano i nuovi helper di avvio e non sono stati corretti fuori incarico. Non è una suite generale verde; debito ISSUE-134 conservato. Nessun risultato hardware/iPhone o CI remoto dedotto.

## Questioni residue e punto di ripresa

1. Creare manualmente una nuova VM HAOS in VirtualBox dal VDI verificato, preservando l'esperimento storico. Qualificare boot, timer/idle e riavvio; ISSUE-129 resta aperto. Il PC deve restare acceso per fornire la centrale.
2. Osservare il Core effettivamente scaricato al primo avvio. I materiali candidati richiedono HAOS18.4/Core2026.9.4, **non** forzano downgrade; rigenerarli soltanto dopo la qualifica della combinazione reale.
3. Pubblicare immagine/catalogo/release esatti dopo verifica del checkpoint sorgenti e configurazione dei permessi GitHub. Il controllo read-only del catalogo pubblico il16novembre trova ancora0.9.34 e la release0.9.73.1 assente: il kit candidato **non è già installabile dal catalogo attuale** e rifiuta versioni diverse prima di installare Sonoff/ACA.
4. Per update automatici sulla nuova HAOS manca l'hosting dell'executor esterno. L'opzione companion con ruolo Supervisor manager/socket Docker richiede valutazione e autorizzazione esplicita dei privilegi; il normale ACA non viene elevato. Sul banco Container serve prima una baseline .73 con manutenzione, configurazione privata e attivazione circoscritta del controller.
5. Completare onboarding vergine, account/casa/eWeLink propri del destinatario,2–3dispositivi reali e telefono LAN; persistenza e backup/recupero su target reale. Poi consegnare il pacchetto qualificato al capo.

Questa fase chiude la preparazione e il confezionamento locali richiesti nella ripresa; il risultato complessivo del pilota resta in corso. Nessuna nuova richiesta di approvazione operativa sostituisce i collaudi mancanti.

### Annotazione successiva — 2026-11-16

Su autorizzazione umana «se vuoi collaudare fallo», il [REP002](REP-20261116-002-collaudo-vm-vergine.md) esegue il test reale su una nuova VM separata. ACA .73.1/SonoffLAN, prima configurazione sintetica, EXE Windows e persistenza dopo riavvio PASS; corretto il trasferimento nel tmpfs Core. Il kit r2 qui descritto conserva i byte precedenti e non viene dichiarato aggiornato dalla sola correzione nel repository. La VM presenta già prima di ACA/Sonoff il difetto timer ISSUE-129 e non supera la qualifica idle/H24. Spenta e conservata, chiave revocata, banco .72 invariato. Core osservato 2026.11.1, staging locale distinto dal pin produzione 2026.9.4 e dal candidato .73.2 sviluppato parallelamente nell'altra chat. I risultati di preparazione sopra rimangono storici e non vengono trasformati in qualifica operativa.
