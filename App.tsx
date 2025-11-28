import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import { Layout } from './components/Layout';
import { Welcome } from './pages/Welcome';
import { Dashboard } from './pages/Dashboard';
import { Budget } from './pages/Budget';
import { Goals } from './pages/Goals';
import { Profile } from './pages/Profile';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/budget" element={<Budget />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Routes>
        </HashRouter>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;