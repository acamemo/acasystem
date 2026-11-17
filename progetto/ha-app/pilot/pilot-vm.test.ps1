$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Import-Module Microsoft.PowerShell.Utility
# Tutte le operazioni Hyper-V/storage/ACL sono simulate. ZIP e checkpoint sono file temporanei reali.
$acaTestRoot = Join-Path ([IO.Path]::GetTempPath()) ('aca-pilot-vm-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $acaTestRoot | Out-Null
$acaScripts = Join-Path $acaTestRoot 'pilot'
$acaParent = Join-Path $acaTestRoot 'centrali'
New-Item -ItemType Directory -Path $acaScripts, $acaParent | Out-Null
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'New-AcaPilotVm.ps1') -Destination (Join-Path $acaScripts 'New-AcaPilotVm.ps1')
$acaHelper = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'native-process.ps1')) + @'

function Test-AcaPilotAdministrator { $true }
function Invoke-AcaNative([string]$Command, [string[]]$Arguments) {
    if ($Command -ne 'ssh-keygen.exe') { throw 'Processo inatteso' }
    $acaKeyFile = $Arguments[-1]
    [IO.File]::WriteAllText($acaKeyFile, 'fixture-not-a-private-key')
    [IO.File]::WriteAllText($acaKeyFile + '.pub', ('ssh-ed25519 ' + ('A' * 68) + ' aca-pilot-bootstrap'))
    [pscustomobject]@{ ExitCode=0; Output=''; ErrorOutput='' }
}
'@
[IO.File]::WriteAllText((Join-Path $acaScripts 'native-process.ps1'), $acaHelper)
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$acaZip = Join-Path $acaTestRoot 'image-fixture.zip'
$acaArchive = [IO.Compression.ZipFile]::Open($acaZip, [IO.Compression.ZipArchiveMode]::Create)
try {
    $acaEntry = $acaArchive.CreateEntry('haos_ova-18.4.vhdx')
    $acaStream = $acaEntry.Open()
    try { $acaBytes = [Text.Encoding]::ASCII.GetBytes('fixture-not-a-disk'); $acaStream.Write($acaBytes, 0, $acaBytes.Length) } finally { $acaStream.Dispose() }
} finally { $acaArchive.Dispose() }
$acaImageManifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'haos-image.json') -Raw | ConvertFrom-Json
$acaImageManifest.size = (Get-Item -LiteralPath $acaZip).Length
$acaImageManifest | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $acaScripts 'haos-image.json')
$global:acaVmCalls = New-Object 'Collections.Generic.List[string]'
$global:acaMockVmId = [guid]::NewGuid()
$global:acaFailMount = $false
function Get-FileHash { param($LiteralPath, $Algorithm) [pscustomobject]@{ Hash='ab49fec41536c49fb7ca23db0a383f1e6b6078ac3e1a169a177cc8ec58641993' } }
function Get-VM { param($Name) }
function Get-VMSwitch { param($Name) [pscustomobject]@{ Name=$Name; SwitchType='External' } }
function Get-PSDrive { param($Name, $PSProvider) [pscustomobject]@{ Free=100GB } }
function Set-Acl { param($LiteralPath, $AclObject) $global:acaVmCalls.Add('acl-simulated') }
function ssh-keygen.exe { throw 'Nessuna generazione reale di chiavi nei test' }
function Get-VHD { param($Path) [pscustomobject]@{ Size=32GB } }
function Resize-VHD { param($Path, $SizeBytes) if ($SizeBytes -ne 64GB) { throw 'Dimensione inattesa' }; $global:acaVmCalls.Add('resize-copy') }
function Mount-VHD { param($Path, [switch]$NoDriveLetter, [switch]$PassThru) if ($global:acaFailMount) { throw 'mount fixture failed' }; $global:acaVmCalls.Add('mount-copy'); [pscustomobject]@{ DiskNumber=991 } }
function Get-Disk { param($Number) [pscustomobject]@{ Number=$Number } }
function Get-Partition { process { [pscustomobject]@{ DiskNumber=991; PartitionNumber=1 } } }
function Get-Volume { process { [pscustomobject]@{ FileSystemLabel='hassos-boot' } } }
function Add-PartitionAccessPath { param($DiskNumber, $PartitionNumber, $AccessPath) if ($DiskNumber -ne 991) { throw 'Disco inatteso' }; $global:acaVmCalls.Add('attach-boot-copy') }
function Remove-PartitionAccessPath { param($DiskNumber, $PartitionNumber, $AccessPath) $global:acaVmCalls.Add('detach-boot-copy') }
function Dismount-VHD { param($Path) $global:acaVmCalls.Add('dismount-copy') }
function New-VM { param($Name, $Generation, $MemoryStartupBytes, $VHDPath, $SwitchName, $Path) if ($Generation -ne 2 -or $MemoryStartupBytes -ne 4GB -or -not (Test-Path -LiteralPath $VHDPath)) { throw 'Contratto VM inatteso' }; $global:acaVmCalls.Add('new-vm'); [pscustomobject]@{ Id=$global:acaMockVmId } }
function Set-VMProcessor { param($VM, $Count) if ($Count -ne 2) { throw 'vCPU inattese' }; $global:acaVmCalls.Add('cpu') }
function Set-VMMemory { param($VM, $DynamicMemoryEnabled) if ($DynamicMemoryEnabled) { throw 'RAM dinamica inattesa' }; $global:acaVmCalls.Add('static-ram') }
function Set-VMFirmware { param($VM, $EnableSecureBoot) if ($EnableSecureBoot -ne 'Off') { throw 'Secure Boot guest inatteso' }; $global:acaVmCalls.Add('firmware-guest') }
function Set-VM { param($VM, $AutomaticStopAction, $AutomaticStartAction) if ($AutomaticStopAction -ne 'ShutDown' -or $AutomaticStartAction -ne 'StartIfRunning') { throw 'Lifecycle inatteso' }; $global:acaVmCalls.Add('lifecycle-guest') }
function Start-VM { param($VM) $global:acaVmCalls.Add('start-guest') }
try {
    $acaBeforeSha = (Microsoft.PowerShell.Utility\Get-FileHash -LiteralPath $acaZip -Algorithm SHA256).Hash
    & "$acaScripts/New-AcaPilotVm.ps1" -ImageZip $acaZip -ParentDirectory $acaParent -SwitchName 'LAN' -VmName 'ACA-Test' -Start | Out-Null
    $acaInstallation = Join-Path $acaParent 'ACA-Test'
    $acaOwner = Get-Content -LiteralPath (Join-Path $acaInstallation 'installation-owner.json') -Raw | ConvertFrom-Json
    if ($acaOwner.phase -ne 'created-bootstrap-pending' -or $acaOwner.vmId -ne [string]$global:acaMockVmId -or -not (Test-Path -LiteralPath $acaOwner.disk)) { throw 'Checkpoint finale VM non corrispondente' }
    $acaBootKey = [IO.File]::ReadAllText((Join-Path $acaInstallation '.setup/boot/CONFIG/authorized_keys'))
    if ($acaBootKey -cne ('ssh-ed25519 ' + ('A' * 68) + " aca-pilot-bootstrap`n")) { throw 'CONFIG non contiene solo chiave pubblica LF' }
    if ((Microsoft.PowerShell.Utility\Get-FileHash -LiteralPath $acaZip -Algorithm SHA256).Hash -cne $acaBeforeSha) { throw 'ZIP sorgente modificato' }
    if (($global:acaVmCalls -join ',') -ne 'acl-simulated,resize-copy,mount-copy,attach-boot-copy,detach-boot-copy,dismount-copy,new-vm,cpu,static-ram,firmware-guest,lifecycle-guest,start-guest') { throw 'Ordine lifecycle inatteso' }
    Write-Output 'PASS: copia ZIP intatta, CONFIG pubblica LF, checkpoint VM, Generation2/2vCPU/4GiB/64GiB e lifecycle su cmdlet simulati.'
    $global:acaFailMount = $true; $global:acaVmCalls.Clear()
    $acaReason = ''
    try { & "$acaScripts/New-AcaPilotVm.ps1" -ImageZip $acaZip -ParentDirectory $acaParent -SwitchName 'LAN' -VmName 'ACA-Failed' -Start | Out-Null } catch { $acaReason = $_.Exception.Message }
    $acaFailedOwner = Get-Content -LiteralPath (Join-Path $acaParent 'ACA-Failed/installation-owner.json') -Raw | ConvertFrom-Json
    if ($acaReason -ne 'mount fixture failed' -or $acaFailedOwner.phase -ne 'preparing-new-vm' -or ($global:acaVmCalls -contains 'new-vm') -or -not (Test-Path -LiteralPath $acaFailedOwner.disk)) { throw 'Errore mount non conserva checkpoint/copia o avvia VM' }
    Write-Output 'PASS: errore mount conserva copia e checkpoint senza creare/avviare VM. Nessuna mutazione host reale.'
} finally {
    foreach ($acaVariable in @('acaVmCalls', 'acaMockVmId', 'acaFailMount')) { Remove-Variable -Name $acaVariable -Scope Global -ErrorAction SilentlyContinue }
    $acaResolvedTest = [IO.Path]::GetFullPath($acaTestRoot)
    $acaExpectedPrefix = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\aca-pilot-vm-'
    if (-not $acaResolvedTest.StartsWith($acaExpectedPrefix, [StringComparison]::OrdinalIgnoreCase)) { throw 'Cleanup fuori dalla directory temporanea del test' }
    Remove-Item -LiteralPath $acaResolvedTest -Recurse -Force
}
