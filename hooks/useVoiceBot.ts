import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_WS_URL = import.meta.env.VITE_BOT_WS_URL ?? 'ws://localhost:8000/ws';

type VoiceBotStatus = 'idle' | 'connecting' | 'listening' | 'playing' | 'error';

interface VoiceBotState {
  status: VoiceBotStatus;
  error: string | null;
  isConnected: boolean;
  isListening: boolean;
  startListening: () => Promise<void>;
  stopListening: () => void;
}

export const useVoiceBot = (wsUrl: string = DEFAULT_WS_URL): VoiceBotState => {
  const [status, setStatus] = useState<VoiceBotStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const websocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextStartTimeRef = useRef(0);

  const stopAudioCapture = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    nextStartTimeRef.current = 0;
  }, []);

  const playNextChunk = useCallback(() => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setStatus('listening');
      setIsConnected(true);
      return;
    }

    isPlayingRef.current = true;
    const audioData = audioQueueRef.current.shift();
    if (!audioData || !audioContextRef.current) return;

    const audioContext = audioContextRef.current;
    const buffer = audioContext.createBuffer(1, audioData.length, 16000);
    const channelData = buffer.getChannelData(0);

    for (let i = 0; i < audioData.length; i++) {
      channelData[i] = audioData[i] / 0x7fff;
    }

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);

    const currentTime = audioContext.currentTime;
    const startTime = Math.max(currentTime, nextStartTimeRef.current);

    source.start(startTime);
    nextStartTimeRef.current = startTime + buffer.duration;

    source.onended = () => {
      playNextChunk();
    };
  }, []);

  const queueAudio = useCallback(
    (audioData: Int16Array) => {
      audioQueueRef.current.push(audioData);
      setStatus('playing');
      if (!isPlayingRef.current) {
        playNextChunk();
      }
    },
    [playNextChunk]
  );

  const startAudioCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7fff;
          }
          websocketRef.current.send(pcmData.buffer);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
    } catch (err) {
      console.error('Error capturing audio:', err);
      setError('Microphone permission denied or unavailable.');
      setStatus('error');
    }
  }, []);

  const startListening = useCallback(async () => {
    if (status === 'connecting' || status === 'listening' || status === 'playing') return;

    setStatus('connecting');
    setError(null);

    try {
      const ws = new WebSocket(wsUrl);
      websocketRef.current = ws;

      ws.onopen = () => {
        setStatus('listening');
        setIsConnected(true);
        startAudioCapture();
      };

      ws.onmessage = async (event) => {
        if (event.data instanceof Blob) {
          const arrayBuffer = await event.data.arrayBuffer();
          const audioData = new Int16Array(arrayBuffer);
          queueAudio(audioData);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        stopAudioCapture();
        setStatus('idle');
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('Could not connect to the voice bot.');
        setStatus('error');
        setIsConnected(false);
      };
    } catch (err) {
      console.error('Error starting voice assistant:', err);
      setError('Could not initialize the voice bot.');
      setStatus('error');
      setIsConnected(false);
    }
  }, [queueAudio, startAudioCapture, status, stopAudioCapture, wsUrl]);

  const stopListening = useCallback(() => {
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    stopAudioCapture();
    audioQueueRef.current = [];
    setStatus('idle');
    setIsConnected(false);
  }, [stopAudioCapture]);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    status,
    error,
    isConnected,
    isListening: status === 'listening' || status === 'playing',
    startListening,
    stopListening,
  };
};
