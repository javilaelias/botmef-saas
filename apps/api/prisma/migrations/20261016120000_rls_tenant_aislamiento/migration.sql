-- MB3: Row Level Security (ADR-002, barrera 2).
-- Corre con el rol propietario. app_botmef (NOBYPASSRLS, no dueño) se crea en
-- docker/postgres/init/01-roles.sh; aquí solo recibe permisos.
GRANT USAGE ON SCHEMA public TO app_botmef;
GRANT SELECT, UPDATE ON "tenants" TO app_botmef;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['usuarios','numeros_whatsapp','contactos','conversaciones','mensajes',
                           'opt_ins','plantillas','kb','consumo','auditoria']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO app_botmef', t);
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    -- NULLIF: fuera de runInTenantContext el GUC vuelve como '' y ''::uuid fallaría;
    -- con NULL la comparación no es verdadera y no se ve ninguna fila.
    EXECUTE format(
      'CREATE POLICY tenant_aislamiento ON %I
         USING (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)
         WITH CHECK (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)', t);
  END LOOP;
END $$;
