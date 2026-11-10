-- ============================================================
-- Puatc Ground — migration-organizer-approval.sql
-- สำหรับฐานข้อมูลที่รัน schema.sql เวอร์ชันแรกไปแล้วเท่านั้น
-- (ถ้าเริ่มใหม่ ให้รัน schema.sql เวอร์ชันล่าสุดแทน ไม่ต้องรันไฟล์นี้)
--
-- สิ่งที่เพิ่ม:
--   บทบาท "ผู้จัดกิจกรรม" (organizer) สร้างกิจกรรมเองได้
--   กิจกรรมของ organizer = 'pending' รอ Admin อนุมัติก่อนนักเรียนเห็น/ลงชื่อ
--   กิจกรรมของ Admin = 'approved' ทันที
-- รันครั้งเดียวใน Supabase SQL Editor
-- ============================================================

-- 1. คอลัมน์ใหม่ใน events
alter table public.events add column if not exists created_by uuid references public.profiles(id) on delete set null;
alter table public.events add column if not exists approval_status text not null default 'pending'
  check (approval_status in ('pending','approved'));

-- กิจกรรมเดิม (ก่อนมีระบบอนุมัติ ไม่มี created_by) ถือว่าอนุมัติแล้วทั้งหมด
update public.events set approval_status = 'approved' where created_by is null;

-- 2. ฟังก์ชัน helper ใหม่
create or replace function public.is_organizer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'organizer'
  );
$$;

create or replace function public.owns_pending_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.events
    where id = p_event_id
      and created_by = auth.uid()
      and approval_status = 'pending'
  );
$$;

revoke all on function public.is_organizer() from public, anon;
grant execute on function public.is_organizer() to authenticated;
revoke all on function public.owns_pending_event(uuid) from public, anon;
grant execute on function public.owns_pending_event(uuid) to authenticated;

-- 3. ทริกเกอร์กัน organizer อนุมัติกิจกรรมตัวเอง / โอนเจ้าของ
create or replace function public.protect_event_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.approval_status is distinct from old.approval_status then
      raise exception 'เฉพาะผู้ดูแลระบบเท่านั้นที่อนุมัติกิจกรรมได้';
    end if;
    if new.created_by is distinct from old.created_by then
      raise exception 'ไม่สามารถเปลี่ยนเจ้าของกิจกรรมได้';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_event_fields_trigger on public.events;
create trigger protect_event_fields_trigger
  before update on public.events
  for each row execute function public.protect_event_fields();

-- 4. ตรวจก่อนลงชื่อ: เพิ่มการเช็กว่ากิจกรรมได้รับอนุมัติแล้ว
create or replace function public.check_registration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  el public.event_levels%rowtype;
  e  public.events%rowtype;
  p  public.profiles%rowtype;
  v_count integer;
  v_admin boolean;
begin
  select * into el from public.event_levels where id = new.event_level_id;
  if not found then
    raise exception 'ไม่พบกิจกรรมที่ต้องการลงชื่อ';
  end if;
  select * into e from public.events where id = el.event_id;
  select * into p from public.profiles where id = new.user_id;
  v_admin := public.is_admin();

  -- Admin ข้ามการตรวจช่วงเวลา/ระดับ/การอนุมัติได้
  if not v_admin then
    if e.approval_status <> 'approved' then
      raise exception 'กิจกรรมนี้ยังไม่ได้รับอนุมัติจากผู้ดูแลระบบ จึงยังลงชื่อไม่ได้';
    end if;
    if p.level is distinct from el.level then
      raise exception 'กิจกรรมนี้ไม่ได้เปิดสำหรับระดับ % ของคุณ', coalesce(p.level, '-');
    end if;
    if now() < el.reg_open_at then
      raise exception 'ยังไม่เปิดรับสมัคร กรุณากลับมาใหม่ในช่วงเปิดรับสมัคร';
    end if;
    if now() > el.reg_close_at then
      raise exception 'ปิดรับสมัครแล้ว ไม่สามารถลงชื่อได้ กรุณาติดต่อผู้จัดกิจกรรม';
    end if;
  end if;

  -- advisory lock กันกดพร้อมกันจนเกินโควตา (ล็อกต่อ event_level + แผนก)
  perform pg_advisory_xact_lock(hashtext(new.event_level_id::text || ':' || p.department_id::text));

  if el.max_per_dept is not null then
    select count(*) into v_count
    from public.registrations
    where event_level_id = new.event_level_id
      and department_id = p.department_id
      and cancelled_at is null;
    if v_count >= el.max_per_dept then
      raise exception 'แผนกของคุณลงชื่อครบจำนวนสูงสุดแล้ว (% คน)', el.max_per_dept;
    end if;
  end if;

  perform public.validate_answers(el.event_id, p.level, new.answers);

  new.department_id := p.department_id;
  new.registration_type := e.registration_type;
  return new;
end;
$$;

-- 5. copy_event: Organizer คัดลอกกิจกรรมตัวเองได้ สำเนาใหม่เป็น pending
create or replace function public.copy_event(p_event_id uuid, p_new_year text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.events%rowtype;
  el public.event_levels%rowtype;
  f public.event_form_fields%rowtype;
  v_new_id uuid;
begin
  select * into e from public.events where id = p_event_id;
  if not found then
    raise exception 'ไม่พบกิจกรรมต้นฉบับ';
  end if;
  if auth.uid() is not null and not public.is_admin() and e.created_by is distinct from auth.uid() then
    raise exception 'คัดลอกได้เฉพาะกิจกรรมที่ตัวเองสร้าง';
  end if;

  insert into public.events (title, description, category_id, academic_year, registration_type, copied_from, created_by, approval_status)
  values (
    e.title, e.description, e.category_id, p_new_year, e.registration_type, e.id,
    auth.uid(),
    case when public.is_admin() or auth.uid() is null then 'approved' else 'pending' end
  )
  returning id into v_new_id;

  for el in select * from public.event_levels where event_id = p_event_id loop
    insert into public.event_levels (event_id, level, event_date, reg_open_at, reg_close_at, min_per_dept, max_per_dept)
    values (
      v_new_id, el.level,
      (el.event_date + interval '1 year')::date,
      el.reg_open_at + interval '1 year',
      el.reg_close_at + interval '1 year',
      el.min_per_dept, el.max_per_dept
    );
  end loop;

  for f in select * from public.event_form_fields where event_id = p_event_id and is_active loop
    insert into public.event_form_fields (event_id, label, field_type, required, sort_order, options, applies_to_level, is_active)
    values (v_new_id, f.label, f.field_type, f.required, f.sort_order, f.options, f.applies_to_level, true);
  end loop;

  return v_new_id;
end;
$$;

-- 6. RLS ใหม่: organizer สร้าง/แก้/ลบกิจกรรมตัวเองตอน pending, Admin อนุมัติได้
-- ลบ policy เดิมทั้งหมดบน 3 ตารางนี้ (ไม่สนชื่อเดิม) กัน policy เก่าค้าง โดยเฉพาะ events_read แบบ using(true)
do $$
declare pol record;
begin
  for pol in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in ('events','event_levels','event_form_fields')
  loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

create policy events_read on public.events
  for select to authenticated
  using (approval_status = 'approved' or created_by = auth.uid() or public.is_admin());
create policy events_insert on public.events
  for insert to authenticated
  with check (public.is_admin() or (public.is_organizer() and created_by = auth.uid() and approval_status = 'pending'));
create policy events_update on public.events
  for update to authenticated
  using (public.is_admin() or (created_by = auth.uid() and approval_status = 'pending'))
  with check (public.is_admin() or (created_by = auth.uid() and approval_status = 'pending'));
create policy events_delete on public.events
  for delete to authenticated
  using (public.is_admin() or (created_by = auth.uid() and approval_status = 'pending'));

create policy event_levels_read on public.event_levels
  for select to authenticated
  using (exists (select 1 from public.events e where e.id = event_id));
create policy event_levels_insert on public.event_levels
  for insert to authenticated
  with check (public.is_admin() or public.owns_pending_event(event_id));
create policy event_levels_update on public.event_levels
  for update to authenticated
  using (public.is_admin() or public.owns_pending_event(event_id))
  with check (public.is_admin() or public.owns_pending_event(event_id));
create policy event_levels_delete on public.event_levels
  for delete to authenticated
  using (public.is_admin() or public.owns_pending_event(event_id));

create policy form_fields_read on public.event_form_fields
  for select to authenticated
  using (
    public.is_admin()
    or public.owns_pending_event(event_id)
    or (is_active and exists (select 1 from public.events e where e.id = event_id))
  );
create policy form_fields_insert on public.event_form_fields
  for insert to authenticated
  with check (public.is_admin() or public.owns_pending_event(event_id));
create policy form_fields_update on public.event_form_fields
  for update to authenticated
  using (public.is_admin() or public.owns_pending_event(event_id))
  with check (public.is_admin() or public.owns_pending_event(event_id));
create policy form_fields_delete on public.event_form_fields
  for delete to authenticated
  using (public.is_admin() or public.owns_pending_event(event_id));