import { todayStr, startOfWeek, weekDays, WEEKDAY_LABELS } from '../../lib/format.js';
import Crest from '../Crest.jsx';

export default function AuthPanel({ note }) {
  const today = todayStr();
  const days = weekDays(startOfWeek(today));

  return (
    <aside className="bg-white border-b lg:border-b-0 lg:border-r border-line flex flex-col justify-between gap-10 p-7 sm:p-10 lg:p-12 lg:min-h-screen">
      <div className="flex items-center gap-3">
        <Crest className="w-10 h-10 shrink-0" />
        <span className="text-sm text-ink/60">ระบบตัวแทนกิจกรรมของวิทยาลัย</span>
      </div>

      <div>
        <h1 className="font-bold tracking-tight text-4xl sm:text-5xl lg:text-6xl">Puatc Ground</h1>
        <p className="mt-4 max-w-md text-ink/60 text-base sm:text-lg">ลงชื่อตัวแทนกิจกรรมและดูปฏิทินของวิทยาลัยในที่เดียว</p>
      </div>

      <div>
        <div className="flex items-end justify-between gap-3 mb-3">
          <span className="text-sm font-semibold">ปฏิทินสัปดาห์นี้</span>
          <span className="text-xs text-ink/50 text-right">{note ?? 'เข้าสู่ระบบเพื่อโหลดกิจกรรมของสัปดาห์นี้'}</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {days.map((d, i) => {
            const isToday = d === today;
            const weekend = i === 0 || i === 6;
            return (
              <div
                key={d}
                className={`rounded-xl border min-h-16 sm:min-h-20 p-1.5 sm:p-2 flex flex-col items-center justify-center gap-1 ${isToday ? 'bg-cobalt border-cobalt text-white' : 'bg-bg border-line'}`}
              >
                <span className={`text-[11px] font-medium ${isToday ? 'text-white/70' : weekend ? 'text-ink/40' : 'text-ink/50'}`}>{WEEKDAY_LABELS[i]}</span>
                <span className={`font-bold text-lg sm:text-xl leading-none ${isToday ? '' : weekend ? 'text-ink/50' : ''}`}>{Number(d.slice(8, 10))}</span>
                {isToday && <span className="text-[11px] leading-none text-white/80">วันนี้</span>}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}