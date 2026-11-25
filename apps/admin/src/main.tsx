import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import '../../../packages/shared/src/tokens.css';
import '../../../packages/shared/src/ui/ui.css';
import './admin.css';
import { AdminRoutes } from './App.tsx';
import { useAdminAuth } from './auth.ts';

function Root() {
  return <AdminRoutes auth={useAdminAuth()} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </StrictMode>,
);
