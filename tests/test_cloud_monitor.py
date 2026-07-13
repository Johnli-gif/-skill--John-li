import importlib.util
import json
import os
import sys
import tempfile
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

    def state(self, mode="normal", allowed=True, vetoes=None, positions=None, data_as_of="2026-07-10T15:00:00+08:00"):
        return {
            "schema_version": 1,
            "skill_version": "2.3.0",
            "generated_at": "2026-07-13T10:04:00+08:00",
            "data_as_of": data_as_of,
            "risk": {"mode": mode, "new_buys_allowed": allowed, "new_buy_vetoes": vetoes or []},
            "account": {"positions": positions or []},
        }

    def decision_view(self, approved=True, active=True):
        return {"decisions": [{
            "decision_id": "D1", "approved": approved, "active": active,
            "code": "300001", "name": "测试股票A", "action": "试仓",
            "triggers": {"price_triggers": [{"operator": ">=", "price": 42, "level": "buy", "action": "试仓100股", "quantity": 100, "valid_until": "2026-07-17"}]},
        }]}

    def test_reset_blocks_even_approved_buy(self):
        state = self.state("reset", False, ["cooldown"])
        self.assertEqual(module.approved_price_triggers(state, self.decision_view(), self.current_time()), [])

    def test_stale_state_blocks_buy(self):
        state = self.state(data_as_of="2026-07-09T15:00:00+08:00")
        self.assertEqual(module.approved_price_triggers(state, self.decision_view(), self.current_time()), [])

    def test_unapproved_decision_never_alerts(self):
        state = self.state()
        self.assertEqual(module.approved_price_triggers(state, self.decision_view(approved=False), self.current_time()), [])

    def test_approved_trigger_fires_only_at_price(self):
        state = self.state("probation")
        view = self.decision_view()
        current = self.current_time()
        self.assertEqual(module.evaluate_approved_triggers(state, view, {"300001": self.current_quote(41.99)}, current), [])
        alerts = module.evaluate_approved_triggers(state, view, {"300001": self.current_quote(42.01)}, current)
        self.assertEqual(len(alerts), 1)
        self.assertEqual(alerts[0].level, "buy")

    def test_sell_trigger_remains_available_during_reset(self):
        state = self.state("reset", False, ["cooldown"], [{"code": "600001", "available_quantity": 500}])
        view = {"decisions": [{
            "decision_id": "S1", "approved": True, "active": True, "code": "600001", "name": "测试股票B", "action": "减仓",
            "triggers": {"price_triggers": [{"operator": "<=", "price": 50, "level": "sell", "action": "减仓500股", "quantity": 500, "valid_until": "2026-07-17"}]},
        }]}
        current = self.current_time()
        alerts = module.evaluate_approved_triggers(state, view, {"600001": self.current_quote(49.9)}, current)
        self.assertEqual(len(alerts), 1)
        self.assertEqual(alerts[0].level, "sell")

    def test_stale_quote_never_fires(self):
        state = self.state()
        alerts = module.evaluate_approved_triggers(state, self.decision_view(), {"300001": {"price": 43, "time": "20200101100000"}}, self.current_time())
        self.assertEqual(alerts, [])

    def test_same_day_but_old_quote_never_fires(self):
        state = self.state()
        quote = {"price": 43, "time": "20260713093000"}
        self.assertEqual(module.evaluate_approved_triggers(state, self.decision_view(), {"300001": quote}, self.current_time()), [])

    def test_stale_state_blocks_sell_quantity(self):
        state = self.state(
            "reset",
            False,
            ["cooldown"],
            [{"code": "600001", "available_quantity": 500}],
            data_as_of="2026-07-09T15:00:00+08:00",
        )
        view = {"decisions": [{
            "decision_id": "S-stale", "approved": True, "active": True, "code": "600001", "name": "测试股票B", "action": "减仓",
            "triggers": {"price_triggers": [{"operator": "<=", "price": 50, "level": "sell", "action": "减仓", "quantity": 500, "valid_until": "2026-07-17"}]},
        }]}
        self.assertEqual(module.approved_price_triggers(state, view, self.current_time()), [])

    def test_expired_or_undated_trigger_is_blocked(self):
        state = self.state()
        expired = self.decision_view()
        expired["decisions"][0]["triggers"]["price_triggers"][0]["valid_until"] = "2026-07-10"
        self.assertEqual(module.approved_price_triggers(state, expired, self.current_time()), [])
        undated = self.decision_view()
        del undated["decisions"][0]["triggers"]["price_triggers"][0]["valid_until"]
        self.assertEqual(module.approved_price_triggers(state, undated, self.current_time()), [])

    def test_buy_is_blocked_before_morning_scan(self):
        state = self.state()
        self.assertEqual(module.approved_price_triggers(state, self.decision_view(), self.current_time(9, 59)), [])

    def test_sell_quantity_is_capped_by_available_position(self):
        state = self.state("reset", False, ["cooldown"], [{"code": "600001", "available_quantity": 200}])
        view = {"decisions": [{
            "decision_id": "S2", "approved": True, "active": True, "code": "600001", "name": "测试股票B", "action": "减仓",
            "triggers": {"price_triggers": [{"operator": "<=", "price": 50, "level": "sell", "action": "减仓", "quantity": 500, "valid_until": "2026-07-17"}]},
        }]}
        trigger = module.approved_price_triggers(state, view, self.current_time())[0]
        self.assertEqual(trigger["quantity"], 200)

    def test_close_confirmation_waits_for_official_close(self):
        trigger = {"confirmation": "close_confirmation"}
        quote = {"time": "20260713150000"}
        early = datetime(2026, 7, 13, 14, 59, tzinfo=module.TZ)
        late = datetime(2026, 7, 13, 15, 5, tzinfo=module.TZ)
        self.assertFalse(module.confirmation_allows(trigger, quote, early)[0])
        self.assertTrue(module.confirmation_allows(trigger, quote, late)[0])

    def test_dual_source_prices_must_both_hit(self):
        state = self.state("probation")
        quote = {
            "price": 42.0,
            "time": "20260713100500",
            "source_prices": {"tencent": 42.01, "sina": 41.99},
            "source_times": {"tencent": "20260713100500", "sina": "2026-07-13 10:05:00"},
        }
        self.assertEqual(module.evaluate_approved_triggers(state, self.decision_view(), {"300001": quote}, self.current_time()), [])

    @patch.object(module, "http_get")
    def test_sina_batch_url_does_not_corrupt_last_symbol(self, http_get):
        http_get.return_value = (
            'var hq_str_sz300458="全志科技,39.790,40.030,39.950,41.770,39.310,39.940,39.950,'
            '101947950,4139183850.750,11500,39.940,1100,39.930,4900,39.920,5300,39.910,'
            '15300,39.900,47808,39.950,214512,39.960,7500,39.970,15900,39.980,7828,39.990,'
            '2026-07-13,15:00:00,00";'
        )
        quotes = module.fetch_sina_quotes(["300458"])
        self.assertIn("300458", quotes)
        self.assertNotIn("&_", http_get.call_args.args[0])

    def test_exchange_holiday_blocks_monitoring(self):
        holiday = datetime(2026, 10, 1, 10, 5, tzinfo=module.TZ)
        self.assertFalse(module.is_trading_time(holiday))

    def test_runtime_bundle_rejects_mismatched_generation(self):
        state = self.state()
        view = {"skill_version": "2.3.0", "generated_at": "2026-07-13T10:10:00+08:00", "risk_state": "normal", "decisions": []}
        allowed, reason = module.runtime_bundle_is_valid(state, view, self.current_time())
        self.assertFalse(allowed)
        self.assertIn("atomically", reason)

    def test_runtime_bundle_rejects_obsolete_skill_version(self):
        state = self.state()
        state["skill_version"] = "2.2.0"
        view = {
            "skill_version": "2.2.0",
            "generated_at": state["generated_at"],
            "risk_state": "normal",
            "decisions": [],
        }
        allowed, reason = module.runtime_bundle_is_valid(state, view, self.current_time())
        self.assertFalse(allowed)
        self.assertIn("obsolete", reason)

    def test_close_sell_replaces_same_price_watch_alert(self):
        current = self.current_time(15, 5)
        state = self.state(
            "reset",
            False,
            ["cooldown"],
            [{"code": "600001", "available_quantity": 500}],
            data_as_of="2026-07-13T14:55:00+08:00",
        )
        view = {"decisions": [{
            "decision_id": "S3", "approved": True, "active": True, "code": "600001", "name": "测试股票B", "action": "持有",
            "triggers": {"price_triggers": [
                {"operator": "<=", "price": 50, "level": "watch", "action": "风险预警", "quantity": 500, "confirmation": "intraday", "valid_until": "2026-07-17"},
                {"operator": "<=", "price": 50, "level": "sell", "action": "收盘减仓", "quantity": 500, "confirmation": "close_confirmation", "valid_until": "2026-07-17"},
            ]},
        }]}
        alerts = module.evaluate_approved_triggers(state, view, {"600001": {"price": 49.9, "time": "20260713150000"}}, current)
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

    def test_pushplus_delivery_without_callback_is_not_claimed_delivered(self):
        status, message = module.verify_pushplus_delivery("abc123", "")
        self.assertEqual(status, "accepted_unverified")
        self.assertIn("CALLBACK_URL", message)

    @patch.object(module, "verify_pushplus_delivery")
    @patch.object(module, "post_json")
    def test_failed_final_delivery_is_not_counted_as_sent(self, post_json, verify_delivery):
        post_json.return_value = '{"code":200,"data":"abc123"}'
        verify_delivery.return_value = ("failed", "微信通道失败")
        with tempfile.TemporaryDirectory() as folder, patch.dict(os.environ, {
            "PUSHPLUS_TOKEN": "token",
            "PUSHPLUS_CALLBACK_URL": "https://ntfy.sh/ashare-delivery-test",
            "NOTIFICATION_RECEIPT_FILE": str(Path(folder) / "receipt.json"),
            "WECHAT_WORK_WEBHOOK_URL": "",
            "SMTP_HOST": "",
        }, clear=False):
            sent = module.notify_all("test", "plain", "markdown", "sms", False)
        self.assertEqual(sent, [])
        self.assertEqual(
            post_json.call_args.args[1]["callbackUrl"],
            "https://ntfy.sh/ashare-delivery-test",
        )

    @patch.object(module, "get_text")
    def test_pushplus_delivery_failure_is_reported(self, get_text):
        callback = {"event": "message_complate", "messageInfo": {
            "shortCode": "abc123", "sendStatus": 3, "message": "用户未关注公众号",
        }}
        get_text.return_value = json.dumps({"event": "message", "message": json.dumps(callback, ensure_ascii=False)}, ensure_ascii=False)
        status, message = module.verify_pushplus_delivery(
            "abc123", "https://ntfy.sh/ashare-delivery-test", attempts=1,
        )
        self.assertEqual(status, "failed")
        self.assertIn("未关注", message)

    @patch.object(module, "get_text")
    def test_pushplus_delivery_callback_matches_short_code(self, get_text):
        other = {"event": "message_complate", "messageInfo": {"shortCode": "other", "sendStatus": 2}}
        target = {"event": "message_complate", "messageInfo": {"shortCode": "abc123", "sendStatus": 2}}
        get_text.return_value = "\n".join([
            json.dumps({"event": "message", "message": json.dumps(other)}),
            json.dumps({"event": "message", "message": json.dumps(target)}),
        ])
        status, message = module.verify_pushplus_delivery(
            "abc123", "https://ntfy.sh/ashare-delivery-test", attempts=1,
        )
        self.assertEqual((status, message), ("delivered", ""))

    def test_health_check_passes_for_fresh_heartbeat_and_trigger(self):
        current = self.current_time(11, 45)
        state = self.state(positions=[{"code": "300001", "quantity": 100}])
        view = self.decision_view()
        view.update({
            "skill_version": "2.3.0",
            "generated_at": state["generated_at"],
            "risk_state": "normal",
        })
        with tempfile.TemporaryDirectory() as folder, patch.object(module, "now", return_value=current), patch.dict(os.environ, {
            "HEARTBEAT_STATE_FILE": str(Path(folder) / "heartbeat.json"),
        }, clear=False), patch.object(module, "operational_notice") as notice:
            module.save_json(Path(folder) / "heartbeat.json", {"last_monitor_success_at": self.current_time(11, 35).isoformat()})
            self.assertEqual(module.run_health_check(state, view), 0)
            notice.assert_not_called()

    def test_health_check_allows_empty_account_without_triggers(self):
        current = self.current_time(11, 45)
        state = self.state(positions=[])
        view = {
            "skill_version": "2.3.0",
            "generated_at": state["generated_at"],
            "risk_state": "normal",
            "decisions": [],
        }
        with tempfile.TemporaryDirectory() as folder, patch.object(module, "now", return_value=current), patch.dict(os.environ, {
            "HEARTBEAT_STATE_FILE": str(Path(folder) / "heartbeat.json"),
        }, clear=False), patch.object(module, "operational_notice") as notice:
            module.save_json(Path(folder) / "heartbeat.json", {"last_monitor_success_at": self.current_time(11, 35).isoformat()})
            self.assertEqual(module.run_health_check(state, view), 0)
            notice.assert_not_called()

    def test_health_check_alerts_when_calendar_year_is_missing(self):
        current = datetime(2027, 1, 4, 11, 45, tzinfo=module.TZ)
        with patch.object(module, "now", return_value=current), patch.object(module, "operational_notice", return_value=True) as notice:
            self.assertEqual(module.run_health_check({}, {}), 1)
            self.assertIn("未覆盖", notice.call_args.args[1][0])

    def test_health_check_warns_before_calendar_coverage_expires(self):
        current = datetime(2026, 12, 1, 11, 45, tzinfo=module.TZ)
        state = self.state(positions=[])
        state["data_as_of"] = "2026-11-30T15:00:00+08:00"
        view = {
            "skill_version": "2.3.0",
            "generated_at": state["generated_at"],
            "risk_state": "normal",
            "decisions": [],
        }
        with tempfile.TemporaryDirectory() as folder, patch.object(module, "now", return_value=current), patch.dict(os.environ, {
            "HEARTBEAT_STATE_FILE": str(Path(folder) / "heartbeat.json"),
        }, clear=False), patch.object(module, "operational_notice", return_value=True) as notice:
            module.save_json(Path(folder) / "heartbeat.json", {"last_monitor_success_at": datetime(2026, 12, 1, 11, 35, tzinfo=module.TZ).isoformat()})
            self.assertEqual(module.run_health_check(state, view), 1)
            self.assertIn("到期", notice.call_args.args[1][0])


if __name__ == "__main__":
    unittest.main()
