param([switch] $Start, [switch] $SelfTest)
$ErrorActionPreference = 'Stop'

function Test-DiagnosticToken([string] $Value) {
    return $null -ne $Value -and $Value.Length -eq 64 -and $Value -cnotmatch '[^a-f0-9]'
}

function Write-ExactDiagnosticInput($Process, [string] $Value) {
    $phaseBTransport = [Text.Encoding]::ASCII.GetBytes($Value)
    try {
        # Bypass StreamWriter encoding/preamble behavior: exactly 64 ASCII bytes.
        $Process.StandardInput.BaseStream.Write($phaseBTransport, 0, $phaseBTransport.Length)
        $Process.StandardInput.BaseStream.Flush()
    } finally {
        [Array]::Clear($phaseBTransport, 0, $phaseBTransport.Length)
        $Process.StandardInput.BaseStream.Close()
    }
}

# Self-test uses a public fixture, never generates or configures a credential.
if ($SelfTest) {
    if (-not (Test-DiagnosticToken ('ab' * 32))) { throw 'fixture_valid_failed' }
    foreach ($invalid in @(('ab' * 31), ('ab' * 33), ('AB' * 32), (('ab' * 32) + "`n"), (' ' + ('ab' * 32)), ('z' * 64))) {
        if (Test-DiagnosticToken $invalid) { throw 'fixture_invalid_accepted' }
    }
    $phaseBFixtureNode = Join-Path $PSScriptRoot '../../.vercel/local-node22-validation-20261021/node-v22.23.4-win-x64/node.exe'
    $phaseBFixtureInfo = New-Object Diagnostics.ProcessStartInfo
    $phaseBFixtureInfo.FileName = $phaseBFixtureNode
    $phaseBFixtureInfo.Arguments = '--input-type=module -e "let v='''' ;for await(const c of process.stdin)v+=c;process.exit(v===(''ab''.repeat(32))?0:1)"'
    $phaseBFixtureInfo.UseShellExecute = $false
    $phaseBFixtureInfo.CreateNoWindow = $true
    $phaseBFixtureInfo.RedirectStandardInput = $true
    $phaseBFixtureProcess = New-Object Diagnostics.Process
    $phaseBFixtureProcess.StartInfo = $phaseBFixtureInfo
    [void] $phaseBFixtureProcess.Start()
    Write-ExactDiagnosticInput $phaseBFixtureProcess ('ab' * 32)
    if (-not $phaseBFixtureProcess.WaitForExit(5000)) { $phaseBFixtureProcess.Kill(); throw 'fixture_pipe_timeout' }
    if ($phaseBFixtureProcess.ExitCode -ne 0) { throw 'fixture_pipe_altered' }
    $phaseBFixtureProcess.Dispose()
    Write-Host 'PASS: formato exacto; fixtures invalidas rechazadas; no se genero secreto.'
    exit 0
}
if (-not $Start) { throw 'Solo ejecutar con -Start despues de autorizar ETAPA 2.' }
if ([Threading.Thread]::CurrentThread.ApartmentState -ne 'STA') { throw 'Ejecuta powershell.exe -STA.' }
$phaseBRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$phaseBState = Join-Path $phaseBRoot '.vercel/phase-b-2'
$phaseBControl = Join-Path $phaseBState 'control.json'
$phaseBInitial = Get-Content -LiteralPath $phaseBControl -Raw | ConvertFrom-Json
if ($phaseBInitial.phase -ne 'B2' -or $phaseBInitial.state -ne 'authorized' -or $phaseBInitial.closed -or $phaseBInitial.ready) {
    throw 'ETAPA 2 no autorizada en el control local. No se genera secreto.'
}
$phaseBNodeRoot = Join-Path $phaseBRoot '.vercel/local-node22-validation-20261021/node-v22.23.4-win-x64'
$phaseBNode = Join-Path $phaseBNodeRoot 'node.exe'
$phaseBNpm = Join-Path $phaseBNodeRoot 'node_modules/npm/bin/npm-cli.js'
if (-not (Test-Path -LiteralPath $phaseBNode) -or -not (Test-Path -LiteralPath $phaseBNpm)) { throw 'Runtime Node 22 no disponible.' }
if ($env:NODE_OPTIONS) { throw 'Abre una terminal sin NODE_OPTIONS para no cargar interceptores de entrada.' }
Add-Type -AssemblyName System.Windows.Forms
$phaseBBytes = New-Object byte[] 32
$phaseBRng = [Security.Cryptography.RandomNumberGenerator]::Create()
$phaseBSecret = $null
$phaseBProcess = $null

function Use-SessionText([scriptblock] $Action) {
    $phaseBPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($phaseBSecret)
    try {
        $phaseBPlain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($phaseBPointer)
        & $Action $phaseBPlain
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($phaseBPointer)
        Remove-Variable phaseBPlain -ErrorAction SilentlyContinue
    }
}
function Copy-SessionToken {
    Use-SessionText { param($Value)
        [Windows.Forms.Clipboard]::SetText($Value)
        if ([Windows.Forms.Clipboard]::GetText() -cne $Value) { throw 'clipboard_mismatch' }
    }
}
function Clear-SessionClipboard {
    Use-SessionText { param($Value)
        if ([Windows.Forms.Clipboard]::ContainsText() -and [Windows.Forms.Clipboard]::GetText() -ceq $Value) {
            [Windows.Forms.Clipboard]::Clear()
        }
    }
}

try {
    $phaseBRng.GetBytes($phaseBBytes)
    $phaseBText = -join ($phaseBBytes | ForEach-Object { $_.ToString('x2') })
    if (-not (Test-DiagnosticToken $phaseBText)) { throw 'generated_format_invalid' }
    $phaseBSecret = ConvertTo-SecureString $phaseBText -AsPlainText -Force
    Remove-Variable phaseBText
    Copy-SessionToken
    Write-Host 'Formato valido: SI. Longitud correcta: SI. Espacios adicionales: NO.'
    Write-Host 'Pega en Vercel: PROYECTOS_GOOGLE_DIAGNOSTICS_TOKEN, tipo Secret, solo Production.'
    Write-Host 'No copies otros comandos. Si se altera el portapapeles, R recupera el MISMO valor.'
    do {
        $phaseBChoice = Read-Host 'R = volver a copiar; G = ya guardado en Vercel; X = cancelar'
        if ($phaseBChoice -eq 'X') { throw 'operator_cancelled' }
        if ($phaseBChoice -eq 'R') { Copy-SessionToken }
    } until ($phaseBChoice -eq 'G')
    Clear-SessionClipboard
    @{ phase = 'B2'; stored = $true; formatValid = $true; correctLength = $true; extraWhitespace = $false; at = [DateTime]::UtcNow.ToString('o') } |
        ConvertTo-Json | Set-Content -LiteralPath (Join-Path $phaseBState 'session-ready.json') -Encoding UTF8
    Write-Host 'Sesion en memoria. Esperando despliegue READY; no vuelvas a generar ni pegar el secreto.'
    $phaseBWaitLimit = [DateTime]::UtcNow.AddMinutes(30)
    while ($true) {
        $phaseBWindow = Get-Content -LiteralPath $phaseBControl -Raw | ConvertFrom-Json
        if ($phaseBWindow.closed -or [DateTime]::UtcNow -ge $phaseBWaitLimit) { throw 'session_closed' }
        if ($phaseBWindow.expiresAt -and [DateTimeOffset]::Parse($phaseBWindow.expiresAt).UtcDateTime -le [DateTime]::UtcNow) { throw 'window_expired' }
        if ($phaseBWindow.ready) { break }
        Start-Sleep -Milliseconds 500
    }
    if ($phaseBWindow.canonical -ne 'https://website-2027-seven.vercel.app' -or $phaseBWindow.phase -ne 'B2') { throw 'wrong_target' }
    if ($phaseBWindow.expiresAt -cnotmatch '\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\z') { throw 'expiry_format' }
    $phaseBDeadline = [DateTimeOffset]::Parse($phaseBWindow.expiresAt).UtcDateTime
    $phaseBRemaining = ($phaseBDeadline - [DateTime]::UtcNow).TotalSeconds
    if ($phaseBRemaining -lt 180 -or $phaseBRemaining -gt 1200) { throw 'insufficient_window' }
    $phaseBCurrentCommit = (& git -C $phaseBRoot rev-parse HEAD).Trim()
    if ($phaseBCurrentCommit -ne $phaseBWindow.commit -or -not $phaseBWindow.deploymentId) { throw 'deployment_unconfirmed' }
    $phaseBInfo = New-Object Diagnostics.ProcessStartInfo
    $phaseBInfo.FileName = $phaseBNode
    $phaseBInfo.Arguments = '"' + $phaseBNpm + '" run proyectos:google:probe -- --all --stdin-secret'
    $phaseBInfo.WorkingDirectory = $phaseBRoot
    $phaseBInfo.UseShellExecute = $false
    $phaseBInfo.CreateNoWindow = $true
    $phaseBInfo.RedirectStandardInput = $true
    $phaseBInfo.RedirectStandardOutput = $true
    $phaseBInfo.RedirectStandardError = $true
    $phaseBInfo.EnvironmentVariables['Path'] = $phaseBNodeRoot + ';' + $env:Path
    $phaseBProcess = New-Object Diagnostics.Process
    $phaseBProcess.StartInfo = $phaseBInfo
    [void] $phaseBProcess.Start()
    $phaseBStdout = $phaseBProcess.StandardOutput.ReadToEndAsync()
    $phaseBStderr = $phaseBProcess.StandardError.ReadToEndAsync()
    # EXACT same resident value used for the one manual Vercel paste. No newline.
    Use-SessionText { param($Value) Write-ExactDiagnosticInput $phaseBProcess $Value }
    $phaseBStop = [DateTime]::UtcNow.AddSeconds([Math]::Min(120, $phaseBRemaining - 120))
    while (-not $phaseBProcess.WaitForExit(500)) {
        $phaseBWindow = Get-Content -LiteralPath $phaseBControl -Raw | ConvertFrom-Json
        if ($phaseBWindow.closed -or [DateTime]::UtcNow -ge $phaseBStop) { throw 'probe_timeout_close_required' }
    }
    $phaseBRows = @()
    foreach ($phaseBLine in ($phaseBStdout.Result -split '\r?\n')) {
        if (-not $phaseBLine.StartsWith('{')) { continue }
        $phaseBRow = $phaseBLine | ConvertFrom-Json
        # The reviewed CLI already emits only sanitized fields. Still allowlist
        # every field before printing or persisting its output.
        $phaseBSafe = [ordered]@{ ok = $phaseBRow.ok -eq $true; status = [int]$phaseBRow.status; noStore = $phaseBRow.noStore -eq $true }
        if ($phaseBRow.check -cmatch '\A[a-z_]{1,64}\z') { $phaseBSafe.check = $phaseBRow.check; $phaseBSafe.expected = [int]$phaseBRow.expected }
        if ($phaseBRow.code -cmatch '\A[a-z_]{1,64}\z') { $phaseBSafe.code = $phaseBRow.code }
        if ($phaseBRow.checks) {
            $phaseBSafe.checks = [ordered]@{}
            foreach ($phaseBKey in @('configuration','federation','serviceAccount','drive','structure','catalog','users','audit')) {
                if ($null -eq $phaseBRow.checks.$phaseBKey) { continue }
                $phaseBCheck = [ordered]@{ ok = $phaseBRow.checks.$phaseBKey.ok -eq $true }
                if ($phaseBRow.checks.$phaseBKey.code -cmatch '\A[a-z_]{1,64}\z') { $phaseBCheck.code = $phaseBRow.checks.$phaseBKey.code }
                $phaseBSafe.checks[$phaseBKey] = $phaseBCheck
            }
        }
        $phaseBRows += [pscustomobject]$phaseBSafe
        Write-Host ($phaseBSafe | ConvertTo-Json -Compress -Depth 5)
    }
    @{ at = [DateTime]::UtcNow.ToString('o'); exitCode = $phaseBProcess.ExitCode; rows = $phaseBRows } |
        ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $phaseBState 'probe-results.json') -Encoding UTF8
    Write-Host 'Prueba terminada. Proceder al cierre; no repetir automaticamente.'
} catch {
    # Never print an exception object: process errors can include invocation data.
    @{ at = [DateTime]::UtcNow.ToString('o'); exitCode = 1; code = 'session_stopped_close_required' } |
        ConvertTo-Json | Set-Content -LiteralPath (Join-Path $phaseBState 'session-stopped.json') -Encoding UTF8
    Write-Host 'Sesion detenida. Revisar indicadores sanitizados y proceder al cierre.'
} finally {
    try { if ($phaseBProcess -and -not $phaseBProcess.HasExited) { $phaseBProcess.Kill() } } catch {}
    if ($phaseBSecret) { try { Clear-SessionClipboard } catch {} finally { $phaseBSecret.Dispose() } }
    [Array]::Clear($phaseBBytes, 0, $phaseBBytes.Length)
    $phaseBRng.Dispose()
    Remove-Variable phaseBText -ErrorAction SilentlyContinue
}
