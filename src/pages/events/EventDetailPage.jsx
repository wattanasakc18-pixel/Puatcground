import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Plus, Users, Calendar, Clock, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useEvent, useFormFields, useMyRegistrations, useDeptCounts, useRoster } from '../../hooks/useQueries.js';
import { register, cancelRegistration, updateAnswers } from '../../api/registrations.js';
import { emailRegistered } from '../../api/email.js';
import { fieldsForLevel, validateAnswers } from '../../lib/answers.js';
import { registrationStatus, STATUS_META, STATUS_REASONS } from '../../lib/eventStatus.js';
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

// ── แถบ Tab ──────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'info', label: 'ข้อมูลกิจกรรม' },
  { key: 'participants', label: 'ผู้เข้าร่วม' },
];

function TabBar({ active, onChange }) {
  return (
    <div className="flex gap-1 border-b border-line" role="tablist">
      {TABS.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={active === t.key}
          onClick={() => onChange(t.key)}
          className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap
            ${active === t.key
              ? 'border-b-2 border-cobalt text-cobalt -mb-px'
              : 'text-ink/50 hover:text-ink'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── การ์ดสถานะลงชื่อ (sidebar) ───────────────────────────────────────────────
function RegistrationCard({
  event, effectiveLevel, status, canSubmit, canModify,
  isAdmin, profile, myRegs, fields,
  onOpenCreate, onOpenEdit, onCancelRequest,
  adminLevelId, setAdminLevelId,
}) {
  const isBooth = event.registration_type === 'booth';
  const individualReg = !isBooth ? myRegs[0] : null;

  const statusMeta = status ? STATUS_META[status] : null;

  return (
    <div className="bg-white rounded-2xl border border-line p-5 space-y-4">
      {/* สถานะลงชื่อ */}
      {effectiveLevel && statusMeta && (
        <div className={`rounded-xl px-4 py-3 text-center font-semibold text-sm ${statusMeta.className}`}>
          {statusMeta.label}
        </div>
      )}

      {/* Admin: เลือกระดับ */}
      {isAdmin && event.event_levels.length > 1 && (
        <div>
          <label className="text-xs text-ink/60 block mb-1" htmlFor="admin-level-card">ลงชื่อในระดับ (ผู้ดูแล)</label>
          <select
            id="admin-level-card"
            className="w-full min-h-10 px-3 rounded-xl border border-line bg-white text-sm"
            value={effectiveLevel?.id ?? ''}
            onChange={(e) => setAdminLevelId(e.target.value)}
          >
            {event.event_levels.map((l) => <option key={l.id} value={l.id}>{l.level}</option>)}
          </select>
        </div>
      )}

      {/* ไม่มีระดับตรงกับผู้ใช้ */}
      {!effectiveLevel ? (
        <p className="text-sm text-ink/60 text-center">กิจกรรมนี้ไม่ได้เปิดสำหรับ {profile?.level ?? 'ระดับของคุณ'}</p>
      ) : individualReg ? (
        /* ลงชื่อแล้ว (รายบุคคล) */
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <RegisteredBadge />
            <span className="text-xs text-ink/50">{fmtDateTime(individualReg.created_at)}</span>
          </div>
          <AnswersSummary fields={fields} answers={individualReg.answers} />
          {canModify ? (
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1 text-sm" onClick={() => onOpenEdit(individualReg)}>
                <Pencil className="w-3.5 h-3.5" /> แก้ไข
              </Button>
              <Button variant="danger" className="flex-1 text-sm" onClick={() => onCancelRequest(individualReg)}>
                <Trash2 className="w-3.5 h-3.5" /> ยกเลิก
              </Button>
            </div>
          ) : (
            <p className="text-xs text-ink/50">ปิดรับสมัครแล้ว หากต้องการแก้ไข/ยกเลิก กรุณาติดต่อผู้จัดกิจกรรม</p>
          )}
        </div>
      ) : (
        /* ยังไม่ลงชื่อ */
        <div className="space-y-3">
          {isBooth && myRegs.length > 0 && (
            <div className="space-y-2">
              {myRegs.map((reg, i) => (
                <div key={reg.id} className="border border-line rounded-xl p-3">
                  <p className="text-sm font-medium mb-1">บูธที่ {i + 1}</p>
                  <AnswersSummary fields={fields} answers={reg.answers} />
                  {canModify ? (
                    <div className="flex gap-2 mt-2">
                      <Button variant="secondary" className="text-xs flex-1" onClick={() => onOpenEdit(reg)}>
                        <Pencil className="w-3 h-3" /> แก้ไข
                      </Button>
                      <Button variant="danger" className="text-xs flex-1" onClick={() => onCancelRequest(reg)}>
                        <Trash2 className="w-3 h-3" /> ยกเลิก
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-ink/50 mt-1">ปิดรับสมัครแล้ว</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {!canSubmit && !isAdmin && status && (
            <p className="text-xs text-ink/60 bg-bg rounded-xl px-3 py-2">{STATUS_REASONS[status]}</p>
          )}

          <Button className="w-full" onClick={onOpenCreate} disabled={!canSubmit}>
            <Plus className="w-4 h-4" />
            {isBooth ? (myRegs.length ? 'เพิ่มบูธ' : 'ลงชื่อเปิดบูธ') : 'ลงชื่อเป็นตัวแทน'}
          </Button>

          {isBooth && myRegs.length === 0 && canSubmit && (
            <p className="text-xs text-ink/50 text-center">ลงชื่อได้หลายคน</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tab: ข้อมูลกิจกรรม ────────────────────────────────────────────────────────
function InfoTab({ event }) {
  return (
    <div className="space-y-6">
      {/* ระยะเวลาแข่งขัน */}
      <div>
        <h3 className="text-sm font-semibold text-ink/50 uppercase tracking-wide mb-3">ช่วงเวลาแข่งขัน</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {event.event_levels.map((l) => (
            <div key={l.id} className="bg-bg rounded-2xl border border-line p-4 space-y-2">
              <LevelBadge level={l.level} />
              <div className="flex items-start gap-2 text-sm">
                <Calendar className="w-4 h-4 text-ink/40 mt-0.5 shrink-0" />
                <div>
                  <p className="text-ink/50 text-xs">วันจัดจริง</p>
                  <p className="font-medium">{fmtDate(l.event_date, { weekday: 'long' })}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Clock className="w-4 h-4 text-ink/40 mt-0.5 shrink-0" />
                <div>
                  <p className="text-ink/50 text-xs">รับสมัคร</p>
                  <p>{fmtDateTime(l.reg_open_at)}</p>
                  <p className="text-ink/50">ถึง {fmtDateTime(l.reg_close_at)}</p>
                </div>
              </div>
              <p className="text-sm">
                <span className="text-ink/50">โควตาต่อแผนก: </span>
                {l.min_per_dept == null && l.max_per_dept == null
                  ? 'ไม่กำหนด'
                  : `${l.min_per_dept != null ? `ขั้นต่ำ ${l.min_per_dept}` : 'ไม่กำหนดขั้นต่ำ'} / ${l.max_per_dept != null ? `สูงสุด ${l.max_per_dept}` : 'ไม่จำกัด'}`}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* รายละเอียด */}
      {event.description && (
        <div>
          <h3 className="text-sm font-semibold text-ink/50 uppercase tracking-wide mb-3">รายละเอียด</h3>
          <div className="bg-bg rounded-2xl border border-line p-4">
            <p className="text-sm text-ink/80 whitespace-pre-line leading-relaxed">{event.description}</p>
          </div>
        </div>
      )}

      {/* สถานที่จัด + เบอร์ติดต่อ */}
      {(event.location || event.contact_phone) && (
        <div>
          <h3 className="text-sm font-semibold text-ink/50 uppercase tracking-wide mb-3">ข้อมูลเพิ่มเติม</h3>
          <div className="bg-bg rounded-2xl border border-line p-4 space-y-2 text-sm">
            {event.location && (
              <p><span className="text-ink/50">สถานที่จัด: </span>{event.location}</p>
            )}
            {event.contact_phone && (
              <p>
                <span className="text-ink/50">เบอร์ติดต่อ: </span>
                <a href={`tel:${event.contact_phone}`} className="text-cobalt hover:underline">{event.contact_phone}</a>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: ผู้เข้าร่วม ─────────────────────────────────────────────────────────
function ParticipantsTab({ eventId, rosterQuery }) {
  const roster = rosterQuery.data ?? [];

  if (rosterQuery.isPending) return <LoadingState text="กำลังโหลดรายชื่อ..." />;
  if (rosterQuery.isError) return <ErrorState message={toThaiError(rosterQuery.error)} onRetry={() => rosterQuery.refetch()} />;
  if (roster.length === 0) {
    return <EmptyState icon={Users} title="ยังไม่มีผู้ลงชื่อ" hint="เป็นคนแรกที่ลงชื่อเป็นตัวแทนของกิจกรรมนี้" />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink/50">{roster.length} คน</p>
        <Link to={`/roster?event=${eventId}`} className="text-sm text-cobalt font-medium hover:underline">
          ดูทั้งหมด
        </Link>
      </div>
      <ul className="bg-white rounded-2xl border border-line divide-y divide-line overflow-hidden">
        {roster.map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar url={r.avatar_url} name={fullName(r)} size="w-9 h-9 text-xs" />
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate text-sm">{fullName(r)}</p>
              <p className="text-xs text-ink/50">{r.department_name} · {r.level} · ห้อง {r.class_room}</p>
            </div>
            <LevelBadge level={r.level} />
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
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

  const [activeTab, setActiveTab] = useState('info');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [answers, setAnswers] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(null);
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
        // ส่งอีเมลยืนยันการลงชื่อ
        if (profile?.email) {
          emailRegistered({
            email: profile.email,
            name: `${profile.title ?? ''}${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim(),
            eventTitle: event.title,
            eventDate: fmtDate(effectiveLevel.event_date),
            level: effectiveLevel.level,
          }).catch(() => {});
        }
      }
      invalidate();
      setFormOpen(false);
    } catch (err) {
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

  // หาวันเริ่ม-สิ้นสุดจาก event_levels
  const eventDates = event.event_levels.map((l) => l.event_date).filter(Boolean).sort();
  const firstDate = eventDates[0];
  const lastDate = eventDates[eventDates.length - 1];
  const dateRange = firstDate
    ? firstDate === lastDate
      ? fmtDate(firstDate)
      : `${fmtDate(firstDate)} – ${fmtDate(lastDate)}`
    : null;

  // จำนวนผู้ลงชื่อ
  const rosterCount = rosterQuery.data?.length ?? 0;

  return (
    <div className="max-w-6xl mx-auto space-y-0">
      {/* ── Hero Section ──────────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden mb-6">
        {/* Gradient background */}
        <div className="h-56 sm:h-72 bg-gradient-to-br from-cobalt via-cobalt/80 to-ink/90 relative">
          {/* Pattern overlay */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, white 1px, transparent 1px),
                radial-gradient(circle at 80% 20%, white 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />

          {/* Back button */}
          <Link
            to="/events"
            className="absolute top-4 left-4 flex items-center gap-1.5 text-white/80 hover:text-white text-sm transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            กลับ
          </Link>

          {/* Content overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 bg-gradient-to-t from-black/60 to-transparent">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {event.event_categories?.name && (
                <span className="text-xs font-medium bg-white/20 text-white rounded-full px-2.5 py-0.5 backdrop-blur-sm">
                  {event.event_categories.name}
                </span>
              )}
              <span className="text-xs text-white/70">ปีการศึกษา {event.academic_year}</span>
              <span className="text-xs font-medium bg-white/20 text-white rounded-full px-2.5 py-0.5 backdrop-blur-sm">
                {typeLabel}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white leading-snug">{event.title}</h1>
            {dateRange && (
              <p className="text-white/80 text-sm mt-1 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {dateRange}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-line px-4 py-3 text-center">
          <p className="text-2xl font-bold text-cobalt">{rosterCount}</p>
          <p className="text-xs text-ink/50 mt-0.5">ผู้ลงชื่อ</p>
        </div>
        <div className="bg-white rounded-2xl border border-line px-4 py-3 text-center">
          <p className="text-2xl font-bold text-ink">{event.event_levels.length}</p>
          <p className="text-xs text-ink/50 mt-0.5">ระดับที่เข้าร่วม</p>
        </div>
        {event.event_levels.map((l) => {
          const cRow = countsQuery.data?.find((c) => c.event_level_id === l.id);
          const filled = cRow?.registered ?? 0;
          const max = l.max_per_dept;
          return (
            <div key={l.id} className="bg-white rounded-2xl border border-line px-4 py-3 text-center">
              <p className="text-2xl font-bold text-ink">{filled}{max ? `/${max}` : ''}</p>
              <p className="text-xs text-ink/50 mt-0.5">โควตา {l.level}</p>
            </div>
          );
        })}
      </div>

      {/* ── Main layout: content + sidebar ───────────────────────────── */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">

        {/* ── Left: Tabs + content ──────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-line overflow-hidden">
          <TabBar active={activeTab} onChange={setActiveTab} />
          <div className="p-5">
            {activeTab === 'info' && <InfoTab event={event} />}
            {activeTab === 'participants' && <ParticipantsTab eventId={eventId} rosterQuery={rosterQuery} />}
          </div>
        </div>

        {/* ── Right: Registration card ──────────────────────────── */}
        <div className="space-y-4">
          <RegistrationCard
            event={event}
            effectiveLevel={effectiveLevel}
            status={status}
            canSubmit={canSubmit}
            canModify={canModify}
            isAdmin={isAdmin}
            profile={profile}
            myRegs={myRegs}
            fields={fields}
            onOpenCreate={openCreate}
            onOpenEdit={openEdit}
            onCancelRequest={setCancelling}
            adminLevelId={adminLevelId}
            setAdminLevelId={setAdminLevelId}
          />

          {/* ช่วงรับสมัคร (ต่อระดับ) */}
          {event.event_levels.length > 0 && (
            <div className="bg-white rounded-2xl border border-line p-4 space-y-3">
              <h3 className="text-sm font-semibold">ช่วงเปิดรับสมัคร</h3>
              {event.event_levels.map((l) => (
                <div key={l.id} className="space-y-1">
                  <LevelBadge level={l.level} />
                  <p className="text-xs text-ink/60">
                    {fmtDateTime(l.reg_open_at)} – {fmtDateTime(l.reg_close_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────────────── */}
      <Modal
        open={formOpen}
        onClose={() => !submitting && setFormOpen(false)}
        title={editing ? 'แก้ไขคำตอบ' : (isBooth ? 'ลงชื่อเปิดบูธ' : 'ลงชื่อเป็นตัวแทน')}
      >
        {fieldsQuery.isPending ? <LoadingState text="กำลังโหลดฟอร์ม..." /> : (
          <div className="space-y-4">
            {fields.length === 0 && (
              <p className="text-sm text-ink/50">กิจกรรมนี้ไม่มีช่องกรอกเพิ่มเติม กดยืนยันเพื่อลงชื่อได้เลย</p>
            )}
            <DynamicForm
              fields={fields}
              value={answers}
              onChange={setAnswers}
              errors={formErrors}
              disabled={submitting}
              userId={user?.id}
            />
            {formError && (
              <p role="alert" className="text-sm text-coral bg-coral/10 rounded-xl px-3 py-2">{formError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={submitting}>ยกเลิก</Button>
              <Button onClick={submitForm} loading={submitting}>
                {editing ? 'บันทึกการแก้ไข' : 'ยืนยันลงชื่อ'}
              </Button>
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
