import { getErrorMessage } from '@/api/errors';
import { ErrorState, LoadingState } from '@/components/ui';
import { useAuth } from '@/features/auth/authContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { AccountLayout } from '../components/AccountLayout';
import { ChangePasswordCard } from '../components/ChangePasswordCard';
import { DeleteAccountCard } from '../components/DeleteAccountCard';
import { ProfileCard } from '../components/ProfileCard';

export function AccountPage() {
  useDocumentTitle('Minha conta');
  const { profile, profileStatus, profileError, refreshProfile } = useAuth();

  return (
    <AccountLayout title="Meus dados" description="Gerencie seus dados pessoais e sua segurança.">
      {profileStatus === 'error' ? (
        <ErrorState message={getErrorMessage(profileError)} onRetry={() => void refreshProfile()} />
      ) : !profile ? (
        <LoadingState label="Carregando seus dados…" />
      ) : (
        <>
          <ProfileCard key={profile.updatedAt} profile={profile} />
          <ChangePasswordCard />
          <DeleteAccountCard />
        </>
      )}
    </AccountLayout>
  );
}
