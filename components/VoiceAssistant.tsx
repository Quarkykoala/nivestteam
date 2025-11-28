import React, { useState, useEffect, useRef } from 'react';

export const VoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
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

  const startListening = async () => {
    try {
      const ws = new WebSocket('ws://localhost:8000/ws');
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to bot');
        setIsConnected(true);
        setIsListening(true);
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
        console.log('Disconnected from bot');
        setIsConnected(false);
        setIsListening(false);
        stopAudioCapture();
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Error starting voice assistant:', error);
    }
  };

  const stopListening = () => {
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    stopAudioCapture();
    setIsListening(false);
    setIsConnected(false);
  };

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

    } catch (error) {
      console.error('Error capturing audio:', error);
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

  return (
    <div className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-50">
      <button
        onClick={isListening ? stopListening : startListening}
        className={`flex items-center justify-center w-16 h-16 rounded-full shadow-lg transition-all transform hover:scale-105 ${isListening
            ? 'bg-red-500 animate-pulse'
            : 'bg-primary'
          }`}
      >
        <span className="material-symbols-outlined text-white text-3xl">
          {isListening ? 'mic_off' : 'mic'}
        </span>
      </button>
    </div>
  );
};
