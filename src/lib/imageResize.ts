export const resizeImage = (file: File, maxWidth = 512, maxHeight = 512): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              console.warn('Image resize failed, using original file');
              resolve(file);
              return;
            }
            const resizedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), {
              type: 'image/webp',
              lastModified: Date.now(),
            });
            resolve(resizedFile);
          },
          'image/webp',
          0.82
        );
      };
      img.onerror = () => {
        console.warn('Image resize failed, using original file');
        resolve(file);
      };
    };
    reader.onerror = () => {
      console.warn('Image resize failed, using original file');
      resolve(file);
    };
  });
};

export const resizeStaffImage = (file: File): Promise<File> => resizeImage(file, 512, 512);
