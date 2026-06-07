# CONTEXT.md

## Проект: Forge Ahead (FitMatch) — MVP онлайн-платформы персональных фитнес-тренировок

**Дата создания контекста:** 06 июня 2026  
**Текущий статус:** Активная разработка MVP, основные фичи реализованы, ведётся тестирование и полировка

---

### 1. Что это за проект

Онлайн-платформа-маркетплейс для персональных фитнес-тренировок:
- **Клиенты** ищут тренеров в каталоге, бронируют слоты, оплачивают и получают ссылку на видео-тренировку
- **Тренеры** ведут расписание (слоты), настраивают услуги и цены, получают заявки от клиентов
- **Администратор** модерирует тренеров (одобрение/блокировка), видит общую статистику

Это адаптация/перенос проекта "Your Helpful Assistant" (образовательная платформа) под фитнес-домен, с полным переходом с **Vite + React Router DOM** на **TanStack Start** архитектуру.

---

### 2. Технологический стек

| Слой | Технология | Версия |
|------|-----------|--------|
| Framework | TanStack Start (React 19 + TanStack Router + TanStack Query) | ^1.167.50 |
| Стили | Tailwind CSS v4 + oklch дизайн-токены | ^4.2.1 |
| Backend / Auth / DB | Lovable Cloud (Supabase) | — |
| Билд | Vite + @lovable.dev/vite-tanstack-config | ^7.3.1 |
| SSR / Деплой | Cloudflare Worker (edge runtime) | — |
| Валидация | Zod | ^3.24.2 |
| Формы | React Hook Form | ^7.71.2 |
| UI | shadcn/ui + Radix UI + Lucide icons | — |
| Toast | Sonner | ^2.0.7 |
| Видео-звонки | Daily.co API | — |
| Charts | Recharts | ^2.15.4 |

**Важно:** Проект использует **strict TypeScript** (`strict: true`). Любой unresolved import вызывает hard build failure.

---

### 3. Структура проекта

```
forge-ahead/
├── .lovable/
│   ├── plan.md                    # Исходный план миграции с React Router DOM
│   └── project.json
├── supabase/
│   ├── migrations/                # 13 SQL-миграций (см. раздел 5)
│   └── config.toml
├── src/
│   ├── routes/                    # TanStack Router — file-based routing
│   │   ├── __root.tsx             # Root layout: QueryClient, AuthProvider, Toaster
│   │   ├── _authenticated.tsx     # Защищённый layout: редирект на /auth, SiteHeader/Footer
│   │   ├── index.tsx              # Лендинг (hero, features, roles, CTA)
│   │   ├── auth.tsx               # Вход / регистрация с выбором роли
│   │   ├── trainers.tsx           # Каталог тренеров (поиск, фильтрация)
│   │   ├── trainers.$id.tsx       # Профиль тренера + услуги + слоты
│   │   └── _authenticated/
│   │       ├── dashboard.tsx      # Кабинет клиента (профиль, бронирования, оплата)
│   │       ├── booking.tsx        # Форма бронирования (тренер, услуга, слот)
│   │       ├── trainer.tsx        # Дашборд тренера (заявки, управление статусами)
│   │       ├── trainer.schedule.tsx  # Управление свободными слотами
│   │       ├── trainer.services.tsx  # Управление услугами/ценами
│   │       └── admin.tsx          # Админ-панель (модерация тренеров, статистика)
│   ├── components/
│   │   ├── SiteHeader.tsx         # Sticky header с навигацией и аватаром
│   │   ├── SiteFooter.tsx         # Футер
│   │   └── ui/                    # shadcn/ui компоненты (~40 компонентов)
│   ├── hooks/
│   │   ├── use-auth.tsx           # Auth context (user, session, roles, rolesLoading)
│   │   └── use-mobile.tsx         # Mobile viewport hook
│   ├── lib/
│   │   ├── queries.ts             # TanStack Query queryOptions (trainers, bookings)
│   │   ├── daily.functions.ts     # Server Fn: createMeetingForBooking (Daily.co)
│   │   ├── utils.ts               # cn() helper
│   │   ├── error-capture.ts
│   │   └── error-page.ts
│   ├── integrations/supabase/
│   │   ├── client.ts              # Browser Supabase client (НЕ ТРОГАТЬ — auto-generated)
│   │   ├── client.server.ts       # Admin/service-role client (server only)
│   │   ├── auth-middleware.ts     # requireSupabaseAuth middleware
│   │   ├── auth-attacher.ts       # attachSupabaseAuth (авто-прикрепление Bearer токена)
│   │   └── types.ts               # Generated DB types (НЕ ТРОГАТЬ)
│   ├── styles.css                 # Дизайн-токены в oklch (fitness: deep slate + electric lime)
│   ├── router.tsx                 # createRouter с QueryClient в контексте
│   └── start.ts                   # createStart + errorMiddleware + attachSupabaseAuth
├── .env                           # Supabase env vars (auto-generated)
├── vite.config.ts                 # Стандартный @lovable.dev/vite-tanstack-config
├── package.json
└── tsconfig.json
```

---

### 4. Архитектура роутинга (TanStack Start)

| Путь | Файл | Описание |
|------|------|----------|
| `/` | `index.tsx` | Лендинг (публичный) |
| `/auth` | `auth.tsx` | Вход/регистрация (публичный) |
| `/trainers` | `trainers.tsx` | Каталог тренеров (публичный) |
| `/trainers/:id` | `trainers.$id.tsx` | Профиль тренера (публичный) |
| `/dashboard` | `_authenticated/dashboard.tsx` | Кабинет клиента |
| `/booking` | `_authenticated/booking.tsx` | Бронирование с `?trainerId=&serviceId=` |
| `/trainer` | `_authenticated/trainer.tsx` | Дашборд тренера |
| `/trainer/schedule` | `_authenticated/trainer.schedule.tsx` | Расписание тренера |
| `/trainer/services` | `_authenticated/trainer.services.tsx` | Услуги тренера |
| `/admin` | `_authenticated/admin.tsx` | Админ-панель |

**Защита `_authenticated`:** `beforeLoad` делает `getSession()` → редирект на `/auth` если нет сессии.

---

### 5. База данных (Supabase / Lovable Cloud)

#### 5.1 Основные таблицы

| Таблица | Назначение | Ключевые поля |
|---------|-----------|---------------|
| `profiles` | Профиль пользователя | `id`, `full_name`, `avatar_url`, `phone`, `telegram`, `whatsapp`, `bio` |
| `user_roles` | Роли пользователей (отдельная таблица!) | `user_id`, `role` enum: `admin`/`trainer`/`client` |
| `trainers` | Доп. данные тренера | `user_id`, `specialization`, `experience_years`, `price_per_hour`, `rating`, `is_approved` |
| `services` | Услуги тренера | `id`, `trainer_id`, `title`, `description`, `duration_min`, `price` |
| `availability_slots` | Свободные слоты тренера | `id`, `trainer_id`, `start_at`, `end_at`, `is_booked` |
| `bookings` | Бронирования | `id`, `client_id`, `trainer_id`, `service_id`, `slot_id`, `scheduled_at`, `status`, `notes`, `payment_status`, `amount`, `meeting_url` |

#### 5.2 Типы enum

- `app_role`: `admin`, `trainer`, `client`
- `booking_status`: `pending`, `confirmed`, `completed`, `cancelled`

#### 5.3 Ключевые функции и триггеры

| Название | Тип | Назначение |
|----------|-----|------------|
| `has_role(_user_id, _role)` | SQL security definer | Проверка роли (без рекурсивных RLS проблем) |
| `handle_new_user()` | Trigger AFTER INSERT ON auth.users | Автосоздание профиля + роли при регистрации. Читает `raw_user_meta_data->>'role'` и `->>'full_name'`. Для `trainer` — автосоздаёт запись в `trainers` с `is_approved = false` |
| `set_updated_at()` | Trigger BEFORE UPDATE | Обновляет `updated_at` на `profiles` |
| `sync_slot_booked()` | Trigger AFTER INSERT/UPDATE/DELETE ON bookings | Автоматически ставит/снимает `is_booked` у `availability_slots` |
| `enforce_client_booking_update()` | Trigger BEFORE UPDATE ON bookings | Клиент может только отменять бронирование (status = cancelled), не может менять другие поля |
| `protect_trainer_approval()` | Trigger BEFORE UPDATE ON trainers | Только админ может менять `is_approved` |
| `admin_set_trainer_approved(uuid, boolean)` | RPC | Безопасное одобрение тренера через admin-проверку |

#### 5.4 RLS-политики (ключевые принципы)

- `profiles`: SELECT для всех authenticated, UPDATE только свой
- `user_roles`: SELECT свои роли, admin видит все. INSERT/UPDATE/DELETE только admin ( restrictive policies)
- `trainers`: SELECT только одобренные (`is_approved = true`) + свои + admin
- `services`: SELECT public, ALL только свой trainer_id
- `availability_slots`: SELECT free slots of approved trainers (public), ALL — свой trainer_id
- `bookings`: SELECT — свой (client/trainer) или admin. UPDATE — тренер меняет статус, клиент только cancel

#### 5.5 Хронология миграций

| Миграция | Дата | Суть |
|----------|------|------|
| `ecd137c1` | 23.05 | Базовая схема: роли, profiles, trainers, services, bookings, RLS, handle_new_user trigger |
| `e70798b0` | 23.05 | Revoke execute на security definer функции |
| `e487baaf` | 23.05 | Фикс set_updated_at (security definer) |
| `6b893c95` | 24.05 | Security fixes: restrictive policies на user_roles, enforce_client_booking_update trigger |
| `d83480a6` | 25.05 | availability_slots + sync_slot_booked trigger, slot_id в bookings |
| `90a627a4` | 25.05 | Revoke execute на sync_slot_booked |
| `5930bc07` | 25.05 | Revoke execute на handle_new_user, set_updated_at, enforce_client_booking_update |
| `9e57f74b` | 26.05 | **CRITICAL FIX:** handle_new_user читает `raw_user_meta_data->>'role'` — теперь регистрация с выбранной ролью работает |
| `3130f22f` | 26.05 | Создание admin + trainer роли для novikovmm1981@gmail.com |
| `1c1be4fe` | 27.05 | Добавлены `payment_status`, `amount`, `meeting_url` в bookings |
| `34dcec1f` | 28.05 | Добавлены `telegram`, `whatsapp` в profiles |
| `bf5855d2` | 01.06 | GRANT execute has_role для authenticated |
| `f6292363` | 01.06 | protect_trainer_approval trigger, admin_set_trainer_approved RPC, удалён дублирующий client role |

---

### 6. Роли и права доступа

| Роль | Возможности |
|------|-------------|
| `client` | Регистрация → `user_roles` = client. Просмотр каталога тренеров, бронирование слотов, оплата, личный кабинет с историей тренировок, редактирование профиля |
| `trainer` | Регистрация с ролью trainer → автосоздание записи в `trainers` (is_approved=false). Управление услугами, расписанием (слоты), получение заявок, подтверждение/завершение бронирований. **Тренер виден в каталоге только после одобрения админом** |
| `admin` | Модерация тренеров (одобрение/снятие), просмотр всех бронирований, статистика (количество тренеров, бронирований, на модерации) |

**Важно:** У одного пользователя может быть несколько ролей (например, admin + trainer).

---

### 7. Авторизация и серверные функции

#### 7.1 Auth flow

1. Регистрация через `supabase.auth.signUp()` с `data: { full_name, role }`
2. Триггер `handle_new_user` автоматически создаёт `profiles` + `user_roles`
3. `AuthProvider` слушает `onAuthStateChange`, загружает роли из `user_roles`, предоставляет через `useAuth()`
4. `attachSupabaseAuth` (в `start.ts`) автоматически прикрепляет `Authorization: Bearer <token>` к server fn вызовам
5. Защищённые server fn используют `requireSupabaseAuth` middleware

#### 7.2 Server Functions (`createServerFn`)

| Функция | Файл | Назначение |
|---------|------|------------|
| `createMeetingForBooking` | `src/lib/daily.functions.ts` | Создаёт Daily.co комнату для бронирования. Требует `DAILY_API_KEY`. Проверяет доступ (client_id или trainer_id). Комната истекает через 4 часа после `scheduled_at`. Сохраняет `meeting_url` в bookings. |

---

### 8. Основные UI-страницы и функционал

#### 8.1 Лендинг (`/`)
- Hero с фото тренера, CTA "Начать бесплатно" + "Каталог тренеров"
- Секция "Как это работает" (3 шага)
- Секция ролей (Клиент / Тренер / Админ)
- CTA регистрации

#### 8.2 Каталог тренеров (`/trainers`)
- Карточки тренеров (аватар, имя, специализация, рейтинг, опыт, цена)
- Поиск по имени/специализации
- Кнопки "Профиль" и "Бронь"

#### 8.3 Профиль тренера (`/trainers/:id`)
- Инфо о тренере + аватар
- Список услуг с ценами и длительностью
- Свободные слоты
- Кнопка "Забронировать слот" (редирект на `/booking`)

#### 8.4 Бронирование (`/booking`)
- Выбор тренера (предзаполняется из URL)
- Выбор услуги (Select)
- Выбор свободного слота (Select) или ручной ввод datetime
- Комментарий
- После создания → редирект в dashboard для оплаты

#### 8.5 Кабинет клиента (`/dashboard`)
- **Профиль:** редактирование ФИО, телефона, Telegram, WhatsApp, аватар
- **Мои бронирования:** список с датой, статусом оплаты, кнопкой "Оплатить" или "Подключиться (dev)"
- **Тренеры для теста:** быстрое создание тестового бронирования + Daily.co комнаты

#### 8.6 Кабинет тренера (`/trainer`)
- Заявки клиентов: подтвердить / отклонить / завершить
- Ссылки на "Мои услуги" и "Расписание"

#### 8.7 Расписание тренера (`/trainer/schedule`)
- Добавление слотов (datetime-local начало/окончание)
- Список слотов с меткой "Свободен" / "Забронирован"
- Удаление свободных слотов

#### 8.8 Услуги тренера (`/trainer/services`)
- Добавление услуги (название, описание, длительность, цена)
- Список с удалением

#### 8.9 Админ-панель (`/admin`)
- Статистика: количество тренеров, бронирований, на модерации
- Список всех тренеров с тогглом "Одобрить / Снять"
- Защита отряда: только `has_role('admin')` может менять `is_approved`

---

### 9. Видео-звонки (Daily.co)

- При нажатии "Подключиться (dev)" или "Оплатить" вызывается server fn `createMeetingForBooking`
- Создаётся комната Daily.co с именем `fm-{booking_id}-{timestamp}`
- Комната `privacy: "public"`, `exp` = `scheduled_at + 4 часа`
- URL сохраняется в `bookings.meeting_url`
- При повторном вызове — возвращается существующий URL

**Требует:** `DAILY_API_KEY` в environment variables.

---

### 10. Дизайн-система

- Цветовая схема в `src/styles.css` через **oklch**
- **Светлая тема:** фон `oklch(0.99 0.003 250)` (почти белый), акцент `oklch(0.84 0.17 130)` (electric lime)
- **Тёмная тема:** фон `oklch(0.129 0.042 264.695)` (deep slate)
- Все компоненты используют семантические токены (`--accent`, `--primary`, `--muted` и т.д.)
- Нет хардкод-цветов в компонентах

---

### 11. Известные баги и их история исправлений

#### 11.1 Баг: Все пользователи регистрировались как `client`
- **Причина:** `handle_new_user` всегда вставлял `'client'`, игнорируя `raw_user_meta_data->>'role'`
- **Исправление:** Миграция `20260526073731` — триггер теперь читает `raw_user_meta_data->>'role'` и автосоздаёт `trainers` запись для новых тренеров

#### 11.2 Баг: Тренеры не видны в каталоге
- **Причина:** RLS политика trainers требовала `is_approved = true`, но `is_approved` по умолчанию `false`
- **Исправление:** Админ одобряет тренеров через `/admin`. Также фикс `protect_trainer_approval` — только админ может менять `is_approved`

#### 11.3 Баг: Кнопка "Подключиться (dev)" не работала
- **Причина:** В `vite.config.ts` была кастомная сборка с `nitro({ preset: "vercel" })` и несуществующей опцией `cloudflare: false`, что ломало TypeScript-сборку. Из-за этого server fn `createMeetingForBooking` запускалась без `SUPABASE_URL`
- **Исправление:** Возврат `vite.config.ts` к стандартной конфигурации `@lovable.dev/vite-tanstack-config`

#### 11.4 Баг: Дублирующая роль `client` у админа
- **Причина:** После фикса `handle_new_user` у существующего пользователя осталась роль `client` + `admin` + `trainer`
- **Исправление:** Миграция `f6292363` — удалён дубль `client` у `9853d362-0163-462b-8ca6-09fee9bad507`

#### 11.5 Баг: `has_role()` не работал для authenticated
- **Причина:** Отсутствовал `GRANT EXECUTE`
- **Исправление:** Миграция `bf5855d2` — `GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated`

---

### 12. Безопасность (security posture)

- **RLS включены** на всех пользовательских таблицах
- **Security definer** функции (`has_role`, `handle_new_user`, `sync_slot_booked`, `enforce_client_booking_update`, `protect_trainer_approval`) с `search_path = public`
- **Restrictive policies** на `user_roles` — только admin может менять роли
- **Trigger** `enforce_client_booking_update` — клиент может только отменять, не редактировать
- **Trigger** `protect_trainer_approval` — только admin меняет `is_approved`
- **Server fn** `createMeetingForBooking` проверяет `client_id === userId || trainer_id === userId`
- **Admin client** (`supabaseAdmin`) используется только в server fn, никогда не импортируется на клиент

---

### 13. Что реализовано ✅

- [x] Авторизация (регистрация/вход) с выбором роли
- [x] Автосоздание профиля и роли при регистрации
- [x] Лендинг с hero, features, CTA
- [x] Каталог тренеров с поиском
- [x] Профиль тренера с услугами и слотами
- [x] Бронирование тренировки (с выбором слота/услуги)
- [x] Кабинет клиента (профиль, история, оплата)
- [x] Кабинет тренера (заявки, управление статусами)
- [x] Управление расписанием (CRUD слотов)
- [x] Управление услугами (CRUD)
- [x] Админ-панель (модерация, статистика)
- [x] RLS + security definer функции
- [x] Daily.co интеграция для видео-тренировок
- [x] Полная типизация TypeScript

---

### 14. Что в TODO / планируется

- [ ] **Stripe / Paddle** — реальные платежи (сейчас dev-режим: оплата = создание Daily комнаты)
- [ ] **Отзывы (reviews)** — клиент оставляет отзыв после завершённой тренировки
- [ ] **Избранные тренеры** — клиент может добавлять тренеров в избранное
- [ ] **Фильтры в каталоге** — по цене, специализации, рейтингу
- [ ] **Пагинация** — в каталоге тренеров
- [ ] **Уведомления** — email/SMS о подтверждении бронирования
- [ ] **Чат** — мессенджер клиент-тренер (или интеграция Telegram)
- [ ] **Аналитика для тренера** — доход, количество тренировок, графики
- [ ] **Загрузка аватаров** — через Supabase Storage вместо URL
- [ ] **SEO-оптимизация** — динамические meta для профилей тренеров

---

### 15. Как запустить локально

```bash
# Установка зависимостей
bun install

# Dev-сервер
bun dev

# Сборка
bun run build

# Для Daily.co видео — добавьте в .env.local:
# DAILY_API_KEY=your_daily_co_api_key
```

**Важно:** `.env` файл auto-generated — не редактировать вручную. Дополнительные секреты добавляйте через Lovable Secrets или `.env.local`.

---

### 16. Контакты и ресурсы

- **GitHub:** https://github.com/MichaelNovikau888/forge-ahead
- **Preview URL:** https://id-preview--6644baa9-0f31-4b1f-b9a9-249c011c3188.lovable.app
- **Published URL:** https://nurture-code-base.lovable.app
- **Lovable Project ID:** `6644baa9-0f31-4b1f-b9a9-249c011c3188`

---

*Документ поддерживается в актуальном состоянии. При внесении крупных изменений — обновляй разделы 5, 8, 11, 13, 14.*

---

## Изменения от 07 июня 2026

### Bug: дублирование ролей у одного пользователя
- У пользователя `9853d362-0163-462b-8ca6-09fee9bad507` (Михаил Новиков, novikovmm1981@gmail.com) одновременно были роли `trainer` и `admin`.
- Удалена роль `trainer` (DELETE из `public.user_roles`), оставлена только `admin`.

### UI: заголовок дашборда зависит от роли
- В `src/routes/_authenticated/dashboard.tsx` заголовок теперь динамический:
  - `admin` → «Кабинет администратора» / «Управление платформой и сводка.»
  - иначе → «Кабинет клиента» / «Твои тренировки и история.»
- Используется `roles` из `useAuth()`.
