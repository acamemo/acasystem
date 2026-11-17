[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$ParentDirectory = (Join-Path $env:LOCALAPPDATA 'ACA-System\Centrali'),
    [ValidatePattern('^ACA-[A-Za-z0-9-]{1,40}$')][string]$VmName = 'ACA-Pilota',
    [string]$ImageZip,
    [string]$Ip,
    [string]$HostKey,
    [switch]$InspectOnly
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'native-process.ps1')
# Nessuna installazione hypervisor o chiamata che crea/configura/avvia VM o reti.
$acaVBox = Get-Command 'VBoxManage.exe' -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $acaVBox -and (Test-Path -LiteralPath (Join-Path $env:ProgramFiles 'Oracle\VirtualBox\VBoxManage.exe'))) { $acaVBox = Get-Command (Join-Path $env:ProgramFiles 'Oracle\VirtualBox\VBoxManage.exe') -CommandType Application }
$acaVersion = $null
if ($acaVBox) {
    $acaReadVersion = Invoke-AcaNative $acaVBox.Source @('--version') 10000
    if ($acaReadVersion.ExitCode -eq 0 -and $acaReadVersion.Output.Trim() -match '^([0-9]+\.[0-9]+\.[0-9]+)(?:r[0-9]+)?') { $acaVersion = $Matches[1] }
}
$acaComputer = Get-CimInstance Win32_ComputerSystem
$acaCpu = @(Get-CimInstance Win32_Processor)
$acaVirtualization = [bool]($acaComputer.HypervisorPresent -or @($acaCpu | Where-Object VirtualizationFirmwareEnabled).Count -eq $acaCpu.Count)
$acaMissing = @(@('ssh-keygen.exe', 'ssh.exe', 'scp.exe') | Where-Object { -not (Get-Command $_ -CommandType Application -ErrorAction SilentlyContinue) })
$acaInventory = [pscustomobject]@{ VirtualBoxVersion=$acaVersion; Windows64Bit=[Environment]::Is64BitOperatingSystem; MemoryGiB=[math]::Round($acaComputer.TotalPhysicalMemory / 1GB, 1); VirtualizationReported=$acaVirtualization; HypervisorPresent=$acaComputer.HypervisorPresent; MissingCommands=$acaMissing; Ready=($null -ne $acaVersion -and [Environment]::Is64BitOperatingSystem -and $acaComputer.TotalPhysicalMemory -ge 8GB -and $acaVirtualization -and $acaMissing.Count -eq 0) }
if ($InspectOnly) { $acaInventory | ConvertTo-Json -Depth 4; return }
$acaPackage = Split-Path $PSScriptRoot -Parent
$acaProvenance = Get-Content -LiteralPath (Join-Path $acaPackage 'MATERIAL-PROVENANCE.json') -Raw | ConvertFrom-Json
if ($acaProvenance.schema -ne 1 -or $acaProvenance.purpose -ne 'single-candidate-kit-not-target-tested' -or -not $acaProvenance.client) { throw 'Usare il kit completo generato, con client Windows e materiali bootstrap' }
$acaSeen = @{}
foreach ($acaLine in @(Get-Content -LiteralPath (Join-Path $acaPackage 'SHA256SUMS'))) {
    if ($acaLine -notmatch '^([a-f0-9]{64})  ([A-Za-z0-9][A-Za-z0-9._/-]*)$') { throw 'Checksum del kit non valido' }
    $acaSha = $Matches[1]; $acaName = $Matches[2]
    if ($acaName.Split('/') -contains '..' -or $acaSeen.ContainsKey($acaName)) { throw 'Percorso checksum ambiguo o duplicato' }
    $acaSeen[$acaName] = $true
    if ((Get-FileHash -LiteralPath (Join-Path $acaPackage $acaName) -Algorithm SHA256).Hash.ToLowerInvariant() -cne $acaSha) { throw "Kit alterato: $acaName" }
}
foreach ($acaRequired in @('pilot/Start-AcaVirtualBoxSetup.ps1', 'pilot/VIRTUALBOX.md', 'pilot/native-process.ps1', 'pilot/Invoke-AcaBootstrap.ps1', 'pilot/haos-virtualbox-image.json', 'bootstrap/installation.json', 'bootstrap/bootstrap-haos.sh', 'bootstrap/install-sonoff.py', 'bootstrap/SonoffLAN-v3.13.3.zip', 'bootstrap/BOOTSTRAP.md', 'bootstrap/BOOTSTRAP-SHA256SUMS', 'MATERIAL-PROVENANCE.json', [string]$acaProvenance.client.name)) { if (-not $acaSeen.ContainsKey($acaRequired)) { throw "Checksum richiesto assente: $acaRequired" } }
$acaImage = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'haos-virtualbox-image.json') -Raw | ConvertFrom-Json
if ($acaImage.schema -ne 1 -or $acaImage.version -ne '18.4' -or $acaImage.fileName -ne 'haos_ova-18.4.vdi.zip' -or $acaImage.url -ne 'https://github.com/home-assistant/operating-system/releases/download/18.4/haos_ova-18.4.vdi.zip' -or $acaImage.sha256 -cne 'e46c3b9bcf437ff56e5905b29e92ebaef4a50dac376eb8d919c29fbcea33b7be' -or $acaImage.size -ne 560370635) { throw 'Manifesto immagine VirtualBox non corrispondente alla candidata ufficiale' }
$acaMaterials = Join-Path $acaPackage 'bootstrap'
$acaManifest = Get-Content -LiteralPath (Join-Path $acaMaterials 'installation.json') -Raw | ConvertFrom-Json
if ($acaManifest.haosVersion -cne $acaImage.version) { throw 'Materiali bootstrap e immagine HAOS di versioni diverse' }
Write-Host ("VirtualBox {0}; RAM {1} GiB. La VM viene creata e avviata dall utente nella GUI, non dal launcher." -f $acaVersion, $acaInventory.MemoryGiB)
if (-not $PSCmdlet.ShouldProcess($ParentDirectory, 'Preparare file locali per VM VirtualBox manuale e bootstrap autenticato; nessuna modifica hypervisor/VM/rete host')) { return }
if (-not $acaInventory.Ready) { throw 'Prerequisiti non confermati: verificare VirtualBox gia installato, Windows64bit, 8GiB RAM, virtualizzazione e OpenSSH. Nessuna installazione/attivazione automatica' }
$acaInstall = [IO.Path]::GetFullPath((Join-Path $ParentDirectory $VmName))
$acaAncestorPath = [IO.Path]::GetFullPath($ParentDirectory)
while ($acaAncestorPath) {
    if (Test-Path -LiteralPath (Join-Path $acaAncestorPath '.git')) { throw 'Conservare dischi e chiavi della centrale fuori da un repository Git' }
    $acaAncestorPath = Split-Path $acaAncestorPath -Parent
}
$acaOwnerPath = Join-Path $acaInstall 'installation-owner.json'
if (-not (Test-Path -LiteralPath $acaOwnerPath)) {
    if (Test-Path -LiteralPath $acaInstall) { throw 'Directory esistente senza checkpoint: conservarla e scegliere un nome nuovo' }
    Write-Host ("Preparo una copia vergine VDI e chiave unica in $acaInstall. Non viene creata o toccata alcuna VM.")
    if ((Read-Host 'Scrivere PREPARA MATERIALI per autorizzare file locali e download verificato') -cne 'PREPARA MATERIALI') { return }
    if (-not (Test-Path -LiteralPath $ParentDirectory)) { New-Item -ItemType Directory -Path $ParentDirectory -Force | Out-Null }
    $acaDrive = Get-PSDrive -Name ([IO.Path]::GetPathRoot([IO.Path]::GetFullPath($ParentDirectory)).TrimEnd(':\')) -PSProvider FileSystem
    if ($acaDrive.Free -lt 72GB) { throw 'Servono almeno 72 GiB liberi sul volume della nuova centrale' }
    if (-not $ImageZip) {
        $acaDownloads = Join-Path $ParentDirectory '.downloads'
        if (-not (Test-Path -LiteralPath $acaDownloads)) { New-Item -ItemType Directory -Path $acaDownloads | Out-Null }
        $ImageZip = Join-Path $acaDownloads $acaImage.fileName
        if (-not (Test-Path -LiteralPath $ImageZip)) {
            $acaPartial = $ImageZip + '.' + [guid]::NewGuid().ToString('N') + '.partial'
            Invoke-WebRequest -UseBasicParsing -Uri $acaImage.url -OutFile $acaPartial
            if ((Get-Item -LiteralPath $acaPartial).Length -ne $acaImage.size -or (Get-FileHash -LiteralPath $acaPartial -Algorithm SHA256).Hash.ToLowerInvariant() -cne $acaImage.sha256) { throw "Download VDI non verificato; parziale conservato: $acaPartial" }
            [IO.File]::Move($acaPartial, $ImageZip)
        }
    }
    if ((Get-Item -LiteralPath $ImageZip).Length -ne $acaImage.size -or (Get-FileHash -LiteralPath $ImageZip -Algorithm SHA256).Hash.ToLowerInvariant() -cne $acaImage.sha256) { throw 'ZIP VDI non corrispondente alla sorgente ufficiale: nessuna copia operativa creata' }
    New-Item -ItemType Directory -Path $acaInstall | Out-Null
    $acaSetup = Join-Path $acaInstall '.setup'
    New-Item -ItemType Directory -Path $acaSetup | Out-Null
    $acaIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $acaAcl = New-Object Security.AccessControl.DirectorySecurity
    $acaAcl.SetAccessRuleProtection($true, $false)
    $acaAcl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($acaIdentity.User, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')))
    Set-Acl -LiteralPath $acaSetup -AclObject $acaAcl
    Write-AcaPilotState $acaOwnerPath @{ schema=1; platform='virtualbox-manual'; vmName=$VmName; phase='manual-materials-preparing'; imageSha256=$acaImage.sha256; manualVmConfirmed=$false }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $acaArchive = [IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $ImageZip).Path)
    try {
        $acaEntries = @($acaArchive.Entries | Where-Object Name)
        if ($acaEntries.Count -ne 1 -or $acaEntries[0].FullName -notmatch '^[A-Za-z0-9_.-]+\.vdi$' -or $acaEntries[0].Length -gt 64GB) { throw 'ZIP VDI con struttura inattesa: file conservati, nessuna VM avviata' }
        [IO.Compression.ZipFileExtensions]::ExtractToFile($acaEntries[0], (Join-Path $acaInstall 'haos.vdi'), $false)
    } finally { $acaArchive.Dispose() }
    $acaKey = Join-Path $acaSetup 'bootstrap-key'
    if ((Invoke-AcaNative 'ssh-keygen.exe' @('-q', '-t', 'ed25519', '-N', '', '-C', 'aca-pilot-bootstrap', '-f', $acaKey)).ExitCode -ne 0) { throw 'Generazione chiave temporanea fallita; materiali conservati per diagnosi' }
    New-Item -ItemType Directory -Path (Join-Path $acaInstall 'CONFIG') | Out-Null
    [IO.File]::WriteAllText((Join-Path $acaInstall 'CONFIG/authorized_keys'), ([IO.File]::ReadAllText($acaKey + '.pub')).Trim() + "`n", [Text.Encoding]::ASCII)
    $acaOwner = Get-Content -LiteralPath $acaOwnerPath -Raw | ConvertFrom-Json
    $acaOwner.phase = 'manual-vm-pending'
    Write-AcaPilotState $acaOwnerPath $acaOwner
}
$acaOwner = Get-Content -LiteralPath $acaOwnerPath -Raw | ConvertFrom-Json
if ($acaOwner.schema -ne 1 -or $acaOwner.platform -cne 'virtualbox-manual' -or $acaOwner.vmName -cne $VmName -or $acaOwner.imageSha256 -cne $acaImage.sha256) { throw 'Checkpoint non corrispondente a questo percorso VirtualBox manuale' }
if ($acaOwner.phase -eq 'manual-vm-pending') {
    Write-Host ("Leggere $PSScriptRoot\VIRTUALBOX.md. Nella GUI creare SOLO una VM nuova da $acaInstall\haos.vdi: EFI, 2 CPU, 4096 MiB RAM, disco portato manualmente a64GiB e reteBridge sulla LAN.")
    Write-Host ("CONFIG contiene solo la chiave PUBBLICA: $acaInstall\CONFIG\authorized_keys. Importarla manualmente nella VM vergine con CONFIG e ha os import; non copiare .setup o chiavi private.")
    Write-Host 'Attendere il primo avvio, verificare alla console IP, versioni HAOS/Core e chiave pubblica host. Il solo IP non autorizza alcuna installazione.'
    if ((Read-Host 'Scrivere VM VERGINE PRONTA dopo creazione/avvio manuali e import CONFIG nella VM nuova') -cne 'VM VERGINE PRONTA') { return }
    $acaOwner.manualVmConfirmed = $true; $acaOwner.phase = 'created-bootstrap-pending'
    Write-AcaPilotState $acaOwnerPath $acaOwner
}
if ($acaOwner.phase -notin @('created-bootstrap-pending', 'bootstrap-running', 'bootstrap-verified', 'revocation-pending', 'bootstrap-complete-key-revoked')) { throw 'Preparazione locale incompleta: conservare i file per diagnosi, nessuna ripetizione automatica' }
if ($acaOwner.PSObject.Properties['ip']) { if (-not $Ip) { $Ip=$acaOwner.ip }; if (-not $HostKey) { $HostKey=$acaOwner.hostKey } }
if (-not $Ip) { $Ip = Read-Host 'IPv4 privato della nuova VM letto alla console' }
if (-not $HostKey) { $HostKey = Read-Host 'Chiave host pubblica verificata alla console (ssh-ed25519 BASE64, senza commento)' }
$acaBootstrapArgs = @{ InstallationDirectory=$acaInstall; MaterialsDirectory=$acaMaterials; Ip=$Ip; HostKey=$HostKey }
if ($acaOwner.phase -eq 'bootstrap-running') {
    if ((Read-Host 'Verificare stato alla console; scrivere RIPRENDI per autorizzare il nuovo tentativo') -cne 'RIPRENDI') { return }
    $acaBootstrapArgs.ResumeBootstrap=$true
}
& (Join-Path $PSScriptRoot 'Invoke-AcaBootstrap.ps1') @acaBootstrapArgs
Write-Host ("Centrale predisposta: http://" + $Ip + ':3002/. Creare account/casa propri; completare prova LAN/telefono/riavvio e dispositivi.')
Write-Host 'Alla console host chiudere il listener temporaneo: systemctl stop dropbear. Scollegare CONFIG e cancellare dal supporto la sola chiave pubblica di setup.'
Write-Host ('Client del kit: ' + (Join-Path $acaPackage $acaProvenance.client.name) + '. Se ZIP, estrarre in una cartella nuova e aprire Acasystem.exe con le sue risorse.')
Write-Host ('Prima della consegna verificare anche VM-STABILITY.md e Test-AcaVirtualBoxStability.ps1 in ' + $PSScriptRoot + ': health positiva e client aperto non qualificano timer, recupero LAN o H24.')
