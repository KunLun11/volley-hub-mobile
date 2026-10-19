/* ============================================================
   API-слой мобильного приложения.

   Полностью повторяет volley-hub-frontend/src/api/client.ts,
   но:
   - базовый URL абсолютный (задаётся через EXPO_PUBLIC_API_URL);
   - токены хранятся в AsyncStorage (а не в localStorage);
   - загрузка фото принимает data-URI напрямую (см. expo-image-picker).

   Эндпоинты (prefix /api/v1/):
   Auth        POST /auth/login/ | logout/ | refresh/
   Register    POST /register/user/ | verify-email/ | resend-code/
   Users       GET  /users/me/
   Profiles    GET  /profiles/users/<uuid>/          (публичный профиль любого пользователя)
               GET  /profiles/users/<uuid>/profile/
               POST /profiles/profile/ | PATCH users/<uuid>/profile/
   Games       GET  /games/?title&status&skill_level&gender&date_from&date_to&page
               GET  /games/<id>/ | <id>/participants/ | my-games/ | organized/ | locations/
               GET  /games/history/                 (история завершённых матчей)
               POST /games/ (create)
               POST /games/<id>/register/ | cancel-registration/ | attend/
                         | publish/ | close-registration/ | complete/ | result/ | cancel/
                         | confirm-participant/<participant_id>/
                         | remove-participant/<participant_id>/
                         | no-show/<participant_id>/
   ============================================================ */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  ApiLocation,
  CreateGame,
  GameDetail,
  GameList,
  GameParticipant,
  Location,
  LoginPayload,
  MeSchema,
  MyGame,
  OrganizerProfile,
  Paginated,
  PlayerProfile,
  PlayerProfileUpdate,
  SetScore,
  TokenPair,
  UserCreatePayload,
  UserProfileResponse,
  VerifyEmailPayload,
  VerifyEmailResult,
} from '../types';

const ACCESS_KEY = 'va_access';
const REFRESH_KEY = 'va_refresh';

/** Базовый URL API. Пример .env: EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api/v1 */
export const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'https://volley-hub.ru/api/v1').replace(/\/+$/, '');

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

let accessToken: string | null = null;
let refreshToken: string | null = null;

/** Читает сохранённые токены из AsyncStorage. Вызывается один раз при старте (см. AuthContext). */
export async function loadTokens(): Promise<void> {
  try {
    const pairs = await AsyncStorage.multiGet([ACCESS_KEY, REFRESH_KEY]);
    accessToken = pairs[0][1];
    refreshToken = pairs[1][1];
  } catch {
    accessToken = null;
    refreshToken = null;
  }
}

export function setTokens(pair: TokenPair | null): void {
  if (pair) {
    accessToken = pair.access;
    refreshToken = pair.refresh;
    void AsyncStorage.multiSet([
      [ACCESS_KEY, pair.access],
      [REFRESH_KEY, pair.refresh],
    ]);
  } else {
    accessToken = null;
    refreshToken = null;
    void AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);
  }
}

export function hasTokens(): boolean {
  return Boolean(accessToken && refreshToken);
}

/** Сессия больше недействительна (refresh отклонён сервером). */
let sessionExpiredHandler: (() => void) | null = null;

/** AuthContext регистрирует здесь выход из аккаунта. Возвращает отписку. */
export function setSessionExpiredHandler(fn: (() => void) | null): () => void {
  sessionExpiredHandler = fn;
  return () => {
    if (sessionExpiredHandler === fn) sessionExpiredHandler = null;
  };
}

/** base64url → строка (atob есть не во всех сборках Hermes). */
function base64UrlDecode(input: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let str = input.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  let output = '';
  let buffer = 0;
  let bits = 0;
  for (const ch of str) {
    if (ch === '=') break;
    const idx = chars.indexOf(ch);
    if (idx === -1) continue;
    buffer = (buffer << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return output;
}

/** exp (мс) из JWT. Подпись проверяет бэкенд, здесь нужен только срок. */
function tokenExpiresAt(token: string): number | null {
  try {
    const payload = JSON.parse(base64UrlDecode(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function accessTokenNeedsRefresh(skewMs = 60_000): boolean {
  if (!accessToken) return true;
  const exp = tokenExpiresAt(accessToken);
  return exp !== null && exp - Date.now() <= skewMs;
}

function expireSession(): void {
  setTokens(null);
  sessionExpiredHandler?.();
}

export type RefreshResult = 'ok' | 'expired' | 'error';

let refreshInFlight: Promise<RefreshResult> | null = null;

/**
 * Обмен refresh → новая пара (с ротацией). Одновременные запросы делят один
 * сетевой вызов: иначе первый обмен отзывал бы refresh-токен, а остальные
 * получали 401 и «разлогинивали» пользователя.
 */
export function refreshTokens(): Promise<RefreshResult> {
  if (!refreshToken) return Promise.resolve('expired');
  if (!refreshInFlight) {
    const usedToken = refreshToken;
    refreshInFlight = (async (): Promise<RefreshResult> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30_000);
      try {
        const res = await fetch(`${API_BASE}/auth/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: usedToken }),
          signal: controller.signal,
        });
        if (res.ok) {
          const data = (await res.json()) as Partial<TokenPair>;
          if (!data.access) return 'error';
          setTokens({ access: data.access, refresh: data.refresh ?? usedToken });
          return 'ok';
        }
        if (res.status === 401 || res.status === 403) {
          expireSession();
          return 'expired';
        }
        return 'error';
      } catch {
        return 'error';
      } finally {
        clearTimeout(timer);
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

/** Обновление сессии при старте: протухший access сразу меняем по refresh. */
export async function ensureFreshSession(): Promise<RefreshResult | 'none'> {
  if (!refreshToken) return 'none';
  if (accessToken && !accessTokenNeedsRefresh()) return 'ok';
  return refreshTokens();
}

function buildQuery(filters: Record<string, string | number | undefined | null>): string {
  const parts: string[] = [];
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
  });
  return parts.length ? `?${parts.join('&')}` : '';
}

async function rawFetch(path: string, opts: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return fetch(`${API_BASE}${path}`, { ...opts, headers });
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  let res = await rawFetch(path, opts);
  if ((res.status === 401 || res.status === 403) && refreshToken) {
    const refreshed = await refreshTokens();
    if (refreshed === 'ok') res = await rawFetch(path, opts);
    else if (refreshed === 'expired') throw new ApiError(401, 'Сессия истекла — войдите заново');
    // 'error' — сеть/5xx: не разлогиниваем, покажем исходную ошибку
  }
  // Ошибку показываем как есть. Раньше здесь подменялось сообщение на
  // «учётные данные не предоставлены», и экран входа/регистрации вместо
  // реальной причины показывал ложное «войдите заново».
  if (!res.ok) throw new ApiError(res.status, await safeDetail(res));
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function requestList<T>(path: string): Promise<T[]> {
  const data = await request<Paginated<T[]> | T[]>(path);
  if (Array.isArray(data)) return data;
  return data.results ?? [];
}

async function safeDetail(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as Record<string, unknown> | string;
    if (typeof data === 'string') return data;
    if (typeof data.detail === 'string') return data.detail;
    if (typeof data.message === 'string') return data.message;
    const first = Object.values(data)[0];
    if (Array.isArray(first) && typeof first[0] === 'string') return first[0];
    return res.statusText;
  } catch {
    return res.statusText || 'Ошибка сети';
  }
}

/* ---------- адаптеры реальных ответов DRF -> типы UI ---------- */

function adaptLocation(l: ApiLocation | null | undefined): Location {
  if (!l) {
    return { id: 0, name: '—', address: '', city: '', lat: null, lon: null, venue_type: 1, surface_type: 6 };
  }
  return {
    id: l.id,
    name: l.name,
    address: l.address ?? '',
    city: l.city ?? '',
    lat: l.latitude != null && l.latitude !== '' ? Number(l.latitude) : null,
    lon: l.longitude != null && l.longitude !== '' ? Number(l.longitude) : null,
    venue_type: l.venue_type ?? 1,
    surface_type: l.surface_type ?? 6,
  };
}

function personName(p: { first_name?: string | null; last_name?: string | null }): string {
  return `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Игрок';
}

function adaptGame(g: Record<string, any>): GameList {
  return {
    id: g.id as number,
    title: (g.title as string) ?? 'Игра',
    location: adaptLocation(g.location as ApiLocation | undefined),
    date_time: g.date_time as string,
    duration_minutes: (g.duration_minutes as number) ?? 90,
    booked_count: (g.booked_count as number) ?? 0,
    capacity: (g.capacity as number) ?? 12,
    price: g.price == null ? null : Number(g.price),
    skill_level: Number(g.skill_level ?? 4),
    status: Number(g.status ?? 1),
    gender: Number(g.gender ?? 0),
    winner_team: g.winner_team == null ? null : Number(g.winner_team),
    set_scores: Array.isArray(g.set_scores)
      ? (g.set_scores as SetScore[]).map((s) => ({
          team_1: Number(s.team_1 ?? 0),
          team_2: Number(s.team_2 ?? 0),
        }))
      : [],
    team_1_sets_won: Number(g.team_1_sets_won ?? 0),
    team_2_sets_won: Number(g.team_2_sets_won ?? 0),
    started_at: (g.started_at as string | null) ?? null,
    result_finalized_at: (g.result_finalized_at as string | null) ?? null,
  };
}

function adaptGameDetail(d: Record<string, any>): GameDetail {
  const organizer = d.organizer ?? {};
  return {
    ...adaptGame(d),
    description: d.description ?? '',
    is_tournament: !!d.is_tournament,
    is_participant: !!d.is_participant,
    is_organizer: !!d.is_organizer,
    is_responsible: !!d.is_responsible,
    responsible: d.responsible
      ? {
          id: Number(d.responsible.id ?? 0),
          user: d.responsible.user ?? '',
          first_name: d.responsible.first_name ?? '',
          last_name: d.responsible.last_name ?? '',
          photo: d.responsible.photo ?? null,
          elo_rating: Number(d.responsible.elo_rating ?? 0),
        }
      : null,
    location: adaptLocation(d.location),
    organizer: {
      id: organizer.id ?? 0,
      user_id: organizer.user ?? '',
      first_name: organizer.first_name ?? '',
      last_name: organizer.last_name ?? '',
      elo_rating: Number(organizer.elo_rating ?? organizer.player?.elo_rating ?? 0),
      total_games: Number(organizer.total_games ?? organizer.player?.total_games ?? 0),
      photo: organizer.photo ?? null,
      description: organizer.description ?? organizer.player?.description ?? '',
    },
  };
}

function adaptParticipant(p: Record<string, any>): GameParticipant & { player_name: string; player_elo: number } {
  const player = p.player ?? {};
  return {
    id: p.id,
    game_id: typeof p.game === 'object' && p.game !== null ? p.game.id : Number(p.game),
    player_id: player.id ?? p.player,
    player_user_id: player.user ?? null,
    player_name: personName(player),
    player_elo: Number(player.elo_rating ?? 0),
    player_photo: player.photo ?? null,
    status: Number(p.status ?? 1),
    registered_at: p.registered_at ?? '',
    cancelled_at: p.cancelled_at ?? null,
    checked_in_at: p.checked_in_at ?? null,
    team: p.team == null ? null : Number(p.team),
    result: Number(p.result ?? 0),
    result_display: p.result_display ?? '',
    elo_before: p.elo_before == null ? null : Number(p.elo_before),
    elo_after: p.elo_after == null ? null : Number(p.elo_after),
  };
}

function adaptMyGame(m: Record<string, any>): MyGame {
  return {
    participant_id: m.participant_id ?? m.id,
    participant_status: Number(m.status ?? 1),
    has_review: !!(m.has_review ?? m.review),
    review: m.review
      ? {
          rating_game: Number(m.review.rating_game ?? 0),
          matched: !!m.review.matched,
          created_at: m.review.created_at ?? undefined,
        }
      : null,
    game: adaptGame(m.game ?? {}),
    detail: m.game ? adaptGameDetail(m.game) : undefined,
  };
}

function adaptProfile(p: Record<string, any>, me?: MeSchema): PlayerProfile {
  return {
    id: p.id ?? 0,
    user: {
      id: p.user?.id ?? me?.id ?? '',
      email: p.user?.email ?? me?.email ?? '',
      role: p.user?.role ?? me?.role ?? 'player',
      created_at: p.created_at ?? '',
      updated_at: p.updated_at ?? '',
    },
    first_name: p.first_name ?? '',
    last_name: p.last_name ?? '',
    middle_name: p.middle_name ?? '',
    birth_date: p.birth_date ?? '',
    gender: p.gender ?? '',
    city: p.city ?? '',
    elo_rating: Number(p.elo_rating ?? 0),
    photo: p.photo ?? '',
    skill_level: String(p.skill_level ?? '4'),
    position: String(p.position ?? '4'),
    completion_percentage: Number(p.completion_percentage ?? 0),
    total_games: Number(p.total_games ?? 0),
    total_tournament: Number(p.total_tournament ?? 0),
  };
}

function adaptOrganizerProfile(p: Record<string, any>, me?: MeSchema): OrganizerProfile {
  return {
    id: p.id ?? 0,
    user: {
      id: p.user?.id ?? me?.id ?? '',
      email: p.user?.email ?? me?.email ?? '',
      role: p.user?.role ?? me?.role ?? 'organizer',
      created_at: p.created_at ?? '',
      updated_at: p.updated_at ?? '',
    },
    first_name: p.first_name ?? '',
    last_name: p.last_name ?? '',
    middle_name: p.middle_name ?? '',
    birth_date: p.birth_date ?? '',
    gender: p.gender ?? '',
    city: p.city ?? '',
    elo_rating: Number(p.elo_rating ?? 0),
    photo: p.photo ?? '',
    description: p.description ?? '',
    total_games: Number(p.total_games ?? 0),
    organizer_rating: Number(p.organizer_rating ?? 0),
    games_cancelled: Number(p.games_cancelled ?? 0),
  };
}

export const api = {
  login: (body: LoginPayload): Promise<TokenPair> =>
    request<TokenPair>('/auth/login/', { method: 'POST', body: JSON.stringify(body) }).then((pair) => {
      setTokens(pair);
      return pair;
    }),

  /** Выход: отзываем access+refresh на бэкенде и чистим токены.
   *  Идём мимо request(), чтобы не запускать refresh. */
  logout: async (): Promise<void> => {
    const token = accessToken;
    const refresh = refreshToken;
    try {
      await fetch(`${API_BASE}/auth/logout/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ refresh_token: refresh ?? '' }),
      });
    } catch {
      // выход локальный в любом случае
    } finally {
      // Не затираем токены, если пользователь уже вошёл заново,
      // пока запрос выхода летел на сервер.
      if (accessToken === token && refreshToken === refresh) setTokens(null);
    }
  },

  register: (body: UserCreatePayload): Promise<unknown> =>
    request('/register/user/', { method: 'POST', body: JSON.stringify(body) }),

  verifyEmail: (body: VerifyEmailPayload): Promise<VerifyEmailResult> =>
    request<VerifyEmailResult>('/register/verify-email/', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then((res) => {
      if (res.access && res.refresh) setTokens({ access: res.access, refresh: res.refresh });
      return res;
    }),

  resendCode: (email: string): Promise<unknown> =>
    request('/register/resend-code/', { method: 'POST', body: JSON.stringify({ email }) }),

  me: (): Promise<PlayerProfile> =>
    request<MeSchema>('/users/me/').then(async (me) => {
      try {
        const prof = await request<Record<string, any>>(`/profiles/users/${me.id}/profile/`);
        return { ...adaptProfile(prof, me), has_profile: true };
      } catch {
        // профиль ещё не создан (онбординг не пройден)
        return { ...adaptProfile({}, me), has_profile: false };
      }
    }),

  createProfile: (body: PlayerProfileUpdate): Promise<PlayerProfile> =>
    request<Record<string, any>>('/profiles/profile/', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then((p) => adaptProfile(p)),

  updateProfile: (body: PlayerProfileUpdate): Promise<PlayerProfile> =>
    request<MeSchema>('/users/me/').then(async (me) => {
      const updated = await request<Record<string, any>>(`/profiles/users/${me.id}/profile/`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      return adaptProfile(updated, me);
    }),

  /** Публичный профиль другого пользователя: GET /profiles/users/<uuid>/.
   *  Бэкенд сам определяет тип профиля (player | organizer) по роли пользователя. */
  userProfile: (userId: string): Promise<UserProfileResponse> =>
    request<{ type?: string; profile?: Record<string, any> }>(`/profiles/users/${userId}/`).then((res) => {
      const type = res.type === 'organizer' ? 'organizer' : 'player';
      return type === 'organizer'
        ? { type, profile: adaptOrganizerProfile(res.profile ?? {}) }
        : { type, profile: adaptProfile(res.profile ?? {}) };
    }),

  games: (filters: {
    skill_level?: number;
    date_from?: string;
    date_to?: string;
    status?: number;
    page?: number;
  }): Promise<GameList[]> => {
    const params: Record<string, string | number | undefined> = { ...filters };
    if (params.status === undefined) params.status = 1; // по умолчанию — «запись открыта»
    return requestList<Record<string, any>>(`/games/${buildQuery(params)}`).then((list) => list.map(adaptGame));
  },

  /** Общее число открытых игр — для бейджа на вкладке «Игры». */
  gamesCount: (): Promise<number> =>
    request<Paginated<Record<string, any>[]> | Record<string, any>[]>('/games/?status=1').then((data) =>
      Array.isArray(data) ? data.length : data.count ?? data.results?.length ?? 0,
    ),

  gameDetail: (id: number): Promise<GameDetail> =>
    request<Record<string, any>>(`/games/${id}/`).then(adaptGameDetail),

  participants: (id: number): Promise<GameParticipant[]> =>
    requestList<Record<string, any>>(`/games/${id}/participants/`).then((list) => list.map(adaptParticipant)),

  locations: (): Promise<ApiLocation[]> => requestList<ApiLocation>('/games/locations/'),

  registerOnGame: (id: number): Promise<unknown> => request(`/games/${id}/register/`, { method: 'POST' }),

  cancelRegistration: (id: number): Promise<unknown> =>
    request(`/games/${id}/cancel-registration/`, { method: 'POST' }).catch((e) => {
      if (e instanceof ApiError && e.status === 204) return undefined;
      throw e;
    }),

  attend: (id: number): Promise<unknown> => request(`/games/${id}/attend/`, { method: 'POST' }),

  myGames: (): Promise<MyGame[]> =>
    requestList<Record<string, any>>('/games/my-games/').then((list) => list.map(adaptMyGame)),

  organizedGames: (): Promise<GameList[]> =>
    requestList<Record<string, any>>('/games/organized/').then((list) => list.map(adaptGame)),

  createGame: (body: CreateGame): Promise<GameList> =>
    request<Record<string, any>>('/games/', { method: 'POST', body: JSON.stringify(body) }).then(adaptGame),

  publishGame: (id: number): Promise<unknown> => request(`/games/${id}/publish/`, { method: 'POST' }),

  closeRegistration: (id: number): Promise<unknown> => request(`/games/${id}/close-registration/`, { method: 'POST' }),

  /** Организатор начинает игру: «Запись открыта/окончена» → «Идёт». */
  startGame: (id: number): Promise<unknown> => request(`/games/${id}/start/`, { method: 'POST' }),

  cancelGame: (id: number): Promise<unknown> => request(`/games/${id}/cancel/`, { method: 'POST' }),

  /** Завершение игры с результатом: победившая команда + счёт партий. */
  completeGame: (id: number, body: { winner_team: number; set_scores: SetScore[] }): Promise<GameDetail> =>
    request<Record<string, any>>(`/games/${id}/result/`, {
      method: 'POST',
      body: JSON.stringify(body),
    }).then(adaptGameDetail),

  /** История завершённых матчей (публичная). */
  gameHistory: (): Promise<GameList[]> =>
    requestList<Record<string, any>>('/games/history/').then((list) => list.map(adaptGame)),

  setGameResult: (id: number, body: { winner_team: number; set_scores: SetScore[] }): Promise<GameDetail> =>
    request<Record<string, any>>(`/games/${id}/result/`, {
      method: 'POST',
      body: JSON.stringify(body),
    }).then(adaptGameDetail),

  /** Организатор назначает/снимает ответственного за счёт (participantId=null — снять). */
  assignResponsible: (id: number, participantId: number | null): Promise<GameDetail> =>
    request<Record<string, any>>(`/games/${id}/responsible/`, {
      method: 'POST',
      body: JSON.stringify({ participant_id: participantId }),
    }).then(adaptGameDetail),

  /** Организатор или ответственный вводит счёт партии (index — изменить существующую). */
  saveSetScore: (
    id: number,
    body: { team_1: number; team_2: number; index?: number | null },
  ): Promise<GameDetail> =>
    request<Record<string, any>>(`/games/${id}/sets/`, {
      method: 'POST',
      body: JSON.stringify(body),
    }).then(adaptGameDetail),

  /** Удалить ошибочно введённую партию. */
  deleteSetScore: (id: number, index: number): Promise<GameDetail> =>
    request<Record<string, any>>(`/games/${id}/sets/${index}/`, {
      method: 'DELETE',
    }).then(adaptGameDetail),

  markPaid: (gameId: number, participantId: number): Promise<unknown> =>
    request(`/games/${gameId}/confirm-participant/${participantId}/`, { method: 'POST' }),

  /**
   * Организатор удаляет участника, в том числе уже оплатившего (решение конфликта):
   * POST /games/<id>/remove-participant/<pid>/
   */
  removeParticipant: (gameId: number, participantId: number): Promise<unknown> =>
    request(`/games/${gameId}/remove-participant/${participantId}/`, { method: 'POST' }),

  markNoShow: (gameId: number, participantId: number): Promise<unknown> =>
    request(`/games/${gameId}/no-show/${participantId}/`, { method: 'POST' }),

  /** Отметка «совпал ли уровень игры» — один раз на игру (повтор → 409). */
  submitReview: (gameId: number, matched: boolean): Promise<unknown> =>
    request(`/games/${gameId}/review/`, {
      method: 'POST',
      body: JSON.stringify({ matched }),
    }),
};
