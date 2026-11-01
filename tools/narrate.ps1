$ErrorActionPreference = 'Stop'
$assemblyRoot = Split-Path -Parent $PSScriptRoot
Add-Type -AssemblyName System.Speech
$assemblyNarrator = New-Object System.Speech.Synthesis.SpeechSynthesizer
$assemblyNarrator.SelectVoice('Microsoft Hazel Desktop')
$assemblyNarrator.Rate = 0
$assemblyScenes = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'walkthrough.json') -Raw -Encoding UTF8 | ConvertFrom-Json
New-Item -ItemType Directory -Force -Path (Join-Path $assemblyRoot 'tmp\video') | Out-Null
try {
 for ($sceneIndex=0; $sceneIndex -lt $assemblyScenes.Count; $sceneIndex++) {
  $assemblyNarrator.SetOutputToWaveFile((Join-Path $assemblyRoot ('tmp\video\scene-'+$sceneIndex+'.wav')))
  $assemblyNarrator.Speak($assemblyScenes[$sceneIndex].narration)
 }
} finally { $assemblyNarrator.Dispose() }
Write-Output 'Narration generated.'
