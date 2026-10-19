import React from 'react';
import { StyleSheet, Text as RNText, type TextProps } from 'react-native';

import { fonts, fontFor } from '../theme';

const BODY: string[] = Object.values(fonts.body);
const DISPLAY: string[] = Object.values(fonts.display);
const MONO: string[] = Object.values(fonts.mono);

/**
 * Обёртка над RN Text: подставляет Manrope по умолчанию и корректное
 * начертание по `fontWeight`. Для кастомных шрифтов React Native не умеет
 * синтезировать веса, поэтому 400/500/600/700 — это отдельные файлы.
 */
export function Text({ style, ...rest }: TextProps) {
  const flat = (StyleSheet.flatten(style) ?? {}) as {
    fontFamily?: string;
    fontWeight?: string | number;
  };
  const weight = flat.fontWeight;
  let family = flat.fontFamily ?? fontFor('body', weight);

  if (flat.fontFamily && MONO.includes(flat.fontFamily)) family = fontFor('mono', weight);
  else if (flat.fontFamily && DISPLAY.includes(flat.fontFamily)) family = fontFor('display', weight);
  else if (flat.fontFamily && BODY.includes(flat.fontFamily)) family = fontFor('body', weight);
  else if (!flat.fontFamily) family = fontFor('body', weight);

  // Семейство уже подобрано по весу: оставляем fontWeight normal, чтобы
  // Android/iOS не синтезировали жирность поверх нужного файла.
  return <RNText {...rest} style={[style, { fontFamily: family, fontWeight: 'normal' }]} />;
}
