import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from './Toast';
import { useToast } from './toastContext';

function Trigger({ tone }: { tone?: 'success' | 'error' }) {
  const { toast } = useToast();
  return (
    <button type="button" onClick={() => toast({ title: 'Pedido realizado com sucesso!', tone })}>
      Notificar
    </button>
  );
}

describe('Toast', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it('anuncia mensagens de sucesso na região polida e fecha sozinho', async () => {
    render(
      <ToastProvider>
        <Trigger tone="success" />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Notificar' }));
    const message = screen.getByText('Pedido realizado com sucesso!');
    expect(message.closest('[aria-live]')).toHaveAttribute('aria-live', 'polite');
    act(() => vi.advanceTimersByTime(5100));
    expect(screen.queryByText('Pedido realizado com sucesso!')).not.toBeInTheDocument();
  });

  it('anuncia erros na região assertiva e permite fechar', async () => {
    render(
      <ToastProvider>
        <Trigger tone="error" />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Notificar' }));
    const message = screen.getByText('Pedido realizado com sucesso!');
    expect(message.closest('[aria-live]')).toHaveAttribute('aria-live', 'assertive');
    await userEvent.click(screen.getByRole('button', { name: 'Fechar notificação' }));
    expect(screen.queryByText('Pedido realizado com sucesso!')).not.toBeInTheDocument();
  });

  it('exige o provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Trigger />)).toThrow(/ToastProvider/);
  });
});
