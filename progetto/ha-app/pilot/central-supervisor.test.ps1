$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$acaErrors=$null;$acaTokens=$null
$acaPath=Join-Path $PSScriptRoot 'Start-AcaCentralSupervisor.ps1'
$acaAst=[Management.Automation.Language.Parser]::ParseFile($acaPath,[ref]$acaTokens,[ref]$acaErrors)
if($acaErrors.Count){throw 'Errore di sintassi nel supervisore'}
# Carica soltanto le funzioni pure: nessun VirtualBox, COM o attesa nei test unitari.
foreach($acaFunction in $acaAst.FindAll({param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -in @('Get-AcaSupervisorAction','Get-AcaStartBackoffSeconds','Get-AcaLogRotation','Test-AcaGuestReset','Get-AcaLogReadStart','Get-AcaWakeInfoItem')},$true)) {
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
Assert-AcaTest ((Get-AcaSupervisorAction 'poweroff' $true $true) -eq 'start') 'Reset del guest non seguito dall''avvio a freddo'
Assert-AcaTest ((Get-AcaSupervisorAction 'running' $true $true) -eq 'wake') 'VM accesa non risvegliata durante il riavvio'
# Righe reali di VBox 7.2.22 (REP-20261118-001): reset ACPI chiesto dal guest e normale accensione/spegnimento.
$acaReset="00:14:46.232076 ACPI: Reset initiated by ACPI`n00:14:46.234010 Changing the VM state from 'RUNNING' to 'RESETTING'`n"
$acaNormal="00:00:01.486755 Changing the VM state from 'POWERING_ON' to 'RUNNING'`n00:02:43.892780 Changing the VM state from 'RUNNING' to 'POWERING_OFF'`n00:14:46.887457 Changing the VM state from 'RESETTING' to 'RUNNING'`n"
Assert-AcaTest (Test-AcaGuestReset $acaReset) 'Reset del guest non riconosciuto'
Assert-AcaTest (-not (Test-AcaGuestReset $acaNormal)) 'Accensione, spegnimento o fine reset scambiati per un nuovo reset'
Assert-AcaTest (-not (Test-AcaGuestReset '')) 'Log vuoto scambiato per reset'
Assert-AcaTest ((Get-AcaLogReadStart 5000 8000) -eq 5000 -and (Get-AcaLogReadStart 5000 1200) -eq 0) 'Ripresa della lettura di VBox.log errata'
# Richiesta di risveglio qualificata in idle (REP-20261118-001): le alternative senza rumore non hanno retto.
Assert-AcaTest ((Get-AcaWakeInfoItem) -eq 'clocks') 'Richiesta di risveglio diversa da quella qualificata'
Write-Output 'PASS 18 controlli: risveglio, primo avvio, spegnimento voluto, ripresa da salvata/interrotta, pausa, transitori, sconosciuto, attese, rotazione log, reset del guest, lettura di VBox.log e richiesta di risveglio.'
