const STORAGE_KEY = "ashare-hotspot-workbench";

const sectorSeed = [
  {
    name: "人工智能算力",
    theme: "AI基础设施",
    catalysts: "国产算力、服务器更新、云厂商资本开支",
    heat: 89,
    momentum: 84,
    risk: 63,
    beta: 8,
    horizon: "短线",
    cap: "中小盘",
    tags: ["AI", "算力", "半导体"]
  },
  {
    name: "半导体设备",
    theme: "自主可控",
    catalysts: "先进封装、设备国产替代、订单兑现",
    heat: 82,
    momentum: 75,
    risk: 49,
    beta: 6,
    horizon: "波段",
    cap: "均衡",
    tags: ["半导体", "设备", "国产替代"]
  },
  {
    name: "创新药",
    theme: "医药修复",
    catalysts: "BD交易、医保谈判预期、海外数据读出",
    heat: 73,
    momentum: 61,
    risk: 42,
    beta: 4,
    horizon: "中线",
    cap: "均衡",
    tags: ["医药", "创新药", "出海"]
  },
  {
    name: "低空经济",
    theme: "产业政策",
    catalysts: "地方试点、空域改革、订单落地",
    heat: 78,
    momentum: 80,
    risk: 68,
    beta: 9,
    horizon: "短线",
    cap: "中小盘",
    tags: ["低空经济", "军工", "政策"]
  },
  {
    name: "高股息央企",
    theme: "红利防守",
    catalysts: "分红提升、市值管理、利率下行配置",
    heat: 66,
    momentum: 55,
    risk: 24,
    beta: 2,
    horizon: "中线",
    cap: "大盘",
    tags: ["高股息", "央企", "防守"]
  },
  {
    name: "新能源车链",
    theme: "景气反转",
    catalysts: "价格企稳、出海销量、固态电池主题",
    heat: 69,
    momentum: 64,
    risk: 52,
    beta: 6,
    horizon: "波段",
    cap: "均衡",
    tags: ["新能源", "汽车", "电池"]
  }
];

const runwaySeed = [
  {
    track: "先进封装与半导体设备",
    window: "1-2周",
    score: 86,
    probability: 63,
    expectedMove: "6%-12%",
    reason: "资金容易从AI算力扩散到上游设备，国产替代逻辑清晰，弹性比高股息更强。",
    detail: "这条线的核心不是讲故事，而是订单、国产替代和AI算力资本开支三者共振。更适合等分歧低吸，不适合连续大阳后追。",
    trigger: "板块指数放量站上5日线，龙头回踩不破前一日低点。",
    invalid: "放量长上影后次日不能修复，或成交额连续两日缩量。",
    names: [
      { code: "002371", name: "北方华创", role: "设备龙头，适合趋势确认后低吸", expectedMove: "5%-10%", probability: 58, analysis: "胜在确定性和机构识别度，缺点是弹性通常不如小票。" },
      { code: "688012", name: "中微公司", role: "刻蚀设备核心，偏中线观察", expectedMove: "4%-9%", probability: 56, analysis: "更像趋势确认标的，适合看板块持续性，不适合当情绪冲锋票。" },
      { code: "688072", name: "拓荆科技", role: "薄膜沉积弹性，波动大要控仓", expectedMove: "7%-14%", probability: 51, analysis: "弹性更大，但一旦板块分歧，回撤也会更直接。" }
    ],
    tags: ["半导体", "设备", "国产替代"]
  },
  {
    track: "低空经济",
    window: "1-2周",
    score: 79,
    probability: 56,
    expectedMove: "8%-16%",
    reason: "政策与订单催化密集时容易形成短线脉冲，但追高风险也最大。",
    detail: "这条线偏题材交易，强的时候很强，弱的时候杀估值很快。只适合小仓位、按强弱纪律交易，不能把它当稳健配置。",
    trigger: "前排股分歧后继续新高，后排补涨不乱冲。",
    invalid: "龙头跌破10日线且板块跌幅扩大。",
    names: [
      { code: "002085", name: "万丰奥威", role: "情绪锚，适合只看强弱不恋战", expectedMove: "8%-18%", probability: 49, analysis: "辨识度高，但拥挤度也高，买点必须苛刻。" },
      { code: "300719", name: "安达维尔", role: "航空维修弹性标的，小仓试错", expectedMove: "10%-20%", probability: 45, analysis: "弹性来自小市值和军工低空映射，失败时也容易快速回撤。" },
      { code: "688333", name: "铂力特", role: "航空制造链，偏趋势观察", expectedMove: "6%-12%", probability: 52, analysis: "逻辑更偏制造链，走势通常比纯情绪票稳一点。" }
    ],
    tags: ["低空经济", "军工", "政策"]
  },
  {
    track: "创新药出海",
    window: "1-2周",
    score: 74,
    probability: 54,
    expectedMove: "4%-9%",
    reason: "医药经历较长调整后，BD交易和临床数据容易触发估值修复。",
    detail: "创新药适合在市场风险偏好回落时做防守反击，催化看BD、临床数据和医保预期。它不是最快的线，但容易走出持续修复。",
    trigger: "创新药指数缩量回踩后放量反包，港股医药同步企稳。",
    invalid: "消息兑现后高开低走，或板块无法跑赢沪深300。",
    names: [
      { code: "600276", name: "恒瑞医药", role: "大市值核心，适合稳健仓位", expectedMove: "3%-7%", probability: 57, analysis: "弹性一般，但更适合作为医药方向的稳定锚。" },
      { code: "688235", name: "百济神州-U", role: "创新药龙头，适合看产业趋势", expectedMove: "4%-9%", probability: 52, analysis: "更看产业趋势和港股联动，短线爆发力不一定最强。" },
      { code: "688506", name: "百利天恒-U", role: "弹性强，必须小仓跟踪", expectedMove: "8%-16%", probability: 43, analysis: "赔率高但不确定性高，适合作为小仓观察，不适合重仓押。" }
    ],
    tags: ["医药", "创新药", "出海"]
  },
  {
    track: "机器人与智能制造",
    window: "1-2周",
    score: 72,
    probability: 51,
    expectedMove: "5%-11%",
    reason: "AI应用从软件扩散到硬件端时，机器人链容易被资金提前试探。",
    detail: "机器人线需要看多个分支是否同时放量，单独一两只股异动不够。真正可参与的信号是减速器、伺服、电机形成合力。",
    trigger: "减速器、伺服、电机三个分支至少两个同步放量。",
    invalid: "只有单只题材股拉升，板块成交额不跟。",
    names: [
      { code: "002747", name: "埃斯顿", role: "工业机器人核心，适合右侧确认", expectedMove: "5%-10%", probability: 50, analysis: "行业辨识度较高，但需要成交额配合。" },
      { code: "688017", name: "绿的谐波", role: "减速器弹性，波动较大", expectedMove: "7%-14%", probability: 45, analysis: "弹性好，但更吃市场情绪，不能无脑追。" },
      { code: "002472", name: "双环传动", role: "传动链稳健一些，适合观察回踩", expectedMove: "4%-8%", probability: 54, analysis: "相对稳一点，适合等缩量回踩后的确认。" }
    ],
    tags: ["AI", "机器人", "智能制造"]
  }
];

const knownStockCatalog = [
  { name: "思源电气", code: "002028", aliases: ["思源电器", "思原电气"] },
  { name: "通富微电", code: "002156", aliases: ["通富微申", "通富微由", "通富微屯", "通富徽电"] },
  { name: "沪电股份", code: "002463", aliases: ["沪电股价", "沪申股份", "沪电股分"] },
  { name: "英维克", code: "002837", aliases: ["英维克", "英堆克", "英维充"] },
  { name: "汇川技术", code: "300124", aliases: ["汇川科技", "汇川技木"] },
  { name: "帝尔激光", code: "300776", aliases: ["帝尔激光", "帝尓激光", "帝尔敫光"] },
  { name: "阳光电源", code: "300274" },
  { name: "蓝思科技", code: "300433" },
  { name: "华天科技", code: "002185" },
  { name: "国盾量子", code: "688027" },
  { name: "光迅科技", code: "002281" },
  { name: "北方华创", code: "002371" },
  { name: "中微公司", code: "688012" },
  { name: "拓荆科技", code: "688072" },
  { name: "恒瑞医药", code: "600276", aliases: ["恒瑞医约", "恒瑞医葯", "恒端医药", "恒端医约", "恒端医葯"] },
  { name: "国电南瑞", code: "600406", aliases: ["国申南瑞", "囯电南瑞", "国电南端"] }
];

const latestKnownPositions = [
  {
    name: "恒瑞医药",
    code: "600276",
    quantity: 500,
    cost: 49.900,
    currentPrice: 52.93,
    marketValue: 26465,
    pnl: 1515,
    stop: "跌破50.8减仓，跌破49.9退出新增仓",
    trigger: "站稳53.5继续持有，55上方看量分批保护利润",
    plan: "创新药修复仓，先持有观察，不追高加仓"
  },
  {
    name: "国电南瑞",
    code: "600406",
    quantity: 1000,
    cost: 22.935,
    currentPrice: 23.40,
    marketValue: 23400,
    pnl: 465,
    stop: "跌破22.6减仓，跌破22.3退出新增仓",
    trigger: "站稳23.5且电网板块放量，可继续持有",
    plan: "电网自动化仓，偏中线观察，短线不追"
  },
  {
    name: "帝尔激光",
    code: "300776",
    quantity: 100,
    cost: 175.052,
    currentPrice: 199.00,
    marketValue: 19900,
    pnl: 2394.8,
    stop: "跌破188不加；跌破183处理",
    trigger: "卖出或减仓当天禁止买回；次日后再看市场、赛道、个股三确认",
    plan: "战术仓冷却观察，不因单价回到区间自动加回"
  }
];

const defaultIntradayChecks = [
  {
    id: "open-index-risk",
    slot: "09:45",
    title: "先判定市场是否允许进攻",
    condition: "上证不能继续快速跌破4000，创业板不能继续单边下杀；科技主线至少有一个分支红盘承接。",
    action: "若指数继续弱，只执行减仓和风控，不开新仓。",
    impact: "决定当天是否维持28%-35%防守仓位。",
    level: "risk"
  },
  {
    id: "open-tongfu-half",
    slot: "09:45",
    title: "通富微电70.8硬线",
    condition: "通富微电跌破70.8，或跌破后5-10分钟不能收回。",
    action: "减持一半仓位，按约500-600股处理；若放量跌破且弱于封测板块，优先减600股。",
    impact: "释放约3.6万-4.3万资金，防止亏损仓拖累30天目标。",
    level: "sell"
  },
  {
    id: "open-glass-confirm",
    slot: "09:45",
    title: "玻璃基板/TGV是否继续强",
    condition: "帝尔激光、蓝思科技、凯盛科技、沃格光电至少2只强于大盘，且没有集体高开低走。",
    action: "只在确认后考虑围绕帝尔或蓝思做科技修复；未确认则不加仓。",
    impact: "决定是否把总仓位从28%提高到35%-45%。",
    level: "buy"
  },
  {
    id: "open-held-profit",
    slot: "09:45",
    title: "利润仓先保护",
    condition: "沪电跌破145，或英维克跌破81.5。",
    action: "沪电跌破145清100股；英维克跌破81.5减200股。",
    impact: "保护已有利润，避免科技链一起回撤。",
    level: "sell"
  },
  {
    id: "close-position-raise",
    slot: "14:30",
    title: "是否提高到35%-45%仓位",
    condition: "指数止跌，玻璃基板或先进封装继续强，持仓未触发硬止损。",
    action: "满足条件才加仓；优先帝尔回踩186-190企稳或站稳200，次选蓝思确认突破57.5。",
    impact: "用于第一阶段冲击53万-54.5万，不满足则继续现金等待。",
    level: "buy"
  },
  {
    id: "close-no-hope-hold",
    slot: "14:30",
    title: "尾盘不靠希望持仓",
    condition: "通富仍低于70.8、英维克低于81.5、沪电低于145，或帝尔跌破188。",
    action: "尾盘按硬线处理，不把弱势仓留到隔夜。",
    impact: "控制隔夜风险，避免第二天被动低开处理。",
    level: "risk"
  }
];

const defaultBuyCandidates = [
  {
    id: "dier-laser",
    name: "帝尔激光",
    code: "300776",
    track: "玻璃基板/TGV设备",
    priority: "第一优先",
    budget: "冷却后再评估，未三确认不生成买入预算",
    capitalMin: 19000,
    capitalMax: 21000,
    entryLow: 186,
    entryHigh: 200,
    stopPrice: 183,
    noChasePrice: 205,
    trigger: "减仓/卖出当天禁止买回；冷却期后需市场、玻璃基板/TGV赛道和个股量价三确认。",
    noChase: "不做同日回补；205以上不追，只等次日后重新确认。",
    stop: "跌破198处理战术仓；跌破183说明中期结构失效。",
    target: "212收回才恢复趋势观察，222以上再看移动止盈。",
    probability: 58,
    expectedMove: "-5%至+16%",
    scope: "持仓联动",
    tags: ["玻璃基板", "TGV", "设备", "科技"],
    reason: "当前作为战术观察仓，不再按单一价位自动加回；只有冷却期结束且三确认同时成立才重新进入买入清单。"
  },
  {
    id: "lens-tech",
    name: "蓝思科技",
    code: "300433",
    track: "玻璃基板/消费电子材料",
    priority: "第二优先",
    budget: "约3万-4万试仓",
    capitalMin: 30000,
    capitalMax: 40000,
    entryLow: 53.5,
    entryHigh: 57.5,
    stopPrice: 52.6,
    noChasePrice: 59,
    trigger: "53.5-55企稳，或突破57.5并能站住。",
    noChase: "放量长上影或高开低走不买。",
    stop: "跌破52.6止损或撤回观察。",
    target: "60/63分批看，第一目标不够强就不加。",
    probability: 55,
    expectedMove: "-4%至+10%",
    scope: "全局赛道",
    tags: ["玻璃基板", "消费电子", "材料", "科技"],
    reason: "波动低于部分高弹性票，可作为玻璃基板方向的分散试仓。"
  },
  {
    id: "huatian-tech",
    name: "华天科技",
    code: "002185",
    track: "先进封装/封测替代",
    priority: "第三优先",
    budget: "约3万-5万，需先减通富风险",
    capitalMin: 30000,
    capitalMax: 50000,
    entryLow: 22,
    entryHigh: 23.2,
    stopPrice: 21.3,
    noChasePrice: 24,
    trigger: "22.0-22.6企稳，或突破23.2确认。",
    noChase: "通富未减仓前不叠加封测仓位。",
    stop: "跌破21.3止损。",
    target: "24.2/25.5分批止盈。",
    probability: 55,
    expectedMove: "-4%至+9%",
    scope: "持仓替代",
    tags: ["先进封装", "封测", "半导体", "科技"],
    reason: "适合在通富减仓后作为封测链替代，不适合与通富重仓叠加。"
  },
  {
    id: "zhongji-innolight",
    name: "中际旭创",
    code: "300308",
    track: "AI算力/光模块",
    priority: "全局第一梯队",
    budget: "约3万-5万试仓",
    capitalMin: 30000,
    capitalMax: 50000,
    entryMode: "relative",
    stopPct: 7,
    noChasePct: 5.5,
    triggerPctLow: -1.2,
    triggerPctHigh: 3.2,
    allowPullback: true,
    trigger: "AI算力主线放量，个股0%-3.2%温和走强，或小幅回踩后从低点修复。",
    noChase: "单日涨幅超过5.5%不追，等回踩或次日确认。",
    stop: "买入后按约7%动态止损，跌破主线强度撤回观察。",
    target: "强势看8%-12%，第一目标不够强就分批兑现。",
    probability: 58,
    expectedMove: "-6%至+12%",
    scope: "全局赛道",
    tags: ["AI", "算力", "光模块", "科技"],
    reason: "光模块是AI算力链核心锚，适合用来观察全局科技主线是否重新起飞。"
  },
  {
    id: "naura",
    name: "北方华创",
    code: "002371",
    track: "半导体设备/国产替代",
    priority: "全局稳健观察",
    budget: "约4万-6万试仓",
    capitalMin: 40000,
    capitalMax: 60000,
    entryMode: "relative",
    stopPct: 6.5,
    noChasePct: 4.8,
    triggerPctLow: -1,
    triggerPctHigh: 2.8,
    allowPullback: true,
    trigger: "半导体设备板块放量强于大盘，个股温和走强或回踩修复。",
    noChase: "大涨超过4.8%不追，等板块分歧回踩。",
    stop: "买入后按约6.5%动态止损，板块失去强度则不加。",
    target: "强势看6%-10%，更适合趋势确认而非情绪冲锋。",
    probability: 57,
    expectedMove: "-5%至+10%",
    scope: "全局赛道",
    tags: ["半导体", "设备", "国产替代", "科技"],
    reason: "半导体设备龙头，适合在资金从AI扩散到国产替代时提前关注。"
  },
  {
    id: "eston",
    name: "埃斯顿",
    code: "002747",
    track: "机器人/智能制造",
    priority: "全局轮动观察",
    budget: "约2万-3万试仓",
    capitalMin: 20000,
    capitalMax: 30000,
    entryMode: "relative",
    stopPct: 8,
    noChasePct: 6,
    triggerPctLow: -1.5,
    triggerPctHigh: 3.5,
    allowPullback: true,
    trigger: "机器人板块至少两个分支同步放量，个股温和走强或回踩修复。",
    noChase: "涨幅超过6%不追，机器人题材波动大，只做低吸或确认。",
    stop: "买入后按约8%动态止损，板块只拉单票则撤回观察。",
    target: "强势看7%-12%，不强则短线处理。",
    probability: 52,
    expectedMove: "-7%至+12%",
    scope: "全局赛道",
    tags: ["机器人", "智能制造", "工业自动化", "科技"],
    reason: "机器人是AI硬件扩散方向，适合做下一阶段轮动备选。"
  },
  {
    id: "hengrui",
    name: "恒瑞医药",
    code: "600276",
    track: "创新药/医药修复",
    priority: "全局防守修复",
    budget: "约3万-5万试仓",
    capitalMin: 30000,
    capitalMax: 50000,
    entryMode: "relative",
    stopPct: 5.5,
    noChasePct: 4,
    triggerPctLow: -0.8,
    triggerPctHigh: 2.2,
    allowPullback: true,
    trigger: "创新药板块缩量企稳后放量修复，个股温和走强。",
    noChase: "涨幅超过4%不追，医药修复更适合低吸。",
    stop: "买入后按约5.5%动态止损，板块弱于沪深300则撤回。",
    target: "强势看4%-8%，偏防守修复。",
    probability: 54,
    expectedMove: "-4%至+8%",
    scope: "全局赛道",
    tags: ["医药", "创新药", "出海", "防守"],
    reason: "当科技主线波动过大时，创新药可作为防守反击方向。"
  },
  {
    id: "nari",
    name: "国电南瑞",
    code: "600406",
    track: "电网设备/特高压",
    priority: "全局防守轮动",
    budget: "约3万-5万试仓",
    capitalMin: 30000,
    capitalMax: 50000,
    entryMode: "relative",
    stopPct: 5.5,
    noChasePct: 4.2,
    triggerPctLow: -0.8,
    triggerPctHigh: 2.5,
    allowPullback: true,
    trigger: "电网设备放量强于大盘，个股温和走强或回踩修复。",
    noChase: "涨幅超过4.2%不追，防守线不做情绪追涨。",
    stop: "买入后按约5.5%动态止损，板块资金不认可则撤回。",
    target: "强势看4%-8%，用于科技回撤时的轮动备选。",
    probability: 53,
    expectedMove: "-4%至+8%",
    scope: "全局赛道",
    tags: ["电网设备", "特高压", "电力设备", "防守"],
    reason: "电网设备是迎峰度夏和电网投资的稳健观察方向，不依赖当前持仓。"
  }
];

const positionTrackTagMap = {
  "002156": ["先进封装", "封测", "半导体", "科技"],
  "002463": ["AI", "算力", "PCB", "服务器", "科技"],
  "002837": ["AI", "算力", "液冷", "数据中心", "科技"],
  "300776": ["玻璃基板", "TGV", "设备", "科技"],
  "002028": ["电网设备", "特高压", "电力设备"],
  "300124": ["机器人", "智能制造", "工业自动化"],
  "300274": ["新能源", "储能", "电力设备"],
  "000021": ["存储芯片", "半导体", "科技"],
  "002185": ["先进封装", "封测", "半导体", "科技"],
  "300433": ["玻璃基板", "消费电子", "材料", "科技"],
  "600276": ["创新药", "医药", "防守"],
  "600406": ["电网设备", "特高压", "电力设备"]
};

const broadConflictTags = new Set(["科技", "设备", "材料", "防守", "国产替代"]);

const tradeMechanismPolicy = {
  version: "2026-07-02-focused-right-side-swing",
  defaultMode: "赛道埋伏+趋势持有",
  maxActiveStocks: 3,
  maxSectorTracks: 3,
  strongMarketHighUpsideMaxExposure: 80,
  strongMarketMediumUpsideExposureRange: "30%-50%",
  weakMarketDefaultExposure: 0,
  defaultTradeDirection: "右侧趋势波段",
  actionAdviceAfter: "10:00",
  lossReviewPct: -5,
  profitHalfProtectPct: 20,
  sameDayRebuyBlocked: true,
  fullExitCoolingTradingDays: 1,
  buyGateLabels: ["市场闸门", "赛道确认", "个股量价"],
  note: "30天目标只做进度校验；默认右侧趋势波段，10点后触发操作，超过3只先减弱换强。"
};

const stockRecommendationProfileOverrides = {
  "000021": { heat: "当下热门赛道", valuation: "正常估值", risk: "中风险", oneMonthMove: "-6%至+12%", holdingDays: "5-10天" },
  "002156": { heat: "当下热门赛道", valuation: "正常估值", risk: "中高风险", oneMonthMove: "-8%至+12%", holdingDays: "3-7天" },
  "002185": { heat: "当下热门赛道", valuation: "正常估值", risk: "中风险", oneMonthMove: "-5%至+10%", holdingDays: "5-10天" },
  "002463": { heat: "当下热门赛道", valuation: "高估值", risk: "中风险", oneMonthMove: "-7%至+12%", holdingDays: "5-10天" },
  "002837": { heat: "当下热门赛道", valuation: "高估值", risk: "中风险", oneMonthMove: "-7%至+13%", holdingDays: "5-10天" },
  "300433": { heat: "当下热门赛道", valuation: "正常估值", risk: "中风险", oneMonthMove: "-5%至+12%", holdingDays: "5-12天" },
  "300776": { heat: "当下热门赛道", valuation: "高估值", risk: "中风险", oneMonthMove: "-8%至+18%", holdingDays: "5-12天" },
  "600276": { heat: "中性赛道", valuation: "正常估值", risk: "低风险", oneMonthMove: "-4%至+8%", holdingDays: "10-20天" },
  "600406": { heat: "中性赛道", valuation: "低估值", risk: "低风险", oneMonthMove: "-3%至+7%", holdingDays: "10-20天" }
};

const sectorPrepositionProbeSeed = [
  {
    track: "AI算力/通信",
    status: "热门锚+分歧观察",
    thesis: "用于判断科技风险偏好和高弹性资金强弱，不默认作为低位首选。",
    catalyst: "云厂商AI资本开支、国产算力订单、通信链技术升级。",
    probes: [
      { code: "300308", name: "中际旭创", role: "光模块龙头" },
      { code: "300502", name: "新易盛", role: "弹性龙头" },
      { code: "002463", name: "沪电股份", role: "AI PCB" },
      { code: "002837", name: "英维克", role: "液冷温控" }
    ],
    candidates: ["300308", "300502"],
    lowPosition: false
  },
  {
    track: "半导体设备/先进封装/存储链",
    status: "科技低位轮动",
    thesis: "当科技主线没有彻底退潮时，优先观察设备、封测、存储等国产替代分支能否接力。",
    catalyst: "HBM、Chiplet、国产存储、封测扩产、先进封装设备订单。",
    probes: [
      { code: "002371", name: "北方华创", role: "设备龙头" },
      { code: "688012", name: "中微公司", role: "设备龙头" },
      { code: "000021", name: "深科技", role: "存储封测" },
      { code: "002185", name: "华天科技", role: "封测替代" },
      { code: "600584", name: "长电科技", role: "封测龙头" }
    ],
    candidates: ["002371", "000021", "002185"],
    lowPosition: true
  },
  {
    track: "机器人/智能制造",
    status: "AI硬件扩散观察",
    thesis: "观察AI应用从软件、算力向制造端扩散时，机器人链是否形成分支共振。",
    catalyst: "人形机器人、工业自动化订单、减速器/伺服/电机多分支放量。",
    probes: [
      { code: "002747", name: "埃斯顿", role: "机器人本体" },
      { code: "688017", name: "绿的谐波", role: "减速器" },
      { code: "002472", name: "双环传动", role: "传动链" },
      { code: "300124", name: "汇川技术", role: "工控伺服" }
    ],
    candidates: ["002747"],
    lowPosition: true
  },
  {
    track: "创新药/医药修复",
    status: "防守反击",
    thesis: "当科技波动加大或指数风险偏好回落时，医药修复可作为低相关方向。",
    catalyst: "BD出海、临床数据、医保预期、港股医药联动。",
    probes: [
      { code: "600276", name: "恒瑞医药", role: "创新药核心" },
      { code: "688235", name: "百济神州-U", role: "创新药龙头" },
      { code: "688506", name: "百利天恒-U", role: "弹性创新药" }
    ],
    candidates: ["600276"],
    lowPosition: true
  },
  {
    track: "电网/电力设备",
    status: "夏季窗口",
    thesis: "迎峰度夏、电网投资和特高压催化出现时，适合作为科技仓的防守轮动。",
    catalyst: "用电负荷、电网投资、特高压、配网改造、储能并网。",
    probes: [
      { code: "600406", name: "国电南瑞", role: "电网自动化" },
      { code: "002028", name: "思源电气", role: "一次设备" },
      { code: "000400", name: "许继电气", role: "电网设备" },
      { code: "300274", name: "阳光电源", role: "储能逆变器" }
    ],
    candidates: ["600406"],
    lowPosition: true
  },
  {
    track: "新能源/储能",
    status: "景气反转观察",
    thesis: "不追长期下行尾部，只有价格、订单、政策或出清信号同步改善才纳入试仓。",
    catalyst: "储能招标、光伏价格企稳、海外需求、并网政策。",
    probes: [
      { code: "300750", name: "宁德时代", role: "电池锚" },
      { code: "300274", name: "阳光电源", role: "逆变器/储能" },
      { code: "002812", name: "恩捷股份", role: "材料弹性" },
      { code: "688599", name: "天合光能", role: "光伏组件" }
    ],
    candidates: [],
    lowPosition: true
  },
  {
    track: "金融/券商",
    status: "风险偏好温度计",
    thesis: "指数放量反攻时，券商和金融科技可验证市场是否进入进攻模式。",
    catalyst: "成交额放大、政策预期、资本市场改革、指数突破。",
    probes: [
      { code: "300059", name: "东方财富", role: "金融科技" },
      { code: "600030", name: "中信证券", role: "券商龙头" },
      { code: "601688", name: "华泰证券", role: "券商龙头" }
    ],
    candidates: [],
    lowPosition: false
  },
  {
    track: "消费电子/玻璃基板",
    status: "科技材料分支",
    thesis: "关注材料、设备、终端创新形成共振时的低位切换机会。",
    catalyst: "玻璃基板/TGV、AI终端、折叠屏、消费电子补库。",
    probes: [
      { code: "300433", name: "蓝思科技", role: "消费电子材料" },
      { code: "300776", name: "帝尔激光", role: "TGV设备" },
      { code: "000725", name: "京东方A", role: "面板锚" }
    ],
    candidates: ["300433", "300776"],
    lowPosition: true
  },
  {
    track: "低空经济/军工",
    status: "政策题材观察",
    thesis: "只在政策、订单和板块成交额同步确认时参与，避免单纯题材脉冲。",
    catalyst: "低空试点、商业化订单、军工订单、产业会议。",
    probes: [
      { code: "002085", name: "万丰奥威", role: "低空经济锚" },
      { code: "300719", name: "安达维尔", role: "航空维修弹性" },
      { code: "688333", name: "铂力特", role: "军工3D打印" }
    ],
    candidates: [],
    lowPosition: true
  }
];

const marketIndexSeed = [
  { key: "sh000001", symbol: "sh000001", name: "上证", role: "broad" },
  { key: "sz399001", symbol: "sz399001", name: "深成", role: "broad" },
  { key: "sz399006", symbol: "sz399006", name: "创业板", role: "tech" },
  { key: "sh000688", symbol: "sh000688", name: "科创50", role: "tech" }
];

const majorInfoSeed = [
  {
    id: "macro-liquidity-window",
    type: "经济数据",
    stance: "双向",
    urgency: "未来1周",
    impactLevel: "高",
    timing: "PMI、CPI/PPI、社融信贷、LPR、美国CPI/非农/FOMC预期窗口",
    title: "中美经济数据会直接影响A股风险偏好和科技成长估值",
    summary: "数据改善且流动性预期稳定，通常利好券商、AI算力、半导体设备；若美国利率预期重新走高，成长股容易被压估值。",
    events: [
      "中国官方PMI/财新PMI：判断制造业和科技成长修复力度。",
      "CPI/PPI、社融信贷、LPR：判断宽信用和政策预期是否增强。",
      "美国CPI/PCE、非农、FOMC表态：判断美债利率和全球成长股估值压力。"
    ],
    decisionChecks: [
      "数据利好但指数缩量高开低走，不追科技和券商。",
      "数据利好且上证/创业板放量修复，可把候选买入优先级上调。",
      "美国利率预期升温时，先压低AI、半导体新仓预算。"
    ],
    focusSectors: ["券商/互联网金融", "AI算力", "半导体设备"],
    riskNote: "数据公布前不追高，公布后看指数成交额和北向/主力资金方向；若高开低走，先保护持仓利润。",
    directAction: "指数放量修复才提高进攻仓位；缩量反弹只看不买。",
    relatedCodes: ["300059", "002371", "688012", "300308", "300502"],
    stocks: [
      { code: "300059", name: "东方财富", sector: "券商/金融科技", reason: "风险偏好修复时弹性强，但必须配合指数放量。" },
      { code: "002371", name: "北方华创", sector: "半导体设备", reason: "设备龙头，适合确认景气扩散时重点看。" },
      { code: "300308", name: "中际旭创", sector: "AI光模块", reason: "AI算力核心锚，适合用来判断成长主线强弱。" }
    ]
  },
  {
    id: "ai-compute-optical",
    type: "科技突破",
    stance: "偏利好",
    urgency: "盘中/隔夜",
    impactLevel: "高",
    timing: "海外AI资本开支、国产算力订单、800G/1.6T光模块、液冷与电源架构消息",
    title: "AI算力链出现订单或技术突破时，优先观察光模块、液冷和服务器电源",
    summary: "这类消息最容易形成A股科技短线弹性，但也最容易高开兑现。适合等分歧承接，不适合连续大阳后追。",
    events: [
      "海外云厂商AI资本开支上修或服务器订单扩张。",
      "800G/1.6T光模块、CPO、硅光、液冷、电源架构出现订单或技术突破。",
      "国产算力、数据中心、服务器产业链出现政策或订单催化。"
    ],
    decisionChecks: [
      "光模块龙头强但后排不跟，只看不追。",
      "英维克强于大盘且液冷分支放量，可提高持仓耐心。",
      "AI链集体高开低走，沪电、英维克优先保护利润。"
    ],
    focusSectors: ["光模块/CPO", "液冷温控", "服务器电源"],
    riskNote: "若龙头放量长上影或板块只拉一两只票，说明资金追高意愿不足。",
    directAction: "利好确认时先看头部股强弱，持有英维克时重点观察液冷是否跑赢光模块。",
    relatedCodes: ["300308", "300502", "002281", "002837", "300394"],
    stocks: [
      { code: "300308", name: "中际旭创", sector: "光模块", reason: "光模块头部股，适合判断AI算力主线是否真强。" },
      { code: "300502", name: "新易盛", sector: "光模块", reason: "弹性强，情绪好时更灵敏，弱市追高风险也更大。" },
      { code: "002837", name: "英维克", sector: "液冷温控", reason: "与你当前持仓联动度高，若液冷强于大盘可提高持有耐心。" }
    ]
  },
  {
    id: "advanced-packaging-glass",
    type: "产业突破",
    stance: "偏利好",
    urgency: "1-2周",
    impactLevel: "高",
    timing: "先进封装、HBM、Chiplet、玻璃基板/TGV、国产封测扩产消息",
    title: "先进封装和玻璃基板若出现订单/量产突破，优先看设备与封测龙头",
    summary: "这条线与通富微电、帝尔激光、蓝思科技、华天科技高度相关，适合做你当前科技仓的主线校验。",
    events: [
      "HBM、Chiplet、2.5D/3D封装、国产封测扩产或客户验证进展。",
      "玻璃基板、TGV、激光设备、载板材料出现量产或订单验证。",
      "封测龙头、设备龙头披露订单、扩产、客户突破或产业会议催化。"
    ],
    decisionChecks: [
      "帝尔站稳200且玻璃基板分支放量，可按计划看加仓。",
      "通富若仍弱于封测板块，说明个股弱，不因赛道利好硬扛。",
      "玻璃基板只拉小票而设备龙头不动，降低追涨级别。"
    ],
    focusSectors: ["先进封装", "玻璃基板/TGV", "封测替代"],
    riskNote: "通富仍是亏损拖累仓，若封测板块强而通富不跟，要警惕个股弱于赛道。",
    directAction: "板块强且通富站回73.2/75.3才提高封测耐心；帝尔若站稳200可按既定计划看加仓。",
    relatedCodes: ["002156", "002185", "300776", "300433", "600584"],
    stocks: [
      { code: "300776", name: "帝尔激光", sector: "TGV设备", reason: "玻璃基板设备弹性核心，与你当前持仓直接相关。" },
      { code: "002156", name: "通富微电", sector: "先进封装/封测", reason: "持仓亏损仓，观察能否由弱转强，不强则按硬线处理。" },
      { code: "002185", name: "华天科技", sector: "封测替代", reason: "通富减仓后的替代观察对象，避免封测仓位过度集中。" }
    ]
  },
  {
    id: "power-grid-energy-summer",
    type: "能源电网",
    stance: "偏利好",
    urgency: "夏季窗口",
    impactLevel: "中高",
    timing: "迎峰度夏、电网投资、特高压、储能并网、煤电保供与油气价格波动",
    title: "迎峰度夏和电网投资消息利好电网设备、储能和电力运营",
    summary: "电网线偏中线稳定，适合做科技回撤时的备选；但如果资金主线集中在AI和半导体，电网利好可能短期不体现。",
    events: [
      "迎峰度夏用电负荷创新高、电网保供和电力调度消息。",
      "特高压、电网设备、智能电网、配网改造投资节奏加快。",
      "储能并网、新能源消纳、电力运营盈利改善或煤电保供政策。"
    ],
    decisionChecks: [
      "电网利好出现但板块成交不放，不追回思源电气。",
      "电网设备强于大盘且资金从科技流出，可作为防守轮动观察。",
      "若科技主线恢复强势，电网只做备选，不抢主线资金。"
    ],
    focusSectors: ["电网设备", "特高压", "储能/电力运营"],
    riskNote: "防止只看利好不看资金，若板块涨幅弱于大盘且成交不放，暂不急着追回已卖标的。",
    directAction: "只在板块放量强于大盘时观察，思源电气已卖出后不要情绪化追回。",
    relatedCodes: ["002028", "600406", "000400", "300274", "600905"],
    stocks: [
      { code: "002028", name: "思源电气", sector: "电网设备", reason: "曾持有标的，适合观察是否重新走强，不作为追高首选。" },
      { code: "600406", name: "国电南瑞", sector: "电网自动化", reason: "电网核心龙头，适合判断板块机构资金强弱。" },
      { code: "000400", name: "许继电气", sector: "特高压/电网设备", reason: "弹性通常高于部分大票，但需看量能。" }
    ]
  },
  {
    id: "external-tech-risk",
    type: "外部风险",
    stance: "偏利空",
    urgency: "随时",
    impactLevel: "高",
    timing: "海外出口管制、AI芯片限制、地缘冲突、汇率快速波动",
    title: "外部限制或汇率冲击会压制半导体、AI硬件和高估值成长",
    summary: "这类利空通常先杀高位弹性股，再传导到科技链。你的持仓科技占比高，遇到利空不能硬扛。",
    events: [
      "海外升级AI芯片、半导体设备、先进制程或EDA出口限制。",
      "地缘冲突升级导致全球风险偏好下降、A股科技链承压。",
      "人民币或美债收益率快速波动，引发高估值成长股杀估值。"
    ],
    decisionChecks: [
      "科技链集体低开且10点前不能修复，先执行已有硬线。",
      "外部利空下不新增通富、华天等封测仓位。",
      "沪电、帝尔这类利润仓跌破保护线，不用等午后幻想反弹。"
    ],
    focusSectors: ["半导体", "AI硬件", "高估值成长"],
    riskNote: "若科技主线集体低开且10点前无法修复，优先执行已有减仓线，而不是等午后反弹。",
    directAction: "通富、英维克、沪电、帝尔都按硬线执行；新仓候选暂停追高。",
    relatedCodes: ["002156", "002837", "002463", "300776", "002371", "688012"],
    stocks: [
      { code: "002156", name: "通富微电", sector: "封测", reason: "亏损仓最需要纪律，外部利空下跌破硬线先减。" },
      { code: "002463", name: "沪电股份", sector: "AI PCB", reason: "利润仓要保护，利空下跌破145不犹豫。" },
      { code: "300776", name: "帝尔激光", sector: "设备", reason: "强势票遇系统性杀估值，跌破188/183要降风险。" }
    ]
  }
];

const defaultState = {
  sortMode: "fit",
  profile: {
    horizon: "波段",
    capPreference: "均衡",
    aggression: 6,
    drawdownTolerance: 12,
    familiarSectors: "半导体, 人工智能, 新能源"
  },
  riskPerTrade: 1.5,
  maxPosition: 80,
  goal: {
    startAssets: 517260.42,
    currentAssets: 517260.42,
    targetReturn: 30,
    maxDrawdown: 8,
    riskVersion: 2,
    startDate: "2026-06-26",
    deadline: "2026-07-24",
    pathMode: "trading",
    lastUpdated: "06/26 14:58"
  },
  account: {
    cashBalance: 517260.42,
    cashUpdatedAt: "初始化",
    lastEstimatedAssets: 517260.42,
    estimatedUpdatedAt: ""
  },
  thsConnection: {
    loginConfirmedAt: "",
    lastImportAt: "",
    importSource: "",
    screenshotName: "",
    screenshotImportedAt: "",
    screenshotDataUrl: ""
  },
  watchlist: [
    { name: "半导体设备ETF", tag: "趋势", createdAt: "初始化" },
    { name: "高股息央企", tag: "防守", createdAt: "初始化" }
  ],
  positions: [],
  intraday: {
    date: "",
    completed: {},
    notes: {},
    tradeSnapshot: {
      dateKey: "",
      name: "",
      importedAt: "",
      dataUrl: "",
      status: "未上传",
      rawText: "",
      trades: [],
      error: ""
    }
  },
  buyPlan: {
    armed: {},
    notes: {}
  },
  decisionGate: {
    screenshotDateKey: "",
    screenshotConfirmedAt: "",
    importDateKey: "",
    importConfirmedAt: "",
    positionConfirmDateKey: "",
    positionConfirmedAt: "",
    positionSignature: "",
    quotesDateKey: "",
    quotesConfirmedAt: ""
  },
  ocr: {
    status: "未识别",
    progress: 0,
    rawText: "",
    parsedCount: 0,
    parsedAt: "",
    error: ""
  },
  quotes: {
    byCode: {},
    byIndex: {},
    updatedAt: "",
    status: "未刷新",
    source: "腾讯证券公开行情"
  },
  majorInfo: {
    updatedAt: "",
    source: "静态模板",
    headlineCount: 0,
    items: [],
    status: "未刷新"
  },
  autoRefresh: {
    enabled: true,
    scheduleTimes: ["08:00", "14:00"],
    intervalMinutes: 0,
    lastAttemptAt: "",
    lastRunAt: "",
    lastSlotKey: "",
    nextRunAt: "",
    status: "等待08:00/14:00定时刷新",
    triggerCount: 0,
    triggered: []
  },
  tradeMechanism: {
    ...tradeMechanismPolicy,
    lastReviewAt: "2026-07-01"
  },
  closeReviews: [],
  journal: [
    {
      symbol: "AI算力",
      action: "观察",
      reason: "板块主线",
      result: "待验证",
      note: "只在放量回踩时看机会",
      date: "样例"
    }
  ],
  actionFeedback: {}
};

let state = loadState();
const AUTO_REFRESH_SCHEDULE_TIMES = ["08:00", "14:00"];
const AUTO_REFRESH_POLL_MS = 60 * 1000;
let autoRefreshTimer = null;
let autoRefreshRunning = false;

async function applyPanelSync() {
  try {
    const response = await fetch(`data/panel-sync.json?ts=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return;
    const sync = await response.json();
    if (!sync || !sync.updatedAt) return;
    if (state.panelSync?.updatedAt === sync.updatedAt) return;

    const dateKey = sync.dateKey || todayKey();
    const importLabel = sync.importedAt || nowLabel();
    const positions = Array.isArray(sync.positions)
      ? sync.positions.map((position) => recalculatePosition(position))
      : state.positions;
    const trades = Array.isArray(sync.trades) ? sync.trades : [];

    state.positions = positions;
    state.account = { ...state.account, ...(sync.account || {}) };
    state.goal = { ...state.goal, ...(sync.goal || {}) };
    state.thsConnection = {
      ...state.thsConnection,
      screenshotName: sync.holdingsScreenshot?.name || "对话框同步持仓截图",
      screenshotImportedAt: importLabel,
      screenshotDataUrl: sync.holdingsScreenshot?.url || state.thsConnection.screenshotDataUrl,
      lastImportAt: importLabel,
      importSource: "对话框截图同步"
    };
    state.intraday = {
      ...state.intraday,
      date: dateKey,
      tradeSnapshot: {
        ...state.intraday.tradeSnapshot,
        dateKey,
        name: sync.tradeScreenshot?.name || "对话框同步成交截图",
        importedAt: importLabel,
        dataUrl: sync.tradeScreenshot?.url || state.intraday.tradeSnapshot.dataUrl,
        status: trades.length ? "识别完成" : "未上传",
        rawText: sync.tradeRawText || "",
        trades,
        error: ""
      }
    };
    state.quotes = {
      ...state.quotes,
      byCode: { ...state.quotes.byCode, ...(sync.quotes?.byCode || {}) },
      byIndex: { ...state.quotes.byIndex, ...(sync.quotes?.byIndex || {}) },
      updatedAt: sync.quotes?.updatedAt || importLabel,
      status: sync.quotes?.status || `已同步截图行情 ${Object.keys(sync.quotes?.byCode || {}).length} 个股票`,
      source: sync.quotes?.source || "对话框截图同步"
    };
    state.ocr = {
      ...state.ocr,
      status: "对话框截图同步",
      progress: 100,
      rawText: sync.holdingsRawText || "",
      parsedCount: positions.length,
      parsedAt: importLabel,
      error: ""
    };
    state.decisionGate = {
      ...state.decisionGate,
      screenshotDateKey: dateKey,
      screenshotConfirmedAt: importLabel,
      importDateKey: dateKey,
      importConfirmedAt: importLabel,
      positionConfirmDateKey: dateKey,
      positionConfirmedAt: importLabel,
      positionSignature: positionTableSignature(positions),
      quotesDateKey: dateKey,
      quotesConfirmedAt: state.quotes.updatedAt
    };
    state.panelSync = {
      updatedAt: sync.updatedAt,
      source: sync.source || "chat-screenshot",
      appliedAt: nowLabel()
    };
    updateAutoRefreshMeta("sync");
    saveState();
    render();
  } catch (error) {
    console.warn("panel sync skipped", error);
  }
}

async function refreshMajorInfo(options = {}) {
  const source = options.source || "manual";
  const refreshFlag = options.refresh === false ? "0" : "1";
  const endpoint = `api/major-info?refresh=${refreshFlag}&source=${encodeURIComponent(source)}&ts=${Date.now()}`;
  const fallback = `data/major-info.json?ts=${Date.now()}`;
  try {
    let payload = null;
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (response.ok) {
        const result = await response.json();
        payload = result.data || result;
      }
    } catch {
      const response = await fetch(fallback, { cache: "no-store" });
      if (response.ok) payload = await response.json();
    }
    if (!payload || !Array.isArray(payload.items)) return false;
    state.majorInfo = {
      ...state.majorInfo,
      updatedAt: payload.updatedAt || nowLabel(),
      source: payload.source || "公开财经信息",
      headlineCount: numeric(payload.headlineCount),
      items: payload.items,
      status: payload.items.length ? `已更新 ${payload.items.length} 条重大资讯` : "未识别到重大资讯",
      note: payload.note || "",
      sourceUrls: payload.sourceUrls || []
    };
    saveState();
    return true;
  } catch (error) {
    state.majorInfo = {
      ...state.majorInfo,
      status: `资讯刷新失败：${error.message || "网络不可用"}`
    };
    saveState();
    return false;
  }
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? mergeState(defaultState, saved) : structuredClone(defaultState);
  } catch {
    return structuredClone(defaultState);
  }
}

function mergeState(base, saved) {
  const savedGoal = saved.goal || {};
  const goal = { ...base.goal, ...savedGoal };
  if (savedGoal.riskVersion !== base.goal.riskVersion) {
    goal.maxDrawdown = base.goal.maxDrawdown;
    goal.riskVersion = base.goal.riskVersion;
  }
  const positions = Array.isArray(saved.positions) ? saved.positions : base.positions;
  const hasSavedCash = Boolean(saved.account && Object.prototype.hasOwnProperty.call(saved.account, "cashBalance"));
  const account = {
    ...base.account,
    ...(saved.account || {})
  };
  if (!hasSavedCash) {
    account.cashBalance = Math.max(0, numeric(goal.currentAssets) - positionMarketValue(positions));
    account.cashUpdatedAt = goal.lastUpdated || "自动推导";
  }
  const mechanismUpgraded = (saved.tradeMechanism || {}).version !== base.tradeMechanism.version;

  return {
    ...structuredClone(base),
    ...saved,
    maxPosition: mechanismUpgraded ? base.maxPosition : (numeric(saved.maxPosition) || base.maxPosition),
    profile: { ...base.profile, ...(saved.profile || {}) },
    goal,
    account,
    tradeMechanism: { ...base.tradeMechanism, ...(mechanismUpgraded ? {} : (saved.tradeMechanism || {})) },
    thsConnection: { ...base.thsConnection, ...(saved.thsConnection || {}) },
    watchlist: Array.isArray(saved.watchlist) ? saved.watchlist : base.watchlist,
    positions,
    intraday: {
      ...base.intraday,
      ...(saved.intraday || {}),
      completed: { ...base.intraday.completed, ...((saved.intraday || {}).completed || {}) },
      notes: { ...base.intraday.notes, ...((saved.intraday || {}).notes || {}) },
      tradeSnapshot: {
        ...base.intraday.tradeSnapshot,
        ...(((saved.intraday || {}).tradeSnapshot) || {})
      }
    },
    buyPlan: {
      ...base.buyPlan,
      ...(saved.buyPlan || {}),
      armed: { ...base.buyPlan.armed, ...((saved.buyPlan || {}).armed || {}) },
      notes: { ...base.buyPlan.notes, ...((saved.buyPlan || {}).notes || {}) }
    },
    decisionGate: { ...base.decisionGate, ...(saved.decisionGate || {}) },
    ocr: { ...base.ocr, ...(saved.ocr || {}) },
    quotes: {
      ...base.quotes,
      ...(saved.quotes || {}),
      byCode: { ...base.quotes.byCode, ...((saved.quotes || {}).byCode || {}) },
      byIndex: { ...base.quotes.byIndex, ...((saved.quotes || {}).byIndex || {}) }
    },
    majorInfo: {
      ...base.majorInfo,
      ...(saved.majorInfo || {}),
      items: Array.isArray((saved.majorInfo || {}).items) ? saved.majorInfo.items : base.majorInfo.items
    },
    autoRefresh: {
      ...base.autoRefresh,
      ...(saved.autoRefresh || {}),
      scheduleTimes: Array.isArray((saved.autoRefresh || {}).scheduleTimes)
        ? (saved.autoRefresh || {}).scheduleTimes
        : base.autoRefresh.scheduleTimes,
      intervalMinutes: 0
    },
    closeReviews: Array.isArray(saved.closeReviews) ? saved.closeReviews : base.closeReviews,
    journal: Array.isArray(saved.journal) ? saved.journal : base.journal,
    actionFeedback: { ...base.actionFeedback, ...(saved.actionFeedback || {}) }
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function familiarTokens() {
  return state.profile.familiarSectors
    .split(/[，,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function journalBias(sector) {
  return state.journal.reduce((score, item) => {
    const text = `${item.symbol}${item.reason}${item.note}`;
    const touchesSector = sector.tags.some((tag) => text.includes(tag)) || text.includes(sector.name);
    if (!touchesSector) return score;
    if (item.result === "盈利") return score + 5;
    if (item.result === "亏损") return score - 6;
    return score + 1;
  }, 0);
}

function watchBias(sector) {
  return state.watchlist.reduce((score, item) => {
    const text = `${item.name}${item.tag}`;
    const matched = sector.tags.some((tag) => text.includes(tag)) || text.includes(sector.name);
    return matched ? score + 4 : score;
  }, 0);
}

function scoreSector(sector) {
  const profile = state.profile;
  const familiarity = familiarTokens().some((token) => {
    return sector.tags.some((tag) => tag.includes(token) || token.includes(tag)) || sector.name.includes(token);
  })
    ? 9
    : 0;
  const horizonFit = sector.horizon === profile.horizon ? 8 : profile.horizon === "波段" ? 4 : 1;
  const capFit = sector.cap === profile.capPreference || profile.capPreference === "均衡" || sector.cap === "均衡" ? 5 : -2;
  const aggressionFit = 10 - Math.abs(Number(profile.aggression) - sector.beta);
  const riskPenalty = Math.max(0, sector.risk - Number(profile.drawdownTolerance) * 3) * 0.22;
  const disciplinePenalty = Math.max(0, Number(state.maxPosition) - 60) * 0.08;
  const fit = sector.heat * 0.34
    + sector.momentum * 0.22
    + familiarity
    + horizonFit
    + capFit
    + aggressionFit
    + watchBias(sector)
    + journalBias(sector)
    - riskPenalty
    - disciplinePenalty;

  return Math.round(clamp(fit, 0, 99));
}

function scoredSectors() {
  return sectorSeed
    .map((sector) => ({ ...sector, fit: scoreSector(sector) }))
    .sort((a, b) => {
      if (state.sortMode === "heat") return b.heat - a.heat;
      if (state.sortMode === "risk") return a.risk - b.risk;
      return b.fit - a.fit;
    });
}

function dominantStyle() {
  const { horizon, aggression, drawdownTolerance } = state.profile;
  if (Number(aggression) >= 8 && horizon === "短线") return "高弹性短线";
  if (Number(drawdownTolerance) <= 8) return "稳健防守";
  if (horizon === "中线") return "基本面中线";
  return "趋势波段";
}

function riskTemperature() {
  const risk = Number(state.riskPerTrade) + Number(state.maxPosition) / 30 + Number(state.profile.aggression) / 3;
  if (risk >= 8) return "偏热";
  if (risk >= 5.5) return "中性";
  return "偏冷";
}

function render() {
  refreshIntradayDate();
  bindFormValues();
  renderBattlePlan();
  renderGoalTracker();
  renderSizingPlanner();
  renderIntradayChecklist();
  renderCloseReview();
  renderQuoteStatus();
  renderPortfolio();
  renderSummary();
  saveState();
}

function todayKey() {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function refreshIntradayDate() {
  const key = todayKey();
  if (state.intraday.date === key) return;
  state.intraday.date = key;
  state.intraday.completed = {};
  state.intraday.notes = {};
  state.intraday.tradeSnapshot = structuredClone(defaultState.intraday.tradeSnapshot);
}

function bindFormValues() {
  document.querySelector("#todayLabel").textContent = new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long"
  }).format(new Date());
  document.querySelector("#riskPerTrade").value = state.riskPerTrade;
  document.querySelector("#maxPosition").value = state.maxPosition;
  document.querySelector("#riskValue").textContent = `${state.riskPerTrade}%`;
  document.querySelector("#positionValue").textContent = `${state.maxPosition}%`;
  document.querySelector("#goalStartAssets").value = state.goal.startAssets;
  document.querySelector("#goalCurrentAssets").value = state.goal.currentAssets;
  document.querySelector("#accountCashBalance").value = state.account.cashBalance;
  document.querySelector("#goalTargetReturn").value = state.goal.targetReturn;
  document.querySelector("#goalMaxDrawdown").value = state.goal.maxDrawdown;
  document.querySelector("#goalDeadline").value = state.goal.deadline;
  document.querySelectorAll(".seg").forEach((button) => {
    button.classList.toggle("active", button.dataset.sort === state.sortMode);
  });
}

function renderBattlePlan() {
  const container = document.querySelector("#battlePlan");
  if (!container) return;

  const dataGate = battleDataGateStatus();
  const dataGateHtml = renderBattleDataGate(dataGate);
  if (!dataGate.ready) {
    container.innerHTML = `
      ${dataGateHtml}
      <section class="today-action-locked">
        <strong>今日操作建议暂不生成</strong>
        <p>${dataGate.blockReason}</p>
      </section>
      ${renderMajorInfoPreview(dataGate)}
    `;
    return;
  }

  const stats = goalStats();
  const portfolio = portfolioStats();
  const snapshot = accountSnapshot(portfolio.marketValue);
  const path = goalPathStats(stats, snapshot);
  const riskBudget = snapshot.activeAssets * numeric(state.riskPerTrade) / 100;
  const marketGate = marketGateView();
  const candidates = candidateSizingRows(stats, portfolio, snapshot.cash, riskBudget, marketGate);
  const todayOrders = buildTodayOrders(stats, portfolio, snapshot, path, candidates, marketGate);
  const mainAlerts = goalPathAlerts(stats, snapshot, path).slice(0, 2);

  container.innerHTML = `
    ${dataGateHtml}
    ${renderTodayOrders(todayOrders)}
    ${renderActionSupportSummary(portfolio, snapshot, path, marketGate, mainAlerts)}
    ${renderSectorPrepositionRadar(marketGate)}
    ${renderMajorInfoPreview(dataGate, portfolio)}
  `;
}

function renderActionSupportSummary(portfolio, snapshot, path, marketGate, alerts = []) {
  return `
    <section class="action-support-summary" aria-label="操作建议依据">
      <article>
        <span>市场闸门</span>
        <strong>${marketGate.shortLabel || marketGate.title}</strong>
        <p>${marketGate.metrics}</p>
      </article>
      <article>
        <span>当前仓位</span>
        <strong>${portfolio.exposure}%</strong>
        <p>只做仓位校验，具体买卖以上方为准。</p>
      </article>
      <article>
        <span>估算净值</span>
        <strong>${formatMoney(snapshot.estimatedAssets)}</strong>
        <p>路径偏离 <b class="${path.gap >= 0 ? "result-profit" : "result-loss"}">${formatMoney(path.gap)}</b></p>
      </article>
      <article>
        <span>目标缺口</span>
        <strong>${snapshot.targetGap > 0 ? formatMoney(snapshot.targetGap) : "已达成"}</strong>
        <p>目标压力不替代触发价。</p>
      </article>
    </section>
    ${alerts.length ? `
      <section class="action-support-alerts" aria-label="目标风险提示">
        ${alerts.map((alert) => `
          <article class="${alert.level}">
            <strong>${alert.title}</strong>
            <p>${alert.detail}</p>
          </article>
        `).join("")}
      </section>
    ` : ""}
  `;
}

function sectorPrepositionRadarItems(marketGate = marketGateView()) {
  return sectorPrepositionProbeSeed.map((track) => {
    const probes = (track.probes || []).map((probe) => ({
      ...probe,
      quote: quoteForCode(probe.code)
    }));
    const quoted = probes.filter((probe) => probe.quote);
    const positiveCount = quoted.filter((probe) => numeric(probe.quote.pct) > 0).length;
    const strongCount = quoted.filter((probe) => numeric(probe.quote.pct) >= 3).length;
    const weakCount = quoted.filter((probe) => numeric(probe.quote.pct) <= -2).length;
    const avgPct = quoted.length
      ? quoted.reduce((sum, probe) => sum + numeric(probe.quote.pct), 0) / quoted.length
      : 0;
    const amountTotal = quoted.reduce((sum, probe) => sum + numeric(probe.quote.amount), 0);
    const turnoverAvg = quoted.length
      ? quoted.reduce((sum, probe) => sum + numeric(probe.quote.turnover), 0) / quoted.length
      : 0;
    const breadth = quoted.length ? positiveCount / quoted.length : 0;
    const crowdPenalty = avgPct >= 4 || strongCount >= Math.max(2, Math.ceil(quoted.length * 0.6)) ? 10 : 0;
    const gatePenalty = marketGate.canOpenNew ? 0 : 8;
    const lowPositionBonus = track.lowPosition ? 8 : 0;
    const dataPenalty = quoted.length < Math.min(2, probes.length) ? 10 : 0;
    const score = Math.round(
      45
      + avgPct * 7
      + breadth * 22
      + Math.min(12, turnoverAvg * 1.2)
      + Math.min(8, Math.log10(Math.max(1, amountTotal)) * 2)
      + lowPositionBonus
      - crowdPenalty
      - gatePenalty
      - weakCount * 5
      - dataPenalty
    );
    const leaders = quoted
      .slice()
      .sort((a, b) => numeric(b.quote.pct) - numeric(a.quote.pct))
      .slice(0, 3)
      .map((probe) => `${probe.name}${formatSigned(probe.quote.pct)}%`);
    const candidateNames = (track.candidates || [])
      .map((code) => defaultBuyCandidates.find((candidate) => normalizeCode(candidate.code) === normalizeCode(code)))
      .filter(Boolean)
      .map((candidate) => `${candidate.name}(${normalizeCode(candidate.code)})`);
    const level = score >= 72 ? "ok" : score >= 58 ? "watch" : "neutral";
    const action = score >= 72 && marketGate.canOpenNew
      ? "可进入今日买入清单校验"
      : score >= 58
        ? "观察，等放量/回踩确认"
        : "暂不部署";

    return {
      ...track,
      probes,
      quotedCount: quoted.length,
      avgPct,
      amountTotal,
      turnoverAvg,
      breadth,
      weakCount,
      score,
      level,
      action,
      leaders,
      candidateNames
    };
  }).sort((a, b) => b.score - a.score);
}

function renderSectorPrepositionRadar(marketGate = marketGateView()) {
  const items = sectorPrepositionRadarItems(marketGate).slice(0, 5);
  return `
    <section class="sector-radar-module" aria-label="全行业赛道探针">
      <div class="sector-radar-head">
        <div>
          <span>全行业赛道探针</span>
          <strong>只做今日买入清单的前置筛选</strong>
        </div>
        <p>按代表股涨跌、广度、换手/成交额和低位属性排序；不再限定光模块或单一产业链。</p>
      </div>
      <div class="sector-radar-list">
        ${items.map((item) => `
          <article class="${item.level}">
            <div>
              <strong>${item.track}</strong>
              <span>${item.status}｜评分${item.score}</span>
            </div>
            <p>${item.action}｜均涨跌${formatSigned(item.avgPct)}%｜上涨广度${Math.round(item.breadth * 100)}%${item.leaders.length ? `｜强弱：${item.leaders.join("、")}` : "｜待刷新行情"}</p>
            <small>${item.candidateNames.length ? `候选：${item.candidateNames.join("、")}` : "暂无直接买入候选，只作为赛道温度计"}｜${item.thesis}</small>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function battleDataGateStatus() {
  const dateKey = todayKey();
  const hasPositions = state.positions.length > 0;
  const currentPositionSignature = positionTableSignature();
  const hasScreenshotImage = Boolean(state.thsConnection.screenshotDataUrl);
  const hasScreenshotEvidence = Boolean(state.thsConnection.screenshotDataUrl || state.thsConnection.screenshotName);
  const hasScreenshot = hasScreenshotEvidence && state.decisionGate.screenshotDateKey === dateKey;
  const hasImport = hasPositions && state.thsConnection.lastImportAt && state.decisionGate.importDateKey === dateKey;
  const hasPositionConfirm = hasImport
    && state.decisionGate.positionConfirmDateKey === dateKey
    && state.decisionGate.positionSignature === currentPositionSignature;
  const hasQuotes = hasPositionConfirm && state.quotes.updatedAt && state.decisionGate.quotesDateKey === dateKey;
  const tradeSnapshot = todayTradeSnapshot();
  const todayTrades = Array.isArray(tradeSnapshot.trades) ? tradeSnapshot.trades : [];
  const hasTradeSnapshot = hasTradeEvidence(tradeSnapshot, dateKey);
  const screenshotOnly = hasScreenshotImage && !hasPositions;
  const ready = Boolean(hasScreenshot && hasImport && hasPositionConfirm && hasQuotes);
  const blockReason = buildDataGateBlockReason({ hasPositions, hasScreenshot, hasImport, hasPositionConfirm, hasQuotes, screenshotOnly });
  return {
    ready,
    blockReason,
	    dateKey,
    hasPositions,
    hasScreenshot,
    hasScreenshotImage,
    hasImport,
    hasPositionConfirm,
    hasQuotes,
    hasTradeSnapshot,
    screenshotOnly,
    importText: hasImport
      ? `${state.positions.length}只持仓｜${state.thsConnection.importSource || "本地导入"}｜${state.decisionGate.importConfirmedAt || state.thsConnection.lastImportAt}`
      : screenshotOnly
        ? "截图已保存，尚未生成持仓表"
        : hasPositions
          ? "持仓存在，但今天未重新确认"
          : "未导入今天持仓",
	    quoteText: hasQuotes
	      ? `已刷新｜${state.decisionGate.quotesConfirmedAt || state.quotes.updatedAt}`
	      : state.quotes.updatedAt
	        ? `需重新刷新｜上次 ${state.quotes.updatedAt}`
	        : "未刷新",
	    ocrText: isOcrRunning()
	      ? `${state.ocr.status}${state.ocr.status === "识别中" || state.ocr.status === "整图补识别" ? ` ${Math.round(state.ocr.progress)}%` : ""}`
	      : state.ocr.parsedAt
	        ? `${state.ocr.status}｜${state.ocr.parsedCount}只｜${state.ocr.parsedAt}`
	        : state.ocr.status,
	    positionText: hasPositionConfirm
	      ? `已确认｜${state.decisionGate.positionConfirmedAt}`
      : hasPositions
        ? "待确认表格与截图一致"
        : "无持仓表",
    screenshotText: hasScreenshot
      ? `${state.thsConnection.screenshotName || "持仓截图"}｜${state.decisionGate.screenshotConfirmedAt || state.thsConnection.screenshotImportedAt}`
      : hasScreenshotEvidence
        ? `${state.thsConnection.screenshotName || "持仓截图"}｜需今天重新确认`
      : "未上传截图",
    tradeText: hasTradeSnapshot
      ? `${tradeSnapshot.name || "成交截图"}｜${tradeSnapshot.status || "已上传"}｜${todayTrades.length}条`
      : "未上传，默认今日无成交记录"
  };
}

function buildDataGateBlockReason({ hasPositions, hasScreenshot, hasImport, hasPositionConfirm, hasQuotes, screenshotOnly }) {
  if (!hasScreenshot) {
    return "请先在首屏导入今天最新的持仓截图。没有最新截图凭证，系统不会显示买卖建议，避免沿用旧持仓。";
  }
  if (screenshotOnly) {
    return "已保存持仓截图，但还没有识别成持仓表。请点击“识别截图生成持仓表”，核对后再刷新行情。";
  }
  if (!hasPositions) {
    return "请先导入最新持仓截图并识别生成持仓表；没有最新持仓表，系统不会用旧数据生成买卖建议。";
  }
  if (!hasImport) {
    return "检测到持仓表，但今天还没有确认它来自最新截图。请重新导入截图并识别后再刷新行情。";
  }
  if (!hasPositionConfirm) {
    return "持仓表已导入，但还没有确认它与今天截图一致。请核对表格里的股票、股数、成本后点击确认；确认后再刷新行情。";
  }
  if (!hasQuotes) {
    return "持仓截图和表格已确认，但行情还没有在本次确认后刷新。请点击“一键刷新数据”，完成后才显示今日操作建议。";
  }
  return "数据待确认。";
}

function isOcrRunning() {
  return ["加载OCR库", "预处理截图", "识别中", "解析持仓", "整图补识别"].includes(state.ocr.status);
}

function renderBattleDataGate(gate) {
  return `
    <section class="battle-data-gate ${gate.ready ? "ready" : "blocked"}">
      <div class="data-gate-head">
        <div>
          <span>数据确认</span>
          <strong>${gate.ready ? "已基于最新持仓生成建议" : "先确认最新持仓，再看建议"}</strong>
          <p>今日操作建议只读取本交易日导入的持仓截图、确认过的持仓表和刷新过的公开行情；成交截图可选，未上传默认今天无交易。</p>
        </div>
	      <div class="data-gate-actions">
	        <label class="data-upload-button">
	          <span>导入持仓截图</span>
	          <input id="battlePortfolioImage" type="file" accept="image/png,image/jpeg,image/webp">
	        </label>
	        <label class="data-upload-button">
	          <span>导入成交截图</span>
	          <input id="battleTradeSnapshotImage" type="file" accept="image/png,image/jpeg,image/webp">
	        </label>
		        <button class="ghost-button" type="button" data-battle-action="ocr-screenshot" ${gate.hasScreenshotImage ? "" : "disabled"}>识别截图生成持仓表</button>
	        <button class="primary-button" type="button" data-battle-action="refresh-quotes">一键刷新数据</button>
	      </div>
      </div>
	      <div class="data-gate-status">
        <article class="${gate.hasScreenshot ? "ok" : "watch"}">
          <span>截图凭证</span>
          <strong>${gate.screenshotText}</strong>
        </article>
	        <article class="${gate.hasImport ? "ok" : "watch"}">
	          <span>持仓导入</span>
	          <strong>${gate.importText}</strong>
	        </article>
	        <article class="${state.ocr.parsedCount ? "ok" : "watch"}">
	          <span>截图识别</span>
	          <strong id="ocrStatusText">${gate.ocrText}</strong>
	        </article>
	        <article class="${gate.hasPositionConfirm ? "ok" : "watch"}">
	          <span>表格校准</span>
	          <strong>${gate.positionText}</strong>
        </article>
        <article class="${gate.hasQuotes ? "ok" : "watch"}">
          <span>行情</span>
          <strong>${gate.quoteText}</strong>
	        </article>
        <article class="${gate.hasTradeSnapshot ? "ok" : "neutral"}">
          <span>成交记录</span>
          <strong>${gate.tradeText}</strong>
        </article>
	      </div>
	      ${state.ocr.error ? `<div class="ocr-error">${state.ocr.error}</div>` : ""}
	      ${renderPositionConfirmBox(gate)}
	    </section>
  `;
}

function renderPositionConfirmBox(gate) {
  if (!state.positions.length && !gate.hasScreenshot) return "";
  if (gate.hasPositionConfirm) {
    return "";
  }
  const invalidRows = state.positions.filter((position) => !isValidPositionForConfirmation(position)).length;
  const canConfirm = gate.hasScreenshot && state.positions.length > 0 && invalidRows === 0;
  const confirmHelp = invalidRows
    ? `还有${invalidRows}行缺少名称、6位代码、股数或现价，补齐后再确认。`
    : "确认下面股票、股数、成本与今天截图一致后，才允许生成买卖建议。";
  return `
    <div class="position-confirm-box ${gate.hasPositionConfirm ? "confirmed" : ""}">
      <div class="position-confirm-head">
        <div>
          <strong>当前持仓表校准</strong>
          <p>${confirmHelp}</p>
        </div>
        <div class="position-confirm-actions">
          <button class="ghost-button" type="button" data-battle-action="add-position-row" ${gate.hasScreenshot ? "" : "disabled"}>新增一行</button>
          <button class="primary-button" type="button" data-battle-action="confirm-positions" ${canConfirm ? "" : "disabled"}>${canConfirm ? "确认表格与截图一致" : "补齐持仓表"}</button>
        </div>
      </div>
      <div class="position-confirm-list">
        ${state.positions.length ? state.positions.map((position, index) => {
          const recalculated = recalculatePosition(position);
          const pnlClass = recalculated.pnl >= 0 ? "result-profit" : "result-loss";
          return `
          <article>
            <label>
              <span>名称</span>
              <input type="text" value="${escapeAttribute(position.name || "")}" data-position-correction="${index}" data-field="name">
            </label>
            <label>
              <span>代码</span>
              <input type="text" value="${escapeAttribute(normalizeCode(position.code))}" data-position-correction="${index}" data-field="code" inputmode="numeric">
            </label>
            <label>
              <span>股数</span>
              <input type="number" min="0" step="100" value="${numeric(position.quantity)}" data-position-correction="${index}" data-field="quantity">
            </label>
            <label>
              <span>成本</span>
              <input type="number" min="0" step="0.001" value="${numeric(position.cost)}" data-position-correction="${index}" data-field="cost">
            </label>
            <label>
              <span>现价</span>
              <input type="number" min="0" step="0.001" value="${numeric(position.currentPrice)}" data-position-correction="${index}" data-field="currentPrice">
            </label>
            <div class="position-confirm-result">
              <span>核对明细</span>
              <strong>${position.name || "未命名"} ${normalizeCode(position.code) || "--"}</strong>
              <b>${formatMoney(recalculated.marketValue)}｜${recalculated.quantity || 0}股</b>
              <b class="${pnlClass}">${formatMoney(recalculated.pnl)}｜${formatSigned(recalculated.pnlRate)}%</b>
              <button class="text-danger-button" type="button" data-battle-action="remove-position-row" data-position-index="${index}">删除</button>
            </div>
          </article>
        `;
        }).join("") : `
          <article class="empty-position-row">
            <p>OCR 没有生成持仓行。可以按截图手动新增持仓行，补齐后再确认。</p>
          </article>
        `}
      </div>
    </div>
  `;
}

function renderTodayActionAdvice(advice) {
  return `
    <section class="today-action-module">
      <div class="today-action-head">
        <div>
          <span>今日操作建议</span>
          <strong>${advice.title}</strong>
          <p>${advice.detail}</p>
        </div>
        <div class="today-action-meta">
          <span>执行优先级</span>
          <strong>卖出 > 买入 > 持有</strong>
          <p>${advice.meta}</p>
          <div class="market-gate-inline ${advice.marketGate.level}">
            <b>${advice.marketGate.title}</b>
            <span>${advice.marketGate.metrics}</span>
          </div>
        </div>
      </div>
      <div class="action-board">
        <section>
          <div class="battle-section-heading">
            <strong>当前持仓</strong>
            <span>触线直接执行</span>
          </div>
          <div class="action-list">
            ${advice.holdings.length ? advice.holdings.map(renderTodayActionRow).join("") : `
              <article class="action-row neutral">
                <div>
                  <span>持仓</span>
                  <strong>暂无持仓数据</strong>
                  <p>先载入当前持仓或上传截图，再生成具体卖出价和持有动作。</p>
                </div>
                <b>等待导入</b>
              </article>
            `}
          </div>
        </section>
        <section>
          <div class="battle-section-heading">
            <strong>可提前埋伏</strong>
            <span>不到价不买</span>
          </div>
          <div class="action-list">
            ${advice.candidates.map(renderTodayActionRow).join("")}
          </div>
        </section>
      </div>
    </section>
  `;
}

function renderGoalBattleCommand(stats, portfolio, snapshot, path, candidateRows, marketGate) {
  const command = buildGoalBattleCommand(stats, portfolio, snapshot, path, candidateRows, marketGate);
  return `
    <section class="goal-command-module ${command.level}">
      <div class="goal-command-head">
        <div>
          <span>目标缺口作战指令</span>
          <strong>${command.title}</strong>
          <p>${command.detail}</p>
        </div>
        <div class="goal-command-action">
          <span>今天仓位动作</span>
          <strong>${command.action}</strong>
          <p>${command.actionDetail}</p>
        </div>
      </div>
      <div class="goal-command-grid">
        ${command.metrics.map((item) => `
          <article>
            <span>${item.label}</span>
            <strong class="${item.tone || ""}">${item.value}</strong>
            <p>${item.detail}</p>
          </article>
        `).join("")}
      </div>
      <div class="goal-command-list">
        ${command.steps.map((item) => `
          <span>${item}</span>
        `).join("")}
      </div>
    </section>
  `;
}

function buildGoalBattleCommand(stats, portfolio, snapshot, path, candidateRows, marketGate) {
  const executableRows = candidateRows.filter((item) => item.shares > 0);
  const topExecutable = executableRows[0] || null;
  const topCandidate = topExecutable ? defaultBuyCandidates.find((item) => normalizeCode(item.code) === normalizeCode(topExecutable.code)) : null;
  const highConviction = topExecutable && topCandidate && numeric(topCandidate.probability) >= 80 && candidateUniverseScore(topCandidate) >= 82;
  const requiredDailyPct = snapshot.activeAssets ? path.requiredDailyProfit / snapshot.activeAssets * 100 : 0;
  const targetGapPct = snapshot.activeAssets ? snapshot.targetGap / snapshot.activeAssets * 100 : 0;
  const weekGap = path.weekFloorAssets - snapshot.estimatedAssets;
  const fiveDayGap = path.fiveDayAssets - snapshot.estimatedAssets;
  const allowedExposure = resolveGoalAllowedExposure(portfolio, snapshot, path, executableRows, marketGate, highConviction);
  const addRoom = marketGate.canOpenNew ? Math.max(0, snapshot.activeAssets * allowedExposure / 100 - portfolio.marketValue) : 0;
  const immediateBuyBudget = executableRows.reduce((sum, item) => sum + numeric(item.capital), 0);
  const buyBudget = Math.min(snapshot.cash, addRoom, immediateBuyBudget);
  const title = goalCommandTitle(snapshot, path, marketGate, executableRows, highConviction);
  const level = goalCommandLevel(snapshot, path, marketGate, executableRows);
  const action = goalCommandAction(snapshot, marketGate, executableRows, buyBudget, allowedExposure);
  const detail = goalCommandDetail(stats, snapshot, path, marketGate, executableRows, highConviction, allowedExposure);
  const actionDetail = goalCommandActionDetail(topExecutable, topCandidate, buyBudget, allowedExposure, marketGate);

  return {
    level,
    title,
    detail,
    action,
    actionDetail,
    metrics: [
      {
        label: "距30%目标",
        value: snapshot.targetGap > 0 ? formatMoney(snapshot.targetGap) : "已达成",
        detail: snapshot.targetGap > 0
          ? `还需约${Math.abs(targetGapPct).toFixed(2)}%。`
          : `超过目标约${Math.abs(targetGapPct).toFixed(2)}%。`,
        tone: snapshot.targetGap <= 0 ? "result-profit" : "result-loss"
      },
      {
        label: "剩余交易日",
        value: `${path.daysLeft}天`,
        detail: `日均需${formatMoney(path.requiredDailyProfit)}，约${formatSigned(requiredDailyPct)}%。`
      },
      {
        label: "本周最低线",
        value: formatMoney(path.weekFloorAssets),
        detail: weekGap > 0 ? `低于本周线${formatMoney(weekGap)}。` : `高于本周线${formatMoney(Math.abs(weekGap))}。`,
        tone: weekGap > 0 ? "result-loss" : "result-profit"
      },
      {
        label: "5日目标线",
        value: formatMoney(path.fiveDayAssets),
        detail: fiveDayGap > 0 ? `5日缺口${formatMoney(fiveDayGap)}。` : `5日线有余量${formatMoney(Math.abs(fiveDayGap))}。`,
        tone: fiveDayGap > 0 ? "result-loss" : "result-profit"
      }
    ],
    steps: goalCommandSteps(snapshot, path, marketGate, executableRows, buyBudget, allowedExposure)
  };
}

function resolveGoalAllowedExposure(portfolio, snapshot, path, executableRows, marketGate, highConviction) {
  if (snapshot.floorGap <= 8000) return Math.min(portfolio.exposure, 25);
  if (!marketGate.canOpenNew) return portfolio.exposure;
  if (!executableRows.length) return portfolio.exposure;
  if (highConviction) return 80;
  if (path.gap < -5000) return Math.max(portfolio.exposure, 45);
  return Math.max(portfolio.exposure, 45);
}

function goalCommandTitle(snapshot, path, marketGate, executableRows, highConviction) {
  if (snapshot.floorGap <= 8000) return "防守优先，停止新仓";
  if (!marketGate.canOpenNew) return "目标仍在，但今天不进攻";
  if (!executableRows.length) return "目标缺口不靠追高补";
  if (highConviction) return "极高确定性才允许重仓";
  if (path.gap < -5000) return "落后路径，只做触发修复";
  return "按触发价小步推进目标";
}

function goalCommandLevel(snapshot, path, marketGate, executableRows) {
  if (snapshot.floorGap <= 8000) return "danger";
  if (!marketGate.canOpenNew) return marketGate.level;
  if (executableRows.length) return "ok";
  if (path.gap < -5000) return "watch";
  return "neutral";
}

function goalCommandAction(snapshot, marketGate, executableRows, buyBudget, allowedExposure) {
  if (snapshot.floorGap <= 8000) return "只减不买";
  if (!marketGate.canOpenNew) return "现金等待";
  if (!executableRows.length) return "不到价不动";
  if (buyBudget >= 10000) return `可用${formatMoney(buyBudget)}试攻`;
  return `上限${allowedExposure}%内等待`;
}

function goalCommandDetail(stats, snapshot, path, marketGate, executableRows, highConviction, allowedExposure) {
  if (snapshot.targetGap <= 0) {
    return "目标已达到或超过，今天的主任务从进攻切换为锁定收益。";
  }
  if (snapshot.floorGap <= 8000) {
    return `距离8%防守线只剩${formatMoney(snapshot.floorGap)}，先保住本金和交易资格。`;
  }
  if (!marketGate.canOpenNew) {
    return `${marketGate.detail} 30%目标不能替代市场确认，今天只做持仓硬线。`;
  }
  if (!executableRows.length) {
    return `离目标仍差${formatMoney(snapshot.targetGap)}，但没有候选股同时满足触发价、风险预算和市场闸门。`;
  }
  if (highConviction) {
    return `候选股达到80%+高确定性条件，允许把进攻上限提高到${allowedExposure}%，但仍按止损价反推股数。`;
  }
  if (path.gap < -5000) {
    return `当前落后今日路径${formatMoney(Math.abs(path.gap))}，只能用触发后的试仓修复，不允许直接追到70%-80%。`;
  }
  return `目标资产${formatMoney(stats.targetAssets)}，当前按${allowedExposure}%以内推进；没有新触发就继续保留现金。`;
}

function goalCommandActionDetail(topExecutable, topCandidate, buyBudget, allowedExposure, marketGate) {
  if (!marketGate.canOpenNew) return marketGate.metrics || "指数未确认。";
  if (!topExecutable || !buyBudget) return "候选股未同时满足价格、市场和风险条件。";
  const label = topCandidate ? `${topCandidate.name} ${topCandidate.track}` : topExecutable.name;
  return `优先${label}，参考${formatPrice(topExecutable.refPrice)}，可买${topExecutable.shares}股；总仓不超过${allowedExposure}%。`;
}

function goalCommandSteps(snapshot, path, marketGate, executableRows, buyBudget, allowedExposure) {
  if (snapshot.floorGap <= 8000) {
    return [
      "先处理跌破硬线和利润回撤仓。",
      "收盘前复核是否触发8%防守线。",
      "防守解除前不新增候选股。"
    ];
  }
  if (!marketGate.canOpenNew) {
    return [
      "9:45和14:30只检查持仓硬线。",
      "候选买入全部降为观察。",
      "等上证/深成和创业板/科创50至少多数止跌后再恢复试仓。"
    ];
  }
  if (!executableRows.length) {
    const reviewStep = path.gap < -5000
      ? `若收盘仍落后路径${formatMoney(Math.abs(path.gap))}，复盘是否替换弱仓。`
      : "若候选仍不到价，继续保留现金等下一次触发。";
    return [
      "只挂观察价，不追高成交。",
      "优先等全局候选池前三名回到触发区。",
      reviewStep
    ];
  }
  return [
    `买入预算先看${formatMoney(buyBudget)}，不要超过系统反推股数。`,
    `买后总仓控制在${allowedExposure}%以内。`,
    "成交后立刻把止损价写入盘中检查备注。"
  ];
}

function renderTodayActionRow(item) {
  const actionKey = todayActionKey(item);
  const feedback = actionFeedbackFor(actionKey);
  return `
    <article class="action-row ${item.level}" data-action-row="${escapeAttribute(actionKey)}">
      <div class="action-row-main">
        <span>${item.group}｜${item.code}｜${item.priceText}</span>
        ${renderHoldingActionMeta(item)}
        ${renderRecommendationTags(item)}
        <strong>${item.name}</strong>
        <p>${item.reason}</p>
      </div>
      <b>${item.command}</b>
      ${item.goalImpact ? `
        <div class="action-impact ${item.goalImpact.tone || ""}">
          <span>${item.goalImpact.label}</span>
          <strong>${item.goalImpact.value}</strong>
          <p>${item.goalImpact.detail}</p>
        </div>
      ` : ""}
      <div class="action-price-grid">
        <span><em>执行价</em>${item.executePrice}</span>
        <span><em>风控价</em>${item.riskPrice}</span>
        <span><em>目标/处理</em>${item.targetPrice}</span>
      </div>
      <div class="action-feedback-grid">
        <label>
          <span>执行回填</span>
          <select data-action-feedback="${escapeAttribute(actionKey)}" data-action-field="status" data-action-code="${escapeAttribute(item.code)}" data-action-name="${escapeAttribute(item.name)}" data-action-command="${escapeAttribute(item.command)}" data-action-intent="${escapeAttribute(item.intent || "")}">
            <option value="" ${!feedback.status ? "selected" : ""}>待回填</option>
            <option value="executed" ${feedback.status === "executed" ? "selected" : ""}>已执行</option>
            <option value="partial" ${feedback.status === "partial" ? "selected" : ""}>部分执行</option>
            <option value="no-trigger" ${feedback.status === "no-trigger" ? "selected" : ""}>未触发</option>
            <option value="skipped" ${feedback.status === "skipped" ? "selected" : ""}>主动放弃</option>
          </select>
        </label>
        <label>
          <span>实际价</span>
          <input type="number" min="0" step="0.001" value="${escapeAttribute(feedback.price || "")}" data-action-feedback="${escapeAttribute(actionKey)}" data-action-field="price" data-action-code="${escapeAttribute(item.code)}" data-action-name="${escapeAttribute(item.name)}" data-action-command="${escapeAttribute(item.command)}" data-action-intent="${escapeAttribute(item.intent || "")}">
        </label>
        <label>
          <span>股数</span>
          <input type="number" min="0" step="100" value="${escapeAttribute(feedback.shares || "")}" data-action-feedback="${escapeAttribute(actionKey)}" data-action-field="shares" data-action-code="${escapeAttribute(item.code)}" data-action-name="${escapeAttribute(item.name)}" data-action-command="${escapeAttribute(item.command)}" data-action-intent="${escapeAttribute(item.intent || "")}">
        </label>
        <label class="action-feedback-note">
          <span>备注</span>
          <input type="text" value="${escapeAttribute(feedback.note || "")}" placeholder="例如未到价/已挂单/滑点" data-action-feedback="${escapeAttribute(actionKey)}" data-action-field="note" data-action-code="${escapeAttribute(item.code)}" data-action-name="${escapeAttribute(item.name)}" data-action-command="${escapeAttribute(item.command)}" data-action-intent="${escapeAttribute(item.intent || "")}">
        </label>
      </div>
    </article>
  `;
}

function renderHoldingActionMeta(item) {
  if (!item.holdingMeta) return "";
  return `
    <div class="action-holding-meta">
      <span>成本 <b>${item.holdingMeta.cost}</b></span>
      <span>数量 <b>${item.holdingMeta.quantity}股</b></span>
      <span>盈亏 <b class="${item.holdingMeta.pnlClass}">${item.holdingMeta.pnl}</b></span>
      <span>盈亏率 <b class="${item.holdingMeta.pnlClass}">${item.holdingMeta.pnlRate}</b></span>
    </div>
  `;
}

function renderRecommendationTags(item) {
  if (!item.recommendationTags?.length) return "";
  return `
    <div class="action-recommendation-tags">
      ${item.recommendationTags.map((tag) => `<span>${tag}</span>`).join("")}
    </div>
  `;
}

function todayActionKey(item) {
  return [todayKey(), item.group || "", normalizeCode(item.code), item.command || "", item.intent || ""].join("|");
}

function actionFeedbackFor(actionKey) {
  return (state.actionFeedback?.[todayKey()] || {})[actionKey] || {};
}

function actionFeedbackBucket() {
  const key = todayKey();
  if (!state.actionFeedback || typeof state.actionFeedback !== "object") {
    state.actionFeedback = {};
  }
  if (!state.actionFeedback[key]) {
    state.actionFeedback[key] = {};
  }
  return state.actionFeedback[key];
}

function updateActionFeedback(input) {
  const actionKey = input.dataset.actionFeedback;
  const field = input.dataset.actionField;
  if (!actionKey || !field) return;

  const bucket = actionFeedbackBucket();
  const current = bucket[actionKey] || {};
  const next = {
    ...current,
    code: normalizeCode(input.dataset.actionCode),
    name: input.dataset.actionName || "",
    command: input.dataset.actionCommand || "",
    intent: input.dataset.actionIntent || "",
    updatedAt: nowLabel()
  };

  if (field === "price" || field === "shares") {
    next[field] = input.value === "" ? "" : numeric(input.value);
  } else {
    next[field] = input.value.trim();
  }

  const hasContent = Boolean(next.status || next.price || next.shares || next.note);
  if (hasContent) {
    bucket[actionKey] = next;
  } else {
    delete bucket[actionKey];
  }
  saveState();
}

function todayActionFeedbackSummary() {
  const items = Object.values(state.actionFeedback?.[todayKey()] || {});
  const executed = items.filter((item) => item.status === "executed").length;
  const partial = items.filter((item) => item.status === "partial").length;
  const noTrigger = items.filter((item) => item.status === "no-trigger").length;
  const skipped = items.filter((item) => item.status === "skipped").length;
  const filled = items.filter((item) => item.status || item.price || item.shares || item.note).length;
  return { items, filled, executed, partial, noTrigger, skipped };
}

function todayTradesForCode(code) {
  const normalized = normalizeCode(code);
  const trades = state.intraday?.tradeSnapshot?.trades || [];
  return trades.filter((trade) => normalizeCode(trade.code) === normalized);
}

function todaySellTradesForCode(code) {
  return todayTradesForCode(code).filter((trade) => /卖|减|清/.test(String(trade.action || "")) && numeric(trade.quantity) > 0);
}

function coolingStatusForCode(code) {
  const sells = todaySellTradesForCode(code);
  if (!sells.length) {
    return { blocked: false, label: "无冷却", detail: "今日未记录卖出或减仓。" };
  }
  const shares = sells.reduce((sum, trade) => sum + numeric(trade.quantity), 0);
  const avgPrice = sells.reduce((sum, trade) => sum + numeric(trade.price) * numeric(trade.quantity), 0) / Math.max(1, shares);
  return {
    blocked: true,
    label: "冷却观察",
    detail: `今日已卖出/减仓${shares}股，均价约${formatPrice(avgPrice)}；当天不买回，次日以后需市场、赛道、个股三确认。`
  };
}

function positionTypeFor(position) {
  if (position.positionType) return position.positionType;
  const code = normalizeCode(position.code);
  if (["600276", "600406"].includes(code)) return "核心趋势仓";
  if (["300776", "300433", "002185"].includes(code)) return "战术观察仓";
  return "观察仓";
}

function positionHoldingPeriodFor(position) {
  const type = positionTypeFor(position);
  if (type === "核心趋势仓") return "5-20个交易日";
  if (type === "战术试错仓") return "1-5个交易日";
  return "观察确认后再延长";
}

function sectorGateForCandidate(candidate, marketGate = marketGateView()) {
  const normalized = normalizeCode(candidate.code);
  const items = sectorPrepositionRadarItems(marketGate);
  const matched = items.find((track) => {
    const candidates = (track.candidates || []).map(normalizeCode);
    const text = `${track.track}${track.thesis}${track.status}${candidate.track}${candidateTrackTokens(candidate).join("")}`;
    return candidates.includes(normalized)
      || candidateTrackTokens(candidate).some((token) => text.includes(token));
  });
  if (!matched) {
    return { ok: false, label: "赛道未确认", detail: "未在全行业赛道探针中形成对应强势分支。" };
  }
  const ok = matched.score >= 72 && matched.breadth >= 0.45 && matched.weakCount !== matched.quotedCount;
  return {
    ok,
    label: ok ? "赛道确认" : "赛道待确认",
    detail: `${matched.track}评分${matched.score}，上涨广度${Math.round(matched.breadth * 100)}%，均涨跌${formatSigned(matched.avgPct)}%。`
  };
}

function stockGateForCandidate(candidate, signalView, quote) {
  if (!quote) return { ok: false, label: "个股待刷新", detail: "缺少个股公开行情，不能生成买入。" };
  const pct = numeric(quote.pct);
  const amount = numeric(quote.amount);
  const turnover = numeric(quote.turnover);
  const ok = signalView.level === "ok" && pct <= numeric(candidate.noChasePct || 5) && pct > -4.5;
  const evidence = [
    `涨跌${formatSigned(pct)}%`,
    amount ? `成交额${formatMoney(amount)}` : "",
    turnover ? `换手${formatSigned(turnover)}%` : ""
  ].filter(Boolean).join("｜");
  return {
    ok,
    label: ok ? "个股确认" : "个股待确认",
    detail: evidence || signalView.detail
  };
}

function candidateExecutionGate(candidate, signalView, quote, marketGate = marketGateView()) {
  const cooldown = coolingStatusForCode(candidate.code);
  if (cooldown.blocked) {
    return {
      ok: false,
      level: "cooldown",
      label: "冷却观察",
      detail: cooldown.detail,
      gates: [
        { label: "冷却期", ok: false, detail: cooldown.detail }
      ]
    };
  }
  const market = {
    label: marketGate.canOpenNew ? "市场闸门确认" : "市场闸门未开",
    ok: Boolean(marketGate.canOpenNew),
    detail: marketGate.detail
  };
  const sector = sectorGateForCandidate(candidate, marketGate);
  const stock = stockGateForCandidate(candidate, signalView, quote);
  const gates = [market, sector, stock];
  const ok = gates.every((gate) => gate.ok);
  return {
    ok,
    level: ok ? "confirmed" : "watch",
    label: ok ? "三确认通过" : "三确认不足",
    detail: gates.map((gate) => `${gate.label}:${gate.ok ? "通过" : "未过"}`).join("｜"),
    gates
  };
}

function renderMajorInfoPreview(gate, portfolio = portfolioStats()) {
  const items = rankedMajorInfoItems(gate, portfolio);
  const marketDataReady = gate?.ready;
  const infoUpdatedAt = state.majorInfo?.updatedAt ? formatMajorInfoTime(state.majorInfo.updatedAt) : "未刷新";
  const infoSource = state.majorInfo?.source || "静态模板";
  const headlineCount = numeric(state.majorInfo?.headlineCount);
  return `
    <section class="major-info-module">
      <div class="major-info-head">
        <div>
          <span>重大财经资讯预告</span>
          <strong>先看影响方向，再决定是否提高进攻仓位</strong>
          <p>覆盖经济数据、科技突破、能源电网、外部风险。点击“一键刷新数据”会同步更新本模块；失败才回退静态模板。</p>
        </div>
        <div class="major-info-source">
          <span>${infoSource}</span>
          <strong>${infoUpdatedAt}</strong>
          <p>${headlineCount ? `已扫描${headlineCount}条公开标题。` : (marketDataReady ? "已联动当前持仓。" : "等待持仓导入后联动。")}${state.majorInfo?.status ? `｜${state.majorInfo.status}` : ""}</p>
        </div>
      </div>
      <div class="major-info-list">
        ${items.map(renderMajorInfoCard).join("")}
      </div>
    </section>
  `;
}

function renderMajorInfoCard(item) {
  const relatedText = item.relatedHoldings.length
    ? `持仓联动：${item.relatedHoldings.join("、")}`
    : item.relatedCandidates.length
      ? `候选联动：${item.relatedCandidates.join("、")}`
      : "暂无当前持仓直接联动";
  const eventText = (item.events || []).slice(0, 2).join("；");
  const sourceLinks = Array.isArray(item.links) ? item.links.slice(0, 2) : [];
  return `
    <article class="major-info-card ${item.tone}">
      <div class="major-info-title">
        <div>
          <span>${item.type}｜${item.urgency}｜影响${item.impactLevel}</span>
          <strong>${item.title}</strong>
        </div>
        <b>${item.stance}</b>
      </div>
      <p>${item.summary}</p>
      <p class="major-info-compact-line"><b>资讯：</b>${item.timing}${eventText ? `｜${eventText}` : ""}</p>
      ${sourceLinks.length ? `
        <p class="major-info-source-line"><b>原文：</b>${sourceLinks.map((link) => `<a href="${escapeAttribute(link.url)}" target="_blank" rel="noreferrer">${link.source || "来源"}｜${link.title}</a>`).join("；")}</p>
      ` : ""}
      <div class="major-info-tags">
        ${item.focusSectors.map((sector) => `<span>${sector}</span>`).join("")}
      </div>
      <div class="major-info-action">
        <strong>${relatedText}</strong>
        <p><b>关注：</b>${item.directAction}</p>
        <p><b>风险：</b>${item.riskNote}</p>
      </div>
      <div class="major-stock-list">
        ${item.stocks.slice(0, 3).map((stock) => `
          <span><b>${stock.name}</b>${stock.code}｜${stock.sector}｜${stock.reason}</span>
        `).join("")}
      </div>
    </article>
  `;
}

function formatMajorInfoTime(value) {
  if (!value) return "未刷新";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function rankedMajorInfoItems(gate, portfolio) {
  const holdingCodes = new Set(state.positions.map((position) => normalizeCode(position.code)));
  const candidateCodes = new Set(defaultBuyCandidates.map((candidate) => normalizeCode(candidate.code)));
  const sourceItems = Array.isArray(state.majorInfo?.items) && state.majorInfo.items.length
    ? state.majorInfo.items
    : majorInfoSeed;
  return sourceItems.map((item) => {
    const relatedHoldings = item.stocks
      .filter((stock) => holdingCodes.has(normalizeCode(stock.code)))
      .map((stock) => stock.name);
    const relatedCandidates = item.stocks
      .filter((stock) => candidateCodes.has(normalizeCode(stock.code)) && !holdingCodes.has(normalizeCode(stock.code)))
      .map((stock) => stock.name);
    const impactScore = item.impactLevel === "高" ? 40 : item.impactLevel === "中高" ? 30 : 20;
    const urgencyScore = item.urgency.includes("盘中") || item.urgency.includes("随时") ? 24 : item.urgency.includes("1周") ? 18 : 12;
    const holdingScore = gate?.ready ? relatedHoldings.length * 22 : 0;
    const candidateScore = gate?.ready ? relatedCandidates.length * 12 : 0;
    const riskScore = gate?.ready && item.stance.includes("利空") && numeric(portfolio.exposure) >= 25 ? 10 : 0;
    return {
      ...item,
      relatedHoldings,
      relatedCandidates,
      tone: majorInfoTone(item),
      rank: impactScore + urgencyScore + holdingScore + candidateScore + riskScore
    };
  }).sort((a, b) => b.rank - a.rank);
}

function majorInfoTone(item) {
  if (item.stance.includes("利空")) return "danger";
  if (item.stance.includes("利好")) return "ok";
  return "watch";
}

function rankedBuyCandidates() {
  return defaultBuyCandidates
    .slice()
    .sort((a, b) => candidateUniverseScore(b) - candidateUniverseScore(a));
}

function candidateUniverseScore(candidate) {
  return candidateUniverseDetails(candidate).score;
}

function candidateUniverseDetails(candidate) {
  const trackText = `${candidate.track}${candidate.reason}${candidate.scope || ""}${candidateTrackTokens(candidate).join("")}`;
  const trackScore = matchedTrackScore(trackText);
  const heldCodes = new Set(activePositions().map((position) => normalizeCode(position.code)));
  const isHeld = heldCodes.has(normalizeCode(candidate.code));
  const sameTrackHeld = !isHeld && hasSameTrackHolding(candidate);
  const quote = quoteForCode(candidate.code);
  const signalView = evaluateCandidateSignal(candidate, quote);
  const signalBonus = signalView.level === "ok" ? 20 : signalView.level === "danger" ? -18 : signalView.level === "watch" ? -6 : 0;
  const scopeBonus = candidate.scope === "全局赛道" ? 6 : candidate.scope === "持仓联动" ? 4 : 0;
  const conflictPenalty = !isHeld && sameTrackHeld ? 5 : 0;
  const feedbackScore = candidateJournalFeedback(candidate).score;

  const score = Math.round(
    numeric(candidate.probability)
    + trackScore * 0.18
    + signalBonus
    + scopeBonus
    + feedbackScore
    - conflictPenalty
  );

  return {
    score,
    trackScore,
    isHeld,
    sameTrackHeld,
    signalBonus,
    scopeBonus,
    feedbackScore,
    conflictPenalty,
    signalView
  };
}

function candidateUniverseView(candidate) {
  const details = candidateUniverseDetails(candidate);
  const feedback = candidateJournalFeedback(candidate);
  const levelClass = details.score >= 78 ? "ok" : details.score >= 64 ? "watch" : "neutral";
  const trackLabel = details.trackScore >= 80
    ? "赛道强"
    : details.trackScore >= 65
      ? "赛道中强"
      : details.trackScore > 0
        ? "赛道一般"
        : "赛道待验证";
  const signalLabel = details.signalBonus > 0
    ? "买点加分"
    : details.signalBonus < 0
      ? "买点扣分"
      : "买点待确认";
  const exposureLabel = details.isHeld
    ? "已在持仓"
    : details.sameTrackHeld
      ? "同赛道重叠"
      : "外部轮动";
  const riskLabel = candidate.stopPct
    ? `动态止损${candidate.stopPct}%`
    : `硬止损${formatPrice(candidate.stopPrice)}`;
  const chips = [
    `概率${candidate.probability}%`,
    trackLabel,
    signalLabel,
    exposureLabel,
    riskLabel
  ];
  if (details.feedbackScore) {
    const feedbackScope = feedback.exactCount ? "同股" : "赛道";
    chips.push(`${feedbackScope}复盘${formatSigned(details.feedbackScore)}`);
  }

  return { ...details, levelClass, chips };
}

function candidateTrackTokens(candidate) {
  return unique([
    ...(candidate.tags || []),
    ...(candidate.track || "").split(/[\\/、\s]+/)
  ].map((token) => String(token).trim()).filter((token) => token.length >= 2));
}

function hasSameTrackHolding(candidate) {
  const candidateTokens = candidateConflictTokens(candidate);
  return activePositions().some((position) => {
    const positionTokens = positionTrackTags(position).filter((token) => !broadConflictTags.has(token));
    return candidateTokens.some((token) => {
      return positionTokens.some((positionToken) => {
        return token.includes(positionToken) || positionToken.includes(token);
      });
    });
  });
}

function candidateConflictTokens(candidate) {
  return candidateTrackTokens(candidate).filter((token) => !broadConflictTags.has(token));
}

function candidateJournalFeedback(candidate) {
  const candidateCode = normalizeCode(candidate.code);
  const exactTokens = [candidateCode, candidate.name].filter(Boolean);
  const trackTokens = candidateTrackTokens(candidate).filter((token) => !broadConflictTags.has(token));
  const items = state.journal.filter((item) => item.date !== "样例");
  let score = 0;
  let exactCount = 0;
  let trackCount = 0;

  items.forEach((item) => {
    const text = `${item.symbol || ""}${item.reason || ""}${item.note || ""}`;
    const exactMatch = exactTokens.some((token) => token && text.includes(token));
    const trackMatch = !exactMatch && trackTokens.some((token) => token && text.includes(token));
    if (!exactMatch && !trackMatch) return;

    if (exactMatch) exactCount += 1;
    if (trackMatch) trackCount += 1;

    const base = exactMatch ? 1 : 0.55;
    if (item.result === "盈利") score += 6 * base;
    else if (item.result === "亏损") score -= 8 * base;
    else if (item.action === "买入") score += 2 * base;
    else score += 1 * base;
  });

  return {
    score: Math.round(clamp(score, -12, 10)),
    exactCount,
    trackCount
  };
}

function activePositions() {
  return state.positions.filter((position) => numeric(position.quantity) > 0 || numeric(position.marketValue) > 0);
}

function positionTrackTags(position) {
  const code = normalizeCode(position.code);
  const name = `${position.name || ""}${code}`;
  const mapped = positionTrackTagMap[code] || [];
  const inferred = [];
  if (name.includes("通富")) inferred.push("先进封装", "封测", "半导体", "科技");
  if (name.includes("沪电")) inferred.push("AI", "算力", "PCB", "服务器", "科技");
  if (name.includes("英维克")) inferred.push("AI", "算力", "液冷", "数据中心", "科技");
  if (name.includes("帝尔")) inferred.push("玻璃基板", "TGV", "设备", "科技");
  if (name.includes("思源")) inferred.push("电网设备", "特高压", "电力设备");
  if (name.includes("汇川")) inferred.push("机器人", "智能制造", "工业自动化");
  if (name.includes("阳光")) inferred.push("新能源", "储能", "电力设备");
  return unique([...mapped, ...inferred, name].map((token) => String(token).trim()).filter((token) => token.length >= 2));
}

function unique(items) {
  return Array.from(new Set(items));
}

function resolveCandidateReferencePrice(candidate, quote) {
  if (quote) return numeric(quote.price);
  if (candidate.entryHigh) return numeric(candidate.entryHigh);
  return 0;
}

function resolveCandidateStopPrice(candidate, quote, refPrice = resolveCandidateReferencePrice(candidate, quote)) {
  if (candidate.stopPrice) return numeric(candidate.stopPrice);
  if (candidate.stopPct && refPrice) return Number((refPrice * (1 - numeric(candidate.stopPct) / 100)).toFixed(3));
  return 0;
}

function buildTodayActionAdvice(stats, portfolio, snapshot, path, candidateRows, marketGate = marketGateView()) {
  const holdings = state.positions.map((position) => buildHoldingAdvice(position, portfolio, snapshot))
    .sort((a, b) => b.rank - a.rank);
  const holdingCodes = new Set(state.positions.map((position) => normalizeCode(position.code)));
  const candidates = rankedBuyCandidates().map((candidate) => {
    const row = candidateRows.find((item) => normalizeCode(item.code) === normalizeCode(candidate.code));
    return buildCandidateAdvice(candidate, row, portfolio, marketGate, snapshot);
  })
    .filter((item) => !holdingCodes.has(normalizeCode(item.code)))
    .sort((a, b) => b.rank - a.rank);
  const rows = [...holdings, ...candidates];
  const sellCount = rows.filter((item) => item.intent === "sell").length;
  const buyCount = rows.filter((item) => item.intent === "buy").length;
  const noBuyCount = candidates.filter((item) => item.intent === "avoid").length;
  const title = buildTodayAdviceTitle(sellCount, buyCount, noBuyCount, portfolio, path, marketGate);
  const detail = buildTodayAdviceDetail(stats, portfolio, snapshot, path, sellCount, buyCount, marketGate);
  const meta = `${state.quotes.updatedAt ? `行情 ${state.quotes.updatedAt}` : "行情未刷新"}｜${marketGate.shortLabel}｜仓位 ${portfolio.exposure}%｜路径偏离 ${formatMoney(path.gap)}`;

  return { title, detail, meta, holdings, candidates, marketGate };
}

function buildTodayOrders(stats, portfolio, snapshot, path, candidateRows, marketGate = marketGateView()) {
  const holdings = state.positions.map((position) => buildHoldingAdvice(position, portfolio, snapshot))
    .sort((a, b) => b.rank - a.rank);
  const holdingCodes = new Set(state.positions.map((position) => normalizeCode(position.code)));
  const candidates = rankedBuyCandidates().map((candidate) => {
    const row = candidateRows.find((item) => normalizeCode(item.code) === normalizeCode(candidate.code));
    return buildCandidateAdvice(candidate, row, portfolio, marketGate, snapshot);
  })
    .filter((item) => !holdingCodes.has(normalizeCode(item.code)))
    .sort((a, b) => b.rank - a.rank);

  const sellOrders = holdings.filter((item) => item.intent === "sell").map((item) => ({
    ...item,
    orderType: "sell",
    timeHint: "优先开盘或触线时执行"
  }));

  const buyOrders = candidates.filter((item) => item.intent === "buy").map((item) => ({
    ...item,
    orderType: "buy",
    timeHint: "只在触发价或回踩确认时执行"
  }));

  const holdOrders = holdings.filter((item) => item.intent !== "sell").map((item) => ({
    ...item,
    orderType: item.level === "watch" ? "watch-sell" : "hold",
    timeHint: item.level === "watch" ? "若盘中继续走弱，按硬线处理" : "按持仓硬线持有，不主动加仓"
  }));

  const waitBuy = candidates.filter((item) => item.intent === "avoid" || item.intent === "hold").map((item) => ({
    ...item,
    orderType: "wait-buy",
    timeHint: "未满足触发条件，继续观察"
  }));

  const allOrders = [...sellOrders, ...buyOrders, ...holdOrders, ...waitBuy].sort((a, b) => {
    const priority = { sell: 0, buy: 1, "watch-sell": 2, hold: 3, "wait-buy": 4 };
    return (priority[a.orderType] || 9) - (priority[b.orderType] || 9);
  });

  const sellTotal = sellOrders.reduce((sum, item) => {
    const match = (item.command || "").match(/(\d+)/);
    const shares = match ? numeric(match[1]) : 0;
    return sum + shares * (item.priceText ? parseFloat(item.priceText.replace(/[^0-9.]/g, "")) || 0 : 0);
  }, 0);

  const buyTotal = buyOrders.reduce((sum, item) => {
    const sizing = candidateRows.find((row) => normalizeCode(row.code) === normalizeCode(item.code));
    return sum + (sizing ? numeric(sizing.capital) : 0);
  }, 0);

  const summary = buildTodayOrdersSummary(sellOrders.length, buyOrders.length, sellTotal, buyTotal, snapshot, marketGate);

  return { orders: allOrders, summary, sellOrders, buyOrders, holdOrders, waitBuy, marketGate };
}

function buildTodayOrdersSummary(sellCount, buyCount, sellTotal, buyTotal, snapshot, marketGate) {
  if (!marketGate.canOpenNew && sellCount === 0) {
    return `${marketGate.title}：${marketGate.detail} 今天只执行持仓硬线或持仓卖出，不新增买入。`;
  }
  if (sellCount > 0 && buyCount === 0) {
    return `今天先处理${sellCount}条卖出/减仓线，释放资金后等指数确认再决定是否开新仓。卖出参考金额约${formatMoney(sellTotal)}。`;
  }
  if (sellCount === 0 && buyCount > 0) {
    return `今天有${buyCount}条候选通过三确认，按触发价和风险预算小仓执行；买入参考金额约${formatMoney(buyTotal)}。`;
  }
  if (sellCount > 0 && buyCount > 0) {
    return `今天先处理${sellCount}条卖出/减仓线；买入只执行非冷却标的且三确认通过的${buyCount}条，释放资金约${formatMoney(sellTotal)}，计划投入约${formatMoney(buyTotal)}。`;
  }
  if (snapshot.floorGap <= 8000) {
    return `距离8%防守线只剩${formatMoney(snapshot.floorGap)}，今天以防守为主，不新增进攻仓。`;
  }
  return "今天按触发价和三确认执行，不到条件不动；候选股只观察，不因目标压力追买。";
}

function buildCurrentTodayOrders() {
  const stats = goalStats();
  const portfolio = portfolioStats();
  const snapshot = accountSnapshot(portfolio.marketValue);
  const path = goalPathStats(stats, snapshot);
  const riskBudget = snapshot.activeAssets * numeric(state.riskPerTrade) / 100;
  const marketGate = marketGateView();
  const candidates = candidateSizingRows(stats, portfolio, snapshot.cash, riskBudget, marketGate);
  return buildTodayOrders(stats, portfolio, snapshot, path, candidates, marketGate);
}

function isTriggeredOrder(item) {
  return ["sell", "buy"].includes(item?.orderType);
}

function autoRefreshScheduleTimes() {
  const saved = Array.isArray(state.autoRefresh?.scheduleTimes) ? state.autoRefresh.scheduleTimes : [];
  return saved.length ? saved : AUTO_REFRESH_SCHEDULE_TIMES;
}

function isTradingWeekday(date = new Date()) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

function isBeforeDefaultActionTime(date = new Date()) {
  if (!isTradingWeekday(date)) return false;
  const hm = date.getHours() * 100 + date.getMinutes();
  return hm < 1000;
}

function ymdKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function scheduledDateForTime(baseDate, timeText) {
  const [hour, minute] = String(timeText).split(":").map((item) => Number(item));
  const date = new Date(baseDate);
  date.setHours(Number.isFinite(hour) ? hour : 0, Number.isFinite(minute) ? minute : 0, 0, 0);
  return date;
}

function nextAutoRefreshSlot(now = new Date()) {
  const times = autoRefreshScheduleTimes();
  for (let dayOffset = 0; dayOffset < 8; dayOffset += 1) {
    const day = new Date(now);
    day.setDate(now.getDate() + dayOffset);
    if (!isTradingWeekday(day)) continue;
    for (const timeText of times) {
      const candidate = scheduledDateForTime(day, timeText);
      if (candidate > now) {
        return {
          timeText,
          date: candidate,
          slotKey: `${ymdKey(candidate)}-${timeText}`
        };
      }
    }
  }
  return null;
}

function dueAutoRefreshSlot(now = new Date()) {
  if (!isTradingWeekday(now)) return null;
  const todayKeyValue = ymdKey(now);
  const lastSlotKey = state.autoRefresh?.lastSlotKey || "";
  const due = autoRefreshScheduleTimes()
    .map((timeText) => ({
      timeText,
      date: scheduledDateForTime(now, timeText),
      slotKey: `${todayKeyValue}-${timeText}`
    }))
    .filter((slot) => now >= slot.date && slot.slotKey !== lastSlotKey)
    .sort((a, b) => b.date - a.date);
  return due[0] || null;
}

function nextAutoRefreshLabel() {
  const slot = nextAutoRefreshSlot();
  if (!slot) return "等待下个交易日";
  const today = ymdKey(slot.date) === ymdKey(new Date());
  return `${today ? "今日" : `${String(slot.date.getMonth() + 1).padStart(2, "0")}/${String(slot.date.getDate()).padStart(2, "0")}`} ${slot.timeText}`;
}

function autoRefreshTriggerSummary() {
  if (!state.positions.length) return [];
  const todayOrders = buildCurrentTodayOrders();
  return todayOrders.orders.filter(isTriggeredOrder).map((item) => ({
    name: item.name,
    code: item.code,
    command: item.command || item.orderType,
    orderType: item.orderType,
    level: item.level,
    priceText: item.priceText,
    executePrice: item.executePrice,
    riskPrice: item.riskPrice,
    targetPrice: item.targetPrice,
    reason: item.reason
  }));
}

function updateAutoRefreshMeta(source = "manual", options = {}) {
  const eligible = isAutoRefreshEligible();
  const triggers = eligible ? autoRefreshTriggerSummary() : [];
  const now = nowLabel();
  state.autoRefresh = {
    ...state.autoRefresh,
    enabled: state.autoRefresh?.enabled !== false,
    scheduleTimes: autoRefreshScheduleTimes(),
    intervalMinutes: 0,
    lastAttemptAt: now,
    lastRunAt: source === "auto" ? now : (state.autoRefresh?.lastRunAt || ""),
    lastSlotKey: source === "auto" ? (options.slotKey || state.autoRefresh?.lastSlotKey || "") : (state.autoRefresh?.lastSlotKey || ""),
    nextRunAt: nextAutoRefreshLabel(),
    status: triggers.length
      ? `触发${triggers.length}条执行提醒`
      : !eligible ? "等待今日持仓确认后定时刷新" : source === "auto" ? "定时刷新完成，暂无触发" : "行情已刷新，暂无触发",
    triggerCount: triggers.length,
    triggered: triggers
  };
}

function renderAutoRefreshBanner(liveTriggers = []) {
  const auto = state.autoRefresh || {};
  const schedule = (Array.isArray(auto.scheduleTimes) && auto.scheduleTimes.length ? auto.scheduleTimes : AUTO_REFRESH_SCHEDULE_TIMES).join("/");
  const triggers = liveTriggers.length ? liveTriggers : (Array.isArray(auto.triggered) ? auto.triggered : []);
  const count = triggers.length || numeric(auto.triggerCount);
  const enabled = auto.enabled !== false;
  const tone = count ? "danger" : enabled ? "ok" : "neutral";
  const title = count ? `触发${count}条执行提醒` : enabled ? `${schedule}定时刷新已开启` : "自动刷新已关闭";
  const detail = count
    ? triggers.slice(0, 4).map((item) => `${item.name}${item.command ? `：${item.command}` : ""}`).join("｜")
    : `上次${auto.lastRunAt || auto.lastAttemptAt || "待刷新"}｜下次${auto.nextRunAt || nextAutoRefreshLabel()}｜页面打开时生效`;
  return `
    <div class="auto-refresh-banner ${tone}">
      <div>
        <span>自动盯盘</span>
        <strong>${title}</strong>
        <p>${detail}</p>
      </div>
      <b>${count ? "立即查看高亮行" : auto.status || "等待自动刷新"}</b>
    </div>
  `;
}

function renderTodayOrders(todayOrders) {
  if (!todayOrders) return "";
  const { orders, summary, marketGate = marketGateView() } = todayOrders;
  const triggeredOrders = orders.filter(isTriggeredOrder);
  return `
    <section class="today-orders-module">
      <div class="market-gate-banner ${marketGate.level}">
        <div>
          <span>市场闸门</span>
          <strong>${marketGate.title}</strong>
          <p>${marketGate.detail}</p>
        </div>
        <div>
          <span>${marketGate.shortLabel || "市场状态"}</span>
          <b>${marketGate.metrics}</b>
        </div>
      </div>
      ${renderAutoRefreshBanner(triggeredOrders)}
      <div class="today-orders-head">
        <div>
          <span>唯一买卖入口</span>
          <strong>今日操作建议</strong>
          <p>所有买入、卖出、减仓、观察动作只看这里；下方模块只做仓位、持仓和成交校验。</p>
        </div>
        <div class="today-orders-summary">
          <span>今日动作汇总</span>
          <strong>${summary}</strong>
        </div>
      </div>
      <div class="orders-board">
        ${orders.length ? orders.map(renderTodayOrderRow).join("") : `
          <article class="action-row neutral">
            <div>
              <span>执行指令</span>
              <strong>暂无直接可执行订单</strong>
              <p>持仓未触硬卖线，候选股也未进入触发区；按9:45和14:30检查清单执行。</p>
            </div>
            <b>等待</b>
          </article>
        `}
      </div>
    </section>
  `;
}

function renderTodayOrderRow(item) {
  const actionKey = todayActionKey(item);
  const feedback = actionFeedbackFor(actionKey);
  const triggered = isTriggeredOrder(item);
  const actionLabel = item.orderType === "sell" ? "卖出"
    : item.orderType === "buy" ? "买入"
      : item.orderType === "watch-sell" ? "盯盘"
        : item.orderType === "hold" ? "持有" : "观察";
  const actionTone = item.orderType === "sell" ? "danger"
    : item.orderType === "buy" ? "ok"
      : item.orderType === "watch-sell" ? "watch"
        : item.orderType === "hold" ? item.level : "neutral";
  return `
    <article class="action-row ${actionTone} ${triggered ? "auto-trigger" : ""}" data-order-row="${escapeAttribute(item.code)}|${escapeAttribute(item.intent || item.orderType)}">
      <div class="action-row-main">
        <span>${item.group}｜${item.code}｜${item.priceText}</span>
        ${renderHoldingActionMeta(item)}
        ${renderRecommendationTags(item)}
        <strong>${item.name}</strong>
        <p>${item.reason}</p>
      </div>
      <b>${item.command || actionLabel}</b>
      ${item.goalImpact ? `
        <div class="action-impact ${item.goalImpact.tone || ""}">
          <span>${item.goalImpact.label}</span>
          <strong>${item.goalImpact.value}</strong>
          <p>${item.goalImpact.detail}</p>
        </div>
      ` : ""}
      <div class="action-price-grid">
        <span><em>执行价</em>${item.executePrice}</span>
        <span><em>风控价</em>${item.riskPrice}</span>
        <span><em>目标/处理</em>${item.targetPrice}</span>
      </div>
      <div class="action-time-hint">
        <span><b>时机：</b>${item.timeHint}</span>
      </div>
      <div class="action-feedback-grid">
        <label>
          <span>执行回填</span>
          <select data-action-feedback="${escapeAttribute(actionKey)}" data-action-field="status" data-action-code="${escapeAttribute(item.code)}" data-action-name="${escapeAttribute(item.name)}" data-action-command="${escapeAttribute(item.command || actionLabel)}" data-action-intent="${escapeAttribute(item.intent || item.orderType || "")}">
            <option value="" ${!feedback.status ? "selected" : ""}>待回填</option>
            <option value="executed" ${feedback.status === "executed" ? "selected" : ""}>已执行</option>
            <option value="partial" ${feedback.status === "partial" ? "selected" : ""}>部分执行</option>
            <option value="no-trigger" ${feedback.status === "no-trigger" ? "selected" : ""}>未触发</option>
            <option value="skipped" ${feedback.status === "skipped" ? "selected" : ""}>主动放弃</option>
          </select>
        </label>
        <label>
          <span>实际价</span>
          <input type="number" min="0" step="0.001" value="${escapeAttribute(feedback.price || "")}" data-action-feedback="${escapeAttribute(actionKey)}" data-action-field="price" data-action-code="${escapeAttribute(item.code)}" data-action-name="${escapeAttribute(item.name)}" data-action-command="${escapeAttribute(item.command || actionLabel)}" data-action-intent="${escapeAttribute(item.intent || item.orderType || "")}">
        </label>
        <label>
          <span>股数</span>
          <input type="number" min="0" step="100" value="${escapeAttribute(feedback.shares || "")}" data-action-feedback="${escapeAttribute(actionKey)}" data-action-field="shares" data-action-code="${escapeAttribute(item.code)}" data-action-name="${escapeAttribute(item.name)}" data-action-command="${escapeAttribute(item.command || actionLabel)}" data-action-intent="${escapeAttribute(item.intent || item.orderType || "")}">
        </label>
        <label class="action-feedback-note">
          <span>备注</span>
          <input type="text" value="${escapeAttribute(feedback.note || "")}" placeholder="例如未到价/已挂单/滑点" data-action-feedback="${escapeAttribute(actionKey)}" data-action-field="note" data-action-code="${escapeAttribute(item.code)}" data-action-name="${escapeAttribute(item.name)}" data-action-command="${escapeAttribute(item.command || actionLabel)}" data-action-intent="${escapeAttribute(item.intent || item.orderType || "")}">
        </label>
      </div>
    </article>
  `;
}

function buildTodayAdviceTitle(sellCount, buyCount, noBuyCount, portfolio, path, marketGate) {
  if (sellCount) return "先卖触线风险仓，新仓暂缓";
  if (!marketGate.canOpenNew) return "市场闸门未开，新仓暂停";
  if (buyCount) return "三确认通过才小仓试错";
  if (path.gap < -5000) return "落后路径，但今天不追高";
  if (!portfolio.positions) return "先导入持仓，候选股只按价位埋伏";
  if (noBuyCount >= 2) return "持仓照硬线，新仓大多不到价";
  return "今天照价位执行，不到价不动";
}

function buildTodayAdviceDetail(stats, portfolio, snapshot, path, sellCount, buyCount, marketGate) {
  if (sellCount) {
    return `持仓已触发或接近硬卖线，先降低亏损仓和利润回撤风险；${marketGate.canOpenNew ? "卖完后只看非冷却标的是否同时满足市场、赛道、个股三确认。" : `${marketGate.title}，卖完也不立刻开新仓。`}`;
  }
  if (!marketGate.canOpenNew) {
    return `${marketGate.detail} 当前只处理持仓，不开新仓；等指数确认后再看候选池。`;
  }
  if (buyCount) {
    return "买入只按表内股数、价位和三确认执行，不把30%目标压力转成追高。单票风险仍按当前单笔风险上限控制。";
  }
  if (snapshot.floorGap <= 8000) {
    return `账户距离8%防守线只剩 ${formatMoney(snapshot.floorGap)}，今天以防守为主，不新增进攻仓。`;
  }
  if (path.gap < -5000) {
    return `估算净值落后今日路径 ${formatMoney(Math.abs(path.gap))}，但只能等明确触发价，不能因为目标落后临盘追。`;
  }
  return `目标资产 ${formatMoney(stats.targetAssets)}，当前仓位 ${portfolio.exposure}%。今天直接执行表内价位：卖出线破了卖；买入必须三确认通过，其余不动。`;
}

function targetGapShareText(amount, snapshot = accountSnapshot()) {
  const gap = Math.max(1, Math.abs(numeric(snapshot.targetGap)));
  return `${(Math.abs(numeric(amount)) / gap * 100).toFixed(1)}%目标缺口`;
}

function holdingPnlAtPrice(position, price) {
  const quantity = numeric(position.quantity);
  const cost = numeric(position.cost);
  if (!quantity || !price || !cost) return numeric(position.pnl);
  return Number((quantity * (price - cost)).toFixed(2));
}

function holdingGoalImpact(position, price, intent, snapshot = accountSnapshot(), actionShares = 0) {
  const quantity = numeric(position.quantity);
  const effectivePrice = numeric(price) || numeric(position.currentPrice);
  const marketValue = quantity * effectivePrice;
  const pnl = holdingPnlAtPrice(position, effectivePrice);

  if (intent === "sell") {
    const shares = actionShares === "all"
      ? quantity
      : Math.min(quantity, Math.max(0, numeric(actionShares) || quantity));
    const released = shares * effectivePrice;
    return {
      label: "目标影响",
      value: `释放${formatMoney(released)}`,
      detail: `降低${formatMoney(marketValue)}持仓暴露；当前浮盈亏${formatMoney(pnl)}，约${targetGapShareText(pnl, snapshot)}。`,
      tone: pnl >= 0 ? "ok" : "danger"
    };
  }

  return {
    label: "目标影响",
    value: pnl >= 0 ? `贡献${formatMoney(pnl)}` : `拖累${formatMoney(Math.abs(pnl))}`,
    detail: `占用资金${formatMoney(marketValue)}；浮盈亏约${targetGapShareText(pnl, snapshot)}，未触线时不因目标压力加仓。`,
    tone: pnl >= 0 ? "ok" : "watch"
  };
}

function addHoldingGoalImpact(position, price, shares, stopPrice, snapshot = accountSnapshot()) {
  const effectivePrice = numeric(price) || numeric(position.currentPrice);
  const buyShares = Math.max(0, numeric(shares));
  const capital = buyShares * effectivePrice;
  const risk = Math.max(0, effectivePrice - numeric(stopPrice)) * buyShares;
  return {
    label: "目标影响",
    value: `新增${formatMoney(capital)}`,
    detail: `若按${formatPrice(stopPrice)}止损，单次风险约${formatMoney(risk)}；资金占用约${targetGapShareText(capital, snapshot)}。`,
    tone: "watch"
  };
}

function candidateGoalImpact(candidate, row, activeBuy, marketBlocked, snapshot = accountSnapshot()) {
  if (activeBuy && row?.shares) {
    return {
      label: "目标影响",
      value: `投入${formatMoney(row.capital)}`,
      detail: `止损风险约${formatMoney(row.accountRisk)}；买后仓位${row.afterExposure}%，资金占用约${targetGapShareText(row.capital, snapshot)}。`,
      tone: row.riskOk ? "ok" : "watch"
    };
  }

  if (marketBlocked) {
    return {
      label: "目标影响",
      value: "0新增资金",
      detail: "市场闸门未开，保留现金等待确认，避免用目标压力换取无效回撤。",
      tone: "watch"
    };
  }

  return {
    label: "目标影响",
    value: "等待触发",
    detail: `${candidate.scope || "候选"}未满足买入条件，暂不占用30天目标风险预算。`,
    tone: "neutral"
  };
}

function buildHoldingAdvice(position, portfolio, snapshot = accountSnapshot()) {
  const quote = quoteForCode(position.code);
  const signalView = evaluatePositionSignal(position, quote);
  const price = quote ? numeric(quote.price) : numeric(position.currentPrice);
  const code = normalizeCode(position.code);
  const positionType = positionTypeFor(position);
  const cooling = coolingStatusForCode(code);
  const base = {
    group: `持仓｜${positionType}`,
    name: position.name || code,
    code,
    priceText: price ? `现价${formatPrice(price)}` : "未刷新",
    level: signalView.level === "danger" ? "danger" : signalView.level === "watch" ? "watch" : signalView.level === "ok" ? "ok" : "neutral",
    reason: `${signalView.detail}${cooling.blocked ? ` ${cooling.detail}` : ""}`,
    rank: battleActionRank(signalView, position, portfolio),
    intent: signalView.level === "danger" ? "sell" : "hold",
    holdingMeta: buildHoldingActionMeta(position, price),
    recommendationTags: buildStockRecommendationTags({ code, position, signalView, price }),
    goalImpact: holdingGoalImpact(position, price, signalView.level === "danger" ? "sell" : "hold", snapshot)
  };

  if (["亏损超5%风控", "盈利超20%保护"].includes(signalView.title)) {
    const quantity = numeric(position.quantity);
    const protectShares = signalView.title === "盈利超20%保护"
      ? Math.max(100, roundLotDown(quantity / 2))
      : quantity;
    return {
      ...base,
      command: signalView.title === "盈利超20%保护" ? `减半${protectShares}股` : "减仓/清仓",
      intent: "sell",
      executePrice: "10:00后结合板块承接执行；若盘中继续走弱可直接按风控线处理",
      riskPrice: signalView.title === "盈利超20%保护" ? "盈利超过20%保护线" : "亏损超过5%风控线",
      targetPrice: "若后续一周仍有10%+空间且概率70%+，剩余仓位再继续趋势持有",
      goalImpact: holdingGoalImpact(position, price, "sell", snapshot, protectShares),
      rank: base.rank + 25
    };
  }

  if (code === "002156") {
    const intent = price < 70.8 ? "sell" : "hold";
    return {
      ...base,
      command: price < 68.2 ? "清仓" : price < 70.8 ? "减500-600股" : "持有不加",
      executePrice: "70.8以下减半；68.2以下清仓",
      riskPrice: "68.2清仓线",
      targetPrice: "73.2收回观察；75.3转强",
      intent,
      goalImpact: holdingGoalImpact(position, price, intent, snapshot, price < 68.2 ? "all" : price < 70.8 ? 600 : 0),
      rank: base.rank + 12
    };
  }

  if (code === "002463") {
    const command = price < 145 ? "清仓100股" : price >= 152 && price < 156 ? "兑现100股" : "继续持有";
    const intent = price < 145 || (price >= 152 && price < 156) ? "sell" : "hold";
    return {
      ...base,
      command,
      intent,
      executePrice: "145以下清仓；152-156量弱兑现",
      riskPrice: "145利润保护线",
      targetPrice: "156上方继续拿",
      goalImpact: holdingGoalImpact(position, price, intent, snapshot, 100)
    };
  }

  if (code === "002837") {
    const intent = price < 81.5 ? "sell" : "hold";
    return {
      ...base,
      command: price < 80.5 ? "清仓" : price < 81.5 ? "减200股" : "持有不加",
      intent,
      executePrice: "81.5以下减200股；80.5以下清仓",
      riskPrice: "80.5清仓线",
      targetPrice: "85上方恢复强势",
      goalImpact: holdingGoalImpact(position, price, intent, snapshot, price < 80.5 ? "all" : 200)
    };
  }

  if (code === "300776") {
    const quantity = numeric(position.quantity);
    const command = price < 198
      ? "减仓/清底仓"
      : price < 205
        ? "冷却观察"
        : price >= 212
          ? "趋势观察"
          : "持有不加";
    const intent = price < 198 ? "sell" : "hold";
    return {
      ...base,
      command,
      intent,
      executePrice: cooling.blocked ? "今日已减仓，禁止买回；次日以后再看三确认" : "不主动加仓，只等次日后重新确认",
      riskPrice: position.stop || "跌破198处理战术仓；核心逻辑失效再清",
      targetPrice: position.plan || "收回212并放量才恢复趋势观察；否则只保留底仓",
      goalImpact: holdingGoalImpact(position, price, intent, snapshot, price < 198 ? quantity : 0),
      rank: cooling.blocked ? base.rank + 18 : base.rank
    };
  }

  return {
    ...base,
    command: battleActionLabel(signalView),
    executePrice: position.trigger || "按手动触发价",
    riskPrice: position.stop || "按手动止损价",
    targetPrice: position.plan || "按计划处理"
  };
}

function buildHoldingActionMeta(position, price) {
  const effectivePrice = numeric(price) || numeric(position.currentPrice);
  const calculated = recalculatePosition({
    ...position,
    currentPrice: effectivePrice
  });
  const pnlClass = calculated.pnl >= 0 ? "result-profit" : "result-loss";
  return {
    cost: formatPrice(calculated.cost),
    quantity: calculated.quantity || 0,
    pnl: formatMoney(calculated.pnl),
    pnlRate: `${formatSigned(calculated.pnlRate)}%`,
    pnlClass
  };
}

function buildCandidateAdvice(candidate, row, portfolio, marketGate = marketGateView(), snapshot = accountSnapshot()) {
  const quote = quoteForCode(candidate.code);
  const signalView = evaluateCandidateSignal(candidate, quote);
  const executionGate = row?.executionGate || candidateExecutionGate(candidate, signalView, quote, marketGate);
  const price = quote ? numeric(quote.price) : 0;
  const shares = row ? row.shares : 0;
  const maxStocks = numeric(tradeMechanismPolicy.maxActiveStocks, 3);
  const portfolioFull = activePositions().length >= maxStocks && !candidate.exceptional;
  const beforeDefaultActionTime = isBeforeDefaultActionTime() && !candidate.allowBeforeTen;
  const activeBuy = signalView.level === "ok" && executionGate.ok && shares > 0 && !portfolioFull && !beforeDefaultActionTime;
  const marketBlocked = signalView.level === "ok" && !marketGate.canOpenNew;
  const avoid = marketBlocked || portfolioFull || beforeDefaultActionTime || executionGate.level === "cooldown" || signalView.level === "danger" || ["禁止", "先减", "不加", "失效"].some((keyword) => signalView.title.includes(keyword));
  const rank = activeBuy ? 90 + candidateUniverseScore(candidate) * 0.1 : avoid ? 45 : candidateUniverseScore(candidate);
  const gateText = portfolioFull
    ? `持仓已达${maxStocks}只上限，新增必须先替换弱票。`
    : beforeDefaultActionTime
      ? "10:00前原则上不触发买入，除非预设开盘抢筹规则。"
      : "";
  return {
    group: candidate.scope || "全局埋伏",
    name: candidate.name,
    code: candidate.code,
    priceText: quote ? `现价${formatPrice(price)}` : "待刷新",
    command: activeBuy ? `买${shares}股` : executionGate.level === "cooldown" ? "冷却观察" : marketBlocked ? "市场不买" : portfolioFull ? "先减弱票" : beforeDefaultActionTime ? "10点后再判定" : avoid ? "今天不买" : "等三确认",
    level: activeBuy ? "ok" : avoid ? "watch" : "neutral",
    intent: activeBuy ? "buy" : avoid ? "avoid" : "hold",
    reason: activeBuy
      ? `${signalView.detail} ${executionGate.detail}。预算约${formatMoney(row.capital)}。`
      : gateText
        ? `${gateText} ${signalView.detail} ${candidate.reason}`
        : marketBlocked
        ? `${marketGate.title}：${marketGate.detail}`
        : `${executionGate.label}：${executionGate.detail}。${signalView.detail} ${candidate.reason}`,
    executePrice: candidate.trigger,
    riskPrice: `${candidate.stop}；${candidate.noChase}`,
    targetPrice: candidate.target,
    recommendationTags: buildStockRecommendationTags({ code: candidate.code, candidate, signalView, price }),
    goalImpact: candidateGoalImpact(candidate, row, activeBuy, marketBlocked, snapshot),
    rank
  };
}

function buildStockRecommendationTags({ code, candidate = null, position = null, signalView = null, price = 0 }) {
  const normalizedCode = normalizeCode(code || candidate?.code || position?.code);
  const override = stockRecommendationProfileOverrides[normalizedCode] || {};
  const tokens = candidate
    ? candidateTrackTokens(candidate)
    : (positionTrackTagMap[normalizedCode] || []);
  const trackText = candidate
    ? `${candidate.track || ""}${candidate.reason || ""}${candidate.scope || ""}${tokens.join("")}`
    : `${position?.name || ""}${position?.plan || ""}${position?.trigger || ""}${tokens.join("")}`;
  const trackScore = matchedTrackScore(trackText);
  const sectorHeat = override.heat || resolveSectorHeat(trackScore, tokens);
  const valuation = override.valuation || resolveValuationLabel(tokens, candidate, position);
  const risk = override.risk || resolveRiskLabel(candidate, signalView, tokens);
  const oneMonthMove = override.oneMonthMove || resolveOneMonthMove(candidate, position, signalView, price);
  const holdingDays = override.holdingDays || resolveHoldingDays(risk, sectorHeat, candidate);
  const positionTag = position ? positionTypeFor(position) : null;
  return [
    positionTag,
    sectorHeat,
    valuation,
    risk,
    `1个月${oneMonthMove}`,
    `建议持有期${holdingDays}`
  ].filter(Boolean);
}

function resolveSectorHeat(trackScore, tokens = []) {
  const tokenText = tokens.join("");
  if (trackScore >= 72 || /AI|算力|光模块|半导体|先进封装|玻璃基板|机器人|存储芯片/.test(tokenText)) return "当下热门赛道";
  if (/高股息|电网|医药|防守/.test(tokenText)) return "中性赛道";
  if (trackScore <= 35) return "冷门赛道";
  return "中性赛道";
}

function resolveValuationLabel(tokens = [], candidate = null, position = null) {
  const tokenText = `${tokens.join("")}${candidate?.track || ""}${position?.name || ""}`;
  if (/光模块|AI|算力|机器人|低空|玻璃基板|TGV/.test(tokenText)) return "高估值";
  if (/电网|高股息|央企/.test(tokenText)) return "低估值";
  if (/医药|创新药|封测|半导体|存储/.test(tokenText)) return "正常估值";
  return "正常估值";
}

function resolveRiskLabel(candidate = null, signalView = null, tokens = []) {
  const tokenText = tokens.join("");
  if (signalView?.level === "danger" || numeric(candidate?.stopPct) >= 7.5 || /低空|机器人/.test(tokenText)) return "高风险";
  if (/电网|高股息|医药|防守/.test(tokenText) && signalView?.level !== "watch") return "低风险";
  return "中风险";
}

function resolveOneMonthMove(candidate = null, position = null, signalView = null, price = 0) {
  if (candidate?.expectedMove) return String(candidate.expectedMove).replace(/%至/g, "%至");
  if (signalView?.level === "danger") return "-10%至+4%";
  if (signalView?.level === "ok") return "-4%至+12%";
  if (position?.plan && /防守|电网|医药/.test(position.plan)) return "-3%至+8%";
  return "-6%至+10%";
}

function resolveHoldingDays(risk, sectorHeat, candidate = null) {
  if (candidate?.priority?.includes("防守")) return "10-20天";
  if (risk === "高风险") return "3-5天";
  if (sectorHeat === "当下热门赛道") return "5-10天";
  if (risk === "低风险") return "10-20天";
  return "5-12天";
}

function battlePositionActions(portfolio) {
  return state.positions.map((position) => {
    const quote = quoteForCode(position.code);
    const signalView = evaluatePositionSignal(position, quote);
    const price = quote ? quote.price : numeric(position.currentPrice);
    const level = signalView.level === "danger" ? "danger" : signalView.level === "watch" ? "watch" : "neutral";
    return {
      name: position.name || position.code,
      code: position.code,
      priceText: price ? `现价${formatPrice(price)}` : "未刷新",
      action: battleActionLabel(signalView),
      detail: signalView.detail,
      level,
      rank: battleActionRank(signalView, position, portfolio)
    };
  }).sort((a, b) => b.rank - a.rank).slice(0, 4);
}

function battleActionLabel(signalView) {
  if (signalView.title.includes("清仓")) return "清仓";
  if (signalView.title.includes("减")) return "减仓";
  if (signalView.title.includes("加仓")) return "可加";
  if (signalView.level === "danger") return "先卖";
  if (signalView.level === "watch") return "盯紧";
  if (signalView.level === "ok") return "可拿";
  return "观察";
}

function battleActionRank(signalView, position, portfolio) {
  const value = numeric(position.marketValue);
  const weight = portfolio.marketValue ? value / portfolio.marketValue : 0;
  const levelScore = signalView.level === "danger" ? 100 : signalView.level === "watch" ? 60 : signalView.level === "ok" ? 30 : 10;
  return levelScore + weight * 30;
}

function buildBattleStance(portfolio, snapshot, path, positionActions, candidateActions, marketGate = marketGateView()) {
  const dangerCount = positionActions.filter((item) => item.level === "danger").length;
  const executableCount = candidateActions.filter((item) => item.shares).length;
  if (snapshot.floorGap <= 8000 || dangerCount) {
    return {
      level: "danger",
      title: "先处理风险，不开新仓",
      detail: dangerCount ? "持仓已有硬线风险，开盘先卖弱仓，再看是否有资格进攻。" : "估算净值接近8%防守线，停止新增进攻仓。"
    };
  }
  if (!marketGate.canOpenNew) {
    return {
      level: marketGate.level,
      title: marketGate.title,
      detail: `${marketGate.detail} ${marketGate.metrics}。`
    };
  }
  if (path.gap < -5000) {
    return {
      level: "watch",
      title: "落后路径，等确认再动手",
      detail: "目标压力不能转化成追高，只有候选股触发且指数止跌才加仓。"
    };
  }
  if (executableCount) {
    return {
      level: "ok",
      title: "有触发机会，可小仓执行",
      detail: "先按可买股数执行，不越过仓位推演给出的风险预算。"
    };
  }
  return {
    level: "neutral",
    title: "默认观察，现金等待",
    detail: "开盘先刷新行情，9:45确认指数和科技主线，再决定是否提高仓位。"
  };
}

function renderGoalTracker() {
  const stats = goalStats();
  const snapshot = accountSnapshot();
  const path = goalPathStats(stats, snapshot);
  const alerts = goalPathAlerts(stats, snapshot, path);
  const container = document.querySelector("#goalTracker");
  const progressClass = stats.achievedProfit >= 0 ? "result-profit" : "result-loss";
  const riskClass = stats.floorGap >= 0 ? "result-profit" : "result-loss";
  const estimateClass = snapshot.estimatedDelta >= 0 ? "result-profit" : "result-loss";
  const pathClass = path.gap >= 0 ? "result-profit" : "result-loss";
  const completion = Math.round(stats.completion);
  const estimateCompletion = Math.round(snapshot.estimateCompletion);

  container.innerHTML = `
    <div class="goal-summary">
      <article>
        <span>目标资产</span>
        <strong>${formatMoney(stats.targetAssets)}</strong>
      </article>
      <article>
        <span>距离目标</span>
        <strong>${formatMoney(stats.profitNeeded)}</strong>
      </article>
      <article>
        <span>已完成</span>
        <strong class="${progressClass}">${completion}%</strong>
      </article>
      <article>
        <span>盘中估算</span>
        <strong class="${estimateClass}">${formatMoney(snapshot.estimatedAssets)}</strong>
      </article>
      <article>
        <span>防守底线</span>
        <strong class="${riskClass}">${formatMoney(stats.floorAssets)}</strong>
      </article>
    </div>
    <div class="goal-progress" aria-label="目标完成进度">
      <span style="width: ${clamp(stats.completion, 0, 100)}%"></span>
    </div>
    <div class="goal-brief">
      <strong>${stats.verdict}</strong>
      <p>当前资产 ${formatMoney(stats.currentAssets)}，盘中估算 ${formatMoney(snapshot.estimatedAssets)}，估算完成度 ${estimateCompletion}%，距离目标约 ${formatMoney(snapshot.targetGap)}。现金 ${formatMoney(snapshot.cash)} + 持仓市值 ${formatMoney(snapshot.marketValue)}；若账户跌破 ${formatMoney(stats.floorAssets)}，本轮进攻降级为防守复盘。最后更新：${state.goal.lastUpdated || "未记录"}，估算时间：${snapshot.label}。</p>
    </div>
    <div class="path-grid">
      <article>
        <span>今日路径线</span>
        <strong>${formatMoney(path.plannedAssets)}</strong>
        <p>目标进度 ${path.elapsedRatio}%</p>
      </article>
      <article>
        <span>估算偏离</span>
        <strong class="${pathClass}">${formatMoney(path.gap)}</strong>
        <p>${path.gap >= 0 ? "暂时跑赢路径" : "已经落后路径"}</p>
      </article>
      <article>
        <span>5日目标线</span>
        <strong>${formatMoney(path.fiveDayAssets)}</strong>
        <p>未来5日线性目标</p>
      </article>
      <article>
        <span>本周必须线</span>
        <strong>${formatMoney(path.weekFloorAssets)}</strong>
        <p>${path.modeLabel}</p>
      </article>
      <article>
        <span>剩余日均收益</span>
        <strong>${formatMoney(path.requiredDailyProfit)}</strong>
        <p>${path.note}</p>
      </article>
    </div>
    ${alerts.length ? `
      <div class="goal-alerts">
        ${alerts.map((alert) => `
          <article class="${alert.level}">
            <strong>${alert.title}</strong>
            <p>${alert.detail}</p>
          </article>
        `).join("")}
      </div>
    ` : ""}
    <div class="phase-grid">
      ${goalPhases(stats).map((phase) => `
        <article>
          <span>${phase.stage}</span>
          <strong>${formatMoney(phase.target)}</strong>
          <p>${phase.action}</p>
        </article>
      `).join("")}
    </div>
    <div class="goal-rules">
      <span><b>进攻条件：</b>指数止跌、科技主线至少两个分支共振、持仓票不破硬止损。</span>
      <span><b>加仓节奏：</b>35%-45%验证，50%-70%扩大战果，80%只给极高确定性机会。</span>
      <span><b>失败处理：</b>单票触发止损先退出，不用补仓摊低成本。</span>
    </div>
  `;
}

function renderIntradayChecklist() {
  const container = document.querySelector("#intradayChecklist");
  const snapshot = todayTradeSnapshot();
  const trades = Array.isArray(snapshot.trades) ? snapshot.trades : [];
  const hasSnapshot = hasTradeEvidence(snapshot);
  const netAmount = trades.reduce((sum, trade) => {
    const signed = trade.side === "卖出" ? numeric(trade.amount) : -numeric(trade.amount);
    return sum + signed;
  }, 0);

  container.innerHTML = `
    <section class="trade-snapshot-box ${hasSnapshot ? "has-snapshot" : "no-snapshot"}">
      <div class="trade-snapshot-head">
        <div>
          <span>今日成交记录</span>
          <strong>${hasSnapshot ? `${snapshot.name || "成交截图"}｜${snapshot.importedAt}` : "未上传成交截图，默认今日无交易"}</strong>
          <p>${hasSnapshot ? tradeSnapshotStatusText(snapshot, trades) : "没有上传成交截图不会阻塞数据刷新；系统按今日无交易处理。若盘中有交易，请回到最上端一次性上传成交截图并刷新。"}</p>
        </div>
      </div>
      ${hasSnapshot ? `
        <div class="trade-snapshot-metrics">
          <article>
            <span>解析状态</span>
            <strong>${snapshot.status || "已上传"}</strong>
          </article>
          <article>
            <span>识别成交</span>
            <strong>${trades.length}条</strong>
          </article>
          <article>
            <span>买卖净额</span>
            <strong class="${netAmount >= 0 ? "result-profit" : "result-loss"}">${netAmount >= 0 ? "净流入" : "净买入"} ${formatMoney(Math.abs(netAmount))}</strong>
          </article>
        </div>
        ${trades.length ? `
          <div class="trade-table">
            ${trades.map((trade) => `
              <article class="${trade.side === "卖出" ? "sell" : "buy"}">
                <span>${trade.time || "--"}｜${trade.side || "方向待核"}</span>
                <strong>${trade.name || trade.code} ${trade.code}</strong>
                <p>${formatPrice(trade.price)} × ${trade.quantity}股｜${formatMoney(trade.amount)}</p>
              </article>
            `).join("")}
          </div>
        ` : `
          <div class="trade-ocr-note">
            <strong>已保存截图，但OCR未能稳定解析明细</strong>
            <p>${snapshot.error || "收盘复盘会把它视为今天有交易凭证；具体成交仍以你后续持仓截图为准。"}</p>
          </div>
        `}
      ` : ""}
    </section>

    <section class="intraday-auto-rules">
      <div class="intraday-slot-heading">
        <strong>检查结论</strong>
        <span>不用逐项手动填写</span>
      </div>
      <div class="intraday-rule-summary">
        <article class="${hasSnapshot ? "ok" : "neutral"}">
          <span>成交证据</span>
          <strong>${hasSnapshot ? `已识别${trades.length}条` : "默认无交易"}</strong>
        </article>
        <article class="watch">
          <span>复盘口径</span>
          <strong>以下次持仓截图为准</strong>
        </article>
        <article class="neutral">
          <span>纪律判断</span>
          <strong>${hasSnapshot ? "按成交截图核对" : "不扣手动检查"}</strong>
        </article>
      </div>
    </section>
  `;
}

function todayTradeSnapshot() {
  const snapshot = state.intraday.tradeSnapshot || {};
  return {
    ...structuredClone(defaultState.intraday.tradeSnapshot),
    ...snapshot
  };
}

function hasTradeEvidence(snapshot = todayTradeSnapshot(), dateKey = todayKey()) {
  const trades = Array.isArray(snapshot.trades) ? snapshot.trades : [];
  return Boolean(snapshot.dateKey === dateKey && (snapshot.dataUrl || trades.length || snapshot.rawText));
}

function tradeSnapshotStatusText(snapshot, trades) {
  if (snapshot.status === "识别完成") {
    return `已从成交截图识别到${trades.length}条成交，收盘复盘会按这些记录评估执行纪律。`;
  }
  if (snapshot.status === "识别中" || snapshot.status === "加载OCR库") {
    return "正在识别成交截图，识别完成后会自动更新下方成交表。";
  }
  if (snapshot.status === "识别失败" || snapshot.status === "未识别到成交") {
    return "截图已保存，但明细未稳定解析；今天仍按“有交易凭证”处理，真实持仓以下次持仓截图为准。";
  }
  return "成交截图已保存，收盘复盘会优先读取这张截图，不再要求逐项手动填写检查清单。";
}

async function handleTradeSnapshotFile(file, input) {
  if (!file) return;
  const dataUrl = await compressImageFile(file);
  state.intraday.tradeSnapshot = {
    ...structuredClone(defaultState.intraday.tradeSnapshot),
    dateKey: todayKey(),
    name: file.name || "今日成交截图",
    importedAt: nowLabel(),
    dataUrl,
    status: "已上传，待识别"
  };
  if (input) input.value = "";
  render();
  runTradeSnapshotOcr();
}

async function runTradeSnapshotOcr() {
  const snapshot = todayTradeSnapshot();
  if (!snapshot.dataUrl) return;
  state.intraday.tradeSnapshot.status = "加载OCR库";
  state.intraday.tradeSnapshot.error = "";
  render();

  try {
    const Tesseract = await loadScriptOnce("https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js", "Tesseract");
    state.intraday.tradeSnapshot.status = "识别中";
    render();
    const preparedImages = await prepareTradeSnapshotOcrImages(snapshot.dataUrl);
    const rawTextParts = [];
    for (const image of preparedImages) {
      const result = await Tesseract.recognize(image.dataUrl, "chi_sim+eng", {
        preserve_interword_spaces: "1",
        tessedit_pageseg_mode: "6"
      });
      rawTextParts.push(`【${image.label}】\n${result?.data?.text || ""}`);
    }
    const rawText = rawTextParts.join("\n");
    const trades = consolidateTradeRows(parseTradesFromOcr(rawText));
    state.intraday.tradeSnapshot.rawText = rawText;
    state.intraday.tradeSnapshot.trades = trades;
    state.intraday.tradeSnapshot.status = trades.length ? "识别完成" : "未识别到成交";
    state.intraday.tradeSnapshot.error = trades.length ? "" : "没有从截图中解析出股票、买卖方向、价格和数量的完整组合。";
    render();
  } catch (error) {
    state.intraday.tradeSnapshot.status = "识别失败";
    state.intraday.tradeSnapshot.error = error.message || "成交截图OCR失败";
    render();
  }
}

async function prepareTradeSnapshotOcrImage(dataUrl) {
  const images = await prepareTradeSnapshotOcrImages(dataUrl);
  return images[0]?.dataUrl || dataUrl;
}

async function prepareTradeSnapshotOcrImages(dataUrl) {
  const image = await loadImageFromDataUrl(dataUrl);
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = image.naturalWidth || image.width;
  sourceCanvas.height = image.naturalHeight || image.height;
  const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
  sourceContext.drawImage(image, 0, 0, sourceCanvas.width, sourceCanvas.height);

  const phoneBounds = detectNonDarkBounds(sourceContext, sourceCanvas.width, sourceCanvas.height);
  const x = Math.max(0, Math.round(phoneBounds.x + phoneBounds.width * 0.02));
  const width = Math.min(sourceCanvas.width - x, Math.round(phoneBounds.width * 0.96));
  const y = Math.max(0, Math.round(phoneBounds.y + phoneBounds.height * 0.28));
  const bottom = Math.min(sourceCanvas.height, Math.round(phoneBounds.y + phoneBounds.height * 0.83));
  const height = Math.max(80, bottom - y);
  const half = Math.round(height * 0.56);
  const lowerY = Math.max(y, y + Math.round(height * 0.38));
  const bottomY = Math.max(y, y + Math.round(height * 0.58));

  const crops = [
    { label: "完整成交区", x, y, width, height },
    { label: "上半段成交", x, y, width, height: Math.min(height, half) },
    { label: "下半段成交", x, y: lowerY, width, height: Math.max(80, bottom - lowerY) },
    { label: "底部成交", x, y: bottomY, width, height: Math.max(80, bottom - bottomY) }
  ].filter((crop) => crop.width > 120 && crop.height > 60);

  return crops.map((crop) => ({
    label: crop.label,
    dataUrl: renderHoldingsOcrCrop(sourceCanvas, crop, 1850)
  }));
}

function parseTradesFromOcr(rawText) {
  const text = normalizeOcrText(rawText);
  const mentions = [];
  knownStockCatalog.forEach((stock) => {
    findAllStockMentions(text, stock).forEach((mention) => {
      mentions.push({ ...stock, index: mention.index });
    });
  });

  return mentions
    .sort((a, b) => a.index - b.index)
    .map((mention, index, all) => {
      const end = all[index + 1]?.index ?? text.length;
      return parseTradeChunk(mention, text.slice(mention.index, end));
    })
    .filter(Boolean);
}

function consolidateTradeRows(rows) {
  const grouped = new Map();
  rows.forEach((row) => {
    const code = normalizeCode(row.code);
    if (!code || !numeric(row.price) || !numeric(row.quantity)) return;
    const key = [
      row.time || "",
      code,
      row.side || "",
      Number(numeric(row.price).toFixed(3)),
      numeric(row.quantity),
      Number(numeric(row.amount).toFixed(2))
    ].join("|");
    if (!grouped.has(key)) grouped.set(key, { ...row, code });
  });
  return [...grouped.values()].sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")));
}

function findAllStockMentions(text, stock) {
  const mentions = [];
  const keys = [stock.code, stock.name, ...(stock.aliases || [])].filter(Boolean);
  keys.forEach((key) => {
    let start = 0;
    while (start < text.length) {
      const index = text.indexOf(key, start);
      if (index < 0) break;
      mentions.push({ index, score: 1 });
      start = index + key.length;
    }
  });
  return mentions
    .sort((a, b) => a.index - b.index)
    .filter((mention, index, all) => index === 0 || Math.abs(mention.index - all[index - 1].index) > 32);
}

function parseTradeChunk(stock, chunk) {
  const tokens = extractNumberTokens(chunk);
  const side = /卖出|賣出/.test(chunk) ? "卖出" : /买入|買入/.test(chunk) ? "买入" : "";
  const timeMatch = chunk.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/);
  const priceToken = tokens.find((token) => !token.isPercent && token.hasDecimal && token.value > 1 && token.value < 1000);
  const quantityToken = tokens.find((token) => {
    if (token.isPercent || !token.isInteger) return false;
    if (token.value < 100 || token.value > 50000) return false;
    return token.value % 100 === 0;
  });
  if (!priceToken || !quantityToken) return null;
  const amount = Number((priceToken.value * quantityToken.value).toFixed(2));
  return {
    name: stock.name,
    code: stock.code,
    time: timeMatch?.[0] || "",
    side,
    price: priceToken.value,
    quantity: quantityToken.value,
    amount
  };
}

function renderQuoteStatus() {
  const container = document.querySelector("#quoteStatus");
  if (!container) return;
  const codes = quoteUniverse();
  const indexCount = marketIndexSeed.length;
  const updated = state.quotes.updatedAt ? `｜更新时间 ${state.quotes.updatedAt}` : "";
  container.innerHTML = `
    <article>
      <div>
        <strong>${state.quotes.status || "未刷新"}</strong>
        <p>${state.quotes.source || "公开行情"}${updated}。覆盖 ${codes.length} 个持仓/候选代码和 ${indexCount} 个关键指数，用于更新现价、市值、浮盈亏、触发状态和市场闸门。</p>
      </div>
      <button id="refreshQuotesInline" class="ghost-button" type="button">再刷一次</button>
    </article>
  `;
}

function renderCloseReview() {
  const stats = goalStats();
  const plan = closeReviewPlan(stats);
  const discipline = executionDisciplineSummary();
  const recent = state.closeReviews.slice(0, 5);
  const container = document.querySelector("#closeReviewBox");

  container.innerHTML = `
    <div class="close-review-grid">
      <article>
        <span>今日路径资产</span>
        <strong>${formatMoney(plan.plannedAssets)}</strong>
      </article>
      <article>
        <span>当前偏离</span>
        <strong class="${plan.gap >= 0 ? "result-profit" : "result-loss"}">${formatMoney(plan.gap)}</strong>
      </article>
      <article>
        <span>路径进度</span>
        <strong>${plan.elapsedRatio}%</strong>
      </article>
      <article>
        <span>复盘结论</span>
        <strong>${plan.verdict}</strong>
      </article>
    </div>
    <div class="close-discipline ${discipline.level}">
      <div>
        <span>执行纪律</span>
        <strong>${discipline.score}分｜${discipline.title}</strong>
        <p>${discipline.detail}</p>
      </div>
      <div class="discipline-metrics">
        <span>已检查 <b>${discipline.doneCount}/${discipline.totalCount}</b></span>
        <span>关键漏项 <b>${discipline.missedCritical}</b></span>
        <span>有记录 <b>${discipline.noteCount}</b></span>
      </div>
    </div>
    <div class="close-review-form">
      <input id="closeAssetsInput" type="number" min="0" step="100" placeholder="收盘账户资产，默认${Math.round(stats.currentAssets)}">
      <select id="closeActionSelect">
        <option value="达标">达标</option>
        <option value="轻微偏离">轻微偏离</option>
        <option value="明显偏离">明显偏离</option>
        <option value="触发防守">触发防守</option>
      </select>
      <input id="closeNoteInput" type="text" placeholder="一句话复盘：做对/做错/明日动作">
    </div>
    <div class="close-review-rules">
      <span><b>达标：</b>允许保持或小幅提高进攻仓位。</span>
      <span><b>偏离：</b>先查是否亏在弱仓、追高或未执行止损。</span>
      <span><b>防守：</b>跌破8%回撤底线，停止新增进攻仓。</span>
    </div>
    <div class="review-list">
      ${recent.length ? recent.map((item) => `
        <article>
          <div>
            <strong>${item.date}｜${item.action}</strong>
            <span>资产 ${formatMoney(item.assets)}｜路径偏离 ${formatMoney(item.gap)}｜纪律 ${item.disciplineScore ?? "--"}分</span>
          </div>
          <p>${item.note || item.disciplineNote || "未填写复盘"}</p>
        </article>
      `).join("") : `
        <article class="empty-state">
          <strong>还没有收盘复盘记录。</strong>
          <p>每天收盘后录入账户资产，系统会同步更新30天目标进度。</p>
        </article>
      `}
    </div>
  `;
}

function closeReviewPlan(stats) {
  const start = new Date(`${state.goal.startDate}T00:00:00`);
  const deadline = new Date(`${state.goal.deadline}T23:59:59`);
  const now = new Date();
  const totalMs = Math.max(1, deadline - start);
  const elapsedMs = Math.max(0, Math.min(totalMs, now - start));
  const elapsedRatioRaw = elapsedMs / totalMs;
  const plannedAssets = stats.startAssets + stats.totalTargetProfit * elapsedRatioRaw;
  const gap = stats.currentAssets - plannedAssets;
  const elapsedRatio = Math.round(elapsedRatioRaw * 100);
  const verdict = gap >= 0 ? "不落后" : Math.abs(gap) < stats.totalTargetProfit * 0.08 ? "轻微落后" : "明显落后";
  return { plannedAssets, gap, elapsedRatio, verdict };
}

function executionDisciplineSummary() {
  const snapshot = todayTradeSnapshot();
  const parsedTrades = Array.isArray(snapshot.trades) ? snapshot.trades.length : 0;
  const hasTradeSnapshot = hasTradeEvidence(snapshot);
  const actionFeedback = todayActionFeedbackSummary();
  const skippedActionable = actionFeedback.items.filter((item) => item.status === "skipped" && (item.intent === "sell" || item.intent === "buy"));
  const unfilledActionPenalty = state.positions.length && !actionFeedback.filled ? 6 : 0;
  const snapshotPenalty = hasTradeSnapshot
    ? (parsedTrades ? 0 : 8)
    : 0;
  const noTradeBonus = hasTradeSnapshot ? 0 : 4;
  const score = Math.round(clamp(
    100
      - skippedActionable.length * 12
      - unfilledActionPenalty
      - snapshotPenalty
      + noTradeBonus,
    0,
    100
  ));
  const level = score >= 85 ? "ok" : score >= 65 ? "watch" : "danger";
  const title = hasTradeSnapshot
    ? (parsedTrades ? "成交截图已接入" : "成交截图待复核")
    : "默认无交易日";
  const criticalText = hasTradeSnapshot
    ? (parsedTrades
      ? `今日成交截图识别${parsedTrades}条，按成交记录复盘执行。`
      : "今日已上传成交截图，但OCR未稳定解析，按有交易凭证处理。")
    : "今日未上传成交截图，系统按无交易日处理，不再要求逐项勾选盘中清单。";
  const feedbackText = actionFeedback.filled
    ? `今日建议回填${actionFeedback.filled}条：执行${actionFeedback.executed}、部分${actionFeedback.partial}、未触发${actionFeedback.noTrigger}、放弃${actionFeedback.skipped}。`
    : "今日建议未手动回填，以成交截图和最新持仓截图作为主要证据。";
  const skippedText = skippedActionable.length
    ? `主动放弃的关键建议：${skippedActionable.map((item) => `${item.name}${item.command}`).join("、")}。`
    : "";
  const detail = `${criticalText} ${feedbackText}${skippedText} 收盘复盘先处理执行问题，再讨论明天是否加仓。`;

  return {
    score,
    level,
    title,
    detail,
    totalCount: defaultIntradayChecks.length,
    doneCount: hasTradeSnapshot ? parsedTrades : 0,
    noteCount: hasTradeSnapshot ? 1 : 0,
    missedCritical: 0,
    missedOther: 0,
    missedTitles: [
      ...skippedActionable.map((item) => `${item.name}${item.command}`)
    ]
  };
}

function positionMarketValue(positions = state.positions) {
  return positions.reduce((sum, item) => sum + numeric(item.marketValue), 0);
}

function accountSnapshot(marketValue = positionMarketValue()) {
  const manualAssets = Math.max(0, numeric(state.goal.currentAssets));
  const cash = Math.max(0, numeric(state.account?.cashBalance));
  const estimatedAssets = cash + marketValue;
  const activeAssets = estimatedAssets > 0 ? estimatedAssets : manualAssets;
  const estimatedDelta = estimatedAssets - manualAssets;
  const targetAssets = numeric(state.goal.startAssets) * (1 + numeric(state.goal.targetReturn) / 100);
  const floorAssets = numeric(state.goal.startAssets) * (1 - numeric(state.goal.maxDrawdown) / 100);
  const estimateCompletion = targetAssets > numeric(state.goal.startAssets)
    ? (estimatedAssets - numeric(state.goal.startAssets)) / (targetAssets - numeric(state.goal.startAssets)) * 100
    : 0;

  return {
    manualAssets,
    cash,
    marketValue,
    estimatedAssets,
    estimatedDelta,
    activeAssets,
    targetGap: targetAssets - estimatedAssets,
    floorGap: estimatedAssets - floorAssets,
    estimateCompletion,
    label: state.account?.estimatedUpdatedAt || state.account?.cashUpdatedAt || "未估算"
  };
}

function goalPathStats(stats, snapshot) {
  const start = new Date(`${state.goal.startDate}T00:00:00`);
  const deadline = new Date(`${state.goal.deadline}T23:59:59`);
  const now = new Date();
  const mode = "trading";
  const pathBasis = mode === "calendar"
    ? calendarPathBasis(start, deadline, now)
    : tradingPathBasis(start, deadline, now);
  const elapsedRatioRaw = pathBasis.elapsedRatioRaw;
  const plannedAssets = stats.startAssets + stats.totalTargetProfit * elapsedRatioRaw;
  const fiveDayAssets = stats.startAssets + stats.totalTargetProfit * pathBasis.fiveDayRatio;
  const weekFloorAssets = stats.startAssets + stats.totalTargetProfit * pathBasis.weekFloorRatio;
  const gap = snapshot.estimatedAssets - plannedAssets;
  const requiredDailyProfit = (stats.targetAssets - snapshot.estimatedAssets) / pathBasis.daysLeft;

  return {
    plannedAssets,
    fiveDayAssets,
    weekFloorAssets,
    gap,
    requiredDailyProfit,
    elapsedRatio: Math.round(elapsedRatioRaw * 100),
    daysLeft: pathBasis.daysLeft,
    modeLabel: pathBasis.modeLabel,
    note: pathBasis.note
  };
}

function calendarPathBasis(start, deadline, now) {
  const totalMs = Math.max(1, deadline - start);
  const elapsedMs = Math.max(0, Math.min(totalMs, now - start));
  const remainingMs = Math.max(0, totalMs - elapsedMs);
  const fiveDayMs = Math.min(remainingMs, 5 * 86400000);
  const weekEnd = endOfWeek(now);
  const weekMs = Math.max(0, Math.min(deadline, weekEnd) - start);
  return {
    elapsedRatioRaw: elapsedMs / totalMs,
    fiveDayRatio: (elapsedMs + fiveDayMs) / totalMs,
    weekFloorRatio: clamp(weekMs / totalMs, 0, 1),
    daysLeft: Math.max(1, Math.ceil((deadline - now) / 86400000)),
    modeLabel: "自然日",
    note: "按自然日线性推进。"
  };
}

function tradingPathBasis(start, deadline, now) {
  const totalSessions = Math.max(1, countWeekdays(addDays(start, 1), deadline));
  const elapsedSessions = clamp(countWeekdays(addDays(start, 1), now), 0, totalSessions);
  const remainingSessions = Math.max(1, totalSessions - elapsedSessions);
  const fiveDaySessions = Math.min(5, remainingSessions);
  const weekEnd = endOfWeek(now);
  const weekSessions = clamp(countWeekdays(addDays(start, 1), minDate(deadline, weekEnd)), 0, totalSessions);
  return {
    elapsedRatioRaw: elapsedSessions / totalSessions,
    fiveDayRatio: clamp((elapsedSessions + fiveDaySessions) / totalSessions, 0, 1),
    weekFloorRatio: weekSessions / totalSessions,
    daysLeft: remainingSessions,
    modeLabel: "交易日推进",
    note: "按周一至周五推进，未扣除法定节假日。"
  };
}

function countWeekdays(start, end) {
  const startDate = stripTime(start);
  const endDate = stripTime(end);
  if (endDate < startDate) return 0;
  let count = 0;
  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    const day = date.getDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function minDate(a, b) {
  return a <= b ? a : b;
}

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfWeek(date) {
  const end = stripTime(date);
  const day = end.getDay();
  const offset = day === 0 ? -2 : day === 6 ? -1 : 5 - day;
  end.setDate(end.getDate() + offset);
  end.setHours(23, 59, 59, 999);
  return end;
}

function goalPathAlerts(stats, snapshot, path) {
  const alerts = [];
  const estimateManualGap = snapshot.estimatedAssets - stats.currentAssets;
  if (Math.abs(estimateManualGap) >= 5000) {
    alerts.push({
      level: estimateManualGap >= 0 ? "ok" : "watch",
      title: "盘中估算与手动资产偏离超过5000",
      detail: `当前估算与手动资产差异 ${formatMoney(estimateManualGap)}，收盘复盘时建议核对现金和持仓市值。`
    });
  }

  if (path.gap <= -5000) {
    alerts.push({
      level: "danger",
      title: "已落后今日目标路径",
      detail: `估算净值低于今日路径线 ${formatMoney(Math.abs(path.gap))}，优先处理弱仓，新增仓位必须等触发确认。`
    });
  } else if (path.gap >= 5000) {
    alerts.push({
      level: "ok",
      title: "暂时跑赢目标路径",
      detail: `估算净值高于今日路径线 ${formatMoney(path.gap)}，可以保留进攻资格，但盈利仓要用移动止盈。`
    });
  }

  if (snapshot.floorGap <= 8000) {
    const floorDetail = snapshot.floorGap < 0
      ? `估算净值已跌破防守底线 ${formatMoney(Math.abs(snapshot.floorGap))}，停止新增进攻仓，先降波动。`
      : `距离防守底线仅 ${formatMoney(snapshot.floorGap)}，停止新增进攻仓，先降波动。`;
    alerts.push({
      level: "danger",
      title: "接近8%防守线",
      detail: floorDetail
    });
  }

  return alerts;
}

function goalStats() {
  const startAssets = Math.max(1, numeric(state.goal.startAssets));
  const currentAssets = Math.max(0, numeric(state.goal.currentAssets));
  const targetReturn = Math.max(1, numeric(state.goal.targetReturn));
  const maxDrawdown = Math.max(1, numeric(state.goal.maxDrawdown));
  const targetAssets = startAssets * (1 + targetReturn / 100);
  const totalTargetProfit = targetAssets - startAssets;
  const achievedProfit = currentAssets - startAssets;
  const profitNeeded = targetAssets - currentAssets;
  const completion = totalTargetProfit ? achievedProfit / totalTargetProfit * 100 : 0;
  const floorAssets = startAssets * (1 - maxDrawdown / 100);
  const floorGap = currentAssets - floorAssets;
  const today = new Date();
  const deadline = new Date(`${state.goal.deadline}T23:59:59`);
  const rawDaysLeft = Number.isFinite(deadline.getTime()) ? Math.ceil((deadline - today) / 86400000) : 1;
  const daysLeft = Math.max(1, rawDaysLeft);
  const requiredFromCurrent = currentAssets ? ((targetAssets / currentAssets - 1) * 100).toFixed(1) : "0.0";
  const verdict = buildGoalVerdict(completion, floorGap, requiredFromCurrent);

  return {
    startAssets,
    currentAssets,
    targetReturn,
    targetAssets,
    totalTargetProfit,
    achievedProfit,
    profitNeeded,
    completion,
    floorAssets,
    floorGap,
    daysLeft,
    requiredFromCurrent,
    verdict
  };
}

function buildGoalVerdict(completion, floorGap, requiredFromCurrent) {
  if (floorGap < 0) return "已触发防守线，先停止进攻。";
  if (completion >= 100) return "目标已达成，优先锁定收益。";
  if (Number(requiredFromCurrent) >= 25) return "目标仍然激进，只能用强确认机会推进。";
  if (completion >= 45) return "进度进入中段，可以用盈利垫扩大进攻。";
  return "当前是第一阶段，先验证主线再加仓。";
}

function goalPhases(stats) {
  const base = stats.startAssets;
  const profit = stats.totalTargetProfit;
  return [
    {
      stage: "第1阶段",
      target: base + profit * 0.18,
      action: "仓位35%-45%，只做科技主线修复确认。"
    },
    {
      stage: "第2阶段",
      target: base + profit * 0.55,
      action: "仓位50%-70%，集中最强分支和最强个股。"
    },
    {
      stage: "第3阶段",
      target: base + profit * 0.85,
      action: "用盈利垫进攻，弱票不补，强票移动止盈。"
    },
    {
      stage: "目标线",
      target: stats.targetAssets,
      action: "接近目标后降杠杆思维，先保住成果。"
    }
  ];
}

function renderSizingPlanner() {
  const container = document.querySelector("#sizingPlanner");
  if (!container) return;

  const goal = goalStats();
  const portfolio = portfolioStats();
  const snapshot = accountSnapshot(portfolio.marketValue);
  const cash = snapshot.cash;
  const riskBudget = snapshot.activeAssets * numeric(state.riskPerTrade) / 100;
  const drawdownRoom = Math.max(0, snapshot.floorGap);
  const currentExposure = portfolio.exposure;
  const marketGate = marketGateView();
  const scenarios = exposureScenarios(goal, portfolio, cash, marketGate);
  const plannerVerdict = buildSizingVerdict(goal, portfolio, cash, marketGate);

  container.innerHTML = `
    <div class="sizing-summary">
      <article>
        <span>当前仓位</span>
        <strong>${currentExposure}%</strong>
      </article>
      <article>
        <span>估算现金</span>
        <strong>${formatMoney(cash)}</strong>
      </article>
      <article>
        <span>单笔风险上限</span>
        <strong>${formatMoney(riskBudget)}</strong>
      </article>
      <article>
        <span>距8%防守线</span>
        <strong class="${drawdownRoom > 0 ? "result-profit" : "result-loss"}">${formatMoney(drawdownRoom)}</strong>
      </article>
    </div>
    <div class="sizing-verdict">
      <strong>${plannerVerdict.title}</strong>
      <p>${plannerVerdict.detail}</p>
    </div>
    <div class="exposure-grid">
      ${scenarios.map((item) => `
        <article class="${item.level}">
          <span>${item.label}</span>
          <strong>${item.exposure}%</strong>
          <p>${item.action}</p>
          <b>${item.amountText}</b>
        </article>
      `).join("")}
    </div>
    <div class="support-note">
      <strong>定位说明</strong>
      <p>本模块只校验总仓、现金、回撤线和风险预算，不再生成个股买卖建议。具体买入、卖出、观察动作只看顶部“今日操作建议”。</p>
    </div>
  `;
}

function exposureScenarios(goal, portfolio, cash, marketGate = marketGateView()) {
  const snapshot = accountSnapshot(portfolio.marketValue);
  return [
    {
      label: "空仓等待",
      exposure: 0,
      level: "neutral",
      gate: "大盘趋势不好且没有机会时，允许果断空仓等待。"
    },
    {
      label: "中等预期",
      exposure: 35,
      level: "ok",
      gate: "大盘趋势好但个股空间中等，仓位维持3-5成。"
    },
    {
      label: "波段进攻",
      exposure: 50,
      level: "watch",
      gate: "右侧趋势确认、板块前排股共振时使用，不追左侧下跌。"
    },
    {
      label: "强趋势高预期",
      exposure: 80,
      level: "danger",
      gate: "仅用于大盘趋势好、个股高空间且止损很近的机会。"
    }
  ].map((scenario) => {
    const targetValue = snapshot.activeAssets * scenario.exposure / 100;
    const gap = targetValue - portfolio.marketValue;
    const usable = Math.min(cash, Math.max(0, gap));
    const needReduce = Math.max(0, -gap);
    const overSlider = scenario.exposure > numeric(state.maxPosition);
    const amountText = !marketGate.canOpenNew
      ? "暂不新增"
      : needReduce > 0
      ? `需先减 ${formatMoney(needReduce)}`
      : usable > 0
        ? `最多新增 ${formatMoney(usable)}`
        : "无需新增";
    const action = marketGate.canOpenNew
      ? `${scenario.gate}${overSlider ? ` 当前滑块上限为${state.maxPosition}%，需手动确认。` : ""}`
      : `${marketGate.title}，暂不新增；${scenario.gate}`;
    return { ...scenario, action, amountText };
  });
}

function candidateSizingRows(goal, portfolio, cash, riskBudget, marketGate = marketGateView()) {
  const snapshot = accountSnapshot(portfolio.marketValue);
  return rankedBuyCandidates().map((candidate) => {
    const quote = quoteForCode(candidate.code);
    const signalView = evaluateCandidateSignal(candidate, quote);
    const executionGate = candidateExecutionGate(candidate, signalView, quote, marketGate);
    const refPrice = resolveCandidateReferencePrice(candidate, quote);
    const stopPrice = resolveCandidateStopPrice(candidate, quote, refPrice);
    const stopRisk = Math.max(0, refPrice - stopPrice);
    const maxSharesByRisk = stopRisk ? roundLotDown(riskBudget / stopRisk) : 0;
    const maxSharesByCapital = roundLotDown(Math.min(cash, numeric(candidate.capitalMax)) / Math.max(1, refPrice));
    const signalAllowsBuy = signalView.level === "ok" && executionGate.ok;
    const shares = signalAllowsBuy ? Math.max(0, Math.min(maxSharesByRisk, maxSharesByCapital)) : 0;
    const capital = shares * refPrice;
    const accountRisk = shares * stopRisk;
    const afterExposure = Math.round((portfolio.marketValue + capital) / Math.max(1, snapshot.activeAssets) * 1000) / 10;
    const riskOk = accountRisk <= riskBudget && afterExposure <= Math.max(numeric(state.maxPosition), portfolio.exposure);
    const detail = buildCandidateSizingDetail(candidate, signalView, shares, accountRisk, riskBudget, afterExposure, marketGate, executionGate);

    return {
      name: candidate.name,
      code: candidate.code,
      refPrice,
      shares,
      capital,
      accountRisk,
      afterExposure,
      riskOk,
      signalTitle: signalView.title,
      executionGate,
      detail
    };
  });
}

function buildCandidateSizingDetail(candidate, signalView, shares, accountRisk, riskBudget, afterExposure, marketGate = marketGateView(), executionGate = null) {
  if (!shares) {
    if (executionGate && !executionGate.ok) {
      return `${executionGate.label}：${executionGate.detail}。当前只观察，不生成买入股数。`;
    }
    if (signalView.level === "ok" && !marketGate.canOpenNew) {
      return `${marketGate.title}：${marketGate.detail} 当前不生成买入股数。`;
    }
    return `${signalView.detail} 当前不生成买入股数。`;
  }
  const riskText = accountRisk > riskBudget ? "超过单笔风险，需降股数" : "单笔风险可控";
  const exposureText = afterExposure > numeric(state.maxPosition)
    ? `买后超过当前${state.maxPosition}%仓位滑块，需你手动确认`
    : "买后仍在当前仓位纪律内";
  return `${candidate.priority}｜${signalView.detail} ${riskText}，${exposureText}。`;
}

function buildSizingVerdict(goal, portfolio, cash, marketGate = marketGateView()) {
  const snapshot = accountSnapshot(portfolio.marketValue);
  if (snapshot.floorGap <= 0) {
    return {
      title: "先防守，停止新增",
      detail: "账户已接近或跌破8%防守线，当前目标应从进攻切换到控制回撤。"
    };
  }
  if (!marketGate.canOpenNew) {
    return {
      title: "市场未允许进攻，可空仓等待",
      detail: `${marketGate.detail} 当前现金保留，新仓不生成买入股数。`
    };
  }
  if (portfolio.exposure < 35) {
    return {
      title: "可等待触发后小幅加仓",
      detail: `当前仓位约${portfolio.exposure}%，现金约${formatMoney(cash)}。若周一科技主线确认，优先从35%-45%验证，不直接跳到重仓。`
    };
  }
  if (portfolio.exposure <= 45) {
    return {
      title: "处于第一阶段进攻区",
      detail: "只有候选股进入触发区且持仓硬线未破，才考虑继续提高到50%-70%。"
    };
  }
  return {
    title: "仓位已经偏进攻",
    detail: "新增仓位前先检查弱仓是否处理，不能让亏损仓和新仓同时放大回撤。"
  };
}

function roundLotDown(shares) {
  return Math.max(0, Math.floor(numeric(shares) / 100) * 100);
}

function setOptionalText(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = value;
}

function renderSummary() {
  const sectors = scoredSectors();
  const top = sectors[0];
  const topRunway = scoredRunways()[0];
  const averageFit = Math.round(sectors.reduce((sum, item) => sum + item.fit, 0) / sectors.length);
  const portfolio = portfolioStats();
  const marketGate = marketGateView();
  setOptionalText("#topRunwayProbability", topRunway ? `${topRunway.probability}%` : "--");
  setOptionalText("#mainTheme", top.name);
  setOptionalText("#riskTemperature", riskTemperature());
  setOptionalText("#holdingScore", portfolio.positions ? String(portfolio.score) : "--");
  setOptionalText("#focusScore", String(averageFit));
  setOptionalText("#marketMood", marketGate.shortLabel || (averageFit >= 75 ? "积极跟踪" : averageFit >= 62 ? "均衡观察" : "等待确认"));
}

function renderPortfolio() {
  const summary = document.querySelector("#portfolioSummary");
  const list = document.querySelector("#positionList");
  if (!summary || !list) return;
  const stats = portfolioStats();
  renderScreenshotImport();

  if (!state.positions.length) {
    summary.innerHTML = `
      <article class="empty-state">
        <strong>${state.thsConnection.screenshotDataUrl ? "已同步首屏截图，等待识别成持仓表。" : "先在首屏导入持仓截图，我再给硬判断。"}</strong>
        <p>${state.thsConnection.screenshotDataUrl ? "当前页面读取首屏上传的同一张截图。请回到首屏点击“识别截图生成持仓表”，识别后所有操作建议会同步使用同一份数据。" : "请先在最上端一次性导入最新券商持仓截图，后续所有板块会同步使用同一份数据。"}</p>
      </article>
    `;
    list.innerHTML = "";
    return;
  }

  summary.innerHTML = `
    <article><span>持仓数</span><strong>${stats.positions}</strong></article>
    <article><span>总市值</span><strong>${formatMoney(stats.marketValue)}</strong></article>
    <article><span>有效仓位</span><strong>${stats.exposure}%</strong></article>
    <article><span>浮动盈亏</span><strong class="${stats.pnl >= 0 ? "result-profit" : "result-loss"}">${formatMoney(stats.pnl)}</strong></article>
    <article><span>组合结论</span><strong>${stats.verdict}</strong></article>
  `;

  list.innerHTML = state.positions.map((position, index) => {
    const quote = quoteForCode(position.code);
    const recalculated = recalculatePosition(position);
    const marketValue = numeric(recalculated.marketValue) || numeric(recalculated.quantity) * numeric(recalculated.currentPrice);
    const pnl = numeric(recalculated.pnl);
    const pnlRate = numeric(recalculated.pnlRate);
    const pnlClass = pnl >= 0 ? "result-profit" : "result-loss";
    const weight = stats.marketValue ? Math.round(marketValue / stats.marketValue * 1000) / 10 : 0;
    return `
      <article class="position-card compact">
        <div>
          <strong>${position.name || position.code} <span>${normalizeCode(position.code)}｜${recalculated.quantity || "--"}股｜成本 ${formatPrice(recalculated.cost)}｜现价 ${formatPrice(recalculated.currentPrice)}</span></strong>
          <div class="quote-snapshot">
            ${quote ? `
              <span>行情 <b>${formatPrice(quote.price)}</b></span>
              <span>涨跌 <b class="${quote.pct >= 0 ? "result-profit" : "result-loss"}">${formatSigned(quote.pct)}%</b></span>
              <span>高低 ${formatPrice(quote.low)} / ${formatPrice(quote.high)}</span>
              <span>${formatQuoteTime(quote.time)}</span>
            ` : `
              <span>行情待刷新</span>
            `}
          </div>
          <p class="position-reason">本区只核对持仓数据，不输出买卖判断；操作以顶部“今日操作建议”为准。</p>
        </div>
        <div class="position-numbers">
          <span>代码 ${normalizeCode(position.code)}</span>
          <span>数量 ${recalculated.quantity || 0}股</span>
          <span>权重 ${weight}%</span>
          <span>市值 ${formatMoney(marketValue)}</span>
          <strong class="${pnlClass}">${formatMoney(pnl)}</strong>
          <span class="${pnlClass}">盈亏率 ${formatSigned(pnlRate)}%</span>
          <button class="tag" type="button" data-remove-position="${index}">移除</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderScreenshotImport() {
  const container = document.querySelector("#screenshotImport");
  if (!container) return;
  const connection = state.thsConnection;
  if (!connection.screenshotDataUrl) {
    container.innerHTML = `
      <article class="screenshot-empty">
        <strong>首屏截图同步</strong>
        <p>这里不再单独上传。请在最上端“今日操作建议与作战页”导入一次最新持仓截图，识别后本板块自动同步。</p>
      </article>
    `;
    return;
  }

  container.innerHTML = `
    <article class="screenshot-card">
      <div>
        <strong>已同步首屏持仓截图</strong>
        <span>${connection.screenshotName || "截图"}｜${connection.screenshotImportedAt || "刚刚导入"}</span>
        <p>状态：本板块读取首屏同一份截图和 OCR 持仓表。若盘中成交变化，请回到最上端重新导入最新截图。</p>
      </div>
      <img src="${connection.screenshotDataUrl}" alt="最新持仓截图预览">
    </article>
  `;
}

function portfolioStats() {
  const marketValue = positionMarketValue();
  const pnl = state.positions.reduce((sum, item) => sum + numeric(item.pnl), 0);
  const snapshot = accountSnapshot(marketValue);
  const exposure = Math.round(marketValue / Math.max(1, snapshot.activeAssets) * 1000) / 10;
  const weights = state.positions.map((item) => marketValue ? numeric(item.marketValue) / marketValue : 0);
  const maxWeight = weights.length ? Math.max(...weights) : 0;
  const lossCount = state.positions.filter((item) => numeric(item.pnl) < 0).length;
  const concentrationPenalty = maxWeight > 0.35 ? 18 : maxWeight > 0.25 ? 10 : 0;
  const countPenalty = state.positions.length > tradeMechanismPolicy.maxActiveStocks
    ? (state.positions.length - tradeMechanismPolicy.maxActiveStocks) * 12
    : 0;
  const lossPenalty = lossCount * 4;
  const fitBonus = state.positions.reduce((sum, item) => sum + matchedTrackScore(`${item.name}${item.code}`), 0) / Math.max(1, state.positions.length);
  const score = Math.round(clamp(72 + fitBonus * 0.18 - concentrationPenalty - countPenalty - lossPenalty, 0, 99));
  const verdict = score >= 78 ? "结构可持" : score >= 62 ? "需要优化" : "必须收缩";

  return {
    positions: state.positions.length,
    marketValue,
    pnl,
    exposure,
    maxWeight,
    score,
    verdict
  };
}

function evaluatePosition(position, stats) {
  const value = numeric(position.marketValue);
  const weight = stats.marketValue ? Math.round(value / stats.marketValue * 100) : 0;
  const pnl = numeric(position.pnl);
  const text = `${position.name}${position.code}`;
  const trackScore = matchedTrackScore(text);
  const isConcentrated = weight >= 30;
  const isLoser = pnl < 0;

  if (isConcentrated && isLoser) {
    return {
      weight,
      action: "降仓",
      levelClass: "result-loss",
      direct: "这笔仓位又重又亏，不能继续用希望扛着。",
      reason: position.stop ? `按硬线执行：${position.stop}。` : "先把仓位降到组合可承受范围，再等板块重新走强。"
    };
  }

  if (trackScore >= 70 && !isConcentrated) {
    return {
      weight,
      action: "保留",
      levelClass: "result-profit",
      direct: "方向还在主线或潜伏赛道内，没必要急着砍。",
      reason: position.trigger ? `保留条件：${position.trigger}。` : "用5日线和板块强弱做持有条件，跌破就减少犹豫。"
    };
  }

  if (isConcentrated) {
    return {
      weight,
      action: "减重",
      levelClass: "result-loss",
      direct: "单票权重偏高，组合容错不够。",
      reason: position.stop ? `先看止损/减仓线：${position.stop}。` : "不管你多看好，单票过重都会放大情绪化操作。"
    };
  }

  if (isLoser && trackScore < 45) {
    return {
      weight,
      action: "淘汰",
      levelClass: "result-loss",
      direct: "亏损且不在强赛道，优先清理。",
      reason: "弱标占仓会拖慢你切换到新主线的速度。"
    };
  }

  return {
    weight,
    action: "观察",
    levelClass: "",
    direct: "暂时不急着动，但要给它明确条件。",
    reason: "若不能跑赢所属板块，下一次反弹优先换出。"
  };
}

function scoredRunways() {
  const tokens = familiarTokens();
  return runwaySeed.map((item) => {
    const familiarBonus = item.tags.some((tag) => tokens.some((token) => tag.includes(token) || token.includes(tag))) ? 7 : 0;
    const watchBonus = state.watchlist.some((watch) => item.tags.some((tag) => `${watch.name}${watch.tag}`.includes(tag))) ? 5 : 0;
    const positionPenalty = state.positions.some((position) => item.tags.some((tag) => `${position.name}${position.code}`.includes(tag))) ? 3 : 0;
    return {
      ...item,
      fit: Math.round(clamp(item.score + familiarBonus + watchBonus - positionPenalty, 0, 99))
    };
  }).sort((a, b) => b.fit - a.fit);
}

function matchedTrackScore(text) {
  const sectorScore = sectorSeed.reduce((best, sector) => {
    const matched = sector.tags.some((tag) => text.includes(tag)) || text.includes(sector.name);
    return matched ? Math.max(best, scoreSector(sector)) : best;
  }, 0);
  const runwayScore = runwaySeed.reduce((best, track) => {
    const matched = track.tags.some((tag) => text.includes(tag)) || text.includes(track.track);
    return matched ? Math.max(best, track.score) : best;
  }, 0);
  return Math.max(sectorScore, runwayScore);
}

function renderAdvice() {
  const container = document.querySelector("#adviceBox");
  if (!container) return;
  const [first, second] = scoredSectors();
  const riskText = riskTemperature();
  const familiar = familiarTokens().slice(0, 3).join("、") || "你熟悉的行业";
  const entries = [
    {
      title: `优先主线：${first.name}`,
      text: `适配度 ${first.fit}，与当前${dominantStyle()}风格最接近。只在板块热度延续且个股不脱离买点时参与。`
    },
    {
      title: `备选方向：${second.name}`,
      text: `适合作为轮动观察。若主线分歧加大，可比较成交额、领涨股持续性和回撤幅度。`
    },
    {
      title: `纪律提醒：${riskText}`,
      text: `单笔风险控制在 ${state.riskPerTrade}% 附近，常态最多3只股；弱市可空仓，好行情中等预期3-5成，高预期强趋势最多8成。优先选择你熟悉的 ${familiar}。`
    }
  ];

  container.innerHTML = entries.map((item) => `
    <article class="advice-item">
      <strong>${item.title}</strong>
      <p>${item.text}</p>
    </article>
  `).join("");
}

function escapeAttribute(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function numeric(value) {
  const cleaned = String(value ?? "")
    .replace(/,/g, "")
    .replace(/元|股|%|\s/g, "")
    .replace(/[()（）]/g, "-");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeCode(code) {
  const digits = String(code ?? "").replace(/\D/g, "");
  return digits.length >= 6 ? digits.slice(-6) : digits;
}

function quoteSymbol(code) {
  const normalized = normalizeCode(code);
  if (!/^\d{6}$/.test(normalized)) return "";
  if (/^[69]/.test(normalized)) return `sh${normalized}`;
  if (/^[48]/.test(normalized)) return `bj${normalized}`;
  return `sz${normalized}`;
}

function quoteUniverse() {
  const codes = [
    ...state.positions.map((position) => position.code),
    ...defaultBuyCandidates.map((candidate) => candidate.code),
    ...sectorPrepositionProbeSeed.flatMap((track) => (track.probes || []).map((probe) => probe.code))
  ];
  return [...new Set(codes.map(normalizeCode).filter((code) => /^\d{6}$/.test(code)))];
}

function quoteForCode(code) {
  return state.quotes.byCode[normalizeCode(code)] || null;
}

function marketGateView() {
  const indexes = marketIndexSeed.map((item) => ({
    ...item,
    quote: state.quotes.byIndex[item.key] || null
  }));
  const available = indexes.filter((item) => item.quote);
  if (!available.length) {
    return {
      level: "watch",
      title: "市场闸门待刷新",
      shortLabel: "闸门待刷新",
      canOpenNew: false,
      detail: "刷新行情后会同步读取上证、深成、创业板和科创50；未确认市场环境前，不生成新仓买入股数。",
      metrics: "指数未刷新",
      score: 0
    };
  }

  const broad = available.filter((item) => item.role === "broad");
  const tech = available.filter((item) => item.role === "tech");
  const broadAvg = averagePct(broad);
  const techAvg = averagePct(tech);
  const weakCount = available.filter((item) => numeric(item.quote.pct) <= -0.8).length;
  const dangerCount = available.filter((item) => numeric(item.quote.pct) <= -1.5).length;
  const positiveCount = available.filter((item) => numeric(item.quote.pct) > 0).length;
  const metrics = available.map((item) => `${item.name}${formatSigned(item.quote.pct)}%`).join("｜");

  if (dangerCount >= 2 || techAvg <= -1.5 || (broadAvg <= -1 && techAvg <= -0.8)) {
    return {
      level: "danger",
      title: "市场闸门关闭",
      shortLabel: "停止开新仓",
      canOpenNew: false,
      detail: "指数和科技主线同步走弱，只处理持仓硬线，不做候选新仓。",
      metrics,
      score: 25
    };
  }

  if (weakCount >= 2 || techAvg < -0.8 || broadAvg < -0.6) {
    return {
      level: "watch",
      title: "市场闸门半开",
      shortLabel: "只观察",
      canOpenNew: false,
      detail: "指数仍偏弱或科技线未止跌，候选股即使到触发价也先不生成买入股数。",
      metrics,
      score: 45
    };
  }

  if (positiveCount >= 3 && broadAvg >= 0 && techAvg >= 0.3) {
    return {
      level: "ok",
      title: "市场允许进攻",
      shortLabel: "允许进攻",
      canOpenNew: true,
      detail: "主要指数多数转强，科技线具备配合度，可以按候选股触发价小仓执行。",
      metrics,
      score: 78
    };
  }

  if (positiveCount >= 2 && broadAvg >= -0.2 && techAvg >= -0.1) {
    return {
      level: "neutral",
      title: "市场可小仓试错",
      shortLabel: "小仓试错",
      canOpenNew: true,
      detail: "指数未明显走坏，但也不是强确认，只允许按仓位预算做小股数验证。",
      metrics,
      score: 62
    };
  }

  return {
    level: "watch",
    title: "市场还未确认",
    shortLabel: "等待确认",
    canOpenNew: false,
    detail: "指数分化，暂时不把候选触发价当作买入指令，等9:45或尾盘确认。",
    metrics,
    score: 50
  };
}

function averagePct(items) {
  if (!items.length) return 0;
  return items.reduce((sum, item) => sum + numeric(item.quote?.pct), 0) / items.length;
}

function refreshPublicQuotes(options = {}) {
  const source = options.source || "manual";
  const codes = quoteUniverse();
  state.quotes.status = source === "auto" ? "自动刷新行情中" : "行情刷新中";
  renderQuoteStatus();

  return Promise.all([loadTencentQuotes(codes), loadTencentIndexQuotes()])
    .then(([quotes, indexQuotes]) => {
      const count = Object.keys(quotes).length;
      const indexCount = Object.keys(indexQuotes).length;
      if (!count && !indexCount) throw new Error("公开行情源没有返回有效价格");
	      state.quotes.byCode = { ...state.quotes.byCode, ...quotes };
        state.quotes.byIndex = { ...state.quotes.byIndex, ...indexQuotes };
	      state.quotes.updatedAt = nowLabel();
	      state.quotes.status = `已刷新 ${count}/${codes.length} 个股票，${indexCount}/${marketIndexSeed.length} 个指数`;
	      updateQuoteGateMeta();
	      applyQuotesToPositions(quotes);
      updateEstimatedAccountMeta();
      updateAutoRefreshMeta(source, options);
      render();
    })
    .catch((error) => {
      state.quotes.status = `行情刷新失败：${error.message || "网络不可用"}`;
      state.autoRefresh = {
        ...state.autoRefresh,
        lastAttemptAt: nowLabel(),
        lastSlotKey: source === "auto" ? (options.slotKey || state.autoRefresh?.lastSlotKey || "") : (state.autoRefresh?.lastSlotKey || ""),
        nextRunAt: nextAutoRefreshLabel(),
        status: source === "auto" ? `定时刷新失败：${error.message || "网络不可用"}` : (state.autoRefresh?.status || "等待自动刷新")
      };
      renderQuoteStatus();
      saveState();
    });
}

async function syncLatestData(options = {}) {
  await applyPanelSync();
  await refreshMajorInfo(options);

  const hasHoldingScreenshot = Boolean(state.thsConnection.screenshotDataUrl);
  const needsHoldingOcr = hasHoldingScreenshot && !state.positions.length && !isOcrRunning();
  if (needsHoldingOcr) {
    await runScreenshotOcr();
  }

  const snapshot = todayTradeSnapshot();
  const hasTradeSnapshot = hasTradeEvidence(snapshot);
  const tradeNeedsOcr = hasTradeSnapshot
    && !["识别完成", "未识别到成交", "识别失败"].includes(snapshot.status || "");
  if (tradeNeedsOcr) {
    await runTradeSnapshotOcr();
  }

  return refreshPublicQuotes(options);
}

function isAutoRefreshEligible() {
  return state.autoRefresh?.enabled !== false
    && state.positions.length > 0
    && state.decisionGate.positionConfirmDateKey === todayKey();
}

function startAutoRefreshLoop() {
  if (autoRefreshTimer) return;
  state.autoRefresh = {
    ...state.autoRefresh,
    enabled: state.autoRefresh?.enabled !== false,
    scheduleTimes: autoRefreshScheduleTimes(),
    intervalMinutes: 0,
    nextRunAt: state.autoRefresh?.nextRunAt || nextAutoRefreshLabel(),
    status: isAutoRefreshEligible()
      ? (state.autoRefresh?.status || "等待08:00/14:00定时刷新")
      : "等待今日持仓确认后定时刷新",
    triggerCount: isAutoRefreshEligible() ? (state.autoRefresh?.triggerCount || 0) : 0,
    triggered: isAutoRefreshEligible() ? (state.autoRefresh?.triggered || []) : []
  };
  saveState();
  autoRefreshTimer = window.setInterval(() => {
    runAutoRefreshTick();
  }, AUTO_REFRESH_POLL_MS);
  runAutoRefreshTick();
}

async function runAutoRefreshTick() {
  if (autoRefreshRunning) return;
  const dueSlot = dueAutoRefreshSlot();
  if (!dueSlot) {
    const eligible = isAutoRefreshEligible();
    state.autoRefresh = {
      ...state.autoRefresh,
      scheduleTimes: autoRefreshScheduleTimes(),
      nextRunAt: nextAutoRefreshLabel(),
      status: eligible ? (state.autoRefresh?.status || "等待08:00/14:00定时刷新") : "等待今日持仓确认后定时刷新",
      triggerCount: eligible ? state.autoRefresh?.triggerCount || 0 : 0,
      triggered: eligible ? (state.autoRefresh?.triggered || []) : []
    };
    saveState();
    render();
    return;
  }
  if (!isAutoRefreshEligible()) {
    state.autoRefresh = {
      ...state.autoRefresh,
      scheduleTimes: autoRefreshScheduleTimes(),
      lastAttemptAt: nowLabel(),
      lastSlotKey: dueSlot.slotKey,
      nextRunAt: nextAutoRefreshLabel(),
      status: "等待今日持仓确认后定时刷新",
      triggerCount: 0,
      triggered: []
    };
    saveState();
    render();
    return;
  }

  autoRefreshRunning = true;
  state.autoRefresh = {
    ...state.autoRefresh,
    scheduleTimes: autoRefreshScheduleTimes(),
    lastAttemptAt: nowLabel(),
    lastSlotKey: dueSlot.slotKey,
    status: `${dueSlot.timeText}定时刷新中`
  };
  render();

  try {
    await syncLatestData({ source: "auto", slotKey: dueSlot.slotKey });
  } finally {
    autoRefreshRunning = false;
  }
}

function loadTencentQuotes(codes) {
  const symbols = codes.map(quoteSymbol).filter(Boolean);
  return loadTencentSymbols(symbols).then((symbolQuotes) => {
    const quotes = {};
    Object.values(symbolQuotes).forEach((quote) => {
      if (quote) quotes[quote.code] = quote;
    });
    return quotes;
  });
}

function loadTencentIndexQuotes() {
  const symbols = marketIndexSeed.map((item) => item.symbol);
  return loadTencentSymbols(symbols).then((symbolQuotes) => {
    const quotes = {};
    marketIndexSeed.forEach((item) => {
      const quote = symbolQuotes[item.symbol];
      if (quote) {
        quotes[item.key] = {
          ...quote,
          indexKey: item.key,
          indexName: item.name,
          indexRole: item.role
        };
      }
    });
    return quotes;
  });
}

function loadTencentSymbols(symbols) {
  const uniqueSymbols = [...new Set(symbols.filter(Boolean))];
  if (!uniqueSymbols.length) return Promise.resolve({});
  uniqueSymbols.forEach((symbol) => {
    window[`v_${symbol}`] = undefined;
  });

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timer = window.setTimeout(() => {
      script.remove();
      reject(new Error("行情接口超时"));
    }, 8000);

    script.charset = "gbk";
    script.src = `https://qt.gtimg.cn/q=${uniqueSymbols.join(",")}&_=${Date.now()}`;
    script.onload = () => {
      window.clearTimeout(timer);
      const quotes = {};
      uniqueSymbols.forEach((symbol) => {
        const quote = parseTencentQuote(symbol, window[`v_${symbol}`]);
        if (quote) quotes[symbol] = quote;
      });
      script.remove();
      resolve(quotes);
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      script.remove();
      reject(new Error("无法连接公开行情源"));
    };
    document.body.appendChild(script);
  });
}

function parseTencentQuote(symbol, raw) {
  if (!raw || typeof raw !== "string") return null;
  const parts = raw.split("~");
  const code = normalizeCode(parts[2] || symbol);
  const price = numeric(parts[3]);
  if (!code || !price) return null;

  return {
    symbol,
    code,
    price,
    prevClose: numeric(parts[4]),
    open: numeric(parts[5]),
    time: parts[30] || "",
    change: numeric(parts[31]),
    pct: numeric(parts[32]),
    high: numeric(parts[33]),
    low: numeric(parts[34]),
    volume: numeric(parts[36]),
    amount: numeric(parts[37]),
    turnover: numeric(parts[38])
  };
}

function applyQuotesToPositions(quotes) {
  state.positions = state.positions.map((position) => {
    const quote = quotes[normalizeCode(position.code)];
    if (!quote) return position;
    const quantity = numeric(position.quantity);
    const cost = numeric(position.cost);
    const currentPrice = Number(quote.price.toFixed(3));
    return {
      ...position,
      currentPrice,
      marketValue: Number((quantity * currentPrice).toFixed(2)),
      pnl: Number((quantity * (currentPrice - cost)).toFixed(2))
    };
  });
}

function updateEstimatedAccountMeta() {
  const snapshot = accountSnapshot();
  state.account.lastEstimatedAssets = Number(snapshot.estimatedAssets.toFixed(2));
  state.account.estimatedUpdatedAt = state.quotes.updatedAt || nowLabel();
}

function evaluatePositionSignal(position, quote) {
  const price = quote ? numeric(quote.price) : numeric(position.currentPrice);
  const code = normalizeCode(position.code);
  const disciplineSignal = positionDisciplineSignal(position, price);
  if (disciplineSignal) return disciplineSignal;

  if (code === "002156") {
    if (price < 68.2) return signal("danger", "清仓线触发", "通富微电跌破68.2，按原计划优先清掉剩余风险仓。");
    if (price < 70.8) return signal("danger", "减半线触发", "通富微电跌破70.8，按周一计划减持约500-600股。");
    if (price < 73.2) return signal("watch", "只观察", "尚未站回73.2，不加仓，等止跌确认。");
    if (price >= 75.3) return signal("ok", "转强确认", "站回75.3后才考虑从防守转为持有观察。");
    return signal("neutral", "暂缓处理", "70.8上方但未转强，先按计划持有观察。");
  }

  if (code === "002463") {
    if (price < 145) return signal("danger", "保护线触发", "沪电跌破145，利润仓按计划清掉100股。");
    if (price >= 156) return signal("ok", "继续拿", "站回156说明修复强，利润仓可继续用移动止盈。");
    if (price >= 152) return signal("watch", "看量兑现", "152-156若量能不足，优先分批锁利润。");
    return signal("neutral", "利润仓观察", "还在145上方，先保护收益，不主动加仓。");
  }

  if (code === "002837") {
    if (price < 80.5) return signal("danger", "清仓线触发", "英维克跌破80.5，按计划清仓处理。");
    if (price < 81.5) return signal("danger", "减仓线触发", "英维克跌破81.5，先减200股保护利润。");
    if (price >= 85) return signal("ok", "恢复强势", "站回85后短线趋势修复，继续拿。");
    return signal("neutral", "可留不加", "81.5上方但未转强，继续拿，不加仓。");
  }

  if (code === "300776") {
    if (price < 183) return signal("danger", "处理线触发", "帝尔激光跌破183，按计划处理风险。");
    if (price < 198) return signal("danger", "战术仓破位", "跌破198说明战术仓继续走弱，优先减仓或清掉短线部分。");
    if (price < 205) return signal("watch", "冷却观察", "减仓后不做同日买回，先看是否能重新收回205。");
    if (price >= 212) return signal("ok", "趋势修复观察", "收回212并放量才说明趋势修复，但仍需次日后再评估是否加回。");
    return signal("neutral", "持有不加", "205上方但未重新转强，保留底仓观察，不追买。");
  }

  return signal("neutral", "按手动计划", "未配置专属硬线，参考持仓里的止损和触发条件。");
}

function positionDisciplineSignal(position, price) {
  const cost = numeric(position.cost);
  const currentPrice = numeric(price) || numeric(position.currentPrice);
  const pnlRate = cost > 0 && currentPrice > 0
    ? (currentPrice - cost) / cost * 100
    : numeric(position.pnlRate);
  if (pnlRate <= tradeMechanismPolicy.lossReviewPct) {
    return signal(
      "danger",
      "亏损超5%风控",
      `当前亏损约${formatSigned(pnlRate)}%，按纪律开始减仓/清仓评估；除非赛道、量价和催化同时出现明确反转。`
    );
  }
  if (pnlRate >= tradeMechanismPolicy.profitHalfProtectPct) {
    return signal(
      "danger",
      "盈利超20%保护",
      `当前盈利约${formatSigned(pnlRate)}%，原则上先减半保护利润；只有未来一周10%以上空间且概率超过70%才继续满仓位拿。`
    );
  }
  return null;
}

function evaluateCandidateSignal(item, quote) {
  if (!quote) return signal("neutral", "等待行情刷新", "先刷新行情，再判断是否触发买入条件。");
  const cooldown = coolingStatusForCode(item.code);
  if (cooldown.blocked) return signal("watch", "冷却观察", cooldown.detail);
  const price = numeric(quote.price);

  if (item.id === "dier-laser") {
    if (price < 183) return signal("danger", "失效", "跌破183，先不考虑新增。");
    if (price < 188) return signal("watch", "不加仓", "跌破188不加仓，只观察是否收回。");
    if (price > 205) return signal("watch", "禁止追高", "已高于205禁追区，等回踩或次日确认。");
    if (price >= 200 || (price >= 186 && price <= 190)) return signal("ok", "三确认候选", "价格进入观察区，但必须市场、玻璃基板/设备赛道和个股量价同时确认才可试仓。");
    return signal("neutral", "继续等", "处在触发区之外，暂不急着买。");
  }

  if (item.id === "lens-tech") {
    if (price < 52.6) return signal("danger", "失效", "跌破52.6，撤回观察。");
    if ((price >= 53.5 && price <= 55) || price >= 57.5) return signal("ok", "触发观察", "满足企稳或突破条件，但仍要看是否高开低走。");
    return signal("neutral", "继续等", "未到53.5-55企稳区，也未突破57.5。");
  }

  if (item.id === "huatian-tech") {
    const tongfu = state.positions.find((position) => normalizeCode(position.code) === "002156");
    if (tongfu && numeric(tongfu.quantity) > 600) {
      return signal("watch", "先减通富", "通富未减到半仓前，不叠加新的封测仓位。");
    }
    if (price < 21.3) return signal("danger", "失效", "跌破21.3，先进封装替代仓先不做。");
    if ((price >= 22 && price <= 22.6) || price >= 23.2) return signal("ok", "触发观察", "满足企稳或突破确认，但最好在通富减仓后再叠加。");
    return signal("neutral", "继续等", "未到22.0-22.6企稳区，也未突破23.2。");
  }

  return evaluateGenericCandidateSignal(item, quote);
}

function evaluateGenericCandidateSignal(item, quote) {
  const price = numeric(quote.price);
  const pct = numeric(quote.pct);
  const open = numeric(quote.open);
  const low = numeric(quote.low);
  const stopPrice = resolveCandidateStopPrice(item, quote, price);
  const noChasePct = numeric(item.noChasePct) || 5;
  const triggerLow = Number.isFinite(Number(item.triggerPctLow)) ? Number(item.triggerPctLow) : -1;
  const triggerHigh = Number.isFinite(Number(item.triggerPctHigh)) ? Number(item.triggerPctHigh) : 3;
  const recoveredFromLow = low > 0 && price >= low * 1.018;
  const recoveredVsOpen = open > 0 && price >= open;

  if (stopPrice && price < stopPrice) {
    return signal("danger", "失效", `跌破动态止损价${formatPrice(stopPrice)}，撤回观察。`);
  }
  if (pct > noChasePct) {
    return signal("watch", "禁止追高", `单日涨幅已超过${noChasePct}%，不追，等回踩或次日确认。`);
  }
  if (pct < -4.5) {
    return signal("watch", "等止跌", "跌幅过大，先看是否止跌修复，不做盘中接飞刀。");
  }
  if (pct >= 0 && pct <= triggerHigh && recoveredVsOpen) {
    return signal("ok", "触发观察", `温和走强且未进入禁追区，可按${item.scope || "全局"}候选规则小仓评估。`);
  }
  if (item.allowPullback && pct >= triggerLow && pct < 0 && recoveredFromLow) {
    return signal("ok", "回踩修复", "小幅回踩后从低点修复，可作为低吸观察，但必须小仓。");
  }
  return signal("neutral", "继续等", "未满足温和走强或回踩修复条件，继续观察。");
}

function signal(level, title, detail) {
  return { level, title, detail };
}

function formatPrice(value) {
  return numeric(value).toFixed(2);
}

function formatSigned(value, digits = 2) {
  const number = numeric(value);
  return `${number > 0 ? "+" : ""}${number.toFixed(digits)}`;
}

function formatQuoteTime(value) {
  const raw = String(value || "");
  if (/^\d{14}$/.test(raw)) {
    return `${raw.slice(4, 6)}/${raw.slice(6, 8)} ${raw.slice(8, 10)}:${raw.slice(10, 12)}`;
  }
  return raw || state.quotes.updatedAt || "时间未知";
}

function formatMoney(value) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 100000000) return `${sign}${(abs / 100000000).toFixed(2)}亿`;
  if (abs >= 10000) return `${sign}${(abs / 10000).toFixed(2)}万`;
  return `${sign}${abs.toFixed(0)}`;
}

function nowLabel() {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());
}

function updateImportMeta(source) {
  state.thsConnection.lastImportAt = nowLabel();
  state.thsConnection.importSource = source;
  state.decisionGate.importDateKey = todayKey();
  state.decisionGate.importConfirmedAt = state.thsConnection.lastImportAt;
  clearPositionAndQuoteConfirmation();
}

function updateScreenshotMeta(file, dataUrl) {
  state.thsConnection.screenshotName = file.name || "持仓截图";
  state.thsConnection.screenshotImportedAt = nowLabel();
  state.thsConnection.screenshotDataUrl = dataUrl;
  state.decisionGate.screenshotDateKey = todayKey();
  state.decisionGate.screenshotConfirmedAt = state.thsConnection.screenshotImportedAt;
  clearPositionAndQuoteConfirmation();
}

function clearPositionAndQuoteConfirmation() {
  state.decisionGate.positionConfirmDateKey = "";
  state.decisionGate.positionConfirmedAt = "";
  state.decisionGate.positionSignature = "";
  state.decisionGate.quotesDateKey = "";
  state.decisionGate.quotesConfirmedAt = "";
}

function updateQuoteGateMeta() {
  state.decisionGate.quotesDateKey = todayKey();
  state.decisionGate.quotesConfirmedAt = state.quotes.updatedAt || nowLabel();
}

function confirmPositionTable() {
  if (!state.thsConnection.screenshotDataUrl || state.decisionGate.screenshotDateKey !== todayKey()) {
    render();
    return;
  }
  state.decisionGate.positionConfirmDateKey = todayKey();
  state.decisionGate.positionConfirmedAt = nowLabel();
  state.decisionGate.positionSignature = positionTableSignature();
  state.decisionGate.quotesDateKey = "";
  state.decisionGate.quotesConfirmedAt = "";
  render();
}

function positionTableSignature(positions = state.positions) {
  return positions
    .map((position) => [
      normalizeCode(position.code),
      numeric(position.quantity),
      Number(numeric(position.cost).toFixed(3))
    ].join(":"))
    .sort()
    .join("|");
}

function recalculatePosition(position) {
  const quantity = numeric(position.quantity);
  const cost = numeric(position.cost);
  const currentPrice = numeric(position.currentPrice);
  const pnl = Number((quantity * (currentPrice - cost)).toFixed(2));
  const pnlRate = quantity > 0 && cost > 0
    ? Number(((currentPrice - cost) / cost * 100).toFixed(2))
    : numeric(position.pnlRate);
  return {
    ...position,
    code: normalizeCode(position.code),
    quantity,
    cost,
    currentPrice,
    marketValue: Number((quantity * currentPrice).toFixed(2)),
    pnl,
    pnlRate
  };
}

function isValidPositionForConfirmation(position) {
  return Boolean(
    (position.name || "").trim()
    && /^\d{6}$/.test(normalizeCode(position.code))
    && numeric(position.quantity) > 0
    && numeric(position.currentPrice) > 0
  );
}

function blankManualPosition() {
  return recalculatePosition({
    name: "",
    code: "",
    quantity: 0,
    cost: 0,
    currentPrice: 0,
    marketValue: 0,
    pnl: 0,
    sector: "截图补录",
    plan: "手动补录，需核对确认",
    stop: "按截图校正后设置",
    trigger: "按截图校正后设置"
  });
}

function markPositionsCorrected(source) {
  state.ocr.status = source;
  state.ocr.parsedCount = state.positions.length;
  state.ocr.parsedAt = nowLabel();
  if (state.thsConnection.screenshotDataUrl && !state.thsConnection.lastImportAt) {
    state.thsConnection.lastImportAt = nowLabel();
  }
  if (state.thsConnection.screenshotDataUrl) {
    state.thsConnection.importSource = source;
    state.decisionGate.importDateKey = todayKey();
    state.decisionGate.importConfirmedAt = state.thsConnection.lastImportAt || nowLabel();
  }
  clearPositionAndQuoteConfirmation();
}

function addManualPositionRow() {
  if (!state.thsConnection.screenshotDataUrl) return;
  state.positions.push(blankManualPosition());
  markPositionsCorrected("手动补录");
  render();
}

function removeManualPositionRow(index) {
  if (!Number.isInteger(index) || index < 0 || index >= state.positions.length) return;
  state.positions.splice(index, 1);
  markPositionsCorrected("已校正");
  render();
}

function applyPositionCorrection(input, options = {}) {
  const { shouldRender = true } = options;
  const index = Number(input.dataset.positionCorrection);
  const field = input.dataset.field;
  if (!Number.isInteger(index) || !state.positions[index] || !field) return;

  const next = { ...state.positions[index] };
  if (field === "name") {
    next.name = input.value.trim();
  } else if (field === "code") {
    next.code = normalizeCode(input.value);
  } else if (["quantity", "cost", "currentPrice"].includes(field)) {
    next[field] = numeric(input.value);
  }

  state.positions[index] = recalculatePosition(next);
  markPositionsCorrected("已校正");
  if (shouldRender) {
    render();
  } else {
    saveState();
  }
}

function parseHoldingsFromOcr(rawText) {
  const primary = parseHoldingsFromOcrLines(rawText);
  if (primary.length >= 3) return consolidateHoldingRows(primary);
  return consolidateHoldingRows(mergeHoldingRows(primary, parseHoldingsFromOcrText(rawText)));
}

function parseHoldingsFromOcrLines(rawText) {
  const lines = String(rawText || "")
    .split(/\n+/)
    .map((line) => normalizeOcrLine(line))
    .filter(Boolean);
  return lines
    .map((line, index) => {
      const tokens = extractNumberTokens(line);
      const hasPercent = tokens.some((token) => token.isPercent);
      const numericCount = tokens.filter((token) => !token.isPercent).length;
      const needsNextLine = !hasPercent || numericCount < 5;
      return parseHoldingLine(needsNextLine ? `${line} ${lines[index + 1] || ""}` : line);
    })
    .filter(Boolean);
}

function parseHoldingLine(line) {
  const text = normalizeOcrLine(line);
  if (!text) return null;
  let best = null;
  knownStockCatalog.forEach((stock) => {
    const mention = findStockMention(text, stock);
    if (mention && (!best || mention.index < best.mention.index)) {
      best = { stock, mention };
    }
  });
  if (!best) return null;
  return parseHoldingChunk(best.stock, text.slice(best.mention.index));
}

function parseHoldingsFromOcrText(rawText) {
  const text = normalizeOcrText(rawText);
  const matches = [];
  knownStockCatalog.forEach((stock) => {
    const mention = findStockMention(text, stock);
    if (mention) matches.push({ ...stock, index: mention.index });
  });

  return matches
    .sort((a, b) => a.index - b.index)
    .map((match, index, all) => {
      const end = all[index + 1]?.index ?? text.length;
      return parseHoldingChunk(match, text.slice(match.index, end));
    })
    .filter(Boolean);
}

function mergeHoldingRows(primary, fallback) {
  const merged = [];
  const codes = new Set();
  [...primary, ...fallback].forEach((row) => {
    const code = normalizeCode(row.code);
    if (!code || codes.has(code)) return;
    merged.push(row);
    codes.add(code);
  });
  return merged;
}

function consolidateHoldingRows(rows) {
  const grouped = new Map();
  rows.forEach((row) => {
    const code = normalizeCode(row.code);
    if (!code) return;
    const current = grouped.get(code);
    if (!current || holdingRowScore(row) > holdingRowScore(current)) {
      grouped.set(code, row);
    }
  });
  return [...grouped.values()];
}

function holdingRowScore(row) {
  const quantity = numeric(row.quantity);
  const cost = numeric(row.cost);
  const price = numeric(row.currentPrice);
  const marketValue = numeric(row.marketValue);
  const expectedMarketValue = quantity * price;
  const marketErrorRatio = expectedMarketValue > 0
    ? Math.abs(marketValue - expectedMarketValue) / expectedMarketValue
    : 1;
  const costPriceRatio = Math.max(cost, price) / Math.max(0.01, Math.min(cost || price, price || cost));
  let score = 0;
  if (quantity > 0) score += 20;
  if (cost > 0 && price > 0) score += 20;
  if (marketValue > 0) score += 15;
  if (marketErrorRatio <= 0.03) score += 40;
  else if (marketErrorRatio <= 0.12) score += 20;
  else score -= 25;
  if (costPriceRatio > 4) score -= 35;
  if (Math.abs(price - cost) < 0.001 && marketErrorRatio > 0.05) score -= 15;
  return score;
}

function findStockMention(text, stock) {
  const codeIndex = text.indexOf(stock.code);
  if (codeIndex >= 0) return { index: codeIndex, score: 1 };

  const names = [stock.name, ...(stock.aliases || [])];
  for (const name of names) {
    const index = text.indexOf(name);
    if (index >= 0) return { index, score: 1 };
  }

  return findFuzzyStockName(text, stock.name) || findPartialStockName(text, stock);
}

function findFuzzyStockName(text, target) {
  const compact = buildCompactTextIndex(text);
  const targetChars = Array.from(target);
  const targetLength = targetChars.length;
  if (compact.chars.length < targetLength) return null;

  let best = null;
  for (let start = 0; start <= compact.chars.length - targetLength; start += 1) {
    const candidate = compact.chars.slice(start, start + targetLength).join("");
    const distance = levenshteinDistance(candidate, target);
    const allowedDistance = targetLength <= 3 ? 1 : 2;
    if (distance <= allowedDistance && (!best || distance < best.distance)) {
      best = {
        index: compact.indexes[start],
        distance,
        score: 1 - distance / targetLength
      };
      if (distance === 0) break;
    }
  }
  return best;
}

function findPartialStockName(text, stock) {
  const compact = buildCompactTextIndex(text);
  const compactText = compact.chars.join("");
  const names = [stock.name, ...(stock.aliases || [])].filter((name) => Array.from(name).length >= 4);
  let best = null;

  names.forEach((name) => {
    const chars = Array.from(name);
    for (let size = chars.length - 1; size >= Math.max(3, chars.length - 2); size -= 1) {
      for (let start = 0; start <= chars.length - size; start += 1) {
        const part = chars.slice(start, start + size).join("");
        const index = compactText.indexOf(part);
        if (index >= 0 && (!best || size > best.size)) {
          best = {
            index: compact.indexes[index],
            score: size / chars.length,
            size
          };
        }
      }
      if (best) break;
    }
  });

  return best;
}

function buildCompactTextIndex(text) {
  const chars = [];
  const indexes = [];
  Array.from(String(text || "")).forEach((char, index) => {
    if (/[\s:：/\\|｜,，.。;；"'“”‘’()\[\]{}<>《》+-]/.test(char)) return;
    chars.push(char);
    indexes.push(index);
  });
  return { chars, indexes };
}

function levenshteinDistance(a, b) {
  const left = Array.from(a);
  const right = Array.from(b);
  const dp = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0));

  for (let i = 0; i <= left.length; i += 1) dp[i][0] = i;
  for (let j = 0; j <= right.length; j += 1) dp[0][j] = j;

  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[left.length][right.length];
}

function normalizeOcrText(rawText) {
  return String(rawText || "")
    .replace(/[|｜]/g, " ")
    .replace(/[，,]/g, "")
    .replace(/[—–]/g, "-")
    .replace(/[＋]/g, "+")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeOcrLine(rawText) {
  return String(rawText || "")
    .replace(/[|｜]/g, " ")
    .replace(/[，,]/g, "")
    .replace(/[—–]/g, "-")
    .replace(/[＋]/g, "+")
    .replace(/\s+/g, " ")
    .trim();
}

function parseHoldingChunk(stock, chunk) {
  const tokens = extractNumberTokens(chunk);
  const quantity = inferHoldingQuantity(tokens);
  const prices = inferHoldingPrices(tokens, quantity);
  const marketValue = inferMarketValue(tokens, quantity, prices.currentPrice);
  const pnl = inferPnl(tokens, marketValue, quantity, prices.cost, prices.currentPrice);

  if (!quantity || !prices.cost || !prices.currentPrice) return null;

  return {
    name: stock.name,
    code: stock.code,
    quantity,
    cost: prices.cost,
    currentPrice: prices.currentPrice,
    marketValue: marketValue || quantity * prices.currentPrice,
    pnl,
    stop: defaultStopForCode(stock.code),
    trigger: defaultTriggerForCode(stock.code),
    plan: "截图OCR导入，需核对确认"
  };
}

function enrichHoldingsWithTradeSnapshot(parsed, rawText) {
  const rows = Array.isArray(parsed) ? [...parsed] : [];
  const existingCodes = new Set(rows.map((row) => normalizeCode(row.code)));
  const missingBought = openBoughtTradesFromSnapshot()
    .filter((trade) => !existingCodes.has(normalizeCode(trade.code)));

  missingBought.forEach((trade) => {
    const inferred = inferMissingHoldingFromText(trade, rawText);
    rows.push(inferred);
    existingCodes.add(normalizeCode(trade.code));
  });

  return rows;
}

function openBoughtTradesFromSnapshot() {
  const snapshot = todayTradeSnapshot();
  const trades = Array.isArray(snapshot.trades) ? snapshot.trades : [];
  const grouped = new Map();

  trades.forEach((trade) => {
    const code = normalizeCode(trade.code);
    if (!code) return;
    const current = grouped.get(code) || {
      code,
      name: trade.name || stockNameByCode(code),
      quantity: 0,
      amount: 0
    };
    const sideSign = trade.side === "卖出" ? -1 : trade.side === "买入" ? 1 : 0;
    current.quantity += sideSign * numeric(trade.quantity);
    current.amount += sideSign * numeric(trade.amount);
    if (trade.name) current.name = trade.name;
    grouped.set(code, current);
  });

  return [...grouped.values()]
    .filter((item) => item.quantity > 0)
    .map((item) => ({
      ...item,
      cost: item.quantity ? Math.abs(item.amount / item.quantity) : 0
    }));
}

function inferMissingHoldingFromText(trade, rawText) {
  const known = stockCatalogByCode(trade.code);
  const textHolding = inferKnownMissingHoldingFromNumbers(trade.code, rawText);
  const quantity = numeric(textHolding.quantity) || numeric(trade.quantity);
  const cost = numeric(textHolding.cost) || numeric(trade.cost);
  const currentPrice = numeric(textHolding.currentPrice) || cost;
  const marketValue = numeric(textHolding.marketValue) || Number((quantity * currentPrice).toFixed(2));
  const pnl = Number((quantity * (currentPrice - cost)).toFixed(2));

  return {
    name: known?.name || trade.name || stockNameByCode(trade.code),
    code: normalizeCode(trade.code),
    quantity,
    cost,
    currentPrice,
    marketValue,
    pnl,
    stop: defaultStopForCode(trade.code),
    trigger: defaultTriggerForCode(trade.code),
    plan: "成交记录兜底补入，需核对确认"
  };
}

function inferKnownMissingHoldingFromNumbers(code, rawText) {
  const normalized = normalizeCode(code);
  const tokens = extractNumberTokens(normalizeOcrText(rawText));
  if (normalized === "600276") {
    return inferNumberPatternHolding(tokens, {
      quantity: 500,
      costLow: 48,
      costHigh: 51.5,
      priceLow: 49,
      priceHigh: 55,
      marketLow: 24000,
      marketHigh: 28500
    });
  }
  if (normalized === "600406") {
    return inferNumberPatternHolding(tokens, {
      quantity: 1000,
      costLow: 21.5,
      costHigh: 24,
      priceLow: 22,
      priceHigh: 25,
      marketLow: 21000,
      marketHigh: 26000
    });
  }
  return {};
}

function inferNumberPatternHolding(tokens, rule) {
  const prices = tokens
    .filter((token) => !token.isPercent && token.hasDecimal && token.value >= rule.costLow && token.value <= rule.priceHigh)
    .map((token) => token.value);
  const cost = prices.find((value) => value >= rule.costLow && value <= rule.costHigh) || 0;
  const currentPrice = prices.slice().reverse().find((value) => value >= rule.priceLow && value <= rule.priceHigh && value !== cost) || 0;
  const marketValue = tokens
    .filter((token) => !token.isPercent && token.value >= rule.marketLow && token.value <= rule.marketHigh)
    .map((token) => token.value)
    .sort((a, b) => Math.abs(a - rule.quantity * (currentPrice || cost)) - Math.abs(b - rule.quantity * (currentPrice || cost)))[0] || 0;
  return {
    quantity: rule.quantity,
    cost,
    currentPrice,
    marketValue
  };
}

function stockCatalogByCode(code) {
  const normalized = normalizeCode(code);
  return knownStockCatalog.find((stock) => normalizeCode(stock.code) === normalized);
}

function stockNameByCode(code) {
  return stockCatalogByCode(code)?.name || normalizeCode(code);
}

function extractNumberTokens(text) {
  const tokens = [];
  const pattern = /[-+]?\d+(?:\.\d+)?%?/g;
  let match;
  while ((match = pattern.exec(text))) {
    const raw = match[0];
    const isPercent = raw.endsWith("%");
    const value = numeric(raw);
    if (!Number.isFinite(value)) continue;
    tokens.push({
      raw,
      value,
      isPercent,
      isInteger: Number.isInteger(value),
      hasDecimal: raw.includes("."),
      index: match.index
    });
  }
  return tokens;
}

function inferHoldingQuantity(tokens) {
  const candidates = tokens
    .filter((token) => !token.isPercent && token.isInteger && token.value >= 100 && token.value <= 20000 && token.value % 100 === 0)
    .map((token) => token.value);
  if (!candidates.length) return 0;
  return Math.min(...candidates);
}

function inferHoldingPrices(tokens, quantity) {
  const priceTokens = tokens.filter((token) => {
    if (token.isPercent) return false;
    if (token.value <= 1 || token.value >= 1000) return false;
    if (quantity && token.value === quantity) return false;
    if (!token.hasDecimal && token.isInteger && token.value % 100 === 0) return false;
    return true;
  });
  const costCurrent = priceTokens.slice(-2).map((token) => token.value);
  return {
    cost: costCurrent[0] || 0,
    currentPrice: costCurrent[1] || costCurrent[0] || 0
  };
}

function inferMarketValue(tokens, quantity, currentPrice) {
  const calculated = quantity && currentPrice ? quantity * currentPrice : 0;
  const candidates = tokens
    .filter((token) => !token.isPercent && token.value >= 1000)
    .map((token) => token.value)
    .filter((value) => !quantity || Math.abs(value - quantity) > 1);
  if (!candidates.length) return Number(calculated.toFixed(2));
  if (!calculated) return candidates[0];
  return candidates.sort((a, b) => Math.abs(a - calculated) - Math.abs(b - calculated))[0];
}

function inferPnl(tokens, marketValue, quantity, cost, currentPrice) {
  const calculated = quantity && cost && currentPrice ? quantity * (currentPrice - cost) : 0;
  const candidates = tokens
    .filter((token) => !token.isPercent)
    .map((token) => token.value)
    .filter((value) => Math.abs(value) >= 50 && Math.abs(value) < Math.max(1000, Math.abs(marketValue || 0) * 0.8));
  if (!candidates.length) return Number(calculated.toFixed(2));
  return candidates.sort((a, b) => Math.abs(a - calculated) - Math.abs(b - calculated))[0];
}

function defaultStopForCode(code) {
  const normalized = normalizeCode(code);
  const known = latestKnownPositions.find((position) => normalizeCode(position.code) === normalized);
  const candidate = defaultBuyCandidates.find((item) => normalizeCode(item.code) === normalized);
  return known?.stop || candidate?.stop || "按截图导入后手动设置";
}

function defaultTriggerForCode(code) {
  const normalized = normalizeCode(code);
  const known = latestKnownPositions.find((position) => normalizeCode(position.code) === normalized);
  const candidate = defaultBuyCandidates.find((item) => normalizeCode(item.code) === normalized);
  return known?.trigger || candidate?.trigger || "按截图导入后手动设置";
}

function buildPositionFromForm() {
  const name = document.querySelector("#positionName").value.trim();
  const code = document.querySelector("#positionCode").value.trim();
  const quantity = Number(document.querySelector("#positionQuantity").value) || 0;
  const cost = Number(document.querySelector("#positionCost").value) || 0;
  const currentPrice = Number(document.querySelector("#positionPrice").value) || 0;
  const marketValue = quantity * currentPrice;
  const pnl = quantity * (currentPrice - cost);

  if (!name && !code) return null;

  return {
    name,
    code,
    quantity,
    cost,
    currentPrice,
    marketValue,
    pnl,
    stop: document.querySelector("#positionStop").value.trim(),
    trigger: document.querySelector("#positionTrigger").value.trim(),
    plan: document.querySelector("#positionPlan").value.trim()
  };
}

function clearPositionForm() {
  [
    "#positionName",
    "#positionCode",
    "#positionQuantity",
    "#positionCost",
    "#positionPrice",
    "#positionStop",
    "#positionTrigger",
    "#positionPlan"
  ].forEach((selector) => {
    document.querySelector(selector).value = "";
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image), { once: true });
    image.addEventListener("error", () => reject(new Error("截图加载失败，请重新上传图片")), { once: true });
    image.src = dataUrl;
  });
}

async function prepareHoldingsOcrImage(dataUrl) {
  const images = await prepareHoldingsOcrImages(dataUrl);
  return images[0]?.dataUrl || dataUrl;
}

async function prepareHoldingsOcrImages(dataUrl) {
  const image = await loadImageFromDataUrl(dataUrl);
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = image.naturalWidth || image.width;
  sourceCanvas.height = image.naturalHeight || image.height;

  const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
  sourceContext.drawImage(image, 0, 0, sourceCanvas.width, sourceCanvas.height);

  const phoneBounds = detectNonDarkBounds(sourceContext, sourceCanvas.width, sourceCanvas.height);
  const crop = cropHoldingsTableBounds(phoneBounds, sourceCanvas.width, sourceCanvas.height);
  const upperCrop = splitCrop(crop, 0, 0.58);
  const lowerCrop = splitCrop(crop, 0.42, 1);
  const deepLowerCrop = splitCrop(crop, 0.58, 1);

  return [
    { label: "完整持仓区", dataUrl: renderHoldingsOcrCrop(sourceCanvas, crop, 1850) },
    { label: "上半段", dataUrl: renderHoldingsOcrCrop(sourceCanvas, upperCrop, 1850) },
    { label: "下半段", dataUrl: renderHoldingsOcrCrop(sourceCanvas, lowerCrop, 1900) },
    { label: "底部段", dataUrl: renderHoldingsOcrCrop(sourceCanvas, deepLowerCrop, 1900) }
  ];
}

function splitCrop(crop, startRatio, endRatio) {
  const y = Math.round(crop.y + crop.height * startRatio);
  const bottom = Math.round(crop.y + crop.height * endRatio);
  return {
    x: crop.x,
    y,
    width: crop.width,
    height: Math.max(1, bottom - y)
  };
}

function renderHoldingsOcrCrop(sourceCanvas, crop, targetWidth = 1850) {
  const scale = Math.min(4.2, Math.max(2.2, targetWidth / crop.width));

  const targetCanvas = document.createElement("canvas");
  targetCanvas.width = Math.round(crop.width * scale);
  targetCanvas.height = Math.round(crop.height * scale);
  const targetContext = targetCanvas.getContext("2d", { willReadFrequently: true });
  targetContext.fillStyle = "#ffffff";
  targetContext.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
  targetContext.imageSmoothingEnabled = true;
  targetContext.imageSmoothingQuality = "high";
  targetContext.drawImage(
    sourceCanvas,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    targetCanvas.width,
    targetCanvas.height
  );
  binarizeCanvas(targetContext, targetCanvas.width, targetCanvas.height);

  return targetCanvas.toDataURL("image/png");
}

function detectNonDarkBounds(context, width, height) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  const step = Math.max(2, Math.floor(Math.min(width, height) / 240));
  const pixels = context.getImageData(0, 0, width, height).data;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const offset = (y * width + x) * 4;
      const alpha = pixels[offset + 3];
      const brightness = (pixels[offset] + pixels[offset + 1] + pixels[offset + 2]) / 3;
      if (alpha > 20 && brightness > 24) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (minX >= maxX || minY >= maxY) {
    return { x: 0, y: 0, width, height };
  }

  const x = Math.max(0, minX - step * 2);
  const y = Math.max(0, minY - step * 2);
  return {
    x,
    y,
    width: Math.min(width - x, maxX - x + step * 2),
    height: Math.min(height - y, maxY - y + step * 2)
  };
}

function cropHoldingsTableBounds(bounds, imageWidth, imageHeight) {
  const x = Math.max(0, Math.round(bounds.x + bounds.width * 0.015));
  const y = Math.max(0, Math.round(bounds.y + bounds.height * 0.350));
  const width = Math.min(imageWidth - x, Math.round(bounds.width * 0.97));
  const bottom = Math.min(imageHeight, Math.round(bounds.y + bounds.height * 0.825));
  const height = Math.max(1, bottom - y);
  return { x, y, width, height };
}

function binarizeCanvas(context, width, height) {
  const imageData = context.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const alpha = pixels[index + 3];
    const gray = red * 0.299 + green * 0.587 + blue * 0.114;
    const isText = alpha > 12 && gray < 222;
    const value = isText ? 0 : 255;
    pixels[index] = value;
    pixels[index + 1] = value;
    pixels[index + 2] = value;
    pixels[index + 3] = 255;
  }

  context.putImageData(imageData, 0, 0);
}

function loadScriptOnce(src, globalName) {
  if (globalName && window[globalName]) return Promise.resolve(window[globalName]);
  const existing = document.querySelector(`script[data-dynamic-src="${src}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(globalName ? window[globalName] : true), { once: true });
      existing.addEventListener("error", () => reject(new Error("脚本加载失败")), { once: true });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.dynamicSrc = src;
    script.addEventListener("load", () => resolve(globalName ? window[globalName] : true), { once: true });
    script.addEventListener("error", () => reject(new Error("OCR库加载失败，请检查网络")), { once: true });
    document.head.appendChild(script);
  });
}

async function recognizeHoldingsImage(Tesseract, imageDataUrl, statusLabel) {
  state.ocr.status = statusLabel;
  if (statusLabel.startsWith("识别中") || statusLabel === "整图补识别") {
    state.ocr.progress = Math.max(1, state.ocr.progress || 1);
  }
  render();

  const result = await Tesseract.recognize(imageDataUrl, "chi_sim+eng", {
    logger(message) {
      if (message.status === "recognizing text" && Number.isFinite(message.progress)) {
        state.ocr.progress = Math.round(message.progress * 100);
        setOptionalText("#ocrStatusText", `${statusLabel} ${state.ocr.progress}%`);
      }
    },
    preserve_interword_spaces: "1",
    tessedit_pageseg_mode: "6"
  });

  return result?.data?.text || "";
}

async function runScreenshotOcr() {
  if (!state.thsConnection.screenshotDataUrl) {
    state.ocr.status = "请先导入截图";
    state.ocr.error = "没有可识别的持仓截图。";
    render();
    return;
  }

  state.ocr.status = "加载OCR库";
  state.ocr.progress = 1;
  state.ocr.error = "";
  state.ocr.rawText = "";
  state.ocr.parsedCount = 0;
  state.ocr.parsedAt = "";
  render();

  try {
    const Tesseract = await loadScriptOnce("https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js", "Tesseract");
    state.ocr.status = "预处理截图";
    render();

    const preparedImages = await prepareHoldingsOcrImages(state.thsConnection.screenshotDataUrl);
    const rawTextParts = [];

    for (let index = 0; index < preparedImages.length; index += 1) {
      const item = preparedImages[index];
      const label = `识别中 ${index + 1}/${preparedImages.length} ${item.label}`;
      const text = await recognizeHoldingsImage(Tesseract, item.dataUrl, label);
      rawTextParts.push(`---${item.label}---\n${text}`);
    }

    let rawText = rawTextParts.join("\n");
    let parsed = parseHoldingsFromOcr(rawText);

    if (!parsed.length) {
      state.ocr.progress = 1;
      const fallbackText = await recognizeHoldingsImage(Tesseract, state.thsConnection.screenshotDataUrl, "整图补识别");
      rawText = `${rawText}\n${fallbackText}`;
      parsed = parseHoldingsFromOcr(rawText);
    }

    state.ocr.status = "解析持仓";
    render();
    parsed = enrichHoldingsWithTradeSnapshot(parsed, rawText);

    state.ocr.rawText = rawText;
    state.ocr.progress = 100;
    state.ocr.parsedCount = parsed.length;
    state.ocr.parsedAt = nowLabel();

    if (!parsed.length) {
      state.ocr.status = "未识别到持仓";
      state.ocr.error = "OCR没有识别出可用持仓行。请上传包含“证券/市值、盈亏/盈亏率、持仓/可用、成本/现价”完整列的持仓截图，尽量不要遮挡股票名称和价格。";
      render();
      return;
    }

    state.positions = parsed;
    state.ocr.status = "识别完成";
    state.ocr.error = "";
    updateImportMeta("截图OCR识别");
    render();
  } catch (error) {
    state.ocr.status = "识别失败";
    state.ocr.error = error.message || "OCR识别失败";
    state.ocr.progress = 0;
    render();
  }
}

async function compressImageFile(file) {
  const original = await readFileAsDataUrl(file);
  return new Promise((resolve) => {
    const image = new Image();
    image.addEventListener("load", () => {
      const maxWidth = 1200;
      const scale = Math.min(1, maxWidth / image.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    });
    image.addEventListener("error", () => resolve(original));
    image.src = original;
  });
}

async function handlePortfolioImageFile(file, input) {
  if (!file) return;
  const dataUrl = await compressImageFile(file);
  updateScreenshotMeta(file, dataUrl);
  state.ocr.status = "待识别";
  state.ocr.progress = 0;
  state.ocr.rawText = "";
  state.ocr.parsedCount = 0;
  state.ocr.parsedAt = "";
  state.ocr.error = "";
  if (input) input.value = "";
  render();
}

function loadKnownPortfolioTemplate() {
  state.positions = structuredClone(latestKnownPositions);
  state.goal.currentAssets = 517260.42;
  state.goal.maxDrawdown = 8;
  state.goal.riskVersion = 2;
  state.goal.lastUpdated = "06/26 14:58";
  state.account.cashBalance = 371265.42;
  state.account.cashUpdatedAt = "06/26 14:58";
  state.account.lastEstimatedAssets = state.account.cashBalance + positionMarketValue(state.positions);
  state.account.estimatedUpdatedAt = "06/26 14:58";
  updateImportMeta("样例持仓模板");
  render();
}

document.querySelector("#riskPerTrade").addEventListener("input", (event) => {
  state.riskPerTrade = Number(event.target.value);
  render();
});

document.querySelector("#maxPosition").addEventListener("input", (event) => {
  state.maxPosition = Number(event.target.value);
  render();
});

document.querySelector("#updateGoal").addEventListener("click", () => {
  state.goal.startAssets = Number(document.querySelector("#goalStartAssets").value) || state.goal.startAssets;
  state.goal.currentAssets = Number(document.querySelector("#goalCurrentAssets").value) || state.goal.currentAssets;
  state.account.cashBalance = Number(document.querySelector("#accountCashBalance").value) || 0;
  state.account.cashUpdatedAt = nowLabel();
  state.goal.targetReturn = Number(document.querySelector("#goalTargetReturn").value) || state.goal.targetReturn;
  state.goal.maxDrawdown = Number(document.querySelector("#goalMaxDrawdown").value) || state.goal.maxDrawdown;
  state.goal.deadline = document.querySelector("#goalDeadline").value || state.goal.deadline;
  state.goal.pathMode = "trading";
  state.goal.lastUpdated = nowLabel();
  render();
});

document.querySelector("#recalcSizing").addEventListener("click", () => {
  renderSizingPlanner();
});

document.querySelector("#loadKnownPortfolio")?.addEventListener("click", () => {
  loadKnownPortfolioTemplate();
});

document.querySelector("#refreshQuotes")?.addEventListener("click", () => {
  syncLatestData();
});

document.querySelector("#battlePlan").addEventListener("change", async (event) => {
  const feedbackInput = event.target.closest("[data-action-feedback]");
  if (feedbackInput) {
    updateActionFeedback(feedbackInput);
    return;
  }

  const input = event.target.closest("#battlePortfolioImage");
  if (input) {
    const file = input.files?.[0];
    await handlePortfolioImageFile(file, input);
    return;
  }

  const tradeInput = event.target.closest("#battleTradeSnapshotImage");
  if (tradeInput) {
    const file = tradeInput.files?.[0];
    await handleTradeSnapshotFile(file, tradeInput);
  }
});

document.querySelector("#battlePlan").addEventListener("input", (event) => {
  const feedbackInput = event.target.closest("[data-action-feedback]");
  if (feedbackInput) {
    updateActionFeedback(feedbackInput);
    return;
  }

  const input = event.target.closest("[data-position-correction]");
  if (!input) return;
  applyPositionCorrection(input, { shouldRender: false });
});

document.querySelector("#battlePlan").addEventListener("focusout", (event) => {
  const input = event.target.closest("[data-position-correction]");
  if (!input) return;
  applyPositionCorrection(input);
});

document.querySelector("#battlePlan").addEventListener("keydown", (event) => {
  const input = event.target.closest("[data-position-correction]");
  if (!input || event.key !== "Enter") return;
  event.preventDefault();
  input.blur();
});

document.querySelector("#battlePlan").addEventListener("click", (event) => {
  const button = event.target.closest("[data-battle-action]");
  if (!button) return;
  if (button.dataset.battleAction === "load-known") {
    loadKnownPortfolioTemplate();
    return;
  }
  if (button.dataset.battleAction === "ocr-screenshot") {
    runScreenshotOcr();
    return;
  }
  if (button.dataset.battleAction === "add-position-row") {
    addManualPositionRow();
    return;
  }
  if (button.dataset.battleAction === "remove-position-row") {
    removeManualPositionRow(Number(button.dataset.positionIndex));
    return;
  }
  if (button.dataset.battleAction === "confirm-positions") {
    confirmPositionTable();
    return;
  }
  if (button.dataset.battleAction === "refresh-quotes") {
    syncLatestData();
  }
});

document.querySelector("#addPosition")?.addEventListener("click", () => {
  const position = buildPositionFromForm();
  if (!position) return;
  state.positions.unshift(position);
  updateImportMeta("手动持仓录入");
  clearPositionForm();
  render();
});

document.querySelector("#clearPortfolio")?.addEventListener("click", () => {
  state.positions = [];
  state.account.cashBalance = numeric(state.goal.currentAssets);
  state.account.cashUpdatedAt = nowLabel();
  state.account.lastEstimatedAssets = numeric(state.goal.currentAssets);
  state.account.estimatedUpdatedAt = state.account.cashUpdatedAt;
  state.thsConnection.lastImportAt = "";
  state.thsConnection.importSource = "";
  state.thsConnection.screenshotName = "";
  state.thsConnection.screenshotImportedAt = "";
  state.thsConnection.screenshotDataUrl = "";
  state.decisionGate = structuredClone(defaultState.decisionGate);
  const battleInput = document.querySelector("#battlePortfolioImage");
  if (battleInput) battleInput.value = "";
  render();
});

document.querySelector("#quoteStatus")?.addEventListener("click", (event) => {
  if (!(event.target instanceof Element) || !event.target.closest("#refreshQuotesInline")) return;
  syncLatestData();
});

document.querySelector("#positionList")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-position]");
  if (!button) return;
  state.positions.splice(Number(button.dataset.removePosition), 1);
  updateImportMeta("手动移除持仓");
  render();
});

document.querySelector("#intradayChecklist").addEventListener("change", (event) => {
  const tradeSnapshotInput = event.target.closest("[data-trade-snapshot-upload]");
  const doneInput = event.target.closest("[data-check-done]");
  const noteInput = event.target.closest("[data-check-note]");

  if (tradeSnapshotInput) {
    const file = tradeSnapshotInput.files?.[0];
    handleTradeSnapshotFile(file, tradeSnapshotInput);
    return;
  }

  if (doneInput) {
    state.intraday.completed[doneInput.dataset.checkDone] = doneInput.checked;
    render();
    return;
  }

  if (noteInput) {
    state.intraday.notes[noteInput.dataset.checkNote] = noteInput.value.trim();
    saveState();
  }
});

document.querySelector("#resetIntradayChecks").addEventListener("click", () => {
  state.intraday.completed = {};
  state.intraday.notes = {};
  state.intraday.date = todayKey();
  state.intraday.tradeSnapshot = structuredClone(defaultState.intraday.tradeSnapshot);
  render();
});

document.querySelector("#saveCloseReview").addEventListener("click", () => {
  const stats = goalStats();
  const assetsInput = document.querySelector("#closeAssetsInput");
  const assets = Number(assetsInput?.value) || stats.currentAssets;
  state.goal.currentAssets = assets;
  state.goal.lastUpdated = nowLabel();
  state.account.cashBalance = Math.max(0, assets - positionMarketValue());
  state.account.cashUpdatedAt = state.goal.lastUpdated;
  state.account.lastEstimatedAssets = assets;
  state.account.estimatedUpdatedAt = state.goal.lastUpdated;

  const freshStats = goalStats();
  const plan = closeReviewPlan(freshStats);
  const discipline = executionDisciplineSummary();
  state.closeReviews.unshift({
    date: nowLabel(),
    assets,
    plannedAssets: plan.plannedAssets,
    gap: plan.gap,
    action: document.querySelector("#closeActionSelect")?.value || plan.verdict,
    note: document.querySelector("#closeNoteInput")?.value.trim() || "",
    disciplineScore: discipline.score,
    missedCritical: discipline.missedCritical,
    missedTitles: discipline.missedTitles,
    disciplineNote: discipline.detail
  });
  state.closeReviews = state.closeReviews.slice(0, 30);
  render();
});

document.querySelectorAll(".seg").forEach((button) => {
  button.addEventListener("click", () => {
    state.sortMode = button.dataset.sort;
    render();
  });
});

document.querySelector("#resetData").addEventListener("click", () => {
  state = structuredClone(defaultState);
  render();
});

render();
applyPanelSync();
refreshMajorInfo({ source: "load", refresh: false }).then((updated) => {
  if (updated) render();
});
startAutoRefreshLoop();
