-- ============================================================
-- Puatc Ground — reset.sql
-- ล้างทุกอย่างที่ schema.sql สร้างไว้ เพื่อรัน schema.sql ใหม่ได้
-- คำเตือน: ลบข้อมูลทั้งหมดรวมโปรไฟล์และไฟล์ที่อัปโหลด (ไม่ลบ auth.users)
-- ============================================================

-- View
drop view if exists public.registration_roster;
drop view if exists public.dept_registration_counts;

-- ทริกเกอร์
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists protect_profile_fields_trigger on public.profiles;
drop trigger if exists protect_event_fields_trigger on public.events;
drop trigger if exists check_registration_trigger on public.registrations;

-- ฟังก์ชัน
drop function if exists public.handle_new_user();
drop function if exists public.protect_profile_fields();
drop function if exists public.protect_event_fields();
drop function if exists public.check_registration();
drop function if exists public.is_admin();
drop function if exists public.is_organizer();
drop function if exists public.owns_pending_event(uuid);
drop function if exists public.validate_answers(uuid, text, jsonb);
drop function if exists public.cancel_registration(uuid);
drop function if exists public.update_registration_answers(uuid, jsonb);
drop function if exists public.copy_event(uuid, text);

-- ตาราง (cascade จัดการ foreign key ที่เหลือ)
drop table if exists public.feedbacks cascade;
drop table if exists public.event_organizers cascade;
drop table if exists public.registrations cascade;
drop table if exists public.event_form_fields cascade;
drop table if exists public.event_levels cascade;
drop table if exists public.events cascade;
drop table if exists public.event_categories cascade;
drop table if exists public.profiles cascade;
drop table if exists public.departments cascade;

-- Storage: ลบไฟล์แล้วลบ bucket
drop policy if exists storage_public_read on storage.objects;
drop policy if exists storage_own_insert on storage.objects;
drop policy if exists storage_own_update on storage.objects;
drop policy if exists storage_own_delete on storage.objects;

delete from storage.objects where bucket_id in ('avatars', 'form-uploads');
delete from storage.buckets where id in ('avatars', 'form-uploads');