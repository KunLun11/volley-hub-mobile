/* ============================================================
   Дизайн-токены VolleyApp (перенос из volley-hub-frontend/src/index.css)
   ============================================================ */

export const colors = {
  /* Базовые */
  bgDeep: '#0b1120',
  bgScreen: '#0f172a',
  surface: '#1e293b',
  surfaceHover: '#334155',
  border: '#334155',
  borderHover: '#475569',

  /* Акценты */
  primary: '#38bdf8',
  primaryGlow: 'rgba(56, 189, 248, 0.2)',
  accent: '#f59e0b',
  accentHover: '#fbbf24',

  /* Семантика */
  success: '#22c55e',
  successBg: 'rgba(34, 197, 94, 0.15)',
  warning: '#f59e0b',
  warningBg: 'rgba(245, 158, 11, 0.15)',
  danger: '#ef4444',
  dangerBg: 'rgba(239, 68, 68, 0.15)',
  info: '#38bdf8',
  infoBg: 'rgba(56, 189, 248, 0.15)',
  muted: '#64748b',

  /* Текст */
  textMain: '#f8fafc',
  textSub: '#94a3b8',
  textMuted: '#64748b',
  textInverse: '#0f172a',

  /* Оверлеи */
  overlay: 'rgba(11, 17, 32, 0.7)',
  surfaceSoft: 'rgba(148, 163, 184, 0.05)',
} as const;

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  full: 9999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const fontSize = {
  h1: 28,
  h2: 22,
  h3: 18,
  body: 15,
  label: 12,
  small: 13,
} as const;

/** Уровни игры: цвет бейджа по SkillLevel (1..9). Копия LEVEL_COLORS из ui.tsx. */
export const LEVEL_COLORS: Record<number, { fg: string; bg: string }> = {
  1: { fg: '#64748b', bg: 'rgba(100,116,139,0.15)' },
  2: { fg: '#64748b', bg: 'rgba(100,116,139,0.15)' },
  3: { fg: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
  4: { fg: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
  5: { fg: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  6: { fg: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  7: { fg: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  8: { fg: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  9: { fg: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

/** Детерминированный цвет аватара по имени (как Avatar в веб-приложении). */
export function avatarHue(name: string): number {
  return [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
}
