$ErrorActionPreference = 'Stop'
$taskNodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($taskNodeCommand) {
    $taskNodePath = $taskNodeCommand.Source
} else {
    $taskNodePath = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
}
if (-not (Test-Path -LiteralPath $taskNodePath)) {
    throw 'Node.js não foi encontrado. Execute o portal em um computador com Node.js disponível.'
}
Set-Location -LiteralPath $PSScriptRoot
& $taskNodePath (Join-Path $PSScriptRoot 'server.js')
