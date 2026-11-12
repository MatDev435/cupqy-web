import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { API, server } from '@/test/msw/server';
import { ImageUploadError, uploadCupcakeImage, validateImageFile } from './imageUpload';

const storage = vi.hoisted(() => {
  const uploadToSignedUrl = vi.fn(async () => ({
    data: { path: 'x' },
    error: null as null | Error,
  }));
  const from = vi.fn(() => ({ uploadToSignedUrl }));
  return { uploadToSignedUrl, from };
});
vi.mock('@/lib/supabase', () => ({ supabase: { storage: { from: storage.from } } }));

const file = (type = 'image/png', size = 1024) =>
  new File([new Uint8Array(size)], 'cupcake.png', { type });

describe('validateImageFile', () => {
  it('aceita JPG, PNG e WebP até 5 MB', () => {
    expect(validateImageFile(file('image/png'))).toBeNull();
    expect(validateImageFile(file('image/webp'))).toBeNull();
    expect(validateImageFile(file('image/gif'))).toMatch(/Formato não suportado/);
    expect(validateImageFile(file('image/jpeg', 5 * 1024 * 1024 + 1))).toMatch(/5 MB/);
  });
});

describe('uploadCupcakeImage', () => {
  let requested: unknown;
  let attached: unknown;

  beforeEach(() => {
    storage.uploadToSignedUrl.mockClear();
    storage.from.mockClear();
    server.use(
      http.post(`${API}/admin/cupcakes/cup-1/image/upload-url`, async ({ request }) => {
        requested = await request.json();
        return HttpResponse.json(
          {
            data: {
              bucket: 'cupcake-images',
              path: 'cupcakes/cup-1/abc.png',
              token: 'signed-token',
              signedUrl: 'https://supabase.test/upload',
              expiresInSeconds: 7200,
              contentType: 'image/png',
              maxSizeBytes: 5242880,
            },
          },
          { status: 201 },
        );
      }),
      http.put(`${API}/admin/cupcakes/cup-1/image`, async ({ request }) => {
        attached = await request.json();
        return HttpResponse.json({ data: { id: 'cup-1', imageUrl: 'https://cdn/abc.png' } });
      }),
    );
  });

  it('autoriza na API, envia direto ao Storage e confirma na API', async () => {
    const stages: string[] = [];
    const selected = file();
    const result = await uploadCupcakeImage('cup-1', selected, (stage) => stages.push(stage));

    expect(stages).toEqual(['authorizing', 'uploading', 'confirming']);
    expect(requested).toEqual({ contentType: 'image/png', sizeBytes: 1024 });
    expect(storage.from).toHaveBeenCalledWith('cupcake-images');
    expect(storage.uploadToSignedUrl).toHaveBeenCalledWith(
      'cupcakes/cup-1/abc.png',
      'signed-token',
      selected,
      { contentType: 'image/png' },
    );
    expect(attached).toEqual({ path: 'cupcakes/cup-1/abc.png' });
    expect(result).toMatchObject({ imageUrl: 'https://cdn/abc.png' });
  });

  it('não chama a API com arquivo inválido', async () => {
    await expect(uploadCupcakeImage('cup-1', file('application/pdf'))).rejects.toBeInstanceOf(
      ImageUploadError,
    );
    expect(storage.uploadToSignedUrl).not.toHaveBeenCalled();
  });

  it('não confirma se o envio ao Storage falhar', async () => {
    storage.uploadToSignedUrl.mockResolvedValueOnce({ data: null as never, error: new Error('x') });
    attached = undefined;
    await expect(uploadCupcakeImage('cup-1', file())).rejects.toThrow(/armazenamento/);
    expect(attached).toBeUndefined();
  });
});
