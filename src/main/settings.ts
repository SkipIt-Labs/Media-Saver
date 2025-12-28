import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Settings } from '../shared/types';

const DEFAULT_SETTINGS: Settings = {
  destinationDir: '',
  format: 'mp3',
  mp3BitrateKbps: 192,
  youtubeClient: 'android',
  useCookiesFromBrowser: false,
  cookiesBrowser: 'chrome',
  userAgent: '',
  verbose: false
};

function settingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

async function readSettingsFile(): Promise<Settings | null> {
  try {
    const p = settingsPath();
    const raw = await fs.readFile(p, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return null;
  }
}

async function writeSettingsFile(settings: Settings): Promise<void> {
  const p = settingsPath();
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(settings, null, 2), 'utf-8');
}

let cached: Settings | null = null;

export async function getSettings(): Promise<Settings> {
  if (cached) return cached;
  const fromDisk = await readSettingsFile();
  cached = fromDisk ?? DEFAULT_SETTINGS;
  if (!fromDisk) await writeSettingsFile(cached);
  return cached;
}

export async function patchSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  cached = { ...current, ...patch };
  await writeSettingsFile(cached);
  return cached;
}



