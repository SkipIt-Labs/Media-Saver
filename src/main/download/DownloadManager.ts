import path from 'node:path';
import { Worker } from 'node:worker_threads';
import type { DownloadEvent, DownloadOptions } from '../../shared/types';

type Ctx = {
  appPath: string;
  resourcesPath: string;
  onEvent: (evt: DownloadEvent) => void;
};

type WorkerCommand =
  | { type: 'startSingle'; url: string; options: DownloadOptions }
  | { type: 'startBatch'; urls: string[]; options: DownloadOptions }
  | { type: 'cancel' };

export class DownloadManager {
  private readonly ctx: Ctx;
  private worker: Worker | null = null;
  private running = false;

  constructor(ctx: Ctx) {
    this.ctx = ctx;
  }

  async startSingle(url: string, options: DownloadOptions) {
    if (this.running) throw new Error('A job is already running.');
    await this.ensureWorker();
    this.running = true;
    this.ctx.onEvent({ type: 'status', status: 'running', message: 'Starting download…' });
    this.worker!.postMessage({ type: 'startSingle', url, options } satisfies WorkerCommand);
  }

  async startBatch(urls: string[], options: DownloadOptions) {
    if (this.running) throw new Error('A job is already running.');
    await this.ensureWorker();
    this.running = true;
    this.ctx.onEvent({ type: 'status', status: 'running', message: `Starting batch (${urls.length} items)…` });
    this.worker!.postMessage({ type: 'startBatch', urls, options } satisfies WorkerCommand);
  }

  async cancelCurrent() {
    if (!this.worker || !this.running) return;
    this.ctx.onEvent({ type: 'status', status: 'cancelling', message: 'Cancelling…' });
    this.worker.postMessage({ type: 'cancel' } satisfies WorkerCommand);
  }

  private async ensureWorker() {
    if (this.worker) return;
    const workerPath = this.ctx.appPath.endsWith('.asar')
      ? path.join(this.ctx.resourcesPath, 'app.asar.unpacked', 'dist-electron', 'main', 'download', 'worker.cjs')
      : path.join(this.ctx.appPath, 'dist-electron', 'main', 'download', 'worker.cjs');
    this.worker = new Worker(workerPath, {
      workerData: {
        appPath: this.ctx.appPath,
        resourcesPath: this.ctx.resourcesPath
      }
    });
    this.worker.on('message', (evt: DownloadEvent) => {
      if (evt.type === 'finished') this.running = false;
      if (evt.type === 'error') this.running = false;
      this.ctx.onEvent(evt);
    });
    this.worker.on('error', (err) => {
      this.running = false;
      this.ctx.onEvent({ type: 'error', message: err.message });
    });
    this.worker.on('exit', (code) => {
      this.worker = null;
      this.running = false;
      if (code !== 0) {
        this.ctx.onEvent({ type: 'error', message: `Worker exited unexpectedly (code ${code}).` });
      }
    });
  }
}


