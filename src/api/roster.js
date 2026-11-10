import { supabase } from '../lib/supabase.js';

export async function getRoster(eventId) {
  const { data, error } = await supabase
    .from('registration_roster')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at');
  if (error) throw error;
  return data;
}