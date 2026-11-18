$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$acaErrors=$null;$acaTokens=$null
$acaPath=Join-Path $PSScriptRoot 'Start-AcaCentralSupervisor.ps1'
$acaAst=[Management.Automation.Language.Parser]::ParseFile($acaPath,[ref]$acaTokens,[ref]$acaErrors)
if($acaErrors.Count){throw 'Errore di sintassi nel supervisore'}
# Carica soltanto le funzioni pure: nessun VirtualBox, COM o attesa nei test unitari.
foreach($acaFunction in $acaAst.FindAll({param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -in @('Get-AcaSupervisorAction','Get-AcaStartBackoffSeconds','Get-AcaLogRotation')},$true)) {
    . ([scriptblock]::Create($acaFunction.Extent.Text))
}
function Assert-AcaTest([bool]$Condition,[string]$Message){if(-not $Condition){throw $Message}}
Assert-AcaTest ((Get-AcaSupervisorAction 'running' $false) -eq 'wake') 'VM in esecuzione non risvegliata'
Assert-AcaTest ((Get-AcaSupervisorAction 'poweroff' $false) -eq 'start') 'VM spenta non avviata al primo controllo'
Assert-AcaTest ((Get-AcaSupervisorAction 'poweroff' $true) -eq 'wait') 'Spegnimento voluto dal guest annullato con un riavvio'
Assert-AcaTest ((Get-AcaSupervisorAction 'saved' $true) -eq 'start') 'VM salvata (sospensione host) non ripresa'
Assert-AcaTest ((Get-AcaSupervisorAction 'aborted' $true) -eq 'start') 'VM interrotta non riavviata'
Assert-AcaTest ((Get-AcaSupervisorAction 'paused' $true) -eq 'wait') 'VM in pausa forzata a ripartire'
Assert-AcaTest ((Get-AcaSupervisorAction 'saving' $true) -eq 'wait') 'Stato transitorio trattato come fermo'
Assert-AcaTest ((Get-AcaSupervisorAction 'unknown' $false) -eq 'wait') 'Stato sconosciuto ha avviato la VM'
Assert-AcaTest ((Get-AcaStartBackoffSeconds 0) -eq 0 -and (Get-AcaStartBackoffSeconds 1) -eq 10 -and (Get-AcaStartBackoffSeconds 3) -eq 40) 'Attesa tra i tentativi errata'
Assert-AcaTest ((Get-AcaStartBackoffSeconds 20) -eq 300) 'Attesa tra i tentativi senza limite'
Assert-AcaTest ((Get-AcaLogRotation 1048576) -and -not (Get-AcaLogRotation 1000)) 'Rotazione del log errata'
Write-Output 'PASS 11 controlli: risveglio, primo avvio, spegnimento voluto, ripresa da salvata/interrotta, pausa, transitori, sconosciuto, attese, rotazione log.'
