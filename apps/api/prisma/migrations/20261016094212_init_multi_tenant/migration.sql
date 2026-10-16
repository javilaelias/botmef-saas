-- CreateEnum
CREATE TYPE "PlanTenant" AS ENUM ('free', 'starter', 'pro');

-- CreateEnum
CREATE TYPE "EstadoTenant" AS ENUM ('activo', 'suspendido');

-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('owner', 'agente', 'viewer');

-- CreateEnum
CREATE TYPE "EstadoConversacion" AS ENUM ('abierta', 'pendiente', 'cerrada');

-- CreateEnum
CREATE TYPE "DireccionMensaje" AS ENUM ('entrante', 'saliente');

-- CreateEnum
CREATE TYPE "EstadoMensaje" AS ENUM ('recibido', 'enviado', 'entregado', 'leido', 'fallido');

-- CreateEnum
CREATE TYPE "CategoriaPlantilla" AS ENUM ('marketing', 'utilidad', 'autenticacion');

-- CreateEnum
CREATE TYPE "EstadoMeta" AS ENUM ('borrador', 'pendiente', 'aprobada', 'rechazada');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(140) NOT NULL,
    "plan" "PlanTenant" NOT NULL DEFAULT 'free',
    "estado" "EstadoTenant" NOT NULL DEFAULT 'activo',
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "email" VARCHAR(190) NOT NULL,
    "nombre" VARCHAR(140) NOT NULL,
    "rol" "RolUsuario" NOT NULL DEFAULT 'agente',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "hash_password" VARCHAR(255),
    "ultimo_login" TIMESTAMPTZ(6),
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "numeros_whatsapp" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "phone_number_id" VARCHAR(64) NOT NULL,
    "waba_id" VARCHAR(64) NOT NULL,
    "display_number" VARCHAR(32) NOT NULL,
    "token_cifrado" TEXT NOT NULL,
    "token_key_version" INTEGER NOT NULL DEFAULT 1,
    "calidad" VARCHAR(20),
    "limite_mensajeria" VARCHAR(40),
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "numeros_whatsapp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contactos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "telefono" VARCHAR(32) NOT NULL,
    "nombre" VARCHAR(140),
    "atributos" JSONB NOT NULL DEFAULT '{}',
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contactos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversaciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "numero_id" UUID NOT NULL,
    "contacto_id" UUID NOT NULL,
    "estado" "EstadoConversacion" NOT NULL DEFAULT 'abierta',
    "ventana_expira_en" TIMESTAMPTZ(6),
    "asignada_a" UUID,
    "etiquetas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "creada_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensajes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "conversacion_id" UUID NOT NULL,
    "direccion" "DireccionMensaje" NOT NULL,
    "wamid" VARCHAR(128) NOT NULL,
    "tipo" VARCHAR(20) NOT NULL DEFAULT 'text',
    "texto" TEXT,
    "media_url" TEXT,
    "estado" "EstadoMensaje" NOT NULL DEFAULT 'recibido',
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensajes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opt_ins" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "contacto_id" UUID NOT NULL,
    "canal" VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
    "prueba" JSONB NOT NULL DEFAULT '{}',
    "estado" VARCHAR(20) NOT NULL DEFAULT 'activo',
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opt_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantillas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nombre" VARCHAR(140) NOT NULL,
    "categoria" "CategoriaPlantilla" NOT NULL,
    "idioma" VARCHAR(10) NOT NULL,
    "estado_meta" "EstadoMeta" NOT NULL DEFAULT 'borrador',
    "cuerpo" TEXT NOT NULL,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "plantillas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kb" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "categoria" VARCHAR(80) NOT NULL,
    "pregunta" TEXT NOT NULL,
    "respuesta" TEXT NOT NULL,

    CONSTRAINT "kb_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumo" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "periodo" VARCHAR(7) NOT NULL,
    "conversaciones_por_categoria" JSONB NOT NULL DEFAULT '{}',
    "costo" DECIMAL(12,4) NOT NULL DEFAULT 0,

    CONSTRAINT "consumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "usuario_id" UUID,
    "accion" VARCHAR(60) NOT NULL,
    "entidad" VARCHAR(60) NOT NULL,
    "entidad_id" VARCHAR(64),
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "usuarios_tenant_id_rol_idx" ON "usuarios"("tenant_id", "rol");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_tenant_id_email_key" ON "usuarios"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "numeros_whatsapp_tenant_id_idx" ON "numeros_whatsapp"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "numeros_whatsapp_tenant_id_phone_number_id_key" ON "numeros_whatsapp"("tenant_id", "phone_number_id");

-- CreateIndex
CREATE INDEX "contactos_tenant_id_idx" ON "contactos"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "contactos_tenant_id_telefono_key" ON "contactos"("tenant_id", "telefono");

-- CreateIndex
CREATE INDEX "conversaciones_tenant_id_estado_idx" ON "conversaciones"("tenant_id", "estado");

-- CreateIndex
CREATE INDEX "conversaciones_tenant_id_asignada_a_idx" ON "conversaciones"("tenant_id", "asignada_a");

-- CreateIndex
CREATE UNIQUE INDEX "conversaciones_tenant_id_numero_id_contacto_id_key" ON "conversaciones"("tenant_id", "numero_id", "contacto_id");

-- CreateIndex
CREATE INDEX "mensajes_tenant_id_conversacion_id_creado_en_idx" ON "mensajes"("tenant_id", "conversacion_id", "creado_en");

-- CreateIndex
CREATE UNIQUE INDEX "mensajes_tenant_id_wamid_key" ON "mensajes"("tenant_id", "wamid");

-- CreateIndex
CREATE INDEX "opt_ins_tenant_id_contacto_id_idx" ON "opt_ins"("tenant_id", "contacto_id");

-- CreateIndex
CREATE INDEX "plantillas_tenant_id_estado_meta_idx" ON "plantillas"("tenant_id", "estado_meta");

-- CreateIndex
CREATE UNIQUE INDEX "plantillas_tenant_id_nombre_idioma_key" ON "plantillas"("tenant_id", "nombre", "idioma");

-- CreateIndex
CREATE INDEX "kb_tenant_id_categoria_idx" ON "kb"("tenant_id", "categoria");

-- CreateIndex
CREATE UNIQUE INDEX "consumo_tenant_id_periodo_key" ON "consumo"("tenant_id", "periodo");

-- CreateIndex
CREATE INDEX "auditoria_tenant_id_creado_en_idx" ON "auditoria"("tenant_id", "creado_en");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "numeros_whatsapp" ADD CONSTRAINT "numeros_whatsapp_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contactos" ADD CONSTRAINT "contactos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_numero_id_fkey" FOREIGN KEY ("numero_id") REFERENCES "numeros_whatsapp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_contacto_id_fkey" FOREIGN KEY ("contacto_id") REFERENCES "contactos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_asignada_a_fkey" FOREIGN KEY ("asignada_a") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_conversacion_id_fkey" FOREIGN KEY ("conversacion_id") REFERENCES "conversaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opt_ins" ADD CONSTRAINT "opt_ins_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opt_ins" ADD CONSTRAINT "opt_ins_contacto_id_fkey" FOREIGN KEY ("contacto_id") REFERENCES "contactos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantillas" ADD CONSTRAINT "plantillas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kb" ADD CONSTRAINT "kb_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumo" ADD CONSTRAINT "consumo_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
