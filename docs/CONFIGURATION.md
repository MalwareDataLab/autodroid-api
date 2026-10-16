# Configuração

A API precisa de credenciais de dois serviços do Google: o Firebase (autenticação) e o Google Cloud Storage (arquivos). As duas podem sair da mesma conta ou de contas diferentes.

## Firebase

1. Entre na conta Google que vai administrar o projeto e abra o [Firebase Console](https://console.firebase.google.com/).
2. Crie um projeto ou use um que já exista.
3. Abra o [Firebase Authentication](https://console.firebase.google.com/project/_/authentication/providers) e habilite os provedores Email e Google.
4. Abra o [Firebase Storage](https://console.firebase.google.com/project/_/storage) e crie um bucket (ou use um existente). Anote o nome do bucket.
5. Crie a aplicação web e guarde os dados de configuração, que o frontend vai usar.
6. Crie uma [conta de serviço para o Firebase Admin SDK](https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk) e baixe a chave JSON. Guarde o arquivo em um lugar seguro.

O Firebase pode pedir um cartão de crédito para ativar o Storage, mesmo dentro do limite gratuito. Quando este texto foi escrito, o plano gratuito dava 5 GB, mais do que a aplicação precisa. Os preços atuais estão na [página oficial](https://firebase.google.com/pricing).

Existe também um [passo a passo com capturas de tela](./FIREBASE_SETUP_EXAMPLE.md).

## Google Cloud Storage

Se o bucket do Firebase já serve, pule esta seção.

1. Abra o [Google Cloud Console](https://console.cloud.google.com/) e escolha um projeto.
2. Ative a [API do Cloud Storage](https://console.cloud.google.com/apis/library/storage.googleapis.com). Se o projeto pedir, associe uma [conta de faturamento](https://console.cloud.google.com/billing).
3. Crie um [bucket](https://console.cloud.google.com/storage/browser) (ou use um existente) e anote o nome.
4. Crie uma [conta de serviço](https://console.cloud.google.com/iam-admin/serviceaccounts) com [permissão de escrita no bucket](https://cloud.google.com/storage/docs/access-control/iam-roles).
5. Gere uma [chave JSON](https://cloud.google.com/iam/docs/keys-create-delete) para a conta de serviço e guarde o arquivo.

## Variáveis de ambiente

No Docker, as variáveis ficam no `docker-compose.yml`. Na instalação manual, copie `packages/api/.env.example` para `packages/api/.env`.

As seções `#General`, `#Database`, `#Non-relational database` e `#Redis` já funcionam no Docker. `CORS_ALLOWED_FROM` só vale em produção (`NODE_ENV=production`): lista as origens permitidas, separadas por vírgula, e o `*` não funciona como curinga ali. Fora de produção, qualquer origem é aceita, e o `docker-compose.yml` usa `NODE_ENV=development`.

Obrigatórias:

- `FIREBASE_AUTHENTICATION_PROVIDER_PROJECT_ID`, `FIREBASE_AUTHENTICATION_PROVIDER_CLIENT_EMAIL` e `FIREBASE_AUTHENTICATION_PROVIDER_PRIVATE_KEY`: valores da conta de serviço do Firebase.
- `GOOGLE_STORAGE_PROVIDER_PROJECT_ID`, `GOOGLE_STORAGE_PROVIDER_CLIENT_EMAIL`, `GOOGLE_STORAGE_PROVIDER_PRIVATE_KEY` e `GOOGLE_STORAGE_PROVIDER_BUCKET_NAME`: valores da conta de serviço do Cloud Storage. Para um bucket do Firebase, use o nome sem o prefixo `gs://`.
- `ADMIN_EMAILS`: emails dos administradores, separados por vírgula.
- `APP_URL`: endereço público da API. O emissor do OAuth do MCP é a origem desse endereço.
- `FRONTEND_URL`: endereço do frontend. O consentimento do MCP abre em `${FRONTEND_URL}/mcp/authorize`.
- `MCP_OAUTH_CLIENT_ID_SECRET`: segredo aleatório do servidor OAuth do MCP. Sem ele a API não sobe, e o `docker-compose.yml` entrega o campo vazio.
- `JOBS_ENABLED`: use `true` para processar jobs em segundo plano.
- `WORKER_REFRESH_TOKEN_SECRET` e `WORKER_ACCESS_TOKEN_SECRET`: valores aleatórios e secretos.

Opcionais (deixe vazio, como em `CAMPO=`, se não for usar):

- `SENTRY_DSN`: chave do [Sentry](https://sentry.io/).
- `STORAGE_PROVIDER_PUBLIC_READ_URL_EXPIRATION`, `STORAGE_PROVIDER_PUBLIC_WRITE_URL_EXPIRATION`, `WORKER_REFRESH_TOKEN_EXPIRATION`, `WORKER_ACCESS_TOKEN_EXPIRATION`, `PROCESSING_DEFAULT_KEEP_UNTIL` e `PROCESSING_ALLOWED_KEEP_UNTIL_EXTEND`: durações no formato da biblioteca [ms](https://www.npmjs.com/package/ms), como `15m` ou `7d`.
