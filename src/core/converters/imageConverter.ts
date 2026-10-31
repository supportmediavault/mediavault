export type ImageFormat = 'webp' | 'png' | 'jpeg' | 'jpg' | 'avif' | 'gif' | 'bmp' | 'ico';

export async function convertImage(
  file: File,
  targetFormat: ImageFormat,
  quality: number = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('فشل تهيئة محرك الصور.'));
          return;
        }

        ctx.drawImage(img, 0, 0);

        let mimeType = 'image/webp';
        if (targetFormat === 'png') mimeType = 'image/png';
        if (targetFormat === 'jpeg' || targetFormat === 'jpg') mimeType = 'image/jpeg';
        if (targetFormat === 'avif') mimeType = 'image/avif';
        if (targetFormat === 'gif') mimeType = 'image/gif';
        if (targetFormat === 'bmp') mimeType = 'image/bmp';
        if (targetFormat === 'ico') mimeType = 'image/x-icon';

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('فشل تحويل الصورة.'));
            }
          },
          mimeType,
          quality
        );
      };

      img.onerror = () => reject(new Error('فشل قراءة ملف الصورة.'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('فشل قراءة الملف.'));
    reader.readAsDataURL(file);
  });
}