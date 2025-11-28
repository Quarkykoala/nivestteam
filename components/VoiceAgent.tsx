import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { useVoiceBot } from '../hooks/useVoiceBot';

interface VoiceAgentProps {
  onClose: () => void;
}

type UiState = 'connecting' | 'listening' | 'processing' | 'playing' | 'error';

export const VoiceAgent: React.FC<VoiceAgentProps> = ({ onClose }) => {
  const { processVoiceCommand, isProcessing } = useApp();
  const { status, error, startListening, stopListening, isListening } = useVoiceBot();
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('Listening...');
  const [manualState, setManualState] = useState<UiState>('connecting');

  useEffect(() => {
    startListening();
    return () => stopListening();
  }, [startListening, stopListening]);

  useEffect(() => {
    if (status === 'error') {
      setManualState('error');
    } else if (status === 'playing') {
      setManualState('playing');
    } else if (status === 'listening') {
      setManualState(isProcessing ? 'processing' : 'listening');
    } else if (status === 'connecting') {
      setManualState('connecting');
    }
  }, [isProcessing, status]);

  const handleSimulatedVoiceInput = async () => {
    if (!transcript) return;

    setManualState('processing');
    const response = await processVoiceCommand(transcript);

    setManualState('playing');
    setAiResponse(response);

    setTimeout(() => {
      setManualState('listening');
      setTranscript('');
    }, 3000);
  };

  const statusText = useMemo(() => {
    if (manualState === 'connecting') return 'Connecting to VoiceMitra...';
    if (manualState === 'processing') return 'Processing your request...';
    if (manualState === 'playing') return aiResponse;
    if (manualState === 'error') return error ?? 'Unable to reach the bot.';
    if (!isListening) return 'Tap to start talking';
    return 'Go ahead, I\'m listening...';
  }, [aiResponse, error, isListening, manualState]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-white/10 flex flex-col items-center gap-6 relative overflow-hidden">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-white/5 rounded-full hover:bg-gray-200">
          <span className="material-symbols-outlined">close</span>
        </button>

        <h3 className="text-xl font-bold text-slate-800 dark:text-white mt-2">VoiceMitra</h3>

        <div className="relative size-32 flex items-center justify-center">
          {manualState === 'listening' && (
            <>
              <div className="absolute inset-0 bg-primary/30 rounded-full animate-ping"></div>
              <div className="absolute inset-2 bg-primary/50 rounded-full animate-pulse"></div>
            </>
          )}
          {manualState === 'processing' && (
            <div className="absolute inset-0 border-4 border-t-primary border-r-transparent border-b-primary border-l-transparent rounded-full animate-spin"></div>
          )}
          {manualState === 'connecting' && (
            <div className="absolute inset-0 border-4 border-dashed border-primary/60 rounded-full animate-spin"></div>
          )}
          {manualState === 'error' && (
            <div className="absolute inset-0 border-4 border-red-400 rounded-full animate-pulse"></div>
          )}
          <div className="relative z-10 bg-gradient-to-br from-primary to-blue-600 rounded-full size-24 flex items-center justify-center shadow-lg shadow-primary/40">
            <span className="material-symbols-outlined text-white text-4xl">
              {manualState === 'playing' ? 'graphic_eq' : 'mic'}
            </span>
          </div>
        </div>

        <div className="text-center space-y-2 min-h-[80px]">
          <p className="text-slate-800 dark:text-white font-medium">{statusText}</p>
        </div>

        <div className="w-full flex gap-2">
          <input
            type="text"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Type to simulate voice (e.g., 'Spent 500 on food')"
            className="flex-1 bg-gray-100 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary"
            onKeyDown={(e) => e.key === 'Enter' && handleSimulatedVoiceInput()}
          />
          <button
            onClick={handleSimulatedVoiceInput}
            disabled={!transcript || manualState === 'processing'}
            className="bg-primary hover:bg-blue-600 text-white p-3 rounded-xl disabled:opacity-50 transition-colors"
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>

        <p className="text-xs text-slate-400 text-center">
          Powered by Gemini 2.5 Flash, Sarvam AI, and Pipecat Flows
        </p>
      </div>
    </div>
  );
};
