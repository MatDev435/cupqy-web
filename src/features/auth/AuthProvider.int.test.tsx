import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getData } from '@/api/http';
import { ToastProvider } from '@/components/ui';
import { buildProfile } from '@/test/auth';
import { API, server } from '@/test/msw/server';
import { createTestQueryClient } from '@/test/render';
import { setupApiAuth } from './apiAuth';
import { useAuth } from './authContext';
import { AuthProvider } from './AuthProvider';

type Listener = (event: string, session: unknown) => void;

const mocks = vi.hoisted(() => {
  const state = { session: null as null | { access_token: string; user: { id: string } } };
  const listeners = new Set<Listener>();
  const emit = (event: string, session: unknown) => listeners.forEach((fn) => fn(event, session));
  const auth = {
    getSession: vi.fn(async () => ({ data: { session: state.session }, error: null })),
    refreshSession: vi.fn(async () => ({ data: { session: null }, error: { message: 'x' } })),
    onAuthStateChange: vi.fn((listener: Listener) => {
      listeners.add(listener);
      return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } };
    }),
    signInWithPassword: vi.fn(async () => {
      state.session = { access_token: 'access-2', user: { id: 'user-2' } };
      return { data: { session: state.session, user: state.session.user }, error: null };
    }),
    signOut: vi.fn(async () => {
      state.session = null;
      emit('SIGNED_OUT', null);
      return { error: null };
    }),
  };
  return { state, auth, emit, listeners };
});

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: mocks.auth },
  initialAuthRedirect: { type: null, error: null, errorCode: null, errorDescription: null },
}));

function Probe() {
  const auth = useAuth();
  return (
    <div>
      <p data-testid="status">{auth.status}</p>
      <p data-testid="role">{auth.role ?? 'sem-papel'}</p>
      <button type="button" onClick={() => void auth.signIn('a@b.com', 'senha1234')}>
        Entrar
      </button>
      <button
        type="button"
        onClick={() => void getData('/orders', { auth: 'required' }).catch(() => {})}
      >
        Chamar API
      </button>
    </div>
  );
}

function renderAuth() {
  const queryClient = createTestQueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
  return queryClient;
}

describe('AuthProvider + camada HTTP', () => {
  beforeEach(() => {
    mocks.state.session = null;
    setupApiAuth();
    server.use(
      http.get(`${API}/users/me`, ({ request }) => {
        const token = request.headers.get('authorization');
        if (token === 'Bearer access-1') return HttpResponse.json({ data: buildProfile('ADMIN') });
        if (token === 'Bearer access-2') return HttpResponse.json({ data: buildProfile('BAKER') });
        return HttpResponse.json(
          { error: { code: 'INVALID_TOKEN', message: 'x' } },
          { status: 401 },
        );
      }),
    );
  });

  afterEach(() => mocks.listeners.clear());

  it('restaura a sessão salva e lê o papel da API (não dos metadados)', async () => {
    mocks.state.session = { access_token: 'access-1', user: { id: 'user-1' } };
    renderAuth();
    expect(screen.getByTestId('status')).toHaveTextContent('loading');
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('ADMIN'));
  });

  it('fica como visitante sem sessão', async () => {
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
    expect(screen.getByTestId('role')).toHaveTextContent('sem-papel');
  });

  it('entra com e-mail e senha e carrega o perfil', async () => {
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('BAKER'));
    expect(mocks.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'senha1234',
    });
  });

  it('encerra a sessão local quando a API rejeita o token', async () => {
    mocks.state.session = { access_token: 'access-1', user: { id: 'user-1' } };
    server.use(
      http.get(`${API}/orders`, () =>
        HttpResponse.json({ error: { code: 'INVALID_TOKEN', message: 'x' } }, { status: 401 }),
      ),
    );
    const queryClient = renderAuth();
    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('ADMIN'));
    const clear = vi.spyOn(queryClient, 'clear');
    await userEvent.click(screen.getByRole('button', { name: 'Chamar API' }));
    await waitFor(() => expect(mocks.auth.signOut).toHaveBeenCalledWith({ scope: 'local' }));
    expect(await screen.findByText('Sessão encerrada')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
    expect(clear).toHaveBeenCalled();
  });
});
