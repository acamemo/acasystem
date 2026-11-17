# Collaudo sul PC del destinatario

Scheda operativa della preparazione locale REP-20261116-003. Non è un verbale di prove riuscite. Il percorso attuale è VirtualBox con VM creata manualmente; il mini PC usa lo stesso bootstrap dopo un'installazione del sistema distinta. Non copiare VM, dischi, account, token o profili del banco.

Il kit aggiornato per REP-20261116-007 include `Test-AcaVirtualBoxStability.ps1` e [VM-STABILITY.md](VM-STABILITY.md), utilizzabili con PowerShell5.1/7 senza Node. Il controllo rifiuta deriva, recuperi timer abbandonati e heartbeat anomali anche anteriori alla finestra; non applica rimedi. Ripeterlo dopo due avvii a freddo e insieme al collaudo LAN: interruzioni brevi e prolungate, ritorno di HTTP/Core/ACA e aggiornamenti del client senza pausa/ripresa della VM, riavvio app o nuovo login. Un solo campione idle positivo non è accettazione del destinatario né qualifica H24. Gli esperimenti rifiutati non entrano nel profilo di consegna.

Recupero REP-20261116-005: candidato **ACA0.9.76/app0.9.76.1**. Dopo restore su HAOS verificare il recupero automatico senza collegare il proprietario: servizio attivo, catalogo e apertura/annullamento di un flow senza credenziali del produttore o comandi fisici. ACA rigenera solo l'identità locale di servizio riconosciuta e con segreto perso, senza copiarlo dal backup; l'executor conserva la propria credenziale distinta. Ripetere dopo riavvio. Per identità ambigue/file illeggibili o assenza dei mezzi Supervisor la riparazione resta ferma; il primo account e «Ripara il servizio» sono la riserva esplicita, da registrare separatamente dal recupero automatico. Qualifica H24/LAN/Core completa sul destinatario ancora necessaria.

Aggiornamento REP-20261116-004: .73.2 originale rifiutata dal collaudo reale di aggiornamento; nuovo candidato corretto .73.6, HAOS18.4/Core2026.11.1. Il ciclo corretto è provato con Supervisor/Engine reali e pubblicazioni di fixture, senza pubblicazione online. Il restore recupera14tabelle e il profilo sintetico, ma perde la credenziale HA esclusa: ISSUE-166 richiede una riattivazione del proprietario. Un esito `rolled-back` e la sola health non certificano tutte le funzioni HA. Il Core resta indicato come unverified dal catalogo API dell'app: prove owner/Sonoff riuscite non certificano tutti i contratti o i dispositivi del capo. Le note .73.2 sotto conservano i vincoli della preparazione precedente.

## Materiali da qualificare prima della consegna

| Materiale | Verifica |
|---|---|
| HAOS ufficiale vergine | ZIP/digest e immagine VirtualBox indicati in `haos-virtualbox-image.json`; nessun disco già avviato dal banco |
| Kit completo ACA/client | SHA256SUMS esterno, MATERIAL-PROVENANCE e checksum interni; il client Windows incluso resta0.1.1 |
| Immagine/catalogo ACA | Versione/appVersion esatte, frontend/backend coerenti, provenienza e digest registry; la pubblica .34 non installa la candidata .73 |
| Executor separato | ZIP `acasystem-executor-candidate-<appVersion>.zip`, EXECUTOR-PROVENANCE e hash runtime nell'immagine; candidato manuale, non attivato dal solo kit |
| Versioni HA | HAOS/Core/Supervisor effettivamente osservati sulla VM vergine e combinazione qualificata; non forzare downgrade per far combaciare la candidata storica18.4/2026.9.4 |

Il nuovo runtime executor richiede un wrapper successivo al kit .73.1 di REP001. Il candidato locale di REP003 è app0.9.73.2, senza nuove modifiche al runtime backend/frontend. Non sovrascrivere gli artefatti .73.1 durante questa prova. Nessuna pubblicazione o installazione sul PC del capo è implicita nella preparazione.

Evidenza separata REP-20261116-002: la VM vergine su questo PC ha osservato HAOS18.4/Core2026.11.1/Supervisor2026.11.0. In300,330s reali prima di ACA/Sonoff, VirtualSync è avanzato85,485s con4nuovi timer-catchup-abandoned: ISSUE-129 riprodotta, H24 non qualificato. Il destinatario usa un host diverso: la misura va eseguita lì. Il bootstrap .73.2 include la correzione del trasferimento Sonoff via stdin nel tmpfs di Core, ma conserva il vincolo candidato Core2026.9.4; non aggirare il rifiuto per installarlo sul Core appena scaricato. Qualificare e rigenerare la combinazione effettiva prima della consegna.

## Sequenza della prova

1. Sul PC destinatario verificare Windows/CPU/RAM/SSD, VirtualBox e rete effettivi. Le caratteristiche Lenovo/Ultra7/32GB/Pro sono dichiarazioni finché non osservate. Creare una VM nuova, UEFI, bridge LAN,2CPU/4GiB/64GiB su supporto dedicato; conservare eventuali VM altrui. Non cambiare protezioni host, firmware o sospensione in silenzio.
2. Avviare HAOS vergine, attendere il primo download e annotare versioni Core/Supervisor effettive. Misurare boot, timer/idle e riavvio ordinato: ISSUE-129 non è risolta da una buona CPU. Verificare il vero IP LAN dal PC e dal telefono, senza scambiare un indirizzo NAT per raggiungibilità locale.
3. Usare Start.cmd e la procedura VirtualBox del kit verificato: chiave di bootstrap unica, CONFIG contenente solo la parte pubblica e chiave host controllata localmente. Bootstrap predispone SonoffLAN originale e ACA esatta; non inserire account/eWeLink del mittente e non aprire il primo onboarding prima della predisposizione dell'executor.
4. Se il collaudo include gli aggiornamenti automatici, revisionare sul solo target il companion manager/Docker descritto nel suo README. Il normale ACA mantiene i privilegi attuali. Dalla console host si può copiare `/haos/prepare-haos-executor.sh` dal solo container ACA della versione esatta in un file temporaneo e verificarlo contro il kit: non occorre riaprire SSH permanente. Lo script richiede `--apply --ack-manager-docker`, rifiuta account/profili/sessioni già presenti e non disabilita Protection mode da sé. La relativa scelta e Start on boot del companion restano locali ed espliciti.
5. Verificare lo stato del worker e la ripartenza dopo riavvio. Solo poi creare il proprio account/casa da ACA, configurare il proprio eWeLink da Trova, completare pairing/consensi locali, scegliere i dispositivi, anteprima e Conferma dei widget. Nessuna credenziale in chat o nei verbali.
6. Eseguire stati/comandi con riscontro reale su2–3dispositivi, chiudere/riaprire client, riavviare la centrale e verificare account, layout, associazioni e telefono sulla stessa LAN. Il percorso cloud di una TRV non diventa offline per la sola presenza di SonoffLAN.
7. Con una pubblicazione di collaudo **più recente e compatibile**, verificare check all'avvio, drain con editor/comandi/connessioni attivi, rinvio senza perdita delle bozze, un solo executor per più client, backup locale verificato, immagine/bundle/fingerprint, commit e riapertura. Verificare anche pubblicazione più vecchia/incompatibile e GitHub offline: ACA locale deve restare utilizzabile.
8. Provare recupero da download/backup falliti, perdita processo e health/migrazione errate. Il restore deve conservare la credenziale della medesima installazione e il gate prima di riaprire scritture. Un commit già durevole non può cancellare modifiche nuove. Un recupero non verificato richiede intervento locale e non viene ripetuto senza limite.

9. Dopo il restore verificare anche identità di servizio HA, catalogo e funzioni dispositivi. La credenziale di manutenzione e quella HA sono distinte: la seconda rimane esclusa per ADR-0022. Sulla candidata .76.1 provare prima la rigenerazione automatica senza proprietario; un eventuale intervento del proprietario è un passo manuale distinto. Nessun token HA nel kit o in chat.

## Evidenze da registrare

Per ciascun caso: data/ora Europe/Rome, versioni e digest, ambiente, passaggi, atteso/osservato, esito e limite. Conservare soltanto dati tecnici selezionati: nessun token, password, elenco personale completo, log grezzo o backup privato nel pacchetto o in Git. Un test Node/PowerShell simulato non è una riga PASS della VM.

| Caso | Esito sul PC del capo |
|---|---|
| VM vergine/identità nuove/versioni effettive | Da eseguire |
| Boot/idle/riavvio e rete PC/telefono | Da eseguire |
| SonoffLAN+ACA e onboarding completo | Da eseguire |
| Predisposizione e avvio executor separato | Da eseguire |
| Stati/comandi e persistenza reali | Da eseguire |
| Update più recente/offline/concorrenza/bozze | Da eseguire |
| Backup/restore e interruzioni sul target | Da eseguire |

Il workflow bank preparato pubblica prerelease Container e non promuove automaticamente il destinatario stable o il suo catalogo. Una qualifica stable e la pubblicazione esatta sono successive ai controlli richiesti. Consultare UPDATES.md per permessi GitHub e controller del banco; questi comandi non vanno attivati sul banco durante il presente incarico.
