import { Route, Routes } from 'react-router';
import { Layout } from './Layout.tsx';
import { Chapter } from './pages/Chapter.tsx';
import { Home } from './pages/Home.tsx';
import { NotFound } from './pages/NotFound.tsx';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="guide/:chapter" element={<Chapter />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
