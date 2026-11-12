import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Alert } from './Alert';
import { Chip } from './Badge';
import { Pagination, getPageItems } from './Pagination';
import { QuantityStepper } from './QuantityStepper';
import { SegmentedControl } from './SegmentedControl';

describe('QuantityStepper', () => {
  function Harness({ max = 3 }: { max?: number }) {
    const [value, setValue] = useState(1);
    return <QuantityStepper value={value} onChange={setValue} max={max} itemLabel="Red Velvet" />;
  }

  it('respeita o mínimo e o máximo', async () => {
    render(<Harness />);
    const decrease = screen.getByRole('button', { name: 'Diminuir quantidade de Red Velvet' });
    const increase = screen.getByRole('button', { name: 'Aumentar quantidade de Red Velvet' });
    expect(decrease).toBeDisabled();
    await userEvent.click(increase);
    await userEvent.click(increase);
    expect(screen.getByRole('status', { name: 'Quantidade de Red Velvet' })).toHaveTextContent('3');
    expect(increase).toBeDisabled();
    await userEvent.click(decrease);
    expect(screen.getByRole('status', { name: 'Quantidade de Red Velvet' })).toHaveTextContent('2');
  });
});

describe('Pagination', () => {
  it('calcula páginas com reticências', () => {
    expect(getPageItems(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getPageItems(5, 10)).toEqual([1, 'ellipsis', 4, 5, 6, 'ellipsis', 10]);
    expect(getPageItems(1, 10)).toEqual([1, 2, 'ellipsis', 10]);
  });

  it('marca a página atual e navega', async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} totalPages={4} onPageChange={onPageChange} />);
    expect(screen.getByRole('button', { name: 'Página 2' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('não renderiza com uma única página', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPageChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('SegmentedControl', () => {
  it('troca a opção selecionada', async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Período"
        value="today"
        onChange={onChange}
        options={[
          { value: 'today', label: 'Hoje' },
          { value: 'week', label: 'Semana' },
        ]}
      />,
    );
    expect(screen.getByRole('radio', { name: 'Hoje' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: 'Semana' }));
    expect(onChange).toHaveBeenCalledWith('week');
  });
});

describe('Chip e Alert', () => {
  it('expõe o estado do filtro com aria-pressed', () => {
    render(<Chip selected>Vegano</Chip>);
    expect(screen.getByRole('button', { name: 'Vegano' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('usa role="alert" para erros e role="status" para sucesso', () => {
    render(
      <>
        <Alert tone="error">Não foi possível finalizar o pagamento.</Alert>
        <Alert tone="success">Pedido realizado com sucesso!</Alert>
      </>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível finalizar o pagamento.');
    expect(screen.getByRole('status')).toHaveTextContent('Pedido realizado com sucesso!');
  });
});
