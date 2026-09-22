import { BrowserRouter, StaticRouter } from 'react-router-dom';
import { LearningProvider } from './state';
import App from './App';

/** Astro pre-renders each reading URL; the same tree becomes interactive in the browser. */
export default function Fieldwork({ pathname }: { pathname: string }) {
  const content = <LearningProvider><App /></LearningProvider>;
  return typeof window === 'undefined'
    ? <StaticRouter basename="/fieldwork" location={pathname}>{content}</StaticRouter>
    : <BrowserRouter basename="/fieldwork">{content}</BrowserRouter>;
}
