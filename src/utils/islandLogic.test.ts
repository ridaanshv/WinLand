import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDuration,
  filterClipboardItems,
  calculateBenchmarkSummary,
  validatePluginDraft,
  createPluginFromDraft,
  calculateTaskProgress,
  reorderListByIds,
} from './islandLogic';
import type { ClipboardItem, HardwareTelemetry, ReminderItem } from '../types/island';

test('formatDuration formats mm:ss and hh:mm:ss cleanly', () => {
  assert.equal(formatDuration(0), '00:00');
  assert.equal(formatDuration(65), '01:05');
  assert.equal(formatDuration(3661), '1:01:01');
  assert.equal(formatDuration(-10), '00:00');
});

test('filterClipboardItems pins items first and filters by query and category', () => {
  const items: ClipboardItem[] = [
    {
      id: '1',
      content: 'https://winland.dev',
      category: 'link',
      device: 'iPhone',
      platform: 'ios',
      pinned: false,
      createdAt: '2026-11-21T10:05:00.000Z',
    },
    {
      id: '2',
      content: 'const x = 42;',
      category: 'code',
      device: 'Windows 11',
      platform: 'windows',
      pinned: true,
      createdAt: '2026-11-21T10:00:00.000Z',
    },
  ];

  const all = filterClipboardItems(items, '', 'all');
  assert.equal(all[0].id, '2'); // pinned first
  assert.equal(filterClipboardItems(items, 'iphone', 'all').length, 1);
  assert.equal(filterClipboardItems(items, '', 'link').length, 1);
  assert.equal(filterClipboardItems(items, '', 'pinned').length, 1);
});

test('calculateBenchmarkSummary computes deterministic hardware scores', () => {
  const telemetry: HardwareTelemetry = {
    cpuUsage: 18,
    cpuClockGhz: 4.8,
    cpuTempC: 52,
    coreLoads: [14, 22, 16, 19, 12, 24, 15, 20],
    memoryUsedGb: 11.2,
    memoryTotalGb: 32,
    appFootprintMb: 34,
    gpuUsage: 21,
    gpuVramUsedGb: 3.1,
    gpuVramTotalGb: 12,
    gpuFrameTimeMs: 4.2,
    netDownMbps: 840,
    netUpMbps: 310,
    netPingMs: 9,
    history: { cpu: [18], mem: [35], gpu: [21], net: [840] },
  };
  const summary = calculateBenchmarkSummary(telemetry);
  assert.equal(summary.tier, 'Optimal');
  assert.ok(summary.compositeScore > 2500);
});

test('validatePluginDraft rejects invalid input and creates valid custom plugins', () => {
  const bad = validatePluginDraft({
    name: 'A',
    author: 'Dev',
    metricLabel: 'PRs',
    metricValue: '3',
    slot: 'pill-right',
    accentColor: 'blue',
    description: '',
  });
  assert.equal(bad.valid, false);

  const good = validatePluginDraft({
    name: 'CI Pipeline',
    author: 'Dev',
    metricLabel: 'Build',
    metricValue: 'Passing',
    slot: 'pill-right',
    accentColor: '#34d399',
    description: 'Tracks GitHub Actions builds',
  });
  assert.equal(good.valid, true);

  const plugin = createPluginFromDraft({
    name: 'CI Pipeline',
    author: 'Dev',
    metricLabel: 'Build',
    metricValue: 'Passing',
    slot: 'pill-right',
    accentColor: '#34d399',
    description: 'Tracks GitHub Actions builds',
  });
  assert.equal(plugin.custom, true);
  assert.equal(plugin.enabled, true);
  assert.equal(plugin.name, 'CI Pipeline');
});

test('calculateTaskProgress computes completed vs incomplete percentages for Google Tasks and local lists', () => {
  const mixed: ReminderItem[] = [
    { id: 'g1', title: 'Ship build', dueLabel: 'My Tasks', completed: true, source: 'google-tasks' },
    { id: 'g2', title: 'Write docs', dueLabel: 'My Tasks', completed: true, source: 'google-tasks' },
    { id: 'g3', title: 'QA pass', dueLabel: 'My Tasks', completed: false, source: 'google-tasks' },
    { id: 'l1', title: 'Local memo', dueLabel: 'Today', completed: false, source: 'local' },
  ];

  const googleSummary = calculateTaskProgress(mixed, true);
  assert.equal(googleSummary.scope, 'google-tasks');
  assert.equal(googleSummary.total, 3);
  assert.equal(googleSummary.completed, 2);
  assert.equal(googleSummary.incomplete, 1);
  assert.equal(googleSummary.percentCompleted, 67);
  assert.equal(googleSummary.percentIncomplete, 33);

  const localOnly: ReminderItem[] = [
    { id: 'l1', title: 'Task A', dueLabel: 'Today', completed: true, source: 'local' },
    { id: 'l2', title: 'Task B', dueLabel: 'Today', completed: false, source: 'local' },
    { id: 'l3', title: 'Task C', dueLabel: 'Today', completed: false, source: 'local' },
  ];
  const localSummary = calculateTaskProgress(localOnly, false);
  assert.equal(localSummary.scope, 'local');
  assert.equal(localSummary.percentCompleted, 33);
  assert.equal(localSummary.percentIncomplete, 67);

  const emptySummary = calculateTaskProgress([], true);
  assert.equal(emptySummary.total, 0);
  assert.equal(emptySummary.percentCompleted, 0);
  assert.equal(emptySummary.percentIncomplete, 0);

  const multiList: ReminderItem[] = [
    { id: 'a1', title: 'List A done', dueLabel: 'Work', completed: true, source: 'google-tasks', taskListId: 'list-a' },
    { id: 'a2', title: 'List A open', dueLabel: 'Work', completed: false, source: 'google-tasks', taskListId: 'list-a' },
    { id: 'b1', title: 'List B done', dueLabel: 'Home', completed: true, source: 'google-tasks', taskListId: 'list-b' },
  ];
  const activeListSummary = calculateTaskProgress(multiList, true, 'list-a');
  assert.equal(activeListSummary.total, 2);
  assert.equal(activeListSummary.completed, 1);
  assert.equal(activeListSummary.percentCompleted, 50);
});

test('reorderListByIds reorders tasks cleanly while preserving any unmentioned items', () => {
  const tasks = [
    { id: 't1', title: 'First' },
    { id: 't2', title: 'Second' },
    { id: 't3', title: 'Third' },
  ];
  const reordered = reorderListByIds(tasks, ['t3', 't1', 't2']);
  assert.deepEqual(
    reordered.map((t) => t.id),
    ['t3', 't1', 't2']
  );

  const partial = reorderListByIds(tasks, ['t2']);
  assert.deepEqual(
    partial.map((t) => t.id),
    ['t2', 't1', 't3']
  );
});
