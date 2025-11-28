import React from 'react';
import { useApp } from '../contexts/AppContext';

export const Profile = () => {
    const { state, updateUser } = useApp();

    return (
        <div className="flex flex-1 flex-col p-6 lg:p-10 max-w-4xl mx-auto">
            <div className="flex flex-wrap justify-between gap-3 pb-8">
                <p className="text-gray-900 dark:text-white text-4xl font-black leading-tight tracking-[-0.033em] min-w-72">Profile & Settings</p>
            </div>
            <div className="flex flex-col gap-8">
                <div className="rounded-xl bg-white dark:bg-slate-900/50 p-6 @container shadow-sm border border-gray-200/80 dark:border-white/10">
                    <div className="flex w-full flex-col gap-6 sm:flex-row sm:justify-between sm:items-center">
                        <div className="flex gap-6 items-center">
                            <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-24 w-24" style={{ backgroundImage: `url("${state.user.avatarUrl}")` }}></div>
                            <div className="flex flex-col justify-center">
                                <p className="text-gray-900 dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">{state.user.name}</p>
                                <p className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal">{state.user.phone}</p>
                            </div>
                        </div>
                        <button className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-4 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white text-sm font-bold leading-normal tracking-[0.015em] w-full max-w-[480px] sm:w-auto hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">
                            <span className="truncate">Edit Profile</span>
                        </button>
                    </div>
                </div>
                
                <div className="flex flex-col gap-8">
                    <div className="rounded-xl bg-white dark:bg-slate-900/50 overflow-hidden shadow-sm border border-gray-200/80 dark:border-white/10">
                        <h2 className="text-gray-900 dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em] px-6 pb-3 pt-5">Choose Your Language</h2>
                        <div className="flex p-4">
                            <div className="flex h-12 flex-1 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 p-1.5">
                                {['English', 'Hinglish', 'Hindi'].map((lang) => (
                                    <label key={lang} className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-full px-2 transition-all duration-200 ${state.user.language === lang ? 'bg-primary text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'}`}>
                                        <span className="truncate">{lang}</span>
                                        <input 
                                            className="invisible w-0 absolute" 
                                            name="language-preference" 
                                            type="radio" 
                                            value={lang}
                                            checked={state.user.language === lang}
                                            onChange={() => updateUser({ language: lang as any })}
                                        />
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl bg-white dark:bg-slate-900/50 overflow-hidden shadow-sm border border-gray-200/80 dark:border-white/10">
                        <h2 className="text-gray-900 dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em] px-6 pb-3 pt-5">How should Nivest talk to you?</h2>
                        <div className="flex p-4">
                            <div className="flex h-12 flex-1 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 p-1.5">
                                {['Voice', 'Text'].map((mode) => (
                                    <label key={mode} className={`flex cursor-pointer h-full grow items-center justify-center gap-2 overflow-hidden rounded-full px-2 transition-all duration-200 ${state.user.interactionMode === mode ? 'bg-primary text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'}`}>
                                        <span className="material-symbols-outlined">{mode === 'Voice' ? 'mic' : 'chat_bubble'}</span>
                                        <span className="truncate">{mode}</span>
                                        <input 
                                            className="invisible w-0 absolute" 
                                            name="interaction-mode" 
                                            type="radio" 
                                            value={mode}
                                            checked={state.user.interactionMode === mode}
                                            onChange={() => updateUser({ interactionMode: mode as any })}
                                        />
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4 mb-20 md:mb-0">
                    <button className="flex min-w-[120px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-12 px-6 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/30">
                        <span className="truncate">Save Changes</span>
                    </button>
                </div>
            </div>
        </div>
    );
};