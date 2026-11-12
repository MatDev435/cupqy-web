/** Redireciona para um site externo (ex.: Checkout Pro do Mercado Pago). Isolado para testes. */
export function redirectTo(url: string) {
  window.location.assign(url);
}
