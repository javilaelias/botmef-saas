#!/bin/sh
# Rol de aplicación: sin BYPASSRLS y que NO es dueño de las tablas (ADR-002).
# Los permisos sobre tablas y las policies RLS llegan en MB3.
set -e
psql -v ON_ERROR_STOP=1 -v app_pw="$APP_DB_PASSWORD" --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
CREATE ROLE app_botmef LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE PASSWORD :'app_pw';
SQL
