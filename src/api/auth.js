import { supabase } from '../lib/supabase.js';

// รหัสนักศึกษา → อีเมลภายในสำหรับ Supabase Auth
function toAuthEmail(studentCode) {
  return `${studentCode.trim().toLowerCase()}@puatc.local`;
}

export async function signIn(studentCode, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: toAuthEmail(studentCode),
    password,
  });
  if (error) throw error;
  return data;
}

export async function signUp(studentCode, password, meta) {
  const { data, error } = await supabase.auth.signUp({
    email: toAuthEmail(studentCode),
    password,
    options: { data: meta },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function updatePassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}