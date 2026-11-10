import { formatAnswer } from '../lib/answers.js';

// สรุปคำตอบของรายการลงชื่อ (รูปแสดงเป็น thumbnail)
export default function AnswersSummary({ fields, answers }) {
  const entries = (fields ?? []).filter((f) => answers?.[f.id] !== undefined);
  if (entries.length === 0) return <p className="text-sm text-ink/50">ไม่มีข้อมูลเพิ่มเติม</p>;
  return (
    <dl className="space-y-2">
      {entries.map((f) => (
        <div key={f.id} className="grid grid-cols-3 gap-2 text-sm">
          <dt className="text-ink/50">{f.label}</dt>
          <dd className="col-span-2 break-words">
            {f.field_type === 'image' && answers[f.id] ? (
              <a href={answers[f.id]} target="_blank" rel="noreferrer">
                <img src={answers[f.id]} alt={f.label} className="w-20 h-20 rounded-lg object-cover border border-line" />
              </a>
            ) : formatAnswer(f, answers[f.id])}
          </dd>
        </div>
      ))}
    </dl>
  );
}