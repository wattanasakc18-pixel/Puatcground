// ตราสัญลักษณ์วิทยาลัย: วงแหวนคู่ + หนังสือเปิด + เปลวปัญญา + รังสี
export default function Crest({ className = 'w-10 h-10' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="var(--color-white)" stroke="var(--color-cobalt)" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="25.5" fill="none" stroke="var(--color-cobalt)" strokeWidth="1" />
      <g stroke="var(--color-sun)" strokeWidth="2" strokeLinecap="round">
        <line x1="32" y1="10" x2="32" y2="15" />
        <line x1="18" y1="14" x2="21" y2="18" />
        <line x1="46" y1="14" x2="43" y2="18" />
        <line x1="12" y1="26" x2="17" y2="27" />
        <line x1="52" y1="26" x2="47" y2="27" />
      </g>
      <path d="M32 18c3 4 5 6.5 5 9.5A5 5 0 0 1 27 27.5c0-3 2-5.5 5-9.5z" fill="var(--color-sun)" />
      <path d="M14 36c6-3 12-3 18 0 6-3 12-3 18 0v12c-6-3-12-3-18 0-6-3-12-3-18 0z" fill="var(--color-cobalt)" />
      <path d="M32 36v12" stroke="var(--color-white)" strokeWidth="1.5" />
      <path d="M18 40c4-1.5 8-1.5 11 0M18 44c4-1.5 8-1.5 11 0M35 40c3-1.5 7-1.5 11 0M35 44c3-1.5 7-1.5 11 0" stroke="var(--color-white)" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M20 52c4 3 8 4 12 4s8-1 12-4" fill="none" stroke="var(--color-cobalt)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}