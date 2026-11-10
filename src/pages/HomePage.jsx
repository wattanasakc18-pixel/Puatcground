import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useEvents, useMyRegistrations, useDeptCounts } from '../hooks/useQueries.js';
import { todayStr, startOfWeek, addDays, fmtDate, fullName } from '../lib/format.js';
import { registrationStatus } from '../lib/eventStatus.js';
import { toThaiError } from '../lib/errors.js';
import Button from '../components/ui/Button.jsx';
import { LoadingState, EmptyState, ErrorState } from '../components/ui/States.jsx';
import EventCard from '../components/EventCard.jsx';
import { LevelBadge } from '../components/Badges.jsx';
import Avatar from '../components/Avatar.jsx';
import Crest from '../components/Crest.jsx';
import { HandRule, Squiggle, Tape } from '../components/Hand.jsx';

function Board({ title, count, children }) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h2 className="font-display font-semibold text-xl">{title}</h2>
        {count != null && <span className="font-hand text-cobalt text-base whitespace-nowrap">{count} รายการ</span>}
      </div>
      <HandRule className="text-ink/25 mb-5" />
      {children}
    </section>
  );
}

function IdCard({ profile }) {
  return (
    <div className="relative bg-white border border-line rounded-md p-4 shadow-sm overflow-hidden">
      <Crest className="absolute -right-6 -bottom-6 w-32 h-32 opacity-[0.07]" />
      <div className="flex items-center justify-between border-b border-line pb-2 mb-3">
        <p className="text-[11px] font-semibold tracking-widest text-cobalt">บัตรนักศึกษา</p>
        <Crest className="w-7 h-7" />
      </div>
      <div className="flex items-center gap-3">
        <Avatar url={profile?.avatar_url} name={fullName(profile)} size="w-14 h-14 text-lg" />
        <div className="min-w-0">
          <p className="font-display font-semibold leading-snug truncate">{fullName(profile)}</p>
          <p className="text-xs text-ink/60 mt-0.5">{profile?.student_code}</p>
        </div>
      </div>
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex justify-between gap-2 border-b border-dashed border-line pb-1">
          <dt className="text-ink/60">แผนก</dt>
          <dd className="font-medium text-right">{profile?.department_name}</dd>
        </div>
        <div className="flex justify-between gap-2 border-b border-dashed border-line pb-1">
          <dt className="text-ink/60">ระดับ/ห้อง</dt>
          <dd className="font-medium">{profile?.level} {profile?.class_room}</dd>
        </div>
      </dl>
      <div className="barcode mt-3 h-6 opacity-70" aria-hidden="true" />
    </div>
  );
}

export default function HomePage() {
  const { profile } = useAuth();
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

  const statusOf = (event) => {
    const el = event.event_levels.find((l) => l.level === profile?.level);
    return registrationStatus(el, countMap.get(el?.id));
  };
  const registeredIn = (event) => event.event_levels.some((l) => registeredLevelIds.has(l.id));

  const events = eventsQuery.data ?? [];
  const openNow = events.filter((e) => statusOf(e) === 'open' && !registeredIn(e));
  const weekStart = startOfWeek(todayStr());
  const weekEnd = addDays(weekStart, 6);
  const thisWeek = events.filter((e) => e.event_levels.some((l) => l.event_date >= weekStart && l.event_date <= weekEnd));
  const myUpcoming = (regsQuery.data ?? []).filter((r) => r.event_levels?.event_date >= todayStr());

  const card = (event) => (
    <EventCard
      key={event.id}
      event={event}
      levels={event.event_levels.filter((l) => l.level === profile?.level).length
        ? event.event_levels.filter((l) => l.level === profile?.level)
        : event.event_levels}
      status={statusOf(event)}
      registered={registeredIn(event)}
    />
  );

  return (
    <div className="space-y-8">
      {/* หัวกระดาษแบบ asymmetric: คำทักทายใหญ่ + บัตรนักศึกษาเอียงทับมุม */}
      <header className="grid lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 xl:col-span-8">
          <p className="font-hand text-cobalt text-lg -rotate-1 inline-block">กระดานกิจกรรม · วิทยาลัย</p>
          <h1 className="font-display font-bold text-4xl sm:text-5xl xl:text-6xl leading-[1.08] mt-3">
            สวัสดี,
            <span className="block relative text-cobalt mt-1 break-words">
              {fullName(profile)}
              <Squiggle className="absolute -bottom-1 left-0 w-full h-3 text-sun" />
            </span>
          </h1>
          <p className="font-hand text-ink/65 text-lg mt-6 max-w-md leading-relaxed">
            {openNow.length > 0
              ? `มี ${openNow.length} กิจกรรมกำลังเปิดรับสมัคร — ไปลงชื่อเป็นตัวแทนกันเถอะ`
              : 'ยังไม่มีกิจกรรมเปิดรับตอนนี้ ลองดูปฏิทินหรือแวะมาใหม่ภายหลังนะ'}
          </p>
          <Link to="/events" className="inline-block mt-5">
            <Button variant="primary"><CalendarDays className="w-4 h-4" /> ดูปฏิทินกิจกรรม</Button>
          </Link>
        </div>
        <div className="lg:col-span-5 xl:col-span-4 lg:mt-2">
          <div className="relative -rotate-2 max-w-xs mx-auto lg:max-w-none">
            <Tape className="-top-3 left-1/2 -translate-x-1/2 -rotate-3 z-10" />
            <Link to="/profile" aria-label="ดูโปรไฟล์" className="block transition-transform ease-spring hover:rotate-1 hover:scale-[1.02]">
              <IdCard profile={profile} />
            </Link>
          </div>
          <p className="font-hand text-ink/50 text-sm text-center mt-3 -rotate-1">บัตรของฉัน · แตะดูโปรไฟล์</p>
        </div>
      </header>

      <HandRule className="text-ink/20" />

      {eventsQuery.isPending ? <LoadingState /> : eventsQuery.isError ? (
        <ErrorState message={toThaiError(eventsQuery.error)} onRetry={() => eventsQuery.refetch()} />
      ) : (
        <div className="space-y-10">
          <Board title="กำลังเปิดรับสมัคร และยังไม่ได้ลงชื่อ" count={openNow.length}>
            {openNow.length === 0 ? (
              <EmptyState title="ไม่มีกิจกรรมที่เปิดรับตอนนี้" hint="เมื่อมีกิจกรรมเปิดรับสมัครและคุณยังไม่ได้ลงชื่อ จะแสดงที่นี่" />
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">{openNow.map(card)}</div>
            )}
          </Board>

          <div className="grid lg:grid-cols-5 gap-8 items-start">
            <div className="lg:col-span-3">
              <Board title="กิจกรรมในสัปดาห์นี้" count={thisWeek.length}>
                {thisWeek.length === 0 ? (
                  <EmptyState title="สัปดาห์นี้ไม่มีกิจกรรม" hint="ดูสัปดาห์อื่นๆ ได้ที่หน้ากิจกรรมและลงชื่อ" />
                ) : (
                  <div className="grid sm:grid-cols-2 gap-5">{thisWeek.map(card)}</div>
                )}
              </Board>
            </div>
            <div className="lg:col-span-2">
              <Board title="สิ่งที่ฉันลงชื่อไว้" count={myUpcoming.length}>
                {myUpcoming.length === 0 ? (
                  <EmptyState
                    title="ยังไม่มีกิจกรรมที่ลงชื่อไว้"
                    hint="ไปลงชื่อเป็นตัวแทนกิจกรรมกันเถอะ"
                    action={<Link to="/events"><Button variant="secondary">ดูกิจกรรมที่เปิดรับ</Button></Link>}
                  />
                ) : (
                  <ul className="bg-white border border-line border-l-2 border-l-coral/50 rounded-sm divide-y divide-line shadow-sm pl-3">
                    {myUpcoming.map((r) => (
                      <li key={r.id} className="p-3 flex items-center justify-between gap-2 flex-wrap">
                        <Link to={`/events/${r.event_levels?.events?.id}`} className="font-medium text-cobalt">
                          {r.event_levels?.events?.title}
                        </Link>
                        <span className="flex items-center gap-2 text-sm text-ink/60">
                          <LevelBadge level={r.event_levels?.level} />
                          {fmtDate(r.event_levels?.event_date)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Board>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}