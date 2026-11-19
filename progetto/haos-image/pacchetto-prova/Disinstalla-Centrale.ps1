[CmdletBinding()]
param([string]$Cartella = (Join-Path $env:LOCALAPPDATA 'ACA-System\Centrale'), [switch]$Conferma)
# Rimuove la centrale di prova: attivita pianificata, VM e suo disco. I dati della casa nella
# centrale vanno persi; chiede conferma esplicita.
$ErrorActionPreference = 'Stop'
$info = Join-Path $Cartella 'installazione.json'
if (-not (Test-Path -LiteralPath $info)) { Write-Host "Nessuna centrale installata in $Cartella."; exit 0 }
$vm = Get-Content -LiteralPath $info -Raw | ConvertFrom-Json
Write-Host "Verranno eliminati la VM $($vm.nomeVm), il suo disco e la cartella $Cartella."
Write-Host 'Tutti i dati della centrale (account, dispositivi, impostazioni) andranno persi.'
if (-not $Conferma -and (Read-Host 'Scrivere ELIMINA per confermare') -ne 'ELIMINA') { Write-Host 'Annullato.'; exit 0 }
$vbox = Join-Path $(if ($env:ProgramW6432) { $env:ProgramW6432 } else { $env:ProgramFiles }) 'Oracle\VirtualBox\VBoxManage.exe'
if (Get-ScheduledTask -TaskName $vm.attivita -ErrorAction SilentlyContinue) {
    Stop-ScheduledTask -TaskName $vm.attivita -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $vm.attivita -Confirm:$false
}
# Il supervisore registrato termina con l'attivita; la VM viene spenta e cancellata.
# VBoxManage scrive avanzamento su stderr: non deve interrompere la rimozione.
$ErrorActionPreference = 'Continue'
& $vbox controlvm $vm.vmId poweroff 2>$null | Out-Null
Start-Sleep -Seconds 3
& $vbox unregistervm $vm.vmId --delete 2>$null | Out-Null
Remove-Item -LiteralPath $Cartella -Recurse -Force
Write-Host 'Centrale rimossa.'
