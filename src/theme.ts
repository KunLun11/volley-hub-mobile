/* ============================================================
   Дизайн-токены VolleyHub (brand-spec.md + прототип volley-hub-app.html)
   Правила: небо (accent) = ТОЛЬКО действия, янтарь (gold) = ТОЛЬКО данные,
   все цифры — моноширинный шрифт.
   ============================================================ */
export const colors = {
  /* ===== Поверхности (premium: обсидиан + слои) ===== */
  bg: '#0a0b0e',
  bg2: '#0e0f14',
  surface: '#15171d',
  surface2: '#1b1e26',
  surface3: '#232732',
  border: 'rgba(255, 255, 255, 0.07)',
  border2: 'rgba(255, 255, 255, 0.13)',

  /* ===== Текст ===== */
  fg: '#f6f7fb',
  fg2: '#c9cfda',
  muted: '#8b93a3',
  meta: '#616878',

  /* ===== Акценты: СИНИЙ = действие, МЯТНЫЙ = второй стоп, ЯНТАРЬ = данные ===== */
  accent: '#3b82f6' /* ACTION: CTA, ссылки, фокус */,
  accent2: '#2dd4bf' /* второй стоп акцент-градиента */,
  accentInk: '#ffffff',
  gold: '#f5a524' /* DATA: ELO, цена, места, ранг */,
  accentHover: '#2dd4bf',

  /* ===== Семантика ===== */
  success: '#34d399',
  successBg: 'rgba(52, 211, 153, 0.15)',
  warning: '#f5a524',
  warningBg: 'rgba(245, 165, 36, 0.14)',
  danger: '#fb7185',
  dangerBg: 'rgba(251, 113, 133, 0.15)',
  info: '#3b82f6',
  infoBg: 'rgba(59, 130, 246, 0.14)',

  /* ===== Обратная совместимость со старыми именами ===== */
  bgDeep: '#0a0b0e',
  bgScreen: '#0e0f14',
  surfaceHover: '#232732',
  borderHover: 'rgba(255, 255, 255, 0.13)',
  primary: '#3b82f6',
  primaryGlow: 'rgba(59, 130, 246, 0.20)',
  textMain: '#f6f7fb',
  textSub: '#8b93a3',
  textMuted: '#616878',
  textInverse: '#ffffff',

  /* Оверлеи */
  overlay: 'rgba(10, 11, 14, 0.72)',
  surfaceSoft: 'rgba(255, 255, 255, 0.035)',
  glass: 'rgba(10, 11, 14, 0.55)',
  glassBorder: 'rgba(255, 255, 255, 0.13)',
} as const;

/* ============================================================
   Типографика как на вебе: Manrope (текст), Space Grotesk
   (заголовки), JetBrains Mono (все цифры). Файлы лежат в
   assets/fonts и грузятся через expo-font в App.tsx.
   ============================================================ */
export const fonts = {
  body: {
    regular: 'Manrope-Regular',
    medium: 'Manrope-Medium',
    semibold: 'Manrope-SemiBold',
    bold: 'Manrope-Bold',
    extrabold: 'Manrope-ExtraBold',
  },
  display: {
    medium: 'SpaceGrotesk-Medium',
    semibold: 'SpaceGrotesk-SemiBold',
    bold: 'SpaceGrotesk-Bold',
    extrabold: 'SpaceGrotesk-Bold',
  },
  mono: {
    regular: 'JetBrainsMono-Regular',
    medium: 'JetBrainsMono-Medium',
    semibold: 'JetBrainsMono-SemiBold',
    bold: 'JetBrainsMono-Bold',
    extrabold: 'JetBrainsMono-Bold',
  },
} as const;

type FontKind = keyof typeof fonts;
type FontWeight = string | number | null | undefined;

function weightKey(weight: FontWeight): keyof typeof fonts.body {
  const n = Number(weight ?? 400);
  if (!Number.isFinite(n) || n <= 400) return 'regular';
  if (n <= 500) return 'medium';
  if (n <= 600) return 'semibold';
  if (n <= 700) return 'bold';
  return 'extrabold';
}

/** Подобрать начертание семейства по fontWeight (RN не умеет
 *  синтезировать веса для кастомных шрифтов). */
export function fontFor(kind: FontKind, weight?: FontWeight): string {
  const family = fonts[kind] as Record<string, string>;
  return family[weightKey(weight)];
}

/** Базовый моноширинный шрифт для всех числовых значений. */
export const fontMono = fonts.mono.regular;
/** Шрифт заголовков (Space Grotesk). */
export const fontDisplay = fonts.display.bold;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  pill: 999,
  full: 999,
} as const;

export const gradients = {
  /** Основной CTA: приглушённый синий, без чужого ореола. */
  accent: ['#3471d6', '#379be6'] as [string, string],
  /** Яркая акцент-пара (иконки/декор). */
  accentBright: ['#3b82f6', '#2dd4bf'] as [string, string],
  /** Верхняя подсветка карточек. */
  card: ['#1e2026', '#15171d'] as [string, string],
  /** Фоновое свечение экрана. */
  glow: ['rgba(59, 130, 246, 0.16)', 'rgba(45, 212, 191, 0.05)', 'rgba(10, 11, 14, 0)'] as [
    string,
    string,
    string,
  ],
} as const;

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.38,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  pop: {
    shadowColor: '#000000',
    shadowOpacity: 0.55,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 14,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

/** Плавающий нижний док (pill): высота и отступ от краёв/низа экрана.
 *  Используется в навигации, отступе контента и позиции тостов. */
export const dock = {
  height: 64,
  margin: 14,
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
  1: { fg: '#8b93a3', bg: 'rgba(139,147,163,0.14)' },
  2: { fg: '#8b93a3', bg: 'rgba(139,147,163,0.14)' },
  3: { fg: '#3b82f6', bg: 'rgba(59,130,246,0.14)' },
  4: { fg: '#3b82f6', bg: 'rgba(59,130,246,0.14)' },
  5: { fg: '#2dd4bf', bg: 'rgba(45,212,191,0.14)' },
  6: { fg: '#2dd4bf', bg: 'rgba(45,212,191,0.14)' },
  7: { fg: '#f5a524', bg: 'rgba(245,165,36,0.14)' },
  8: { fg: '#f5a524', bg: 'rgba(245,165,36,0.14)' },
  9: { fg: '#fb7185', bg: 'rgba(251,113,133,0.14)' },
};

/** Детерминированный цвет аватара по имени.
 *  Hue ограничен синим↔мятным диапазоном (как в вебе), чтобы
 *  фолбэк-аватары не давали фиолетовый/розовый. */
export function avatarHue(name: string): number {
  const hash = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  return 170 + (hash % 60);
}
