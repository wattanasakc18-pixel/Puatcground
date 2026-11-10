// ส่งออก CSV แบบ UTF-8 มี BOM เพื่อให้ Excel เปิดภาษาไทยได้ถูกต้อง
function escapeCell(value) {
  const s = String(value ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// บังคับให้ Excel อ่านเป็นข้อความ (กัน "2/1" กลายเป็นวันที่ และกันเลขศูนย์นำหน้าหาย)
export function excelText(value) {
  return `="${String(value ?? '').replace(/"/g, '""')}"`;
}

export function exportCsv(filename, headers, rows) {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(','));
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace(/[\\/:*?"<>|]/g, '_');
  a.click();
  URL.revokeObjectURL(url);
}