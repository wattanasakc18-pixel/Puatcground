// องค์ประกอบลายมือ: ตั้งใจให้ไม่เรียบสมบูรณ์แบบแบบเทมเพลต
export function HandRule({ className = '' }) {
  return (
    <svg viewBox="0 0 600 12" preserveAspectRatio="none" className={`block w-full h-3 ${className}`} fill="none" aria-hidden="true">
      <path d="M2 7 C 60 3, 120 9, 180 6 S 300 3, 360 7 S 480 9, 540 5 S 580 6, 598 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M2 9 C 80 6, 160 11, 240 8 S 400 5, 480 9 S 560 8, 598 8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.45" />
    </svg>
  );
}

export function Squiggle({ className = '' }) {
  return (
    <svg viewBox="0 0 200 12" preserveAspectRatio="none" className={className} fill="none" aria-hidden="true">
      <path d="M3 8 Q 25 2 50 7 T 100 7 T 150 7 T 197 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Tape({ className = '' }) {
  return <span className={`pointer-events-none absolute h-5 w-20 bg-sun/45 shadow-sm ${className}`} aria-hidden="true" />;
}