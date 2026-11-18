# Causa degli stalli della VM VirtualBox su questo PC

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261117-001 |
| Stato | Diagnosi conclusa; risveglio periodico superato su due avvii a freddo (prova lunga da fare), VM alla baseline |
| Data | 2026-11-17, Europe/Rome |
| Autore / modello | Claude Code, Claude Opus 5.5 |
| Commit di partenza | `c8b03a0` |
| Richiesta | «lavoriamo sulla stabilità della VM su questo PC» |
| Autorizzazione | Prove reversibili sulla sola VM REP092 `5c2409fa-1b8a-4522-bfe2-54daf258dc43`. Eccezione powercfg per gli eseguibili VirtualBox applicata dall'utente in un prompt amministratore. Nessuna modifica a sicurezza/VBS/Hyper-V, banco, altre VM, kit o sorgenti. |

## Obiettivo e perimetro

Riprendere ISSUE-129 dopo [REP-20261116-007](REP-20261116-007-recupero-lan-stabilita-vm.md): VirtualSync in ritardo, stalli del guest e mancato recupero dopo 60 s di link off, su Windows 11 Home con VBS attivo e VirtualBox 7.2.22 in modalità NEM. Verificare ipotesi lato host non ancora provate, poi individuare il meccanismo.

## Criteri di completamento

- Ipotesi motivate e provate una alla volta con `Test-AcaVirtualBoxStability.ps1` (300 s, stesse soglie) e tagli del link.
- Nessuna modifica permanente alla VM: configurazione e `cmdline.txt` finali identici alla baseline.
- Esiti, limiti e punto di ripresa registrati.

## Avanzamento e prove

Baseline confermata prima delle prove: 2 vCPU, 2048 MiB, provider default/KVM, cap 100, HPET off, NIC 82540EM bridged sul Wi-Fi, piano energetico host «Prestazioni elevate». Evidenze in `backup/rep096-ecoqos/` (escluso da Git).

| # | Prova | Esito |
|---|---|---|
| 1 | Eccezione power throttling (EcoQoS) per `VBoxHeadless.exe` e `VirtualBoxVM.exe`, avvio headless a freddo | Idle FALLITO: VirtSync −4,56 s/300 s, 2 flatline nella finestra (4–5 s), **nessun GivenUp**. Il 16/11 lo stesso profilo perdeva 43–109 s con GivenUp 180–460 s: miglioramento netto ma non sufficiente. Lo stato dell'eccezione non è leggibile senza privilegi; si assume applicata come riferito dall'utente. |
| 2 | Stessa VM con finestra GUI visibile (esclude il limite Windows 11 sulla risoluzione dei timer dei processi senza finestra) | Idle FALLITO: VirtSync −5,07 s, 1 flatline di 11 s. Nessuna differenza: ipotesi scartata. L'opt-out per processo via `SetProcessInformation` è rifiutato dall'hardening VirtualBox (accesso negato), non aggirato. |
| 3 | Tagli del link 10/30/60 s (HTTP sulla porta 80; la 8123 non è esposta su questa VM) | 10 s e 30 s: recupero in 8 s. 60 s: FALLITO entro 180 s, ripetuto due volte. Guest con carrier presente ma IPv4 vuoto. Un `e1000 Reset adapter` compare solo nel primo ciclo: non è la causa. |
| 4 | Prova causale: taglio 60 s, 60 s di attesa senza input, poi un solo tasto Maiusc via `keyboardputscancode` | Nessun recupero in 60 s; **HTTP tornato 0,5 s dopo il tasto**. Il log NetworkManager del secondo ciclo mostra il carrier visto dal guest 132 s dopo il ripristino, nel momento del primo input da console. |
| 5 | Guest `idle=poll` in `/mnt/boot/cmdline.txt` (vCPU sempre attive) | Peggiore: CPU host 198 % (2 core pieni), VirtSync +0,0016 s in 300 s, GivenUp 251→551 s, al riavvio successivo kernel fermo prima del rootfs. **Ritirato.** |

## Conclusione tecnica

In modalità NEM, su questo host, VirtualBox esegue i propri timer (timer del guest, VirtualSync, ritardo di link-up della NIC emulata) solo quando la vCPU esce verso VirtualBox per un evento esterno. Con la vCPU in HLT i timer scaduti non la risvegliano; con la vCPU in polling non esce mai e i timer non vengono eseguiti affatto. Un interrupt generato da un altro thread (tastiera, lettura della console, pacchetti in ingresso) sblocca il guest. Questo spiega insieme gli stalli idle, la deriva di VirtualSync, il «risveglio» osservato nel REP007 e il mancato recupero dopo 60 s: con link down non arrivano pacchetti, NetworkManager entra in idle e il link-up non viene consegnato.

È una diagnosi del meccanismo osservato, non del codice VirtualBox. Lo stesso tipo di difetto è affrontato per il backend WHPX di QEMU da una patch che forza l'uscita da HLT ([patchew, 2026-02-26](https://patchew.org/QEMU/20260226181930.53170-1-mohamed@unpredictable.fr/20260226181930.53170-3-mohamed@unpredictable.fr)). Nelle note di rilascio VirtualBox 7.2 consultate non risulta una correzione ([ChangeLog Oracle](https://docs.oracle.com/en/virtualization/virtualbox/7.2/relnotes/ChangeLog.html), consultato 2026-11-17). Sintomi simili su HAOS/VirtualBox/Windows: [forum HA](https://community.home-assistant.io/t/watchdog-timeout-issues-making-haos-unresponsive-in-virtualbox-vm-windows-10/503072). Rilevanza per i clienti: Windows 11 attiva VBS di default su molti PC nuovi, quindi VirtualBox girerà in NEM anche su PC diversi da questo.

## Ripristino e conservazione

- Dopo `idle=poll` il guest non avviava: due spegnimenti forzati con il kernel fermo prima del montaggio del rootfs/dati, poi avvio dello Slot A da GRUB sostituendo temporaneamente `$cmdline` con i suoi valori originali. Avvio riuscito, Observer in 11 s.
- `cmdline.txt` ripristinato dalla copia: SHA `5d969dc7b63c1a54193cc5db5e4c9903c3d92cddc3ce5439bedf588d7dbc8029`, identico alla baseline; copia temporanea rimossa. RAUC: slot A `good`; slot B `bad` già vuoto in precedenza (OK=0).
- HTTP porta 80 e Observer 200, poi `ha host shutdown` con poweroff in 15 s. Configurazione VM finale uguale alla baseline. Il pulsante ACPI è ignorato da HAOS: lo spegnimento ordinato passa dalla console.
- Eccezione powercfg lasciata attiva sull'host (decisione e revoca dell'utente: `powercfg /powerthrottling reset /path ...`).

## Prova del risveglio periodico (P-129-D), su richiesta dell'utente

Richiesta: «sì, prova il risveglio». Prototipo `vm-waker.ps1` (copia in `backup/rep096-ecoqos/vm-waker-prototipo.ps1`, non nel kit): un processo PowerShell apre una sessione condivisa sulla VM via COM VirtualBox (`LockMachine` Shared) e ogni 100 ms chiede `Debugger.Info('clocks')`. La richiesta viene eseguita sul thread EMT, quindi riporta in VirtualBox una vCPU in HLT, che esegue i timer scaduti. Non scrive nel guest, non manda traffico di rete e non cambia la configurazione.

- Primo tentativo non valido: il processo lanciato con `Start-Process -WindowStyle Hidden` dal task in background terminava subito, senza log. La misura risultante (`waker-idle1.json`) è senza risveglio: deriva 0 s ma 2 flatline da 5 s. Questa variabilità tra un avvio e l'altro va considerata.
- Prova valida da avvio a freddo, risveglio avviato come job 3 s dopo l'avvio e verificato vivo prima della misura, dopo e alla fine (8470 richieste, 0 errori in 853 s):
  - idle 300 s **PASS**: VirtSync +300,100 s su 300,106 s host, nessun GivenUp, **0 avvisi timer/heartbeat dall'inizio dell'avvio** (`waker-idle2.json`);
  - tagli del link 10/30/60/**120 s**: recupero HTTP in 8 s in tutti i casi (`waker-run2.txt`); senza risveglio il taglio di 60 s era fallito 2 volte su 2;
  - CPU host: VM 24,4 % di un core logico; tutti i processi PowerShell, risveglio compreso, 0,7 %.

- Ripetizione richiesta dall'utente («Prima ripeti breve»), secondo avvio a freddo con lo stesso protocollo (`waker-idle3.json`, `waker-run3.txt`, `waker-run3.log`): idle 300 s **PASS** (VirtSync +300,104 s su 300,098 s host, nessun GivenUp, 0 avvisi dall'avvio); tagli 10/30/60/120 s recuperati in 8 s; CPU VM 22,9 % + PowerShell 0,8 %; 8472 richieste, 0 errori.

Due avvii su due superati: non dimostrano stabilità H24 e non sostituisce la prova sul PC del capo. La contromisura dipende da un comportamento interno di VirtualBox (le richieste al debugger eseguite sull'EMT), non documentato come garanzia.

## Verifiche ed evidenze

| Controllo | Evidenza | Esito |
|---|---|---|
| Idle con eccezione EcoQoS | `ecoqos-idle1.json` | FALLITO (migliorato) |
| Idle con finestra visibile | `gui-visible-idle1.json` | FALLITO |
| Tagli link 10/30/60 s | `lan-cut1.txt`, `lan-cut2.txt` | 10/30 PASS, 60 FALLITO ×2 |
| Prova causale con tasto | `wake-test1.txt` | Recupero 0,5 s dopo l'input |
| `idle=poll` | `idlepoll-idle1.json`, `idlepoll-run1.txt` | FALLITO, ritirato |
| Ripristino baseline | console, hash, RAUC, showvminfo | PASS |
| Risveglio 100 ms, avvio a freddo | `waker-idle2.json`, `waker-run2.txt`, `waker-run2.log` | Idle PASS con 0 avvisi; tagli 10/30/60/120 s PASS (8 s); CPU 24 % + 0,7 % |
| Risveglio 100 ms, secondo avvio a freddo | `waker-idle3.json`, `waker-run3.txt`, `waker-run3.log` | Idle PASS con 0 avvisi; tagli 10/30/60/120 s PASS (8 s); CPU 22,9 % + 0,8 % |

Non eseguiti: prova 24 h, client reali, interruzione reale del Wi-Fi host (nel bridge Wi-Fi il guest non vede la caduta del carrier: il taglio del cavo virtuale è più severo della realtà per il link, non per gli stalli idle).

## Controllo del diff e decisioni

Diff limitato a questo report, al suo indice e alla nota di stato. Nessun sorgente, kit o dipendenza modificati; nessun commit, push o pubblicazione in questo intervento.

## Chiusura e punto di ripresa

VM spenta in modo ordinato e alla baseline anche dopo la prova del risveglio. ISSUE-129 resta aperta: causa individuata e prima contromisura superata su due avvii a freddo. Prossimo passo: prova lunga con il risveglio; poi, con autorizzazione, integrarlo nel kit/installer. Le strade richiedono una decisione umana, perché cambiano comportamento o stack:

- **P-129-D, proposta non approvata:** risveglio periodico lato host (es. pacchetti verso la VM o input neutro) come contromisura dichiarata; da collaudare con idle, tagli del link e consumo. Il REP007 escludeva i keepalive come mascheramento di una prova; qui sarebbe una scelta di prodotto esplicita.
- **P-129-E, proposta non approvata:** altro motore sullo stesso PC, per esempio QEMU/KVM dentro WSL2 (virtualizzazione annidata su Hyper-V), oppure Hyper-V nativo sui PC Windows Pro come quello del capo (P-129-C del REP007).
- Disattivare VBS/Hyper-V renderebbe VirtualBox nativo (VT-x), ma è una modifica di sicurezza che spetta all'utente, interromperebbe WSL2/Docker del banco e non è riproducibile sui PC dei clienti.
