import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { buildProfile } from '@/test/auth';
import { API, server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { ProfileCard } from './ProfileCard';

describe('ProfileCard', () => {
  it('atualiza nome e telefone enviando apenas dígitos', async () => {
    let body: unknown;
    server.use(
      http.patch(`${API}/users/me`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ data: buildProfile('CUSTOMER', { fullName: 'Maria S.' }) });
      }),
    );
    renderWithProviders(<ProfileCard profile={buildProfile('CUSTOMER')} />);
    expect(screen.getByLabelText(/Telefone/)).toHaveValue('(11) 98765-4321');
    const name = screen.getByLabelText(/Nome completo/);
    await userEvent.clear(name);
    await userEvent.type(name, 'Maria S.');
    await userEvent.clear(screen.getByLabelText(/Telefone/));
    await userEvent.type(screen.getByLabelText(/Telefone/), '1133334444');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(() => expect(body).toEqual({ fullName: 'Maria S.', phone: '1133334444' }));
    expect(await screen.findByText('Dados atualizados.')).toBeInTheDocument();
  });
});
