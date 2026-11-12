import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { Dashboard, DashboardPeriod } from '@/api/types';
import { mockAuthAs } from '@/test/auth';
import { API, server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { AdminDashboardPage } from './AdminDashboardPage';

function dashboard(period: DashboardPeriod): Dashboard {
  const daily =
    period === 'today'
      ? [{ date: '2026-11-12', revenueCents: 12000, completedOrders: 4 }]
      : [
          { date: '2026-11-10', revenueCents: 30000, completedOrders: 10 },
          { date: '2026-11-11', revenueCents: 0, completedOrders: 0 },
          { date: '2026-11-12', revenueCents: 12000, completedOrders: 4 },
        ];
  const revenue = daily.reduce((sum, day) => sum + day.revenueCents, 0);
  const orders = daily.reduce((sum, day) => sum + day.completedOrders, 0);
  return {
    period,
    timeZone: 'America/Sao_Paulo',
    range: {
      startDate: daily[0]!.date,
      endDate: daily.at(-1)!.date,
      from: '2026-11-10T03:00:00Z',
      to: '2026-11-13T03:00:00Z',
    },
    revenueCents: revenue,
    completedOrders: orders,
    averageTicketCents: Math.round(revenue / orders),
    revenueByFulfillment: { DELIVERY: revenue * 0.75, PICKUP: revenue * 0.25 },
    inProgress: { orders: 2, amountCents: 5000 },
    cancelledOrders: 1,
    ordersByStatus: {
      AWAITING_PAYMENT: 1,
      IN_PREPARATION: 2,
      AWAITING_COURIER: 0,
      OUT_FOR_DELIVERY: 0,
      AWAITING_PICKUP: 0,
      COMPLETED: orders,
      CANCELLED: 1,
    },
    daily,
    topCupcakes: [{ cupcakeId: 'c1', name: 'Red Velvet', quantity: 9, revenueCents: 11610 }],
    generatedAt: '2026-11-12T15:00:00Z',
  };
}

describe('AdminDashboardPage (US16)', () => {
  it('mostra faturamento e pedidos do dia e alterna para a semana', async () => {
    const periods: Array<string | null> = [];
    server.use(
      http.get(`${API}/admin/dashboard`, ({ request }) => {
        const period = (new URL(request.url).searchParams.get('period') ??
          'today') as DashboardPeriod;
        periods.push(period);
        return HttpResponse.json({ data: dashboard(period) });
      }),
    );
    renderWithProviders(<AdminDashboardPage />, { auth: mockAuthAs('ADMIN') });

    // CA#01 e CA#02: faturamento e total de pedidos fechados no dia.
    const revenue = await screen.findByText('Faturamento', { selector: 'dt' });
    expect(revenue.parentElement).toHaveTextContent(/R\$\s120,00/);
    expect(
      screen.getByText('Pedidos concluídos', { selector: 'dt' }).parentElement,
    ).toHaveTextContent('4');
    expect(screen.getByRole('list', { name: 'Cupcakes mais vendidos' })).toHaveTextContent(
      'Red Velvet',
    );
    expect(screen.getByRole('list', { name: 'Faturamento por tipo de entrega' })).toHaveTextContent(
      '75%',
    );

    // CA#03: alternar entre Hoje, Semana e Mês.
    await userEvent.click(screen.getByRole('radio', { name: 'Semana' }));
    await waitFor(() => expect(periods).toContain('week'));
    const table = await screen.findByRole('table', { name: 'Faturamento por dia' });
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    await waitFor(() =>
      expect(screen.getByText('Faturamento', { selector: 'dt' }).parentElement).toHaveTextContent(
        /R\$\s420,00/,
      ),
    );
  });
});
