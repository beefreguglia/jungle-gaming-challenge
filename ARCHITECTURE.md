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
