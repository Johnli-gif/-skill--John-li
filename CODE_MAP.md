# 源码索引

更新时间：2026-07-04

用途：后续修改时先看本文件，用 `rg` 精确定位，再读取小范围源码。不要默认打开完整 `app.js` 或 `styles.css`。

## app.js 关键区域

- `207`：`defaultIntradayChecks`，旧盘中检查规则，当前页面不主展示。
- `255`：`defaultBuyCandidates`，候选买入池。
- `780`：`defaultState`，本地状态默认值。
- `903`：`state = loadState()`，状态初始化。
- `1221`：`render()`，总渲染入口。
- `1271`：`renderBattlePlan()`，当前四模块中“今日最终建议”的核心渲染。
- `1314`：`buildLeanPositionActions()`，逐只持仓动作生成。
- `1398`：`renderLeanHoldings()`，当前持仓模块。
- `1437`：`renderLeanAlerts()`，触发提醒模块。
- `1461`：`renderLeanNextTrack()`，下一候选方向模块。
- `1483`：`leanCandidateActions()`，候选买入清单排序和过滤。
- `4446`：`portfolioStats()`，组合仓位、市值、分数。
- `4629`：`marketGateView()`，市场闸门判断。
- `4720`：`refreshPublicQuotes()`，公开行情刷新。
- `4782`：`startAutoRefreshLoop()`，本地自动刷新循环。
- `4964`：`evaluatePositionSignal()`，持仓硬线和纪律信号。
- `5026`：`evaluateCandidateSignal()`，候选股触发判断。
- `6068-6288`：DOM 事件绑定。部分旧按钮保留在 `index.html` 隐藏兼容区，避免旧绑定报错。
- `6289-6292`：页面启动流程：`render()`、`applyPanelSync()`、资讯刷新、自动刷新。

## index.html 关键区域

- 四个主模块：`battle`、`holdings`、`alerts`、`nextTrack`。
- `legacy-compat`：隐藏兼容区，保留旧 DOM id 供旧事件绑定使用，不应显示给用户。

## styles.css 关键区域

- 基础布局：`.app-shell`、`.sidebar`、`.workspace`、`.content-grid`。
- 当前简版面板样式：搜索 `.lean-`。
- 旧版大工作台样式仍保留，后续拆文件或清理时再处理。

## 修改建议

1. 改今日建议：先读 `renderBattlePlan`、`buildLeanPositionActions`、`evaluatePositionSignal`。
2. 改候选股：先读 `defaultBuyCandidates`、`leanCandidateActions`、`evaluateCandidateSignal`。
3. 改市场闸门：先读 `marketGateView` 和 `refreshPublicQuotes`。
4. 改 UI 布局：先读 `index.html` 对应模块和 `styles.css` 的 `.lean-*`。
5. 改云端提醒：不要先读 `app.js`；读 `config/cloud-monitor-rules.json` 和 `scripts/cloud_monitor.py`。
