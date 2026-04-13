// 手工题库（模块级）
// 说明：全量文章为爬取 Markdown，未内置结构化 quiz 字段。
// 这里提供一套“可用的默认题库”，保证 quiz 页面体验完整；
// 如需“按每篇文章自动出题”，可后续批量生成并替换此文件。

export const QUIZ_BANK = [
  // payment-infra
  {
    moduleSlug: "payment-infra",
    scope: "支付基础设施",
    question: "在支付链路中，“支付网关”最核心的职责是？",
    options: ["完成资金清算与结算", "安全传输并转发支付数据/请求", "决定卡组织费率", "只处理线下 POS 交易"],
    answer: 1,
    explanation: "网关侧重数据加密传输与请求转发；清算/结算通常由处理器与金融网络完成。",
  },
  {
    moduleSlug: "payment-infra",
    scope: "支付基础设施",
    question: "“授权（Authorization）”与“捕获（Capture）”的关系更符合哪项描述？",
    options: ["授权后通常需要捕获才能完成扣款", "捕获发生在授权之前", "两者完全等价", "只有 ACH 才有捕获"],
    answer: 0,
    explanation: "授权是确认资金可用并冻结额度；捕获才是实际扣款并进入清算结算流程。",
  },
  {
    moduleSlug: "payment-infra",
    scope: "支付基础设施",
    question: "智能支付路由的典型目标是？",
    options: ["只追求最低费率", "同时提高授权成功率并优化成本", "强制所有交易走同一路径", "只用于退款"],
    answer: 1,
    explanation: "路由通常在“成功率/成本/延迟”之间做权衡，以获得整体最优结果。",
  },
  {
    moduleSlug: "payment-infra",
    scope: "支付基础设施",
    question: "支付故障转移（Failover）机制最需要关注的工程要点是？",
    options: ["幂等性防止重复扣款", "把按钮做圆角", "只保留一个处理器", "不记录任何日志"],
    answer: 0,
    explanation: "故障切换时可能重试/重放请求，必须通过幂等性避免重复扣款或重复订单。",
  },
  {
    moduleSlug: "payment-infra",
    scope: "支付基础设施",
    question: "“支付编排（Orchestration）”相对单一网关的关键价值是？",
    options: ["统一接入与管理多个网关/处理器", "让结算周期固定为 T+0", "取消所有风控", "只支持一种货币"],
    answer: 0,
    explanation: "编排强调多提供商统一接口与路由/故障转移/对账等能力整合。",
  },

  // bank-transfer
  {
    moduleSlug: "bank-transfer",
    scope: "银行转账与直接借记",
    question: "ACH（美国）通常更适合哪类场景？",
    options: ["小额高频跨境卡交易", "批量定期支付/经常性扣款", "只用于现金收款", "只用于加密货币交易"],
    answer: 1,
    explanation: "ACH 成本较低，适合工资、账单、订阅等经常性或批量的银行间转账。",
  },
  {
    moduleSlug: "bank-transfer",
    scope: "银行转账与直接借记",
    question: "关于电汇（Wire Transfer）的常见特点，哪项正确？",
    options: ["费用通常更低且可随时撤销", "通常不可撤销，适合大额/紧急付款", "只能在周末发送", "只在欧盟使用"],
    answer: 1,
    explanation: "电汇速度快、费用高，且通常不可撤销，适合大额、一次性、紧急场景。",
  },
  {
    moduleSlug: "bank-transfer",
    scope: "银行转账与直接借记",
    question: "SEPA 直接借记中，“Mandate（授权）”的作用是？",
    options: ["给商户发卡", "证明付款人允许发起借记", "用于计算汇率", "替代 PCI 合规"],
    answer: 1,
    explanation: "Mandate 是借记的授权依据，缺少授权会导致退回/拒绝。",
  },
  {
    moduleSlug: "bank-transfer",
    scope: "银行转账与直接借记",
    question: "为什么企业会把“实时支付（RTP）”作为重要能力？",
    options: ["因为一定更便宜", "因为 7×24×365 秒级到账与即时确认", "因为能绕开所有监管", "因为不需要银行账户"],
    answer: 1,
    explanation: "实时支付强调可用性与到账速度，能改善现金流与客户体验。",
  },

  // card-payments
  {
    moduleSlug: "card-payments",
    scope: "银行卡与卡组织",
    question: "卡支付链路中，卡组织（Network）更接近哪种角色？",
    options: ["路由与规则制定者", "商户的 ERP 系统", "客户的浏览器", "只负责退款"],
    answer: 0,
    explanation: "卡组织制定网络规则并路由交易到发卡行/收单行等参与方。",
  },
  {
    moduleSlug: "card-payments",
    scope: "银行卡与卡组织",
    question: "授权失败最常见的通用拒绝码之一是？",
    options: ["05 Do Not Honor", "200 OK", "R01", "404 Not Found"],
    answer: 0,
    explanation: "05（Do Not Honor）是常见的泛化拒绝码，需结合更多信息排查原因。",
  },
  {
    moduleSlug: "card-payments",
    scope: "银行卡与卡组织",
    question: "“交换费（Interchange）”主要支付给哪一方？",
    options: ["发卡行", "客户", "物流公司", "商户的客服团队"],
    answer: 0,
    explanation: "交换费通常由收单侧支付给发卡行，是卡交易成本的重要组成部分。",
  },

  // digital-wallets
  {
    moduleSlug: "digital-wallets",
    scope: "数字钱包与替代支付",
    question: "数字钱包（如 Apple Pay）对商户的典型价值是？",
    options: ["降低所有税费", "更快的结账与更好的移动端转化", "取消风控", "强制用户注册"],
    answer: 1,
    explanation: "钱包强调快捷支付与移动端体验，通常能提升转化。",
  },
  {
    moduleSlug: "digital-wallets",
    scope: "数字钱包与替代支付",
    question: "“本地支付方式（Local payment methods）”的重要意义是？",
    options: ["让所有国家都用同一种方式", "匹配当地用户习惯，提升支付成功率与转化", "只用于线下现金", "仅用于 B2B"],
    answer: 1,
    explanation: "不同国家偏好不同支付方式，提供本地化选项通常更易成交。",
  },

  // checkout-optimization
  {
    moduleSlug: "checkout-optimization",
    scope: "结账与转化优化",
    question: "购物车放弃的常见原因中，经常排在前列的是？",
    options: ["按钮不够圆角", "额外费用过高（运费/税费/手续费）", "网站有暗色模式", "支持太多支付方式"],
    answer: 1,
    explanation: "透明定价与提前展示总成本通常是高优先级优化项。",
  },
  {
    moduleSlug: "checkout-optimization",
    scope: "结账与转化优化",
    question: "单页结账与多步结账的最佳实践通常是？",
    options: ["步骤越多越好", "完全不展示进度", "控制在 3-4 步并清晰展示进度", "强制注册后才能付款"],
    answer: 2,
    explanation: "减少摩擦、清晰引导，能降低放弃率。",
  },
  {
    moduleSlug: "checkout-optimization",
    scope: "结账与转化优化",
    question: "移动端结账优化更重要的一项是？",
    options: ["让输入框尽可能小", "使用自动填充/合适键盘/更大点击区域", "隐藏支付方式", "取消错误提示"],
    answer: 1,
    explanation: "移动端输入成本高，需降低输入负担并保证可点击性。",
  },

  // security-compliance
  {
    moduleSlug: "security-compliance",
    scope: "支付安全与合规",
    question: "降低 PCI 合规负担的常见方式是？",
    options: ["在数据库里明文存卡号", "使用托管支付页面/令牌化", "禁用 HTTPS", "不做访问控制"],
    answer: 1,
    explanation: "托管页面与令牌化能显著降低商户处理敏感数据的范围。",
  },
  {
    moduleSlug: "security-compliance",
    scope: "支付安全与合规",
    question: "3D Secure 2.0 相比 3DS 1.0 的主要改进是？",
    options: ["必须跳转到银行页面", "支持无感验证与更好的移动端体验", "只能用于线下交易", "只能用于 ACH"],
    answer: 1,
    explanation: "3DS2 支持风险驱动的无感验证，减少跳转与放弃。",
  },
  {
    moduleSlug: "security-compliance",
    scope: "支付安全与合规",
    question: "令牌化（Tokenization）与加密（Encryption）的差异更接近哪项？",
    options: ["令牌化通常不可逆推回原值；加密可用密钥还原", "两者完全一样", "令牌化只能用于现金", "加密不可逆"],
    answer: 0,
    explanation: "令牌化用随机令牌替代敏感数据；加密是可逆的密文转换。",
  },

  // risk-management
  {
    moduleSlug: "risk-management",
    scope: "风控与争议管理",
    question: "拒付（Chargeback）对商户的影响通常包括？",
    options: ["只影响 UI", "可能产生费用、提高风险评级、甚至触发监控计划", "一定能提升授权率", "对任何商户都没有影响"],
    answer: 1,
    explanation: "拒付会带来成本与风险累积，需要策略性管理。",
  },
  {
    moduleSlug: "risk-management",
    scope: "风控与争议管理",
    question: "“错误拒绝（False decline）”指的是？",
    options: ["欺诈交易被放行", "合法交易被误判拒绝", "退款处理失败", "税务申报错误"],
    answer: 1,
    explanation: "错误拒绝会损失真实收入，往往比欺诈损失更大。",
  },

  // cross-border
  {
    moduleSlug: "cross-border",
    scope: "跨境与国际支付",
    question: "降低跨境交易拒绝率与跨境费的一种常见策略是？",
    options: ["本地收单（Local acquiring）", "只提供一种货币", "禁用本地支付方式", "关闭 3DS"],
    answer: 0,
    explanation: "本地收单可减少跨境费并改善授权表现。",
  },
  {
    moduleSlug: "cross-border",
    scope: "跨境与国际支付",
    question: "跨境经营中，汇率波动可能带来的问题是？",
    options: ["让退款更便宜", "影响实际收入与对账一致性", "不会产生任何影响", "只影响线下现金"],
    answer: 1,
    explanation: "汇率会影响入账金额与利润，需要多币种结算与对冲策略。",
  },

  // subscription-bnpl
  {
    moduleSlug: "subscription-bnpl",
    scope: "订阅与分期付款",
    question: "订阅业务中，“催缴（Dunning）”主要解决什么问题？",
    options: ["把税率变低", "经常性扣款失败后的重试与提醒", "减少页面加载时间", "把 ACH 变成卡支付"],
    answer: 1,
    explanation: "催缴用于处理失败付款，提升回收率与留存。",
  },
  {
    moduleSlug: "subscription-bnpl",
    scope: "订阅与分期付款",
    question: "BNPL（先买后付）对商户最常见的商业价值是？",
    options: ["降低商品成本", "提升转化与客单价", "取消退款", "让物流更快"],
    answer: 1,
    explanation: "分期/先买后付降低一次性支付压力，常用于提升成交与客单。",
  },

  // regional-guides
  {
    moduleSlug: "regional-guides",
    scope: "各国/地区支付指南",
    question: "为什么同一个电商在不同国家要提供不同支付方式？",
    options: ["因为法律禁止统一", "因为当地用户偏好与监管差异会影响转化与成功率", "因为翻译很难", "因为不能用卡支付"],
    answer: 1,
    explanation: "支付本地化是跨境增长的关键：偏好、风控、SCA/3DS 等都可能不同。",
  },
  {
    moduleSlug: "regional-guides",
    scope: "各国/地区支付指南",
    question: "税务/发票合规在跨境经营中常见的风险是？",
    options: ["只影响设计风格", "可能导致罚款、无法开票/报税、影响入驻与收款", "只影响广告投放", "只影响客服话术"],
    answer: 1,
    explanation: "税务与票据要求与市场准入、平台合规密切相关，需要提前规划。",
  },
];

