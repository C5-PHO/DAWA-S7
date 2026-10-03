$ErrorActionPreference = 'Stop'
$mongoRoot = Join-Path $env:LOCALAPPDATA 'Programs\MongoDB'
$mongoExecutable = Get-ChildItem -LiteralPath $mongoRoot -Filter mongod.exe -Recurse | Select-Object -First 1 -ExpandProperty FullName
if (-not $mongoExecutable) { throw "No se encontro mongod.exe en $mongoRoot" }
if (Get-NetTCPConnection -LocalPort 27017 -State Listen -ErrorAction SilentlyContinue) {
    Write-Host 'El puerto 27017 ya esta en uso. MongoDB puede estar iniciado.'
    exit 0
}
$mongoData = Join-Path (Split-Path $PSScriptRoot -Parent) '.mongodb\data'
$mongoLog = Join-Path (Split-Path $PSScriptRoot -Parent) '.mongodb\mongod.log'
New-Item -ItemType Directory -Force -Path $mongoData | Out-Null
$mongoProcess = Start-Process -FilePath $mongoExecutable -ArgumentList @('--dbpath', ('"' + $mongoData + '"'), '--logpath', ('"' + $mongoLog + '"'), '--logappend', '--bind_ip', '127.0.0.1', '--port', '27017') -WindowStyle Hidden -PassThru
for ($attempt = 0; $attempt -lt 30; $attempt++) {
    Start-Sleep -Milliseconds 500
    $mongoProcess.Refresh()
    if ($mongoProcess.HasExited) { throw "MongoDB no pudo iniciar. Revisa $mongoLog" }
    if (Get-NetTCPConnection -LocalPort 27017 -State Listen -ErrorAction SilentlyContinue) {
        Write-Host 'MongoDB iniciado: mongodb://127.0.0.1:27017'
        exit 0
    }
}
throw "MongoDB no respondio a tiempo. Revisa $mongoLog"
