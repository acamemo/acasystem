[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$Uscita,   # file .exe da creare, fuori dal repository
    [string]$Versione = '0.2.0',
    [string]$ClientZip = (Join-Path $PSScriptRoot '..\..\client\windows\release\Acasystem-0.2.0-win-x64.zip'),
    [string]$MakeNsis = (Join-Path $env:LOCALAPPDATA 'electron-builder\Cache\nsis-3.0.4.1\nsis-3.0.4.1-1mx3n\makensis.exe')
)
# Crea l'installatore .exe di ACA SYSTEM (REP-20261118-001, REP-20261120-001): app per PC, script della
# centrale e supervisore dentro l'eseguibile. Il disco della centrale lo scarica l'app al primo avvio.
# NSIS e quello gia scaricato da electron-builder per il client Windows.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if (Test-Path -LiteralPath $Uscita) { throw "Il file $Uscita esiste gia" }
foreach ($f in $MakeNsis, $ClientZip) { if (-not (Test-Path -LiteralPath $f)) { throw "Non trovato: $f" } }

$qui = $PSScriptRoot
$pacchetto = Join-Path $qui '..\pacchetto-prova'
$pilot = Join-Path $qui '..\..\ha-app\pilot'
$lavoro = Join-Path $env:TEMP ("aca-installer-" + [guid]::NewGuid().ToString('N'))
$script = Join-Path $lavoro 'Installatore'
$client = Join-Path $lavoro 'Client'
New-Item -ItemType Directory -Path (Join-Path $script 'supervisore'), $client -Force | Out-Null
try {
    foreach ($f in 'Installa-Centrale.ps1', 'Disinstalla-Centrale.ps1', 'Mostra-Schermata.ps1') {
        Copy-Item -LiteralPath (Join-Path $pacchetto $f) -Destination $script
    }
    foreach ($f in 'Start-AcaCentralSupervisor.ps1', 'native-process.ps1') {
        Copy-Item -LiteralPath (Join-Path $pilot $f) -Destination (Join-Path $script 'supervisore')
    }
    & (Join-Path $env:SystemRoot 'System32\tar.exe') -xf $ClientZip -C $client
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath (Join-Path $client 'Acasystem.exe'))) { throw 'App per PC non estratta correttamente' }

    $out = [IO.Path]::GetFullPath($Uscita)
    & $MakeNsis /V2 "/DVERSIONE=$Versione" "/DUSCITA=$out" "/DSCRIPT_DIR=$script" "/DCLIENT_DIR=$client" (Join-Path $qui 'aca-system.nsi')
    if ($LASTEXITCODE -ne 0) { throw 'Compilazione NSIS non riuscita' }
    Get-Item -LiteralPath $out | Select-Object FullName, Length, @{ n = 'SHA256'; e = { (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant() } }
} finally {
    Remove-Item -LiteralPath $lavoro -Recurse -Force -ErrorAction SilentlyContinue
}
