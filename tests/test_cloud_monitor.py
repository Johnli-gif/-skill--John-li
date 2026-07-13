import importlib.util
import sys
import unittest
from datetime import datetime
from pathlib import Path
from unittest.mock import patch


MODULE_PATH = Path(__file__).resolve().parents[1] / "scripts" / "cloud_monitor.py"
SPEC = importlib.util.spec_from_file_location("cloud_monitor", MODULE_PATH)
module = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = module
SPEC.loader.exec_module(module)


class CloudMonitorTest(unittest.TestCase):
    def current_time(self, hour=10, minute=5):
        return datetime(2026, 7, 13, hour, minute, tzinfo=module.TZ)

    def current_quote(self, price, current=None):
        current = current or self.current_time()
        return {"price": price, "time": current.strftime("%Y%m%d%H%M%S")}

    def decision_view(self, approved=True, active=True):
        return {"decisions": [{
            "decision_id": "D1", "approved": approved, "active": active,
            "code": "300001", "name": "测试股票A", "action": "试仓",
            "triggers": {"price_triggers": [{"operator": ">=", "price": 42, "level": "buy", "action": "试仓100股", "quantity": 100, "valid_until": "2026-07-17"}]},
        }]}

    def test_reset_blocks_even_approved_buy(self):
        state = {"risk": {"mode": "reset", "new_buys_allowed": False, "new_buy_vetoes": ["cooldown"]}, "data_freshness": {"status": "current"}}
        self.assertEqual(module.approved_price_triggers(state, self.decision_view(), self.current_time()), [])

    def test_stale_state_blocks_buy(self):
        state = {"risk": {"mode": "normal", "new_buys_allowed": True, "new_buy_vetoes": []}, "data_freshness": {"status": "stale"}}
        self.assertEqual(module.approved_price_triggers(state, self.decision_view(), self.current_time()), [])

    def test_unapproved_decision_never_alerts(self):
        state = {"risk": {"mode": "normal", "new_buys_allowed": True, "new_buy_vetoes": []}, "data_freshness": {"status": "current"}}
        self.assertEqual(module.approved_price_triggers(state, self.decision_view(approved=False), self.current_time()), [])

    def test_approved_trigger_fires_only_at_price(self):
        state = {"risk": {"mode": "probation", "new_buys_allowed": True, "new_buy_vetoes": []}, "data_freshness": {"status": "current"}}
        view = self.decision_view()
        current = self.current_time()
        self.assertEqual(module.evaluate_approved_triggers(state, view, {"300001": self.current_quote(41.99)}, current), [])
        alerts = module.evaluate_approved_triggers(state, view, {"300001": self.current_quote(42.01)}, current)
        self.assertEqual(len(alerts), 1)
        self.assertEqual(alerts[0].level, "buy")

    def test_sell_trigger_remains_available_during_reset(self):
        state = {
            "risk": {"mode": "reset", "new_buys_allowed": False, "new_buy_vetoes": ["cooldown"]},
            "data_freshness": {"status": "current"},
            "account": {"positions": [{"code": "600001", "available_quantity": 500}]},
        }
        view = {"decisions": [{
            "decision_id": "S1", "approved": True, "active": True, "code": "600001", "name": "测试股票B", "action": "减仓",
            "triggers": {"price_triggers": [{"operator": "<=", "price": 50, "level": "sell", "action": "减仓500股", "quantity": 500, "valid_until": "2026-07-17"}]},
        }]}
        current = self.current_time()
        alerts = module.evaluate_approved_triggers(state, view, {"600001": self.current_quote(49.9)}, current)
        self.assertEqual(len(alerts), 1)
        self.assertEqual(alerts[0].level, "sell")

    def test_stale_quote_never_fires(self):
        state = {"risk": {"mode": "normal", "new_buys_allowed": True, "new_buy_vetoes": []}, "data_freshness": {"status": "current"}}
        alerts = module.evaluate_approved_triggers(state, self.decision_view(), {"300001": {"price": 43, "time": "20200101100000"}}, self.current_time())
        self.assertEqual(alerts, [])

    def test_expired_or_undated_trigger_is_blocked(self):
        state = {"risk": {"mode": "normal", "new_buys_allowed": True, "new_buy_vetoes": []}, "data_freshness": {"status": "current"}}
        expired = self.decision_view()
        expired["decisions"][0]["triggers"]["price_triggers"][0]["valid_until"] = "2026-07-10"
        self.assertEqual(module.approved_price_triggers(state, expired, self.current_time()), [])
        undated = self.decision_view()
        del undated["decisions"][0]["triggers"]["price_triggers"][0]["valid_until"]
        self.assertEqual(module.approved_price_triggers(state, undated, self.current_time()), [])

    def test_buy_is_blocked_before_morning_scan(self):
        state = {"risk": {"mode": "normal", "new_buys_allowed": True, "new_buy_vetoes": []}, "data_freshness": {"status": "current"}}
        self.assertEqual(module.approved_price_triggers(state, self.decision_view(), self.current_time(9, 59)), [])

    def test_sell_quantity_is_capped_by_available_position(self):
        state = {
            "risk": {"mode": "reset", "new_buys_allowed": False, "new_buy_vetoes": ["cooldown"]},
            "data_freshness": {"status": "current"},
            "account": {"positions": [{"code": "600001", "available_quantity": 200}]},
        }
        view = {"decisions": [{
            "decision_id": "S2", "approved": True, "active": True, "code": "600001", "name": "测试股票B", "action": "减仓",
            "triggers": {"price_triggers": [{"operator": "<=", "price": 50, "level": "sell", "action": "减仓", "quantity": 500, "valid_until": "2026-07-17"}]},
        }]}
        trigger = module.approved_price_triggers(state, view, self.current_time())[0]
        self.assertEqual(trigger["quantity"], 200)

    def test_close_confirmation_waits_until_1450(self):
        trigger = {"confirmation": "close_confirmation"}
        quote = {"time": "20260713143000"}
        early = datetime(2026, 7, 13, 14, 30, tzinfo=module.TZ)
        late = datetime(2026, 7, 13, 14, 51, tzinfo=module.TZ)
        self.assertFalse(module.confirmation_allows(trigger, quote, early)[0])
        self.assertTrue(module.confirmation_allows(trigger, quote, late)[0])

    def test_close_sell_replaces_same_price_watch_alert(self):
        current = self.current_time(14, 51)
        state = {
            "risk": {"mode": "reset", "new_buys_allowed": False, "new_buy_vetoes": ["cooldown"]},
            "data_freshness": {"status": "current"},
            "account": {"positions": [{"code": "600001", "available_quantity": 500}]},
        }
        view = {"decisions": [{
            "decision_id": "S3", "approved": True, "active": True, "code": "600001", "name": "测试股票B", "action": "持有",
            "triggers": {"price_triggers": [
                {"operator": "<=", "price": 50, "level": "watch", "action": "风险预警", "quantity": 500, "confirmation": "intraday", "valid_until": "2026-07-17"},
                {"operator": "<=", "price": 50, "level": "sell", "action": "收盘减仓", "quantity": 500, "confirmation": "close_confirmation", "valid_until": "2026-07-17"},
            ]},
        }]}
        alerts = module.evaluate_approved_triggers(state, view, {"600001": self.current_quote(49.9, current)}, current)
        self.assertEqual(len(alerts), 1)
        self.assertEqual(alerts[0].level, "sell")

    def test_decision_summary_uses_state_without_creating_action(self):
        state = {
            "data_as_of": "2026-07-10T15:00:00+08:00",
            "account": {"total_assets": 500000, "exposure_pct": 20},
            "risk": {"mode": "reset", "new_buys_allowed": False, "cooldown_sessions_remaining": 4, "new_buy_vetoes": ["cooldown"]},
        }
        view = {
            "market_gate": "观察",
            "decisions": [
                {"approved": True, "active": True, "code": None, "rationale": "禁止新买", "market_gate_score": 4},
                {"approved": True, "active": True, "code": "300001", "name": "测试股票A", "action": "持有", "rationale": "维持计划", "decision_id": "D1"},
            ],
        }
        title, plain, markdown, _ = module.build_decision_summary(state, view)
        self.assertIn("定时全面扫描", title)
        self.assertIn("禁止新买", plain)
        self.assertIn("测试股票A：持有", plain)
        self.assertIn("实际成交必须人工确认", markdown)
        _, unchanged, _, _ = module.build_decision_summary(state, view, has_new_state=False)
        self.assertIn("无实质变化，维持原计划", unchanged)

    def test_immediate_reduce_decision_is_actionable_without_price_trigger(self):
        view = {"decisions": [{
            "decision_id": "D2", "approved": True, "active": True,
            "code": "603893", "name": "瑞芯微", "action": "减仓", "quantity": 100,
            "rationale": "降低半导体集中风险",
            "triggers": {
                "execution_price_zone": [217, 219],
                "execution_status": "trigger_confirmed_2026-07-13T14:52:52+08:00",
            },
        }]}
        self.assertEqual(len(module.actionable_decisions(view)), 1)
        self.assertEqual(len(module.immediate_action_decisions(view, self.current_time(14, 55))), 1)
        self.assertEqual(len(module.immediate_action_decisions(view, datetime(2026, 7, 14, 9, 30, tzinfo=module.TZ))), 0)
        title, plain, _, _ = module.build_decision_summary({}, view, urgent=True)
        self.assertIn("立即确认", title)
        self.assertIn("【减仓100股】，参考217-219元", plain)

    def test_unhit_action_plan_is_not_an_immediate_push(self):
        view = self.decision_view()
        self.assertEqual(len(module.actionable_decisions(view)), 1)
        self.assertEqual(module.immediate_action_decisions(view, self.current_time()), [])

    def test_pushplus_delivery_without_access_key_is_not_claimed_delivered(self):
        status, message = module.verify_pushplus_delivery("abc123", "")
        self.assertEqual(status, "accepted_unverified")
        self.assertIn("ACCESS_KEY", message)

    @patch.object(module, "get_json")
    def test_pushplus_delivery_failure_is_reported(self, get_json):
        get_json.return_value = {"code": 200, "data": {"status": 3, "errorMessage": "用户未关注公众号"}}
        status, message = module.verify_pushplus_delivery("abc123", "access-key", attempts=1)
        self.assertEqual(status, "failed")
        self.assertIn("未关注", message)


if __name__ == "__main__":
    unittest.main()
