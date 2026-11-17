[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$ParentDirectory = (Join-Path $env:ProgramData 'ACA-System\Centrali'),
    [ValidatePattern('^ACA-[A-Za-z0-9-]{1,40}$')][string]$VmName = 'ACA-Pilota',
    [string]$ImageZip,
    [string]$SwitchName,
    [string]$Ip,
    [string]$HostKey
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'native-process.ps1')
$acaPackage = Split-Path $PSScriptRoot -Parent
# Il launcher opera sul kit generato; non raccoglie dati da installazioni del mittente.
$acaProvenance = Get-Content -LiteralPath (Join-Path $acaPackage 'MATERIAL-PROVENANCE.json') -Raw | ConvertFrom-Json
if ($acaProvenance.schema -ne 1 -or $acaProvenance.purpose -ne 'single-candidate-kit-not-target-tested' -or -not $acaProvenance.client) { throw 'Kit incompleto o solo materiali di revisione: generare il pacchetto con il client Windows' }
$acaSeen = @{}
foreach ($acaLine in @(Get-Content -LiteralPath (Join-Path $acaPackage 'SHA256SUMS'))) {
    if ($acaLine -notmatch '^([a-f0-9]{64})  ([A-Za-z0-9][A-Za-z0-9._/-]*)$') { throw 'Checksum del kit non valido' }
    $acaSha = $Matches[1]; $acaName = $Matches[2]
    if ($acaName.Split('/') -contains '..' -or $acaSeen.ContainsKey($acaName)) { throw 'Percorso checksum ambiguo o duplicato' }
    $acaSeen[$acaName] = $true
    if ((Get-FileHash -LiteralPath (Join-Path $acaPackage $acaName) -Algorithm SHA256).Hash.ToLowerInvariant() -cne $acaSha) { throw "Kit alterato: $acaName. Nessuna modifica al PC eseguita" }
}
foreach ($acaRequired in @('pilot/Start-AcaPilotSetup.ps1', 'pilot/Test-AcaPilotHost.ps1', 'pilot/New-AcaPilotVm.ps1', 'pilot/Invoke-AcaBootstrap.ps1', 'pilot/native-process.ps1', 'pilot/haos-image.json', 'bootstrap/installation.json', 'bootstrap/bootstrap-haos.sh', 'bootstrap/install-sonoff.py', 'bootstrap/SonoffLAN-v3.13.3.zip', 'bootstrap/BOOTSTRAP.md', 'bootstrap/BOOTSTRAP-SHA256SUMS', 'MATERIAL-PROVENANCE.json', [string]$acaProvenance.client.name)) {
    if (-not $acaSeen.ContainsKey($acaRequired)) { throw "Checksum richiesto assente: $acaRequired" }
}
if ($acaProvenance.client.name -notmatch '^client/[A-Za-z0-9][A-Za-z0-9._-]*\.(exe|zip)$') { throw 'Client Windows del kit non riconosciuto: usare installer .exe o client completo .zip' }
$acaMaterials = Join-Path $acaPackage 'bootstrap'
$acaManifest = Get-Content -LiteralPath (Join-Path $acaMaterials 'installation.json') -Raw | ConvertFrom-Json
$acaImage = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'haos-image.json') -Raw | ConvertFrom-Json
if ($acaImage.schema -ne 1 -or $acaImage.version -ne '18.4' -or $acaImage.fileName -ne 'haos_ova-18.4.vhdx.zip' -or $acaImage.url -ne 'https://github.com/home-assistant/operating-system/releases/download/18.4/haos_ova-18.4.vhdx.zip' -or $acaImage.sha256 -notmatch '^[a-f0-9]{64}$') { throw 'Immagine ufficiale HAOS non riconosciuta' }
if ($acaManifest.haosVersion -cne $acaImage.version) { throw 'Materiali e immagine HAOS di versioni diverse: rigenerare un kit coerente' }
$acaInventory = & (Join-Path $PSScriptRoot 'Test-AcaPilotHost.ps1') -AsObject
Write-Host ("PC: {0}; RAM {1} GiB; Hyper-V {2}" -f $acaInventory.Windows, $acaInventory.MemoryGiB, $acaInventory.HyperV)
Write-Host ("Candidata ACA {0}, app {1}, HAOS {2}, Core {3}. Account e dispositivi verranno creati dal destinatario." -f $acaManifest.version, $acaManifest.appVersion, $acaManifest.haosVersion, $acaManifest.coreVersion)
if ($acaInventory.Blockers.Count) { $acaInventory.Blockers | ForEach-Object { Write-Host ('- ' + $_) } }
if (-not $PSCmdlet.ShouldProcess($ParentDirectory, "Predisporre nuova centrale $VmName o riprendere il suo checkpoint; chiedere localmente ogni modifica Hyper-V/rete/riavvio")) { return }
if (-not $acaInventory.SupportedEdition -or -not $acaInventory.Administrator -or -not $acaInventory.FirmwareReady -or $acaInventory.MemoryGiB -lt 8) { throw 'Prerequisiti host non soddisfatti. Nessuna attivazione possibile su Windows Home; usare il PC Pro destinatario come amministratore' }
if ($acaInventory.HyperV -ne 'Enabled') {
    if ($acaInventory.HyperV -notin @('Disabled', 'DisabledWithPayloadRemoved')) { throw 'Stato Hyper-V incerto o riavvio in attesa: completare la configurazione Windows e rilanciare questo kit' }
    Write-Host 'Hyper-V cambia le funzionalita del PC e richiede un riavvio. Salvare i documenti aperti. Questa scelta riguarda soltanto questo PC.'
    if ((Read-Host 'Scrivere ABILITA HYPER-V per autorizzare, oppure Invio per uscire') -cne 'ABILITA HYPER-V') { return }
    Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All -All -NoRestart | Out-Null
    Write-Host 'Hyper-V abilitato. Dopo il riavvio rilanciare Start.cmd dallo stesso kit. Nessuna VM ancora creata.'
    if ((Read-Host 'Scrivere RIAVVIA per riavviare ora questo PC, oppure Invio per farlo piu tardi') -ceq 'RIAVVIA') { Restart-Computer -Confirm:$false }
    return
}
if (-not $acaInventory.Ready) { throw 'Completare i prerequisiti elencati prima del setup; nessuna installazione implicita di OpenSSH o modifica UEFI' }
$acaInstall = [IO.Path]::GetFullPath((Join-Path $ParentDirectory $VmName))
$acaOwnerPath = Join-Path $acaInstall 'installation-owner.json'
$acaResume = Test-Path -LiteralPath $acaOwnerPath -PathType Leaf
if (-not $acaResume) {
    if (Test-Path -LiteralPath $acaInstall) { throw 'Directory gia esistente senza checkpoint ACA: scegliere un nome nuovo, nessuna sovrascrittura' }
    $acaExternal = @($acaInventory.Switches | Where-Object SwitchType -eq 'External')
    if (-not $SwitchName -and $acaExternal.Count) {
        $acaExternal | ForEach-Object { Write-Host ('Switch LAN disponibile: ' + $_.Name) }
        $SwitchName = Read-Host 'Nome dello switch esterno LAN da usare'
    }
    if (-not $SwitchName) {
        Write-Host 'Serve uno switch esterno per rendere la centrale visibile a PC e telefono. La creazione puo interrompere brevemente la rete Windows.'
        $acaAdapters = @(Get-NetAdapter -Physical | Where-Object Status -eq 'Up')
        $acaAdapters | ForEach-Object { Write-Host ('Scheda disponibile: ' + $_.Name + ' / ' + $_.InterfaceDescription) }
        $acaAdapter = Read-Host 'Nome esatto della scheda LAN da condividere (Invio annulla)'
        if (-not $acaAdapter) { return }
        if (@($acaAdapters | Where-Object Name -eq $acaAdapter).Count -ne 1) { throw 'Scheda non identificata univocamente' }
        $SwitchName = 'ACA-LAN'
        if (Get-VMSwitch -Name $SwitchName -ErrorAction SilentlyContinue) { throw 'Nome ACA-LAN gia usato: scegliere esplicitamente uno switch esterno esistente' }
        if ((Read-Host "Scrivere CREA SWITCH per autorizzare ACA-LAN sulla scheda $acaAdapter") -cne 'CREA SWITCH') { return }
        New-VMSwitch -Name $SwitchName -NetAdapterName $acaAdapter -AllowManagementOS $true | Out-Null
    }
    if ((Get-VMSwitch -Name $SwitchName).SwitchType -ne 'External') { throw 'Lo switch scelto non e esterno: NAT/Default Switch non soddisfano la consegna LAN' }
    Write-Host ("Nuova VM ${VmName}: 2 vCPU, 4 GiB RAM statica, disco massimo 64 GiB in $acaInstall; avvio automatico se gia accesa allo spegnimento host. Il PC deve restare acceso per la centrale.")
    if ((Read-Host 'Scrivere CREA CENTRALE per autorizzare download verificato, nuova directory e nuova VM') -cne 'CREA CENTRALE') { return }
    if (-not (Test-Path -LiteralPath $ParentDirectory)) { New-Item -ItemType Directory -Path $ParentDirectory -Force | Out-Null }
    $acaDrive = Get-PSDrive -Name ([IO.Path]::GetPathRoot([IO.Path]::GetFullPath($ParentDirectory)).TrimEnd(':\')) -PSProvider FileSystem
    if ($acaDrive.Free -lt 72GB) { throw 'Servono almeno 72 GiB liberi sul volume della centrale' }
    if (-not $ImageZip) {
        $acaDownloads = Join-Path $ParentDirectory '.downloads'
        if (-not (Test-Path -LiteralPath $acaDownloads)) { New-Item -ItemType Directory -Path $acaDownloads | Out-Null }
        $ImageZip = Join-Path $acaDownloads $acaImage.fileName
        if (-not (Test-Path -LiteralPath $ImageZip)) {
            $acaPartial = $ImageZip + '.' + [guid]::NewGuid().ToString('N') + '.partial'
            Write-Host 'Download immagine ufficiale HAOS (circa 535 MiB); al termine controllo SHA-256.'
            try {
                Invoke-WebRequest -UseBasicParsing -Uri $acaImage.url -OutFile $acaPartial
                if ((Get-Item -LiteralPath $acaPartial).Length -ne $acaImage.size -or (Get-FileHash -LiteralPath $acaPartial -Algorithm SHA256).Hash.ToLowerInvariant() -cne $acaImage.sha256) { throw 'Dimensione/hash HAOS non corrispondenti: download non utilizzato' }
                [IO.File]::Move($acaPartial, $ImageZip)
            } catch { throw "Download non completato o non verificato. File parziale conservato: $acaPartial. $($_.Exception.Message)" }
        }
    }
    & (Join-Path $PSScriptRoot 'New-AcaPilotVm.ps1') -ImageZip $ImageZip -ParentDirectory $ParentDirectory -VmName $VmName -SwitchName $SwitchName -Start
}
$acaOwner = Get-Content -LiteralPath $acaOwnerPath -Raw | ConvertFrom-Json
if ($acaOwner.schema -ne 1 -or $acaOwner.vmName -cne $VmName -or $acaOwner.phase -notin @('created-bootstrap-pending', 'bootstrap-running', 'bootstrap-verified', 'revocation-pending', 'bootstrap-complete-key-revoked')) { throw 'Creazione incompleta o checkpoint inatteso: file conservati, controllare VM e disco prima di qualsiasi recupero; nessuna adozione automatica' }
$acaVm = Get-VM -Id ([guid]$acaOwner.vmId)
if (@(Get-VMHardDiskDrive -VM $acaVm | Where-Object Path -eq $acaOwner.disk).Count -ne 1) { throw 'Disco della VM diverso dal checkpoint: ripresa rifiutata' }
if ($acaVm.State -eq 'Off') {
    if ((Read-Host 'La centrale e spenta. Scrivere AVVIA per avviare soltanto questa VM') -cne 'AVVIA') { return }
    Start-VM -VM $acaVm
} elseif ($acaVm.State -ne 'Running') { throw 'VM in stato transitorio: verificarla in Gestione Hyper-V prima di proseguire' }
if ($acaOwner.PSObject.Properties['ip']) {
    if (-not $Ip) { $Ip = $acaOwner.ip }
    if (-not $HostKey) { $HostKey = $acaOwner.hostKey }
}
if (-not $Ip -or -not $HostKey) {
    Write-Host 'Aprire Gestione Hyper-V, selezionare questa VM e Connetti. Attendere il primo avvio completo e leggere il suo IPv4 LAN. L indirizzo suggerito dalla rete non e autenticazione.'
    $acaAddresses = @(Get-VMNetworkAdapter -VM $acaVm | ForEach-Object { $_.IPAddresses } | Where-Object { $_ -match '^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)' })
    if ($acaAddresses.Count) { Write-Host ('Indirizzi dichiarati dalla VM, da verificare alla console: ' + ($acaAddresses -join ', ')) }
    Write-Host 'Alla console HAOS digitare login per entrare nella shell host. Eseguire soltanto questi comandi per leggere la chiave PUBBLICA host:'
    Write-Host 'test -f /etc/dropbear/dropbear_ed25519_host_key || dropbearkey -t ed25519 -f /etc/dropbear/dropbear_ed25519_host_key'
    Write-Host "dropbearkey -y -f /etc/dropbear/dropbear_ed25519_host_key | grep '^ssh-ed25519 '"
    Write-Host 'Copiare la riga ssh-ed25519 BASE64 senza commento. Il file privato non va aperto o trasferito. Non usare ssh-keyscan come verifica della console.'
    if (-not $Ip) { $Ip = Read-Host 'IPv4 privato della centrale letto alla console' }
    if (-not $HostKey) { $HostKey = Read-Host 'Chiave PUBBLICA host verificata alla console (ssh-ed25519 BASE64)' }
}
$acaBootstrapArgs = @{ InstallationDirectory = $acaInstall; MaterialsDirectory = $acaMaterials; Ip = $Ip; HostKey = $HostKey }
if ($acaOwner.phase -eq 'bootstrap-running') {
    Write-Host 'Il bootstrap precedente e stato interrotto. Verificare alla console lo stato HA/Sonoff/ACA; la ripresa controllera le versioni e conservera account e configurazione.'
    if ((Read-Host 'Scrivere RIPRENDI dopo la verifica locale per autorizzare il nuovo tentativo') -cne 'RIPRENDI') { return }
    $acaBootstrapArgs.ResumeBootstrap = $true
}
& (Join-Path $PSScriptRoot 'Invoke-AcaBootstrap.ps1') @acaBootstrapArgs
$acaHealth = Invoke-RestMethod -Uri ("http://" + $Ip + ':3002/api/health') -TimeoutSec 10
if ($acaHealth.status -ne 'ok' -or $acaHealth.version -cne $acaManifest.version) { throw 'ACA non verificata sulla LAN: nessun client avviato' }
Write-Host ("Centrale pronta per l onboarding: http://" + $Ip + ':3002/. Creare account/casa propri e accedere a eWeLink da ACA. Mancano ancora collaudo telefono, riavvio e dispositivi reali.')
Write-Host 'La chiave di setup e revocata. Per chiudere anche il listener temporaneo, alla console host eseguire: systemctl stop dropbear'
$acaClientAction = if ($acaProvenance.client.name.EndsWith('.zip', [StringComparison]::OrdinalIgnoreCase)) { 'AVVIA CLIENT' } else { 'INSTALLA CLIENT' }
if ((Read-Host "Scrivere $acaClientAction per aprire il client Windows del kit, oppure Invio per terminare") -ceq $acaClientAction) {
    $acaClient = Join-Path $acaPackage $acaProvenance.client.name
    if ($acaClientAction -eq 'AVVIA CLIENT') {
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        Add-Type -AssemblyName System.IO.Compression
        $acaClientSha = (Get-FileHash -LiteralPath $acaClient -Algorithm SHA256).Hash.ToLowerInvariant()
        # Eredita la ACL privata della .setup; nessun file viene sovrascritto in una directory esistente.
        $acaClientDirectory = Join-Path $acaInstall ('.setup/client-' + $acaClientSha.Substring(0, 12))
        $acaClientOwnerPath = Join-Path $acaClientDirectory '.aca-client.json'
        $acaZip = [IO.Compression.ZipFile]::OpenRead($acaClient)
        try {
            $acaClientEntries = @($acaZip.Entries)
            $acaClientSeen = @{}; $acaExpandedBytes = [long]0
            foreach ($acaEntry in $acaClientEntries) {
                $acaEntryName = $acaEntry.FullName.TrimEnd('/')
                if (-not $acaEntryName -or $acaEntryName -match '[\\:<>"|?*]' -or $acaEntryName.StartsWith('/') -or $acaClientSeen.ContainsKey($acaEntryName) -or (($acaEntry.ExternalAttributes -shr 16) -band 0xF000) -eq 0xA000) { throw 'ZIP client con percorsi ambigui, duplicati o collegamenti: estrazione rifiutata' }
                foreach ($acaSegment in $acaEntryName.Split('/')) {
                    if (-not $acaSegment -or $acaSegment -in @('.', '..') -or $acaSegment -match '[. ]$|^(?i:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)') { throw 'ZIP client con percorso Windows non valido' }
                }
                $acaClientSeen[$acaEntryName] = $true
                $acaExpandedBytes += $acaEntry.Length
            }
            if ($acaClientEntries.Count -gt 20000 -or $acaExpandedBytes -gt 4GB -or @($acaClientEntries | Where-Object FullName -ceq 'Acasystem.exe').Count -ne 1 -or $acaClientSeen.ContainsKey('.aca-client.json')) { throw 'ZIP client senza Acasystem.exe alla radice o contenuto inatteso' }
            if (Test-Path -LiteralPath $acaClientDirectory) {
                if ((Get-Item -LiteralPath $acaClientDirectory).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Directory client collegata altrove: avvio rifiutato' }
                if (-not (Test-Path -LiteralPath $acaClientOwnerPath -PathType Leaf)) { throw 'Directory client incompleta o senza proprieta: conservarla per diagnosi, nessuna sovrascrittura' }
                $acaClientOwner = Get-Content -LiteralPath $acaClientOwnerPath -Raw | ConvertFrom-Json
                if ($acaClientOwner.schema -ne 1 -or $acaClientOwner.sha256 -cne $acaClientSha) { throw 'Directory client non corrispondente al kit' }
            } else {
                [IO.Compression.ZipFile]::ExtractToDirectory($acaClient, $acaClientDirectory)
                Write-AcaPilotState $acaClientOwnerPath @{ schema=1; sha256=$acaClientSha }
            }
            $acaClientItems = @(Get-ChildItem -LiteralPath $acaClientDirectory -Recurse -Force)
            $acaClientFiles = @($acaClientEntries | Where-Object Name)
            if (@($acaClientItems | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }).Count -or @($acaClientItems | Where-Object { -not $_.PSIsContainer -and $_.FullName -ne $acaClientOwnerPath }).Count -ne $acaClientFiles.Count) { throw 'Directory client alterata: collegamenti o file estranei' }
            foreach ($acaEntry in $acaClientFiles) {
                $acaEntryStream = $acaEntry.Open(); $acaHasher = [Security.Cryptography.SHA256]::Create()
                try { $acaEntrySha = [BitConverter]::ToString($acaHasher.ComputeHash($acaEntryStream)).Replace('-', '').ToLowerInvariant() }
                finally { $acaEntryStream.Dispose(); $acaHasher.Dispose() }
                if ((Get-FileHash -LiteralPath (Join-Path $acaClientDirectory $acaEntry.FullName) -Algorithm SHA256).Hash.ToLowerInvariant() -cne $acaEntrySha) { throw 'File del client diversi dallo ZIP verificato: avvio rifiutato' }
            }
            $acaClient = Join-Path $acaClientDirectory 'Acasystem.exe'
        } finally { $acaZip.Dispose() }
    }
    Start-Process -FilePath $acaClient
}
