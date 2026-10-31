# Arquitetura

> Documento vivo. As seções de contratos REST, eventos, sessão, carrinho, cache e reconciliação REST × Socket.IO serão adicionadas conforme a implementação.

## Camadas

```
src/
├── app/        Composition root: providers, router, query client, bootstrap dos mocks
├── routes/     Rotas do TanStack Router (file-based) — finas, só compõem features
├── features/   Fatias por caso de uso (catalog, nft-detail, cart, checkout, auth, profile, wallets…)
│   └── <feature>/
│       ├── api/         Query/mutation options e hooks (TanStack Query)
│       ├── components/  Componentes da feature
│       ├── model/       Estado local, schemas de formulário, regras específicas
│       └── index.ts     API pública da feature (único ponto de import externo)
├── domain/     Tipos, contratos (zod) e regras puras (dinheiro em ETH, cotação, versões de eventos)
├── shared/
│   ├── api/    Adaptadores de transporte: cliente Axios e cliente Socket.IO
│   ├── ui/     Componentes shadcn/ui adaptados ao design
│   ├── lib/    Utilitários puros
│   ├── hooks/  Hooks genéricos, sem regra de negócio
│   └── config/ Leitura tipada do ambiente
└── mocks/      MSW: handlers REST/WS, fixtures, "banco" em memória e cenários
```

Dependências apontam só para dentro: `app → routes → features → shared → domain`. `mocks` depende apenas de `domain` (reaproveita os contratos) e é carregado só pelo `app`.

As fronteiras são verificadas pelo `oxlint` (`.oxlintrc.json`), não só por convenção:

| Regra                                                                                                              | O que impede                                                                                   |
| ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `no-restricted-imports` em `domain/**`                                                                             | React, TanStack, Axios, Socket.IO, MSW ou qualquer outra camada no domínio                     |
| `no-restricted-imports` em `shared/**`                                                                             | `shared` importar `features`, `routes`, `app` ou `mocks`; Axios/Socket.IO fora de `shared/api` |
| `no-restricted-imports` em `features/**`                                                                           | Uso direto de Axios/Socket.IO/MSW; import profundo de outra feature (`@/features/x/...`)       |
| `no-restricted-imports` global                                                                                     | MSW fora de `src/mocks`; `@/mocks` fora do composition root                                    |
| `import/no-cycle`                                                                                                  | Dependências circulares                                                                        |
| `max-lines`, `max-lines-per-function`, `complexity`, `max-depth`, `react/jsx-max-depth`, `import/max-dependencies` | Módulos e componentes acumulando responsabilidades (aviso)                                     |
| `max-params`                                                                                                       | Listas longas de parâmetros — use um objeto de opções (aviso)                                  |

Dentro de uma mesma feature, use imports relativos; entre features, só `@/features/<nome>`.

## SOLID aplicado ao frontend

**S — Responsabilidade única**

- Rotas resolvem URL, search params, loaders e guardas; não renderizam regra de negócio.
- Separar _dados_ (hooks em `api/`), _estado/regras_ (`model/`, `domain/`) e _apresentação_ (`components/`). Componente visual recebe dados prontos por props.
- Regras puras (cálculo de totais em ETH, comparação de versões de eventos, validação de cotação) ficam em `domain/`, sem React, e são testáveis isoladamente.

**O — Aberto/fechado**

- Variações visuais via `cva` (variants) e composição (`children`, `asChild`, slots), em vez de `if` por caso dentro do componente.
- Handlers de eventos Socket.IO e cenários de mock registrados em mapas (`evento → handler`, `cenário → configuração`): um novo caso é uma nova entrada, sem alterar o despachante.
- Query keys geradas por fábricas por recurso (`nftKeys.list(params)`), estendidas sem tocar nos consumidores.

**L — Substituição de Liskov**

- Componentes que encapsulam elementos nativos aceitam `React.ComponentProps<'elemento'>` e repassam `className`, `ref` e atributos ARIA — o wrapper pode ser usado onde o elemento nativo seria.
- Implementações de uma mesma porta (ex.: transporte real × MSW) honram o mesmo contrato tipado, inclusive os formatos de erro.

**I — Segregação de interfaces**

- Props mínimas: o componente recebe só os campos que usa (`price`, `available`), não a entidade inteira, quando isso reduz acoplamento.
- Hooks expõem APIs focadas (`useAddToCart`, `useCartSummary`) em vez de um "hook-deus" do carrinho.
- Contratos de transporte (DTO), modelos de domínio e view models da UI são tipos distintos quando divergem.

**D — Inversão de dependência**

- Features dependem de funções de API tipadas e de contratos do `domain`, nunca de Axios/Socket.IO diretamente.
- Instâncias concretas (cliente HTTP, socket, query client) são criadas no `app` e injetadas via contexto do router/providers.
- O MSW substitui a rede, não o código: componentes, hooks e o cliente Axios não sabem se estão falando com mocks.

## Ferramentas de qualidade

| Comando                             | Função                                                |
| ----------------------------------- | ----------------------------------------------------- |
| `pnpm lint` / `pnpm lint:fix`       | oxlint, incluindo as regras de arquitetura acima      |
| `pnpm format` / `pnpm format:check` | oxfmt, com ordenação de imports e de classes Tailwind |
| `pnpm typecheck`                    | TypeScript estrito                                    |

O `lefthook` roda formatação, lint e typecheck no `pre-commit` e o `commitlint` (Conventional Commits) no `commit-msg`.

## Contratos REST

Os contratos ficam em `src/domain` como schemas zod. As features usam esses schemas para validar respostas (`schema` no cliente HTTP) e formulários. O MSW usa os mesmos schemas para validar requisições e montar respostas. Os caminhos ficam em `API_PATHS` (`src/domain/api-contract.ts`), compartilhados entre os dois lados.

Convenções:

- Valores em ETH trafegam como **string decimal** (`"1.19"`, até 18 casas), e todo cálculo passa por `decimal.js` (`money.ts`). Quantidades são inteiras.
- Datas em ISO 8601 (UTC).
- Autenticação por `Authorization: Bearer <token>`. O token é opaco para o cliente.
- O carrinho do visitante é identificado por `X-Cart-Id`.
- Recursos que mudam em tempo real (NFT, pedido) carregam `version`, um número monotônico.

| Recurso   | Método e caminho                 | Entrada                                      | Resposta                          | Erros relevantes                                                     |
| --------- | -------------------------------- | -------------------------------------------- | --------------------------------- | -------------------------------------------------------------------- |
| Sessão    | `POST /auth/sign-up`             | `signUpInputSchema`                          | `201 Session`                     | 409 `email_taken` / `username_taken`, 422                            |
|           | `POST /auth/sign-in`             | `signInInputSchema`                          | `Session`                         | 401 `invalid_credentials`                                            |
|           | `GET /session`                   | —                                            | `CurrentSession`                  | 401 `session_expired` / `unauthenticated`                            |
|           | `DELETE /session`                | —                                            | `204`                             | —                                                                    |
| NFTs      | `GET /nfts`                      | `NftListParams` na query string              | `NftListResponse` (+ facetas)     | 422                                                                  |
|           | `GET /nfts/:id`                  | —                                            | `NftDetail`                       | 404                                                                  |
|           | `GET /nfts/:id/related`          | —                                            | `Nft[]`                           | 404                                                                  |
| Favoritos | `GET /favorites`                 | —                                            | `Favorites`                       | 401                                                                  |
|           | `PUT` / `DELETE /favorites/:id`  | —                                            | `Favorites`                       | 401, 404                                                             |
| Carrinho  | `GET /cart`                      | —                                            | `Cart`                            | —                                                                    |
|           | `POST /cart/items`               | `addCartItemInputSchema`                     | `Cart`                            | 409 `edition_unavailable` / `quantity_exceeded`                      |
|           | `PATCH /cart/items/:lineId`      | `updateCartItemInputSchema`                  | `Cart`                            | 404, 409 `quantity_exceeded`                                         |
|           | `DELETE /cart/items/:lineId`     | —                                            | `Cart`                            | 404                                                                  |
|           | `PUT` / `DELETE /cart/coupon`    | `applyCouponInputSchema`                     | `Cart`                            | 422 `coupon_invalid` / `coupon_expired`                              |
|           | `POST /cart/merge`               | `X-Cart-Id` do visitante                     | `Cart`                            | 401                                                                  |
| Cotação   | `POST /quotes`                   | `createQuoteInputSchema` (rede)              | `Quote`                           | 409 `cart_empty` / `edition_unavailable`, 422 `coupon_expired`       |
| Carteira  | `POST /wallet-connections`       | `walletConnectionInputSchema`                | `WalletConnection`                | 403 `wallet_rejected`, 422 (endereço fora do formato da rede)        |
|           | `DELETE /wallet-connections/:id` | —                                            | `204`                             | —                                                                    |
| Pedidos   | `POST /orders`                   | `createOrderInputSchema` + `Idempotency-Key` | `201 Order` (ou `200` ao repetir) | 409 `quote_outdated` / `quote_expired` / `idempotency_conflict`, 422 |
|           | `GET /orders/:id`                | —                                            | `Order`                           | 401, 404                                                             |
| Perfil    | `GET` / `PATCH /profile`         | `profileInputSchema`                         | `Profile`                         | 409 `email_taken` / `username_taken`, 422                            |
|           | `PUT` / `DELETE /profile/avatar` | `multipart/form-data` (`avatar`)             | `Profile`                         | 422 (tipo ou tamanho)                                                |
|           | `PUT /profile/password`          | `changePasswordInputSchema`                  | `204`                             | 422 `wrong_password`                                                 |
| Carteiras | `GET /wallets`                   | —                                            | `Wallets`                         | 401                                                                  |
|           | `PUT /wallets/primary`           | `walletInputSchema`                          | `Wallet`                          | 422                                                                  |
|           | `PUT /wallets/secondary`         | `secondaryWalletInputSchema`                 | `Wallet`                          | 422 (inclusive sem carteira principal)                               |

Todas as rotas privadas podem responder 401 (`session_expired`). Qualquer rota pode responder 5xx (`service_unavailable`), seja em falha transitória ou em cenário de mock.

### Erros

Todo erro segue o envelope `{ error: { code, message, fields? } }` (`apiErrorBodySchema`):

- O **status** HTTP define a categoria (`ApiErrorKind`), e é por ela que o retry e a sessão decidem o que fazer.
- O **code** (`API_ERROR_CODES`) diz à UI exatamente o que aconteceu.
- O **fields** mapeia `campo → mensagem` e alimenta o `setError` dos formulários.

| Status          | Categoria             | Retry |
| --------------- | --------------------- | :---: |
| 400 / 422       | `validation`          |  não  |
| 401             | `unauthorized`        |  não  |
| 403             | `forbidden`           |  não  |
| 404             | `not_found`           |  não  |
| 409             | `conflict`            |  não  |
| 408 / 429 / 5xx | `transient`           |  sim  |
| sem resposta    | `network` / `timeout` |  sim  |

### Cotação e pedido

1. O carrinho guarda itens e cupom. Os preços de cada linha são os **atuais** da edição.
2. `POST /quotes` congela um snapshot com preço: subtotal, desconto, taxa de rede, total e `expiresAt`.
3. O checkout envia `quoteId` com uma `Idempotency-Key` gerada por tentativa de compra.
   - Se preço, estoque ou cupom mudaram desde a cotação, a resposta é 409 `quote_outdated`. O cliente pede uma nova cotação, mostra as diferenças (`diffQuotes`) e exige nova confirmação.
   - A mesma chave com o mesmo corpo devolve o **mesmo** pedido, o que cobre clique duplo e timeout. A mesma chave com outro corpo (comparação por `orderRequestFingerprint`) dá 409 `idempotency_conflict`.
4. O pedido nasce `pending` e termina em `confirmed` ou `refused`, que são estados terminais (`canTransition`). O recibo é o próprio pedido: as linhas e os totais são uma cópia da cotação, então mudanças posteriores no catálogo não alteram o recibo.

## Eventos Socket.IO

Envelope comum (`src/domain/events.ts`):

```ts
{ id, type, resource: { type, id }, version, occurredAt, userId: string | null, data }
```

| Evento          | `userId` | `data`                                                           | Efeito no cliente                                          |
| --------------- | -------- | ---------------------------------------------------------------- | ---------------------------------------------------------- |
| `nft.updated`   | `null`   | `price`, `compareAtPrice?`, `editions[{ id, price, available }]` | Catálogo, detalhe e linhas do carrinho (`applyNftUpdate*`) |
| `order.updated` | dono     | `status`, `transaction`, `refusalReason`, `updatedAt`            | Estado do pedido (`shouldApplyOrderUpdate`)                |

Regras de aplicação:

- **Duplicatas:** descartadas pelo `id` (`createEventDeduper`).
- **Eventos antigos:** descartados pela `version` (`isNewerVersion`). Um pedido terminal nunca regride.
- **Isolamento:** eventos com `userId` diferente do usuário da sessão atual são ignorados (`isEventForUser`).

## Backend simulado (MSW)

O MSW substitui a **rede**, não o código: o app faz requisições Axios e conexões Socket.IO reais, e o MSW responde. Nenhum componente, hook ou cliente sabe que está falando com mocks. A camada vem ligada por padrão (`VITE_ENABLE_MOCKS`, padrão `true`), então um checkout limpo e o build de demonstração funcionam sem `.env`; `VITE_ENABLE_MOCKS=false` aponta o app para um backend real.

```
src/mocks/
├── browser.ts      Inicia o worker, aplica ?scenario= / ?mock-reset e expõe window.__kurioMock
├── server.ts       Compõe banco, hub de tempo real, handlers e a API de controle
├── scenarios.ts    Cenários como configuração (latência, falhas, sessão, pagamento…)
├── db/             "Banco" em memória persistido no localStorage, com reset para a semente
├── fixtures/       60 NFTs determinísticos (os 9 do Figma + gerados), 2 usuários, cupons
├── services/       Regras do servidor, sem MSW (testadas no Node com Vitest)
├── handlers/       Rotas REST finas: validam a entrada com os schemas do domínio e chamam serviços
├── realtime/hub.ts Envia eventos Socket.IO a partir das mesmas mutações que alteram o banco
└── lib/route.ts    Wrapper das rotas: latência, falhas injetadas e envelope de erro
```

**Consistência entre REST e eventos.** Toda mudança de preço ou estoque passa por `updateEdition`, que incrementa a versão do NFT, grava no banco e publica `nft.updated`. A liquidação do pedido faz o mesmo com `order.updated`. Assim, uma leitura REST feita depois de um evento nunca mostra um estado anterior a ele.

**Persistência e reset.** O estado fica salvo em `localStorage` (`kurio:mock-db`) e sobrevive a refresh. Quando o formato muda, o dado antigo é descartado. `?mock-reset` ou `__kurioMock.reset()` restauram a semente por completo. Pedidos `pending` interrompidos por um refresh são liquidados ou reagendados na inicialização.

**Credenciais fictícias.** `nova@kurio.art` e `kai@kurio.art`, ambas com a senha `kurio1234`. As senhas ficam armazenadas só como hash SHA-256 com salt.

**Cupons.** `GENESIS10` (10%) e `KURIO05` (0,05 ETH) são válidos. `VERAO25` está expirado. Qualquer outro código é inválido.

### Cenários

Para selecionar, use `?scenario=<nome>` (fica salvo) ou `window.__kurioMock.setScenario(nome)`.

| Cenário            | Efeito                                                                     |
| ------------------ | -------------------------------------------------------------------------- |
| `default`          | Latência de 150 a 350 ms; pagamento confirma em 2,5 s                      |
| `instant`          | Sem latência; pagamento em 300 ms (testes)                                 |
| `slow`             | 2 a 3 s por requisição (skeletons)                                         |
| `variable-latency` | 100 ms a 1,5 s, em sequência pseudoaleatória com semente fixa              |
| `out-of-order`     | Respostas de `GET /nfts` alternam entre lenta e rápida                     |
| `empty`            | Catálogo sem resultados                                                    |
| `offline`          | Toda requisição falha na rede; o socket é recusado                         |
| `server-error`     | `GET /nfts*` responde 500                                                  |
| `flaky`            | As 2 primeiras consultas ao catálogo dão 503, depois recupera              |
| `favorite-fails`   | Incluir ou remover favorito dá 500 (testa o rollback otimista)             |
| `unauthorized`     | `/profile*` responde 403                                                   |
| `session-expires`  | Sessões novas expiram em 30 s                                              |
| `price-change`     | 4 s após a cotação, o preço do 1º item do carrinho sobe 0,1 ETH            |
| `sold-out`         | 4 s após a cotação, o 1º item do carrinho esgota                           |
| `order-timeout`    | O pedido é criado, mas a resposta leva 20 s (recuperação por idempotência) |
| `payment-refused`  | O pedido termina `refused`                                                 |
| `wallet-rejected`  | `POST /wallet-connections` responde 403 `wallet_rejected`                  |
| `duplicate-events` | Cada evento chega duplicado, seguido de uma cópia com versão antiga        |

### Controle para testes (`window.__kurioMock`)

Os testes E2E controlam os casos sensíveis a tempo por essa API, sem depender de timers:

- `reset()` e `setScenario(nome)`.
- `updateEdition({ nftId, editionId }, { price?, available? })`: altera preço ou estoque e emite `nft.updated`.
- `expireSessions()`: expira todas as sessões abertas.
- `disconnectRealtime()`: derruba os sockets. O cliente reconecta sozinho.
- `realtimeUsers()`: usuário por trás de cada socket aberto (`null` = visitante). Mostra com qual token o cliente conectou.
- `replayLastEvent()`: reenvia o último evento, para testar duplicatas.
- `settleOrders()`: liquida na hora os pedidos que já venceram o prazo de pagamento.

### Transporte Socket.IO e limitações

O cliente `socket.io-client` conecta normalmente, e o MSW intercepta o WebSocket com `@mswjs/socket.io-binding`.

- **Só WebSocket.** O cliente precisa usar `transports: ['websocket']`. O long-polling HTTP do Engine.IO não é simulado.
- **Handshake simulado.** O binding responde ao handshake sozinho e não envia heartbeat. O hub envia um ping Engine.IO a cada 20 s para o cliente não encerrar a conexão por timeout.
- **Autenticação.** O binding ignora o `auth` do pacote `CONNECT`. O hub lê o pacote cru (`40{"token":…}`) para associar o socket ao usuário. Token ausente ou expirado deixa o socket anônimo, recebendo só eventos públicos. Ao trocar de sessão, o cliente deve reconectar.
- **Roteamento da conexão.** O MSW remove o prefixo `/socket.io/` antes de comparar URLs, então o handler escuta a origem (`ws://host/`). Para não interceptar outros WebSockets da mesma origem, como o HMR do Vite, conexões sem o parâmetro `EIO` seguem para o servidor real (`connection.server.connect()`).
- **Sem namespaces nem rooms.** Tudo trafega no namespace `/`, e o filtro por usuário acontece no hub, pelo `userId` do envelope.
- **Escopo da aba.** O "servidor" vive na aba. Duas abas abertas têm estados em memória independentes que compartilham o mesmo `localStorage`, então eventos de uma aba não chegam à outra.

## Composição da aplicação

`src/app/services.ts` é a raiz de composição: cria uma única vez o `QueryClient`, o cliente HTTP, o gerenciador de sessão, o cliente Socket.IO e a sincronização de tempo real, e liga essas peças entre si. As features recebem as instâncias pelo contexto do router (`queryClient`, `http`, `session`) e pelo contexto React (`useHttpClient`, `useSessionManager`, `useRealtimeStatus`). Nenhuma feature cria seu próprio cliente.

O cliente HTTP (`shared/api/http-client.ts`) é o único ponto que conhece o Axios:

- Calcula os cabeçalhos a cada requisição, como o token de sessão (e, a partir da fase do carrinho, o `X-Cart-Id`).
- Serializa arrays como chaves repetidas (`collections=a&collections=b`).
- Valida a resposta com o schema zod do contrato. Uma divergência vira `ApiError` do tipo `contract`.
- Normaliza toda falha em `ApiError` e a repassa ao gancho `onError`.
- Aceita o `AbortSignal` do TanStack Query, então consultas obsoletas são canceladas na rede.

## Sessão

| Situação                     | Comportamento                                                                                                                                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login / cadastro             | Grava `{ token, user, expiresAt }` no `localStorage` (`kurio:session`) e agenda uma revalidação no `expiresAt`.                                                                                       |
| Refresh                      | A sessão é lida do storage e revalidada com `GET /session` na inicialização.                                                                                                                          |
| API rejeita o token          | Um 401 `session_expired` / `unauthenticated` em uma requisição **que levava token** encerra a sessão (`isSessionRejection`). Outros 401, como senha errada, são erros de formulário.                  |
| Falha de rede na revalidação | A sessão é mantida; só a API pode encerrá-la.                                                                                                                                                         |
| Expiração em rota privada    | O guard `_authenticated` roda de novo e redireciona para `/login?redirect=<URL completa>`. Após o login, o usuário volta exatamente para onde estava (`safeRedirect` aceita só caminhos internos).    |
| Expiração em rota pública    | O usuário permanece na página e recebe um toast explicando o que aconteceu.                                                                                                                           |
| Logout                       | Leva o usuário para `/` antes de encerrar a sessão (assim o guard não o manda para `/login`), encerra localmente na hora e faz o `DELETE /session` como melhor esforço, com o token antigo explícito. |
| Outra aba                    | O evento `storage` propaga login e logout entre abas.                                                                                                                                                 |

**Telas de acesso.** No desktop, o botão "Entrar" do header abre o dialog do Figma sobre a página atual e o login mantém o usuário onde estava. `/login` e `/cadastro` atendem o acesso direto e o redirecionamento das rotas privadas: em tela cheia no mobile, como nos frames, e com o card do dialog centralizado no desktop. Erros da API vão para o campo a que pertencem, como e-mail ou usuário já em uso; os demais aparecem como alerta do formulário (`applyApiErrorToForm`).

**Isolamento entre usuários.** Toda query com dado privado usa um escopo na chave: `['user', userId, …]` para dados do membro e `['visitor', cartId, …]` para o carrinho do visitante. Qualquer troca de quem usa o app (login, logout, expiração, troca de usuário) cancela e remove esses dois escopos inteiros, além de limpar o cache de mutations, antes de gravar a nova sessão. Como o `userId` faz parte da chave, um dado em cache nunca é servido a outro usuário. Dados públicos, como catálogo e detalhe, são preservados.

Na mesma troca, o cliente Socket.IO reconecta com o novo token, os ids de eventos já vistos são esquecidos e eventos endereçados a outro `userId` são descartados antes de qualquer escrita no cache.

## Cache, retries e sincronização

| Política            | Valor padrão                                                                            | Motivo                                                                      |
| ------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `staleTime`         | 30 s                                                                                    | Evita refetch a cada navegação; recursos ao vivo são corrigidos por eventos |
| `gcTime`            | 5 min                                                                                   | Voltar a uma página recente é instantâneo                                   |
| Retry de queries    | Até 2, com backoff exponencial (até 8 s), **só** para 5xx, 408, 429, rede e timeout     | 4xx é resposta definitiva; repetir só atrasaria o feedback                  |
| Retry de mutations  | Nunca automático                                                                        | Escritas não são repetidas às cegas; o pedido usa chave de idempotência     |
| Foco na janela      | Refetch de queries vencidas                                                             | Dados atualizados ao voltar para a aba                                      |
| Respostas obsoletas | Cada combinação de parâmetros é uma chave própria, e o `AbortSignal` cancela a anterior | Uma resposta antiga nunca sobrescreve a busca atual                         |

As fatias de cada feature ajustam o `staleTime` por recurso, como o carrinho e o pedido pendente, que precisam estar sempre frescos. Esses ajustes ficam documentados junto de cada fatia.

## Reconciliação REST × Socket.IO

1. Cada evento é validado com o schema zod do domínio. Payload malformado é descartado com um aviso.
2. Duplicatas são descartadas pelo `id` do evento.
3. Eventos endereçados a outro usuário são descartados.
4. O evento é entregue aos **aplicadores** registrados pelas features (`src/app/realtime-appliers.ts`). Cada aplicador escreve no cache usando as regras de versão do domínio (`applyNftUpdate`, `shouldApplyOrderUpdate`), então um evento antigo nunca regride um estado mais novo.
5. **Após cada reconexão**, todas as queries ativas com `meta: { realtime: true }` são reconsultadas via REST, porque eventos emitidos enquanto o socket estava fora se perderam. A primeira conexão não dispara essa reconsulta.

Listeners e subscriptions são liberados por funções de `dispose` devolvidas por cada peça.

## Design system e desvios do Figma

Os tokens vêm das variáveis do arquivo Figma e ficam em `src/index.css`, mapeados nas variáveis do shadcn/ui (`--background`, `--card`, `--primary`…). Assim, todos os componentes `shared/ui` herdam a paleta. A tipografia é só **Roboto Mono** (`@fontsource-variable/roboto-mono`, servida localmente), com a escala de texto do Figma: nomes semânticos por grupo (`text-tiny` … `text-display`) e os tamanhos exatos `text-9` … `text-43`, ajustados com `leading-*` quando o estilo pede outra altura de linha. O layout tem apenas o tema escuro, que é o tema único da aplicação.

| Desvio                                                                                                           | Motivo                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ícones Iconly → `lucide-react`                                                                                   | O Iconly não tem pacote npm livre; o lucide traz equivalentes com o mesmo traço                                                                                                                                                     |
| Logos de redes sociais via `simple-icons`; LinkedIn como texto "in"                                              | O LinkedIn não está no simple-icons por questão de marca; o Figma também o desenha como texto                                                                                                                                       |
| "Criadores", "Aprenda", links de ajuda e extras do rodapé esmaecidos, com tooltip "Em breve"                     | Fora do escopo; o enunciado pede que não aparentem sucesso. Continuam focáveis, então quem navega por teclado descobre o porquê                                                                                                     |
| Newsletter responde "em breve" em vez de confirmar                                                               | Mesmo motivo: nenhum e-mail é salvo, então a interface não finge que salvou                                                                                                                                                         |
| Header mostra avatar e nome quando logado                                                                        | O Figma mostra "Entrar" até nas telas de conta, o que contradiz a sessão ativa                                                                                                                                                      |
| Rodapé também no mobile (empilhado)                                                                              | Os frames mobile mostram só a primeira dobra; o rodapé leva os mesmos links e informações de contato                                                                                                                                |
| Borda dos campos de formulário `#846341` em vez de `#3F2319`                                                     | Ajuste de acessibilidade: a cor do Figma tem 1,3:1 contra o fundo, e os campos vazios ficavam quase invisíveis. O tom novo, da mesma família, tem 3,5:1 (WCAG 1.4.11). As linhas divisórias decorativas mantêm a cor original       |
| Texto de erro (`destructive`) em Coral `#EA6B4F`; `#ED1B2E` (`error`) só em bordas, ícones e fundos              | O vermelho Error do Figma tem 4,4:1 contra o fundo, abaixo do AA para texto pequeno; o Coral, que também é token de texto do Figma, tem 6,2:1                                                                                       |
| Alça "Cenários" na borda esquerda (meio da tela)                                                                 | Controle de demonstração do backend simulado; não faz parte do layout. Ocupa só a margem lateral (24 px no mobile, 16 px a partir do tablet), então não cobre conteúdo nem ações em nenhuma largura; tem nome acessível e tooltip   |
| Labels dos campos de login e cadastro ocultos visualmente (`sr-only`), com dicas de formato no cadastro          | O Figma usa só placeholders. O label continua para leitores de tela, e as dicas mostram as regras de usuário e senha antes do erro                                                                                                  |
| "Esqueceu a senha?" e login com Google/Facebook mostram "Em breve"                                               | Fora do escopo; os botões não simulam autenticação                                                                                                                                                                                  |
| Valores em ETH com ponto decimal (`1.19 ETH`) também no rótulo "Faixa de preço"                                  | O Figma usa ponto em todos os valores (cards, carrinho, recibo) e vírgula só nesse rótulo; um formato único evita ler `0,02` e `1.19` como escalas diferentes. Milhares usam espaço fino, que não se confunde com separador decimal |
| Abas "Todos os NFTs / Novos lançamentos / Em alta" como botões alternáveis (`aria-pressed`)                      | Elas filtram o mesmo grid em vez de trocar painéis, então o padrão ARIA de abas anunciaria uma estrutura que não existe                                                                                                             |
| Tablet (768–1023 px): filtros em um painel, aberto pelo botão ao lado da ordenação                               | Não há frame de tablet; a sidebar de 310 px não cabe com 3 colunas de cards. A busca do tablet é a do cabeçalho                                                                                                                     |
| Abas do catálogo quebram linha em telas estreitas                                                                | Com zoom de 400% (320 px), rolagem lateral esconderia "Em alta"                                                                                                                                                                     |
| Hero com troca manual de destaque (pontos), sem rotação automática                                               | Conteúdo que muda sozinho atrapalha leitura e leitores de tela (WCAG 2.2.2)                                                                                                                                                         |
| "Ler mais" do Diário da Cunhagem mostra "Em breve"                                                               | Páginas editoriais estão fora do escopo                                                                                                                                                                                             |
| Selo "Esgotado" sobre a arte de NFTs sem estoque                                                                 | Estado não desenhado; texto, e não só a arte acinzentada, para não depender de cor                                                                                                                                                  |
| Detalhe no tablet (768–1023 px): galeria em cima, detalhes embaixo                                               | A galeria de 573 px deixaria ~130 px para os detalhes; as duas colunas do Figma começam em 1024 px                                                                                                                                  |
| Abas do detalhe quebram linha no mobile                                                                          | "Avaliações de colecionadores (19)" não cabe em 390 px; rolagem lateral esconderia a aba                                                                                                                                            |
| Aba "Avaliações" mostra a nota e o total, sem textos de avaliação                                                | Não há recurso de avaliações na API do desafio                                                                                                                                                                                      |
| Edição esgotada continua selecionável, riscada e anunciada como "esgotada"; a compra fica desabilitada com aviso | O usuário vê o estado em vez de um chip que simplesmente não responde                                                                                                                                                               |
| No mobile, a barra de compra fixa substitui a tab bar na página do NFT                                           | É o que o frame "Mobile / Detalhes do NFT" mostra                                                                                                                                                                                   |
| Coração nos cards também no desktop                                                                              | O frame mobile mostra o coração; no desktop ele fica visível em vez de só no hover, para funcionar com teclado e toque                                                                                                              |
| Carrinho desktop: coluna "Quantidade" no lugar de "Edições", e a edição aparece sob o nome                       | No Figma a coluna "Edições" mostra a quantidade; a edição, que diferencia duas linhas do mesmo NFT, não aparecia em lugar nenhum                                                                                                    |
| Carrinho mobile: lixeira no canto do card                                                                        | No frame, a lixeira do 3º item está sobreposta ao botão "+"                                                                                                                                                                         |
| Carrinho mobile: resumo fixo na base (sticky) e sem tab bar                                                      | É o "Payment Summary" do frame; sticky, e não fixed, para nunca cobrir o último item nem o campo do cupom                                                                                                                           |
| Rótulo "Código promocional" visível também no mobile                                                             | O frame mobile usa só o placeholder, que some ao digitar                                                                                                                                                                            |
| Aviso no carrinho quando preço ou estoque mudam com ele aberto                                                   | Requisito do enunciado sem tela no Figma; segue o visual dos alertas do projeto                                                                                                                                                     |
| "Alterar senha" com formulário e botão próprios; "Salvar" só para os dados do perfil                             | O Figma tem um único "Salvar". São operações independentes na API: um botão por operação evita deixar o perfil salvo pela metade quando só a senha falha                                                                            |
| ".eth" do Nome ENS como rótulo fixo, não um select                                                               | O select do Figma teria uma única opção; um controle que não oferece escolha seria enganoso                                                                                                                                         |
| Conta no mobile: título "Minha conta" com "Sair" e pílulas (Perfil, Carteiras, Lista de interesse)               | Não há frame mobile; os itens "em breve" da sidebar ficam só no desktop                                                                                                                                                             |
| Avatar e senha aparecem só no Perfil; o cabeçalho mostra o avatar novo assim que ele é salvo                     | Após salvar perfil ou avatar, a sessão é revalidada (`GET /session`)                                                                                                                                                                |
| Pagamento: cards "Carteira de pagamento" (Principal/Reserva + "Usar outra carteira") também no desktop           | Vêm do frame mobile; escolher uma carteira cadastrada preenche os campos, como pede o enunciado. Substituem o rádio "Usar outra carteira?" do desktop                                                                               |
| Pagamento: sem o select "Tipo de carteira"; o tipo é escolhido em "Carteira e rede"                              | O Figma tem os dois controles para o mesmo valor. Um só, ao lado do botão de conexão que ele define, evita valores divergentes                                                                                                      |
| Pagamento: botão "Conectar carteira" e estado conectado/desconectar                                              | A conexão simulada (com recusa) é requisito do enunciado e não tem tela no Figma                                                                                                                                                    |
| Pagamento: quantidade sob o preço em "Seus NFTs"                                                                 | Na coluna de 342 px, a Roboto Mono não cabe com duas colunas de valores: os nomes seriam cortados                                                                                                                                   |
| Pagamento: cupom só é aplicado no carrinho ("Aplique no carrinho")                                               | A cotação aceita é a do carrinho; mudar o cupom no pagamento exigiria uma nova revisão de qualquer forma                                                                                                                            |
| Confirmação como página `/pedidos/$id`, no visual do modal                                                       | A rota permite refresh e link direto ao recibo; o "X" leva ao início. Os metadados viram grade 2×2 no mobile                                                                                                                        |
| Ícone do recibo: `MailOpen` (lucide) no lugar da ilustração "thank-you"                                          | A cota da API do Figma esgotou antes do download do asset (node 11:5150); trocar quando houver cota                                                                                                                                 |
| Data do recibo como "30 out. 2026"                                                                               | Equivalente em português ao "29 Jul, 2026" do Figma                                                                                                                                                                                 |

## Catálogo (início)

- **Estado na URL.** Busca, aba, coleções, redes, faixa de preço, ordenação e página são search params validados por `nftListParamsSchema`. Valores padrão ficam fora da URL (`stripSearchParams`). Cada alteração é uma entrada no histórico, então voltar e avançar percorre as buscas. Qualquer mudança que não seja de página volta para a página 1 (`updateNftListParams`).
- **Consultas.** Uma chave por combinação de parâmetros (`['nfts', 'list', params]`), com o `AbortSignal` do Query. Uma resposta atrasada de uma busca antiga só preenche a chave dela, nunca a atual (testado no cenário `out-of-order`). Durante a troca, o resultado anterior continua na tela, esmaecido (`keepPreviousData`), e a região fica com `aria-busy`.
- **Carregamento e falhas.** O loader da rota inicia as requisições sem bloquear a navegação; o skeleton tem a geometria exata dos cards (CLS medido no E2E). Falhas transitórias são repetidas duas vezes com backoff; depois disso aparece o erro com "Tentar novamente". Uma faixa de preço impossível (mínimo > máximo, possível editando a URL) não chega à API: a tela explica e oferece remover a faixa.
- **Tempo real.** `catalogRealtimeApplier` aplica `nft.updated` em todas as páginas em cache (`applyNftUpdate`, que ignora versões antigas). Os cards mostram o preço novo sem refetch; após reconexão, as queries com `meta.realtime` são reconsultadas.
- **Acessibilidade.** O total de resultados e a página são anunciados numa região `aria-live`. A troca de página leva o foco ao início dos resultados. Os filtros são botões com `aria-pressed`, e a seleção é indicada por cor e por marca de seleção. A faixa de preço tem rótulo e valor falado (`aria-valuetext`) em cada controle.
- **Imagens.** As quatro artes do Figma ficam em `public/images/nfts/` como WebP de 960 e 480 px (originais de 1254 px), servidas com `srcset`, `sizes` e dimensões intrínsecas. A arte da hero e os três primeiros cards carregam com prioridade alta, por fazerem parte do LCP.
- **Fonte antes da primeira pintura.** `main.tsx` espera a Roboto Mono, por no máximo 1,2 s e em paralelo com o MSW e com o download do app. Pintar com a fonte de fallback e trocar depois quebrava o título da hero em uma linha a mais, com CLS de 0,20 no mobile.

## Detalhe do NFT, favoritos e base do carrinho

- **Rota.** O loader de `/nfts/$nftId` garante o detalhe no cache antes de renderizar. Isso dá o `<title>` com o nome do NFT, um 404 real para um id inexistente (`notFound()` → "NFT não encontrado") e o skeleton como `pendingComponent` em redes lentas. A edição escolhida fica na URL (`?edicao=`, com `replace`), então um link compartilhado abre a mesma edição.
- **Edição e quantidade.** Sem `?edicao=`, a edição padrão (a mais barata com estoque) é decidida **uma vez**, ao abrir a página. Se o estoque mudar por evento, a edição que o usuário está vendo não troca sozinha: ela mostra "esgotada" e bloqueia a compra. A quantidade é limitada ao estoque da edição (o botão + desabilita e o motivo é anunciado), é reajustada se o estoque cair enquanto a página está aberta, e a API também valida (409).
- **Tempo real.** `nftDetailRealtimeApplier` aplica `nft.updated` na chave `['nfts', 'detail', id]`, além do aplicador do catálogo.
- **Favoritos.** Ficam em `['user', userId, 'favorites']`. A alternância é **otimista com rollback** (`onMutate` guarda o estado anterior e aplica `toggleFavorite`; `onError` restaura e avisa; `onSuccess` grava a resposta da API). O visitante que toca no coração vai para o login e volta à mesma página. O botão tem rótulo fixo com `aria-pressed`. "Lista de interesse" (`/conta/favoritos`, privada) carrega cada NFT pelo cache do detalhe.
- **Composição sem ciclos.** O catálogo não importa favoritos: o grid recebe `renderActions`, e a rota injeta o `FavoriteButton`. Assim a lista de favoritos pode reutilizar o grid do catálogo sem dependência circular entre features.
- **Base do carrinho.** O carrinho do visitante é identificado pelo id que a API devolve no primeiro "adicionar". Esse id fica no `localStorage` (`kurio:cart-id`) e vai no cabeçalho `X-Cart-Id`; membros são identificados pelo token. A chave da query é `['user', userId, 'cart']` ou `['visitor', cartId, 'cart']`, com `staleTime: 0` e `meta.realtime`. "Comprar" adiciona e abre o carrinho; o ícone de carrinho do mobile só adiciona e confirma com toast. O contador do cabeçalho e da tab bar lê a mesma query.

## Carrinho

- **Dono do carrinho.** O membro é identificado pelo token; o visitante, pelo id devolvido no primeiro "adicionar" (`X-Cart-Id`, salvo no `localStorage`). Chaves: `['user', userId, 'cart']` e `['visitor', cartId, 'cart']`.
- **Escritas.** Alterar, remover, aplicar e remover cupom respondem com o carrinho inteiro, que substitui o do cache. Página, contadores e cotação andam juntos, sem requisição extra. Um 409 de estoque mostra a mensagem da API e reconsulta o carrinho.
- **Resumo.** Subtotal, desconto, taxa de rede e total vêm **sempre** da cotação da API (`POST /quotes`), nunca de conta no cliente. A chave da cotação inclui uma impressão do carrinho (linhas, quantidades, preços, estoque e cupom), então ela é pedida de novo a cada mudança, inclusive as que chegam por Socket.IO. Durante o recálculo, os valores anteriores ficam na tela esmaecidos. Um carrinho com linha esgotada ou acima do estoque não recebe cotação: a tela explica o problema e "Conectar e finalizar" fica desabilitado.
- **Cupom.** Código inválido ou expirado é respondido pela API (422) e aparece no próprio campo, com foco nele. O cupom aplicado pode ser removido.
- **Tempo real.** `cartRealtimeApplier` aplica `nft.updated` nas linhas (preço e estoque; a quantidade é mantida). `CartNotices` compara o carrinho novo com o anterior durante o render e lista as mudanças numa região `aria-live` até o usuário fechar. Mudanças feitas pelo próprio usuário, como quantidade, não geram aviso.
- **Merge no login.** Quando um visitante entra, `bindSessionLifecycle` chama `POST /cart/merge` com o id do carrinho de visitante. A API soma as quantidades até o limite do estoque, o resultado vai para a chave do membro e o id de visitante é apagado. Se o merge falhar, o id é mantido e a próxima entrada tenta de novo; nada se perde. Antes de gravar o resultado, uma leitura do carrinho que ainda esteja em voo é cancelada: com latência, ela chegaria depois com o carrinho antigo (vazio) e apagaria o merge.

## Conta (perfil e carteiras)

- **Rotas.** `/conta` (privada) redireciona para `/conta/perfil`. O layout tem a sidebar "Meu perfil" no desktop e pílulas no mobile, com "Sair" nos dois. `/conta/carteiras` e `/conta/favoritos` completam a área.
- **Dados.** Perfil e carteiras ficam em `['user', userId, 'profile' | 'wallets']`. Salvar perfil ou avatar grava a resposta no cache e revalida a sessão, para o cabeçalho refletir nome e avatar. Salvar uma carteira reconsulta as duas, porque uma secundária vinculada acompanha a principal.
- **Formulários.** Os campos e regras vêm dos schemas do domínio (os mesmos que o mock valida). Erros da API vão para o campo certo com `applyApiErrorToForm`: e-mail ou usuário em uso (409), senha atual errada (422), endereço fora do formato da rede. O primeiro campo com erro recebe foco. Obrigatórios mostram o asterisco do Figma e recebem `aria-required`.
- **Avatar.** Tipo e tamanho (PNG, JPEG ou WebP até 2 MB) são conferidos antes do envio e de novo pela API. O upload é multipart; o mock reduz a imagem para WebP de 256 px, para caber no `localStorage` e sobreviver ao refresh.
- **Carteira secundária.** Pode ter dados próprios ou repetir a principal ("Igual à carteira principal"). Marcar salva o vínculo na hora; desmarcar abre o formulário com os dados da principal para personalizar. Sem principal cadastrada, a opção fica desabilitada e o motivo é explicado. O que mostrar sai de uma função pura (`secondaryWalletView`).

## Checkout e pedido

- **Rotas.** `/checkout` (privada) é o formulário. Depois de "Confirmar compra", o pedido fica na URL (`/checkout?pedido=<id>`), então refresh ou reconexão retomam o mesmo pedido. `/pedidos/$orderId` é o recibo e **só existe para pedido confirmado**: o loader consulta a API e redireciona um pedido pendente ou recusado de volta para `/checkout?pedido=`. Um id inexistente ou de outro usuário dá 404.
- **Formulário.** Os campos seguem `checkoutDetailsSchema` (o mesmo que o mock valida). A carteira cadastrada escolhida preenche rede, endereço, tipo, código de indicação e ENS. Nome, usuário e e-mail vêm do perfil. O que foi digitado, a escolha de carteira e a conexão ficam num rascunho por usuário no `sessionStorage`, e assim sobrevivem a refresh e ao novo login depois de a sessão expirar no meio do pagamento. Logout, ou a entrada de outro usuário na mesma aba, apaga esse rascunho (`forgetCheckout`, chamado pelo ciclo de sessão), porque ele guarda dados privados.
- **Cotação revisada.** O resumo usa a cotação da API para a rede escolhida (`useCartQuote`). `reviewQuote` compara a cotação que o usuário viu com a mais recente. Uma cotação reemitida com os mesmos valores, ou a taxa da rede que o usuário acabou de escolher, não pede nada. Qualquer outra diferença (preço, quantidade, itens, desconto, ou taxa sem troca de rede, via `diffQuotes`) aparece listada e bloqueia a compra até "Aceitar novos valores", mesmo que a rede tenha mudado ao mesmo tempo. O pedido sempre leva o id da cotação aceita. Se a API ainda assim responder `quote_outdated`, `quote_expired` ou falta de estoque, o carrinho e a cotação são reconsultados e as diferenças aparecem do mesmo jeito. Um item que esgota mostra "A disponibilidade mudou" e leva ao carrinho.
- **Carteira.** "Conectar carteira" valida rede, endereço e tipo, e chama `POST /wallet-connections`, que pode ser recusado (403 `wallet_rejected`, mensagem no painel). A conexão só vale enquanto bate com os campos; mudar rede, endereço ou tipo exige reconectar. "Desconectar" chama `DELETE`. Sem conexão válida, o pedido não sai e o foco vai para o botão de conectar.
- **Idempotência.** Cada tentativa é `{ chave, impressão do corpo, corpo }` (`attemptFor`): o mesmo corpo reaproveita a chave; qualquer mudança gera outra. A tentativa é gravada antes do envio. Clique repetido: o botão desabilita e um ref ignora envios simultâneos; se algo escapar, a mesma chave devolve o mesmo pedido. Timeout (o cliente desiste em 8 s): a tentativa fica guardada e "Verificar compra" reenvia com a **mesma** chave, recebendo o pedido já criado. Refresh no meio do envio: a página encontra a tentativa e oferece a mesma verificação, mesmo se o carrinho já estiver vazio porque o pedido foi pago.
- **Estado do pedido.** `useOrder` lê `['user', userId, 'orders', id]` com `meta.realtime`. `orderRealtimeApplier` aplica `order.updated` só quando `shouldApplyOrderUpdate` permite (versão mais nova e transição válida), e o `structuralSharing` da query aplica a mesma regra às respostas REST. Assim, eventos duplicados, cópias antigas ou uma resposta atrasada nunca tiram um pedido de `confirmed`. Enquanto pendente, há polling: a cada 2 s com o socket fora, e a cada 10 s com ele conectado, como rede de segurança. Confirmado: o rascunho é apagado, o carrinho reconsultado (a API removeu só os itens e as quantidades comprados) e o recibo abre. Recusado: motivo da API, "Os NFTs continuam no seu carrinho" e opções de tentar de novo ou voltar ao carrinho.
- **Recibo.** Tudo vem do snapshot do pedido (linhas, totais, rede, carteira e transação), então mudanças posteriores no catálogo não alteram o recibo. Hash e link do explorador (Etherscan, Polygonscan ou Solscan, conforme a rede) são simulados pelo mock.
- **E2E.** `e2e/checkout.spec.ts` cobre os itens 6 (do detalhe ao recibo, com o carrinho esvaziado), 7 (recusa, clique duplo com uma só chave, timeout recuperado com a mesma chave, carteira recusada e desconexão), 9 (preço novo exige aceite; item esgotado bloqueia) e 10 (eventos duplicados, socket derrubado com refresh durante o pendente, e refresh com a compra sem resposta).

## Acessibilidade e regressão visual

- **Varredura automática.** `e2e/a11y.spec.ts` roda o axe-core (regras WCAG 2.1 A e AA) em início, detalhe, carrinho, login, cadastro, 404, pagamento, recibo, perfil, carteiras e lista de interesse, além do diálogo de ampliação da arte e do painel de filtros abertos, em desktop e mobile. O teste falha com qualquer violação. A única encontrada foi o link "Aplique no carrinho", que dependia só da cor dentro do texto e agora é sublinhado.
- **Teclado e foco (E2E #11).** O link "Pular para o conteúdo" é o primeiro Tab e leva o foco ao `main`. O diálogo de ampliação e o painel de filtros prendem o foco e o devolvem ao gatilho no Esc; o diálogo de login já era coberto no E2E #3. O pagamento é concluído só com o teclado: carteira escolhida com as setas, conectar e confirmar com Enter.
- **Validação.** No pagamento, enviar com campos inválidos marca todos com `aria-invalid` e foca o primeiro. O erro de endereço por rede (`refineWalletAddress`) usa a opção `when` do Zod 4 e aparece junto com os outros erros, em vez de só depois de corrigir o resto; a mensagem é a descrição acessível do campo.
- **Regressão visual.** `e2e/visual.spec.ts` compara início, detalhe, carrinho e pagamento com baselines versionadas em `e2e/__screenshots__/<projeto>/` (desktop 1440 e mobile 390; atualizar com `pnpm test:e2e:update`). Antes da captura: rede ociosa, nenhum `aria-busy`, imagens lazy forçadas para carregamento imediato e decodificadas. O painel de cenários, os toasts e a tab bar fixa (que a captura de página inteira fixaria numa altura arbitrária) ficam ocultos por `e2e/support/screenshot.css`. A tolerância é de 1% dos pixels.
- **Bug encontrado pela regressão visual.** O carrossel calculava as páginas com `scrollWidth / clientWidth`. Com a lista sem largura (oculta ou ainda sem layout), o resultado era `Infinity`, e `Array.from` derrubava a página inteira. Agora a medição é ignorada enquanto a largura é 0.

## Responsividade, zoom e SEO

- **Varredura responsiva.** 108 estados verificados em 320, 390, 640 (zoom de 200% sobre 1280), 768, 1024 e 1440 px: páginas públicas, 404, carrinho com itens, pagamento (inicial, com erros de validação e aviso de valores alterados, com carteira conectada), pedido pendente, recusado, recibo, pagamento vazio e área da conta. Nenhum overflow horizontal e nenhum elemento além da viewport fora das áreas de rolagem intencional (carrosséis).
- **Zoom com pouca altura.** Com zoom de 200% numa tela 1280×720, a viewport tem 640×360. Login e cadastro rolam dentro do diálogo e o painel de filtros rola dentro da folha. A arte ampliada é dimensionada pelo menor lado disponível (`min(90vw, 90dvh, 45rem)`); antes, saía da tela em cima e embaixo, com o botão de fechar fora de alcance.
- **Inicialização em paralelo.** O módulo do app não tem efeitos colaterais: `createApp()` cria serviços, router e ciclo de sessão. Por isso `main.tsx` baixa o app junto com o MSW e a fonte, e só chama `createApp()` depois que o worker intercepta as requisições. Uma exceção pede cuidado: o Engine.IO guarda `globalThis.WebSocket` ao ser avaliado, e o MSW só troca essa classe quando o worker inicia. Por isso o `socket.io-client` é importado sob demanda no primeiro `connect()` (`realtime-client.ts`), que acontece depois do MSW. Importá-lo com o app fazia o socket ir para o servidor real, com erro no console e sem eventos; os E2E de tempo real cobrem esse caminho. Na mesma máquina e nas mesmas condições (Lighthouse mobile, mediana de 3), o LCP do início caiu de 7,8 s para 5,8 s.
- **Tela inicial.** O `index.html` traz dentro de `#root` a marca e "Carregando o marketplace…" (`role="status"`, estilos inline), trocadas pelo React na montagem. O FCP mobile foi de 3,9 s para 1,8 s, sem CLS. A nota de performance não muda: o carregamento do MSW e do app, que antes ficava antes do FCP, passa a contar no TBT (que mede do FCP ao TTI). A tela vazia é que deixou de existir.
- **Esqueleto com altura de tela.** O placeholder do detalhe do NFT tem `min-h-dvh`. Mais baixo que a página real, ele deixava o rodapé visível e depois empurrado para baixo (CLS de 0,15 no desktop).
- **Limite do MSW.** O chunk do MSW tem cerca de 470 KB; quase tudo é a própria biblioteca e suas dependências de cookies (`tough-cookie` e a lista de sufixos do `tldts`), que o app nem usa, já que autentica por token. Substituir essas dependências por stubs mexeria em internals de terceiros num caminho que só existe na demo; em produção, com API real, esse chunk não é carregado.
- **Títulos em ordem.** "Faixa de preço" é o rótulo de um grupo de controles (`role="group"` + `aria-labelledby`), não um `h3`: ele aparecia antes do primeiro `h2` da página (auditoria `heading-order` do Lighthouse, que não faz parte das regras WCAG do axe).
- **SEO.** Toda rota tem título e descrição próprios: o NFT usa nome e descrição; o 404 do NFT, do pedido e de URL inexistente têm título de "não encontrado" (uma URL sem rota é reconhecida por ter apenas o match da raiz). Páginas privadas (pagamento, conta e pedidos) recebem `noindex` pelo layout `_authenticated` e ficam em `Disallow` no `robots.txt`. `lang="pt-BR"` no documento.

## Lighthouse

`pnpm lighthouse` gera o build com mocks e mede início e detalhe (`/nfts/sage-nomad-009`) três vezes por perfil. As asserções usam a mediana, e `reports/lighthouse/<perfil>/` guarda o relatório HTML/JSON da execução mediana de cada página. Medição de 31/10, pela manhã:

| Perfil  | Página  | Performance | Acessibilidade | Boas práticas | SEO |    FCP |   LCP |      TBT | CLS |
| ------- | ------- | ----------: | -------------: | ------------: | --: | -----: | ----: | -------: | --: |
| Mobile  | Início  |          49 |            100 |           100 | 100 |  1,9 s | 6,1 s | 1 785 ms |   0 |
| Mobile  | Detalhe |          49 |            100 |           100 | 100 |  1,8 s | 6,0 s | 1 844 ms |   0 |
| Desktop | Início  |          82 |            100 |           100 | 100 | 0,46 s | 1,5 s |   305 ms |   0 |
| Desktop | Detalhe |          83 |            100 |           100 | 100 | 0,46 s | 1,4 s |   297 ms |   0 |

**Ferramentas, ambiente e condições.** Lighthouse 12.6.1 via `@lhci/cli` 0.15.1, no Chromium 156 do Playwright (headless). Node 24.22 e pnpm 12.14. Linux 6.18 no WSL2, com 6 núcleos (`benchmarkIndex` 1 005–1 168, que mede a velocidade de CPU da máquina). Build otimizado servido por `vite preview`, com o cenário padrão dos mocks (latência de 150–350 ms por requisição). Throttling simulado: no mobile, tela de 412×823, RTT de 150 ms, ~1,6 Mbps e CPU 4× mais lenta; no desktop, RTT de 40 ms, ~10 Mbps e CPU sem redução.

Nas três execuções, a performance desktop variou de 82 a 90 (na rodada anterior, de 84 a 92); a mobile, de 47 a 51.

**Justificativas.**

- **Performance mobile.** O perfil mobile simula CPU 4× mais lenta e 4G lento. Antes do primeiro render, o navegador baixa e avalia o MSW (~470 KB, quase tudo biblioteca e dependências de cookies), que representa o backend e não existiria com uma API real. Esse custo aparece no LCP e no TBT. Por isso a asserção de performance mobile só avisa abaixo de 0,9.
- **Comparação com 30/10.** A nota mobile caiu de cerca de 80, medida em 30/10, para cerca de 50, mas a causa é principalmente o ambiente: o build daquele dia, medido agora na mesma máquina, dá 51–57. A diferença restante (+0,4 s de FCP e +0,9 s de LCP antes da tela inicial) vem das fatias entregues depois (carrinho, pagamento e conta), parte delas no grafo inicial.
- **Testado e descartado.** Declarar `"sideEffects"` no `package.json` permitiu ao bundler descartar a UI não usada pelos barrels das features, mas dividiu o JS inicial em 76 arquivos, e a cadeia de imports mais longa piorou o FCP (de 3,9 s para 4,2 s). Foi revertido.
- **Gate do desktop.** A asserção de performance falha abaixo de 0,8: a mediana oscila entre 0,82 e 0,92 no mesmo build, e um limite que alterna com o ruído não detecta regressão.
