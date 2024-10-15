# Codebase Structure

A estrutura interna é proposta a seguir:

## Backend

```
.
├── .github/ - contém todos os arquivos relacionados ao GitHub, como modelos de problemas, modelos de solicitações de recebimento e GitHub Actions
├── .husky/ - ganchos git (não edite sem usar o Husky CLI)
├── .vscode/ - configuração do vscode
├── dist/ - contém os arquivos compilados para produção
├── docs/ - contém a documentação do projeto
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
    ├── outputs
    ├── types
    └── utils
```
