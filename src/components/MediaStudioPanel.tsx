import React, { useState } from 'react';
import {
  Volume2,
  Mic,
  Monitor,
  Upload,
  Loader2,
  Download,
  Check,
  Copy,
} from 'lucide-react';
import { WALLPAPER_URL, MUSIC_TRACKS } from '../data/seedData';

interface MediaStudioPanelProps {
  onApplyWallpaper: (dataUrl: string) => void;
  onHaptic: (style?: 'tap' | 'toggle' | 'success' | 'alert') => void;
}

const VOICE_OPTIONS = [
  { id: 'Kore', label: 'Kore · Calm Studio' },
  { id: 'Puck', label: 'Puck · Bright Crisp' },
  { id: 'Charon', label: 'Charon · Deep Warm' },
  { id: 'Fenrir', label: 'Fenrir · Broadcast' },
  { id: 'Zephyr', label: 'Zephyr · Natural' },
] as const;

const CURATED_WALLPAPERS = [
  {
    id: 'bloom-obsidian',
    label: 'Obsidian Bloom',
    url: WALLPAPER_URL,
  },
  {
    id: 'midnight-circuit',
    label: 'Midnight Circuit',
    url: MUSIC_TRACKS[0].coverUrl,
  },
  {
    id: 'glass-horizon',
    label: 'Glass Horizon',
    url: MUSIC_TRACKS[1].coverUrl,
  },
  {
    id: 'solar-drift',
    label: 'Solar Drift',
    url: MUSIC_TRACKS[2].coverUrl,
  },
];

export const MediaStudioPanel: React.FC<MediaStudioPanelProps> = ({
  onApplyWallpaper,
  onHaptic,
}) => {
  const [studioTab, setStudioTab] = useState<'tts' | 'transcribe' | 'wallpaper'>('tts');

  // Voice Readout (gemini-3.8-flash-lite-tts)
  const [ttsText, setTtsText] = useState(
    'WinLand Dynamic Island is running smoothly. All hardware metrics are optimal and cross-device clipboard sync is active.'
  );
  const [voiceName, setVoiceName] = useState<string>('Kore');
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);

  // Audio Transcription (gemini-3.5-transcribe)
  const [audioFileName, setAudioFileName] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioMime, setAudioMime] = useState<string>('audio/mp3');
  const [transcript, setTranscript] = useState<string | null>(null);
  const [transcribeLoading, setTranscribeLoading] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  // Desktop Wallpaper Studio
  const [customWallpaperPreview, setCustomWallpaperPreview] = useState<string | null>(null);

  const handleGenerateSpeech = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ttsText.trim() || ttsLoading) return;
    onHaptic('tap');
    setTtsLoading(true);
    setTtsError(null);

    try {
      const res = await fetch('/api/gemini/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: ttsText.trim(),
          voiceName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Voice readout failed.');
      }
      setTtsAudioUrl(data.audioUrl);
      onHaptic('success');
    } catch (err) {
      setTtsError(err instanceof Error ? err.message : 'Unable to generate speech.');
      onHaptic('alert');
    } finally {
      setTtsLoading(false);
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTranscribeError(null);
    setTranscript(null);
    setAudioFileName(file.name);
    setAudioMime(file.type || 'audio/mp3');

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const commaIdx = dataUrl.indexOf(',');
      setAudioBase64(commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleTranscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioBase64 || transcribeLoading) {
      setTranscribeError('Please choose an audio clip first.');
      return;
    }
    onHaptic('tap');
    setTranscribeLoading(true);
    setTranscribeError(null);

    try {
      const res = await fetch('/api/gemini/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          mimeType: audioMime,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Audio transcription failed.');
      }
      setTranscript(data.text || '(No speech detected)');
      onHaptic('success');
    } catch (err) {
      setTranscribeError(err instanceof Error ? err.message : 'Unable to transcribe audio.');
      onHaptic('alert');
    } finally {
      setTranscribeLoading(false);
    }
  };

  const handleUploadWallpaper = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setCustomWallpaperPreview(dataUrl);
      onApplyWallpaper(dataUrl);
      onHaptic('success');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#14161b] border border-white/[0.05]">
          <button
            type="button"
            onClick={() => {
              onHaptic('tap');
              setStudioTab('tts');
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              studioTab === 'tts'
                ? 'bg-[#232734] text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Voice Readout (TTS)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onHaptic('tap');
              setStudioTab('transcribe');
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              studioTab === 'transcribe'
                ? 'bg-[#232734] text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Transcribe Audio</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onHaptic('tap');
              setStudioTab('wallpaper');
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              studioTab === 'wallpaper'
                ? 'bg-[#232734] text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Desktop Wallpaper</span>
          </button>
        </div>

        <span className="text-[11px] text-zinc-400">
          {studioTab === 'tts'
            ? 'Gemini 3.8 Flash Lite TTS · WAV audio'
            : studioTab === 'transcribe'
              ? 'Gemini 3.5 Transcribe · Speech to text'
              : 'Curated & local Windows wallpapers'}
        </span>
      </div>

      {studioTab === 'tts' && (
        <form onSubmit={handleGenerateSpeech} className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div className="space-y-2.5">
            <textarea
              rows={4}
              value={ttsText}
              onChange={(e) => setTtsText(e.target.value)}
              placeholder="Paste an alert, note, or clipboard snippet to read aloud…"
              aria-label="Text to read aloud"
              className="w-full px-3 py-2.5 rounded-xl bg-[#14161b] border border-white/10 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#8ba3ff] resize-none"
            />

            <div className="flex items-center gap-2">
              <select
                aria-label="Voice persona"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                className="flex-1 px-2.5 py-2 rounded-xl bg-[#14161b] border border-white/10 text-xs text-zinc-200"
              >
                {VOICE_OPTIONS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                disabled={ttsLoading || !ttsText.trim()}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#8ba3ff] hover:bg-[#9eb2ff] disabled:opacity-40 text-[#080a10] text-xs font-semibold transition-colors whitespace-nowrap"
              >
                {ttsLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing…</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Speak Text</span>
                  </>
                )}
              </button>
            </div>

            {ttsError && (
              <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl p-2.5">
                {ttsError}
              </p>
            )}
          </div>

          <div className="rounded-2xl bg-[#111319] border border-white/[0.06] p-4 flex flex-col justify-between min-h-[210px]">
            {ttsAudioUrl ? (
              <div className="space-y-3 my-auto">
                <p className="text-xs font-semibold text-zinc-200">
                  Generated Voice Clip · {voiceName}
                </p>
                <audio controls autoPlay src={ttsAudioUrl} className="w-full" />
                <div className="flex justify-end">
                  <a
                    href={ttsAudioUrl}
                    download={`winland-voice-${voiceName.toLowerCase()}.wav`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Save WAV</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <Volume2 className="w-6 h-6 text-zinc-600 mb-2" />
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Synthesize crisp 24kHz WAV voice readouts for notifications, articles, or clipboard notes directly from WinLand.
                </p>
              </div>
            )}
          </div>
        </form>
      )}

      {studioTab === 'transcribe' && (
        <form onSubmit={handleTranscribe} className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div className="space-y-2.5">
            <label className="flex flex-col items-center justify-center h-[145px] rounded-2xl border border-dashed border-white/15 bg-[#111319] hover:bg-[#161922] cursor-pointer transition-colors text-center px-4">
              <Upload className="w-5 h-5 text-zinc-400 mb-2" />
              <p className="text-xs font-medium text-zinc-200">
                {audioFileName ? audioFileName : 'Upload audio clip to transcribe'}
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                MP3, WAV, M4A, or WebM · Powered by Gemini 3.5 Transcribe
              </p>
              <input
                type="file"
                accept="audio/*"
                onChange={handleAudioUpload}
                className="sr-only"
                aria-label="Upload audio clip for transcription"
              />
            </label>

            <button
              type="submit"
              disabled={transcribeLoading || !audioBase64}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#8ba3ff] hover:bg-[#9eb2ff] disabled:opacity-40 text-[#080a10] text-xs font-semibold transition-colors"
            >
              {transcribeLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Transcribing audio…</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5" />
                  <span>Transcribe Clip</span>
                </>
              )}
            </button>

            {transcribeError && (
              <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl p-2.5">
                {transcribeError}
              </p>
            )}
          </div>

          <div className="rounded-2xl bg-[#111319] border border-white/[0.06] p-3.5 min-h-[210px] max-h-[235px] overflow-y-auto island-scroll flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-zinc-200">Transcript</span>
                {transcript && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(transcript).catch(() => {});
                      setCopiedTranscript(true);
                      window.setTimeout(() => setCopiedTranscript(false), 1500);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white"
                  >
                    {copiedTranscript ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedTranscript ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>
              {transcript ? (
                <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
                  {transcript}
                </p>
              ) : (
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Drop a meeting memo, voice note, or audio file to generate a clean text transcript.
                </p>
              )}
            </div>
          </div>
        </form>
      )}

      {studioTab === 'wallpaper' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {CURATED_WALLPAPERS.map((wp) => (
              <button
                key={wp.id}
                type="button"
                onClick={() => {
                  onHaptic('success');
                  onApplyWallpaper(wp.url);
                }}
                className="group rounded-xl overflow-hidden bg-[#111319] border border-white/10 hover:border-[#8ba3ff]/60 transition-colors text-left"
              >
                <div className="h-24 w-full overflow-hidden bg-black">
                  <img
                    src={wp.url}
                    alt={wp.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <p className="px-2.5 py-1.5 text-[11px] font-medium text-zinc-200 truncate">
                  {wp.label}
                </p>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#111319] border border-white/[0.06] px-3.5 py-2.5">
            <div className="flex items-center gap-2.5">
              {customWallpaperPreview && (
                <img
                  src={customWallpaperPreview}
                  alt="Custom uploaded wallpaper"
                  className="w-8 h-8 rounded-lg object-cover border border-white/10"
                />
              )}
              <p className="text-xs text-zinc-300">
                Apply any local photo or wallpaper directly to your Windows desktop canvas.
              </p>
            </div>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1e222c] hover:bg-[#272c3a] border border-white/10 text-xs font-medium text-zinc-200 cursor-pointer transition-colors whitespace-nowrap">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Local Wallpaper</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadWallpaper}
                className="sr-only"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
