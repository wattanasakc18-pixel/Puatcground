import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MessageSquareWarning, MailOpen, Mail } from 'lucide-react';
import { useFeedbacks } from '../../hooks/useQueries.js';
import { setFeedbackRead } from '../../api/feedbacks.js';
import { fullName, fmtDateTime } from '../../lib/format.js';
import { toThaiError } from '../../lib/errors.js';
import { useToast } from '../../components/ui/Toast.jsx';
import Button from '../../components/ui/Button.jsx';
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/States.jsx';

export default function FeedbacksPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const feedbacks = useFeedbacks(unreadOnly);
  const toast = useToast();
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState(null);

  const toggleRead = async (item) => {
    setBusyId(item.id);
    try {
      await setFeedbackRead(item.id, !item.is_read);
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
      toast(item.is_read ? 'ทำเครื่องหมายว่ายังไม่อ่านแล้ว' : 'ทำเครื่องหมายว่าอ่านแล้ว');
    } catch (err) {
      toast(toThaiError(err, 'อัปเดตไม่สำเร็จ'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold">คำติชม</h1>
        <label className="flex items-center gap-2 min-h-11 cursor-pointer text-sm">
          <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} className="w-5 h-5 accent-cobalt" />
          เฉพาะที่ยังไม่อ่าน
        </label>
      </div>

      {feedbacks.isLoading ? <LoadingState /> : feedbacks.isError ? (
        <ErrorState message={toThaiError(feedbacks.error)} onRetry={feedbacks.refetch} />
      ) : feedbacks.data.length === 0 ? (
        <EmptyState
          icon={MessageSquareWarning}
          title={unreadOnly ? 'ไม่มีคำติชมที่ยังไม่อ่าน' : 'ยังไม่มีคำติชม'}
          hint={unreadOnly ? 'ยกเลิกตัวกรองเพื่อดูคำติชมทั้งหมด' : 'คำติชมที่นักศึกษาส่งจากหน้า เกี่ยวกับเรา จะแสดงที่นี่'}
        />
      ) : (
        <div className="space-y-2">
          {feedbacks.data.map((f) => (
            <div key={f.id} className={`bg-white rounded-2xl border p-4 ${f.is_read ? 'border-line opacity-70' : 'border-cobalt/40'}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-medium text-sm">
                    {fullName(f.profiles)}
                    <span className="font-normal text-ink/60"> · {f.profiles?.departments?.name ?? 'ไม่ระบุแผนก'}</span>
                  </p>
                  <p className="text-xs text-ink/50 mt-0.5">{fmtDateTime(f.created_at)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!f.is_read && <span className="text-xs font-medium bg-cobalt/10 text-cobalt rounded-full px-2.5 py-0.5">ใหม่</span>}
                  <Button variant="ghost" onClick={() => toggleRead(f)} loading={busyId === f.id} className="text-sm">
                    {f.is_read ? <><Mail className="w-4 h-4" /> ยังไม่อ่าน</> : <><MailOpen className="w-4 h-4" /> อ่านแล้ว</>}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-ink/80 mt-2 whitespace-pre-line">{f.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}