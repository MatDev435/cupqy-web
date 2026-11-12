import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { API, server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { AddressForm } from './AddressForm';

describe('AddressForm', () => {
  it('preenche o endereço automaticamente pelo CEP (US09 RNF#02)', async () => {
    server.use(
      http.get(`${API}/shipping/cep/01310100`, () =>
        HttpResponse.json({
          data: {
            zipCode: '01310100',
            street: 'Avenida Paulista',
            neighborhood: 'Bela Vista',
            city: 'São Paulo',
            state: 'SP',
          },
        }),
      ),
    );
    const onSubmit = vi.fn();
    renderWithProviders(<AddressForm idPrefix="t" submitLabel="Salvar" onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText(/CEP/), '01310100');
    expect(screen.getByLabelText(/CEP/)).toHaveValue('01310-100');
    await waitFor(() => expect(screen.getByLabelText(/Rua/)).toHaveValue('Avenida Paulista'));
    expect(screen.getByLabelText(/Bairro/)).toHaveValue('Bela Vista');
    expect(screen.getByLabelText(/Cidade/)).toHaveValue('São Paulo');
    expect(screen.getByLabelText(/UF/)).toHaveValue('SP');
    await waitFor(() => expect(screen.getByLabelText(/Número/)).toHaveFocus());

    await userEvent.type(screen.getByLabelText(/Número/), '1000');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ zipCode: '01310-100', number: '1000', state: 'SP' }),
      ),
    );
  });

  it('informa CEP não encontrado e permite preencher manualmente', async () => {
    server.use(
      http.get(`${API}/shipping/cep/99999999`, () =>
        HttpResponse.json(
          { error: { code: 'CEP_NOT_FOUND', message: 'CEP não encontrado.' } },
          { status: 404 },
        ),
      ),
    );
    renderWithProviders(<AddressForm idPrefix="t" submitLabel="Salvar" onSubmit={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/CEP/), '99999999');
    expect(await screen.findByText(/CEP não encontrado. Confira os números/)).toBeInTheDocument();
  });

  it('valida campos obrigatórios', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<AddressForm idPrefix="t" submitLabel="Salvar" onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('CEP deve conter 8 dígitos.')).toBeInTheDocument();
    expect(screen.getByText('Informe a rua.')).toBeInTheDocument();
    expect(screen.getByText('Selecione a UF.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
