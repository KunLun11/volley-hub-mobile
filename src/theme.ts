/* ============================================================
   Дизайн-токены VolleyHub (brand-spec.md + прототип volley-hub-app.html)
   Правила: небо (accent) = ТОЛЬКО действия, янтарь (gold) = ТОЛЬКО данные,
   все цифры — моноширинный шрифт.
   ============================================================ */
import { Platform } from 'react-native';

export const colors = {
  /* ===== Поверхности (слоёные) ===== */
  bg: '#0b1120',
  bg2: '#0d1424',
  surface: '#141c2e',
  surface2: '#1a2438',
  surface3: '#212d45',
  border: '#26344c',
  border2: '#334155',

  /* ===== Текст ===== */
  fg: '#f8fafc',
  fg2: '#cbd5e1',
  muted: '#94a3b8',
  meta: '#64748b',

  /* ===== Акценты: НЕБО = действие, ЯНТАРЬ = данные ===== */
  accent: '#38bdf8' /* ACTION: CTA, ссылки, фокус */,
  accentInk: '#04121e',
  gold: '#f5a524' /* DATA: ELO, цена, места, ранг */,
  accentHover: '#fbbf24',

  /* ===== Семантика ===== */
  success: '#22c55e',
  successBg: 'rgba(34, 197, 94, 0.15)',
  warning: '#f5a524',
  warningBg: 'rgba(245, 165, 36, 0.14)',
  danger: '#f43f5e',
  dangerBg: 'rgba(244, 63, 94, 0.15)',
  info: '#38bdf8',
  infoBg: 'rgba(56, 189, 248, 0.14)',

  /* ===== Обратная совместимость со старыми именами ===== */
  bgDeep: '#0b1120',
  bgScreen: '#0d1424',
  surfaceHover: '#212d45',
  borderHover: '#334155',
  primary: '#38bdf8',
  primaryGlow: 'rgba(56, 189, 248, 0.20)',
  textMain: '#f8fafc',
  textSub: '#94a3b8',
  textMuted: '#64748b',
  textInverse: '#04121e',

  /* Оверлеи */
  overlay: 'rgba(11, 17, 32, 0.72)',
  surfaceSoft: 'rgba(148, 163, 184, 0.05)',
} as const;

/** Моноширинный шрифт для всех числовых значений (без внешних зависимостей). */
export const fontMono = (Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) ??
  'monospace') as string;

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
  full: 999,
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

/** Уровни игры: цвет бейджа по SkillLevel (1..9). Небо = средний,
 *  зелёный = выше среднего, янтарь = высокий, красный = профи. */
export const LEVEL_COLORS: Record<number, { fg: string; bg: string }> = {
  1: { fg: '#64748b', bg: 'rgba(100,116,139,0.16)' },
  2: { fg: '#64748b', bg: 'rgba(100,116,139,0.16)' },
  3: { fg: '#38bdf8', bg: 'rgba(56,189,248,0.13)' },
  4: { fg: '#38bdf8', bg: 'rgba(56,189,248,0.13)' },
  5: { fg: '#22c55e', bg: 'rgba(34,197,94,0.13)' },
  6: { fg: '#22c55e', bg: 'rgba(34,197,94,0.13)' },
  7: { fg: '#f5a524', bg: 'rgba(245,165,36,0.13)' },
  8: { fg: '#f5a524', bg: 'rgba(245,165,36,0.13)' },
  9: { fg: '#f43f5e', bg: 'rgba(244,63,94,0.13)' },
};

/** Детерминированный цвет аватара по имени (как Avatar в веб-приложении). */
export function avatarHue(name: string): number {
  return [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
}
