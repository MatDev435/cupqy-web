import { isAuthError } from '@supabase/supabase-js';

/** Traduz erros do Supabase Auth para mensagens em português, sem revelar dados sensíveis. */
export function authErrorMessage(
  error: unknown,
  context: 'signin' | 'signup' | 'reset' | 'update',
) {
  if (!isAuthError(error)) {
    return 'Não foi possível conectar. Verifique sua conexão e tente novamente.';
  }
  const code = error.code ?? '';
  const status = error.status ?? 0;

  if (code === 'invalid_credentials' || (context === 'signin' && status === 400)) {
    // US02 CA#04: mensagem genérica, sem indicar qual dado está errado.
    return 'E-mail ou senha inválidos.';
  }
  if (code === 'email_not_confirmed') {
    return 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.';
  }
  if (code === 'user_already_exists' || code === 'email_exists') {
    return 'Já existe uma conta com este e-mail. Entre ou recupere sua senha.';
  }
  if (code === 'weak_password') {
    return 'Senha fraca: use ao menos 8 caracteres, com letras e números.';
  }
  if (code === 'same_password') {
    return 'A nova senha deve ser diferente da atual.';
  }
  if (code === 'captcha_failed') {
    return 'A verificação de segurança falhou. Tente novamente.';
  }
  if (code === 'over_email_send_rate_limit') {
    return 'Muitos e-mails enviados. Aguarde alguns minutos e tente novamente.';
  }
  if (code === 'over_request_rate_limit' || status === 429) {
    return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  }
  if (
    code === 'session_not_found' ||
    code === 'session_expired' ||
    code === 'refresh_token_not_found'
  ) {
    return 'Sua sessão expirou. Solicite um novo link ou entre novamente.';
  }
  if (code === 'signup_disabled') {
    return 'O cadastro está temporariamente desativado.';
  }
  if (status >= 500 || status === 0) {
    return 'O serviço de autenticação está indisponível. Tente novamente em instantes.';
  }
  return context === 'signup'
    ? 'Não foi possível concluir o cadastro. Revise os dados e tente novamente.'
    : 'Não foi possível concluir a operação. Tente novamente.';
}
