# Estrutura do código

O repositório é um monorepo Yarn com um único pacote, `packages/api`: o servidor REST e GraphQL, publicado como imagem Docker. A API também serve um servidor MCP remoto em `/mcp` (veja [MCP](./MCP.md)). O CLI `autodroid` e o MCP via stdio ficam no repositório [autodroid-sdk](https://github.com/MalwareDataLab/autodroid-sdk), em `src/cli/`.

## packages/api

```
packages/api/
├── dist/              arquivos compilados para produção
├── prisma/            esquema e migrações do banco (Prisma)
├── scripts/           scripts de apoio
├── src/
│   ├── index.ts       ponto de entrada
│   ├── @types/        tipos globais
│   ├── modules/       um diretório por domínio
│   │   └── <module>/
│   │       ├── constants/       constantes
│   │       ├── entities/        entidades
│   │       ├── guards/          guardas de acesso
│   │       ├── infrastructure/  http, graphql, banco de dados e outras integrações do módulo
│   │       ├── repositories/    interfaces dos repositórios (inversão de dependência)
│   │       ├── schemas/         validação da entrada
│   │       ├── services/        regras de negócio
│   │       ├── types/           tipos, enums e interfaces
│   │       └── utils/           funções do módulo
│   └── shared/
│       ├── config/            configuração
│       ├── constants/         constantes globais
│       ├── container/         injeção de dependência
│       │   ├── providers/     um diretório por provedor (implementations, models, types)
│       │   └── repositories/  referências dos repositórios
│       ├── decorators/        decoradores globais
│       ├── errors/            erros controlados
│       ├── i18n/              internacionalização
│       ├── infrastructure/    app, graphql, http (middlewares e routes), saml, sentry, websocket
│       ├── types/             tipos globais
│       └── utils/             funções utilitárias
└── test/
    ├── config/        configuração do Vitest
    ├── factories/     fábricas de dados de teste
    ├── fixtures/      contrato das ferramentas MCP
    ├── live/          teste local do MCP com um host real, fora da execução padrão
    ├── mcp/           testes do MCP via HTTP e OAuth
    ├── sdk/           testes externos com o SDK
    ├── outputs/       relatórios de cobertura
    ├── types/         tipos de teste
    └── utils/         utilitários de teste
```

## Testes

Os testes ficam ao lado do código que testam. O sufixo do arquivo indica a camada:

- `.spec.ts`: unitário
- `.test.ts`: integração, com banco em contêiner
- `.e2e.test.ts`: ponta a ponta, pela API HTTP
- `.external.test.ts`: usa serviços reais de terceiros e só roda com `test:external`
