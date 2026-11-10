// สถานะรับสมัครคำนวณตามระดับและแผนกของผู้ใช้เอง
export function registrationStatus(eventLevel, countRow, now = new Date()) {
  if (!eventLevel) return null;
  const t = now.getTime();
  if (t < new Date(eventLevel.reg_open_at).getTime()) return 'not-open';
  if (t > new Date(eventLevel.reg_close_at).getTime()) return 'closed';
  if (countRow?.is_full) return 'full';
  return 'open';
}

export const STATUS_META = {
  'not-open': { label: 'ยังไม่เปิด', className: 'bg-sun text-ink' },
  open: { label: 'เปิดรับ', className: 'bg-cobalt text-white' },
  closed: { label: 'ปิดแล้ว', className: 'bg-ink/10 text-ink/70' },
  full: { label: 'เต็ม', className: 'bg-coral text-white' },
};

export const STATUS_REASONS = {
  'not-open': 'ยังไม่ถึงช่วงเปิดรับสมัคร',
  closed: 'ปิดรับสมัครแล้ว หากต้องการลงชื่อกรุณาติดต่อผู้จัดกิจกรรม',
  full: 'แผนกของคุณลงชื่อครบจำนวนสูงสุดแล้ว',
};