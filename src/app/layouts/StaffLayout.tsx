import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import {
  ChefHat,
  Cookie,
  LayoutDashboard,
  Leaf,
  Menu,
  Package,
  Store,
  Tags,
  Users,
  Warehouse,
} from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { AccountMenu } from '@/components/layout/AccountMenu';
import { buttonStyles, Drawer } from '@/components/ui';
import { useAuth } from '@/features/auth/authContext';
import { cn } from '@/lib/cn';

const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/pedidos', label: 'Pedidos', icon: Package, end: false },
  { to: '/admin/cupcakes', label: 'Cupcakes', icon: Cookie, end: false },
  { to: '/admin/estoque', label: 'Estoque', icon: Warehouse, end: false },
  { to: '/admin/categorias', label: 'Categorias', icon: Tags, end: false },
  { to: '/admin/restricoes', label: 'Restrições', icon: Leaf, end: false },
  { to: '/admin/usuarios', label: 'Usuários', icon: Users, end: false },
  { to: '/cozinha', label: 'Cozinha', icon: ChefHat, end: false },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
    isActive ? 'bg-primary/12 text-primary' : 'text-muted hover:bg-elevated hover:text-fg',
  );

function AdminNav() {
  return (
    <nav aria-label="Administração" className="flex flex-col gap-1">
      {ADMIN_NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={linkClass}>
          <Icon className="size-[18px]" aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

/**
 * Layout das áreas internas (cozinha e administração): mais funcional que a loja, mas com a
 * mesma identidade Dark Premium.
 */
export function StaffLayout({ area }: { area: 'kitchen' | 'admin' }) {
  const { isAdmin } = useAuth();
  const { pathname } = useLocation();
  const [menuAt, setMenuAt] = useState<string | null>(null);
  const showSidebar = area === 'admin';

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#conteudo"
        className="sr-only z-[70] rounded-lg bg-primary px-4 py-2 font-medium text-on-primary focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur-xl">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          {showSidebar && (
            <button
              type="button"
              className={buttonStyles({
                variant: 'ghost',
                size: 'icon-sm',
                className: 'lg:hidden',
              })}
              onClick={() => setMenuAt(pathname)}
              aria-label="Abrir menu da administração"
              aria-haspopup="dialog"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
          )}
          <Link to={area === 'admin' ? '/admin' : '/cozinha'} className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="rounded-full border border-line-strong px-2.5 py-0.5 text-xs font-medium text-muted">
              {area === 'admin' ? 'Administração' : 'Cozinha'}
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            {area === 'kitchen' && isAdmin && (
              <Link
                to="/admin"
                className={buttonStyles({
                  variant: 'ghost',
                  size: 'sm',
                  className: 'hidden sm:inline-flex',
                })}
              >
                <LayoutDashboard className="size-4" aria-hidden="true" /> Admin
              </Link>
            )}
            <Link to="/" className={buttonStyles({ variant: 'ghost', size: 'sm' })}>
              <Store className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Ver loja</span>
            </Link>
            <AccountMenu />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {showSidebar && (
          <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-60 shrink-0 overflow-y-auto border-r border-line p-4 lg:block">
            <AdminNav />
          </aside>
        )}
        <main id="conteudo" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
          <Outlet />
        </main>
      </div>

      {showSidebar && (
        <Drawer open={menuAt === pathname} onClose={() => setMenuAt(null)} title="Administração">
          <div className="p-3">
            <AdminNav />
          </div>
        </Drawer>
      )}
    </div>
  );
}
