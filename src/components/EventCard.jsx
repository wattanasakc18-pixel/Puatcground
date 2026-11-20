import { Link } from 'react-router-dom';
import { MapPin, Clock, User2 } from 'lucide-react';
import { StatusBadge, LevelBadge, RegisteredBadge } from './Badges.jsx';
import { fmtDate } from '../lib/format.js';

export default function EventCard({ event, levels = [], status, registered }) {
  // วันจัดกิจกรรม (เร็วสุด)
  const date = levels.map((l) => l.event_date).filter(Boolean).sort()[0];
  const d = date ? new Date(`${date}T00:00:00+07:00`) : null;
  const day = d ? d.toLocaleDateString('th-TH', { day: 'numeric' }) : '';
  const month = d ? d.toLocaleDateString('th-TH', { month: 'short' }) : '';
  const year = d ? String((d.getFullYear() + 543) % 100).padStart(2, '0') : '';

  // ช่วงเวลาเปิดรับสมัคร (เร็วสุด)
  const openAt = levels.map((l) => l.reg_open_at).filter(Boolean).sort()[0];

  // แผนกผู้จัด
  const deptName = event.profiles?.departments?.name;

  return (
    <Link
      to={`/events/${event.id}`}
      className="group block bg-white border border-line rounded-2xl overflow-hidden shadow-sm hover:border-cobalt/40 hover:shadow-md transition-all"
    >
      {/* ── Header: ตรา + ชื่อกิจกรรม + วันที่ ── */}
      <div className="bg-gradient-to-r from-cobalt/8 to-cobalt/3 px-4 py-3 flex items-center gap-3">
        {/* ตราวิทยาลัย */}
        <img
          src="/logo.png"
          alt="ตรา"
          className="w-9 h-9 object-contain shrink-0"
        />
        {/* ชื่อกิจกรรม + category */}
        <div className="min-w-0 flex-1">
          <p className="font-bold text-base leading-snug group-hover:text-cobalt transition-colors line-clamp-2">
            {event.title}
          </p>
          {event.event_categories?.name && (
            <p className="text-[11px] text-ink/40 mt-0.5">{event.event_categories.name}</p>
          )}
        </div>
        {/* วันที่ */}
        {d && (
          <div className="shrink-0 text-center bg-white border border-line rounded-xl px-2.5 py-1.5 shadow-sm">
            <span className="block font-bold text-xl leading-none text-cobalt">{day}</span>
            <span className="block text-[10px] text-ink/50 mt-0.5 whitespace-nowrap">{month} {year}</span>
          </div>
        )}
      </div>

      {/* ── Divider ── */}
      <div className="h-px bg-line mx-4" />

      {/* ── Body: meta info + badges ── */}
      <div className="px-4 py-2.5 space-y-1">
        {/* ผู้จัด */}
        {deptName && (
          <div className="flex items-center gap-2 text-xs text-ink/60">
            <User2 className="w-3.5 h-3.5 shrink-0 text-cobalt/60" />
            <span className="truncate">{deptName}</span>
          </div>
        )}
        {/* เปิดรับสมัคร */}
        {openAt && (
          <div className="flex items-center gap-2 text-xs text-ink/60">
            <Clock className="w-3.5 h-3.5 shrink-0 text-cobalt/60" />
            <span>เปิดรับ {fmtDate(openAt)}</span>
          </div>
        )}
        {/* สถานที่จัด */}
        {event.location && (
          <div className="flex items-center gap-2 text-xs text-ink/60">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-cobalt/60" />
            <span className="truncate">{event.location}</span>
          </div>
        )}

        {/* badges */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {levels.map((l) => <LevelBadge key={l.id} level={l.level} />)}
          <StatusBadge status={status} />
          {registered && <RegisteredBadge />}
        </div>
      </div>
    </Link>
  );
}
