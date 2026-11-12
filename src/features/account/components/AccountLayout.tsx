import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { MapPin, Package, UserRound } from 'lucide-react';
import { PageHeader } from '@/components/ui';
import { cn } from '@/lib/cn';

const links = [
  { to: '/conta', label: 'Meus dados', icon: UserRound, end: true },
  { to: '/conta/enderecos', label: 'Endereços', icon: MapPin, end: false },
  { to: '/pedidos', label: 'Meus pedidos', icon: Package, end: false },
];

export function AccountLayout({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="container-page py-10 sm:py-14">
      <PageHeader eyebrow="Minha conta" title={title} description={description} actions={actions} />
      <div className="mt-8 grid gap-8 lg:grid-cols-[14rem_1fr]">
        <nav aria-label="Minha conta" className="flex gap-2 overflow-x-auto lg:flex-col">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex shrink-0 items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/12 text-primary'
                    : 'text-muted hover:bg-elevated hover:text-fg',
                )
              }
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="flex min-w-0 flex-col gap-6">{children}</div>
      </div>
    </div>
  );
}
