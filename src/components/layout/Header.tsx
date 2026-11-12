import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { Menu, Search, ShoppingBag } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { buttonStyles } from '@/components/ui';
import { useCart } from '@/features/cart/cartContext';
import { cn } from '@/lib/cn';
import { plural } from '@/lib/format';
import { AccountMenu } from './AccountMenu';
import { MobileMenu } from './MobileMenu';
import { MAIN_NAV } from './navigation';

export function Header() {
  const { totalQuantity } = useCart();
  const { pathname } = useLocation();
  // O menu fica associado à rota em que foi aberto: ao navegar, ele fecha sozinho.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const menuOpen = openedAt === pathname;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-xl supports-[backdrop-filter]:bg-canvas/70">
      <div className="container-page flex h-16 items-center gap-2 lg:h-[4.5rem]">
        <button
          type="button"
          className={buttonStyles({ variant: 'ghost', size: 'icon-sm', className: 'lg:hidden' })}
          onClick={() => setOpenedAt(pathname)}
          aria-label="Abrir menu"
          aria-haspopup="dialog"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>

        <Link
          to="/"
          className="mr-2 rounded-lg focus-visible:outline-offset-4"
          aria-label="Cupqy — página inicial"
        >
          <Logo size="sm" />
        </Link>

        <nav aria-label="Principal" className="mx-auto hidden lg:block">
          <ul className="flex items-center gap-9">
            {MAIN_NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'relative py-2 text-sm font-medium transition-colors',
                      'after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-primary after:transition-transform',
                      isActive
                        ? 'text-fg after:scale-x-100'
                        : 'text-muted after:scale-x-0 hover:text-fg',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-0.5 lg:ml-0">
          <Link
            to="/cupcakes?busca="
            className={buttonStyles({ variant: 'ghost', size: 'icon-sm' })}
            aria-label="Buscar cupcakes"
          >
            <Search className="size-5" aria-hidden="true" />
          </Link>
          <Link
            to="/carrinho"
            className={buttonStyles({ variant: 'ghost', size: 'icon-sm', className: 'relative' })}
            aria-label={
              totalQuantity
                ? `Carrinho, ${plural(totalQuantity, 'item', 'itens')}`
                : 'Carrinho vazio'
            }
          >
            <ShoppingBag className="size-5" aria-hidden="true" />
            {totalQuantity > 0 && (
              <span
                aria-hidden="true"
                className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[0.65rem] font-semibold text-on-primary tabular-nums"
              >
                {totalQuantity > 99 ? '99+' : totalQuantity}
              </span>
            )}
          </Link>
          <AccountMenu />
        </div>
      </div>
      <MobileMenu open={menuOpen} onClose={() => setOpenedAt(null)} />
    </header>
  );
}
