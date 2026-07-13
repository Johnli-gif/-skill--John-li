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
from datetime import date, datetime, timedelta
from email.mime.text import MIMEText
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo


ROOT = Path(__file__).resolve().parents[1]
TRADING_STATE = ROOT / "data" / "trading-state.json"
DECISION_LATEST = ROOT / "data" / "decision-latest.json"
ALERT_STATE = ROOT / "data" / "cloud-monitor" / "state.json"
SUMMARY_STATE = ROOT / "data" / "cloud-monitor" / "summary-state.json"
NOTIFICATION_RECEIPT = ROOT / "data" / "cloud-monitor" / "notification-receipt.json"
HEARTBEAT_STATE = ROOT / "data" / "cloud-monitor" / "heartbeat.json"
HEALTH_NOTICE_STATE = ROOT / "data" / "cloud-monitor" / "health-notice.json"
CALENDAR_PATH = ROOT / "config" / "china-exchange-calendar.json"
TZ = ZoneInfo("Asia/Shanghai")
ACTIONABLE_DECISION_ACTIONS = {"买入", "试仓", "加仓", "减仓", "卖出", "止损", "止盈", "清仓"}


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


def parse_datetime(value: Any) -> datetime | None:
    try:
        parsed = datetime.fromisoformat(str(value))
    except (TypeError, ValueError):
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=TZ)
    return parsed.astimezone(TZ)


def load_exchange_calendar(path: Path = CALENDAR_PATH) -> dict[str, Any]:
    return load_json(path, {})


def calendar_covers(day: date, path: Path = CALENDAR_PATH) -> bool:
    return str(day.year) in (load_exchange_calendar(path).get("years") or {})


def is_trading_day(day: date, path: Path = CALENDAR_PATH) -> bool:
    calendar = load_exchange_calendar(path)
    year = (calendar.get("years") or {}).get(str(day.year))
    if not year:
        return False
    return day.weekday() < 5 and day.isoformat() not in set(year.get("closed_weekdays") or [])


def completed_trading_sessions_since(as_of: Any, current: datetime | None = None) -> int | None:
    current = (current or now()).astimezone(TZ)
    latest = parse_datetime(as_of)
    if not latest or not calendar_covers(current.date()):
        return None
    day = latest.date()
    count = 0
    while day < current.date():
        day = date.fromordinal(day.toordinal() + 1)
        if is_trading_day(day) and day < current.date():
            count += 1
    if current.date() > latest.date() and is_trading_day(current.date()) and current.hour * 100 + current.minute >= 1505:
        count += 1
    return count


def quote_symbol(code: str) -> str:
    code = normalize_code(code)
    if code.startswith(("6", "9")):
        return f"sh{code}"
    if code.startswith(("8", "4")):
        return f"bj{code}"
    return f"sz{code}"


def is_trading_time(dt: datetime | None = None) -> bool:
    dt = dt or now()
    if not is_trading_day(dt.astimezone(TZ).date()):
        return False
    value = dt.hour * 100 + dt.minute
    return 925 <= value <= 1135 or 1255 <= value <= 1505


def http_get(url: str, timeout: int = 10, referer: str = "https://finance.qq.com/") -> str:
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 ashare-approved-trigger", "Referer": referer})
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
            quotes[code] = {"code": code, "name": parts[1] or code, "price": price, "time": parts[30] or "", "pct": numeric(parts[32]), "source": "tencent"}
    return quotes


def fetch_sina_quotes(codes: list[str]) -> dict[str, dict[str, Any]]:
    symbols = sorted({quote_symbol(code) for code in codes if normalize_code(code)})
    if not symbols:
        return {}
    raw = http_get(
        f"https://hq.sinajs.cn/list={','.join(symbols)}",
        referer="https://finance.sina.com.cn/",
    )
    quotes: dict[str, dict[str, Any]] = {}
    for match in re.finditer(r'var hq_str_([^=]+)="([^"]*)";', raw):
        symbol, payload = match.groups()
        parts = payload.split(",")
        if len(parts) < 32:
            continue
        code = normalize_code(symbol)
        price = numeric(parts[3])
        timestamp = f"{parts[30]} {parts[31]}" if parts[30] and parts[31] else ""
        if code and price > 0:
            quotes[code] = {"code": code, "name": parts[0] or code, "price": price, "time": timestamp, "source": "sina"}
    return quotes


def fetch_consensus_quotes(codes: list[str]) -> dict[str, dict[str, Any]]:
    tencent = fetch_tencent_quotes(codes)
    sina = fetch_sina_quotes(codes)
    result: dict[str, dict[str, Any]] = {}
    for code in sorted({normalize_code(item) for item in codes if normalize_code(item)}):
        first = tencent.get(code)
        second = sina.get(code)
        if not first or not second:
            continue
        prices = [numeric(first.get("price")), numeric(second.get("price"))]
        tolerance = max(0.02, max(prices) * numeric(env("MAX_SOURCE_PRICE_DIFF_PCT", "0.20")) / 100)
        if min(prices) <= 0 or abs(prices[0] - prices[1]) > tolerance:
            continue
        result[code] = {
            "code": code,
            "name": first.get("name") or second.get("name") or code,
            "price": sum(prices) / len(prices),
            "time": first.get("time") or second.get("time"),
            "source_prices": {"tencent": prices[0], "sina": prices[1]},
            "source_times": {"tencent": first.get("time"), "sina": second.get("time")},
        }
    return result


def state_is_current(state: dict[str, Any], current: datetime | None = None) -> tuple[bool, str]:
    current = current or now()
    if not calendar_covers(current.astimezone(TZ).date()):
        return False, "exchange calendar does not cover the current year"
    as_of = parse_datetime(state.get("data_as_of"))
    if not as_of:
        return False, "account data timestamp is missing or invalid"
    if as_of > current.astimezone(TZ) + timedelta(minutes=5):
        return False, "account data timestamp is in the future"
    completed = completed_trading_sessions_since(state.get("data_as_of"), current)
    if completed is None:
        return False, "account data timestamp is missing or invalid"
    if completed > 0:
        return False, f"account state is {completed} completed trading session(s) old"
    return True, "account state is current relative to the latest completed close"


def runtime_bundle_is_valid(
    state: dict[str, Any],
    view: dict[str, Any],
    current: datetime | None = None,
) -> tuple[bool, str]:
    current = current or now()
    fresh, reason = state_is_current(state, current)
    if not fresh:
        return False, reason
    state_generated = parse_datetime(state.get("generated_at"))
    view_generated = parse_datetime(view.get("generated_at"))
    if not state_generated or not view_generated:
        return False, "runtime bundle generation timestamp is missing"
    if abs((state_generated - view_generated).total_seconds()) > 60:
        return False, "trading state and decision bundle were not generated atomically"
    if state.get("skill_version") != view.get("skill_version"):
        return False, "trading state and decision skill versions differ"
    state_mode = str(state.get("risk", {}).get("mode") or "")
    view_mode = str(view.get("risk_state") or "")
    if state_mode and view_mode and state_mode != view_mode:
        return False, "trading state and approved decision risk modes differ"
    if not isinstance(state.get("account", {}).get("positions"), list):
        return False, "confirmed account positions are missing"
    return True, "runtime bundle is internally consistent"


def state_allows_buy(state: dict[str, Any], current: datetime | None = None) -> tuple[bool, str]:
    current = current or now()
    risk = state.get("risk", {})
    value = current.hour * 100 + current.minute
    if not is_trading_day(current.astimezone(TZ).date()) or not (1005 <= value <= 1135 or 1255 <= value <= 1500):
        return False, "buy alerts are disabled before the scheduled morning scan or outside continuous trading"
    if risk.get("mode") not in {"normal", "probation"}:
        return False, f"risk mode is {risk.get('mode', 'unknown')}"
    if not risk.get("new_buys_allowed") or risk.get("new_buy_vetoes"):
        return False, "account risk veto is active"
    fresh, reason = state_is_current(state, current)
    if not fresh:
        return False, reason
    return True, "account state permits the approved trigger"


def quote_timestamps(quote: dict[str, Any]) -> list[datetime]:
    raw_times = quote.get("source_times")
    values = list(raw_times.values()) if isinstance(raw_times, dict) else [quote.get("time")]
    parsed: list[datetime] = []
    for value in values:
        digits = re.sub(r"\D", "", str(value or ""))
        if len(digits) < 14:
            continue
        try:
            parsed.append(datetime.strptime(digits[:14], "%Y%m%d%H%M%S").replace(tzinfo=TZ))
        except ValueError:
            continue
    return parsed


def quote_is_current_session(quote: dict[str, Any], current: datetime | None = None) -> bool:
    current = current or now()
    timestamps = quote_timestamps(quote)
    return bool(timestamps) and all(item.date() == current.astimezone(TZ).date() for item in timestamps)


def quote_is_fresh(quote: dict[str, Any], current: datetime | None = None) -> bool:
    current = (current or now()).astimezone(TZ)
    timestamps = quote_timestamps(quote)
    if not timestamps or not quote_is_current_session(quote, current):
        return False
    value = current.hour * 100 + current.minute
    if value > 1505:
        return all(item.hour * 100 + item.minute >= 1500 for item in timestamps)
    max_age = int(env("MAX_QUOTE_AGE_MINUTES", "5"))
    return all(timedelta(minutes=-2) <= current - item <= timedelta(minutes=max_age) for item in timestamps)


def confirmation_allows(trigger: dict[str, Any], quote: dict[str, Any], current: datetime | None = None) -> tuple[bool, str]:
    current = current or now()
    confirmation = trigger.get("confirmation", "intraday")
    if confirmation == "intraday_emergency":
        return True, "盘中紧急触发"
    if confirmation == "close_confirmation":
        if current.hour * 100 + current.minute < 1501:
            return False, "等待15:00正式收盘价"
        timestamps = quote_timestamps(quote)
        if not timestamps or not all(item.hour * 100 + item.minute >= 1500 for item in timestamps):
            return False, "行情源尚未同时确认正式收盘"
        return True, "双行情源正式收盘确认；仅可下一交易日执行"
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
    state_current, _ = state_is_current(state, current)
    if not state_current:
        return result
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
        if not quote_is_fresh(quote, current):
            continue
        price = numeric(quote.get("price"))
        threshold = numeric(trigger.get("price"))
        operator = trigger.get("operator")
        source_prices = quote.get("source_prices")
        prices = list(source_prices.values()) if isinstance(source_prices, dict) else [price]
        hit = bool(prices) and threshold > 0 and all(
            item > 0 and ((operator == ">=" and item >= threshold) or (operator == "<=" and item <= threshold))
            for item in prices
        )
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


def actionable_decisions(view: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        item for item in view.get("decisions", [])
        if item.get("approved") and item.get("active") and item.get("code")
        and str(item.get("action") or "") in ACTIONABLE_DECISION_ACTIONS
    ]


def immediate_action_decisions(view: dict[str, Any], current: datetime | None = None) -> list[dict[str, Any]]:
    """Return only explicitly confirmed same-session actions, never unhit plans."""
    current = current or now()
    result: list[dict[str, Any]] = []
    for item in actionable_decisions(view):
        execution_status = str((item.get("triggers") or {}).get("execution_status") or "")
        if not execution_status.startswith("trigger_confirmed_"):
            continue
        try:
            confirmed_at = datetime.fromisoformat(execution_status.removeprefix("trigger_confirmed_"))
        except ValueError:
            continue
        if confirmed_at.tzinfo is None:
            confirmed_at = confirmed_at.replace(tzinfo=TZ)
        if confirmed_at.astimezone(TZ).date() == current.astimezone(TZ).date():
            result.append(item)
    return result


def decision_line(item: dict[str, Any]) -> str:
    action = str(item.get("action") or "观察")
    if action not in ACTIONABLE_DECISION_ACTIONS:
        return f"{item.get('name') or item.get('code')}：{action}；{item.get('rationale') or '沿用原计划'}（{item.get('decision_id') or '--'}）"
    quantity = int(numeric(item.get("quantity")))
    quantity_text = f"{quantity}股" if quantity > 0 else ""
    zone = (item.get("triggers") or {}).get("execution_price_zone")
    zone_text = ""
    if isinstance(zone, list) and len(zone) == 2:
        zone_text = f"，参考{numeric(zone[0]):g}-{numeric(zone[1]):g}元"
    command = f"【{action}{quantity_text}】{zone_text}"
    return f"{item.get('name') or item.get('code')}：{command}；{item.get('rationale') or '沿用原计划'}（{item.get('decision_id') or '--'}）"


def build_decision_summary(
    state: dict[str, Any],
    view: dict[str, Any],
    has_new_state: bool = True,
    urgent: bool = False,
) -> tuple[str, str, str, str]:
    """Format the latest state-engine output; this function never creates a trade decision."""
    account = state.get("account", {})
    risk = state.get("risk", {})
    decisions = [item for item in view.get("decisions", []) if item.get("approved") and item.get("active")]
    account_decision = next((item for item in decisions if not item.get("code")), None)
    holding_decisions = sorted(
        [item for item in decisions if item.get("code")],
        key=lambda item: (str(item.get("action") or "") not in ACTIONABLE_DECISION_ACTIONS, item.get("code") or ""),
    )
    title = f"【立即确认】A股操盘指令 {now().strftime('%H:%M')}" if urgent else f"A股定时全面扫描 {now().strftime('%H:%M')}"
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
            line = decision_line(item)
            plain.append(f"- {line}")
            markdown.append(f"- **{line}**")
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


def get_json(url: str, headers: dict[str, str] | None = None, timeout: int = 10) -> dict[str, Any]:
    request = urllib.request.Request(url, headers=headers or {}, method="GET")
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode(errors="replace"))


def get_text(url: str, headers: dict[str, str] | None = None, timeout: int = 10) -> str:
    request = urllib.request.Request(url, headers=headers or {}, method="GET")
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read().decode(errors="replace")


def pushplus_callback_poll_url(callback_url: str, since: int) -> str:
    parsed = urllib.parse.urlparse(callback_url)
    if parsed.scheme != "https" or not parsed.netloc or parsed.query or parsed.fragment:
        raise ValueError("PUSHPLUS_CALLBACK_URL必须是无查询参数的HTTPS主题地址")
    return callback_url.rstrip("/") + "/json?" + urllib.parse.urlencode({"poll": "1", "since": since})


def parse_pushplus_callback_lines(payload: str, short_code: str) -> tuple[str, str] | None:
    for line in payload.splitlines():
        if not line.strip():
            continue
        try:
            envelope = json.loads(line)
            callback = envelope.get("message") if envelope.get("event") == "message" else envelope
            if isinstance(callback, str):
                callback = json.loads(callback)
            info = callback.get("messageInfo", {}) if isinstance(callback, dict) else {}
        except (AttributeError, TypeError, ValueError, json.JSONDecodeError):
            continue
        if str(info.get("shortCode") or "") != short_code:
            continue
        status = int(numeric(info.get("sendStatus")))
        error = str(info.get("message") or "")
        if status == 2:
            return "delivered", ""
        if status == 3:
            return "failed", error or "PushPlus异步投递失败"
        return "pending", error or f"异步状态{status}"
    return None


def verify_pushplus_delivery(
    short_code: str,
    callback_url: str,
    attempts: int = 12,
    requested_at: int | None = None,
) -> tuple[str, str]:
    """Return delivered, failed, pending, or accepted_unverified."""
    if not short_code or not callback_url:
        return "accepted_unverified", "PUSHPLUS_CALLBACK_URL未配置"
    since = requested_at if requested_at is not None else int(time.time()) - 5
    url = pushplus_callback_poll_url(callback_url, since)
    for attempt in range(attempts):
        result = parse_pushplus_callback_lines(get_text(url), short_code)
        if result:
            return result
        if attempt + 1 < attempts:
            time.sleep(2)
    return "pending", "未在回调收件箱收到该消息的最终送达状态"


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
            requested_at = int(time.time()) - 5
            callback_url = env("PUSHPLUS_CALLBACK_URL")
            payload = {"token": token, "title": title, "content": markdown, "template": "markdown", "channel": "wechat"}
            if env("PUSHPLUS_TOPIC"):
                payload["topic"] = env("PUSHPLUS_TOPIC")
            if callback_url:
                payload["callbackUrl"] = callback_url
            response = json.loads(post_json("https://www.pushplus.plus/send", payload))
            if int(response.get("code", 0)) != 200:
                raise RuntimeError(f"PushPlus返回{response.get('code')}: {response.get('msg') or response.get('data')}")
            short_code = str(response.get("data") or "")
            delivery_status, delivery_error = verify_pushplus_delivery(
                short_code,
                callback_url,
                attempts=int(env("PUSHPLUS_VERIFY_ATTEMPTS", "12")),
                requested_at=requested_at,
            )
            save_json(Path(env("NOTIFICATION_RECEIPT_FILE", str(NOTIFICATION_RECEIPT))), {
                "requested_at": now().isoformat(),
                "channel": "pushplus-wechat",
                "title": title,
                "request_status": "accepted",
                "short_code": short_code,
                "delivery_status": delivery_status,
                "delivery_error": delivery_error,
            })
            print(f"pushplus receipt: short_code={short_code} delivery={delivery_status}")
            if delivery_status != "delivered":
                raise RuntimeError(f"PushPlus未确认送达: {delivery_status}: {delivery_error}")
            sent.append("pushplus")
        except Exception as exc:
            save_json(Path(env("NOTIFICATION_RECEIPT_FILE", str(NOTIFICATION_RECEIPT))), {
                "requested_at": now().isoformat(),
                "channel": "pushplus-wechat",
                "title": title,
                "request_status": "failed",
                "delivery_status": "failed",
                "delivery_error": str(exc),
            })
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


def mark_monitor_heartbeat(
    state: dict[str, Any],
    view: dict[str, Any],
    result: str,
    trigger_count: int,
    quote_count: int = 0,
) -> None:
    save_json(Path(env("HEARTBEAT_STATE_FILE", str(HEARTBEAT_STATE))), {
        "last_monitor_success_at": now().isoformat(),
        "result": result,
        "state_data_as_of": state.get("data_as_of"),
        "state_generated_at": state.get("generated_at"),
        "decision_generated_at": view.get("generated_at"),
        "latest_decision_id": view.get("latest_decision_id"),
        "active_trigger_count": trigger_count,
        "verified_quote_count": quote_count,
    })


def operational_notice(title: str, details: list[str], repeat_minutes: int = 120) -> bool:
    path = Path(env("HEALTH_NOTICE_STATE_FILE", str(HEALTH_NOTICE_STATE)))
    prior = load_json(path, {})
    signature = hashlib.sha256((title + "|" + "|".join(details)).encode()).hexdigest()[:20]
    try:
        last = datetime.fromisoformat(prior.get("last_sent_at", ""))
    except ValueError:
        last = None
    if prior.get("last_signature") == signature and last and now() - last < timedelta(minutes=repeat_minutes):
        print("operational notice suppressed by quiet interval")
        return True
    plain = title + "\n" + "\n".join(f"- {item}" for item in details)
    markdown = f"### {title}\n\n" + "\n".join(f"- {item}" for item in details)
    channels = notify_all(title, plain, markdown, title[:180], False)
    if channels:
        save_json(path, {"last_signature": signature, "last_sent_at": now().isoformat(), "details": details})
        return True
    return False


def raw_active_trigger_expiries(view: dict[str, Any], current: datetime | None = None) -> list[date]:
    current = current or now()
    result: list[date] = []
    for decision in view.get("decisions", []):
        if not decision.get("approved") or not decision.get("active"):
            continue
        for trigger in ((decision.get("triggers") or {}).get("price_triggers") or []):
            try:
                expiry = date.fromisoformat(str(trigger.get("valid_until") or ""))
            except ValueError:
                continue
            if expiry >= current.date():
                result.append(expiry)
    return result


def trading_days_until(target: date, current: date) -> int:
    if target <= current:
        return 0
    count = 0
    day = current
    while day < target:
        day = date.fromordinal(day.toordinal() + 1)
        if is_trading_day(day):
            count += 1
    return count


def run_health_check(state: dict[str, Any], view: dict[str, Any]) -> int:
    current = now()
    if not is_trading_day(current.date()):
        print("health check skipped on exchange holiday")
        return 0
    issues: list[str] = []
    valid, reason = runtime_bundle_is_valid(state, view, current)
    if not valid:
        issues.append(f"状态包不可执行：{reason}")
    heartbeat = load_json(Path(env("HEARTBEAT_STATE_FILE", str(HEARTBEAT_STATE))), {})
    heartbeat_at = parse_datetime(heartbeat.get("last_monitor_success_at"))
    max_age = int(env("HEARTBEAT_MAX_AGE_MINUTES", "12"))
    if not heartbeat_at or current - heartbeat_at > timedelta(minutes=max_age):
        issues.append(f"最近一次五分钟监控心跳超过{max_age}分钟或不存在")
    expiries = raw_active_trigger_expiries(view, current)
    if not expiries:
        issues.append("当前没有仍在有效期内的已批准价格触发")
    elif min(trading_days_until(item, current.date()) for item in expiries) <= 1:
        issues.append(f"最早触发计划将在{min(expiries).isoformat()}到期，请刷新决策")
    if not issues:
        print("monitor health check passed")
        return 0
    delivered = operational_notice("A股云端监控异常", issues, repeat_minutes=720)
    return 1 if delivered else 2


def main() -> int:
    load_runtime_env()
    parser = argparse.ArgumentParser(description="Approved A-share price-trigger monitor")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--ignore-trading-time", action="store_true")
    parser.add_argument("--test-notification", action="store_true", help="send one PushPlus/backup channel test")
    parser.add_argument("--renewal-notice", action="store_true", help="send the external trigger credential renewal reminder")
    parser.add_argument("--health-check", action="store_true", help="verify the external monitor heartbeat and active trigger horizon")
    parser.add_argument("--send-decision-summary", action="store_true", help="send the latest state-engine decision summary")
    args = parser.parse_args()
    if args.test_notification:
        title = "操盘策略0710微信提醒测试"
        plain = "微信提醒通道测试成功。后续仅推送已批准的买卖信号，不自动下单。"
        markdown = "### 操盘策略0710微信提醒测试\n\n通道已连接。后续仅推送**已批准**的买卖信号，不自动下单。"
        channels = notify_all(title, plain, markdown, plain, False)
        print(f"channels: {','.join(channels) if channels else 'none configured'}")
        return 0 if "pushplus" in channels else 1
    if args.renewal_notice:
        title = "A股云端监控凭证续期提醒"
        plain = "外部定时触发专用GitHub令牌将于2026-10-11到期。请在到期前发送“更新云端监控凭证”完成轮换。"
        markdown = "### A股云端监控凭证续期提醒\n\n外部定时触发专用GitHub令牌将于 **2026-10-11** 到期。请在到期前发送“更新云端监控凭证”完成轮换。"
        channels = notify_all(title, plain, markdown, plain, False)
        return 0 if channels else 1
    state = load_json(Path(env("TRADING_STATE_PATH", str(TRADING_STATE))), {})
    view = load_json(Path(env("DECISION_LATEST_PATH", str(DECISION_LATEST))), {})
    if args.health_check:
        return run_health_check(state, view)
    if not args.send_decision_summary and not args.ignore_trading_time and env("TRADE_HOURS_ONLY", "true").lower() == "true" and not is_trading_time():
        print("outside trading hours or exchange holiday")
        return 0
    bundle_valid, bundle_reason = runtime_bundle_is_valid(state, view)
    if not bundle_valid:
        delivered = operational_notice("A股监控数据已过期", [bundle_reason, "已暂停全部可执行买卖提醒，请刷新账户状态和批准决策"])
        return 1 if delivered else 2
    if args.send_decision_summary:
        summary_path = Path(env("SUMMARY_STATE_FILE", str(SUMMARY_STATE)))
        signature = decision_summary_signature(state, view)
        prior_summary = load_json(summary_path, {})
        title, plain, markdown, sms = build_decision_summary(
            state,
            view,
            signature != prior_summary.get("last_signature"),
            urgent=bool(actionable_decisions(view)),
        )
        channels = notify_all(title, plain, markdown, sms, args.dry_run)
        if channels and not args.dry_run:
            save_json(summary_path, {"last_signature": signature, "last_sent_at": now().isoformat()})
        print(f"channels: {','.join(channels) if channels else 'none configured'}")
        return 0 if channels else 1
    summary_path = Path(env("SUMMARY_STATE_FILE", str(SUMMARY_STATE)))
    signature = decision_summary_signature(state, view)
    prior_summary = load_json(summary_path, {})
    if immediate_action_decisions(view) and signature != prior_summary.get("last_signature"):
        title, plain, markdown, sms = build_decision_summary(state, view, True, urgent=True)
        channels = notify_all(title, plain, markdown, sms, args.dry_run)
        if channels and not args.dry_run:
            save_json(summary_path, {"last_signature": signature, "last_sent_at": now().isoformat()})
        print(f"channels: {','.join(channels) if channels else 'none configured'}")
        return 0 if channels else 1
    current = now()
    triggers = approved_price_triggers(state, view, current)
    if not triggers:
        mark_monitor_heartbeat(state, view, "no_active_triggers", 0)
        print("no approved actionable price triggers")
        return 0
    codes = sorted({item["code"] for item in triggers})
    quotes = fetch_consensus_quotes(codes)
    missing = sorted(set(codes) - set(quotes))
    if missing:
        operational_notice("A股监控行情源异常", [f"未通过腾讯与新浪双源校验：{','.join(missing)}", "本轮不生成任何价格指令"])
        return 1
    alerts = evaluate_approved_triggers(state, view, quotes, current)
    mark_monitor_heartbeat(state, view, "quote_check_completed", len(triggers), len(quotes))
    if not should_send(alerts, args.force):
        print("no new triggered alerts")
        return 0
    gate = {"title": f"risk={state.get('risk', {}).get('mode', 'unknown')}", "metrics": f"decision={view.get('latest_decision_id', '--')}"}
    title, plain, markdown, sms = build_message(state, gate, alerts)
    channels = notify_all(title, plain, markdown, sms, args.dry_run)
    if channels and not args.dry_run:
        mark_sent(alerts)
    print(f"channels: {','.join(channels) if channels else 'none configured'}")
    return 0 if channels else 1


if __name__ == "__main__":
    sys.exit(main())
