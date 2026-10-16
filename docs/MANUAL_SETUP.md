# Instalação manual

Este guia roda a API sem Docker. Para o caminho com Docker, veja o [README](../README.md#como-executar).

## Requisitos

- Node.js 24 (a versão exata está em `.nvmrc`)
- [Yarn](https://classic.yarnpkg.com/lang/en/docs/install) 1.22.19 ou mais novo
- [PostgreSQL](https://www.postgresql.org/) 14 ou mais novo
- [Redis](https://redis.io/) 6.2.5 ou mais novo
- [MongoDB](https://www.mongodb.com/) 6 (a versão usada no `docker-compose.yml`)

PostgreSQL, Redis e MongoDB também podem rodar em contêineres Docker, como no `docker-compose.yml`.

## Instalação

```bash
git clone https://github.com/MalwareDataLab/AutoDroid.git
cd AutoDroid
yarn install
```

## Configuração

Copie `packages/api/.env.example` para `packages/api/.env` e preencha os valores. A [configuração](./CONFIGURATION.md) explica cada um.

Com o PostgreSQL rodando, crie e migre o banco:

```bash
yarn prisma:dev
```

O Redis não precisa de configuração extra.

## Desenvolvimento

```bash
yarn dev
```

## Produção sem Docker

Construa a API:

```bash
yarn build
```

O build gera os arquivos JavaScript em `packages/api/dist` e copia para lá os demais arquivos de `src`, como os modelos de email. No servidor, monte a mesma estrutura do `Dockerfile`:

- `package.json` e `yarn.lock`, da raiz do repositório
- `packages/api/package.json`
- `packages/api/prisma/`
- `packages/api/dist/`, renomeada para `packages/api/src/`

Instale só as dependências de produção, preencha `packages/api/.env` com os valores de produção, incluindo `NODE_ENV=production` (o `start:prod` define só `APP_ENV`), e inicie:

```bash
yarn install --frozen-lockfile --production
yarn run-s prisma:generate prisma:prod start:prod
```

A API usa a porta definida no `.env` (por padrão, `3333`). Configure o firewall e o SSL do servidor.
