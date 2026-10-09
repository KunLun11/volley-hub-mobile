import { useEffect, useState } from 'react';

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'success' | 'error';
}

/** Обратный отсчёт до дедлайна отмены (за 24ч до игры). Копия из store.tsx. */
export function useCountdown(targetIso: string | undefined, active: boolean): number | null {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!active || !targetIso) {
      setLeft(null);
      return;
    }
    const tick = () => {
      const diff = new Date(targetIso).getTime() - Date.now() - 24 * 3600 * 1000;
      setLeft(Math.max(0, diff));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [targetIso, active]);
  return left;
}

export function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}д ${h}ч ${m}м`;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function formatMMSS(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
