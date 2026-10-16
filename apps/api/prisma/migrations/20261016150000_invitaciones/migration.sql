-- MB4: invitaciones (C5) con RLS, y alta de tenant desde el endpoint protegido (C6).
CREATE TABLE "invitaciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "email" VARCHAR(190) NOT NULL,
    "rol" "RolUsuario" NOT NULL DEFAULT 'agente',
    "token_hash" VARCHAR(64) NOT NULL,
    "expira_en" TIMESTAMPTZ(6) NOT NULL,
    "usada_en" TIMESTAMPTZ(6),
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invitaciones_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "invitaciones_token_hash_key" ON "invitaciones"("token_hash");
CREATE INDEX "invitaciones_tenant_id_email_idx" ON "invitaciones"("tenant_id", "email");
ALTER TABLE "invitaciones" ADD CONSTRAINT "invitaciones_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

GRANT INSERT ON "tenants" TO app_botmef;
GRANT SELECT, INSERT, UPDATE, DELETE ON "invitaciones" TO app_botmef;
ALTER TABLE "invitaciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invitaciones" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_aislamiento ON "invitaciones"
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
