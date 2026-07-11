# 操盘策略0710只读面板

本项目显示“操盘策略0710”状态引擎生成的账户风险和已批准决策。它不登录券商、不读取账户后台、不自动下单，也不在浏览器自行计算买卖建议。

## 启动

```bash
cd /Users/johnlimacbook/Documents/财经热点
node server.js
```

服务优先使用 `http://127.0.0.1:8090/`，端口占用时依次使用8091、9000。

## 数据链路

1. 用户截图或明确成交确认形成账户事实。
2. `trading_ledger.py` 将事实追加到 `data/trading-ledger.sqlite`。
3. 引擎生成 `data/trading-state.json` 与 `data/decision-latest.json`。
4. 面板和云端提醒只读这两个JSON。

`data/panel-sync.json` 保留为原始输入兼容文件，不再直接决定买卖动作。

## 页面模块

- 今日最终建议：市场闸门、风险模式、组合结论和账户否决。
- 当前持仓：确认数量、可用数量、成本、现价、仓位和已批准动作。
- 触发提醒：仅显示已批准决策中的触发条件。
- 下一候选方向：仅显示已批准且未持有的候选，不进行本地推荐。

## 风险边界

唯一用户侧A股决策 Skill 是 `/Users/johnlimacbook/.codex/skills/caopan-strategy-0710/SKILL.md`。评分不等于概率；未经至少30笔样本外校准的设置不能标记为“买入”。重置期禁止新买，卖出后至少冷却一个完整交易日。

## 微信信号提醒

- 价格监控：GitHub云端在交易时段每5分钟检查一次，不调用AI、不消耗ChatGPT Token。
- 备用监控：GitHub Actions每5分钟检查一次。
- 主通道：PushPlus微信服务号；配置项为 `PUSHPLUS_TOKEN`，发送渠道固定为 `wechat`。
- 相同决策默认30分钟内不重复提醒；决策编号、动作、数量、触发价、确认方式和有效期会写入消息。
- 盘中紧急线立即提醒；收盘确认线只在14:50之后生成执行提醒；连续两日确认必须回到状态引擎复核。
- 过期行情不提醒，重置期或账户否决状态下不发送买入信号；卖出风控信号不受买入闸门影响。

当前持仓已经生成8条已批准规则：每只股票各一条盘中风险预警和一条14:50后收盘确认提醒。监控只发信号，不自动下单；成交后必须用截图或明确确认更新台账。

## 验证

```bash
python3 -m unittest discover -s tests -v
python3 -m py_compile scripts/cloud_monitor.py
node --check app.js
node --check server.js
python3 scripts/cloud_monitor.py --dry-run --ignore-trading-time
```

云端提醒只处理 `decision-latest.json` 中已批准的价格触发，不自动下单。
