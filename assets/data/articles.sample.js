// 示例内容数据（可运行）
// 说明：当前仅内置少量示例文章，用于把站点功能跑通。
// 若要“全量 973 篇”，建议上传全部文章 Markdown（或 JSON），我可以再帮你批量转换成同样的数据结构。

export const ARTICLES = [
  // --- 支付基础设施 ---
  {
    id: "payment-infra/gateway",
    moduleSlug: "payment-infra",
    title: "支付网关（Payment Gateway）",
    difficulty: "入门",
    readTime: "6分钟",
    keyStats: [
      { label: "关键点", value: "加密传输", context: "网关负责安全传输支付数据" },
      { label: "常见误区", value: "网关≠处理器", context: "一个负责“传输”，一个负责“清算/结算”" },
    ],
    sections: [
      {
        title: "什么是支付网关？",
        type: "text",
        content:
          "支付网关是连接商家与支付处理网络的技术桥梁，负责在客户、商家、收单行和发卡行之间安全传输支付信息。",
      },
      {
        title: "工作流程（简化）",
        type: "list",
        content: [
          "客户输入支付信息（卡号/有效期/CVV）",
          "网关加密并传输数据",
          "收单行 → 卡组织 → 发卡行完成授权验证",
          "授权结果返回给商家与客户",
        ],
      },
      {
        title: "网关 vs 处理器",
        type: "comparison",
        content: {
          leftTitle: "支付网关",
          left: ["聚焦数据传输与加密", "交易链路的“信使”", "强调前端集成体验与安全"],
          rightTitle: "支付处理器",
          right: ["负责资金清算、结算与批量处理", "交易链路的“执行者”", "强调结算周期、费率与风控能力"],
        },
      },
    ],
    quiz: [
      {
        question: "关于“支付网关”的描述，哪项最准确？",
        options: ["负责资金结算", "负责数据加密传输与交易请求转发", "只用于线下 POS", "只支持信用卡"],
        answer: 1,
        explanation: "支付网关的核心是安全传输支付信息，并把交易请求转发到后续网络。",
      },
    ],
  },
  {
    id: "payment-infra/processor",
    moduleSlug: "payment-infra",
    title: "支付处理器（Payment Processor）",
    difficulty: "入门",
    readTime: "6分钟",
    keyStats: [{ label: "职责", value: "授权/捕获/结算", context: "处理器参与资金流转与清算" }],
    sections: [
      {
        title: "核心职责",
        type: "list",
        content: ["交易授权", "交易捕获", "批量结算", "资金拨付", "争议/退款协助"],
      },
      {
        title: "选择要点",
        type: "list",
        content: ["定价模型", "结算周期（T+1/T+2）", "合约条款", "技术支持", "风控能力"],
      },
    ],
    quiz: [
      {
        question: "“授权（Authorization）”与“捕获（Capture）”的关系是？",
        options: ["授权后通常需要捕获才能完成扣款", "捕获发生在授权之前", "两者完全等价", "只有线下交易才有捕获"],
        answer: 0,
        explanation: "授权是冻结额度/确认可用资金；捕获才是实际扣款并进入清算结算流程。",
      },
    ],
  },
  {
    id: "payment-infra/routing",
    moduleSlug: "payment-infra",
    title: "智能支付路由（Payment Routing）",
    difficulty: "进阶",
    readTime: "7分钟",
    keyStats: [{ label: "目标", value: "提高授权成功率", context: "在成本与成功率之间做最优权衡" }],
    sections: [
      {
        title: "它解决什么问题？",
        type: "text",
        content:
          "智能支付路由会根据交易特征（金额、币种、地区、卡类型等）动态选择最优处理路径，以最大化成功率并降低成本。",
      },
      {
        title: "常见策略",
        type: "table",
        content: {
          headers: ["策略", "核心逻辑", "适用场景"],
          rows: [
            ["成本路由", "优先选择费率最低的路径", "成本敏感、成功率差异不大时"],
            ["成功率路由", "优先选择历史授权率最高的路径", "大促/关键交易"],
            ["地域路由", "本地交易走本地收单", "跨境费高、拒绝率偏高市场"],
          ],
        },
      },
    ],
    quiz: [],
  },
  {
    id: "payment-infra/failover",
    moduleSlug: "payment-infra",
    title: "支付故障转移（Payment Failover）",
    difficulty: "进阶",
    readTime: "6分钟",
    keyStats: [{ label: "行业现象", value: "92% 企业经历中断", context: "故障转移可显著降低损失" }],
    sections: [
      {
        title: "故障转移的运作方式",
        type: "list",
        content: ["持续健康监测", "异常触发自动重路由", "主动-主动或主动-被动", "幂等性保障防止重复扣款"],
      },
    ],
    quiz: [],
  },

  // --- 银行转账与直接借记 ---
  {
    id: "bank-transfer/ach",
    moduleSlug: "bank-transfer",
    title: "ACH 支付（美国）",
    difficulty: "入门",
    readTime: "7分钟",
    keyStats: [
      { label: "处理时间", value: "1-3 个工作日", context: "Same-Day ACH 可当天完成" },
      { label: "成本", value: "$0.20-$1.50/笔", context: "通常低于信用卡 2-3%" },
    ],
    sections: [
      {
        title: "ACH 是什么？",
        type: "text",
        content:
          "ACH（Automated Clearing House）是美国的电子银行间支付系统，由 NACHA 管理，支持直接入账与直接支付两类交易。",
      },
      {
        title: "常见拒绝代码（示例）",
        type: "list",
        content: ["R01：资金不足", "R02：账户已关闭", "R10：未授权的客户", "R29：企业未授权"],
      },
    ],
    quiz: [],
  },
  {
    id: "bank-transfer/sepa",
    moduleSlug: "bank-transfer",
    title: "SEPA 直接借记（欧洲）",
    difficulty: "入门",
    readTime: "7分钟",
    keyStats: [{ label: "覆盖", value: "36 个国家/地区", context: "统一欧元支付标准" }],
    sections: [
      {
        title: "SEPA Core vs SEPA B2B",
        type: "comparison",
        content: {
          leftTitle: "SEPA Core",
          left: ["面向消费者", "有 8 周退款权", "使用更广"],
          rightTitle: "SEPA B2B",
          right: ["面向企业", "通常无退款权", "更严格的授权要求"],
        },
      },
      {
        title: "授权（Mandate）要点",
        type: "list",
        content: ["债权人 ID", "唯一授权参考号（UMR）", "客户 IBAN", "一次性/经常性授权"],
      },
    ],
    quiz: [],
  },
  {
    id: "bank-transfer/wire",
    moduleSlug: "bank-transfer",
    title: "电汇（Wire Transfer）",
    difficulty: "入门",
    readTime: "6分钟",
    keyStats: [{ label: "特点", value: "费用高、通常不可撤销", context: "适合大额、紧急、一次性付款" }],
    sections: [
      {
        title: "电汇 vs ACH（快速对比）",
        type: "table",
        content: {
          headers: ["特征", "电汇", "ACH"],
          rows: [
            ["速度", "同日/1-5天（跨境）", "1-3 个工作日"],
            ["费用", "$15-$50+（更高）", "$0.20-$1.50（更低）"],
            ["可撤销", "通常不可", "有限可撤销"],
          ],
        },
      },
    ],
    quiz: [],
  },

  // --- 结账与转化优化 ---
  {
    id: "checkout-optimization/cart-abandonment",
    moduleSlug: "checkout-optimization",
    title: "购物车放弃：原因与 11 种优化策略",
    difficulty: "入门",
    readTime: "6分钟",
    keyStats: [{ label: "最常见原因", value: "额外费用过高", context: "运费/税费/手续费是放弃主因之一" }],
    sections: [
      {
        title: "常见原因（节选）",
        type: "list",
        content: ["额外费用过高", "强制注册账号", "流程过长/复杂", "不信任网站安全性", "首选支付方式不可用"],
      },
      {
        title: "策略（节选）",
        type: "list",
        content: ["透明定价", "减少步骤与字段", "提供更多支付方式", "展示安全徽章与退款政策", "优化移动端体验"],
      },
    ],
    quiz: [
      {
        question: "降低购物车放弃率的策略中，哪项通常最先做？",
        options: ["强制注册", "隐藏运费直到最后一步", "提前展示总费用（透明定价）", "减少支付方式"],
        answer: 2,
        explanation: "透明定价能立刻降低用户心理落差，是高优先级优化项。",
      },
    ],
  },

  // --- 支付安全与合规 ---
  {
    id: "security-compliance/pci-dss",
    moduleSlug: "security-compliance",
    title: "PCI DSS：合规的核心要求",
    difficulty: "入门",
    readTime: "7分钟",
    keyStats: [{ label: "要求数量", value: "12 项", context: "覆盖防火墙、加密、访问控制、审计等" }],
    sections: [
      {
        title: "降低 PCI 合规负担的常见方法",
        type: "list",
        content: ["使用托管支付页面（如 Stripe Checkout）", "使用令牌化", "不在自有系统存储原始卡号"],
      },
    ],
    quiz: [],
  },
  {
    id: "security-compliance/3ds",
    moduleSlug: "security-compliance",
    title: "3D Secure（3DS）：在线支付的身份验证",
    difficulty: "进阶",
    readTime: "6分钟",
    keyStats: [{ label: "体验差异", value: "3DS2 支持无感验证", context: "更少跳转、更低放弃率" }],
    sections: [
      {
        title: "3DS 1.0 vs 3DS 2.0",
        type: "comparison",
        content: {
          leftTitle: "3DS 1.0",
          left: ["强跳转验证", "用户体验差", "放弃率高"],
          rightTitle: "3DS 2.0",
          right: ["支持无感验证", "基于风险分析决定挑战", "更适配移动端"],
        },
      },
    ],
    quiz: [],
  },

  // --- 风控与争议管理 ---
  {
    id: "risk-management/chargeback",
    moduleSlug: "risk-management",
    title: "拒付（Chargeback）：原因与拒付率管理",
    difficulty: "入门",
    readTime: "6分钟",
    keyStats: [{ label: "健康拒付率", value: "< 0.65%（Visa）", context: "超过阈值可能进入监控计划" }],
    sections: [
      {
        title: "常见拒付原因（节选）",
        type: "list",
        content: ["欺诈（未授权）", "未收到商品/服务", "商品与描述不符", "友好欺诈", "重复扣款", "订阅取消争议"],
      },
      {
        title: "降低拒付率的策略（节选）",
        type: "list",
        content: ["清晰账单描述符", "便捷退款渠道", "完善客服与响应", "保留交易与物流证据", "强化欺诈检测"],
      },
    ],
    quiz: [],
  },

  // --- 跨境与国际支付 ---
  {
    id: "cross-border/cross-border",
    moduleSlug: "cross-border",
    title: "跨境支付：挑战与降本策略",
    difficulty: "进阶",
    readTime: "7分钟",
    keyStats: [{ label: "常见成本", value: "跨境费 1-3%", context: "本地收单可减少跨境费与拒绝率" }],
    sections: [
      {
        title: "跨境常见挑战",
        type: "list",
        content: ["汇率波动", "高手续费", "结算时间长", "合规复杂", "支付方式偏好差异"],
      },
      {
        title: "降本策略（节选）",
        type: "list",
        content: ["本地收单（Local Acquiring）", "多币种结算", "动态货币转换（DCC）"],
      },
    ],
    quiz: [],
  },
];

export function getArticleById(id) {
  return ARTICLES.find((a) => a.id === id) || null;
}

export function getArticlesByModuleSlug(moduleSlug) {
  return ARTICLES.filter((a) => a.moduleSlug === moduleSlug);
}

