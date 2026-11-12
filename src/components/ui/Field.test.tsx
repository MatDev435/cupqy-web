import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Checkbox, SelectField, Switch, TextField } from './Field';

describe('TextField', () => {
  it('associa rótulo, dica e erro ao campo', () => {
    render(<TextField label="E-mail" hint="Usaremos para contato" error="Informe o e-mail" />);
    const input = screen.getByLabelText('E-mail');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Informe o e-mail Usaremos para contato');
  });

  it('não marca como inválido sem erro', () => {
    render(<TextField label="Nome" />);
    expect(screen.getByLabelText('Nome')).not.toHaveAttribute('aria-invalid');
  });

  it('indica campos obrigatórios', () => {
    render(<TextField label="Senha" required type="password" />);
    expect(screen.getByLabelText(/Senha/)).toHaveAttribute('aria-required', 'true');
  });
});

describe('SelectField', () => {
  it('permite escolher uma opção', async () => {
    render(
      <SelectField label="Categoria" defaultValue="">
        <option value="">Todas</option>
        <option value="classicos">Clássicos</option>
      </SelectField>,
    );
    await userEvent.selectOptions(screen.getByLabelText('Categoria'), 'classicos');
    expect(screen.getByLabelText('Categoria')).toHaveValue('classicos');
  });
});

describe('Checkbox e Switch', () => {
  it('alterna o checkbox pelo rótulo', async () => {
    render(<Checkbox label="Salvar este endereço" />);
    await userEvent.click(screen.getByText('Salvar este endereço'));
    expect(screen.getByRole('checkbox', { name: 'Salvar este endereço' })).toBeChecked();
  });

  it('expõe o interruptor com role="switch"', async () => {
    render(<Switch label="Ativo" description="Visível no catálogo" />);
    const toggle = screen.getByRole('switch', { name: 'Ativo' });
    expect(toggle).toHaveAccessibleDescription('Visível no catálogo');
    await userEvent.click(toggle);
    expect(toggle).toBeChecked();
  });
});
