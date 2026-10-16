# MCP

As mesmas operações da API estão disponíveis para qualquer cliente MCP, pelo Model Context Protocol, de dois jeitos:

- stdio: o comando `autodroid mcp` do pacote `autodroid` (ou `npx -y autodroid mcp`, sem instalar). A configuração do host está no [autodroid-sdk](https://github.com/MalwareDataLab/autodroid-sdk).
- HTTP remoto: aponte o host MCP para `https://<host-da-api>/mcp` (Streamable HTTP). Não precisa instalar nada. Um cliente que roda no navegador só funciona se a origem dele estiver em `CORS_ALLOWED_FROM` (veja [Origem das requisições](#origem-das-requisições)).

## Autorização do servidor remoto

- A API tem um Authorization Server OAuth 2.1 próprio (módulo `mcpAuthorization`), que reaproveita a autenticação do Firebase, sem servidor de identidade novo.
- O registro de cliente usa CIMD primeiro e o DCR da RFC 7591 como alternativa.
- O `client_id` do DCR é assinado só com os `redirect_uris` (sem a porta nos de loopback, que aceitam qualquer porta) e o `client_name`. Registrar de novo os mesmos dados devolve o mesmo `client_id`, e a autorização cai na mesma conexão.
- Cada conexão é um grant no Postgres, na tabela `mcp_authorization_grants`, com uma linha só por usuário, cliente (`client_id`) e recurso. Autorizar de novo o mesmo cliente atualiza essa linha, com o mesmo `id`: troca nome e escopos pelos da nova autorização, renova os 90 dias de `expires_at` e reativa a conexão se ela estava revogada. `revoked_at` guarda a revogação, e `last_used_at` a última emissão de tokens.
- Os tokens emitidos antes continuam valendo até expirar, limitados aos escopos que a linha tem agora. Cada cadeia de refresh guarda o prazo de 90 dias da autorização que a criou e nunca passa dele: autorizar de novo não estende nem revive os tokens de outra autorização. Revogar avança `token_generation`, e um token de geração anterior é recusado, então reativar a conexão não revive os tokens que a revogação cortou.
- `client_verified_host` é o host do documento CIMD, que o servidor baixou do próprio `client_id`. Num cliente DCR ele é nulo, porque nome e dados foram declarados pelo próprio cliente, sem verificação.
- Os tokens de acesso e de refresh ficam no Redis, só como hash. O token de acesso vale 1 hora, o de refresh 30 dias, e o grant 90 dias no total.
- Os escopos são `autodroid:read` (ferramentas que só leem), `autodroid:write` (as que alteram ou excluem) e `autodroid:admin` (as de administração, que também exigem um administrador). Um cliente que não pede escopo recebe `autodroid:read` e `autodroid:write`. Quem não é administrador nunca recebe `autodroid:admin`, e a resposta do `/oauth/token` traz o campo `scope` com o que foi concedido.
- Os escopos aparecem em `scopes_supported` nos dois documentos de descoberta. O servidor lista as ferramentas da pessoa (as de administração só para administradores) e confere os escopos do token na chamada. Chamar uma ferramenta que o token não cobre devolve 403 com `WWW-Authenticate: Bearer error="insufficient_scope"` e o `scope` a pedir, que traz os escopos do token mais o que falta, e o cliente repete a autorização com esse escopo. Uma requisição sem credenciais recebe 401 com a sugestão `autodroid:read autodroid:write`.
- Um refresh pode pedir menos escopos que o grant tem, nunca mais. Se a linha não tem mais nenhum dos escopos do refresh token, o refresh falha com `invalid_grant`.
- O usuário lista seus grants ativos (os mais recentes primeiro, sem limite) e revoga pelo GraphQL, com `userMcpAuthorizationGrants` e `userMcpAuthorizationGrantRevoke`. A página de perfil do frontend usa essas operações.
- Revogar corta o acesso na hora, porque o refresh e a verificação do token consultam o grant no banco a cada requisição. Restaurar um snapshot do Redis não reativa um grant revogado.
- Também revogam grants: o reuso de um refresh token já rotacionado, a revogação do refresh token pelo cliente (RFC 7009) e `userSessionsClose` ("encerrar todas as sessões"). O `userSessionsClose` ainda incrementa uma época por usuário no Redis (`mcp-oauth:sessions-epoch:`), o que invalida códigos de autorização aprovados e ainda não trocados por tokens.

## Ferramentas

- Cada ferramenta executa uma operação GraphQL pelo servidor GraphQL da própria API, com a sessão do token MCP. Resolvers, validação de argumentos, autorização de administrador e tratamento de erros são os mesmos de quem usa `/graphql`. O servidor MCP não tem rotas nem chamadas de serviço próprias.
- As definições ficam em `src/modules/mcp/constants/`, um arquivo por recurso (`mcpDatasetTools.constant.ts`, por exemplo). Cada uma tem nome, descrição, anotações, a operação GraphQL e, só quando precisa, uma função que monta o resultado. A definição não declara a entrada, exceto nas listas, em que `inputPolicy` troca o `take` pela regra do MCP. Os campos pedidos à API estão em `mcpGraphQLSelection.constant.ts`: um campo que a ferramenta não pede nunca chega ao cliente.
- A entrada de cada ferramenta vem das classes de esquema que o resolver já usa para validar, como `UserDatasetCreateSchema` e `ProcessingIndexSchema` em `src/modules/*/schemas/`. O `src/modules/mcp/utils/mcpToolInputShape.util.ts` encontra o resolver do campo raiz da operação e lê os metadados do type-graphql (tipo, obrigatoriedade, enum, lista e descrição) e do class-validator (tamanho mínimo e máximo de textos e listas, limites numéricos, textos que não podem ficar vazios e padrões de texto). Os argumentos têm os nomes da API, como `dataset_id` e `data`, e a operação repassa cada um numa variável de mesmo nome.
- A entrada é estrita no nível de cima e em cada classe aninhada. Uma chave que a classe não declara é recusada antes de a ferramenta rodar, com uma mensagem que nomeia a chave, e assim um nome de campo digitado errado nunca apaga um valor por omissão.
- Algumas validações não cabem em JSON Schema: UUID, hash MD5, telefone, idioma, versão semântica e as datas mínima e máxima. Essas ficam só no servidor, que usa a mesma classe e devolve a mensagem dela ao cliente. Se uma classe usar uma validação que o utilitário não conhece, a API não inicia. A entrada de todas as ferramentas é montada na subida, em `buildMcpRouter`, e o erro nomeia a validação e o campo.
- Quando o cliente precisa de uma descrição que a API ainda não tem, ela entra no `@Field` ou no `@Arg` da própria classe, e a documentação do GraphQL ganha a mesma descrição.
- O MCP só acrescenta duas regras próprias. As listas não oferecem os argumentos de cursor (`after`, `before`, `first` e `last`), e o `take` vale 10 por padrão, com máximo de 100 (`src/modules/mcp/schemas/mcpToolInput.schema.ts`).
- O servidor é montado a cada requisição em `src/modules/mcp/utils/createMcpServer.util.ts`. As ferramentas de administração só aparecem para administradores, e a autorização real é a da API.
- Seguem o contrato `test/fixtures/mcpToolContract.json`, uma cópia byte a byte de `src/cli/operations/toolContract.json` do SDK. No SDK, `yarn contract` gera o arquivo e `yarn lint:schema` confere. O teste `mcpTools.constant.spec.ts` compara cada ferramenta com o contrato e valida cada operação contra o esquema GraphQL.
- O contrato fixa, para cada ferramenta, o nome, o campo GraphQL, a descrição, o acesso, o efeito e os campos de saída de primeiro nível. Nas listas, esses campos são `items`, `total_count` e `has_next_page`, mais `itemOutput` com os campos de cada item. A entrada fica fora do contrato porque pertence às classes de esquema da API, e o CLI do SDK continua com as próprias opções.
- O nome segue o comando do CLI: `autodroid_<verbo>_<recurso>`. Por exemplo, `dataset publish` vira `autodroid_publish_dataset`, e `processing estimate-finish` vira `autodroid_estimate_processing_finish`.
- As listas paginam com `take` e `skip` e devolvem uma página com `total_count` e `has_next_page`. Os inteiros de entrada respeitam o `Int` de 32 bits do GraphQL.
- Os links de download dos arquivos vêm do GraphQL, como para qualquer cliente.
- O valor de um token de registro de worker só aparece em `autodroid_admin_show_worker_registration_token` e `autodroid_admin_create_worker_registration_token`.
- Os testes `test/live/*.live.test.ts` usam um cliente MCP real de linha de comando, com um modelo leve, contra o `/mcp`, com o token do fluxo OAuth. `mcpRemoteHost` cobre leitura, escrita recusada e escrita permitida. `mcpEveryTool1` a `mcpEveryTool6` pedem ao modelo que chame cada uma das 53 ferramentas com os argumentos dos cenários de `mcpToolScenarios.util.ts`, em paralelo. `mcpSessionsClosingTool` chama `autodroid_close_sessions` sozinho, depois dos outros, porque ela encerra as sessões da conta de teste que as demais usam. O script `test:live-host` já executa as duas etapas em ordem. Os testes usam a conta de teste do Firebase compartilhada: `autodroid_update_profile` muda o nome dela e `autodroid_close_sessions` encerra as sessões dela, então não rode esses testes ao mesmo tempo que os testes e2e. Eles só rodam no seu computador, com o `packages/api/.env.test` preenchido e `MCP_LIVE_HOST_COMMAND=<comando> MCP_LIVE_HOST_MODEL=<modelo> yarn workspace autodroid-api run test:live-host`, e o `yarn test` não os executa.
- Os testes de integração (`mcpTools.constant.test.ts`) rodam cada ferramenta contra a API e o banco reais. O semeador de dados e a tabela de cenários estão em `test/utils/mcpToolWorld.util.ts` e `test/utils/mcpToolScenarios.util.ts`.

O `/mcp` recusa com 400 uma requisição cujo corpo seja uma lista de mensagens JSON-RPC, porque o limite de requisições contaria o lote inteiro como uma só.

A única diferença intencional em relação ao CLI é `autodroid_create_dataset`. O servidor remoto não lê o disco do cliente, então recebe em `data` os metadados do arquivo (`filename`, `mime_type`, `size` e `md5_hash`, com `mime_type` pelo nome do enum `MIME_TYPE` do GraphQL, como `CSV`) e devolve `file` com a URL assinada de upload.

## Origem das requisições

Os endereços `/oauth/*` e `/.well-known/*` aceitam qualquer origem, porque não usam cookie. O `/mcp` responde 403 a uma requisição cujo cabeçalho `Origin` não está em `CORS_ALLOWED_FROM`. A regra vale em produção; fora dela qualquer origem passa. Um cliente que não é navegador não envia `Origin` e não é afetado.

## Login do CLI pelo navegador

O CLI usa três rotas REST: `/cli-auth/register` (`code_challenge`, `user_code`), `/cli-auth/authorize` (`user_code`, com usuário autenticado) e `/cli-auth/token` (`code_verifier`).

Sem variáveis de ambiente, o CLI aponta para produção. As variáveis `AUTODROID_CLI_*` que sobrescrevem os endereços estão no [README do autodroid-sdk](https://github.com/MalwareDataLab/autodroid-sdk).
