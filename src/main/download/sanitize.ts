// Lightweight Windows-safe folder/file name sanitization.
// yt-dlp also supports `--windows-filenames`, but we still sanitize playlist folder names ourselves.

export function sanitizeWindowsName(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return 'untitled';

  // Replace invalid chars: <>:"/\|?* plus control chars.
  const replaced = trimmed.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');

  // Windows disallows trailing dots/spaces.
  const noTrailing = replaced.replace(/[. ]+$/g, '');

  // Avoid reserved device names (CON, PRN, AUX, NUL, COM1.., LPT1..)
  const upper = noTrailing.toUpperCase();
  const reserved =
    upper === 'CON' ||
    upper === 'PRN' ||
    upper === 'AUX' ||
    upper === 'NUL' ||
    /^COM[1-9]$/.test(upper) ||
    /^LPT[1-9]$/.test(upper);
  const safe = reserved ? `${noTrailing}_` : noTrailing;

  return safe || 'untitled';
}



