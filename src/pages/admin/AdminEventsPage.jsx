import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Copy, Trash2, CalendarCog, Search, Check, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useEvents, useCategories, useAllCounts } from '../../hooks/useQueries.js';
import { deleteEvent, copyEvent, approveEvent } from '../../api/events.js';
import { toThaiError } from '../../lib/errors.js';
import { useToast } from '../../components/ui/Toast.jsx';
import Button from '../../components/ui/Button.jsx';
import { Field, Input, Select } from '../../components/ui/Field.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/States.jsx';
import { LevelBadge, ApprovalBadge } from '../../components/Badges.jsx';

export default function AdminEventsPage() {
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [search, setSearch] = useState('');
  const [year, setYear] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const events = useEvents({ search, year, categoryId, approvedOnly: false, createdBy: isAdmin ? '' : user?.id });
  const categories = useCategories();
  const counts = useAllCounts();
  const [copyTarget, setCopyTarget] = useState(null);
  const [copyYear, setCopyYear] = useState('');
  const [copyError, setCopyError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [approveTarget, setApproveTarget] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const totals = useMemo(() => {
    const map = {};
    for (const c of counts.data ?? []) {
      map[c.event_id] = (map[c.event_id] ?? 0) + c.registered;
    }
    return map;
  }, [counts.data]);

  const openCopy = (event) => {
    setCopyTarget(event);
    setCopyYear(String(Number(event.academic_year) + 1 || ''));
    setCopyError('');
  };

  const doCopy = async () => {
    if (!/^\d{4}$/.test(copyYear)) { setCopyError('กรอกปีการศึกษาเป็นตัวเลข 4 หลัก เช่น 2569'); return; }
    setBusy(true);
    try {
      const newId = await copyEvent(copyTarget.id, copyYear);
      toast(isAdmin ? 'คัดลอกกิจกรรมแล้ว กรุณาปรับวันที่ของปีใหม่' : 'คัดลอกกิจกรรมแล้ว กิจกรรมใหม่จะรออนุมัติ กรุณาปรับวันที่ของปีใหม่');
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['all-counts'] });
      navigate(`/admin/events/${newId}/edit`);
    } catch (err) {
      setCopyError(toThaiError(err, 'คัดลอกไม่สำเร็จ'));
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      await deleteEvent(deleteTarget.id);
      toast('ลบกิจกรรมแล้ว');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['all-counts'] });
    } catch (err) {
      toast(err.code === '23503'
        ? 'ลบไม่ได้ เนื่องจากมีผู้ลงชื่อกิจกรรมนี้แล้ว'
        : toThaiError(err, 'ลบไม่สำเร็จ'), 'error');
      setDeleteTarget(null);
    } finally {
      setBusy(false);
    }
  };

  const doApprove = async () => {
    setBusy(true);
    try {
      await approveEvent(approveTarget.id);
      toast('อนุมัติกิจกรรมแล้ว นักเรียนจึงจะเห็นและลงชื่อได้');
      setApproveTarget(null);
      queryClient.invalidateQueries({ queryKey: ['events'] });
    } catch (err) {
      toast(toThaiError(err, 'อนุมัติไม่สำเร็จ'), 'error');
      setApproveTarget(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold">จัดการกิจกรรม</h1>
        <Link to="/admin/events/new"><Button><Plus className="w-4 h-4" /> สร้างกิจกรรม</Button></Link>
      </div>

      {!isAdmin && (
        <p className="text-sm text-ink/60 bg-sun/20 border border-sun/40 rounded-xl px-4 py-3">
          กิจกรรมที่คุณสร้างจะอยู่ในสถานะ <strong>รออนุมัติ</strong> จนกว่าผู้ดูแลระบบจะอนุมัติ นักเรียนจึงจะเห็นและลงชื่อได้
          {' · '}แก้ไขหรือลบได้เฉพาะกิจกรรมที่ยังรออนุมัติเท่านั้น
        </p>
      )}

      <div className="bg-white rounded-2xl border border-line p-4 grid gap-3 sm:grid-cols-3">
        <Field label="ค้นหาชื่อกิจกรรม" htmlFor="ev-search">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" aria-hidden />
            <Input id="ev-search" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="พิมพ์ชื่อกิจกรรม" />
          </div>
        </Field>
        <Field label="ปีการศึกษา" htmlFor="ev-year">
          <Input id="ev-year" value={year} onChange={(e) => setYear(e.target.value)} placeholder="เช่น 2569 (เว้นว่าง = ทุกปี)" inputMode="numeric" />
        </Field>
        <Field label="หมวดกิจกรรม" htmlFor="ev-cat">
          <Select id="ev-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">ทุกหมวด</option>
            {(categories.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
      </div>

      {events.isLoading ? <LoadingState /> : events.isError ? (
        <ErrorState message={toThaiError(events.error)} onRetry={events.refetch} />
      ) : events.data.length === 0 ? (
        <EmptyState
          icon={CalendarCog}
          title="ยังไม่มีกิจกรรม"
          hint="กดปุ่ม สร้างกิจกรรม เพื่อเพิ่มกิจกรรมแรก แล้วตั้งระดับที่เข้าร่วมและฟอร์มลงชื่อ"
          action={<Link to="/admin/events/new"><Button><Plus className="w-4 h-4" /> สร้างกิจกรรม</Button></Link>}
        />
      ) : (
        <div className="space-y-3">
          {events.data.map((ev) => {
            const pending = ev.approval_status !== 'approved';
            const canEdit = isAdmin || (ev.created_by === user?.id && pending);
            const canCopy = isAdmin || ev.created_by === user?.id;
            const canApprove = isAdmin && pending;
            return (
              <div key={ev.id} className="bg-white rounded-2xl border border-line p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold">{ev.title}</h2>
                    <ApprovalBadge status={ev.approval_status} />
                    {ev.event_levels.length === 0
                      ? <span className="text-xs text-coral">ยังไม่ได้ตั้งระดับ</span>
                      : ev.event_levels.map((l) => <LevelBadge key={l.id} level={l.level} />)}
                  </div>
                  <p className="text-sm text-ink/60 mt-1">
                    ปีการศึกษา {ev.academic_year}
                    {ev.event_categories?.name ? ` · ${ev.event_categories.name}` : ''}
                    {' · '}{ev.registration_type === 'booth' ? 'รายบูธ' : 'รายบุคคล'}
                    {' · '}ลงชื่อแล้ว {totals[ev.id] ?? 0} คน
                  </p>
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap">
                  {canApprove && (
                    <Button onClick={() => setApproveTarget(ev)}><Check className="w-4 h-4" /> อนุมัติ</Button>
                  )}
                  {canEdit ? (
                    <Link to={`/admin/events/${ev.id}/edit`}><Button variant="secondary"><Pencil className="w-4 h-4" /> แก้ไข</Button></Link>
                  ) : (
                    !isAdmin && (
                      <span className="inline-flex items-center gap-1 text-xs text-ink/50 px-2">
                        <Lock className="w-3.5 h-3.5" /> ล็อกหลังอนุมัติ
                      </span>
                    )
                  )}
                  {canCopy && (
                    <Button variant="secondary" onClick={() => openCopy(ev)}><Copy className="w-4 h-4" /> คัดลอก</Button>
                  )}
                  {canEdit && (
                    <Button variant="danger" onClick={() => setDeleteTarget(ev)} aria-label={`ลบ ${ev.title}`}><Trash2 className="w-4 h-4" /></Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={Boolean(copyTarget)} onClose={busy ? undefined : () => setCopyTarget(null)} title="คัดลอกกิจกรรมไปปีใหม่">
        <p className="text-sm text-ink/70 mb-3">
          คัดลอก "{copyTarget?.title}" พร้อมระดับและช่องฟอร์ม โดยเลื่อนวันที่ไป 1 ปี อัตโนมัติ แล้วจึงปรับวันที่เองในหน้าแก้ไข
          {!isAdmin && ' · กิจกรรมที่คัดลอกจะอยู่ในสถานะรออนุมัติ'}
        </p>
        <Field label="ปีการศึกษาใหม่" required error={copyError} htmlFor="copy-year">
          <Input id="copy-year" value={copyYear} onChange={(e) => setCopyYear(e.target.value)} inputMode="numeric" placeholder="เช่น 2570" />
        </Field>
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="secondary" onClick={() => setCopyTarget(null)} disabled={busy}>ยกเลิก</Button>
          <Button onClick={doCopy} loading={busy}>คัดลอก</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="ลบกิจกรรม"
        message={`ต้องการลบ "${deleteTarget?.title}" ใช่หรือไม่?\nช่องฟอร์มและระดับของกิจกรรมนี้จะถูกลบด้วย ถ้ามีผู้ลงชื่อแล้วจะลบไม่ได้`}
        confirmLabel="ลบกิจกรรม"
        danger
        loading={busy}
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(approveTarget)}
        title="อนุมัติกิจกรรม"
        message={`อนุมัติ "${approveTarget?.title}" ใช่หรือไม่?\nหลังอนุมัติ นักเรียนจะเห็นกิจกรรมนี้และลงชื่อได้ทันทีตามช่วงรับสมัครที่ตั้งไว้ และผู้จัดจะแก้ไขกิจกรรมนี้ไม่ได้แล้ว`}
        confirmLabel="อนุมัติ"
        loading={busy}
        onConfirm={doApprove}
        onCancel={() => setApproveTarget(null)}
      />
    </div>
  );
}