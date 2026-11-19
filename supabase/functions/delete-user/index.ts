import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  try {
    // ตรวจสิทธิ์ผู้เรียก — ต้องเป็น admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'ไม่มี Authorization header' }, 401);
    }

    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    if (authError || !caller) {
      return json({ error: 'ไม่สามารถตรวจสอบตัวตนได้' }, 401);
    }

    // เช็ค role ของผู้เรียก
    const { data: callerProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (profileError || callerProfile?.role !== 'admin') {
      return json({ error: 'เฉพาะผู้ดูแลระบบเท่านั้นที่ลบบัญชีได้' }, 403);
    }

    // รับ target_user_id จาก body
    const { target_user_id } = await req.json();
    if (!target_user_id) {
      return json({ error: 'ไม่ระบุ target_user_id' }, 400);
    }

    // ห้าม admin ลบตัวเอง
    if (target_user_id === caller.id) {
      return json({ error: 'ไม่สามารถลบบัญชีตัวเองได้' }, 400);
    }

    // ลบ user ด้วย admin API (profiles จะถูกลบตาม ON DELETE CASCADE)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(target_user_id);
    if (deleteError) {
      return json({ error: deleteError.message }, 400);
    }

    return json({ ok: true });
  } catch (err) {
    console.error('delete-user error:', err);
    return json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
