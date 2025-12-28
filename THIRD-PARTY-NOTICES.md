## Third-Party Notices

This project depends on third-party open-source software. This file is a summary to help you comply with upstream license obligations when distributing builds.

### yt-dlp
- Project: yt-dlp
- License: The Unlicense (see upstream for exact text)
- Upstream: `https://github.com/yt-dlp/yt-dlp`
- License file: `https://github.com/yt-dlp/yt-dlp/blob/master/LICENSE`

### FFmpeg
- Project: FFmpeg
- License: LGPL/GPL depending on how FFmpeg is built and which codecs/features are enabled.
- Upstream: `https://ffmpeg.org/`
- License info: `https://ffmpeg.org/legal.html`

#### Important note about FFmpeg licensing
FFmpeg can be distributed under **LGPL** if you use an LGPL-compatible build configuration. If you distribute an FFmpeg build that is **GPL-enabled**, your overall distribution obligations can change and may require GPL compliance.

**Policy for this repository**
- Source repo: We **do not** commit FFmpeg/yt-dlp binaries into git.
- Releases (recommended): If you publish click-and-go Windows releases, bundle binaries using an **LGPL-compatible FFmpeg build** and include/keep the upstream license notices with your release artifacts.

### Bundled binaries policy
This app is designed to use binaries placed at:
- Dev: `resources/bin/yt-dlp.exe`, `resources/bin/ffmpeg.exe`, `resources/bin/ffprobe.exe`
- Packaged: `${process.resourcesPath}/bin/*` (via `electron-builder` `extraResources`)

If you distribute prebuilt releases that include these binaries, you are responsible for ensuring:
- You obtained binaries from trusted sources.
- You comply with upstream licenses.
- You provide corresponding notices (and source offer where required by the license).


