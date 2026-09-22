import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
interface Progress {
  completed: string[];
  lastRead: string;
  notes: Record<string, string>;
}
const blank: Progress = { completed: [], lastRead: "", notes: {} };
function read<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
const Context = createContext<{
  progress: Progress;
  toggle: (slug: string) => void;
  visit: (slug: string) => void;
  note: (slug: string, value: string) => void;
  theme: string;
  toggleTheme: () => void;
}>({
  progress: blank,
  toggle: () => {},
  visit: () => {},
  note: () => {},
  theme: "light",
  toggleTheme: () => {},
});
export function LearningProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<Progress>(blank);
  const [theme, setTheme] = useState("light");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const saved = read<Progress>("fieldwork-progress-v1", blank);
    if (Array.isArray(saved.completed) && saved.notes && typeof saved.notes === "object") setProgress(current => ({ ...saved, lastRead: current.lastRead || saved.lastRead }));
    const storedTheme = read<string>("fieldwork-theme", "light");
    setTheme(storedTheme === "dark" ? "dark" : "light");
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem("fieldwork-progress-v1", JSON.stringify(progress));
    } catch {
      /* Storage may be disabled. */
    }
  }, [progress, ready]);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("fieldwork-theme", JSON.stringify(theme));
    } catch {
      /* Storage may be disabled. */
    }
  }, [theme, ready]);
  return (
    <Context.Provider
      value={{
        progress,
        toggle: (slug) =>
          setProgress((p) => ({
            ...p,
            completed: p.completed.includes(slug)
              ? p.completed.filter((s) => s !== slug)
              : [...p.completed, slug],
          })),
        visit: (slug) =>
          setProgress((p) =>
            p.lastRead === slug ? p : { ...p, lastRead: slug },
          ),
        note: (slug, value) =>
          setProgress((p) => ({ ...p, notes: { ...p.notes, [slug]: value } })),
        theme,
        toggleTheme: () => setTheme((t) => (t === "light" ? "dark" : "light")),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useLearning = () => useContext(Context);
