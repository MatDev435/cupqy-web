/** Canal simples para a camada HTTP avisar a UI que a sessão deixou de ser válida. */
type Listener = (code: string) => void;

const listeners = new Set<Listener>();

export function onSessionInvalid(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitSessionInvalid(code: string) {
  for (const listener of listeners) listener(code);
}
