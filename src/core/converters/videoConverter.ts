export interface VideoOptions {
  resolution: string;
  crf: number;
}

export function convertVideo(
  file: File,
  targetFormat: string,
  options: VideoOptions,
  onProgress: (progress: number) => void,
  signal?: AbortSignal,
  startFromTime: number = 0,
  existingChunks: Blob[] = []
): Promise<{ blob: Blob; lastTime: number }> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new Error('Cancelled'));
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.remove();
    };

    if (signal) {
      signal.addEventListener('abort', () => {
        cleanup();
        // إرجاع الملف بحالته الحالية مع الـ chunks والنقطة التي توقف عندها لاستئنافه لاحقاً
        reject({ message: 'Paused', currentBlob: new Blob(existingChunks), lastTime: video.currentTime || startFromTime });
      }, { once: true });
    }

    video.onloadedmetadata = () => {
      if (signal?.aborted) return cleanup();
      
      const duration = video.duration || 1;
      const canvas = document.createElement('canvas');
      
      let width = video.videoWidth || 1280;
      let height = video.videoHeight || 720;

      if (options.resolution === '480') { height = 480; width = Math.round((video.videoWidth / video.videoHeight) * 480); }
      else if (options.resolution === '720') { height = 720; width = Math.round((video.videoWidth / video.videoHeight) * 720); }
      else if (options.resolution === '1080') { height = 1080; width = Math.round((video.videoWidth / video.videoHeight) * 1080); }
      else if (options.resolution === '2k') { height = 1440; width = Math.round((video.videoWidth / video.videoHeight) * 1440); }
      else if (options.resolution === '4k') { height = 2160; width = Math.round((video.videoWidth / video.videoHeight) * 2160); }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        cleanup();
        return reject(new Error('Canvas context failed'));
      }

      const stream = canvas.captureStream(30);
      let mimeType = 'video/webm';
      if (targetFormat === 'mp4' && MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      }

      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
      } catch (e) {
        mediaRecorder = new MediaRecorder(stream);
      }

      const chunks: Blob[] = [...existingChunks];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        cleanup();
        const blob = new Blob(chunks, { type: mimeType });
        resolve({ blob, lastTime: duration });
      };

      mediaRecorder.start();

      let currentTime = startFromTime;
      const fps = 15;
      const step = 1 / fps;

      const processFrame = () => {
        if (signal?.aborted) return;

        if (currentTime >= duration) {
          mediaRecorder.stop();
          return;
        }

        video.currentTime = currentTime;
      };

      video.onseeked = () => {
        if (signal?.aborted) return;
        ctx.drawImage(video, 0, 0, width, height);
        
        const progress = Math.min(Math.round((currentTime / duration) * 100), 99);
        onProgress(progress);

        currentTime += step;
        processFrame();
      };

      video.onerror = () => {
        cleanup();
        reject(new Error('Video loading error'));
      };

      // بدء المعالجة من النقطة المحددة (سواء من الصفر أو من نقطة الاستئناف)
      video.currentTime = startFromTime;
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Failed to load video metadata'));
    };
  });
}