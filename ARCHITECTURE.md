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

| Desvio                                                                                                  | Motivo                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ícones Iconly → `lucide-react`                                                                          | O Iconly não tem pacote npm livre; o lucide traz equivalentes com o mesmo traço                                                                                                                                               |
| Logos de redes sociais via `simple-icons`; LinkedIn como texto "in"                                     | O LinkedIn não está no simple-icons por questão de marca; o Figma também o desenha como texto                                                                                                                                 |
| "Criadores", "Aprenda", links de ajuda e extras do rodapé esmaecidos, com tooltip "Em breve"            | Fora do escopo; o enunciado pede que não aparentem sucesso. Continuam focáveis, então quem navega por teclado descobre o porquê                                                                                               |
| Newsletter responde "em breve" em vez de confirmar                                                      | Mesmo motivo: nenhum e-mail é salvo, então a interface não finge que salvou                                                                                                                                                   |
| Header mostra avatar e nome quando logado                                                               | O Figma mostra "Entrar" até nas telas de conta, o que contradiz a sessão ativa                                                                                                                                                |
| Rodapé também no mobile (empilhado)                                                                     | Os frames mobile mostram só a primeira dobra; o rodapé leva os mesmos links e informações de contato                                                                                                                          |
| Borda dos campos de formulário `#846341` em vez de `#3F2319`                                            | Ajuste de acessibilidade: a cor do Figma tem 1,3:1 contra o fundo, e os campos vazios ficavam quase invisíveis. O tom novo, da mesma família, tem 3,5:1 (WCAG 1.4.11). As linhas divisórias decorativas mantêm a cor original |
| Texto de erro (`destructive`) em Coral `#EA6B4F`; `#ED1B2E` (`error`) só em bordas, ícones e fundos     | O vermelho Error do Figma tem 4,4:1 contra o fundo, abaixo do AA para texto pequeno; o Coral, que também é token de texto do Figma, tem 6,2:1                                                                                 |
| Painel "Cenários" no canto inferior esquerdo                                                            | Controle de demonstração do backend simulado; não faz parte do layout                                                                                                                                                         |
| Labels dos campos de login e cadastro ocultos visualmente (`sr-only`), com dicas de formato no cadastro | O Figma usa só placeholders. O label continua para leitores de tela, e as dicas mostram as regras de usuário e senha antes do erro                                                                                            |
| "Esqueceu a senha?" e login com Google/Facebook mostram "Em breve"                                      | Fora do escopo; os botões não simulam autenticação                                                                                                                                                                            |
