import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Copy } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useEvent, useCategories, useEventCounts } from '../../hooks/useQueries.js';
import {
  createEvent, updateEvent, createEventLevel, updateEventLevel, deleteEventLevel,
} from '../../api/events.js';
import { LEVELS, REGISTRATION_TYPES } from '../../lib/constants.js';
import { toDatetimeLocal, localToTimestamptz, todayStr } from '../../lib/format.js';
import { toThaiError } from '../../lib/errors.js';
import { useToast } from '../../components/ui/Toast.jsx';
import Button from '../../components/ui/Button.jsx';
import { Field, Input, Select, Textarea } from '../../components/ui/Field.jsx';
import { LoadingState, ErrorState } from '../../components/ui/States.jsx';
import { ApprovalBadge } from '../../components/Badges.jsx';
import FormBuilder from './FormBuilder.jsx';

const TABS = [
  { value: 'general', label: 'ข้อมูลทั่วไป' },
  { value: 'levels', label: 'ระดับที่เข้าร่วม' },
  { value: 'form', label: 'ฟอร์มลงชื่อ' },
];

function GeneralTab({ event, onCreated }) {
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const categories = useCategories();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => ({
    title: event?.title ?? '',
    description: event?.description ?? '',
    category_id: event?.category_id ?? '',
    academic_year: event?.academic_year ?? String(Number(todayStr().slice(0, 4)) + 543),
    registration_type: event?.registration_type ?? 'individual',
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.title.trim()) errs.title = 'กรอกชื่อกิจกรรม';
    if (!/^\d{4}$/.test(form.academic_year)) errs.academic_year = 'ปีการศึกษาต้องเป็นตัวเลข 4 หลัก เช่น 2569';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSaving(true);
    try {
      const payload = { ...form, title: form.title.trim(), category_id: form.category_id || null };
      if (event) {
        await updateEvent(event.id, payload);
        queryClient.invalidateQueries({ queryKey: ['event', event.id] });
        queryClient.invalidateQueries({ queryKey: ['events'] });
        toast('บันทึกข้อมูลทั่วไปแล้ว');
      } else {
        const created = await createEvent({ ...payload, created_by: user.id, approval_status: isAdmin ? 'approved' : 'pending' });
        queryClient.invalidateQueries({ queryKey: ['events'] });
        toast(isAdmin ? 'สร้างกิจกรรมแล้ว ต่อไปตั้งระดับที่เข้าร่วม' : 'สร้างกิจกรรมแล้ว (รออนุมัติ) ต่อไปตั้งระดับที่เข้าร่วม');
        onCreated(created.id);
      }
    } catch (err) {
      toast(toThaiError(err, 'บันทึกไม่สำเร็จ'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="bg-white rounded-2xl border border-line p-4 sm:p-5 space-y-4 max-w-2xl mx-auto">
      <Field label="ชื่อกิจกรรม" required error={errors.title} htmlFor="g-title">
        <Input id="g-title" value={form.title} onChange={set('title')} placeholder="เช่น วันไหว้ครู" />
      </Field>
      <Field label="รายละเอียด" htmlFor="g-desc">
        <Textarea id="g-desc" value={form.description} onChange={set('description')} placeholder="อธิบายกิจกรรม สถานที่ เครื่องแต่งกาย ฯลฯ" />
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="หมวดกิจกรรม" htmlFor="g-cat">
          <Select id="g-cat" value={form.category_id} onChange={set('category_id')}>
            <option value="">ไม่ระบุหมวด</option>
            {(categories.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="ปีการศึกษา" required error={errors.academic_year} htmlFor="g-year">
          <Input id="g-year" value={form.academic_year} onChange={set('academic_year')} inputMode="numeric" placeholder="เช่น 2569" />
        </Field>
      </div>
      <Field label="ประเภทการลงชื่อ" required>
        <div className="grid grid-cols-2 gap-2">
          {REGISTRATION_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setForm((f) => ({ ...f, registration_type: t.value }))}
              aria-pressed={form.registration_type === t.value}
              className={`min-h-11 rounded-xl border px-3 text-sm font-medium ${form.registration_type === t.value ? 'border-cobalt bg-cobalt/10 text-cobalt' : 'border-line bg-white text-ink/70'}`}
            >
              {t.label}{t.value === 'booth' ? ' (ลงได้หลายบูธ)' : ' (ลงได้ครั้งเดียว)'}
            </button>
          ))}
        </div>
      </Field>
      <div className="flex justify-end">
        <Button type="submit" loading={saving}>{event ? 'บันทึก' : 'สร้างกิจกรรม'}</Button>
      </div>
    </form>
  );
}

function emptyRow(level) {
  return {
    level, enabled: false, id: null,
    event_date: '', reg_open_at: '', reg_close_at: '', min_per_dept: '', max_per_dept: '',
  };
}

function rowFromLevel(l) {
  return {
    level: l.level, enabled: true, id: l.id,
    event_date: l.event_date ?? '',
    reg_open_at: toDatetimeLocal(l.reg_open_at),
    reg_close_at: toDatetimeLocal(l.reg_close_at),
    min_per_dept: l.min_per_dept ?? '',
    max_per_dept: l.max_per_dept ?? '',
  };
}

function LevelsTab({ event }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState(() => LEVELS.map((level) => {
    const existing = event.event_levels.find((l) => l.level === level);
    return existing ? rowFromLevel(existing) : emptyRow(level);
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const setRow = (level, patch) =>
    setRows((rs) => rs.map((r) => (r.level === level ? { ...r, ...patch } : r)));

  const copyFromOther = (level) => {
    const other = rows.find((r) => r.level !== level);
    if (!other?.enabled) { toast('อีกระดับยังไม่ได้เปิดใช้ ไม่มีค่าให้คัดลอก', 'error'); return; }
    setRow(level, {
      event_date: other.event_date,
      reg_open_at: other.reg_open_at,
      reg_close_at: other.reg_close_at,
      min_per_dept: other.min_per_dept,
      max_per_dept: other.max_per_dept,
    });
  };

  const validate = () => {
    const errs = {};
    const enabled = rows.filter((r) => r.enabled);
    if (enabled.length === 0) errs._ = 'เลือกอย่างน้อย 1 ระดับที่เข้าร่วม';
    for (const r of enabled) {
      const e = {};
      if (!r.event_date) e.event_date = 'กรอกวันจัดกิจกรรม';
      if (!r.reg_open_at) e.reg_open_at = 'กรอกเวลาเปิดรับสมัคร';
      if (!r.reg_close_at) e.reg_close_at = 'กรอกเวลาปิดรับสมัคร';
      if (r.reg_open_at && r.reg_close_at && r.reg_close_at <= r.reg_open_at) e.reg_close_at = 'เวลาปิดต้องหลังเวลาเปิด';
      const min = r.min_per_dept === '' ? null : Number(r.min_per_dept);
      const max = r.max_per_dept === '' ? null : Number(r.max_per_dept);
      if (min != null && (!Number.isInteger(min) || min < 0)) e.min_per_dept = 'ขั้นต่ำต้องเป็นจำนวนเต็ม 0 ขึ้นไป';
      if (max != null && (!Number.isInteger(max) || max < 1)) e.max_per_dept = 'สูงสุดต้องเป็นจำนวนเต็ม 1 ขึ้นไป';
      if (min != null && max != null && min > max) e.max_per_dept = 'สูงสุดต้องไม่น้อยกว่าขั้นต่ำ';
      if (Object.keys(e).length > 0) errs[r.level] = e;
    }
    return errs;
  };

  const save = async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSaving(true);
    try {
      for (const r of rows) {
        if (r.enabled) {
          const payload = {
            event_id: event.id,
            level: r.level,
            event_date: r.event_date,
            reg_open_at: localToTimestamptz(r.reg_open_at),
            reg_close_at: localToTimestamptz(r.reg_close_at),
            min_per_dept: r.min_per_dept === '' ? null : Number(r.min_per_dept),
            max_per_dept: r.max_per_dept === '' ? null : Number(r.max_per_dept),
          };
          if (r.id) await updateEventLevel(r.id, payload);
          else await createEventLevel(payload);
        } else if (r.id) {
          try {
            await deleteEventLevel(r.id);
          } catch (err) {
            if (err.code === '23503') throw new Error(`ปิดระดับ ${r.level} ไม่ได้ เนื่องจากมีผู้ลงชื่อแล้ว`);
            throw err;
          }
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['event', event.id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event-counts', event.id] });
      toast('บันทึกระดับที่เข้าร่วมแล้ว');
    } catch (err) {
      toast(toThaiError(err, 'บันทึกไม่สำเร็จ'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <p className="text-sm text-ink/60">
        ทำรวม = เปิดทั้งสองระดับและตั้งวันเดียวกัน · ทำแยก = ตั้งคนละวัน/โควตา · ระดับเดียว = เปิดแค่ระดับเดียว
      </p>
      {errors._ && <p className="text-coral text-sm">{errors._}</p>}
      {rows.map((r) => {
        const e = errors[r.level] ?? {};
        return (
          <div key={r.level} className={`bg-white rounded-2xl border p-4 sm:p-5 ${r.enabled ? 'border-cobalt/40' : 'border-line opacity-70'}`}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <label className="flex items-center gap-3 cursor-pointer min-h-11">
                <input
                  type="checkbox"
                  checked={r.enabled}
                  onChange={(ev) => setRow(r.level, { enabled: ev.target.checked })}
                  className="w-5 h-5 accent-cobalt"
                />
                <span className="font-semibold">{r.level} เข้าร่วมกิจกรรมนี้</span>
              </label>
              {r.enabled && (
                <Button variant="ghost" onClick={() => copyFromOther(r.level)} className="text-sm">
                  <Copy className="w-4 h-4" /> คัดลอกค่าจากอีกระดับ
                </Button>
              )}
            </div>
            {r.enabled && (
              <div className="grid sm:grid-cols-2 gap-4 mt-3">
                <Field label="วันจัดกิจกรรม" required error={e.event_date} htmlFor={`date-${r.level}`}>
                  <Input id={`date-${r.level}`} type="date" value={r.event_date} onChange={(ev) => setRow(r.level, { event_date: ev.target.value })} />
                </Field>
                <div className="hidden sm:block" />
                <Field label="เปิดรับสมัคร" required error={e.reg_open_at} htmlFor={`open-${r.level}`}>
                  <Input id={`open-${r.level}`} type="datetime-local" value={r.reg_open_at} onChange={(ev) => setRow(r.level, { reg_open_at: ev.target.value })} />
                </Field>
                <Field label="ปิดรับสมัคร" required error={e.reg_close_at} htmlFor={`close-${r.level}`}>
                  <Input id={`close-${r.level}`} type="datetime-local" value={r.reg_close_at} onChange={(ev) => setRow(r.level, { reg_close_at: ev.target.value })} />
                </Field>
                <Field label="ขั้นต่ำต่อแผนก (เว้นว่าง = ไม่กำหนด)" error={e.min_per_dept} htmlFor={`min-${r.level}`}>
                  <Input id={`min-${r.level}`} type="number" min="0" value={r.min_per_dept} onChange={(ev) => setRow(r.level, { min_per_dept: ev.target.value })} />
                </Field>
                <Field label="สูงสุดต่อแผนก (เว้นว่าง = ไม่จำกัด)" error={e.max_per_dept} htmlFor={`max-${r.level}`}>
                  <Input id={`max-${r.level}`} type="number" min="1" value={r.max_per_dept} onChange={(ev) => setRow(r.level, { max_per_dept: ev.target.value })} />
                </Field>
              </div>
            )}
          </div>
        );
      })}
      <div className="flex justify-end">
        <Button onClick={save} loading={saving}>บันทึกระดับ</Button>
      </div>
    </div>
  );
}

export default function EventEditorPage() {
  const { id } = useParams();
  const isNew = !id;
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') ?? 'general';
  const eventQuery = useEvent(id);
  const counts = useEventCounts(id);
  const event = eventQuery.data;
  const hasRegistrations = (counts.data ?? []).some((c) => c.registered > 0);
  const locked = !isNew && event && !isAdmin && !(event.created_by === user?.id && event.approval_status === 'pending');

  useEffect(() => {
    if (isNew && tab !== 'general') setSearchParams({}, { replace: true });
  }, [isNew, tab, setSearchParams]);

  const visibleTabs = isNew ? TABS.slice(0, 1) : TABS;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/admin/events" aria-label="กลับไปรายการกิจกรรม" className="p-2 rounded-lg hover:bg-line/60">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">{isNew ? 'สร้างกิจกรรมใหม่' : `แก้ไข: ${event?.title ?? ''}`}</h1>
        {!isNew && event && <ApprovalBadge status={event.approval_status} />}
      </div>

      {locked && (
        <div className="bg-sun/20 border border-sun/40 rounded-2xl p-4 text-sm text-ink/70">
          กิจกรรมนี้ได้รับอนุมัติแล้ว จึงแก้ไขไม่ได้ กรุณาติดต่อผู้ดูแลระบบหากต้องการเปลี่ยนแปลง
        </div>
      )}

      {!isNew && eventQuery.isLoading ? <LoadingState /> : null}
      {!isNew && eventQuery.isError ? (
        <ErrorState message={toThaiError(eventQuery.error)} onRetry={eventQuery.refetch} />
      ) : null}

      {(isNew || event) && !locked && (
        <>
          <div className="flex gap-1 bg-white border border-line rounded-2xl p-1 overflow-x-auto" role="tablist">
            {visibleTabs.map((t) => (
              <button
                key={t.value}
                role="tab"
                aria-selected={tab === t.value}
                onClick={() => setSearchParams({ tab: t.value })}
                className={`min-h-11 px-4 rounded-xl text-sm font-medium whitespace-nowrap ${tab === t.value ? 'bg-cobalt text-white' : 'text-ink/70 hover:bg-bg'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'general' && (
            <GeneralTab
              key={event?.id ?? 'new'}
              event={event}
              onCreated={(newId) => navigate(`/admin/events/${newId}/edit?tab=levels`, { replace: true })}
            />
          )}
          {tab === 'levels' && event && <LevelsTab key={event.id} event={event} />}
          {tab === 'form' && event && (
            <FormBuilder event={event} hasRegistrations={hasRegistrations} />
          )}
        </>
      )}
    </div>
  );
}