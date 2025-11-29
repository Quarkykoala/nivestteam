import { useCallback, useEffect, useRef, useState } from 'react';
import { streamLiveLLMResponse, synthesizeLLMVoice } from '../services/liveLLMService';

export type VoiceBotStatus = 'idle' | 'listening' | 'streaming' | 'error';

type RecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type RecognitionConstructor = new () => RecognitionInstance;

const getSpeechRecognition = (): RecognitionInstance | null => {
  const Recognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  return Recognition ? new (Recognition as RecognitionConstructor)() : null;
};

export const useVoiceBot = () => {
  const [status, setStatus] = useState<VoiceBotStatus>('idle');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');

  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const isStreamingRef = useRef(false);
  const spokenTextRef = useRef('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    setIsListening(false);
    setStatus('idle');
    setTranscript('');
    spokenTextRef.current = '';
    isStreamingRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  const fallbackSpeak = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => {
        isStreamingRef.current = false;
        reset();
      };
      window.speechSynthesis.speak(utterance);
    },
    [reset]
  );

  const speakWithLLMVoice = useCallback(
    async (fullText: string) => {
      if (!fullText.trim()) {
        reset();
        return;
      }

      try {
        const url = await synthesizeLLMVoice(fullText);
        audioUrlRef.current = url;

        if (audioRef.current) {
          audioRef.current.pause();
        }

        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          isStreamingRef.current = false;
          reset();
        };

        await audio.play();
      } catch (err) {
        console.error('LLM voice playback failed, falling back to device TTS', err);
        setError('Using device voice while LLM audio is unavailable');
        fallbackSpeak(fullText);
        isStreamingRef.current = false;
        reset();
      }
    },
    [fallbackSpeak, reset]
  );

  const handleTranscript = useCallback(
    async (text: string) => {
      if (!text.trim()) {
        setStatus('idle');
        return;
      }

      setStatus('streaming');
      isStreamingRef.current = true;
      spokenTextRef.current = '';

      try {
        await streamLiveLLMResponse(text, (chunk) => {
          spokenTextRef.current += chunk;
        });

        await speakWithLLMVoice(spokenTextRef.current);
      } catch (err) {
        console.error('LLM streaming error', err);
        setError('Failed to reach LLM');
        setStatus('error');
        isStreamingRef.current = false;
      }
    },
    [speakWithLLMVoice]
  );

  useEffect(() => {
    return () => {
      stopListening();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startListening = useCallback(() => {
    const recognition = getSpeechRecognition();
    if (!recognition) {
      setError('Speech recognition not supported in this browser');
      setStatus('error');
      return;
    }

    reset();
    setError(null);
    setStatus('listening');
    setIsListening(true);

    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      const lastResult = event.results[event.results.length - 1];
      const text = lastResult[0].transcript;
      setTranscript(text);
      if (lastResult.isFinal) {
        recognition.stop();
        handleTranscript(text);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setError('Microphone error');
      setStatus('error');
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (!isStreamingRef.current && status !== 'error') {
        setStatus('idle');
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [handleTranscript, reset, status]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    window.speechSynthesis.cancel();
    reset();
  }, [reset]);

  return {
    isListening,
    status,
    transcript,
    startListening,
    stopListening,
    error,
  };
};
