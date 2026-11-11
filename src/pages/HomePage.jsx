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

function Board({ title, count, children }) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h2 className="font-semibold text-lg">{title}</h2>
        {count != null && <span className="text-sm text-ink/50 whitespace-nowrap">{count} รายการ</span>}
      </div>
      {children}
    </section>
  );
}

function IdCard({ profile }) {
  return (
    <div className="bg-white border border-line rounded-xl p-5 shadow-sm transition-colors group-hover:border-cobalt/40">
      <div className="flex items-center gap-3">
        <Avatar url={profile?.avatar_url} name={fullName(profile)} size="w-12 h-12 text-base" />
        <div className="min-w-0">
          <p className="font-semibold leading-snug truncate">{fullName(profile)}</p>
          <p className="text-xs text-ink/50 mt-0.5">{profile?.student_code}</p>
        </div>
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-ink/50">แผนก</dt>
          <dd className="font-medium text-right">{profile?.department_name}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-ink/50">ระดับ/ห้อง</dt>
          <dd className="font-medium">{profile?.level} {profile?.class_room}</dd>
        </div>
      </dl>
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
      levels={event.event_levels}
      status={statusOf(event)}
      registered={registeredIn(event)}
    />
  );

  return (
    <div className="space-y-10">
      <header className="grid lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 xl:col-span-8">
          <p className="text-sm font-medium text-ink/50">กระดานกิจกรรม · วิทยาลัย</p>
          <h1 className="font-bold text-3xl sm:text-4xl xl:text-5xl leading-tight mt-2">
            ยินดีต้อนรับ,
            <span className="block mt-1 break-words">{fullName(profile)}</span>
          </h1>
          <p className="text-ink/60 mt-4 max-w-md">
            {openNow.length > 0
              ? `มี ${openNow.length} กิจกรรมกำลังเปิดรับสมัคร — ไปลงชื่อเป็นตัวแทนกันเถอะ`
              : 'ยังไม่มีกิจกรรมเปิดรับตอนนี้ ลองดูปฏิทินหรือแวะมาใหม่ภายหลังนะ'}
          </p>
          <Link to="/events" className="inline-block mt-6">
            <Button variant="primary"><CalendarDays className="w-4 h-4" /> ดูปฏิทินกิจกรรม</Button>
          </Link>
        </div>
        <div className="lg:col-span-5 xl:col-span-4">
          <Link to="/profile" aria-label="ดูโปรไฟล์" className="group block max-w-sm mx-auto lg:max-w-none">
            <IdCard profile={profile} />
          </Link>
          <p className="text-ink/50 text-xs text-center mt-2">แตะบัตรเพื่อดูโปรไฟล์</p>
        </div>
      </header>

      <hr className="border-line" />

      {eventsQuery.isPending ? <LoadingState /> : eventsQuery.isError ? (
        <ErrorState message={toThaiError(eventsQuery.error)} onRetry={() => eventsQuery.refetch()} />
      ) : (
        <div className="space-y-10">

          {/* กำลังเปิดรับ */}
          <Board title="กำลังเปิดรับสมัคร และยังไม่ได้ลงชื่อ" count={openNow.length}>
            {openNow.length === 0 ? (
              <EmptyState title="ไม่มีกิจกรรมที่เปิดรับตอนนี้" hint="เมื่อมีกิจกรรมเปิดรับสมัครและคุณยังไม่ได้ลงชื่อ จะแสดงที่นี่" />
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">{openNow.map(card)}</div>
            )}
          </Board>

          {/* กิจกรรมสัปดาห์นี้ */}
          <Board title="กิจกรรมในสัปดาห์นี้" count={thisWeek.length}>
            {thisWeek.length === 0 ? (
              <EmptyState title="สัปดาห์นี้ไม่มีกิจกรรม" hint="ดูสัปดาห์อื่นๆ ได้ที่หน้ากิจกรรมและลงชื่อ" />
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">{thisWeek.map(card)}</div>
            )}
          </Board>

          {/* สิ่งที่ฉันลงชื่อไว้ */}
          <Board title="สิ่งที่ฉันลงชื่อไว้" count={myUpcoming.length}>
            {myUpcoming.length === 0 ? (
              <EmptyState
                title="ยังไม่มีกิจกรรมที่ลงชื่อไว้"
                hint="ไปลงชื่อเป็นตัวแทนกิจกรรมกันเถอะ"
                action={<Link to="/events"><Button variant="secondary">ดูกิจกรรมที่เปิดรับ</Button></Link>}
              />
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {myUpcoming.map((r) => (
                  <Link
                    key={r.id}
                    to={`/events/${r.event_levels?.events?.id}`}
                    className="group block bg-white border border-line rounded-xl p-4 sm:p-5 shadow-sm hover:border-cobalt/40 transition-colors"
                  >
                    <div className="flex gap-3">
                      {/* วันที่ — เหมือน EventCard */}
                      <div className="shrink-0 text-center border border-line rounded-lg bg-bg px-2.5 py-2 self-start">
                        <span className="block font-bold text-2xl leading-none">
                          {new Date(`${r.event_levels?.event_date}T00:00:00+07:00`).getDate()}
                        </span>
                        <span className="block text-[11px] text-ink/60 mt-1 whitespace-nowrap">
                          {new Date(`${r.event_levels?.event_date}T00:00:00+07:00`).toLocaleDateString('th-TH', { month: 'short' })}{' '}
                          {String((new Date(`${r.event_levels?.event_date}T00:00:00+07:00`).getFullYear() + 543) % 100).padStart(2, '0')}
                        </span>
                      </div>
                      {/* ข้อมูล */}
                      <div className="min-w-0">
                        <p className="font-semibold leading-snug group-hover:text-cobalt transition-colors">
                          {r.event_levels?.events?.title}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          <LevelBadge level={r.event_levels?.level} />
                          <span className="text-xs text-ink/50 self-center">{fmtDate(r.event_levels?.event_date)}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Board>

        </div>
      )}
    </div>
  );
}
