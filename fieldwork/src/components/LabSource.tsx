import { useState } from "react";
import { Download, FileCode2 } from "lucide-react";
import { Markdown } from "./Markdown";
const implementations = import.meta.glob("../../labs/*.py", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;
const configs = import.meta.glob("../../labs/configs/*.json", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;
const guides = import.meta.glob("../../labs/guides/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;
export default function LabSource({ experiment }: { experiment: string }) {
  const [tab, setTab] = useState("implementation");
  const tabs = [
    { id: "implementation", label: "教学实现" },
    { id: "config", label: "实验配置" },
    { id: "guide", label: "运行与调试指南" },
    ...(experiment === "systems"
      ? [{ id: "profile", label: "实际算子 profiler" }]
      : []),
  ];
  const content =
    tab === "implementation"
      ? implementations[`../../labs/${experiment}.py`]
      : tab === "config"
        ? configs[`../../labs/configs/${experiment}.json`]
        : tab === "profile"
          ? implementations["../../labs/torch_profile.py"]
          : guides[`../../labs/guides/${experiment}.md`];
  const filename =
    tab === "config"
      ? `labs/configs/${experiment}.json`
      : tab === "guide"
        ? `labs/guides/${experiment}.md`
        : tab === "profile"
          ? "labs/torch_profile.py"
          : `labs/${experiment}.py`;
  const download = () => {
    const blob = URL.createObjectURL(
      new Blob([content || ""], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = blob;
    a.download = filename.split("/").pop()!;
    a.click();
    URL.revokeObjectURL(blob);
  };
  return (
    <div className="lab-source-view">
      <div className="lab-source-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "active" : ""}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="source-file-label">
        <span>
          <FileCode2 size={14} />
          {filename}
        </span>
        <button onClick={download}>
          <Download size={13} />
          下载此文件
        </button>
      </div>
      <p className="source-file-note">
        本站原创教学实现 · 与本地实验使用同一文件 · Python 模块请保留完整 labs/
        目录后从项目根执行
      </p>
      <div className={tab === "guide" ? "prose" : "source-code-scroll"}>
        <Markdown
          body={
            tab === "guide"
              ? content || ""
              : `\`\`\`${tab === "config" ? "json" : "python"}\n${content || ""}\n\`\`\``
          }
        />
      </div>
    </div>
  );
}
