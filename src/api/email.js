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

export async function notifyEventApproved(eventId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-event-approved`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ event_id: eventId }),
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'ส่งอีเมลแจ้งเตือนไม่สำเร็จ');
  }
}
