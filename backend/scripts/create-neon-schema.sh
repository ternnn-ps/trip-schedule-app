#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA_FILE="$SCRIPT_DIR/neon-schema.sql"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required. Install PostgreSQL client tools first." >&2
  exit 1
fi

if [[ -z "${NEON_DATABASE_HOST:-}" || -z "${NEON_DATABASE_NAME:-}" || -z "${NEON_DATABASE_USERNAME:-}" || -z "${NEON_DATABASE_PASSWORD:-}" ]]; then
  echo "NEON_DATABASE_HOST, NEON_DATABASE_NAME, NEON_DATABASE_USERNAME, and NEON_DATABASE_PASSWORD are required." >&2
  exit 1
fi

PGPASSWORD="$NEON_DATABASE_PASSWORD" psql \
  "host=$NEON_DATABASE_HOST port=5432 dbname=$NEON_DATABASE_NAME user=$NEON_DATABASE_USERNAME sslmode=require channel_binding=require" \
  --set=ON_ERROR_STOP=1 \
  --file="$SCHEMA_FILE"
