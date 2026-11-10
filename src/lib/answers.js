import { fmtDate } from './format.js';

// ตรวจช่องบังคับฝั่ง client (ฐานข้อมูลตรวจซ้ำอีกชั้นเสมอ)
export function validateAnswers(fields, answers) {
  const errors = {};
  for (const f of fields) {
    if (!f.required) continue;
    const a = answers?.[f.id];
    const missing = a === undefined || a === null
      || (['text', 'textarea', 'select', 'date', 'image'].includes(f.field_type) && String(a).trim() === '')
      || (f.field_type === 'multiselect' && (!Array.isArray(a) || a.length === 0))
      || (f.field_type === 'checkbox' && a !== true);
    if (missing) {
      errors[f.id] = f.field_type === 'checkbox'
        ? `กรุณาติ๊กเลือก "${f.label}"`
        : f.field_type === 'multiselect'
          ? `กรุณาเลือก "${f.label}" อย่างน้อย 1 ตัวเลือก`
          : `กรุณากรอก "${f.label}" ให้ครบถ้วน`;
    }
  }
  return errors;
}

// แปลงคำตอบเป็นข้อความสำหรับแสดง (ตาราง/สรุป)
export function formatAnswer(field, value) {
  if (value === undefined || value === null || value === '') return '-';
  switch (field.field_type) {
    case 'checkbox': return value ? 'ใช่' : 'ไม่ใช่';
    case 'multiselect': return Array.isArray(value) && value.length ? value.join(', ') : '-';
    case 'date': return fmtDate(value);
    case 'image': return typeof value === 'string' && value ? value : '-';
    default: return String(value);
  }
}

// กรองช่องฟอร์มที่ใช้กับระดับนี้ เรียงตาม sort_order
export function fieldsForLevel(fields, level) {
  return (fields ?? [])
    .filter((f) => f.is_active && (!f.applies_to_level || f.applies_to_level === level))
    .sort((a, b) => a.sort_order - b.sort_order);
}