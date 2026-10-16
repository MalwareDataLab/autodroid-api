# Contribuindo

Antes de começar, leia a [estrutura do código](./CODEBASE_STRUCTURE.md) e as [diretrizes de código](./CODE_GUIDELINES.md). Use Node.js 24 (a versão exata está em `.nvmrc`) e Yarn 1.

## Fluxo

1. Faça um fork do repositório e clone o seu fork.
2. Crie um branch a partir do `develop`, um por correção ou funcionalidade. O nome começa com o tipo: `bugfix`, `feature`, `hotfix`, `release` ou `other`.

   ```bash
   git checkout -b bugfix/mudar-algo
   ```

   Se der erro, busque o repositório antes:

   ```bash
   git remote update && git fetch
   ```

3. Mantenha o branch atualizado:

   ```bash
   git pull origin develop
   ```

   Pode ser preciso resolver conflitos.

4. Instale as dependências:

   ```bash
   yarn
   ```

5. Faça o commit. O husky roda `yarn`, `yarn lint` e o lint-staged antes de cada commit. O commitizen abre um assistente para a mensagem, no padrão Conventional Commits, e o commitlint valida o resultado. Cite o ID da issue na mensagem. As regras estão em [Mensagens de commit](./COMMIT_MESSAGE_GUIDELINES.md).

6. Abra o pull request para o branch `develop`.

O CI (lint, build, build da imagem Docker e testes) roda nos pull requests para `main` e `qa`. Rode `yarn lint` e `yarn test` antes de abrir o PR. O `yarn test` precisa do Docker e de `packages/api/.env.test` (veja a [configuração](./CONFIGURATION.md)). Ao participar, siga o [código de conduta](./CODE_OF_CONDUCT.md).
