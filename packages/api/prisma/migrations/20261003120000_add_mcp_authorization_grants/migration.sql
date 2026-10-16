-- CreateTable
CREATE TABLE "mcp_authorization_grants" (
    "id" TEXT NOT NULL,
    "seq" BIGSERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "client_name" TEXT,
    "resource" TEXT NOT NULL,
    "scopes" TEXT[],
    "token_generation" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mcp_authorization_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mcp_authorization_grants_seq_key" ON "mcp_authorization_grants"("seq");

-- CreateIndex
CREATE UNIQUE INDEX "mcp_authorization_grants_user_id_client_id_resource_key" ON "mcp_authorization_grants"("user_id", "client_id", "resource");

-- AddForeignKey
ALTER TABLE "mcp_authorization_grants" ADD CONSTRAINT "mcp_authorization_grants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
