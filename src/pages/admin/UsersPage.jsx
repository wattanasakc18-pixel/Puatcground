import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Search, Users, CalendarCheck, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useUsers, useDepartments, useEvents, useOrganizerLevels } from '../../hooks/useQueries.js';
import { setUserRole } from '../../api/profiles.js';
import { addOrganizer, removeOrganizer } from '../../api/events.js';
import { LEVELS, ROLE_LABELS } from '../../lib/constants.js';
import { fullName } from '../../lib/format.js';
import { toThaiError } from '../../lib/errors.js';
import { useToast } from '../../components/ui/Toast.jsx';
import Button from '../../components/ui/Button.jsx';
import { Field, Input, Select } from '../../components/ui/Field.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import Avatar from '../../components/Avatar.jsx';
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/States.jsx';

function OrganizerModal({ target, onClose }) {
  const events = useEvents({ approvedOnly: false });
  const assigned = useOrganizerLevels(target?.id);
  const toast = useToast();
  const queryClient = useQueryClient();
  const [eventId, setEventId] = useState('');
  const [selected, setSelected] = useState([]);
  const [original, setOriginal] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (target && assigned.data) {
      setSelected(assigned.data);
      setOriginal(assigned.data);
    }
  }, [target, assigned.data]);

  const event = (events.data ?? []).find((e) => e.id === eventId);

  const toggle = (levelId) =>
    setSelected((s) => (s.includes(levelId) ? s.filter((x) => x !== levelId) : [...s, levelId]));

  const save = async () => {
    setSaving(true);
    try {
      const adds = selected.filter((id) => !original.includes(id));
      const removes = original.filter((id) => !selected.includes(id));
      for (const id of adds) await addOrganizer(id, target.id);
      for (const id of removes) await removeOrganizer(id, target.id);
      queryClient.invalidateQueries({ queryKey: ['organizer-levels', target.id] });
      toast('บันทึกผู้จัดกิจกรรมแล้ว');
      onClose();
    } catch (err) {
      toast(toThaiError(err, 'บันทึกไม่สำเร็จ'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={Boolean(target)} onClose={saving ? undefined : onClose} title={`ผู้จัดกิจกรรม: ${fullName(target)}`} wide>
      <p className="text-sm text-ink/60 mb-3">
        เลือกระดับกิจกรรมที่ให้ผู้ใช้นี้ดูแล (ดูรายงานและส่งออก CSV ได้) การกำหนดนี้ไม่เปลี่ยนบทบาท — ตั้งบทบาทเป็น "ผู้จัดกิจกรรม" ด้วยถ้าต้องการให้ผู้ใช้นี้สร้างกิจกรรมเองได้
      </p>
      {events.isLoading || assigned.isLoading ? <LoadingState /> : events.isError ? (
        <ErrorState message={toThaiError(events.error)} onRetry={events.refetch} />
      ) : (events.data ?? []).length === 0 ? (
        <EmptyState icon={CalendarCheck} title="ยังไม่มีกิจกรรม" hint="สร้างกิจกรรมก่อนจึงจะกำหนดผู้ดูแลได้" />
      ) : (
        <div className="space-y-4">
          <Field label="เลือกกิจกรรม" htmlFor="org-event">
            <Select id="org-event" value={eventId} onChange={(e) => setEventId(e.target.value)}>
              <option value="">— เลือกกิจกรรม —</option>
              {events.data.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title} (ปี {ev.academic_year})</option>
              ))}
            </Select>
          </Field>
          {event && (
            event.event_levels.length === 0 ? (
              <p className="text-sm text-coral">กิจกรรมนี้ยังไม่ได้ตั้งระดับที่เข้าร่วม ไปตั้งในหน้าแก้ไขกิจกรรมก่อน</p>
            ) : (
              <div className="space-y-2">
                {event.event_levels.map((l) => (
                  <label key={l.id} className="flex items-center gap-3 min-h-11 bg-bg rounded-xl px-3 cursor-pointer">
                    <input type="checkbox" checked={selected.includes(l.id)} onChange={() => toggle(l.id)} className="w-5 h-5 accent-cobalt" />
                    <span className="text-sm">ระดับ {l.level}</span>
                  </label>
                ))}
              </div>
            )
          )}
          {original.length > 0 && (
            <p className="text-xs text-ink/50">ดูแลอยู่ทั้งหมด {selected.length} ระดับกิจกรรม (รวมทุกกิจกรรม)</p>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={onClose} disabled={saving}>ปิด</Button>
            <Button onClick={save} loading={saving}>บันทึก</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function UsersPage() {
  const { user, refreshProfile } = useAuth();
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [level, setLevel] = useState('');
  const [role, setRole] = useState('');
  const users = useUsers({ search, departmentId, level, role });
  const departments = useDepartments();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [roleChange, setRoleChange] = useState(null);
  const [orgTarget, setOrgTarget] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetting, setResetting] = useState(false);
  const [busy, setBusy] = useState(false);

  const requestRoleChange = (target, newRole) => {
    if (target.role === newRole) return;
    if (target.id === user.id && newRole !== 'admin') {
      toast('ไม่สามารถลดสิทธิ์ตัวเองได้ ให้ผู้ดูแลระบบคนอื่นเป็นคนเปลี่ยน', 'error');
      return;
    }
    setRoleChange({ target, newRole });
  };

  const confirmRoleChange = async () => {
    setBusy(true);
    try {
      await setUserRole(roleChange.target.id, roleChange.newRole);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (roleChange.target.id === user.id) await refreshProfile();
      toast(`เปลี่ยนบทบาทเป็น "${ROLE_LABELS[roleChange.newRole]}" แล้ว`);
      setRoleChange(null);
    } catch (err) {
      toast(toThaiError(err, 'เปลี่ยนบทบาทไม่สำเร็จ'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const openReset = (u) => {
    setResetTarget(u);
    setNewPassword('');
    setResetError('');
  };

  const confirmReset = async () => {
    if (newPassword.length < 8) { setResetError('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร'); return; }
    setResetting(true);
    setResetError('');
    try {
      await resetUserPassword(resetTarget.id, newPassword);
      toast(`รีเซ็ตรหัสผ่านของ ${fullName(resetTarget)} แล้ว`);
      setResetTarget(null);
    } catch (err) {
      setResetError(toThaiError(err, 'รีเซ็ตรหัสผ่านไม่สำเร็จ'));
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">ผู้ใช้</h1>

      <div className="bg-white rounded-2xl border border-line p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="ค้นหา (รหัส/ชื่อ)" htmlFor="u-search">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" aria-hidden />
            <Input id="u-search" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="รหัสนักศึกษา หรือชื่อ" />
          </div>
        </Field>
        <Field label="แผนกวิชา" htmlFor="u-dept">
          <Select id="u-dept" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">ทุกแผนก</option>
            {(departments.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>
        <Field label="ระดับชั้น" htmlFor="u-level">
          <Select id="u-level" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">ทุกระดับ</option>
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </Select>
        </Field>
        <Field label="บทบาท" htmlFor="u-role">
          <Select id="u-role" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">ทุกบทบาท</option>
            {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </Field>
      </div>

      {users.isLoading ? <LoadingState /> : users.isError ? (
        <ErrorState message={toThaiError(users.error)} onRetry={users.refetch} />
      ) : users.data.length === 0 ? (
        <EmptyState icon={Users} title="ไม่พบผู้ใช้" hint="ลองเปลี่ยนคำค้นหาหรือตัวกรอง หรือนักศึกษายังไม่ได้สมัครสมาชิก" />
      ) : (
        <div className="space-y-2">
          {users.data.map((u) => (
            <div key={u.id} className="bg-white rounded-2xl border border-line p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar url={u.avatar_url} name={fullName(u)} />
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {fullName(u)} {u.id === user.id && <span className="text-xs text-cobalt">(คุณ)</span>}
                  </p>
                  <p className="text-xs text-ink/60 truncate">
                    {u.student_code} · {u.department_name || 'ไม่ระบุแผนก'} · {u.level} ห้อง {u.class_room}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Select
                  value={u.role}
                  onChange={(e) => requestRoleChange(u, e.target.value)}
                  aria-label={`บทบาทของ ${fullName(u)}`}
                  className="min-h-11 text-sm w-36"
                >
                  {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </Select>
                <Button variant="secondary" onClick={() => setOrgTarget(u)} className="text-sm">
                  <CalendarCheck className="w-4 h-4" /> ดูแลกิจกรรม
                </Button>
                <Button variant="secondary" onClick={() => openReset(u)} className="text-sm">
                  <KeyRound className="w-4 h-4" /> รีเซ็ตรหัส
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(roleChange)}
        title="เปลี่ยนบทบาท"
        message={`เปลี่ยนบทบาทของ "${fullName(roleChange?.target)}" จาก "${ROLE_LABELS[roleChange?.target?.role]}" เป็น "${ROLE_LABELS[roleChange?.newRole]}" ใช่หรือไม่?`}
        confirmLabel="เปลี่ยนบทบาท"
        loading={busy}
        onConfirm={confirmRoleChange}
        onCancel={() => setRoleChange(null)}
      />

      {orgTarget && <OrganizerModal target={orgTarget} onClose={() => setOrgTarget(null)} />}

      {/* Modal รีเซ็ตรหัสผ่าน */}
      <Modal open={Boolean(resetTarget)} onClose={() => !resetting && setResetTarget(null)} title={`รีเซ็ตรหัสผ่าน: ${fullName(resetTarget)}`}>
        <div className="space-y-4">
          <p className="text-sm text-ink/60">
            กำหนดรหัสผ่านใหม่ให้ <span className="font-medium text-ink">{fullName(resetTarget)}</span> (รหัสนักศึกษา {resetTarget?.student_code})
          </p>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              รหัสผ่านใหม่ <span className="text-coral">*</span>
            </label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="อย่างน้อย 8 ตัวอักษร"
              autoComplete="new-password"
              disabled={resetting}
            />
          </div>
          {resetError && (
            <p role="alert" className="text-sm text-coral bg-coral/10 rounded-xl px-3 py-2">{resetError}</p>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setResetTarget(null)} disabled={resetting}>ยกเลิก</Button>
            <Button onClick={confirmReset} loading={resetting}>
              <KeyRound className="w-4 h-4" /> ยืนยันรีเซ็ต
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}