import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '25mb' }));

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please check your API key in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatGeminiError(error: unknown): { status: number; message: string } {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.includes('PERMISSION_DENIED') || raw.includes('API_KEY_INVALID') || raw.includes('403')) {
    return {
      status: 403,
      message: 'API key permission error. Please verify your Gemini API key in Settings > Secrets.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message: 'Quota limit reached. Upgrade or select a billing-enabled API key in Settings > Secrets.',
    };
  }
  if (raw.includes('NOT_FOUND') || raw.includes('404')) {
    return {
      status: 404,
      message: `Requested Gemini model was not found: ${raw}`,
    };
  }
  return { status: 500, message: raw || 'Unexpected Gemini API error.' };
}

// Client-safe public runtime config (never returns GEMINI_API_KEY)
app.get('/api/config', (_req, res) => {
  res.json({
    mapsApiKey: process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '',
  });
});

// Cross-device synced clipboard store (in-memory server sync across desktop & mobile clients)
interface SyncedClipboardItem {
  id: string;
  content: string;
  category: 'text' | 'code' | 'link';
  device: string;
  platform: 'windows' | 'ios' | 'android' | 'macos';
  pinned: boolean;
  createdAt: string;
}

const clipboardStore: SyncedClipboardItem[] = [
  {
    id: 'clip-seed-1',
    content: 'npx react-native run-windows --arch x64 --release',
    category: 'code',
    device: 'Workstation · Windows 11',
    platform: 'windows',
    pinned: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
  },
  {
    id: 'clip-seed-2',
    content: 'https://learn.microsoft.com/en-us/windows/apps/design/style/acrylic',
    category: 'link',
    device: 'iPhone 16 Pro · iOS',
    platform: 'ios',
    pinned: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  },
  {
    id: 'clip-seed-3',
    content: 'Review Q4 desktop latency benchmarks before Thursday 2:00 PM sync with hardware team.',
    category: 'text',
    device: 'Pixel 9 Pro · Android',
    platform: 'android',
    pinned: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
  },
  {
    id: 'clip-seed-4',
    content: 'const springConfig = { type: "spring", stiffness: 420, damping: 32, mass: 0.75 };',
    category: 'code',
    device: 'Workstation · Windows 11',
    platform: 'windows',
    pinned: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
  },
];

app.get('/api/clipboard', (_req, res) => {
  res.json({ items: clipboardStore });
});

app.post('/api/clipboard', (req, res) => {
  const { content, category, device, platform } = req.body ?? {};
  if (typeof content !== 'string' || !content.trim()) {
    res.status(400).json({ error: 'Clipboard content is required.' });
    return;
  }
  const trimmed = content.trim();
  const existingIdx = clipboardStore.findIndex((i) => i.content === trimmed);
  if (existingIdx >= 0) {
    const [existing] = clipboardStore.splice(existingIdx, 1);
    existing.createdAt = new Date().toISOString();
    if (device) existing.device = String(device);
    clipboardStore.unshift(existing);
    res.status(200).json({ item: existing, items: clipboardStore });
    return;
  }

  const inferredCategory: 'text' | 'code' | 'link' =
    category === 'code' || category === 'link' || category === 'text'
      ? category
      : /^https?:\/\//i.test(trimmed)
        ? 'link'
        : /[;{}()=>]|^npx |^npm |^git |^const |^import /.test(trimmed)
          ? 'code'
          : 'text';

  const item: SyncedClipboardItem = {
    id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    content: trimmed,
    category: inferredCategory,
    device: typeof device === 'string' && device.trim() ? device.trim() : 'Workstation · Windows 11',
    platform:
      platform === 'ios' || platform === 'android' || platform === 'macos' ? platform : 'windows',
    pinned: false,
    createdAt: new Date().toISOString(),
  };
  clipboardStore.unshift(item);
  if (clipboardStore.length > 50) {
    clipboardStore.pop();
  }
  res.status(201).json({ item, items: clipboardStore });
});

app.patch('/api/clipboard/:id', (req, res) => {
  const item = clipboardStore.find((i) => i.id === req.params.id);
  if (!item) {
    res.status(404).json({ error: 'Clipboard item not found.' });
    return;
  }
  if (typeof req.body?.pinned === 'boolean') {
    item.pinned = req.body.pinned;
  }
  res.json({ item, items: clipboardStore });
});

app.delete('/api/clipboard/:id', (req, res) => {
  const idx = clipboardStore.findIndex((i) => i.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Clipboard item not found.' });
    return;
  }
  clipboardStore.splice(idx, 1);
  res.json({ items: clipboardStore });
});

// 1. Gemini Multi-Turn Chat + Search Grounding + Maps Grounding (Free-tier models only)
const ALLOWED_CHAT_MODELS = new Set([
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
]);

app.post('/api/gemini/chat', async (req, res) => {
  try {
    const {
      messages,
      model = 'gemini-4-hydrogen',
      useSearchGrounding = false,
      useMapsGrounding = false,
      location,
      systemInstruction,
    } = req.body ?? {};

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'At least one message is required.' });
      return;
    }

    const ai = getGeminiClient();

    // Grounding with Google Search or Google Maps uses gemini-4-hydrogen
    const effectiveModel =
      useSearchGrounding || useMapsGrounding
        ? 'gemini-4-hydrogen'
        : ALLOWED_CHAT_MODELS.has(model)
          ? model
          : 'gemini-4-hydrogen';

    const contents = messages.map((m: { role: string; text: string }) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: String(m.text || '') }],
    }));

    const config: Record<string, unknown> = {
      systemInstruction:
        typeof systemInstruction === 'string' && systemInstruction.trim()
          ? systemInstruction
          : 'You are WinLand Copilot, a concise, high-precision Windows desktop assistant embedded in a Dynamic Island. Keep answers structured, crisp, and directly actionable.',
    };

    if (useMapsGrounding) {
      config.tools = [{ googleMaps: {} }];
      if (
        location &&
        typeof location.lat === 'number' &&
        typeof location.lng === 'number'
      ) {
        config.toolConfig = {
          retrievalConfig: {
            latLng: {
              latitude: location.lat,
              longitude: location.lng,
            },
          },
        };
      }
    } else if (useSearchGrounding) {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
      model: effectiveModel,
      contents,
      config,
    });

    const groundingChunks =
      response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];

    res.json({
      text: response.text ?? '',
      model: effectiveModel,
      groundingChunks,
    });
  } catch (error) {
    const formatted = formatGeminiError(error);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

// 2. Analyze Images with gemini-4-hydrogen
app.post('/api/gemini/analyze-image', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/png', prompt } = req.body ?? {};
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      res.status(400).json({ error: 'An uploaded image is required for analysis.' });
      return;
    }

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: String(mimeType),
              data: imageBase64,
            },
          },
          {
            text:
              typeof prompt === 'string' && prompt.trim()
                ? prompt.trim()
                : 'Analyze this image thoroughly. Describe key objects, text, visual details, and actionable takeaways.',
          },
        ],
      },
    });

    res.json({
      text: response.text ?? '',
      model: 'gemini-4-hydrogen',
    });
  } catch (error) {
    const formatted = formatGeminiError(error);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

// 3. Text-to-Speech (WAV) with gemini-3.8-flash-lite-tts
const ALLOWED_VOICES = new Set(['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr']);

app.post('/api/gemini/tts', async (req, res) => {
  try {
    const { text, voiceName = 'Kore', style = 'Clear, calm, articulate desktop narrator' } = req.body ?? {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ error: 'Text input is required for speech generation.' });
      return;
    }

    const ai = getGeminiClient();
    const safeVoice = ALLOWED_VOICES.has(voiceName) ? voiceName : 'Kore';

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text.trim(),
              speechMetadata: {
                style: typeof style === 'string' && style.trim() ? style.trim() : 'Clear, calm desktop narrator',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: safeVoice },
          },
        },
      },
    });

    const base64Audio =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      res.status(502).json({
        error: 'Speech generation completed without returning audio data.',
      });
      return;
    }

    res.json({
      audioUrl: `data:audio/wav;base64,${base64Audio}`,
      voiceName: safeVoice,
      model: 'gemini-3.8-flash-lite-tts',
    });
  } catch (error) {
    const formatted = formatGeminiError(error);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

// 4. Transcribe Audio with gemini-3.5-transcribe
app.post('/api/gemini/transcribe', async (req, res) => {
  try {
    const { audioBase64, mimeType = 'audio/mp3' } = req.body ?? {};
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      res.status(400).json({ error: 'An audio clip is required for transcription.' });
      return;
    }

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: String(mimeType),
              data: audioBase64,
            },
          },
          { text: 'Transcribe this audio accurately with clean punctuation.' },
        ],
      },
    });

    res.json({
      text: response.text ?? '',
      model: 'gemini-3.5-transcribe',
    });
  } catch (error) {
    const formatted = formatGeminiError(error);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const distPath = path.resolve(__dirname, 'dist');

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WinLand server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
