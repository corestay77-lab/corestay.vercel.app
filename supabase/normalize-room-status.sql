-- CoreStay PMS
-- Normalize legacy room status values.

update public.pms_rooms
set status = 'CLEAN'
where status = 'VACANT_CLEAN';

update public.pms_rooms
set status = 'DIRTY'
where status = 'VACANT_DIRTY';
