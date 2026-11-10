export default function Avatar({ url, name = '', size = 'w-10 h-10 text-sm' }) {
  if (url) {
    return <img src={url} alt={name} className={`${size} rounded-full object-cover shrink-0`} />;
  }
  const initial = name.trim().charAt(0) || '?';
  return (
    <span className={`${size} rounded-full bg-sun/40 text-ink font-semibold flex items-center justify-center shrink-0`} aria-hidden>
      {initial}
    </span>
  );
}