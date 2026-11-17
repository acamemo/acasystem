# Verifica della stabilità VirtualBox

Il controllo `Test-AcaVirtualBoxStability.ps1` misura una VM già avviata, con UUID e disco SATA0 esplicitamente indicati. È di sola lettura: non avvia, arresta, configura o recupera la VM e non cambia rete, protezioni o hypervisor Windows. Richiede VirtualBox già installato e PowerShell5.1 oppure7, senza Node o nuove dipendenze.

Una health positiva o un client aperto non dimostrano la continuità della centrale. Nel collaudo REP006 della .76.1 una VM apparentemente pronta ha perso HTTP, Observer e SSH dopo l'interruzione del link; pausa/ripresa manuale ha restituito accesso. La qualifica del PC destinatario deve includere sia timer/idle sia perdita e ritorno della rete.

Prima della misura chiudere il client e le altre sonde verso questa VM. Lasciare attivi i suoi servizi ordinari. Leggere l'UUID della nuova VM nella GUI di VirtualBox; usare il disco preparato per quella installazione. Il nome della VM e il solo IP non sostituiscono la verifica.

Esempio in PowerShell, con il proprio UUID:

```powershell
$vmId = '<UUID della sola VM ACA creata manualmente>'
$disk = Join-Path $env:LOCALAPPDATA 'ACA-System\Centrali\ACA-Pilota\haos.vdi'
$report = Join-Path $env:USERPROFILE ('Desktop\aca-vm-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.json')
& .\Test-AcaVirtualBoxStability.ps1 -VmId $vmId -DiskPath $disk -Seconds 300 -OutputFile $report
```

Durante l'attesa non interagire con la VM, non aprire il client e non inviare ping o richieste periodiche. Il programma stampa soltanto il tempo trascorso sull'host. I comandi VirtualBox sono letture ai confini della finestra; possono risvegliare un guest bloccato, perciò vengono controllati anche i contatori cumulativi e gli avvisi nel log dell'avvio corrente.

Il risultato rifiuta deriva oltre2secondi, recuperi del tempo abbandonati oltre100ms e avvisi di timer/heartbeat, anche anteriori alla finestra. Se fallisce, conserva il report e non considerare qualificata la centrale. Il programma non applica correzioni o pause/riprese per ottenere un PASS.

Esito locale REP007 del2026-11-16: cinque profili sperimentali non hanno risolto la piattaforma Windows/NEM in modo affidabile e sono stati ritirati. In particolare questo programma ha rilevato realmente i negativi VirtIO e3CPU suPowerShell5.1/7. Nessun parametro sperimentale è un prerequisito approvato per il PC del capo; la revisione del kit aggiunge diagnosi e criteri, non una promessa di correzione.

Ripetere dopo un vero arresto e avvio a freddo, quindi eseguire le prove LAN/client descritte in `COLLAUDO.md` sulla rete effettiva. Anche finestre superate non certificano H24: serve una prova prolungata sul PC del capo, con dispositivi e client reali. Il report non contiene token o chiavi.

Fonte tecnica: [VBoxManage7.2, debugvm](https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/vboxmanage.html), consultata2026-11-16. Le soglie derivano dal criterio di collaudo locale di ISSUE-129; non sono una certificazione Oracle.
