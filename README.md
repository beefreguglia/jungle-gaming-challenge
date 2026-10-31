# Kurio · Marketplace de NFTs

Marketplace de NFTs em React e TypeScript: descoberta, carrinho, pagamento com carteira, confirmação de pedido e conta do colecionador, em desktop e mobile. Toda a API (REST e Socket.IO) é simulada com MSW, inclusive no build publicado.

- **Demo:** _URL pública após o deploy_
- **Enunciado:** [`docs/DESAFIO.md`](docs/DESAFIO.md)
- **Arquitetura, contratos e decisões:** [`ARCHITECTURE.md`](ARCHITECTURE.md)

## Stack

React 19 · TypeScript · Vite · TanStack Router · TanStack Query · Axios · Socket.IO · Tailwind CSS 4 · shadcn/ui · MSW (com `@mswjs/socket.io-binding`) · Zod · React Hook Form · Playwright · Lighthouse CI · Vitest · oxlint/oxfmt.

## Requisitos

- Node.js 24 (`.nvmrc`)
- pnpm 12 (`corepack enable` usa a versão de `packageManager`)

## Setup

```bash
pnpm install
pnpm dev            # http://localhost:5173, com os mocks ativos
```

Nada além disso é necessário: os mocks vêm ligados por padrão, e não há serviço externo. Para mudar alguma variável, copie `.env.example` para `.env`.

### Variáveis de ambiente

| Variável            | Padrão  | Uso                                                                          |
| ------------------- | ------- | ---------------------------------------------------------------------------- |
| `VITE_ENABLE_MOCKS` | `true`  | Liga a camada MSW (REST e Socket.IO). `false` aponta o app para uma API real |
| `VITE_API_URL`      | `/api`  | Base das chamadas REST                                                       |
| `VITE_SOCKET_URL`   | (vazio) | Origem do Socket.IO; vazio usa a origem da página                            |

As variáveis são validadas na inicialização (`src/shared/config/env.ts`); um valor inválido interrompe o app com a mensagem do erro.

## Credenciais fictícias

| Usuário    | E-mail           | Senha       | Situação inicial                                   |
| ---------- | ---------------- | ----------- | -------------------------------------------------- |
| Nova Sato  | `nova@kurio.art` | `kurio1234` | Carteira principal cadastrada (compra direta)      |
| Kai Moreno | `kai@kurio.art`  | `kurio1234` | Sem carteiras (para testar o cadastro de carteira) |

Cupons: `GENESIS10` (10%), `KURIO05` (0,05 ETH) e `VERAO25` (expirado). Qualquer outro código é inválido.

As senhas ficam no mock apenas como hash (SHA-256 com sal por usuário), nunca em texto puro.

## Cenários do mock

O backend simulado guarda estado no `localStorage` (catálogo, carrinho, favoritos, perfil, carteiras e pedidos), então tudo sobrevive ao refresh.

**Selecionar um cenário** (fica salvo até ser trocado):

- pelo painel **Cenários do mock**, no botão com ícone de frasco na borda esquerda da tela ("Aplicar e recarregar");
- pela URL: `?scenario=<nome>`, por exemplo `/?scenario=slow`;
- pelo console: `window.__kurioMock.setScenario('<nome>')`.

**Restaurar os dados iniciais:** "Restaurar dados iniciais" no painel, `?mock-reset` na URL ou `window.__kurioMock.reset()`.

| Cenário            | O que simula                                                           |
| ------------------ | ---------------------------------------------------------------------- |
| `default`          | Latência de 150 a 350 ms; pagamento confirma em 2,5 s                  |
| `instant`          | Sem latência; pagamento em 300 ms (usado nos testes)                   |
| `slow`             | 2 a 3 s por requisição                                                 |
| `variable-latency` | Latência entre 100 ms e 1,5 s, em sequência fixa (reproduzível)        |
| `out-of-order`     | Respostas do catálogo chegam fora de ordem                             |
| `empty`            | Catálogo sem resultados                                                |
| `offline`          | Toda requisição falha na rede e o socket é recusado                    |
| `server-error`     | Catálogo e detalhe respondem 500                                       |
| `flaky`            | As 2 primeiras consultas ao catálogo respondem 503, depois recupera    |
| `favorite-fails`   | Favoritar ou desfavoritar responde 500                                 |
| `unauthorized`     | Perfil responde 403                                                    |
| `session-expires`  | Sessões novas expiram em 30 s                                          |
| `price-change`     | 4 s após a cotação, o preço do 1º item do carrinho sobe 0,1 ETH        |
| `sold-out`         | 4 s após a cotação, o 1º item do carrinho esgota                       |
| `order-timeout`    | O pedido é criado, mas a resposta leva 20 s (o app desiste em 8 s)     |
| `payment-refused`  | O pagamento é recusado depois da criação do pedido                     |
| `wallet-rejected`  | A carteira recusa a conexão                                            |
| `duplicate-events` | Cada evento em tempo real chega duplicado, seguido de uma cópia antiga |

No console, `window.__kurioMock` também oferece `updateEdition(...)` (muda preço ou estoque e emite `nft.updated`), `expireSessions()`, `disconnectRealtime()`, `replayLastEvent()` e `settleOrders()`. Detalhes em [ARCHITECTURE.md › Controle para testes](ARCHITECTURE.md#controle-para-testes-window__kuriomock).

## Como reproduzir os fluxos de falha

Use o painel ou `?scenario=` e siga os passos. Para voltar ao normal, selecione `default`.

| Fluxo                                          | Como reproduzir                                                                                                                                                            |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Skeletons em rede lenta                        | `slow` e abra o início ou um NFT                                                                                                                                           |
| Falha com nova tentativa                       | `flaky`: o catálogo mostra o erro; "Tentar novamente" recupera. `server-error` mantém a falha                                                                              |
| Sem conexão                                    | `offline`: as telas mostram o erro com "Tentar novamente"; o socket fica reconectando até a rede voltar                                                                    |
| Respostas fora de ordem                        | `out-of-order` e troque filtros rapidamente: o resultado sempre corresponde ao último filtro                                                                               |
| Resultado vazio                                | `empty`, ou busque um termo inexistente                                                                                                                                    |
| Rota ou NFT inexistente                        | Acesse `/nfts/nao-existe` ou `/qualquer-coisa`                                                                                                                             |
| Rollback de favorito                           | Entre, ative `favorite-fails` e toque no coração: ele volta ao estado anterior com um aviso                                                                                |
| Conflito no cadastro                           | Em `/cadastro`, use `nova@kurio.art` ou o usuário `nova_sato`                                                                                                              |
| Acesso não autorizado                          | Entre, ative `unauthorized` e abra `/conta/perfil`: a tela informa a falta de permissão                                                                                    |
| Sessão expirada                                | `session-expires`, entre e aguarde 30 s navegando; ou `window.__kurioMock.expireSessions()`. O login devolve você à mesma página (no pagamento, com o que já foi digitado) |
| Cupom inválido ou expirado                     | No carrinho, aplique `NOPE` ou `VERAO25`                                                                                                                                   |
| Preço ou estoque mudando no carrinho/pagamento | `price-change` ou `sold-out`, vá ao pagamento e aguarde 4 s: o aviso lista a mudança e a compra exige nova confirmação. Ou use `updateEdition(...)` no console             |
| Carteira recusada, conexão e desconexão        | `wallet-rejected` e "Conectar carteira" no pagamento; depois volte a `default` para conectar e desconectar                                                                 |
| Pagamento recusado                             | `payment-refused` e conclua a compra: o pedido aparece como recusado e o carrinho é preservado                                                                             |
| Clique repetido                                | Clique duas vezes em "Confirmar compra": só um pedido é criado (mesma chave de idempotência)                                                                               |
| Timeout com recuperação                        | `order-timeout` e confirme: após 8 s aparece "Verificar compra", que recupera o mesmo pedido. Recarregar durante o envio oferece a mesma verificação                       |
| Pedido pendente com o socket fora              | Em `default`, confirme e rode `window.__kurioMock.disconnectRealtime()` (ou recarregue): o estado é recuperado por consulta periódica, sem criar outro pedido              |
| Eventos duplicados ou antigos                  | `duplicate-events` e conclua uma compra: o pedido nunca volta de "confirmado" para "pendente"                                                                              |

## Comandos

| Comando                | O que faz                                                       |
| ---------------------- | --------------------------------------------------------------- |
| `pnpm dev`             | Desenvolvimento com mocks e HMR                                 |
| `pnpm build`           | Verificação de tipos e build otimizado (`dist/`)                |
| `pnpm preview`         | Serve o build localmente                                        |
| `pnpm typecheck`       | Verificação de tipos                                            |
| `pnpm lint`            | oxlint (inclui as regras de dependência entre camadas)          |
| `pnpm format`          | oxfmt (`pnpm format:check` só verifica)                         |
| `pnpm test`            | Testes unitários e de integração (Vitest)                       |
| `pnpm test:e2e`        | E2E com Playwright em Chromium, desktop (1440) e mobile (390)   |
| `pnpm test:e2e:update` | Atualiza as baselines de regressão visual                       |
| `pnpm test:e2e:report` | Abre o relatório HTML do último E2E                             |
| `pnpm lighthouse`      | Build e auditoria Lighthouse mobile e desktop (3 medições cada) |

Na primeira execução do E2E, instale o navegador: `pnpm exec playwright install chromium`.

## Testes

Os E2E sobem o build otimizado com os mocks e começam cada teste com um contexto de navegador novo (estado isolado). Latência, relógio e eventos são controlados pelo cenário `instant` e por `window.__kurioMock`; os testes de tempo real passam pelo `socket.io-client` e os de REST pelos handlers MSW.

| Item do enunciado                                        | Arquivo                |
| -------------------------------------------------------- | ---------------------- |
| 1. Busca, filtros, ordenação, paginação e histórico      | `e2e/catalog.spec.ts`  |
| 2. Acesso direto ao detalhe e recurso inexistente        | `e2e/detail.spec.ts`   |
| 3. Cadastro, login, expiração, logout e troca de usuário | `e2e/auth.spec.ts`     |
| 4. Favoritos com falha e recuperação                     | `e2e/detail.spec.ts`   |
| 5. Carrinho, quantidades, cupom e persistência           | `e2e/cart.spec.ts`     |
| 6. Compra completa até o recibo                          | `e2e/checkout.spec.ts` |
| 7. Pagamento recusado, clique repetido e timeout         | `e2e/checkout.spec.ts` |
| 8. Perfil, avatar, senha e carteiras                     | `e2e/account.spec.ts`  |
| 9. Preço/estoque via Socket.IO no checkout               | `e2e/checkout.spec.ts` |
| 10. Eventos duplicados, desconexão e retomada de pedido  | `e2e/checkout.spec.ts` |
| 11. Teclado, foco de diálogos e validação (com axe-core) | `e2e/a11y.spec.ts`     |
| 12. Skeletons, falha e nova tentativa                    | `e2e/catalog.spec.ts`  |
| Regressão visual: início, detalhe, carrinho e pagamento  | `e2e/visual.spec.ts`   |

Saídas: relatório HTML em `reports/playwright/`, e traces, vídeos e screenshots das falhas em `test-results/`. As baselines visuais ficam versionadas em `e2e/__screenshots__/`.

## Lighthouse

`pnpm lighthouse` audita início e detalhe do NFT, com o build otimizado e o cenário padrão, 3 vezes por perfil. Os relatórios HTML/JSON da execução mediana ficam em `reports/lighthouse/`, e a configuração em `lighthouserc.cjs`.

| Perfil  | Performance | Acessibilidade | Boas práticas | SEO |
| ------- | ----------: | -------------: | ------------: | --: |
| Desktop |          98 |            100 |           100 | 100 |
| Mobile  |       70–72 |            100 |           100 | 100 |

A performance mobile fica abaixo da meta porque o backend simulado (MSW, ~470 KB) é carregado e avaliado antes do primeiro render, sob CPU 4× mais lenta. LCP, CLS e TBT, versões, ambiente, condições e a análise completa estão em [ARCHITECTURE.md › Lighthouse](ARCHITECTURE.md#lighthouse).

## Deploy

Configurado para a Vercel (`vercel.json`): instala com o lockfile congelado, roda `pnpm build` e publica `dist/` com os mocks ativos. Qualquer rota cai no `index.html` (acesso direto e refresh), exceto `assets/` e o service worker do MSW.

## Estrutura

```
src/
  app/        composição: serviços, router, ciclo de sessão, inicialização dos mocks
  routes/     rotas do TanStack Router (finas, compõem features)
  features/   fatias por caso de uso: catalog, nft-detail, favorites, cart, checkout, auth, session, account
  shared/     cliente HTTP e Socket.IO, UI (shadcn/ui), utilitários
  domain/     schemas Zod, regras puras e contratos REST/eventos
  mocks/      backend simulado: handlers MSW, serviços, fixtures, cenários e hub Socket.IO
e2e/          testes Playwright e baselines visuais
```

As regras de dependência entre camadas são verificadas pelo lint. Detalhes em [ARCHITECTURE.md](ARCHITECTURE.md).
