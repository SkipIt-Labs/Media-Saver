## Binaries (not committed)

This folder is intentionally kept out of git for license and repository hygiene reasons.

### For local development (Windows)
Place these files here:
- `yt-dlp.exe`
- `ffmpeg.exe`
- `ffprobe.exe` (recommended)

### For releases
Packaged builds copy `resources/bin/*` into `${process.resourcesPath}/bin/*` via `electron-builder` `extraResources`.

Do not commit binaries into this repository. Instead:
- download them during your release build process, or
- attach them as part of GitHub Release artifacts, or
- bundle them into the installer at build time.


