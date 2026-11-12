# Cupqy Web

[![CI](https://github.com/MatDev435/cupqy-web/actions/workflows/ci.yml/badge.svg)](https://github.com/MatDev435/cupqy-web/actions/workflows/ci.yml)

Front-end do **Cupqy**, e-commerce de uma confeitaria artesanal de cupcakes. Loja (catálogo,
carrinho, checkout com Mercado Pago e acompanhamento de pedidos em tempo real), **painel da
cozinha** para confeiteiros e **painel administrativo** completo, com a identidade visual
**Dark Premium** da brand board.

O back-end (API REST em Node.js + Express) fica no repositório
[`MatDev435/cupqy-server`](https://github.com/MatDev435/cupqy-server). Este projeto consome a API
existente e o Supabase (Auth, Realtime e Storage) — não há um segundo back-end.

> Planejamento técnico (telas × endpoints, fluxos e incompatibilidades com as User Stories):
> [`docs/PLANNING.md`](docs/PLANNING.md) · Roadmap: [`docs/ROADMAP.md`](docs/ROADMAP.md) ·
> Decisões: [`docs/DECISIONS.md`](docs/DECISIONS.md)

---

## Status do projeto

### ✅ Concluído

| Área              | O que foi entregue                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------------------- |
| Fundação          | Vite 8 + React 19 + TypeScript 7, oxlint, Prettier, Vitest, tipos gerados do OpenAPI                 |
| Sistema de design | Tokens Dark Premium, fontes auto-hospedadas, 20+ componentes acessíveis                              |
| Infraestrutura    | Camada HTTP centralizada, ambiente validado (recusa chaves secretas), TanStack Query                 |
| Autenticação      | Cadastro, login, logout com confirmação, recuperação por link, redefinição, guards por papel         |
| Vitrine           | Home, catálogo (busca, filtros, ordenação, paginação na URL), categorias, detalhes, estoque ao vivo  |
| Carrinho          | Persistência local, validação no servidor, ajustes de estoque, repetir pedido                        |
| Conta             | Perfil, endereços com CEP, troca de senha, exclusão de conta (LGPD)                                  |
| Checkout          | Entrega/retirada, cotação de frete, criação do pedido, Checkout Pro (sandbox)                        |
| Pedidos           | Histórico, acompanhamento em tempo real, retorno do pagamento (sync), novo link, cancelamento        |
| Cozinha           | Fila em tempo real, filtros, avanço de etapas com controle otimista, nome do entregador              |
| Admin             | Dashboard financeiro, cupcakes + fotos (Storage), categorias, restrições, estoque, pedidos, usuários |
| Qualidade         | 176 testes unitários/integração, 14 cenários E2E (incl. auditoria axe WCAG 2.1 AA), CI no GitHub     |
| Deploy            | `vercel.json` (SPA, cache, cabeçalhos de segurança) — **deploy ainda não realizado**                 |

### ⏳ Pendente / depende de decisões externas

| Item                                | Situação                                                                                                                                                                                              |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Deploy na Vercel**                | Preparado, aguardando autorização. Ver [Deploy na Vercel](#deploy-na-vercel).                                                                                                                         |
| **Testes reais em homologação**     | A suíte `npm run e2e:hml` está pronta, mas ainda não foi executada: requer `.env` do projeto Supabase `cupqy-hml`, a API local e usuários de teste controlados.                                       |
| **Captcha no login (US02 CA#05)**   | O Supabase Auth suporta hCaptcha/Turnstile (em todas as tentativas). Falta escolher o provedor e a chave pública do site para integrar o widget e enviar `captchaToken`.                              |
| **Supabase Realtime em produção**   | Implementado e com fallback de polling. Requer `supabase/sql/02_realtime.sql` (e as políticas de `01_security.sql`) aplicados no projeto — ver [Configuração do Supabase](#configuração-do-supabase). |
| **Favoritos**                       | Aparecem na brand board, mas não há User Story nem endpoint na API. Não implementado (sem botões fictícios).                                                                                          |
| **Filtro do histórico por período** | A API de pedidos do cliente só aceita `scope`; implementado o filtro por escopo.                                                                                                                      |
| **Notificações push**               | Fora do escopo atual (decisão do projeto); o acompanhamento usa Realtime.                                                                                                                             |

### 🔜 Próximos passos sugeridos

1. Criar o `.env` com o projeto `cupqy-hml`, subir a API local e rodar `npm run e2e:hml`.
2. Configurar as URLs de redirecionamento do Supabase Auth e os templates de e-mail (Resend).
3. Autorizar o deploy na Vercel e ajustar `CORS_ORIGINS`/`FRONTEND_URL` da API no Render.
4. Escolher o provedor de captcha e integrá-lo ao login/cadastro.
5. Fazer uma bateria de compras no sandbox do Mercado Pago (aprovado, pendente, recusado, Pix).

---

## Tecnologias

| Camada                           | Tecnologia                                                                               |
| -------------------------------- | ---------------------------------------------------------------------------------------- |
| Base                             | React 19, TypeScript 7, Vite 8 (Rolldown)                                                |
| Roteamento                       | React Router 8 (modo data, rotas com carregamento sob demanda)                           |
| Estado do servidor               | TanStack Query 5                                                                         |
| Formulários                      | React Hook Form + Zod 4                                                                  |
| Estilo                           | Tailwind CSS 4 com tokens próprios (`@theme`), Lucide React (ícones de contorno)         |
| Tipografia                       | Playfair Display + Inter (Fontsource, auto-hospedadas)                                   |
| Gráficos                         | Recharts (somente no dashboard, carregado sob demanda)                                   |
| Autenticação, Realtime e Storage | `@supabase/supabase-js` (chave pública)                                                  |
| Pagamentos                       | Mercado Pago Checkout Pro (página hospedada; nenhum dado de cartão passa pelo front-end) |
| Testes                           | Vitest, Testing Library, MSW, Playwright, axe-core                                       |
| Qualidade                        | oxlint (inclui `jsx-a11y` e regras no estilo React Compiler), Prettier                   |
| Hospedagem                       | Vercel                                                                                   |

## Estrutura do projeto

```
.
├── docs/                    # Planejamento, roadmap e decisões técnicas
├── e2e/
│   ├── specs/               # E2E da CI (back-end simulado)
│   ├── hml/                 # Smoke tests reais contra homologação
│   └── support/             # Back-end simulado (API, Supabase, Mercado Pago) e fixtures
├── openapi/openapi.json     # Snapshot do contrato da API (gerado a partir do cupqy-server)
├── public/                  # favicon, robots.txt
├── scripts/                 # sync-openapi.mjs
└── src/
    ├── api/                 # Camada HTTP, funções por domínio, tipos e query keys
    │   └── generated/       # Tipos gerados do OpenAPI (npm run api:types)
    ├── app/                 # App, roteador, providers, layouts (loja e áreas internas)
    ├── assets/brand/        # Fotos recortadas da brand board
    ├── components/
    │   ├── ui/              # Design system
    │   ├── brand/           # Logo e imagem de cupcake com placeholder
    │   └── layout/          # Cabeçalho, menu móvel, menu da conta, rodapé
    ├── features/            # Módulos por domínio
    │   ├── auth/  catalog/  cart/  checkout/  orders/  account/  kitchen/
    │   └── admin/           # dashboard, catalog (cupcakes, fotos, taxonomias), stock, orders, users
    ├── hooks/               # Realtime, debounce, título da página, relógio
    ├── lib/                 # env, supabase, formatação, utilitários
    ├── styles/index.css     # Tokens e estilos base
    └── test/                # Setup do Vitest, MSW, fixtures e render com providers
```

## Arquitetura

```
Componentes ──► hooks de feature (TanStack Query) ──► src/api/*.ts ──► src/api/http.ts ──► API Express
                     ▲                                                      │
                     │ invalidação                                          └─ Authorization: Bearer <token Supabase>
Supabase Realtime ───┘ (gatilho)            supabase-js ──► Supabase Auth / Storage
```

- **Camada HTTP única** (`src/api/http.ts`): URL base por `VITE_API_BASE_URL`, prefixo `/api/v1`,
  serialização de query string, token do Supabase, **uma renovação** do token em caso de `401`,
  erros padronizados (`ApiError` com `code`, `message`, `details`, `requestId`), tempo limite de 45 s
  (a instância gratuita do Render pode demorar para acordar) e tratamento de falhas de rede.
- **Funções por domínio** (`src/api/catalog.ts`, `orders.ts`, `admin.ts`…): nenhum componente monta
  URLs.
- **Tipos**: corpos e query strings vêm do contrato OpenAPI gerado a partir dos validators Zod da API
  (`src/api/contract.ts`); as respostas são tipadas em `src/api/types.ts` seguindo as _views_ do
  back-end (o contrato não marca campos de resposta como obrigatórios).
- **Estado**: TanStack Query para dados do servidor; contextos para sessão (`AuthProvider`) e carrinho
  (`CartProvider`, persistido no `localStorage`); filtros e paginação na URL.
- **Regras de negócio críticas ficam na API**: preços, frete, totais, estoque, transições de status e
  permissões. O front-end só apresenta os valores devolvidos pelo servidor.
- **Rotas com code splitting**: cada página é carregada sob demanda; o gráfico do dashboard
  (Recharts) só é baixado por administradores.

### Rotas

| Rota                                                                                  | Acesso         | Tela                                   |
| ------------------------------------------------------------------------------------- | -------------- | -------------------------------------- |
| `/`                                                                                   | público        | Home                                   |
| `/cupcakes`, `/cupcakes/:id`, `/categorias`                                           | público        | Catálogo, detalhes, categorias         |
| `/carrinho`                                                                           | público        | Carrinho                               |
| `/entrar`, `/cadastro`, `/esqueci-senha`                                              | visitantes     | Autenticação                           |
| `/redefinir-senha`                                                                    | link do e-mail | Nova senha                             |
| `/checkout`, `/pedidos`, `/pedidos/:orderId`                                          | autenticado    | Checkout, histórico e acompanhamento   |
| `/conta`, `/conta/enderecos`                                                          | autenticado    | Dados, segurança, exclusão e endereços |
| `/cozinha`                                                                            | BAKER, ADMIN   | Painel da cozinha                      |
| `/admin` (+ `pedidos`, `cupcakes`, `estoque`, `categorias`, `restricoes`, `usuarios`) | ADMIN          | Administração                          |

## Sistema de design

Os tokens estão em [`src/styles/index.css`](src/styles/index.css) (Tailwind v4 `@theme`). A paleta
padrão do Tailwind é desativada para garantir que só as cores da marca sejam usadas.

| Token                            | Valor                             | Uso                                           |
| -------------------------------- | --------------------------------- | --------------------------------------------- |
| `canvas`                         | `#0D0B10`                         | Fundo                                         |
| `surface`                        | `#1A1720`                         | Superfícies                                   |
| `elevated`                       | `#26222E`                         | Superfícies elevadas                          |
| `primary`                        | `#E9A6BD`                         | Ações e destaques                             |
| `secondary`                      | `#B99AF7`                         | Informação, restrições alimentares            |
| `fg` / `muted`                   | `#F5EEE9` / `#B9B4BF`             | Texto principal / secundário                  |
| `success` / `warning` / `danger` | `#22C55E` / `#F59E0B` / `#EF4444` | Feedback (com variações `*-fg` para texto AA) |

- **Tipografia:** Playfair Display (títulos) e Inter (interface).
- **Componentes** (`src/components/ui`): Button/ButtonLink, Input, Textarea, Select, Field (rótulo,
  dica e erro associados), Checkbox, Switch, Modal e ConfirmDialog (`<dialog>` nativo), Drawer,
  Toast (regiões `aria-live`), Alert, Badge, Chip, Card, Skeleton, EmptyState, ErrorState, Spinner,
  LoadingState, Pagination, QuantityStepper, SegmentedControl e PageHeader.
- **Acessibilidade:** HTML semântico, link "Pular para o conteúdo", foco visível, rótulos e erros
  associados (`aria-describedby`/`aria-invalid`), diálogos com foco preso e retorno de foco,
  anúncio de troca de rota, status sempre com texto além da cor, `prefers-reduced-motion`, auditoria
  automática com axe-core na CI.

## Instalação

Pré-requisitos: **Node.js 22.22+** (recomendado 24, ver `.nvmrc`) e npm 10+.

```bash
git clone https://github.com/MatDev435/cupqy-web.git
cd cupqy-web
npm install
cp .env.example .env      # preencha os valores (ver abaixo)
npm run dev               # http://localhost:5173
```

Para desenvolver contra a API local, suba o `cupqy-server` (porta padrão **3333**) com
`CORS_ORIGINS=http://localhost:5173` e `FRONTEND_URL=http://localhost:5173`.

## Variáveis de ambiente

| Variável                        | Obrigatória | Descrição                                                                                                                                |
| ------------------------------- | :---------: | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`             |     ✅      | URL base da API, sem `/api/v1` (ex.: `http://localhost:3333` ou `https://cupqy-api.onrender.com`)                                        |
| `VITE_SUPABASE_URL`             |     ✅      | URL do projeto Supabase (use `cupqy-hml` em desenvolvimento)                                                                             |
| `VITE_SUPABASE_PUBLISHABLE_KEY` |     ✅      | Chave **pública** (`sb_publishable_…`). Projetos antigos podem usar a chave legada `anon` (também aceita como `VITE_SUPABASE_ANON_KEY`). |
| `VITE_APP_URL`                  |      —      | URL pública do front-end para os links de e-mail; padrão: a origem atual                                                                 |

> Variáveis `VITE_*` são **públicas** (vão para o JavaScript do navegador). Nunca coloque nelas a
> service_role/secret key do Supabase, senhas de banco, credenciais do Mercado Pago, chaves do Resend
> ou segredos de webhook. A aplicação **recusa iniciar** se detectar uma chave secreta do Supabase.
> Se alguma variável faltar, uma tela de "Configuração incompleta" explica o que corrigir.

## Configuração do Supabase

No projeto Supabase (homologação `cupqy-hml` e produção):

1. **Authentication → URL Configuration**
   - _Site URL_: URL do front-end (ex.: `https://cupqy.vercel.app`).
   - _Redirect URLs_: `http://localhost:5173/**`, `https://cupqy.vercel.app/**` e, para previews,
     `https://cupqy-*.vercel.app/**`.
2. **Provedor de e-mail** com confirmação ativada; política de senha com mínimo de 8 caracteres,
   letras e dígitos (US01 RN#02).
3. **SMTP personalizado (Resend)** e templates em português de _Confirm signup_ e _Reset password_
   (passo a passo no README do `cupqy-server`).
4. **SQL do back-end** (`npm run db:supabase` no `cupqy-server`): políticas RLS de leitura usadas pelo
   Realtime, trigger que cria o perfil como `CUSTOMER` e a publicação das tabelas `orders`,
   `order_status_history` e `daily_stock`.
5. **Storage**: bucket público de leitura criado por `npm run storage:setup` no `cupqy-server`.

## Integração com a API

- Respostas de sucesso chegam como `{ data }` (listas paginadas com `meta`); erros como
  `{ error: { code, message, details? }, requestId }`. As mensagens da API são exibidas ao usuário e
  os códigos (`CART_UNAVAILABLE`, `LAST_ADMIN`, `ORDER_STATUS_CHANGED`…) ajustam o comportamento.
- Valores monetários são **centavos** em toda a API; o front-end apenas formata (`formatMoney`).
- **Atualizar o contrato** quando a API mudar:

  ```bash
  OPENAPI_URL=http://localhost:3333/api/docs/openapi.json npm run api:sync   # snapshot + tipos
  npm run typecheck                                                          # aponta divergências
  ```

## Autenticação

O front-end usa o SDK do Supabase diretamente; a API apenas valida o token e o papel.

| Fluxo       | Implementação                                                                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cadastro    | `signUp` com `full_name` e `phone` em `options.data`; sem confirmação ativa entra direto, com confirmação mostra "Confirme seu e-mail" (com reenvio) |
| Login       | `signInWithPassword` → `GET /users/me` (papel) → volta ao destino (`?redirect=`) ou à área do papel                                                  |
| Sessão      | persistida pelo SDK, renovação automática, restaurada ao recarregar                                                                                  |
| Requisições | `Authorization: Bearer <access_token>`; `401` renova uma vez; persistindo, a sessão local é encerrada                                                |
| Logout      | confirmação, `signOut` (revoga a sessão), limpeza do cache e `replace` para a home                                                                   |
| Recuperação | `resetPasswordForEmail` com `redirectTo=/redefinir-senha`; mensagem idêntica exista ou não a conta                                                   |
| Redefinição | evento `PASSWORD_RECOVERY` → `updateUser({ password })`; trata link inválido/expirado (`otp_expired`)                                                |
| Papéis      | lidos **somente** de `GET /users/me`; o cadastro sempre cria `CUSTOMER`                                                                              |

## Upload de imagens

Fluxo de URL assinada, sem o arquivo passar pelo Express:

1. Validação no navegador (JPG/PNG/WebP, até 5 MB) e pré-visualização.
2. `POST /admin/cupcakes/:id/image/upload-url` → `bucket`, `path`, `token`.
3. `supabase.storage.from(bucket).uploadToSignedUrl(path, token, file)` direto ao Storage.
4. `PUT /admin/cupcakes/:id/image` confirma e vincula (substituindo a foto anterior).

A interface mostra o progresso por etapas (autorizar → enviar → confirmar), já que o SDK não expõe o
progresso de bytes. A foto pode ser removida (`DELETE …/image`).

## Pagamentos (Mercado Pago Checkout Pro)

1. O checkout envia itens, entrega/retirada, endereço e observações para `POST /orders`.
2. A API cria o pedido (`AWAITING_PAYMENT`) e a preferência; o front-end redireciona para
   `checkout.checkoutUrl` (Pix ou cartão no ambiente do Mercado Pago). O carrinho é esvaziado.
3. O Mercado Pago devolve o cliente para `/pedidos/:id?pagamento=sucesso|pendente|falha&payment_id=…`.
4. A página chama `POST /orders/:id/payment/sync` e **exibe sempre o estado confirmado pelo servidor**
   — o parâmetro da URL nunca é tratado como pagamento aprovado. Os parâmetros são removidos da URL.
5. Pagamento recusado/pendente: botão para gerar novo link (`POST /orders/:id/payment`) enquanto o
   prazo (30 minutos, alinhado ao Pix) não expira; o cliente também pode cancelar o pedido.

Todo o desenvolvimento usa o **sandbox** (credenciais de teste no back-end). O Cupqy não armazena
dados de cartão; salvar cartões, quando disponível, é responsabilidade do próprio Checkout Pro.

## Tempo real

`useRealtimeInvalidation` assina `postgres_changes` do Supabase Realtime e usa cada evento apenas
como **gatilho** para buscar os dados de novo na API (as políticas RLS limitam os eventos ao que cada
usuário pode ver):

- acompanhamento do pedido: `orders` (filtro `id=eq.<id>`) e `order_status_history`;
- painel da cozinha: `orders`;
- catálogo, detalhes e carrinho: `daily_stock` ("Esgotado" em tempo real).

Se o Realtime não estiver configurado ou cair, as telas fazem **polling** (10–30 s) e oferecem botão
de atualização manual.

## Testes

```bash
npm test                  # unitários + integração (Vitest)
npm run test:unit         # componentes, hooks, schemas, utilitários
npm run test:integration  # páginas completas com camada HTTP real e API simulada (MSW)
npm run test:coverage     # cobertura (coverage/)
npm run e2e               # Playwright com back-end simulado (como na CI)
npm run e2e:hml           # smoke tests reais em homologação (ver abaixo)
```

- **Unitários/componentes** (`*.test.ts(x)`): design system, formulários e validações, carrinho,
  formatação, parâmetros do catálogo, guards de rota e renderização por papel.
- **Integração** (`*.int.test.tsx`): telas completas com TanStack Query, roteador e camada HTTP real,
  com a API simulada pelo MSW (catálogo, carrinho, checkout, pedidos, conta, cozinha, admin).
- **E2E** (`e2e/specs`): jornadas completas com um back-end em memória que intercepta a API, o
  Supabase Auth/Storage e substitui o Checkout Pro por uma página simulada (aprovado, pendente,
  recusado). Inclui auditoria **axe-core (WCAG 2.1 AA)** e um cenário móvel.
- **Homologação** (`e2e/hml`, não destrutivo): requer front-end e API locais ligados ao Supabase
  `cupqy-hml` e usuários controlados:

  ```bash
  E2E_CUSTOMER_EMAIL=… E2E_CUSTOMER_PASSWORD=… \
  E2E_BAKER_EMAIL=… E2E_BAKER_PASSWORD=… \
  E2E_ADMIN_EMAIL=… E2E_ADMIN_PASSWORD=… npm run e2e:hml
  ```

> No WSL sem as bibliotecas do Chromium, instale-as com `npx playwright install --with-deps chromium`
> (requer sudo) ou aponte `LD_LIBRARY_PATH` para uma pasta com `libnspr4`, `libnss3` e `libasound2`.

**CI** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)): lint, formatação, tipos, testes
unitários, testes de integração e build; em seguida, os E2E com o back-end simulado.

## Build

```bash
npm run build     # tsc -b + vite build → dist/
npm run preview   # http://localhost:4173
npm run check     # lint + formatação + tipos + testes + build
```

## Deploy na Vercel

> **O deploy ainda não foi realizado** — aguarda autorização.

1. Importe o repositório na Vercel (framework detectado: Vite). O [`vercel.json`](vercel.json) já
   define build, saída `dist`, reescrita de SPA (rotas internas abrem direto), cache imutável de
   `/assets` e cabeçalhos de segurança.
2. Em **Settings → Environment Variables**, defina para _Production_ (e _Preview_, se desejar):
   `VITE_API_BASE_URL` (URL do Render), `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e,
   opcionalmente, `VITE_APP_URL`.
3. No **Supabase**, inclua a URL da Vercel em _Site URL_ e _Redirect URLs_ (inclusive o padrão dos
   previews).
4. Na **API (Render)**, ajuste `CORS_ORIGINS` (ex.: `https://cupqy.vercel.app,https://cupqy-*.vercel.app`)
   e `FRONTEND_URL` (destino dos retornos do Checkout Pro: `FRONTEND_URL/pedidos/:id?pagamento=…`).
   Com `FRONTEND_URL` em HTTPS, a API ativa o retorno automático do Mercado Pago.
5. Faça o deploy e valide: login, catálogo, um pedido no sandbox (Pix de teste ou cartão `APRO`) e o
   retorno para `/pedidos/:id`.

## Decisões arquiteturais

As principais decisões (TypeScript 7 + oxlint, Tailwind v4 com tokens, tipos gerados só para
entradas, Realtime como gatilho, fluxo implícito do Supabase Auth, upload por URL assinada, E2E com
back-end simulado…) estão registradas em [`docs/DECISIONS.md`](docs/DECISIONS.md).
