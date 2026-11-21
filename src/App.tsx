import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Home,
  Sliders,
  Sparkles,
  Film,
  ClipboardList,
  Search,
  Timer,
  Bell,
  Cpu,
  CloudSun,
  Blocks,
  ChevronUp,
  ChevronDown,
  Play,
  Pause,
  FolderOpen,
  Lock,
  Wifi,
  Volume2,
  BatteryCharging,
  X,
} from 'lucide-react';
import type { User } from 'firebase/auth';

import type {
  ChatMessage,
  ClipboardItem,
  CopilotRoleId,
  HardwareTelemetry,
  IndexedFile,
  IslandTab,
  NotificationItem,
  QuickTogglesState,
  ReminderItem,
  WidgetPlugin,
} from './types/island';
import {
  DESKTOP_SHORTCUTS,
  MUSIC_TRACKS,
  SEED_FILES,
  SEED_NOTIFICATIONS,
  SEED_PLUGINS,
  SEED_REMINDERS,
  WALLPAPER_URL,
} from './data/seedData';
import { triggerHaptic, type HapticStyle } from './utils/haptics';
import { formatDuration } from './utils/islandLogic';
import {
  createGoogleTask,
  deleteGoogleTask,
  fetchGoogleTasks,
  fetchRecentGmailMessages,
  getWorkspaceAccessToken,
  initWorkspaceAuth,
  moveGoogleTask,
  sendGmailMessage,
  signInWithGoogleWorkspace,
  signOutWorkspace,
  updateGoogleTaskStatus,
  type GmailMessagePreview,
  type GoogleTaskListOption,
} from './utils/workspaceAuth';

import { HomePanel } from './components/HomePanel';
import { ControlCenterPanel } from './components/ControlCenterPanel';
import { AiHubPanel } from './components/AiHubPanel';
import { MediaStudioPanel } from './components/MediaStudioPanel';
import { ClipboardPanel } from './components/ClipboardPanel';
import { FileSearchPanel } from './components/FileSearchPanel';
import { TimersTasksPanel } from './components/TimersTasksPanel';
import { NotificationsGmailPanel } from './components/NotificationsGmailPanel';
import { SystemBenchmarksPanel } from './components/SystemBenchmarksPanel';
import { WeatherMapsPanel } from './components/WeatherMapsPanel';
import { PluginsLayoutPanel } from './components/PluginsLayoutPanel';
import { ConfirmDialog, type ConfirmDialogState } from './components/ConfirmDialog';

const ISLAND_TABS: Array<{ id: IslandTab; label: string; icon: React.ReactNode }> = [
  { id: 'home', label: 'Home', icon: <Home className="w-3.5 h-3.5" /> },
  { id: 'control', label: 'Controls', icon: <Sliders className="w-3.5 h-3.5" /> },
  { id: 'ai', label: 'AI', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: 'media', label: 'Media', icon: <Film className="w-3.5 h-3.5" /> },
  { id: 'clipboard', label: 'Clipboard', icon: <ClipboardList className="w-3.5 h-3.5" /> },
  { id: 'files', label: 'Files', icon: <Search className="w-3.5 h-3.5" /> },
  { id: 'timers', label: 'Timers', icon: <Timer className="w-3.5 h-3.5" /> },
  { id: 'notifications', label: 'Alerts', icon: <Bell className="w-3.5 h-3.5" /> },
  { id: 'system', label: 'System', icon: <Cpu className="w-3.5 h-3.5" /> },
  { id: 'weather', label: 'Maps', icon: <CloudSun className="w-3.5 h-3.5" /> },
  { id: 'plugins', label: 'Plugins', icon: <Blocks className="w-3.5 h-3.5" /> },
];

const STORAGE_KEYS = {
  reminders: 'winland_local_reminders_v1',
  plugins: 'winland_plugins_v1',
  files: 'winland_custom_files_v1',
  chatMessages: 'winland_ai_chat_v1',
};

const ISLAND_VANISH_DELAY_MS = 10000;

const DEFAULT_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome-ai',
    role: 'model',
    text: 'WinLand AI Copilot is ready. Ask about Windows workflows, drop an image or file for multimodal analysis, or enable Search/Maps grounding. Your conversation stays open across sessions until you click New Convo.',
    model: 'gemini-4-hydrogen',
  },
];

export default function App() {
  // Island presentation state (compact until hovered; auto-vanishes after 10s of inactivity)
  const [islandExpanded, setIslandExpanded] = useState(false);
  const [islandVanished, setIslandVanished] = useState(false);
  const [activeTab, setActiveTab] = useState<IslandTab>('home');
  const [wallpaper, setWallpaper] = useState<string>(WALLPAPER_URL);
  const [captureFlash, setCaptureFlash] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [pillToast, setPillToast] = useState<string | null>(null);

  // Persistent multi-turn AI Copilot conversation (preserved until user clicks New Convo)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.chatMessages);
      if (saved) {
        const parsed = JSON.parse(saved) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Ignore storage error
    }
    return DEFAULT_CHAT_MESSAGES;
  });
  const [chatModel, setChatModel] = useState<string>('gemini-4-hydrogen');
  const [chatRole, setChatRole] = useState<CopilotRoleId>('assistant');
  const [useSearchGrounding, setUseSearchGrounding] = useState(false);
  const [useMapsGrounding, setUseMapsGrounding] = useState(false);
  const [chatInput, setChatInput] = useState('');

  // System sliders & quick toggles
  const [volume, setVolume] = useState(82);
  const [brightness, setBrightness] = useState(96);
  const [toggles, setToggles] = useState<QuickTogglesState>({
    darkMode: true,
    hiddenFiles: false,
    desktopIcons: true,
    recycleBinCount: 4,
    locked: false,
    displayOff: false,
    keepAwake: false,
    hapticsEnabled: true,
    dnd: false,
    mirrorActive: false,
    mixerOpen: false,
    screenTimeOpen: false,
    appsDrawerOpen: false,
  });
  const [appVolumes, setAppVolumes] = useState<Record<string, number>>({
    'WinLand Media': 85,
    'Browser Audio': 70,
    'System Alerts': 60,
  });

  // Music player state
  const [trackIdx, setTrackIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [trackProgressSec, setTrackProgressSec] = useState(64);
  const activeTrack = MUSIC_TRACKS[trackIdx];

  // Timer state
  const [timerDurationSec, setTimerDurationSec] = useState(900);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(900);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerLabel, setTimerLabel] = useState('15m Sprint');

  // Cross-device synced clipboard state
  const [clipboardItems, setClipboardItems] = useState<ClipboardItem[]>([]);

  // Indexed local files state
  const [indexedFiles, setIndexedFiles] = useState<IndexedFile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.files);
      if (saved) {
        const extra = JSON.parse(saved) as IndexedFile[];
        return [...extra, ...SEED_FILES];
      }
    } catch {
      // Ignore storage error
    }
    return SEED_FILES;
  });

  // Reminders & Google Tasks state
  const [localReminders, setLocalReminders] = useState<ReminderItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.reminders);
      if (saved) return JSON.parse(saved) as ReminderItem[];
    } catch {
      // Ignore storage error
    }
    return SEED_REMINDERS;
  });
  const [googleTaskListId, setGoogleTaskListId] = useState<string>('@default');
  const [googleTaskListTitle, setGoogleTaskListTitle] = useState<string>('My Tasks');
  const [googleTaskLists, setGoogleTaskLists] = useState<GoogleTaskListOption[]>([]);
  const [googleTasks, setGoogleTasks] = useState<ReminderItem[]>([]);
  const [googleTasksOrderDirty, setGoogleTasksOrderDirty] = useState(false);
  const [tasksSyncing, setTasksSyncing] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);

  // Notifications & Gmail state
  const [notifications, setNotifications] = useState<NotificationItem[]>(SEED_NOTIFICATIONS);
  const [gmailMessages, setGmailMessages] = useState<GmailMessagePreview[]>([]);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailError, setGmailError] = useState<string | null>(null);

  // Workspace Auth (Firebase Auth, in-memory token only)
  const [workspaceUser, setWorkspaceUser] = useState<User | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Confirm Dialog for Workspace mutations/deletions
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  // Custom Widget Plugins
  const [plugins, setPlugins] = useState<WidgetPlugin[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.plugins);
      if (saved) return JSON.parse(saved) as WidgetPlugin[];
    } catch {
      // Ignore storage error
    }
    return SEED_PLUGINS;
  });

  // Live Hardware Telemetry & Benchmarks
  const [telemetry, setTelemetry] = useState<HardwareTelemetry>({
    cpuUsage: 17.4,
    cpuClockGhz: 4.82,
    cpuTempC: 51,
    coreLoads: [16, 22, 14, 19, 12, 24, 18, 15],
    memoryUsedGb: 11.4,
    memoryTotalGb: 32,
    appFootprintMb: 34.2,
    gpuUsage: 22,
    gpuVramUsedGb: 3.2,
    gpuVramTotalGb: 12,
    gpuFrameTimeMs: 4.1,
    netDownMbps: 842,
    netUpMbps: 318,
    netPingMs: 9,
    history: {
      cpu: [16, 18, 15, 19, 17, 16, 18, 17, 19, 17],
      mem: [35, 35, 36, 36, 35, 36, 36, 35, 36, 36],
      gpu: [19, 21, 20, 24, 22, 21, 23, 22, 21, 22],
      net: [810, 835, 822, 860, 845, 830, 852, 840, 848, 842],
    },
  });
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);
  const [lastBenchmarkAt, setLastBenchmarkAt] = useState<string | null>(null);

  // AI handoff prompt & Maps state
  const [externalAiPrompt, setExternalAiPrompt] = useState<string | null>(null);
  const [mapsApiKey, setMapsApiKey] = useState<string>(
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  );
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({
    lat: 37.7749,
    lng: -122.4194,
  });

  // Live Windows Taskbar Clock
  const [now, setNow] = useState(() => new Date());

  const haptic = useCallback(
    (style: HapticStyle = 'tap') => {
      triggerHaptic(style, toggles.hapticsEnabled, volume);
    },
    [toggles.hapticsEnabled, volume]
  );

  const flashBanner = useCallback((message: string) => {
    setStatusBanner(message);
    window.setTimeout(() => {
      setStatusBanner((prev) => (prev === message ? null : prev));
    }, 3200);
  }, []);

  const flashPillToast = useCallback((message: string) => {
    setIslandVanished(false);
    setPillToast(message);
    window.setTimeout(() => {
      setPillToast((prev) => (prev === message ? null : prev));
    }, 3600);
  }, []);

  const handleNewConversation = useCallback(() => {
    haptic('tap');
    setChatMessages(DEFAULT_CHAT_MESSAGES);
    setChatInput('');
    flashPillToast('Started new AI conversation');
  }, [haptic, flashPillToast]);

  // Sync dark mode class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', toggles.darkMode);
  }, [toggles.darkMode]);

  // Listen for Google Maps Demo Key quota exceeded events
  useEffect(() => {
    const onQuota = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);

  // Fetch public runtime config & initial synced clipboard from Express server
  useEffect(() => {
    fetch('/api/config')
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        if (cfg?.mapsApiKey && !mapsApiKey) {
          setMapsApiKey(cfg.mapsApiKey);
        }
      })
      .catch(() => {});

    fetch('/api/clipboard')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data?.items)) {
          setClipboardItems(data.items);
        }
      })
      .catch(() => {});
  }, [mapsApiKey]);

  // Initialize Firebase Workspace Auth listener
  useEffect(() => {
    const unsubscribe = initWorkspaceAuth(
      (user) => setWorkspaceUser(user),
      () => setWorkspaceUser(null)
    );
    return () => unsubscribe();
  }, []);

  // Persist local reminders & custom plugins
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.reminders, JSON.stringify(localReminders));
    } catch {
      // Ignore
    }
  }, [localReminders]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.plugins, JSON.stringify(plugins));
    } catch {
      // Ignore
    }
  }, [plugins]);

  // Persist AI Copilot chat history until explicitly cleared via New Convo
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.chatMessages, JSON.stringify(chatMessages));
    } catch {
      // Ignore storage quota errors
    }
  }, [chatMessages]);

  // Live clock tick (1s)
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Music progress tick
  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => {
      setTrackProgressSec((prev) => {
        if (prev + 1 >= activeTrack.durationSec) {
          setTrackIdx((idx) => (idx + 1) % MUSIC_TRACKS.length);
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [isPlaying, activeTrack.durationSec]);

  // Countdown timer tick
  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setTimerSecondsLeft((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          haptic('alert');
          const doneNotif: NotificationItem = {
            id: `timer-done-${Date.now()}`,
            app: 'WinLand Timer',
            title: `${timerLabel} completed`,
            body: 'Your countdown timer has finished.',
            timeLabel: 'Just now',
            unread: true,
            category: 'timer',
          };
          setNotifications((list) => [doneNotif, ...list]);
          flashPillToast(`Timer finished · ${timerLabel}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning, timerLabel, haptic, flashPillToast]);

  // Live hardware telemetry polling (1.5s lightweight update)
  useEffect(() => {
    const id = window.setInterval(() => {
      setTelemetry((prev) => {
        const wave = (seed: number, amp: number) => Math.sin(Date.now() / 1800 + seed) * amp;
        const cpuUsage = Math.max(
          4,
          Math.min(92, Number((prev.cpuUsage + wave(0.4, 2.2) + (Math.random() - 0.5) * 2.4).toFixed(1)))
        );
        const gpuUsage = Math.max(
          6,
          Math.min(95, Number((prev.gpuUsage + wave(1.3, 2.8) + (Math.random() - 0.5) * 3).toFixed(0)))
        );
        const memUsed = Math.max(
          6.5,
          Math.min(28.5, Number((prev.memoryUsedGb + (Math.random() - 0.5) * 0.18).toFixed(1)))
        );
        const netDown = Math.max(
          180,
          Math.min(1150, Math.round(prev.netDownMbps + (Math.random() - 0.5) * 38))
        );
        const netUp = Math.max(
          85,
          Math.min(620, Math.round(prev.netUpMbps + (Math.random() - 0.5) * 22))
        );
        const memPct = Math.round((memUsed / prev.memoryTotalGb) * 100);

        return {
          ...prev,
          cpuUsage,
          cpuClockGhz: Number((4.45 + (cpuUsage / 100) * 0.85).toFixed(2)),
          cpuTempC: Math.round(46 + cpuUsage * 0.28),
          coreLoads: prev.coreLoads.map((c, idx) =>
            Math.max(6, Math.min(96, Math.round(cpuUsage + Math.sin(idx + Date.now() / 1400) * 11)))
          ),
          memoryUsedGb: memUsed,
          gpuUsage,
          gpuFrameTimeMs: Number((3.4 + (gpuUsage / 100) * 3.1).toFixed(1)),
          netDownMbps: netDown,
          netUpMbps: netUp,
          netPingMs: Math.max(5, Math.min(28, Math.round(8 + Math.random() * 4))),
          history: {
            cpu: [...prev.history.cpu.slice(-13), cpuUsage],
            mem: [...prev.history.mem.slice(-13), memPct],
            gpu: [...prev.history.gpu.slice(-13), gpuUsage],
            net: [...prev.history.net.slice(-13), netDown],
          },
        };
      });
    }, 1500);
    return () => window.clearInterval(id);
  }, []);

  // Keyboard shortcut: Escape unlocks display/lock screen or collapses island
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (toggles.displayOff) {
        setToggles((prev) => ({ ...prev, displayOff: false }));
        return;
      }
      if (toggles.locked && (e.key === 'Enter' || e.key === ' ')) {
        setToggles((prev) => ({ ...prev, locked: false }));
        haptic('success');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggles.displayOff, toggles.locked, haptic]);

  // Workspace sync helpers
  const syncGmail = useCallback(async (token: string) => {
    setGmailLoading(true);
    setGmailError(null);
    try {
      const msgs = await fetchRecentGmailMessages(token, 6);
      setGmailMessages(msgs);
    } catch (err) {
      setGmailError(err instanceof Error ? err.message : 'Unable to fetch Gmail messages.');
    } finally {
      setGmailLoading(false);
    }
  }, []);

  const syncGoogleTasks = useCallback(async (token: string, targetListId?: string) => {
    setTasksSyncing(true);
    setTasksError(null);
    try {
      const data = await fetchGoogleTasks(token, targetListId);
      setGoogleTaskListId(data.listId);
      setGoogleTaskListTitle(data.listTitle || 'My Tasks');
      setGoogleTaskLists(data.lists);
      setGoogleTasks(
        data.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          dueLabel: t.due ? new Date(t.due).toLocaleDateString() : data.listTitle,
          completed: t.status === 'completed',
          source: 'google-tasks',
          taskListId: data.listId,
        }))
      );
      setGoogleTasksOrderDirty(false);
    } catch (err) {
      setTasksError(err instanceof Error ? err.message : 'Unable to sync Google Tasks.');
    } finally {
      setTasksSyncing(false);
    }
  }, []);

  const handleSignInGoogle = async () => {
    haptic('tap');
    setIsSigningIn(true);
    setGmailError(null);
    setTasksError(null);
    try {
      const { user, accessToken } = await signInWithGoogleWorkspace();
      setWorkspaceUser(user);
      haptic('success');
      await Promise.all([syncGmail(accessToken), syncGoogleTasks(accessToken)]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google Sign-In failed.';
      setGmailError(message);
      setTasksError(message);
      haptic('alert');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOutGoogle = async () => {
    haptic('tap');
    await signOutWorkspace();
    setWorkspaceUser(null);
    setGmailMessages([]);
    setGoogleTasks([]);
    setGoogleTasksOrderDirty(false);
    setGoogleTaskLists([]);
    setGoogleTaskListId('@default');
    setGoogleTaskListTitle('My Tasks');
  };

  // Clipboard server sync actions
  const handleAddClipboard = async (
    content: string,
    device = 'Workstation · Windows 11',
    platform: ClipboardItem['platform'] = 'windows'
  ) => {
    try {
      const res = await fetch('/api/clipboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, device, platform }),
      });
      if (res.ok) {
        const data = await res.json();
        setClipboardItems(data.items);
        flashPillToast(`Clipboard synced · ${device}`);
        return;
      }
    } catch {
      // Fallback local update
    }
    const fallbackItem: ClipboardItem = {
      id: `clip-local-${Date.now()}`,
      content,
      category: /^https?:\/\//.test(content) ? 'link' : 'text',
      device,
      platform,
      pinned: false,
      createdAt: new Date().toISOString(),
    };
    setClipboardItems((prev) => [fallbackItem, ...prev]);
  };

  const handleTogglePinClipboard = async (id: string, pinned: boolean) => {
    setClipboardItems((prev) => prev.map((i) => (i.id === id ? { ...i, pinned } : i)));
    try {
      await fetch(`/api/clipboard/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned }),
      });
    } catch {
      // Ignore network hiccup
    }
  };

  const handleDeleteClipboard = async (id: string) => {
    setClipboardItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await fetch(`/api/clipboard/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch {
      // Ignore
    }
  };

  // Control Center quick tile handlers
  const handleToggleKey = (key: keyof QuickTogglesState) => {
    haptic('toggle');
    setToggles((prev) => {
      const nextVal = !prev[key];
      const updated = { ...prev, [key]: nextVal };
      // Keep inline drawers mutually exclusive for a sleek footprint
      if (key === 'mixerOpen' && nextVal) {
        updated.screenTimeOpen = false;
        updated.appsDrawerOpen = false;
      } else if (key === 'screenTimeOpen' && nextVal) {
        updated.mixerOpen = false;
        updated.appsDrawerOpen = false;
      } else if (key === 'appsDrawerOpen' && nextVal) {
        updated.mixerOpen = false;
        updated.screenTimeOpen = false;
      }
      return updated;
    });
  };

  const handleEmptyRecycleBin = () => {
    haptic('success');
    setToggles((prev) => ({
      ...prev,
      recycleBinCount: prev.recycleBinCount > 0 ? 0 : 4,
    }));
    flashBanner(
      toggles.recycleBinCount > 0
        ? 'Recycle Bin emptied · 428 MB reclaimed.'
        : 'Restored 4 sample items to Recycle Bin.'
    );
  };

  const handleRunCleaner = () => {
    haptic('success');
    setTelemetry((prev) => ({
      ...prev,
      memoryUsedGb: Math.max(7.2, Number((prev.memoryUsedGb - 1.1).toFixed(1))),
      appFootprintMb: Math.max(28.4, Number((prev.appFootprintMb - 2.6).toFixed(1))),
    }));
    flashBanner('System Cleaner purged shader & temp cache · 1.1 GB RAM freed.');
  };

  const handleCaptureScreen = () => {
    haptic('success');
    setCaptureFlash(true);
    window.setTimeout(() => setCaptureFlash(false), 260);
    const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    void handleAddClipboard(
      `WinLand_Capture_${stamp.replace(/[:\s]/g, '_')}.png (2560×1440 · Copied to Synced Clipboard)`,
      'Workstation · Windows 11',
      'windows'
    );
    flashBanner('Screen capture copied to Cross-Device Clipboard.');
  };

  const handleRunBenchmark = () => {
    haptic('tap');
    setBenchmarkRunning(true);
    window.setTimeout(() => {
      setTelemetry((prev) => ({
        ...prev,
        cpuUsage: 14.8,
        cpuClockGhz: 5.15,
        memoryUsedGb: Number(Math.max(8.8, prev.memoryUsedGb - 0.6).toFixed(1)),
        appFootprintMb: 32.6,
        gpuUsage: 18,
        gpuFrameTimeMs: 3.6,
        netDownMbps: 948,
        netUpMbps: 382,
        netPingMs: 7,
      }));
      setBenchmarkRunning(false);
      setLastBenchmarkAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      haptic('success');
      flashPillToast('Benchmark complete · Optimal tier');
    }, 850);
  };

  // Combined reminders list (Google Tasks + Local Reminders)
  const combinedReminders = useMemo(
    () => [...googleTasks, ...localReminders],
    [googleTasks, localReminders]
  );

  const handleAddGoogleTaskWithConfirm = (title: string) => {
    const token = getWorkspaceAccessToken();
    if (!token) {
      setTasksError('Please sign in with Google to add a task to Google Tasks.');
      return;
    }
    setConfirmDialog({
      open: true,
      title: 'Add Task to Google Tasks?',
      description: `Create a new Google Task in your account:\n\n"${title}"`,
      confirmLabel: 'Create Task',
      onConfirm: async () => {
        setConfirmBusy(true);
        try {
          const created = await createGoogleTask(token, googleTaskListId, title);
          setGoogleTasks((prev) => [
            {
              id: created.id,
              title: created.title,
              dueLabel: 'Google Tasks',
              completed: created.status === 'completed',
              source: 'google-tasks',
              taskListId: created.listId,
            },
            ...prev,
          ]);
          haptic('success');
        } catch (err) {
          setTasksError(err instanceof Error ? err.message : 'Failed to create Google Task.');
        } finally {
          setConfirmBusy(false);
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleToggleReminder = (item: ReminderItem) => {
    haptic('toggle');
    if (item.source === 'local') {
      setLocalReminders((prev) =>
        prev.map((r) => (r.id === item.id ? { ...r, completed: !r.completed } : r))
      );
      return;
    }
    const token = getWorkspaceAccessToken();
    if (!token) return;
    const nextDone = !item.completed;
    setConfirmDialog({
      open: true,
      title: nextDone ? 'Complete Google Task?' : 'Reopen Google Task?',
      description: `Update "${item.title}" in Google Tasks to ${nextDone ? 'Completed' : 'Needs Action'}?`,
      confirmLabel: 'Update Task',
      onConfirm: async () => {
        setConfirmBusy(true);
        try {
          await updateGoogleTaskStatus(token, item.taskListId || googleTaskListId, item.id, nextDone);
          setGoogleTasks((prev) =>
            prev.map((t) => (t.id === item.id ? { ...t, completed: nextDone } : t))
          );
          haptic('success');
        } catch (err) {
          setTasksError(err instanceof Error ? err.message : 'Failed to update Google Task.');
        } finally {
          setConfirmBusy(false);
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleDeleteReminder = (item: ReminderItem) => {
    haptic('tap');
    if (item.source === 'local') {
      setLocalReminders((prev) => prev.filter((r) => r.id !== item.id));
      return;
    }
    const token = getWorkspaceAccessToken();
    if (!token) return;
    setConfirmDialog({
      open: true,
      title: 'Delete Google Task?',
      description: `Permanently delete "${item.title}" from your Google Tasks list? This cannot be undone.`,
      confirmLabel: 'Delete Task',
      destructive: true,
      onConfirm: async () => {
        setConfirmBusy(true);
        try {
          await deleteGoogleTask(token, item.taskListId || googleTaskListId, item.id);
          setGoogleTasks((prev) => prev.filter((t) => t.id !== item.id));
          haptic('success');
        } catch (err) {
          setTasksError(err instanceof Error ? err.message : 'Failed to delete Google Task.');
        } finally {
          setConfirmBusy(false);
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleRequestSendEmail = (to: string, subject: string, body: string) => {
    const token = getWorkspaceAccessToken();
    if (!token) {
      setGmailError('Please sign in with Google before sending email.');
      return;
    }
    setConfirmDialog({
      open: true,
      title: 'Send Email via Gmail?',
      description: `To: ${to}\nSubject: ${subject}\n\n${body}`,
      confirmLabel: 'Send Email',
      onConfirm: async () => {
        setConfirmBusy(true);
        try {
          await sendGmailMessage(token, to, subject, body);
          haptic('success');
          flashPillToast(`Email sent to ${to}`);
        } catch (err) {
          setGmailError(err instanceof Error ? err.message : 'Failed to send email.');
        } finally {
          setConfirmBusy(false);
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleReorderReminders = useCallback(
    (nextOrder: ReminderItem[]) => {
      const nextGoogle = nextOrder.filter((item) => item.source === 'google-tasks');
      const nextLocal = nextOrder.filter((item) => item.source === 'local');
      setLocalReminders(nextLocal);
      if (nextGoogle.length > 0) {
        const orderChanged =
          nextGoogle.length !== googleTasks.length ||
          nextGoogle.some((task, idx) => googleTasks[idx]?.id !== task.id);
        setGoogleTasks(nextGoogle);
        if (orderChanged) {
          setGoogleTasksOrderDirty(true);
        }
      }
    },
    [googleTasks]
  );

  const handleSaveGoogleTasksOrder = useCallback(() => {
    const token = getWorkspaceAccessToken();
    if (!token) {
      setTasksError('Please sign in with Google to save task order.');
      return;
    }
    if (googleTasks.length === 0) return;

    setConfirmDialog({
      open: true,
      title: 'Save Google Tasks Order?',
      description: `Sync the new order of ${googleTasks.length} tasks to "${googleTaskListTitle}" in Google Tasks?`,
      confirmLabel: 'Save Order',
      onConfirm: async () => {
        setConfirmBusy(true);
        try {
          for (let i = 0; i < googleTasks.length; i++) {
            const task = googleTasks[i];
            const previousId = i > 0 ? googleTasks[i - 1].id : undefined;
            await moveGoogleTask(
              token,
              task.taskListId || googleTaskListId,
              task.id,
              previousId
            );
          }
          setGoogleTasksOrderDirty(false);
          haptic('success');
          flashPillToast(`Saved order · ${googleTaskListTitle}`);
        } catch (err) {
          setTasksError(
            err instanceof Error ? err.message : 'Failed to save Google Tasks order.'
          );
        } finally {
          setConfirmBusy(false);
          setConfirmDialog(null);
        }
      },
    });
  }, [googleTasks, googleTaskListId, googleTaskListTitle, haptic, flashPillToast]);

  const handleAskAiHandoff = (prompt: string) => {
    setIslandVanished(false);
    setExternalAiPrompt(prompt);
    setActiveTab('ai');
    setIslandExpanded(true);
  };

  const unreadCount = notifications.filter((n) => n.unread).length;
  const activePillPlugin = plugins.find((p) => p.enabled && p.slot === 'pill-right');
  const activeHeaderPlugin = plugins.find((p) => p.enabled && p.slot === 'expanded-bar');
  const activeTrayPlugin = plugins.find((p) => p.enabled && p.slot === 'tray');

  const visibleShortcuts = DESKTOP_SHORTCUTS.filter(
    (s) => toggles.hiddenFiles || !s.hidden
  );

  const islandRef = useRef<HTMLDivElement | null>(null);
  const hoverCloseTimerRef = useRef<number | null>(null);

  const cancelHoverClose = useCallback(() => {
    if (hoverCloseTimerRef.current !== null) {
      window.clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
  }, []);

  const handleIslandMouseEnter = useCallback(() => {
    cancelHoverClose();
    setIslandVanished(false);
    setIslandExpanded(true);
  }, [cancelHoverClose]);

  const handleIslandMouseLeave = useCallback(() => {
    cancelHoverClose();
    hoverCloseTimerRef.current = window.setTimeout(() => {
      const activeEl = document.activeElement;
      const isEditingField =
        activeEl instanceof HTMLElement &&
        islandRef.current?.contains(activeEl) &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName);

      if (isEditingField || confirmDialog?.open) {
        return;
      }
      setIslandExpanded(false);
    }, 260);
  }, [cancelHoverClose, confirmDialog?.open]);

  // Auto-vanish Dynamic Island after 10 seconds of compact inactivity
  useEffect(() => {
    if (islandExpanded || confirmDialog?.open || toggles.locked || toggles.displayOff) {
      setIslandVanished(false);
      return;
    }
    const vanishTimer = window.setTimeout(() => {
      setIslandVanished(true);
    }, ISLAND_VANISH_DELAY_MS);
    return () => window.clearTimeout(vanishTimer);
  }, [islandExpanded, confirmDialog?.open, toggles.locked, toggles.displayOff, pillToast]);

  useEffect(() => {
    return () => cancelHoverClose();
  }, [cancelHoverClose]);

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden select-none bg-[#e8edf5] dark:bg-[#06080c] text-zinc-900 dark:text-zinc-100 transition-colors duration-300"
      style={{ filter: `brightness(${brightness / 100})` }}
    >
      {/* Google Maps Platform Demo Key Quota Banner (Case A — Tier 1 & 2) */}
      {mapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm flex items-center justify-center gap-3">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
          <button
            type="button"
            onClick={() => setMapsQuotaExceeded(false)}
            aria-label="Dismiss quota notice"
            className="p-1 rounded hover:bg-amber-200/60"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Desktop Wallpaper Canvas */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img
          src={wallpaper}
          alt="Windows desktop wallpaper"
          referrerPolicy="no-referrer"
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            toggles.darkMode ? 'opacity-95' : 'opacity-25'
          }`}
        />
        <div
          className={`absolute inset-0 transition-colors duration-500 ${
            toggles.darkMode
              ? 'bg-gradient-to-b from-black/35 via-transparent to-black/60'
              : 'bg-gradient-to-b from-white/55 via-slate-100/45 to-slate-200/75'
          }`}
        />
      </div>

      {/* Screen Capture Shutter Flash */}
      {captureFlash && (
        <div className="fixed inset-0 z-[90] bg-white/75 pointer-events-none transition-opacity duration-150" />
      )}

      {/* Windows Desktop Shortcuts (Left Column — controlled by Desktop Icons & Hidden Files toggles) */}
      {toggles.desktopIcons && (
        <aside
          aria-label="Desktop shortcuts"
          className="fixed left-5 top-6 z-10 hidden lg:flex flex-col gap-3"
        >
          {visibleShortcuts.map((shortcut) => (
            <button
              key={shortcut.id}
              type="button"
              onClick={() => {
                haptic('tap');
                setIslandVanished(false);
                setActiveTab(shortcut.tab);
                setIslandExpanded(true);
              }}
              className={`group flex flex-col items-center gap-1.5 w-20 p-2 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ba3ff] ${
                toggles.darkMode
                  ? 'hover:bg-white/10 text-zinc-200'
                  : 'hover:bg-slate-900/10 text-slate-800'
              } ${shortcut.hidden ? 'opacity-65' : ''}`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-105 ${
                  toggles.darkMode
                    ? 'bg-black/45 border-white/10 text-[#8ba3ff]'
                    : 'bg-white/80 border-slate-300 text-slate-700'
                }`}
              >
                <FolderOpen className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-medium leading-tight text-center drop-shadow-sm">
                {shortcut.label}
              </span>
            </button>
          ))}
        </aside>
      )}

      {/* Invisible Top-Center Hover Detection Zone (wakes Dynamic Island after 10s auto-vanish) */}
      {islandVanished && !islandExpanded && (
        <div
          data-testid="island-hover-zone"
          role="button"
          tabIndex={0}
          aria-label="Hover or activate to reveal WinLand Dynamic Island"
          onMouseEnter={handleIslandMouseEnter}
          onFocus={handleIslandMouseEnter}
          onClick={handleIslandMouseEnter}
          className="fixed top-0 left-1/2 -translate-x-1/2 z-30 w-[440px] max-w-[92vw] h-16 cursor-pointer"
        />
      )}

      {/* Main Dynamic Island Floating Dock (Top-Center Anchor) */}
      <main className="relative z-20 flex flex-col items-center pt-4 pb-20 px-3 sm:px-6 min-h-screen">
        <motion.div
          ref={islandRef}
          data-testid="dynamic-island-shell"
          data-vanished={islandVanished && !islandExpanded ? 'true' : 'false'}
          layout
          initial={false}
          animate={
            islandVanished && !islandExpanded
              ? { opacity: 0, y: -28, scale: 0.92 }
              : { opacity: 1, y: 0, scale: 1 }
          }
          onMouseEnter={handleIslandMouseEnter}
          onMouseLeave={handleIslandMouseLeave}
          transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.78 }}
          className={`bg-[#050608]/95 backdrop-blur-2xl border border-white/[0.09] shadow-[0_24px_80px_rgba(0,0,0,0.65)] text-zinc-100 overflow-hidden ${
            islandExpanded
              ? 'w-full max-w-[940px] rounded-[28px]'
              : 'w-auto max-w-[94vw] rounded-full cursor-pointer'
          } ${islandVanished && !islandExpanded ? 'pointer-events-none' : ''}`}
        >
          <AnimatePresence mode="wait" initial={false}>
            {!islandExpanded ? (
              /* COMPACT DYNAMIC ISLAND PILL STATE */
              <motion.div
                key="compact-pill"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.16 }}
                className="flex items-center gap-3 px-3 py-2"
              >
                {/* Live Album Art + Quick Play/Pause */}
                <button
                  type="button"
                  onClick={() => {
                    haptic('tap');
                    setIsPlaying((p) => !p);
                  }}
                  aria-label={isPlaying ? 'Pause active track' : 'Play active track'}
                  className="relative w-7 h-7 rounded-full overflow-hidden shrink-0 border border-white/15 group"
                >
                  <img
                    src={activeTrack.coverUrl}
                    alt={activeTrack.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    {isPlaying ? (
                      <Pause className="w-3 h-3 text-white fill-current" />
                    ) : (
                      <Play className="w-3 h-3 text-white fill-current ml-0.5" />
                    )}
                  </span>
                </button>

                {/* Primary Live Context Readout */}
                <button
                  type="button"
                  onClick={() => {
                    haptic('tap');
                    setIslandExpanded(true);
                  }}
                  className="flex items-center gap-2.5 text-left pr-1"
                  aria-label="Expand WinLand Dynamic Island"
                >
                  {pillToast ? (
                    <span className="text-xs font-medium text-emerald-300 whitespace-nowrap max-w-[240px] truncate">
                      {pillToast}
                    </span>
                  ) : timerRunning ? (
                    <div className="flex items-center gap-2">
                      <Timer className="w-3.5 h-3.5 text-[#8ba3ff]" />
                      <span className="font-mono-tabular text-xs font-semibold text-white">
                        {formatDuration(timerSecondsLeft)}
                      </span>
                      <span className="text-[11px] text-zinc-400 hidden sm:inline">
                        {timerLabel}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white whitespace-nowrap max-w-[140px] truncate">
                        {activeTrack.title}
                      </span>
                      <span className="text-[11px] text-zinc-400 hidden sm:inline whitespace-nowrap">
                        {activeTrack.artist}
                      </span>
                    </div>
                  )}

                  {/* Active Pill-Right Custom Widget Plugin */}
                  {activePillPlugin && (
                    <span className="hidden md:inline-flex items-center gap-1.5 pl-2.5 border-l border-white/10 text-[11px] whitespace-nowrap">
                      <span className="text-zinc-400">{activePillPlugin.metricLabel}</span>
                      <span
                        className="font-mono-tabular font-semibold"
                        style={{ color: activePillPlugin.accentColor }}
                      >
                        {activePillPlugin.metricValue}
                      </span>
                    </span>
                  )}
                </button>

                {/* Expand Chevron */}
                <button
                  type="button"
                  onClick={() => {
                    haptic('tap');
                    setIslandExpanded(true);
                  }}
                  aria-label="Open Dynamic Island panel"
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/15 text-zinc-200 transition-colors"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ) : (
              /* EXPANDED DYNAMIC ISLAND PANEL */
              <motion.div
                key="expanded-panel"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="p-4 sm:p-5 space-y-4"
              >
                {/* Top Island Bar: Brand + Live Pill Readout + Collapse */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-bold tracking-tight text-white whitespace-nowrap shrink-0">
                      WinLand
                    </span>
                    <span className="text-xs text-zinc-500 hidden sm:inline" aria-hidden="true">
                      ·
                    </span>
                    {timerRunning ? (
                      <button
                        type="button"
                        onClick={() => setActiveTab('timers')}
                        className="inline-flex items-center gap-1.5 text-xs text-[#8ba3ff] font-mono-tabular whitespace-nowrap"
                      >
                        <Timer className="w-3.5 h-3.5" />
                        <span>{formatDuration(timerSecondsLeft)}</span>
                      </button>
                    ) : activeHeaderPlugin ? (
                      <span className="text-xs text-zinc-400 truncate hidden sm:inline">
                        {activeHeaderPlugin.metricLabel}{' '}
                        <span
                          className="font-mono-tabular font-medium"
                          style={{ color: activeHeaderPlugin.accentColor }}
                        >
                          {activeHeaderPlugin.metricValue}
                        </span>
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400 hidden sm:inline truncate">
                        Windows Dynamic Island
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {activePillPlugin && (
                      <button
                        type="button"
                        onClick={() => {
                          haptic('tap');
                          setActiveTab('plugins');
                        }}
                        className="hidden md:inline-flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors whitespace-nowrap"
                      >
                        <span>{activePillPlugin.metricLabel}</span>
                        <span
                          className="font-mono-tabular font-semibold"
                          style={{ color: activePillPlugin.accentColor }}
                        >
                          {activePillPlugin.metricValue}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        haptic('tap');
                        setIslandExpanded(false);
                      }}
                      aria-label="Collapse Dynamic Island to compact pill"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.07] hover:bg-white/[0.13] text-zinc-300 hover:text-white text-[11px] font-medium transition-colors whitespace-nowrap"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Compact</span>
                    </button>
                  </div>
                </div>

                {/* Single-line Horizontal Module Tabs */}
                <nav
                  aria-label="Dynamic Island modules"
                  className="flex items-center gap-1 overflow-x-auto island-scroll pb-1 -mx-1 px-1"
                >
                  {ISLAND_TABS.map((tab) => {
                    const selected = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          haptic('tap');
                          setActiveTab(tab.id);
                        }}
                        aria-current={selected ? 'page' : undefined}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ba3ff] ${
                          selected
                            ? 'bg-[#1b1f2a] text-white border border-white/10'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                        }`}
                      >
                        {tab.icon}
                        <span>{tab.label}</span>
                        {tab.id === 'notifications' && unreadCount > 0 && (
                          <span className="font-mono-tabular text-[10px] text-[#8ba3ff]">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>

                {/* Active Panel Viewport */}
                <div className="pt-0.5">
                  {activeTab === 'home' && (
                    <HomePanel
                      activeTrack={activeTrack}
                      isPlaying={isPlaying}
                      trackProgressSec={trackProgressSec}
                      onTogglePlay={() => {
                        haptic('tap');
                        setIsPlaying((p) => !p);
                      }}
                      onPrevTrack={() => {
                        haptic('tap');
                        setTrackIdx((i) => (i - 1 + MUSIC_TRACKS.length) % MUSIC_TRACKS.length);
                        setTrackProgressSec(0);
                      }}
                      onNextTrack={() => {
                        haptic('tap');
                        setTrackIdx((i) => (i + 1) % MUSIC_TRACKS.length);
                        setTrackProgressSec(0);
                      }}
                      timerSecondsLeft={timerSecondsLeft}
                      timerRunning={timerRunning}
                      timerLabel={timerLabel}
                      onStartPauseTimer={() => {
                        haptic('tap');
                        setTimerRunning((r) => !r);
                      }}
                      reminders={combinedReminders}
                      isGoogleConnected={Boolean(workspaceUser)}
                      googleTaskListTitle={googleTaskListTitle}
                      telemetry={telemetry}
                      latestClipboardItem={clipboardItems[0]}
                      unreadNotificationsCount={unreadCount}
                      activePlugins={plugins.filter((p) => p.enabled)}
                      onNavigateTab={(tab) => {
                        haptic('tap');
                        setActiveTab(tab);
                      }}
                      onHaptic={haptic}
                    />
                  )}

                  {activeTab === 'control' && (
                    <ControlCenterPanel
                      volume={volume}
                      brightness={brightness}
                      onVolumeChange={setVolume}
                      onBrightnessChange={setBrightness}
                      toggles={toggles}
                      onToggleKey={handleToggleKey}
                      onEmptyRecycleBin={handleEmptyRecycleBin}
                      onRunCleaner={handleRunCleaner}
                      onCaptureScreen={handleCaptureScreen}
                      onNavigateTab={(tab) => {
                        haptic('tap');
                        setActiveTab(tab);
                      }}
                      activeTrack={activeTrack}
                      isPlaying={isPlaying}
                      trackProgressSec={trackProgressSec}
                      onTogglePlay={() => {
                        haptic('tap');
                        setIsPlaying((p) => !p);
                      }}
                      onPrevTrack={() => {
                        haptic('tap');
                        setTrackIdx((i) => (i - 1 + MUSIC_TRACKS.length) % MUSIC_TRACKS.length);
                        setTrackProgressSec(0);
                      }}
                      onNextTrack={() => {
                        haptic('tap');
                        setTrackIdx((i) => (i + 1) % MUSIC_TRACKS.length);
                        setTrackProgressSec(0);
                      }}
                      onSeekTrack={setTrackProgressSec}
                      appVolumes={appVolumes}
                      onAppVolumeChange={(appName, val) =>
                        setAppVolumes((prev) => ({ ...prev, [appName]: val }))
                      }
                      unreadNotificationsCount={unreadCount}
                      statusBanner={statusBanner}
                    />
                  )}

                  {activeTab === 'ai' && (
                    <AiHubPanel
                      messages={chatMessages}
                      onMessagesChange={setChatMessages}
                      onNewConversation={handleNewConversation}
                      selectedModel={chatModel}
                      onSelectModel={setChatModel}
                      selectedRole={chatRole}
                      onSelectRole={setChatRole}
                      useSearchGrounding={useSearchGrounding}
                      onToggleSearchGrounding={() => setUseSearchGrounding((v) => !v)}
                      useMapsGrounding={useMapsGrounding}
                      onToggleMapsGrounding={() => setUseMapsGrounding((v) => !v)}
                      chatInput={chatInput}
                      onChatInputChange={setChatInput}
                      externalPrompt={externalAiPrompt}
                      onClearExternalPrompt={() => setExternalAiPrompt(null)}
                      userCoords={userCoords}
                      onHaptic={haptic}
                    />
                  )}

                  {activeTab === 'media' && (
                    <MediaStudioPanel
                      onApplyWallpaper={(url) => {
                        setWallpaper(url);
                        flashPillToast('Desktop wallpaper updated');
                      }}
                      onHaptic={haptic}
                    />
                  )}

                  {activeTab === 'clipboard' && (
                    <ClipboardPanel
                      items={clipboardItems}
                      onAddItem={handleAddClipboard}
                      onTogglePin={handleTogglePinClipboard}
                      onDeleteItem={handleDeleteClipboard}
                      onAskAi={handleAskAiHandoff}
                      onHaptic={haptic}
                    />
                  )}

                  {activeTab === 'files' && (
                    <FileSearchPanel
                      files={indexedFiles}
                      includeHidden={toggles.hiddenFiles}
                      onToggleHidden={() => handleToggleKey('hiddenFiles')}
                      onIndexLocalFile={(file) => {
                        setIndexedFiles((prev) => {
                          const next = [file, ...prev];
                          try {
                            const customOnly = next.filter((f) => f.id.startsWith('local-'));
                            localStorage.setItem(STORAGE_KEYS.files, JSON.stringify(customOnly));
                          } catch {
                            // Ignore
                          }
                          return next;
                        });
                      }}
                      onCopyToClipboard={(text) => {
                        navigator.clipboard?.writeText(text).catch(() => {});
                        void handleAddClipboard(text.slice(0, 220), 'Workstation · Windows 11', 'windows');
                      }}
                      onAskAi={handleAskAiHandoff}
                      onHaptic={haptic}
                    />
                  )}

                  {activeTab === 'timers' && (
                    <TimersTasksPanel
                      timerSecondsLeft={timerSecondsLeft}
                      timerRunning={timerRunning}
                      timerLabel={timerLabel}
                      onStartPauseTimer={() => {
                        haptic('tap');
                        setTimerRunning((r) => !r);
                      }}
                      onResetTimer={() => {
                        haptic('tap');
                        setTimerRunning(false);
                        setTimerSecondsLeft(timerDurationSec);
                      }}
                      onSelectPreset={(seconds, label) => {
                        setTimerRunning(false);
                        setTimerDurationSec(seconds);
                        setTimerSecondsLeft(seconds);
                        setTimerLabel(label);
                      }}
                      reminders={combinedReminders}
                      onAddLocalReminder={(title, dueLabel) => {
                        setLocalReminders((prev) => [
                          {
                            id: `rem-${Date.now()}`,
                            title,
                            dueLabel,
                            completed: false,
                            source: 'local',
                          },
                          ...prev,
                        ]);
                      }}
                      onToggleReminder={handleToggleReminder}
                      onDeleteReminder={handleDeleteReminder}
                      onReorderReminders={handleReorderReminders}
                      googleTasksOrderDirty={googleTasksOrderDirty}
                      onSaveGoogleTasksOrder={handleSaveGoogleTasksOrder}
                      workspaceUser={workspaceUser}
                      isSigningIn={isSigningIn}
                      onSignInGoogle={handleSignInGoogle}
                      onSignOutGoogle={handleSignOutGoogle}
                      onSyncGoogleTasks={() => {
                        const tok = getWorkspaceAccessToken();
                        if (tok) void syncGoogleTasks(tok, googleTaskListId);
                      }}
                      tasksSyncing={tasksSyncing}
                      tasksError={tasksError}
                      googleTaskListTitle={googleTaskListTitle}
                      activeGoogleTaskListId={googleTaskListId}
                      googleTaskLists={googleTaskLists}
                      onSelectGoogleTaskList={(nextListId) => {
                        setGoogleTaskListId(nextListId);
                        const tok = getWorkspaceAccessToken();
                        if (tok) void syncGoogleTasks(tok, nextListId);
                      }}
                      onAddGoogleTask={handleAddGoogleTaskWithConfirm}
                      onHaptic={haptic}
                    />
                  )}

                  {activeTab === 'notifications' && (
                    <NotificationsGmailPanel
                      notifications={notifications}
                      dnd={toggles.dnd}
                      onToggleDnd={() => handleToggleKey('dnd')}
                      onMarkAllRead={() => {
                        haptic('tap');
                        setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
                      }}
                      onDismissNotification={(id) =>
                        setNotifications((prev) => prev.filter((n) => n.id !== id))
                      }
                      onSimulateIncoming={() => {
                        haptic('alert');
                        const incoming: NotificationItem = {
                          id: `sim-${Date.now()}`,
                          app: 'Mobile Handoff',
                          title: 'New clipboard & alert ping',
                          body: 'iPhone 16 Pro synced an urgent deployment note to Windows.',
                          timeLabel: 'Just now',
                          unread: true,
                          category: 'sync',
                        };
                        setNotifications((prev) => [incoming, ...prev]);
                        flashPillToast('Incoming alert · Mobile Handoff');
                      }}
                      workspaceUser={workspaceUser}
                      isSigningIn={isSigningIn}
                      onSignInGoogle={handleSignInGoogle}
                      onSignOutGoogle={handleSignOutGoogle}
                      gmailMessages={gmailMessages}
                      gmailLoading={gmailLoading}
                      gmailError={gmailError}
                      onRefreshGmail={() => {
                        const tok = getWorkspaceAccessToken();
                        if (tok) void syncGmail(tok);
                      }}
                      onRequestSendEmail={handleRequestSendEmail}
                      onHaptic={haptic}
                    />
                  )}

                  {activeTab === 'system' && (
                    <SystemBenchmarksPanel
                      telemetry={telemetry}
                      benchmarkRunning={benchmarkRunning}
                      lastBenchmarkAt={lastBenchmarkAt}
                      onRunBenchmark={handleRunBenchmark}
                    />
                  )}

                  {activeTab === 'weather' && (
                    <WeatherMapsPanel
                      mapsApiKey={mapsApiKey}
                      userCoords={userCoords}
                      onUpdateCoords={setUserCoords}
                      onAskMapsAi={handleAskAiHandoff}
                      onHaptic={haptic}
                      darkMode={toggles.darkMode}
                    />
                  )}

                  {activeTab === 'plugins' && (
                    <PluginsLayoutPanel
                      plugins={plugins}
                      onTogglePlugin={(id) =>
                        setPlugins((prev) =>
                          prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
                        )
                      }
                      onAddPlugin={(plugin) => setPlugins((prev) => [plugin, ...prev])}
                      onDeletePlugin={(id) =>
                        setPlugins((prev) => prev.filter((p) => p.id !== id))
                      }
                      onTriggerPluginAction={(plugin) => {
                        flashPillToast(`${plugin.name} · ${plugin.actionLabel} executed`);
                      }}
                      hapticsEnabled={toggles.hapticsEnabled}
                      onToggleHaptics={() => handleToggleKey('hapticsEnabled')}
                      onHaptic={haptic}
                    />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      {/* Minimal Windows 11 Desktop Taskbar */}
      <footer
        className={`fixed bottom-0 inset-x-0 z-30 h-12 px-4 flex items-center justify-between border-t backdrop-blur-xl transition-colors ${
          toggles.darkMode
            ? 'bg-[#090b10]/85 border-white/[0.08] text-zinc-200'
            : 'bg-white/80 border-slate-300/80 text-slate-800'
        }`}
      >
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => {
              haptic('tap');
              setIslandVanished(false);
              setActiveTab('weather');
              setIslandExpanded(true);
            }}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <CloudSun className="w-4 h-4 text-[#8ba3ff]" />
            <span className="font-mono-tabular font-medium">18°C</span>
          </button>
        </div>

        {/* Centered Taskbar App Pins */}
        <div className="flex items-center gap-1.5">
          {(
            [
              ['control', 'Controls', <Sliders className="w-4 h-4" key="c" />],
              ['ai', 'AI Copilot', <Sparkles className="w-4 h-4" key="a" />],
              ['clipboard', 'Clipboard', <ClipboardList className="w-4 h-4" key="cb" />],
              ['files', 'File Search', <Search className="w-4 h-4" key="f" />],
              ['system', 'Benchmarks', <Cpu className="w-4 h-4" key="s" />],
            ] as Array<[IslandTab, string, React.ReactNode]>
          ).map(([tabId, label, icon]) => {
            const isCurrent = islandExpanded && activeTab === tabId;
            return (
              <button
                key={tabId}
                type="button"
                onClick={() => {
                  haptic('tap');
                  setIslandVanished(false);
                  if (islandExpanded && activeTab === tabId) {
                    setIslandExpanded(false);
                  } else {
                    setActiveTab(tabId);
                    setIslandExpanded(true);
                  }
                }}
                aria-label={`Open ${label}`}
                className={`relative p-2 rounded-lg transition-colors ${
                  isCurrent
                    ? toggles.darkMode
                      ? 'bg-white/12 text-white'
                      : 'bg-slate-900/12 text-slate-900'
                    : toggles.darkMode
                      ? 'hover:bg-white/10 text-zinc-300'
                      : 'hover:bg-slate-900/10 text-slate-700'
                }`}
              >
                {icon}
                {isCurrent && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-3.5 h-0.5 rounded-full bg-[#8ba3ff]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Right System Tray */}
        <div className="flex items-center gap-3 text-xs">
          {activeTrayPlugin && (
            <span className="hidden md:inline text-[11px] text-zinc-400">
              {activeTrayPlugin.metricLabel}:{' '}
              <span className="font-mono-tabular" style={{ color: activeTrayPlugin.accentColor }}>
                {activeTrayPlugin.metricValue}
              </span>
            </span>
          )}
          <div className="hidden sm:flex items-center gap-2 text-zinc-400" aria-hidden="true">
            <Wifi className="w-3.5 h-3.5" />
            <Volume2 className="w-3.5 h-3.5" />
            <BatteryCharging className="w-3.5 h-3.5" />
          </div>
          <div className="text-right leading-tight">
            <p className="font-mono-tabular text-[11px] font-medium">
              {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="font-mono-tabular text-[10px] text-zinc-400">
              {now.toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>
      </footer>

      {/* Lock Screen Overlay */}
      {toggles.locked && (
        <div
          className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-2xl flex flex-col items-center justify-center text-white p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Windows Lock Screen"
        >
          <p className="font-mono-tabular text-6xl font-semibold tracking-tight">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="mt-2 text-sm text-zinc-300">
            {now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <button
            type="button"
            onClick={() => {
              haptic('success');
              setToggles((prev) => ({ ...prev, locked: false }));
            }}
            className="mt-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Unlock WinLand</span>
          </button>
        </div>
      )}

      {/* Display Off OLED Standby Overlay */}
      {toggles.displayOff && (
        <button
          type="button"
          onClick={() => {
            haptic('tap');
            setToggles((prev) => ({ ...prev, displayOff: false }));
          }}
          className="fixed inset-0 z-[80] bg-black flex flex-col items-center justify-center text-zinc-500 text-xs cursor-pointer"
          aria-label="Wake display"
        >
          <span>Display standby · Click or press any key to wake</span>
        </button>
      )}

      {/* Workspace Mutation Confirmation Modal */}
      <ConfirmDialog
        dialog={confirmDialog}
        busy={confirmBusy}
        onClose={() => {
          if (!confirmBusy) setConfirmDialog(null);
        }}
      />
    </div>
  );
}
