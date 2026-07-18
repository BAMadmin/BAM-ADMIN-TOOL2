-- ================================================================
-- BAM ADMIN TOOL — Supabase schema (full feature set)
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste all of this -> Run
-- ================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------
-- Profiles: one row per employee/user, linked to Supabase Auth
-- ---------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  email text not null,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "profiles_select_authenticated" on profiles for select using (auth.role() = 'authenticated');
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- ---------------------------------------------------------------
-- Parents
-- ---------------------------------------------------------------
create table if not exists parents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table parents enable row level security;
create policy "parents_all_authenticated" on parents for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------
-- Players
-- ---------------------------------------------------------------
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  nickname text,
  birth_date date not null,
  parent_id uuid references parents(id) on delete set null,
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table players enable row level security;
create policy "players_all_authenticated" on players for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------
-- Packages (editable catalog — no longer hardcoded)
-- ---------------------------------------------------------------
create table if not exists packages (
  id text primary key,
  name text not null,
  description text,
  amount numeric not null default 0,
  credits int,              -- null = unlimited
  expiry_days int not null default 30,
  terms int not null default 1,
  sort_order int,           -- controls display order (lower shows first); not tied to price
  created_at timestamptz default now()
);
alter table packages enable row level security;
create policy "packages_all_authenticated" on packages for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into packages (id, name, description, amount, credits, expiry_days, terms, sort_order) values
  ('trial',   'Trial',                  'Trial session, no charges',                          0,     1,    7,   1, 1),
  ('free',    'Free Session',           'Free session, no charges',                           0,     1,    7,   1, 2),
  ('scholar', 'Scholar',                'Unlimited session credits, no charges',               0,     null, 365, 1, 3),
  ('flex5',   'Flexible 5 Sessions',    '5 session credits, expires after 30 days',            7000,  5,    30,  1, 4),
  ('flex10',  'Flexible 10 Sessions',   '10 session credits, expires after 60 days',           12500, 10,   60,  1, 5),
  ('flex30',  'Flexible 30 Sessions',   '30 session credits, expires after 90 days',           34000, 30,   90,  1, 6),
  ('unl1',    'Unlimited 1 Month',      'Unlimited session credits, expires after 30 days',    12500, null, 30,  1, 7),
  ('unl2',    'Unlimited 2 Months',     'Unlimited session credits, expires after 60 days',    19000, null, 60,  1, 8),
  ('unl3',    'Unlimited 3 Months',     'Unlimited session credits, expires after 90 days',    24000, null, 90,  1, 9),
  ('perfQ',   'Performance Quarterly',  '1 year package, 4 payment terms, unlimited sessions', 22800, null, 365, 4, 10),
  ('perfS',   'Performance Semi Annual','1 year package, 2 payment terms, unlimited sessions', 43200, null, 365, 2, 11),
  ('perfA',   'Performance Annual',     '1 year package, 1-time payment, unlimited sessions',  81600, null, 365, 1, 12)
on conflict (id) do nothing;

-- ---------------------------------------------------------------
-- Enrollments (a player enrolled into a package)
-- ---------------------------------------------------------------
create table if not exists enrollments (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) on delete cascade,
  package_id text,
  package_name text,        -- snapshot, so renaming/deleting a package later doesn't break history
  start_date date not null,
  expiry_date date not null,
  credits int,
  credits_remaining int,
  terms int not null default 1,
  terms_paid int not null default 1,
  amount numeric not null default 0,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
alter table enrollments enable row level security;
create policy "enrollments_all_authenticated" on enrollments for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------
-- Attendance (one row per player per date)
-- ---------------------------------------------------------------
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) on delete cascade,
  date date not null,
  session_type text not null default 'training', -- 'training' | 'match'
  enrollment_id uuid references enrollments(id) on delete set null,
  no_credit boolean not null default false,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  unique (player_id, date, session_type)
);
alter table attendance enable row level security;
create policy "attendance_all_authenticated" on attendance for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------
-- Merchandise catalog + inventory
-- ---------------------------------------------------------------
create table if not exists merchandise (
  id uuid primary key default gen_random_uuid(),
  item text not null,
  size text not null,
  price numeric not null default 0,
  stock int not null default 0,
  created_at timestamptz default now()
);
alter table merchandise enable row level security;
create policy "merchandise_all_authenticated" on merchandise for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

do $$
declare
  sizes text[] := array['XS Kids','S Kids','M Kids','L Kids','XL Kids','S Adult','M Adult','L Adult','XL Adult'];
  sock_sizes text[] := array['S','M','L','XL'];
  s text;
begin
  if (select count(*) from merchandise) = 0 then
    foreach s in array sizes loop
      insert into merchandise (item, size, price, stock) values ('Jersey (Red)', s, 2500, case when s = 'M Kids' then 5 else 0 end);
      insert into merchandise (item, size, price, stock) values ('Shorts (Navy)', s, 2500, 0);
      insert into merchandise (item, size, price, stock) values ('Jersey (Light Blue)', s, 2500, 0);
      insert into merchandise (item, size, price, stock) values ('Jacket - Royal Blue', s, 4500, 0);
      insert into merchandise (item, size, price, stock) values ('Jacket - Navy', s, 4500, 0);
    end loop;
    foreach s in array sock_sizes loop
      insert into merchandise (item, size, price, stock) values ('Socks', s, 500, 0);
    end loop;
    insert into merchandise (item, size, price, stock) values ('Bag - Red', 'One Size', 4500, 0);
    insert into merchandise (item, size, price, stock) values ('Bag - Blue', 'One Size', 4500, 0);
  end if;
end $$;

-- ---------------------------------------------------------------
-- Stock addition log (for Inventory's "Last Restocked" / audit trail)
-- ---------------------------------------------------------------
create table if not exists stock_log (
  id uuid primary key default gen_random_uuid(),
  sku_id uuid references merchandise(id) on delete cascade,
  item text,
  size text,
  qty int not null,
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
alter table stock_log enable row level security;
create policy "stock_log_all_authenticated" on stock_log for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------
-- Sales (Full Kit + single-item lines stored as JSON on the sale)
-- ---------------------------------------------------------------
create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  player_id uuid references players(id),
  lines jsonb not null default '[]',
  discount numeric not null default 0,
  subtotal numeric not null default 0,
  total numeric not null default 0,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
alter table sales enable row level security;
create policy "sales_all_authenticated" on sales for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------
-- Payment log (package payments — first term at enrollment, plus each later term)
-- ---------------------------------------------------------------
create table if not exists payment_log (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id),
  enrollment_id uuid references enrollments(id) on delete cascade,
  package_name text,
  amount numeric not null default 0,
  term_label text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
alter table payment_log enable row level security;
create policy "payment_log_all_authenticated" on payment_log for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
