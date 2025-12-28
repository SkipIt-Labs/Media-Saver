import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppShell,
  Stack,
  Transition
} from '@mantine/core';
import type { DownloadEvent, ProgressSnapshot, Settings } from '@shared/types';
import { TitleBar } from './components/TitleBar';
import { ActionCard, type Mode } from './components/ActionCard';
import { ProgressCard } from './components/ProgressCard';
import { LogsCard, type UiLogLine } from './components/LogsCard';
import styles from './AppShellLayout.module.css';

const defaultSettings: Settings = {
  destinationDir: '',
  format: 'mp3',
  mp3BitrateKbps: 192,
  youtubeClient: 'android',
  useCookiesFromBrowser: false,
  cookiesBrowser: 'chrome',
  userAgent: '',
  verbose: false
};

export function App() {
  const api = window.mediaSaver;
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  const [url, setUrl] = useState('');
  const [batchLabel, setBatchLabel] = useState<string | null>(null);
  const [batchFile, setBatchFile] = useState<{ filePath: string; urls: string[] } | null>(null);
  const [mode, setMode] = useState<Mode>('single');
  const [status, setStatus] = useState<'idle' | 'running' | 'cancelling' | 'finished' | 'error'>('idle');
  const [progress, setProgress] = useState<ProgressSnapshot>({});
  const [logs, setLogs] = useState<UiLogLine[]>([]);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [destError, setDestError] = useState<string | null>(null);
  const [progressPulse, setProgressPulse] = useState(false);

  const lastErrorRef = useRef<string | null>(null);
  const uid = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

  const verbose = settings.verbose;

  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => setSettings(defaultSettings));
  }, []);

  useEffect(() => {
    return api.onEvent((evt: DownloadEvent) => {
      if (evt.type === 'status') {
        setStatus(evt.status);
        if (evt.message) {
          setLogs((l) => [...l, { id: uid(), level: 'info', message: evt.message! }]);
        }
        if (evt.status === 'running') {
          setProgressPulse(true);
          setTimeout(() => setProgressPulse(false), 1000);
        }
      } else if (evt.type === 'log') {
        setLogs((l) => [...l, { id: uid(), level: evt.level, message: evt.message }]);
      } else if (evt.type === 'progress') {
        setProgress((p) => ({ ...p, ...evt.progress }));
        const { itemIndex, itemCount } = evt.progress;
        if (itemIndex && itemCount) setBatchLabel(`Item ${itemIndex}/${itemCount}`);
      } else if (evt.type === 'finished') {
        setStatus('finished');
      } else if (evt.type === 'error') {
        setStatus('error');
        lastErrorRef.current = evt.message;
        setLogs((l) => [...l, { id: uid(), level: 'error', message: evt.message }]);
      }
    });
  }, [api]);

  const filteredLogs = useMemo(() => {
    if (verbose) return logs;
    return logs.filter((l) => l.level !== 'debug');
  }, [logs, verbose]);

  const busy = status === 'running' || status === 'cancelling';

  async function updateSettings(patch: Partial<Settings>) {
    const next = await api.setSettings(patch);
    setSettings(next);
  }

  async function chooseDestination() {
    const res = await api.chooseDestinationFolder();
    if (!res.cancelled) await updateSettings({ destinationDir: res.folderPath });
    setDestError(null);
  }

  async function pasteUrl() {
    const clip = await navigator.clipboard?.readText();
    if (clip != null) setUrl(clip);
    setUrlError(null);
  }

  async function startSingle() {
    if (!settings.destinationDir) {
      setDestError('Choose a destination folder first.');
      setLogs((l) => [...l, { id: uid(), level: 'error', message: 'Please choose a destination folder first.' }]);
      return;
    }
    if (!url.trim()) {
      setUrlError('Paste a link to begin.');
      return;
    }
    setLogs([]);
    setProgress({});
    setBatchLabel(null);
    lastErrorRef.current = null;
    setMode('single');
    await api.startSingle({ url: url.trim(), options: { ...settings } });
  }

  async function chooseTxt() {
    if (!settings.destinationDir) {
      setDestError('Choose a destination folder first.');
      setLogs((l) => [...l, { id: uid(), level: 'error', message: 'Please choose a destination folder first.' }]);
      return;
    }
    const res = await api.chooseTxtFile();
    if (res.cancelled) return;
    if (res.urls.length === 0) {
      setLogs((l) => [...l, { id: uid(), level: 'error', message: 'No URLs found in TXT file.' }]);
      return;
    }
    setBatchFile({ filePath: res.filePath, urls: res.urls });
    setMode('batch');
    setLogs((l) => [...l, { id: uid(), level: 'info', message: `Loaded ${res.urls.length} URLs from ${res.filePath}` }]);
  }

  async function startBatch() {
    if (!batchFile) {
      setLogs((l) => [...l, { id: uid(), level: 'error', message: 'Choose a TXT file first.' }]);
      return;
    }
    setLogs([]);
    setProgress({});
    setBatchLabel(`Item 1/${batchFile.urls.length}`);
    lastErrorRef.current = null;
    setMode('batch');
    await api.startBatch({ urls: batchFile.urls, options: { ...settings } });
  }

  async function cancel() {
    await api.cancelCurrent();
  }

  async function copyErrorDetails() {
    const tail = filteredLogs.slice(-120).map((l) => `[${l.level.toUpperCase()}] ${l.message}`).join('\n');
    const text = `Media Saver error\nStatus: ${status}\nDestination: ${settings.destinationDir}\n\nLast error: ${lastErrorRef.current ?? 'n/a'}\n\nLogs:\n${tail}\n`;
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      // ignore
    }
  }

  async function copyAllLogs() {
    const text = filteredLogs.map((l) => `[${l.level.toUpperCase()}] ${l.message}`).join('\n');
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      // ignore
    }
  }

  function clearLogs() {
    setLogs([]);
  }

  return (
    <AppShell
      className={styles.root}
      padding={0}
      styles={{
        main: {
          height: '100vh',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0
        }
      }}
    >
      <AppShell.Main>
        <TitleBar status={status} batchLabel={batchLabel} />
        <div className={styles.content}>
          <Transition mounted transition="pop" duration={200} timingFunction="ease">
            {(tStyles) => (
              <div className={styles.page} style={tStyles}>
                <Stack gap={16}>
                  <ActionCard
                    settings={settings}
                    busy={busy}
                    url={url}
                    mode={mode}
                    batchFile={batchFile}
                    urlError={urlError}
                    destError={destError}
                    onModeChange={(m) => setMode(m)}
                    onUrlChange={(v) => {
                      setUrl(v);
                      setUrlError(null);
                    }}
                    onPatchSettings={updateSettings}
                    onChooseDestination={chooseDestination}
                    onPasteUrl={pasteUrl}
                    onStartSingle={startSingle}
                    onChooseTxt={chooseTxt}
                    onStartBatch={startBatch}
                    onCancel={cancel}
                  />

                  <div className={styles.grid2}>
                    <ProgressCard
                      status={status}
                      progress={progress}
                      pulse={progressPulse}
                      destinationDir={settings.destinationDir}
                      errorSummary={lastErrorRef.current}
                      onCopyErrorDetails={status === 'error' ? copyErrorDetails : undefined}
                    />
                    <LogsCard verbose={verbose} lines={filteredLogs} onClear={clearLogs} onCopyAll={copyAllLogs} />
                  </div>
                </Stack>
              </div>
            )}
          </Transition>
        </div>
      </AppShell.Main>
    </AppShell>
  );
}


