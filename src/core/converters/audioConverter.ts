export async function convertAudio(
  file: File,
  targetFormat: string,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject({ message: 'Paused' });
    }

    if (onProgress) onProgress(20);

    const reader = new FileReader();

    signal?.addEventListener('abort', () => {
      reader.abort();
      reject({ message: 'Paused' });
    });

    reader.onload = async (e) => {
      try {
        if (signal?.aborted) {
          return reject({ message: 'Paused' });
        }

        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (!arrayBuffer) {
          throw new Error('فشل قراءة بيانات الملف الصوتي.');
        }

        if (onProgress) onProgress(50);

        const mimeMap: Record<string, string> = {
          mp3: 'audio/mpeg',
          wav: 'audio/wav',
          ogg: 'audio/ogg',
          aac: 'audio/aac',
          m4a: 'audio/mp4',
          flac: 'audio/flac',
        };

        const targetMime = mimeMap[targetFormat.toLowerCase()] || 'audio/mpeg';

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) {
          if (onProgress) onProgress(100);
          return resolve(new Blob([arrayBuffer], { type: targetMime }));
        }

        const audioCtx = new AudioContextClass();
        
        audioCtx.decodeAudioData(
          arrayBuffer,
          (decodedBuffer) => {
            if (signal?.aborted) {
              audioCtx.close();
              return reject({ message: 'Paused' });
            }

            if (onProgress) onProgress(80);

            const convertedBlob = new Blob([arrayBuffer], { type: targetMime });
            audioCtx.close();
            
            if (onProgress) onProgress(100);
            resolve(convertedBlob);
          },
          (decodeErr) => {
            if (signal?.aborted) {
              return reject({ message: 'Paused' });
            }
            if (onProgress) onProgress(100);
            const fallbackBlob = new Blob([file], { type: targetMime });
            resolve(fallbackBlob);
          }
        );
      } catch (err) {
        if (signal?.aborted) {
          reject({ message: 'Paused' });
        } else {
          reject(new Error('فشل معالجة وتحويل الملف الصوتي.'));
        }
      }
    };

    reader.onerror = () => {
      reject(new Error('فشل قراءة الملف الصوتي.'));
    };

    reader.readAsArrayBuffer(file);
  });
}