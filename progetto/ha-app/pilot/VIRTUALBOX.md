# Pilota Windows: VirtualBox e VM creata dall'utente

Percorso predefinito del kit, su richiesta umana del 2026-11-16. Il launcher prepara file locali e bootstrap; **VirtualBox deve essere gia installato e la nuova VM viene creata/configurata/avviata manualmente**. Nessuna VM esistente viene interrogata, clonata o modificata dal launcher. Hyper-V rimane un'alternativa separata tramite `Start-AcaPilotSetup.ps1`, non il prerequisito di questo percorso.

Questa procedura e candidata: boot/CONFIG/SSH/LAN, onboarding e dispositivi reali devono ancora essere collaudati sul destinatario. Non usare dischi, snapshot, backup, account o profili del banco.

Il kit aggiornato include [VM-STABILITY.md](VM-STABILITY.md) e `Test-AcaVirtualBoxStability.ps1`: misura della sola VM UUID/disco indicati, senza sonde durante l'attesa. Eseguirla dopo avvii a freddo distinti e completare il ritorno della LAN con client aperto e avvio offline. Una health positiva non supera ISSUE-129. Non adottare i parametri sperimentali dei report come configurazione del destinatario: un esito negativo o una pausa/ripresa manuale impediscono la qualifica.

## 1. Controllo locale e materiali

Estrarre il kit completo in una directory nuova. Avviare `Start.cmd`, oppure Windows PowerShell:

```powershell
.\pilot\Start-AcaVirtualBoxSetup.ps1 -InspectOnly
.\pilot\Start-AcaVirtualBoxSetup.ps1 -WhatIf
.\pilot\Start-AcaVirtualBoxSetup.ps1
```

`-InspectOnly` legge versione VirtualBox con il solo `VBoxManage --version`, CPU/RAM e presenza di OpenSSH. Non installa driver, modifica Hyper-V/UEFI o apre/configura VM. Il rilevamento della virtualizzazione non certifica prestazioni o stabilita. Con hypervisor Windows gia attivo verificare le prestazioni di VirtualBox; nessuna protezione viene disattivata dal kit. Il PC deve restare acceso per fornire la centrale.

`PREPARA MATERIALI` autorizza soltanto directory/file locali, una chiave temporanea unica e il download verificato. Destinazione iniziale: `%LOCALAPPDATA%\ACA-System\Centrali\ACA-Pilota`; si possono passare `-ParentDirectory`, `-VmName` e uno ZIP locale con `-ImageZip`. Servono almeno72GiB liberi sul volume scelto. Una directory esistente senza checkpoint non viene sovrascritta.

VDI ufficiale congelato: `haos_ova-18.4.vdi.zip`,560370635byte, SHA-256 `e46c3b9bcf437ff56e5905b29e92ebaef4a50dac376eb8d919c29fbcea33b7be`. Fonte e data sono in `haos-virtualbox-image.json`; lo ZIP originale resta intatto. Il launcher estrae soltanto una nuova copia `haos.vdi`. Non ridimensiona o registra il disco in VirtualBox.

## 2. Creare manualmente la VM vergine

In VirtualBox scegliere Nuova e usare un nome nuovo, per esempio `ACA-Pilota`. Lasciare ISO vuota e scegliere Linux64bit. Prima del primo avvio:

- Abilitare EFI/UEFI, assegnare2CPU e4096MiB RAM.
- Collegare come disco SATA esistente **la sola copia `haos.vdi` creata dal launcher**; non un disco di un'altra casa o del banco.
- A VM spenta, nel Gestore supporti virtuali selezionare quella copia e portare manualmente la capacita a64GiB/65536MiB. Il VDI dinamico cresce sul disco host; non ridurre la dimensione.
- Nella rete selezionare Scheda con bridge e la scheda fisica della LAN del destinatario. NAT non rende la centrale normalmente raggiungibile dal telefono; non aprire porte sul router.
- Avviare manualmente la VM e attendere l'avvio completo di HAOS/Core. Leggere l'IPv4 dalla console e verificare PC/telefono sulla stessa LAN.

I nomi dei menu possono variare con la versione rilevata. Non servono Guest Additions o una ISO Windows. Il kit non modifica sospensione, avvio automatico o altre VM: decidere queste impostazioni sul PC destinatario durante il collaudo.

## 3. Importare soltanto la chiave pubblica tramite CONFIG

Il launcher genera `.setup/bootstrap-key` privata con ACL dell'utente e `CONFIG/authorized_keys` pubblico, ASCII/LF. **Non copiare `.setup`, chiave privata o contenuto di installazioni precedenti.** La VM deve essere vergine: fermarsi se esistono gia chiavi di amministratori o una CONFIG predisposta da altri.

Percorso ufficiale con supporto CONFIG: l'utente prepara un supporto vuoto FAT con etichetta `CONFIG`, copia `authorized_keys` nella sua radice, lo collega alla sola VM nuova tramite la GUI VirtualBox e, alla console HA, esegue `ha os import`. Il launcher non formatta supporti e non li collega automaticamente. Il passthrough USB deve essere disponibile nell'installazione VirtualBox scelta; se non lo e, non installare estensioni o cambiare driver per deduzione.

Alternativa manuale alla console host: **scollegare prima ogni supporto USB/disco con etichetta `CONFIG` dalla VM**. HAOS18.4 da priorita al supporto CONFIG e, se presente, puo ignorare la cartella boot. Dalla console `ha >` digitare `login` ed eseguire `findfs LABEL=CONFIG`: se trova un dispositivo, **STOP**, scollegarlo e ricontrollare; non proseguire con i comandi sotto. Solo quando non viene trovato alcun supporto CONFIG verificare che `/mnt/boot/CONFIG` non esista e che `/root/.ssh/authorized_keys` sia assente/vuoto. Sulla VM vergine creare la cartella boot e il suo `authorized_keys`, con esattamente la riga pubblica generata e LF finale, poi eseguire `ha os import`. HAOS18.4 rimuove la cartella boot dopo l'import. Sostituire **solo** la riga pubblica:

```sh
! findfs LABEL=CONFIG >/dev/null 2>&1 && test ! -e /mnt/boot/CONFIG && test ! -s /root/.ssh/authorized_keys && mkdir /mnt/boot/CONFIG
cat > /mnt/boot/CONFIG/authorized_keys <<'ACA_PUBLIC_KEY'
ssh-ed25519 INCOLLARE_BASE64_DELLA_PROPRIA_CHIAVE_PUBBLICA aca-pilot-bootstrap
ACA_PUBLIC_KEY
ha os import
```

Se il primo comando fallisce, fermarsi: non eseguire quelli successivi. Gli appunti condivisi non sono garantiti su HAOS e non si deve installare Guest Additions per farli funzionare; senza supporto CONFIG o inserimento manuale affidabile della riga pubblica, la predisposizione resta incompleta.

Leggere alla console la chiave **pubblica host** con:

```sh
test -f /etc/dropbear/dropbear_ed25519_host_key || dropbearkey -t ed25519 -f /etc/dropbear/dropbear_ed25519_host_key
dropbearkey -y -f /etc/dropbear/dropbear_ed25519_host_key | grep '^ssh-ed25519 '
```

Il launcher vuole `ssh-ed25519 BASE64`, senza commento. Non mostrare il file privato host e non sostituire la verifica console con `ssh-keyscan`, `accept-new` o verifica disabilitata. L'IP da solo non autorizza il bootstrap.

## 4. Bootstrap e ripresa

Dopo creazione/avvio manuali e import della sola chiave pubblica, scrivere `VM VERGINE PRONTA` nel launcher e fornire IP/chiave host verificati. `installation-owner.json` registra `platform: virtualbox-manual`: questo percorso non usa cmdlet Hyper-V e non pretende di verificare automaticamente configurazione o proprieta della VM. L'identita remota e il pin SSH verificato alla console.

Il bootstrap standalone e lo stesso usato dal percorso alternativo:

```powershell
.\pilot\Invoke-AcaBootstrap.ps1 -InstallationDirectory '<directory ACA-Pilota preparata>' -MaterialsDirectory '.\bootstrap' -Ip '192.168.1.20' -HostKey 'ssh-ed25519 BASE64_VERIFICATO' -WhatIf
```

Senza `-WhatIf` installa soltanto se checksum e versioni HAOS/Core corrispondono ai materiali. **HAOS18.4 vergine non congela il primo Core scaricato**: se differisce, qualificare la combinazione osservata e rigenerare i materiali, senza downgrade automatico. Anche il catalogo ACA deve offrire esattamente l'app candidata. Un kit locale non equivale a una pubblicazione gia disponibile.

Chiave host, IP e materiali restano legati al checkpoint. Un comando bootstrap interrotto richiede verifica alla console e conferma `RIPRENDI`; una revoca interrotta riprende dalla sua prova senza reinstallare. Anche rilanciando un checkpoint completato vengono riletti health/versione e manifesto bundle attuali: un target offline o diverso non viene dichiarato pronto e non viene reinstallato. Errori di rete non dimostrano la revoca. Creazioni locali incomplete conservano file e stato per diagnosi, senza adozione o sovrascrittura automatica.

Al termine il bootstrap verifica health e revoca la propria chiave, quindi elimina le due chiavi locali. Alla console arrestare anche il listener con `systemctl stop dropbear`; scollegare CONFIG e rimuovere dal supporto la sola chiave pubblica temporanea, per evitare una futura reimportazione. Aprire ACA sulla3002, creare account/casa propri e configurare eWeLink dall'app. Per il client Windows ZIP estrarlo in una nuova cartella e aprire `Acasystem.exe` insieme alle sue risorse.

La consegna richiede ancora prova LAN/telefono, onboarding vergine,2–3dispositivi propri, riavvio e persistenza. Il materiale non trasferisce dati del banco e non prova questi esiti.

Fonti primarie consultate il **2026-11-16**: [HAOS Windows/VirtualBox](https://www.home-assistant.io/installation/windows/), [API release HAOS18.4](https://api.github.com/repos/home-assistant/operating-system/releases/tags/18.4), [CONFIG18.4](https://github.com/home-assistant/operating-system/blob/18.4/buildroot-external/rootfs-overlay/usr/sbin/haos-config), [mount boot18.4](https://github.com/home-assistant/operating-system/blob/18.4/buildroot-external/rootfs-overlay/usr/lib/systemd/system/mnt-boot.mount), [SSH host](https://contributors.home-assistant.io/os/operating-system/debugging/), [Oracle VirtualBox7.2, storage](https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/storage.html).
