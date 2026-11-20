import { X } from 'lucide-react';

const BASE = 'w-full min-h-11 px-3 rounded-lg border border-line bg-white transition-colors focus:border-cobalt';

export function Field({ label, error, required, htmlFor, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium mb-1.5">
        {label} {required && <span className="text-coral">*</span>}
      </label>
      {children}
      {error && <p className="text-coral text-sm mt-1">{error}</p>}
    </div>
  );
}

export function Input({ className = '', ...rest }) {
  return <input className={`${BASE} ${className}`} {...rest} />;
}

export function Select({ className = '', children, ...rest }) {
  return <select className={`${BASE} ${className}`} {...rest}>{children}</select>;
}

export function Textarea({ className = '', ...rest }) {
  return <textarea className={`${BASE} py-2 min-h-24 ${className}`} {...rest} />;
}

/**
 * ตัวเลือกเวลาแบบไทย 24 ชั่วโมง (00:00 - 23:59 น.)
 * แก้ปัญหาเบราว์เซอร์แสดงเป็น AM/PM ตาม locale ของเครื่อง
 */
export function TimeInput({ value = '', onChange, id }) {
  const normalized = value ? value.slice(0, 5) : '';
  const [h, m] = normalized.includes(':') ? normalized.split(':') : ['', ''];

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  const handleHour = (newH) => {
    if (!newH) {
      onChange('');
      return;
    }
    const minute = m || '00';
    onChange(`${newH}:${minute}`);
  };

  const handleMinute = (newM) => {
    const hour = h || '08';
    onChange(`${hour}:${newM || '00'}`);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <select
          id={id}
          value={h}
          onChange={(e) => handleHour(e.target.value)}
          aria-label="ชั่วโมง (24 ชม.)"
          className="flex-1 min-h-11 px-2.5 rounded-lg border border-line bg-white text-sm transition-colors focus:border-cobalt font-mono"
        >
          <option value="">-- ชม. --</option>
          {hours.map((hour) => (
            <option key={hour} value={hour}>{hour}</option>
          ))}
        </select>
        <span className="text-ink/40 font-bold">:</span>
        <select
          value={m}
          onChange={(e) => handleMinute(e.target.value)}
          disabled={!h}
          aria-label="นาที"
          className="flex-1 min-h-11 px-2.5 rounded-lg border border-line bg-white text-sm transition-colors focus:border-cobalt font-mono disabled:opacity-50"
        >
          <option value="">-- นาที --</option>
          {minutes.map((minute) => (
            <option key={minute} value={minute}>{minute}</option>
          ))}
        </select>
        <span className="text-sm font-medium text-ink/70 px-1 shrink-0">น.</span>
        {normalized && (
          <button
            type="button"
            onClick={() => onChange('')}
            title="ล้างเวลา"
            aria-label="ล้างเวลา"
            className="p-2 text-ink/40 hover:text-coral hover:bg-coral/10 rounded-lg transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ทางลัดเวลามาตรฐานไทยที่ใช้บ่อย */}
      <div className="flex flex-wrap gap-1">
        {['08:30', '09:00', '12:00', '13:00', '16:30'].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            className={`px-2 py-0.5 rounded-md border text-[11px] transition-colors ${
              normalized === preset
                ? 'bg-cobalt text-white border-cobalt'
                : 'bg-bg text-ink/60 border-line hover:border-cobalt/40'
            }`}
          >
            {preset} น.
          </button>
        ))}
      </div>
    </div>
  );
}