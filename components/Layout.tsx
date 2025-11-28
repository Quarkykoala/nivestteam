import React from 'react';
import { NavLink, useLocation, Outlet } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';

export const Layout = () => {
  const { state } = useApp();
  const location = useLocation();

  // Hide layout on Welcome screen
  if (location.pathname === '/') {
    return <Outlet />;
  }

  const NavItem = ({ to, icon, label, filled = false }: { to: string; icon: string; label: string, filled?: boolean }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-full transition-colors ${
          isActive
            ? 'bg-primary/10 dark:bg-primary/20 text-primary'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
        }`
      }
    >
      {({ isActive }) => (
        <>
            <span className={`material-symbols-outlined ${isActive || filled ? 'fill' : ''} ${isActive ? 'text-primary' : 'text-gray-600 dark:text-gray-400'}`}>
                {icon}
            </span>
          <p className={`text-sm font-medium leading-normal ${isActive ? 'text-text-dark-primary dark:text-white' : ''}`}>{label}</p>
        </>
      )}
    </NavLink>
  );

  return (
    <div className="relative flex min-h-screen w-full flex-col group/design-root">
      <div className="flex flex-1">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:flex w-64 flex-col bg-white/50 dark:bg-slate-900/50 border-r border-gray-200 dark:border-white/10 p-4 sticky top-0 h-screen">
          <div className="flex h-full flex-col justify-between">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3 px-2">
                <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10" 
                     style={{ backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuA02Yv43GIsDlbzAYwadQKMR-Tyd3BU-a3lkNM28xSQhKnUW9230qOEN4N1Tn4iBhqpgZ4B8ilh9lJ3gSqEPqsQ-hu63hHdwDqVFbf0_TkwWu6o3wc6bosyBgkGy435s1rnU2nlF6S0w-Z7KH3hbLgvZCmURtbgK9_4RSuVc5I4euQy9EZmWa1WFEkwDKkhq_me0rxx2J17T4LFd_zzdsqD9bYeoSs_Z5QiYCN7Aa4psz802wSFMQ0A-IK-IdynmddSa0Vry5RFCMk")` }}></div>
                <div className="flex flex-col">
                  <h1 className="text-gray-900 dark:text-white text-base font-medium">Nivest</h1>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Financial Coach</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 px-3 py-2 rounded-full bg-blue-100 dark:bg-blue-900/40">
                <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10" 
                     style={{ backgroundImage: `url("${state.user.avatarUrl}")` }}></div>
                <div className="flex flex-col overflow-hidden">
                  <h2 className="text-text-dark-primary dark:text-white text-sm font-medium truncate">{state.user.name}</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Welcome Back!</p>
                </div>
              </div>

              <nav className="flex flex-col gap-2">
                <NavItem to="/dashboard" icon="home" label="Home" />
                <NavItem to="/budget" icon="account_balance_wallet" label="Budget" />
                <NavItem to="/goals" icon="savings" label="Goals" />
                <NavItem to="/profile" icon="person" label="Profile" />
              </nav>
            </div>

            <div className="mt-auto p-4 bg-primary/10 dark:bg-primary/20 rounded-lg text-center">
                <h3 className="font-bold text-text-dark-primary dark:text-white text-sm">Need Help?</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 mb-3">Our team is here to assist you.</p>
                <button className="w-full text-xs font-bold bg-primary text-white py-2 px-4 rounded-full">Contact Support</button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 pb-24 md:pb-0 overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      {/* Bottom Navigation - Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-background-dark/90 backdrop-blur-lg border-t border-gray-200 dark:border-white/10 pb-safe">
        <div className="flex justify-around items-center h-16 px-2">
           <NavLink to="/dashboard" className={({isActive}) => `flex flex-col items-center justify-center gap-1 w-full h-full ${isActive ? 'text-primary' : 'text-slate-500 dark:text-white/60'}`}>
             <span className={`material-symbols-outlined text-2xl`}>home</span>
             <span className="text-[10px] font-medium">Home</span>
           </NavLink>
           <NavLink to="/budget" className={({isActive}) => `flex flex-col items-center justify-center gap-1 w-full h-full ${isActive ? 'text-primary' : 'text-slate-500 dark:text-white/60'}`}>
             <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
             <span className="text-[10px] font-medium">Budget</span>
           </NavLink>
           <NavLink to="/goals" className={({isActive}) => `flex flex-col items-center justify-center gap-1 w-full h-full ${isActive ? 'text-primary' : 'text-slate-500 dark:text-white/60'}`}>
             <span className="material-symbols-outlined text-2xl">savings</span>
             <span className="text-[10px] font-medium">Goals</span>
           </NavLink>
           <NavLink to="/profile" className={({isActive}) => `flex flex-col items-center justify-center gap-1 w-full h-full ${isActive ? 'text-primary' : 'text-slate-500 dark:text-white/60'}`}>
             <span className="material-symbols-outlined text-2xl">person</span>
             <span className="text-[10px] font-medium">Profile</span>
           </NavLink>
        </div>
      </nav>
    </div>
  );
};