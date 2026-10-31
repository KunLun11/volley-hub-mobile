/**
 * Ссылки на правовые документы для мобильного приложения.
 *
 * Сами документы публикуются на веб-сайте VolleyHub (единая точка
 * обновления текста), приложение открывает их во внешнем браузере.
 */

/** Адрес веб-версии сервиса. Можно переопределить через EXPO_PUBLIC_WEB_URL. */
export const LEGAL_BASE_URL = (
  process.env.EXPO_PUBLIC_WEB_URL ?? 'https://volley-hub.ru'
).replace(/\/+$/, '');

/** Версия согласия, которая фиксируется на бэкенде при регистрации. */
export const CONSENT_VERSION = '1.0';

export type LegalPath =
  | '/legal'
  | '/legal/privacy'
  | '/legal/consent'
  | '/legal/cookies'
  | '/legal/terms';

/** Публичный URL документа (HashRouter в веб-приложении). */
export function legalUrl(path: LegalPath): string {
  return `${LEGAL_BASE_URL}/#${path}`;
}
