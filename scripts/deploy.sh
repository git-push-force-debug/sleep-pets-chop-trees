#!/usr/bin/env bash
# Builds and deploys the three Vercel projects. Run from the repo root: bash scripts/deploy.sh [--env]
#   --env  also (re)writes the API's server environment variables on Vercel from .env.local
set -euo pipefail
cd "$(dirname "$0")/.."

SITE=https://sleep-pets-chop-trees.vercel.app
ADMIN=https://sleep-pets-chop-trees-admin.vercel.app
API=https://sleep-pets-chop-trees-api.vercel.app
SERVER_VARS=(SUPABASE_URL SUPABASE_SECRET_KEY GEMINI_API_KEY GEMINI_MODEL GEMINI_FALLBACK_MODEL DIFY_API_BASE DIFY_DATASET_API_KEY
  DIFY_PUBLIC_DATASET_ID DIFY_INTERNAL_DATASET_ID DIFY_ADMIN_FAQ_DOCUMENT_ID CHATWOOT_BASE_URL CHATWOOT_WEBSITE_TOKEN CHATWOOT_ACCOUNT_ID SITE_URL ADMIN_URL)

env_value() { grep -E "^$1=" .env.local | head -1 | cut -d= -f2-; }
deploy_dir() { # $1 dir, $2 project
  vercel link --yes --project "$2" --cwd "$1" >/dev/null
  vercel deploy --prod --yes --cwd "$1" 2>&1 | grep -oE 'https://[a-z0-9.-]+vercel.app' | tail -1 || true
}

# Browser bundles only ever get the public values.
export VITE_SUPABASE_URL="$(env_value SUPABASE_URL)"
export VITE_SUPABASE_PUBLISHABLE_KEY="$(env_value SUPABASE_PUBLISHABLE_KEY)"
export VITE_CHATWOOT_ACCOUNT_ID="$(env_value CHATWOOT_ACCOUNT_ID)"
export VITE_API_URL="$API" VITE_SITE_URL="$SITE"

echo "→ web";   npm run -s build -w apps/web   && cp apps/web/vercel.json apps/web/dist/   && deploy_dir apps/web/dist sleep-pets-chop-trees
echo "→ admin"; npm run -s build -w apps/admin && cp apps/admin/vercel.json apps/admin/dist/ && deploy_dir apps/admin/dist sleep-pets-chop-trees-admin

echo "→ api"
rm -rf .deploy && mkdir -p .deploy/api
npx esbuild apps/api/src/vercel.ts --bundle --platform=node --format=esm --target=node20 --outfile=.deploy/api/index.mjs \
  --external:bufferutil --external:utf-8-validate --log-level=warning \
  --banner:js="import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);"
cat > .deploy/vercel.json <<'JSON'
{ "regions": ["iad1"], "functions": { "api/index.mjs": { "maxDuration": 30 } }, "rewrites": [{ "source": "/(.*)", "destination": "/api" }] }
JSON
if [[ "${1:-}" == "--env" ]]; then
  vercel link --yes --project sleep-pets-chop-trees-api --cwd .deploy >/dev/null
  for name in "${SERVER_VARS[@]}"; do
    vercel env rm "$name" production --yes --cwd .deploy >/dev/null 2>&1 || true
    printf '%s' "$(env_value "$name")" | vercel env add "$name" production --cwd .deploy >/dev/null
  done
  echo "  server env vars set: ${#SERVER_VARS[@]}"
fi
deploy_dir .deploy sleep-pets-chop-trees-api

# Build output makes later test runs slow to collect; it is regenerated on every deploy.
rm -rf apps/web/dist apps/admin/dist
curl -fsS "$API/health" && echo "  ← API health"
