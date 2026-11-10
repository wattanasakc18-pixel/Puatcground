import { Link } from 'react-router-dom';
import { StatusBadge, LevelBadge, RegisteredBadge } from './Badges.jsx';

export default function EventCard({ event, levels, status, registered }) {
  const date = levels.map((l) => l.event_date).filter(Boolean).sort()[0];
  const d = date ? new Date(`${date}T00:00:00+07:00`) : null;
  const day = d ? d.toLocaleDateString('th-TH', { day: 'numeric' }) : '';
  const month = d ? d.toLocaleDateString('th-TH', { month: 'short' }) : '';
  const year = d ? String((d.getFullYear() + 543) % 100).padStart(2, '0') : '';
  return (
    <Link
      to={`/events/${event.id}`}
      className="group block bg-white border border-line rounded-xl p-4 sm:p-5 shadow-sm hover:border-cobalt/40 transition-colors"
    >
      <div className="flex gap-3">
        {d && (
          <div className="shrink-0 text-center border border-line rounded-lg bg-bg px-2.5 py-2 self-start">
            <span className="block font-bold text-2xl leading-none">{day}</span>
            <span className="block text-[11px] text-ink/60 mt-1 whitespace-nowrap">{month} {year}</span>
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold leading-snug group-hover:text-cobalt transition-colors">{event.title}</p>
          {event.event_categories?.name && (
            <p className="text-xs text-ink/50 mt-1">{event.event_categories.name}</p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {levels.map((l) => <LevelBadge key={l.id} level={l.level} />)}
            <StatusBadge status={status} />
            {registered && <RegisteredBadge />}
          </div>
        </div>
      </div>
    </Link>
  );
}