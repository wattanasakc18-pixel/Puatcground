import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, RotateCcw, ClipboardList } from 'lucide-react';
import { useFormFields } from '../../hooks/useQueries.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { createFormField, updateFormField, softDeleteFormField } from '../../api/events.js';
import { FIELD_TYPES, LEVELS } from '../../lib/constants.js';
import { fieldsForLevel } from '../../lib/answers.js';
import { toThaiError } from '../../lib/errors.js';
import { useToast } from '../../components/ui/Toast.jsx';
import Button from '../../components/ui/Button.jsx';
import { Field, Input, Select } from '../../components/ui/Field.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/States.jsx';
import DynamicForm from '../../components/DynamicForm.jsx';

const TYPE_LABELS = Object.fromEntries(FIELD_TYPES.map((t) => [t.value, t.label]));
const NEEDS_OPTIONS = ['select', 'multiselect'];

function emptyForm(event) {
  return {
    label: '', field_type: 'text', required: false,
    applies_to_level: '', options: [''],
    sort_order: 0,
  };
}

export default function FormBuilder({ event, hasRegistrations }) {
  const fieldsQuery = useFormFields(event.id, { includeInactive: true });
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null); // null = ปิด modal, {} = เพิ่มใหม่, field = แก้ไข
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [pendingSave, setPendingSave] = useState(null);
  const [busy, setBusy] = useState(false);
  const [previewLevel, setPreviewLevel] = useState(event.event_levels[0]?.level ?? LEVELS[0]);
  const [previewValues, setPreviewValues] = useState({});

  const fields = fieldsQuery.data ?? [];
  const active = useMemo(
    () => fields.filter((f) => f.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [fields],
  );
  const inactive = fields.filter((f) => !f.is_active);
  const eventLevels = event.event_levels.map((l) => l.level);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['form-fields', event.id] });
    queryClient.invalidateQueries({ queryKey: ['event', event.id] });
  };

  const openAdd = () => {
    setForm({ ...emptyForm(event), sort_order: active.length });
    setEditing({});
    setFormError('');
  };

  const openEdit = (field) => {
    setForm({
      label: field.label,
      field_type: field.field_type,
      required: field.required,
      applies_to_level: field.applies_to_level ?? '',
      options: field.options?.length ? [...field.options] : [''],
    });
    setEditing(field);
    setFormError('');
  };

  const buildPayload = () => {
    if (!form.label.trim()) { setFormError('กรอกชื่อช่อง (label)'); return null; }
    const options = form.options.map((o) => o.trim()).filter(Boolean);
    if (NEEDS_OPTIONS.includes(form.field_type) && options.length === 0) {
      setFormError('ช่องแบบเลือกต้องอย่างน้อย 1 ตัวเลือก'); return null;
    }
    return {
      event_id: event.id,
      label: form.label.trim(),
      field_type: form.field_type,
      required: form.required,
      applies_to_level: form.applies_to_level || null,
      options: NEEDS_OPTIONS.includes(form.field_type) ? options : [],
      sort_order: editing.id ? editing.sort_order : active.length,
      is_active: true,
    };
  };

  const persist = async (payload) => {
    setSaving(true);
    try {
      if (editing.id) await updateFormField(editing.id, payload);
      else await createFormField(payload);
      invalidate();
      toast(editing.id ? 'แก้ไขช่องแล้ว' : 'เพิ่มช่องแล้ว');
      setEditing(null);
      setPendingSave(null);
    } catch (err) {
      toast(toThaiError(err, 'บันทึกไม่สำเร็จ'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    const payload = buildPayload();
    if (!payload) return;
    // เปลี่ยนชนิดช่องหลังมีคำตอบแล้วอาจทำข้อมูลเก่าเพี้ยน จึงเตือนก่อน
    if (editing.id && editing.field_type !== payload.field_type && hasRegistrations) {
      setPendingSave(payload);
      return;
    }
    await persist(payload);
  };

  const move = async (index, dir) => {
    const next = [...active];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setBusy(true);
    try {
      await Promise.all(next.map((f, i) => (
        f.sort_order === i ? Promise.resolve() : updateFormField(f.id, { sort_order: i })
      )));
      invalidate();
    } catch (err) {
      toast(toThaiError(err, 'เรียงลำดับไม่สำเร็จ'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      await softDeleteFormField(deleteTarget.id);
      invalidate();
      toast('ลบช่องแล้ว (คำตอบเก่ายังถูกเก็บไว้)');
      setDeleteTarget(null);
    } catch (err) {
      toast(toThaiError(err, 'ลบไม่สำเร็จ'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const restore = async (field) => {
    setBusy(true);
    try {
      await updateFormField(field.id, { is_active: true });
      invalidate();
      toast('เปิดใช้ช่องอีกครั้งแล้ว');
    } catch (err) {
      toast(toThaiError(err, 'เปิดใช้ไม่สำเร็จ'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="grid lg:grid-cols-2 gap-4 items-start">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">ช่องในฟอร์มลงชื่อ</h2>
          <Button onClick={openAdd}><Plus className="w-4 h-4" /> เพิ่มช่อง</Button>
        </div>
        {hasRegistrations && (
          <p className="text-sm bg-sun/20 border border-sun rounded-xl px-3 py-2">
            กิจกรรมนี้มีผู้ลงชื่อแล้ว การเปลี่ยนชนิดช่องหรือลบช่องจะเตือนก่อนเสมอ
          </p>
        )}

        {fieldsQuery.isLoading ? <LoadingState /> : fieldsQuery.isError ? (
          <ErrorState message={toThaiError(fieldsQuery.error)} onRetry={fieldsQuery.refetch} />
        ) : active.length === 0 && inactive.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="ยังไม่มีช่องในฟอร์ม"
            hint="กด เพิ่มช่อง เพื่อสร้างคำถาม เช่น ชื่อบูธ สินค้าที่ขาย เบอร์ติดต่อ ผู้ลงชื่อจะเห็นฟอร์มนี้ตอนลงชื่อ"
          />
        ) : (
          <div className="space-y-2">
            {active.map((f, i) => (
              <div key={f.id} className="bg-white rounded-2xl border border-line p-3 flex items-center gap-2">
                <div className="flex flex-col">
                  <button onClick={() => move(i, -1)} disabled={i === 0 || busy} aria-label="เลื่อนขึ้น" className="p-1.5 rounded hover:bg-line/60 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                  <button onClick={() => move(i, 1)} disabled={i === active.length - 1 || busy} aria-label="เลื่อนลง" className="p-1.5 rounded hover:bg-line/60 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{f.label} {f.required && <span className="text-coral">*</span>}</p>
                  <p className="text-xs text-ink/60">
                    {TYPE_LABELS[f.field_type]} · {f.applies_to_level ? `เฉพาะ ${f.applies_to_level}` : 'ทุกระดับ'}
                  </p>
                </div>
                <button onClick={() => openEdit(f)} aria-label={`แก้ไข ${f.label}`} className="p-2 rounded-lg hover:bg-line/60"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => setDeleteTarget(f)} aria-label={`ลบ ${f.label}`} className="p-2 rounded-lg hover:bg-coral/10 text-coral"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            {inactive.map((f) => (
              <div key={f.id} className="bg-white rounded-2xl border border-line p-3 flex items-center gap-2 opacity-50">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{f.label} <span className="text-xs text-coral">(ลบแล้ว)</span></p>
                  <p className="text-xs text-ink/60">{TYPE_LABELS[f.field_type]}</p>
                </div>
                <Button variant="ghost" onClick={() => restore(f)} disabled={busy} className="text-sm">
                  <RotateCcw className="w-4 h-4" /> เปิดใช้ใหม่
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-line p-4 sm:p-5 lg:sticky lg:top-4">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
          <h2 className="font-semibold">ตัวอย่างฟอร์ม</h2>
          {eventLevels.length > 1 && (
            <div className="flex gap-1">
              {eventLevels.map((lv) => (
                <button
                  key={lv}
                  onClick={() => setPreviewLevel(lv)}
                  aria-pressed={previewLevel === lv}
                  className={`min-h-9 px-3 rounded-lg text-sm ${previewLevel === lv ? 'bg-cobalt text-white' : 'bg-bg text-ink/70'}`}
                >
                  {lv}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-ink/50 mb-3">ตัวอย่างเท่านั้น ไม่มีการบันทึกข้อมูล</p>
        {active.length === 0 ? (
          <p className="text-sm text-ink/60">เพิ่มช่องทางซ้ายเพื่อดูตัวอย่างฟอร์มที่นี่</p>
        ) : (
          <DynamicForm
            fields={fieldsForLevel(fields, previewLevel)}
            value={previewValues}
            onChange={setPreviewValues}
            errors={{}}
            userId={user?.id}
          />
        )}
      </div>

      <Modal open={Boolean(editing)} onClose={saving ? undefined : () => setEditing(null)} title={editing?.id ? 'แก้ไขช่อง' : 'เพิ่มช่อง'} wide>
        {form && (
          <div className="space-y-4">
            <Field label="ชื่อช่อง (label)" required htmlFor="fb-label">
              <Input id="fb-label" value={form.label} onChange={(e) => set('label', e.target.value)} placeholder="เช่น ชื่อบูธ" />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="ชนิดช่อง" required htmlFor="fb-type">
                <Select id="fb-type" value={form.field_type} onChange={(e) => set('field_type', e.target.value)}>
                  {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </Field>
              <Field label="ใช้กับระดับ" htmlFor="fb-level">
                <Select id="fb-level" value={form.applies_to_level} onChange={(e) => set('applies_to_level', e.target.value)}>
                  <option value="">ทุกระดับ</option>
                  {eventLevels.map((lv) => <option key={lv} value={lv}>เฉพาะ {lv}</option>)}
                </Select>
              </Field>
            </div>
            <label className="flex items-center gap-2 min-h-11 cursor-pointer">
              <input type="checkbox" checked={form.required} onChange={(e) => set('required', e.target.checked)} className="w-5 h-5 accent-cobalt" />
              <span className="text-sm font-medium">บังคับกรอก</span>
            </label>
            {NEEDS_OPTIONS.includes(form.field_type) && (
              <Field label="ตัวเลือก" required>
                <div className="space-y-2">
                  {form.options.map((opt, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={opt}
                        onChange={(e) => set('options', form.options.map((o, j) => (j === i ? e.target.value : o)))}
                        placeholder={`ตัวเลือกที่ ${i + 1}`}
                        aria-label={`ตัวเลือกที่ ${i + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => set('options', form.options.filter((_, j) => j !== i))}
                        disabled={form.options.length === 1}
                        aria-label="ลบตัวเลือก"
                        className="p-2 rounded-lg hover:bg-coral/10 text-coral disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <Button variant="secondary" onClick={() => set('options', [...form.options, ''])}>
                    <Plus className="w-4 h-4" /> เพิ่มตัวเลือก
                  </Button>
                </div>
              </Field>
            )}
            {formError && <p className="text-coral text-sm">{formError}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setEditing(null)} disabled={saving}>ยกเลิก</Button>
              <Button onClick={save} loading={saving}>บันทึกช่อง</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingSave)}
        title="เปลี่ยนชนิดช่อง"
        message={'กิจกรรมนี้มีผู้ลงชื่อแล้ว คำตอบเก่าอาจแสดงผลไม่ถูกต้องเมื่อเปลี่ยนชนิดช่อง\nต้องการดำเนินการต่อหรือไม่?'}
        confirmLabel="เปลี่ยนชนิดช่อง"
        loading={saving}
        onConfirm={() => persist(pendingSave)}
        onCancel={() => setPendingSave(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="ลบช่อง"
        message={hasRegistrations
          ? `มีผู้ลงชื่อกิจกรรมนี้แล้ว ช่อง "${deleteTarget?.label}" จะถูกซ่อนจากฟอร์มใหม่ แต่คำตอบเดิมยังถูกเก็บไว้\nต้องการลบหรือไม่?`
          : `ต้องการลบช่อง "${deleteTarget?.label}" หรือไม่? (ลบแบบซ่อน กู้คืนได้ด้วยปุ่มเปิดใช้ใหม่)`}
        confirmLabel="ลบช่อง"
        danger
        loading={busy}
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}