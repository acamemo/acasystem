[CmdletBinding()]
param([string]$Cartella = (Join-Path $env:LOCALAPPDATA 'ACA-System\Centrale'))
# Mostra la schermata della centrale (QR e indirizzo): la VM gira senza finestra, quindi
# ne cattura l'immagine con VirtualBox e la apre nel visualizzatore di Windows.
$ErrorActionPreference = 'Stop'
$info = Join-Path $Cartella 'installazione.json'
if (-not (Test-Path -LiteralPath $info)) { Write-Host 'Centrale non installata: usare prima Installa.cmd.'; exit 1 }
$vm = Get-Content -LiteralPath $info -Raw | ConvertFrom-Json
$ErrorActionPreference = 'Continue'   # VBoxManage puo scrivere avvisi su stderr
$vbox = Join-Path $env:ProgramFiles 'Oracle\VirtualBox\VBoxManage.exe'
$stato = (& $vbox showvminfo $vm.vmId --machinereadable) -match '^VMState=' -replace 'VMState="(.*)"', '$1'
if ($stato -ne 'running') { Write-Host "La centrale non e accesa (stato: $stato). Disconnettersi e riaccedere a Windows, oppure attendere un minuto."; exit 1 }
$immagine = Join-Path $env:TEMP 'aca-centrale-schermata.png'
& $vbox controlvm $vm.vmId screenshotpng $immagine
if ($LASTEXITCODE -ne 0) { Write-Host 'Schermata non disponibile: riprovare tra qualche secondo.'; exit 1 }
Start-Process $immagine
