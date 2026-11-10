export const LEVELS = ['ปวช.', 'ปวส.'];

export const FIELD_TYPES = [
  { value: 'text', label: 'ข้อความสั้น' },
  { value: 'textarea', label: 'ข้อความยาว' },
  { value: 'number', label: 'ตัวเลข' },
  { value: 'select', label: 'ตัวเลือกเดียว' },
  { value: 'multiselect', label: 'หลายตัวเลือก' },
  { value: 'checkbox', label: 'ช่องติ๊กถูก' },
  { value: 'date', label: 'วันที่' },
  { value: 'image', label: 'รูปภาพ' },
];

export const REGISTRATION_TYPES = [
  { value: 'individual', label: 'รายบุคคล' },
  { value: 'booth', label: 'รายบูธ' },
];

export const ROLE_LABELS = {
  admin: 'ผู้ดูแลระบบ',
  organizer: 'ผู้จัดกิจกรรม',
  student: 'นักเรียน',
};

export const TITLES = ['นาย', 'นางสาว', 'นาง'];

export const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
export const MAX_FORM_IMAGE_SIZE = 5 * 1024 * 1024;