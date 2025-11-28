import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts';
import { VoiceAgent } from '../components/VoiceAgent';

export const Dashboard = () => {
  const { state } = useApp();
  const [showVoice, setShowVoice] = useState(false);

  const totalExpense = state.transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const remainingBudget = state.monthlyIncome - totalExpense;
  const percentageUsed = Math.min(100, Math.round((totalExpense / state.monthlyIncome) * 100));

  // Dummy data for the chart based on last 7 days (simulated)
  const data = [
    { name: 'M', value: 400 },
    { name: 'T', value: 300 },
    { name: 'W', value: 600 },
    { name: 'T', value: 200 },
    { name: 'F', value: 900 },
    { name: 'S', value: 500 },
    { name: 'S', value: 550 },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      {showVoice && <VoiceAgent onClose={() => setShowVoice(false)} />}
      
      <header className="flex flex-wrap justify-between gap-3 mb-8 items-center">
        <div className="flex min-w-72 flex-col gap-1">
          <h1 className="text-[#181411] dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal">Here is your financial summary for the month.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowVoice(true)}
            className="relative p-3 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
            title="Start Voice Command"
          >
             <span className="material-symbols-outlined">mic</span>
          </button>
          <button className="relative p-2 rounded-full hover:bg-white/80 dark:hover:bg-white/10">
            <span className="material-symbols-outlined text-gray-700 dark:text-gray-300">notifications</span>
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
          </button>
          <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-12" style={{ backgroundImage: `url("${state.user.avatarUrl}")` }}></div>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="flex flex-1 flex-col gap-2 rounded-2xl p-6 bg-white dark:bg-slate-900/50 dark:border dark:border-white/5 shadow-sm">
          <p className="text-gray-500 dark:text-gray-400 text-base font-medium leading-normal">Estimated Monthly Income</p>
          <p className="text-gray-800 dark:text-white tracking-light text-4xl font-bold leading-tight">₹{state.monthlyIncome.toLocaleString()}</p>
        </div>
        <div className="flex flex-1 flex-col gap-2 rounded-2xl p-6 bg-white dark:bg-slate-900/50 dark:border dark:border-white/5 shadow-sm">
          <p className="text-gray-500 dark:text-gray-400 text-base font-medium leading-normal">Fixed Costs</p>
          <p className="text-gray-800 dark:text-white tracking-light text-4xl font-bold leading-tight">₹{(22000).toLocaleString()}</p>
        </div>
        <div className="flex flex-1 flex-col gap-2 rounded-2xl p-6 bg-primary/10 dark:bg-primary/20">
          <p className="text-primary/80 dark:text-blue-300 text-base font-medium leading-normal">Remaining Budget</p>
          <p className="text-primary dark:text-white tracking-light text-4xl font-bold leading-tight">₹{remainingBudget.toLocaleString()}</p>
        </div>
      </section>

      <section className="flex flex-col gap-3 p-6 bg-white dark:bg-slate-900/50 dark:border dark:border-white/5 shadow-sm rounded-2xl mb-8">
        <div className="flex gap-6 justify-between items-center">
          <p className="text-gray-800 dark:text-white text-base font-medium leading-normal">Monthly Budget Used</p>
          <p className="text-primary text-base font-bold leading-normal">{percentageUsed}%</p>
        </div>
        <div className="w-full rounded-full bg-primary/10 dark:bg-primary/20 h-2.5">
            <div className="h-2.5 rounded-full bg-primary transition-all duration-1000" style={{ width: `${percentageUsed}%` }}></div>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal">₹{remainingBudget.toLocaleString()} of ₹{state.monthlyIncome.toLocaleString()} left to spend this month</p>
      </section>

      <h2 className="text-gray-900 dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em] mb-4">Your Guides & Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 rounded-2xl p-6 bg-white dark:bg-slate-900/50 dark:border dark:border-white/5 shadow-sm">
            <p className="text-gray-500 dark:text-gray-400 text-base font-medium leading-normal">This Week's Limit</p>
            <p className="text-gray-800 dark:text-white tracking-light text-3xl font-bold leading-tight">₹7,000</p>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl p-6 bg-white dark:bg-slate-900/50 dark:border dark:border-white/5 shadow-sm">
            <p className="text-gray-500 dark:text-gray-400 text-base font-medium leading-normal">Today's Limit</p>
            <p className="text-gray-800 dark:text-white tracking-light text-3xl font-bold leading-tight">₹1,000</p>
          </div>
        </div>
        <div className="flex flex-col gap-4 rounded-2xl p-6 bg-white dark:bg-slate-900/50 dark:border dark:border-white/5 shadow-sm md:col-span-2 lg:col-span-2">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex flex-col items-start justify-between p-6 rounded-2xl bg-primary/10 dark:bg-primary/20">
              <div>
                <h3 className="text-primary dark:text-blue-200 text-lg font-bold">Weekly Plan</h3>
                <p className="text-blue-800 dark:text-blue-300 text-sm mt-1">Review your spending plan for the upcoming week.</p>
              </div>
              <button className="mt-4 px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-full hover:bg-primary/90 transition-colors">View Plan</button>
            </div>
            <div className="flex-1 flex flex-col items-start justify-between p-6 rounded-2xl bg-primary/10 dark:bg-primary/20">
              <div>
                <h3 className="text-primary dark:text-blue-200 text-lg font-bold">Voice Reminders</h3>
                <p className="text-blue-800 dark:text-blue-300 text-sm mt-1">Get your daily financial tips via voice message.</p>
              </div>
              <button 
                onClick={() => setShowVoice(true)}
                className="mt-4 px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-full hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-base">mic</span>
                Listen Now
              </button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 p-6 rounded-2xl bg-primary/5 dark:bg-white/5 mt-4">
            <div className="flex-1">
              <h3 className="text-primary dark:text-blue-200 text-lg font-bold">Last 7-Day Spend</h3>
              <p className="text-blue-800 dark:text-gray-300 text-sm mt-1">You spent ₹3,450. That's on track!</p>
            </div>
            <div className="w-full sm:w-48 h-24">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 4 ? '#359EFF' : '#93C5FD'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};