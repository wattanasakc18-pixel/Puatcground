import { STATUS_META } from '../lib/eventStatus.js';

export function StatusBadge({ status }) {
  const meta = STATUS_META[status];
  if (!meta) return null;
  return (
    <span className={`inline-flex items-center rounded-[2px] px-2 py-0.5 text-[11px] font-bold tracking-wide shadow-[inset_0_0_0_1px_rgb(255_255_255/0.25)] ${meta.className}`}>
      {meta.label}
    </span>
  );
}

export function LevelBadge({ level }) {
  const className = level === 'รวม'
    ? 'bg-ink text-white'
    : level === 'ปวช.'
      ? 'bg-sun/25 text-ink border border-sun/60'
      : 'bg-cobalt/10 text-cobalt border border-cobalt/40';
  return (
    <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium ${className}`}>
      {level}
    </span>
  );
}

export function RegisteredBadge({ children = 'ลงชื่อแล้ว' }) {
  return (
    <span className="inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold bg-sun text-ink">
      {children}
    </span>
  );
}

export function ApprovalBadge({ status }) {
  const approved = status === 'approved';
  return (
    <span className={`stamp ${approved ? 'text-cobalt' : 'text-coral'}`}>
      {approved ? 'อนุมัติแล้ว' : 'รออนุมัติ'}
    </span>
  );
}