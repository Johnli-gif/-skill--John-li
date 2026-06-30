#!/usr/bin/env python3
import json, os, re, sys, time
from datetime import datetime

try:
    import akshare as ak
except Exception as e:
    raise RuntimeError("未安装 akshare，请先执行 pip install akshare") from e

MARKET = {
    "000001.SH": "上证指数",
    "399001.SZ": "深证成指",
    "399006.SZ": "创业板指",
    "899050.BJ": "北证50",
    "000300.SH": "沪深300",
    "000016.SH": "上证50",
    "000905.SH": "中证500",
    "399303.SZ": "国证2000",
    "399672.SZ": "创业板50",
    "399008.SZ": "中小300",
}
# 北交所存在含 B 的标的，如 834/839 开头，这里只做指数代表性覆盖

PORTFOLIO = {
    "002156.SZ": {"name": "通富微电", "quantity": 1100, "cost": 75.343},
    "002463.SZ": {"name": "沪电股份", "quantity": 100, "cost": 84.500},
    "002837.SZ": {"name": "英维克",   "quantity": 400, "cost": 78.201},
    "300776.SZ": {"name": "帝尔激光", "quantity": 100, "cost": 175.052},
}

MIN_SWING_PCT = 0.003
PRICE_JUMP = 0.015

RESULT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "market", "latest")
RESULT_FILE = os.path.join(RESULT_DIR, "quotes.json")


def floor(x):
    return x * (1 - MIN_SWING_PCT)


def freeze(x):
    return x * (1 + PRICE_JUMP)


def normalize_code(code: str) -> str:
    code = code.strip()
    if code.startswith(("SH", "SZ", "BJ")):
        prefix, num = code[:2], code[2:]
        return f"{num}.{prefix}"
    if code.startswith(("sh", "sz", "bj")):
        prefix, num = code[:2], code[2:]
        return f"{num}.{prefix.upper()}"
    if code.startswith("6"):
        return f"{code}.SH"
    if code.startswith(("0", "3")):
        return f"{code}.SZ"
    if code.startswith(("8", "4")):
        return f"{code}.SZ"  # akshare最常见的北交所格式为 8xxxxx/SZ 或 8xxxxx/BJ
    return f"{code}.SH"


def normalize_key(code: str) -> str:
    return normalize_code(code).upper()


def fetch_spot() -> dict:
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    result = {"fetched_at": now, "indices": [], "positions": []}

    # 指数
    symbols = [k.split(".")[0] for k in MARKET.keys()]
    print(f"[INFO] 拉取指数: {symbols}")
    try:
        df = ak.stock_zh_index_spot_em()
        for _, row in df.to_dict("records"):
            sym = str(row.get("代码", "")).strip()
            if sym not in symbols:
                continue
            name = row.get("名称", "").strip()
            price = to_float(row.get("最新价"))
            chg_pct = to_float(row.get("涨跌幅"))
            result["indices"].append({
                "code": sym,
                "name": name,
                "price": price,
                "chg_pct": chg_pct,
            })
    except Exception as e:
        print(f"[WARN] 指数拉取失败: {e}")

    # 持仓个股
    pos_map = {}
    for sym, meta in PORTFOLIO.items():
        pos_map[normalize_key(sym)] = meta

    pos_symbols = []
    for sym in PORTFOLIO.keys():
        s = normalize_key(sym)
        pos_symbols.append(s.split(".")[0])

    print(f"[INFO] 拉取个股: {pos_symbols}")
    try:
        df = ak.stock_bid_ask_em(symbol=",".join(pos_symbols))
        for _, row in df.to_dict("records"):
            sym = str(row.get("代码", "")).strip()
            if sym not in pos_symbols:
                continue
            normal = normalize_key(sym)
            meta = pos_map.get(normal)
            price = to_float(row.get("最新价"))
            if meta and price:
                pnl = (price - meta["cost"]) / meta["cost"]
                result["positions"].append({
                    "code": normal,
                    "name": meta["name"],
                    "quantity": meta["quantity"],
                    "cost": meta["cost"],
                    "current_price": price,
                    "pnl_pct": round(pnl * 100, 2),
                })
    except Exception as e:
        print(f"[WARN] 个股拉取失败: {e}")

    # 若指数列表为空，用东方财富通用接口兜底
    if not result["indices"]:
        try:
            df = ak.stock_zh_index_spot_em()
            chosen = []
            for _, row in df.to_dict("records"):
                name = str(row.get("名称", "")).strip()
                code = str(row.get("代码", "")).strip()
                if name in ["上证指数", "深证成指", "创业板指"]:
                    chosen.append({
                        "code": code,
                        "name": name,
                        "price": to_float(row.get("最新价")),
                        "chg_pct": to_float(row.get("涨跌幅")),
                    })
            result["indices"] = chosen[:3]
        except Exception as e:
            print(f"[WARN] 兜底失败: {e}")

    return result


def analyze_market_gate(result: dict) -> dict:
    nfz = next((x for x in result.get("indices", []) if x.get("name") == "上证指数"), {})
    cyb = next((x for x in result.get("indices", []) if x.get("name") == "创业板指"), {})
    nfz_chg = nfz.get("chg_pct") or 0
    cyb_chg = cyb.get("chg_pct") or 0

    if nfz_chg < -0.8 or cyb_chg < -1.0:
        gate = "dead"
        action = "不开新仓，只处理持仓止损"
    elif nfz_chg > 0.5 and cyb_chg > 0.3:
        gate = "open"
        action = "允许按触发价新建仓位"
    else:
        gate = "neutral"
        action = "小仓试探，观望为主"

    return {
        "上证": {"name": "上证指数", "chg_pct": nfz_chg, "price": nfz.get("price")},
        "创业板": {"name": "创业板指", "chg_pct": cyb_chg, "price": cyb.get("price")},
        "gate": gate,
        "action": action,
    }


def analyze_positions(result: dict) -> list:
    out = []
    for p in result.get("positions", []):
        price = p.get("current_price") or 0
        pnl = p.get("pnl_pct") or 0
        out.append({
            "code": p.get("code"),
            "name": p.get("name"),
            "quantity": p.get("quantity"),
            "cost": p.get("cost"),
            "current_price": price,
            "pnl_pct": pnl,
            "signal": "watch",
        })
    return out


def drain(result: dict) -> dict:
    market = analyze_market_gate(result)
    positions = analyze_positions(result)
    out = {
        "fetched_at": result.get("fetched_at"),
        "meta": "akspot.mac.kf(v1)",
        "market_status": market,
        "positions": positions,
    }
    return out


def to_float(v):
    if v is None:
        return None
    try:
        return float(v)
    except Exception:
        return None


def save(data: dict):
    os.makedirs(RESULT_DIR, exist_ok=True)
    with open(RESULT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[OK] 写入 {RESULT_FILE}")


def main():
    print("[INFO] akspot 启动...")
    spot = fetch_spot()
    drained = drain(spot)
    save(drained)
    print("[INFO] 完成。")
    sys.exit(0)


if __name__ == "__main__":
    main()
