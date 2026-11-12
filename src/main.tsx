import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/index.css';
import { ConfigErrorScreen } from '@/app/ConfigErrorScreen';
import { envResult } from '@/lib/env';

const root = createRoot(document.getElementById('root')!);

if (!envResult.ok) {
  root.render(<ConfigErrorScreen problems={envResult.problems} />);
} else {
  // Carregado só com a configuração válida (o cliente Supabase depende dela).
  const { App } = await import('@/app/App');
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
