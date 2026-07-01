#!/usr/bin/env python3
"""Refresh major A-share information preview data.

The dashboard needs a lightweight, dependency-free news updater. This script
pulls public finance headlines, classifies A-share-relevant items, and writes
data/major-info.json. It intentionally produces decision-support text only; it
does not create buy/sell instructions.
"""
from __future__ import annotations

import argparse
import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from collections import OrderedDict
from datetime import datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "major-info.json"
TZ = ZoneInfo("Asia/Shanghai")
SOURCE_URLS = [
    "https://finance.eastmoney.com/",
]

NEGATIVE_TERMS = [
    "暴跌", "大跌", "重挫", "跳水", "崩", "杀跌", "下跌", "利空", "风险",
    "监管", "减持", "停牌", "财务造假", "处罚", "亏损", "退市", "高位股"
]
POSITIVE_TERMS = [
    "利好", "大涨", "飙涨", "突破", "重磅", "发文", "发布", "增长",
    "上调", "中标", "回购", "扩产", "创新高"
]


CATEGORY_RULES: list[dict[str, Any]] = [
    {
        "id": "macro-liquidity-dynamic",
        "type": "经济数据",
        "stance": "双向",
        "impactLevel": "高",
        "urgency": "未来1周",
        "keywords": ["PMI", "CPI", "PPI", "社融", "信贷", "LPR", "非农", "小非农", "美联储", "通胀", "降息", "利率", "央行"],
        "focusSectors": ["券商/金融科技", "半导体设备", "AI算力"],
        "relatedCodes": ["300059", "600030", "002371", "688012", "300308"],
        "stocks": [
            {"code": "300059", "name": "东方财富", "sector": "金融科技", "reason": "风险偏好和成交额放大时弹性更高。"},
            {"code": "002371", "name": "北方华创", "sector": "半导体设备", "reason": "成长估值修复时设备龙头最能反映机构风险偏好。"},
            {"code": "300308", "name": "中际旭创", "sector": "AI算力", "reason": "全球成长估值变化时可作为科技主线温度计。"},
        ],
        "directAction": "数据或流动性利好也不直接追高，必须叠加指数放量和成长风格修复。",
        "riskNote": "若海外利率预期上行或数据利好后高开低走，降低科技新仓预算。",
    },
    {
        "id": "ai-compute-dynamic",
        "type": "科技突破",
        "stance": "偏利好",
        "impactLevel": "高",
        "urgency": "盘中/隔夜",
        "keywords": ["AI", "算力", "光模块", "CPO", "硅光", "服务器", "液冷", "数据中心", "英伟达", "Meta", "云厂商", "DeepSeek"],
        "focusSectors": ["光模块/CPO", "液冷温控", "服务器电源"],
        "relatedCodes": ["300308", "300502", "002281", "002837", "300394"],
        "stocks": [
            {"code": "300308", "name": "中际旭创", "sector": "光模块", "reason": "光模块龙头，用于判断AI算力主线是否扩散。"},
            {"code": "300502", "name": "新易盛", "sector": "光模块", "reason": "弹性高，适合观察情绪强弱，不适合弱市追高。"},
            {"code": "002837", "name": "英维克", "sector": "液冷温控", "reason": "AI服务器配套分支，适合观察二阶轮动。"},
        ],
        "directAction": "先看龙头是否放量承接，再看液冷、电源、PCB等二阶分支是否跟随。",
        "riskNote": "若只有少数高位票拉升或出现集体长上影，说明追高资金不足。",
    },
    {
        "id": "semiconductor-materials-dynamic",
        "type": "产业突破",
        "stance": "偏利好",
        "impactLevel": "高",
        "urgency": "1-2周",
        "keywords": ["半导体", "芯片", "存储", "HBM", "先进封装", "封测", "电子化学品", "国产替代", "光刻", "晶圆", "韩国"],
        "focusSectors": ["半导体设备", "先进封装", "电子化学品"],
        "relatedCodes": ["002371", "688012", "000021", "002185", "600584", "300433"],
        "stocks": [
            {"code": "002371", "name": "北方华创", "sector": "半导体设备", "reason": "设备龙头，适合作为国产替代强弱锚。"},
            {"code": "000021", "name": "深科技", "sector": "存储封测", "reason": "存储周期和封测弹性观察对象。"},
            {"code": "002185", "name": "华天科技", "sector": "封测", "reason": "你当前仍持有，适合验证封测分支是否修复。"},
        ],
        "directAction": "半导体利好必须看设备、封测、材料是否共振；单只高位票异动不作为买入依据。",
        "riskNote": "若高位芯片股继续补跌，低位分支也只观察不追。",
    },
    {
        "id": "industrial-internet-dynamic",
        "type": "政策产业",
        "stance": "偏利好",
        "impactLevel": "中高",
        "urgency": "未来1周",
        "keywords": ["工业互联网", "工业5G", "5G专网", "智能制造", "专网", "数字化", "算网", "高质量发展"],
        "focusSectors": ["工业互联网", "通信设备", "智能制造"],
        "relatedCodes": ["000063", "600498", "300124", "002747"],
        "stocks": [
            {"code": "000063", "name": "中兴通讯", "sector": "通信设备", "reason": "工业5G和算网建设的核心设备锚。"},
            {"code": "600498", "name": "烽火通信", "sector": "通信设备", "reason": "工业网络和光通信配套观察对象。"},
            {"code": "300124", "name": "汇川技术", "sector": "工控自动化", "reason": "智能制造景气改善时可作为工控龙头观察。"},
        ],
        "directAction": "政策利好只做赛道探针，等成交额和代表股同步转强后再纳入今日买入清单。",
        "riskNote": "政策兑现但个股不放量，说明资金认可不足。",
    },
    {
        "id": "robotics-dynamic",
        "type": "科技题材",
        "stance": "偏利好",
        "impactLevel": "中高",
        "urgency": "盘中/隔夜",
        "keywords": ["机器人", "人形机器人", "仿生机器人", "特斯拉", "优必选", "减速器", "伺服", "机器人概念"],
        "focusSectors": ["机器人本体", "减速器", "伺服电机"],
        "relatedCodes": ["002747", "688017", "002472", "300124"],
        "stocks": [
            {"code": "002747", "name": "埃斯顿", "sector": "机器人本体", "reason": "机器人链条中较直接的A股表达。"},
            {"code": "688017", "name": "绿的谐波", "sector": "减速器", "reason": "核心零部件弹性高，但估值和波动也高。"},
            {"code": "002472", "name": "双环传动", "sector": "传动链", "reason": "机器人和汽车传动共振时可观察。"},
        ],
        "directAction": "只在机器人分支放量且非高开低走时观察，不作为弱市重仓方向。",
        "riskNote": "题材脉冲多，若龙头冲高回落，候选全部降级观察。",
    },
    {
        "id": "power-energy-dynamic",
        "type": "能源电网",
        "stance": "双向",
        "impactLevel": "中高",
        "urgency": "夏季窗口",
        "keywords": ["电网", "特高压", "迎峰度夏", "储能", "新能源", "光伏", "电力", "用电", "油价", "煤电"],
        "focusSectors": ["电网设备", "储能", "电力运营"],
        "relatedCodes": ["600406", "002028", "000400", "300274"],
        "stocks": [
            {"code": "600406", "name": "国电南瑞", "sector": "电网自动化", "reason": "你当前持仓，适合作为电网方向中线锚。"},
            {"code": "002028", "name": "思源电气", "sector": "电网设备", "reason": "设备景气验证对象。"},
            {"code": "300274", "name": "阳光电源", "sector": "储能逆变器", "reason": "储能/新能源修复时弹性较高。"},
        ],
        "directAction": "电网能源利好优先看国电南瑞能否放量站稳23.5，不因消息直接追。",
        "riskNote": "若资金仍集中科技主线，电网利好可能慢体现。",
    },
    {
        "id": "market-risk-dynamic",
        "type": "市场风险",
        "stance": "偏利空",
        "impactLevel": "高",
        "urgency": "随时",
        "keywords": ["风险提示", "高位股", "对子顶", "涨跌停板", "交易规则", "量化私募", "监管", "财务造假", "减持", "停牌", "大跌"],
        "focusSectors": ["高位科技股", "题材连板", "量化拥挤方向"],
        "relatedCodes": ["300308", "300502", "300776", "688256"],
        "stocks": [
            {"code": "300776", "name": "帝尔激光", "sector": "高弹性设备", "reason": "你当前持仓，若高位科技风险扩散需降战术仓。"},
            {"code": "300308", "name": "中际旭创", "sector": "光模块", "reason": "高位科技情绪锚。"},
            {"code": "688256", "name": "寒武纪", "sector": "AI芯片", "reason": "高估值AI芯片情绪锚。"},
        ],
        "directAction": "出现高位股集体风险提示时，只做持仓风控，不扩大进攻仓。",
        "riskNote": "高位抱团松动会先杀弹性票，再传导到同赛道低位补涨。",
    },
]


def now() -> datetime:
    return datetime.now(TZ)


def fetch_url(url: str, timeout: int = 15) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 major-info-updater",
            "Referer": "https://finance.eastmoney.com/",
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        raw = response.read()
        content_type = response.headers.get("Content-Type", "")
    charset = "utf-8"
    match = re.search(r"charset=([\w-]+)", content_type, re.I)
    if match:
        charset = match.group(1)
    return raw.decode(charset, errors="ignore")


def normalize_title(value: str) -> str:
    value = re.sub(r"<[^>]+>", "", value)
    value = html.unescape(value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def extract_headlines(text: str, source_url: str) -> list[dict[str, str]]:
    found: "OrderedDict[str, dict[str, str]]" = OrderedDict()
    for match in re.finditer(r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', text, re.S | re.I):
        href, raw_title = match.group(1), match.group(2)
        title = normalize_title(raw_title)
        if len(title) < 8 or len(title) > 90:
            continue
        if any(noise in title for noise in ("东方财富", "Choice", "股吧", "基金", "小游戏", "小猫", "广告")):
            continue
        href = urllib.parse.urljoin(source_url, html.unescape(href))
        if not href.startswith("http"):
            continue
        key = re.sub(r"\W+", "", title.lower())
        found.setdefault(key, {"title": title, "url": href, "source": "东方财富"})
    return list(found.values())


def headline_date_score(headline: dict[str, str], today: str) -> int:
    text = headline["url"] + headline["title"]
    if today in text:
        return 8
    ymd = re.findall(r"20\d{6}", text)
    if ymd:
        try:
            latest = max(ymd)
            return max(-4, min(6, int(today) - int(latest)))
        except ValueError:
            pass
    return 0


def classify(headlines: list[dict[str, str]]) -> list[dict[str, Any]]:
    today = now().strftime("%Y%m%d")
    items = []
    claimed_titles: set[str] = set()
    for rule in CATEGORY_RULES:
        matches = []
        for headline in headlines:
            title = headline["title"]
            if any(keyword.lower() in title.lower() for keyword in rule["keywords"]):
                score = headline_date_score(headline, today)
                score += sum(2 for keyword in rule["keywords"] if keyword.lower() in title.lower())
                matches.append((score, headline))
        matches.sort(key=lambda item: item[0], reverse=True)
        picked = []
        seen = set()
        for _score, headline in matches:
            key = headline["title"]
            if key in seen or key in claimed_titles:
                continue
            picked.append(headline)
            seen.add(key)
            if len(picked) >= 5:
                break
        if not picked and matches:
            # If every matching headline was already claimed by a higher-priority
            # category, skip this category rather than duplicating the same card.
            continue
        if not picked:
            continue
        claimed_titles.update(item["title"] for item in picked)
        events = [f"{item['title']}（{item['source']}）" for item in picked[:3]]
        links = picked[:5]
        title = picked[0]["title"]
        stance = infer_stance(rule, picked)
        summary = summarize_item(rule, picked, stance)
        items.append({
            "id": rule["id"],
            "type": rule["type"],
            "stance": stance,
            "urgency": rule["urgency"],
            "impactLevel": rule["impactLevel"],
            "timing": f"{now().strftime('%m/%d %H:%M')}更新｜{picked[0]['source']}等公开财经标题",
            "title": title,
            "summary": summary,
            "events": events,
            "decisionChecks": decision_checks(rule),
            "focusSectors": rule["focusSectors"],
            "riskNote": risk_note_for_stance(rule, stance),
            "directAction": rule["directAction"],
            "relatedCodes": rule["relatedCodes"],
            "stocks": rule["stocks"],
            "links": links,
        })
    items.sort(key=item_rank, reverse=True)
    return items[:7]


def infer_stance(rule: dict[str, Any], picked: list[dict[str, str]]) -> str:
    lead = picked[0]["title"] if picked else ""
    lead_negative = sum(1 for term in NEGATIVE_TERMS if term in lead)
    lead_positive = sum(1 for term in POSITIVE_TERMS if term in lead)
    if lead_negative > lead_positive:
        return "偏利空"
    if lead_positive > lead_negative:
        return "偏利好"
    text = " ".join(item["title"] for item in picked[:3])
    negative_score = sum(1 for term in NEGATIVE_TERMS if term in text)
    positive_score = sum(1 for term in POSITIVE_TERMS if term in text)
    if negative_score > positive_score:
        return "偏利空"
    if positive_score > negative_score:
        return "偏利好"
    return rule["stance"]


def risk_note_for_stance(rule: dict[str, Any], stance: str) -> str:
    if stance == "偏利空" and rule["stance"] != "偏利空":
        return f"同一赛道出现负面标题时，先验证{rule['focusSectors'][0]}承接；若高位股继续补跌，候选全部降级观察。"
    return rule["riskNote"]


def summarize_item(rule: dict[str, Any], picked: list[dict[str, str]], stance: str) -> str:
    lead = picked[0]["title"]
    if rule["id"] == "market-risk-dynamic":
        return f"最新风险标题指向“{lead}”。先把它当作高位题材降温信号，避免在科技高波动阶段扩大仓位。"
    if stance == "偏利好":
        return f"最新催化来自“{lead}”。先看相关板块成交额和龙头承接，确认资金认可后才进入买入清单。"
    if stance == "偏利空":
        return f"最新风险来自“{lead}”。它会压低市场风险偏好，优先影响高估值和高位拥挤方向。"
    return f"最新关注点是“{lead}”。该类信息对A股风险偏好和风格切换影响较大，需要结合指数放量确认。"


def decision_checks(rule: dict[str, Any]) -> list[str]:
    return [
        "先看上证、创业板、科创50是否放量同向修复。",
        f"观察{rule['focusSectors'][0]}是否有2只以上代表股同步走强。",
        "若消息兑现后高开低走，不追买，只做持仓风控。"
    ]


def item_rank(item: dict[str, Any]) -> int:
    impact = {"高": 40, "中高": 30, "中": 20}.get(item.get("impactLevel"), 10)
    urgency = 25 if any(key in item.get("urgency", "") for key in ("盘中", "随时")) else 18
    event_bonus = min(15, len(item.get("events", [])) * 5)
    risk_bonus = 8 if item.get("stance") == "偏利空" else 0
    return impact + urgency + event_bonus + risk_bonus


def build_payload(headlines: list[dict[str, str]], items: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "updatedAt": now().isoformat(timespec="seconds"),
        "source": "东方财富财经首页",
        "sourceUrls": SOURCE_URLS,
        "headlineCount": len(headlines),
        "items": items,
        "note": "自动抓取公开财经标题后按A股相关性分类；仅作重大信息雷达，不替代持仓截图、行情刷新和完整AI判断。"
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Update major A-share information preview")
    parser.add_argument("--output", default=str(OUTPUT), help="output JSON path")
    args = parser.parse_args()

    all_headlines = []
    errors = []
    for url in SOURCE_URLS:
        try:
            text = fetch_url(url)
            all_headlines.extend(extract_headlines(text, url))
        except Exception as exc:  # noqa: BLE001 - script should degrade gracefully.
            errors.append(f"{url}: {exc}")
    deduped = list({item["title"]: item for item in all_headlines}.values())
    items = classify(deduped)
    payload = build_payload(deduped, items)
    if errors:
        payload["errors"] = errors
    output = Path(args.output).expanduser()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"UPDATED {output} items={len(items)} headlines={len(deduped)}")
    return 0 if items else 1


if __name__ == "__main__":
    sys.exit(main())
