import { supabase } from '../lib/supabase.js';

const EVENT_SELECT = '*, event_categories(name), event_levels(*)';

export async function listEvents({ year = '', categoryId = '', search = '', approvedOnly = true, createdBy = '' } = {}) {
  let q = supabase.from('events').select(EVENT_SELECT).order('created_at', { ascending: false });
  if (approvedOnly) q = q.eq('approval_status', 'approved');
  if (createdBy) q = q.eq('created_by', createdBy);
  if (year) q = q.eq('academic_year', year);
  if (categoryId) q = q.eq('category_id', categoryId);
  if (search.trim()) q = q.ilike('title', `%${search.trim()}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function getEvent(id) {
  const { data, error } = await supabase.from('events').select(EVENT_SELECT).eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function createEvent(payload) {
  const { data, error } = await supabase.from('events').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateEvent(id, patch) {
  const { error } = await supabase.from('events').update(patch).eq('id', id);
  if (error) throw error;
}

export async function approveEvent(id) {
  const { error } = await supabase.from('events').update({ approval_status: 'approved' }).eq('id', id);
  if (error) throw error;
}

export async function deleteEvent(id) {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
}

export async function copyEvent(eventId, newYear) {
  const { data, error } = await supabase.rpc('copy_event', { p_event_id: eventId, p_new_year: newYear });
  if (error) throw error;
  return data;
}

// ระดับที่เข้าร่วมกิจกรรม
export async function createEventLevel(payload) {
  const { error } = await supabase.from('event_levels').insert(payload);
  if (error) throw error;
}

export async function updateEventLevel(id, patch) {
  const { error } = await supabase.from('event_levels').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteEventLevel(id) {
  const { error } = await supabase.from('event_levels').delete().eq('id', id);
  if (error) throw error;
}

// ช่องฟอร์ม
export async function listFormFields(eventId, { includeInactive = false } = {}) {
  let q = supabase.from('event_form_fields').select('*').eq('event_id', eventId).order('sort_order');
  if (!includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

// ช่องฟอร์มของหลายกิจกรรมพร้อมกัน (ใช้ในไทม์ไลน์โปรไฟล์)
export async function listFormFieldsForEvents(eventIds) {
  if (eventIds.length === 0) return [];
  const { data, error } = await supabase
    .from('event_form_fields')
    .select('*')
    .in('event_id', eventIds)
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function createFormField(payload) {
  const { error } = await supabase.from('event_form_fields').insert(payload);
  if (error) throw error;
}

export async function updateFormField(id, patch) {
  const { error } = await supabase.from('event_form_fields').update(patch).eq('id', id);
  if (error) throw error;
}

// ลบแบบ soft delete เพื่อไม่ให้คำตอบเก่าหาย
export async function softDeleteFormField(id) {
  const { error } = await supabase.from('event_form_fields').update({ is_active: false }).eq('id', id);
  if (error) throw error;
}

// ผู้จัดกิจกรรม
export async function listOrganizerLevels(userId) {
  const { data, error } = await supabase
    .from('event_organizers')
    .select('event_level_id')
    .eq('user_id', userId);
  if (error) throw error;
  return data.map((r) => r.event_level_id);
}

export async function addOrganizer(eventLevelId, userId) {
  const { error } = await supabase.from('event_organizers').insert({ event_level_id: eventLevelId, user_id: userId });
  if (error) throw error;
}

export async function removeOrganizer(eventLevelId, userId) {
  const { error } = await supabase
    .from('event_organizers')
    .delete()
    .eq('event_level_id', eventLevelId)
    .eq('user_id', userId);
  if (error) throw error;
}