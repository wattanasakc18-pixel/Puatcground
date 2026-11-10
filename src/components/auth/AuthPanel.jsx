import { todayStr, startOfWeek, weekDays, WEEKDAY_LABELS } from '../../lib/format.js';

export default function AuthPanel({ note }) {
  const today = todayStr();
  const days = weekDays(startOfWeek(today));

  return (
    <aside className="relative overflow-hidden bg-cobalt text-white flex flex-col justify-between gap-8 lg:gap-10 p-7 sm:p-10 lg:p-12 lg:min-h-screen">
      <div className="grain pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 w-96 h-96 rounded-full bg-ink/10" aria-hidden="true" />

      <div className="relative flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-white text-cobalt font-display font-bold text-xl flex items-center justify-center">P</span>
        <span className="font-hand text-white/80 text-base">ระบบตัวแทนกิจกรรมของวิทยาลัย</span>
      </div>

      <div className="relative">
        <h1 className="font-display font-bold tracking-tight leading-none text-4xl sm:text-5xl lg:text-6xl xl:text-7xl">Puatc Ground</h1>
        <p className="mt-4 max-w-md text-white/75 text-base sm:text-lg">ลงชื่อตัวแทนกิจกรรมและดูปฏิทินของวิทยาลัยในที่เดียว</p>
      </div>

      <div className="relative">
        <div className="flex items-end justify-between gap-3 mb-2">
          <span className="text-xs font-semibold tracking-[0.18em] text-white/60 uppercase">ปฏิทินสัปดาห์นี้</span>
          <span className="font-hand text-white/70 text-sm text-right">{note ?? 'เข้าสู่ระบบเพื่อโหลดกิจกรรมของสัปดาห์นี้'}</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {days.map((d, i) => {
            const isToday = d === today;
            const weekend = i === 0 || i === 6;
            return (
              <div
                key={d}
                className={`rounded-xl min-h-16 sm:min-h-20 p-1.5 sm:p-2 flex flex-col items-center gap-1 ${isToday ? 'bg-sun text-ink' : weekend ? 'bg-white/5 text-white/70' : 'bg-white/10 text-white/85'}`}
              >
                <span className={`text-[10px] font-semibold ${isToday ? 'text-ink/60' : 'text-white/50'}`}>{WEEKDAY_LABELS[i]}</span>
                <span className="font-display font-bold text-lg sm:text-xl leading-none">{Number(d.slice(8, 10))}</span>
                {isToday && <span className="font-hand text-[11px] leading-none text-ink/70">วันนี้</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="ribbon absolute bottom-0 inset-x-0 h-1.5" aria-hidden="true" />
    </aside>
  );
}