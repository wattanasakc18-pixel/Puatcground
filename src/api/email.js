import { supabase } from '../lib/supabase.js';

/**
 * ส่งอีเมลผ่าน Edge Function send-email
 * type: 'registered' | 'closing_soon' | 'event_ended' | 'event_open' | 'password_reset'
 * to: อีเมลผู้รับ
 * data: ข้อมูลสำหรับ template
 */
export async function sendEmail(type, to, data = {}) {
  if (!to) return; // ไม่มีอีเมลข้ามไปเลย
  const { error } = await supabase.functions.invoke('send-email', {
    body: { type, to, data },
  });
  if (error) throw error;
}

// ── Helpers สำหรับแต่ละ event ────────────────────────────────────────────────

export function emailRegistered({ email, name, eventTitle, eventDate, level }) {
  return sendEmail('registered', email, { name, eventTitle, eventDate, level });
}

export function emailClosingSoon({ email, name, eventTitle, closeDate }) {
  return sendEmail('closing_soon', email, { name, eventTitle, closeDate });
}

export function emailEventEnded({ email, name, eventTitle, eventDate }) {
  return sendEmail('event_ended', email, { name, eventTitle, eventDate });
}

export function emailEventOpen({ email, name, eventTitle, eventDate, closeDate, level }) {
  return sendEmail('event_open', email, { name, eventTitle, eventDate, closeDate, level });
}

export function emailPasswordReset({ email, name, newPassword }) {
  return sendEmail('password_reset', email, { name, newPassword });
}
