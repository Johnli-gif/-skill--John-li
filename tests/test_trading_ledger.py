import importlib.util
import json
import stat
import sys
import tempfile
import unittest
from datetime import datetime
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "scripts" / "trading_ledger.py"
SPEC = importlib.util.spec_from_file_location("trading_ledger", MODULE_PATH)
ledger_module = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = ledger_module
SPEC.loader.exec_module(ledger_module)


class LedgerTestCase(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.clock = lambda: datetime(2026, 7, 13, 14, 55, tzinfo=ledger_module.SHANGHAI_TZ)
        self.ledger = ledger_module.TradingLedger(
            self.root / "data" / "trading-ledger.sqlite",
            current_time_provider=self.clock,
        )

    def tearDown(self):
        self.ledger.close()
        self.temp.cleanup()

    def add_close(self, day, assets, flow=0, cash=None, market=None):
        cash = assets if cash is None else cash
        market = assets - cash if market is None else market
        return self.ledger.add_equity_snapshot({
            "as_of": f"{day}T15:00:00+08:00",
            "session_type": "close",
            "total_assets": assets,
            "cash": cash,
            "market_value": market,
            "net_cash_flow": flow,
            "source": "test",
        })

    def valid_trial(self, **overrides):
        item = {
            "data_as_of": "2026-07-10T15:00:00+08:00", "decided_at": "2026-07-11T10:05:00+08:00",
            "market_gate": "谨慎进攻", "risk_state": "normal", "code": "300001", "name": "测试A",
            "sector": "测试赛道", "action": "试仓", "rationale": "三重确认测试", "approved": True,
            "confirmations": {"market": True, "sector": True, "stock": True},
            "entry_high": 50, "stop_price": 45, "stop_basis": "close_confirmation", "first_target": 61,
            "atr14": 2, "cost_rate": 0.003, "quantity": 100, "expectancy_r": 0.1,
            "empirical_stats": {"calibrated": False, "expectancy_r": 0.1},
            "triggers": {"price_triggers": [{
                "operator": ">=", "price": 50, "level": "buy", "quantity": 100,
                "confirmation": "close_confirmation", "valid_until": "2026-07-17",
            }]},
        }
        item.update(overrides)
        return item

    def test_cash_flow_adjusted_high_water_and_close_only_drawdown(self):
        self.add_close("2026-01-02", 100000)
        self.add_close("2026-01-05", 150000, flow=50000)
        self.add_close("2026-01-06", 144000)
        self.ledger.add_equity_snapshot({
            "as_of": "2026-01-07T10:00:00+08:00", "session_type": "intraday",
            "total_assets": 130000, "cash": 130000, "market_value": 0, "net_cash_flow": 0, "source": "test",
        })
        state = self.ledger.compute_state()
        self.assertAlmostEqual(state["drawdown"]["high_water_20"], 100000)
        self.assertAlmostEqual(state["drawdown"]["adjusted_nav"], 96000)
        self.assertAlmostEqual(state["drawdown"]["drawdown_20_pct"], -4.0)
        self.assertEqual(state["risk"]["mode"], "reset")

    def test_reconfirmed_same_close_counts_as_one_session(self):
        self.add_close("2026-07-10", 500000)
        self.ledger.add_equity_snapshot({
            "as_of": "2026-07-10T15:00:00+08:00", "session_type": "close", "total_assets": 500000,
            "cash": 500000, "market_value": 0, "net_cash_flow": 0, "source": "reconfirmed",
        })
        state = self.ledger.compute_state()
        self.assertEqual(state["drawdown"]["observed_close_sessions"], 1)
        self.assertIsNone(state["drawdown"]["drawdown_20_pct"])

    def test_partial_fill_and_t_plus_one_are_audited(self):
        self.ledger.add_execution({
            "executed_at": "2026-07-10T10:00:00+08:00", "code": "300458", "side": "BUY",
            "price": 40, "quantity": 300, "amount": 12000, "position_before": 0, "position_after": 300,
            "available_after": 0, "source": "test",
        })
        self.ledger.add_execution({
            "executed_at": "2026-07-10T10:01:00+08:00", "code": "300458", "side": "BUY",
            "price": 40.1, "quantity": 200, "amount": 8020, "position_before": 300, "position_after": 500,
            "available_after": 0, "source": "test",
        })
        rows = self.ledger.db.execute("SELECT * FROM executions ORDER BY id").fetchall()
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[-1]["position_after"], 500)
        self.assertEqual(rows[-1]["available_after"], 0)

    def test_corporate_action_does_not_create_closed_loss(self):
        self.ledger.add_execution({
            "executed_at": "2026-07-10T00:00:00+08:00", "code": "600406", "side": "CORPORATE_ACTION",
            "price": 0, "quantity": 100, "amount": 0, "source": "test",
        })
        state = self.ledger.compute_state()
        self.assertEqual(state["risk"]["consecutive_closed_losses"], 0)

    def test_atr_and_structure_use_larger_distance_and_lot(self):
        sizing = ledger_module.position_size(500000, 50, 49, 2, 0.4, 5)
        self.assertAlmostEqual(sizing["effective_risk_per_share"], 2.55)
        self.assertEqual(sizing["shares_by_exposure"], 500)
        self.assertEqual(sizing["shares"], 500)

    def test_market_gate_caps_missing_core_data(self):
        result = ledger_module.score_market_gate({
            "broad_trend": None, "growth_style": 2, "breadth": 2, "turnover_quality": 2, "sector_confirmation": 2,
        })
        self.assertEqual(result["label"], "谨慎进攻")
        downgraded = ledger_module.score_market_gate({
            "broad_trend": 2, "growth_style": 2, "breadth": 2, "turnover_quality": 2, "sector_confirmation": 2,
        }, "观察")
        self.assertEqual(downgraded["label"], "观察")
        weak_broad = ledger_module.score_market_gate({
            "broad_trend": 0, "growth_style": 2, "breadth": 2, "turnover_quality": 2, "sector_confirmation": 2,
        })
        self.assertEqual(weak_broad["label"], "谨慎进攻")
        zero_breadth = ledger_module.score_market_gate({
            "broad_trend": 2, "growth_style": 2, "breadth": 0, "turnover_quality": 2, "sector_confirmation": 2,
        })
        self.assertEqual(zero_breadth["label"], "观察")

    def test_reset_blocks_hot_sector_and_missing_sector_confirmation_observes(self):
        reset = {"mode": "reset", "new_buys_allowed": False, "new_buy_vetoes": ["drawdown_or_loss_cooldown_active"]}
        blocked = ledger_module.entry_permission(reset, {"market": True, "sector": True, "stock": True}, 3, 0.4, True)
        self.assertEqual(blocked["action"], "空仓等待")
        normal = {"mode": "normal", "new_buys_allowed": True, "new_buy_vetoes": []}
        observe = ledger_module.entry_permission(normal, {"market": True, "sector": False, "stock": True}, 3, 0.4, True)
        self.assertEqual(observe["action"], "观察")

    def test_uncalibrated_valid_setup_is_only_trial(self):
        normal = {"mode": "normal", "new_buys_allowed": True, "new_buy_vetoes": []}
        trial = ledger_module.entry_permission(normal, {"market": True, "sector": True, "stock": True}, 2.5, 0.2, False)
        self.assertEqual(trial["action"], "试仓")
        buy = ledger_module.entry_permission(normal, {"market": True, "sector": True, "stock": True}, 2.5, 0.2, True)
        self.assertEqual(buy["action"], "买入")

    def test_ledger_rejects_fake_calibrated_buy_and_reset_entry(self):
        self.add_close("2026-07-10", 500000)
        base = {
            "data_as_of": "2026-07-10", "market_gate": "进攻", "risk_state": "normal", "code": "300458",
            "action": "买入", "rationale": "test", "expectancy_r": 0.2, "approved": True, "sector": "芯片",
            "confirmations": {"market": True, "sector": True, "stock": True},
            "entry_high": 50, "stop_price": 45, "first_target": 61, "atr14": 2,
            "stop_basis": "close_confirmation", "quantity": 100,
            "empirical_stats": {"calibrated": True, "sample_size": 30},
        }
        with self.assertRaises(ValueError):
            self.ledger.add_decision(base)
        self.ledger.add_risk_event("test_reset", "2026-07-10T15:00:00+08:00", 5, {})
        trial = dict(base, action="试仓", risk_state="reset", empirical_stats={"calibrated": False, "expectancy_r": 0.2})
        with self.assertRaises(ValueError):
            self.ledger.add_decision(trial)

    def test_uncalibrated_probability_is_not_reported(self):
        stats = ledger_module.calibrated_statistics([1, -1] * 10)
        self.assertFalse(stats["calibrated"])
        self.assertIsNone(stats["statistical_probability"])
        calibrated = ledger_module.calibrated_statistics([1] * 20 + [-1] * 10)
        self.assertTrue(calibrated["calibrated"])
        self.assertIsNotNone(calibrated["wilson_95"])

    def test_decision_stability_requires_material_change(self):
        previous = {"action": "持有", "stop_price": 10, "first_target": 12, "quantity": 100}
        current = {"action": "减仓", "stop_price": 10.5, "first_target": 12, "quantity": 100}
        self.assertFalse(ledger_module.validate_decision_change(previous, current).allowed)
        current["material_change_reasons"] = ["formal_trigger"]
        self.assertTrue(ledger_module.validate_decision_change(previous, current).allowed)
        gate_change = dict(previous, market_gate="进攻", market_gate_score=9)
        previous_gate = dict(previous, market_gate="观察", market_gate_score=5)
        self.assertFalse(ledger_module.validate_decision_change(previous_gate, gate_change).allowed)

    def test_decision_stability_includes_trigger_contract(self):
        self.add_close("2026-07-10", 500000)
        first = {
            "decision_id": "T1", "data_as_of": "2026-07-10", "market_gate": "观察", "risk_state": "normal",
            "code": "300001", "action": "持有", "rationale": "test", "approved": True,
            "triggers": {"price_triggers": [{"operator": "<=", "price": 10, "level": "watch", "quantity": 100, "confirmation": "close_confirmation", "valid_until": "2026-07-17"}]},
        }
        self.ledger.add_decision(first)
        changed = json.loads(json.dumps(first, ensure_ascii=False))
        changed["decision_id"] = "T2"
        changed["triggers"]["price_triggers"][0]["price"] = 9.5
        with self.assertRaises(ValueError):
            self.ledger.add_decision(changed)

    def test_engine_risk_state_cannot_be_bypassed(self):
        self.add_close("2026-07-10", 500000)
        self.ledger.add_risk_event("test_reset", "2026-07-10T15:00:00+08:00", 5, {})
        with self.assertRaises(ValueError):
            self.ledger.add_decision(self.valid_trial(risk_state="normal"))

    def test_valid_trial_is_recomputed_and_oversized_trade_rejected(self):
        self.add_close("2026-07-10", 500000)
        decision_id = self.ledger.add_decision(self.valid_trial())
        stored = self.ledger.db.execute("SELECT exposure_pct,account_risk_pct,reward_risk FROM decisions WHERE decision_id=?", (decision_id,)).fetchone()
        self.assertAlmostEqual(stored["exposure_pct"], 1.0)
        self.assertGreater(stored["reward_risk"], 2.0)
        oversized = self.valid_trial(decision_id="TOO-BIG", code="300002", quantity=10000)
        oversized["triggers"]["price_triggers"][0]["quantity"] = 10000
        with self.assertRaises(ValueError):
            self.ledger.add_decision(oversized)

    def test_unapproved_draft_does_not_deactivate_approved_plan(self):
        self.add_close("2026-07-10", 500000)
        self.ledger.add_decision({"decision_id": "A", "data_as_of": "2026-07-10", "market_gate": "观察", "risk_state": "normal", "code": "300001", "action": "持有", "rationale": "approved", "approved": True})
        self.ledger.add_decision({"decision_id": "B", "data_as_of": "2026-07-10", "market_gate": "观察", "risk_state": "normal", "code": "300001", "action": "观察", "rationale": "draft", "approved": False})
        self.assertEqual(self.ledger.latest_decision("300001")["decision_id"], "A")
        self.assertEqual(len(self.ledger.latest_approved_decisions()["decisions"]), 1)

    def test_failed_or_stale_replacement_keeps_latest_approved_plan(self):
        self.add_close("2026-07-10", 500000)
        first = {
            "decision_id": "A", "decided_at": "2026-07-11T10:05:00+08:00", "data_as_of": "2026-07-10",
            "market_gate": "观察", "risk_state": "normal", "code": "300001", "action": "持有",
            "rationale": "approved", "approved": True,
        }
        self.ledger.add_decision(first)
        stale = dict(first, decision_id="B", decided_at="2026-07-11T09:00:00+08:00")
        with self.assertRaises(ValueError):
            self.ledger.add_decision(stale)
        duplicate = dict(first, decided_at="2026-07-11T11:00:00+08:00")
        with self.assertRaises(Exception):
            self.ledger.add_decision(duplicate)
        latest = self.ledger.latest_decision("300001")
        self.assertEqual(latest["decision_id"], "A")
        self.assertEqual(latest["active"], 1)

    def test_approved_decision_rejects_stale_account_data(self):
        self.add_close("2026-07-10", 500000)
        with self.assertRaises(ValueError):
            self.ledger.add_decision({
                "decision_id": "STALE", "data_as_of": "2026-07-09", "market_gate": "观察",
                "risk_state": "normal", "code": "300001", "action": "持有",
                "rationale": "stale", "approved": True,
            })

    def test_daily_entry_limit_uses_shanghai_calendar_date(self):
        self.add_close("2026-07-10", 500000)
        first = self.valid_trial(decision_id="TZ1", decided_at="2026-07-11T23:30:00+00:00")
        self.ledger.add_decision(first)
        second = self.valid_trial(
            decision_id="TZ2", code="300002", name="测试B", decided_at="2026-07-12T10:00:00+08:00",
        )
        with self.assertRaises(ValueError):
            self.ledger.add_decision(second)

    def test_trigger_schema_and_embedded_sell_buyback_are_enforced(self):
        snapshot = self.add_close("2026-07-10", 500000, cash=495000, market=5000)
        self.ledger.add_positions(snapshot, [{"code": "600001", "name": "测试B", "sector": "医药", "quantity": 500, "available_quantity": 500, "current_price": 10, "market_value": 5000, "planned_stop": 9, "stop_basis": "close_confirmation"}])
        base = {
            "data_as_of": "2026-07-10", "market_gate": "观察", "risk_state": "normal", "code": "600001",
            "name": "测试B", "sector": "医药", "action": "持有", "rationale": "test", "thesis_status": "intact", "approved": True,
            "triggers": {"price_triggers": [{"operator": "bad", "price": 9, "level": "sell", "quantity": 100, "confirmation": "close_confirmation", "valid_until": "2026-07-17", "thesis_effect": "intact"}]},
        }
        with self.assertRaises(ValueError):
            self.ledger.add_decision(base)
        base["triggers"]["price_triggers"][0]["operator"] = "<="
        with self.assertRaises(ValueError):
            self.ledger.add_decision(base)
        base["buyback"] = {"cooldown_trading_days": 1, "trigger": "赛道恢复", "no_buy": "市场防守", "quantity": 100, "structure_condition": "重新站稳并回踩"}
        self.ledger.add_decision(base)

    def test_latest_approved_decision_stop_is_risk_source(self):
        snapshot = self.add_close("2026-07-10", 500000, cash=495000, market=5000)
        self.ledger.add_positions(snapshot, [{"code": "600001", "name": "测试B", "sector": "医药", "quantity": 500, "available_quantity": 500, "current_price": 10, "market_value": 5000, "planned_stop": 9, "stop_basis": "close_confirmation"}])
        self.ledger.add_decision({"data_as_of": "2026-07-10", "market_gate": "观察", "risk_state": "normal", "code": "600001", "name": "测试B", "sector": "医药", "action": "持有", "rationale": "test", "stop_price": 8.5, "stop_basis": "close_confirmation", "approved": True, "material_change_reasons": ["risk_control_correction"]})
        position = self.ledger.compute_state()["account"]["positions"][0]
        self.assertEqual(position["planned_stop"], 8.5)
        self.assertEqual(position["stop_source"], "approved_decision")
        self.assertFalse(position["risk_quantified"])
        self.assertTrue(position["risk_at_stop_is_lower_bound"])
        self.assertIn("600001", self.ledger.compute_state()["risk"]["stop_mismatch_codes"])
        self.assertIn("600001", self.ledger.compute_state()["risk"]["unknown_stop_risk_codes"])

    def test_persistent_drawdown_event_advances_to_probation(self):
        self.add_close("2026-01-02", 100000)
        self.add_close("2026-01-05", 96000)
        self.assertEqual(self.ledger.compute_state()["risk"]["mode"], "reset")
        for day in ("2026-01-06", "2026-01-07", "2026-01-08", "2026-01-09", "2026-01-12"):
            self.add_close(day, 96000)
        state = self.ledger.compute_state()
        self.assertEqual(state["risk"]["mode"], "probation")
        event = self.ledger.db.execute("SELECT * FROM risk_events WHERE resolved_at IS NULL").fetchone()
        self.assertIsNotNone(event["probation_started_at"])

    def test_probation_uses_only_outcomes_after_current_event(self):
        self.add_close("2026-01-02", 100000)
        for index in range(5):
            decision_id = self.ledger.add_decision({"decision_id": f"OLD{index}", "data_as_of": "2026-01-02", "market_gate": "观察", "risk_state": "probation", "code": f"0002{index:02d}", "action": "持有", "rationale": "old", "approved": False})
            self.ledger.add_outcome({"decision_id": decision_id, "horizon_days": 0, "r_multiple": 1, "closed_trade": True, "rule_compliant": True, "measured_at": f"2026-01-{3+index:02d}"})
        self.ledger.add_risk_event("scope_test", "2026-01-02T15:00:00+08:00", 0, {})
        state = self.ledger.compute_state()
        self.assertEqual(state["risk"]["mode"], "probation")
        self.assertEqual(state["probation"]["closed_count"], 0)

    def test_closed_outcome_contract_preserves_id_and_ignores_legacy_horizons(self):
        decision_id = self.ledger.add_decision({
            "decision_id": "OUTCOME", "data_as_of": "2026-07-10", "market_gate": "观察",
            "risk_state": "probation", "code": "300001", "action": "持有", "rationale": "test",
        })
        with self.assertRaises(ValueError):
            self.ledger.add_outcome({"decision_id": decision_id, "horizon_days": 5, "r_multiple": 1, "closed_trade": True, "rule_compliant": True})
        with self.assertRaises(ValueError):
            self.ledger.add_outcome({"decision_id": decision_id, "horizon_days": 0, "r_multiple": 1, "closed_trade": True})
        self.ledger.add_outcome({
            "decision_id": decision_id, "horizon_days": 0, "r_multiple": 1,
            "closed_trade": True, "rule_compliant": True,
        })
        outcome_id = self.ledger.db.execute("SELECT id FROM outcomes WHERE decision_id=?", (decision_id,)).fetchone()[0]
        self.ledger.add_outcome({
            "decision_id": decision_id, "horizon_days": 0, "r_multiple": 0.5,
            "closed_trade": True, "rule_compliant": True,
        })
        updated_id = self.ledger.db.execute("SELECT id FROM outcomes WHERE decision_id=?", (decision_id,)).fetchone()[0]
        self.assertEqual(updated_id, outcome_id)
        self.ledger.db.execute(
            "INSERT INTO outcomes(decision_id,horizon_days,r_multiple,rule_compliant,closed_trade,measured_at) VALUES(?,?,?,?,?,?)",
            (decision_id, 5, 1, 1, 1, "2026-07-15"),
        )
        self.ledger.db.commit()
        self.assertEqual(self.ledger._probation_metrics()["closed_count"], 1)

    def test_rebuy_contract_and_broken_thesis(self):
        base = {
            "data_as_of": "2026-07-10T15:00:00+08:00", "market_gate": "观察", "risk_state": "reset",
            "code": "600276", "name": "恒瑞医药", "action": "减仓", "rationale": "测试", "thesis_status": "intact", "approved": True,
        }
        with self.assertRaises(ValueError):
            self.ledger.add_decision(base)
        base["buyback"] = {"cooldown_trading_days": 1, "trigger": "板块恢复", "no_buy": "指数防守", "quantity": 100, "structure_condition": "重新站稳结构"}
        self.ledger.add_decision(base)
        broken = dict(base, code="300124", action="止损", thesis_status="broken", buyback={"price_zone": [60, 62]}, material_change_reasons=["thesis_pillar"])
        with self.assertRaises(ValueError):
            self.ledger.add_decision(broken)

    def test_consecutive_losses_start_three_session_cooling(self):
        for index in range(2):
            decision_id = self.ledger.add_decision({
                "decision_id": f"D{index}", "data_as_of": "2026-07-10", "market_gate": "观察", "risk_state": "normal",
                "code": f"00000{index+1}", "action": "持有", "rationale": "test",
            })
            self.ledger.add_outcome({"decision_id": decision_id, "horizon_days": 0, "r_multiple": -1, "closed_trade": True, "rule_compliant": True, "measured_at": f"2026-07-{10+index}"})
        self.assertEqual(self.ledger.compute_state()["risk"]["mode"], "reset")

    def test_legacy_sector_over_limit_blocks_add_without_forced_sale(self):
        snapshot = self.add_close("2026-07-10", 500000, cash=350000, market=150000)
        self.ledger.add_positions(snapshot, [
            {"code": "300458", "name": "A", "sector": "芯片", "quantity": 1000, "available_quantity": 1000, "current_price": 60, "market_value": 60000, "legacy_position": True},
            {"code": "603893", "name": "B", "sector": "芯片", "quantity": 500, "available_quantity": 500, "current_price": 100, "market_value": 50000, "legacy_position": True},
        ])
        state = self.ledger.compute_state()
        self.assertIn("sector_market_value_limit", state["risk"]["new_buy_vetoes"])
        self.assertFalse(state["risk"]["new_buys_allowed"])
        self.assertEqual(len(state["account"]["positions"]), 2)

    def test_probation_requires_five_clean_positive_trades(self):
        self.add_close("2026-07-10", 500000)
        self.ledger.add_risk_event("reset", "2026-07-10T15:00:00+08:00", 0, {})
        for index, result in enumerate([1, 1, -0.5, 1, 1]):
            decision_id = self.ledger.add_decision({
                "decision_id": f"P{index}", "data_as_of": "2026-07-10", "market_gate": "谨慎进攻", "risk_state": "probation",
                "code": f"0001{index:02d}", "action": "持有", "rationale": "test",
            })
            self.ledger.add_outcome({"decision_id": decision_id, "horizon_days": 0, "r_multiple": result, "closed_trade": True, "rule_compliant": True, "measured_at": f"2026-07-{11+index}"})
        self.assertEqual(self.ledger.compute_state()["risk"]["mode"], "normal")

    def test_outputs_are_valid_json(self):
        self.add_close("2026-07-10", 500000)
        self.ledger.add_market_scan({
            "scanned_at": "2026-07-10T14:35:00+08:00", "data_as_of": "2026-07-10T14:35:00+08:00",
            "scan_scope": "full", "session": "afternoon", "market_gate": "谨慎进攻", "market_gate_score": 7,
            "factors": {"broad_trend": 1, "growth_style": 2, "breadth": 1, "turnover_quality": 1, "sector_confirmation": 2},
            "sectors": [
                {"name": "芯片", "lifecycle": "趋势扩散", "conclusion": "观察"},
                {"name": "创新药", "lifecycle": "低位预热", "conclusion": "观察"},
                {"name": "机器人", "lifecycle": "高位拥挤", "conclusion": "回避"},
            ],
            "sources": [{"name": "交易所行情", "as_of": "2026-07-10T14:35:00+08:00"}],
            "summary": "测试扫描",
        })
        state_path, decision_path, context_path = ledger_module.write_outputs(self.ledger, self.root)
        self.assertIn("risk", json.loads(state_path.read_text()))
        self.assertIn("decisions", json.loads(decision_path.read_text()))
        context = json.loads(context_path.read_text())
        self.assertEqual(context["market_scan"]["scan_scope"], "full")
        self.assertLess(context_path.stat().st_size, state_path.stat().st_size + decision_path.stat().st_size)
        self.assertEqual(stat.S_IMODE(state_path.stat().st_mode), 0o600)
        self.assertEqual(stat.S_IMODE(decision_path.stat().st_mode), 0o600)
        self.assertEqual(stat.S_IMODE(context_path.stat().st_mode), 0o600)
        self.assertEqual(stat.S_IMODE(self.ledger.db_path.stat().st_mode), 0o600)

    def test_full_market_scan_requires_auditable_factors_sectors_and_sources(self):
        with self.assertRaises(ValueError):
            self.ledger.add_market_scan({
                "scanned_at": "2026-07-10T10:05:00+08:00", "data_as_of": "2026-07-10T10:05:00+08:00",
                "scan_scope": "full", "session": "morning", "factors": {"broad_trend": 2},
                "sectors": [], "sources": [], "summary": "invalid",
            })


if __name__ == "__main__":
    unittest.main()
