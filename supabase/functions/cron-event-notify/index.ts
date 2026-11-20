import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function sendEmail(type: string, to: string, data: Record<string, string>) {
  if (!to) return;
  try {
    await admin.functions.invoke('send-email', { body: { type, to, data } });
  } catch (e) {
    console.error(`sendEmail failed for ${to}:`, e);
  }
}

function fullName(p: { first_name?: string; last_name?: string } | null) {
  if (!p) return 'นักศึกษา';
  return `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'นักศึกษา';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' },
    });
  }

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD ใน UTC (ใกล้เคียง Bangkok ±7h)

  // ── 1. closing_soon: กิจกรรมที่จะปิดรับสมัครใน 1 วัน ────────────────────
  // หา event_levels ที่ reg_close_at อยู่ระหว่างพรุ่งนี้ 00:00 - 23:59 UTC+7
  const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000).toISOString().slice(0, 10);

  const { data: closingSoonLevels } = await admin
    .from('event_levels')
    .select('id, level, reg_close_at, event_id, events(title, academic_year)')
    .gte('reg_close_at', `${tomorrow}T00:00:00+07:00`)
    .lt('reg_close_at', `${tomorrow}T23:59:59+07:00`);

  for (const level of closingSoonLevels ?? []) {
    // ดึงผู้ที่ลงชื่อใน event_level นี้
    const { data: regs } = await admin
      .from('registrations')
      .select('profiles(first_name, last_name, email)')
      .eq('event_level_id', level.id)
      .is('cancelled_at', null);

    for (const reg of regs ?? []) {
      const p = reg.profiles as { first_name?: string; last_name?: string; email?: string } | null;
      if (!p?.email) continue;
      const event = level.events as { title: string } | null;
      await sendEmail('closing_soon', p.email, {
        name: fullName(p),
        eventTitle: event?.title ?? '',
        closeDate: new Date(level.reg_close_at).toLocaleDateString('th-TH', {
          timeZone: 'Asia/Bangkok', day: 'numeric', month: 'long', year: 'numeric',
        }),
      });
    }
  }

  // ── 2. event_ended: กิจกรรมที่จัดไปแล้ว (event_date = เมื่อวาน) ──────────
  const yesterday = new Date(now.getTime() - 24 * 3600 * 1000).toISOString().slice(0, 10);

  const { data: endedLevels } = await admin
    .from('event_levels')
    .select('id, level, event_date, event_id, events(title)')
    .eq('event_date', yesterday);

  for (const level of endedLevels ?? []) {
    const { data: regs } = await admin
      .from('registrations')
      .select('profiles(first_name, last_name, email)')
      .eq('event_level_id', level.id)
      .is('cancelled_at', null);

    for (const reg of regs ?? []) {
      const p = reg.profiles as { first_name?: string; last_name?: string; email?: string } | null;
      if (!p?.email) continue;
      const event = level.events as { title: string } | null;
      await sendEmail('event_ended', p.email, {
        name: fullName(p),
        eventTitle: event?.title ?? '',
        eventDate: new Date(`${level.event_date}T00:00:00+07:00`).toLocaleDateString('th-TH', {
          timeZone: 'Asia/Bangkok', day: 'numeric', month: 'long', year: 'numeric',
        }),
      });
    }
  }

  console.log(`cron-event-notify done: closing_soon=${closingSoonLevels?.length ?? 0}, ended=${endedLevels?.length ?? 0}`);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
});
