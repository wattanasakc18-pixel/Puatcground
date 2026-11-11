import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { SmtpClient } from 'https://deno.land/x/smtp@v0.7.0/mod.ts';

const GMAIL_USER = Deno.env.get('GMAIL_USER')!;
const GMAIL_PASS = Deno.env.get('GMAIL_PASS')!;
const FROM_NAME = 'Puatc Ground';

const TEMPLATES: Record<string, (data: Record<string, string>) => { subject: string; html: string }> = {
  // ลงทะเบียนกิจกรรมสำเร็จ
  registered: (d) => ({
    subject: `✅ ลงชื่อกิจกรรม "${d.eventTitle}" สำเร็จแล้ว`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <div style="background:#2563eb;padding:24px;border-radius:12px 12px 0 0">
          <h1 style="color:white;margin:0;font-size:20px">ลงชื่อสำเร็จ ✅</h1>
        </div>
        <div style="background:#f8fafc;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
          <p style="color:#1e293b">สวัสดี <strong>${d.name}</strong></p>
          <p style="color:#475569">คุณได้ลงชื่อเข้าร่วมกิจกรรม <strong>${d.eventTitle}</strong> เรียบร้อยแล้ว</p>
          <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0">
            <p style="margin:4px 0;color:#64748b;font-size:14px">📅 วันที่จัด: <strong style="color:#1e293b">${d.eventDate}</strong></p>
            <p style="margin:4px 0;color:#64748b;font-size:14px">🎓 ระดับ: <strong style="color:#1e293b">${d.level}</strong></p>
          </div>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px">ระบบลงชื่อตัวแทนทำกิจกรรม · Puatc Ground</p>
        </div>
      </div>`,
  }),

  // กิจกรรมใกล้ปิดรับ
  closing_soon: (d) => ({
    subject: `⏰ กิจกรรม "${d.eventTitle}" ใกล้ปิดรับสมัครแล้ว`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <div style="background:#b45309;padding:24px;border-radius:12px 12px 0 0">
          <h1 style="color:white;margin:0;font-size:20px">ใกล้ปิดรับสมัคร ⏰</h1>
        </div>
        <div style="background:#f8fafc;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
          <p style="color:#1e293b">สวัสดี <strong>${d.name}</strong></p>
          <p style="color:#475569">กิจกรรม <strong>${d.eventTitle}</strong> จะปิดรับสมัครในวันที่ <strong>${d.closeDate}</strong></p>
          <p style="color:#475569">ถ้ายังไม่ได้ลงชื่อ รีบไปลงชื่อก่อนหมดเวลานะครับ/ค่ะ</p>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px">ระบบลงชื่อตัวแทนทำกิจกรรม · Puatc Ground</p>
        </div>
      </div>`,
  }),

  // กิจกรรมเสร็จสิ้น
  event_ended: (d) => ({
    subject: `🎉 กิจกรรม "${d.eventTitle}" เสร็จสิ้นแล้ว`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <div style="background:#15803d;padding:24px;border-radius:12px 12px 0 0">
          <h1 style="color:white;margin:0;font-size:20px">กิจกรรมเสร็จสิ้น 🎉</h1>
        </div>
        <div style="background:#f8fafc;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
          <p style="color:#1e293b">สวัสดี <strong>${d.name}</strong></p>
          <p style="color:#475569">กิจกรรม <strong>${d.eventTitle}</strong> ที่คุณเข้าร่วมเมื่อวันที่ <strong>${d.eventDate}</strong> เสร็จสิ้นแล้ว</p>
          <p style="color:#475569">ขอบคุณที่เข้าร่วมกิจกรรมครับ/ค่ะ 🙏</p>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px">ระบบลงชื่อตัวแทนทำกิจกรรม · Puatc Ground</p>
        </div>
      </div>`,
  }),

  // กิจกรรมเปิดรับแล้ว
  event_open: (d) => ({
    subject: `🔔 กิจกรรม "${d.eventTitle}" เปิดรับสมัครแล้ว`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <div style="background:#2563eb;padding:24px;border-radius:12px 12px 0 0">
          <h1 style="color:white;margin:0;font-size:20px">เปิดรับสมัครแล้ว 🔔</h1>
        </div>
        <div style="background:#f8fafc;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
          <p style="color:#1e293b">สวัสดี <strong>${d.name}</strong></p>
          <p style="color:#475569">กิจกรรม <strong>${d.eventTitle}</strong> เปิดรับสมัครแล้ว!</p>
          <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0">
            <p style="margin:4px 0;color:#64748b;font-size:14px">📅 วันที่จัด: <strong style="color:#1e293b">${d.eventDate}</strong></p>
            <p style="margin:4px 0;color:#64748b;font-size:14px">⏰ ปิดรับ: <strong style="color:#1e293b">${d.closeDate}</strong></p>
            <p style="margin:4px 0;color:#64748b;font-size:14px">🎓 ระดับ: <strong style="color:#1e293b">${d.level}</strong></p>
          </div>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px">ระบบลงชื่อตัวแทนทำกิจกรรม · Puatc Ground</p>
        </div>
      </div>`,
  }),

  // admin รีเซ็ตรหัสผ่าน
  password_reset: (d) => ({
    subject: `🔑 รหัสผ่านของคุณถูกรีเซ็ตแล้ว`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <div style="background:#1e293b;padding:24px;border-radius:12px 12px 0 0">
          <h1 style="color:white;margin:0;font-size:20px">รีเซ็ตรหัสผ่าน 🔑</h1>
        </div>
        <div style="background:#f8fafc;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
          <p style="color:#1e293b">สวัสดี <strong>${d.name}</strong></p>
          <p style="color:#475569">ผู้ดูแลระบบได้รีเซ็ตรหัสผ่านของคุณแล้ว</p>
          <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0">
            <p style="margin:4px 0;color:#64748b;font-size:14px">รหัสผ่านใหม่: <strong style="color:#1e293b;font-size:18px;letter-spacing:2px">${d.newPassword}</strong></p>
          </div>
          <p style="color:#b91c1c;font-size:13px">⚠️ กรุณาเข้าสู่ระบบแล้วเปลี่ยนรหัสผ่านทันที</p>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px">ระบบลงชื่อตัวแทนทำกิจกรรม · Puatc Ground</p>
        </div>
      </div>`,
  }),
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { type, to, data } = await req.json();

    if (!type || !to) {
      return new Response(JSON.stringify({ error: 'missing type or to' }), { status: 400 });
    }

    const template = TEMPLATES[type];
    if (!template) {
      return new Response(JSON.stringify({ error: `unknown type: ${type}` }), { status: 400 });
    }

    const { subject, html } = template(data ?? {});

    const client = new SmtpClient();
    await client.connectTLS({
      hostname: 'smtp.gmail.com',
      port: 465,
      username: GMAIL_USER,
      password: GMAIL_PASS,
    });

    await client.send({
      from: `${FROM_NAME} <${GMAIL_USER}>`,
      to,
      subject,
      content: 'auto',
      html,
    });

    await client.close();

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    console.error('send-email error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
