$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$acaErrors=$null;$acaTokens=$null
$acaPath=Join-Path $PSScriptRoot 'Test-AcaVirtualBoxStability.ps1'
$acaAst=[Management.Automation.Language.Parser]::ParseFile($acaPath,[ref]$acaTokens,[ref]$acaErrors)
if($acaErrors.Count){throw 'Errore di sintassi nel controllo VM'}
# Carica soltanto le funzioni pure: nessun comando VirtualBox o attesa nei test unitari.
foreach($acaFunction in $acaAst.FindAll({param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -in @('ConvertFrom-AcaVBoxClocks','Compare-AcaVBoxClocks')},$true)) {
    . ([scriptblock]::Create($acaFunction.Extent.Text))
}
function Assert-AcaTest([bool]$Condition,[string]$Message){if(-not $Condition){throw $Message}}
$acaStart=ConvertFrom-AcaVBoxClocks "Virtual: 1000000000`nVirtSync: 1000000000" '<Statistics/>'
$acaEnd=ConvertFrom-AcaVBoxClocks "Virtual: 301000000000`nVirtSync: 301000000000" '<Statistics/>'
Assert-AcaTest (Compare-AcaVBoxClocks $acaStart $acaEnd 300 0).Passed 'Campione sano rifiutato'
$acaSlow=ConvertFrom-AcaVBoxClocks "Virtual: 301000000000`nVirtSync: 110000000000" '<Statistics/>'
Assert-AcaTest (-not (Compare-AcaVBoxClocks $acaStart $acaSlow 300 0).Passed) 'Regressione REP007 nohz non rilevata'
$acaFast=ConvertFrom-AcaVBoxClocks "Virtual: 646000000000`nVirtSync: 646000000000" '<Statistics/>'
Assert-AcaTest (-not (Compare-AcaVBoxClocks $acaStart $acaFast 300 0).Passed) 'Tempo accelerato non rilevato'
$acaOld=ConvertFrom-AcaVBoxClocks "Virtual: 1000000000`nVirtSync: 1000000000" '<Statistics><U64 val="2000000000" name="/TM/VirtualSync/GivenUp"/></Statistics>'
Assert-AcaTest ($acaOld.GivenUp -eq 2000000000) 'Ordine attributi XML perso'
Assert-AcaTest (-not (Compare-AcaVBoxClocks $acaOld $acaEnd 300 0).Passed) 'Evento anteriore alla finestra nascosto'
Assert-AcaTest (-not (Compare-AcaVBoxClocks $acaStart $acaEnd 300 1).Passed) 'Heartbeat ignorato'
$acaRefused=$false;try{ConvertFrom-AcaVBoxClocks 'Real: 300' '<Statistics/>' | Out-Null}catch{$acaRefused=$true}
Assert-AcaTest $acaRefused 'Clock incompleto accettato'
$acaRefused=$false;try{ConvertFrom-AcaVBoxClocks "Virtual: 1000`nVirtSync: 1000" 'broken XML' | Out-Null}catch{$acaRefused=$true}
Assert-AcaTest $acaRefused 'Statistiche malformate accettate'
Write-Output 'PASS 8 controlli: clock sano, deriva, accelerazione, XML, GivenUp precedente, heartbeat, clock incompleto, statistiche malformate.'
