import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import { AuthProvider } from './contexts/AuthContext';

const Layout = lazy(() => import('./components/Layout').then(module => ({ default: module.Layout })));
const Welcome = lazy(() => import('./pages/Welcome').then(module => ({ default: module.Welcome })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Budget = lazy(() => import('./pages/Budget').then(module => ({ default: module.Budget })));
const Goals = lazy(() => import('./pages/Goals').then(module => ({ default: module.Goals })));
const Profile = lazy(() => import('./pages/Profile').then(module => ({ default: module.Profile })));

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <HashRouter>
          <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading experience...</div>}>
            <Routes>
              <Route path="/" element={<Welcome />} />
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/budget" element={<Budget />} />
                <Route path="/goals" element={<Goals />} />
                <Route path="/profile" element={<Profile />} />
              </Route>
            </Routes>
          </Suspense>
        </HashRouter>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
