# 🏐 VolleyApp — мобильное приложение (React Native + Expo + TypeScript)

Мобильная версия сервиса записи на волейбольные игры. Реализует те же экраны и
основной функционал, что и веб-SPA `volley-hub-frontend`, и работает с тем же
Django-бэкендом (`/api/v1/`).

## Почему React Native + Expo, а не Flutter

Из двух предложенных вариантов выбран **React Native (TypeScript)**, потому что он
даёт максимальное переиспользование с уже существующим фронтендом:

| Что переиспользуется | Откуда |
|---|---|
| Типы API и enum'ы (`SKILL_LEVELS`, `GAME_STATUS`, …) | копия `src/types.ts` веб-версии |
| API-клиент целиком (эндпоинты, refresh-токены, адаптеры DRF → UI) | адаптация `src/api/client.ts` |
| Дизайн-токены (цвета, радиусы, отступы) | перенос из `src/index.css` в `src/theme.ts` |
| Логика экранов (валидации, статусы записи, ELO-онбординг) | 1:1 перенос с React |

Единственные отличия от веба — хранилище токенов (`AsyncStorage` вместо
`localStorage`) и выбор фото (`expo-image-picker` вместо `<input type="file">`).

## Экраны и функционал

| Экран | Файл | Что делает |
|---|---|---|
| Вход | `src/screens/LoginScreen.tsx` | email + пароль → JWT, модалка «аккаунт не подтверждён» |
| Регистрация | `src/screens/RegisterScreen.tsx` | роль (игрок/организатор), телефон с маской, валидация |
| Подтверждение email | `src/screens/VerifyScreen.tsx` | OTP из 6 ячеек, таймер, повторная отправка, rate-limit |
| Онбординг | `src/screens/OnboardingScreen.tsx` | профиль игрока + обязательное фото, прогресс заполнения |
| Список игр | `src/screens/GamesListScreen.tsx` | фильтры (уровень, даты), pull-to-refresh, скелетоны |
| Карточка игры | `src/screens/GameDetailsScreen.tsx` | запись/отмена/оплата/«я здесь», участники, разброс ELO |
| Мои игры | `src/screens/MyGamesScreen.tsx` | табы «Все / Предстоящие / Прошедшие» |
| Профиль | `src/screens/ProfileScreen.tsx` | ELO-анимация, статистика, редактирование, фото |
| Создание игры | `src/screens/CreateGameScreen.tsx` | форма + живое превью карточки, черновик/публикация |
| Кабинет организатора | `src/screens/OrganizerCabinetScreen.tsx` | игры по статусам, публикация/отмена/завершение |
| Управление игрой | `src/screens/ManageGameScreen.tsx` | отметки оплаты, no-show, сводка оплат |

Навигация: `@react-navigation` — нижние табы (Игры / Мои игры / Профиль) +
нативный стек для остальных экранов. Общий хедер с меню профиля — `AppHeader` в
`src/components/ui.tsx`.

## Требования

- **Node.js ≥ 18** (рекомендуется 20/22)
- **npm** (или yarn/pnpm)
- Для запуска на устройстве — приложение **Expo Go** (iOS App Store / Google Play)
  либо Android-эмулятор / iOS-симулятор (Xcode) / Android Studio
- Для облачных сборок — бесплатный аккаунт [Expo](https://expo.dev) и `eas-cli`

## Быстрый старт

```bash
cd volley-hub-mobile
npm install

# 1) укажите адрес бэкенда
cp .env.example .env
#   отредактируйте EXPO_PUBLIC_API_URL (см. ниже)

# 2) запустите dev-сервер
npm start
```

Дальше в терминале Expo:
- **`a`** — Android, **`i`** — iOS-симулятор, **`w`** — веб (нужны доп. пакеты, см. ниже);
- либо наведите камеру телефона на QR-код через **Expo Go**.

### Настройка адреса API (`EXPO_PUBLIC_API_URL`)

Файл `.env` в корне проекта:

| Где запускаете | Значение |
|---|---|
| Android-эмулятор | `http://10.0.2.2:8000/api/v1` |
| iOS-симулятор | `http://localhost:8000/api/v1` |
| Физический телефон (та же Wi-Fi сеть, что у ПК) | `http://<IP-компьютера>:8000/api/v1` |
| Прод | `https://volley-hub.ru/api/v1` |

Бэкенд должен быть доступен с устройства. Для локального запуска поднимайте Django
на `0.0.0.0:8000`:

```bash
cd ../volley-hub-backend
uv run python manage.py runserver 0.0.0.0:8000
```

> Значение `EXPO_PUBLIC_*` встраивается в бандл на этапе сборки. После смены
> `.env` перезапустите `npm start` (и пересоберите приложение для прода).

### Проверка типов

```bash
npm run typecheck
```

## Сборка приложения

### Вариант A. Облачная сборка через EAS (рекомендуется — не нужен Mac для iOS)

```bash
npm install -g eas-cli
eas login                       # вход в аккаунт Expo
eas init                        # создаст projectId и привяжет app.json
```

**Android (APK для теста):**

```bash
eas build -p android --profile preview      # → ссылка на .apk
```

**Android (AAB для Google Play):**

```bash
eas build -p android --profile production
```

**iOS (нужен аккаунт Apple Developer для установки на устройство / TestFlight):**

```bash
eas build -p ios --profile preview      # internal-сборка (.ipa)
eas build -p ios --profile production   # App Store
```

После сборки артефакт можно установить на устройство или отправить в сторы:

```bash
eas submit -p android --latest
eas submit -p ios --latest
```

### Вариант B. Локальная нативная сборка (нужны Android Studio / Xcode)

```bash
npx expo prebuild            # сгенерировать папки android/ и ios/
npx expo run:android         # сборка и запуск на эмуляторе/устройстве
npx expo run:ios             # только на macOS с Xcode
```

Готовый APK без EAS:

```bash
cd android && ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

### Вариант C. Быстрая проверка без установки нативных инструментов

`npm start` → QR-код → **Expo Go**. Подходит для демонстрации и отладки на
реальном телефоне. Для продакшена всё равно нужна сборка (вариант A или B).

### Веб-превью (опционально)

```bash
npx expo install react-dom react-native-web @expo/metro-runtime
npm run web
```

## Структура проекта

```
volley-hub-mobile/
├── App.tsx                     # провайдеры (SafeArea, Auth, Toast) + навигация
├── index.ts                    # registerRootComponent
├── app.json                    # конфиг Expo (name, slug, permissions, plugins)
├── eas.json                    # профили сборки EAS
├── .env.example                # EXPO_PUBLIC_API_URL
└── src/
    ├── api/client.ts           # все эндпоинты + refresh-токены + адаптеры
    ├── types.ts                # типы/энумы, зеркалящие Pydantic-схемы
    ├── theme.ts                # дизайн-токены (перенос из index.css)
    ├── navigation/             # RootNavigator (табы + стек)
    ├── store/                  # AuthContext, ToastContext, session-хуки
    ├── components/             # ui.tsx, form.tsx, AuthLayout.tsx
    ├── lib/image.ts            # выбор фото → data-URI (base64)
    └── screens/                # 11 экранов (см. таблицу выше)
```

## Отличия от веб-версии (осознанные)

- **Хранилище токенов** — `AsyncStorage` (асинхронный), поэтому сессия
  гидратируется в `AuthProvider` до показа навигации (сплэш со спиннером).
- **Даты в фильтрах и в форме создания игры** вводятся текстом (`ГГГГ-ММ-ДД`,
  `ЧЧ:ММ`), чтобы не тянуть лишнюю зависимость `@react-native-community/datetimepicker`.
  При желании легко заменить на нативный `DateTimePicker`.
- **Загрузка фото** — через `expo-image-picker`; результат конвертируется в
  base64 data-URI и отправляется тем же полем `photo`, что и в вебе.
- **Демо-переключение роли** (игрок ↔ организатор) вынесено в меню профиля, как и
  в вебе.

## Полезные ссылки

- Expo: https://docs.expo.dev
- React Navigation: https://reactnavigation.org/docs/getting-started
- EAS Build: https://docs.expo.dev/build/introduction
