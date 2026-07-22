-- ================================================================
-- BAM ADMIN TOOL — Migration 2: Special Program attendance,
-- percentage discounts on sales, and stock removal tracking
-- Run this in your EXISTING live Supabase project:
-- Dashboard -> SQL Editor -> New query -> paste all of this -> Run
--
-- Safe to run even if some of this was already applied.
-- ================================================================

-- ---------------------------------------------------------------
-- 1. Attendance: Special Programs get their own column, just like Camps
-- ---------------------------------------------------------------
alter table attendance add column if not exists special_program_package_id text references packages(id);

drop index if exists attendance_unique_slot;
create unique index if not exists attendance_unique_slot on attendance
  (player_id, date, session_type,
   coalesce(location_id::text, ''),
   coalesce(camp_package_id::text, ''),
   coalesce(special_program_package_id::text, ''));

-- ---------------------------------------------------------------
-- 2. Sales: percentage discount + a note field
--    (the "discount" column keeps storing the peso amount, unchanged,
--    so existing reports/exports don't break — these two are additive)
-- ---------------------------------------------------------------
alter table sales add column if not exists discount_pct numeric;
alter table sales add column if not exists discount_note text;

-- ---------------------------------------------------------------
-- 3. Stock log: tag each entry so removals (damaged/lost items) are
--    distinguishable from normal restocks
-- ---------------------------------------------------------------
alter table stock_log add column if not exists reason text not null default 'restock';

-- ================================================================
-- Done. After this runs successfully:
--   - Special Programs (Summer Program, Kinder Program, etc.) will get
--     their own attendance column once you deploy the updated app code
--   - Daily Sales can record a % discount instead of a peso amount
--   - Inventory can log damaged/lost stock removals with a reason
--   - Nothing about your existing players, parents, or attendance is touched
-- ================================================================
