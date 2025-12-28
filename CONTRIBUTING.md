## Contributing

Thanks for contributing to Media Saver (SkipIt)!

### Development
Prereqs:
- Node.js (recommended: Node 20+)
- Windows 11 (primary target)

Setup:
- `npm install`
- Place binaries for local dev:
  - `resources/bin/yt-dlp.exe`
  - `resources/bin/ffmpeg.exe`
  - `resources/bin/ffprobe.exe` (recommended)
- `npm run dev`

### Project structure
- `src/main`: Electron main process (IPC + download manager)
- `src/preload`: secure IPC bridge
- `src/renderer`: React UI
- `resources/bin`: local binaries for dev (NOT committed)

### Pull request guidelines
- Keep changes focused and small.
- Do not add telemetry or any paid services.
- Do not commit binaries (yt-dlp/ffmpeg) or secrets.
- Prefer TypeScript types over `any`.
- Update docs if behavior changes.

### Release checklist (maintainers)
- Verify downloads work for MP3 and MP4, including playlist and batch TXT.
- Verify cancel works and UI remains responsive.
- Verify binaries are bundled in the installer (Windows) and are from trusted sources.
- Update THIRD-PARTY-NOTICES.md if the binary source/license changes.
- Create a GitHub Release with:
  - installer artifact(s)
  - checksums (recommended)


