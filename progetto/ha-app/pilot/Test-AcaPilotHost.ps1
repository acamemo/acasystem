[CmdletBinding()]
param([switch]$AsObject)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'native-process.ps1')
# Inventario di sola lettura: anche Home o un processo non elevato restituiscono una diagnosi.
$acaComputer = Get-CimInstance Win32_ComputerSystem
$acaCpu = @(Get-CimInstance Win32_Processor)
$acaOs = Get-CimInstance Win32_OperatingSystem
$acaAdministrator = Test-AcaPilotAdministrator
$acaHyperV = 'Unknown'
$acaFeatureError = $null
try { $acaHyperV = [string](Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All -ErrorAction Stop).State }
catch { $acaFeatureError = 'Funzionalita Hyper-V non leggibile: edizione non supportata o privilegi insufficienti' }
$acaCommands = @('Get-VM', 'Get-VMSwitch', 'Get-VMNetworkAdapter', 'Get-VMHardDiskDrive', 'New-VM', 'Start-VM', 'Mount-VHD', 'Dismount-VHD', 'Get-VHD', 'Resize-VHD', 'Set-VMFirmware', 'Set-VMProcessor', 'Set-VMMemory', 'Set-VM', 'Get-Disk', 'Get-Partition', 'Get-Volume', 'Add-PartitionAccessPath', 'Remove-PartitionAccessPath', 'ssh-keygen.exe', 'ssh.exe', 'scp.exe')
$acaMissing = @($acaCommands | Where-Object { -not (Get-Command $_ -ErrorAction SilentlyContinue) })
$acaSwitches = @()
if ($acaAdministrator -and (Get-Command Get-VMSwitch -ErrorAction SilentlyContinue)) {
    try { $acaSwitches = @(Get-VMSwitch -ErrorAction Stop | Select-Object Name, SwitchType) }
    catch { $acaFeatureError = 'Servizio Hyper-V non disponibile; verificare installazione e riavvio' }
}
# SKU Windows client Pro/Enterprise/Education, incluse varianti N/Workstation.
$acaSupported = [int]$acaOs.OperatingSystemSKU -in @(4, 27, 48, 49, 121, 122, 125, 126, 161, 162, 164, 165)
$acaFirmware = $acaComputer.HypervisorPresent -or @($acaCpu | Where-Object { $_.VirtualizationFirmwareEnabled -and $_.SecondLevelAddressTranslationExtensions }).Count -eq $acaCpu.Count
$acaBlockers = @()
if (-not $acaSupported -or -not $acaOs.OSArchitecture.Contains('64')) { $acaBlockers += 'Serve Windows 10/11 Pro, Enterprise o Education a 64 bit; Home non supporta Hyper-V' }
if (-not $acaAdministrator) { $acaBlockers += 'Aprire Windows PowerShell come amministratore sul PC destinatario' }
if (-not $acaFirmware) { $acaBlockers += 'Virtualizzazione/SLAT non confermate: verificare UEFI prima del setup' }
if ($acaComputer.TotalPhysicalMemory -lt 8GB) { $acaBlockers += 'Servono almeno 8 GiB host per riservarne 4 alla VM' }
if ($acaHyperV -ne 'Enabled') { $acaBlockers += 'Hyper-V non pronto: abilitazione locale e riavvio da autorizzare' }
if ($acaMissing.Count) { $acaBlockers += ('Comandi mancanti: ' + ($acaMissing -join ', ')) }
if ($acaFeatureError) { $acaBlockers += $acaFeatureError }
$acaResult = [pscustomobject]@{
    Windows = $acaOs.Caption
    Build = $acaOs.BuildNumber
    SupportedEdition = $acaSupported
    Administrator = $acaAdministrator
    FirmwareReady = [bool]$acaFirmware
    MemoryGiB = [math]::Round($acaComputer.TotalPhysicalMemory / 1GB, 1)
    Cpu = @($acaCpu | Select-Object Name, VirtualizationFirmwareEnabled, SecondLevelAddressTranslationExtensions)
    HypervisorPresent = $acaComputer.HypervisorPresent
    HyperV = $acaHyperV
    MissingCommands = $acaMissing
    Switches = $acaSwitches
    Disks = @(Get-PSDrive -PSProvider FileSystem | Select-Object Name, Root, Free, Used)
    Ready = $acaBlockers.Count -eq 0
    Blockers = $acaBlockers
    Proposal = '2 vCPU / 4 GiB RAM statica / VHDX 64 GiB; almeno 72 GiB liberi e switch esterno LAN'
    Usb = 'Passthrough USB diretto non previsto in Hyper-V; verificare i dispositivi effettivi'
}
if ($AsObject) { $acaResult } else { $acaResult | ConvertTo-Json -Depth 5 }
