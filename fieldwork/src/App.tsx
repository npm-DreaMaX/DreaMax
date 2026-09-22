import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import EditorialShell from "./components/EditorialShell";
import EditorialHome from "./pages/EditorialHome";
const PaperLibrary = lazy(() => import("./pages/PaperLibrary"));
const PaperReader = lazy(() => import("./pages/PaperReader"));
const ReadingPath = lazy(() => import("./pages/ReadingPath"));
const ReadingNotebook = lazy(() => import("./pages/ReadingNotebook"));
const ArticlePage = lazy(() => import("./pages/Article"));
const Sources = lazy(() => import("./pages/Sources"));
const Labs = lazy(() => import("./pages/Labs"));
const Models = lazy(() => import("./pages/Models"));
export default function App() {
  const location = useLocation();
  useEffect(() => {
    if (
      !location.pathname.startsWith("/papers/") &&
      !location.pathname.startsWith("/learn/")
    )
      document.title = `${({ "/": "读懂前沿论文", "/papers": "论文精读", "/sources": "原始来源", "/notebook": "我的阅读" } as Record<string, string>)[location.pathname] || "探索与实验"} · Fieldwork`;
  }, [location.pathname]);
  return (
    <EditorialShell>
      <Suspense
        fallback={<div className="editorial-loading">正在展开内容…</div>}
      >
        <Routes>
          <Route path="/" element={<EditorialHome />} />
          <Route path="/papers" element={<PaperLibrary />} />
          <Route path="/papers/:id" element={<PaperReader />} />
          <Route path="/paths/:stage" element={<ReadingPath />} />
          <Route
            path="/roadmap"
            element={<Navigate to="/paths/pretraining" replace />}
          />
          <Route path="/learn/:slug" element={<ArticlePage />} />
          <Route path="/models" element={<Models />} />
          <Route path="/sources" element={<Sources />} />
          <Route path="/labs" element={<Labs />} />
          <Route path="/labs/:experiment" element={<Labs />} />
          <Route path="/notebook" element={<ReadingNotebook />} />
          <Route
            path="*"
            element={
              <div className="paper-empty editorial-width">
                <h1>这一页还未收录。</h1>
                <Link className="pill-button dark-pill" to="/papers">
                  探索论文精读
                </Link>
              </div>
            }
          />
        </Routes>
      </Suspense>
    </EditorialShell>
  );
}
