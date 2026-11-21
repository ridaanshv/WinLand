import React, { useState } from 'react';
import { Reorder, useDragControls } from 'motion/react';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  RefreshCw,
  Clock,
  GripVertical,
  Save,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type { ReminderItem } from '../types/island';
import type { GoogleTaskListOption } from '../utils/workspaceAuth';
import { calculateTaskProgress, formatDuration } from '../utils/islandLogic';
import { GoogleSignInButton } from './GoogleSignInButton';

interface TimersTasksPanelProps {
  timerSecondsLeft: number;
  timerRunning: boolean;
  timerLabel: string;
  onStartPauseTimer: () => void;
  onResetTimer: () => void;
  onSelectPreset: (seconds: number, label: string) => void;
  reminders: ReminderItem[];
  onAddLocalReminder: (title: string, dueLabel: string) => void;
  onToggleReminder: (item: ReminderItem) => void;
  onDeleteReminder: (item: ReminderItem) => void;
  onReorderReminders: (nextOrder: ReminderItem[]) => void;
  googleTasksOrderDirty: boolean;
  onSaveGoogleTasksOrder: () => void;
  workspaceUser: User | null;
  isSigningIn: boolean;
  onSignInGoogle: () => void;
  onSignOutGoogle: () => void;
  onSyncGoogleTasks: () => void;
  tasksSyncing: boolean;
  tasksError: string | null;
  googleTaskListTitle: string;
  activeGoogleTaskListId: string;
  googleTaskLists: GoogleTaskListOption[];
  onSelectGoogleTaskList: (listId: string) => void;
  onAddGoogleTask: (title: string) => void;
  onHaptic: (style?: 'tap' | 'toggle' | 'success' | 'alert') => void;
}

const TIMER_PRESETS = [
  { label: '1m Quick', seconds: 60 },
  { label: '5m Break', seconds: 300 },
  { label: '15m Sprint', seconds: 900 },
  { label: '25m Focus', seconds: 1500 },
];

interface DraggableTaskRowProps {
  rem: ReminderItem;
  index: number;
  total: number;
  onToggle: (item: ReminderItem) => void;
  onDelete: (item: ReminderItem) => void;
  onMoveByKeyboard: (index: number, delta: -1 | 1) => void;
  onHaptic: (style?: 'tap' | 'toggle' | 'success' | 'alert') => void;
}

const DraggableTaskRow: React.FC<DraggableTaskRowProps> = ({
  rem,
  index,
  total,
  onToggle,
  onDelete,
  onMoveByKeyboard,
  onHaptic,
}) => {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={rem}
      id={rem.id}
      dragListener={false}
      dragControls={dragControls}
      whileDrag={{
        scale: 1.02,
        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.55)',
        zIndex: 25,
      }}
      transition={{ type: 'spring', stiffness: 460, damping: 36 }}
      data-testid={`task-row-${rem.id}`}
      className="relative flex items-center justify-between gap-2 rounded-xl bg-[#13151b] border border-white/[0.06] px-2.5 py-2.5 select-none"
    >
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          onHaptic('tap');
          dragControls.start(e);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' && index > 0) {
            e.preventDefault();
            onMoveByKeyboard(index, -1);
          } else if (e.key === 'ArrowDown' && index < total - 1) {
            e.preventDefault();
            onMoveByKeyboard(index, 1);
          }
        }}
        aria-label={`Drag to reorder "${rem.title}"`}
        title="Drag to reorder (or use Up/Down arrows)"
        className="touch-none cursor-grab active:cursor-grabbing p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#8ba3ff]"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => onToggle(rem)}
        className="flex items-start gap-2 text-left min-w-0 flex-1"
        aria-label={`Mark "${rem.title}" as ${rem.completed ? 'incomplete' : 'complete'}`}
      >
        {rem.completed ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        ) : (
          <Circle className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
        )}
        <div className="min-w-0">
          <p
            className={`text-xs font-medium leading-snug ${
              rem.completed ? 'line-through text-zinc-500' : 'text-zinc-100'
            }`}
          >
            {rem.title}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            {rem.dueLabel} · {rem.source === 'google-tasks' ? 'Google Tasks' : 'Local Reminder'}
          </p>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onDelete(rem)}
        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-300 hover:bg-red-500/10 transition-colors shrink-0"
        aria-label={`Delete "${rem.title}"`}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </Reorder.Item>
  );
};

export const TimersTasksPanel: React.FC<TimersTasksPanelProps> = ({
  timerSecondsLeft,
  timerRunning,
  timerLabel,
  onStartPauseTimer,
  onResetTimer,
  onSelectPreset,
  reminders,
  onAddLocalReminder,
  onToggleReminder,
  onDeleteReminder,
  onReorderReminders,
  googleTasksOrderDirty,
  onSaveGoogleTasksOrder,
  workspaceUser,
  isSigningIn,
  onSignInGoogle,
  onSignOutGoogle,
  onSyncGoogleTasks,
  tasksSyncing,
  tasksError,
  googleTaskListTitle,
  activeGoogleTaskListId,
  googleTaskLists,
  onSelectGoogleTaskList,
  onAddGoogleTask,
  onHaptic,
}) => {
  const [customMinutes, setCustomMinutes] = useState('10');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('Today · 17:00');
  const [saveTarget, setSaveTarget] = useState<'local' | 'google'>('local');
  const [formError, setFormError] = useState<string | null>(null);
  const progress = calculateTaskProgress(reminders, Boolean(workspaceUser), activeGoogleTaskListId);

  const handleSetCustomTimer = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = Number(customMinutes);
    if (!Number.isFinite(mins) || mins <= 0 || mins > 180) return;
    onHaptic('tap');
    onSelectPreset(Math.round(mins * 60), `${mins}m Custom`);
  };

  const handleCreateReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
      setFormError('Enter a reminder or task title.');
      return;
    }
    setFormError(null);
    onHaptic('success');

    if (saveTarget === 'google' && workspaceUser) {
      onAddGoogleTask(newTaskTitle.trim());
    } else {
      onAddLocalReminder(newTaskTitle.trim(), newTaskDue.trim() || 'Today');
    }
    setNewTaskTitle('');
  };

  const handleMoveByKeyboard = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= reminders.length) return;
    const next = [...reminders];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    onHaptic('toggle');
    onReorderReminders(next);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
      {/* Left: Dynamic Island Timer & Pomodoro */}
      <div className="md:col-span-5 rounded-2xl bg-[#12141a] border border-white/[0.06] p-4 flex flex-col justify-between space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#8ba3ff]" />
            <span className="text-xs font-semibold text-white">Live Island Timer</span>
          </div>
          <span className="text-[11px] text-zinc-400">{timerLabel}</span>
        </div>

        <div className="text-center py-2">
          <p className="font-mono-tabular text-4xl font-semibold tracking-tight text-white">
            {formatDuration(timerSecondsLeft)}
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">
            {timerRunning ? 'Ticking live in compact Dynamic Island' : 'Ready to start'}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={onStartPauseTimer}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8ba3ff] hover:bg-[#9eb2ff] text-[#080a10] text-xs font-semibold transition-colors"
          >
            {timerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{timerRunning ? 'Pause Timer' : 'Start Timer'}</span>
          </button>
          <button
            type="button"
            onClick={onResetTimer}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
            aria-label="Reset timer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        <div className="space-y-2 pt-2 border-t border-white/[0.06]">
          <div className="grid grid-cols-2 gap-1.5">
            {TIMER_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  onHaptic('tap');
                  onSelectPreset(preset.seconds, preset.label);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[#191c24] hover:bg-[#232836] text-[11px] font-medium text-zinc-200 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSetCustomTimer} className="flex items-center gap-1.5">
            <input
              type="number"
              min={1}
              max={180}
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              aria-label="Custom timer minutes"
              className="w-20 px-2.5 py-1.5 rounded-lg bg-[#191c24] border border-white/10 text-xs font-mono-tabular text-zinc-100"
            />
            <span className="text-[11px] text-zinc-400">min</span>
            <button
              type="submit"
              className="ml-auto px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-200 font-medium"
            >
              Set Custom
            </button>
          </form>
        </div>
      </div>

      {/* Right: Reminders & Google Tasks */}
      <div className="md:col-span-7 flex flex-col space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-white">Reminders &amp; Google Tasks</p>
            <p className="text-[11px] text-zinc-400">
              {workspaceUser
                ? 'Drag handle to reorder · Changes confirm before syncing'
                : 'Drag handle to reorder · Sign in to sync live Google Tasks'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {workspaceUser && googleTasksOrderDirty && (
              <button
                type="button"
                onClick={onSaveGoogleTasksOrder}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0e241e] hover:bg-[#14332a] text-emerald-300 border border-emerald-400/25 text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Order</span>
              </button>
            )}
            {workspaceUser && (
              <button
                type="button"
                onClick={onSyncGoogleTasks}
                disabled={tasksSyncing}
                className="p-2 rounded-lg bg-[#14161b] hover:bg-[#1e222b] text-zinc-300 transition-colors"
                aria-label="Refresh Google Tasks"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${tasksSyncing ? 'animate-spin' : ''}`} />
              </button>
            )}
            <GoogleSignInButton
              user={workspaceUser}
              isSigningIn={isSigningIn}
              onSignIn={onSignInGoogle}
              onSignOut={onSignOutGoogle}
              compact
            />
          </div>
        </div>

        {/* Visual Task Completion Progress Bar (Completed vs. Total in Active Google Tasks List) */}
        <div
          className="rounded-xl bg-[#12141a] border border-white/[0.06] px-3 py-2.5 space-y-2"
          data-testid="tasks-progress-card"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              {workspaceUser && googleTaskLists.length > 1 ? (
                <select
                  aria-label="Active Google Tasks list"
                  value={activeGoogleTaskListId}
                  onChange={(e) => {
                    onHaptic('tap');
                    onSelectGoogleTaskList(e.target.value);
                  }}
                  className="px-2 py-1 rounded-lg bg-[#191d27] border border-white/10 text-xs font-medium text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#8ba3ff]"
                >
                  {googleTaskLists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.title}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-medium text-zinc-200 truncate">
                  {progress.scope === 'google-tasks'
                    ? `Active Google Tasks · ${googleTaskListTitle}`
                    : 'Google Tasks Progress (Local Preview)'}
                </span>
              )}
            </div>
            <span className="font-mono-tabular font-semibold text-emerald-300 shrink-0">
              {progress.percentCompleted}%{' '}
              <span className="text-zinc-400 font-normal">
                ({progress.completed}/{progress.total} tasks)
              </span>
            </span>
          </div>

          <div
            role="progressbar"
            aria-label={
              progress.scope === 'google-tasks'
                ? `${googleTaskListTitle} Google Tasks completion percentage`
                : 'Tasks completion percentage'
            }
            aria-valuenow={progress.percentCompleted}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${progress.completed} of ${progress.total} tasks completed (${progress.percentCompleted}%)`}
            className="h-2.5 w-full rounded-full bg-[#222634] overflow-hidden flex"
          >
            <div
              className="h-full bg-[#34d399] transition-all duration-300"
              style={{ width: `${progress.percentCompleted}%` }}
            />
            <div
              className="h-full bg-[#8ba3ff]/25 transition-all duration-300"
              style={{ width: `${progress.percentIncomplete}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono-tabular">
            <span className="inline-flex items-center gap-1.5 text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]" aria-hidden="true" />
              {progress.completed} completed ({progress.percentCompleted}%)
            </span>
            <span className="inline-flex items-center gap-1.5 text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8ba3ff]/55" aria-hidden="true" />
              {progress.incomplete} remaining · {progress.total} total
            </span>
          </div>
        </div>

        {tasksError && (
          <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
            {tasksError}
          </p>
        )}

        <form onSubmit={handleCreateReminder} className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => {
              setNewTaskTitle(e.target.value);
              if (formError) setFormError(null);
            }}
            placeholder="Add reminder or Google Task…"
            aria-label="New reminder title"
            className="flex-1 min-w-[160px] px-3 py-2 rounded-xl bg-[#14161b] border border-white/10 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#8ba3ff]"
          />
          {!workspaceUser ? (
            <input
              type="text"
              value={newTaskDue}
              onChange={(e) => setNewTaskDue(e.target.value)}
              aria-label="Reminder due time"
              className="w-28 px-2.5 py-2 rounded-xl bg-[#14161b] border border-white/10 text-xs text-zinc-200"
            />
          ) : (
            <select
              aria-label="Task destination"
              value={saveTarget}
              onChange={(e) => setSaveTarget(e.target.value as 'local' | 'google')}
              className="px-2.5 py-2 rounded-xl bg-[#14161b] border border-white/10 text-xs text-zinc-200"
            >
              <option value="google">Google Tasks</option>
              <option value="local">Local Only</option>
            </select>
          )}
          <button
            type="submit"
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#0e241e] hover:bg-[#14332a] text-emerald-300 text-xs font-semibold transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </form>

        {formError && <p className="text-xs text-amber-300">{formError}</p>}

        <div className="min-h-[158px] max-h-[212px] overflow-y-auto island-scroll pr-0.5">
          {reminders.length === 0 ? (
            <div className="h-full rounded-xl bg-[#111319] border border-white/[0.05] flex items-center justify-center text-xs text-zinc-500">
              All clear — add a reminder or sync Google Tasks above.
            </div>
          ) : (
            <Reorder.Group
              axis="y"
              values={reminders}
              onReorder={onReorderReminders}
              className="space-y-1.5"
              data-testid="tasks-reorder-list"
            >
              {reminders.map((rem, idx) => (
                <DraggableTaskRow
                  key={rem.id}
                  rem={rem}
                  index={idx}
                  total={reminders.length}
                  onToggle={onToggleReminder}
                  onDelete={onDeleteReminder}
                  onMoveByKeyboard={handleMoveByKeyboard}
                  onHaptic={onHaptic}
                />
              ))}
            </Reorder.Group>
          )}
        </div>
      </div>
    </div>
  );
};
