[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter(Mandatory)][string]$InstallationDirectory,
    [Parameter(Mandatory)][string]$MaterialsDirectory,
    [Parameter(Mandatory)][string]$Ip,
    # Chiave pubblica host ottenuta dalla console VM e verificata localmente, mai con accept-new.
    [Parameter(Mandatory)][ValidatePattern('^ssh-ed25519 [A-Za-z0-9+/]{68}$')][string]$HostKey,
    # Solo dopo aver verificato alla console il risultato di una precedente esecuzione interrotta.
    [switch]$ResumeBootstrap
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'native-process.ps1')
if ($Ip -notmatch '^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)' -or $Ip -notmatch '^([0-9]{1,3}\.){3}[0-9]{1,3}$') { throw 'Serve un IPv4 privato della centrale' }
foreach ($acaOctet in $Ip.Split('.')) { if ([int]$acaOctet -gt 255 -or $acaOctet -match '^0\d') { throw 'IPv4 non valido' } }
$acaInstall = (Resolve-Path -LiteralPath $InstallationDirectory).Path
$acaMaterials = (Resolve-Path -LiteralPath $MaterialsDirectory).Path
$acaOwnerPath = Join-Path $acaInstall 'installation-owner.json'
$acaOwner = Get-Content -LiteralPath $acaOwnerPath -Raw | ConvertFrom-Json
if ($acaOwner.schema -ne 1 -or $acaOwner.phase -notin @('created-bootstrap-pending', 'bootstrap-running', 'bootstrap-verified', 'revocation-pending', 'bootstrap-complete-key-revoked')) { throw 'Installazione non in fase di bootstrap; nessuna adozione di target diversi o creazioni incomplete' }
if ($acaOwner.phase -eq 'bootstrap-running' -and -not $ResumeBootstrap) { throw 'Bootstrap precedente interrotto: verificare console/stato prima di richiedere -ResumeBootstrap; nessuna ripetizione automatica' }
$acaManualVirtualBox = $acaOwner.PSObject.Properties['platform'] -and $acaOwner.platform -eq 'virtualbox-manual'
if ($acaManualVirtualBox) {
    if ($acaOwner.manualVmConfirmed -ne $true -or $acaOwner.imageSha256 -cne 'e46c3b9bcf437ff56e5905b29e92ebaef4a50dac376eb8d919c29fbcea33b7be') { throw 'Predisposizione VirtualBox manuale non confermata o immagine non corrispondente' }
    # Nessun comando VirtualBox/Hyper-V: identita remota verificata tramite chiave host letta alla console.
} else {
    $acaVm = Get-VM -Id ([guid]$acaOwner.vmId)
    $acaAttached = @(Get-VMHardDiskDrive -VM $acaVm | Where-Object { $_.Path -eq $acaOwner.disk })
    if ($acaAttached.Count -ne 1 -or $acaVm.State -ne 'Running') { throw 'VM/disco di proprieta non corrispondenti o VM spenta' }
}
$acaManifest = Get-Content -LiteralPath (Join-Path $acaMaterials 'installation.json') -Raw | ConvertFrom-Json
if ($acaManifest.schema -ne 1 -or $acaManifest.version -notmatch '^\d+\.\d+\.\d+$' -or $acaManifest.haosVersion -notmatch '^\d+\.\d+$' -or $acaManifest.coreVersion -notmatch '^\d+\.\d+\.\d+$') { throw 'Manifesto installazione non valido: dichiarare versioni ACA, HAOS e Core' }
$acaFiles = @('bootstrap-haos.sh', 'install-sonoff.py', 'SonoffLAN-v3.13.3.zip', 'installation.json', 'BOOTSTRAP.md')
$acaLines = @(Get-Content -LiteralPath (Join-Path $acaMaterials 'BOOTSTRAP-SHA256SUMS'))
foreach ($acaFile in $acaFiles) {
    $acaMatches = @($acaLines | Where-Object { $_ -match ('^[0-9a-f]{64}  ' + [regex]::Escape($acaFile) + '$') })
    if ($acaMatches.Count -ne 1) { throw "Checksum mancante/duplicato: $acaFile" }
    if ((Get-FileHash -LiteralPath (Join-Path $acaMaterials $acaFile) -Algorithm SHA256).Hash.ToLowerInvariant() -ne $acaMatches[0].Substring(0, 64)) { throw "Checksum errato: $acaFile" }
}
# Un checksum estraneo non deve trasformare il controllo remoto in una lettura di altri file.
if ($acaLines.Count -ne $acaFiles.Count) { throw 'Elenco checksum inatteso' }
$acaSetup = Join-Path $acaInstall '.setup'
$acaKey = Join-Path $acaSetup 'bootstrap-key'
$acaMaterialsSha = (Get-FileHash -LiteralPath (Join-Path $acaMaterials 'BOOTSTRAP-SHA256SUMS') -Algorithm SHA256).Hash.ToLowerInvariant()
if ($acaOwner.PSObject.Properties['hostKey']) {
    if ($acaOwner.hostKey -cne $HostKey -or $acaOwner.ip -cne $Ip) { throw 'IP o chiave host differenti dal primo tentativo: ripresa rifiutata' }
    if ($acaOwner.materialsSha256 -cne $acaMaterialsSha -and $acaOwner.phase -ne 'created-bootstrap-pending') { throw 'Materiali differenti dopo avvio del bootstrap: ripresa rifiutata' }
}
foreach ($acaCommand in @('ssh.exe', 'scp.exe')) { if (-not (Get-Command $acaCommand -ErrorAction SilentlyContinue)) { throw "Strumento assente: $acaCommand" } }
if (-not $PSCmdlet.ShouldProcess("$($acaOwner.vmName) / $Ip", 'Trasferire materiali verificati, predisporre SonoffLAN/ACA e revocare la chiave temporanea')) { return }
if (-not $acaOwner.PSObject.Properties['hostKey']) {
    $acaOwner | Add-Member NoteProperty hostKey $HostKey
    $acaOwner | Add-Member NoteProperty ip $Ip
    $acaOwner | Add-Member NoteProperty materialsSha256 $acaMaterialsSha
    Write-AcaPilotState $acaOwnerPath $acaOwner
} elseif ($acaOwner.materialsSha256 -cne $acaMaterialsSha) {
    # Preflight rifiutato prima di installare: consentire materiali rigenerati per il Core osservato.
    $acaOwner.materialsSha256 = $acaMaterialsSha
    Write-AcaPilotState $acaOwnerPath $acaOwner
}
function Assert-AcaBootstrapHealth {
    $acaCurrentHealth = Invoke-RestMethod -Uri ("http://" + $Ip + ':3002/api/health') -TimeoutSec 10
    if ($acaCurrentHealth.status -ne 'ok' -or $acaCurrentHealth.version -cne $acaManifest.version) { throw 'Health attuale non corrispondente: verificare accensione/rete/versione della centrale; checkpoint conservato, nessuna reinstallazione automatica' }
    $acaCurrentBundle = Invoke-RestMethod -Uri ("http://" + $Ip + ':3002/api/client-bundle/manifest') -TimeoutSec 10
    if ($acaCurrentBundle.schema -ne 1 -or $acaCurrentBundle.version -cne $acaManifest.version -or $acaCurrentBundle.archive.sha256 -notmatch '^[a-f0-9]{64}$' -or $acaCurrentBundle.archive.size -le 0) { throw 'Manifesto bundle attuale non coerente con ACA: checkpoint conservato, predisposizione non dichiarata pronta' }
}
function Complete-AcaBootstrap {
    # La prova di revoca e gia registrata: il cleanup puo riprendere dopo un crash locale.
    foreach ($acaKeyFile in @($acaKey, ($acaKey + '.pub'))) {
        if (Test-Path -LiteralPath $acaKeyFile) { Remove-Item -LiteralPath $acaKeyFile }
    }
    if ($acaManualVirtualBox -and (Test-Path -LiteralPath (Join-Path $acaInstall 'CONFIG/authorized_keys'))) { Remove-Item -LiteralPath (Join-Path $acaInstall 'CONFIG/authorized_keys') }
    Write-Output ("Bootstrap e revoca autenticazione completati; aprire http://" + $Ip + ':3002/ per creare il nuovo account. Eseguire ancora il collaudo LAN/riavvio/dispositivi.')
}
if ($acaOwner.phase -eq 'bootstrap-complete-key-revoked') { Assert-AcaBootstrapHealth; Complete-AcaBootstrap; return }
$acaPublicKey = ([IO.File]::ReadAllText($acaKey + '.pub')).Trim()
if ($acaPublicKey -notmatch '^ssh-ed25519 [A-Za-z0-9+/]{68} aca-pilot-bootstrap$' -or -not (Test-Path -LiteralPath $acaKey -PathType Leaf)) { throw 'Chiave di predisposizione non valida o mancante' }
$acaKnownHosts = Join-Path $acaSetup 'known_hosts'
[IO.File]::WriteAllText($acaKnownHosts, "[$Ip]:22222 $HostKey`n", [Text.Encoding]::ASCII)
$acaOptions = @('-F', 'NUL', '-i', $acaKey, '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', ('UserKnownHostsFile="' + $acaKnownHosts.Replace('\', '/') + '"'), '-o', 'GlobalKnownHostsFile=NUL', '-o', 'ConnectTimeout=10')
$acaTarget = 'root@' + $Ip
function Invoke-AcaSsh([string]$RemoteCommand) {
    $acaResult = Invoke-AcaNative 'ssh.exe' ($acaOptions + @('-p', '22222', $acaTarget, $RemoteCommand))
    if ($acaResult.ExitCode -ne 0) { throw 'Comando di predisposizione SSH non riuscito; controllare console/servizi/rete. Chiave e checkpoint conservati per ripresa locale' }
    if ($acaResult.Output) { Write-Output $acaResult.Output.TrimEnd() }
}
if ($acaOwner.phase -in @('created-bootstrap-pending', 'bootstrap-running')) {
    # Preflight remoto read-only: nessuna aggiunta store/Sonoff/ACA prima di questo confronto.
    foreach ($acaComponent in @('os', 'core')) {
        $acaObservedText = Invoke-AcaSsh ("ha --raw-json $acaComponent info")
        try { $acaObserved = $acaObservedText | ConvertFrom-Json } catch { throw 'Stato versioni HAOS/Core non leggibile: attendere il primo avvio completo e riprovare' }
        $acaExpected = if ($acaComponent -eq 'os') { $acaManifest.haosVersion } else { $acaManifest.coreVersion }
        if ($acaObserved.result -ne 'ok' -or $acaObserved.data.version -cne $acaExpected) {
            throw "Versione $acaComponent osservata $($acaObserved.data.version), materiali per $acaExpected. Nessuna installazione ACA/Sonoff avviata: qualificare questa combinazione e rigenerare i materiali; nessun downgrade automatico."
        }
    }
    $acaRemote = '/tmp/aca-pilot-' + ([guid]::NewGuid().ToString('N'))
    Invoke-AcaSsh ("umask 077; mkdir '$acaRemote'")
    foreach ($acaFile in @($acaFiles + 'BOOTSTRAP-SHA256SUMS')) {
        # -O: Dropbear host non garantisce SFTP; il protocollo legacy e circoscritto ai materiali.
        $acaResult = Invoke-AcaNative 'scp.exe' ($acaOptions + @('-O', '-P', '22222', (Join-Path $acaMaterials $acaFile), ($acaTarget + ':' + $acaRemote + '/')))
        if ($acaResult.ExitCode -ne 0) { throw 'Trasferimento SSH non riuscito; chiave/stato conservati. Nessun bootstrap avviato' }
    }
    $acaOwner.phase = 'bootstrap-running'
    Write-AcaPilotState $acaOwnerPath $acaOwner
    Invoke-AcaSsh ("cd '$acaRemote' && sha256sum -c BOOTSTRAP-SHA256SUMS && sh bootstrap-haos.sh --ip '$Ip' --version '$($acaManifest.version)'")
    $acaOwner.phase = 'bootstrap-verified'
    Write-AcaPilotState $acaOwnerPath $acaOwner
}
Assert-AcaBootstrapHealth
# Checkpoint prima della revoca: un'interruzione dopo il comando non richiede ripetere il bootstrap.
$acaOwner.phase = 'revocation-pending'
Write-AcaPilotState $acaOwnerPath $acaOwner
$acaRevoked = Invoke-AcaNative 'ssh.exe' ($acaOptions + @('-p', '22222', $acaTarget, 'true'))
if ($acaRevoked.ExitCode -eq 0) {
    # Revoca soltanto se questa e ancora l'unica chiave; preserva gli accessi di altri.
    Invoke-AcaSsh ("test `"`$(cat /root/.ssh/authorized_keys)`" = '$acaPublicKey' && : > /root/.ssh/authorized_keys && sync")
    $acaRevoked = Invoke-AcaNative 'ssh.exe' ($acaOptions + @('-p', '22222', $acaTarget, 'true'))
}
if ($acaRevoked.ExitCode -ne 255 -or $acaRevoked.ErrorOutput -notmatch '(?i)Permission denied \(publickey(?:,[a-z-]+)*\)') { throw 'Revoca non dimostrata: timeout, rete assente, chiave host diversa o accesso ancora consentito non sono prove. Stato e chiavi conservati; verificare dalla console locale' }
$acaOwner.phase = 'bootstrap-complete-key-revoked'
Write-AcaPilotState $acaOwnerPath $acaOwner
Complete-AcaBootstrap
