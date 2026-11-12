import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('dispara onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Adicionar ao carrinho</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar ao carrinho' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('usa type="button" por padrão para não enviar formulários', () => {
    render(<Button>Ação</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('fica desabilitado e anuncia carregamento quando loading', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Salvar
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Salvar' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
