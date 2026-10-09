// ============================================================
// Типы, зеркалящие Pydantic-схемы Django-бэкенда.
// Полностью совпадают с volley-hub-frontend/src/types.ts.
// ============================================================

/** config/core/enums/users.py :: SkillLevel (1..9) */
export const SKILL_LEVELS = {
  1: 'Начальный',
  2: 'Начальный +',
  3: 'Средний -',
  4: 'Средний',
  5: 'Средний +',
  6: 'Высокий -',
  7: 'Высокий',
  8: 'Высокий +',
  9: 'Профи',
} as const;

export type SkillLevel = keyof typeof SKILL_LEVELS;

/** config/core/enums/games.py :: GameStatus */
export const GAME_STATUS = {
  0: 'Черновик',
  1: 'Запись открыта',
  2: 'Запись окончена',
  3: 'Идёт',
  4: 'Завершено',
  5: 'Отменено',
} as const;

export type GameStatus = keyof typeof GAME_STATUS;

/** config/core/enums/games.py :: ParticipantStatus */
export const PARTICIPANT_STATUS = {
  1: 'Записан',
  2: 'Подтверждён',
  3: 'Присутствовал',
  4: 'Не пришёл',
} as const;

export type ParticipantStatus = keyof typeof PARTICIPANT_STATUS;

/** config/core/enums/games.py :: GenderRestriction */
export const GENDER_RESTRICTION = {
  0: 'Без ограничений',
  1: 'Только мужчины',
  2: 'Только женщины',
  3: 'Смешанная',
} as const;

/** config/core/enums/locations.py :: VenueType / SurfaceType */
export const VENUE_TYPES = {
  1: 'Спортивный комплекс',
  2: 'Школьный зал',
  3: 'Университетский зал',
  4: 'Частный клуб',
  5: 'Открытая площадка',
  6: 'Пляж',
} as const;

export const SURFACE_TYPES = {
  1: 'Паркет',
  2: 'Синтетика',
  3: 'Песок',
  4: 'Бетон',
  5: 'Резина',
  6: 'Другое',
} as const;

/** config/core/enums/users.py :: PlayerPosition */
export const POSITIONS = {
  1: 'Диагональный',
  2: 'Связующий',
  3: 'Центральный блокирующий',
  4: 'Доигровщик',
  5: 'Универсал',
  6: 'Либеро',
} as const;

/* ---------- Схемы API ---------- */

export interface ApiLocation {
  id: number;
  name: string;
  address?: string | null;
  city?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  venue_type?: number | null;
  surface_type?: number | null;
}

export interface LocationShort {
  id: number;
  name: string;
  address?: string | null;
}

export interface Location extends LocationShort {
  city: string;
  lat?: number | null;
  lon?: number | null;
  venue_type: number;
  surface_type: number;
}

export interface UserSchema {
  id: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizerProfile {
  id: number;
  user: UserSchema;
  first_name: string;
  last_name: string;
  middle_name: string;
  birth_date: string;
  gender: string;
  city: string;
  elo_rating: number;
  photo: string;
  description: string;
  total_games: number;
}

export interface PlayerProfile {
  id: number;
  user: UserSchema;
  first_name: string;
  last_name: string;
  middle_name: string;
  birth_date: string;
  gender: string;
  city: string;
  elo_rating: number;
  photo: string;
  skill_level: string;
  position: string;
  completion_percentage: number;
  total_games: number;
  total_tournament: number;
}

export interface GameList {
  id: number;
  title: string;
  location: LocationShort;
  date_time: string;
  duration_minutes: number;
  booked_count: number;
  capacity: number;
  price?: number | null;
  skill_level: number;
  status: number;
  gender: number;
}

export interface GameDetail {
  id: number;
  organizer: {
    id: number;
    first_name: string;
    last_name: string;
    elo_rating?: number;
    total_games?: number;
    photo?: string | null;
    description?: string;
  };
  location: Location;
  title: string;
  date_time: string;
  duration_minutes: number;
  booked_count: number;
  capacity: number;
  price?: number | null;
  skill_level: number;
  status: number;
  gender: number;
  description?: string;
  is_tournament?: boolean;
  is_participant?: boolean;
}

export interface MeSchema {
  id: string;
  email: string;
  phone?: string;
  role: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T;
}

export interface PlayerProfileUpdate {
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  birth_date?: string;
  gender?: string;
  city?: string;
  skill_level?: number | string;
  position?: number | string;
  photo?: string;
}

export interface MyGame {
  game: GameList;
  participant_status: number;
  participant_id: number;
  detail?: GameDetail;
}

export interface GameParticipant {
  id: number;
  game_id: number;
  player_id: number;
  player_name?: string;
  player_elo?: number;
  status: number;
  registered_at: string;
  cancelled_at?: string | null;
  checked_in_at?: string | null;
}

export interface CreateGame {
  location_id: number;
  title: string;
  date_time: string;
  duration_minutes: number;
  capacity: number;
  price?: number | null;
  skill_level: number;
  gender: number;
  status?: number | null;
  is_tournament: boolean;
  description: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface TokenPair {
  access: string;
  refresh: string;
}

export interface UserCreatePayload {
  email: string;
  password: string;
  role: string; // 'player' | 'organizer' | 'coach'
  phone: string;
}

export interface VerifyEmailPayload {
  email: string;
  code: string;
}

export interface VerifyEmailResult {
  detail: string;
  role?: string;
  access?: string;
  refresh?: string;
}

export interface ParticipantWithPlayer extends GameParticipant {
  player_name: string;
  player_elo: number;
  paid?: boolean;
}
