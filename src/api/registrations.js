import { supabase } from '../lib/supabase.js';

const REG_SELECT = '*, event_levels(*, events(*, event_categories(name)))';

export async function myRegistrations(userId, { activeOnly = false } = {}) {
  let q = supabase
    .from('registrations')
    .select(REG_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (activeOnly) q = q.is('cancelled_at', null);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function register(eventLevelId, userId, answers) {
  // department_id และ registration_type ถูกใส่โดย trigger ฝั่งฐานข้อมูล
  const { error } = await supabase.from('registrations').insert({
    event_level_id: eventLevelId,
    user_id: userId,
    answers,
  });
  if (error) {
    if (error.code === '23505') throw new Error('คุณลงชื่อกิจกรรมนี้แล้ว');
    throw error;
  }
}

export async function cancelRegistration(id) {
  const { error } = await supabase.rpc('cancel_registration', { p_id: id });
  if (error) throw error;
}

export async function updateAnswers(id, answers) {
  const { error } = await supabase.rpc('update_registration_answers', { p_id: id, p_answers: answers });
  if (error) throw error;
}

// จำนวนผู้ลงชื่อรายแผนกของระดับกิจกรรม (จาก view)
export async function countsForDept(departmentId) {
  const { data, error } = await supabase
    .from('dept_registration_counts')
    .select('*')
    .eq('department_id', departmentId);
  if (error) throw error;
  return data;
}

export async function countsForEvent(eventId) {
  const { data, error } = await supabase
    .from('dept_registration_counts')
    .select('*')
    .eq('event_id', eventId);
  if (error) throw error;
  return data;
}

export async function allCounts() {
  const { data, error } = await supabase.from('dept_registration_counts').select('*');
  if (error) throw error;
  return data;
}