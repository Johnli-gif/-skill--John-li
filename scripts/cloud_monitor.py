#!/usr/bin/env python3
"""
Cloud A-share monitor.

Reads the latest structured holdings from data/panel-sync.json, refreshes public
Tencent quotes, evaluates stop/buy trigger rules, and sends alerts through
configured notification channels.
"""
from __future__ import annotations

import argparse
import base64
import email.utils
import hashlib
import hmac
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
PANEL_SYNC = ROOT / "data" / "panel-sync.json"
RULES_PATH = ROOT / "config" / "cloud-monitor-rules.json"
STATE_PATH = ROOT / "data" / "cloud-monitor" / "state.json"
TZ = ZoneInfo("Asia/Shanghai")


INDEX_SYMBOLS = {
    "sh000001": {"name": "上证", "role": "broad"},
    "sz399001": {"name": "深成", "role": "broad"},
    "sz399006": {"name": "创业板", "role": "style"},
    "sh000688": {"name": "科创50", "role": "style"},
}


@dataclass
class Alert:
    level: str
    code: str
    name: str
    price: float
    action: str
    reason: str
    rule_price: float | None = None

    def signature(self) -> str:
        src = f"{self.level}|{self.code}|{self.action}|{self.rule_price}"
        return hashlib.sha256(src.encode("utf-8")).hexdigest()[:16]


def env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def now() -> datetime:
    return datetime.now(TZ)


def now_label() -> str:
    return now().strftime("%Y-%m-%d %H:%M:%S")


def load_json(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return default
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"JSON格式错误: {path}: {exc}") from exc


def save_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def is_trading_time(dt: datetime | None = None) -> bool:
    dt = dt or now()
    if dt.weekday() >= 5:
        return False
    hm = dt.hour * 100 + dt.minute
    return 925 <= hm <= 1135 or 1255 <= hm <= 1505


def normalize_code(code: str) -> str:
    code = re.sub(r"\D", "", str(code or ""))
    return code.zfill(6)[-6:]


def quote_symbol(code: str) -> str:
    code = normalize_code(code)
    if code.startswith(("6", "9")):
        return f"sh{code}"
    if code.startswith(("8", "4")):
        return f"bj{code}"
    return f"sz{code}"


def numeric(value: Any, default: float = 0.0) -> float:
    try:
        if value is None or value == "":
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def http_get(url: str, timeout: int = 10) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 cloud-ashare-monitor",
            "Referer": "https://finance.qq.com/",
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read().decode("gbk", errors="ignore")


def fetch_tencent_quotes(codes: list[str]) -> dict[str, dict[str, Any]]:
    symbols = sorted({quote_symbol(code) for code in codes if normalize_code(code)})
    symbols.extend(symbol for symbol in INDEX_SYMBOLS if symbol not in symbols)
    if not symbols:
        return {}
    raw = http_get(f"https://qt.gtimg.cn/q={','.join(symbols)}&_={int(time.time() * 1000)}")
    quotes: dict[str, dict[str, Any]] = {}
    for match in re.finditer(r'v_([^=]+)="([^"]*)";', raw):
        symbol, body = match.group(1), match.group(2)
        parts = body.split("~")
        if len(parts) < 35:
            continue
        code = normalize_code(parts[2] or symbol)
        price = numeric(parts[3])
        if not code or price <= 0:
            continue
        quote = {
            "symbol": symbol,
            "code": code,
            "name": parts[1] or code,
            "price": price,
            "prevClose": numeric(parts[4]),
            "open": numeric(parts[5]),
            "time": parts[30] or "",
            "change": numeric(parts[31]),
            "pct": numeric(parts[32]),
            "high": numeric(parts[33]),
            "low": numeric(parts[34]),
        }
        quotes[code] = quote
        if symbol in INDEX_SYMBOLS:
            quotes[symbol] = quote
    return quotes


def market_gate(quotes: dict[str, dict[str, Any]]) -> dict[str, Any]:
    index_quotes = []
    for symbol, meta in INDEX_SYMBOLS.items():
        quote = quotes.get(symbol)
        if quote:
            index_quotes.append({**quote, **meta})
    broad = [q for q in index_quotes if q["role"] == "broad"]
    style = [q for q in index_quotes if q["role"] == "style"]
    broad_avg = sum(q["pct"] for q in broad) / max(1, len(broad))
    style_avg = sum(q["pct"] for q in style) / max(1, len(style))
    positive = sum(1 for q in index_quotes if q["pct"] > 0)
    if broad_avg <= -0.7 or style_avg <= -1.0:
        status = "closed"
        title = "市场闸门关闭"
    elif positive >= 3 and style_avg >= 0.3:
        status = "open"
        title = "市场允许进攻"
    elif positive >= 2 and style_avg >= 0:
        status = "trial"
        title = "市场可小仓试错"
    else:
        status = "watch"
        title = "市场还未确认"
    metrics = "｜".join(f"{q['name']}{q['pct']:+.2f}%" for q in index_quotes)
    return {"status": status, "title": title, "metrics": metrics, "can_buy": status in {"open", "trial"}}


def extract_numbers(text: str) -> list[float]:
    return [numeric(item) for item in re.findall(r"(?<!\d)(\d{1,4}(?:\.\d+)?)(?!\d)", text or "")]


def first_clause(text: str) -> str:
    return re.split(r"[；;。]", text or "", maxsplit=1)[0].strip() or text or ""


def load_rules() -> dict[str, Any]:
    path = Path(env("MONITOR_RULES_PATH", str(RULES_PATH))).expanduser()
    return load_json(path, {"positions": {}, "candidates": []})


def build_position_rule(position: dict[str, Any], overrides: dict[str, Any]) -> dict[str, Any]:
    code = normalize_code(position.get("code"))
    rule = dict(overrides.get(code, {}))
    stop_nums = extract_numbers(position.get("stop", ""))
    trigger_nums = extract_numbers(position.get("trigger", ""))
    if "stopBelow" not in rule and stop_nums:
        rule["stopBelow"] = max(stop_nums)
    if "watchAbove" not in rule and trigger_nums:
        rule["watchAbove"] = max(trigger_nums)
    rule.setdefault("stopAction", first_clause(position.get("stop", "")) or "触发持仓风控线")
    rule.setdefault("watchAction", first_clause(position.get("trigger", "")) or "触发持仓观察线")
    return rule


def evaluate_positions(panel: dict[str, Any], quotes: dict[str, dict[str, Any]], rules: dict[str, Any]) -> list[Alert]:
    alerts: list[Alert] = []
    overrides = rules.get("positions", {})
    for position in panel.get("positions", []):
        code = normalize_code(position.get("code"))
        if not code or numeric(position.get("quantity")) <= 0:
            continue
        quote = quotes.get(code) or {}
        price = numeric(quote.get("price"), numeric(position.get("currentPrice")))
        if price <= 0:
            continue
        rule = build_position_rule(position, overrides)
        stop_below = numeric(rule.get("stopBelow"))
        take_profit_above = numeric(rule.get("takeProfitAbove"))
        watch_above = numeric(rule.get("watchAbove"))
        name = position.get("name") or quote.get("name") or code
        if stop_below and price <= stop_below:
            alerts.append(Alert(
                level="sell",
                code=code,
                name=name,
                price=price,
                rule_price=stop_below,
                action=rule.get("stopAction", "触发风控线"),
                reason=f"现价{price:.2f} <= 风控线{stop_below:.2f}",
            ))
            continue
        if take_profit_above and price >= take_profit_above:
            alerts.append(Alert(
                level="sell",
                code=code,
                name=name,
                price=price,
                rule_price=take_profit_above,
                action=rule.get("takeProfitAction", "触发止盈线"),
                reason=f"现价{price:.2f} >= 止盈线{take_profit_above:.2f}",
            ))
            continue
        if watch_above and price >= watch_above and str(rule.get("watchNotify", "true")).lower() != "false":
            alerts.append(Alert(
                level="watch",
                code=code,
                name=name,
                price=price,
                rule_price=watch_above,
                action=rule.get("watchAction", "触发观察线"),
                reason=f"现价{price:.2f} >= 观察线{watch_above:.2f}",
            ))
    return alerts


def evaluate_candidates(quotes: dict[str, dict[str, Any]], rules: dict[str, Any], gate: dict[str, Any]) -> list[Alert]:
    keyed_alerts: list[tuple[int, Alert]] = []
    for item in rules.get("candidates", []):
        code = normalize_code(item.get("code"))
        quote = quotes.get(code) or {}
        price = numeric(quote.get("price"))
        if not code or price <= 0:
            continue
        name = item.get("name") or quote.get("name") or code
        if item.get("requireMarketGate", True) and not gate.get("can_buy"):
            continue
        buy_above = numeric(item.get("buyAbove"))
        buy_below = numeric(item.get("buyBelow"))
        priority = int(numeric(item.get("priority"), 999))
        if buy_above and price >= buy_above:
            keyed_alerts.append((priority, Alert(
                level="buy",
                code=code,
                name=name,
                price=price,
                rule_price=buy_above,
                action=item.get("action", "候选股触发买入观察"),
                reason=f"现价{price:.2f} >= 触发价{buy_above:.2f}；{gate.get('title')}",
            )))
        elif buy_below and price <= buy_below:
            keyed_alerts.append((priority, Alert(
                level="buy",
                code=code,
                name=name,
                price=price,
                rule_price=buy_below,
                action=item.get("action", "候选股回踩触发观察"),
                reason=f"现价{price:.2f} <= 回踩价{buy_below:.2f}；{gate.get('title')}",
            )))
    keyed_alerts.sort(key=lambda item: item[0])
    max_alerts = int(numeric(rules.get("maxCandidateAlerts"), 0))
    alerts = [alert for _, alert in keyed_alerts]
    return alerts[:max_alerts] if max_alerts > 0 else alerts


def should_send(alerts: list[Alert], state_path: Path, quiet_minutes: int, force: bool) -> bool:
    if force:
        return bool(alerts)
    if not alerts:
        return False
    state = load_json(state_path, {})
    signature = "|".join(sorted(alert.signature() for alert in alerts))
    last_signature = state.get("last_signature")
    last_sent = state.get("last_sent_at")
    if signature != last_signature or not last_sent:
        return True
    try:
        last_dt = datetime.fromisoformat(last_sent)
    except ValueError:
        return True
    return now() - last_dt > timedelta(minutes=quiet_minutes)


def mark_sent(alerts: list[Alert], state_path: Path) -> None:
    signature = "|".join(sorted(alert.signature() for alert in alerts))
    save_json(state_path, {"last_signature": signature, "last_sent_at": now().isoformat()})


def alert_direction(alert: Alert) -> str:
    return {
        "sell": "卖出/减仓",
        "buy": "买入/试仓",
        "watch": "观察",
    }.get(alert.level, alert.level)


def alert_condition(alert: Alert) -> str:
    if alert.rule_price is None:
        return "触发线未设置"
    operator = "<=" if alert.level == "sell" else ">="
    if "回踩" in alert.action or "<= 回踩价" in alert.reason:
        operator = "<="
    return f"现价 {alert.price:.2f} {operator} 条件价 {alert.rule_price:.2f}"


def alert_reference_price(alert: Alert) -> str:
    if alert.level == "sell":
        return f"卖出/减仓参考价：{alert.price:.2f} 附近；风控线：{alert.rule_price:.2f}" if alert.rule_price else f"卖出/减仓参考价：{alert.price:.2f} 附近"
    if alert.level == "buy":
        return f"买入/试仓参考价：{alert.price:.2f} 附近；触发线：{alert.rule_price:.2f}" if alert.rule_price else f"买入/试仓参考价：{alert.price:.2f} 附近"
    return f"观察参考价：{alert.price:.2f} 附近；观察线：{alert.rule_price:.2f}" if alert.rule_price else f"观察参考价：{alert.price:.2f} 附近"


def alert_distance(alert: Alert) -> str:
    if not alert.rule_price:
        return ""
    diff = alert.price - alert.rule_price
    pct = diff / alert.rule_price * 100
    return f"距条件价 {diff:+.2f} / {pct:+.2f}%"


def build_message(panel: dict[str, Any], gate: dict[str, Any], alerts: list[Alert]) -> tuple[str, str, str]:
    account = panel.get("account", {})
    title = f"A股触发提醒 {now().strftime('%H:%M')}"
    plain = [
        f"{title}",
        f"市场闸门：{gate.get('title')}｜{gate.get('metrics')}",
        f"账户：总资产{account.get('brokerReportedAssets', panel.get('goal', {}).get('currentAssets', '--'))}，仓位{account.get('brokerReportedPositionRatio', '--')}%",
        "",
    ]
    markdown = [
        f"### {title}",
        f"- **市场闸门**：{gate.get('title')}｜{gate.get('metrics')}",
        f"- **账户**：总资产{account.get('brokerReportedAssets', panel.get('goal', {}).get('currentAssets', '--'))}，仓位{account.get('brokerReportedPositionRatio', '--')}%",
        "",
    ]
    for index, alert in enumerate(alerts, 1):
        distance = alert_distance(alert)
        plain.extend([
            f"{index}. {alert.name} {alert.code}",
            f"   类型：{alert_direction(alert)}",
            f"   当前价：{alert.price:.2f}",
            f"   触发条件：{alert_condition(alert)}" + (f"（{distance}）" if distance else ""),
            f"   执行参考：{alert_reference_price(alert)}",
            f"   具体动作：{alert.action}",
            f"   触发依据：{alert.reason}",
            "",
        ])
        markdown.extend([
            f"{index}. **{alert.name} {alert.code}**",
            f"   - 类型：**{alert_direction(alert)}**",
            f"   - 当前价：`{alert.price:.2f}`",
            f"   - 触发条件：{alert_condition(alert)}" + (f"（{distance}）" if distance else ""),
            f"   - 执行参考：{alert_reference_price(alert)}",
            f"   - 具体动作：{alert.action}",
            f"   - 触发依据：{alert.reason}",
            "",
        ])
    plain.append("")
    plain.append("仅为公开行情触发提醒，不自动下单。真实持仓以券商账户为准。")
    markdown.append("")
    markdown.append("> 仅为公开行情触发提醒，不自动下单。真实持仓以券商账户为准。")
    sms = "；".join(f"{a.name}{a.price:.2f}/{alert_direction(a)}:{a.action}" for a in alerts[:3])
    return title, "\n".join(plain), "\n".join(markdown)[:3900], sms[:180]


def post_json(url: str, payload: dict[str, Any], timeout: int = 10) -> str:
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read().decode("utf-8", errors="ignore")


def post_form(url: str, payload: dict[str, Any], timeout: int = 10) -> str:
    data = urllib.parse.urlencode(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read().decode("utf-8", errors="ignore")


def notify_wechat(title: str, plain: str, markdown: str) -> bool:
    sent = False
    webhook = env("WECHAT_WORK_WEBHOOK_URL")
    if webhook:
        post_json(webhook, {"msgtype": "markdown", "markdown": {"content": markdown}})
        sent = True
    token = env("PUSHPLUS_TOKEN")
    if token:
        payload = {"token": token, "title": title, "content": markdown, "template": "markdown"}
        topic = env("PUSHPLUS_TOPIC")
        if topic:
            payload["topic"] = topic
        post_json("https://www.pushplus.plus/send", payload)
        sent = True
    server_chan = env("SERVERCHAN_SENDKEY")
    if server_chan:
        post_form(f"https://sctapi.ftqq.com/{server_chan}.send", {"title": title, "desp": markdown})
        sent = True
    return sent


def notify_email(title: str, plain: str) -> bool:
    host = env("SMTP_HOST")
    to_addr = env("MAIL_TO")
    if not host or not to_addr:
        return False
    port = int(env("SMTP_PORT", "465"))
    user = env("SMTP_USERNAME")
    password = env("SMTP_PASSWORD")
    from_addr = env("MAIL_FROM", user)
    message = MIMEText(plain, "plain", "utf-8")
    message["Subject"] = title
    message["From"] = from_addr
    message["To"] = to_addr
    message["Date"] = email.utils.formatdate(localtime=True)
    if port == 465:
        with smtplib.SMTP_SSL(host, port, context=ssl.create_default_context(), timeout=12) as smtp:
            if user:
                smtp.login(user, password)
            smtp.sendmail(from_addr, [addr.strip() for addr in to_addr.split(",")], message.as_string())
    else:
        with smtplib.SMTP(host, port, timeout=12) as smtp:
            smtp.starttls(context=ssl.create_default_context())
            if user:
                smtp.login(user, password)
            smtp.sendmail(from_addr, [addr.strip() for addr in to_addr.split(",")], message.as_string())
    return True


def percent_encode(value: str) -> str:
    return urllib.parse.quote(value, safe="").replace("+", "%20").replace("*", "%2A").replace("%7E", "~")


def aliyun_signature(params: dict[str, str], secret: str) -> str:
    query = "&".join(f"{percent_encode(k)}={percent_encode(params[k])}" for k in sorted(params))
    string_to_sign = f"GET&%2F&{percent_encode(query)}"
    digest = hmac.new((secret + "&").encode("utf-8"), string_to_sign.encode("utf-8"), hashlib.sha1).digest()
    return base64.b64encode(digest).decode("ascii")


def notify_sms(title: str, sms_text: str) -> bool:
    webhook = env("SMS_WEBHOOK_URL")
    if webhook:
        post_json(webhook, {"title": title, "message": sms_text})
        return True
    if env("SMS_PROVIDER").lower() != "aliyun":
        return False
    access_key = env("ALIYUN_ACCESS_KEY_ID")
    access_secret = env("ALIYUN_ACCESS_KEY_SECRET")
    phone = env("SMS_TO")
    sign_name = env("ALIYUN_SMS_SIGN_NAME")
    template_code = env("ALIYUN_SMS_TEMPLATE_CODE")
    if not all([access_key, access_secret, phone, sign_name, template_code]):
        return False
    template_param = env("ALIYUN_SMS_TEMPLATE_PARAM_JSON", '{"message":"{{message}}"}')
    template_param = template_param.replace("{{message}}", sms_text.replace('"', "'"))
    params = {
        "AccessKeyId": access_key,
        "Action": "SendSms",
        "Format": "JSON",
        "PhoneNumbers": phone,
        "RegionId": "cn-hangzhou",
        "SignatureMethod": "HMAC-SHA1",
        "SignatureNonce": hashlib.md5(f"{time.time()}".encode()).hexdigest(),
        "SignatureVersion": "1.0",
        "SignName": sign_name,
        "TemplateCode": template_code,
        "TemplateParam": template_param,
        "Timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "Version": "2017-05-25",
    }
    params["Signature"] = aliyun_signature(params, access_secret)
    url = "https://dysmsapi.aliyuncs.com/?" + urllib.parse.urlencode(params)
    http_get(url, timeout=12)
    return True


def notify_all(title: str, plain: str, markdown: str, sms: str, dry_run: bool) -> list[str]:
    channels = []
    if dry_run:
        print(markdown)
        return ["dry-run"]
    for channel, sender in (
        ("wechat", lambda: notify_wechat(title, plain, markdown)),
        ("email", lambda: notify_email(title, plain)),
        ("sms", lambda: notify_sms(title, sms)),
    ):
        try:
            if sender():
                channels.append(channel)
        except Exception as exc:
            print(f"[WARN] {channel}通知失败：{exc}")
    return channels


def main() -> int:
    parser = argparse.ArgumentParser(description="A-share cloud monitor")
    parser.add_argument("--force", action="store_true", help="ignore duplicate suppression")
    parser.add_argument("--dry-run", action="store_true", help="print message without sending")
    parser.add_argument("--ignore-trading-time", action="store_true", help="run outside A-share trading hours")
    args = parser.parse_args()

    if env("TRADE_HOURS_ONLY", "true").lower() != "false" and not args.ignore_trading_time and not is_trading_time():
        print(f"[{now_label()}] 非A股交易时段，跳过。")
        return 0

    panel_path = Path(env("PANEL_SYNC_PATH", str(PANEL_SYNC))).expanduser()
    state_path = Path(env("ALERT_STATE_FILE", str(STATE_PATH))).expanduser()
    quiet_minutes = int(env("QUIET_REPEAT_MINUTES", "30"))

    panel = load_json(panel_path, {})
    rules = load_rules()
    position_codes = [normalize_code(item.get("code")) for item in panel.get("positions", [])]
    candidate_codes = [normalize_code(item.get("code")) for item in rules.get("candidates", [])]
    quotes = fetch_tencent_quotes(position_codes + candidate_codes)
    gate = market_gate(quotes)
    alerts = evaluate_positions(panel, quotes, rules)
    alerts.extend(evaluate_candidates(quotes, rules, gate))
    min_level = env("ALERT_MIN_LEVEL", "actionable").lower()
    if min_level == "actionable":
        alerts = [item for item in alerts if item.level in {"sell", "buy"}]
    elif min_level == "sell":
        alerts = [item for item in alerts if item.level == "sell"]

    print(f"[{now_label()}] {gate['title']} {gate['metrics']} alerts={len(alerts)}")
    for alert in alerts:
        print(f"- {alert.level} {alert.name} {alert.code} {alert.price:.2f}: {alert.action}")

    if not should_send(alerts, state_path, quiet_minutes, args.force):
        return 0

    title, plain, markdown, sms = build_message(panel, gate, alerts)
    channels = notify_all(title, plain, markdown, sms, args.dry_run)
    if not channels:
        print("[WARN] 没有配置任何通知通道，未发送。")
        return 2
    mark_sent(alerts, state_path)
    print(f"[OK] 已发送: {', '.join(channels)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
