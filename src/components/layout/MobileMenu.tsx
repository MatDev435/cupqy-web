import { NavLink } from 'react-router';
import { ChefHat, LayoutDashboard, LogIn, LogOut, User, UserPlus } from 'lucide-react';
import { Drawer } from '@/components/ui';
import { useAuth } from '@/features/auth/authContext';
import { useLogout } from '@/features/auth/useLogout';
import { cn } from '@/lib/cn';
import { MAIN_NAV } from './navigation';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-colors',
    isActive ? 'bg-primary/12 text-primary' : 'text-muted hover:bg-elevated hover:text-fg',
  );

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { status, isStaff, isAdmin, profile } = useAuth();
  const { requestLogout, logoutDialog } = useLogout();

  return (
    <>
      <Drawer open={open} onClose={onClose} title="Menu">
        <nav aria-label="Menu principal" className="flex flex-col gap-1 p-3">
          {MAIN_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mx-5 border-t border-line" />
        <nav aria-label="Conta" className="flex flex-col gap-1 p-3">
          {status === 'authenticated' ? (
            <>
              {profile?.fullName && (
                <p className="px-4 pt-1 pb-2 text-sm text-subtle">Olá, {profile.fullName}</p>
              )}
              <NavLink to="/conta" className={linkClass}>
                <User className="size-5" aria-hidden="true" /> Minha conta
              </NavLink>
              {isStaff && (
                <NavLink to="/cozinha" className={linkClass}>
                  <ChefHat className="size-5" aria-hidden="true" /> Painel da cozinha
                </NavLink>
              )}
              {isAdmin && (
                <NavLink to="/admin" className={linkClass}>
                  <LayoutDashboard className="size-5" aria-hidden="true" /> Administração
                </NavLink>
              )}
              <button
                type="button"
                className={linkClass({ isActive: false })}
                onClick={() => {
                  onClose();
                  requestLogout();
                }}
              >
                <LogOut className="size-5" aria-hidden="true" /> Sair
              </button>
            </>
          ) : (
            <>
              <NavLink to="/entrar" className={linkClass}>
                <LogIn className="size-5" aria-hidden="true" /> Entrar
              </NavLink>
              <NavLink to="/cadastro" className={linkClass}>
                <UserPlus className="size-5" aria-hidden="true" /> Criar conta
              </NavLink>
            </>
          )}
        </nav>
      </Drawer>
      {logoutDialog}
    </>
  );
}
