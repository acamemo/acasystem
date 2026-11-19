[CmdletBinding()]
param([string]$Cartella = (Join-Path $env:LOCALAPPDATA 'ACA-System\Centrale'))
# Mostra la schermata della centrale (QR e indirizzo): la VM gira senza finestra, quindi
# ne cattura l'immagine con VirtualBox e la apre nel visualizzatore di Windows.
$ErrorActionPreference = 'Stop'
# Dal menu Start la console e nascosta: i messaggi compaiono anche in una finestra.
function Avvisa([string]$Testo) { Write-Host $Testo; try { [void](New-Object -ComObject WScript.Shell).Popup($Testo, 0, 'ACA SYSTEM', 64) } catch {} }
$info = Join-Path $Cartella 'installazione.json'
if (-not (Test-Path -LiteralPath $info)) { Avvisa 'Centrale non installata.'; exit 1 }
$vm = Get-Content -LiteralPath $info -Raw | ConvertFrom-Json
$ErrorActionPreference = 'Continue'   # VBoxManage puo scrivere avvisi su stderr
$vbox = Join-Path $(if ($env:ProgramW6432) { $env:ProgramW6432 } else { $env:ProgramFiles }) 'Oracle\VirtualBox\VBoxManage.exe'
$stato = (& $vbox showvminfo $vm.vmId --machinereadable) -match '^VMState=' -replace 'VMState="(.*)"', '$1'
if ($stato -ne 'running') { Avvisa "La centrale non e accesa (stato: $stato). Disconnettersi e riaccedere a Windows, oppure attendere un minuto."; exit 1 }
$immagine = Join-Path $env:TEMP 'aca-centrale-schermata.png'
& $vbox controlvm $vm.vmId screenshotpng $immagine
if ($LASTEXITCODE -ne 0) { Avvisa 'Schermata non disponibile: riprovare tra qualche secondo.'; exit 1 }
Start-Process $immagine
