$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Import-Module Microsoft.PowerShell.Utility
. (Join-Path $PSScriptRoot 'native-process.ps1')
# Test delle guardie con cmdlet Hyper-V/SSH simulati. Non interroga o modifica l'hypervisor.
$acaTestRoot = Join-Path ([IO.Path]::GetTempPath()) ('aca-pilot-test-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $acaTestRoot | Out-Null
$acaCalls = 0
$acaHashValid = $false
$acaExistingVm = $false
$acaSwitchType = 'External'
$acaAttachedPath = Join-Path $acaTestRoot 'haos.vhdx'
function Get-FileHash {
    param([string]$LiteralPath, [string]$Algorithm)
    if ($LiteralPath -eq (Join-Path $acaTestRoot 'image.zip') -and $acaHashValid) {
        return [pscustomobject]@{ Hash = 'ab49fec41536c49fb7ca23db0a383f1e6b6078ac3e1a169a177cc8ec58641993' }
    }
    Microsoft.PowerShell.Utility\Get-FileHash -LiteralPath $LiteralPath -Algorithm $Algorithm
}
function Get-VM { param($Name, $Id) if ($Id) { return [pscustomobject]@{ Id = $Id; State = 'Running' } }; if ($acaExistingVm) { return [pscustomobject]@{ Name = $Name } } }
function Get-VMSwitch { param($Name) return [pscustomobject]@{ Name = $Name; SwitchType = $acaSwitchType } }
function Get-VMHardDiskDrive { param($VM) return [pscustomobject]@{ Path = $acaAttachedPath } }
function New-VM { $script:acaCalls++; throw 'MUTAZIONE VIETATA NEL TEST' }
function Mount-VHD { $script:acaCalls++; throw 'MUTAZIONE VIETATA NEL TEST' }
function Resize-VHD { $script:acaCalls++; throw 'MUTAZIONE VIETATA NEL TEST' }
function Get-VHD { throw 'Non atteso nel dry run' }
function Set-VMFirmware { $script:acaCalls++; throw 'MUTAZIONE VIETATA NEL TEST' }
foreach ($acaMockCommand in @('Start-VM', 'Dismount-VHD', 'Set-VMProcessor', 'Set-VMMemory', 'Set-VM', 'Get-Disk', 'Get-Partition', 'Get-Volume', 'Add-PartitionAccessPath', 'Remove-PartitionAccessPath')) {
    Set-Item -Path ('Function:' + $acaMockCommand) -Value { $script:acaCalls++; throw 'COMANDO HYPER-V/STORAGE VIETATO NEL TEST' }
}
function Get-PSDrive { param($Name, $PSProvider) [pscustomobject]@{ Free = 100GB } }
function ssh-keygen.exe { $script:acaCalls++; throw 'CHIAVE VIETATA NEL TEST' }
function ssh.exe { $script:acaCalls++; throw 'RETE VIETATA NEL TEST' }
function scp.exe { $script:acaCalls++; throw 'RETE VIETATA NEL TEST' }
function Assert-Rejected([scriptblock]$Operation, [string]$Name) {
    $acaRejected = $false
    try { & $Operation } catch { $acaRejected = $true }
    if (-not $acaRejected) { throw "Guardia non intervenuta: $Name" }
}
try {
    $acaImage = Join-Path $acaTestRoot 'image.zip'
    [IO.File]::WriteAllText($acaImage, 'not-an-os')
    $acaVmArgs = @{ ImageZip = $acaImage; ParentDirectory = $acaTestRoot; SwitchName = 'LAN'; VmName = 'ACA-Test' }
    Assert-Rejected { & "$PSScriptRoot/New-AcaPilotVm.ps1" @acaVmArgs -WhatIf } 'hash immagine errato'
    $acaImageStream = [IO.File]::OpenWrite($acaImage)
    try { $acaImageStream.SetLength(560616192) } finally { $acaImageStream.Dispose() }
    $acaHashValid = $true
    & "$PSScriptRoot/New-AcaPilotVm.ps1" @acaVmArgs -WhatIf
    if (Test-Path -LiteralPath (Join-Path $acaTestRoot 'ACA-Test')) { throw 'WhatIf ha creato la directory VM' }
    $acaSwitchType = 'Internal'
    Assert-Rejected { & "$PSScriptRoot/New-AcaPilotVm.ps1" @acaVmArgs -WhatIf } 'switch NAT/interno'
    $acaSwitchType = 'External'; $acaExistingVm = $true
    Assert-Rejected { & "$PSScriptRoot/New-AcaPilotVm.ps1" @acaVmArgs -WhatIf } 'VM preesistente'
    $acaExistingVm = $false
    New-Item -ItemType Directory -Path (Join-Path $acaTestRoot 'ACA-Test') | Out-Null
    Assert-Rejected { & "$PSScriptRoot/New-AcaPilotVm.ps1" @acaVmArgs -WhatIf } 'directory preesistente'

    $acaMaterials = Join-Path $acaTestRoot 'materials'
    New-Item -ItemType Directory -Path $acaMaterials | Out-Null
    $acaFiles = @('bootstrap-haos.sh', 'install-sonoff.py', 'SonoffLAN-v3.13.3.zip', 'installation.json', 'BOOTSTRAP.md')
    foreach ($acaFile in $acaFiles) { [IO.File]::WriteAllText((Join-Path $acaMaterials $acaFile), 'fixture') }
    [IO.File]::WriteAllText((Join-Path $acaMaterials 'installation.json'), '{"schema":1,"version":"0.9.72","haosVersion":"18.4","coreVersion":"2026.9.4"}')
    $acaChecksums = @($acaFiles | ForEach-Object { (Get-FileHash -LiteralPath (Join-Path $acaMaterials $_) -Algorithm SHA256).Hash.ToLowerInvariant() + '  ' + $_ })
    $acaChecksums | Set-Content -LiteralPath (Join-Path $acaMaterials 'BOOTSTRAP-SHA256SUMS') -Encoding ASCII
    $acaOwner = @{ schema = 1; phase = 'created-bootstrap-pending'; vmId = [guid]::NewGuid().ToString(); disk = $acaAttachedPath; vmName = 'ACA-Test' }
    $acaOwner | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $acaTestRoot 'installation-owner.json')
    $acaSetup = Join-Path $acaTestRoot '.setup'
    New-Item -ItemType Directory -Path $acaSetup | Out-Null
    $acaPublic = 'ssh-ed25519 ' + ('A' * 68)
    [IO.File]::WriteAllText((Join-Path $acaSetup 'bootstrap-key.pub'), $acaPublic + ' aca-pilot-bootstrap')
    $acaBootstrapArgs = @{ InstallationDirectory = $acaTestRoot; MaterialsDirectory = $acaMaterials; Ip = '192.168.1.20'; HostKey = $acaPublic }
    & "$PSScriptRoot/Invoke-AcaBootstrap.ps1" @acaBootstrapArgs -WhatIf
    if (Test-Path -LiteralPath (Join-Path $acaSetup 'known_hosts')) { throw 'WhatIf ha scritto known_hosts' }
    $acaBootstrapArgs.Ip = '8.8.8.8'
    Assert-Rejected { & "$PSScriptRoot/Invoke-AcaBootstrap.ps1" @acaBootstrapArgs -WhatIf } 'IP pubblico'
    $acaBootstrapArgs.Ip = '192.168.1.20'
    [IO.File]::WriteAllText((Join-Path $acaMaterials 'bootstrap-haos.sh'), 'tampered')
    Assert-Rejected { & "$PSScriptRoot/Invoke-AcaBootstrap.ps1" @acaBootstrapArgs -WhatIf } 'materiali alterati'
    if ($acaCalls -ne 0) { throw 'Eseguita mutazione o rete durante i test' }
    $acaArguments = @('', 'C:\cartella con spazi\', 'literal"quote', '$(not-a-command)', 'back\slash"quote')
    $acaRoundtrip = Invoke-AcaNative 'node.exe' (@('-e', 'process.stdout.write(JSON.stringify(process.argv.slice(1)))', '--') + $acaArguments)
    if ($acaRoundtrip.ExitCode -ne 0) { throw 'Roundtrip argomenti nativi fallito' }
    $acaActual = ConvertFrom-Json -InputObject $acaRoundtrip.Output
    for ($acaIndex = 0; $acaIndex -lt $acaArguments.Count; $acaIndex++) {
        if ($acaArguments[$acaIndex] -cne $acaActual[$acaIndex]) { throw 'Quoting argomenti nativi errato' }
    }
    Assert-Rejected { Invoke-AcaNative 'node.exe' @('-e', 'setTimeout(()=>{}, 10000)') 50 } 'timeout processo nativo'
    $acaStatePath = Join-Path $acaTestRoot 'atomic-state.json'
    Write-AcaPilotState $acaStatePath @{ phase = 'before' }
    Write-AcaPilotState $acaStatePath @{ phase = 'after' }
    if ((Get-Content -LiteralPath $acaStatePath -Raw | ConvertFrom-Json).phase -ne 'after' -or @(Get-ChildItem -LiteralPath $acaTestRoot -Filter '*.tmp').Count) { throw 'Checkpoint atomico non aggiornato o residuo temporaneo' }
    Write-Output 'PASS: 8 guardie/WhatIf; 0 comandi Hyper-V mutanti, chiavi private o rete. Non e collaudo Hyper-V/HAOS.'
    Write-Output 'PASS: 5 argomenti nativi roundtrip, inclusi spazi/virgolette/vuoto/testo shell letterale.'
    Write-Output 'PASS: timeout processo figlio locale e checkpoint atomico ripetuto; nessuna rete.'
} finally {
    $acaResolvedTest = [IO.Path]::GetFullPath($acaTestRoot)
    $acaExpectedPrefix = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\aca-pilot-test-'
    if (-not $acaResolvedTest.StartsWith($acaExpectedPrefix, [StringComparison]::OrdinalIgnoreCase)) { throw 'Cleanup fuori dalla directory temporanea del test' }
    Remove-Item -LiteralPath $acaResolvedTest -Recurse -Force
}
