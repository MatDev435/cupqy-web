import { createContext, useContext } from 'react';

export type ToastTone = 'success' | 'info' | 'warning' | 'error';

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Duração em ms (padrão: 5s; erros: 8s). Use 0 para não fechar sozinho. */
  duration?: number;
}

export interface ToastContextValue {
  toast: (options: ToastOptions) => number;
  dismiss: (id: number) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast deve ser usado dentro de <ToastProvider>.');
  return context;
}
