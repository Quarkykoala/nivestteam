import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';

interface VoiceAgentProps {
  onClose: () => void;
}

export const VoiceAgent: React.FC<VoiceAgentProps> = ({ onClose }) => {
  const { processVoiceCommand, isProcessing } = useApp();
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("Listening...");
  const [state, setState] = useState<'listening' | 'processing' | 'speaking'>('listening');

  // Simulation of Pipecat/Sarvam flow
  useEffect(() => {
    // In a real implementation, this would initialize the Pipecat WebRTC client
    // const transport = new DailyTransport();
    // const client = new RTVIClient({ transport, ... });
    // client.connect();
    
    // For demo: Simulate listening after mount
    const timeout = setTimeout(() => {
        // Mocking user speech detection
        // In real app, this comes from the STT stream
    }, 1000);

    return () => clearTimeout(timeout);
  }, []);

  const handleSimulatedVoiceInput = async () => {
    if (!transcript) return;
    
    setState('processing');
    const response = await processVoiceCommand(transcript);
    
    setState('speaking');
    setAiResponse(response);
    
    // Simulate TTS playback time
    setTimeout(() => {
        setState('listening');
        setTranscript("");
        onClose(); 
    }, 3000);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-white/10 flex flex-col items-center gap-6 relative overflow-hidden">
        
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-white/5 rounded-full hover:bg-gray-200">
            <span className="material-symbols-outlined">close</span>
        </button>

        <h3 className="text-xl font-bold text-slate-800 dark:text-white mt-2">VoiceMitra</h3>

        {/* Visualizer / Orb */}
        <div className="relative size-32 flex items-center justify-center">
            {state === 'listening' && (
                <>
                <div className="absolute inset-0 bg-primary/30 rounded-full animate-ping"></div>
                <div className="absolute inset-2 bg-primary/50 rounded-full animate-pulse"></div>
                </>
            )}
            {state === 'processing' && (
                <div className="absolute inset-0 border-4 border-t-primary border-r-transparent border-b-primary border-l-transparent rounded-full animate-spin"></div>
            )}
            <div className="relative z-10 bg-gradient-to-br from-primary to-blue-600 rounded-full size-24 flex items-center justify-center shadow-lg shadow-primary/40">
                <span className="material-symbols-outlined text-white text-4xl">
                    {state === 'speaking' ? 'graphic_eq' : 'mic'}
                </span>
            </div>
        </div>

        {/* Status Text */}
        <div className="text-center space-y-2 min-h-[80px]">
            {state === 'listening' && (
                 <p className="text-slate-500 dark:text-gray-400 animate-pulse">Go ahead, I'm listening...</p>
            )}
             {state === 'processing' && (
                 <p className="text-primary font-medium">Processing your request...</p>
            )}
            {state === 'speaking' && (
                 <p className="text-slate-800 dark:text-white font-medium">{aiResponse}</p>
            )}
        </div>

        {/* Manual Input Fallback (since we don't have real STT in this demo) */}
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
                disabled={!transcript}
                className="bg-primary hover:bg-blue-600 text-white p-3 rounded-xl disabled:opacity-50 transition-colors"
            >
                <span className="material-symbols-outlined">send</span>
            </button>
        </div>

        <p className="text-xs text-slate-400 text-center">
            Powered by Gemini 2.5 Flash & Sarvam AI
        </p>
      </div>
    </div>
  );
};