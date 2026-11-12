# Roadmap de implementação — cupqy-web

Este arquivo registra o andamento incremental do front-end. Uma fase só é marcada como concluída
depois de **lint, verificação de tipos e testes executados com sucesso, documentação atualizada e
commit realizado**.

> **Para retomar o trabalho:** procure a primeira fase não marcada (`[ ]`). O planejamento completo
> (telas × endpoints, fluxos e incompatibilidades) está em [`PLANNING.md`](PLANNING.md) e as decisões
> técnicas em [`DECISIONS.md`](DECISIONS.md).

## Fases

- [x] **0. Inicialização** — Vite + React + TypeScript, Tailwind, oxlint, Prettier, Vitest, snapshot
      do OpenAPI e tipos gerados, repositório privado no GitHub.
- [x] **1. Sistema de design** — tokens Dark Premium, tipografia, componentes base acessíveis
      (botões, campos, modal, toast, badges, alertas, skeletons, estados vazios, paginação).
- [x] **2. Infraestrutura** — variáveis de ambiente validadas, cliente Supabase, camada HTTP
      (erros, token, renovação), TanStack Query, formatação, roteador e layouts.
- [x] **3. Autenticação** — AuthProvider, cadastro, login, logout, recuperação e redefinição de
      senha, guards de rota por papel.
- [x] **4. Vitrine** — home, catálogo com busca/filtros/paginação, categorias, detalhes do cupcake,
      estoque em tempo real.
- [x] **5. Carrinho** — persistência local, validação no servidor, resumo.
- [x] **6. Conta do cliente** — perfil, endereços (com CEP), troca de senha, exclusão de conta.
- [x] **7. Checkout + Mercado Pago** — entrega/retirada, cotação de frete, criação do pedido,
      redirecionamento ao Checkout Pro.
- [x] **8. Pedidos** — histórico, detalhes, retorno do pagamento (sync), novo link, cancelamento,
      repetir pedido, acompanhamento em tempo real.
- [x] **9. Painel da cozinha** — fila em tempo real, avanço de status, nome do entregador.
- [x] **10. Admin — catálogo** — layout administrativo, CRUD de cupcakes, upload de fotos
      (Supabase Storage), categorias e restrições.
- [x] **11. Admin — estoque** — estoque diário, alertas, zerar estoque.
- [x] **12. Admin — pedidos e usuários** — listagem, cancelamento com reembolso, papéis.
- [x] **13. Admin — dashboard financeiro** — indicadores, gráficos e filtros por período.
- [x] **14. Testes E2E** — Playwright com API simulada (CI) e configuração de homologação.
- [x] **15. CI e Vercel** — GitHub Actions, `vercel.json`, revisão de acessibilidade e README final.

## Pendências conhecidas e próximos passos

Todas as fases planejadas foram implementadas. O que depende de decisões ou credenciais externas:

- [ ] **Deploy na Vercel** — preparado (`vercel.json`), aguardando autorização.
- [ ] **E2E em homologação** — `npm run e2e:hml` pronto; requer `.env` do Supabase `cupqy-hml`, API
      local e usuários de teste controlados.
- [ ] **Captcha no login (US02 CA#05)** — escolher hCaptcha ou Turnstile no Supabase Auth e integrar o
      widget (enviar `captchaToken` em `signInWithPassword`/`signUp`).
- [ ] **Realtime em produção** — aplicar `supabase/sql/01_security.sql` e `02_realtime.sql` do back-end.
- [ ] **Bateria de pagamentos no sandbox** — aprovado, pendente, recusado e Pix com o Checkout Pro real.

Detalhes e incompatibilidades com as User Stories: [README → Status do projeto](../README.md#status-do-projeto)
e [`PLANNING.md`](PLANNING.md#6-incompatibilidades-entre-as-user-stories-e-a-api).
