import { supabase } from '../lib/supabase.js';

function extOf(file) {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  return fromName && fromName.length <= 5 ? fromName : 'jpg';
}

async function upload(bucket, path, file) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export function uploadAvatar(userId, file) {
  return upload('avatars', `${userId}/avatar_${Date.now()}.${extOf(file)}`, file);
}

export function uploadFormImage(userId, file) {
  return upload('form-uploads', `${userId}/${crypto.randomUUID()}.${extOf(file)}`, file);
}