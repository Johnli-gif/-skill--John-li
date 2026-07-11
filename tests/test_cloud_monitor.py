import importlib.util
import sys
import unittest
from datetime import datetime
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "scripts" / "cloud_monitor.py"
SPEC = importlib.util.spec_from_file_location("cloud_monitor", MODULE_PATH)
module = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = module
SPEC.loader.exec_module(module)


class CloudMonitorTest(unittest.TestCase):
    def current_quote(self, price):
        return {"price": price, "time": module.now().strftime("%Y%m%d%H%M%S")}

    def decision_view(self, approved=True, active=True):
        return {"decisions": [{
            "decision_id": "D1", "approved": approved, "active": active,
            "code": "300001", "name": "测试股票A", "action": "试仓",
            "triggers": {"price_triggers": [{"operator": ">=", "price": 42, "level": "buy", "action": "试仓100股"}]},
        }]}

    def test_reset_blocks_even_approved_buy(self):
        state = {"risk": {"mode": "reset", "new_buys_allowed": False, "new_buy_vetoes": ["cooldown"]}, "data_freshness": {"status": "current"}}
        self.assertEqual(module.approved_price_triggers(state, self.decision_view()), [])

    def test_stale_state_blocks_buy(self):
        state = {"risk": {"mode": "normal", "new_buys_allowed": True, "new_buy_vetoes": []}, "data_freshness": {"status": "stale"}}
        self.assertEqual(module.approved_price_triggers(state, self.decision_view()), [])

    def test_unapproved_decision_never_alerts(self):
        state = {"risk": {"mode": "normal", "new_buys_allowed": True, "new_buy_vetoes": []}, "data_freshness": {"status": "current"}}
        self.assertEqual(module.approved_price_triggers(state, self.decision_view(approved=False)), [])

    def test_approved_trigger_fires_only_at_price(self):
        state = {"risk": {"mode": "probation", "new_buys_allowed": True, "new_buy_vetoes": []}, "data_freshness": {"status": "current"}}
        view = self.decision_view()
        self.assertEqual(module.evaluate_approved_triggers(state, view, {"300001": self.current_quote(41.99)}), [])
        alerts = module.evaluate_approved_triggers(state, view, {"300001": self.current_quote(42.01)})
        self.assertEqual(len(alerts), 1)
        self.assertEqual(alerts[0].level, "buy")

    def test_sell_trigger_remains_available_during_reset(self):
        state = {"risk": {"mode": "reset", "new_buys_allowed": False, "new_buy_vetoes": ["cooldown"]}, "data_freshness": {"status": "current"}}
        view = {"decisions": [{
            "decision_id": "S1", "approved": True, "active": True, "code": "600001", "name": "测试股票B", "action": "减仓",
            "triggers": {"price_triggers": [{"operator": "<=", "price": 50, "level": "sell", "action": "减仓500股"}]},
        }]}
        alerts = module.evaluate_approved_triggers(state, view, {"600001": self.current_quote(49.9)})
        self.assertEqual(len(alerts), 1)
        self.assertEqual(alerts[0].level, "sell")

    def test_stale_quote_never_fires(self):
        state = {"risk": {"mode": "normal", "new_buys_allowed": True, "new_buy_vetoes": []}, "data_freshness": {"status": "current"}}
        alerts = module.evaluate_approved_triggers(state, self.decision_view(), {"300001": {"price": 43, "time": "20200101100000"}})
        self.assertEqual(alerts, [])

    def test_close_confirmation_waits_until_1450(self):
        trigger = {"confirmation": "close_confirmation"}
        quote = {"time": "20260713143000"}
        early = datetime(2026, 7, 13, 14, 30, tzinfo=module.TZ)
        late = datetime(2026, 7, 13, 14, 51, tzinfo=module.TZ)
        self.assertFalse(module.confirmation_allows(trigger, quote, early)[0])
        self.assertTrue(module.confirmation_allows(trigger, quote, late)[0])

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


if __name__ == "__main__":
    unittest.main()
