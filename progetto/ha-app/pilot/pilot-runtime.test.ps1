$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
# Esegue i sorgenti con adapter/cmdlet fittizi in una directory isolata: niente VM o rete.
$acaTestRoot = Join-Path ([IO.Path]::GetTempPath()) ('aca-pilot-runtime-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $acaTestRoot | Out-Null
$acaScripts = Join-Path $acaTestRoot 'pilot'
New-Item -ItemType Directory -Path $acaScripts | Out-Null
foreach ($acaFile in @('Invoke-AcaBootstrap.ps1', 'Start-AcaPilotSetup.ps1', 'Test-AcaPilotHost.ps1', 'New-AcaPilotVm.ps1', 'haos-image.json')) { Copy-Item -LiteralPath (Join-Path $PSScriptRoot $acaFile) -Destination (Join-Path $acaScripts $acaFile) }
$acaHelper = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'native-process.ps1')) + @'

function Test-AcaPilotAdministrator { return $global:acaTestAdmin }
function Invoke-AcaNative([string]$Command, [string[]]$Arguments) {
    $acaRemote = $Arguments[-1]
    $global:acaNativeCalls.Add($Command + ':' + $acaRemote)
    if ($Command -eq 'scp.exe') { return [pscustomobject]@{ ExitCode=0; Output=''; ErrorOutput='' } }
    if ($acaRemote -eq 'ha --raw-json os info') { return [pscustomobject]@{ ExitCode=0; Output='{"result":"ok","data":{"version":"18.4"}}'; ErrorOutput='' } }
    if ($acaRemote -eq 'ha --raw-json core info') { return [pscustomobject]@{ ExitCode=0; Output=('{"result":"ok","data":{"version":"' + $global:acaCoreVersion + '"}}'); ErrorOutput='' } }
    if ($acaRemote -eq 'true') {
        $global:acaProbeCount++
        if ($global:acaProbeCount -eq 1 -and $global:acaNativeMode -ne 'already-revoked') { return [pscustomobject]@{ ExitCode=0; Output=''; ErrorOutput='' } }
        if ($global:acaNativeMode -eq 'network-failure') { return [pscustomobject]@{ ExitCode=255; Output=''; ErrorOutput='Connection timed out' } }
        return [pscustomobject]@{ ExitCode=255; Output=''; ErrorOutput='root@192.168.1.20: Permission denied (publickey).' }
    }
    if ($acaRemote -match 'sh bootstrap-haos.sh' -and $global:acaNativeMode -eq 'bootstrap-failure') { return [pscustomobject]@{ ExitCode=1; Output=''; ErrorOutput='interrupted' } }
    return [pscustomobject]@{ ExitCode=0; Output=''; ErrorOutput='' }
}
'@
[IO.File]::WriteAllText((Join-Path $acaScripts 'native-process.ps1'), $acaHelper)
$acaPassed = 0
$global:acaTestAdmin = $true
$global:acaCoreVersion = '2026.9.4'
$global:acaNativeMode = 'success'
$global:acaNativeCalls = New-Object 'Collections.Generic.List[string]'
$global:acaProbeCount = 0
$acaAttachedPath = Join-Path $acaTestRoot 'haos.vhdx'
$acaPrivate = Join-Path $acaTestRoot '.setup/bootstrap-key'
$acaPublic = 'ssh-ed25519 ' + ('A' * 68)
$acaMaterials = Join-Path $acaTestRoot 'bootstrap'
New-Item -ItemType Directory -Path $acaMaterials | Out-Null
New-Item -ItemType Directory -Path (Split-Path $acaPrivate -Parent) | Out-Null
$acaFiles = @('bootstrap-haos.sh', 'install-sonoff.py', 'SonoffLAN-v3.13.3.zip', 'installation.json', 'BOOTSTRAP.md')
foreach ($acaFile in $acaFiles) { [IO.File]::WriteAllText((Join-Path $acaMaterials $acaFile), 'fixture') }
[IO.File]::WriteAllText((Join-Path $acaMaterials 'installation.json'), '{"schema":1,"version":"0.9.72","appVersion":"0.9.72.99","haosVersion":"18.4","coreVersion":"2026.9.4"}')
function Write-TestChecksums {
    @($acaFiles | ForEach-Object { (Get-FileHash -LiteralPath (Join-Path $acaMaterials $_) -Algorithm SHA256).Hash.ToLowerInvariant() + '  ' + $_ }) | Set-Content -LiteralPath (Join-Path $acaMaterials 'BOOTSTRAP-SHA256SUMS') -Encoding ASCII
}
function Reset-TestBootstrap([string]$Phase = 'created-bootstrap-pending') {
    $global:acaNativeCalls.Clear(); $global:acaProbeCount = 0; $global:acaNativeMode = 'success'; $global:acaCoreVersion = '2026.9.4'
    [IO.File]::WriteAllText($acaPrivate, 'fixture-not-a-private-key')
    [IO.File]::WriteAllText($acaPrivate + '.pub', $acaPublic + ' aca-pilot-bootstrap')
    @{ schema=1; phase=$Phase; vmId=[guid]::NewGuid().ToString(); disk=$acaAttachedPath; vmName='ACA-Test' } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $acaTestRoot 'installation-owner.json')
}
function Assert-Test($Condition, [string]$Name) {
    if (-not $Condition) { throw "FAIL: $Name" }
    $script:acaPassed++
    Write-Output ('PASS: ' + $Name)
}
function Assert-TestRejected([scriptblock]$Operation, [string]$Message, [string]$Name) {
    $acaReason = ''
    try { & $Operation | Out-Null } catch { $acaReason = $_.Exception.Message }
    Assert-Test ($acaReason -like ('*' + $Message + '*')) "$Name ($acaReason)"
}
function Get-VM { param($Name, $Id) [pscustomobject]@{ Id=$Id; State='Running' } }
function Get-VMHardDiskDrive { param($VM) [pscustomobject]@{ Path=$acaAttachedPath } }
function ssh.exe { throw 'Nessuna rete reale nei test' }
function scp.exe { throw 'Nessuna rete reale nei test' }
function Invoke-RestMethod { param($Uri, $TimeoutSec) if ($Uri -like '*/api/client-bundle/manifest') { [pscustomobject]@{ schema=1; version='0.9.72'; archive=[pscustomobject]@{ sha256=('a'*64); size=20 } } } else { [pscustomobject]@{ status='ok'; version='0.9.72' } } }
$acaArgs = @{ InstallationDirectory=$acaTestRoot; MaterialsDirectory=$acaMaterials; Ip='192.168.1.20'; HostKey=$acaPublic }
try {
    Write-TestChecksums
    Reset-TestBootstrap
    $global:acaCoreVersion = '2026.11.1'
    Assert-TestRejected { & "$acaScripts/Invoke-AcaBootstrap.ps1" @acaArgs } 'osservata 2026.11.1' 'Core diverso bloccato prima del trasferimento'
    Assert-Test (@($global:acaNativeCalls | Where-Object { $_ -match '^scp.exe|mkdir|bootstrap-haos.sh' }).Count -eq 0) 'Versione incompatibile: nessun trasferimento o comando mutante'
    # Un mismatch prima del bootstrap consente materiali corretti sullo stesso target autenticato.
    [IO.File]::WriteAllText((Join-Path $acaMaterials 'BOOTSTRAP.md'), 'fixture-regenerated')
    Write-TestChecksums
    $global:acaCoreVersion = '2026.9.4'
    & "$acaScripts/Invoke-AcaBootstrap.ps1" @acaArgs | Out-Null
    Assert-Test ((Get-Content -LiteralPath (Join-Path $acaTestRoot 'installation-owner.json') -Raw | ConvertFrom-Json).phase -eq 'bootstrap-complete-key-revoked' -and -not (Test-Path -LiteralPath $acaPrivate)) 'Bootstrap completo, revoca provata e cleanup locale'
    Assert-Test (@($global:acaNativeCalls | Where-Object { $_ -match '^scp.exe' }).Count -eq 6) 'Trasferiti solo cinque materiali e checksum'
    & "$acaScripts/Invoke-AcaBootstrap.ps1" @acaArgs | Out-Null
    Assert-Test (@($global:acaNativeCalls | Where-Object { $_ -match 'sh bootstrap-haos.sh' }).Count -eq 1) 'Setup completo rilanciato senza rieseguire bootstrap'

    Reset-TestBootstrap
    $global:acaNativeMode = 'network-failure'
    Assert-TestRejected { & "$acaScripts/Invoke-AcaBootstrap.ps1" @acaArgs } 'Revoca non dimostrata' 'Timeout dopo revoca non vale come successo'
    Assert-Test ((Test-Path -LiteralPath $acaPrivate) -and (Get-Content -LiteralPath (Join-Path $acaTestRoot 'installation-owner.json') -Raw | ConvertFrom-Json).phase -eq 'revocation-pending') 'Errore di rete conserva chiave e checkpoint riprendibile'
    $global:acaNativeMode = 'already-revoked'; $global:acaNativeCalls.Clear(); $global:acaProbeCount=0
    & "$acaScripts/Invoke-AcaBootstrap.ps1" @acaArgs | Out-Null
    Assert-Test (@($global:acaNativeCalls | Where-Object { $_ -match 'sh bootstrap-haos.sh|^scp.exe|authorized_keys' }).Count -eq 0 -and -not (Test-Path -LiteralPath $acaPrivate)) 'Ripresa dopo revoca remota: sola prova autenticazione, niente reinstallazione'

    Reset-TestBootstrap
    $global:acaNativeMode = 'bootstrap-failure'
    Assert-TestRejected { & "$acaScripts/Invoke-AcaBootstrap.ps1" @acaArgs } 'Comando di predisposizione SSH non riuscito' 'Bootstrap incerto registra interruzione'
    $global:acaNativeCalls.Clear()
    Assert-TestRejected { & "$acaScripts/Invoke-AcaBootstrap.ps1" @acaArgs } '-ResumeBootstrap' 'Nessun retry automatico di bootstrap interrotto'
    Assert-Test ($global:acaNativeCalls.Count -eq 0) 'Retry non autorizzato non esegue SSH'
    $acaChangedArgs = @{} + $acaArgs; $acaChangedArgs.HostKey = 'ssh-ed25519 ' + ('B' * 68)
    Assert-TestRejected { & "$acaScripts/Invoke-AcaBootstrap.ps1" @acaChangedArgs -ResumeBootstrap } 'chiave host differenti' 'Ripresa rifiuta sostituzione della chiave host'
    $global:acaNativeMode = 'success'
    & "$acaScripts/Invoke-AcaBootstrap.ps1" @acaArgs -ResumeBootstrap | Out-Null
    Assert-Test (-not (Test-Path -LiteralPath $acaPrivate)) 'Ripresa esplicita conserva target e conclude revoca'

    # Inventario Home: nessun Get-VMSwitch deve interrogare l'host reale.
    function Get-CimInstance {
        param($ClassName)
        switch ($ClassName) {
            'Win32_ComputerSystem' { [pscustomobject]@{ TotalPhysicalMemory=32GB; HypervisorPresent=$true } }
            'Win32_Processor' { [pscustomobject]@{ Name='fixture CPU'; VirtualizationFirmwareEnabled=$true; SecondLevelAddressTranslationExtensions=$true } }
            'Win32_OperatingSystem' { [pscustomobject]@{ Caption='Windows 11 Home fixture'; BuildNumber='fixture'; OperatingSystemSKU=101; OSArchitecture='64 bit' } }
        }
    }
    function Get-WindowsOptionalFeature { param($Online, $FeatureName) throw 'Feature unknown' }
    function Get-VMSwitch { throw 'Non deve essere interrogato senza elevazione' }
    $global:acaTestAdmin = $false
    $acaHostResult = & "$acaScripts/Test-AcaPilotHost.ps1" -AsObject
    Assert-Test (-not $acaHostResult.Ready -and -not $acaHostResult.SupportedEdition -and $acaHostResult.HyperV -eq 'Unknown') 'Inventario Home/non elevato diagnostico, senza attivazioni'

    # Il launcher usa il medesimo sorgente; UI, CIM, Hyper-V e download sono adapter fittizi.
    New-Item -ItemType Directory -Path (Join-Path $acaTestRoot 'client') | Out-Null
    [IO.File]::WriteAllText((Join-Path $acaTestRoot 'client/Acasystem-Setup-fixture.exe'), 'MZfixture-not-executable')
    [IO.File]::WriteAllText((Join-Path $acaTestRoot 'MATERIAL-PROVENANCE.json'), '{"schema":1,"purpose":"single-candidate-kit-not-target-tested","client":{"name":"client/Acasystem-Setup-fixture.exe"}}')
    function Write-TestKitChecksums {
        $acaClientName = (Get-Content -LiteralPath (Join-Path $acaTestRoot 'MATERIAL-PROVENANCE.json') -Raw | ConvertFrom-Json).client.name
        $acaKitNames = @('pilot/Start-AcaPilotSetup.ps1', 'pilot/Test-AcaPilotHost.ps1', 'pilot/New-AcaPilotVm.ps1', 'pilot/Invoke-AcaBootstrap.ps1', 'pilot/native-process.ps1', 'pilot/haos-image.json', 'bootstrap/BOOTSTRAP-SHA256SUMS', 'MATERIAL-PROVENANCE.json', $acaClientName) + @($acaFiles | ForEach-Object { 'bootstrap/' + $_ })
        @($acaKitNames | ForEach-Object { (Get-FileHash -LiteralPath (Join-Path $acaTestRoot $_) -Algorithm SHA256).Hash.ToLowerInvariant() + '  ' + $_ }) | Set-Content -LiteralPath (Join-Path $acaTestRoot 'SHA256SUMS') -Encoding ASCII
    }
    $global:acaHostMutations = New-Object 'Collections.Generic.List[string]'
    $global:acaAnswers = New-Object 'Collections.Generic.Queue[string]'
    $global:acaFeatureState = 'Disabled'
    $global:acaSku = 48
    $global:acaHaveSwitch = $false
    function Read-Host { param($Prompt) if (-not $global:acaAnswers.Count) { throw "Prompt non previsto: $Prompt" }; $global:acaAnswers.Dequeue() }
    function Get-CimInstance {
        param($ClassName)
        switch ($ClassName) {
            'Win32_ComputerSystem' { [pscustomobject]@{ TotalPhysicalMemory=32GB; HypervisorPresent=$true } }
            'Win32_Processor' { [pscustomobject]@{ Name='fixture CPU'; VirtualizationFirmwareEnabled=$true; SecondLevelAddressTranslationExtensions=$true } }
            'Win32_OperatingSystem' { [pscustomobject]@{ Caption='Windows 11 fixture'; BuildNumber='fixture'; OperatingSystemSKU=$global:acaSku; OSArchitecture='64 bit' } }
        }
    }
    function Get-WindowsOptionalFeature { param([switch]$Online, $FeatureName) [pscustomobject]@{ State=$global:acaFeatureState } }
    function Get-VMSwitch { param($Name) if ($global:acaHaveSwitch) { [pscustomobject]@{ Name='ACA-LAN'; SwitchType='External' } } }
    function Get-NetAdapter { param([switch]$Physical) [pscustomobject]@{ Name='Ethernet-fixture'; InterfaceDescription='fixture'; Status='Up' } }
    function Enable-WindowsOptionalFeature { param([switch]$Online, $FeatureName, [switch]$All, [switch]$NoRestart) $global:acaHostMutations.Add('enable') }
    function Restart-Computer { param([switch]$Confirm) $global:acaHostMutations.Add('restart') }
    function New-VMSwitch { param($Name, $NetAdapterName, $AllowManagementOS) $global:acaHostMutations.Add('switch'); $global:acaHaveSwitch=$true }
    function Get-VMNetworkAdapter { param($VM) [pscustomobject]@{ IPAddresses=@('192.168.1.20') } }
    function Get-PSDrive { param($Name, $PSProvider) [pscustomobject]@{ Name='fixture'; Root='C:\'; Free=100GB; Used=1GB } }
    foreach ($acaMockCommand in @('New-VM', 'Start-VM', 'Mount-VHD', 'Dismount-VHD', 'Get-VHD', 'Resize-VHD', 'Set-VMFirmware', 'Set-VMProcessor', 'Set-VMMemory', 'Set-VM', 'Get-Disk', 'Get-Partition', 'Get-Volume', 'Add-PartitionAccessPath', 'Remove-PartitionAccessPath', 'ssh-keygen.exe')) {
        Set-Item -Path ('Function:' + $acaMockCommand) -Value { throw 'Mutazione fuori fase non prevista nel test launcher' }
    }
    function Invoke-WebRequest { throw 'Rete non consentita nel test launcher' }
    function Start-Process { param($FilePath) $global:acaHostMutations.Add('client') }
    $global:acaTestAdmin = $true
    Write-TestKitChecksums
    $acaLauncherArgs = @{ ParentDirectory=(Join-Path $acaTestRoot 'centrali'); VmName='ACA-Test' }
    & "$acaScripts/Start-AcaPilotSetup.ps1" @acaLauncherArgs -WhatIf | Out-Null
    Assert-Test ($global:acaHostMutations.Count -eq 0 -and -not (Test-Path -LiteralPath $acaLauncherArgs.ParentDirectory)) 'Launcher WhatIf non chiede input, non abilita Hyper-V e non crea file'
    $global:acaAnswers.Enqueue('')
    & "$acaScripts/Start-AcaPilotSetup.ps1" @acaLauncherArgs | Out-Null
    Assert-Test ($global:acaHostMutations.Count -eq 0) 'Hyper-V assente senza consenso locale: nessuna abilitazione'
    $global:acaAnswers.Enqueue('ABILITA HYPER-V'); $global:acaAnswers.Enqueue('')
    & "$acaScripts/Start-AcaPilotSetup.ps1" @acaLauncherArgs | Out-Null
    Assert-Test (($global:acaHostMutations -join ',') -eq 'enable') 'Hyper-V autorizzato: NoRestart, nessun riavvio implicito'
    $global:acaHostMutations.Clear()
    $global:acaAnswers.Enqueue('ABILITA HYPER-V'); $global:acaAnswers.Enqueue('RIAVVIA')
    & "$acaScripts/Start-AcaPilotSetup.ps1" @acaLauncherArgs | Out-Null
    Assert-Test (($global:acaHostMutations -join ',') -eq 'enable,restart') 'Riavvio soltanto dopo secondo consenso locale esplicito'
    $global:acaHostMutations.Clear(); $global:acaFeatureState='Enabled'
    $global:acaAnswers.Enqueue('Ethernet-fixture'); $global:acaAnswers.Enqueue('CREA SWITCH'); $global:acaAnswers.Enqueue('')
    & "$acaScripts/Start-AcaPilotSetup.ps1" @acaLauncherArgs | Out-Null
    Assert-Test (($global:acaHostMutations -join ',') -eq 'switch' -and -not (Test-Path -LiteralPath $acaLauncherArgs.ParentDirectory)) 'Switch autorizzato sulla scheda scelta; VM rifiutata senza consenso'
    $global:acaHostMutations.Clear()
    function Invoke-WebRequest { param([switch]$UseBasicParsing, $Uri, $OutFile) $global:acaHostMutations.Add('download'); [IO.File]::WriteAllText($OutFile, 'not-an-os') }
    $global:acaAnswers.Enqueue('CREA CENTRALE')
    Assert-TestRejected { & "$acaScripts/Start-AcaPilotSetup.ps1" @acaLauncherArgs -SwitchName 'ACA-LAN' } 'Dimensione/hash HAOS non corrispondenti' 'Download non integro conservato come parziale, mai usato per la VM'
    Assert-Test (($global:acaHostMutations -join ',') -eq 'download' -and -not (Test-Path -LiteralPath (Join-Path $acaLauncherArgs.ParentDirectory 'ACA-Test')) -and @(Get-ChildItem -LiteralPath (Join-Path $acaLauncherArgs.ParentDirectory '.downloads') -Filter '*.partial').Count -eq 1) 'Hash errato interrompe prima della creazione VM'
    $global:acaHostMutations.Clear()
    $acaCompletedInstall = Join-Path $acaLauncherArgs.ParentDirectory 'ACA-Test'
    New-Item -ItemType Directory -Path (Join-Path $acaCompletedInstall '.setup') -Force | Out-Null
    @{ schema=1; phase='bootstrap-complete-key-revoked'; vmId=[guid]::NewGuid().ToString(); vmName='ACA-Test'; disk=$acaAttachedPath; ip='192.168.1.20'; hostKey=$acaPublic; materialsSha256=(Get-FileHash -LiteralPath (Join-Path $acaMaterials 'BOOTSTRAP-SHA256SUMS') -Algorithm SHA256).Hash.ToLowerInvariant() } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $acaCompletedInstall 'installation-owner.json')
    $global:acaNativeCalls.Clear(); $global:acaAnswers.Enqueue('INSTALLA CLIENT')
    & "$acaScripts/Start-AcaPilotSetup.ps1" @acaLauncherArgs | Out-Null
    Assert-Test (($global:acaHostMutations -join ',') -eq 'client' -and $global:acaNativeCalls.Count -eq 0) 'Launcher riprende centrale completata senza VM nuova/download/SSH, apre client dopo health'
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    Add-Type -AssemblyName System.IO.Compression
    function Write-TestClientZip([string]$Name, [hashtable]$Entries) {
        $acaFixtureArchive = [IO.Compression.ZipFile]::Open((Join-Path $acaTestRoot ('client/' + $Name)), [IO.Compression.ZipArchiveMode]::Create)
        try {
            foreach ($acaFixtureName in $Entries.Keys) {
                $acaFixtureStream = $acaFixtureArchive.CreateEntry($acaFixtureName).Open()
                try { $acaFixtureBytes = [Text.Encoding]::ASCII.GetBytes($Entries[$acaFixtureName]); $acaFixtureStream.Write($acaFixtureBytes, 0, $acaFixtureBytes.Length) } finally { $acaFixtureStream.Dispose() }
            }
        } finally { $acaFixtureArchive.Dispose() }
        [IO.File]::WriteAllText((Join-Path $acaTestRoot 'MATERIAL-PROVENANCE.json'), ('{"schema":1,"purpose":"single-candidate-kit-not-target-tested","client":{"name":"client/' + $Name + '"}}'))
        Write-TestKitChecksums
    }
    Write-TestClientZip 'Acasystem-bad.zip' @{ 'Acasystem.exe'='MZfixture'; '../escape.txt'='no' }
    $global:acaHostMutations.Clear(); $global:acaAnswers.Enqueue('AVVIA CLIENT')
    Assert-TestRejected { & "$acaScripts/Start-AcaPilotSetup.ps1" @acaLauncherArgs } 'percorso Windows non valido' 'Client ZIP con traversal rifiutato prima di estrazione o avvio'
    Assert-Test ($global:acaHostMutations.Count -eq 0 -and -not (Test-Path -LiteralPath (Join-Path $acaCompletedInstall 'escape.txt'))) 'ZIP client non puo scrivere fuori dalla sua nuova directory'
    Write-TestClientZip 'Acasystem-good.zip' @{ 'Acasystem.exe'='MZfixture'; 'resources/app.asar'='fixture-resources' }
    $global:acaAnswers.Enqueue('AVVIA CLIENT')
    & "$acaScripts/Start-AcaPilotSetup.ps1" @acaLauncherArgs | Out-Null
    $acaClientExtracted = @(Get-ChildItem -LiteralPath (Join-Path $acaCompletedInstall '.setup') -Directory -Filter 'client-*')
    Assert-Test (($global:acaHostMutations -join ',') -eq 'client' -and $acaClientExtracted.Count -eq 1 -and (Test-Path -LiteralPath (Join-Path $acaClientExtracted[0].FullName 'resources/app.asar'))) 'Client ZIP estratto con risorse e avviato solo dopo verifica dei byte'
    $global:acaHostMutations.Clear(); $global:acaAnswers.Enqueue('AVVIA CLIENT')
    & "$acaScripts/Start-AcaPilotSetup.ps1" @acaLauncherArgs | Out-Null
    Assert-Test (($global:acaHostMutations -join ',') -eq 'client') 'Client ZIP gia predisposto ricontrollato e riusato senza sovrascritture'
    [IO.File]::WriteAllText((Join-Path $acaClientExtracted[0].FullName 'resources/app.asar'), 'tampered')
    $global:acaHostMutations.Clear(); $global:acaAnswers.Enqueue('AVVIA CLIENT')
    Assert-TestRejected { & "$acaScripts/Start-AcaPilotSetup.ps1" @acaLauncherArgs } 'diversi dallo ZIP verificato' 'File client alterati bloccano il successivo avvio'
    Assert-Test ($global:acaHostMutations.Count -eq 0) 'Nessun avvio del client alterato'
    $global:acaHostMutations.Clear(); $global:acaSku=101; $global:acaTestAdmin=$false
    Assert-TestRejected { & "$acaScripts/Start-AcaPilotSetup.ps1" @acaLauncherArgs } 'Prerequisiti host non soddisfatti' 'Launcher rifiuta Windows Home prima di modificare host'
    Assert-Test ($global:acaHostMutations.Count -eq 0) 'Windows Home non riceve tentativi di attivazione o avvio VM'
    $global:acaSku=48; $global:acaTestAdmin=$true
    [IO.File]::AppendAllText((Join-Path $acaScripts 'haos-image.json'), 'tamper')
    Assert-TestRejected { & "$acaScripts/Start-AcaPilotSetup.ps1" @acaLauncherArgs } 'Kit alterato' 'Integrita kit verificata prima dei prompt e delle mutazioni'
    Assert-Test ($global:acaHostMutations.Count -eq 0) 'Kit alterato non modifica host'
    Write-Output ("PASS: $acaPassed verifiche runtime isolate; nessuna VM, host modification o rete reale. Non e collaudo HAOS.")
} finally {
    foreach ($acaVariable in @('acaTestAdmin', 'acaCoreVersion', 'acaNativeMode', 'acaNativeCalls', 'acaProbeCount', 'acaHostMutations', 'acaAnswers', 'acaFeatureState', 'acaSku', 'acaHaveSwitch')) { Remove-Variable -Name $acaVariable -Scope Global -ErrorAction SilentlyContinue }
    $acaResolvedTest = [IO.Path]::GetFullPath($acaTestRoot)
    $acaExpectedPrefix = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\aca-pilot-runtime-'
    if (-not $acaResolvedTest.StartsWith($acaExpectedPrefix, [StringComparison]::OrdinalIgnoreCase)) { throw 'Cleanup fuori dalla directory temporanea del test' }
    Remove-Item -LiteralPath $acaResolvedTest -Recurse -Force
}
