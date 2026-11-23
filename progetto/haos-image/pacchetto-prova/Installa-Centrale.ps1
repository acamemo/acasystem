[CmdletBinding()]
param(
    [string]$Cartella = (Join-Path $env:LOCALAPPDATA 'ACA-System\Centrale'),
    [string]$NomeVm = 'ACA-Centrale',
    [ValidateRange(2048, 8192)][int]$MemoriaMB = 2048,
    [ValidateRange(2, 4)][int]$Cpu = 2,
    # Installatore .exe: disco scaricato da GitHub con impronta fissata, conferma gia data nella procedura.
    [string]$UrlDisco = '',
    [ValidatePattern('^([a-f0-9]{64})?$')][string]$ImprontaDisco = '',
    [switch]$Conferma,
    # App Windows: disco .vdi gia scaricato e verificato (viene spostato nella cartella della centrale);
    # -NonInterattivo implica -Conferma e non attende mai l'utente: gli errori escono come 'ERRORE: ...' con codice 1.
    [string]$Disco = '',
    [switch]$NonInterattivo
)
# Pacchetto di prova ACA (REP-20261118-001): crea la VM VirtualBox della centrale dal disco
# incluso, la collega alla rete del PC e avvia il supervisore all'accesso a Windows.
# Non installa VirtualBox, non cambia protezioni, firewall o piano energetico del PC.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$pacchetto = $PSScriptRoot
# Installatore .exe: registro dell'installazione, utile se la finestra si chiude.
if ($Conferma -or $NonInterattivo) { try { Start-Transcript -Path (Join-Path $env:TEMP 'aca-installazione.log') -Append | Out-Null } catch {} }

function Scrivi([string]$Testo) { Write-Host $Testo }
function Fallisci([string]$Testo) {
    Write-Host ''; Write-Host "ERRORE: $Testo" -ForegroundColor Red
    if ($Conferma -and -not $NonInterattivo) { Read-Host 'Premere Invio per chiudere' | Out-Null }
    exit 1
}

$vbox = Join-Path $(if ($env:ProgramW6432) { $env:ProgramW6432 } else { $env:ProgramFiles }) 'Oracle\VirtualBox\VBoxManage.exe'
if (-not (Test-Path -LiteralPath $vbox)) { Fallisci 'VirtualBox non e installato. Installarlo da https://www.virtualbox.org e rilanciare.' }
function VBox([string[]]$Argomenti) {
    # VBoxManage scrive avanzamento e avvisi su stderr: conta solo il codice di uscita.
    $ErrorActionPreference = 'Continue'
    $out = & $vbox @Argomenti 2>&1
    if ($LASTEXITCODE -ne 0) { throw ("VBoxManage " + ($Argomenti -join ' ') + "`n" + ($out | Out-String)) }
    return $out
}

# Attenzione: PowerShell non distingue maiuscole, $disco sarebbe lo stesso parametro $Disco: variabile con altro nome.
if ($Disco) {
    if ($Disco -notlike '*.vdi' -or -not (Test-Path -LiteralPath $Disco -PathType Leaf)) { Fallisci 'Il disco della centrale (.vdi) non e stato trovato.' }
    $discoPronto = Get-Item -LiteralPath $Disco
} else {
    $discoPronto = Get-ChildItem -LiteralPath (Join-Path $pacchetto 'centrale') -Filter '*.vdi' -ErrorAction SilentlyContinue | Select-Object -First 1
}
if (-not $discoPronto -and -not ($UrlDisco -and $ImprontaDisco)) { Fallisci 'Disco della centrale (.vdi) non trovato nella cartella centrale.' }

# Integrita del pacchetto: controlla i file elencati in SHA256SUMS.
$somme = Join-Path $pacchetto 'SHA256SUMS'
if (Test-Path -LiteralPath $somme) {
    Scrivi 'Controllo dei file del pacchetto...'
    foreach ($riga in Get-Content -LiteralPath $somme) {
        if ($riga -notmatch '^([a-f0-9]{64})  (.+)$') { Fallisci 'SHA256SUMS non valido.' }
        $file = Join-Path $pacchetto $Matches[2]
        if (-not (Test-Path -LiteralPath $file) -or (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() -ne $Matches[1]) { Fallisci "File danneggiato o mancante: $($Matches[2]). Scaricare di nuovo il pacchetto." }
    }
}

if ((VBox @('list', 'vms')) -match ('^"' + [regex]::Escape($NomeVm) + '"')) { Fallisci "Esiste gia una VM chiamata $NomeVm. Per reinstallare usare prima Disinstalla.cmd." }
if (Test-Path -LiteralPath $Cartella) { Fallisci "La cartella $Cartella esiste gia. Per reinstallare usare prima Disinstalla.cmd." }
$libero = (Get-PSDrive -Name ([IO.Path]::GetPathRoot($Cartella).Substring(0, 1))).Free
if ($libero -lt 40GB) { Fallisci 'Servono almeno 40 GB liberi sul disco.' }

# Scheda di rete usata da Windows per Internet: la VM si collega alla stessa rete (bridge).
$rotta = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Sort-Object { $_.RouteMetric + $_.InterfaceMetric } | Select-Object -First 1
if (-not $rotta) { Fallisci 'Nessuna connessione di rete attiva: collegare il PC alla rete di casa.' }
$scheda = Get-NetAdapter -InterfaceIndex $rotta.InterfaceIndex
$ponti = (VBox @('list', 'bridgedifs')) | Where-Object { $_ -match '^Name:\s+(.+)$' } | ForEach-Object { ($_ -replace '^Name:\s+', '').Trim() }
if ($ponti -notcontains $scheda.InterfaceDescription) { Fallisci "VirtualBox non vede la scheda di rete '$($scheda.InterfaceDescription)'. Reinstallare VirtualBox con il driver Bridged Networking." }

Scrivi ''
Scrivi "Centrale ACA: VM $NomeVm, $Cpu CPU, $MemoriaMB MB di memoria, rete '$($scheda.Name)'."
Scrivi "Cartella: $Cartella"
Scrivi 'La centrale parte da sola a ogni accesso a Windows e resta accesa finche il PC e acceso.'
if (-not $Conferma -and -not $NonInterattivo -and (Read-Host 'Scrivere SI per installare') -ne 'SI') { Scrivi 'Installazione annullata.'; exit 0 }

New-Item -ItemType Directory -Path $Cartella -Force | Out-Null
if ($discoPronto) {
    $discoVm = Join-Path $Cartella $discoPronto.Name
    if ($Disco) {
        # Disco scaricato dall'app: e nostro, si sposta senza duplicare 8 GB.
        Scrivi 'Spostamento del disco della centrale...'
        Move-Item -LiteralPath $discoPronto.FullName -Destination $discoVm
    } else {
        Scrivi 'Copia del disco della centrale...'
        Copy-Item -LiteralPath $discoPronto.FullName -Destination $discoVm
    }
} else {
    # Disco da GitHub: curl.exe e tar.exe sono inclusi in Windows 10 1803 e successivi.
    $zip = Join-Path $Cartella 'disco-centrale.zip'
    Scrivi 'Download del disco della centrale (circa 600 MB)...'
    # curl e tar scrivono avanzamento su stderr: con Stop PowerShell 5.1 lo tratterebbe come errore.
    # Una connessione lenta puo cadere a meta (curl 18): ogni tentativo riprende dai byte gia scaricati.
    $ErrorActionPreference = 'Continue'
    for ($tentativo = 1; $tentativo -le 20; $tentativo++) {
        if ($tentativo -gt 1) { Scrivi "Connessione interrotta: ripresa del download (tentativo $tentativo di 20)..."; Start-Sleep -Seconds 10 }
        & "$env:SystemRoot\System32\curl.exe" -L --fail --retry 5 --retry-delay 10 --connect-timeout 30 -C - -o $zip $UrlDisco
        $esito = $LASTEXITCODE
        if ($esito -eq 0) { break }
    }
    $ErrorActionPreference = 'Stop'
    if ($esito -ne 0) { Remove-Item -LiteralPath $Cartella -Recurse -Force; Fallisci "Download non riuscito (curl $esito): controllare la connessione a Internet e riprovare." }
    Scrivi 'Controllo del disco scaricato...'
    if ((Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant() -ne $ImprontaDisco) {
        Remove-Item -LiteralPath $Cartella -Recurse -Force; Fallisci 'Il disco scaricato non corrisponde a quello previsto: installazione interrotta.'
    }
    Scrivi 'Estrazione del disco...'
    $ErrorActionPreference = 'Continue'
    & "$env:SystemRoot\System32\tar.exe" -xf $zip -C $Cartella
    $esito = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    Remove-Item -LiteralPath $zip
    $estratto = Get-ChildItem -LiteralPath $Cartella -Filter '*.vdi' | Select-Object -First 1
    if ($esito -ne 0 -or -not $estratto) { Remove-Item -LiteralPath $Cartella -Recurse -Force; Fallisci 'Estrazione del disco non riuscita.' }
    $discoVm = $estratto.FullName
}
VBox @('internalcommands', 'sethduuid', $discoVm) | Out-Null   # UUID nuovo: piu centrali di prova sullo stesso PC

Scrivi 'Creazione della VM...'
$creata = VBox @('createvm', '--name', $NomeVm, '--ostype', 'Linux_64', '--basefolder', $Cartella, '--register')
$uuid = ([regex]::Match(($creata | Out-String), 'UUID:\s*([0-9a-f-]{36})')).Groups[1].Value
$retePreparazione = $null
$reteVm = @('--nic1', 'bridged', '--bridge-adapter1', $scheda.InterfaceDescription)
if ($NonInterattivo) {
    # Durante il primo avvio l'app legge i tre servizi solo da loopback.
    $retePreparazione = @{ bridgeAdapter = $scheda.InterfaceDescription }
    $reteVm = @('--nic1', 'nat')
    $prese = @()
    try {
        foreach ($porta in @(@{ nome = 'jobsPort'; guest = 80 }, @{ nome = 'corePort'; guest = 8123 }, @{ nome = 'appPort'; guest = 3002 })) {
            $presa = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
            $prese += $presa
            $presa.Start()
            $numero = ([Net.IPEndPoint]$presa.LocalEndpoint).Port
            $retePreparazione[$porta.nome] = $numero
            $reteVm += @('--nat-pf1', "aca-$($porta.nome),tcp,127.0.0.1,$numero,,$($porta.guest)")
        }
    } finally {
        foreach ($presa in $prese) { $presa.Stop() }
    }
}
VBox (@('modifyvm', $uuid, '--memory', $MemoriaMB, '--cpus', $Cpu, '--firmware', 'efi', '--ioapic', 'on', '--rtc-use-utc', 'on', '--hpet', 'off',
    '--graphicscontroller', 'vmsvga', '--vram', '16', '--audio-enabled', 'off', '--usb-ohci', 'off', '--mouse', 'ps2',
    '--nic-type1', '82540EM') + $reteVm) | Out-Null
VBox @('storagectl', $uuid, '--name', 'SATA', '--add', 'sata', '--controller', 'IntelAhci', '--portcount', '1') | Out-Null
VBox @('storageattach', $uuid, '--storagectl', 'SATA', '--port', '0', '--device', '0', '--type', 'hdd', '--medium', $discoVm) | Out-Null

# Supervisore: avvio della VM, risveglio periodico (VirtualBox in modalita NEM) e riavvii del guest.
$supervisore = Join-Path $Cartella 'supervisore'
New-Item -ItemType Directory -Path $supervisore -Force | Out-Null
Copy-Item -Path (Join-Path $pacchetto 'supervisore\*') -Destination $supervisore
$script = Join-Path $supervisore 'Start-AcaCentralSupervisor.ps1'
$log = Join-Path $Cartella 'log'
$azione = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $script + '" -VmId ' + $uuid + ' -LogDirectory "' + $log + '"')
$avvio = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
$regole = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName "ACA SYSTEM - $NomeVm" -Action $azione -Trigger $avvio -Settings $regole -Description 'Avvia e mantiene attiva la centrale ACA in VirtualBox.' | Out-Null
$installazione = @{ vmId = $uuid; nomeVm = $NomeVm; cartella = $Cartella; attivita = "ACA SYSTEM - $NomeVm" }
if ($retePreparazione) { $installazione.setupNat = $retePreparazione }
$installazione | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $Cartella 'installazione.json') -Encoding UTF8

Scrivi 'Avvio della centrale...'
Start-ScheduledTask -TaskName "ACA SYSTEM - $NomeVm"
Scrivi ''
Scrivi 'Fatto. Al primo avvio la centrale scarica Home Assistant e Acasystem: servono 10-20 minuti e Internet.'
Scrivi ('Poi usare ' + $(if ($Conferma) { 'menu Start > ACA SYSTEM > Mostra la schermata della centrale' } else { 'Mostra-Schermata.cmd' }) + ': compare la schermata con il codice QR e l''indirizzo da usare su telefono e PC.')
