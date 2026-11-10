import { supabase } from '../lib/supabase.js';

function withDeptName(row) {
  return { ...row, department_name: row.departments?.name ?? '' };
}

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, departments(name)')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return withDeptName(data);
}

export async function updateProfile(userId, patch) {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('*, departments(name)')
    .single();
  if (error) throw error;
  return withDeptName(data);
}

// สำหรับ Admin
export async function listUsers({ search = '', departmentId = '', level = '', role = '' } = {}) {
  let q = supabase.from('profiles').select('*, departments(name)').order('created_at', { ascending: false });
  if (search.trim()) {
    const s = search.trim().replace(/[,()%]/g, ' ');
    q = q.or(`student_code.ilike.%${s}%,first_name.ilike.%${s}%,last_name.ilike.%${s}%`);
  }
  if (departmentId) q = q.eq('department_id', departmentId);
  if (level) q = q.eq('level', level);
  if (role) q = q.eq('role', role);
  const { data, error } = await q;
  if (error) throw error;
  return data.map(withDeptName);
}

export async function setUserRole(userId, role) {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
  if (error) throw error;
}