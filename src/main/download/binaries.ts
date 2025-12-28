import path from 'node:path';
import fs from 'node:fs/promises';

export type BinaryLocations = {
  ytDlpPath: string;
  ffmpegPath: string;
  ffprobePath?: string;
};

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function candidatePaths(resourcesPath: string, appPath: string, exeName: string): string[] {
  const rel = path.join('resources', 'bin', exeName);
  return [
    path.join(resourcesPath, 'bin', exeName),
    path.join(resourcesPath, exeName),
    path.join(appPath, 'resources', 'bin', exeName),
    path.join(appPath, rel),
    path.join(process.cwd(), 'resources', 'bin', exeName)
  ];
}

export async function findBinaries(resourcesPath: string, appPath: string): Promise<BinaryLocations> {
  const ytDlpExe = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  const ffmpegExe = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  const ffprobeExe = process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';

  const ytCandidates = candidatePaths(resourcesPath, appPath, ytDlpExe);
  const ffCandidates = candidatePaths(resourcesPath, appPath, ffmpegExe);
  const fpCandidates = candidatePaths(resourcesPath, appPath, ffprobeExe);

  const ytDlpPath = (await firstExisting(ytCandidates)) ?? '';
  const ffmpegPath = (await firstExisting(ffCandidates)) ?? '';
  const ffprobePath = (await firstExisting(fpCandidates)) ?? undefined;

  if (!ytDlpPath) {
    throw new Error(
      `yt-dlp not found. Place it at resources/bin/${ytDlpExe} (dev) or bundle via extraResources to ${'${process.resourcesPath}'}/bin/${ytDlpExe}.`
    );
  }
  if (!ffmpegPath) {
    throw new Error(
      `ffmpeg not found. Place it at resources/bin/${ffmpegExe} (dev) or bundle via extraResources to ${'${process.resourcesPath}'}/bin/${ffmpegExe}.`
    );
  }

  return { ytDlpPath, ffmpegPath, ffprobePath };
}

async function firstExisting(paths: string[]): Promise<string | null> {
  for (const p of paths) {
    if (await exists(p)) return p;
  }
  return null;
}



