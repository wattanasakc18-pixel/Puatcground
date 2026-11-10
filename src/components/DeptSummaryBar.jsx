// แถบสรุป "แผนกที่ยังไม่ครบขั้นต่ำ" แยกตามระดับ ต่อแผนกเสมอ
export default function DeptSummaryBar({ counts = [] }) {
  const belowMin = counts.filter((c) => c.is_below_min);
  const hasMin = counts.some((c) => c.min_per_dept != null);
  return (
    <div className="bg-sun/20 border border-sun rounded-2xl p-4">
      <h2 className="font-semibold text-sm mb-2">แผนกที่ยังไม่ครบขั้นต่ำ</h2>
      {belowMin.length === 0 ? (
        <p className="text-sm text-ink/70">
          {hasMin ? 'ทุกแผนกลงชื่อครบขั้นต่ำแล้ว' : 'กิจกรรมนี้ไม่ได้ตั้งขั้นต่ำต่อแผนก'}
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {belowMin.map((c) => (
            <span key={`${c.event_level_id}-${c.department_id}`} className="bg-white border border-line rounded-full px-3 py-1 text-sm">
              {c.department_name} ({c.level}) {c.registered}/{c.min_per_dept}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}