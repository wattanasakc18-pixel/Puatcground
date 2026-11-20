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

function fmtThaiDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00+07:00`).toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function fmtThaiTime(timeStr: string) {
  // timeStr เช่น "14:00:00"
  return timeStr.slice(0, 5) + ' น.';
}

Deno.serve(async (_req) => {
  // เวลาปัจจุบันใน Bangkok (UTC+7)
  const nowUTC = new Date();
  const nowBKK = new Date(nowUTC.getTime() + 7 * 3600 * 1000);
  const todayDate = nowBKK.toISOString().slice(0, 10); // YYYY-MM-DD
  const currentHour = nowBKK.getUTCHours();
  const currentMin = nowBKK.getUTCMinutes();
  // เวลาตอนนี้เป็น HH:MM
  const nowTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;

  // หา window ±15 นาที สำหรับ start_time และ end_time
  const windowMs = 15 * 60 * 1000;
  const startWindowBegin = new Date(nowUTC.getTime() - windowMs);
  const startWindowEnd = new Date(nowUTC.getTime() + windowMs);

  // ── 1. ใกล้ปิดรับสมัคร (ปิดพรุ่งนี้) — รันครั้งเดียวต่อวัน ──────────────
  // รันเฉพาะตอน 08:00-08:59 Bangkok เพื่อป้องกันส่งซ้ำ
  if (currentHour === 8) {
    const tomorrowBKK = new Date(nowBKK.getTime() + 24 * 3600 * 1000);
    const tomorrowDate = tomorrowBKK.toISOString().slice(0, 10);

    const { data: closingLevels } = await admin
      .from('event_levels')
      .select('id, level, reg_close_at, event_id, events(title)')
      .gte('reg_close_at', `${tomorrowDate}T00:00:00+07:00`)
      .lt('reg_close_at', `${tomorrowDate}T23:59:59+07:00`);

    for (const level of closingLevels ?? []) {
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
          closeDate: fmtThaiDate(tomorrowDate),
        });
      }
    }
    console.log(`closing_soon: checked ${closingLevels?.length ?? 0} levels`);
  }

  // ── 2. แจ้งเตือนก่อนกิจกรรมเริ่ม 10 นาที ───────────────────────────────
  // หา event_levels ที่ event_date = วันนี้ และ event_start_time อยู่ใน +10-25 นาทีข้างหน้า
  const startMin10 = new Date(nowUTC.getTime() + 10 * 60 * 1000);
  const startMin25 = new Date(nowUTC.getTime() + 25 * 60 * 1000);
  const startTime10 = `${String(startMin10.getUTCHours() + 7 > 23 ? (startMin10.getUTCHours() + 7 - 24) : startMin10.getUTCHours() + 7).padStart(2, '0')}:${String(startMin10.getUTCMinutes()).padStart(2, '0')}`;
  const startTime25 = `${String(startMin25.getUTCHours() + 7 > 23 ? (startMin25.getUTCHours() + 7 - 24) : startMin25.getUTCHours() + 7).padStart(2, '0')}:${String(startMin25.getUTCMinutes()).padStart(2, '0')}`;

  const { data: startingLevels } = await admin
    .from('event_levels')
    .select('id, level, event_date, event_start_time, event_id, events(title)')
    .eq('event_date', todayDate)
    .not('event_start_time', 'is', null)
    .gte('event_start_time', startTime10)
    .lte('event_start_time', startTime25);

  for (const level of startingLevels ?? []) {
    const { data: regs } = await admin
      .from('registrations')
      .select('profiles(first_name, last_name, email)')
      .eq('event_level_id', level.id)
      .is('cancelled_at', null);

    for (const reg of regs ?? []) {
      const p = reg.profiles as { first_name?: string; last_name?: string; email?: string } | null;
      if (!p?.email) continue;
      const event = level.events as { title: string } | null;
      await sendEmail('event_starting', p.email, {
        name: fullName(p),
        eventTitle: event?.title ?? '',
        eventDate: fmtThaiDate(level.event_date),
        startTime: fmtThaiTime(level.event_start_time),
        level: level.level,
      });
    }
  }

  // ── 3. แจ้งเตือนหลังกิจกรรมจบ 10 นาที ──────────────────────────────────
  const endMin = new Date(nowUTC.getTime() - 10 * 60 * 1000);
  const endMinEnd = new Date(nowUTC.getTime() + 5 * 60 * 1000);
  const endTime = `${String(endMin.getUTCHours() + 7 > 23 ? (endMin.getUTCHours() + 7 - 24) : endMin.getUTCHours() + 7).padStart(2, '0')}:${String(endMin.getUTCMinutes()).padStart(2, '0')}`;
  const endTimeEnd = `${String(endMinEnd.getUTCHours() + 7 > 23 ? (endMinEnd.getUTCHours() + 7 - 24) : endMinEnd.getUTCHours() + 7).padStart(2, '0')}:${String(endMinEnd.getUTCMinutes()).padStart(2, '0')}`;

  const { data: endedLevels } = await admin
    .from('event_levels')
    .select('id, level, event_date, event_end_time, event_id, events(title)')
    .eq('event_date', todayDate)
    .not('event_end_time', 'is', null)
    .gte('event_end_time', endTime)
    .lte('event_end_time', endTimeEnd);

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
        eventDate: fmtThaiDate(level.event_date),
      });
    }
  }

  console.log(`cron done: starting=${startingLevels?.length ?? 0}, ended=${endedLevels?.length ?? 0}`);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
});
