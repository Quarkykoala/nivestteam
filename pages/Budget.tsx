import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { VoiceAgent } from '../components/VoiceAgent';

export const Budget = () => {
  const { state } = useApp();
  const [showVoice, setShowVoice] = useState(false);

  const fixedExpenses = state.transactions.filter(t => t.category === 'Rent' || t.category === 'EMI' || t.category === 'Fees');
  const variableExpenses = state.transactions.filter(t => !fixedExpenses.includes(t) && t.type === 'expense');

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-4xl mx-auto">
      {showVoice && <VoiceAgent onClose={() => setShowVoice(false)} />}
      
      <header className="flex flex-wrap justify-between gap-3 mb-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-text-dark-primary dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">Let's track your money</h1>
          <p className="text-gray-600 dark:text-gray-400 text-base font-normal leading-normal">Add your income and expenses to see your financial health.</p>
        </div>
      </header>
      
      <section className="flex py-3 justify-center mb-8">
        <button 
            onClick={() => setShowVoice(true)}
            className="flex w-full max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-16 px-6 bg-primary hover:bg-blue-600 transition-all text-white gap-3 text-lg font-bold leading-normal tracking-[0.015em] shadow-lg shadow-primary/30"
        >
          <span className="material-symbols-outlined text-white text-3xl">mic</span>
          <span className="truncate">Add income or expense by voice</span>
        </button>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col gap-4 bg-white dark:bg-slate-900/50 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
          <h2 className="text-text-dark-primary dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">Your Monthly Income</h2>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-2xl font-bold text-gray-500 dark:text-gray-400">₹</span>
            <input 
                className="w-full h-16 bg-background-light dark:bg-background-dark/80 rounded-xl pl-10 pr-4 text-2xl font-bold text-text-dark-primary dark:text-white focus:ring-2 focus:ring-primary border-0" 
                placeholder="Enter your total income" 
                type="text" 
                defaultValue={state.monthlyIncome}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 bg-white dark:bg-slate-900/50 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
          <h2 className="text-text-dark-primary dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">Your Savings Goals</h2>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-full bg-primary-warm/10 dark:bg-primary-warm/20">
                <span className="material-symbols-outlined text-primary-warm">emergency</span>
              </div>
              <div className="flex-1"><p className="font-medium text-text-dark-primary dark:text-white">Emergency Fund</p><p className="text-sm text-gray-600 dark:text-gray-400">₹5,000 / ₹20,000</p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-full bg-primary-warm/10 dark:bg-primary-warm/20">
                <span className="material-symbols-outlined text-primary-warm">smartphone</span>
              </div>
              <div className="flex-1"><p className="font-medium text-text-dark-primary dark:text-white">New Phone EMI</p><p className="text-sm text-gray-600 dark:text-gray-400">₹1,500 / ₹1,500</p></div>
            </div>
            <button className="mt-2 flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-full h-12 px-5 bg-primary/20 dark:bg-primary/30 text-primary dark:text-primary-light gap-2 text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/30 transition-colors">
              <span className="material-symbols-outlined">add_circle</span>
              <span className="truncate">Set a New Goal</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 bg-white dark:bg-slate-900/50 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
          <h2 className="text-text-dark-primary dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">Fixed Expenses</h2>
          <ul className="space-y-3">
            {fixedExpenses.length === 0 && <p className="text-gray-500">No fixed expenses yet.</p>}
            {fixedExpenses.map((expense) => (
                <li key={expense.id} className="flex items-center gap-3 p-3 bg-background-light dark:bg-background-dark/80 rounded-xl">
                <span className="material-symbols-outlined text-gray-500 dark:text-gray-400 text-2xl">
                    {expense.category === 'Rent' ? 'home' : expense.category.includes('EMI') ? 'receipt_long' : 'school'}
                </span>
                <p className="flex-1 font-medium text-text-dark-primary dark:text-white">{expense.category}</p>
                <p className="font-bold text-lg text-text-dark-primary dark:text-white">₹{expense.amount.toLocaleString()}</p>
                </li>
            ))}
          </ul>
          <button className="mt-2 flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-full h-12 px-5 bg-primary/20 dark:bg-primary/30 text-primary dark:text-primary-light gap-2 text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/30 transition-colors">
            <span className="material-symbols-outlined">add_circle</span>
            <span className="truncate">Add Fixed Expense</span>
          </button>
        </div>

        <div className="flex flex-col gap-4 bg-white dark:bg-slate-900/50 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
          <h2 className="text-text-dark-primary dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">Variable Expenses</h2>
          <ul className="space-y-3">
             {variableExpenses.map((expense) => (
                <li key={expense.id} className="flex items-center gap-3 p-3 bg-background-light dark:bg-background-dark/80 rounded-xl">
                    <span className="material-symbols-outlined text-gray-500 dark:text-gray-400 text-2xl">
                        {expense.category === 'Food' ? 'restaurant' : expense.category === 'Fuel' ? 'local_gas_station' : 'shopping_bag'}
                    </span>
                    <p className="flex-1 font-medium text-text-dark-primary dark:text-white">{expense.category}</p>
                    <p className="font-bold text-lg text-text-dark-primary dark:text-white">₹{expense.amount.toLocaleString()}</p>
                </li>
             ))}
          </ul>
          <button className="mt-2 flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-full h-12 px-5 bg-primary/20 dark:bg-primary/30 text-primary dark:text-primary-light gap-2 text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/30 transition-colors">
            <span className="material-symbols-outlined">add_circle</span>
            <span className="truncate">Add Variable Expense</span>
          </button>
        </div>
      </div>
    </div>
  );
};