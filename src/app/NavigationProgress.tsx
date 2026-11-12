import { useNavigation } from 'react-router';

/** Barra discreta no topo enquanto o código de uma rota é carregado. */
export function NavigationProgress() {
  const navigation = useNavigation();
  if (navigation.state === 'idle') return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[80] h-0.5 overflow-hidden" aria-hidden="true">
      <div className="h-full w-1/3 animate-[shimmer_1.2s_ease-in-out_infinite] bg-linear-to-r from-transparent via-primary to-transparent bg-[length:200%_100%]" />
    </div>
  );
}
