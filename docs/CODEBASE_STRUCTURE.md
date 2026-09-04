# Codebase Structure

Este repositório é um monorepo (Yarn workspaces) com três pacotes independentes em `packages/`:

- `packages/api` - o servidor REST + GraphQL (o "back-end" propriamente dito), único que é publicado como imagem Docker
- `packages/cli` - o CLI `autodroid`, cliente de linha de comando que fala com a API já implantada
- `packages/mcp` - o servidor MCP `autodroid-mcp`, expõe as mesmas operações do CLI como ferramentas MCP sobre stdio

CLI e MCP não são módulos da API: são clientes HTTP/GraphQL independentes que apenas residem neste repositório por conveniência. Cada pacote tem seu próprio `package.json`, dependências, lint, build e suíte de testes.

A estrutura interna é proposta a seguir:

## packages/api (Backend)

```
packages/api/
├── dist/ - contém os arquivos compilados para produção
├── prisma/ - contém os arquivos relacionados ao banco de dados gerenciado pelo Prisma
├── scripts/ - contém os scripts relacionados à aplicação
├── src/ - contém os arquivos relacionados à aplicação
│   ├── @types/ - definições de tipos globais
│   ├── modules/ - contém partes do software separadas pelo domínio
│   │   ├── <<module>>/
│   │   │   ├── constants - constantes
│   │   │   ├── entities - entidades
│   │   │   ├── guards - guardas de acesso
│   │   │   ├── infrastructure - infraestrutura do módulo (http, ws, banco de dados, ORM, e outros)
│   │   │   ├── repositories - interfaces de repositórios de dados para inversão de dependência (DDD)
│   │   │   ├── schemas - esquemas de validação de entrada do usuário
│   │   │   ├── services - camada de negócio
│   │   │   └── types - tipos, enums e interfaces
│   └── shared/
│   │   ├── config - arquivos de configuração
│   │   ├── constants - constantes globais
│   │   ├── container - contém os provedores para injeção de dependência
│   │   │   ├── providers/<<name>> - pasta raiz do provedor
│   │   │   │   ├── implementations - implementação do provedor
│   │   │   │   └── mocks - provedor falso para fins de teste
│   │   │   └repositories - contém as referências dos repositórios
│   │   ├── decorators - decoradores globais
│   │   ├── errors - exceções controladas/forçadas
│   │   ├── i18n - internacionalização
│   │   ├── infrastructure - infraestrutura global
│   │   │   ├── app - inicializador da aplicação
│   │   │   ├── graphql - módulo de inicialização do graphql
│   │   │   ├── http - módulo de inicialização do http
│   │   │   │   ├── middlewares - middlewares globais
│   │   │   │   └── routes - roteador global que une todos os módulos em um
│   │   │   └── websocket - módulo de inicialização do websocket
│   │   ├── types - tipos e interfaces globais
│   │   └── utils - funções utilitárias
└── test/
    ├── config
    ├── mcp/ - camada `test:external`: autentica de verdade (Firebase real) e
    │         sobe o backend real contra a DB real para provar que o MCP
    │         funciona autenticado ponta a ponta (autodroid-cli + autodroid-mcp
    │         como devDependencies do workspace)
    ├── outputs
    ├── types
    └── utils
```

## packages/cli

```
packages/cli/
├── src/
│   ├── auth/ - sessão local (login/logout) e credenciais do Firebase
│   ├── client/ - cliente HTTP/GraphQL para a API
│   ├── commands.ts - implementação de cada comando, reutilizada pelo pacote MCP
│   ├── context.ts - configuração (URL da API, chave do Firebase) via variáveis de ambiente
│   ├── index.ts - definição dos comandos yargs (`runCli`)
│   └── bin.ts - ponto de entrada executável (`autodroid`)
└── test/ - configuração do Vitest
```

## packages/mcp

```
packages/mcp/
├── src/
│   ├── server.ts - registra as ferramentas MCP e conecta o transporte stdio
│   ├── tools.ts - define as ferramentas MCP reutilizando `autodroid-cli`'s commands
│   ├── bin.ts - ponto de entrada executável (`autodroid-mcp`)
│   └── mcp.process-e2e.test.ts - e2e real (processo + stdio reais, zero mocks)
└── test/ - configuração do Vitest (projetos `unit` e `e2e`)
```
