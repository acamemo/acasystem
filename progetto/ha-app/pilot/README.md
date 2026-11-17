# Procedura pilota: piano esecutivo e materiali locali

**Verifica VM REP-20261116-007:** il kit aggiornato aggiunge il controllo di sola lettura `Test-AcaVirtualBoxStability.ps1` e [VM-STABILITY.md](VM-STABILITY.md), senza cambiare app .76.1 o client0.1.1. Health e interfaccia aperta non certificano timer, recupero della rete o H24. Sul destinatario servono avvii a freddo distinti, misure senza sonde e disconnessione/riconnessione reale; gli esperimenti rifiutati non sono profili di consegna. Le prove del PC di sviluppo non sostituiscono il Lenovo.

**Esito REP007: problema non risolto su questo host.** Cinque configurazioni provate non hanno fornito un rimedio affidabile: nohz/cap99, provider guestHyperV, VirtIO e3CPU. Il provider guest supera un primo idle e i tagli10/30s, poi fallisce60s; VirtIO e3CPU falliscono anche isolati dalla LAN. Tutti ritirati, baseline ripristinata. Il kit revisionato migliora la verifica e la procedura, **non contiene una correzione VM promossa e non è una consegna qualificata**. Un confronto su altro host o motore resta un passo separato; nessuna protezione Windows viene disattivata automaticamente.

**Recupero REP-20261116-005:** candidato ACA0.9.76/app0.9.76.1. Su HAOS il servizio con segreto perso viene rigenerato automaticamente solo se l'identità locale gestita da ACA è riconosciuta senza ambiguità; account personali e identità non riconosciute non vengono rimossi. Segreto ancora escluso dalle copie, privilegi ACA invariati. Verificare stato attivo e funzioni dispositivi dopo il rollback, prima di un eventuale intervento del proprietario. «Ripara il servizio» con il primo account resta la riserva quando il recupero autonomo non è possibile; non conserva la sessione del proprietario. Prove e limiti nel [REP005](../../../documentazione/reports/REP-20261116-005-recupero-servizio-ha-dopo-restore.md).

**Collaudo REP-20261116-004:** .73.2 originale FALLITA sullo stop Supervisor nativo. Corrette osservazione Engine e gestione PAX dei timestamp; aggiornamento reale e ripristino del profilo/14tabelle provati nella nuova VM con le correzioni. Nuovo candidato app0.9.73.6, base ACA0.9.73 invariata, HAOS18.4/Core2026.11.1 osservati. La perdita della credenziale di servizio HA nel restore resta ISSUE-166: richiede riattivazione del proprietario, senza cambiare l'ADR-0022 o inserire segreti nei kit. Per esiti della revisione finale, stabilità e limiti prevale [REP004](../../../documentazione/reports/REP-20261116-004-collaudo-0732-executor-vm.md).

**Ripresa REP-20261116-003:** hosting HAOS dell'executor completato nel codice locale: worker stable separato, predisposizione privata prima degli account, entry companion candidata e runtime incluso nell'immagine. Nessun privilegio attivato. [Scheda per il collaudo](COLLAUDO.md) e README del ZIP executor descrivono ordine, credenziali/backup e scelta locale manager/Docker/Protection mode. Il kit aggiornato include il candidato separato; non equivale a una promozione stable o a un collaudo HAOS riuscito. Banco e VM non modificati da questo lotto.

## Percorso corrente — 16 novembre 2026

L'utente sceglie **VirtualBox**, con VM HAOS creata manualmente come prerequisito del client PC. Seguire [VIRTUALBOX.md](VIRTUALBOX.md); `Start.cmd` avvia quel percorso. Il setup Hyper-V resta un'alternativa separata, non viene scelto automaticamente. ACA Windows rimane il client collegato all'IP della centrale: non riprende il vecchio engine VirtualBox interno a Electron.

La candidata locale aggiornata è **ACA0.9.76/app0.9.76.1, client Windows0.1.1**; gli artefatti .73/.74/.75 restano distinti. Il kit contiene il client, bootstrap SonoffLAN3.13.3, candidato executor, script e checksum; scarica soltanto l'immagine HAOS ufficiale verificata. Nessun account, profilo, volume o credenziale del banco è incluso. Guida tecnica aggiornamenti e attivazione: [UPDATES.md](UPDATES.md).

**Non ancora una consegna qualificata al destinatario.** Restano necessari stabilità/LAN sul target, qualifica Core completa e pubblicazione esatta del catalogo; il recupero è nel collaudo REP005. REP002 e REP004 osservano Core2026.11.1/Supervisor2026.11.0 su HAOS18.4; non è una prova sul PC del capo. Il kit storico .73.2 conserva18.4/2026.9.4, il nuovo candidato fissa18.4/2026.11.1 senza dichiarare risolta ISSUE-129 o supportati altri Core. Versioni diverse o vecchio catalogo vengono rifiutati senza downgrade. La pubblica .34 non basta per installare questa candidata. Il normale add-on ACA mantiene i privilegi precedenti.

Sono ora implementati controller Container dedicato al banco, manutenzione persistente e controllo avvio prima dei provider/WS. Workflow GitHub e pubblicazione restano preparati, **non attivati**; un commit locale non è un push e non aggiorna il PC. Il banco .72, account/profili e VM storiche non sono stati sostituiti. [Evidenze e ripresa REP-20261116-001](../../../documentazione/reports/REP-20261116-001-consegna-pilota-con-subagenti.md).

Preparazione del kit completo (directory nuova; non pubblica né installa):

```powershell
node progetto/ha-app/pilot/prepare-pilot.mjs --version 0.9.76 --app-version 0.9.76.1 --haos-version 18.4 --core-version 2026.11.1 --sonoff-archive <ZIP-Sonoff-originale> --windows-client <ZIP-Windows-0.1.1> --output <directory-nuova>
```

## Base tecnica precedente — 13 novembre 2026

Le sezioni seguenti conservano il piano di partenza e i suoi limiti; per il percorso attuale prevalgono le guide sopra e il report del 16 novembre.

Incarico [REP-20261113-007](../../../documentazione/reports/REP-20261113-007-installer-aggiornamenti-pilota.md), avviato il 2026-11-13 sulla richiesta di proseguire il piano REP006. **Materiali candidati, non installer consegnato o collaudo Hyper-V riuscito.** Il client Windows rimane un client: i nuovi script di setup sono separati dal vecchio engine VirtualBox e dal packaging Electron.

## Sequenza e contratti

| Fase | Input e risultato osservabile | Implementazione locale / verifica ancora necessaria |
|---|---|---|
| Inventario destinatario | Windows Pro dichiarato; virtualizzazione/Hyper-V, spazio e switch LAN effettivi | `Test-AcaPilotHost.ps1`, sola lettura; eseguirlo localmente come amministratore sul target. Non attiva funzionalità, non cambia reti o alimentazione. |
| Sistema vergine | ZIP ufficiale HAOS, digest verificato; nuova VM e nuovo disco operativo | `New-AcaPilotVm.ps1`, candidato HAOS18.4, Generation2,2vCPU/4GiB statica/64GiB. Non eseguito su Hyper-V. Mini PC usa invece la procedura ufficiale di installazione sul supporto identificato. |
| Autenticazione iniziale | Chiave Ed25519 unica, ACL locale, chiave host verificata alla console | CONFIG sulla partizione boot della sola copia nuova; nessuno script arbitrario in CONFIG. SSH22222 temporaneo di sviluppo/debug; non una funzione esposta da ACA. Import CONFIG e accesso/revoca da provare realmente. |
| Bootstrap comune | Directory di materiali con versioni/checksum, IP privato | `bootstrap/prepare-bootstrap.mjs` o `ha-app/prepare.mjs`; SonoffLAN originale3.13.3 e ACA nella revisione esatta del catalogo, senza HACS. OS/Core diversi sono rifiutati, non aggiornati. |
| Prima configurazione | ACA health/versione/bundle coerenti, nessun utente del mittente | Il destinatario crea account/casa da ACA; eWeLink locale in Trova; scelta e Conferma widget. Nessuna scorciatoia o dato del banco distribuito. Da collaudare su base vergine. |
| Aggiornamenti | Pubblicazioni GitHub complete e compatibili, solo versioni maggiori | Selettore read-only e nucleo transazionale con journal implementati/testati localmente. Adapter reali, avvio delle app e pipeline non collegati. |
| Consegna | Report di prove reali, versione stabile, client verificati | Nessun push/pubblicazione, build completa, setup o aggiornamento del banco eseguiti da questo lotto. |

La candidata software ricostruita è ACA0.9.72/app0.9.72.99, HAOS18.4 e Core2026.9.4, SonoffLAN3.13.3. Solo ACA/Sonoff sul Core del banco hanno le evidenze REP005. La VHDX ufficiale HAOS non equivale a una distribuzione con quel Core congelato: il primo avvio può scaricare una versione diversa. Prima di una consegna occorre osservare il Core della VM vergine, validare la combinazione e rigenerare i materiali con le versioni effettivamente collaudate. Il bootstrap non forza un downgrade per adattare il sistema alla candidata storica.

Il controllo read-only del PC corrente in REP007 riporta Windows11Home e cmdlet Hyper-V assenti, con hypervisor rilevato. Non è il Lenovo Windows11Pro dichiarato dal destinatario e non è un target Hyper-V qualificato. Nessuna attivazione, sostituzione o prova delle VM storiche è stata tentata.

`prepare-pilot.mjs` raccoglie script, guida, licenza, bootstrap e checksum in uno ZIP candidato senza identità o dati del banco. Non contiene immagine HAOS, client Windows/APK o una release ACA pubblicata: restano materiali distinti da qualificare e consegnare insieme. Preparazione locale:

```powershell
node progetto/ha-app/pilot/prepare-pilot.mjs --version 0.9.72 --app-version 0.9.72.99 --haos-version 18.4 --core-version 2026.9.4 --sonoff-archive <zip-originale> --output <directory-nuova>
```

## Hyper-V e canale temporaneo

Non eseguire questi comandi sul PC corrente per deduzione. Sono destinati al target identificato e richiedono prima il collaudo separato. Lo switch esterno deve già esistere ed essere scelto dall'utente; lo script rifiuta NAT/Default Switch, nomi o directory esistenti e ZIP differenti. L'attivazione Hyper-V/riavvio, la creazione dello switch e le impostazioni di sospensione sono operazioni locali distinte. Hyper-V non offre il passthrough USB diretto previsto da altri hypervisor: identificare prima coordinatori e dispositivi.

La fonte ufficiale congelata è [haos_ova-18.4.vhdx.zip](https://github.com/home-assistant/operating-system/releases/download/18.4/haos_ova-18.4.vhdx.zip),560616192byte, SHA-256 `ab49fec41536c49fb7ca23db0a383f1e6b6078ac3e1a169a177cc8ec58641993`, confermati tramite API GitHub il 2026-11-13. Nessun download del disco svolto in REP007. La dimensione64GiB è quella virtuale proposta; verificare spazio SSD sufficiente, crescita e margine backup sul destinatario.

```powershell
.\Test-AcaPilotHost.ps1
.\New-AcaPilotVm.ps1 -ImageZip 'C:\Materiali\haos_ova-18.4.vhdx.zip' -ParentDirectory 'C:\ACA-Piloti' -SwitchName 'LAN' -VmName 'ACA-Pilota' -WhatIf
```

La directory padre deve esistere e stare fuori dal repository. Senza `-WhatIf` viene creata soltanto una nuova directory figlia e una nuova VM. `-Start` richiede anche l'avvio; in sua assenza la VM resta spenta. Secure Boot viene disattivato nella sola VM HAOS secondo la guida HA; non viene disabilitata alcuna protezione dell'host. L'immagine ZIP sorgente non è modificata. Non c'è rollback automatico su oggetti non riconosciuti: un fallimento conserva la nuova copia per diagnosi.

La chiave privata di predisposizione nasce nella `.setup` privata dell'installazione; non copiarla in Git, log, pacchetti, chat o ad altre installazioni. Il solo file pubblico viene scritto in `CONFIG/authorized_keys` sulla partizione `hassos-boot` della copia. Gli ID di casa/utenti/servizio saranno generati dalla nuova installazione, senza ripristinare volumi o `.storage` del banco.

Al primo avvio verificare IP e chiave pubblica host dalla console locale/VM. Il parametro `-HostKey` vuole la sola riga `ssh-ed25519 BASE64`, senza commento. In HAOS18.4 le chiavi Dropbear sono sotto `/etc/dropbear`; se la chiave host Ed25519 non esiste ancora, va generata localmente prima di ricavarne la parte pubblica. Non mostrare o trasferire il file privato. Non usare `accept-new` o disabilitare la verifica host. `Invoke-AcaBootstrap.ps1` non usa PowerShell Direct.

```powershell
.\Invoke-AcaBootstrap.ps1 -InstallationDirectory 'C:\ACA-Piloti\ACA-Pilota' -MaterialsDirectory 'C:\Materiali\bootstrap' -Ip '192.168.1.20' -HostKey $chiavePubblicaVerificata -WhatIf
```

Dopo verifica del piano, l'esecuzione senza `-WhatIf` controlla proprietà VM/disco e checksum locali, trasferisce con SSH/scp, ricontrolla i checksum nel guest ed esegue il bootstrap. Verifica health finale, poi revoca la propria chiave soltanto se è ancora l'unica autorizzata. Verifica che non consenta più una connessione ed elimina i due file chiave locali. La revoca non dichiara la porta TCP chiusa immediatamente: il servizio non si avvia al boot senza chiavi; arrestarlo dalla console locale nel collaudo finale. Una chiave altrui aggiunta nel frattempo impedisce la revoca automatica globale. Su errore restano chiave e stato per ripresa locale: non lasciare il target consegnato con setup incompleto.

Questo è un uso temporaneo del canale documentato per sviluppo/debug, da accettare solo dopo collaudo del setup. Non aggiunge privilegi host permanenti all'add-on ACA, non apre porte router, non crea password universali né assistenza remota. Il mini PC condivide i materiali bootstrap; il suo canale iniziale e il suo disco fisico richiedono predisposizione propria, non le chiamate Hyper-V.

## Contratto di pubblicazione e aggiornamento da completare

1. **Push e canali.** `origin` è `acamemo/acasystem`; gli artefatti vanno in `acamemo/acasystem-releases` e `ghcr.io/acamemo/acasystem`. Il commit solo locale non è un trigger online. Il canale `bank` serve questo PC; `stable` serve il destinatario. I nomi sono un contratto esecutivo locale; nessun ramo/canale/workflow remoto è stato creato. La promozione stable richiede le verifiche della matrice sotto.
2. **Unica fonte.** Congelare la sorgente revisionata, controlli pertinenti e build. Da una sola immagine produrre backend/bundle, sorgenti GPL/provenienza, manifest web e materiali bootstrap. Il `prepare` completo ora richiede anche versioni OS/Core e ZIP Sonoff. Nessun riuso del vecchio bootstrap .34 nei nuovi materiali.
3. **Pubblicazione completa.** Prima push immagine con digest del registry verificato, poi release in bozza con tutti gli asset/checksum, download anonimo e verifica; solo dopo renderla pubblica e allineare il catalogo. `distribution.json` deve legare schema1, canale, versione ACA, versione app, tag `v<appVersion>`, immagine GHCR per digest, manifest bundle coerente e intervalli min/maxExclusive di HAOS/Core/Supervisor e versioni ACA aggiornabili (`upgradeFrom`). Il digest registry non è l'imageID locale. Il contratto viene validato da `parseDistribution`; nessun manifesto pubblicabile con digest inventato viene prodotto ora.
4. **Selezione.** `checkPublications` legge al massimo30release e il loro asset ufficiale `distribution.json`, con budget totale15secondi. Seleziona la più recente compatibile, controllando anche la revisione app; `stable` esclude bozze/prerelease/bank. Release legacy o incomplete sono ignorate. La pubblica .34 non arretra un banco .72. Offline/timeout conservano la versione locale. La compatibilità shell impedisce di presentare come silenzioso un aggiornamento nativo non disponibile.
5. **Transazione ed executor.** `update-transaction.mjs` realizza il journal atomico e l'ordine drain→backup verificato→installazione→verifica→commit→riapertura. Recupera fasi interrotte, ripristina immagine+dati dopo errori di migrazione/health e impedisce il ciclo sulla stessa pubblicazione fallita. L'adapter di piattaforma deve ancora fornire mutua esclusione rilasciata dal sistema dopo crash, drain persistente, backup freddo con immagine precedente disponibile, installazione esatta e verifiche reali di bundle/digest/dati. Non esiste un adapter permissivo predefinito. Non avviare il vecchio backend sul DB già migrato; dopo il checkpoint di commit il recupero non deve cancellare scritture nuove. Nessuna cancellazione di account, profili, sessioni, bozze client o associazioni. Un esito di comando incerto non si ripete.
6. **Avvio e banco ancora da collegare.** Il controllo richiesto a ogni avvio deve passare dalla centrale e non scaricare un frontend GitHub incompatibile con il backend. Più client avviati non avviano più aggiornamenti. Il banco Container richiede un executor Windows circoscritto a Compose/volumi ACA già identificati, distinto da HAOS e dagli altri container. Resta da realizzare anche il recupero al successivo avvio se il banco è spento al push. Nessun runner self-hosted con privilegi Docker pubblicamente attivato ora.
7. **Componenti distinti.** `component-availability.mjs` legge separatamente HAOS/Core/Supervisor dai rispettivi `/info`, senza redirect del token, e SonoffLAN dal progetto upstream. Il chiamante deve fornire la versione Sonoff osservata; una candidata nel manifest non dimostra l'installazione corrente. Versioni sconosciute/errori restano indisponibili, non «nessun aggiornamento». Installazione e riavvii sono separati da ACA. Il ruolo attuale ACA consente letture `/info`, non tutte le mutazioni. Un eventuale executor Supervisor privilegiato deve essere isolato e motivato; non elevare il normale ACA a manager solo per far funzionare una chiamata. Supervisor vieta l'aggiornamento di un'app da sé stessa e lo store ignora versioni aggiunte all'URL: controllare catalogo esatto, corse di pubblicazione e risultato prima di riaprire le scritture.

Il controllo CLI di sola disponibilità richiede uno stato tecnico senza segreti con `version`, `appVersion`, `haosVersion`, `coreVersion`, `supervisorVersion`, `shellVersion`:

```powershell
node progetto/ha-app/pilot/check-updates.mjs --installed C:\Materiali\stato-tecnico.json --channel stable
```

Non esiste ancora l'asset `distribution.json` nelle release correnti; il risultato atteso oggi è conservare la versione installata. Il codice non installa nulla, non si collega al banco e non scrive cache o dati applicativi.

## Matrice di accettazione del pilota

| Verifica | Evidenza necessaria | Stato REP007 |
|---|---|---|
| Versioni generate e integrità | Nessun placeholder/.34 involontario, appRevision distinta, checksum e Sonoff48file originali | Verificabile localmente, esiti nel report |
| Guardie Hyper-V | Hash errato, oggetti esistenti, NAT, WhatIf senza mutazioni | Solo cmdlet simulati/analisi sintassi |
| Installazione HAOS vergine | Import CONFIG, autenticazione host, componenti, account assenti, revoca e boot successivo | Non eseguita |
| Prestazioni/rete | Boot/idle e timer senza lag, riavvio ordinato, IP LAN PC/telefono, sospensione host gestita consapevolmente | Non eseguita; ISSUE-129 non risolto |
| Esperienza destinatario | Account/casa nuovi da ACA, login eWeLink umano,2–3dispositivi reali, Conferma widget, stato/comando con riscontro | Non eseguita |
| Persistenza | Account/profili/bozze/associazioni dopo chiusura e riavvio centrale/client | Non eseguita sulla nuova centrale |
| Aggiornamenti | Versione nuova, incompatibile, vecchia, GitHub offline, client simultanei e bozze aperte | Selettore e journal unitari; adapter/client non collegati |
| Recupero | Download interrotto, disco insufficiente, crash in ogni fase, migrazione fallita e restore coerente | Logica migrazione/restore su file temporanei verificata; nessuna prova HAOS/Container |
| Client | Windows reale, Android scansione/IP, telefono LAN; shell minima incompatibile esplicita | Pacchetti non rigenerati in questo lotto |

Fonti primarie consultate il **2026-11-13**: [HAOS Windows](https://www.home-assistant.io/installation/windows/), [HAOS18.4](https://github.com/home-assistant/operating-system/releases/tag/18.4), [CONFIG18.4](https://github.com/home-assistant/operating-system/blob/18.4/buildroot-external/rootfs-overlay/usr/sbin/haos-config), [Dropbear18.4](https://github.com/home-assistant/operating-system/blob/18.4/buildroot-external/rootfs-overlay/usr/lib/systemd/system/dropbear.service.d/haos.conf), [debug host](https://contributors.home-assistant.io/os/operating-system/debugging/), [New-VM](https://learn.microsoft.com/en-us/powershell/module/hyper-v/new-vm), [Mount-VHD](https://learn.microsoft.com/en-us/powershell/module/hyper-v/mount-vhd), [Supervisor permessi](https://contributors.home-assistant.io/apps/supervisor-api/), [backup](https://contributors.home-assistant.io/apps/supervisor-api/backups/), [store](https://contributors.home-assistant.io/apps/supervisor-api/store/).
