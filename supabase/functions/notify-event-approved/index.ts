import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function sendEmail(type: string, to: string, data: Record<string, string>) {
  if (!to) return;
  await adminClient.functions.invoke('send-email', { body: { type, to, data } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' },
    });
  }

  try {
    // ตรวจสิทธิ์ — ต้องเป็น admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return json({ error: 'Unauthorized' }, 401);

    const { data: callerProfile } = await adminClient.from('profiles').select('role').eq('id', caller.id).single();
    if (callerProfile?.role !== 'admin') return json({ error: 'Forbidden' }, 403);

    const { event_id } = await req.json();
    if (!event_id) return json({ error: 'missing event_id' }, 400);

    // ดึงข้อมูลกิจกรรม
    const { data: event } = await adminClient
      .from('events')
      .select('*, profiles(first_name, last_name, email)')
      .eq('id', event_id)
      .single();

    if (!event) return json({ error: 'event not found' }, 404);

    const eventTitle = event.title;
    const academicYear = event.academic_year;

    // 1. แจ้ง organizer ที่สร้างกิจกรรม
    const creatorEmail = event.profiles?.email;
    const creatorName = `${event.profiles?.first_name ?? ''} ${event.profiles?.last_name ?? ''}`.trim() || 'ผู้จัดกิจกรรม';
    if (creatorEmail) {
      await sendEmail('event_approved', creatorEmail, { name: creatorName, eventTitle, academicYear });
    }

    // 2. แจ้งนักศึกษาทุกคนที่มีอีเมล
    const { data: students } = await adminClient
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('role', 'student')
      .neq('email', '');

    const notifyList = (students ?? []).filter((s) => s.email && s.email !== creatorEmail);
    for (const s of notifyList) {
      const name = `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() || 'นักศึกษา';
      await sendEmail('new_event_notify', s.email, { name, eventTitle, academicYear });
    }

    return json({ ok: true, notified: notifyList.length + (creatorEmail ? 1 : 0) });
  } catch (err) {
    console.error('notify-event-approved error:', err);
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
