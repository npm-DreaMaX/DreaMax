import archive from "./sources/csdn-public-index.json";
// Categories and short reading notes are editorial; titles/URLs/dates remain the author's.
const notes: Record<
  string,
  { category: string; tags: string[]; description: string }
> = {
  "161896756": {
    category: "贪心与二分",
    tags: ["Codeforces", "二分答案", "贪心"],
    description:
      "从任务冷却时间到周期长度：理清 k 与 m 的关系，再用单调性二分最大的可行答案。",
  },
  "161870362": {
    category: "搜索与枚举",
    tags: ["DFS", "组合枚举", "剪枝"],
    description:
      "用递增下标保证组合不重不漏，理解 start 参数的作用，以及什么时候可以提前剪枝。",
  },
  "161461696": {
    category: "字符串与哈希",
    tags: ["哈希", "防退化", "字符串离散化"],
    description:
      "字符串操作为什么会成为瓶颈？从哈希退化出发，理解把字符串映射为整数的价值。",
  },
  "161370442": {
    category: "贪心与二分",
    tags: ["区间分组", "小根堆", "扫描线"],
    description:
      "同一道区间分组题，从小根堆和扫描线两条路线理解最少组数与最大重叠数的关系。",
  },
  "160561647": {
    category: "字符串与哈希",
    tags: ["KMP", "差分数组", "清华机试"],
    description:
      "把原问题转化为差分数组匹配，让 KMP 从字符串算法变成序列匹配工具。",
  },
  "160509156": {
    category: "基础与模拟",
    tags: ["离散化", "坐标压缩"],
    description: "离散化的入门练习：把实际数值与排序后的索引对应起来。",
  },
  "160412641": {
    category: "字符串与哈希",
    tags: ["KMP", "前缀函数", "字符串匹配"],
    description:
      "从朴素匹配的重复比较开始，理解前缀信息如何让失配后的匹配继续前进。",
  },
  "160192777": {
    category: "基础与模拟",
    tags: ["栈", "路径解析", "模拟"],
    description: "用栈维护目录层级，处理绝对路径、相对路径、点号与连续分隔符。",
  },
  "160181441": {
    category: "动态规划",
    tags: ["洛谷 P1115", "前缀和", "Kadane"],
    description: "连续且非空的最大子段和，比较前缀和思路与 Kadane 的状态转移。",
  },
  "160179164": {
    category: "搜索与枚举",
    tags: ["洛谷 P2241", "计数", "矩形枚举"],
    description:
      "枚举矩形的高与宽，通过水平和垂直方向可移动的位置数统计矩形与正方形。",
  },
  "160148055": {
    category: "搜索与枚举",
    tags: ["洛谷 P1618", "暴力", "枚举"],
    description: "把九个数字分为三组三位数，枚举满足比例与数字约束的解。",
  },
};
export const algorithmArticles = archive.articles
  .filter((a) => notes[a.id])
  .map((a) => ({ ...a, ...notes[a.id] }));
export const algorithmCategories = [
  "全部",
  "搜索与枚举",
  "字符串与哈希",
  "贪心与二分",
  "动态规划",
  "基础与模拟",
];
export const algorithmAuthor = {
  name: archive.displayName,
  url: archive.sourceUrl,
  checkedAt: archive.checkedAt,
};
