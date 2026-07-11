#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
REPO=${MONITOR_GITHUB_REPO:-Johnli-gif/-skill--John-li}

test -s "$ROOT/data/trading-state.json"
test -s "$ROOT/data/decision-latest.json"
test -s "$ROOT/.env"

TOKEN=$(sed -n 's/^PUSHPLUS_TOKEN=//p' "$ROOT/.env" | head -n 1)
test -n "$TOKEN"

printf '%s' "$TOKEN" | gh secret set PUSHPLUS_TOKEN --repo "$REPO"
gh secret set TRADING_STATE_JSON --repo "$REPO" < "$ROOT/data/trading-state.json"
gh secret set DECISION_LATEST_JSON --repo "$REPO" < "$ROOT/data/decision-latest.json"

echo "monitor secrets synchronized"
