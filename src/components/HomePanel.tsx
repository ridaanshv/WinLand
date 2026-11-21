import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Timer,
  Cpu,
  ClipboardList,
  Copy,
  Check,
  Bell,
  Sliders,
  Sparkles,
  Search,
  CloudSun,
  Blocks,
  ArrowUpRight,
} from 'lucide-react';
import type {
  ClipboardItem,
  HardwareTelemetry,
  IslandTab,
  ReminderItem,
  Track,
  WidgetPlugin,
} from '../types/island';
import { calculateTaskProgress, formatDuration } from '../utils/islandLogic';

interface HomePanelProps {
  activeTrack: Track;
  isPlaying: boolean;
  trackProgressSec: number;
  onTogglePlay: () => void;
  onPrevTrack: () => void;
  onNextTrack: () => void;
  timerSecondsLeft: number;
  timerRunning: boolean;
  timerLabel: string;
  onStartPauseTimer: () => void;
  reminders: ReminderItem[];
  isGoogleConnected: boolean;
  googleTaskListTitle: string;
  telemetry: HardwareTelemetry;
  latestClipboardItem?: ClipboardItem;
  unreadNotificationsCount: number;
  activePlugins: WidgetPlugin[];
  onNavigateTab: (tab: IslandTab) => void;
  onHaptic: (style?: 'tap' | 'toggle' | 'success' | 'alert') => void;
}

export const HomePanel: React.FC<HomePanelProps> = ({
  activeTrack,
  isPlaying,
  trackProgressSec,
  onTogglePlay,
  onPrevTrack,
  onNextTrack,
  timerSecondsLeft,
  timerRunning,
  timerLabel,
  onStartPauseTimer,
  reminders,
  isGoogleConnected,
  googleTaskListTitle,
  telemetry,
  latestClipboardItem,
  unreadNotificationsCount,
  activePlugins,
  onNavigateTab,
  onHaptic,
}) => {
  const [copiedLatest, setCopiedLatest] = useState(false);
  const taskProgress = calculateTaskProgress(reminders, isGoogleConnected);
  const trackPct = Math.min(100, Math.round((trackProgressSec / Math.max(1, activeTrack.durationSec)) * 100));

  return (
    <div className="space-y-3">
      {/* Primary Glance Row: Now Playing + Timer & Task Progress */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Now Playing Mini-Deck */}
        <div className="md:col-span-6 rounded-2xl bg-[#12141a] border border-white/[0.06] p-3.5 flex flex-col justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={activeTrack.coverUrl}
              alt={`${activeTrack.title} cover`}
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-xl object-cover shrink-0 border border-white/10"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-zinc-400">Now Playing</p>
              <p className="text-sm font-semibold text-white truncate">{activeTrack.title}</p>
              <p className="text-xs text-zinc-400 truncate">{activeTrack.artist}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={onPrevTrack}
                aria-label="Previous track"
                className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onTogglePlay}
                aria-label={isPlaying ? 'Pause music' : 'Play music'}
                className="w-8 h-8 rounded-full bg-white text-black hover:bg-zinc-200 flex items-center justify-center transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                )}
              </button>
              <button
                type="button"
                onClick={onNextTrack}
                aria-label="Next track"
                className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <div className="h-1.5 w-full rounded-full bg-[#222633] overflow-hidden">
              <div
                className="h-full bg-[#34d399] rounded-full transition-all duration-300"
                style={{ width: `${trackPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono-tabular text-zinc-500">
              <span>{formatDuration(trackProgressSec)}</span>
              <span>{formatDuration(activeTrack.durationSec)}</span>
            </div>
          </div>
        </div>

        {/* Live Timer + Google Tasks Progress Glance */}
        <div className="md:col-span-6 rounded-2xl bg-[#12141a] border border-white/[0.06] p-3.5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#1a1f2c] flex items-center justify-center text-[#8ba3ff]">
                <Timer className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-zinc-400">{timerLabel}</p>
                <p className="font-mono-tabular text-lg font-semibold text-white leading-tight">
                  {formatDuration(timerSecondsLeft)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onStartPauseTimer}
                className="px-3 py-1.5 rounded-xl bg-[#8ba3ff] hover:bg-[#9eb2ff] text-[#080a10] text-xs font-semibold transition-colors"
              >
                {timerRunning ? 'Pause' : 'Start'}
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('timers')}
                aria-label="Open Timers and Tasks"
                className="p-1.5 rounded-xl bg-[#1b1f29] hover:bg-[#252a38] text-zinc-300 transition-colors"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Mini Task Completion Bar */}
          <button
            type="button"
            onClick={() => onNavigateTab('timers')}
            className="w-full text-left rounded-xl bg-[#0d0f14] border border-white/[0.05] px-3 py-2 hover:border-white/15 transition-colors space-y-1.5"
          >
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-300 font-medium truncate">
                {taskProgress.scope === 'google-tasks'
                  ? `Google Tasks · ${googleTaskListTitle}`
                  : 'Task Progress'}
              </span>
              <span className="font-mono-tabular text-emerald-300 font-semibold shrink-0 ml-2">
                {taskProgress.percentCompleted}% · {taskProgress.completed}/{taskProgress.total}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[#222633] overflow-hidden">
              <div
                className="h-full bg-[#34d399] rounded-full transition-all duration-300"
                style={{ width: `${taskProgress.percentCompleted}%` }}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Middle Live Strip: System Pulse + Synced Clipboard + Weather & Alerts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Live Hardware Pulse */}
        <button
          type="button"
          onClick={() => onNavigateTab('system')}
          className="text-left rounded-2xl bg-[#12141a] hover:bg-[#171a22] border border-white/[0.06] p-3 transition-colors space-y-1.5"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 font-medium text-zinc-200">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              System Pulse
            </span>
            <span className="font-mono-tabular text-[11px] text-emerald-300">
              {telemetry.appFootprintMb.toFixed(0)} MB
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono-tabular text-zinc-400">
            <span>CPU {telemetry.cpuUsage.toFixed(0)}%</span>
            <span>RAM {telemetry.memoryUsedGb.toFixed(1)}G</span>
            <span>{telemetry.netDownMbps} Mbps</span>
          </div>
        </button>

        {/* Synced Clipboard Latest */}
        <div className="rounded-2xl bg-[#12141a] border border-white/[0.06] p-3 flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => onNavigateTab('clipboard')}
              className="inline-flex items-center gap-1.5 font-medium text-zinc-200 hover:text-white"
            >
              <ClipboardList className="w-3.5 h-3.5 text-[#8ba3ff]" />
              Synced Clip
            </button>
            {latestClipboardItem && (
              <button
                type="button"
                onClick={() => {
                  onHaptic('success');
                  navigator.clipboard?.writeText(latestClipboardItem.content).catch(() => {});
                  setCopiedLatest(true);
                  window.setTimeout(() => setCopiedLatest(false), 1400);
                }}
                className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white"
                aria-label="Copy latest synced clipboard snippet"
              >
                {copiedLatest ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedLatest ? 'Copied' : 'Copy'}</span>
              </button>
            )}
          </div>
          <p className="text-[11px] font-mono-tabular text-zinc-400 truncate">
            {latestClipboardItem ? latestClipboardItem.content : 'Clipboard ready for cross-device sync'}
          </p>
        </div>

        {/* Weather & Incoming Alerts */}
        <div className="rounded-2xl bg-[#12141a] border border-white/[0.06] p-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab('weather')}
            className="text-left hover:opacity-90 transition-opacity"
          >
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-200">
              <CloudSun className="w-3.5 h-3.5 text-[#8ba3ff]" />
              <span className="font-mono-tabular">18°C</span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">Partly Cloudy</p>
          </button>
          <div className="h-7 w-px bg-white/10" aria-hidden="true" />
          <button
            type="button"
            onClick={() => onNavigateTab('notifications')}
            className="text-right hover:opacity-90 transition-opacity"
          >
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-200">
              <Bell className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono-tabular">{unreadNotificationsCount}</span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">Unread alerts</p>
          </button>
        </div>
      </div>

      {/* Bottom Row: Quick Jump + Active Widget Plugins */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { tab: 'control' as IslandTab, label: 'Controls', icon: <Sliders className="w-3.5 h-3.5" /> },
            { tab: 'ai' as IslandTab, label: 'AI Copilot', icon: <Sparkles className="w-3.5 h-3.5" /> },
            { tab: 'files' as IslandTab, label: 'Indexed Files', icon: <Search className="w-3.5 h-3.5" /> },
            { tab: 'plugins' as IslandTab, label: 'Plugins', icon: <Blocks className="w-3.5 h-3.5" /> },
          ].map((item) => (
            <button
              key={item.tab}
              type="button"
              onClick={() => onNavigateTab(item.tab)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#151820] hover:bg-[#1e222e] border border-white/[0.06] text-xs font-medium text-zinc-200 transition-colors"
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {activePlugins.length > 0 && (
          <div className="flex items-center gap-3 text-[11px] text-zinc-400">
            {activePlugins.slice(0, 2).map((p) => (
              <span key={p.id} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span>{p.metricLabel}</span>
                <span className="font-mono-tabular font-semibold" style={{ color: p.accentColor }}>
                  {p.metricValue}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
