$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Import-Module Microsoft.PowerShell.Utility
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$acaTestRoot = Join-Path ([IO.Path]::GetTempPath()) ('aca-pilot-vbox-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path (Join-Path $acaTestRoot 'pilot'), (Join-Path $acaTestRoot 'bootstrap'), (Join-Path $acaTestRoot 'client') -Force | Out-Null
$acaScripts = Join-Path $acaTestRoot 'pilot'
foreach ($acaName in @('Start-AcaVirtualBoxSetup.ps1', 'VIRTUALBOX.md', 'haos-virtualbox-image.json', 'Invoke-AcaBootstrap.ps1')) { Copy-Item -LiteralPath (Join-Path $PSScriptRoot $acaName) -Destination (Join-Path $acaScripts $acaName) }
$acaHelper = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'native-process.ps1')) + @'

function Invoke-AcaNative([string]$Command, [string[]]$Arguments, [int]$TimeoutMilliseconds = 900000) {
    $global:acaVBoxCalls.Add($Command + ':' + $Arguments[-1])
    $acaOutput = ''; $acaError = ''; $acaExit = 0
    if ($Command -like '*VBoxManage*') { $acaOutput='7.2.4r123456' }
    elseif ($Command -eq 'ssh-keygen.exe') {
        [IO.File]::WriteAllText($Arguments[-1], 'fixture-not-a-private-key')
        [IO.File]::WriteAllText($Arguments[-1] + '.pub', 'ssh-ed25519 ' + ('A' * 68) + ' aca-pilot-bootstrap')
    } elseif ($Command -eq 'ssh.exe') {
        if ($Arguments[-1] -eq 'ha --raw-json os info') { $acaOutput='{"result":"ok","data":{"version":"18.4"}}' }
        elseif ($Arguments[-1] -eq 'ha --raw-json core info') { $acaOutput='{"result":"ok","data":{"version":"2026.9.4"}}' }
        elseif ($Arguments[-1] -eq 'true') {
            $global:acaVBoxProbe++
            if ($global:acaVBoxProbe -gt 1) { $acaExit=255; $acaError='Permission denied (publickey).' }
        }
    }
    [pscustomobject]@{ ExitCode=$acaExit; Output=$acaOutput; ErrorOutput=$acaError }
}
'@
[IO.File]::WriteAllText((Join-Path $acaScripts 'native-process.ps1'), $acaHelper)
$acaImagePath = Join-Path $acaTestRoot 'fixture.vdi.zip'
$acaZip = [IO.Compression.ZipFile]::Open($acaImagePath, [IO.Compression.ZipArchiveMode]::Create)
try { $acaStream=$acaZip.CreateEntry('haos_ova-18.4.vdi').Open(); try { $acaBytes=[Text.Encoding]::ASCII.GetBytes('fixture-not-a-disk'); $acaStream.Write($acaBytes,0,$acaBytes.Length) } finally { $acaStream.Dispose() } } finally { $acaZip.Dispose() }
$acaMaterials = Join-Path $acaTestRoot 'bootstrap'
$acaBootstrapFiles = @('bootstrap-haos.sh','install-sonoff.py','SonoffLAN-v3.13.3.zip','installation.json','BOOTSTRAP.md')
foreach ($acaName in $acaBootstrapFiles) { [IO.File]::WriteAllText((Join-Path $acaMaterials $acaName), 'fixture') }
[IO.File]::WriteAllText((Join-Path $acaMaterials 'installation.json'), '{"schema":1,"version":"0.9.73","appVersion":"0.9.73.99","haosVersion":"18.4","coreVersion":"2026.9.4"}')
@($acaBootstrapFiles | ForEach-Object { (Get-FileHash -LiteralPath (Join-Path $acaMaterials $_) -Algorithm SHA256).Hash.ToLowerInvariant()+'  '+$_ }) | Set-Content -LiteralPath (Join-Path $acaMaterials 'BOOTSTRAP-SHA256SUMS') -Encoding ASCII
[IO.File]::WriteAllText((Join-Path $acaTestRoot 'client/Acasystem-fixture.exe'), 'MZfixture')
[IO.File]::WriteAllText((Join-Path $acaTestRoot 'MATERIAL-PROVENANCE.json'), '{"schema":1,"purpose":"single-candidate-kit-not-target-tested","client":{"name":"client/Acasystem-fixture.exe"}}')
$acaKitFiles = @('pilot/Start-AcaVirtualBoxSetup.ps1','pilot/VIRTUALBOX.md','pilot/haos-virtualbox-image.json','pilot/Invoke-AcaBootstrap.ps1','pilot/native-process.ps1','bootstrap/BOOTSTRAP-SHA256SUMS','client/Acasystem-fixture.exe','MATERIAL-PROVENANCE.json') + @($acaBootstrapFiles | ForEach-Object { 'bootstrap/'+$_ })
@($acaKitFiles | ForEach-Object { (Get-FileHash -LiteralPath (Join-Path $acaTestRoot $_) -Algorithm SHA256).Hash.ToLowerInvariant()+'  '+$_ }) | Set-Content -LiteralPath (Join-Path $acaTestRoot 'SHA256SUMS') -Encoding ASCII
$global:acaVBoxCalls = New-Object 'Collections.Generic.List[string]'
$global:acaVBoxAnswers = New-Object 'Collections.Generic.Queue[string]'
$global:acaVBoxPresent = $true; $global:acaVBoxHashValid = $false; $global:acaVBoxAclCount=0; $global:acaVBoxProbe=0
$global:acaVBoxHealthMode='ok'
$global:acaVBoxHealthReads=New-Object 'Collections.Generic.List[string]'
function Get-Command { param($Name,$CommandType) if ($Name -like '*VBoxManage.exe') { if ($global:acaVBoxPresent) { [pscustomobject]@{ Source='VBoxManage-fixture.exe' } }; return }; if ($Name -in @('ssh-keygen.exe','ssh.exe','scp.exe')) { [pscustomobject]@{ Source=$Name }; return }; Microsoft.PowerShell.Core\Get-Command -Name $Name }
function Get-CimInstance { param($ClassName) if ($ClassName -eq 'Win32_ComputerSystem') { [pscustomobject]@{ TotalPhysicalMemory=32GB; HypervisorPresent=$true } } else { [pscustomobject]@{ VirtualizationFirmwareEnabled=$true } } }
function Get-PSDrive { param($Name,$PSProvider) [pscustomobject]@{ Free=100GB } }
function Get-Item { param($LiteralPath) if ($LiteralPath -eq $acaImagePath) { [pscustomobject]@{ Length=560370635 } } else { Microsoft.PowerShell.Management\Get-Item -LiteralPath $LiteralPath } }
function Get-FileHash { param($LiteralPath,$Algorithm) if ($LiteralPath -eq $acaImagePath) { [pscustomobject]@{ Hash= $(if ($global:acaVBoxHashValid) { 'e46c3b9bcf437ff56e5905b29e92ebaef4a50dac376eb8d919c29fbcea33b7be' } else { '0'*64 }) } } else { Microsoft.PowerShell.Utility\Get-FileHash -LiteralPath $LiteralPath -Algorithm $Algorithm } }
function Set-Acl { param($LiteralPath,$AclObject) $global:acaVBoxAclCount++ }
function Read-Host { param($Prompt) if (-not $global:acaVBoxAnswers.Count) { throw "Prompt inatteso: $Prompt" }; $global:acaVBoxAnswers.Dequeue() }
function Get-VM { throw 'Hyper-V vietato nel percorso VirtualBox' }
function Get-VMHardDiskDrive { throw 'Hyper-V vietato nel percorso VirtualBox' }
function Invoke-WebRequest { throw 'Download reale vietato nei test' }
function Invoke-RestMethod {
    param($Uri,$TimeoutSec)
    $global:acaVBoxHealthReads.Add($Uri)
    if ($global:acaVBoxHealthMode -eq 'offline') { throw 'fixture offline' }
    if ($Uri -like '*/api/client-bundle/manifest') { [pscustomobject]@{ schema=1; version=$(if ($global:acaVBoxHealthMode -eq 'bundle-mismatch') { '0.9.99' } else { '0.9.73' }); archive=[pscustomobject]@{ sha256=('a'*64); size=20 } } }
    else { [pscustomobject]@{ status='ok'; version='0.9.73' } }
}
$acaArgs = @{ ParentDirectory=(Join-Path $acaTestRoot 'centrali'); VmName='ACA-Test'; ImageZip=$acaImagePath; Ip='192.168.1.20'; HostKey=('ssh-ed25519 '+('A'*68)) }
$acaPassed=0
function Assert-VBox($Condition,[string]$Name) { if (-not $Condition) { throw "FAIL: $Name" }; $script:acaPassed++; Write-Output ('PASS: '+$Name) }
try {
    $acaInventory = & "$acaScripts/Start-AcaVirtualBoxSetup.ps1" -InspectOnly | ConvertFrom-Json
    Assert-VBox ($acaInventory.Ready -and $acaInventory.VirtualBoxVersion -eq '7.2.4' -and ($global:acaVBoxCalls -join ',') -eq 'VBoxManage-fixture.exe:--version') 'Inventario usa solo VBoxManage --version e letture host'
    & "$acaScripts/Start-AcaVirtualBoxSetup.ps1" @acaArgs -WhatIf | Out-Null
    Assert-VBox (-not (Test-Path -LiteralPath $acaArgs.ParentDirectory) -and $global:acaVBoxAclCount -eq 0) 'WhatIf non crea file/chiavi/VM o ACL'
    $global:acaVBoxAnswers.Enqueue('')
    & "$acaScripts/Start-AcaVirtualBoxSetup.ps1" @acaArgs | Out-Null
    Assert-VBox (-not (Test-Path -LiteralPath $acaArgs.ParentDirectory)) 'Consenso assente: nessuna preparazione locale'
    $global:acaVBoxAnswers.Enqueue('PREPARA MATERIALI')
    $acaReason=''; try { & "$acaScripts/Start-AcaVirtualBoxSetup.ps1" @acaArgs | Out-Null } catch { $acaReason=$_.Exception.Message }
    Assert-VBox ($acaReason -like '*ZIP VDI non corrispondente*' -and -not (Test-Path -LiteralPath (Join-Path $acaArgs.ParentDirectory 'ACA-Test'))) 'Hash VDI errato blocca prima di copia, chiavi e VM'
    $global:acaVBoxHashValid=$true; $global:acaVBoxAnswers.Enqueue('PREPARA MATERIALI'); $global:acaVBoxAnswers.Enqueue('')
    & "$acaScripts/Start-AcaVirtualBoxSetup.ps1" @acaArgs | Out-Null
    $acaInstall = Join-Path $acaArgs.ParentDirectory 'ACA-Test'
    $acaOwner = Get-Content -LiteralPath (Join-Path $acaInstall 'installation-owner.json') -Raw | ConvertFrom-Json
    Assert-VBox ($acaOwner.phase -eq 'manual-vm-pending' -and $global:acaVBoxAclCount -eq 1 -and (Test-Path -LiteralPath (Join-Path $acaInstall 'haos.vdi')) -and (Test-Path -LiteralPath (Join-Path $acaInstall 'CONFIG/authorized_keys'))) 'Predisposizione locale conserva copia VDI, CONFIG pubblica e attesa azione umana'
    Assert-VBox (@($global:acaVBoxCalls | Where-Object { $_ -match '^(ssh.exe|scp.exe):' }).Count -eq 0) 'Nessuna connessione prima della conferma VM manuale/CONFIG'
    $global:acaVBoxAnswers.Enqueue('VM VERGINE PRONTA')
    & "$acaScripts/Start-AcaVirtualBoxSetup.ps1" @acaArgs | Out-Null
    $acaOwner = Get-Content -LiteralPath (Join-Path $acaInstall 'installation-owner.json') -Raw | ConvertFrom-Json
    Assert-VBox ($acaOwner.platform -eq 'virtualbox-manual' -and $acaOwner.manualVmConfirmed -and $acaOwner.phase -eq 'bootstrap-complete-key-revoked') 'Bootstrap standalone manuale mantiene pin/versioni/revoca senza Hyper-V'
    Assert-VBox (-not (Test-Path -LiteralPath (Join-Path $acaInstall '.setup/bootstrap-key')) -and -not (Test-Path -LiteralPath (Join-Path $acaInstall 'CONFIG/authorized_keys'))) 'Revoca completata pulisce chiave privata fittizia e CONFIG pubblica locale'
    $global:acaVBoxCalls.Clear(); $global:acaVBoxHealthReads.Clear()
    & "$acaScripts/Start-AcaVirtualBoxSetup.ps1" @acaArgs | Out-Null
    Assert-VBox (($global:acaVBoxCalls -join ',') -eq 'VBoxManage-fixture.exe:--version') 'Ripresa completata senza nuove chiavi, installazione, accesso SSH o comandi VM'
    Assert-VBox ($global:acaVBoxHealthReads.Count -eq 2 -and $global:acaVBoxHealthReads[1] -like '*/api/client-bundle/manifest') 'Checkpoint completato rilegge health e manifesto bundle attuali'
    $global:acaVBoxHealthMode='offline'; $global:acaVBoxCalls.Clear()
    $acaReason=''; try { & "$acaScripts/Start-AcaVirtualBoxSetup.ps1" @acaArgs | Out-Null } catch { $acaReason=$_.Exception.Message }
    Assert-VBox ($acaReason -eq 'fixture offline' -and ($global:acaVBoxCalls -join ',') -eq 'VBoxManage-fixture.exe:--version') 'Centrale completata poi offline: nessun falso successo o reinstallazione SSH'
    $global:acaVBoxHealthMode='bundle-mismatch'; $global:acaVBoxCalls.Clear()
    $acaReason=''; try { & "$acaScripts/Start-AcaVirtualBoxSetup.ps1" @acaArgs | Out-Null } catch { $acaReason=$_.Exception.Message }
    $acaOwner=Get-Content -LiteralPath (Join-Path $acaInstall 'installation-owner.json') -Raw | ConvertFrom-Json
    Assert-VBox ($acaReason -like '*Manifesto bundle attuale non coerente*' -and $acaOwner.phase -eq 'bootstrap-complete-key-revoked' -and ($global:acaVBoxCalls -join ',') -eq 'VBoxManage-fixture.exe:--version') 'Bundle diverso blocca dichiarazione pronto e conserva checkpoint completato'
    $global:acaVBoxHealthMode='ok'
    $global:acaVBoxPresent=$false
    $acaInventory = & "$acaScripts/Start-AcaVirtualBoxSetup.ps1" -InspectOnly | ConvertFrom-Json
    Assert-VBox (-not $acaInventory.Ready) 'VirtualBox assente rimane prerequisito manuale, senza installazione'
    Write-Output ("PASS: $acaPassed verifiche VirtualBox simulate; zero VM/rete/ACL reali o chiavi private reali.")
} finally {
    foreach ($acaName in @('acaVBoxCalls','acaVBoxAnswers','acaVBoxPresent','acaVBoxHashValid','acaVBoxAclCount','acaVBoxProbe','acaVBoxHealthMode','acaVBoxHealthReads')) { Remove-Variable -Name $acaName -Scope Global -ErrorAction SilentlyContinue }
    $acaResolvedTest=[IO.Path]::GetFullPath($acaTestRoot)
    if (-not $acaResolvedTest.StartsWith([IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')+'\aca-pilot-vbox-',[StringComparison]::OrdinalIgnoreCase)) { throw 'Cleanup fuori fixture temporanea' }
    Remove-Item -LiteralPath $acaResolvedTest -Recurse -Force
}
