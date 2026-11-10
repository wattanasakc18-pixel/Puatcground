// แถบสรุป "แผนกที่ยังไม่ครบขั้นต่ำ" แยกตามระดับ ต่อแผนกเสมอ
import { LevelBadge } from './Badges.jsx';

/**
 * counts   — แถวจาก dept_registration_counts (อาจไม่ครบทุกแผนก)
 * departments — รายการแผนกทั้งหมด (optional) เพื่อเติมแผนกที่ยังไม่มีใครสมัคร
 * eventLevels — event_levels[] พร้อม min_per_dept, max_per_dept (optional)
 */
export default function DeptSummaryBar({ counts = [], departments = [], eventLevels = [] }) {
  const hasMin = eventLevels.some((l) => l.min_per_dept != null) || counts.some((c) => c.min_per_dept != null);
  if (!hasMin) return null;

  // สร้าง lookup จาก counts ที่มีอยู่: key = `${event_level_id}-${department_id}`
  const countMap = new Map(counts.map((c) => [`${c.event_level_id}-${c.department_id}`, c]));

  // สร้าง full list: ทุก level × ทุก department
  // ถ้ามี eventLevels และ departments ให้ build เอง ไม่งั้นใช้ counts เดิม
  let rows;
  if (eventLevels.length > 0 && departments.length > 0) {
    rows = [];
    for (const lv of eventLevels) {
      if (lv.min_per_dept == null) continue; // level ไม่ตั้งขั้นต่ำ ข้ามได้
      for (const dept of departments) {
        const existing = countMap.get(`${lv.id}-${dept.id}`);
        rows.push({
          event_level_id: lv.id,
          level: lv.level,
          department_id: dept.id,
          department_name: dept.name,
          registered: existing?.registered ?? 0,
          min_per_dept: lv.min_per_dept,
          is_below_min: (existing?.registered ?? 0) < lv.min_per_dept,
          is_full: existing?.is_full ?? false,
        });
      }
    }
  } else {
    // fallback: ใช้ counts เดิมเฉพาะที่ is_below_min
    rows = counts.filter((c) => c.is_below_min);
  }

  const belowMin = rows.filter((r) => r.is_below_min);
  if (belowMin.length === 0) return null;

  // จัดกลุ่มตามระดับ
  const byLevel = belowMin.reduce((acc, c) => {
    if (!acc[c.level]) acc[c.level] = [];
    acc[c.level].push(c);
    return acc;
  }, {});
  const levels = Object.keys(byLevel).sort();

  return (
    <div className="bg-sun/5 border border-sun/20 rounded-2xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-sun shrink-0" />
        <h2 className="font-semibold text-sm">แผนกที่ยังไม่ครบขั้นต่ำ</h2>
        <span className="ml-auto text-xs text-ink/50">{belowMin.length} แผนก</span>
      </div>

      <div className="space-y-4">
        {levels.map((level) => (
          <div key={level}>
            <div className="flex items-center gap-2 mb-2">
              <LevelBadge level={level} />
              <span className="text-xs text-ink/50">{byLevel[level].length} แผนก</span>
            </div>
            <div className="space-y-2">
              {byLevel[level].map((c) => {
                const pct = c.min_per_dept > 0
                  ? Math.min(100, Math.round((c.registered / c.min_per_dept) * 100))
                  : 100;
                const barColor = c.registered === 0 ? 'bg-line' : pct >= 100 ? 'bg-leaf' : 'bg-sun';
                return (
                  <div key={`${c.event_level_id}-${c.department_id}`} className="bg-white rounded-xl border border-line px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-sm font-medium truncate">{c.department_name}</span>
                      <span className={`text-xs shrink-0 font-medium ${c.registered === 0 ? 'text-ink/40' : 'text-ink/70'}`}>
                        {c.registered} / {c.min_per_dept} คน
                      </span>
                    </div>
                    <div className="h-1.5 bg-line rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
