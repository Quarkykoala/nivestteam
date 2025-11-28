import React from 'react';
import { useApp } from '../contexts/AppContext';

export const Goals = () => {
  const { state } = useApp();

  return (
    <div className="flex-1 p-4 sm:p-8">
        <div className="layout-content-container flex flex-col w-full max-w-6xl mx-auto">
            <div className="flex flex-wrap justify-between items-center gap-4 p-4 mb-4">
                <h1 className="text-text-dark-primary dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">Goals & Savings</h1>
                <button className="flex items-center justify-center gap-2 min-w-[84px] cursor-pointer overflow-hidden rounded-full h-12 px-5 bg-primary hover:bg-blue-600 transition-colors text-white text-base font-bold leading-normal tracking-[0.015em]">
                    <span className="material-symbols-outlined">add</span>
                    <span className="truncate">Add New Goal</span>
                </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-4">
                
                {state.goals.map((goal, idx) => {
                    const percentage = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                    const imageUrl = idx === 0 
                        ? "https://lh3.googleusercontent.com/aida-public/AB6AXuBArnoC877v_qM4WehDW3L1pa3m-VVRgbbs6f01zAdnHLjpyYioIx5B2s6GXa1cSNiTbEZKgVIcYN8hb6-D_Eh6A6gu6k0NXu_4_B4b8CNbU-J3yRQFjMrp3ZSZtY2udFuNuTZxxie5Izj6kor6i9PFKxthfTekDiCYbBe0mdY4UdF2IiX1OGQ7_ml7TDbebArblTd2q4K-BldL_4f-iufFQHBjFH_Zszhu7oCeIDD50jZhnKH1wQ3JiyqUvq0T7JIPa0BSppF3-g4" 
                        : "https://lh3.googleusercontent.com/aida-public/AB6AXuBlMTkzxqU-zuzcoczqlwmFtNNNeVQrX3LEeqlrTLjOyDS0YT8mCaQV38k23jgN8FuTm2pIEoiFfK_5eytqjLeAC3H8Me2J8WgrkPdVyXhOfoVOP2kJ3ISl8io1OnDG3serJOiSEZtxXLCjbUXFNGFpwaz1Wr3yY6huS-Ku25nKma_XVmIXKfRXY9jOITTSIsf-n_da9VWIFuFakOeBHwQ_J5iT5VtfinqawApwbo4_rQiZofHqOhs-1iQ6KhO6Hznvn5inlZsvy3U";
                    
                    return (
                        <div key={goal.id} className="flex flex-col rounded-xl bg-white dark:bg-slate-900/50 shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
                            <div className="w-full bg-center bg-no-repeat aspect-video bg-cover" style={{ backgroundImage: `url("${imageUrl}")` }}></div>
                            <div className="flex w-full flex-col items-stretch justify-center gap-4 p-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal">{goal.title}</p>
                                        <p className="text-text-dark-primary dark:text-white text-2xl font-bold leading-tight tracking-[-0.015em]">₹{goal.currentAmount.toLocaleString()} saved</p>
                                        <p className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal">of ₹{goal.targetAmount.toLocaleString()}</p>
                                    </div>
                                    <div className="p-3 rounded-full bg-primary/20">
                                        <span className="material-symbols-outlined text-primary text-3xl">{goal.icon}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between">
                                        <p className="text-text-dark-primary dark:text-white text-base font-medium leading-normal">{percentage}% complete</p>
                                    </div>
                                    <div className="rounded-full bg-background-light dark:bg-background-dark/80 h-2.5">
                                        <div className={`h-2.5 rounded-full bg-primary`} style={{ width: `${percentage}%` }}></div>
                                    </div>
                                </div>
                                <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal">Monthly Saving Needed: ₹{goal.monthlyContribution.toLocaleString()}</p>
                                <div className="flex flex-1 gap-3 flex-wrap justify-start pt-2">
                                    <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-12 px-5 bg-primary hover:bg-blue-600 transition-colors text-white text-base font-bold leading-normal tracking-[0.015em] flex-1">
                                        <span className="truncate">Add Savings</span>
                                    </button>
                                    <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-12 px-5 bg-background-light hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-text-dark-primary dark:text-white text-base font-bold leading-normal tracking-[0.015em] flex-1">
                                        <span className="truncate">View Details</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}

                <div className="lg:col-span-2 flex flex-col rounded-xl bg-white dark:bg-slate-900/50 shadow-sm border border-gray-100 dark:border-white/5 p-6 gap-4">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-3xl">tips_and_updates</span>
                        <h3 className="text-text-dark-primary dark:text-white text-xl font-bold">Actionable Tips</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-background-light dark:bg-white/5">
                            <span className="material-symbols-outlined text-primary text-2xl">restaurant_menu</span>
                            <p className="text-gray-600 dark:text-gray-300 text-sm">Reduce eating out by ₹1000 this month.</p>
                        </div>
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-background-light dark:bg-white/5">
                            <span className="material-symbols-outlined text-primary text-2xl">calendar_today</span>
                            <p className="text-gray-600 dark:text-gray-300 text-sm">Set aside ₹500 every week for your goal.</p>
                        </div>
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-background-light dark:bg-white/5">
                            <span className="material-symbols-outlined text-primary text-2xl">local_mall</span>
                            <p className="text-gray-600 dark:text-gray-300 text-sm">Wait 24 hours before making a big purchase.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};