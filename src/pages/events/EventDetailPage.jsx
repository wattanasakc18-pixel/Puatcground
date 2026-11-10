import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Plus, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useEvent, useFormFields, useMyRegistrations, useDeptCounts, useRoster } from '../../hooks/useQueries.js';
import { register, cancelRegistration, updateAnswers } from '../../api/registrations.js';
import { fieldsForLevel, validateAnswers } from '../../lib/answers.js';
import { registrationStatus, STATUS_REASONS } from '../../lib/eventStatus.js';
import { fmtDate, fmtDateTime, fullName } from '../../lib/format.js';
import { REGISTRATION_TYPES } from '../../lib/constants.js';
import { toThaiError } from '../../lib/errors.js';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States.jsx';
import { LevelBadge, RegisteredBadge } from '../../components/Badges.jsx';
import DynamicForm from '../../components/DynamicForm.jsx';
import AnswersSummary from '../../components/AnswersSummary.jsx';
import Avatar from '../../components/Avatar.jsx';
import { useToast } from '../../components/ui/Toast.jsx';

export default function EventDetailPage() {
  const { eventId } = useParams();
  const { user, profile } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const eventQuery = useEvent(eventId);
  const fieldsQuery = useFormFields(eventId);
  const regsQuery = useMyRegistrations(true);
  const countsQuery = useDeptCounts();
  const rosterQuery = useRoster(eventId);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // รายการที่กำลังแก้คำตอบ
  const [answers, setAnswers] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(null); // รายการที่กำลังยกเลิก
  const [cancelLoading, setCancelLoading] = useState(false);
  const [adminLevelId, setAdminLevelId] = useState('');

  const event = eventQuery.data;
  const isAdmin = profile?.role === 'admin';
  const myLevel = event?.event_levels.find((l) => l.level === profile?.level);
  const effectiveLevel = isAdmin
    ? (event?.event_levels.find((l) => l.id === adminLevelId) ?? myLevel ?? event?.event_levels[0])
    : myLevel;
  const countRow = countsQuery.data?.find((c) => c.event_level_id === effectiveLevel?.id);
  const status = registrationStatus(effectiveLevel, countRow);
  const canSubmit = isAdmin || status === 'open';
  const canModify = isAdmin || (effectiveLevel && new Date() <= new Date(effectiveLevel.reg_close_at));

  const myRegs = useMemo(
    () => (regsQuery.data ?? []).filter((r) => event?.event_levels.some((l) => l.id === r.event_level_id)),
    [regsQuery.data, event],
  );
  const fields = useMemo(
    () => fieldsForLevel(fieldsQuery.data, effectiveLevel?.level ?? profile?.level),
    [fieldsQuery.data, effectiveLevel, profile],
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['my-registrations'] });
    queryClient.invalidateQueries({ queryKey: ['dept-counts'] });
    queryClient.invalidateQueries({ queryKey: ['event-counts', eventId] });
    queryClient.invalidateQueries({ queryKey: ['roster', eventId] });
  };

  if (eventQuery.isPending) return <LoadingState />;
  if (eventQuery.isError) return <ErrorState message={toThaiError(eventQuery.error)} onRetry={() => eventQuery.refetch()} />;

  const openCreate = () => {
    setAnswers({});
    setFormErrors({});
    setFormError('');
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (reg) => {
    setAnswers({ ...reg.answers });
    setFormErrors({});
    setFormError('');
    setEditing(reg);
    setFormOpen(true);
  };

  const submitForm = async () => {
    const errs = validateAnswers(fields, answers);
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSubmitting(true);
    setFormError('');
    try {
      if (editing) {
        await updateAnswers(editing.id, answers);
        toast('แก้ไขคำตอบแล้ว');
      } else {
        await register(effectiveLevel.id, user.id, answers);
        toast('ลงชื่อเป็นตัวแทนสำเร็จ');
      }
      invalidate();
      setFormOpen(false);
    } catch (err) {
      // แสดงข้อความไทยจากฐานข้อมูลตรงๆ
      setFormError(toThaiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmCancel = async () => {
    setCancelLoading(true);
    try {
      await cancelRegistration(cancelling.id);
      toast('ยกเลิกรายการลงชื่อแล้ว');
      invalidate();
      setCancelling(null);
    } catch (err) {
      toast(toThaiError(err), 'error');
    } finally {
      setCancelLoading(false);
    }
  };

  const typeLabel = REGISTRATION_TYPES.find((t) => t.value === event.registration_type)?.label;
  const isBooth = event.registration_type === 'booth';
  const individualReg = !isBooth ? myRegs[0] : null;

  const regActions = (reg) => (
    canModify ? (
      <div className="flex gap-2 mt-3">
        <Button variant="secondary" onClick={() => openEdit(reg)}><Pencil className="w-4 h-4" /> แก้ไขคำตอบ</Button>
        <Button variant="danger" onClick={() => setCancelling(reg)}><Trash2 className="w-4 h-4" /> ยกเลิก</Button>
      </div>
    ) : (
      <p className="text-sm text-ink/50 mt-3">ปิดรับสมัครแล้ว หากต้องการแก้ไข/ยกเลิก กรุณาติดต่อผู้จัดกิจกรรม</p>
    )
  );

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-1">
          {event.event_categories?.name && <span className="text-sm text-ink/50">{event.event_categories.name}</span>}
          <span className="text-sm text-ink/50">ปีการศึกษา {event.academic_year}</span>
          <span className="text-xs font-medium rounded-full bg-ink/5 px-2.5 py-0.5">{typeLabel}</span>
        </div>
        <h1 className="text-2xl font-bold">{event.title}</h1>
        {event.description && <p className="text-ink/70 mt-2 whitespace-pre-line">{event.description}</p>}
      </div>

      <section className="grid sm:grid-cols-2 gap-3" aria-label="สรุประดับที่เข้าร่วม">
        {event.event_levels.map((l) => (
          <div key={l.id} className="bg-white rounded-2xl border border-line p-4 space-y-1.5 text-sm">
            <LevelBadge level={l.level} />
            <p><span className="text-ink/50">วันจัดจริง:</span> {fmtDate(l.event_date, { weekday: 'long' })}</p>
            <p><span className="text-ink/50">เปิดรับสมัคร:</span> {fmtDateTime(l.reg_open_at)}</p>
            <p><span className="text-ink/50">ปิดรับสมัคร:</span> {fmtDateTime(l.reg_close_at)}</p>
            <p>
              <span className="text-ink/50">โควตาต่อแผนก:</span>{' '}
              {l.min_per_dept == null && l.max_per_dept == null
                ? 'ไม่กำหนด'
                : `${l.min_per_dept != null ? `ขั้นต่ำ ${l.min_per_dept}` : 'ไม่กำหนดขั้นต่ำ'} / ${l.max_per_dept != null ? `สูงสุด ${l.max_per_dept}` : 'ไม่จำกัด'}`}
            </p>
          </div>
        ))}
      </section>

      <section className="bg-white rounded-2xl border border-line p-5" aria-label="การลงชื่อ">
        <h2 className="font-semibold mb-3">การลงชื่อเป็นตัวแทน</h2>

        {isAdmin && event.event_levels.length > 1 && (
          <div className="mb-3">
            <label className="text-sm text-ink/60 block mb-1" htmlFor="admin-level">ลงชื่อในระดับ (ผู้ดูแลระบบ)</label>
            <select id="admin-level" className="min-h-11 px-3 rounded-xl border border-line bg-white" value={effectiveLevel?.id ?? ''} onChange={(e) => setAdminLevelId(e.target.value)}>
              {event.event_levels.map((l) => <option key={l.id} value={l.id}>{l.level}</option>)}
            </select>
          </div>
        )}

        {!effectiveLevel ? (
          <p className="text-ink/60">กิจกรรมนี้ไม่ได้เปิดสำหรับ {profile?.level ?? 'ระดับของคุณ'}</p>
        ) : individualReg ? (
          <div>
            <div className="flex items-center gap-2 mb-3"><RegisteredBadge /> <span className="text-sm text-ink/60">เมื่อ {fmtDateTime(individualReg.created_at)}</span></div>
            <AnswersSummary fields={fields} answers={individualReg.answers} />
            {regActions(individualReg)}
          </div>
        ) : (
          <div className="space-y-3">
            {isBooth && myRegs.length > 0 && (
              <div className="space-y-3">
                {myRegs.map((reg, i) => (
                  <div key={reg.id} className="border border-line rounded-xl p-4">
                    <p className="font-medium mb-2">บูธที่ {i + 1} <span className="text-sm font-normal text-ink/50">· {fmtDateTime(reg.created_at)}</span></p>
                    <AnswersSummary fields={fields} answers={reg.answers} />
                    {regActions(reg)}
                  </div>
                ))}
              </div>
            )}
            {!canSubmit && !isAdmin && (
              <p className="text-sm text-ink/60 bg-bg rounded-xl px-3 py-2">{STATUS_REASONS[status]}</p>
            )}
            <Button onClick={openCreate} disabled={!canSubmit}>
              <Plus className="w-4 h-4" /> {isBooth ? (myRegs.length ? 'เพิ่มบูธ' : 'ลงชื่อเปิดบูธ') : 'ลงชื่อเป็นตัวแทน'}
            </Button>
            {isBooth && myRegs.length === 0 && canSubmit && (
              <p className="text-sm text-ink/50">กิจกรรมนี้ลงชื่อแบบรายบูธ คุณลงได้หลายบูธ</p>
            )}
          </div>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-line p-5" aria-label="รายชื่อตัวแทนย่อ">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">รายชื่อตัวแทน</h2>
          <Link to={`/roster?event=${eventId}`} className="text-sm text-cobalt font-medium">ดูทั้งหมด</Link>
        </div>
        {rosterQuery.isPending ? <LoadingState text="กำลังโหลดรายชื่อ..." /> : (rosterQuery.data ?? []).length === 0 ? (
          <EmptyState icon={Users} title="ยังไม่มีผู้ลงชื่อ" hint="เป็นคนแรกที่ลงชื่อเป็นตัวแทนของกิจกรรมนี้" />
        ) : (
          <ul className="divide-y divide-line">
            {rosterQuery.data.slice(0, 5).map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2.5">
                <Avatar url={r.avatar_url} name={fullName(r)} size="w-9 h-9 text-xs" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{fullName(r)}</p>
                  <p className="text-sm text-ink/50">{r.department_name} · {r.level} · ห้อง {r.class_room}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal open={formOpen} onClose={() => !submitting && setFormOpen(false)} title={editing ? 'แก้ไขคำตอบ' : (isBooth ? 'ลงชื่อเปิดบูธ' : 'ลงชื่อเป็นตัวแทน')}>
        {fieldsQuery.isPending ? <LoadingState text="กำลังโหลดฟอร์ม..." /> : (
          <div className="space-y-4">
            {fields.length === 0 && <p className="text-sm text-ink/50">กิจกรรมนี้ไม่มีช่องกรอกเพิ่มเติม กดยืนยันเพื่อลงชื่อได้เลย</p>}
            <DynamicForm fields={fields} value={answers} onChange={setAnswers} errors={formErrors} disabled={submitting} userId={user?.id} />
            {formError && <p role="alert" className="text-sm text-coral bg-coral/10 rounded-xl px-3 py-2">{formError}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={submitting}>ยกเลิก</Button>
              <Button onClick={submitForm} loading={submitting}>{editing ? 'บันทึกการแก้ไข' : 'ยืนยันลงชื่อ'}</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(cancelling)}
        title="ยกเลิกการลงชื่อ"
        message="ต้องการยกเลิกรายการลงชื่อนี้ใช่หรือไม่? รายการนี้จะถูกนำออกจากรายชื่อตัวแทน"
        confirmLabel="ยืนยันยกเลิก"
        danger
        loading={cancelLoading}
        onConfirm={confirmCancel}
        onCancel={() => setCancelling(null)}
      />
    </div>
  );
}