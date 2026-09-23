// Editorial reading prompts. Primary source URLs verified on 2026-09-23.
export const scholarReadings = [
  {
    id: "mcp",
    title: "Model Context Protocol",
    topic: "TOOLS & PROTOCOLS",
    question: "工具与模型，如何接上？",
    description:
      "从 Host、Client、Server 的边界，理解工具、资源与上下文如何进入一个 Agent 系统。",
    takeaway:
      "区分通信协议、工具执行和模型决策：MCP 规定上下文交换接口，应用仍然需要自己组织模型与上下文。",
    source: {
      title: "Architecture overview",
      organization: "Model Context Protocol",
      type: "官方文档",
      url: "https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture",
      checkedAt: "2026-09-23",
    },
    related: "/fieldwork/learn/agent-boundaries",
    relatedLabel: "在学习站理解 Agent 边界",
  },
  {
    id: "cwm",
    title: "Code World Models",
    topic: "CODE & WORLD MODELS",
    question: "代码，能否描述世界如何变化？",
    description:
      "以 CWM 技术报告为入口，研究代码执行过程、环境动态与推理规划之间的关系。",
    takeaway:
      "带着“模型预测的状态是什么、训练数据如何提供执行反馈、评测如何区分代码生成与世界建模”这三个问题读报告。",
    source: {
      title:
        "CWM: An Open-Weights LLM for Research on Code Generation with World Models",
      organization: "CWM authors",
      type: "技术报告",
      url: "https://arxiv.org/abs/2510.02387",
      checkedAt: "2026-09-23",
    },
    related: "/fieldwork/learn/agent-rollout",
    relatedLabel: "在学习站追踪执行与 rollout",
  },
  {
    id: "vagen",
    title: "VAGEN",
    topic: "VISUAL AGENTS & RL",
    question: "看到画面之后，怎样持续行动？",
    description:
      "研究多轮视觉 Agent 的世界模型推理：估计当前状态，预测动作之后的变化，再从环境反馈中学习。",
    takeaway:
      "沿着状态估计、转移预测与强化学习信号阅读，比较哪些收益来自推理结构，哪些来自奖励和训练机制。",
    source: {
      title:
        "VAGEN: Reinforcing World Model Reasoning for Multi-Turn VLM Agents",
      organization: "VAGEN authors",
      type: "论文",
      url: "https://arxiv.org/abs/2510.16907",
      checkedAt: "2026-09-23",
    },
    related: "/fieldwork/learn/agent-rewards",
    relatedLabel: "在学习站拆解奖励与验证器",
  },
];
