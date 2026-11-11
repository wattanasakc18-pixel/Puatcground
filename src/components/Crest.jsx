// ตราสัญลักษณ์วิทยาลัยเทคนิคปัว
export default function Crest({ className = 'w-10 h-10' }) {
  return (
    <img
      src="/logo.png"
      alt="ตราสัญลักษณ์วิทยาลัยเทคนิคปัว"
      className={`${className} object-contain`}
    />
  );
}
