#!/usr/bin/env python3
"""
盯盘监控 v2：帝尔激光(300776) + 深科技(000021)
依赖：akshare，直接调用 stock_bid_ask_em 获取实时行情
"""
import sys, json, datetime

try:
    import akshare as ak
except Exception as e:
    raise RuntimeError("未安装 akshare，先执行: pip install akshare") from e

WATCH = [
    {"code": "300776", "name": "帝尔激光", "cost_layer": [175.052, 210.93]},
    {"code": "000021", "name": "深科技",   "cost_layer": [59.45]},
]

# 触发价
TRIGGERS = {
    "300776": {
        "stop_loss": 204.0,
        "take_profit": 218.0,
        "add_point": 208.0,
    },
    "000021": {
        "stop_loss": 58.8,
        "take_profit_high": 62.0,
        "take_profit_normal": 61.2,
        "avoid_loss": 59.5,
    },
}


def now_str():
    return datetime.datetime.now().strftime("%H:%M:%S")

def fetch_price(code: str):
    """通过 akshare 获取单只股票实时价"""
    try:
        df = ak.stock_bid_ask_em(symbol=code)
        if df is None or df.empty:
            return None
        # 找当前股票行
        row = df[df["代码"].astype(str).str.zfill(6) == code.zfill(6)]
        if row.empty:
            # 兜底：整个df只有这一只
            row = df
        price_raw = row.iloc[0].get("最新价")
        return float(price_raw) if price_raw is not None else None
    except Exception as e:
        print(f"[WARN] 拉取 {code} 失败: {e}")
        return None


def check_and_report():
    lines = []
    lines.append("=" * 55)
    lines.append(f"⏰ {now_str()}  盯盘监控 — 300776 + 000021（akshare实时）")
    lines.append("=" * 55)

    has_signal = False

    for w in WATCH:
        code = w["code"]
        name = w["name"]
        price = fetch_price(code)
        tr = TRIGGERS.get(code, {})

        if price is None:
            lines.append(f"\n⚠️ [{name} {code}] 行情获取失败，跳过")
            continue

        lines.append(f"\n【{name} {code}】 现价：{price:.2f} 元")

        # 帝尔激光 300776
        if code == "300776":
            if price >= tr.get("take_profit", 999):
                lines.append(f"  🔴 止盈信号 (>={tr['take_profit']})")
                lines.append("  → 建议：卖出300-500股，至少保留100股底仓")
                lines.append(f"  → 预期回收：{tr['take_profit'] * 400 / 10000:.1f}万元（400股计）")
                has_signal = True
            elif price <= tr.get("stop_loss", 0):
                lines.append(f"  🟣 止损信号 (<={tr['stop_loss']})")
                lines.append("  → 建议：无条件清仓，认赔约3-5%")
                has_signal = True
            elif price <= tr.get("add_point", 999):
                lines.append(f"  🟡 加仓区间 (≤{tr['add_point']})")
                lines.append("  → 说明：已盈利状态下的低吸机会，可加仓100股做T")
                has_signal = True
            else:
                lines.append(f"  📊 观望区间 {tr['add_point']:.0f} ~ {tr['take_profit']:.0f}")
                lines.append("  → 暂无信号，继续监控")

        # 深科技 000021
        elif code == "000021":
            if price >= tr.get("take_profit_high", 999):
                lines.append(f"  🔴 冲高止盈 (>= {tr['take_profit_high']})")
                lines.append("  → 建议：开盘即卖500股，不格局")
                has_signal = True
            elif price >= tr.get("take_profit_normal", 999):
                lines.append(f"  🟠 平高走 (>= {tr['take_profit_normal']})")
                lines.append("  → 建议：挂单61.2附近减仓，最迟周二离场")
                has_signal = True
            elif price <= tr.get("avoid_loss", 999):
                lines.append(f"  🟡 接近止损区间 (< {tr['avoid_loss']})")
                lines.append("  → 建议：若跌破58.8无条件割肉；若企稳59则等反弹59.8减仓")
                has_signal = True
            elif price <= tr.get("stop_loss", 0):
                lines.append(f"  🔴 止损信号 (<= {tr['stop_loss']})")
                lines.append("  → 建议：无条件止损卖出500股")
                has_signal = True
            else:
                lines.append(f"  📊 持仓观望 {tr['avoid_loss']:.1f} ~ {tr['take_profit_normal']:.1f}")
                lines.append("  → 暂无信号，建议不超过周二仍持有，见好就收")

    lines.append("")
    lines.append("-" * 55)
    lines.append("【现金管理】当前可用 31.15万 | 建议保持 32万+")
    lines.append("【本周新仓】非科技板块（券商/军工/消费），单票≤8万")
    lines.append("=" * 55)

    msg = "\n".join(lines)
    print(msg)
    return 1 if has_signal else 0


if __name__ == "__main__":
    sys.exit(check_and_report())
