import { useState, useEffect, useRef, useCallback } from 'react';

export type VoiceBotStatus = 'disconnected' | 'connecting' | 'listening' | 'playing' | 'error';

export const useVoiceBot = () => {
  const [status, setStatus] = useState<VoiceBotStatus>('disconnected');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const websocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextStartTimeRef = useRef(0);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  const startListening = useCallback(async () => {
    try {
      setStatus('connecting');
      setError(null);

      const ws = new WebSocket('ws://localhost:8000/ws');
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to bot');
        setStatus('listening');
        setIsListening(true);
        startAudioCapture();
      };

      ws.onmessage = async (event) => {
        if (event.data instanceof Blob) {
          setStatus('playing');
          const arrayBuffer = await event.data.arrayBuffer();
          const audioData = new Int16Array(arrayBuffer);
          queueAudio(audioData);
        }
      };

      ws.onclose = () => {
        console.log('Disconnected from bot');
        setStatus('disconnected');
        setIsListening(false);
        stopAudioCapture();
      };

      ws.onerror = (e) => {
        console.error('WebSocket error:', e);
        setError('Connection failed');
        setStatus('error');
      };

    } catch (err) {
      console.error('Error starting voice assistant:', err);
      setError('Failed to start');
      setStatus('error');
    }
  }, []);

  const stopListening = useCallback(() => {
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    stopAudioCapture();
    setIsListening(false);
    setStatus('disconnected');
  }, []);

  const startAudioCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
          }
          websocketRef.current.send(pcmData.buffer);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

    } catch (err) {
      console.error('Error capturing audio:', err);
      setError('Microphone error');
      setStatus('error');
    }
  };

  const stopAudioCapture = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
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
  };

  const queueAudio = (audioData: Int16Array) => {
    audioQueueRef.current.push(audioData);
    if (!isPlayingRef.current) {
      playNextChunk();
    }
  };

  const playNextChunk = () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      // If we were playing and now stopped, revert status to listening if still connected
      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        setStatus('listening');
      }
      return;
    }

    isPlayingRef.current = true;
    const audioData = audioQueueRef.current.shift();
    if (!audioData || !audioContextRef.current) return;

    const audioContext = audioContextRef.current;
    const buffer = audioContext.createBuffer(1, audioData.length, 16000);
    const channelData = buffer.getChannelData(0);

    for (let i = 0; i < audioData.length; i++) {
      channelData[i] = audioData[i] / 0x7FFF;
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
  };

  return {
    isListening,
    status,
    startListening,
    stopListening,
    error
  };
};
