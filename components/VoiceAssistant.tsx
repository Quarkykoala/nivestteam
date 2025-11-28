import React from 'react';
import { useVoiceBot } from '../hooks/useVoiceBot';

export const VoiceAssistant = () => {
  const { isListening, status, startListening, stopListening, error } = useVoiceBot();
  const isActive = isListening || status === 'connecting';

  const statusLabel = (() => {
    if (status === 'connecting') return 'Connecting to bot...';
    if (status === 'listening') return 'Listening';
    if (status === 'playing') return 'Playing response';
    if (status === 'error') return error ?? 'Connection error';
    return 'Tap to talk';
  })();

  return (
    <div className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-50 flex flex-col items-end gap-2">
      <button
        onClick={isActive ? stopListening : startListening}
        className={`flex items-center justify-center w-16 h-16 rounded-full shadow-lg transition-all transform hover:scale-105 ${
          isActive ? 'bg-red-500 animate-pulse' : 'bg-primary'
        }`}
      >
        <span className="material-symbols-outlined text-white text-3xl">
          {isActive ? 'mic_off' : 'mic'}
        </span>
      </button>
      <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/80 dark:bg-white/10 text-slate-700 dark:text-white/80 shadow">
        {statusLabel}
      </span>
    </div>
  );
};
