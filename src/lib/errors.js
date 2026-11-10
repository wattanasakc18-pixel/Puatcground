// แปล error จาก Supabase/ฐานข้อมูล เป็นข้อความไทยที่ผู้ใช้เข้าใจได้
const THAI_RE = /[฀-๿]/;

const MAP = [
  [/Invalid login credentials/i, 'รหัสนักศึกษาหรือรหัสผ่านไม่ถูกต้อง'],
  [/already (?:been )?registered|User already exists/i, 'รหัสนักศึกษานี้สมัครไว้แล้ว'],
  [/Password should be at least (\d+)/i, 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร'],
  [/Email not confirmed/i, 'ระบบยังเปิดยืนยันอีเมลอยู่ กรุณาให้ผู้ดูแลปิด "Confirm email" ใน Supabase ตาม README'],
  [/Failed to fetch|NetworkError|network/i, 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่'],
  [/JWT|session.*expired|refresh_token/i, 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'],
  [/row-level security|42501/i, 'คุณไม่มีสิทธิ์ทำรายการนี้'],
];

export function toThaiError(error, fallback = 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง') {
  if (!error) return fallback;
  const msg = error.message ?? '';
  // ข้อความจาก trigger/RPC ฝั่งฐานข้อมูลเป็นภาษาไทยอยู่แล้ว แสดงตรงๆ
  if (THAI_RE.test(msg)) return msg;
  for (const [re, thai] of MAP) {
    if (re.test(msg)) return thai;
  }
  if (error.code === '23505') return 'มีข้อมูลนี้อยู่ในระบบแล้ว (ข้อมูลซ้ำ)';
  if (error.code === '23503') return 'ลบไม่ได้ เนื่องจากยังมีการใช้งานข้อมูลนี้อยู่';
  return fallback;
}