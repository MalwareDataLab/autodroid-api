# Rotas da API

A tabela mostra as rotas REST do usuário. Todas, menos `/health`, exigem o header `Authorization: Bearer ${token}`, com o token do Firebase.

| Método | Rota                                             | Descrição                                         |
| ------ | ------------------------------------------------ | ------------------------------------------------- |
| GET    | /user                                            | Obter o usuário autenticado                       |
| PUT    | /user                                            | Atualizar o usuário                               |
| PATCH  | /user/learning-data                              | Atualizar os dados de aprendizado do usuário      |
| GET    | /user/session                                    | Obter a sessão atual                              |
| DELETE | /user/session                                    | Encerrar as sessões do usuário                    |
| GET    | /processor                                       | Listar os processadores                           |
| GET    | /processor/:processor_id                         | Obter um processador                              |
| GET    | /dataset                                         | Listar os conjuntos de dados                      |
| GET    | /dataset/:dataset_id                             | Obter um conjunto de dados                        |
| POST   | /dataset                                         | Criar um conjunto de dados                        |
| PUT    | /dataset/:dataset_id                             | Atualizar um conjunto de dados                    |
| DELETE | /dataset/:dataset_id                             | Excluir um conjunto de dados                      |
| POST   | /dataset/:dataset_id/request-publication         | Solicitar a publicação de um conjunto de dados    |
| GET    | /processing                                      | Listar os processamentos                          |
| GET    | /processing/estimated-execution-time             | Estimar o tempo de execução de um processamento   |
| GET    | /processing/:processing_id                       | Obter um processamento                            |
| POST   | /processing                                      | Solicitar o processamento de um conjunto de dados |
| DELETE | /processing/:processing_id                       | Excluir um processamento                          |
| PATCH  | /processing/:processing_id/extend-keep-until     | Estender o prazo de retenção do processamento     |
| PATCH  | /processing/:processing_id/update-visibility     | Alterar a visibilidade do processamento           |
| GET    | /processing/:processing_id/estimated-finish-time | Estimar quando o processamento termina            |
| GET    | /health, /health/readiness, /health/liveness     | Verificar o estado da API (sem autenticação)      |

As listas aceitam ordenação e paginação por `skip` e `take`, ou por cursor (`after` com `first`, `before` com `last`), sem misturar os dois. Sem tamanho, a página tem 100 itens, e o máximo é 1000. `totalCount` e `pageInfo` dizem se há mais páginas. Um cursor de uma linha que já não existe devolve 400.

Criar um conjunto de dados devolve uma `upload_url`. O arquivo é enviado para essa URL, e o campo `public_url` de um processamento concluído traz o link do resultado.

Existem também as rotas de administração (`/admin`), do worker (`/worker`), do login do CLI (`/cli-auth`) e do consentimento do MCP (`/mcp-auth`). O servidor OAuth do MCP tem rotas públicas, sem o header `Authorization`: `/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource/mcp`, `/oauth/authorize`, `/oauth/token`, `/oauth/register` e `/oauth/revoke`. O servidor MCP responde em `/mcp` (veja [MCP](./MCP.md)). As operações de usuário e de administração também estão no GraphQL, em `/graphql`.

Os corpos das requisições e das respostas estão na [coleção do Postman](https://www.postman.com/luizfelipelaviola/workspace/autodroid/collection/17242387-d69ee1f8-a603-4ac8-89aa-787cfacffaee?action=share&creator=17242387&active-environment=17242387-9dcb7b8e-4eb1-4a10-b607-74725449575f) e no esquema do GraphQL.
