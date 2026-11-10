import { STATUS_META } from '../lib/eventStatus.js';

const PILL = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';

export function StatusBadge({ status }) {
  const meta = STATUS_META[status];
  if (!meta) return null;
  return <span className={`${PILL} ${meta.className}`}>{meta.label}</span>;
}

export function LevelBadge({ level }) {
  const className = level === 'รวม'
    ? 'bg-ink/5 text-ink/70 border border-line'
    : level === 'ปวช.'
      ? 'bg-sun/10 text-sun border border-sun/20'
      : 'bg-cobalt/10 text-cobalt border border-cobalt/20';
  return <span className={`${PILL} ${className}`}>{level}</span>;
}

export function RegisteredBadge({ children = 'ลงชื่อแล้ว' }) {
  return <span className={`${PILL} bg-leaf/10 text-leaf`}>{children}</span>;
}

export function ApprovalBadge({ status }) {
  const approved = status === 'approved';
  return (
    <span className={`${PILL} ${approved ? 'bg-leaf/10 text-leaf' : 'bg-sun/10 text-sun'}`}>
      {approved ? 'อนุมัติแล้ว' : 'รออนุมัติ'}
    </span>
  );
}