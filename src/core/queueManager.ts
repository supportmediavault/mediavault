export type FileStatus = 'idle' | 'converting' | 'completed' | 'error' | 'cancelled' | 'paused';

export interface QueueItem {
  id: string;
  file: File;
  customName: string;
  progress: number;
  status: FileStatus;
  downloadUrl?: string;
  errorMessage?: string;
  lastTime?: number;
  existingChunks?: Blob[];
  abortController?: AbortController;
}

export type QueueListener = (items: QueueItem[], isGlobalPaused: boolean) => void;

export class ConversionQueueManager {
  private items: QueueItem[] = [];
  private listeners: QueueListener[] = [];
  private concurrencyLimit: number = 100;
  private isRunning: boolean = false;
  private activeWorkers: number = 0;
  private globalPaused: boolean = false;
  
  private convertVideoFn?: any;
  private convertAudioFn?: any;
  private convertImageFn?: any;

  constructor(concurrency: number = 100) {
    this.concurrencyLimit = concurrency;
  }

  public setConverters(videoFn: any, audioFn: any, imageFn: any) {
    this.convertVideoFn = videoFn;
    this.convertAudioFn = audioFn;
    this.convertImageFn = imageFn;
  }

  public subscribe(listener: QueueListener) {
    this.listeners.push(listener);
    listener(this.items, this.globalPaused);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l([...this.items], this.globalPaused));
  }

  private revokeItemUrl(item?: QueueItem) {
    if (item && item.downloadUrl) {
      URL.revokeObjectURL(item.downloadUrl);
    }
  }

  public addFiles(files: File[]) {
    const newItems: QueueItem[] = files.map(f => {
      const lastDot = f.name.lastIndexOf('.');
      const nameOnly = lastDot !== -1 ? f.name.substring(0, lastDot) : f.name;
      return {
        id: Math.random().toString(36).substring(2, 9),
        file: f,
        customName: nameOnly,
        progress: 0,
        status: 'idle',
        lastTime: 0,
        existingChunks: []
      };
    });

    this.items = [...this.items, ...newItems];
    this.notify();
  }

  public updateFileName(id: string, newName: string) {
    this.items = this.items.map(item => item.id === id ? { ...item, customName: newName } : item);
    this.notify();
  }

  public removeFile(id: string) {
    const item = this.items.find(i => i.id === id);
    if (item?.abortController) {
      item.abortController.abort();
    }
    this.revokeItemUrl(item);
    this.items = this.items.filter(i => i.id !== id);
    if (item) {
      this.items.push({ ...item, status: 'cancelled', downloadUrl: undefined, abortController: undefined });
    }
    this.notify();
  }

  public pauseFile(id: string) {
    this.items = this.items.map(item => {
      if (item.id === id && item.status === 'converting') {
        if (item.abortController) item.abortController.abort();
        return { ...item, status: 'paused', abortController: undefined };
      }
      return item;
    });
    this.notify();
  }

  public async startSingleFile(id: string, tabType: string = 'image', targetFormat: string = 'webp', options: any = {}) {
    this.globalPaused = false;
    const target = this.items.find(i => i.id === id);
    if (!target || (target.status !== 'idle' && target.status !== 'paused')) return;

    const controller = new AbortController();
    this.items = this.items.map(i => i.id === id ? { ...i, status: 'converting', abortController: controller } : i);
    this.notify();
    this.activeWorkers++;

    try {
      let resultBlob: Blob;
      if (controller.signal.aborted) throw { message: 'Paused' };

      if (tabType === 'image' && this.convertImageFn) {
        resultBlob = await this.convertImageFn(target.file, targetFormat, options.quality || 0.85);
      } else if (tabType === 'audio' && this.convertAudioFn) {
        resultBlob = await this.convertAudioFn(target.file, targetFormat, (p: number) => {
          if (controller.signal.aborted) return;
          this.updateProgress(target.id, p);
        }, controller.signal);
      } else if (tabType === 'video' && this.convertVideoFn) {
        const res = await this.convertVideoFn(
          target.file, targetFormat, options,
          (p: number) => {
            if (controller.signal.aborted) return;
            this.updateProgress(target.id, p);
          },
          controller.signal, target.lastTime || 0, target.existingChunks || []
        );
        resultBlob = res.blob;
      } else {
        throw new Error('Converter not found');
      }

      if (controller.signal.aborted) throw { message: 'Paused' };

      this.revokeItemUrl(target);
      const downloadUrl = URL.createObjectURL(resultBlob);
      this.items = this.items.map(i => i.id === target.id ? {
        ...i, status: 'completed', progress: 100, downloadUrl, abortController: undefined
      } : i);
      this.notify();

    } catch (err: any) {
      if (err.message === 'Paused' || controller.signal.aborted) {
        this.items = this.items.map(i => i.id === target.id ? {
          ...i,
          status: 'paused',
          lastTime: err.lastTime !== undefined ? err.lastTime : i.lastTime,
          existingChunks: err.currentBlob ? [err.currentBlob] : i.existingChunks,
          abortController: undefined
        } : i);
        this.notify();
      } else {
        this.items = this.items.map(i => i.id === target.id ? {
          ...i, status: 'error', errorMessage: err.message || 'Failed', abortController: undefined
        } : i);
        this.notify();
      }
    } finally {
      this.activeWorkers = Math.max(0, this.activeWorkers - 1);
    }
  }

  public resumeFile(id: string, tabType: string = 'image', targetFormat: string = 'webp', options: any = {}) {
    this.startSingleFile(id, tabType, targetFormat, options);
  }

  public pauseAll() {
    this.globalPaused = true;
    this.items = this.items.map(item => {
      if (item.status === 'converting') {
        if (item.abortController) item.abortController.abort();
        return { ...item, status: 'paused', abortController: undefined };
      }
      return item;
    });
    this.isRunning = false;
    this.notify();
  }

  public resumeAll(tabType: string = 'image', targetFormat: string = 'webp', options: any = {}) {
    this.globalPaused = false;
    this.items = this.items.map(item => {
      if (item.status === 'paused') {
        return { ...item, status: 'idle' };
      }
      return item;
    });
    this.notify();
    this.start(tabType, targetFormat, options);
  }

  public clear() {
    this.items.forEach(i => {
      if (i.abortController) i.abortController.abort();
      this.revokeItemUrl(i);
    });
    this.items = [];
    this.isRunning = false;
    this.globalPaused = false;
    this.notify();
  }

  public async start(tabType: string = 'image', targetFormat: string = 'webp', options: any = {}) {
    if (this.globalPaused) return;
    if (this.isRunning && this.activeWorkers >= this.concurrencyLimit) return;
    this.isRunning = true;

    const runWorker = async () => {
      while (this.isRunning && !this.globalPaused) {
        const targetIndex = this.items.findIndex(i => i.status === 'idle');
        if (targetIndex === -1) break;

        const target = this.items[targetIndex];
        const controller = new AbortController();

        this.items = this.items.map(i => i.id === target.id ? { ...i, status: 'converting', abortController: controller } : i);
        this.notify();
        this.activeWorkers++;

        try {
          let resultBlob: Blob;
          if (controller.signal.aborted) throw { message: 'Paused' };

          if (tabType === 'image' && this.convertImageFn) {
            resultBlob = await this.convertImageFn(target.file, targetFormat, options.quality || 0.85);
          } else if (tabType === 'audio' && this.convertAudioFn) {
            resultBlob = await this.convertAudioFn(target.file, targetFormat, (p: number) => {
              if (controller.signal.aborted) return;
              this.updateProgress(target.id, p);
            }, controller.signal);
          } else if (tabType === 'video' && this.convertVideoFn) {
            const res = await this.convertVideoFn(
              target.file, targetFormat, options,
              (p: number) => {
                if (controller.signal.aborted) return;
                this.updateProgress(target.id, p);
              },
              controller.signal, target.lastTime || 0, target.existingChunks || []
            );
            resultBlob = res.blob;
          } else {
            throw new Error('Converter not found');
          }

          if (controller.signal.aborted) throw { message: 'Paused' };

          this.revokeItemUrl(target);
          const downloadUrl = URL.createObjectURL(resultBlob);
          this.items = this.items.map(i => i.id === target.id ? {
            ...i, status: 'completed', progress: 100, downloadUrl, abortController: undefined
          } : i);
          this.notify();

        } catch (err: any) {
          if (err.message === 'Paused' || controller.signal.aborted) {
            this.items = this.items.map(i => i.id === target.id ? {
              ...i,
              status: 'paused',
              lastTime: err.lastTime !== undefined ? err.lastTime : i.lastTime,
              existingChunks: err.currentBlob ? [err.currentBlob] : i.existingChunks,
              abortController: undefined
            } : i);
            this.notify();
          } else {
            this.items = this.items.map(i => i.id === target.id ? {
              ...i, status: 'error', errorMessage: err.message || 'Failed', abortController: undefined
            } : i);
            this.notify();
          }
        } finally {
          this.activeWorkers = Math.max(0, this.activeWorkers - 1);
        }
      }
    };

    const workerPromises = Array.from({ length: Math.min(this.concurrencyLimit, this.items.length) }, () => runWorker());
    await Promise.all(workerPromises);
    this.isRunning = false;
  }

  public async downloadAllAsZip(targetFormat: string) {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const completedItems = this.items.filter(i => i.status === 'completed' && i.downloadUrl);
      
      if (completedItems.length === 0) return;

      for (const item of completedItems) {
        try {
          const response = await fetch(item.downloadUrl!);
          const blob = await response.blob();
          zip.file(`${item.customName}.${targetFormat}`, blob);
        } catch (e) {
          console.error('Failed to add file to zip', e);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Converted_Media_Folder.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('JSZip not available', err);
    }
  }

  private updateProgress(id: string, progress: number) {
    this.items = this.items.map(i => i.id === id ? { ...i, progress } : i);
    this.notify();
  }
}

export const queueManager = new ConversionQueueManager(100);