import { Link } from 'react-router-dom';
import { StatusBadge, LevelBadge, RegisteredBadge } from './Badges.jsx';

// การ์ดกิจกรรม = โน้ตปักบนกระดานประกาศ: เทปกาวด้านบน + บล็อกวันที่แบบปฏิทินฉีก
export default function EventCard({ event, levels, status, registered }) {
  const levelLabel = levels.length > 1 ? 'รวม' : levels[0]?.level;
  const date = levels.map((l) => l.event_date).filter(Boolean).sort()[0];
  const d = date ? new Date(`${date}T00:00:00+07:00`) : null;
  const day = d ? d.toLocaleDateString('th-TH', { day: 'numeric' }) : '';
  const month = d ? d.toLocaleDateString('th-TH', { month: 'short' }) : '';
  const year = d ? String((d.getFullYear() + 543) % 100).padStart(2, '0') : '';
  return (
    <Link
      to={`/events/${event.id}`}
      className="group relative block bg-white border border-line rounded-md p-4 pt-5 shadow-sm -rotate-[0.4deg] hover:rotate-0 hover:shadow-md hover:border-cobalt transition-all"
    >
      <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-14 h-4 bg-sun/50 -rotate-2 shadow-sm" aria-hidden="true" />
      <div className="flex gap-3">
        {d && (
          <div className="shrink-0 text-center border border-line rounded-md bg-bg px-2 py-1.5 self-start">
            <span className="block font-display font-bold text-2xl leading-none text-cobalt">{day}</span>
            <span className="block text-[10px] text-ink/60 mt-1 whitespace-nowrap">{month} {year}</span>
          </div>
        )}
        <div className="min-w-0">
          <p className="font-display font-semibold leading-snug">{event.title}</p>
          {event.event_categories?.name && (
            <p className="text-xs text-ink/50 mt-0.5">{event.event_categories.name}</p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {levelLabel && <LevelBadge level={levelLabel} />}
            <StatusBadge status={status} />
            {registered && <RegisteredBadge />}
          </div>
        </div>
      </div>
    </Link>
  );
}