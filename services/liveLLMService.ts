const OPENAI_MODEL = 'gpt-4o-mini';
const GEMINI_MODEL = 'gemini-3.0-flash';
const OPENAI_VOICE_MODEL = 'gpt-4o-mini-tts';
const OPENAI_VOICE = import.meta.env.VITE_LIVE_VOICE || 'alloy';

const provider = (import.meta.env.VITE_LIVE_PROVIDER || 'gemini').toLowerCase();
const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;

type ChunkHandler = (text: string) => void;

const parseOpenAIStream = async (response: Response, onChunk: ChunkHandler) => {
  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';

    for (const part of parts) {
      if (!part.trim().startsWith('data:')) continue;
      const payload = part.replace('data: ', '').trim();
      if (payload === '[DONE]') continue;
      try {
        const json = JSON.parse(payload);
        const delta = json.choices?.[0]?.delta?.content?.[0]?.text || '';
        if (delta) onChunk(delta);
      } catch (err) {
        console.error('Failed to parse OpenAI chunk', err);
      }
    }
  }
};

const parseGeminiStream = async (response: Response, onChunk: ChunkHandler) => {
  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';

    for (const part of parts) {
      if (!part.trim().startsWith('data:')) continue;
      const payload = part.replace('data: ', '').trim();
      if (payload === '[DONE]') continue;
      try {
        const json = JSON.parse(payload);
        const candidates = json.candidates?.[0];
        const delta = candidates?.content?.parts?.[0]?.text;
        if (delta) onChunk(delta);
      } catch (err) {
        console.error('Failed to parse Gemini chunk', err);
      }
    }
  }
};

export const streamLiveLLMResponse = async (
  prompt: string,
  onChunk: ChunkHandler
) => {
  if (provider === 'gemini') {
    if (!geminiKey) throw new Error('Missing Gemini API key');
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }]}],
          generationConfig: { responseMimeType: 'text/plain' },
        }),
      }
    );

    if (!response.ok) throw new Error('Gemini request failed');
    await parseGeminiStream(response, onChunk);
    return;
  }

  if (!openaiKey) throw new Error('Missing OpenAI API key');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    }),
  });

  if (!response.ok) throw new Error('OpenAI request failed');
  await parseOpenAIStream(response, onChunk);
};

export const synthesizeLLMVoice = async (text: string): Promise<string> => {
  if (provider !== 'openai') {
    throw new Error('LLM voice playback is only supported for OpenAI provider');
  }

  if (!openaiKey) throw new Error('Missing OpenAI API key');

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_VOICE_MODEL,
      input: text,
      voice: OPENAI_VOICE,
      format: 'mp3',
    }),
  });

  if (!response.ok) throw new Error('OpenAI voice request failed');

  const audioBuffer = await response.arrayBuffer();
  const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
  return URL.createObjectURL(blob);
};
