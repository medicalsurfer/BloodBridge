# Starts the free local AI model used by the BloodBridge assistant.
# llama.cpp serves an OpenAI-compatible API at http://127.0.0.1:8080/v1,
# which src/lib/ai-client.ts calls. Leave this window open while using the app.
#
# Override the install folder with the BLOODBRIDGE_AI_DIR environment variable.

$ErrorActionPreference = "Stop"

$aiDir = if ($env:BLOODBRIDGE_AI_DIR) { $env:BLOODBRIDGE_AI_DIR } else { Join-Path $HOME "bloodbridge-ai" }
$server = Get-ChildItem -Path $aiDir -Filter "llama-server.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
$model = Get-ChildItem -Path $aiDir -Filter "*.gguf" -ErrorAction SilentlyContinue | Select-Object -First 1

if (-not $server) { throw "llama-server.exe not found under $aiDir. Unzip the llama.cpp Windows build there." }
if (-not $model) { throw "No .gguf model file found in $aiDir." }

Write-Host "Starting $($model.Name) on http://127.0.0.1:8080 ..."

# -c: context window in tokens; -t: CPU threads (Ryzen 5 5500U has 6 cores).
& $server.FullName -m $model.FullName --host 127.0.0.1 --port 8080 -c 8192 -t 6 --alias bloodbridge-assistant
