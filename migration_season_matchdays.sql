-- ================================================================
-- BAM ADMIN TOOL — Migration 3: Season packages, payment due dates,
-- universal enrollment discounts, and Match Day payments
-- Run this in your EXISTING live Supabase project:
-- Dashboard -> SQL Editor -> New query -> paste all of this -> Run
--
-- Safe to run even if some of this was already applied.
-- ================================================================

-- ---------------------------------------------------------------
-- 1. Packages: pricing fields for the new "season" category
--    (Performance Package (Season 2026-2027), and future seasons)
--    camp_start_date / camp_end_date are reused as the season's
--    own start/end window — same "fixed calendar window" concept
--    Camps already use.
-- ---------------------------------------------------------------
alter table packages add column if not exists annual_amount numeric;
alter table packages add column if not exists semi_annual_amount numeric;  -- per payment (x2 total)
alter table packages add column if not exists quarterly_amount numeric;   -- per payment (x4 total)

-- ---------------------------------------------------------------
-- 2. Enrollments: universal discount, season-only prorate
--    adjustment, and which plan was chosen for season packages
-- ---------------------------------------------------------------
alter table enrollments add column if not exists discount numeric not null default 0;
alter table enrollments add column if not exists prorate_adjustment numeric not null default 0;
alter table enrollments add column if not exists plan text; -- 'annual' | 'semi_annual' | 'quarterly' — season packages only

-- ---------------------------------------------------------------
-- 3. Payment log: record what discount (if any) applied to that
--    specific payment, for accurate reporting
-- ---------------------------------------------------------------
alter table payment_log add column if not exists discount numeric not null default 0;

-- ---------------------------------------------------------------
-- 4. Match Days: standalone payment ledger, not tied to attendance
-- ---------------------------------------------------------------
create table if not exists match_payments (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  player_id uuid references players(id),
  amount numeric not null default 0,
  discount numeric not null default 0,
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
alter table match_payments enable row level security;
drop policy if exists "match_payments_all_authenticated" on match_payments;
create policy "match_payments_all_authenticated" on match_payments for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------
-- 5. Seed the season package itself
-- ---------------------------------------------------------------
insert into packages (id, name, description, amount, credits, expiry_days, terms, sort_order, category, camp_start_date, camp_end_date, annual_amount, semi_annual_amount, quarterly_amount)
values ('season2627', 'Performance Package (Season 2026-2027)', 'Full season, choose Annual, Semi Annual, or Quarterly payments', 81600, null, 365, 1,
        (select coalesce(max(sort_order), 0) + 1 from packages),
        'season', '2026-07-01', '2027-06-30', 81600, 43200, 22800)
on conflict (id) do nothing;

-- ================================================================
-- Done. After this runs successfully:
--   - You can create "Performance Package (Season 2026-2027)" under
--     the new Season category once you deploy the updated app code
--   - Every enrollment (any package) supports a discount at signup
--   - Payment due dates now compute automatically for any package
--     with more than 1 term (this covers your existing Performance
--     Quarterly/Semi Annual packages too — no data change needed,
--     due dates are calculated from each enrollment's start date)
--   - A new Match Days tab will appear for one-off payments
--   - Nothing about your existing players, parents, or attendance
--     is touched
-- ================================================================
