// สถานะรับสมัครคำนวณตามระดับและแผนกของผู้ใช้เอง
export function registrationStatus(eventLevel, countRow, now = new Date()) {
  if (!eventLevel || !eventLevel.reg_open_at || !eventLevel.reg_close_at) return null;
  const t = now.getTime();
  const openTime = new Date(eventLevel.reg_open_at).getTime();
  const closeTime = new Date(eventLevel.reg_close_at).getTime();
  if (Number.isNaN(openTime) || Number.isNaN(closeTime)) return null;
  if (t < openTime) return 'not-open';
  if (t > closeTime) return 'closed';
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

// ── สถานะการดำเนินกิจกรรม (อิงจากวันจัดจริง) ───────────────────────────────
/**
 * คำนวณจาก event_levels ทั้งหมด
 * - 'ongoing'  : วันนี้อยู่ในช่วงวันจัด (มี level ที่ event_date = วันนี้)
 * - 'completed': ทุก level จัดผ่านไปแล้ว (event_date ทั้งหมดก่อนวันนี้)
 * - null       : ยังไม่ถึงวันจัด
 */
export function eventRunStatus(eventLevels = [], now = new Date()) {
  if (!eventLevels.length) return null;
  const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }); // YYYY-MM-DD
  const dates = eventLevels.map((l) => l.event_date).filter(Boolean);
  if (!dates.length) return null;

  const hasToday = dates.some((d) => d === today);
  if (hasToday) return 'ongoing';

  const allPast = dates.every((d) => d < today);
  if (allPast) return 'completed';

  return null; // ยังไม่ถึงวันจัด
}

export const RUN_STATUS_META = {
  ongoing: {
    label: 'กำลังดำเนินการ',
    className: 'bg-leaf/10 text-leaf border border-leaf/20',
    dot: 'bg-leaf animate-pulse',
  },
  completed: {
    label: 'ดำเนินการเสร็จสิ้น',
    className: 'bg-ink/5 text-ink/60 border border-line',
    dot: 'bg-ink/40',
  },
};