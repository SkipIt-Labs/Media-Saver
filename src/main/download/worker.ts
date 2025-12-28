import { parentPort, workerData } from 'node:worker_threads';
import path from 'node:path';
import fs from 'node:fs/promises';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import type { DownloadEvent, DownloadOptions } from '../../shared/types';
import { findBinaries } from './binaries';
import { sanitizeWindowsName } from './sanitize';
import { parseProgressLine } from './progressParse';

type WorkerData = { appPath: string; resourcesPath: string };
const ctx = workerData as WorkerData;

type Command =
  | { type: 'startSingle'; url: string; options: DownloadOptions }
  | { type: 'startBatch'; urls: string[]; options: DownloadOptions }
  | { type: 'cancel' };

function emit(evt: DownloadEvent) {
  parentPort?.postMessage(evt);
}

let cancelRequested = false;
let currentChild: ChildProcessWithoutNullStreams | null = null;

async function killProcessTree(pid: number): Promise<void> {
  if (process.platform === 'win32') {
    await new Promise<void>((resolve) => {
      const killer = spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true });
      killer.on('exit', () => resolve());
      killer.on('error', () => resolve());
    });
    return;
  }
  try {
    process.kill(pid, 'SIGTERM');
  } catch {}
}

function classify(line: string, isStderr: boolean): 'debug' | 'info' | 'warn' | 'error' {
  const l = line.toLowerCase();
  if (l.includes('error:')) return 'error';
  if (l.includes('warning:')) return 'warn';
  if (isStderr) return 'debug';
  return 'debug';
}

function buildCommonArgs(options: DownloadOptions, ffmpegPath: string): string[] {
  const args: string[] = [];
  args.push('--no-color', '--progress', '--newline', '--windows-filenames');
  args.push('--ffmpeg-location', path.dirname(ffmpegPath));
  args.push('--extractor-args', `youtube:player_client=${options.youtubeClient}`);

  if (options.useCookiesFromBrowser) {
    if (!options.cookiesBrowser) throw new Error('Cookies browser not set.');
    args.push('--cookies-from-browser', options.cookiesBrowser);
  }
  if (options.userAgent?.trim()) {
    args.push('--user-agent', options.userAgent.trim());
  }
  if (options.verbose) {
    args.push('--verbose');
  } else {
    args.push('--no-warnings');
  }

  // Helpful title prints for the UI.
  args.push('--print', 'before_dl:[title] %(title)s');

  return args;
}

function buildArgsForUrl(options: DownloadOptions, ffmpegPath: string, isPlaylist: boolean, outputDir: string): string[] {
  const args = buildCommonArgs(options, ffmpegPath);

  // Output template (folder already decided, includes playlist folder if needed)
  args.push('-o', path.join(outputDir, '%(title)s.%(ext)s'));

  if (!isPlaylist) args.push('--no-playlist');

  if (options.format === 'mp3') {
    const br = options.mp3BitrateKbps ?? 192;
    args.push(
      '--extract-audio',
      '--audio-format',
      'mp3',
      '--audio-quality',
      `${br}K`,
      '--embed-thumbnail',
      '--add-metadata'
    );
  } else {
    args.push(
      '-f',
      'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/bestvideo[height<=1080]+bestaudio/best',
      '--merge-output-format',
      'mp4',
      '--embed-thumbnail',
      '--add-metadata'
    );
  }

  return args;
}

async function probeJson(ytDlpPath: string, options: DownloadOptions, ffmpegPath: string, url: string): Promise<any> {
  const args = [
    ...buildCommonArgs(options, ffmpegPath),
    '--dump-single-json',
    '--flat-playlist',
    '--skip-download',
    url
  ];

  const { stdout } = await runCapture(ytDlpPath, args);
  return JSON.parse(stdout);
}

async function runCapture(exe: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return await new Promise((resolve, reject) => {
    const child = spawn(exe, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString('utf-8')));
    child.stderr.on('data', (d) => (stderr += d.toString('utf-8')));
    child.on('error', (err) => reject(err));
    child.on('exit', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr || `Command failed with code ${code}`));
    });
  });
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

async function downloadOne(
  ytDlpPath: string,
  ffmpegPath: string,
  url: string,
  options: DownloadOptions,
  outerItemIndex?: number,
  outerItemCount?: number
) {
  if (!/^https?:\/\//i.test(url)) throw new Error(`Invalid URL: ${url}`);

  // Detect playlist and decide output dir.
  let isPlaylist = false;
  let outputDir = options.destinationDir;

  try {
    const j = await probeJson(ytDlpPath, options, ffmpegPath, url);
    if (j && (j._type === 'playlist' || Array.isArray(j.entries))) {
      isPlaylist = true;
      const title: string = (j.title || j.playlist_title || 'playlist') as string;
      outputDir = path.join(options.destinationDir, sanitizeWindowsName(title));
      await ensureDir(outputDir);
      emit({ type: 'log', level: 'info', message: `Playlist detected: "${title}"` });
    }
  } catch (e) {
    // If probing fails, continue as a single URL; the actual download will surface errors.
    emit({ type: 'log', level: 'debug', message: `Probe failed, continuing without playlist detection.` });
  }

  if (!isPlaylist) await ensureDir(outputDir);

  const args = [...buildArgsForUrl(options, ffmpegPath, isPlaylist, outputDir), url];

  emit({ type: 'log', level: 'info', message: `yt-dlp start: ${url}` });
  if (options.verbose) emit({ type: 'log', level: 'debug', message: `Args: ${args.join(' ')}` });

  await new Promise<void>((resolve, reject) => {
    const child = spawn(ytDlpPath, args, { windowsHide: true });
    currentChild = child;
    const tail: string[] = [];

    const handleLine = (line: string, isStderr: boolean) => {
      const p = parseProgressLine(line);
      if (p) {
        const merged = {
          ...(outerItemIndex && outerItemCount ? { itemIndex: outerItemIndex, itemCount: outerItemCount } : {}),
          ...p
        };
        emit({ type: 'progress', progress: merged });
      }

      const level = classify(line, isStderr);
      emit({ type: 'log', level, message: line });

      tail.push(line);
      if (tail.length > 40) tail.shift();
    };

    child.stdout.setEncoding('utf-8');
    child.stderr.setEncoding('utf-8');

    let stdoutBuf = '';
    let stderrBuf = '';
    child.stdout.on('data', (chunk: string) => {
      stdoutBuf += chunk;
      const lines = stdoutBuf.split(/\r?\n/);
      stdoutBuf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        handleLine(line, false);
      }
    });
    child.stderr.on('data', (chunk: string) => {
      stderrBuf += chunk;
      const lines = stderrBuf.split(/\r?\n/);
      stderrBuf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        handleLine(line, true);
      }
    });

    child.on('error', (err) => {
      currentChild = null;
      reject(err);
    });
    child.on('exit', async (code) => {
      currentChild = null;
      if (cancelRequested) {
        resolve();
        return;
      }
      if (code === 0) resolve();
      else {
        const hint = tail.findLast((l) => /error:|warning:/i.test(l)) ?? tail.at(-1);
        reject(new Error(`Download failed (yt-dlp exit code ${code}). ${hint ? `Last output: ${hint}` : ''}`.trim()));
      }
    });
  });
}

parentPort?.on('message', async (cmd: Command) => {
  if (cmd.type === 'cancel') {
    cancelRequested = true;
    emit({ type: 'log', level: 'warn', message: 'Cancel requested…' });
    if (currentChild?.pid) await killProcessTree(currentChild.pid);
    return;
  }

  cancelRequested = false;
  try {
    const { ytDlpPath, ffmpegPath } = await findBinaries(ctx.resourcesPath, ctx.appPath);
    emit({ type: 'log', level: 'debug', message: `yt-dlp: ${ytDlpPath}` });
    emit({ type: 'log', level: 'debug', message: `ffmpeg: ${ffmpegPath}` });

    if (cmd.type === 'startSingle') {
      await downloadOne(ytDlpPath, ffmpegPath, cmd.url, cmd.options);
    } else if (cmd.type === 'startBatch') {
      const urls = cmd.urls.filter((u) => u.trim().length > 0);
      for (let i = 0; i < urls.length; i++) {
        if (cancelRequested) break;
        const idx = i + 1;
        emit({ type: 'progress', progress: { itemIndex: idx, itemCount: urls.length } });
        await downloadOne(ytDlpPath, ffmpegPath, urls[i]!, cmd.options, idx, urls.length);
      }
    }

    if (cancelRequested) {
      emit({ type: 'status', status: 'finished', message: 'Cancelled.' });
    } else {
      emit({ type: 'status', status: 'finished', message: 'Done.' });
    }
    emit({ type: 'finished' });
  } catch (e) {
    emit({ type: 'error', message: e instanceof Error ? e.message : 'Unknown worker error' });
  }
});


