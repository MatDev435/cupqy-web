/**
 * Exibida quando as variáveis de ambiente públicas estão ausentes/inválidas.
 * Não importa nada que dependa da configuração (ex.: cliente Supabase).
 */
export function ConfigErrorScreen({ problems }: { problems: string[] }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-2xl border border-danger/40 bg-surface p-8 shadow-pop">
        <h1 className="font-display text-2xl font-semibold text-fg">Configuração incompleta</h1>
        <p className="mt-2 text-muted">
          O Cupqy Web não encontrou as variáveis de ambiente necessárias. Copie{' '}
          <code className="rounded bg-elevated px-1.5 py-0.5 text-sm text-primary">
            .env.example
          </code>{' '}
          para <code className="rounded bg-elevated px-1.5 py-0.5 text-sm text-primary">.env</code>,
          preencha os valores e reinicie o servidor.
        </p>
        <ul className="mt-5 list-disc space-y-1.5 pl-5 text-sm text-danger-fg">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      </div>
    </main>
  );
}
