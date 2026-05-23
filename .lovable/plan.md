# План: MVP онлайн-платформы для фитнеса на основе "Your Helpful Assistant"

## Контекст

Исходный проект [Your Helpful Assistant](/projects/364c1439-8f42-4f71-a460-694a0358c2e6) использует **Vite + React Router DOM** с `src/pages/`. Текущий проект использует **TanStack Start** с `src/routes/`. Полная копия 1-в-1 файлово невозможна — структура маршрутизации отличается. План: перенести **UI, компоненты, стили, ассеты и логику страниц** один-в-один, адаптируя только слой маршрутизации и backend-вызовы под TanStack Start + новый Lovable Cloud.

Соответствие ролей (исходник → фитнес-MVP):
- Teacher → Trainer (тренер)
- Manager → ? (оставляю как Trainer-менеджер или убираю — см. вопрос ниже, по умолчанию **переименую в Trainer dashboard**, отдельный Manager не делаю)
- Admin → Admin
- Student/Booking → Client/Booking (клиент бронирует тренировки)

## Что переносится 1-в-1

Из исходного проекта копируются без изменений:
- Все компоненты UI (`src/components/ui/*` уже одинаковые — пропускаем)
- `src/components/home/*`, `layout/*`, `schedule/*`, `admin/*`, `teacher/*`, `manager/*` — копия
- `src/components/NavLink.tsx`
- `src/assets/*` — все ассеты
- `src/hooks/*` (кастомные хуки)
- `src/lib/*` (утилиты, кроме клиента Supabase)
- CSS-токены и стили из `src/index.css` → переносятся в `src/styles.css`
- Тексты, копирайт, структура layout

Страницы из `src/pages/` переписываются как route-файлы в `src/routes/`:
- `Index.tsx` → `src/routes/index.tsx` (лендинг с hero, features, CTA)
- `Auth.tsx` → `src/routes/auth.tsx`
- `Dashboard.tsx` → `src/routes/_authenticated/dashboard.tsx` (клиент)
- `TeacherDashboard.tsx` → `src/routes/_authenticated/trainer.tsx`
- `AdminDashboard.tsx` → `src/routes/_authenticated/admin.tsx`
- `Booking.tsx` → `src/routes/_authenticated/booking.tsx`
- `Profile.tsx` → `src/routes/_authenticated/profile.tsx`
- `NotFound.tsx` → используется `__root.tsx` notFoundComponent

## Тематическая адаптация (фитнес)

Контентная переработка поверх перенесённой структуры:
- Лендинг: hero «Найди своего тренера», секция «Каталог тренеров» (маркетплейс), «Как это работает», «Отзывы», CTA регистрации
- Booking: бронирование тренировки у выбранного тренера (вместо урока/занятия)
- Trainer dashboard: расписание, заявки клиентов, профиль, услуги/прайс
- Client dashboard: мои тренировки, история, избранные тренеры
- Admin dashboard: пользователи, тренеры на модерации, общая статистика
- Терминология: тренер/клиент/тренировка/слот вместо учитель/ученик/урок

## Backend (новый Lovable Cloud)

Включается Lovable Cloud для:
- Auth (email/password) + триггер автосоздания профиля
- Таблицы:
  - `profiles` (id, full_name, avatar_url, bio, created_at)
  - `user_roles` (id, user_id, role enum: 'admin'|'trainer'|'client') — отдельная таблица, функция `has_role()` (security definer)
  - `trainers` (user_id, specialization, price_per_hour, experience_years, rating, is_approved)
  - `services` (id, trainer_id, title, description, duration_min, price)
  - `bookings` (id, client_id, trainer_id, service_id, scheduled_at, status: 'pending'|'confirmed'|'completed'|'cancelled')
  - `reviews` (id, booking_id, client_id, trainer_id, rating, comment)
- RLS политики через `has_role()` для админа; клиенты видят свои бронирования; тренеры — свои
- Server functions (createServerFn) для: получить каталог тренеров, создать бронирование, обновить статус, модерация тренеров

## Технические детали

- **Layout-маршрут** `_authenticated.tsx` с `beforeLoad` редиректом на `/auth`, если нет сессии (см. tanstack-route-architecture)
- Внутри `_authenticated` — `<Outlet />` + общий sidebar/nav, скопированный из `src/components/layout/`
- Каждый route файл получает свой `head()` с уникальными title/description/og
- Данные читаются через `queryOptions` + `ensureQueryData` в loader + `useSuspenseQuery` в компоненте
- Все мутации — через `createServerFn` + `useServerFn` + `useMutation` с инвалидацией кеша
- Auth-стейт: `supabase.auth.onAuthStateChange` listener в провайдере на root
- Защищённые server fns используют `requireSupabaseAuth` middleware
- Дизайн-токены (oklch) копируются из исходника в `src/styles.css`; никаких хардкод-цветов в компонентах

## Порядок работ

1. Включить Lovable Cloud
2. Скопировать ассеты, хуки, утилиты, дизайн-токены и UI-компоненты из исходника
3. Создать миграции БД (профили, роли, тренеры, услуги, бронирования, отзывы + RLS + триггер профиля)
4. Реализовать `__root.tsx` (auth-provider, query-client) и `_authenticated.tsx` layout
5. Реализовать `auth.tsx` (sign in/up + emailRedirectTo)
6. Портировать `Index.tsx` → `routes/index.tsx` с фитнес-контентом
7. Портировать дашборды (client/trainer/admin) и booking
8. Server functions для каталога тренеров и бронирований
9. Проверка сборки и базовых сценариев

## Открытый вопрос

В исходнике есть отдельный Manager dashboard. Для фитнес-MVP по умолчанию **не делаю отдельную роль Manager** (объединяю с Admin). Если нужен — скажите, добавлю четвёртую роль.
