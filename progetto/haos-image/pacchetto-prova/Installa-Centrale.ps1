[CmdletBinding()]
param(
    [string]$Cartella = (Join-Path $env:LOCALAPPDATA 'ACA-System\Centrale'),
    [string]$NomeVm = 'ACA-Centrale',
    [ValidateRange(2048, 8192)][int]$MemoriaMB = 2048,
    [ValidateRange(2, 4)][int]$Cpu = 2
)
# Pacchetto di prova ACA (REP-20261118-001): crea la VM VirtualBox della centrale dal disco
# incluso, la collega alla rete del PC e avvia il supervisore all'accesso a Windows.
# Non installa VirtualBox, non cambia protezioni, firewall o piano energetico del PC.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$pacchetto = $PSScriptRoot

function Scrivi([string]$Testo) { Write-Host $Testo }
function Fallisci([string]$Testo) { Write-Host ''; Write-Host "ERRORE: $Testo" -ForegroundColor Red; exit 1 }

$vbox = Join-Path $env:ProgramFiles 'Oracle\VirtualBox\VBoxManage.exe'
if (-not (Test-Path -LiteralPath $vbox)) { Fallisci 'VirtualBox non e installato. Installarlo da https://www.virtualbox.org e rilanciare.' }
function VBox([string[]]$Argomenti) {
    # VBoxManage scrive avanzamento e avvisi su stderr: conta solo il codice di uscita.
    $ErrorActionPreference = 'Continue'
    $out = & $vbox @Argomenti 2>&1
    if ($LASTEXITCODE -ne 0) { throw ("VBoxManage " + ($Argomenti -join ' ') + "`n" + ($out | Out-String)) }
    return $out
}

$disco = Get-ChildItem -LiteralPath (Join-Path $pacchetto 'centrale') -Filter '*.vdi' | Select-Object -First 1
if (-not $disco) { Fallisci 'Disco della centrale (.vdi) non trovato nella cartella centrale.' }

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
if ((Read-Host 'Scrivere SI per installare') -ne 'SI') { Scrivi 'Installazione annullata.'; exit 0 }

New-Item -ItemType Directory -Path $Cartella -Force | Out-Null
$discoVm = Join-Path $Cartella $disco.Name
Scrivi 'Copia del disco della centrale...'
Copy-Item -LiteralPath $disco.FullName -Destination $discoVm
VBox @('internalcommands', 'sethduuid', $discoVm) | Out-Null   # UUID nuovo: piu centrali di prova sullo stesso PC

Scrivi 'Creazione della VM...'
$creata = VBox @('createvm', '--name', $NomeVm, '--ostype', 'Linux_64', '--basefolder', $Cartella, '--register')
$uuid = ([regex]::Match(($creata | Out-String), 'UUID:\s*([0-9a-f-]{36})')).Groups[1].Value
VBox @('modifyvm', $uuid, '--memory', $MemoriaMB, '--cpus', $Cpu, '--firmware', 'efi', '--ioapic', 'on', '--rtc-use-utc', 'on', '--hpet', 'off',
    '--graphicscontroller', 'vmsvga', '--vram', '16', '--audio-enabled', 'off', '--usb-ohci', 'off', '--mouse', 'ps2',
    '--nic1', 'bridged', '--bridge-adapter1', $scheda.InterfaceDescription, '--nic-type1', '82540EM') | Out-Null
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
@{ vmId = $uuid; nomeVm = $NomeVm; cartella = $Cartella; attivita = "ACA SYSTEM - $NomeVm" } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $Cartella 'installazione.json') -Encoding UTF8

Scrivi 'Avvio della centrale...'
Start-ScheduledTask -TaskName "ACA SYSTEM - $NomeVm"
Scrivi ''
Scrivi 'Fatto. Al primo avvio la centrale scarica Home Assistant e Acasystem: servono 10-20 minuti e Internet.'
Scrivi 'Poi usare Mostra-Schermata.cmd: compare la schermata con il codice QR e l''indirizzo da usare su telefono e PC.'
