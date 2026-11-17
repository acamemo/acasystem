[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter(Mandatory)][string]$ImageZip,
    [Parameter(Mandatory)][string]$ParentDirectory,
    [Parameter(Mandatory)][string]$SwitchName,
    [ValidatePattern('^ACA-[A-Za-z0-9-]{1,40}$')][string]$VmName = 'ACA-Pilota',
    [switch]$Start
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'native-process.ps1')
# Immagine ufficiale congelata nel pacchetto; nessun clone o disco di un'altra installazione.
$acaImage = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'haos-image.json') -Raw | ConvertFrom-Json
if ($acaImage.schema -ne 1 -or $acaImage.version -ne '18.4' -or $acaImage.sha256 -notmatch '^[a-f0-9]{64}$') { throw 'Manifesto immagine HAOS non valido' }
$acaImageSha = $acaImage.sha256
$acaImageUrl = $acaImage.url
$acaSource = (Resolve-Path -LiteralPath $ImageZip).Path
if ((Get-Item -LiteralPath $acaSource).Length -ne $acaImage.size -or (Get-FileHash -LiteralPath $acaSource -Algorithm SHA256).Hash.ToLowerInvariant() -ne $acaImageSha) {
    throw 'ZIP diverso dalla candidata HAOS ufficiale 18.4. Nessuna modifica eseguita.'
}
$acaParent = (Resolve-Path -LiteralPath $ParentDirectory).Path
if (-not (Test-Path -LiteralPath $acaParent -PathType Container)) { throw 'Directory padre non valida' }
$acaAncestor = Get-Item -LiteralPath $acaParent
while ($acaAncestor) {
    if (Test-Path -LiteralPath (Join-Path $acaAncestor.FullName '.git')) { throw 'Conservare i dischi della centrale fuori da un repository Git' }
    $acaAncestor = $acaAncestor.Parent
}
$acaDirectory = [IO.Path]::GetFullPath((Join-Path $acaParent $VmName))
if (-not $acaDirectory.StartsWith($acaParent.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Destinazione fuori dal padre scelto' }
if (Test-Path -LiteralPath $acaDirectory) { throw 'Destinazione esistente: conservarla e scegliere un nome nuovo' }
foreach ($acaCommand in @('Get-VM', 'Get-VMSwitch', 'New-VM', 'Start-VM', 'Mount-VHD', 'Dismount-VHD', 'Get-VHD', 'Resize-VHD', 'Set-VMFirmware', 'Set-VMProcessor', 'Set-VMMemory', 'Set-VM', 'Get-Disk', 'Get-Partition', 'Get-Volume', 'Add-PartitionAccessPath', 'Remove-PartitionAccessPath', 'ssh-keygen.exe')) {
    if (-not (Get-Command $acaCommand -ErrorAction SilentlyContinue)) { throw "Prerequisito assente: $acaCommand. Nessuna attivazione automatica." }
}
if (Get-VM -Name $VmName -ErrorAction SilentlyContinue) { throw 'Esiste gia una VM con questo nome' }
$acaSwitch = Get-VMSwitch -Name $SwitchName
if ($acaSwitch.SwitchType -ne 'External') { throw 'Selezionare uno switch esterno gia predisposto per la LAN; non usare NAT/Default Switch' }
$acaDrive = Get-PSDrive -Name ([IO.Path]::GetPathRoot($acaParent).TrimEnd(':\')) -PSProvider FileSystem
if ($acaDrive.Free -lt 72GB) { throw 'Servono almeno 72 GiB liberi sul volume della nuova VM' }
if (-not $PSCmdlet.ShouldProcess($acaDirectory, "Creare VM $VmName da HAOS 18.4 vergine con chiave temporanea; avvio=$Start")) { return }
if (-not (Test-AcaPilotAdministrator)) { throw 'Eseguire il setup locale come amministratore' }
$acaIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()

New-Item -ItemType Directory -Path $acaDirectory | Out-Null
$acaSetup = Join-Path $acaDirectory '.setup'
New-Item -ItemType Directory -Path $acaSetup | Out-Null
$acaAcl = New-Object Security.AccessControl.DirectorySecurity
$acaAcl.SetAccessRuleProtection($true, $false)
$acaRule = New-Object Security.AccessControl.FileSystemAccessRule($acaIdentity.User, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
$acaAcl.AddAccessRule($acaRule)
Set-Acl -LiteralPath $acaSetup -AclObject $acaAcl
$acaOwnerPath = Join-Path $acaDirectory 'installation-owner.json'
$acaOwner = [pscustomobject]@{ schema = 1; vmId = $null; vmName = $VmName; disk = (Join-Path $acaDirectory 'haos.vhdx'); imageUrl = $acaImageUrl; imageSha256 = $acaImageSha; phase = 'preparing-new-vm' }
Write-AcaPilotState $acaOwnerPath $acaOwner
$acaKey = Join-Path $acaSetup 'bootstrap-key'
$acaProcess = Invoke-AcaNative 'ssh-keygen.exe' @('-q', '-t', 'ed25519', '-N', '', '-C', 'aca-pilot-bootstrap', '-f', $acaKey)
if ($acaProcess.ExitCode -ne 0) { throw 'Generazione chiave temporanea fallita; directory conservata per diagnosi' }

Add-Type -AssemblyName System.IO.Compression.FileSystem
$acaArchive = [IO.Compression.ZipFile]::OpenRead($acaSource)
$acaDisk = Join-Path $acaDirectory 'haos.vhdx'
try {
    $acaEntries = @($acaArchive.Entries | Where-Object { $_.Name })
    if ($acaEntries.Count -ne 1 -or $acaEntries[0].FullName -notmatch '^[A-Za-z0-9_.-]+\.vhdx$' -or $acaEntries[0].Length -gt 64GB) { throw 'Struttura ZIP HAOS inattesa' }
    [IO.Compression.ZipFileExtensions]::ExtractToFile($acaEntries[0], $acaDisk, $false)
} finally { $acaArchive.Dispose() }
if ((Get-VHD -Path $acaDisk).Size -gt 64GB) { throw 'Disco ufficiale maggiore del dimensionamento proposto; nessuna riduzione automatica' }
Resize-VHD -Path $acaDisk -SizeBytes 64GB

# Scrive CONFIG solo nella copia nuova, mai nell'archivio ufficiale o in dischi fisici.
$acaMounted = $false
$acaAccess = $false
$acaBootMount = (Join-Path $acaSetup 'boot') + '\'
New-Item -ItemType Directory -Path $acaBootMount | Out-Null
try {
    $acaVhd = Mount-VHD -Path $acaDisk -NoDriveLetter -PassThru
    $acaMounted = $true
    $acaPartitions = @(Get-Disk -Number $acaVhd.DiskNumber | Get-Partition | Where-Object { (($_ | Get-Volume -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FileSystemLabel -ErrorAction SilentlyContinue)) -eq 'hassos-boot' })
    if ($acaPartitions.Count -ne 1) { throw 'Partizione hassos-boot non identificata univocamente; copia conservata senza avvio' }
    $acaBoot = $acaPartitions[0]
    Add-PartitionAccessPath -DiskNumber $acaBoot.DiskNumber -PartitionNumber $acaBoot.PartitionNumber -AccessPath $acaBootMount
    $acaAccess = $true
    $acaConfig = Join-Path $acaBootMount 'CONFIG'
    if (Test-Path -LiteralPath $acaConfig) { throw 'Immagine non vergine: CONFIG preesistente' }
    New-Item -ItemType Directory -Path $acaConfig | Out-Null
    $acaPublicKey = ([IO.File]::ReadAllText($acaKey + '.pub')).Trim()
    [IO.File]::WriteAllText((Join-Path $acaConfig 'authorized_keys'), $acaPublicKey + "`n", [Text.Encoding]::ASCII)
} finally {
    try { if ($acaAccess) { Remove-PartitionAccessPath -DiskNumber $acaBoot.DiskNumber -PartitionNumber $acaBoot.PartitionNumber -AccessPath $acaBootMount } }
    finally { if ($acaMounted) { Dismount-VHD -Path $acaDisk } }
}
$acaVm = New-VM -Name $VmName -Generation 2 -MemoryStartupBytes 4GB -VHDPath $acaDisk -SwitchName $SwitchName -Path $acaDirectory
$acaOwner.vmId = [string]$acaVm.Id
$acaOwner.phase = 'configuring-new-vm'
Write-AcaPilotState $acaOwnerPath $acaOwner
Set-VMProcessor -VM $acaVm -Count 2
Set-VMMemory -VM $acaVm -DynamicMemoryEnabled $false
Set-VMFirmware -VM $acaVm -EnableSecureBoot Off
Set-VM -VM $acaVm -AutomaticStopAction ShutDown -AutomaticStartAction StartIfRunning
$acaOwner.phase = 'created-bootstrap-pending'
Write-AcaPilotState $acaOwnerPath $acaOwner
if ($Start) { Start-VM -VM $acaVm }
Write-Output 'VM creata. Verificare console, IP LAN e chiave host prima del bootstrap SSH. Accesso temporaneo da chiudere a fine setup.'
