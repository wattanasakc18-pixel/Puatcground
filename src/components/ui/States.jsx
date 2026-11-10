import { Loader2, Inbox, AlertTriangle } from 'lucide-react';
import Button from './Button.jsx';

export function LoadingState({ text = 'กำลังโหลด...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink/60" role="status">
      <Loader2 className="w-7 h-7 animate-spin text-cobalt" aria-hidden />
      <p className="text-sm">{text}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-white border border-line rounded-xl">
      <Icon className="w-8 h-8 text-ink/30" aria-hidden />
      <p className="font-semibold mt-3">{title}</p>
      {hint && <p className="text-ink/60 text-sm mt-1.5 max-w-sm">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-coral/5 border border-coral/20 rounded-xl" role="alert">
      <AlertTriangle className="w-8 h-8 text-coral" aria-hidden />
      <p className="font-semibold mt-3">โหลดข้อมูลไม่สำเร็จ</p>
      <p className="text-ink/60 text-sm mt-1.5 max-w-sm">{message}</p>
      {onRetry && <Button variant="secondary" onClick={onRetry} className="mt-4">ลองใหม่</Button>}
    </div>
  );
}