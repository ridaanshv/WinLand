import React, { useState } from 'react';
import {
  Blocks,
  Plus,
  Trash2,
  Code2,
  Check,
  Copy,
  Vibrate,
} from 'lucide-react';
import type { WidgetPlugin } from '../types/island';
import { createPluginFromDraft, validatePluginDraft } from '../utils/islandLogic';

interface PluginsLayoutPanelProps {
  plugins: WidgetPlugin[];
  onTogglePlugin: (id: string) => void;
  onAddPlugin: (plugin: WidgetPlugin) => void;
  onDeletePlugin: (id: string) => void;
  onTriggerPluginAction: (plugin: WidgetPlugin) => void;
  hapticsEnabled: boolean;
  onToggleHaptics: () => void;
  onHaptic: (style?: 'tap' | 'toggle' | 'success' | 'alert') => void;
}

const RN_BRIDGE_SNIPPET = `// WinLand Cross-Platform React Native Plugin Bridge (Windows / iOS / Android)
import { NativeModules, Platform } from 'react-native';

export interface WinLandWidgetManifest {
  id: string;
  slot: 'pill-right' | 'expanded-bar' | 'tray';
  renderMetric: () => { label: string; value: string; accent: string };
  onPress?: () => Promise<void>;
}

export function registerWinLandWidget(manifest: WinLandWidgetManifest) {
  const host = NativeModules.WinLandIslandHost;
  if (Platform.OS === 'windows') {
    host?.mountAcrylicWidget(manifest.id, manifest.slot);
  }
  return host?.registerSharedWidget(manifest);
}`;

export const PluginsLayoutPanel: React.FC<PluginsLayoutPanelProps> = ({
  plugins,
  onTogglePlugin,
  onAddPlugin,
  onDeletePlugin,
  onTriggerPluginAction,
  hapticsEnabled,
  onToggleHaptics,
  onHaptic,
}) => {
  const [subView, setSubView] = useState<'installed' | 'builder' | 'rn-sdk'>('installed');
  const [name, setName] = useState('');
  const [author, setAuthor] = useState('');
  const [metricLabel, setMetricLabel] = useState('Build');
  const [metricValue, setMetricValue] = useState('v2.4 Green');
  const [slot, setSlot] = useState<WidgetPlugin['slot']>('pill-right');
  const [accentColor, setAccentColor] = useState('#34d399');
  const [description, setDescription] = useState('');
  const [builderError, setBuilderError] = useState<string | null>(null);
  const [copiedSdk, setCopiedSdk] = useState(false);

  const handleRegisterPlugin = (e: React.FormEvent) => {
    e.preventDefault();
    const draft = { name, author, metricLabel, metricValue, slot, accentColor, description };
    const validation = validatePluginDraft(draft);
    if (!validation.valid) {
      setBuilderError(validation.error || 'Invalid plugin fields.');
      onHaptic('alert');
      return;
    }

    setBuilderError(null);
    const created = createPluginFromDraft(draft);
    onAddPlugin(created);
    onHaptic('success');
    setName('');
    setAuthor('');
    setDescription('');
    setSubView('installed');
  };

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#14161b] border border-white/[0.05]">
          <button
            type="button"
            onClick={() => {
              onHaptic('tap');
              setSubView('installed');
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              subView === 'installed' ? 'bg-[#232734] text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Blocks className="w-3.5 h-3.5" />
            <span>Widget Plugins ({plugins.filter((p) => p.enabled).length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onHaptic('tap');
              setSubView('builder');
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              subView === 'builder' ? 'bg-[#232734] text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Plugin</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onHaptic('tap');
              setSubView('rn-sdk');
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              subView === 'rn-sdk' ? 'bg-[#232734] text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>React Native SDK</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleHaptics}
          aria-pressed={hapticsEnabled}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${
            hapticsEnabled
              ? 'bg-[#0e241e] text-emerald-300 border border-emerald-400/25'
              : 'bg-[#14161b] text-zinc-400 border border-white/[0.06]'
          }`}
        >
          <Vibrate className="w-3.5 h-3.5" />
          <span>Haptics {hapticsEnabled ? 'On' : 'Off'}</span>
        </button>
      </div>

      {subView === 'installed' && (
        <div className="max-h-[310px] overflow-y-auto island-scroll grid grid-cols-1 sm:grid-cols-2 gap-2.5 pr-0.5">
          {plugins.map((plugin) => (
            <div
              key={plugin.id}
              className="rounded-2xl bg-[#13151b] border border-white/[0.06] p-3 flex flex-col justify-between gap-2"
            >
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-white">{plugin.name}</p>
                    <p className="text-[11px] text-zinc-400">
                      {plugin.author} · v{plugin.version} · {plugin.slot}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onHaptic('toggle');
                      onTogglePlugin(plugin.id);
                    }}
                    aria-pressed={plugin.enabled}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                      plugin.enabled
                        ? 'bg-[#0e241e] text-emerald-300 border border-emerald-400/25'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {plugin.enabled ? 'Active' : 'Off'}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">{plugin.description}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
                <div className="text-[11px]">
                  <span className="text-zinc-400">{plugin.metricLabel}: </span>
                  <span
                    className="font-mono-tabular font-semibold"
                    style={{ color: plugin.accentColor }}
                  >
                    {plugin.metricValue}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onHaptic('tap');
                      onTriggerPluginAction(plugin);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#1d202a] hover:bg-[#262b38] text-[11px] text-zinc-200 transition-colors"
                  >
                    {plugin.actionLabel}
                  </button>
                  {plugin.custom && (
                    <button
                      type="button"
                      onClick={() => {
                        onHaptic('tap');
                        onDeletePlugin(plugin.id);
                      }}
                      className="p-1 rounded-lg text-zinc-500 hover:text-red-300 hover:bg-red-500/10"
                      aria-label={`Remove plugin ${plugin.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {subView === 'builder' && (
        <form
          onSubmit={handleRegisterPlugin}
          className="rounded-2xl bg-[#12141a] border border-white/[0.06] p-4 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1 block">
              <span className="text-[11px] text-zinc-400">Plugin Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Docker Container Watch"
                className="w-full px-3 py-2 rounded-xl bg-[#0c0e13] border border-white/10 text-xs text-zinc-100"
              />
            </label>
            <label className="space-y-1 block">
              <span className="text-[11px] text-zinc-400">Author / Studio</span>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Acme DevTools"
                className="w-full px-3 py-2 rounded-xl bg-[#0c0e13] border border-white/10 text-xs text-zinc-100"
              />
            </label>
            <label className="space-y-1 block">
              <span className="text-[11px] text-zinc-400">Metric Label</span>
              <input
                type="text"
                value={metricLabel}
                onChange={(e) => setMetricLabel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0c0e13] border border-white/10 text-xs text-zinc-100"
              />
            </label>
            <label className="space-y-1 block">
              <span className="text-[11px] text-zinc-400">Live Value</span>
              <input
                type="text"
                value={metricValue}
                onChange={(e) => setMetricValue(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0c0e13] border border-white/10 text-xs font-mono-tabular text-zinc-100"
              />
            </label>
            <label className="space-y-1 block">
              <span className="text-[11px] text-zinc-400">Island Mount Slot</span>
              <select
                value={slot}
                onChange={(e) => setSlot(e.target.value as WidgetPlugin['slot'])}
                className="w-full px-3 py-2 rounded-xl bg-[#0c0e13] border border-white/10 text-xs text-zinc-100"
              >
                <option value="pill-right">Compact Pill Right</option>
                <option value="expanded-bar">Expanded Header Bar</option>
                <option value="tray">System Tray Slot</option>
              </select>
            </label>
            <label className="space-y-1 block">
              <span className="text-[11px] text-zinc-400">Accent Hex</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-9 h-9 rounded-lg bg-transparent border border-white/10 cursor-pointer"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-[#0c0e13] border border-white/10 text-xs font-mono-tabular text-zinc-100"
                />
              </div>
            </label>
          </div>

          <label className="space-y-1 block">
            <span className="text-[11px] text-zinc-400">Description</span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short summary of what this widget exposes in the Dynamic Island…"
              className="w-full px-3 py-2 rounded-xl bg-[#0c0e13] border border-white/10 text-xs text-zinc-100"
            />
          </label>

          {builderError && <p className="text-xs text-red-300">{builderError}</p>}

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8ba3ff] hover:bg-[#9eb2ff] text-[#080a10] text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Mount Widget Live</span>
            </button>
          </div>
        </form>
      )}

      {subView === 'rn-sdk' && (
        <div className="rounded-2xl bg-[#111319] border border-white/[0.06] p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-white">
                React Native Cross-Platform Host Bridge
              </p>
              <p className="text-[11px] text-zinc-400">
                Shared Fabric + Hermes widget API for react-native-windows, iOS, and Android
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onHaptic('success');
                navigator.clipboard?.writeText(RN_BRIDGE_SNIPPET).catch(() => {});
                setCopiedSdk(true);
                window.setTimeout(() => setCopiedSdk(false), 1500);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200"
            >
              {copiedSdk ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSdk ? 'Copied' : 'Copy Bridge'}</span>
            </button>
          </div>
          <pre className="p-3 rounded-xl bg-[#090b0f] border border-white/[0.05] text-[11px] font-mono-tabular text-zinc-300 overflow-x-auto leading-relaxed">
            {RN_BRIDGE_SNIPPET}
          </pre>
        </div>
      )}
    </div>
  );
};
