[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$DiscoZip,     # haos_ova-<ver>.vdi.zip prodotto da build.sh
    [Parameter(Mandatory)][string]$Uscita,       # cartella nuova fuori dal repository
    [string]$Versione = 'prova'
)
# Assembla il pacchetto di prova della centrale ACA: launcher, supervisore, disco e checksum.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if (Test-Path -LiteralPath $Uscita) { throw "La cartella $Uscita esiste gia" }
$qui = $PSScriptRoot
$pilot = Join-Path $qui '..\..\ha-app\pilot'
$nome = "ACA-Centrale-$Versione"
$radice = Join-Path $Uscita $nome
New-Item -ItemType Directory -Path (Join-Path $radice 'centrale'), (Join-Path $radice 'supervisore') -Force | Out-Null
foreach ($f in 'Installa.cmd', 'Installa-Centrale.ps1', 'Mostra-Schermata.cmd', 'Mostra-Schermata.ps1', 'Disinstalla.cmd', 'Disinstalla-Centrale.ps1', 'LEGGIMI.txt') {
    Copy-Item -LiteralPath (Join-Path $qui $f) -Destination $radice
}
foreach ($f in 'Start-AcaCentralSupervisor.ps1', 'native-process.ps1') {
    Copy-Item -LiteralPath (Join-Path $pilot $f) -Destination (Join-Path $radice 'supervisore')
}
Expand-Archive -LiteralPath $DiscoZip -DestinationPath (Join-Path $radice 'centrale')
$vdi = Get-ChildItem -LiteralPath (Join-Path $radice 'centrale') -Filter '*.vdi' | Select-Object -First 1
Rename-Item -LiteralPath $vdi.FullName -NewName 'aca-centrale.vdi'
$righe = Get-ChildItem -LiteralPath $radice -Recurse -File | Sort-Object FullName | ForEach-Object {
    $rel = $_.FullName.Substring($radice.Length + 1).Replace('\', '/')
    '{0}  {1}' -f (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant(), $rel
}
[IO.File]::WriteAllLines((Join-Path $radice 'SHA256SUMS'), $righe, (New-Object Text.UTF8Encoding($false)))
$zip = Join-Path $Uscita "$nome.zip"
# tar di Windows: Compress-Archive di PowerShell 5.1 non gestisce file oltre 2 GB.
& (Join-Path $env:SystemRoot 'System32\tar.exe') -a -cf $zip -C $Uscita $nome
if ($LASTEXITCODE -ne 0) { throw 'Creazione dello ZIP non riuscita' }
Get-Item $zip | Select-Object FullName, Length
