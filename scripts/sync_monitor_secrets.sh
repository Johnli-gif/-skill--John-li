#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
REPO=${MONITOR_GITHUB_REPO:-Johnli-gif/-skill--John-li}

test -s "$ROOT/data/trading-state.json"
test -s "$ROOT/data/decision-latest.json"
test -s "$ROOT/.env"

TOKEN=$(sed -n 's/^PUSHPLUS_TOKEN=//p' "$ROOT/.env" | head -n 1)
test -n "$TOKEN"
CALLBACK_URL=$(sed -n 's/^PUSHPLUS_CALLBACK_URL=//p' "$ROOT/.env" | head -n 1)
test -n "$CALLBACK_URL"
case "$CALLBACK_URL" in
  https://ntfy.sh/ashare-delivery-*) ;;
  *) echo "PUSHPLUS_CALLBACK_URL must use the private ashare-delivery ntfy topic" >&2; exit 1 ;;
esac

python3 -m json.tool "$ROOT/data/trading-state.json" >/dev/null
python3 -m json.tool "$ROOT/data/decision-latest.json" >/dev/null
python3 -m json.tool "$ROOT/config/china-exchange-calendar.json" >/dev/null
python3 - "$ROOT/data/trading-state.json" "$ROOT/data/decision-latest.json" <<'PY'
import json
import sys

state = json.load(open(sys.argv[1], encoding="utf-8"))
view = json.load(open(sys.argv[2], encoding="utf-8"))
if state.get("skill_version") != view.get("skill_version"):
    raise SystemExit("state and decision skill versions differ")
if state.get("risk", {}).get("mode") != view.get("risk_state"):
    raise SystemExit("state and decision risk modes differ")
if state.get("generated_at") != view.get("generated_at"):
    raise SystemExit("state and decision files were not generated atomically")
PY

printf '%s' "$TOKEN" | gh secret set PUSHPLUS_TOKEN --repo "$REPO"
printf '%s' "$CALLBACK_URL" | gh secret set PUSHPLUS_CALLBACK_URL --repo "$REPO"
gh secret set TRADING_STATE_JSON --repo "$REPO" < "$ROOT/data/trading-state.json"
gh secret set DECISION_LATEST_JSON --repo "$REPO" < "$ROOT/data/decision-latest.json"

echo "monitor secrets synchronized"
