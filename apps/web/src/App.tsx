import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import { Layout } from './Layout.tsx';
import { Home } from './pages/Home.tsx';
import { NotFound } from './pages/NotFound.tsx';

// The guide content (~300 KB) loads only on guide pages.
const Chapter = lazy(() => import('./pages/Chapter.tsx').then((m) => ({ default: m.Chapter })));
import { Support } from './pages/Support.tsx';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="guide/:chapter" element={<Suspense fallback={<p className="wrap page-pad">Loading the guide…</p>}><Chapter /></Suspense>} />
        <Route path="support" element={<Support />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
