import React, { useMemo, useState } from 'react';
import {
  Copy,
  Check,
  Pin,
  Trash2,
  Search,
  Smartphone,
  Monitor,
  Sparkles,
  Plus,
  RefreshCw,
} from 'lucide-react';
import type { ClipboardItem } from '../types/island';
import { filterClipboardItems } from '../utils/islandLogic';

interface ClipboardPanelProps {
  items: ClipboardItem[];
  onAddItem: (content: string, device?: string, platform?: ClipboardItem['platform']) => Promise<void>;
  onTogglePin: (id: string, pinned: boolean) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onAskAi: (prompt: string) => void;
  onHaptic: (style?: 'tap' | 'toggle' | 'success' | 'alert') => void;
}

export const ClipboardPanel: React.FC<ClipboardPanelProps> = ({
  items,
  onAddItem,
  onTogglePin,
  onDeleteItem,
  onAskAi,
  onHaptic,
}) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | 'text' | 'code' | 'link' | 'pinned'>('all');
  const [draft, setDraft] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [syncDevice, setSyncDevice] = useState<'windows' | 'ios' | 'android'>('windows');
  const [formError, setFormError] = useState<string | null>(null);

  const filtered = useMemo(
    () => filterClipboardItems(items, query, category),
    [items, query, category]
  );

  const handleCopy = async (item: ClipboardItem) => {
    onHaptic('success');
    try {
      await navigator.clipboard.writeText(item.content);
    } catch {
      // Clipboard API may require focus; still confirm visually
    }
    setCopiedId(item.id);
    window.setTimeout(() => setCopiedId((prev) => (prev === item.id ? null : prev)), 1500);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) {
      setFormError('Enter text, code, or a URL to sync across devices.');
      return;
    }
    setFormError(null);
    onHaptic('success');
    const deviceLabels = {
      windows: 'Workstation · Windows 11',
      ios: 'iPhone 16 Pro · iOS',
      android: 'Pixel 9 Pro · Android',
    };
    await onAddItem(draft.trim(), deviceLabels[syncDevice], syncDevice);
    setDraft('');
  };

  return (
    <div className="space-y-3.5">
      {/* Add / Cross-device sync form */}
      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (formError) setFormError(null);
          }}
          placeholder="Add snippet, code, or URL to cross-device clipboard…"
          aria-label="New synced clipboard snippet"
          className="flex-1 px-3.5 py-2 rounded-xl bg-[#14161b] border border-white/10 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#8ba3ff]"
        />
        <select
          aria-label="Source device for clipboard sync"
          value={syncDevice}
          onChange={(e) => setSyncDevice(e.target.value as 'windows' | 'ios' | 'android')}
          className="px-2.5 py-2 rounded-xl bg-[#14161b] border border-white/10 text-xs text-zinc-200"
        >
          <option value="windows">Windows 11</option>
          <option value="ios">iPhone · iOS</option>
          <option value="android">Pixel · Android</option>
        </select>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#8ba3ff] hover:bg-[#9eb2ff] text-[#080a10] text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Sync Copy</span>
        </button>
      </form>

      {formError && <p className="text-xs text-amber-300">{formError}</p>}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter copy history or device…"
            aria-label="Filter clipboard history"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#12141a] border border-white/[0.06] text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#8ba3ff]"
          />
        </div>

        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#14161b] border border-white/[0.05]">
          {(['all', 'pinned', 'code', 'link', 'text'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                onHaptic('tap');
                setCategory(cat);
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize transition-colors whitespace-nowrap ${
                category === cat ? 'bg-[#252a38] text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Synced History List */}
      <div className="h-[235px] overflow-y-auto island-scroll space-y-2 pr-0.5">
        {filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-[#111319] border border-white/[0.05]">
            <RefreshCw className="w-5 h-5 text-zinc-600 mb-2" />
            <p className="text-xs font-medium text-zinc-300">No matching clipboard entries</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Sync a new snippet above or clear your active filter.
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-xl bg-[#13151b] hover:bg-[#181b23] border border-white/[0.05] p-3 transition-colors flex items-start justify-between gap-3"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <p
                  className={`text-xs text-zinc-100 break-words leading-relaxed ${
                    item.category === 'code' ? 'font-mono-tabular text-[11px]' : ''
                  }`}
                >
                  {item.content}
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                  {item.platform === 'windows' || item.platform === 'macos' ? (
                    <Monitor className="w-3 h-3 text-zinc-500" />
                  ) : (
                    <Smartphone className="w-3 h-3 text-zinc-500" />
                  )}
                  <span>{item.device}</span>
                  <span aria-hidden="true">·</span>
                  <span className="capitalize">{item.category}</span>
                  {item.pinned && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-400">Pinned</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(item)}
                  className="p-1.5 rounded-lg bg-[#1d202a] hover:bg-[#272b38] text-zinc-200 transition-colors"
                  aria-label={`Copy "${item.content.slice(0, 24)}"`}
                >
                  {copiedId === item.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onHaptic('tap');
                    onAskAi(`Explain or improve this clipboard snippet:\n\n${item.content}`);
                  }}
                  className="p-1.5 rounded-lg bg-[#1d202a] hover:bg-[#272b38] text-[#8ba3ff] transition-colors"
                  aria-label={`Ask AI about "${item.content.slice(0, 24)}"`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onHaptic('toggle');
                    void onTogglePin(item.id, !item.pinned);
                  }}
                  className={`p-1.5 rounded-lg transition-colors ${
                    item.pinned
                      ? 'bg-[#0e241e] text-emerald-400'
                      : 'bg-[#1d202a] hover:bg-[#272b38] text-zinc-400 hover:text-zinc-200'
                  }`}
                  aria-label={item.pinned ? 'Unpin snippet' : 'Pin snippet'}
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onHaptic('tap');
                    void onDeleteItem(item.id);
                  }}
                  className="p-1.5 rounded-lg bg-[#1d202a] hover:bg-red-500/20 text-zinc-400 hover:text-red-300 transition-colors"
                  aria-label={`Delete clipboard item "${item.content.slice(0, 24)}"`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
