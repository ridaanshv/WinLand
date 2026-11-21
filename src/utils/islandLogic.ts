import type { ClipboardItem, HardwareTelemetry, ReminderItem, WidgetPlugin } from '../types/island';

export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
}

export function filterClipboardItems(
  items: ClipboardItem[],
  query: string,
  category: 'all' | 'text' | 'code' | 'link' | 'pinned'
): ClipboardItem[] {
  const q = query.trim().toLowerCase();
  return [...items]
    .filter((item) => {
      if (category === 'pinned' && !item.pinned) return false;
      if (category !== 'all' && category !== 'pinned' && item.category !== category) return false;
      if (!q) return true;
      return (
        item.content.toLowerCase().includes(q) ||
        item.device.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

export interface BenchmarkSummary {
  compositeScore: number;
  cpuScore: number;
  memoryScore: number;
  gpuScore: number;
  networkScore: number;
  tier: 'Optimal' | 'Balanced' | 'Under Load';
}

export function calculateBenchmarkSummary(telemetry: HardwareTelemetry): BenchmarkSummary {
  // Higher headroom + clock + network throughput yield higher composite workstation scores
  const cpuHeadroom = Math.max(10, 100 - telemetry.cpuUsage * 0.65);
  const cpuScore = Math.round(cpuHeadroom * 18 + telemetry.cpuClockGhz * 420);

  const memFreeRatio = Math.max(
    0.05,
    (telemetry.memoryTotalGb - telemetry.memoryUsedGb) / Math.max(1, telemetry.memoryTotalGb)
  );
  const footprintBonus = Math.max(0, 120 - telemetry.appFootprintMb) * 4;
  const memoryScore = Math.round(memFreeRatio * 2400 + footprintBonus);

  const gpuEfficiency = Math.max(12, 100 - telemetry.gpuFrameTimeMs * 3.5);
  const gpuScore = Math.round(gpuEfficiency * 28 + (100 - telemetry.gpuUsage * 0.4) * 12);

  const networkScore = Math.round(
    Math.min(3000, telemetry.netDownMbps * 2.2 + telemetry.netUpMbps * 1.6) -
      Math.min(250, telemetry.netPingMs * 4)
  );

  const compositeScore = Math.round(
    cpuScore * 0.3 + memoryScore * 0.25 + gpuScore * 0.25 + Math.max(200, networkScore) * 0.2
  );

  const tier: BenchmarkSummary['tier'] =
    compositeScore >= 2450 ? 'Optimal' : compositeScore >= 1950 ? 'Balanced' : 'Under Load';

  return {
    compositeScore,
    cpuScore,
    memoryScore,
    gpuScore,
    networkScore: Math.max(200, networkScore),
    tier,
  };
}

export interface PluginDraft {
  name: string;
  author: string;
  metricLabel: string;
  metricValue: string;
  slot: WidgetPlugin['slot'];
  accentColor: string;
  description: string;
}

export function validatePluginDraft(draft: PluginDraft): { valid: boolean; error?: string } {
  if (!draft.name.trim() || draft.name.trim().length < 2) {
    return { valid: false, error: 'Plugin name must be at least 2 characters.' };
  }
  if (!draft.metricLabel.trim() || !draft.metricValue.trim()) {
    return { valid: false, error: 'Both a metric label and live value are required.' };
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(draft.accentColor.trim())) {
    return { valid: false, error: 'Accent color must be a 6-digit hex code (e.g. #34d399).' };
  }
  return { valid: true };
}

export function createPluginFromDraft(draft: PluginDraft): WidgetPlugin {
  return {
    id: `plugin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: draft.name.trim(),
    author: draft.author.trim() || 'Local Developer',
    version: '1.0.0',
    slot: draft.slot,
    metricLabel: draft.metricLabel.trim(),
    metricValue: draft.metricValue.trim(),
    accentColor: draft.accentColor.trim(),
    enabled: true,
    description: draft.description.trim() || 'Custom developer widget plugin registered in WinLand SDK.',
    actionLabel: 'Trigger Hook',
    custom: true,
  };
}

export interface TaskProgressSummary {
  total: number;
  completed: number;
  incomplete: number;
  percentCompleted: number;
  percentIncomplete: number;
  scope: 'google-tasks' | 'local';
}

export function calculateTaskProgress(
  reminders: ReminderItem[],
  isGoogleConnected: boolean,
  activeTaskListId?: string
): TaskProgressSummary {
  const googleOnly = reminders.filter((item) => {
    if (item.source !== 'google-tasks') return false;
    if (activeTaskListId && activeTaskListId !== '@default' && item.taskListId) {
      return item.taskListId === activeTaskListId;
    }
    return true;
  });
  const useGoogleScope = isGoogleConnected || googleOnly.length > 0;
  const scopedItems = useGoogleScope ? googleOnly : reminders;

  const total = scopedItems.length;
  const completed = scopedItems.filter((item) => item.completed).length;
  const incomplete = total - completed;
  const percentCompleted = total === 0 ? 0 : Math.round((completed / total) * 100);
  const percentIncomplete = total === 0 ? 0 : 100 - percentCompleted;

  return {
    total,
    completed,
    incomplete,
    percentCompleted,
    percentIncomplete,
    scope: useGoogleScope ? 'google-tasks' : 'local',
  };
}

export function reorderListByIds<T extends { id: string }>(
  items: T[],
  orderedIds: string[]
): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const result: T[] = [];
  const seen = new Set<string>();

  for (const id of orderedIds) {
    const found = byId.get(id);
    if (found && !seen.has(id)) {
      result.push(found);
      seen.add(id);
    }
  }
  for (const item of items) {
    if (!seen.has(item.id)) {
      result.push(item);
    }
  }
  return result;
}
