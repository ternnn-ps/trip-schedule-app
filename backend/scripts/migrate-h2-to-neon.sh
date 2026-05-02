#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -z "${NEON_DATABASE_PASSWORD:-}" ]]; then
  echo "NEON_DATABASE_PASSWORD is required." >&2
  exit 1
fi

cd "$PROJECT_DIR"

./mvnw spring-boot:run \
  -Dspring-boot.run.profiles=migrate-h2-to-neon
