export type IslandTab =
  | 'home'
  | 'control'
  | 'ai'
  | 'media'
  | 'clipboard'
  | 'files'
  | 'timers'
  | 'notifications'
  | 'system'
  | 'weather'
  | 'plugins';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationSec: number;
  coverUrl: string;
  bpm: number;
  baseFreq: number;
}

export interface ClipboardItem {
  id: string;
  content: string;
  category: 'text' | 'code' | 'link';
  device: string;
  platform: 'windows' | 'ios' | 'android' | 'macos';
  pinned: boolean;
  createdAt: string;
}

export interface IndexedFile {
  id: string;
  name: string;
  path: string;
  extension: string;
  sizeBytes: number;
  modifiedAt: string;
  hidden: boolean;
  content: string;
}

export interface ReminderItem {
  id: string;
  title: string;
  dueLabel: string;
  completed: boolean;
  source: 'local' | 'google-tasks';
  taskListId?: string;
}

export interface NotificationItem {
  id: string;
  app: string;
  title: string;
  body: string;
  timeLabel: string;
  unread: boolean;
  category: 'system' | 'gmail' | 'sync' | 'timer';
  sender?: string;
  threadId?: string;
}

export interface WidgetPlugin {
  id: string;
  name: string;
  author: string;
  version: string;
  slot: 'pill-right' | 'expanded-bar' | 'tray';
  metricLabel: string;
  metricValue: string;
  accentColor: string;
  enabled: boolean;
  description: string;
  actionLabel: string;
  custom?: boolean;
}

export interface HardwareTelemetry {
  cpuUsage: number;
  cpuClockGhz: number;
  cpuTempC: number;
  coreLoads: number[];
  memoryUsedGb: number;
  memoryTotalGb: number;
  appFootprintMb: number;
  gpuUsage: number;
  gpuVramUsedGb: number;
  gpuVramTotalGb: number;
  gpuFrameTimeMs: number;
  netDownMbps: number;
  netUpMbps: number;
  netPingMs: number;
  history: {
    cpu: number[];
    mem: number[];
    gpu: number[];
    net: number[];
  };
}

export interface QuickTogglesState {
  darkMode: boolean;
  hiddenFiles: boolean;
  desktopIcons: boolean;
  recycleBinCount: number;
  locked: boolean;
  displayOff: boolean;
  keepAwake: boolean;
  hapticsEnabled: boolean;
  dnd: boolean;
  mirrorActive: boolean;
  mixerOpen: boolean;
  screenTimeOpen: boolean;
  appsDrawerOpen: boolean;
}

export interface ChatGroundingChunk {
  web?: { uri?: string; title?: string };
  maps?: {
    uri?: string;
    title?: string;
    placeAnswerSources?: {
      reviewSnippets?: Array<{ uri?: string; text?: string }>;
    };
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  model?: string;
  groundingChunks?: ChatGroundingChunk[];
}

export type CopilotRoleId = 'assistant' | 'architect' | 'debugger' | 'writer';
