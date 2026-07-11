#!/usr/bin/env python3
"""Price-only monitor for decisions approved by 操盘策略0710."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import smtplib
import ssl
import sys
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo


ROOT = Path(__file__).resolve().parents[1]
TRADING_STATE = ROOT / "data" / "trading-state.json"
DECISION_LATEST = ROOT / "data" / "decision-latest.json"
ALERT_STATE = ROOT / "data" / "cloud-monitor" / "state.json"
SUMMARY_STATE = ROOT / "data" / "cloud-monitor" / "summary-state.json"
TZ = ZoneInfo("Asia/Shanghai")


@dataclass
class Alert:
    level: str
    code: str
    name: str
    price: float
    action: str
    reason: str
    rule_price: float | None = None
    decision_id: str = ""
    confirmation: str = "intraday"
    quantity: int | None = None
    valid_until: str = ""

    def signature(self) -> str:
        value = f"{self.decision_id}|{self.level}|{self.code}|{self.action}|{self.rule_price}|{self.quantity}"
        return hashlib.sha256(value.encode()).hexdigest()[:16]


def env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def load_runtime_env() -> None:
    """Load local/server env files without overriding injected secrets."""
    candidates = [ROOT / ".env", Path("/etc/ashare-monitor.env")]
    for path in candidates:
        try:
            lines = path.read_text(encoding="utf-8").splitlines()
        except FileNotFoundError:
            continue
        for line in lines:
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            key, value = stripped.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def now() -> datetime:
    return datetime.now(TZ)


def load_json(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return default


def save_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    path.chmod(0o600)


def numeric(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def normalize_code(value: Any) -> str:
    digits = re.sub(r"\D", "", str(value or ""))
    return digits[-6:].zfill(6) if digits else ""


def quote_symbol(code: str) -> str:
    code = normalize_code(code)
    if code.startswith(("6", "9")):
        return f"sh{code}"
    if code.startswith(("8", "4")):
        return f"bj{code}"
    return f"sz{code}"


def is_trading_time(dt: datetime | None = None) -> bool:
    dt = dt or now()
    if dt.weekday() >= 5:
        return False
    value = dt.hour * 100 + dt.minute
    return 925 <= value <= 1135 or 1255 <= value <= 1505


def http_get(url: str, timeout: int = 10) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 ashare-approved-trigger", "Referer": "https://finance.qq.com/"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read().decode("gbk", errors="ignore")


def fetch_tencent_quotes(codes: list[str]) -> dict[str, dict[str, Any]]:
    symbols = sorted({quote_symbol(code) for code in codes if normalize_code(code)})
    if not symbols:
        return {}
    raw = ""
    for attempt in range(3):
        try:
            raw = http_get(f"https://qt.gtimg.cn/q={','.join(symbols)}&_={int(time.time() * 1000)}")
            break
        except Exception:
            if attempt == 2:
                raise
            time.sleep(0.4)
    quotes: dict[str, dict[str, Any]] = {}
    for match in re.finditer(r'v_([^=]+)="([^"]*)";', raw):
        parts = match.group(2).split("~")
        if len(parts) < 35:
            continue
        code = normalize_code(parts[2])
        price = numeric(parts[3])
        if code and price > 0:
            quotes[code] = {"code": code, "name": parts[1] or code, "price": price, "time": parts[30] or "", "pct": numeric(parts[32])}
    return quotes


def state_allows_buy(state: dict[str, Any], current: datetime | None = None) -> tuple[bool, str]:
    current = current or now()
    risk = state.get("risk", {})
    freshness = state.get("data_freshness", {})
    value = current.hour * 100 + current.minute
    if current.weekday() >= 5 or not (1005 <= value <= 1135 or 1255 <= value <= 1500):
        return False, "buy alerts are disabled before the scheduled morning scan or outside continuous trading"
    if risk.get("mode") not in {"normal", "probation"}:
        return False, f"risk mode is {risk.get('mode', 'unknown')}"
    if not risk.get("new_buys_allowed") or risk.get("new_buy_vetoes"):
        return False, "account risk veto is active"
    if freshness.get("status") != "current":
        return False, "trading state is stale or missing"
    if int(numeric(freshness.get("completed_sessions_since"))) > 0:
        return False, "trading state is older than the latest completed session"
    return True, "account state permits the approved trigger"


def quote_is_current_session(quote: dict[str, Any], current: datetime | None = None) -> bool:
    current = current or now()
    digits = re.sub(r"\D", "", str(quote.get("time") or ""))
    return len(digits) >= 8 and digits[:8] == current.strftime("%Y%m%d")


def confirmation_allows(trigger: dict[str, Any], quote: dict[str, Any], current: datetime | None = None) -> tuple[bool, str]:
    current = current or now()
    confirmation = trigger.get("confirmation", "intraday")
    if confirmation == "intraday_emergency":
        return True, "盘中紧急触发"
    if confirmation == "close_confirmation":
        if current.hour * 100 + current.minute < 1450:
            return False, "等待14:50后的收盘确认窗口"
        return True, "14:50后收盘确认窗口"
    if confirmation == "two_close_confirmation":
        return False, "连续两日收盘确认必须由状态引擎复核"
    return True, "盘中价格触发"


def trigger_is_current(valid_until: Any, current: datetime | None = None) -> bool:
    current = current or now()
    if not valid_until:
        return False
    try:
        expiry = datetime.fromisoformat(str(valid_until)[:10]).date()
    except ValueError:
        return False
    return current.date() <= expiry


def approved_price_triggers(state: dict[str, Any], view: dict[str, Any], current: datetime | None = None) -> list[dict[str, Any]]:
    current = current or now()
    result: list[dict[str, Any]] = []
    buy_allowed, buy_reason = state_allows_buy(state, current)
    available_by_code = {
        normalize_code(item.get("code")): int(numeric(item.get("available_quantity")))
        for item in state.get("account", {}).get("positions", [])
    }
    for decision in view.get("decisions", []):
        if not decision.get("approved") or not decision.get("active") or not decision.get("code"):
            continue
        action = str(decision.get("action") or "")
        triggers = decision.get("triggers") or {}
        prices = triggers.get("price_triggers") if isinstance(triggers, dict) else None
        if not isinstance(prices, list):
            continue
        for item in prices:
            level = str(item.get("level") or ("buy" if action in {"买入", "试仓"} else "sell" if action in {"减仓", "止盈", "止损"} else "watch"))
            valid_until = item.get("valid_until") or decision.get("valid_until") or ""
            if not trigger_is_current(valid_until, current):
                continue
            if level == "buy" and not buy_allowed:
                continue
            code = normalize_code(decision["code"])
            requested = int(numeric(item.get("quantity") or decision.get("quantity")))
            if level == "buy" and (requested <= 0 or requested % 100 != 0):
                continue
            if level in {"sell", "watch"}:
                available = available_by_code.get(code, 0)
                if available <= 0:
                    continue
                requested = min(requested or available, available)
            result.append({
                **item,
                "level": level,
                "code": code,
                "name": decision.get("name") or decision["code"],
                "action": item.get("action") or action,
                "decision_id": decision.get("decision_id"),
                "gate_reason": buy_reason if level == "buy" else "approved risk-management trigger",
                "confirmation": item.get("confirmation", "intraday"),
                "quantity": requested,
                "valid_until": valid_until,
            })
    return result


def evaluate_approved_triggers(
    state: dict[str, Any],
    view: dict[str, Any],
    quotes: dict[str, dict[str, Any]],
    current: datetime | None = None,
) -> list[Alert]:
    current = current or now()
    alerts: list[Alert] = []
    for trigger in approved_price_triggers(state, view, current):
        quote = quotes.get(trigger["code"]) or {}
        if not quote_is_current_session(quote, current):
            continue
        price = numeric(quote.get("price"))
        threshold = numeric(trigger.get("price"))
        operator = trigger.get("operator")
        hit = price > 0 and threshold > 0 and ((operator == ">=" and price >= threshold) or (operator == "<=" and price <= threshold))
        confirmation_ok, confirmation_reason = confirmation_allows(trigger, quote, current)
        if not hit or not confirmation_ok:
            continue
        alerts.append(Alert(
            level=trigger["level"], code=trigger["code"], name=trigger["name"], price=price,
            rule_price=threshold, action=trigger["action"],
            reason=f"approved decision {trigger['decision_id']}: {price:.2f} {operator} {threshold:.2f}; {confirmation_reason}; {trigger['gate_reason']}",
            decision_id=trigger["decision_id"], confirmation=trigger["confirmation"],
            quantity=int(numeric(trigger.get("quantity"))) or None, valid_until=trigger.get("valid_until", ""),
        ))
    confirmed = {(item.code, item.rule_price) for item in alerts if item.level == "sell"}
    return [item for item in alerts if not (item.level == "watch" and (item.code, item.rule_price) in confirmed)]


def build_message(panel: dict[str, Any], gate: dict[str, Any], alerts: list[Alert]) -> tuple[str, str, str, str]:
    title = f"A股已批准触发提醒 {now().strftime('%H:%M')}"
    plain = [title, f"状态：{gate.get('title', '--')}｜{gate.get('metrics', '')}", ""]
    markdown = [f"### {title}", f"- **状态**：{gate.get('title', '--')}｜{gate.get('metrics', '')}", ""]
    for index, alert in enumerate(alerts, 1):
        quantity = f"{alert.quantity}股" if alert.quantity else "按最新确认持仓"
        validity = alert.valid_until or "本交易日有效"
        plain.extend([
            f"{index}. 【{alert.action}】{alert.name} {alert.code}",
            f"   数量：{quantity}",
            f"   现价/触发：{alert.price:.2f} / {alert.rule_price:.2f}",
            f"   确认：{alert.confirmation}｜有效期：{validity}",
            f"   决策编号：{alert.decision_id}",
            f"   依据：{alert.reason}",
            "",
        ])
        markdown.extend([
            f"{index}. **【{alert.action}】{alert.name} {alert.code}**",
            f"   - 数量：**{quantity}**",
            f"   - 现价/触发：`{alert.price:.2f}` / `{alert.rule_price:.2f}`",
            f"   - 确认：{alert.confirmation}｜有效期：{validity}",
            f"   - 决策编号：`{alert.decision_id}`",
            f"   - 依据：{alert.reason}",
            "",
        ])
    plain.append("仅提醒已批准价格触发，不自动下单。")
    markdown.append("> 仅提醒已批准价格触发，不自动下单。")
    sms = "；".join(f"{item.name}{item.price:.2f}:{item.action}" for item in alerts[:3])
    return title, "\n".join(plain), "\n".join(markdown), sms[:180]


def decision_summary_signature(state: dict[str, Any], view: dict[str, Any]) -> str:
    risk = state.get("risk", {})
    payload = {
        "decision_ids": sorted(
            str(item.get("decision_id"))
            for item in view.get("decisions", [])
            if item.get("approved") and item.get("active")
        ),
        "market_gate": view.get("market_gate"),
        "data_as_of": view.get("data_as_of") or state.get("data_as_of"),
        "risk": {
            "mode": risk.get("mode"),
            "new_buys_allowed": risk.get("new_buys_allowed"),
            "cooldown_sessions_remaining": risk.get("cooldown_sessions_remaining"),
            "new_buy_vetoes": sorted(risk.get("new_buy_vetoes") or []),
        },
        "positions": sorted(
            (normalize_code(item.get("code")), int(numeric(item.get("quantity"))), int(numeric(item.get("available_quantity"))))
            for item in state.get("account", {}).get("positions", [])
        ),
    }
    return hashlib.sha256(json.dumps(payload, ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:20]


def build_decision_summary(state: dict[str, Any], view: dict[str, Any], has_new_state: bool = True) -> tuple[str, str, str, str]:
    """Format the latest state-engine output; this function never creates a trade decision."""
    account = state.get("account", {})
    risk = state.get("risk", {})
    decisions = [item for item in view.get("decisions", []) if item.get("approved") and item.get("active")]
    account_decision = next((item for item in decisions if not item.get("code")), None)
    holding_decisions = [item for item in decisions if item.get("code")]
    title = f"A股定时全面扫描 {now().strftime('%H:%M')}"
    gate = view.get("market_gate", "--")
    gate_score = account_decision.get("market_gate_score") if account_decision else None
    gate_text = f"{gate}（{gate_score}/10）" if gate_score is not None else gate
    cooldown = risk.get("cooldown_sessions_remaining")
    cooldown_text = f"，冷却剩余{cooldown}个完整交易日" if cooldown is not None else ""
    conclusion = (account_decision or {}).get("rationale") or view.get("summary") or "沿用最新有效决策"
    vetoes = risk.get("new_buy_vetoes") or []
    veto_text = "；".join(str(item) for item in vetoes) if vetoes else "无"
    change_labels = {
        "account_risk": "账户风控变化",
        "market_gate": "市场闸门变化",
        "sector_lifecycle": "赛道生命周期变化",
        "thesis": "持仓逻辑变化",
        "formal_trigger": "正式触发价命中",
        "material_announcement": "重大公告变化",
    }
    changes: list[str] = []
    for item in decisions:
        for value in item.get("material_change") or []:
            label = change_labels.get(str(value), str(value))
            if label not in changes:
                changes.append(label)
    change_text = "、".join(changes) if has_new_state and changes else "无实质变化，维持原计划"

    plain = [
        title,
        f"数据时点：{view.get('data_as_of') or state.get('data_as_of') or '--'}",
        f"直接结论：{conclusion}",
        f"市场闸门：{gate_text}",
        f"账户：总资产{numeric(account.get('total_assets')):,.2f}元，仓位{numeric(account.get('exposure_pct')):.2f}%",
        f"风控：{risk.get('mode', 'unknown')}{cooldown_text}；新买入={'允许' if risk.get('new_buys_allowed') else '禁止'}",
        f"买入否决：{veto_text}",
        "持仓计划：",
    ]
    markdown = [
        f"### {title}",
        f"- **数据时点**：{view.get('data_as_of') or state.get('data_as_of') or '--'}",
        f"- **直接结论**：{conclusion}",
        f"- **市场闸门**：{gate_text}",
        f"- **账户**：总资产 `{numeric(account.get('total_assets')):,.2f}` 元，仓位 `{numeric(account.get('exposure_pct')):.2f}%`",
        f"- **风控**：`{risk.get('mode', 'unknown')}`{cooldown_text}；新买入 **{'允许' if risk.get('new_buys_allowed') else '禁止'}**",
        f"- **买入否决**：{veto_text}",
        "",
        "#### 持仓计划",
    ]
    if holding_decisions:
        for item in holding_decisions:
            line = f"{item.get('name') or item.get('code')}：{item.get('action') or '观察'}；{item.get('rationale') or '沿用原计划'}（{item.get('decision_id') or '--'}）"
            plain.append(f"- {line}")
            markdown.append(f"- **{item.get('name') or item.get('code')}**：{item.get('action') or '观察'}；{item.get('rationale') or '沿用原计划'}（`{item.get('decision_id') or '--'}`）")
    else:
        plain.append("- 无已批准持仓决策")
        markdown.append("- 无已批准持仓决策")
    plain.extend(["", f"相比上次：{change_text}。", "仅作提醒，不自动下单；实际成交必须人工确认。"])
    markdown.extend(["", f"> **相比上次**：{change_text}。", "> 仅作提醒，不自动下单；实际成交必须人工确认。"])
    return title, "\n".join(plain), "\n".join(markdown), conclusion[:180]


def post_json(url: str, payload: dict[str, Any], timeout: int = 10) -> str:
    request = urllib.request.Request(url, data=json.dumps(payload, ensure_ascii=False).encode(), headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read().decode(errors="replace")


def notify_email(title: str, plain: str) -> bool:
    host = env("SMTP_HOST")
    username = env("SMTP_USERNAME")
    password = env("SMTP_PASSWORD")
    recipient = env("MAIL_TO")
    if not all((host, username, password, recipient)):
        return False
    message = MIMEText(plain, "plain", "utf-8")
    message["Subject"] = title
    message["From"] = env("MAIL_FROM", username)
    message["To"] = recipient
    port = int(env("SMTP_PORT", "465"))
    with smtplib.SMTP_SSL(host, port, context=ssl.create_default_context(), timeout=15) as client:
        client.login(username, password)
        client.sendmail(message["From"], [item.strip() for item in recipient.split(",")], message.as_string())
    return True


def notify_all(title: str, plain: str, markdown: str, sms: str, dry_run: bool) -> list[str]:
    if dry_run:
        print(plain)
        return ["dry-run"]
    sent: list[str] = []
    failures: list[str] = []
    webhook = env("WECHAT_WORK_WEBHOOK_URL")
    if webhook:
        try:
            post_json(webhook, {"msgtype": "markdown", "markdown": {"content": markdown[:3900]}})
            sent.append("wechat-work")
        except Exception as exc:
            failures.append(f"wechat-work:{exc}")
    token = env("PUSHPLUS_TOKEN")
    if token:
        try:
            payload = {"token": token, "title": title, "content": markdown, "template": "markdown", "channel": "wechat"}
            if env("PUSHPLUS_TOPIC"):
                payload["topic"] = env("PUSHPLUS_TOPIC")
            response = json.loads(post_json("https://www.pushplus.plus/send", payload))
            if int(response.get("code", 0)) != 200:
                raise RuntimeError(f"PushPlus返回{response.get('code')}: {response.get('msg') or response.get('data')}")
            sent.append("pushplus")
        except Exception as exc:
            failures.append(f"pushplus:{exc}")
    try:
        if notify_email(title, plain):
            sent.append("email")
    except Exception as exc:
        failures.append(f"email:{exc}")
    if failures:
        print("notification failures: " + " | ".join(failures), file=sys.stderr)
    return sent


def should_send(alerts: list[Alert], force: bool) -> bool:
    if not alerts:
        return False
    if force:
        return True
    path = Path(env("ALERT_STATE_FILE", str(ALERT_STATE)))
    state = load_json(path, {})
    signature = "|".join(sorted(item.signature() for item in alerts))
    if signature != state.get("last_signature"):
        return True
    try:
        last = datetime.fromisoformat(state["last_sent_at"])
    except (KeyError, ValueError):
        return True
    return now() - last >= timedelta(minutes=int(env("QUIET_REPEAT_MINUTES", "30")))


def mark_sent(alerts: list[Alert]) -> None:
    path = Path(env("ALERT_STATE_FILE", str(ALERT_STATE)))
    save_json(path, {"last_signature": "|".join(sorted(item.signature() for item in alerts)), "last_sent_at": now().isoformat()})


def main() -> int:
    load_runtime_env()
    parser = argparse.ArgumentParser(description="Approved A-share price-trigger monitor")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--ignore-trading-time", action="store_true")
    parser.add_argument("--test-notification", action="store_true", help="send one PushPlus/backup channel test")
    parser.add_argument("--send-decision-summary", action="store_true", help="send the latest state-engine decision summary")
    args = parser.parse_args()
    if args.test_notification:
        title = "操盘策略0710微信提醒测试"
        plain = "微信提醒通道测试成功。后续仅推送已批准的买卖信号，不自动下单。"
        markdown = "### 操盘策略0710微信提醒测试\n\n通道已连接。后续仅推送**已批准**的买卖信号，不自动下单。"
        channels = notify_all(title, plain, markdown, plain, False)
        print(f"channels: {','.join(channels) if channels else 'none configured'}")
        return 0 if "pushplus" in channels else 1
    state = load_json(Path(env("TRADING_STATE_PATH", str(TRADING_STATE))), {})
    view = load_json(Path(env("DECISION_LATEST_PATH", str(DECISION_LATEST))), {})
    if args.send_decision_summary:
        summary_path = Path(env("SUMMARY_STATE_FILE", str(SUMMARY_STATE)))
        signature = decision_summary_signature(state, view)
        prior_summary = load_json(summary_path, {})
        title, plain, markdown, sms = build_decision_summary(state, view, signature != prior_summary.get("last_signature"))
        channels = notify_all(title, plain, markdown, sms, args.dry_run)
        if channels and not args.dry_run:
            save_json(summary_path, {"last_signature": signature, "last_sent_at": now().isoformat()})
        print(f"channels: {','.join(channels) if channels else 'none configured'}")
        return 0 if channels else 1
    if not args.ignore_trading_time and env("TRADE_HOURS_ONLY", "true").lower() == "true" and not is_trading_time():
        print("outside trading hours")
        return 0
    current = now()
    triggers = approved_price_triggers(state, view, current)
    if not triggers:
        print("no approved actionable price triggers")
        return 0
    quotes = fetch_tencent_quotes([item["code"] for item in triggers])
    alerts = evaluate_approved_triggers(state, view, quotes, current)
    if not should_send(alerts, args.force):
        print("no new triggered alerts")
        return 0
    gate = {"title": f"risk={state.get('risk', {}).get('mode', 'unknown')}", "metrics": f"decision={view.get('latest_decision_id', '--')}"}
    title, plain, markdown, sms = build_message(state, gate, alerts)
    channels = notify_all(title, plain, markdown, sms, args.dry_run)
    if channels and not args.dry_run:
        mark_sent(alerts)
    print(f"channels: {','.join(channels) if channels else 'none configured'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
