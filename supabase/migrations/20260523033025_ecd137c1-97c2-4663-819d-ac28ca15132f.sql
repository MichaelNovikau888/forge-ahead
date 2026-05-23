
-- Roles enum and table
create type public.app_role as enum ('admin', 'trainer', 'client');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null default 'client',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users can view own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);
create policy "Admins can view all roles" on public.user_roles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can manage roles" on public.user_roles
  for all to authenticated using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone" on public.profiles
  for select using (true);
create policy "Users can update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

-- Trainers (extra fields for trainer role)
create table public.trainers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  specialization text not null,
  experience_years int not null default 0,
  price_per_hour numeric(10,2) not null default 0,
  rating numeric(3,2) not null default 0,
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.trainers enable row level security;

create policy "Approved trainers are public" on public.trainers
  for select using (is_approved = true or auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "Trainer can insert own" on public.trainers
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Trainer can update own" on public.trainers
  for update to authenticated using (auth.uid() = user_id);
create policy "Admins manage trainers" on public.trainers
  for all to authenticated using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Services (offered by trainers)
create table public.services (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references public.trainers(user_id) on delete cascade not null,
  title text not null,
  description text,
  duration_min int not null default 60,
  price numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.services enable row level security;

create policy "Services are public" on public.services for select using (true);
create policy "Trainer manages own services" on public.services
  for all to authenticated using (auth.uid() = trainer_id) with check (auth.uid() = trainer_id);
create policy "Admins manage all services" on public.services
  for all to authenticated using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Bookings
create type public.booking_status as enum ('pending', 'confirmed', 'completed', 'cancelled');

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references auth.users(id) on delete cascade not null,
  trainer_id uuid references public.trainers(user_id) on delete cascade not null,
  service_id uuid references public.services(id) on delete set null,
  scheduled_at timestamptz not null,
  status public.booking_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now()
);

alter table public.bookings enable row level security;

create policy "Client sees own bookings" on public.bookings
  for select to authenticated using (auth.uid() = client_id);
create policy "Trainer sees their bookings" on public.bookings
  for select to authenticated using (auth.uid() = trainer_id);
create policy "Admin sees all bookings" on public.bookings
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Client creates own booking" on public.bookings
  for insert to authenticated with check (auth.uid() = client_id);
create policy "Client cancels own booking" on public.bookings
  for update to authenticated using (auth.uid() = client_id) with check (auth.uid() = client_id);
create policy "Trainer updates own bookings" on public.bookings
  for update to authenticated using (auth.uid() = trainer_id) with check (auth.uid() = trainer_id);
create policy "Admin manages bookings" on public.bookings
  for all to authenticated using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile + default 'client' role on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  insert into public.user_roles (user_id, role) values (new.id, 'client');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
