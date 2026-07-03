#!/usr/bin/env bash
# Generate TypeScript types from the NestJS Swagger document (MA1).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"
OUT="${ROOT}/drone/src/app/lib/generated/api-types.ts"

mkdir -p "$(dirname "$OUT")"

echo "Fetching OpenAPI spec from ${BACKEND_URL}/api-json …"
curl -sf "${BACKEND_URL}/api-json" -o /tmp/drone-edge-openapi.json

echo "Generating ${OUT} …"
npx --yes openapi-typescript /tmp/drone-edge-openapi.json -o "$OUT"

echo "Done."
