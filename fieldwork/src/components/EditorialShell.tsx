import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  Search,
  X,
  Menu,
  Sun,
  Moon,
  ArrowRight,
} from "lucide-react";
import { papers, paths, searchPapers } from "../data/readings";
import { useLearning } from "../state";

export default function EditorialShell({ children }: { children: ReactNode }) {
  const [mobile, setMobile] = useState(false);
  const [query, setQuery] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useLearning();
  const openSearch = () => {
    setQuery("");
    dialog.current?.showModal();
    requestAnimationFrame(() => input.current?.focus());
  };
  useEffect(() => {
    setMobile(false);
    dialog.current?.close();
    if (!location.hash) window.scrollTo({ top: 0, behavior: "instant" });
    else
      setTimeout(
        () =>
          document
            .getElementById(decodeURIComponent(location.hash.slice(1)))
            ?.scrollIntoView(),
        130,
      );
  }, [location.pathname, location.hash]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSearch();
      }
      if (e.key === "Escape") setMobile(false);
    };
    window.addEventListener("keydown", key);
    document.documentElement.dataset.fieldworkReady = "true";
    if (document.documentElement.dataset.queuedSearch === "true") {
      delete document.documentElement.dataset.queuedSearch;
      openSearch();
    }
    return () => {
      window.removeEventListener("keydown", key);
      delete document.documentElement.dataset.fieldworkReady;
    };
  }, []);
  const results = query.trim()
    ? searchPapers(query)
    : ["mimo-v26", "deepseek-v41", "kimi-k3", "qwen38"]
        .map((id) => papers.find((p) => p.id === id)!)
        .filter(Boolean);
  return (
    <div className="editorial-app">
      <a href="#main-content" className="skip-link">
        跳到正文
      </a>
      <header className="site-header">
        <div className="fieldwork-brand"><a href="/" className="fieldwork-home-link" aria-label="返回 DreaMax 首页"><span className="orbix-wordmark">DreaMa<span className="orbix-x">x</span></span></a><span className="brand-slash">/</span><a href="/llm-training/" className="wordmark" aria-label="返回 LLM Training">LLM Training<span>↗</span></a></div>
        <nav className="desktop-nav" aria-label="主导航">
          <NavLink to="/papers">论文精读</NavLink>
          <NavLink to="/paths/pretraining">阅读路线</NavLink>
          <NavLink to="/labs">交互实验</NavLink>
          <NavLink to="/sources">原始来源</NavLink>
        </nav>
        <div className="header-actions">
          <button
            onClick={openSearch}
            aria-label="搜索论文"
            className="icon-button"
          >
            <Search size={19} />
          </button>
          <button
            onClick={toggleTheme}
            aria-label={theme === "light" ? "切换深色模式" : "切换浅色模式"}
            className="icon-button theme-button"
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <Link className="header-reading" to="/notebook">
            我的阅读 <ArrowUpRight size={15} />
          </Link>
          <button
            className="mobile-menu-button icon-button"
            aria-label={mobile ? "关闭导航" : "打开导航"}
            aria-expanded={mobile}
            onClick={() => setMobile(!mobile)}
          >
            {mobile ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      {mobile && (
        <nav className="mobile-nav" aria-label="移动端导航">
          <Link to="/papers">
            论文精读 <ArrowUpRight />
          </Link>
          <Link to="/paths/pretraining">
            阅读路线 <ArrowUpRight />
          </Link>
          <Link to="/labs">
            交互实验 <ArrowUpRight />
          </Link>
          <Link to="/sources">
            原始来源 <ArrowUpRight />
          </Link>
          <Link to="/notebook">
            我的阅读 <ArrowUpRight />
          </Link>
          <a href="/llm-training/">返回 LLM Training <ArrowUpRight /></a>
          <a href="/">返回 DreaMax 首页 <ArrowUpRight /></a>
          <div className="mobile-stage-links">
            {paths.map((p) => (
              <Link key={p.id} to={`/paths/${p.id}`}>
                {p.index} / {p.name}
              </Link>
            ))}
          </div>
        </nav>
      )}
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <footer className="editorial-footer">
        <div className="footer-top">
          <Link to="/" className="wordmark">
            fieldwork<span>↗</span>
          </Link>
          <p>
            Follow the ideas.
            <br />
            Build your own understanding.
          </p>
        </div>
        <div className="footer-bottom">
          <span>DreaMax 的公开阅读室 · 与所引机构无隶属关系</span>
          <div>
            <a href="/llm-training/">LLM Training</a>
            <Link to="/sources">来源与版本</Link>
            <Link to="/notebook">阅读记录</Link>
            <span>资料查阅 2026.09.22</span>
          </div>
        </div>
      </footer>
      <dialog
        ref={dialog}
        className="paper-search"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="paper-search-inner">
          <div className="paper-search-input">
            <Search size={23} />
            <input
              ref={input}
              aria-label="搜索论文与正文"
              placeholder="搜索模型、论文、方法或正文…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              aria-label="关闭搜索"
              onClick={() => dialog.current?.close()}
            >
              <X size={21} />
            </button>
          </div>
          <p className="micro-label">
            {query
              ? "全文搜索 / " + results.length + " 篇匹配"
              : "从这些报告开始"}
          </p>
          <div className="paper-search-results">
            {results.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  dialog.current?.close();
                  navigate(`/papers/${p.id}`);
                }}
              >
                <div>
                  <span>
                    {p.organization} · {p.year}
                  </span>
                  <strong>{p.title}</strong>
                  <p>{p.subtitle}</p>
                </div>
                <ArrowRight size={20} />
              </button>
            ))}
            {!results.length && (
              <p className="search-empty">
                没有匹配的论文。试试“Muon”“中训练”或“奖励”。
              </p>
            )}
          </div>
          <div className="search-shortcut">
            全文包括公式解释与图解旁注 <kbd>Esc</kbd> 关闭
          </div>
        </div>
      </dialog>
    </div>
  );
}
