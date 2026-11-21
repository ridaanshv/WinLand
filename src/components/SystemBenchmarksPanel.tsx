import React from 'react';
import { Cpu, MemoryStick, Gauge, Wifi, Play, Loader2 } from 'lucide-react';
import type { HardwareTelemetry } from '../types/island';
import { calculateBenchmarkSummary } from '../utils/islandLogic';

interface SystemBenchmarksPanelProps {
  telemetry: HardwareTelemetry;
  benchmarkRunning: boolean;
  lastBenchmarkAt: string | null;
  onRunBenchmark: () => void;
}

function Sparkline({
  values,
  stroke = '#34d399',
  minSpan = 10,
}: {
  values: number[];
  stroke?: string;
  minSpan?: number;
}) {
  const width = 180;
  const height = 38;
  if (values.length < 2) return null;

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const rawSpan = maxVal - minVal;
  const span = Math.max(minSpan, rawSpan * 1.45);
  const mid = (minVal + maxVal) / 2;
  const low = mid - span / 2;

  const coords = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const norm = Math.min(1, Math.max(0, (v - low) / span));
    const y = height - norm * (height - 8) - 4;
    return { x, y };
  });

  const points = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-9 overflow-visible"
      aria-hidden="true"
    >
      <polygon fill={stroke} fillOpacity="0.11" points={areaPoints} />
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export const SystemBenchmarksPanel: React.FC<SystemBenchmarksPanelProps> = ({
  telemetry,
  benchmarkRunning,
  lastBenchmarkAt,
  onRunBenchmark,
}) => {
  const summary = calculateBenchmarkSummary(telemetry);
  const memPercent = Math.round((telemetry.memoryUsedGb / telemetry.memoryTotalGb) * 100);

  return (
    <div className="space-y-3.5">
      {/* Power-User Composite Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#12141a] border border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[11px] text-zinc-400">Composite Benchmark Score</p>
            <div className="flex items-baseline gap-2.5 mt-0.5">
              <span className="font-mono-tabular text-2xl font-semibold text-white">
                {summary.compositeScore.toLocaleString()}
              </span>
              <span
                className={`text-xs font-medium ${
                  summary.tier === 'Optimal'
                    ? 'text-emerald-400'
                    : summary.tier === 'Balanced'
                      ? 'text-[#8ba3ff]'
                      : 'text-amber-400'
                }`}
              >
                {summary.tier}
              </span>
            </div>
          </div>
          <div className="hidden sm:block h-8 w-px bg-white/10" aria-hidden="true" />
          <div className="hidden sm:block text-xs text-zinc-400 space-y-0.5">
            <p>
              WinLand footprint:{' '}
              <span className="font-mono-tabular text-emerald-300 font-medium">
                {telemetry.appFootprintMb.toFixed(1)} MB
              </span>
            </p>
            <p className="text-[11px] text-zinc-500">
              {lastBenchmarkAt ? `Last benchmark · ${lastBenchmarkAt}` : 'Live 1.5s hardware polling'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRunBenchmark}
          disabled={benchmarkRunning}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#8ba3ff] hover:bg-[#9eb2ff] disabled:opacity-60 text-[#080a10] text-xs font-semibold transition-colors whitespace-nowrap"
        >
          {benchmarkRunning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Benchmarking…</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Benchmark</span>
            </>
          )}
        </button>
      </div>

      {/* 4 Hardware Benchmark Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* CPU */}
        <div className="rounded-2xl bg-[#12141a] border border-white/[0.06] p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#34d399]" />
              <span className="text-xs font-semibold text-white">CPU</span>
            </div>
            <span className="font-mono-tabular text-xs text-zinc-400">
              Score {summary.cpuScore}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-mono-tabular text-xl font-semibold text-white">
              {telemetry.cpuUsage.toFixed(1)}%
            </span>
            <span className="font-mono-tabular text-[11px] text-zinc-400">
              {telemetry.cpuClockGhz.toFixed(2)} GHz · {telemetry.cpuTempC}°C
            </span>
          </div>
          <Sparkline values={telemetry.history.cpu} minSpan={10} stroke="#34d399" />
          <div className="grid grid-cols-8 gap-1.5 pt-1">
            {telemetry.coreLoads.map((load, i) => (
              <div key={i} className="space-y-1">
                <div className="h-8 rounded bg-[#1d202b] flex items-end overflow-hidden">
                  <div
                    className="w-full bg-emerald-400/85 transition-all duration-300"
                    style={{ height: `${Math.min(100, Math.max(12, load))}%` }}
                  />
                </div>
                <p className="text-[9px] font-mono-tabular text-zinc-500 text-center">C{i}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Memory */}
        <div className="rounded-2xl bg-[#12141a] border border-white/[0.06] p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MemoryStick className="w-4 h-4 text-[#8ba3ff]" />
              <span className="text-xs font-semibold text-white">Memory</span>
            </div>
            <span className="font-mono-tabular text-xs text-zinc-400">
              Score {summary.memoryScore}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-mono-tabular text-xl font-semibold text-white">
              {telemetry.memoryUsedGb.toFixed(1)}{' '}
              <span className="text-xs font-normal text-zinc-400">
                / {telemetry.memoryTotalGb} GB
              </span>
            </span>
            <span className="font-mono-tabular text-[11px] text-zinc-400">{memPercent}% used</span>
          </div>
          <Sparkline values={telemetry.history.mem} minSpan={6} stroke="#8ba3ff" />
          <div className="space-y-1 pt-1">
            <div className="h-2 rounded-full bg-[#1d202b] overflow-hidden">
              <div
                className="h-full bg-[#8ba3ff] transition-all duration-300"
                style={{ width: `${memPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-zinc-400">
              React Native Fabric + Hermes memory optimizer active
            </p>
          </div>
        </div>

        {/* Graphics / GPU */}
        <div className="rounded-2xl bg-[#12141a] border border-white/[0.06] p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-semibold text-white">Graphics / GPU</span>
            </div>
            <span className="font-mono-tabular text-xs text-zinc-400">
              Score {summary.gpuScore}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-mono-tabular text-xl font-semibold text-white">
              {telemetry.gpuUsage.toFixed(0)}%
            </span>
            <span className="font-mono-tabular text-[11px] text-zinc-400">
              VRAM {telemetry.gpuVramUsedGb.toFixed(1)}/{telemetry.gpuVramTotalGb} GB ·{' '}
              {telemetry.gpuFrameTimeMs.toFixed(1)} ms
            </span>
          </div>
          <Sparkline values={telemetry.history.gpu} minSpan={12} stroke="#38bdf8" />
        </div>

        {/* Network Speed */}
        <div className="rounded-2xl bg-[#12141a] border border-white/[0.06] p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-amber-300" />
              <span className="text-xs font-semibold text-white">Network Speed</span>
            </div>
            <span className="font-mono-tabular text-xs text-zinc-400">
              Score {summary.networkScore}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-mono-tabular text-xl font-semibold text-white">
              {telemetry.netDownMbps.toFixed(0)}{' '}
              <span className="text-xs font-normal text-zinc-400">Mbps</span>
            </span>
            <span className="font-mono-tabular text-[11px] text-zinc-400">
              Up {telemetry.netUpMbps.toFixed(0)} Mbps · {telemetry.netPingMs} ms ping
            </span>
          </div>
          <Sparkline values={telemetry.history.net} minSpan={80} stroke="#fbbf24" />
        </div>
      </div>
    </div>
  );
};
