import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import {
  ChefHat,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Package,
  User,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/features/auth/authContext';
import { ROLE_LABELS } from '@/features/auth/roles';
import { useLogout } from '@/features/auth/useLogout';
import { cn } from '@/lib/cn';
import { buttonStyles } from '@/components/ui';

function firstName(fullName: string | null | undefined, email: string | null | undefined) {
  if (fullName?.trim()) return fullName.trim().split(/\s+/)[0];
  return email?.split('@')[0] ?? 'Minha conta';
}

const itemClass =
  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted transition-colors hover:bg-elevated hover:text-fg focus-visible:bg-elevated focus-visible:text-fg focus-visible:outline-none';

/** Menu da conta (padrão "disclosure" acessível: botão com aria-expanded + lista de links). */
export function AccountMenu() {
  const { status, profile, user, isStaff, isAdmin } = useAuth();
  const { requestLogout, logoutDialog } = useLogout();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const { pathname } = useLocation();
  // O painel fica associado à rota em que foi aberto: ao navegar, ele fecha sozinho.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;
  const setOpen = (value: boolean) => setOpenedAt(value ? pathname : null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpenedAt(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenedAt(null);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (status !== 'authenticated') {
    return (
      <Link
        to="/entrar"
        className={buttonStyles({ variant: 'ghost', size: 'sm', className: 'gap-2 px-2.5' })}
      >
        <User className="size-5" aria-hidden="true" />
        <span className="hidden sm:inline">Entrar</span>
      </Link>
    );
  }

  const name = firstName(profile?.fullName, profile?.email ?? user?.email);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className={buttonStyles({ variant: 'ghost', size: 'sm', className: 'gap-2 px-2.5' })}
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-primary">
          <UserRound className="size-4" aria-hidden="true" />
        </span>
        <span className="hidden max-w-28 truncate sm:inline">{name}</span>
        <span className="sr-only sm:hidden">Menu da conta</span>
        <ChevronDown
          className={cn('hidden size-4 transition-transform sm:block', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute right-0 z-50 mt-2 w-64 animate-slide-up rounded-2xl border border-line-strong bg-surface p-2 shadow-pop"
        >
          <div className="border-b border-line px-3 pt-2 pb-3">
            <p className="truncate font-medium text-fg">{profile?.fullName ?? name}</p>
            <p className="truncate text-xs text-subtle">{profile?.email ?? user?.email}</p>
            {profile && profile.role !== 'CUSTOMER' && (
              <p className="mt-1 text-xs text-primary">{ROLE_LABELS[profile.role]}</p>
            )}
          </div>
          <nav aria-label="Conta" className="flex flex-col gap-0.5 pt-2">
            <Link to="/conta" className={itemClass}>
              <User className="size-4" aria-hidden="true" /> Minha conta
            </Link>
            <Link to="/pedidos" className={itemClass}>
              <Package className="size-4" aria-hidden="true" /> Meus pedidos
            </Link>
            {isStaff && (
              <Link to="/cozinha" className={itemClass}>
                <ChefHat className="size-4" aria-hidden="true" /> Painel da cozinha
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin" className={itemClass}>
                <LayoutDashboard className="size-4" aria-hidden="true" /> Administração
              </Link>
            )}
            <div className="my-1 border-t border-line" />
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                setOpen(false);
                requestLogout();
              }}
            >
              <LogOut className="size-4" aria-hidden="true" /> Sair
            </button>
          </nav>
        </div>
      )}
      {logoutDialog}
    </div>
  );
}
