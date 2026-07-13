#!/usr/bin/env python3
"""Auditable A-share trading ledger and risk-state engine.

The broker screenshots remain the source of truth. This module stores confirmed
facts in SQLite and derives read-only JSON for the dashboard and alert worker.
It uses only the Python standard library.
"""
from __future__ import annotations

import argparse
import json
import math
import sqlite3
import sys
import uuid
from dataclasses import dataclass
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo
from pathlib import Path
from typing import Any, Iterable, Sequence


SKILL_VERSION = "2.3.0"
DEFAULT_COST_RATE = 0.003
SHANGHAI_TZ = ZoneInfo("Asia/Shanghai")
CALENDAR_PATH = Path(__file__).resolve().parents[1] / "config" / "china-exchange-calendar.json"
MARKET_FACTOR_KEYS = ("broad_trend", "growth_style", "breadth", "turnover_quality", "sector_confirmation")
SECTOR_LIFECYCLES = {"低位预热", "趋势扩散", "高位拥挤", "退潮失效"}
ALLOWED_STOP_BASES = {"intraday_emergency", "close_confirmation", "two_close_confirmation"}
ALLOWED_TRIGGER_CONFIRMATIONS = ALLOWED_STOP_BASES | {"intraday"}
ALLOWED_TRIGGER_LEVELS = {"buy", "sell", "watch"}
ALLOWED_TRIGGER_OPERATORS = {"<=", ">="}
NORMAL_LIMITS = {
    "risk_per_trade_pct": 0.4,
    "initial_position_pct": 5.0,
    "stock_position_pct": 10.0,
    "sector_market_value_pct": 10.0,
    "portfolio_stop_risk_pct": 1.2,
    "sector_stop_risk_pct": 0.6,
    "total_exposure_pct": 30.0,
    "max_positions": 4,
    "max_new_positions_per_day": 1,
}
PROBATION_LIMITS = {
    **NORMAL_LIMITS,
    "risk_per_trade_pct": 0.2,
    "initial_position_pct": 2.5,
    "cumulative_new_exposure_pct": 5.0,
    "max_new_positions": 1,
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def parse_timestamp(value: Any) -> datetime:
    parsed = datetime.fromisoformat(str(value))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=SHANGHAI_TZ)
    return parsed.astimezone(timezone.utc)


def shanghai_date(value: Any) -> date:
    return parse_timestamp(value).astimezone(SHANGHAI_TZ).date()


def load_exchange_calendar(path: Path = CALENDAR_PATH) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def calendar_covers(day: date, path: Path = CALENDAR_PATH) -> bool:
    return str(day.year) in (load_exchange_calendar(path).get("years") or {})


def is_trading_day(day: date, path: Path = CALENDAR_PATH) -> bool:
    calendar = load_exchange_calendar(path)
    year = (calendar.get("years") or {}).get(str(day.year))
    if not year:
        return False
    return day.weekday() < 5 and day.isoformat() not in set(year.get("closed_weekdays") or [])


def completed_trading_sessions_since(
    as_of: str,
    current: datetime | None = None,
    calendar_path: Path = CALENDAR_PATH,
) -> int:
    current = (current or datetime.now(SHANGHAI_TZ)).astimezone(SHANGHAI_TZ)
    latest = datetime.fromisoformat(as_of).astimezone(SHANGHAI_TZ)
    day = latest.date()
    count = 0
    while day < current.date():
        day = day.fromordinal(day.toordinal() + 1)
        if is_trading_day(day, calendar_path) and day < current.date():
            count += 1
    if current.date() > latest.date() and is_trading_day(current.date(), calendar_path) and current.hour >= 16:
        count += 1
    return count


# Compatibility for callers of the pre-2.3 helper.
completed_weekday_sessions_since = completed_trading_sessions_since


def json_dump(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    path.chmod(0o600)


def json_dump_compact(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    path.chmod(0o600)


def json_load(path: Path, default: Any = None) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return default


def as_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def json_field(item: dict[str, Any], name: str, default: Any) -> Any:
    value = item.get(name)
    if value is None and f"{name}_json" in item:
        value = item.get(f"{name}_json")
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return default
    return default if value is None else value


def normalize_code(value: Any) -> str:
    digits = "".join(ch for ch in str(value or "") if ch.isdigit())
    return digits[-6:].zfill(6) if digits else ""


def round_lot(shares: float, lot: int = 100) -> int:
    return max(0, int(shares // lot) * lot)


def wilson_interval(wins: int, total: int, z: float = 1.959963984540054) -> tuple[float, float] | None:
    if total <= 0:
        return None
    p = wins / total
    denominator = 1 + z * z / total
    centre = (p + z * z / (2 * total)) / denominator
    margin = z * math.sqrt((p * (1 - p) + z * z / (4 * total)) / total) / denominator
    return max(0.0, centre - margin), min(1.0, centre + margin)


def expectancy_r(win_rate: float, avg_win_r: float, avg_loss_r: float, cost_r: float) -> float:
    return win_rate * avg_win_r - (1 - win_rate) * avg_loss_r - cost_r


def calibrated_statistics(r_multiples: Sequence[float], minimum: int = 30) -> dict[str, Any]:
    values = [float(value) for value in r_multiples]
    wins = [value for value in values if value > 0]
    losses = [value for value in values if value < 0]
    result: dict[str, Any] = {
        "sample_size": len(values),
        "calibrated": len(values) >= minimum,
        "status": "calibrated" if len(values) >= minimum else "uncalibrated",
    }
    if len(values) < minimum:
        result["statistical_probability"] = None
        return result
    hit_rate = len(wins) / len(values)
    interval = wilson_interval(len(wins), len(values))
    gross_profit = sum(wins)
    gross_loss = abs(sum(losses))
    result.update({
        "statistical_probability": hit_rate,
        "out_of_sample_hit_rate": hit_rate,
        "wilson_95": list(interval) if interval else None,
        "profit_factor": gross_profit / gross_loss if gross_loss else None,
        "expectancy_r": sum(values) / len(values),
        "average_win_r": gross_profit / len(wins) if wins else 0.0,
        "average_loss_r": gross_loss / len(losses) if losses else 0.0,
    })
    return result


def effective_risk_distance(entry: float, structural_stop: float, atr14: float, cost_rate: float = DEFAULT_COST_RATE) -> float:
    structural = abs(entry - structural_stop)
    volatility = max(0.0, 1.2 * atr14)
    return max(structural, volatility) + entry * max(0.0, cost_rate)


def position_size(
    total_assets: float,
    entry: float,
    structural_stop: float,
    atr14: float,
    risk_pct: float,
    exposure_pct: float,
    cost_rate: float = DEFAULT_COST_RATE,
    lot: int = 100,
) -> dict[str, Any]:
    distance = effective_risk_distance(entry, structural_stop, atr14, cost_rate)
    risk_budget = total_assets * risk_pct / 100
    by_risk = round_lot(risk_budget / distance, lot) if distance else 0
    by_exposure = round_lot(total_assets * exposure_pct / 100 / entry, lot) if entry else 0
    shares = min(by_risk, by_exposure)
    return {
        "shares": shares,
        "risk_budget": risk_budget,
        "effective_risk_per_share": distance,
        "shares_by_risk": by_risk,
        "shares_by_exposure": by_exposure,
        "minimum_lot_blocked": shares < lot,
    }


def score_market_gate(factors: dict[str, int | None], manual_downgrade_to: str | None = None) -> dict[str, Any]:
    required = ("broad_trend", "breadth", "sector_confirmation")
    clean = {key: None if value is None else max(0, min(2, int(value))) for key, value in factors.items()}
    total = sum(value or 0 for value in clean.values())
    if total >= 8:
        label = "进攻"
    elif total >= 6:
        label = "谨慎进攻"
    elif total >= 4:
        label = "观察"
    else:
        label = "防守"
    missing_core = [key for key in required if clean.get(key) is None]
    rank = {"防守": 0, "观察": 1, "谨慎进攻": 2, "进攻": 3}
    cap_reasons: list[str] = []
    if missing_core and rank[label] > rank["谨慎进攻"]:
        label = "谨慎进攻"
        cap_reasons.append("missing_core_data")
    if (clean.get("breadth") == 0 or clean.get("sector_confirmation") == 0) and rank[label] > rank["观察"]:
        label = "观察"
        cap_reasons.append("breadth_or_sector_zero")
    elif (clean.get("broad_trend") == 0 or clean.get("turnover_quality") == 0) and rank[label] > rank["谨慎进攻"]:
        label = "谨慎进攻"
        cap_reasons.append("broad_trend_or_turnover_zero")
    if manual_downgrade_to and rank.get(manual_downgrade_to, 99) < rank[label]:
        label = manual_downgrade_to
        cap_reasons.append("manual_downgrade")
    return {"score": total, "label": label, "factors": clean, "missing_core": missing_core, "cap_reasons": cap_reasons}


def entry_permission(
    risk_state: dict[str, Any],
    confirmations: dict[str, bool],
    reward_risk: float,
    expected_value_r: float,
    calibrated: bool,
) -> dict[str, Any]:
    """Resolve the strongest allowed entry label without using narrative confidence."""
    vetoes = list(risk_state.get("new_buy_vetoes") or [])
    if risk_state.get("mode") not in {"normal", "probation"} or not risk_state.get("new_buys_allowed"):
        vetoes.append("account_risk_mode")
    missing = [key for key in ("market", "sector", "stock") if not confirmations.get(key, False)]
    if missing:
        vetoes.append("missing_confirmation:" + ",".join(missing))
    if reward_risk < 2:
        vetoes.append("reward_risk_below_2")
    if expected_value_r <= 0:
        vetoes.append("non_positive_expectancy")
    if vetoes:
        account_veto = any(item in vetoes for item in ("account_risk_mode", "drawdown_or_loss_cooldown_active"))
        return {"action": "空仓等待" if account_veto else "观察", "vetoes": vetoes}
    return {"action": "买入" if calibrated else "试仓", "vetoes": []}


@dataclass(frozen=True)
class DecisionChange:
    changed: bool
    allowed: bool
    reasons: tuple[str, ...]


MATERIAL_CHANGE_REASONS = {
    "market_gate",
    "sector_lifecycle",
    "thesis_pillar",
    "formal_trigger",
    "material_announcement",
    "account_risk",
    "risk_control_correction",
}


DECISION_STABILITY_FIELDS = (
    "market_gate", "market_gate_score", "risk_state", "action", "sector", "entry_low", "entry_high",
    "stop_price", "stop_basis", "first_target",
    "second_target", "quantity", "exposure_pct", "account_risk_pct", "effective_risk_per_share",
    "reward_risk", "atr14", "cost_rate", "expectancy_r", "thesis_status",
)


def comparable_decision(item: dict[str, Any]) -> dict[str, Any]:
    result = {key: item.get(key) for key in DECISION_STABILITY_FIELDS}
    for key in ("triggers", "targets", "buyback", "confirmations", "subjective_range", "empirical_stats"):
        result[key] = json_field(item, key, {} if key != "buyback" else None)
    return result


def validate_decision_change(previous: dict[str, Any] | None, current: dict[str, Any]) -> DecisionChange:
    if not previous:
        return DecisionChange(True, True, ("initial_decision",))
    changed = comparable_decision(previous) != comparable_decision(current)
    reasons = tuple(sorted(set(current.get("material_change_reasons") or [])))
    allowed = not changed or bool(set(reasons) & MATERIAL_CHANGE_REASONS)
    return DecisionChange(changed, allowed, reasons)


class TradingLedger:
    def __init__(
        self,
        db_path: Path,
        current_time_provider: Any | None = None,
        calendar_path: Path = CALENDAR_PATH,
    ):
        self.db_path = Path(db_path)
        self.current_time_provider = current_time_provider or (lambda: datetime.now(SHANGHAI_TZ))
        self.calendar_path = Path(calendar_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(self.db_path)
        self.db_path.chmod(0o600)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA foreign_keys = ON")
        self.db.execute("PRAGMA journal_mode = DELETE")
        self.initialize()

    def close(self) -> None:
        self.db.close()
        self.db_path.chmod(0o600)

    def _ensure_column(self, table: str, column: str, declaration: str) -> None:
        columns = {row["name"] for row in self.db.execute(f"PRAGMA table_info({table})")}
        if column not in columns:
            self.db.execute(f"ALTER TABLE {table} ADD COLUMN {column} {declaration}")

    def initialize(self) -> None:
        self.db.executescript(
            """
            CREATE TABLE IF NOT EXISTS equity_snapshots (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              as_of TEXT NOT NULL,
              session_type TEXT NOT NULL CHECK(session_type IN ('close','intraday')),
              total_assets REAL NOT NULL,
              cash REAL NOT NULL,
              market_value REAL NOT NULL,
              net_cash_flow REAL NOT NULL DEFAULT 0,
              source TEXT NOT NULL,
              evidence_ref TEXT,
              created_at TEXT NOT NULL,
              UNIQUE(as_of, session_type, source)
            );
            CREATE TABLE IF NOT EXISTS positions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              snapshot_id INTEGER NOT NULL REFERENCES equity_snapshots(id),
              code TEXT NOT NULL,
              name TEXT NOT NULL,
              sector TEXT,
              quantity INTEGER NOT NULL,
              available_quantity INTEGER NOT NULL,
              cost_price REAL,
              current_price REAL,
              market_value REAL,
              pnl REAL,
              planned_stop REAL,
              stop_basis TEXT CHECK(stop_basis IS NULL OR stop_basis IN ('intraday_emergency','close_confirmation','two_close_confirmation')),
              atr14 REAL,
              legacy_position INTEGER NOT NULL DEFAULT 0,
              source TEXT NOT NULL,
              UNIQUE(snapshot_id, code)
            );
            CREATE TABLE IF NOT EXISTS executions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              executed_at TEXT NOT NULL,
              code TEXT NOT NULL,
              name TEXT,
              side TEXT NOT NULL,
              price REAL NOT NULL,
              quantity INTEGER NOT NULL,
              amount REAL NOT NULL,
              fees REAL,
              plan_id TEXT,
              position_before INTEGER,
              position_after INTEGER,
              available_after INTEGER,
              source TEXT NOT NULL,
              evidence_ref TEXT,
              created_at TEXT NOT NULL,
              UNIQUE(executed_at, code, side, price, quantity)
            );
            CREATE TABLE IF NOT EXISTS decisions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              decision_id TEXT NOT NULL UNIQUE,
              decided_at TEXT NOT NULL,
              data_as_of TEXT NOT NULL,
              skill_version TEXT NOT NULL,
              market_gate TEXT NOT NULL,
              market_gate_score INTEGER,
              risk_state TEXT NOT NULL,
              code TEXT,
              name TEXT,
              action TEXT NOT NULL,
              sector TEXT,
              entry_low REAL,
              entry_high REAL,
              stop_price REAL,
              stop_basis TEXT,
              first_target REAL,
              second_target REAL,
              quantity INTEGER,
              exposure_pct REAL,
              account_risk_pct REAL,
              effective_risk_per_share REAL,
              reward_risk REAL,
              atr14 REAL,
              cost_rate REAL,
              expectancy_r REAL,
              confirmations_json TEXT NOT NULL DEFAULT '{}',
              triggers_json TEXT NOT NULL DEFAULT '{}',
              targets_json TEXT NOT NULL DEFAULT '{}',
              subjective_range_json TEXT,
              empirical_stats_json TEXT,
              rationale TEXT NOT NULL,
              thesis_status TEXT,
              buyback_json TEXT,
              prior_decision_id TEXT,
              material_change_json TEXT NOT NULL DEFAULT '[]',
              approved INTEGER NOT NULL DEFAULT 0,
              active INTEGER NOT NULL DEFAULT 1,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS outcomes (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              decision_id TEXT NOT NULL REFERENCES decisions(decision_id),
              horizon_days INTEGER NOT NULL,
              return_pct REAL,
              benchmark_return_pct REAL,
              mfe_pct REAL,
              mae_pct REAL,
              r_multiple REAL,
              rule_compliant INTEGER,
              closed_trade INTEGER NOT NULL DEFAULT 0,
              measured_at TEXT NOT NULL,
              UNIQUE(decision_id, horizon_days)
            );
            CREATE TABLE IF NOT EXISTS risk_events (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              event_type TEXT NOT NULL,
              effective_after TEXT NOT NULL,
              required_sessions INTEGER NOT NULL DEFAULT 0,
              details_json TEXT NOT NULL DEFAULT '{}',
              probation_started_at TEXT,
              probation_start_outcome_id INTEGER,
              resolved_at TEXT,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS market_scans (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              scanned_at TEXT NOT NULL,
              data_as_of TEXT NOT NULL,
              scan_scope TEXT NOT NULL CHECK(scan_scope IN ('full','delta')),
              session TEXT NOT NULL,
              market_gate TEXT NOT NULL,
              market_gate_score INTEGER NOT NULL,
              factors_json TEXT NOT NULL,
              sectors_json TEXT NOT NULL DEFAULT '[]',
              sources_json TEXT NOT NULL DEFAULT '[]',
              summary TEXT NOT NULL,
              created_at TEXT NOT NULL,
              UNIQUE(scanned_at, scan_scope)
            );
            CREATE INDEX IF NOT EXISTS idx_equity_close ON equity_snapshots(session_type, as_of);
            CREATE INDEX IF NOT EXISTS idx_positions_snapshot ON positions(snapshot_id);
            CREATE INDEX IF NOT EXISTS idx_execution_plan ON executions(plan_id, executed_at);
            CREATE INDEX IF NOT EXISTS idx_decisions_active ON decisions(active, decided_at);
            CREATE INDEX IF NOT EXISTS idx_market_scans_time ON market_scans(scanned_at);
            """
        )
        self._ensure_column("decisions", "atr14", "REAL")
        self._ensure_column("decisions", "cost_rate", "REAL")
        self._ensure_column("decisions", "expectancy_r", "REAL")
        self._ensure_column("decisions", "confirmations_json", "TEXT NOT NULL DEFAULT '{}'")
        self._ensure_column("risk_events", "probation_started_at", "TEXT")
        self._ensure_column("risk_events", "probation_start_outcome_id", "INTEGER")
        self.db.execute("UPDATE decisions SET active=0 WHERE approved=0 AND active=1")
        self.db.commit()

    def add_equity_snapshot(self, fact: dict[str, Any]) -> int:
        row = self.db.execute(
            """INSERT OR IGNORE INTO equity_snapshots
               (as_of,session_type,total_assets,cash,market_value,net_cash_flow,source,evidence_ref,created_at)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (
                fact["as_of"], fact.get("session_type", "close"), as_float(fact["total_assets"]),
                as_float(fact["cash"]), as_float(fact["market_value"]), as_float(fact.get("net_cash_flow")),
                fact.get("source", "user_confirmed"), fact.get("evidence_ref"), utc_now(),
            ),
        )
        if row.lastrowid:
            snapshot_id = int(row.lastrowid)
        else:
            found = self.db.execute(
                "SELECT id FROM equity_snapshots WHERE as_of=? AND session_type=? AND source=?",
                (fact["as_of"], fact.get("session_type", "close"), fact.get("source", "user_confirmed")),
            ).fetchone()
            snapshot_id = int(found["id"])
        self.db.commit()
        return snapshot_id

    def add_positions(self, snapshot_id: int, positions: Iterable[dict[str, Any]]) -> None:
        for item in positions:
            self.db.execute(
                """INSERT OR REPLACE INTO positions
                   (snapshot_id,code,name,sector,quantity,available_quantity,cost_price,current_price,market_value,pnl,
                    planned_stop,stop_basis,atr14,legacy_position,source)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    snapshot_id, normalize_code(item.get("code")), item.get("name") or normalize_code(item.get("code")),
                    item.get("sector"), int(as_float(item.get("quantity"))), int(as_float(item.get("available_quantity", item.get("quantity")))),
                    as_float(item.get("cost_price")), as_float(item.get("current_price")), as_float(item.get("market_value")),
                    as_float(item.get("pnl")), item.get("planned_stop"), item.get("stop_basis"), item.get("atr14"),
                    1 if item.get("legacy_position") else 0, item.get("source", "user_confirmed"),
                ),
            )
        self.db.commit()

    def add_execution(self, fact: dict[str, Any]) -> int:
        row = self.db.execute(
            """INSERT OR IGNORE INTO executions
               (executed_at,code,name,side,price,quantity,amount,fees,plan_id,position_before,position_after,
                available_after,source,evidence_ref,created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                fact["executed_at"], normalize_code(fact["code"]), fact.get("name"), fact["side"].upper(),
                as_float(fact["price"]), int(as_float(fact["quantity"])), as_float(fact.get("amount"), as_float(fact["price"]) * as_float(fact["quantity"])),
                fact.get("fees"), fact.get("plan_id"), fact.get("position_before"), fact.get("position_after"),
                fact.get("available_after"), fact.get("source", "user_confirmed"), fact.get("evidence_ref"), utc_now(),
            ),
        )
        self.db.commit()
        return int(row.lastrowid or 0)

    def add_risk_event(self, event_type: str, effective_after: str, required_sessions: int, details: dict[str, Any]) -> int:
        exists = self.db.execute(
            "SELECT id FROM risk_events WHERE event_type=? AND effective_after=? AND resolved_at IS NULL",
            (event_type, effective_after),
        ).fetchone()
        if not exists:
            row = self.db.execute(
                "INSERT INTO risk_events(event_type,effective_after,required_sessions,details_json,created_at) VALUES(?,?,?,?,?)",
                (event_type, effective_after, required_sessions, json.dumps(details, ensure_ascii=False), utc_now()),
            )
            self.db.commit()
            return int(row.lastrowid)
        return int(exists["id"])

    def add_market_scan(self, scan: dict[str, Any]) -> int:
        scope = str(scan.get("scan_scope") or "")
        if scope not in {"full", "delta"}:
            raise ValueError("market scan scope must be full or delta")
        raw_scanned_at = str(scan.get("scanned_at") or "")
        raw_data_as_of = str(scan.get("data_as_of") or "")
        if not raw_scanned_at or not raw_data_as_of:
            raise ValueError("market scan requires scanned_at and data_as_of")
        scanned_time = parse_timestamp(raw_scanned_at)
        data_time = parse_timestamp(raw_data_as_of)
        if data_time > scanned_time:
            raise ValueError("market scan data_as_of cannot be later than scanned_at")
        scanned_at = scanned_time.isoformat(timespec="seconds")
        data_as_of = data_time.isoformat(timespec="seconds")
        factors = scan.get("factors")
        if not isinstance(factors, dict) or set(factors) != set(MARKET_FACTOR_KEYS):
            raise ValueError("market scan requires exactly five market factors")
        if any(type(factors[key]) is not int or factors[key] < 0 or factors[key] > 2 for key in MARKET_FACTOR_KEYS):
            raise ValueError("each market factor must be an integer from 0 to 2")
        sectors = scan.get("sectors") or []
        if not isinstance(sectors, list):
            raise ValueError("market scan sectors must be a list")
        if scope == "full" and not 3 <= len(sectors) <= 5:
            raise ValueError("a full market scan requires 3-5 sector comparisons")
        for sector in sectors:
            if not isinstance(sector, dict) or not sector.get("name") or sector.get("lifecycle") not in SECTOR_LIFECYCLES or not sector.get("conclusion"):
                raise ValueError("each sector requires name, valid lifecycle, and conclusion")
        sources = scan.get("sources") or []
        if not isinstance(sources, list) or not sources:
            raise ValueError("market scan requires timestamped sources")
        for source in sources:
            if not isinstance(source, dict) or not source.get("name") or not source.get("as_of"):
                raise ValueError("each market source requires name and as_of")
            if parse_timestamp(source["as_of"]) > scanned_time:
                raise ValueError("market source as_of cannot be later than scanned_at")
        scored = score_market_gate(factors, scan.get("manual_downgrade_to"))
        supplied_gate = scan.get("market_gate")
        supplied_score = scan.get("market_gate_score")
        if supplied_gate not in (None, scored["label"]):
            raise ValueError("market_gate does not match recomputed five-factor gate")
        if supplied_score not in (None, scored["score"]):
            raise ValueError("market_gate_score does not match recomputed factor total")
        summary = str(scan.get("summary") or "").strip()
        if not summary:
            raise ValueError("market scan requires a concise summary")
        row = self.db.execute(
            """INSERT OR IGNORE INTO market_scans
               (scanned_at,data_as_of,scan_scope,session,market_gate,market_gate_score,factors_json,sectors_json,sources_json,summary,created_at)
               VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
            (
                scanned_at, data_as_of, scope, str(scan.get("session") or "unknown"), scored["label"], scored["score"],
                json.dumps(scored, ensure_ascii=False), json.dumps(sectors, ensure_ascii=False),
                json.dumps(sources, ensure_ascii=False), summary, utc_now(),
            ),
        )
        self.db.commit()
        if row.lastrowid:
            return int(row.lastrowid)
        existing = self.db.execute(
            "SELECT id FROM market_scans WHERE scanned_at=? AND scan_scope=?", (scanned_at, scope)
        ).fetchone()
        return int(existing["id"])

    def latest_market_scan(self) -> dict[str, Any] | None:
        row = self.db.execute("SELECT * FROM market_scans ORDER BY scanned_at DESC,id DESC LIMIT 1").fetchone()
        if not row:
            return None
        item = dict(row)
        item["factors"] = json.loads(item.pop("factors_json"))
        item["sectors"] = json.loads(item.pop("sectors_json"))
        item["sources"] = json.loads(item.pop("sources_json"))
        return item

    def _active_risk_event(self) -> sqlite3.Row | None:
        return self.db.execute(
            "SELECT * FROM risk_events WHERE resolved_at IS NULL ORDER BY effective_after DESC,id DESC LIMIT 1"
        ).fetchone()

    def _latest_risk_event(self, event_type: str) -> sqlite3.Row | None:
        return self.db.execute(
            "SELECT * FROM risk_events WHERE event_type=? ORDER BY effective_after DESC,id DESC LIMIT 1", (event_type,)
        ).fetchone()

    def _start_probation(self, event_id: int) -> sqlite3.Row:
        start_outcome_id = self.db.execute("SELECT COALESCE(MAX(id),0) FROM outcomes").fetchone()[0]
        self.db.execute(
            "UPDATE risk_events SET probation_started_at=COALESCE(probation_started_at,?), probation_start_outcome_id=COALESCE(probation_start_outcome_id,?) WHERE id=?",
            (utc_now(), int(start_outcome_id), event_id),
        )
        self.db.commit()
        return self.db.execute("SELECT * FROM risk_events WHERE id=?", (event_id,)).fetchone()

    def _resolve_risk_event(self, event_id: int) -> None:
        self.db.execute("UPDATE risk_events SET resolved_at=? WHERE id=? AND resolved_at IS NULL", (utc_now(), event_id))
        self.db.commit()

    def latest_decision(self, code: str | None = None, approved_only: bool = True) -> dict[str, Any] | None:
        sql = "SELECT * FROM decisions WHERE active=1"
        params: list[Any] = []
        if approved_only:
            sql += " AND approved=1"
        if code is not None:
            sql += " AND code=?"
            params.append(normalize_code(code))
        else:
            sql += " AND code IS NULL"
        sql += " ORDER BY decided_at DESC,id DESC LIMIT 1"
        row = self.db.execute(sql, params).fetchone()
        return dict(row) if row else None

    @staticmethod
    def _validate_buyback(buyback: dict[str, Any] | None) -> None:
        if not isinstance(buyback, dict):
            raise ValueError("thesis-intact reduction requires a structured buyback plan")
        if int(as_float(buyback.get("cooldown_trading_days"))) < 1:
            raise ValueError("buyback plan requires at least one full trading day of cooling")
        for field in ("trigger", "no_buy", "quantity"):
            if buyback.get(field) in (None, "", 0):
                raise ValueError(f"buyback plan requires {field}")
        if not buyback.get("structure_condition") and not buyback.get("price_condition"):
            raise ValueError("buyback plan requires a structure_condition or price_condition")

    def _validate_price_triggers(self, decision: dict[str, Any], state: dict[str, Any], code: str | None) -> None:
        triggers = decision.get("triggers") or {}
        prices = triggers.get("price_triggers") if isinstance(triggers, dict) else None
        if prices is None:
            return
        if not isinstance(prices, list) or not prices:
            raise ValueError("price_triggers must be a non-empty list")
        positions = {item["code"]: item for item in state.get("account", {}).get("positions", [])}
        available = int(as_float((positions.get(code) or {}).get("available_quantity"))) if code else 0
        data_day = date.fromisoformat(str(decision["data_as_of"])[:10])
        buyback = decision.get("buyback")
        for item in prices:
            if not isinstance(item, dict):
                raise ValueError("each price trigger must be an object")
            if item.get("operator") not in ALLOWED_TRIGGER_OPERATORS:
                raise ValueError("price trigger operator must be <= or >=")
            if as_float(item.get("price")) <= 0:
                raise ValueError("price trigger requires a positive price")
            level = item.get("level")
            if level not in ALLOWED_TRIGGER_LEVELS:
                raise ValueError("price trigger level must be buy, sell, or watch")
            if item.get("confirmation") not in ALLOWED_TRIGGER_CONFIRMATIONS:
                raise ValueError("price trigger requires a valid confirmation mode")
            try:
                expiry = date.fromisoformat(str(item.get("valid_until") or ""))
            except ValueError as exc:
                raise ValueError("price trigger requires ISO valid_until") from exc
            if expiry < data_day:
                raise ValueError("price trigger valid_until cannot predate data_as_of")
            quantity = int(as_float(item.get("quantity")))
            if quantity <= 0 or quantity % 100 != 0:
                raise ValueError("price trigger quantity must be a positive A-share lot")
            if level == "buy" and decision.get("action") not in {"买入", "试仓"}:
                raise ValueError("buy trigger requires a 买入 or 试仓 decision")
            if level == "sell":
                if not code or available <= 0 or quantity > available:
                    raise ValueError("sell trigger quantity exceeds confirmed available holdings")
                thesis_effect = item.get("thesis_effect")
                if thesis_effect not in {"intact", "broken"}:
                    raise ValueError("sell trigger requires thesis_effect intact or broken")
                if thesis_effect == "intact":
                    self._validate_buyback(buyback)
                elif buyback and buyback.get("price_zone"):
                    raise ValueError("thesis-broken sell trigger cannot include a mechanical buyback zone")

    def _validate_entry(self, decision: dict[str, Any], state: dict[str, Any], code: str) -> None:
        actual_mode = state.get("risk", {}).get("mode")
        if decision.get("risk_state") != actual_mode:
            raise ValueError(f"decision risk_state {decision.get('risk_state')} does not match engine mode {actual_mode}")
        if actual_mode not in {"normal", "probation"}:
            raise ValueError("actionable entry is blocked outside normal/probation risk modes")
        if state.get("data_freshness", {}).get("status") != "current":
            raise ValueError("actionable entry requires current account state")
        vetoes = state.get("risk", {}).get("new_buy_vetoes") or []
        if vetoes:
            raise ValueError("actionable entry blocked by account vetoes: " + ",".join(vetoes))
        confirmations = decision.get("confirmations") or (decision.get("triggers") or {}).get("confirmations") or {}
        if not all(confirmations.get(key) is True for key in ("market", "sector", "stock")):
            raise ValueError("actionable entry requires explicit market/sector/stock confirmations")
        if not decision.get("sector"):
            raise ValueError("actionable entry requires sector")
        total_assets = as_float(state.get("account", {}).get("total_assets"))
        cash = as_float(state.get("account", {}).get("cash"))
        if total_assets <= 0:
            raise ValueError("actionable entry requires confirmed positive account assets")
        entry = as_float(decision.get("entry_high") or decision.get("entry_low"))
        stop = as_float(decision.get("stop_price"))
        target = as_float(decision.get("first_target"))
        atr14 = as_float(decision.get("atr14"))
        cost_rate = as_float(decision.get("cost_rate"), DEFAULT_COST_RATE)
        quantity = int(as_float(decision.get("quantity")))
        if entry <= 0 or stop <= 0 or stop >= entry or target <= entry or atr14 <= 0:
            raise ValueError("entry requires positive price/ATR, stop below entry, and first target above entry")
        if decision.get("stop_basis") not in ALLOWED_STOP_BASES:
            raise ValueError("actionable entry requires a valid stop_basis")
        if quantity <= 0 or quantity % 100 != 0:
            raise ValueError("entry quantity must be a positive A-share lot")
        effective = effective_risk_distance(entry, stop, atr14, cost_rate)
        proposed_value = entry * quantity
        exposure_pct = proposed_value / total_assets * 100
        account_risk_pct = effective * quantity / total_assets * 100
        reward_risk = (target - entry) / effective if effective else 0.0
        expectancy = as_float(decision.get("expectancy_r"), as_float((decision.get("empirical_stats") or {}).get("expectancy_r")))
        if reward_risk < 2:
            raise ValueError("actionable entry requires recomputed reward-to-risk >= 2")
        if expectancy <= 0:
            raise ValueError("actionable entry requires positive cost-adjusted expectancy")
        for field, computed in (("effective_risk_per_share", effective), ("exposure_pct", exposure_pct), ("account_risk_pct", account_risk_pct), ("reward_risk", reward_risk)):
            supplied = decision.get(field)
            if supplied not in (None, "") and abs(as_float(supplied) - computed) > max(0.02, abs(computed) * 0.02):
                raise ValueError(f"supplied {field} does not match recomputed value")
            decision[field] = computed
        decision["atr14"] = atr14
        decision["cost_rate"] = cost_rate
        decision["expectancy_r"] = expectancy
        if proposed_value > cash:
            raise ValueError("entry exceeds confirmed cash")
        limits = dict(state["risk"]["limits"])
        if decision.get("action") == "试仓":
            limits["risk_per_trade_pct"] = min(limits["risk_per_trade_pct"], PROBATION_LIMITS["risk_per_trade_pct"])
            limits["initial_position_pct"] = min(limits["initial_position_pct"], PROBATION_LIMITS["initial_position_pct"])
        positions = {item["code"]: item for item in state.get("account", {}).get("positions", [])}
        current_stock_value = as_float((positions.get(code) or {}).get("market_value"))
        current_sector_value_pct = as_float(state["risk"].get("sector_market_value_pct", {}).get(decision["sector"]))
        current_sector_risk_pct = as_float(state["risk"].get("sector_stop_risk_pct", {}).get(decision["sector"]))
        projected = {
            "initial_position_pct": exposure_pct,
            "stock_position_pct": (current_stock_value + proposed_value) / total_assets * 100,
            "sector_market_value_pct": current_sector_value_pct + exposure_pct,
            "portfolio_stop_risk_pct": as_float(state["risk"].get("portfolio_stop_risk_pct")) + account_risk_pct,
            "sector_stop_risk_pct": current_sector_risk_pct + account_risk_pct,
            "total_exposure_pct": as_float(state["account"].get("exposure_pct")) + exposure_pct,
            "risk_per_trade_pct": account_risk_pct,
        }
        exceeded = [key for key, value in projected.items() if value > as_float(limits.get(key), float("inf")) + 1e-9]
        if exceeded:
            raise ValueError("entry exceeds projected limits: " + ",".join(exceeded))
        open_codes = {item["code"] for item in positions.values() if int(as_float(item.get("quantity"))) > 0}
        if code not in open_codes and len(open_codes) >= int(limits.get("max_positions", 4)):
            raise ValueError("entry exceeds maximum position count")
        decision_day = shanghai_date(decision.get("decided_at") or utc_now())
        entry_rows = self.db.execute(
            "SELECT code,decided_at FROM decisions WHERE approved=1 AND action IN ('买入','试仓') AND code<>?",
            (code,),
        ).fetchall()
        other_entries = {row["code"] for row in entry_rows if shanghai_date(row["decided_at"]) == decision_day}
        if len(other_entries) >= int(limits.get("max_new_positions_per_day", 1)):
            raise ValueError("only one actionable new stock is allowed per day")
        if actual_mode == "probation":
            active_event = self._active_risk_event()
            started = active_event["probation_started_at"] if active_event else None
            if started:
                rows = [row for row in self.db.execute(
                    "SELECT code,exposure_pct,decided_at FROM decisions WHERE approved=1 AND action IN ('买入','试仓')"
                ).fetchall() if parse_timestamp(row["decided_at"]) >= parse_timestamp(started)]
                existing_codes = {row["code"] for row in rows}
                if existing_codes and code not in existing_codes:
                    raise ValueError("probation permits at most one new position")
                if sum(as_float(row["exposure_pct"]) for row in rows) + exposure_pct > PROBATION_LIMITS["cumulative_new_exposure_pct"]:
                    raise ValueError("probation cumulative new exposure exceeds 5%")

    def add_decision(self, decision: dict[str, Any]) -> str:
        code = normalize_code(decision.get("code")) or None
        approved = bool(decision.get("approved"))
        previous = self.latest_decision(code, approved_only=True)
        decided_at = decision.get("decided_at", utc_now())
        decision["decided_at"] = decided_at
        change = validate_decision_change(previous, decision) if approved else DecisionChange(False, True, tuple())
        if approved and change.changed and not change.allowed:
            raise ValueError("decision action/levels changed without a permitted material-change reason")
        empirical = decision.get("empirical_stats") or {}
        action = decision["action"]
        state = self.compute_state()
        if approved and state.get("account", {}).get("total_assets") and decision.get("risk_state") != state.get("risk", {}).get("mode"):
            raise ValueError("approved decision risk_state must match the current engine mode")
        if approved and previous and parse_timestamp(decided_at) < parse_timestamp(previous["decided_at"]):
            raise ValueError("approved decision cannot replace a newer active decision")
        if approved and state.get("data_as_of") and shanghai_date(decision["data_as_of"]) < shanghai_date(state["data_as_of"]):
            raise ValueError("approved decision data_as_of is older than the latest confirmed account state")
        if approved:
            self._validate_price_triggers(decision, state, code)
        if approved and action in {"买入", "试仓"}:
            if not code:
                raise ValueError("actionable entry requires a stock code")
            self._validate_entry(decision, state, code)
        if approved and action == "买入":
            required_stats = ("sample_size", "sample_period", "out_of_sample_hit_rate", "wilson_95", "profit_factor", "expectancy_r")
            if not empirical.get("calibrated", False) or int(empirical.get("sample_size", 0)) < 30 or any(empirical.get(key) is None for key in required_stats):
                raise ValueError("买入 requires complete out-of-sample calibration; use 试仓 when uncalibrated")
        buyback = decision.get("buyback")
        if approved and action in {"减仓", "止盈"} and decision.get("thesis_status") != "broken":
            self._validate_buyback(buyback)
        if approved and action == "止损" and decision.get("thesis_status") == "broken" and buyback and buyback.get("price_zone"):
            raise ValueError("thesis-broken stop must not include a mechanical buyback price")
        decision_id = decision.get("decision_id") or f"D-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"
        fields = [
            "decision_id", "decided_at", "data_as_of", "skill_version", "market_gate", "market_gate_score", "risk_state",
            "code", "name", "action", "sector", "entry_low", "entry_high", "stop_price", "stop_basis", "first_target",
            "second_target", "quantity", "exposure_pct", "account_risk_pct", "effective_risk_per_share", "reward_risk",
            "atr14", "cost_rate", "expectancy_r", "confirmations_json", "triggers_json", "targets_json",
            "subjective_range_json", "empirical_stats_json", "rationale", "thesis_status", "buyback_json",
            "prior_decision_id", "material_change_json", "approved", "active", "created_at",
        ]
        values = [
            decision_id, decided_at, decision["data_as_of"], SKILL_VERSION, decision["market_gate"], decision.get("market_gate_score"),
            decision["risk_state"], code, decision.get("name"), action, decision.get("sector"), decision.get("entry_low"),
            decision.get("entry_high"), decision.get("stop_price"), decision.get("stop_basis"), decision.get("first_target"),
            decision.get("second_target"), decision.get("quantity"), decision.get("exposure_pct"), decision.get("account_risk_pct"),
            decision.get("effective_risk_per_share"), decision.get("reward_risk"), decision.get("atr14"),
            decision.get("cost_rate"), decision.get("expectancy_r"), json.dumps(decision.get("confirmations", {}), ensure_ascii=False),
            json.dumps(decision.get("triggers", {}), ensure_ascii=False), json.dumps(decision.get("targets", {}), ensure_ascii=False),
            json.dumps(decision.get("subjective_range"), ensure_ascii=False) if decision.get("subjective_range") else None,
            json.dumps(empirical, ensure_ascii=False) if empirical else None, decision["rationale"], decision.get("thesis_status"),
            json.dumps(buyback, ensure_ascii=False) if buyback else None, previous.get("decision_id") if previous else None,
            json.dumps(list(change.reasons), ensure_ascii=False), int(approved), int(approved), utc_now(),
        ]
        with self.db:
            if approved:
                if code:
                    self.db.execute("UPDATE decisions SET active=0 WHERE active=1 AND approved=1 AND code=?", (code,))
                else:
                    self.db.execute("UPDATE decisions SET active=0 WHERE active=1 AND approved=1 AND code IS NULL")
            self.db.execute(f"INSERT INTO decisions ({','.join(fields)}) VALUES ({','.join('?' for _ in fields)})", values)
        return decision_id

    def add_outcome(self, outcome: dict[str, Any]) -> None:
        horizon_days = int(outcome.get("horizon_days", 0))
        closed_trade = bool(outcome.get("closed_trade"))
        if closed_trade and horizon_days != 0:
            raise ValueError("a closed trade outcome must use horizon_days=0")
        if closed_trade and outcome.get("r_multiple") is None:
            raise ValueError("a closed trade outcome requires r_multiple")
        if closed_trade and outcome.get("rule_compliant") is None:
            raise ValueError("a closed trade outcome requires rule_compliant")
        self.db.execute(
            """INSERT INTO outcomes
               (decision_id,horizon_days,return_pct,benchmark_return_pct,mfe_pct,mae_pct,r_multiple,rule_compliant,closed_trade,measured_at)
               VALUES (?,?,?,?,?,?,?,?,?,?)
               ON CONFLICT(decision_id,horizon_days) DO UPDATE SET
                 return_pct=excluded.return_pct,
                 benchmark_return_pct=excluded.benchmark_return_pct,
                 mfe_pct=excluded.mfe_pct,
                 mae_pct=excluded.mae_pct,
                 r_multiple=excluded.r_multiple,
                 rule_compliant=excluded.rule_compliant,
                 closed_trade=excluded.closed_trade,
                 measured_at=excluded.measured_at""",
            (
                outcome["decision_id"], horizon_days, outcome.get("return_pct"),
                outcome.get("benchmark_return_pct"), outcome.get("mfe_pct"), outcome.get("mae_pct"), outcome.get("r_multiple"),
                None if outcome.get("rule_compliant") is None else int(bool(outcome.get("rule_compliant"))),
                int(closed_trade), outcome.get("measured_at", utc_now()),
            ),
        )
        self.db.commit()

    def _close_nav_rows(self) -> list[dict[str, Any]]:
        raw_rows = self.db.execute(
            "SELECT * FROM equity_snapshots WHERE session_type='close' ORDER BY as_of,id"
        ).fetchall()
        # Reconfirmed screenshots at the same close are one trading session;
        # keep the latest evidence row without manufacturing extra NAV history.
        unique_by_close: dict[str, sqlite3.Row] = {}
        for row in raw_rows:
            unique_by_close[row["as_of"]] = row
        rows = [unique_by_close[key] for key in sorted(unique_by_close)]
        result: list[dict[str, Any]] = []
        nav = None
        prior_assets = None
        for raw in rows:
            row = dict(raw)
            assets = as_float(row["total_assets"])
            flow = as_float(row["net_cash_flow"])
            if nav is None or not prior_assets:
                nav = assets
            else:
                nav *= (assets - flow) / prior_assets
            prior_assets = assets
            row["adjusted_nav"] = nav
            result.append(row)
        return result

    def _probation_metrics(self, after_outcome_id: int = 0) -> dict[str, Any]:
        rows = self.db.execute(
            """SELECT o.r_multiple,o.rule_compliant FROM outcomes o
               JOIN decisions d ON d.decision_id=o.decision_id
               WHERE o.closed_trade=1 AND o.horizon_days=0 AND d.risk_state='probation' AND o.id>?
               ORDER BY o.id""",
            (after_outcome_id,),
        ).fetchall()
        completed_blocks = len(rows) // 5
        block = rows[(completed_blocks - 1) * 5:completed_blocks * 5] if completed_blocks else rows
        rs = [as_float(row["r_multiple"]) for row in block]
        profit = sum(value for value in rs if value > 0)
        loss = abs(sum(value for value in rs if value < 0))
        violations = sum(1 for row in block if row["rule_compliant"] != 1)
        factor = profit / loss if loss else (None if not profit else float("inf"))
        return {
            "closed_count": len(rows),
            "completed_blocks": completed_blocks,
            "block_count": len(block),
            "net_r": sum(rs),
            "profit_factor": factor,
            "violations": violations,
            "passed": completed_blocks > 0 and violations == 0 and sum(rs) > 0 and factor is not None and factor > 1.2,
        }

    def _consecutive_closed_losses(self) -> int:
        rows = self.db.execute(
            """SELECT o.r_multiple FROM outcomes o
               WHERE o.closed_trade=1 AND o.horizon_days=0
               ORDER BY o.measured_at DESC,o.id DESC"""
        ).fetchall()
        count = 0
        for row in rows:
            if as_float(row["r_multiple"]) < 0:
                count += 1
            else:
                break
        return count

    def _latest_closed_outcome(self) -> sqlite3.Row | None:
        return self.db.execute(
            "SELECT id,measured_at FROM outcomes WHERE closed_trade=1 AND horizon_days=0 ORDER BY measured_at DESC,id DESC LIMIT 1"
        ).fetchone()

    def compute_state(self) -> dict[str, Any]:
        close_rows = self._close_nav_rows()
        latest_any = self.db.execute("SELECT * FROM equity_snapshots ORDER BY as_of DESC,id DESC LIMIT 1").fetchone()
        latest_close = close_rows[-1] if close_rows else None
        window = close_rows[-20:]
        current_nav = as_float(latest_close.get("adjusted_nav")) if latest_close else 0.0
        high_water = max((as_float(row["adjusted_nav"]) for row in window), default=current_nav)
        drawdown = (current_nav / high_water - 1) * 100 if high_water and len(window) >= 2 else None
        active_event = self._active_risk_event()
        sessions_after = 0
        cooldown_required = 0
        event_type = None
        consecutive_losses = self._consecutive_closed_losses()
        latest_outcome = self._latest_closed_outcome()
        if not active_event and drawdown is not None and drawdown <= -4 and latest_close:
            previous_drawdown = self._latest_risk_event("drawdown_reset")
            prior_details = json.loads(previous_drawdown["details_json"]) if previous_drawdown else {}
            trigger_nav = as_float(prior_details.get("trigger_nav"), float("inf"))
            if not previous_drawdown or current_nav < trigger_nav - 1e-6:
                self.add_risk_event("drawdown_reset", latest_close["as_of"], 5, {"drawdown_pct": drawdown, "trigger_nav": current_nav})
                active_event = self._active_risk_event()
        if not active_event and consecutive_losses >= 2 and latest_outcome:
            previous_losses = self._latest_risk_event("consecutive_loss_cooldown")
            prior_details = json.loads(previous_losses["details_json"]) if previous_losses else {}
            if not previous_losses or int(latest_outcome["id"]) > int(prior_details.get("trigger_outcome_id", 0)):
                effective_after = latest_close["as_of"] if latest_close else latest_outcome["measured_at"]
                self.add_risk_event("consecutive_loss_cooldown", effective_after, 3, {"trigger_outcome_id": int(latest_outcome["id"])})
                active_event = self._active_risk_event()

        probation = self._probation_metrics(10**18)
        if active_event:
            event_type = active_event["event_type"]
            cooldown_required = int(active_event["required_sessions"])
            sessions_after = sum(1 for row in close_rows if row["as_of"] > active_event["effective_after"])
            if sessions_after < cooldown_required:
                mode = "reset"
            else:
                if not active_event["probation_started_at"]:
                    active_event = self._start_probation(int(active_event["id"]))
                probation = self._probation_metrics(int(active_event["probation_start_outcome_id"] or 0))
                if probation["passed"]:
                    self._resolve_risk_event(int(active_event["id"]))
                    active_event = None
                    event_type = None
                    mode = "normal"
                else:
                    mode = "probation"
        else:
            mode = "normal"
        limits = PROBATION_LIMITS if mode == "probation" else NORMAL_LIMITS

        latest_snapshot_id = int(latest_any["id"]) if latest_any else 0
        positions = [dict(row) for row in self.db.execute(
            "SELECT * FROM positions WHERE snapshot_id=? ORDER BY market_value DESC", (latest_snapshot_id,)
        ).fetchall()] if latest_snapshot_id else []
        active_stops = {
            row["code"]: dict(row) for row in self.db.execute(
                "SELECT code,stop_price,stop_basis,decision_id FROM decisions WHERE active=1 AND approved=1 AND code IS NOT NULL"
            ).fetchall()
        }
        total_assets = as_float(latest_any["total_assets"]) if latest_any else 0.0
        market_value = as_float(latest_any["market_value"]) if latest_any else 0.0
        sector_value: dict[str, float] = {}
        sector_risk: dict[str, float] = {}
        open_risk = 0.0
        unknown_risk_codes: list[str] = []
        stop_mismatch_codes: list[str] = []
        rendered_positions: list[dict[str, Any]] = []
        for item in positions:
            sector = item.get("sector") or "未分类"
            value = as_float(item.get("market_value"), as_float(item.get("current_price")) * as_float(item.get("quantity")))
            sector_value[sector] = sector_value.get(sector, 0.0) + value
            decision_stop = active_stops.get(item["code"], {})
            snapshot_stop = as_float(item.get("planned_stop"))
            approved_stop = as_float(decision_stop.get("stop_price"))
            stop = approved_stop or snapshot_stop
            stop_basis = decision_stop.get("stop_basis") or item.get("stop_basis")
            if approved_stop and snapshot_stop and abs(approved_stop - snapshot_stop) > 1e-9:
                stop_mismatch_codes.append(item["code"])
            price = as_float(item.get("current_price"))
            atr = as_float(item.get("atr14"))
            if stop > 0 and price > 0:
                per_share = effective_risk_distance(price, stop, atr)
                risk_value = per_share * as_float(item.get("quantity"))
                open_risk += risk_value
                sector_risk[sector] = sector_risk.get(sector, 0.0) + risk_value
                risk_quantified = atr > 0 and stop_basis in ALLOWED_STOP_BASES
                if not risk_quantified:
                    unknown_risk_codes.append(item["code"])
            else:
                risk_value = None
                risk_quantified = False
                unknown_risk_codes.append(item["code"])
            rendered_positions.append({
                "code": item["code"], "name": item["name"], "sector": sector,
                "quantity": item["quantity"], "available_quantity": item["available_quantity"],
                "cost_price": item["cost_price"], "current_price": item["current_price"],
                "market_value": value, "pnl": item["pnl"], "planned_stop": stop,
                "snapshot_planned_stop": snapshot_stop or None, "decision_stop": approved_stop or None,
                "stop_source": "approved_decision" if approved_stop else "position_snapshot",
                "stop_basis": stop_basis, "atr14": atr or None, "risk_quantified": risk_quantified,
                "legacy_position": bool(item["legacy_position"]),
                "account_weight_pct": value / total_assets * 100 if total_assets else None,
                "risk_at_stop": risk_value, "risk_at_stop_is_lower_bound": bool(risk_value is not None and not risk_quantified),
            })
        exposure = market_value / total_assets * 100 if total_assets else 0.0
        portfolio_risk_pct = open_risk / total_assets * 100 if total_assets else 0.0
        sector_value_pct = {key: value / total_assets * 100 for key, value in sector_value.items()} if total_assets else {}
        sector_risk_pct = {key: value / total_assets * 100 for key, value in sector_risk.items()} if total_assets else {}
        new_buy_vetoes = self._new_buy_vetoes(
            mode, exposure, portfolio_risk_pct, sector_value_pct, sector_risk_pct,
            unknown_risk_codes, limits,
        )
        current_time = self.current_time_provider()
        if current_time.tzinfo is None:
            current_time = current_time.replace(tzinfo=SHANGHAI_TZ)
        completed_sessions = completed_trading_sessions_since(latest_any["as_of"], current_time, self.calendar_path) if latest_any else None
        calendar_known = calendar_covers(current_time.astimezone(SHANGHAI_TZ).date(), self.calendar_path)
        state = {
            "schema_version": 1,
            "skill_version": SKILL_VERSION,
            "generated_at": utc_now(),
            "data_as_of": latest_any["as_of"] if latest_any else None,
            "data_freshness": {
                "status": ("current" if calendar_known and completed_sessions == 0 else "stale") if latest_any else "missing",
                "completed_sessions_since": completed_sessions,
                "calendar_covered": calendar_known,
                "latest_is_close": bool(latest_any and latest_any["session_type"] == "close"),
                "source": latest_any["source"] if latest_any else None,
                "evidence_ref": latest_any["evidence_ref"] if latest_any else None,
            },
            "account": {
                "total_assets": total_assets,
                "cash": as_float(latest_any["cash"]) if latest_any else 0.0,
                "market_value": market_value,
                "exposure_pct": exposure,
                "positions": rendered_positions,
            },
            "drawdown": {
                "adjusted_nav": current_nav,
                "high_water_20": high_water,
                "drawdown_20_pct": drawdown,
                "observed_close_sessions": len(window),
                "status": "calculated" if drawdown is not None else "insufficient_history",
                "close_confirmed": bool(latest_close),
            },
            "risk": {
                "mode": mode,
                "new_buys_allowed": mode in {"normal", "probation"} and not new_buy_vetoes,
                "active_event": event_type,
                "active_event_details": json.loads(active_event["details_json"]) if active_event else None,
                "consecutive_closed_losses": consecutive_losses,
                "cooldown_sessions_required": cooldown_required,
                "cooldown_sessions_completed": sessions_after,
                "cooldown_sessions_remaining": max(0, cooldown_required - sessions_after),
                "limits": limits,
                "portfolio_stop_risk_pct": portfolio_risk_pct,
                "portfolio_stop_risk_is_lower_bound": bool(unknown_risk_codes),
                "sector_market_value_pct": sector_value_pct,
                "sector_stop_risk_pct": sector_risk_pct,
                "unknown_stop_risk_codes": unknown_risk_codes,
                "stop_mismatch_codes": stop_mismatch_codes,
                "legacy_over_limit_codes": [p["code"] for p in rendered_positions if (p["account_weight_pct"] or 0) > limits["stock_position_pct"]],
                "new_buy_vetoes": new_buy_vetoes,
            },
            "probation": probation,
        }
        return state

    @staticmethod
    def _new_buy_vetoes(mode: str, exposure: float, portfolio_risk: float, sector_values: dict[str, float], sector_risks: dict[str, float], unknown: list[str], limits: dict[str, Any]) -> list[str]:
        vetoes: list[str] = []
        if mode == "reset":
            vetoes.append("drawdown_or_loss_cooldown_active")
        if exposure >= limits["total_exposure_pct"]:
            vetoes.append("total_exposure_limit")
        if portfolio_risk >= limits["portfolio_stop_risk_pct"]:
            vetoes.append("portfolio_stop_risk_limit")
        if any(value >= limits["sector_market_value_pct"] for value in sector_values.values()):
            vetoes.append("sector_market_value_limit")
        if any(value >= limits["sector_stop_risk_pct"] for value in sector_risks.values()):
            vetoes.append("sector_stop_risk_limit")
        if unknown:
            vetoes.append("unquantified_existing_stop_risk")
        return vetoes

    def latest_approved_decisions(self) -> dict[str, Any]:
        rows = self.db.execute(
            "SELECT * FROM decisions WHERE active=1 AND approved=1 ORDER BY decided_at DESC,id DESC"
        ).fetchall()
        decisions: list[dict[str, Any]] = []
        for row in rows:
            item = dict(row)
            for field in ("confirmations_json", "triggers_json", "targets_json", "subjective_range_json", "empirical_stats_json", "buyback_json", "material_change_json"):
                value = item.pop(field, None)
                item[field.removesuffix("_json")] = json.loads(value) if value else None
            item["approved"] = bool(item["approved"])
            item["active"] = bool(item["active"])
            decisions.append(item)
        latest = decisions[0] if decisions else None
        account_decision = next((item for item in decisions if not item.get("code")), None)
        authority = account_decision or latest
        return {
            "schema_version": 1,
            "skill_version": SKILL_VERSION,
            "generated_at": utc_now(),
            "latest_decision_id": authority.get("decision_id") if authority else None,
            "data_as_of": authority.get("data_as_of") if authority else None,
            "market_gate": authority.get("market_gate") if authority else "未评估",
            "risk_state": authority.get("risk_state") if authority else "unknown",
            "summary": authority.get("rationale") if authority else "暂无已批准决策。",
            "decisions": decisions,
        }


def bootstrap_0710(ledger: TradingLedger) -> None:
    snapshot_id = ledger.add_equity_snapshot({
        "as_of": "2026-07-10T15:00:00+08:00",
        "session_type": "close",
        "total_assets": 494568.52,
        "cash": 350008.52,
        "market_value": 144560.00,
        "net_cash_flow": 0,
        "source": "broker_screenshot_confirmed",
        "evidence_ref": "iPhone镜像 Appshot 2026-07-10T13-24-32.692Z.png",
    })
    ledger.add_positions(snapshot_id, [
        {"code": "300124", "name": "汇川技术", "sector": "机器人/工业自动化", "quantity": 300, "available_quantity": 300, "cost_price": 79.499, "current_price": 63.43, "market_value": 19029, "pnl": -4820.61, "legacy_position": True},
        {"code": "300458", "name": "全志科技", "sector": "半导体/端侧芯片", "quantity": 700, "available_quantity": 0, "cost_price": 41.762, "current_price": 40.03, "market_value": 28021, "pnl": -1212.63, "legacy_position": True},
        {"code": "600276", "name": "恒瑞医药", "sector": "创新药", "quantity": 1000, "available_quantity": 1000, "cost_price": 52.386, "current_price": 55.75, "market_value": 55750, "pnl": 3364.53, "legacy_position": True},
        {"code": "603893", "name": "瑞芯微", "sector": "半导体/端侧芯片", "quantity": 200, "available_quantity": 0, "cost_price": 210.062, "current_price": 208.80, "market_value": 41760, "pnl": -252.41, "legacy_position": True},
    ])
    ledger.add_execution({"executed_at": "2026-07-10T10:03:57+08:00", "code": "300458", "name": "全志科技", "side": "BUY", "price": 41.75, "quantity": 700, "amount": 29225, "position_before": 0, "position_after": 700, "available_after": 0, "source": "broker_transaction_screenshot"})
    ledger.add_execution({"executed_at": "2026-07-10T14:42:55+08:00", "code": "603893", "name": "瑞芯微", "side": "BUY", "price": 210, "quantity": 200, "amount": 42000, "position_before": 0, "position_after": 200, "available_after": 0, "source": "broker_transaction_screenshot"})
    ledger.add_risk_event("verified_drawdown_reset", "2026-07-10T15:00:00+08:00", 5, {
        "review_period": "2026-06-19/2026-07-09",
        "loss_amount": -26837.03,
        "return_pct": -5.23,
        "cash_flows_confirmed_zero": True,
    })
    if not ledger.db.execute("SELECT 1 FROM decisions WHERE decision_id='D-0710-RESET'").fetchone():
        for index, item in enumerate([
            ("300124", "汇川技术", "机器人/工业自动化"),
            ("300458", "全志科技", "半导体/端侧芯片"),
            ("600276", "恒瑞医药", "创新药"),
            ("603893", "瑞芯微", "半导体/端侧芯片"),
        ]):
            ledger.add_decision({
                "decision_id": f"D-0710-HOLD-{item[0]}",
                "decided_at": f"2026-07-11T08:0{index}:00+08:00",
                "data_as_of": "2026-07-10T15:00:00+08:00",
                "market_gate": "周末待更新",
                "risk_state": "reset",
                "code": item[0], "name": item[1], "sector": item[2], "action": "观察",
                "rationale": "遗留持仓只做管理；关键止损、ATR和下周市场数据尚未完成确认，不新增、不摊低成本。",
                "thesis_status": "under_review", "approved": True,
                "triggers": {"next_review": "下一个交易日使用最新收盘结构、ATR14、板块广度和可用数量复核"},
            })
        ledger.add_decision({
            "decision_id": "D-0710-RESET",
            "decided_at": "2026-07-11T08:10:00+08:00",
            "data_as_of": "2026-07-10T15:00:00+08:00",
            "market_gate": "周末待更新", "risk_state": "reset", "action": "空仓等待",
            "rationale": "回撤重置期有效：至少完成5个完整交易日冷却前不允许任何新买，只管理现有遗留持仓。",
            "approved": True, "material_change_reasons": ["account_risk"],
            "triggers": {"new_buy_veto": "verified_drawdown_reset", "cooldown_sessions": 5},
        })


def build_analysis_context(state: dict[str, Any], decision_view: dict[str, Any], market_scan: dict[str, Any] | None) -> dict[str, Any]:
    positions = [{
        key: item.get(key) for key in (
            "code", "name", "sector", "quantity", "available_quantity", "cost_price", "current_price", "pnl",
            "account_weight_pct", "planned_stop", "stop_basis", "atr14", "risk_quantified", "risk_at_stop",
            "risk_at_stop_is_lower_bound",
        )
    } for item in state.get("account", {}).get("positions", [])]
    plans: list[dict[str, Any]] = []
    for item in decision_view.get("decisions", []):
        if not item.get("code"):
            continue
        triggers = (item.get("triggers") or {}).get("price_triggers") or []
        plans.append({
            "decision_id": item.get("decision_id"), "code": item.get("code"), "name": item.get("name"),
            "action": item.get("action"), "quantity": item.get("quantity"), "stop_price": item.get("stop_price"),
            "stop_basis": item.get("stop_basis"), "first_target": item.get("first_target"),
            "second_target": item.get("second_target"), "thesis_status": item.get("thesis_status"),
            "price_triggers": [{
                key: trigger.get(key) for key in (
                    "operator", "price", "level", "quantity", "confirmation", "valid_until", "thesis_effect",
                ) if trigger.get(key) is not None
            } for trigger in triggers],
            "buyback_contract": bool(item.get("buyback")),
        })
    compact_scan = None
    if market_scan:
        scored = market_scan.get("factors") or {}
        compact_scan = {
            "scanned_at": market_scan.get("scanned_at"), "data_as_of": market_scan.get("data_as_of"),
            "scan_scope": market_scan.get("scan_scope"), "session": market_scan.get("session"),
            "market_gate": market_scan.get("market_gate"), "market_gate_score": market_scan.get("market_gate_score"),
            "factor_scores": scored.get("factors", scored), "cap_reasons": scored.get("cap_reasons", []),
            "sectors": [{key: sector.get(key) for key in ("name", "lifecycle", "conclusion")} for sector in market_scan.get("sectors", [])],
            "source_times": [{key: source.get(key) for key in ("name", "as_of")} for source in market_scan.get("sources", [])],
            "summary": market_scan.get("summary"),
        }
    risk = state.get("risk", {})
    account = state.get("account", {})
    return {
        "schema_version": 1,
        "skill_version": SKILL_VERSION,
        "generated_at": utc_now(),
        "data_as_of": state.get("data_as_of"),
        "data_freshness": state.get("data_freshness"),
        "account": {
            "total_assets": account.get("total_assets"), "cash": account.get("cash"),
            "market_value": account.get("market_value"), "exposure_pct": account.get("exposure_pct"),
        },
        "risk": {
            "mode": risk.get("mode"), "new_buys_allowed": risk.get("new_buys_allowed"),
            "cooldown_sessions_remaining": risk.get("cooldown_sessions_remaining"),
            "drawdown_20_pct": state.get("drawdown", {}).get("drawdown_20_pct"),
            "portfolio_stop_risk_pct": risk.get("portfolio_stop_risk_pct"),
            "portfolio_stop_risk_is_lower_bound": risk.get("portfolio_stop_risk_is_lower_bound"),
            "sector_market_value_pct": risk.get("sector_market_value_pct"),
            "sector_stop_risk_pct": risk.get("sector_stop_risk_pct"),
            "unknown_stop_risk_codes": risk.get("unknown_stop_risk_codes"),
            "new_buy_vetoes": risk.get("new_buy_vetoes"),
        },
        "positions": positions,
        "authority": {
            "decision_id": decision_view.get("latest_decision_id"), "data_as_of": decision_view.get("data_as_of"),
            "market_gate": decision_view.get("market_gate"), "risk_state": decision_view.get("risk_state"),
            "summary": decision_view.get("summary"),
        },
        "plans": plans,
        "market_scan": compact_scan,
    }


def write_outputs(ledger: TradingLedger, workspace: Path) -> tuple[Path, Path, Path]:
    state_path = workspace / "data" / "trading-state.json"
    decision_path = workspace / "data" / "decision-latest.json"
    context_path = workspace / "data" / "analysis-context.json"
    state = ledger.compute_state()
    decision_view = ledger.latest_approved_decisions()
    generated_at = utc_now()
    state["generated_at"] = generated_at
    decision_view["generated_at"] = generated_at
    context = build_analysis_context(state, decision_view, ledger.latest_market_scan())
    context["generated_at"] = generated_at
    json_dump(state_path, state)
    json_dump(decision_path, decision_view)
    json_dump_compact(context_path, context)
    return state_path, decision_path, context_path


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="操盘策略0710交易台账与风险状态引擎")
    parser.add_argument("--workspace", type=Path, required=True)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("init")
    sub.add_parser("bootstrap-0710")
    sub.add_parser("refresh-state")
    add_equity = sub.add_parser("add-equity")
    add_equity.add_argument("--json", type=Path, required=True)
    add_positions = sub.add_parser("add-positions")
    add_positions.add_argument("--snapshot-id", type=int, required=True)
    add_positions.add_argument("--json", type=Path, required=True)
    add_execution = sub.add_parser("add-execution")
    add_execution.add_argument("--json", type=Path, required=True)
    add_decision = sub.add_parser("add-decision")
    add_decision.add_argument("--json", type=Path, required=True)
    add_outcome = sub.add_parser("add-outcome")
    add_outcome.add_argument("--json", type=Path, required=True)
    add_scan = sub.add_parser("add-scan")
    add_scan.add_argument("--json", type=Path, required=True)
    args = parser.parse_args(argv)
    workspace = args.workspace.expanduser().resolve()
    ledger = TradingLedger(workspace / "data" / "trading-ledger.sqlite")
    try:
        if args.command == "bootstrap-0710":
            bootstrap_0710(ledger)
        elif args.command == "add-equity":
            print(ledger.add_equity_snapshot(json_load(args.json)))
        elif args.command == "add-positions":
            ledger.add_positions(args.snapshot_id, json_load(args.json, []))
        elif args.command == "add-execution":
            ledger.add_execution(json_load(args.json))
        elif args.command == "add-decision":
            print(ledger.add_decision(json_load(args.json)))
        elif args.command == "add-outcome":
            ledger.add_outcome(json_load(args.json))
        elif args.command == "add-scan":
            print(ledger.add_market_scan(json_load(args.json)))
        state_path, decision_path, context_path = write_outputs(ledger, workspace)
        print(json.dumps({"ok": True, "state": str(state_path), "decision": str(decision_path), "context": str(context_path)}, ensure_ascii=False))
        return 0
    finally:
        ledger.close()


if __name__ == "__main__":
    sys.exit(main())
