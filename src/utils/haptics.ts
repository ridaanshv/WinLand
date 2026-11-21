let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new Ctx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export type HapticStyle = 'tap' | 'toggle' | 'success' | 'alert';

/**
 * Triggers tactile feedback via navigator.vibrate (when supported) and an ultra-subtle
 * low-latency mechanical acoustic click via Web Audio API.
 */
export function triggerHaptic(
  style: HapticStyle = 'tap',
  enabled = true,
  volumePercent = 70
): void {
  if (!enabled) return;

  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    const pattern: Record<HapticStyle, number | number[]> = {
      tap: 8,
      toggle: 14,
      success: [10, 35, 16],
      alert: [20, 40, 20],
    };
    try {
      navigator.vibrate(pattern[style]);
    } catch {
      // Ignore vibrate restrictions
    }
  }

  if (volumePercent <= 0) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const level = Math.min(0.08, (volumePercent / 100) * 0.06);

    if (style === 'tap') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(210, now + 0.025);
      gain.gain.setValueAtTime(level, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.03);
    } else if (style === 'toggle') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.035);
      gain.gain.setValueAtTime(level, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.042);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.045);
    } else if (style === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.055);
      gain.gain.setValueAtTime(level * 1.1, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(587.33, now + 0.08);
      gain.gain.setValueAtTime(level * 1.2, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.24);
    }
  } catch {
    // AudioContext may be locked prior to gesture
  }
}
