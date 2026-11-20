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
  // ดึงข้อมูลกิจกรรม
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('id, title, academic_year, created_by')
    .eq('id', eventId)
    .single();

  if (eventErr || !event) {
    throw eventErr || new Error('ไม่พบข้อมูลกิจกรรม');
  }

  const eventTitle = event.title || 'กิจกรรมใหม่';
  const academicYear = String(event.academic_year || '');

  // 1. แจ้งผู้จัดกิจกรรม (organizer ที่สร้างกิจกรรม) ถ้ามีอีเมล
  let creatorNotified = false;
  let creatorEmail = null;
  if (event.created_by) {
    const { data: creator } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', event.created_by)
      .maybeSingle();

    if (creator?.email && creator.email.trim()) {
      creatorEmail = creator.email.trim();
      const creatorName = `${creator.first_name ?? ''} ${creator.last_name ?? ''}`.trim() || 'ผู้จัดกิจกรรม';
      try {
        await sendEmail('event_approved', creatorEmail, {
          name: creatorName,
          eventTitle,
          academicYear,
        });
        creatorNotified = true;
      } catch (err) {
        console.warn('Failed to send event_approved email to creator:', err);
      }
    }
  }

  // 2. ดึงรายชื่อนักศึกษาทุกคนที่มีอีเมล
  const { data: students, error: studentErr } = await supabase
    .from('profiles')
    .select('first_name, last_name, email')
    .eq('role', 'student')
    .neq('email', '');

  if (studentErr) {
    console.warn('Failed to fetch students for event notification:', studentErr);
    throw studentErr;
  }

  // กรองเฉพาะคนที่มีอีเมล ไม่ซ้ำกัน และไม่ซ้ำกับอีเมลผู้จัด
  const seenEmails = new Set();
  const notifyList = [];
  for (const s of students ?? []) {
    const email = s.email?.trim().toLowerCase();
    if (!email) continue;
    if (creatorEmail && email === creatorEmail.toLowerCase()) continue;
    if (seenEmails.has(email)) continue;
    seenEmails.add(email);
    notifyList.push({ ...s, email: s.email.trim() });
  }

  // ส่งอีเมลให้นักศึกษาทีละชุด (5 คนต่อชุด) เพื่อไม่ให้ติด rate limit
  const results = [];
  const batchSize = 5;
  for (let i = 0; i < notifyList.length; i += batchSize) {
    const batch = notifyList.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map((s) => {
        const name = `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() || 'นักศึกษา';
        return sendEmail('new_event_notify', s.email, {
          name,
          eventTitle,
          academicYear,
        });
      }),
    );
    results.push(...batchResults);
  }

  const sentStudents = results.filter((r) => r.status === 'fulfilled').length;

  return {
    success: true,
    totalStudents: notifyList.length,
    sentStudents,
    sentCount: sentStudents + (creatorNotified ? 1 : 0),
    creatorNotified,
  };
}
