const introduction =
  "我主要关注大语言模型训练（LLM Training）与递归自我改进（RSI），重点探索现代预训练和 Agentic RL。";
const agenticRL =
  "在 Agentic RL 方向，我关注模型如何通过工具调用、多轮环境交互和长轨迹探索学习完成复杂任务，尤其是奖励设计、信用分配与策略更新。";
const rsi =
  "对于 RSI，我希望进一步理解模型能否参与改进自身的数据、训练方法与评估流程，并形成可验证、可持续的自我改进闭环。";

export const profile = {
  name: "DreaMax",
  cv: "/files/cv.pdf",
  email: "3752703718@qq.com",
  title: "LLM training & RSI",
  tagline: "LLM training & RSI。论文笔记、训练实验与开源项目。",
  bio: introduction + agenticRL + rsi,
  introduction,
  research: [
    {
      id: "agentic-rl",
      title: "Agentic RL",
      subtitle: "工具、环境与长轨迹",
      text: agenticRL,
    },
    { id: "rsi", title: "RSI", subtitle: "递归自我改进", text: rsi },
  ],
  memory: {
    image: "/images/about/military-dream.jpg",
    alt: "军旅梦合照，左一是 DreaMax",
    caption: "最后，致敬我半年前失之交臂的军旅梦。",
    position: "照片左一是我。",
  },
  social: {
    github: "https://github.com/npm-DreaMaX",
    csdn: "https://blog.csdn.net/2401_88204232",
  },
};
