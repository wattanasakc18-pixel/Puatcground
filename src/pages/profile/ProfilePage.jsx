import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, ImagePlus, History } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useMyRegistrations, useDepartments } from '../../hooks/useQueries.js';
import { updateProfile } from '../../api/profiles.js';
import { updatePassword } from '../../api/auth.js';
import { uploadAvatar } from '../../api/storage.js';
import { listFormFieldsForEvents } from '../../api/events.js';
import { cancelRegistration, updateAnswers } from '../../api/registrations.js';
import { fieldsForLevel, validateAnswers } from '../../lib/answers.js';
import { fullName, fmtDate, fmtDateTime } from '../../lib/format.js';
import { LEVELS, TITLES, MAX_AVATAR_SIZE, ROLE_LABELS } from '../../lib/constants.js';
import { toThaiError } from '../../lib/errors.js';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { Field, Input, Select } from '../../components/ui/Field.jsx';
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/States.jsx';
import { LevelBadge } from '../../components/Badges.jsx';
import DynamicForm from '../../components/DynamicForm.jsx';
import AnswersSummary from '../../components/AnswersSummary.jsx';
import Avatar from '../../components/Avatar.jsx';
import { useToast } from '../../components/ui/Toast.jsx';

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const departmentsQuery = useDepartments();
  const regsQuery = useMyRegistrations(false);

  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({});
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const [pw, setPw] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const [editing, setEditing] = useState(null);
  const [answers, setAnswers] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const regs = regsQuery.data ?? [];
  const eventIds = useMemo(() => [...new Set(regs.map((r) => r.event_levels?.event_id).filter(Boolean))], [regs]);
  const fieldsQuery = useQuery({
    queryKey: ['form-fields-multi', eventIds],
    queryFn: () => listFormFieldsForEvents(eventIds),
    enabled: eventIds.length > 0,
  });

  const isAdmin = profile?.role === 'admin';
  const canModify = (reg) => isAdmin || (reg.event_levels && new Date() <= new Date(reg.event_levels.reg_close_at));

  const openEdit = () => {
    setForm({
      title: profile.title, first_name: profile.first_name, last_name: profile.last_name,
      department_id: profile.department_id ?? '', level: profile.level ?? '',
      class_room: profile.class_room, email: profile.email, phone: profile.phone,
    });
    setAvatarFile(null);
    setAvatarPreview('');
    setSaveError('');
    setEditOpen(true);
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const pickAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > MAX_AVATAR_SIZE) {
      setSaveError('รูปต้องเป็นไฟล์รูปภาพและไม่เกิน 2 MB');
      return;
    }
    setSaveError('');
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const saveProfile = async () => {
    if (!form.first_name?.trim() || !form.last_name?.trim() || !form.class_room?.trim()) {
      setSaveError('กรุณากรอกชื่อ นามสกุล และชั้นปี/ห้องให้ครบ');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      let avatarUrl;
      if (avatarFile) avatarUrl = await uploadAvatar(user.id, avatarFile);
      await updateProfile(user.id, {
        title: form.title,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        department_id: form.department_id || null,
        level: form.level || null,
        class_room: form.class_room.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      });
      await refreshProfile();
      toast('บันทึกโปรไฟล์แล้ว');
      setEditOpen(false);
    } catch (err) {
      setSaveError(toThaiError(err));
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (pw.length < 8) { setPwError('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร'); return; }
    if (pw !== pwConfirm) { setPwError('รหัสผ่านไม่ตรงกัน'); return; }
    setPwSaving(true);
    setPwError('');
    try {
      await updatePassword(pw);
      toast('เปลี่ยนรหัสผ่านแล้ว');
      setPw('');
      setPwConfirm('');
    } catch (err) {
      setPwError(toThaiError(err));
    } finally {
      setPwSaving(false);
    }
  };

  const openEditReg = (reg) => {
    setAnswers({ ...reg.answers });
    setFormErrors({});
    setFormError('');
    setEditing(reg);
  };

  const submitAnswers = async () => {
    const fields = fieldsForLevel(fieldsQuery.data?.filter((f) => f.event_id === editing.event_levels.event_id), editing.event_levels.level);
    const errs = validateAnswers(fields, answers);
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSubmitting(true);
    setFormError('');
    try {
      await updateAnswers(editing.id, answers);
      toast('แก้ไขคำตอบแล้ว');
      queryClient.invalidateQueries({ queryKey: ['my-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['roster'] });
      queryClient.invalidateQueries({ queryKey: ['dept-counts'] });
      setEditing(null);
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
      queryClient.invalidateQueries({ queryKey: ['my-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['roster'] });
      queryClient.invalidateQueries({ queryKey: ['dept-counts'] });
      setCancelling(null);
    } catch (err) {
      toast(toThaiError(err), 'error');
    } finally {
      setCancelLoading(false);
    }
  };

  const levelChanged = form.level && form.level !== profile?.level;
  const deptChanged = form.department_id && form.department_id !== profile?.department_id;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* ── Hero Profile Card ── */}
      <section className="bg-gradient-to-br from-cobalt to-cobalt/80 rounded-2xl p-6 text-white">
        <div className="flex items-start gap-5">
          <div className="relative shrink-0">
            <Avatar url={profile?.avatar_url} name={fullName(profile)} size="w-20 h-20 text-2xl" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white/70 text-xs mb-0.5">รหัสนักศึกษา {profile?.student_code}</p>
            <p className="text-xl font-bold leading-snug">{fullName(profile)}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {profile?.role && (
                <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 ${
                  profile.role === 'admin'
                    ? 'bg-sun/80 text-white'
                    : profile.role === 'organizer'
                    ? 'bg-leaf/70 text-white'
                    : 'bg-white/20 text-white'
                }`}>
                  {ROLE_LABELS[profile.role] ?? profile.role}
                </span>
              )}
              {profile?.level && (
                <span className="bg-white/20 text-white text-xs font-medium rounded-full px-2.5 py-0.5">{profile.level}</span>
              )}
              {profile?.department_name && (
                <span className="bg-white/20 text-white text-xs font-medium rounded-full px-2.5 py-0.5">{profile.department_name}</span>
              )}
              {profile?.class_room && (
                <span className="bg-white/20 text-white text-xs font-medium rounded-full px-2.5 py-0.5">ห้อง {profile.class_room}</span>
              )}
            </div>
          </div>
          <Button variant="secondary" onClick={openEdit} className="shrink-0">
            <Pencil className="w-4 h-4" /> แก้ไข
          </Button>
        </div>

        {/* Info row */}
        <div className="grid sm:grid-cols-2 gap-2 mt-5 pt-5 border-t border-white/20 text-sm">
          <div className="flex items-center gap-2 text-white/80">
            <span className="text-white/50">อีเมล</span>
            <span className="font-medium truncate">{profile?.email || '-'}</span>
          </div>
          <div className="flex items-center gap-2 text-white/80">
            <span className="text-white/50">เบอร์โทร</span>
            <span className="font-medium">{profile?.phone || '-'}</span>
          </div>
        </div>
      </section>

      {/* ── Bottom two columns ── */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">

        {/* ── ประวัติการลงชื่อ ── */}
        <section className="bg-white rounded-2xl border border-line p-5" aria-label="ประวัติการลงชื่อ">
          <h2 className="font-semibold mb-4">ประวัติการลงชื่อ</h2>
          {regsQuery.isPending ? <LoadingState /> : regsQuery.isError ? (
            <ErrorState message={toThaiError(regsQuery.error)} onRetry={() => regsQuery.refetch()} />
          ) : regs.length === 0 ? (
            <EmptyState
              icon={History}
              title="ยังไม่มีประวัติการลงชื่อ"
              hint="ไปลงชื่อเป็นตัวแทนกิจกรรมได้ที่หน้ากิจกรรมและลงชื่อ"
              action={<Link to="/events"><Button variant="secondary">ดูกิจกรรม</Button></Link>}
            />
          ) : (
            <ul className="space-y-3">
              {regs.map((reg) => {
                const cancelled = Boolean(reg.cancelled_at);
                const el = reg.event_levels;
                const ev = el?.events;
                const fields = fieldsForLevel(fieldsQuery.data?.filter((f) => f.event_id === el?.event_id), el?.level);
                return (
                  <li key={reg.id} className={`border border-line rounded-xl p-4 ${cancelled ? 'opacity-50' : ''}`}>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <Link to={`/events/${ev?.id}`} className="font-medium text-cobalt hover:underline">{ev?.title}</Link>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-ink/60">
                          <LevelBadge level={el?.level} />
                          <span>จัด {fmtDate(el?.event_date)}</span>
                          <span>ลงชื่อ {fmtDateTime(reg.created_at)}</span>
                          {cancelled && <span className="rounded-full bg-ink/10 px-2.5 py-0.5 text-xs">ยกเลิกแล้ว</span>}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <AnswersSummary fields={fields} answers={reg.answers} />
                    </div>
                    {!cancelled && canModify(reg) && (
                      <div className="flex gap-2 mt-3">
                        <Button variant="secondary" onClick={() => openEditReg(reg)}><Pencil className="w-4 h-4" /> แก้ไข</Button>
                        <Button variant="danger" onClick={() => setCancelling(reg)}><Trash2 className="w-4 h-4" /> ยกเลิก</Button>
                      </div>
                    )}
                    {!cancelled && !canModify(reg) && (
                      <p className="text-sm text-ink/50 mt-2">ปิดรับสมัครแล้ว หากต้องการแก้ไข/ยกเลิก กรุณาติดต่อผู้จัดกิจกรรม</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ── Sidebar: เปลี่ยนรหัสผ่าน ── */}
        <section className="bg-white rounded-2xl border border-line p-5">
          <h2 className="font-semibold mb-4">เปลี่ยนรหัสผ่าน</h2>
          <div className="space-y-3">
            <Field label="รหัสผ่านใหม่" required error={pwError}>
              <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
            </Field>
            <Field label="ยืนยันรหัสผ่านใหม่" required>
              <Input type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} autoComplete="new-password" />
            </Field>
            <Button onClick={savePassword} loading={pwSaving} className="w-full">เปลี่ยนรหัสผ่าน</Button>
          </div>
        </section>

      </div>

      <Modal open={editOpen} onClose={() => !saving && setEditOpen(false)} title="แก้ไขโปรไฟล์">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="relative w-16 h-16 rounded-2xl bg-bg border border-dashed border-line flex items-center justify-center overflow-hidden cursor-pointer shrink-0">
              {avatarPreview || profile?.avatar_url
                ? <img src={avatarPreview || profile.avatar_url} alt="รูปโปรไฟล์" className="w-full h-full object-cover" />
                : <ImagePlus className="w-6 h-6 text-ink/40" />}
              <input type="file" accept="image/*" onChange={pickAvatar} className="absolute inset-0 opacity-0 cursor-pointer" aria-label="เปลี่ยนรูปโปรไฟล์" />
            </label>
            <p className="text-sm text-ink/60">รูปโปรไฟล์ ไม่เกิน 2 MB<br />รหัสนักศึกษาเปลี่ยนไม่ได้</p>
          </div>
          {(levelChanged || deptChanged) && (
            <p className="text-sm bg-sun/5 border border-sun/20 rounded-xl px-3 py-2">
              การเปลี่ยนระดับชั้น/แผนกมีผลต่อสิทธิ์และโควตาการลงชื่อในกิจกรรมต่างๆ
            </p>
          )}
          <div className="grid grid-cols-3 gap-3">
            <Field label="คำนำหน้า">
              <Select value={form.title ?? ''} onChange={set('title')}>
                <option value="">เลือก</option>
                {TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="ชื่อ" required>
              <Input value={form.first_name ?? ''} onChange={set('first_name')} />
            </Field>
            <Field label="นามสกุล" required>
              <Input value={form.last_name ?? ''} onChange={set('last_name')} />
            </Field>
          </div>
          <Field label="แผนกวิชา">
            <Select value={form.department_id ?? ''} onChange={set('department_id')}>
              <option value="">เลือกแผนกวิชา</option>
              {(departmentsQuery.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="ระดับชั้น">
            <div className="grid grid-cols-2 gap-2">
              {LEVELS.map((lv) => (
                <button
                  key={lv}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, level: lv }))}
                  aria-pressed={form.level === lv}
                  className={`min-h-11 rounded-xl border font-medium ${form.level === lv ? 'bg-cobalt text-white border-cobalt' : 'bg-white border-line'}`}
                >
                  {lv}
                </button>
              ))}
            </div>
          </Field>
          <Field label="ชั้นปี/ห้อง" required>
            <Input value={form.class_room ?? ''} onChange={set('class_room')} maxLength={10} placeholder="เช่น 2/1" />
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="อีเมลติดต่อ">
              <Input type="email" value={form.email ?? ''} onChange={set('email')} />
            </Field>
            <Field label="เบอร์โทร">
              <Input type="tel" value={form.phone ?? ''} onChange={set('phone')} />
            </Field>
          </div>
          {saveError && <p role="alert" className="text-sm text-coral bg-coral/10 rounded-xl px-3 py-2">{saveError}</p>}
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setEditOpen(false)} disabled={saving}>ยกเลิก</Button>
            <Button onClick={saveProfile} loading={saving}>บันทึก</Button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(editing)} onClose={() => !submitting && setEditing(null)} title="แก้ไขคำตอบ">
        {editing && (
          <div className="space-y-4">
            <DynamicForm
              fields={fieldsForLevel(fieldsQuery.data?.filter((f) => f.event_id === editing.event_levels.event_id), editing.event_levels.level)}
              value={answers}
              onChange={setAnswers}
              errors={formErrors}
              disabled={submitting}
              userId={user?.id}
            />
            {formError && <p role="alert" className="text-sm text-coral bg-coral/10 rounded-xl px-3 py-2">{formError}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setEditing(null)} disabled={submitting}>ยกเลิก</Button>
              <Button onClick={submitAnswers} loading={submitting}>บันทึกการแก้ไข</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(cancelling)}
        title="ยกเลิกการลงชื่อ"
        message={`ต้องการยกเลิกการลงชื่อ "${cancelling?.event_levels?.events?.title ?? ''}" ใช่หรือไม่?`}
        confirmLabel="ยืนยันยกเลิก"
        danger
        loading={cancelLoading}
        onConfirm={confirmCancel}
        onCancel={() => setCancelling(null)}
      />
    </div>
  );
}