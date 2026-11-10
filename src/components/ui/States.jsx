import { Loader2, Inbox, AlertTriangle } from 'lucide-react';
import Button from './Button.jsx';
import { Tape } from '../Hand.jsx';

export function LoadingState({ text = 'กำลังโหลด...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink/60" role="status">
      <Loader2 className="w-8 h-8 animate-spin text-cobalt" aria-hidden />
      <p className="font-hand text-base">{text}</p>
    </div>
  );
}

// สถานะว่าง = เศษกระดาษโน้ตปักบนกระดาน พร้อมข้อความลายมือ
export function EmptyState({ icon: Icon = Inbox, title, hint, action }) {
  return (
    <div className="flex justify-center py-10 px-4">
      <div className="relative w-full max-w-sm bg-white border border-line rounded-sm shadow-sm p-6 pt-7 text-center -rotate-1">
        <Tape className="-top-2.5 left-1/2 -translate-x-1/2 -rotate-2" />
        <Icon className="w-8 h-8 mx-auto text-ink/35" aria-hidden />
        <p className="font-display font-semibold mt-3">{title}</p>
        {hint && <p className="font-hand text-ink/60 text-base mt-1.5 leading-snug">{hint}</p>}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}

export function ErrorState({ message = 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง', onRetry }) {
  return (
    <div className="flex justify-center py-10 px-4" role="alert">
      <div className="relative w-full max-w-sm bg-coral/5 border border-coral/30 rounded-sm shadow-sm p-6 pt-7 text-center rotate-1">
        <Tape className="-top-2.5 left-1/2 -translate-x-1/2 rotate-2 bg-coral/30" />
        <AlertTriangle className="w-8 h-8 mx-auto text-coral" aria-hidden />
        <p className="font-display font-semibold mt-3">โหลดข้อมูลไม่สำเร็จ</p>
        <p className="font-hand text-ink/60 text-base mt-1.5 leading-snug">{message}</p>
        {onRetry && <Button variant="secondary" onClick={onRetry} className="mt-4">ลองใหม่</Button>}
      </div>
    </div>
  );
}