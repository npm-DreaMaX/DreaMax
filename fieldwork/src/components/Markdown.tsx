import { useState } from "react";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import { ArrowDown, Check, Copy } from "lucide-react";
import { Link } from "react-router-dom";
function plain(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(plain).join("");
  if (node && typeof node === "object" && "props" in node)
    return plain((node.props as { children?: ReactNode }).children);
  return "";
}
function CodeBlock({ children }: { children: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  return (
    <div className="code-wrap">
      <div className="code-toolbar">
        <span>CODE / 可复制</span>
        <button
          aria-label="复制代码"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(plain(children));
              setCopied(true);
              setError(false);
              setTimeout(() => setCopied(false), 1800);
            } catch {
              setError(true);
            }
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}{" "}
          {error ? "请手动选择复制" : copied ? "已复制" : "复制"}
        </button>
      </div>
      <pre>{children}</pre>
    </div>
  );
}
export function Markdown({ body }: { body: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex, rehypeHighlight, rehypeSlug]}
      components={{
        a: ({ href, children, ...props }) =>
          href?.startsWith("/") ? (
            <Link to={href} {...props}>
              {children}
            </Link>
          ) : (
            <a
              href={href}
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
        pre: ({ children }) =>
          plain(children).startsWith("FLOW_DIAGRAM:") ? (
            <div className="flow-diagram" aria-label="数据流">
              {plain(children)
                .replace("FLOW_DIAGRAM:", "")
                .trim()
                .split("\n")
                .filter(Boolean)
                .map((x, i) => (
                  <div className="flow-step" key={i}>
                    {i > 0 && <ArrowDown size={15} />}
                    <span>{x.replace(/^→\s*/, "")}</span>
                  </div>
                ))}
            </div>
          ) : (
            <CodeBlock>{children}</CodeBlock>
          ),
        code: ({ className, children, ...props }) =>
          className === "language-flow" ? (
            <code>FLOW_DIAGRAM:{children}</code>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          ),
        table: ({ children }) => (
          <div className="table-scroll">
            <table>{children}</table>
          </div>
        ),
      }}
    >
      {body}
    </ReactMarkdown>
  );
}
