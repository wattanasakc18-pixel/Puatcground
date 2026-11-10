import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useEvents, useMyRegistrations, useDeptCounts } from '../../hooks/useQueries.js';
import { todayStr, startOfMonth, addMonths, monthGrid, fmtDate, fmtMonth, WEEKDAY_LABELS } from '../../lib/format.js';
import { registrationStatus } from '../../lib/eventStatus.js';
import { LEVELS } from '../../lib/constants.js';
import Button from '../../components/ui/Button.jsx';
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/States.jsx';
import EventCard from '../../components/EventCard.jsx';
import { toThaiError } from '../../lib/errors.js';

const CHIP_EDGE = {
  open: 'border-l-cobalt',
  'not-open': 'border-l-sun',
  full: 'border-l-coral',
  closed: 'border-l-ink/30',
};

export default function EventsPage() {
  const { profile } = useAuth();
  const [month, setMonth] = useState(() => startOfMonth(todayStr()));
  const [filter, setFilter] = useState('all');

  const eventsQuery = useEvents();
  const regsQuery = useMyRegistrations(true);
  const countsQuery = useDeptCounts();

  const registeredLevelIds = useMemo(
    () => new Set((regsQuery.data ?? []).map((r) => r.event_level_id)),
    [regsQuery.data],
  );
  const countMap = useMemo(
    () => new Map((countsQuery.data ?? []).map((c) => [c.event_level_id, c])),
    [countsQuery.data],
  );

  // สถานะของกิจกรรม คำนวณจากระดับของผู้ใช้เอง
  const statusOf = (event) => {
    const el = event.event_levels.find((l) => l.level === profile?.level);
    return registrationStatus(el, countMap.get(el?.id));
  };
  const registeredIn = (event) =>
    event.event_levels.some((l) => registeredLevelIds.has(l.id));

  const days = useMemo(() => monthGrid(month), [month]);
  const today = todayStr();
  const inMonth = (d) => d.slice(0, 7) === month.slice(0, 7);
  const monthDayList = days.filter(inMonth);

  // จัดกลุ่มการ์ดตามวัน: กิจกรรมทำรวม (2 ระดับวันเดียวกัน) เป็นการ์ดเดียวป้าย "รวม"
  const cardsByDay = useMemo(() => {
    const map = new Map(days.filter((d) => d.slice(0, 7) === month.slice(0, 7)).map((d) => [d, []]));
    for (const event of eventsQuery.data ?? []) {
      const matchDates = new Set(
        event.event_levels
          .filter((l) => filter === 'all' || l.level === filter)
          .map((l) => l.event_date),
      );
      for (const date of matchDates) {
        if (!map.has(date)) continue;
        const levelsOnDate = event.event_levels.filter((l) => l.event_date === date);
        map.get(date).push({ event, levels: levelsOnDate });
      }
    }
    return map;
  }, [eventsQuery.data, filter, month, days]);

  const openNow = (eventsQuery.data ?? []).filter((e) => statusOf(e) === 'open' && !registeredIn(e));
  const totalCards = monthDayList.reduce((sum, d) => sum + (cardsByDay.get(d)?.length ?? 0), 0);
  const daysWithCards = monthDayList.filter((d) => (cardsByDay.get(d)?.length ?? 0) > 0);

  const renderCard = ({ event, levels }) => (
    <EventCard
      key={`${event.id}-${levels[0]?.event_date}`}
      event={event}
      levels={levels}
      status={statusOf(event)}
      registered={registeredIn(event)}
    />
  );

  // ป้ายกิจกรรมย่อในช่องปฏิทินเดือน กดแล้วไปหน้ารายละเอียดกิจกรรม
  const renderChip = ({ event, levels }) => {
    const status = statusOf(event);
    return (
      <Link
        key={`${event.id}-${levels[0]?.event_date}`}
        to={`/events/${event.id}`}
        title={event.title}
        className={`block border-l-2 ${CHIP_EDGE[status] ?? 'border-l-ink/30'} bg-bg hover:bg-cobalt/5 rounded-r-md px-1.5 py-1 transition-colors`}
      >
        <span className="block truncate text-[11px] font-medium leading-tight text-ink">{event.title}</span>
        <span className="flex items-center gap-1 text-[10px] leading-tight text-ink/50">
          {levels.map((l) => l.level).join(' · ')}
          {registeredIn(event) && <span className="w-1.5 h-1.5 rounded-full bg-leaf" title="ลงชื่อแล้ว" aria-label="ลงชื่อแล้ว" />}
        </span>
      </Link>
    );
  };

  const dayNumber = (day) => Number(day.slice(8, 10));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-xl font-bold">กิจกรรมและลงชื่อ</h1>
        <div className="flex gap-1 bg-white border border-line rounded-xl p-1" role="group" aria-label="กรองตามระดับ">
          {[['all', 'ทั้งหมด'], ...LEVELS.map((l) => [l, l])].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={`px-3 min-h-9 rounded-lg text-sm font-medium transition-colors ${filter === value ? 'bg-cobalt text-white' : 'text-ink/60 hover:bg-bg'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {openNow.length > 0 && (
        <section aria-label="กำลังเปิดรับสมัคร">
          <h2 className="font-semibold mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cobalt" aria-hidden /> กำลังเปิดรับสมัคร
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {openNow.map((event) => renderCard({ event, levels: event.event_levels }))}
          </div>
        </section>
      )}

      <section className="bg-white rounded-xl border border-line p-4" aria-label="ปฏิทินรายเดือน">
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-1">
            <Button variant="ghost" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="เดือนก่อนหน้า">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button variant="secondary" onClick={() => setMonth(startOfMonth(todayStr()))}>เดือนนี้</Button>
            <Button variant="ghost" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="เดือนถัดไป">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
          <p className="font-display font-semibold text-lg">{fmtMonth(month)}</p>
        </div>

        {eventsQuery.isPending ? <LoadingState /> : eventsQuery.isError ? (
          <ErrorState message={toThaiError(eventsQuery.error)} onRetry={() => eventsQuery.refetch()} />
        ) : (
          <>
            {/* เดสก์ท็อป: ตารางเดือน 7 คอลัมน์ */}
            <div className="hidden md:block border border-line rounded-md overflow-hidden">
              <div className="grid grid-cols-7 gap-px bg-line">
                {WEEKDAY_LABELS.map((label, i) => (
                  <div key={label} className={`bg-bg text-center text-xs font-semibold py-2 ${i === 0 || i === 6 ? 'text-ink/40' : 'text-ink/60'}`}>
                    {label}
                  </div>
                ))}
                {days.map((day) => {
                  const outside = !inMonth(day);
                  const cards = cardsByDay.get(day) ?? [];
                  return (
                    <div key={day} className={`min-h-28 p-1.5 ${outside ? 'bg-bg/70' : 'bg-white'}`}>
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 text-xs rounded-full ${
                          day === today ? 'bg-cobalt text-white font-bold' : outside ? 'text-ink/30' : 'text-ink/70 font-medium'
                        }`}
                      >
                        {dayNumber(day)}
                      </span>
                      <div className="space-y-1 mt-1">{cards.map(renderChip)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* มือถือ: ภาพรวมเดือนแบบจุด + รายการเฉพาะวันที่มีกิจกรรม */}
            <div className="md:hidden">
              <div className="grid grid-cols-7 gap-1 mb-4" aria-hidden="true">
                {WEEKDAY_LABELS.map((label, i) => (
                  <div key={label} className={`text-center text-[10px] font-semibold py-1 ${i === 0 || i === 6 ? 'text-ink/40' : 'text-ink/50'}`}>
                    {label}
                  </div>
                ))}
                {days.map((day) => {
                  const cards = cardsByDay.get(day) ?? [];
                  return (
                    <div
                      key={day}
                      className={`flex flex-col items-center rounded-md py-1 ${day === today ? 'bg-cobalt/10' : ''} ${!inMonth(day) ? 'opacity-30' : ''}`}
                    >
                      <span className={`text-xs leading-none ${day === today ? 'font-bold' : 'text-ink/70'}`}>{dayNumber(day)}</span>
                      <span className="flex gap-0.5 mt-1 h-1.5">
                        {cards.slice(0, 3).map(({ event, levels }) => (
                          <span
                            key={`${event.id}-${levels[0]?.event_date}`}
                            className={`w-1.5 h-1.5 rounded-full ${
                              statusOf(event) === 'open' ? 'bg-cobalt' : statusOf(event) === 'full' ? 'bg-coral' : statusOf(event) === 'not-open' ? 'bg-sun' : 'bg-ink/30'
                            }`}
                          />
                        ))}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="space-y-4">
                {daysWithCards.map((day) => (
                  <div key={day}>
                    <p className={`text-sm font-semibold mb-2 ${day === today ? 'text-cobalt' : 'text-ink/60'}`}>
                      {fmtDate(day, { weekday: 'long' })} {day === today && '· วันนี้'}
                    </p>
                    <div className="space-y-2">{cardsByDay.get(day).map(renderCard)}</div>
                  </div>
                ))}
              </div>
            </div>

            {totalCards === 0 && (
              <div className="mt-4">
                <EmptyState
                  icon={CalendarDays}
                  title="ไม่มีกิจกรรมในเดือนนี้"
                  hint="ลองเลื่อนไปดูเดือนก่อนหน้า/ถัดไป หรือเปลี่ยนตัวกรองระดับ"
                />
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}