import type { ProgressSnapshot } from '../../shared/types';

export function parseEtaToSeconds(eta: string): number | undefined {
  const parts = eta.split(':').map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n))) return undefined;
  if (parts.length === 2) return parts[0]! * 60 + parts[1]!;
  if (parts.length === 3) return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
  return undefined;
}

export function parseProgressLine(line: string): Partial<ProgressSnapshot> | null {
  const l = line.trim();
  if (!l) return null;

  // Custom title print emitted by our args.
  if (l.startsWith('[title] ')) {
    const title = l.slice('[title] '.length).trim();
    return title ? { title } : null;
  }

  // Playlist item indicator.
  const itemMatch = l.match(/Downloading item\s+(\d+)\s+of\s+(\d+)/i);
  if (itemMatch) {
    const itemIndex = Number(itemMatch[1]);
    const itemCount = Number(itemMatch[2]);
    if (Number.isFinite(itemIndex) && Number.isFinite(itemCount)) return { itemIndex, itemCount };
  }

  // Typical download progress:
  // [download]  12.3% of 10.00MiB at 1.23MiB/s ETA 00:32
  if (!l.startsWith('[download]')) return null;

  const percentMatch = l.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
  const percent = percentMatch ? Number(percentMatch[1]) : undefined;

  let speed: string | undefined;
  const speedMatch = l.match(/\bat\s+([^\s]+)\s+ETA/i);
  if (speedMatch) speed = speedMatch[1];

  let eta: string | undefined;
  const etaMatch = l.match(/\bETA\s+([0-9:]+)/i);
  if (etaMatch) eta = etaMatch[1];

  if (percent == null && !speed && !eta) return null;

  return {
    percent: percent != null && Number.isFinite(percent) ? percent : undefined,
    speed,
    eta,
    etaSeconds: eta ? parseEtaToSeconds(eta) : undefined
  };
}



