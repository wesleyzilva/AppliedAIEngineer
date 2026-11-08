param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]] $CliArguments
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$python = Join-Path $root "portable\runtime\windows\python\python.exe"
$ollama = Join-Path $root "portable\runtime\windows\ollama\ollama.exe"
$modelRoot = Join-Path $root "portable\models\windows\ollama"
$logRoot = Join-Path $root "portable\logs"
$serverProcess = $null

if (-not (Test-Path -LiteralPath $python -PathType Leaf)) {
    throw "Python portátil não encontrado: $python"
}
if (-not (Test-Path -LiteralPath $ollama -PathType Leaf)) {
    throw "Ollama portátil não encontrado: $ollama"
}
if (-not $CliArguments -or $CliArguments.Count -eq 0) {
    throw 'Uso: .\Run-LocalAI.ps1 agent "Sua pergunta" [opções da CLI]'
}

$listener = [System.Net.Sockets.TcpClient]::new()
try {
    $listener.Connect("127.0.0.1", 11434)
    throw "A porta 11434 já está ocupada. Feche o outro servidor Ollama antes de iniciar a versão do pendrive."
}
catch [System.Net.Sockets.SocketException] {
}
finally {
    $listener.Dispose()
}

New-Item -ItemType Directory -Force -Path $modelRoot, $logRoot | Out-Null
$env:TPM_WORKSPACE = $root
$env:TPM_OLLAMA_URL = "http://127.0.0.1:11434"
$env:OLLAMA_HOST = "127.0.0.1:11434"
$env:OLLAMA_MODELS = $modelRoot
$env:PYTHONPATH = Join-Path $root "src"

try {
    $serverProcess = Start-Process `
        -FilePath $ollama `
        -ArgumentList "serve" `
        -WorkingDirectory $root `
        -PassThru `
        -RedirectStandardOutput (Join-Path $logRoot "ollama-windows.log") `
        -RedirectStandardError (Join-Path $logRoot "ollama-windows-error.log")

    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        if ($serverProcess.HasExited) {
            throw "Ollama encerrou durante a inicialização. Consulte portable\logs\ollama-windows-error.log."
        }
        try {
            $null = Invoke-RestMethod -Uri "$($env:TPM_OLLAMA_URL)/api/tags" -TimeoutSec 2
            $ready = $true
            break
        }
        catch {
            Start-Sleep -Seconds 1
        }
    }
    if (-not $ready) {
        throw "Ollama não ficou disponível. Consulte portable\logs\ollama-windows-error.log."
    }

    Push-Location $root
    try {
        $runner = "import os,runpy,sys; sys.path.insert(0, os.path.join(os.environ['TPM_WORKSPACE'], 'src')); runpy.run_module('tpm_ai.cli', run_name='__main__')"
        & $python -c $runner @CliArguments
        if ($LASTEXITCODE -ne 0) {
            throw "A CLI terminou com código $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }
}
finally {
    if ($serverProcess -and -not $serverProcess.HasExited) {
        Stop-Process -Id $serverProcess.Id
        $serverProcess.WaitForExit()
    }
}
