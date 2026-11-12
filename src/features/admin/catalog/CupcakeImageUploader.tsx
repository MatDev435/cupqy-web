import { useEffect, useId, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ImagePlus, Trash2, UploadCloud } from 'lucide-react';
import { removeImage } from '@/api/admin';
import { getErrorMessage } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import type { AdminCupcake } from '@/api/types';
import { CupcakeImage } from '@/components/brand/CupcakeImage';
import { Alert, Button, Card, CardHeader, ConfirmDialog, useToast } from '@/components/ui';
import { cn } from '@/lib/cn';
import {
  ImageUploadError,
  uploadCupcakeImage,
  validateImageFile,
  type UploadStage,
} from './imageUpload';

const STAGES: Array<{ stage: UploadStage; label: string }> = [
  { stage: 'authorizing', label: 'Autorizando' },
  { stage: 'uploading', label: 'Enviando' },
  { stage: 'confirming', label: 'Confirmando' },
];

/** Foto do cupcake: seleção, pré-visualização, validação, envio por etapas e substituição. */
export function CupcakeImageUploader({ cupcake }: { cupcake: AdminCupcake }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFileState] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [stage, setStage] = useState<UploadStage | null>(null);
  const [dragging, setDragging] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  // Arquivo escolhido + URL temporária da pré-visualização (liberada ao trocar/sair).
  const setFile = (next: File | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = next ? URL.createObjectURL(next) : null;
    setFileState(next);
    setPreview(previewRef.current);
  };
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  const onUpdated = (updated: AdminCupcake) => {
    queryClient.setQueryData(queryKeys.admin.cupcake(updated.id), updated);
    void queryClient.invalidateQueries({ queryKey: ['admin', 'cupcakes'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all });
  };

  const upload = useMutation({
    mutationFn: (selected: File) => uploadCupcakeImage(cupcake.id, selected, setStage),
    onSuccess: (updated) => {
      onUpdated(updated);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      toast({ tone: 'success', title: 'Foto atualizada!' });
    },
    onSettled: () => setStage(null),
  });

  const remove = useMutation({
    mutationFn: () => removeImage(cupcake.id),
    onSuccess: (updated) => {
      onUpdated(updated);
      setConfirmRemove(false);
      toast({ tone: 'success', title: 'Foto removida.' });
    },
    onError: (error) => {
      setConfirmRemove(false);
      toast({
        tone: 'error',
        title: 'Não foi possível remover',
        description: getErrorMessage(error),
      });
    },
  });

  const select = (selected: File | undefined) => {
    upload.reset();
    if (!selected) return;
    const error = validateImageFile(selected);
    setValidationError(error);
    setFile(error ? null : selected);
  };

  const stageIndex = stage ? STAGES.findIndex((item) => item.stage === stage) : -1;
  const uploadError =
    upload.error instanceof ImageUploadError
      ? upload.error.message
      : upload.error
        ? getErrorMessage(upload.error)
        : null;

  return (
    <Card>
      <CardHeader
        title="Foto"
        description="JPG, PNG ou WebP de até 5 MB. Prefira imagens quadradas e bem iluminadas."
      />
      <div className="grid gap-5 sm:grid-cols-[12rem_1fr]">
        <div className="flex flex-col gap-2">
          <CupcakeImage
            src={preview ?? cupcake.imageUrl}
            alt={preview ? 'Pré-visualização da nova foto' : `Foto atual de ${cupcake.name}`}
            className="aspect-square rounded-2xl border border-line"
          />
          {preview && <p className="text-center text-xs text-primary">Pré-visualização</p>}
        </div>

        <div className="flex flex-col gap-4">
          {/* Arrastar e soltar é um atalho de mouse; pelo teclado, o rótulo abre o seletor de arquivo. */}
          {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
          <label
            htmlFor={inputId}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              select(event.dataTransfer.files[0]);
            }}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors',
              dragging
                ? 'border-primary bg-primary/8'
                : 'border-line-strong hover:border-primary/50',
            )}
          >
            <UploadCloud className="size-8 text-primary" aria-hidden="true" />
            <span className="text-sm font-medium text-fg">
              Arraste uma imagem ou{' '}
              <span className="text-primary underline">escolha um arquivo</span>
            </span>
            <span className="text-xs text-subtle">
              {file ? file.name : 'Nenhum arquivo selecionado'}
            </span>
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => select(event.target.files?.[0])}
            aria-describedby={validationError ? `${inputId}-error` : undefined}
          />
          {validationError && (
            <p id={`${inputId}-error`} role="alert" className="text-sm text-danger-fg">
              {validationError}
            </p>
          )}
          {uploadError && <Alert tone="error">{uploadError}</Alert>}

          {stage && (
            <div role="status" aria-live="polite" className="flex flex-col gap-2">
              <div
                className="h-1.5 overflow-hidden rounded-full bg-elevated"
                role="progressbar"
                aria-label="Progresso do envio"
                aria-valuemin={0}
                aria-valuemax={STAGES.length}
                aria-valuenow={stageIndex + 1}
                aria-valuetext={STAGES[stageIndex]?.label}
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500"
                  style={{ width: `${((stageIndex + 1) / STAGES.length) * 100}%` }}
                />
              </div>
              <ol className="flex justify-between text-xs">
                {STAGES.map((item, index) => (
                  <li
                    key={item.stage}
                    className={cn(
                      'flex items-center gap-1',
                      index < stageIndex
                        ? 'text-success-fg'
                        : index === stageIndex
                          ? 'text-primary'
                          : 'text-subtle',
                    )}
                  >
                    {index < stageIndex && <Check className="size-3" aria-hidden="true" />}
                    {item.label}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => file && upload.mutate(file)}
              disabled={!file}
              loading={upload.isPending}
              leftIcon={<ImagePlus className="size-4" aria-hidden="true" />}
            >
              {cupcake.imageUrl ? 'Substituir foto' : 'Enviar foto'}
            </Button>
            {file && !upload.isPending && (
              <Button
                variant="ghost"
                onClick={() => {
                  setFile(null);
                  if (inputRef.current) inputRef.current.value = '';
                }}
              >
                Descartar
              </Button>
            )}
            {cupcake.imageUrl && !file && (
              <Button
                variant="ghost"
                className="hover:text-danger-fg"
                onClick={() => setConfirmRemove(true)}
                leftIcon={<Trash2 className="size-4" aria-hidden="true" />}
              >
                Remover foto
              </Button>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmRemove}
        title="Remover a foto?"
        description="O cupcake passará a exibir a imagem padrão no catálogo."
        confirmLabel="Remover"
        tone="danger"
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
        onCancel={() => setConfirmRemove(false)}
      />
    </Card>
  );
}
