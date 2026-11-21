import React from 'react';
import {
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Eye,
  LayoutGrid,
  Trash2,
  Lock,
  MonitorOff,
  Sparkles,
  Box,
  SlidersHorizontal,
  Hourglass,
  Scan,
  BrushCleaning,
  Coffee,
  Camera,
  Image as ImageIcon,
  Bell,
  Cpu,
  CloudSun,
  Columns2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Check,
} from 'lucide-react';
import type { IslandTab, QuickTogglesState, Track } from '../types/island';
import { formatDuration } from '../utils/islandLogic';

interface ControlCenterPanelProps {
  volume: number;
  brightness: number;
  onVolumeChange: (v: number) => void;
  onBrightnessChange: (v: number) => void;
  toggles: QuickTogglesState;
  onToggleKey: (key: keyof QuickTogglesState) => void;
  onEmptyRecycleBin: () => void;
  onRunCleaner: () => void;
  onCaptureScreen: () => void;
  onNavigateTab: (tab: IslandTab) => void;
  activeTrack: Track;
  isPlaying: boolean;
  trackProgressSec: number;
  onTogglePlay: () => void;
  onPrevTrack: () => void;
  onNextTrack: () => void;
  onSeekTrack: (sec: number) => void;
  appVolumes: Record<string, number>;
  onAppVolumeChange: (appName: string, val: number) => void;
  unreadNotificationsCount: number;
  statusBanner: string | null;
}

interface TileConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  subtitle?: string;
  onClick: () => void;
}

export const ControlCenterPanel: React.FC<ControlCenterPanelProps> = ({
  volume,
  brightness,
  onVolumeChange,
  onBrightnessChange,
  toggles,
  onToggleKey,
  onEmptyRecycleBin,
  onRunCleaner,
  onCaptureScreen,
  onNavigateTab,
  activeTrack,
  isPlaying,
  trackProgressSec,
  onTogglePlay,
  onPrevTrack,
  onNextTrack,
  onSeekTrack,
  appVolumes,
  onAppVolumeChange,
  unreadNotificationsCount,
  statusBanner,
}) => {
  const tiles: TileConfig[] = [
    {
      id: 'dark-mode',
      label: 'Dark mode',
      icon: <Moon className="w-[18px] h-[18px]" />,
      active: toggles.darkMode,
      onClick: () => onToggleKey('darkMode'),
    },
    {
      id: 'hidden-files',
      label: 'Hidden files',
      icon: <Eye className="w-[18px] h-[18px]" />,
      active: toggles.hiddenFiles,
      onClick: () => onToggleKey('hiddenFiles'),
    },
    {
      id: 'desktop-icons',
      label: 'Desktop icons',
      icon: <LayoutGrid className="w-[18px] h-[18px]" />,
      active: toggles.desktopIcons,
      onClick: () => onToggleKey('desktopIcons'),
    },
    {
      id: 'recycle-bin',
      label: 'Recycle Bin',
      subtitle: toggles.recycleBinCount > 0 ? `${toggles.recycleBinCount} items` : 'Empty',
      icon: <Trash2 className="w-[18px] h-[18px]" />,
      active: toggles.recycleBinCount === 0,
      onClick: onEmptyRecycleBin,
    },
    {
      id: 'lock',
      label: 'Lock',
      icon: <Lock className="w-[18px] h-[18px]" />,
      active: toggles.locked,
      onClick: () => onToggleKey('locked'),
    },
    {
      id: 'display-off',
      label: 'Display off',
      icon: <MonitorOff className="w-[18px] h-[18px]" />,
      active: toggles.displayOff,
      onClick: () => onToggleKey('displayOff'),
    },
    {
      id: 'agents',
      label: 'Agents',
      icon: <Sparkles className="w-[18px] h-[18px]" />,
      onClick: () => onNavigateTab('ai'),
    },
    {
      id: 'apps',
      label: 'Apps',
      icon: <Box className="w-[18px] h-[18px]" />,
      active: toggles.appsDrawerOpen,
      onClick: () => onToggleKey('appsDrawerOpen'),
    },
    {
      id: 'mixer',
      label: 'Mixer',
      icon: <SlidersHorizontal className="w-[18px] h-[18px]" />,
      active: toggles.mixerOpen,
      onClick: () => onToggleKey('mixerOpen'),
    },
    {
      id: 'screen-time',
      label: 'Screen time',
      icon: <Hourglass className="w-[18px] h-[18px]" />,
      active: toggles.screenTimeOpen,
      onClick: () => onToggleKey('screenTimeOpen'),
    },
    {
      id: 'captures',
      label: 'Captures',
      icon: <Scan className="w-[18px] h-[18px]" />,
      onClick: onCaptureScreen,
    },
    {
      id: 'cleaner',
      label: 'Cleaner',
      icon: <BrushCleaning className="w-[18px] h-[18px]" />,
      onClick: onRunCleaner,
    },
    {
      id: 'keep-awake',
      label: 'Keep awake',
      icon: <Coffee className="w-[18px] h-[18px]" />,
      active: toggles.keepAwake,
      onClick: () => onToggleKey('keepAwake'),
    },
    {
      id: 'mirror',
      label: 'Mirror',
      icon: <Camera className="w-[18px] h-[18px]" />,
      active: toggles.mirrorActive,
      onClick: () => onToggleKey('mirrorActive'),
    },
    {
      id: 'media-tools',
      label: 'Media tools',
      icon: <ImageIcon className="w-[18px] h-[18px]" />,
      onClick: () => onNavigateTab('media'),
    },
    {
      id: 'notifications',
      label: 'Notifications',
      subtitle: unreadNotificationsCount > 0 ? `${unreadNotificationsCount} new` : undefined,
      icon: <Bell className="w-[18px] h-[18px]" />,
      active: unreadNotificationsCount > 0 && !toggles.dnd,
      onClick: () => onNavigateTab('notifications'),
    },
    {
      id: 'system',
      label: 'System',
      icon: <Cpu className="w-[18px] h-[18px]" />,
      onClick: () => onNavigateTab('system'),
    },
    {
      id: 'weather',
      label: 'Weather',
      icon: <CloudSun className="w-[18px] h-[18px]" />,
      onClick: () => onNavigateTab('weather'),
    },
    {
      id: 'layout',
      label: 'Layout',
      icon: <Columns2 className="w-[18px] h-[18px]" />,
      onClick: () => onNavigateTab('plugins'),
    },
  ];

  const volumeBackground = `linear-gradient(to right, #8ba3ff ${volume}%, #232631 ${volume}%)`;
  const brightnessBackground = `linear-gradient(to right, #8ba3ff ${brightness}%, #232631 ${brightness}%)`;

  return (
    <div className="space-y-4">
      {/* Top Volume & Brightness Sliders matching reference screenshots */}
      <div className="space-y-3 px-0.5">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => onVolumeChange(volume === 0 ? 75 : 0)}
            className="text-zinc-300 hover:text-white transition-colors p-1 -ml-1"
            aria-label={volume === 0 ? 'Unmute system audio' : 'Mute system audio'}
          >
            {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            aria-label="System volume"
            className="winland-slider flex-1"
            style={{ background: volumeBackground }}
          />
          <span className="font-mono-tabular text-[11px] text-zinc-400 w-9 text-right shrink-0">
            {volume}%
          </span>
        </div>

        <div className="flex items-center gap-3.5">
          <span className="text-zinc-300 p-1 -ml-1" aria-hidden="true">
            <Sun className="w-4 h-4" />
          </span>
          <input
            type="range"
            min={25}
            max={100}
            value={brightness}
            onChange={(e) => onBrightnessChange(Number(e.target.value))}
            aria-label="Display brightness"
            className="winland-slider flex-1"
            style={{ background: brightnessBackground }}
          />
          <span className="font-mono-tabular text-[11px] text-zinc-400 w-9 text-right shrink-0">
            {brightness}%
          </span>
        </div>
      </div>

      {/* Transient feedback message for quick actions like Cleaner or Captures */}
      {statusBanner && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0e241e] border border-emerald-400/20 text-xs text-emerald-200">
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{statusBanner}</span>
        </div>
      )}

      {/* 7-column Windows Quick-Toggle Tile Grid matching attached screenshots */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
        {tiles.map((tile) => {
          const isActive = Boolean(tile.active);
          return (
            <button
              key={tile.id}
              type="button"
              onClick={tile.onClick}
              aria-pressed={tile.active !== undefined ? isActive : undefined}
              className={`group flex flex-col items-center justify-center gap-2 rounded-2xl px-2 py-3.5 min-h-[82px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ba3ff] active:scale-[0.97] ${
                isActive
                  ? 'bg-[#0e241e] hover:bg-[#122e26] text-white border border-emerald-400/20'
                  : 'bg-[#14161b] hover:bg-[#1c1f27] text-zinc-200 border border-white/[0.04]'
              }`}
            >
              <span
                className={`transition-colors ${
                  isActive ? 'text-[#34d399]' : 'text-zinc-300 group-hover:text-white'
                }`}
              >
                {tile.icon}
              </span>
              <span className="text-[11px] font-medium leading-tight text-center whitespace-nowrap">
                {tile.label}
              </span>
              {tile.subtitle && (
                <span className="text-[10px] text-zinc-400 leading-none whitespace-nowrap">
                  {tile.subtitle}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Expandable Inline Drawers triggered by Mixer / Screen Time / Apps / Mirror tiles */}
      {toggles.mixerOpen && (
        <div className="rounded-2xl bg-[#12141a] border border-white/[0.06] p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-200">Per-App Audio Mixer</span>
            <span className="text-[11px] text-zinc-400">Windows WASAPI</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.entries(appVolumes).map(([appName, val]) => (
              <div key={appName} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-300">{appName}</span>
                  <span className="font-mono-tabular text-zinc-400">{val}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={val}
                  onChange={(e) => onAppVolumeChange(appName, Number(e.target.value))}
                  aria-label={`${appName} volume`}
                  className="winland-slider w-full"
                  style={{
                    background: `linear-gradient(to right, #34d399 ${val}%, #232631 ${val}%)`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {toggles.screenTimeOpen && (
        <div className="rounded-2xl bg-[#12141a] border border-white/[0.06] p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-200">Today&apos;s Screen Time</span>
            <span className="font-mono-tabular text-xs text-emerald-400">5h 18m active</span>
          </div>
          <div className="grid grid-cols-3 gap-2.5 text-xs">
            <div className="rounded-xl bg-[#181b23] p-2.5">
              <p className="text-zinc-400 text-[11px]">VS Code</p>
              <p className="font-mono-tabular text-zinc-100 font-semibold mt-0.5">2h 44m</p>
            </div>
            <div className="rounded-xl bg-[#181b23] p-2.5">
              <p className="text-zinc-400 text-[11px]">Browser &amp; Docs</p>
              <p className="font-mono-tabular text-zinc-100 font-semibold mt-0.5">1h 36m</p>
            </div>
            <div className="rounded-xl bg-[#181b23] p-2.5">
              <p className="text-zinc-400 text-[11px]">WinLand Copilot</p>
              <p className="font-mono-tabular text-zinc-100 font-semibold mt-0.5">58m</p>
            </div>
          </div>
        </div>
      )}

      {toggles.appsDrawerOpen && (
        <div className="rounded-2xl bg-[#12141a] border border-white/[0.06] p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-200">Quick Module Launcher</span>
            <span className="text-[11px] text-zinc-400">Jump to any WinLand workspace</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['clipboard', 'Synced Clipboard'],
                ['files', 'Indexed File Search'],
                ['timers', 'Timers & Google Tasks'],
                ['ai', 'Gemini Copilot'],
                ['media', 'Image & Video Studio'],
                ['system', 'Live Benchmarks'],
                ['weather', 'Maps & Weather'],
                ['plugins', 'Widget Plugins'],
              ] as Array<[IslandTab, string]>
            ).map(([tabId, label]) => (
              <button
                key={tabId}
                type="button"
                onClick={() => onNavigateTab(tabId)}
                className="px-3 py-1.5 rounded-lg bg-[#1b1f29] hover:bg-[#252a38] text-zinc-200 text-xs font-medium transition-colors whitespace-nowrap"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {toggles.mirrorActive && (
        <div className="rounded-2xl bg-[#12141a] border border-white/[0.06] p-3.5 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-zinc-100">Quick Desk Mirror Preview</p>
            <p className="text-[11px] text-zinc-400">
              Frameless lighting &amp; framing check active · 1080p 60fps virtual shutter ready.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onToggleKey('mirrorActive')}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 whitespace-nowrap"
          >
            Close Mirror
          </button>
        </div>
      )}

      {/* Sleek Integrated Media Bar */}
      <div className="rounded-2xl bg-[#12141a] border border-white/[0.06] p-3 flex flex-col sm:flex-row sm:items-center gap-3.5">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-zinc-900 shrink-0 border border-white/10">
            <img
              src={activeTrack.coverUrl}
              alt={`${activeTrack.title} album artwork`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-white truncate">{activeTrack.title}</p>
            </div>
            <p className="text-xs text-zinc-400 truncate">
              {activeTrack.artist} · {activeTrack.album}
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="font-mono-tabular text-[10px] text-zinc-400">
                {formatDuration(trackProgressSec)}
              </span>
              <input
                type="range"
                min={0}
                max={activeTrack.durationSec}
                value={trackProgressSec}
                onChange={(e) => onSeekTrack(Number(e.target.value))}
                aria-label="Track playback position"
                className="winland-slider flex-1 h-1"
                style={{
                  background: `linear-gradient(to right, #34d399 ${(trackProgressSec / activeTrack.durationSec) * 100}%, #232631 ${(trackProgressSec / activeTrack.durationSec) * 100}%)`,
                }}
              />
              <span className="font-mono-tabular text-[10px] text-zinc-400">
                {formatDuration(activeTrack.durationSec)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onPrevTrack}
            className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Previous track"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            className="w-9 h-9 rounded-xl bg-white text-black hover:bg-zinc-200 flex items-center justify-center transition-colors"
            aria-label={isPlaying ? 'Pause music' : 'Play music'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={onNextTrack}
            className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Next track"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
