import { exportCsv, excelText } from './csv.js';
import { formatAnswer } from './answers.js';
import { fullName } from './format.js';

// ส่งออกรายชื่อตัวแทนที่กรองอยู่ เป็น CSV UTF-8 มี BOM
export function exportRosterCsv({ event, levelLabel, rows, fields }) {
  const date = new Date().toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' });
  const headers = ['ลำดับ', 'ชื่อ-สกุล', 'รหัสนักศึกษา', 'แผนก', 'ระดับ', 'ชั้นปี/ห้อง', ...fields.map((f) => f.label)];
  const data = rows.map((r, i) => [
    i + 1,
    fullName(r),
    excelText(r.student_code),
    r.department_name,
    r.level,
    excelText(r.class_room),
    ...fields.map((f) => excelText(formatAnswer(f, r.answers?.[f.id]))),
  ]);
  exportCsv(`${event.title}_${levelLabel}_${date}.csv`, headers, data);
}