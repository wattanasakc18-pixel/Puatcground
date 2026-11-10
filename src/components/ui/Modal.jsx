import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative bg-white w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-md'} max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5 border border-line shadow-lg`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="ปิด" className="p-2 rounded-lg hover:bg-line/60">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}