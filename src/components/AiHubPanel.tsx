import React, { useEffect, useRef, useState } from 'react';
import {
  Send,
  Search,
  MapPin,
  Image as ImageIcon,
  Upload,
  MessageSquarePlus,
  ExternalLink,
  Loader2,
  Sparkles,
} from 'lucide-react';
import type { ChatMessage, CopilotRoleId } from '../types/island';

interface AiHubPanelProps {
  messages: ChatMessage[];
  onMessagesChange: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onNewConversation: () => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  selectedRole: CopilotRoleId;
  onSelectRole: (role: CopilotRoleId) => void;
  useSearchGrounding: boolean;
  onToggleSearchGrounding: () => void;
  useMapsGrounding: boolean;
  onToggleMapsGrounding: () => void;
  chatInput: string;
  onChatInputChange: (val: string) => void;
  externalPrompt?: string | null;
  onClearExternalPrompt?: () => void;
  userCoords: { lat: number; lng: number };
  onHaptic: (style?: 'tap' | 'toggle' | 'success' | 'alert') => void;
}

const CHAT_MODELS = [
  { id: 'gemini-4-hydrogen', label: 'Gemini 4 Hydrogen' },
  { id: 'gemini-3.1-flash-lite', label: 'Flash Lite' },
] as const;

export const COPILOT_ROLES: Record<
  CopilotRoleId,
  { label: string; systemInstruction: string }
> = {
  assistant: {
    label: 'Windows Copilot',
    systemInstruction:
      'You are WinLand Copilot, a concise, high-precision Windows desktop assistant embedded in a Dynamic Island. Keep answers structured, crisp, and directly actionable.',
  },
  architect: {
    label: 'Code Architect',
    systemInstruction:
      'You are a senior software architect assisting a power user on Windows. Give clean, idiomatic TypeScript/React/Windows engineering guidance with minimal boilerplate.',
  },
  debugger: {
    label: 'System Debugger',
    systemInstruction:
      'You are a systems performance and debugging specialist. Diagnose root causes systematically, cite exact commands or diagnostics, and suggest safe fixes.',
  },
  writer: {
    label: 'Concise Editor',
    systemInstruction:
      'You are a sharp technical editor and writer. Rewrite, summarize, or draft clear, polished text with zero fluff.',
  },
};

export const AiHubPanel: React.FC<AiHubPanelProps> = ({
  messages,
  onMessagesChange,
  onNewConversation,
  selectedModel,
  onSelectModel,
  selectedRole,
  onSelectRole,
  useSearchGrounding,
  onToggleSearchGrounding,
  useMapsGrounding,
  onToggleMapsGrounding,
  chatInput,
  onChatInputChange,
  externalPrompt,
  onClearExternalPrompt,
  userCoords,
  onHaptic,
}) => {
  const [subMode, setSubMode] = useState<'chat' | 'vision'>('chat');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Image analysis state (gemini-4-hydrogen)
  const [visionFilePreview, setVisionFilePreview] = useState<string | null>(null);
  const [visionBase64, setVisionBase64] = useState<string | null>(null);
  const [visionMime, setVisionMime] = useState<string>('image/png');
  const [visionPrompt, setVisionPrompt] = useState(
    'Describe what is shown in this image, extract any visible text, and highlight key technical details.'
  );
  const [visionResult, setVisionResult] = useState<string | null>(null);
  const [visionLoading, setVisionLoading] = useState(false);
  const [visionError, setVisionError] = useState<string | null>(null);

  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (externalPrompt) {
      setSubMode('chat');
      onChatInputChange(externalPrompt);
      onClearExternalPrompt?.();
    }
  }, [externalPrompt, onClearExternalPrompt, onChatInputChange]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed || chatLoading) return;

    onHaptic('tap');
    setChatError(null);
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };
    const nextHistory = [...messages, userMsg];
    onMessagesChange(nextHistory);
    onChatInputChange('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextHistory.map((m) => ({ role: m.role, text: m.text })),
          model: selectedModel,
          useSearchGrounding,
          useMapsGrounding,
          location: useMapsGrounding ? userCoords : undefined,
          systemInstruction: COPILOT_ROLES[selectedRole].systemInstruction,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gemini request failed.');
      }

      onMessagesChange((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`,
          role: 'model',
          text: data.text || '(No text returned)',
          model: data.model,
          groundingChunks: data.groundingChunks ?? [],
        },
      ]);
      onHaptic('success');
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Unable to reach Gemini API.');
      onHaptic('alert');
    } finally {
      setChatLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVisionError(null);
    setVisionResult(null);
    setVisionMime(file.type || 'image/png');

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setVisionFilePreview(dataUrl);
      const commaIdx = dataUrl.indexOf(',');
      setVisionBase64(commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visionBase64 || visionLoading) {
      setVisionError('Please upload an image first.');
      return;
    }

    onHaptic('tap');
    setVisionLoading(true);
    setVisionError(null);
    setVisionResult(null);

    try {
      const res = await fetch('/api/gemini/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: visionBase64,
          mimeType: visionMime,
          prompt: visionPrompt,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Image analysis failed.');
      }
      setVisionResult(data.text || 'No analysis text returned.');
      onHaptic('success');
    } catch (err) {
      setVisionError(err instanceof Error ? err.message : 'Unable to analyze image.');
      onHaptic('alert');
    } finally {
      setVisionLoading(false);
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Sub-mode switcher + model/role controls + explicit New Convo button */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#14161b] border border-white/[0.05]">
          <button
            type="button"
            onClick={() => {
              onHaptic('tap');
              setSubMode('chat');
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              subMode === 'chat'
                ? 'bg-[#232734] text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Copilot Chat</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onHaptic('tap');
              setSubMode('vision');
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              subMode === 'vision'
                ? 'bg-[#232734] text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Analyze Image</span>
          </button>
        </div>

        {subMode === 'chat' && (
          <div className="flex flex-wrap items-center gap-1.5">
            <select
              aria-label="Select Copilot role"
              value={selectedRole}
              onChange={(e) => onSelectRole(e.target.value as CopilotRoleId)}
              className="px-2.5 py-1.5 rounded-lg bg-[#14161b] border border-white/10 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#8ba3ff]"
            >
              {(Object.keys(COPILOT_ROLES) as CopilotRoleId[]).map((roleId) => (
                <option key={roleId} value={roleId}>
                  {COPILOT_ROLES[roleId].label}
                </option>
              ))}
            </select>

            <select
              aria-label="Select Gemini model"
              value={useSearchGrounding || useMapsGrounding ? 'gemini-4-hydrogen' : selectedModel}
              disabled={useSearchGrounding || useMapsGrounding}
              onChange={(e) => onSelectModel(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-[#14161b] border border-white/10 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#8ba3ff]"
            >
              {CHAT_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                onHaptic('toggle');
                onToggleSearchGrounding();
              }}
              aria-pressed={useSearchGrounding}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                useSearchGrounding
                  ? 'bg-[#0e241e] text-emerald-300 border border-emerald-400/25'
                  : 'bg-[#14161b] text-zinc-400 hover:text-zinc-200 border border-white/[0.06]'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onHaptic('toggle');
                onToggleMapsGrounding();
              }}
              aria-pressed={useMapsGrounding}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                useMapsGrounding
                  ? 'bg-[#0e241e] text-emerald-300 border border-emerald-400/25'
                  : 'bg-[#14161b] text-zinc-400 hover:text-zinc-200 border border-white/[0.06]'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Maps</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onHaptic('tap');
                setChatError(null);
                onNewConversation();
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1b1f2a] hover:bg-[#252b3b] border border-white/10 text-xs font-medium text-zinc-200 transition-colors whitespace-nowrap"
              aria-label="Start new conversation"
            >
              <MessageSquarePlus className="w-3.5 h-3.5 text-[#8ba3ff]" />
              <span>New Convo</span>
            </button>
          </div>
        )}
      </div>

      {subMode === 'chat' ? (
        <div className="space-y-3">
          <div
            className="h-[250px] overflow-y-auto island-scroll rounded-2xl bg-[#111319] border border-white/[0.05] p-3.5 space-y-3"
            data-testid="ai-chat-thread"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-[#8ba3ff] text-[#080a10] font-medium'
                      : 'bg-[#181b23] text-zinc-200 border border-white/[0.05]'
                  }`}
                >
                  {msg.text}

                  {/* Grounding sources (Search & Maps URLs + review snippets) */}
                  {msg.groundingChunks && msg.groundingChunks.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-white/10 space-y-1.5">
                      <p className="text-[11px] font-medium text-zinc-400">Verified Sources</p>
                      <ul className="space-y-1">
                        {msg.groundingChunks.map((chunk, idx) => {
                          if (chunk.web?.uri) {
                            return (
                              <li key={idx}>
                                <a
                                  href={chunk.web.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-[#8ba3ff] hover:underline"
                                >
                                  <ExternalLink className="w-3 h-3 shrink-0" />
                                  <span className="truncate max-w-[340px]">
                                    {chunk.web.title || chunk.web.uri}
                                  </span>
                                </a>
                              </li>
                            );
                          }
                          if (chunk.maps?.uri) {
                            return (
                              <li key={idx} className="space-y-0.5">
                                <a
                                  href={chunk.maps.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-emerald-300 hover:underline"
                                >
                                  <MapPin className="w-3 h-3 shrink-0" />
                                  <span>{chunk.maps.title || 'Open in Google Maps'}</span>
                                </a>
                                {chunk.maps.placeAnswerSources?.reviewSnippets?.map(
                                  (rev, rIdx) =>
                                    rev.uri && (
                                      <div key={rIdx} className="pl-4">
                                        <a
                                          href={rev.uri}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[11px] text-zinc-400 hover:text-zinc-200 underline"
                                        >
                                          Review source
                                        </a>
                                      </div>
                                    )
                                )}
                              </li>
                            );
                          }
                          return null;
                        })}
                      </ul>
                    </div>
                  )}
                </div>
                {msg.model && (
                  <span className="mt-1 text-[10px] text-zinc-500 px-1">{msg.model}</span>
                )}
              </div>
            ))}

            {chatLoading && (
              <div className="flex items-center gap-2 text-xs text-zinc-400 px-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8ba3ff]" />
                <span>
                  {useMapsGrounding
                    ? 'Querying Google Maps grounding…'
                    : useSearchGrounding
                      ? 'Searching live web sources…'
                      : 'Thinking with Gemini…'}
                </span>
              </div>
            )}
            <div ref={threadEndRef} />
          </div>

          {chatError && (
            <div className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-300">
              {chatError}
            </div>
          )}

          <form onSubmit={handleSendChat} className="flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => onChatInputChange(e.target.value)}
              placeholder={
                useMapsGrounding
                  ? 'Ask about nearby coffee shops, landmarks, or routes…'
                  : useSearchGrounding
                    ? 'Ask about current news, docs, or live benchmarks…'
                    : 'Ask WinLand Copilot anything…'
              }
              aria-label="Message WinLand Copilot"
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#14161b] border border-white/10 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#8ba3ff]"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#8ba3ff] hover:bg-[#9eb2ff] disabled:opacity-40 text-[#080a10] text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      ) : (
        /* Analyze Image with gemini-4-hydrogen */
        <form onSubmit={handleAnalyzeImage} className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div className="space-y-2.5">
            <label className="flex flex-col items-center justify-center h-[168px] rounded-2xl border border-dashed border-white/15 bg-[#111319] hover:bg-[#161922] cursor-pointer overflow-hidden transition-colors relative">
              {visionFilePreview ? (
                <img
                  src={visionFilePreview}
                  alt="Uploaded preview for analysis"
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <div className="text-center px-4">
                  <Upload className="w-5 h-5 text-zinc-400 mx-auto mb-2" />
                  <p className="text-xs font-medium text-zinc-200">Upload image to analyze</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    PNG, JPG, or WebP · Analyzed by Gemini 4 Hydrogen
                  </p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="sr-only"
                aria-label="Upload image for Gemini 4 Hydrogen analysis"
              />
            </label>

            <textarea
              rows={2}
              value={visionPrompt}
              onChange={(e) => setVisionPrompt(e.target.value)}
              aria-label="Image analysis prompt"
              className="w-full px-3 py-2 rounded-xl bg-[#14161b] border border-white/10 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#8ba3ff] resize-none"
            />

            <button
              type="submit"
              disabled={visionLoading || !visionBase64}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#8ba3ff] hover:bg-[#9eb2ff] disabled:opacity-40 text-[#080a10] text-xs font-semibold transition-colors"
            >
              {visionLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing with Gemini 4 Hydrogen…</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Analyze Image</span>
                </>
              )}
            </button>
          </div>

          <div className="rounded-2xl bg-[#111319] border border-white/[0.06] p-3.5 h-[282px] overflow-y-auto island-scroll">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-zinc-200">Vision Output</span>
              <span className="text-[11px] text-zinc-500">gemini-4-hydrogen</span>
            </div>
            {visionError && (
              <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl p-2.5">
                {visionError}
              </p>
            )}
            {!visionError && !visionResult && !visionLoading && (
              <p className="text-xs text-zinc-500 leading-relaxed">
                Upload a screenshot, UI mockup, diagram, or photograph to inspect objects, extract text, or debug visual layouts directly from your Dynamic Island.
              </p>
            )}
            {visionResult && (
              <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
                {visionResult}
              </p>
            )}
          </div>
        </form>
      )}
    </div>
  );
};
