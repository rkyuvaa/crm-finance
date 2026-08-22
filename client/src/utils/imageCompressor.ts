/**
 * Automatically compresses high-resolution phone camera photos and large images
 * down to max 1600px dimensions & ~300KB Base64 data URL.
 * Preserves crisp text readability for KYC documents while preventing HTTP 413 Payload errors.
 */
export async function compressImageFile(file: File, maxDimension = 1600, quality = 0.82): Promise<{ dataUrl: string; size: number }> {
  return new Promise((resolve) => {
    // Non-image files (e.g. PDFs) cannot be compressed on canvas; return original Base64
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = (evt.target?.result as string) || '';
        resolve({ dataUrl, size: file.size });
      };
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let width = img.width;
      let height = img.height;

      // Downscale if camera photo exceeds maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback to FileReader if 2D context fails
        const reader = new FileReader();
        reader.onload = (evt) => resolve({ dataUrl: (evt.target?.result as string) || '', size: file.size });
        reader.readAsDataURL(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const compressedDataUrl = canvas.toDataURL(mimeType, quality);

      // Estimate compressed byte size
      const head = `data:${mimeType};base64,`;
      const base64Length = compressedDataUrl.length - head.length;
      const estimatedSize = Math.round(base64Length * 0.75);

      resolve({ dataUrl: compressedDataUrl, size: estimatedSize });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      const reader = new FileReader();
      reader.onload = (evt) => resolve({ dataUrl: (evt.target?.result as string) || '', size: file.size });
      reader.readAsDataURL(file);
    };

    img.src = url;
  });
}
