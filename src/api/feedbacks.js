import { supabase } from '../lib/supabase.js';

export async function sendFeedback(userId, message) {
  const { error } = await supabase.from('feedbacks').insert({ user_id: userId, message });
  if (error) throw error;
}

export async function listFeedbacks({ unreadOnly = false } = {}) {
  let q = supabase
    .from('feedbacks')
    .select('*, profiles(title, first_name, last_name, departments(name))')
    .order('created_at', { ascending: false });
  if (unreadOnly) q = q.eq('is_read', false);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function setFeedbackRead(id, isRead) {
  const { error } = await supabase.from('feedbacks').update({ is_read: isRead }).eq('id', id);
  if (error) throw error;
}