// วันที่ทั้งหมดแสดงเป็น พ.ศ. ในเขตเวลา Asia/Bangkok
const TZ = 'Asia/Bangkok';

export function fmtDate(value, opts = {}) {
  if (!value) return '-';
  const d = typeof value === 'string' && value.length === 10
    ? new Date(`${value}T00:00:00+07:00`)
    : new Date(value);
  return d.toLocaleDateString('th-TH', {
    timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric', ...opts,
  });
}

export function fmtDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('th-TH', {
    timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// วันนี้ในเขตเวลากรุงเทพ เป็น string YYYY-MM-DD
export function todayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

// บวกวันโดยคิดแบบปฏิทิน ไม่พึ่งเขตเวลาเบราว์เซอร์
export function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// สัปดาห์เริ่มวันอาทิตย์
export function startOfWeek(dateStr) {
  const weekday = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  return addDays(dateStr, -weekday);
}

export function weekDays(startStr) {
  return Array.from({ length: 7 }, (_, i) => addDays(startStr, i));
}

export const WEEKDAY_LABELS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

// เดือน: monthStr เป็น YYYY-MM-01 (วันแรกของเดือน)
export function startOfMonth(dateStr) {
  return `${dateStr.slice(0, 7)}-01`;
}

export function addMonths(monthStr, n) {
  const d = new Date(`${monthStr}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}

// ตารางเดือนแบบเริ่มวันอาทิตย์ รวมวันหัว/ท้ายของเดือนข้างเคียงให้เต็มสัปดาห์
export function monthGrid(monthStr) {
  const first = startOfMonth(monthStr);
  const start = startOfWeek(first);
  const d = new Date(`${first}T00:00:00Z`);
  const daysInMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  const lead = d.getUTCDay();
  const cells = Math.ceil((lead + daysInMonth) / 7) * 7;
  return Array.from({ length: cells }, (_, i) => addDays(start, i));
}

export function fmtMonth(monthStr) {
  return fmtDate(monthStr, { day: undefined, month: 'long', year: 'numeric' });
}

// timestamptz → ค่าของ input datetime-local (เวลากรุงเทพ)
export function toDatetimeLocal(ts) {
  if (!ts) return '';
  const d = new Date(new Date(ts).getTime() + 7 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}

// ค่าจาก datetime-local → timestamptz โดยระบุ offset +07:00 ชัดเจน
export function localToTimestamptz(value) {
  if (!value) return null;
  return value.length === 16 ? `${value}:00+07:00` : value;
}

export function fullName(p) {
  if (!p) return '';
  return `${p.title ?? ''}${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
}