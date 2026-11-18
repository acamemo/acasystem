[CmdletBinding()]
param(
    [Parameter(Mandatory)][guid]$VmId,
    [ValidateRange(50,1000)][int]$IntervalMs=100,
    [string]$LogDirectory=(Join-Path $env:LOCALAPPDATA 'ACA-System\Supervisore'),
    [ValidateRange(30,600)][int]$SaveTimeoutSeconds=120
)
# Supervisore della centrale ACA in VirtualBox (REP-20261117-001/002).
# - Avvia la VM headless se e spenta, salvata o interrotta; non la riavvia dopo uno spegnimento voluto dal guest.
# - Con VBox in modalita NEM i timer non risvegliano una vCPU in HLT: ogni IntervalMs accoda una richiesta
#   innocua al debugger (eseguita sul thread EMT) tramite COM, cosi i timer scaduti vengono eseguiti.
#   Si usa 'clocks', l'unica richiesta qualificata: scrive due righe di avviso in VBox.log a ogni chiamata
#   finche VirtualBox silenzia il gruppo TM (circa 30 min, log di circa 5 MB), e da li anche i veri avvisi dei
#   timer. 'cpumguest' ha superato due prove isolate ma e fallita con il supervisore; 'activetimers', 'fflags'
#   e 'help' non svegliano la vCPU (REP-20261118-001).
# - Alla chiusura della sessione Windows salva lo stato della VM (HAOS ignora il pulsante ACPI) e termina.
# - Un riavvio chiesto dal guest (reset ACPI) in NEM resta bloccato nell'avvio per molti minuti, mentre l'avvio
#   a freddo riesce: il supervisore legge VBox.log, riconosce il reset e lo trasforma in spegnimento e avvio
#   (REP-20261118-001). Il guest ha gia chiuso i filesystem prima di chiedere il reset.
# Non modifica configurazione della VM, rete, protezioni o piano energetico.
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest

function Get-AcaSupervisorAction([string]$State,[bool]$StartedOnce,[bool]$RestartPending=$false) {
    # Stati come in 'VBoxManage showvminfo --machinereadable' (VMState).
    switch($State) {
        'running' { return 'wake' }
        'poweroff' { if($StartedOnce -and -not $RestartPending){ return 'wait' } else { return 'start' } }
        { $_ -in @('saved','aborted','abortedsaved') } { return 'start' }
        default { return 'wait' }
    }
}

function Get-AcaStartBackoffSeconds([int]$Failures) {
    if($Failures -le 0){ return 0 }
    return [int][math]::Min(300, 10 * [math]::Pow(2, $Failures - 1))
}

function Get-AcaLogRotation([long]$Length,[long]$Limit=1048576) { return ($Length -ge $Limit) }

function Get-AcaWakeInfoItem { return 'clocks' }

function Test-AcaGuestReset([AllowEmptyString()][string]$LogText) {
    # Riga scritta da VirtualBox quando il guest (o il firmware) chiede un reset della macchina.
    return ($LogText -match "Changing the VM state from 'RUNNING' to 'RESETTING'")
}

function Get-AcaLogReadStart([long]$Offset,[long]$Length) {
    # Un VBox.log piu corto della posizione letta e un file nuovo (VM riavviata): si riparte dall'inizio.
    if($Length -lt $Offset){ return 0 }
    return $Offset
}

if($MyInvocation.InvocationName -eq '.') { return }   # caricato dai test: solo funzioni pure

$acaVBox=Join-Path $env:ProgramFiles 'Oracle\VirtualBox\VBoxManage.exe'
if(-not (Test-Path -LiteralPath $acaVBox)){ throw 'VirtualBox non trovato; installarlo prima di avviare la centrale' }
. (Join-Path $PSScriptRoot 'native-process.ps1')
New-Item -ItemType Directory -Force -Path $LogDirectory | Out-Null
$acaLog=Join-Path $LogDirectory ('supervisore-' + $VmId.ToString() + '.log')

function Write-AcaLog([string]$Message) {
    try {
        if((Test-Path -LiteralPath $acaLog) -and (Get-AcaLogRotation (Get-Item -LiteralPath $acaLog).Length)) { Move-Item -LiteralPath $acaLog -Destination ($acaLog + '.1') -Force }
        Add-Content -LiteralPath $acaLog -Value ('{0:o} {1}' -f (Get-Date), $Message) -Encoding UTF8
    } catch {}
}

function Get-AcaVmState {
    $acaRead=Invoke-AcaNative $acaVBox @('showvminfo',$VmId.ToString(),'--machinereadable') 15000
    if($acaRead.ExitCode -ne 0){ throw 'Stato VM non disponibile' }
    $acaMatch=[regex]::Match($acaRead.Output,'(?m)^VMState="([^"]+)"')
    if(-not $acaMatch.Success){ throw 'Stato VM non riconosciuto' }
    return $acaMatch.Groups[1].Value
}

function Get-AcaVmLogPath {
    $acaRead=Invoke-AcaNative $acaVBox @('showvminfo',$VmId.ToString(),'--machinereadable') 15000
    if($acaRead.ExitCode -ne 0){ return $null }
    # --machinereadable raddoppia le barre rovesciate nei percorsi.
    $acaFolder=[regex]::Match($acaRead.Output,'(?m)^LogFldr="([^"]+)"')
    if($acaFolder.Success){ return (Join-Path ($acaFolder.Groups[1].Value -replace '\\\\','\') 'VBox.log') }
    $acaConfig=[regex]::Match($acaRead.Output,'(?m)^CfgFile="([^"]+)"')
    if($acaConfig.Success){ return (Join-Path (Join-Path (Split-Path -Parent ($acaConfig.Groups[1].Value -replace '\\\\','\')) 'Logs') 'VBox.log') }
    return $null
}

function Read-AcaVBoxLog {
    # Restituisce soltanto le righe complete aggiunte dall'ultima lettura; alla prima lettura salta lo storico.
    if($null -eq $script:acaLogPath -or -not (Test-Path -LiteralPath $script:acaLogPath)){ return '' }
    $acaStream=[IO.File]::Open($script:acaLogPath,[IO.FileMode]::Open,[IO.FileAccess]::Read,([IO.FileShare]::ReadWrite -bor [IO.FileShare]::Delete))
    try {
        $acaLength=$acaStream.Length
        if($script:acaLogOffset -lt 0){ $script:acaLogOffset=$acaLength; $script:acaLogTail=''; return '' }
        $acaStart=Get-AcaLogReadStart $script:acaLogOffset $acaLength
        if($acaStart -ne $script:acaLogOffset){ $script:acaLogTail='' }
        if(($acaLength - $acaStart) -gt 4194304){ $acaStart=$acaLength - 4194304; $script:acaLogTail='' }
        $acaCount=[int]($acaLength - $acaStart)
        if($acaCount -le 0){ $script:acaLogOffset=$acaLength; return '' }
        $acaBytes=New-Object byte[] $acaCount
        [void]$acaStream.Seek($acaStart,[IO.SeekOrigin]::Begin)
        $acaRead=0; while($acaRead -lt $acaCount){ $acaPart=$acaStream.Read($acaBytes,$acaRead,$acaCount-$acaRead); if($acaPart -le 0){ break }; $acaRead+=$acaPart }
        $script:acaLogOffset=$acaStart + $acaRead
        $acaText=$script:acaLogTail + [Text.Encoding]::UTF8.GetString($acaBytes,0,$acaRead)
        $acaCut=$acaText.LastIndexOf("`n")
        if($acaCut -lt 0){ $script:acaLogTail=$acaText; return '' }
        $script:acaLogTail=$acaText.Substring($acaCut + 1)
        return $acaText.Substring(0,$acaCut + 1)
    } finally { $acaStream.Dispose() }
}

# Istanza unica per VM e utente.
$acaMutex=New-Object Threading.Mutex($false, ('Local\AcaCentralSupervisor-' + $VmId.ToString()))
if(-not $acaMutex.WaitOne(0)){ Write-AcaLog 'Altra istanza gia attiva: uscita'; return }

# Osservatore della chiusura sessione: finestra nascosta su un thread STA con il proprio ciclo messaggi.
Add-Type -ReferencedAssemblies System.Windows.Forms -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
public sealed class AcaSessionWatcher : NativeWindow {
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern bool ShutdownBlockReasonCreate(IntPtr h, string reason);
    [DllImport("user32.dll")] static extern bool ShutdownBlockReasonDestroy(IntPtr h);
    public readonly ManualResetEvent Ending = new ManualResetEvent(false);
    public readonly ManualResetEvent Saved = new ManualResetEvent(false);
    public int SaveTimeoutMs = 120000;
    public IntPtr Window { get { return Handle; } }
    public static AcaSessionWatcher Start() {
        AcaSessionWatcher w = null; var ready = new ManualResetEvent(false);
        var t = new Thread(() => { w = new AcaSessionWatcher(); w.CreateHandle(new CreateParams()); ready.Set(); Application.Run(); });
        t.IsBackground = true; t.SetApartmentState(ApartmentState.STA); t.Start(); ready.WaitOne();
        return w;
    }
    protected override void WndProc(ref Message m) {
        if (m.Msg == 0x0011) { // WM_QUERYENDSESSION: chiedere tempo e avviare il salvataggio
            ShutdownBlockReasonCreate(Handle, "ACA SYSTEM: salvataggio della centrale");
            Ending.Set(); m.Result = (IntPtr)1; return;
        }
        if (m.Msg == 0x0016 && m.WParam != IntPtr.Zero) { // WM_ENDSESSION: attendere la fine del salvataggio
            Ending.Set(); Saved.WaitOne(SaveTimeoutMs); ShutdownBlockReasonDestroy(Handle); m.Result = IntPtr.Zero; return;
        }
        base.WndProc(ref m);
    }
}
'@
$acaWatcher=[AcaSessionWatcher]::Start()
$acaWatcher.SaveTimeoutMs=$SaveTimeoutSeconds*1000
Write-AcaLog ('Avvio supervisore pid=' + $PID + ' hwnd=' + $acaWatcher.Window + ' intervallo=' + $IntervalMs + 'ms')

$acaSession=$null; $acaDebugger=$null; $acaStartedOnce=$false; $acaFailures=0; $acaNextStart=[DateTime]::MinValue
$acaState='unknown'; $acaNextCheck=[DateTime]::MinValue; $acaPokes=0; $acaPokeErrors=0; $acaNextReport=(Get-Date).AddMinutes(10)
$acaRestartPending=$false; $acaResets=0; $acaLogOffset=-1; $acaLogTail=''; $acaNextLogCheck=[DateTime]::MinValue
$acaLogPath=$null; try { $acaLogPath=Get-AcaVmLogPath } catch {}
if($null -eq $acaLogPath){ Write-AcaLog 'Percorso di VBox.log non trovato: riavvii del guest non riconosciuti' } else { Write-AcaLog ('Controllo riavvii su ' + $acaLogPath) }

function Close-AcaSession {
    if($null -ne $script:acaSession){ try { $script:acaSession.UnlockMachine() } catch {} }
    $script:acaSession=$null; $script:acaDebugger=$null
}
function Open-AcaSession {
    $acaVirtualBox=New-Object -ComObject VirtualBox.VirtualBox
    $script:acaSession=New-Object -ComObject VirtualBox.Session
    $acaVirtualBox.FindMachine($VmId.ToString()).LockMachine($script:acaSession, 1)   # condivisa: non prende possesso della VM
    $script:acaDebugger=$script:acaSession.Console.Debugger
}

try {
    while($true) {
        if($acaWatcher.Ending.WaitOne(0)) {
            Write-AcaLog 'Chiusura sessione Windows: salvataggio dello stato della VM'
            Close-AcaSession
            try {
                if((Get-AcaVmState) -eq 'running') {
                    $acaSave=Invoke-AcaNative $acaVBox @('controlvm',$VmId.ToString(),'savestate') ($SaveTimeoutSeconds*1000)
                    Write-AcaLog ('savestate exit=' + $acaSave.ExitCode + ' stato=' + (Get-AcaVmState))
                } else { Write-AcaLog 'VM non in esecuzione: nessun salvataggio' }
            } catch { Write-AcaLog ('Salvataggio fallito: ' + $_.Exception.Message) }
            $acaWatcher.Saved.Set() | Out-Null
            break
        }
        $acaNow=Get-Date
        if($acaNow -ge $acaNextCheck) {
            $acaNextCheck=$acaNow.AddSeconds(5)
            try { $acaNewState=Get-AcaVmState } catch { Write-AcaLog ('Lettura stato fallita: ' + $_.Exception.Message); $acaNewState='unknown' }
            if($acaNewState -ne $acaState){
                Write-AcaLog ('Stato VM: ' + $acaState + ' -> ' + $acaNewState)
                # Ogni accensione crea un VBox.log nuovo: dopo uno stato fermo si legge dall'inizio.
                if($acaNewState -eq 'running' -and $acaState -notin @('unknown','paused','running')){ $acaLogOffset=0; $acaLogTail='' }
                $acaState=$acaNewState
            }
            $acaAction=Get-AcaSupervisorAction $acaState $acaStartedOnce $acaRestartPending
            if($acaAction -ne 'wake'){ Close-AcaSession }
            if($acaAction -eq 'start' -and $acaNow -ge $acaNextStart) {
                $acaRun=Invoke-AcaNative $acaVBox @('startvm',$VmId.ToString(),'--type','headless') 120000
                if($acaRun.ExitCode -eq 0){
                    $acaStartedOnce=$true; $acaFailures=0; $acaLogOffset=0; $acaLogTail=''
                    if($acaRestartPending){ Write-AcaLog 'VM riavviata a freddo dopo il reset del guest' } else { Write-AcaLog 'VM avviata headless' }
                    $acaRestartPending=$false; $acaNextCheck=Get-Date
                }
                else {
                    $acaFailures++; $acaNextStart=(Get-Date).AddSeconds((Get-AcaStartBackoffSeconds $acaFailures))
                    Write-AcaLog ('Avvio fallito (' + $acaFailures + '): ' + ($acaRun.ErrorOutput.Trim() -split "`n")[0])
                }
            }
            if($acaAction -eq 'wake'){ $acaStartedOnce=$true }
        }
        if($acaState -eq 'running' -and (Get-Date) -ge $acaNextLogCheck) {
            $acaNextLogCheck=(Get-Date).AddSeconds(1)
            $acaNewLog=''
            try { $acaNewLog=Read-AcaVBoxLog } catch { $acaLogOffset=-1; $acaLogTail='' }
            if(Test-AcaGuestReset $acaNewLog) {
                $acaResets++
                Write-AcaLog ('Reset chiesto dal guest (' + $acaResets + '): spegnimento e avvio a freddo')
                Close-AcaSession
                try {
                    $acaOff=Invoke-AcaNative $acaVBox @('controlvm',$VmId.ToString(),'poweroff') 60000
                    Write-AcaLog ('poweroff exit=' + $acaOff.ExitCode)
                } catch { Write-AcaLog ('Spegnimento fallito: ' + $_.Exception.Message) }
                $acaRestartPending=$true; $acaNextStart=Get-Date; $acaNextCheck=Get-Date
                Start-Sleep -Milliseconds $IntervalMs
                continue
            }
        }
        if($acaState -eq 'running') {
            try {
                if($null -eq $acaDebugger){ Open-AcaSession }
                [void]$acaDebugger.Info((Get-AcaWakeInfoItem),'')
                $acaPokes++
            } catch {
                $acaPokeErrors++; Close-AcaSession; $acaNextCheck=Get-Date
                if($acaPokeErrors % 50 -eq 1){ Write-AcaLog ('Risveglio non riuscito: ' + $_.Exception.Message) }
                Start-Sleep -Seconds 1
            }
        }
        if((Get-Date) -ge $acaNextReport){ Write-AcaLog ('Risvegli=' + $acaPokes + ' errori=' + $acaPokeErrors + ' reset=' + $acaResets + ' stato=' + $acaState); $acaNextReport=(Get-Date).AddMinutes(10) }
        Start-Sleep -Milliseconds $IntervalMs
    }
} finally {
    Close-AcaSession
    Write-AcaLog ('Arresto supervisore: risvegli=' + $acaPokes + ' errori=' + $acaPokeErrors)
    $acaMutex.ReleaseMutex(); $acaMutex.Dispose()
}
