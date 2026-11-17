[CmdletBinding()]
param(
    [Parameter(Mandatory)][guid]$VmId,
    [Parameter(Mandatory)][string]$DiskPath,
    [Parameter(Mandatory)][string]$OutputFile,
    [ValidateRange(300,1800)][int]$Seconds=300
)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'native-process.ps1')

function ConvertFrom-AcaVBoxClocks([string]$Clocks,[string]$Statistics) {
    $acaValues=@{}
    foreach($acaName in @('Virtual','VirtSync')) {
        $acaMatch=[regex]::Match($Clocks,'(?m)^\s*'+$acaName+':\s+(\d+)')
        if(-not $acaMatch.Success){throw 'Domini del tempo VirtualBox non disponibili'}
        $acaValues[$acaName]=[long]$acaMatch.Groups[1].Value
    }
    $acaXml=[xml]$Statistics
    $acaGiven=$acaXml.SelectSingleNode('//U64[@name="/TM/VirtualSync/GivenUp"]')
    $acaValues.GivenUp=if($null -ne $acaGiven){[long]$acaGiven.GetAttribute('val')}else{$null}
    return [pscustomobject]$acaValues
}

function Compare-AcaVBoxClocks($Before,$After,[double]$ElapsedSeconds,[int]$LogWarnings) {
    $acaVirtual=($After.Virtual-$Before.Virtual)/1e9
    $acaSync=($After.VirtSync-$Before.VirtSync)/1e9
    $acaReasons=New-Object 'Collections.Generic.List[string]'
    if([math]::Abs($acaVirtual-$ElapsedSeconds) -gt 2){$acaReasons.Add('VIRTUAL_CLOCK_DRIFT')}
    if([math]::Abs($acaSync-$ElapsedSeconds) -gt 2){$acaReasons.Add('VIRTUALSYNC_DRIFT')}
    # Un evento precedente alla finestra non viene nascosto da un delta successivo sano.
    if($null -ne $Before.GivenUp -and $Before.GivenUp -gt 100000000){$acaReasons.Add('GIVEN_UP_BEFORE_SAMPLE')}
    if($null -ne $After.GivenUp -and $After.GivenUp -gt 100000000){$acaReasons.Add('GIVEN_UP_AFTER_SAMPLE')}
    if($LogWarnings -gt 0){$acaReasons.Add('TIMER_OR_HEARTBEAT_WARNING')}
    return [pscustomobject]@{Passed=($acaReasons.Count -eq 0);HostSeconds=$ElapsedSeconds;VirtualSeconds=$acaVirtual;VirtualSyncSeconds=$acaSync;GivenUpBeforeNs=$Before.GivenUp;GivenUpAfterNs=$After.GivenUp;LogWarnings=$LogWarnings;Reasons=@($acaReasons.ToArray())}
}

$acaVBox=Join-Path $env:ProgramFiles 'Oracle/VirtualBox/VBoxManage.exe'
if(-not (Test-Path -LiteralPath $acaVBox)){throw 'VirtualBox non trovato; nessuna installazione automatica'}
$acaDisk=(Get-Item -LiteralPath $DiskPath -ErrorAction Stop).FullName
$acaOutput=[IO.Path]::GetFullPath($OutputFile)
if(Test-Path -LiteralPath $acaOutput){throw 'Il report esiste gia; scegliere un file nuovo'}

function Read-AcaVBoxInfo {
    $acaRead=Invoke-AcaNative $acaVBox @('showvminfo',$VmId.ToString(),'--machinereadable') 15000
    if($acaRead.ExitCode -ne 0){throw 'Stato VM non disponibile'}
    $acaInfo=@{}
    foreach($acaLine in $acaRead.Output.Split("`n")) {
        if($acaLine.TrimEnd("`r") -match '^(UUID|VMState|CfgFile|cpus|memory|cpuexecutioncap|paravirtprovider|effparavirtprovider|"SATA-0-0")=(.+)$') {
            $acaKey=$Matches[1];$acaValue=$Matches[2]
            $acaInfo[$acaKey]=if($acaValue.StartsWith('"')){ConvertFrom-Json -InputObject $acaValue}else{$acaValue}
        }
    }
    if($acaInfo.UUID -cne $VmId.ToString() -or $acaInfo.VMState -cne 'running'){throw 'La VM richiesta deve essere in esecuzione'}
    if(-not $acaInfo.ContainsKey('"SATA-0-0"') -or -not [string]::Equals((Get-Item -LiteralPath $acaInfo['"SATA-0-0"']).FullName,$acaDisk,[StringComparison]::OrdinalIgnoreCase)){throw 'Disco SATA0 diverso da quello esplicitamente indicato; prova rifiutata'}
    return $acaInfo
}
function Read-AcaVBoxClock {
    $acaClock=Invoke-AcaNative $acaVBox @('debugvm',$VmId.ToString(),'info','clocks') 15000
    $acaStats=Invoke-AcaNative $acaVBox @('debugvm',$VmId.ToString(),'statistics','--pattern','/TM/VirtualSync/*') 15000
    if($acaClock.ExitCode -ne 0 -or $acaStats.ExitCode -ne 0){throw 'Lettura clock VM non riuscita'}
    return ConvertFrom-AcaVBoxClocks $acaClock.Output $acaStats.Output
}
$acaInitial=Read-AcaVBoxInfo
$acaConfigSha=(Get-FileHash -LiteralPath $acaInitial.CfgFile -Algorithm SHA256).Hash
$acaWatch=[Diagnostics.Stopwatch]::StartNew()
$acaBeforeAt=$acaWatch.Elapsed.TotalSeconds
$acaBefore=Read-AcaVBoxClock
Write-Host "Misura di $Seconds secondi: nessuna sonda HTTP/SSH, ping, controllo o recupero della VM durante l intervallo."
$acaQuietStart=$acaWatch.Elapsed.TotalSeconds
while($acaWatch.Elapsed.TotalSeconds-$acaQuietStart -lt $Seconds) {
    $acaRemaining=$Seconds-($acaWatch.Elapsed.TotalSeconds-$acaQuietStart)
    if($acaRemaining -gt 0){Start-Sleep -Milliseconds ([int][math]::Min(30000,[math]::Ceiling($acaRemaining*1000)))}
    Write-Host ('Attesa host: {0:N0} s' -f ($acaWatch.Elapsed.TotalSeconds-$acaQuietStart))
}
$acaAfterAt=$acaWatch.Elapsed.TotalSeconds
$acaAfter=Read-AcaVBoxClock
$acaFinal=Read-AcaVBoxInfo
$acaLog=Join-Path (Split-Path -Parent $acaFinal.CfgFile) 'Logs/VBox.log'
$acaWarnings=@(Select-String -LiteralPath $acaLog -Pattern 'TM: Giving up catch-up attempt|Guest seems to be unresponsive|Guest seems to be alive again').Count
$acaResult=Compare-AcaVBoxClocks $acaBefore $acaAfter ($acaAfterAt-$acaBeforeAt) $acaWarnings
$acaConfigSame=$acaConfigSha -ceq (Get-FileHash -LiteralPath $acaFinal.CfgFile -Algorithm SHA256).Hash
if(-not $acaConfigSame){$acaResult.Passed=$false;$acaResult.Reasons+= 'VM_CONFIGURATION_CHANGED'}
$acaEvidence=[ordered]@{schema=1;utc=[DateTime]::UtcNow.ToString('o');vmId=$VmId.ToString();seconds=$Seconds;probeTrafficDuringSample=0;vmMutations=0;result=$acaResult;cpus=$acaFinal.cpus;memoryMiB=$acaFinal.memory;cpuExecutionCap=$acaFinal.cpuexecutioncap;provider=$acaFinal.effparavirtprovider;limit='Una finestra non certifica H24. Ripetere dopo avvio a freddo e collaudare disconnessione/riconnessione LAN.'}
[IO.File]::WriteAllText($acaOutput,($acaEvidence | ConvertTo-Json -Depth 6),(New-Object Text.UTF8Encoding($false)))
if(-not $acaResult.Passed){throw "Stabilita non qualificata: $($acaResult.Reasons -join ', '). Report: $acaOutput"}
Write-Output "Finestra superata; H24 e LAN restano distinti. Report: $acaOutput"
