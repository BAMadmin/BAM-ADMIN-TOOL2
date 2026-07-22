-- ================================================================
-- BAM ADMIN TOOL — Migration: Locations, Camps & Special Programs
-- Run this in your EXISTING live Supabase project:
-- Dashboard -> SQL Editor -> New query -> paste all of this -> Run
--
-- Safe to run even if some of this was already applied — every
-- statement uses IF NOT EXISTS / ON CONFLICT so re-running won't
-- duplicate anything or error out.
-- ================================================================

-- ---------------------------------------------------------------
-- 1. Locations
-- ---------------------------------------------------------------
create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  enabled boolean not null default true,
  sort_order int not null default 99,
  created_at timestamptz default now()
);
alter table locations enable row level security;
drop policy if exists "locations_all_authenticated" on locations;
create policy "locations_all_authenticated" on locations for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into locations (name, enabled, sort_order) values
  ('Arca', true, 1),
  ('Ateneo', true, 2),
  ('Polo Club', false, 3)
on conflict (name) do nothing;

-- ---------------------------------------------------------------
-- 2. Packages: add category + camp date fields
-- ---------------------------------------------------------------
alter table packages add column if not exists category text not null default 'standard';
alter table packages add column if not exists camp_start_date date;
alter table packages add column if not exists camp_end_date date;

-- ---------------------------------------------------------------
-- 3. Enrollments: add kit tracking (camps issue a kit at enrollment)
-- ---------------------------------------------------------------
alter table enrollments add column if not exists kit_jersey_sku_id uuid references merchandise(id);
alter table enrollments add column if not exists kit_shorts_sku_id uuid references merchandise(id);

-- ---------------------------------------------------------------
-- 4. Attendance: add location_id + camp_package_id, and replace the
--    old uniqueness rule with one that accounts for both
-- ---------------------------------------------------------------
alter table attendance add column if not exists location_id uuid references locations(id);
alter table attendance add column if not exists camp_package_id text references packages(id);

-- Drop the old constraint (name may vary slightly depending on how it was created — both are covered)
alter table attendance drop constraint if exists attendance_player_id_date_session_type_key;
alter table attendance drop constraint if exists attendance_player_id_date_key;

create unique index if not exists attendance_unique_slot on attendance
  (player_id, date, session_type, coalesce(location_id::text, ''), coalesce(camp_package_id::text, ''));

-- ================================================================
-- Done. After this runs successfully:
--   - A "Locations" tab will work once you deploy the updated app code
--   - Arca and Ateneo are enabled; Polo Club exists but is disabled
--   - Existing packages all default to category = 'standard' (no change in behavior)
--   - Nothing about your existing players, parents, attendance, or sales is touched
-- ================================================================
