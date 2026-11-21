import type {
  IndexedFile,
  NotificationItem,
  ReminderItem,
  Track,
  WidgetPlugin,
} from '../types/island';

export const WALLPAPER_URL =
  '/src/assets/images/winland_desktop_wallpaper_1795272415083.jpg';

export const MUSIC_TRACKS: Track[] = [
  {
    id: 'trk-1',
    title: 'Midnight Circuit',
    artist: 'Koda & Meridian',
    album: 'Monolith Sessions',
    durationSec: 214,
    coverUrl: '/src/assets/images/album_midnight_circuit_1795272417103.jpg',
    bpm: 108,
    baseFreq: 196,
  },
  {
    id: 'trk-2',
    title: 'Glass Horizon',
    artist: 'Sora Sato',
    album: 'Refractions',
    durationSec: 186,
    coverUrl: '/src/assets/images/album_glass_horizon_1795272415766.jpg',
    bpm: 92,
    baseFreq: 220,
  },
  {
    id: 'trk-3',
    title: 'Solar Drift',
    artist: 'North Pacific',
    album: 'Low Tide Telemetry',
    durationSec: 248,
    coverUrl: '/src/assets/images/album_solar_drift_1795272415088.jpg',
    bpm: 116,
    baseFreq: 174.61,
  },
];

export const SEED_FILES: IndexedFile[] = [
  {
    id: 'file-1',
    name: 'winland-shader-pipeline.ts',
    path: 'C:\\Users\\Developer\\Projects\\WinLand\\src\\winland-shader-pipeline.ts',
    extension: 'ts',
    sizeBytes: 6420,
    modifiedAt: 'Today, 09:14',
    hidden: false,
    content:
      'export interface AcrylicPipelineConfig { blurRadius: number; tintOpacity: number; refreshHz: 60 | 120 | 240; }\nexport function compileAcrylicShader(config: AcrylicPipelineConfig) {\n  // Sub-millisecond DirectComposition acrylic backdrop pass for WinLand Dynamic Island\n  return { pass: "DCompAcrylic", gpuBudgetMs: 0.85, blurRadius: config.blurRadius };\n}',
  },
  {
    id: 'file-2',
    name: 'react-native-windows-bridge.tsx',
    path: 'C:\\Users\\Developer\\Projects\\WinLand\\native\\react-native-windows-bridge.tsx',
    extension: 'tsx',
    sizeBytes: 8190,
    modifiedAt: 'Today, 08:42',
    hidden: false,
    content:
      'import { NativeModules, Platform } from "react-native";\n// Cross-platform React Native bridge syncing clipboard history and Windows WinRT haptics\nexport const WinLandBridge = NativeModules.WinLandIslandModule;\nexport async function syncClipboardAcrossDevices(payload: string) {\n  return WinLandBridge?.pushClipboardSync({ platform: Platform.OS, payload });\n}',
  },
  {
    id: 'file-3',
    name: 'q4-performance-benchmarks.md',
    path: 'C:\\Users\\Developer\\Documents\\q4-performance-benchmarks.md',
    extension: 'md',
    sizeBytes: 3480,
    modifiedAt: 'Yesterday, 17:30',
    hidden: false,
    content:
      '# WinLand Desktop Performance Benchmarks\n- Idle CPU utilization: 0.4% on Ryzen 9 / Core Ultra 9\n- Resident memory footprint: 34.8 MB (React Native Fabric + Hermes)\n- GPU frame pacing: 4.1ms average on 120Hz OLED displays\n- Local file index lookup latency: < 0.9ms across 25,000 indexed documents.',
  },
  {
    id: 'file-4',
    name: 'plugin-sdk-manifest.json',
    path: 'C:\\Users\\Developer\\Projects\\WinLand\\sdk\\plugin-sdk-manifest.json',
    extension: 'json',
    sizeBytes: 1840,
    modifiedAt: 'Nov 19, 14:22',
    hidden: false,
    content:
      '{\n  "sdkVersion": "2.1.0",\n  "slots": ["pill-right", "expanded-bar", "tray"],\n  "permissions": ["clipboard.read", "notifications.post", "telemetry.subscribe"],\n  "sandbox": "isolated-worker"\n}',
  },
  {
    id: 'file-5',
    name: 'sprint-release-notes.txt',
    path: 'C:\\Users\\Developer\\Desktop\\sprint-release-notes.txt',
    extension: 'txt',
    sizeBytes: 1520,
    modifiedAt: 'Nov 18, 11:05',
    hidden: false,
    content:
      'Release Checklist:\n1. Verify smooth spring animations and tactile haptic feedback on Windows Precision Touchpad.\n2. Confirm cross-device clipboard sync between Windows 11, iOS, and Android.\n3. Test Gmail alerts, Google Tasks reminders, and Maps grounding inside Dynamic Island.',
  },
  {
    id: 'file-6',
    name: '.winlandrc.json',
    path: 'C:\\Users\\Developer\\Projects\\WinLand\\.winlandrc.json',
    extension: 'json',
    sizeBytes: 512,
    modifiedAt: 'Nov 15, 20:10',
    hidden: true,
    content:
      '{\n  "islandPosition": "top-center",\n  "shaderCachePath": "C:\\\\AppData\\\\Local\\\\WinLand\\\\shader-cache",\n  "hapticIntensity": "crisp",\n  "hardwareTelemetryIntervalMs": 1500\n}',
  },
  {
    id: 'file-7',
    name: '.gitignore',
    path: 'C:\\Users\\Developer\\Projects\\WinLand\\.gitignore',
    extension: 'gitignore',
    sizeBytes: 248,
    modifiedAt: 'Nov 12, 09:00',
    hidden: true,
    content:
      'node_modules/\ndist/\nbuild/\n*.log\n.env.local\nshader-cache/\n',
  },
];

export const SEED_REMINDERS: ReminderItem[] = [
  {
    id: 'rem-1',
    title: 'Benchmark Hermes memory usage on Windows 11 24H2',
    dueLabel: 'Today · 14:00',
    completed: false,
    source: 'local',
  },
  {
    id: 'rem-2',
    title: 'Review third-party widget plugin PRs (#142, #145)',
    dueLabel: 'Today · 16:30',
    completed: false,
    source: 'local',
  },
  {
    id: 'rem-3',
    title: 'Export acrylic wallpaper color profiles',
    dueLabel: 'Tomorrow · 09:00',
    completed: true,
    source: 'local',
  },
];

export const SEED_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    app: 'Clipboard Sync',
    title: 'Synced from iPhone 16 Pro',
    body: 'Copied Microsoft Acrylic Design docs link to cross-device clipboard.',
    timeLabel: '2m ago',
    unread: true,
    category: 'sync',
  },
  {
    id: 'notif-2',
    app: 'Windows Security',
    title: 'Hardware telemetry nominal',
    body: 'WinLand resident footprint optimized to 34 MB (0.4% CPU).',
    timeLabel: '14m ago',
    unread: true,
    category: 'system',
  },
  {
    id: 'notif-3',
    app: 'GitHub Desktop',
    title: 'PR #145 checks passed',
    body: 'react-native-windows-bridge build succeeded in 1m 42s.',
    timeLabel: '38m ago',
    unread: false,
    category: 'system',
  },
];

export const SEED_PLUGINS: WidgetPlugin[] = [
  {
    id: 'plug-gh',
    name: 'GitHub PR Watcher',
    author: 'WinLand Core',
    version: '1.4.2',
    slot: 'pill-right',
    metricLabel: 'Open PRs',
    metricValue: '3 Passing',
    accentColor: '#34d399',
    enabled: true,
    description: 'Displays live pull-request CI status directly on the compact Dynamic Island pill.',
    actionLabel: 'Refresh CI',
  },
  {
    id: 'plug-net',
    name: 'NetSpeed Micro',
    author: 'PowerTools Community',
    version: '2.0.1',
    slot: 'expanded-bar',
    metricLabel: 'Throughput',
    metricValue: '842 Mbps',
    accentColor: '#8ba3ff',
    enabled: true,
    description: 'Streams real-time downlink/uplink speed into the expanded island header.',
    actionLabel: 'Ping Check',
  },
  {
    id: 'plug-focus',
    name: 'Deep Work Guard',
    author: 'Studio Minimal',
    version: '1.1.0',
    slot: 'tray',
    metricLabel: 'Focus Streak',
    metricValue: '48 min',
    accentColor: '#f59e0b',
    enabled: false,
    description: 'Silences non-critical toast notifications during active Pomodoro focus blocks.',
    actionLabel: 'Log Sprint',
  },
  {
    id: 'plug-rn',
    name: 'React Native Metro',
    author: 'CrossPlatform Labs',
    version: '0.76.4',
    slot: 'expanded-bar',
    metricLabel: 'Hermes',
    metricValue: 'Port 8081',
    accentColor: '#38bdf8',
    enabled: true,
    description: 'Hot-reloads WinLand cross-platform React Native bundles on Windows, iOS, and Android.',
    actionLabel: 'Reload Bundle',
  },
];

export const DESKTOP_SHORTCUTS = [
  { id: 'desk-1', label: 'WinLand SDK', tab: 'plugins' as const, hidden: false },
  { id: 'desk-2', label: 'Indexed Files', tab: 'files' as const, hidden: false },
  { id: 'desk-3', label: 'AI Copilot', tab: 'ai' as const, hidden: false },
  { id: 'desk-4', label: 'Media Studio', tab: 'media' as const, hidden: false },
  { id: 'desk-5', label: 'Benchmarks', tab: 'system' as const, hidden: false },
  { id: 'desk-6', label: 'Maps & Weather', tab: 'weather' as const, hidden: false },
  { id: 'desk-7', label: '.winlandrc', tab: 'files' as const, hidden: true },
];
