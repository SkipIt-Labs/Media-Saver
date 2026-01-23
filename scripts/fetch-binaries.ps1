param(
  [switch]$Force,
  [string]$YtDlpUrl = $env:YTDLP_URL,
  [string]$FfmpegUrl = $env:FFMPEG_URL,
  [string]$FfprobeUrl = $env:FFPROBE_URL,
  [string]$FfmpegZipUrl = $env:FFMPEG_ZIP_URL
)

$ErrorActionPreference = "Stop"

function Write-Step($msg) {
  Write-Host "[media-saver] $msg"
}

function Download-File($url, $dest) {
  Write-Step "Downloading $url"
  Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$resourcesDir = Join-Path $repoRoot "resources"
$binDir = Join-Path $resourcesDir "bin"
New-Item -ItemType Directory -Force -Path $binDir | Out-Null

$ytDlpPath = Join-Path $binDir "yt-dlp.exe"
$ffmpegPath = Join-Path $binDir "ffmpeg.exe"
$ffprobePath = Join-Path $binDir "ffprobe.exe"

if (-not (Test-Path $ytDlpPath) -or $Force) {
  if (-not $YtDlpUrl) {
    throw "YTDLP_URL not set. Example: `$env:YTDLP_URL='https://.../yt-dlp.exe'"
  }
  Download-File $YtDlpUrl $ytDlpPath
} else {
  Write-Step "yt-dlp.exe already exists, skipping."
}

if ($FfmpegZipUrl) {
  $tmpDir = Join-Path $env:TEMP ("media-saver-ffmpeg-" + [Guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null
  try {
    $zipPath = Join-Path $tmpDir "ffmpeg.zip"
    Download-File $FfmpegZipUrl $zipPath
    Expand-Archive -Path $zipPath -DestinationPath $tmpDir -Force

    $ffmpegFound = Get-ChildItem -Path $tmpDir -Recurse -Filter "ffmpeg.exe" | Select-Object -First 1
    $ffprobeFound = Get-ChildItem -Path $tmpDir -Recurse -Filter "ffprobe.exe" | Select-Object -First 1

    if (-not $ffmpegFound) { throw "ffmpeg.exe not found inside zip." }
    Copy-Item -Force -Path $ffmpegFound.FullName -Destination $ffmpegPath

    if ($ffprobeFound) {
      Copy-Item -Force -Path $ffprobeFound.FullName -Destination $ffprobePath
    } else {
      Write-Step "ffprobe.exe not found inside zip; continuing."
    }
  } finally {
    Remove-Item -Recurse -Force $tmpDir
  }
} elseif ($FfmpegUrl) {
  if (-not (Test-Path $ffmpegPath) -or $Force) {
    Download-File $FfmpegUrl $ffmpegPath
  } else {
    Write-Step "ffmpeg.exe already exists, skipping."
  }

  if ($FfprobeUrl) {
    if (-not (Test-Path $ffprobePath) -or $Force) {
      Download-File $FfprobeUrl $ffprobePath
    } else {
      Write-Step "ffprobe.exe already exists, skipping."
    }
  }
} else {
  throw "Set FFMPEG_ZIP_URL or FFMPEG_URL (and optionally FFPROBE_URL)."
}

Write-Step "Done. Binaries are in resources/bin."
