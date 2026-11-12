# Planejamento técnico — Cupqy Web

Este documento consolida a análise dos três materiais de referência (brand board, documento com as
17 User Stories e contrato OpenAPI do `cupqy-server`) e define como o front-end foi organizado.

> As decisões atualizadas do projeto (Supabase Auth, recuperação por link, Checkout Pro, Pix de 30
> minutos, Realtime em vez de push, frete por distância em linha reta) **prevalecem** sobre o
> documento original de User Stories.

## 1. Inventário de telas e endpoints

Prefixo da API: `/api/v1`. 🔒 = exige `Authorization: Bearer <access_token do Supabase>`.

### Loja (público)

| Tela                | Rota            | Endpoints                                                                                                                            | US         |
| ------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| Página inicial      | `/`             | `GET /cupcakes` (destaques), `GET /categories`, `GET /store`                                                                         | —          |
| Catálogo            | `/cupcakes`     | `GET /cupcakes` (search, category, flavor, dietaryTags, sort, page), `GET /cupcakes/flavors`, `GET /categories`, `GET /dietary-tags` | US06       |
| Categorias          | `/categorias`   | `GET /categories`                                                                                                                    | US06       |
| Detalhes do cupcake | `/cupcakes/:id` | `GET /cupcakes/:id` + Realtime `daily_stock`                                                                                         | US07       |
| Carrinho            | `/carrinho`     | `POST /cart/validate` (público), `POST /orders/:id/reorder` 🔒 (origem "repetir pedido")                                             | US08, US12 |

### Autenticação (Supabase Auth direto pelo SDK)

| Tela            | Rota               | Integração                                                            | US          |
| --------------- | ------------------ | --------------------------------------------------------------------- | ----------- |
| Login           | `/entrar`          | `supabase.auth.signInWithPassword` → `GET /users/me` 🔒 (papel)       | US02        |
| Cadastro        | `/cadastro`        | `supabase.auth.signUp({ options: { data: { full_name, phone } } })`   | US01        |
| Esqueci a senha | `/esqueci-senha`   | `supabase.auth.resetPasswordForEmail(email, { redirectTo })`          | US05 (novo) |
| Redefinir senha | `/redefinir-senha` | evento `PASSWORD_RECOVERY` + `supabase.auth.updateUser({ password })` | US05 (novo) |
| Logout          | (menu da conta)    | `supabase.auth.signOut()` + limpeza do cache                          | US03        |

### Área do cliente 🔒

| Tela                      | Rota                | Endpoints                                                                                                                                                                        | US         |
| ------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Minha conta (dados)       | `/conta`            | `GET/PATCH /users/me`, `supabase.auth.updateUser({ password })`                                                                                                                  | US01, US02 |
| Endereços                 | `/conta/enderecos`  | `GET/POST /users/me/addresses`, `PATCH/DELETE /users/me/addresses/:id`, `GET /shipping/cep/:cep`                                                                                 | US09       |
| Excluir conta             | `/conta` (modal)    | `DELETE /users/me` (`{ password }`)                                                                                                                                              | US04       |
| Checkout                  | `/checkout`         | `POST /cart/validate`, `GET /store`, `GET /users/me/addresses`, `GET /shipping/cep/:cep`, `POST /shipping/quote`, `POST /orders`                                                 | US08–US10  |
| Meus pedidos              | `/pedidos`          | `GET /orders?scope=active\|history\|all&page=`                                                                                                                                   | US12       |
| Acompanhamento / detalhes | `/pedidos/:orderId` | `GET /orders/:id`, `POST /orders/:id/payment/sync`, `POST /orders/:id/payment`, `POST /orders/:id/cancel`, `POST /orders/:id/reorder` + Realtime `orders`/`order_status_history` | US10–US12  |

### Cozinha 🔒 (BAKER, ADMIN)

| Tela              | Rota       | Endpoints                                                                                              | US         |
| ----------------- | ---------- | ------------------------------------------------------------------------------------------------------ | ---------- |
| Painel da cozinha | `/cozinha` | `GET /kitchen/orders?status=&fulfillmentType=`, `POST /kitchen/orders/:id/advance` + Realtime `orders` | US13, US14 |

### Administração 🔒 (ADMIN)

| Tela                   | Rota                                          | Endpoints                                                                                                                     | US   |
| ---------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---- |
| Dashboard financeiro   | `/admin`                                      | `GET /admin/dashboard?period=today\|week\|month`                                                                              | US16 |
| Produtos               | `/admin/cupcakes`                             | `GET /admin/cupcakes`, `DELETE /admin/cupcakes/:id`                                                                           | US15 |
| Novo / editar cupcake  | `/admin/cupcakes/novo`, `/admin/cupcakes/:id` | `POST/GET/PATCH /admin/cupcakes(/:id)`, `GET /admin/categories`, `GET /admin/dietary-tags`                                    | US15 |
| Foto do cupcake        | (no formulário)                               | `POST /admin/cupcakes/:id/image/upload-url` → Storage `uploadToSignedUrl` → `PUT /admin/cupcakes/:id/image`; `DELETE …/image` | US15 |
| Categorias             | `/admin/categorias`                           | `GET/POST /admin/categories`, `PATCH/DELETE /admin/categories/:id`                                                            | US15 |
| Restrições alimentares | `/admin/restricoes`                           | `GET/POST /admin/dietary-tags`, `PATCH/DELETE /admin/dietary-tags/:id`                                                        | US15 |
| Estoque diário         | `/admin/estoque`                              | `GET /admin/stock?date=`, `GET /admin/stock/alerts`, `PUT /admin/stock`, `PUT /admin/stock/:cupcakeId`                        | US17 |
| Pedidos                | `/admin/pedidos`, `/admin/pedidos/:id`        | `GET /admin/orders`, `GET /admin/orders/:id`, `POST /admin/orders/:id/cancel`                                                 | —    |
| Usuários e papéis      | `/admin/usuarios`                             | `GET /admin/users`, `PATCH /admin/users/:id/role`                                                                             | —    |

## 2. Fluxos de navegação

```
Visitante ─► Home ─► Catálogo ─► Detalhes ─► (adiciona) ─► Carrinho ─► Checkout
                                                                  │ (sem sessão)
                                                                  └─► /entrar?redirect=/checkout ─► Checkout

Checkout ─► POST /orders ─► redireciona para checkoutUrl (Mercado Pago)
        ◄── Mercado Pago volta para /pedidos/:id?pagamento=sucesso|pendente|falha
/pedidos/:id ─► POST /orders/:id/payment/sync ─► exibe o status CONFIRMADO PELO SERVIDOR
            ─► Realtime (orders/order_status_history) ou polling ─► linha do tempo atualizada

Cadastro ─► (confirmação de e-mail ativa) tela "verifique seu e-mail" ─► link ─► Home autenticado
Esqueci a senha ─► e-mail (Resend) ─► /redefinir-senha ─► nova senha ─► /entrar (mensagem de sucesso)

Login ─► GET /users/me ─► CUSTOMER: loja │ BAKER: loja + /cozinha │ ADMIN: loja + /cozinha + /admin
```

## 3. Arquitetura do front-end

```
src/
├── api/            # Camada HTTP centralizada + funções por domínio + tipos
│   ├── http.ts     # URL base, serialização, token, erros (ApiError), timeout
│   ├── generated/  # Tipos gerados do OpenAPI (corpos e query strings)
│   └── *.ts        # catalog, cart, orders, profile, kitchen, admin…
├── app/            # Providers, roteador, layouts e páginas de erro
├── components/
│   ├── ui/         # Design system (Button, Input, Modal, Toast, Badge, Skeleton…)
│   ├── brand/      # Logo e ilustrações
│   └── layout/     # Header, Footer, navegação móvel
├── features/       # Módulos por domínio (páginas, componentes e hooks)
│   ├── auth/  catalog/  cart/  checkout/  orders/  account/  kitchen/  admin/
├── lib/            # env, supabase, realtime, formatação, utilitários
├── styles/         # Tokens (Tailwind v4 @theme) e estilos base
└── test/           # Setup do Vitest, MSW e utilitários de renderização
```

### Gerenciamento de estado

| Tipo de estado                  | Solução                                                                          |
| ------------------------------- | -------------------------------------------------------------------------------- |
| Estado do servidor (API)        | TanStack Query (cache, revalidação, mutações, invalidação)                       |
| Sessão / usuário                | Contexto `AuthProvider` sobre `supabase.auth` + `GET /users/me`                  |
| Carrinho                        | Contexto + reducer, persistido no `localStorage` e sincronizado entre abas       |
| Filtros do catálogo e paginação | Query string da URL (compartilhável, preserva o "voltar")                        |
| Formulários                     | React Hook Form + Zod                                                            |
| Tempo real                      | Supabase Realtime como **gatilho** de invalidação de queries (fallback: polling) |

### Integração com Supabase Auth

1. `supabase-js` gerencia sessão, persistência e renovação automática do token.
2. A camada HTTP obtém o token com `supabase.auth.getSession()` e envia `Authorization: Bearer`.
3. Em `401`, tenta **uma** renovação (`refreshSession`) e repete a requisição; se falhar, encerra a
   sessão local e redireciona ao login.
4. O papel vem **sempre** de `GET /users/me` (lido do banco pela API). O React só usa o papel para
   decidir o que exibir; a autorização real é feita pela API.
5. `403 ACCOUNT_DELETED` encerra a sessão local.

## 4. Sistema de design

- Tokens em `src/styles/index.css` (`@theme` do Tailwind v4): paleta Dark Premium da brand board,
  tipografia (Playfair Display + Inter, auto-hospedadas via Fontsource), raios, sombras e animações.
- A paleta padrão do Tailwind é desativada (`--color-*: initial`), obrigando o uso dos tokens.
- Componentes acessíveis e reutilizáveis em `src/components/ui`.

## 5. Plano de testes

| Camada            | Ferramenta                     | O que cobre                                                                                                                        |
| ----------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Unitários         | Vitest                         | Formatação, validações Zod, reducer do carrinho, regras de apresentação                                                            |
| Componentes       | Vitest + Testing Library       | Design system, formulários, estados de carregamento/erro/vazio                                                                     |
| Integração        | Vitest + Testing Library + MSW | Páginas completas com camada HTTP real e API simulada; guards por papel                                                            |
| E2E (CI)          | Playwright + API simulada      | Jornadas completas (cadastro, login, catálogo, carrinho, checkout, cozinha, admin) com rotas interceptadas — sem serviços externos |
| E2E (homologação) | Playwright (`e2e:hml`)         | Smoke tests contra Express local + Supabase `cupqy-hml` + Mercado Pago sandbox, com usuários controlados                           |

## 6. Incompatibilidades entre as User Stories e a API

| Item                                                                               | Origem      | Situação no front-end                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Captcha após 3 tentativas de login (US02 CA#05)                                    | US02        | A API não participa do login. O Supabase Auth oferece captcha (hCaptcha/Turnstile) **em todas as tentativas** quando habilitado no projeto. Pendente: integrar o widget quando o provedor for escolhido (exige chave de site pública). |
| Access Token de 20 min / Refresh de 7 dias em cookie HttpOnly (US02 RN#02, RNF#01) | US02        | Substituído pelo Supabase Auth: a duração é configurada no projeto Supabase e o `supabase-js` persiste a sessão no `localStorage`.                                                                                                     |
| Código de 6 dígitos para recuperação (US05)                                        | US05        | Substituído pelo link seguro do Supabase Auth (decisão atualizada).                                                                                                                                                                    |
| Formulário de cartão, salvar cartão, QR Code Pix próprio (US10)                    | US10        | Substituídos pelo Checkout Pro (cartões e Pix tratados pelo Mercado Pago). Pix com prazo de 30 minutos.                                                                                                                                |
| Notificações push (US11, US14 CA#04)                                               | US11/US14   | Fora do escopo atual; acompanhamento via Supabase Realtime.                                                                                                                                                                            |
| Filtro do histórico por período (backlog da US12)                                  | US12        | `GET /orders` só aceita `scope` (`active`, `history`, `all`). Implementado o filtro por escopo; filtro por período **não suportado pela API**.                                                                                         |
| Favoritos (ícone de coração na brand board)                                        | Brand board | Não há User Story nem endpoint. **Não implementado** para não criar botões fictícios.                                                                                                                                                  |
| Avaliações, cupons, carrossel de várias fotos (US07 backlog)                       | US07        | A API guarda **uma** foto por cupcake (`imageUrl`). Exibida em destaque, sem carrossel.                                                                                                                                                |
| Vibração no seletor de quantidade (US07 RNF#01)                                    | US07        | Implementado com `navigator.vibrate` quando suportado.                                                                                                                                                                                 |
