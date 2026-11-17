function ConvertTo-AcaNativeArgument([AllowEmptyString()][string]$Value) {
    # Quoting Windows CRT, senza cmd.exe o interpolazione di comandi shell.
    $acaEscaped = [regex]::Replace($Value, '(\\*)"', '$1$1\"')
    $acaEscaped = [regex]::Replace($acaEscaped, '(\\+)$', '$1$1')
    return '"' + $acaEscaped + '"'
}

function Invoke-AcaNative([string]$Command, [string[]]$Arguments, [int]$TimeoutMilliseconds = 900000) {
    $ErrorActionPreference = 'Stop'
    $acaStart = New-Object Diagnostics.ProcessStartInfo
    $acaStart.FileName = (Get-Command $Command -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
    $acaStart.Arguments = (($Arguments | ForEach-Object { ConvertTo-AcaNativeArgument $_ }) -join ' ')
    $acaStart.UseShellExecute = $false
    $acaStart.CreateNoWindow = $true
    $acaStart.RedirectStandardOutput = $true
    $acaStart.RedirectStandardError = $true
    $acaChild = [Diagnostics.Process]::Start($acaStart)
    try {
        $acaStdout = $acaChild.StandardOutput.ReadToEndAsync()
        $acaStderr = $acaChild.StandardError.ReadToEndAsync()
        if (-not $acaChild.WaitForExit($TimeoutMilliseconds)) { $acaChild.Kill(); throw 'Timeout del processo: verificare lo stato remoto prima di ripetere' }
        return [pscustomobject]@{ ExitCode = $acaChild.ExitCode; Output = $acaStdout.GetAwaiter().GetResult(); ErrorOutput = $acaStderr.GetAwaiter().GetResult() }
    } finally { $acaChild.Dispose() }
}

function Test-AcaPilotAdministrator {
    $acaIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
    return ([Security.Principal.WindowsPrincipal]$acaIdentity).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Write-AcaPilotState([string]$Path, $State) {
    # Il checkpoint sostituisce atomicamente il precedente nello stesso filesystem.
    $acaTemporary = $Path + '.' + [guid]::NewGuid().ToString('N') + '.tmp'
    try {
        [IO.File]::WriteAllText($acaTemporary, ($State | ConvertTo-Json -Depth 8), (New-Object Text.UTF8Encoding($false)))
        if ([IO.File]::Exists($Path)) { [IO.File]::Replace($acaTemporary, $Path, [System.Management.Automation.Language.NullString]::Value) }
        else { [IO.File]::Move($acaTemporary, $Path) }
    } finally {
        if ([IO.File]::Exists($acaTemporary)) { [IO.File]::Delete($acaTemporary) }
    }
}
