import { attachImage, requestImageUpload } from '@/api/admin';
import type { AdminCupcake } from '@/api/types';
import { supabase } from '@/lib/supabase';

/** Restrições definidas pela API (config/images.js do cupqy-server). */
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export type UploadStage = 'authorizing' | 'uploading' | 'confirming';

export class ImageUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageUploadError';
  }
}

/** Validação no navegador (a API e o bucket validam de novo). */
export function validateImageFile(file: File): string | null {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return 'Formato não suportado. Envie uma imagem JPG, PNG ou WebP.';
  }
  if (file.size > IMAGE_MAX_BYTES) return 'A imagem deve ter no máximo 5 MB.';
  if (file.size === 0) return 'O arquivo está vazio.';
  return null;
}

/**
 * Upload direto ao Supabase Storage com URL assinada (o arquivo não passa pelo Express):
 * 1. a API valida o admin, tipo e tamanho e devolve bucket/path/token;
 * 2. o navegador envia o arquivo ao Storage com o token assinado;
 * 3. a API confere o arquivo e o vincula ao cupcake (substituindo a foto anterior).
 */
export async function uploadCupcakeImage(
  cupcakeId: string,
  file: File,
  onStage: (stage: UploadStage) => void = () => {},
): Promise<AdminCupcake> {
  const invalid = validateImageFile(file);
  if (invalid) throw new ImageUploadError(invalid);

  onStage('authorizing');
  const upload = await requestImageUpload(cupcakeId, {
    contentType: file.type as (typeof IMAGE_TYPES)[number],
    sizeBytes: file.size,
  });

  onStage('uploading');
  const { error } = await supabase.storage
    .from(upload.bucket)
    .uploadToSignedUrl(upload.path, upload.token, file, { contentType: file.type });
  if (error) {
    throw new ImageUploadError(
      'Não foi possível enviar a imagem ao armazenamento. Tente novamente.',
    );
  }

  onStage('confirming');
  return attachImage(cupcakeId, { path: upload.path });
}
