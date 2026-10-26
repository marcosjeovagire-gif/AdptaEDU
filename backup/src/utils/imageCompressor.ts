/**
 * Utilitário de alta performance para compressão e redimensionamento seguro de imagens
 * Evita estouro de cota no localStorage e acelera a renderização em dispositivos móveis.
 */

export interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
}

export async function compressImageFile(
  file: File | Blob,
  options: CompressImageOptions = {}
): Promise<string> {
  const {
    maxWidth = 800,
    maxHeight = 800,
    quality = 0.75,
    mimeType = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    // Se o arquivo for muito pequeno (menos de 50KB), pode ler direto como DataURL
    if (file.size < 50 * 1024 && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Erro ao ler imagem pequena.'));
      reader.readAsDataURL(file);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback direto
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Erro ao converter imagem em canvas.'));
        reader.readAsDataURL(file);
        return;
      }

      // Suavização de alta qualidade
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const compressedBase64 = canvas.toDataURL(mimeType, quality);
        resolve(compressedBase64);
      } catch (err) {
        // Fallback com FileReader se toDataURL falhar
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(err);
        reader.readAsDataURL(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // Tenta fallback com FileReader
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Formato de imagem inválido ou ilegível.'));
      reader.readAsDataURL(file);
    };

    img.src = objectUrl;
  });
}
