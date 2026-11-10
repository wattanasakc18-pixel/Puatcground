-- ============================================================
-- Puatc Ground — schema.sql
-- รันครั้งเดียวใน Supabase SQL Editor แล้วได้ครบทั้งระบบ
-- ประกอบด้วย: ตาราง, ทริกเกอร์, RPC, View, RLS, Storage
-- หมายเหตุ: ข้อมูลเดียวที่ใส่ไว้คือรายชื่อแผนกวิชาจริง (ข้อ 3.2)
-- ============================================================

-- ------------------------------------------------------------
-- 1. ตาราง
-- ------------------------------------------------------------

-- แผนกวิชา (อ่านได้โดยไม่ต้อง login เพราะหน้าสมัครสมาชิกต้องใช้)
create table public.departments (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique
);

-- โปรไฟล์ผู้ใช้ ผูก 1:1 กับ auth.users (ไม่เก็บรหัสผ่านเอง)
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  student_code  text not null unique,              -- ใช้เป็น Username (ส่วนหน้า @ ของอีเมล)
  role          text not null default 'student' check (role in ('admin','organizer','student')),
  title         text not null default '',          -- คำนำหน้า
  first_name    text not null default '',
  last_name     text not null default '',
  department_id uuid references public.departments(id),
  level         text check (level in ('ปวช.','ปวส.')),
  class_room    text not null default '',          -- ชั้นปี/ห้อง เช่น "2/1"
  email         text not null default '',          -- อีเมลติดต่อ (ไม่ใช่อีเมล login)
  phone         text not null default '',
  avatar_url    text not null default '',
  created_at    timestamptz not null default now()
);

-- หมวดกิจกรรม
create table public.event_categories (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique
);

-- กิจกรรม
-- approval_status: organizer สร้าง = 'pending' (รออนุมัติ), Admin สร้าง/อนุมัติ = 'approved'
-- นักเรียนเห็นและลงชื่อได้เฉพาะ approved
create table public.events (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  description       text not null default '',
  category_id       uuid references public.event_categories(id),
  academic_year     text not null,                 -- เช่น '2569'
  registration_type text not null check (registration_type in ('individual','booth')),
  copied_from       uuid references public.events(id) on delete set null,
  created_by        uuid references public.profiles(id) on delete set null, -- ผู้สร้างกิจกรรม
  approval_status   text not null default 'pending' check (approval_status in ('pending','approved')),
  created_at        timestamptz not null default now()
);

-- ระดับที่เข้าร่วมกิจกรรม (หัวใจของ ทำรวม/ทำแยก/ระดับเดียว)
-- ทำรวม = 2 แถววันเดียวกัน / ทำแยก = 2 แถวคนละวันและโควตา / ระดับเดียว = 1 แถว
create table public.event_levels (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  level        text not null check (level in ('ปวช.','ปวส.')),
  event_date   date not null,                      -- วันจัดจริง
  reg_open_at  timestamptz not null,
  reg_close_at timestamptz not null,
  min_per_dept integer check (min_per_dept >= 0),   -- null = ไม่กำหนด
  max_per_dept integer check (max_per_dept >= 0),   -- null = ไม่จำกัด
  unique (event_id, level),
  check (reg_close_at > reg_open_at),
  check (min_per_dept is null or max_per_dept is null or min_per_dept <= max_per_dept)
);

-- ช่องฟอร์มของกิจกรรม (สร้างโดย Admin ผ่าน Form Builder)
create table public.event_form_fields (
  id               uuid primary key default gen_random_uuid(),
  event_id         uuid not null references public.events(id) on delete cascade,
  label            text not null,
  field_type       text not null check (field_type in ('text','textarea','number','select','multiselect','checkbox','date','image')),
  required         boolean not null default false,
  sort_order       integer not null default 0,
  options          jsonb not null default '[]'::jsonb,  -- array ของ string สำหรับ select/multiselect
  applies_to_level text check (applies_to_level in ('ปวช.','ปวส.')), -- null = ทุกระดับ
  is_active        boolean not null default true,       -- soft delete เก็บคำตอบเก่าไว้
  created_at       timestamptz not null default now()
);

-- การลงชื่อ (answers: key = id ของช่องฟอร์ม ไม่ใช่ชื่อช่อง)
create table public.registrations (
  id                uuid primary key default gen_random_uuid(),
  event_level_id    uuid not null references public.event_levels(id) on delete restrict,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  department_id     uuid not null references public.departments(id), -- ระบบใส่ให้ ณ ตอนลงชื่อ
  registration_type text not null check (registration_type in ('individual','booth')),
  answers           jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  cancelled_at      timestamptz
);

-- รายบุคคล: 1 คนลงได้ครั้งเดียวต่อ event_level (เฉพาะที่ยังไม่ยกเลิก)
-- รายบูธ: ลงได้หลายครั้ง จึงไม่มี index นี้บังคับ
create unique index registrations_unique_individual
  on public.registrations (event_level_id, user_id)
  where cancelled_at is null and registration_type = 'individual';

create index registrations_event_level_idx on public.registrations (event_level_id) where cancelled_at is null;
create index registrations_user_idx on public.registrations (user_id);

-- ผู้ดูแลกิจกรรม (Organizer คนไหนดูแลกิจกรรมระดับไหน)
create table public.event_organizers (
  event_level_id uuid not null references public.event_levels(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  primary key (event_level_id, user_id)
);

-- คำติชมถึง Admin
create table public.feedbacks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  message    text not null,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. ฟังก์ชัน helper
-- ------------------------------------------------------------

-- เช็กว่าผู้ใช้ปัจจุบันเป็น Admin หรือไม่
-- SECURITY DEFINER เพื่อตัด recursion ของ RLS บน profiles
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- เช็กว่าเป็นผู้จัดกิจกรรม (organizer)
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

-- เช็กว่าเป็นเจ้าของกิจกรรมที่ยังรออนุมัติ (ใช้สิทธิ์แก้ระดับ/ช่องฟอร์ม)
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

-- ตรวจคำตอบช่องบังคับ (ใช้ทั้งตอนลงชื่อและตอนแก้คำตอบ)
-- โยน error ภาษาไทยเมื่อกรอกไม่ครบ
create or replace function public.validate_answers(p_event_id uuid, p_level text, p_answers jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  f public.event_form_fields%rowtype;
  a jsonb;
begin
  for f in
    select * from public.event_form_fields
    where event_id = p_event_id
      and is_active = true
      and required = true
      and (applies_to_level is null or applies_to_level = p_level)
    order by sort_order
  loop
    a := p_answers -> f.id::text;
    if a is null or a = 'null'::jsonb then
      raise exception 'กรุณากรอก "%" ให้ครบถ้วน', f.label;
    end if;
    if f.field_type in ('text','textarea','select','date','image') and coalesce(a #>> '{}','') = '' then
      raise exception 'กรุณากรอก "%" ให้ครบถ้วน', f.label;
    end if;
    if f.field_type = 'multiselect' and (jsonb_typeof(a) <> 'array' or jsonb_array_length(a) = 0) then
      raise exception 'กรุณาเลือก "%" อย่างน้อย 1 ตัวเลือก', f.label;
    end if;
    if f.field_type = 'checkbox' and a <> 'true'::jsonb then
      raise exception 'กรุณาติ๊กเลือก "%"', f.label;
    end if;
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- 3. ทริกเกอร์
-- ------------------------------------------------------------

-- 3.1 สร้างโปรไฟล์อัตโนมัติเมื่อมีผู้ใช้ใหม่ใน auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id, student_code, role, title, first_name, last_name,
    department_id, level, class_room, email, phone, avatar_url
  ) values (
    new.id,
    split_part(new.email, '@', 1),
    'student',                                   -- บังคับ role เริ่มต้นเสมอ
    coalesce(new.raw_user_meta_data ->> 'title', ''),
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(new.raw_user_meta_data ->> 'department_id', '')::uuid,
    nullif(new.raw_user_meta_data ->> 'level', ''),
    coalesce(new.raw_user_meta_data ->> 'class_room', ''),
    coalesce(new.raw_user_meta_data ->> 'contact_email', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3.2 กันแก้ role / student_code
-- ผู้ใช้ทั่วไปแก้ของตัวเองไม่ได้, Admin แก้ role ได้
-- การรัน SQL ตรง (auth.uid() เป็น null) แก้ได้ทุกอย่าง เพื่อตั้ง Admin คนแรก
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    if new.student_code is distinct from old.student_code then
      raise exception 'ไม่สามารถเปลี่ยนรหัสนักศึกษาได้';
    end if;
    if new.role is distinct from old.role and not public.is_admin() then
      raise exception 'เฉพาะผู้ดูแลระบบเท่านั้นที่เปลี่ยนบทบาทได้';
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_profile_fields_trigger
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- 3.2.1 กันผู้จัดกิจกรรมอนุมัติกิจกรรมตัวเอง / โอนเจ้าของ
-- เฉพาะ Admin (หรือ SQL ตรงที่ auth.uid() เป็น null) เปลี่ยน approval_status/created_by ได้
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

create trigger protect_event_fields_trigger
  before update on public.events
  for each row execute function public.protect_event_fields();

-- 3.3 ตรวจก่อน INSERT ลง registrations
-- บังคับที่ฐานข้อมูล: ระดับต้องตรง, อยู่ในช่วงรับสมัคร, ไม่เกินโควตา, ช่องบังคับครบ
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
      raise exception 'ปิดรับสมัครแล้ว ไม่สามารถลงชื่อได้ กรุณาติดต่อผู้ดูแลกิจกรรม';
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

  -- ช่องบังคับต้องกรอกครบ (เฉพาะช่องที่ใช้กับระดับของผู้ใช้)
  perform public.validate_answers(el.event_id, p.level, new.answers);

  -- ระบบใส่ค่าให้เอง ไม่เชื่อค่าที่ส่งมาจาก client
  new.department_id := p.department_id;
  new.registration_type := e.registration_type;
  return new;
end;
$$;

create trigger check_registration_trigger
  before insert on public.registrations
  for each row execute function public.check_registration();

-- ------------------------------------------------------------
-- 4. RPC (นักเรียนไม่มีสิทธิ์ UPDATE ตาราง registrations ตรงๆ)
-- ------------------------------------------------------------

-- 4.1 ยกเลิกการลงชื่อ: เจ้าของยกเลิกได้ก่อนปิดรับสมัคร, Admin ทำได้ตลอด
create or replace function public.cancel_registration(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.registrations%rowtype;
  el public.event_levels%rowtype;
begin
  select * into r from public.registrations where id = p_id;
  if not found then
    raise exception 'ไม่พบรายการลงชื่อนี้';
  end if;
  if r.cancelled_at is not null then
    raise exception 'รายการนี้ถูกยกเลิกไปแล้ว';
  end if;
  if r.user_id is distinct from auth.uid() and not public.is_admin() then
    raise exception 'คุณไม่มีสิทธิ์ยกเลิกรายการนี้';
  end if;
  select * into el from public.event_levels where id = r.event_level_id;
  if not public.is_admin() and now() > el.reg_close_at then
    raise exception 'ปิดรับสมัครแล้ว ไม่สามารถยกเลิกได้ กรุณาติดต่อผู้ดูแลกิจกรรม';
  end if;
  update public.registrations set cancelled_at = now() where id = p_id;
end;
$$;

-- 4.2 แก้คำตอบ: เงื่อนไขเดียวกับยกเลิก และตรวจช่องบังคับด้วย
create or replace function public.update_registration_answers(p_id uuid, p_answers jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.registrations%rowtype;
  el public.event_levels%rowtype;
  p public.profiles%rowtype;
begin
  select * into r from public.registrations where id = p_id;
  if not found then
    raise exception 'ไม่พบรายการลงชื่อนี้';
  end if;
  if r.cancelled_at is not null then
    raise exception 'รายการนี้ถูกยกเลิกไปแล้ว ไม่สามารถแก้ไขได้';
  end if;
  if r.user_id is distinct from auth.uid() and not public.is_admin() then
    raise exception 'คุณไม่มีสิทธิ์แก้ไขรายการนี้';
  end if;
  select * into el from public.event_levels where id = r.event_level_id;
  if not public.is_admin() and now() > el.reg_close_at then
    raise exception 'ปิดรับสมัครแล้ว ไม่สามารถแก้ไขได้ กรุณาติดต่อผู้ดูแลกิจกรรม';
  end if;
  select * into p from public.profiles where id = r.user_id;
  perform public.validate_answers(el.event_id, p.level, p_answers);
  update public.registrations set answers = p_answers where id = p_id;
end;
$$;

-- 4.3 คัดลอกกิจกรรมข้ามปี (Admin คัดลอกได้ทุกกิจกรรม, Organizer เฉพาะที่ตัวเองสร้าง)
-- คัดลอกกิจกรรม + ทุกระดับ (เลื่อนวันที่ +1 ปี) + ช่องฟอร์มที่ยัง active
-- สำเนาใหม่: Admin = approved ทันที, Organizer = pending รออนุมัติ
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

-- ------------------------------------------------------------
-- 5. View (ผู้ที่ login เท่านั้น)
-- Postgres view รันด้วยสิทธิ์เจ้าของและข้าม RLS
-- จึง REVOKE จาก anon/public แล้ว GRANT ให้ authenticated เท่านั้น
-- ------------------------------------------------------------

-- รายชื่อตัวแทนที่ยังไม่ยกเลิก (ไม่มีอีเมล/เบอร์โทรของโปรไฟล์)
create or replace view public.registration_roster as
select
  r.id,
  r.event_level_id,
  el.event_id,
  el.level,
  r.department_id,
  d.name as department_name,
  p.title,
  p.first_name,
  p.last_name,
  p.student_code,
  p.avatar_url,
  p.class_room,
  r.answers,
  r.created_at
from public.registrations r
join public.event_levels el on el.id = r.event_level_id
join public.departments d on d.id = r.department_id
join public.profiles p on p.id = r.user_id
where r.cancelled_at is null;

revoke all on public.registration_roster from public, anon, authenticated;
grant select on public.registration_roster to authenticated;

-- ทุกแผนก × ทุกระดับกิจกรรม พร้อมจำนวนที่ลงชื่อ (นับแยกตามระดับต่อแผนกเสมอ)
create or replace view public.dept_registration_counts as
select
  el.id as event_level_id,
  el.event_id,
  el.level,
  d.id as department_id,
  d.name as department_name,
  el.min_per_dept,
  el.max_per_dept,
  count(r.id)::integer as registered,
  (el.min_per_dept is not null and count(r.id) < el.min_per_dept) as is_below_min,
  (el.max_per_dept is not null and count(r.id) >= el.max_per_dept) as is_full
from public.event_levels el
cross join public.departments d
left join public.registrations r
  on r.event_level_id = el.id
 and r.department_id = d.id
 and r.cancelled_at is null
group by el.id, el.event_id, el.level, d.id, d.name, el.min_per_dept, el.max_per_dept;

revoke all on public.dept_registration_counts from public, anon, authenticated;
grant select on public.dept_registration_counts to authenticated;

-- ------------------------------------------------------------
-- 6. RLS
-- ------------------------------------------------------------

alter table public.departments        enable row level security;
alter table public.profiles           enable row level security;
alter table public.event_categories   enable row level security;
alter table public.events             enable row level security;
alter table public.event_levels       enable row level security;
alter table public.event_form_fields  enable row level security;
alter table public.registrations      enable row level security;
alter table public.event_organizers   enable row level security;
alter table public.feedbacks          enable row level security;

-- departments: อ่านได้ทุกคน (รวมยังไม่ login) เขียนเฉพาะ Admin
create policy departments_read on public.departments
  for select to anon, authenticated using (true);
create policy departments_admin_write on public.departments
  for insert to authenticated with check (public.is_admin());
create policy departments_admin_update on public.departments
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy departments_admin_delete on public.departments
  for delete to authenticated using (public.is_admin());

-- profiles: อ่าน/แก้ของตัวเอง, Admin อ่าน/แก้ทั้งหมด (trigger กันแก้ role/student_code อีกชั้น)
create policy profiles_read_own on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ข้อมูลกิจกรรม: ผู้ที่ login อ่านได้ เฉพาะ Admin เขียน
create policy categories_read on public.event_categories
  for select to authenticated using (true);
create policy categories_admin_write on public.event_categories
  for insert to authenticated with check (public.is_admin());
create policy categories_admin_update on public.event_categories
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy categories_admin_delete on public.event_categories
  for delete to authenticated using (public.is_admin());

-- กิจกรรม: เห็นเฉพาะ approved / ของตัวเอง / Admin เห็นทั้งหมด
-- Organizer สร้างได้ (บังคับ pending + เป็นเจ้าของ) แก้/ลบได้เฉพาะของตัวเองตอน pending
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

-- ระดับกิจกรรม: เห็นได้เมื่อเห็นกิจกรรมแม่ได้, เขียนได้เฉพาะ Admin หรือเจ้าของตอน pending
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

-- ช่องฟอร์ม: ช่องที่ลบแล้วเห็นเฉพาะ Admin/เจ้าของตอน pending, กิจกรรม pending เห็นเฉพาะเจ้าของ/Admin
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

create policy event_organizers_read on public.event_organizers
  for select to authenticated using (true);
create policy event_organizers_admin_write on public.event_organizers
  for insert to authenticated with check (public.is_admin());
create policy event_organizers_admin_delete on public.event_organizers
  for delete to authenticated using (public.is_admin());

-- registrations: ลงชื่อในนามตัวเองเท่านั้น อ่านได้เฉพาะของตัวเอง (Admin อ่านทั้งหมด)
-- ไม่มี policy UPDATE/DELETE — ต้องผ่าน RPC เท่านั้น
create policy registrations_insert_own on public.registrations
  for insert to authenticated with check (user_id = auth.uid());
create policy registrations_read_own on public.registrations
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- feedbacks: ส่งในนามตัวเอง Admin อ่าน/แก้ทั้งหมด
create policy feedbacks_insert_own on public.feedbacks
  for insert to authenticated with check (user_id = auth.uid());
create policy feedbacks_admin_read on public.feedbacks
  for select to authenticated using (public.is_admin());
create policy feedbacks_admin_update on public.feedbacks
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- สิทธิ์เรียกฟังก์ชัน
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

revoke all on function public.is_organizer() from public, anon;
grant execute on function public.is_organizer() to authenticated;

revoke all on function public.owns_pending_event(uuid) from public, anon;
grant execute on function public.owns_pending_event(uuid) to authenticated;

revoke all on function public.validate_answers(uuid, text, jsonb) from public, anon, authenticated;

revoke all on function public.cancel_registration(uuid) from public, anon;
grant execute on function public.cancel_registration(uuid) to authenticated;

revoke all on function public.update_registration_answers(uuid, jsonb) from public, anon;
grant execute on function public.update_registration_answers(uuid, jsonb) to authenticated;

revoke all on function public.copy_event(uuid, text) from public, anon;
grant execute on function public.copy_event(uuid, text) to authenticated;

-- ------------------------------------------------------------
-- 7. Storage: avatars และ form-uploads (public อ่านได้)
-- อัปโหลด/แก้/ลบได้เฉพาะโฟลเดอร์ชื่อ user id ของตัวเอง เช่น <user_id>/<ไฟล์>
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('form-uploads', 'form-uploads', true)
on conflict (id) do nothing;

create policy storage_public_read on storage.objects
  for select to public
  using (bucket_id in ('avatars', 'form-uploads'));

create policy storage_own_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('avatars', 'form-uploads')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy storage_own_update on storage.objects
  for update to authenticated
  using (
    bucket_id in ('avatars', 'form-uploads')
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id in ('avatars', 'form-uploads')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy storage_own_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('avatars', 'form-uploads')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ------------------------------------------------------------
-- 8. ข้อมูลพื้นฐาน: แผนกวิชาจริง (ข้อ 3.2) — ไม่มีข้อมูลตัวอย่างอื่น
-- ------------------------------------------------------------

insert into public.departments (name) values
  ('การบัญชี'),
  ('เทคโนโลยีสารสนเทศ'),
  ('ช่างอิเล็กทรอนิกส์'),
  ('แมคคาทรอนิกส์'),
  ('ช่างกลโรงงาน'),
  ('ช่างก่อสร้าง'),
  ('การตลาด'),
  ('การโรงแรม'),
  ('ช่างยนต์'),
  ('ช่างไฟฟ้ากำลัง');