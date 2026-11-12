import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, TriangleAlert, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ToastContext, type ToastOptions, type ToastTone } from './toastContext';

interface ToastItem extends Required<Omit<ToastOptions, 'description' | 'action'>> {
  id: number;
  description?: string;
  action?: ToastOptions['action'];
}

const toneStyles: Record<ToastTone, { icon: typeof Info; className: string; iconClass: string }> = {
  success: {
    icon: CheckCircle2,
    className: 'border-success/40 bg-[#122016]',
    iconClass: 'text-success',
  },
  info: { icon: Info, className: 'border-secondary/40 bg-[#1d1830]', iconClass: 'text-secondary' },
  warning: {
    icon: TriangleAlert,
    className: 'border-warning/40 bg-[#251c0e]',
    iconClass: 'text-warning',
  },
  error: { icon: XCircle, className: 'border-danger/45 bg-[#26141a]', iconClass: 'text-danger' },
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    const tone = options.tone ?? 'info';
    const item: ToastItem = {
      id: nextId++,
      title: options.title,
      description: options.description,
      action: options.action,
      tone,
      duration: options.duration ?? (tone === 'error' ? 8000 : 5000),
    };
    // Mantém no máximo 4 notificações visíveis.
    setToasts((current) => [...current.slice(-3), item]);
    return item.id;
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  const polite = toasts.filter((item) => item.tone !== 'error');
  const assertive = toasts.filter((item) => item.tone === 'error');

  return (
    <ToastContext.Provider value={value}>
      {children}
      <section
        aria-label="Notificações"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:right-0 sm:left-auto sm:items-end sm:p-6"
      >
        {/* Regiões vivas sempre presentes no DOM para que leitores de tela anunciem as mensagens. */}
        <div
          aria-live="polite"
          aria-relevant="additions text"
          className="flex w-full flex-col items-center gap-2 sm:items-end"
        >
          {polite.map((item) => (
            <ToastCard key={item.id} item={item} onDismiss={dismiss} />
          ))}
        </div>
        <div
          aria-live="assertive"
          aria-relevant="additions text"
          className="flex w-full flex-col items-center gap-2 sm:items-end"
        >
          {assertive.map((item) => (
            <ToastCard key={item.id} item={item} onDismiss={dismiss} />
          ))}
        </div>
      </section>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(item.duration);
  const startedAt = useRef(0);

  useEffect(() => {
    if (item.duration === 0 || paused) return;
    startedAt.current = Date.now();
    const timer = window.setTimeout(() => onDismiss(item.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current -= Date.now() - startedAt.current;
    };
  }, [item.id, item.duration, paused, onDismiss]);

  const { icon: Icon, className, iconClass } = toneStyles[item.tone];

  return (
    <div
      className={cn(
        'pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-xl border px-4 py-3 shadow-pop',
        className,
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Icon className={cn('mt-0.5 size-5 shrink-0', iconClass)} aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm font-medium text-fg">{item.title}</p>
        {item.description && <p className="text-sm text-muted">{item.description}</p>}
        {item.action && (
          <button
            type="button"
            onClick={() => {
              item.action?.onClick();
              onDismiss(item.id);
            }}
            className="mt-1 self-start text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {item.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        className="-mr-1 rounded-lg p-1 text-muted transition-colors hover:bg-white/5 hover:text-fg"
        aria-label="Fechar notificação"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
