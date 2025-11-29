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

const BOT_WS_URL = (import.meta.env.VITE_BOT_WS_URL as string) || 'ws://localhost:8000/ws';

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
  const websocketRef = useRef<WebSocket | null>(null);
  const websocketPromiseRef = useRef<Promise<WebSocket> | null>(null);

  const disconnectBot = useCallback(() => {
    websocketRef.current?.close();
    websocketRef.current = null;
    websocketPromiseRef.current = null;
  }, []);

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
    disconnectBot();
  }, [disconnectBot]);

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
        const transport = await (async () => {
          if (websocketRef.current?.readyState === WebSocket.OPEN) {
            return websocketRef.current;
          }

          if (websocketPromiseRef.current) {
            return websocketPromiseRef.current;
          }

          websocketPromiseRef.current = new Promise<WebSocket>((resolve, reject) => {
            try {
              const socket = new WebSocket(BOT_WS_URL);

              socket.onopen = () => {
                websocketRef.current = socket;
                setError(null);
                resolve(socket);
                websocketPromiseRef.current = null;
              };

              socket.onerror = (event) => {
                console.error('Voice bot WebSocket error', event);
                setError('Unable to reach the voice bot');
                websocketRef.current = null;
                websocketPromiseRef.current = null;
                reject(new Error('WebSocket connection failed'));
              };

              socket.onclose = () => {
                websocketRef.current = null;
              };
            } catch (err) {
              websocketRef.current = null;
              websocketPromiseRef.current = null;
              reject(err);
            }
          });

          if (!websocketPromiseRef.current) {
            throw new Error('Failed to initialize voice bot connection');
          }

          return websocketPromiseRef.current;
        })();

        await new Promise<void>((resolve, reject) => {
          let finished = false;

          const handleChunk = (chunk: string) => {
            if (!chunk) return;
            spokenTextRef.current += chunk;
          };

          const finalize = () => {
            if (finished) return;
            finished = true;
            transport.removeEventListener('message', handleMessage);
            transport.removeEventListener('error', handleError);
            transport.removeEventListener('close', handleClose);
            resolve();
          };

          const handleMessage = (event: MessageEvent) => {
            if (event.data instanceof Blob) {
              event.data
                .text()
                .then(handleChunk)
                .catch((err) => console.error('Failed to read bot blob', err));
              return;
            }

            const data = event.data as string;
            try {
              const parsed = JSON.parse(data);

              if (parsed?.type === 'chunk' || parsed?.type === 'text') {
                handleChunk(parsed.chunk || parsed.text || '');
                return;
              }

              if (parsed?.type === 'done') {
                finalize();
                return;
              }

              if (parsed?.type === 'error') {
                throw new Error(parsed?.reason || 'Bot returned an error');
              }
            } catch (err) {
              // Not JSON or parsing failed; treat as plain text chunk
              handleChunk(typeof data === 'string' ? data : '');
            }
          };

          const handleError = (event: Event) => {
            console.error('Voice bot stream error', event);
            setError('Bot connection dropped');
            finished = true;
            reject(new Error('Voice bot stream error'));
          };

          const handleClose = () => {
            finalize();
          };

          transport.addEventListener('message', handleMessage);
          transport.addEventListener('error', handleError);
          transport.addEventListener('close', handleClose);

          try {
            transport.send(JSON.stringify({ type: 'transcript', text }));
          } catch (err) {
            reject(err);
          }
        });

        if (!spokenTextRef.current) {
          spokenTextRef.current = 'I heard you loud and clear.';
        }

        await speakWithLLMVoice(spokenTextRef.current);
      } catch (err) {
        console.error('LLM streaming error', err);
        setError('Failed to reach LLM, falling back to cloud provider');
        isStreamingRef.current = false;

        // Fall back to direct API streaming if the WebSocket bot is unavailable
        spokenTextRef.current = '';
        setStatus('streaming');

        await streamLiveLLMResponse(text, (chunk) => {
          spokenTextRef.current += chunk;
        });

        await speakWithLLMVoice(spokenTextRef.current);
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
