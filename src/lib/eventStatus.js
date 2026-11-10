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
  'not-open': { label: 'ยังไม่เปิด', className: 'bg-sun/10 text-sun' },
  open: { label: 'เปิดรับ', className: 'bg-cobalt/10 text-cobalt' },
  closed: { label: 'ปิดแล้ว', className: 'bg-ink/5 text-ink/60' },
  full: { label: 'เต็ม', className: 'bg-coral/10 text-coral' },
};

export const STATUS_REASONS = {
  'not-open': 'ยังไม่ถึงช่วงเปิดรับสมัคร',
  closed: 'ปิดรับสมัครแล้ว หากต้องการลงชื่อกรุณาติดต่อผู้จัดกิจกรรม',
  full: 'แผนกของคุณลงชื่อครบจำนวนสูงสุดแล้ว',
};