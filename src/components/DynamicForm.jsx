import { useState } from 'react';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { Field, Input, Select, Textarea } from './ui/Field.jsx';
import { uploadFormImage } from '../api/storage.js';
import { MAX_FORM_IMAGE_SIZE } from '../lib/constants.js';
import { toThaiError } from '../lib/errors.js';

function ImageField({ field, value, onChange, disabled, userId, error }) {
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState('');

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setLocalError('เลือกได้เฉพาะไฟล์รูปภาพ'); return; }
    if (file.size > MAX_FORM_IMAGE_SIZE) { setLocalError('รูปต้องไม่เกิน 5 MB'); return; }
    setLocalError('');
    setUploading(true);
    try {
      const url = await uploadFormImage(userId, file);
      onChange(url);
    } catch (err) {
      setLocalError(toThaiError(err, 'อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Field label={field.label} required={field.required} error={localError || error}>
      {value ? (
        <div className="flex items-start gap-3">
          <img src={value} alt={field.label} className="w-24 h-24 rounded-xl object-cover border border-line" />
          {!disabled && (
            <button type="button" onClick={() => onChange('')} aria-label="ลบรูป" className="p-2 rounded-lg hover:bg-coral/10 text-coral">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      ) : (
        <label className={`flex items-center justify-center gap-2 min-h-24 rounded-xl border border-dashed border-line bg-bg text-ink/50 ${disabled ? '' : 'cursor-pointer hover:border-cobalt'}`}>
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
          <span className="text-sm">{uploading ? 'กำลังอัปโหลด...' : 'เลือกรูป (ไม่เกิน 5 MB)'}</span>
          <input type="file" accept="image/*" className="hidden" onChange={pick} disabled={disabled || uploading} />
        </label>
      )}
    </Field>
  );
}

// ฟอร์มลงชื่อแบบ dynamic ใช้ซ้ำทั้ง ลงชื่อ แก้คำตอบ และ preview ใน Form Builder
export default function DynamicForm({ fields, value = {}, onChange, errors = {}, disabled = false, userId }) {
  const set = (id, v) => onChange({ ...value, [id]: v });

  return (
    <div className="space-y-4">
      {fields.map((f) => {
        const v = value[f.id];
        const error = errors[f.id];
        switch (f.field_type) {
          case 'textarea':
            return (
              <Field key={f.id} label={f.label} required={f.required} error={error}>
                <Textarea value={v ?? ''} onChange={(e) => set(f.id, e.target.value)} disabled={disabled} />
              </Field>
            );
          case 'number':
            return (
              <Field key={f.id} label={f.label} required={f.required} error={error}>
                <Input type="number" value={v ?? ''} onChange={(e) => set(f.id, e.target.value === '' ? null : Number(e.target.value))} disabled={disabled} />
              </Field>
            );
          case 'select':
            return (
              <Field key={f.id} label={f.label} required={f.required} error={error}>
                <Select value={v ?? ''} onChange={(e) => set(f.id, e.target.value)} disabled={disabled}>
                  <option value="">เลือก</option>
                  {(f.options ?? []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </Select>
              </Field>
            );
          case 'multiselect':
            return (
              <Field key={f.id} label={f.label} required={f.required} error={error}>
                <div className="space-y-1.5">
                  {(f.options ?? []).map((opt) => {
                    const checked = Array.isArray(v) && v.includes(opt);
                    return (
                      <label key={opt} className={`flex items-center gap-2 min-h-11 px-3 rounded-xl border cursor-pointer ${checked ? 'border-cobalt bg-cobalt/5' : 'border-line bg-white'}`}>
                        <input
                          type="checkbox"
                          className="w-5 h-5 accent-cobalt"
                          checked={checked}
                          disabled={disabled}
                          onChange={(e) => set(f.id, e.target.checked ? [...(v ?? []), opt] : (v ?? []).filter((x) => x !== opt))}
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              </Field>
            );
          case 'checkbox':
            return (
              <div key={f.id}>
                <label className="flex items-start gap-2 min-h-11 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 mt-0.5 accent-cobalt"
                    checked={v === true}
                    disabled={disabled}
                    onChange={(e) => set(f.id, e.target.checked)}
                  />
                  <span>{f.label} {f.required && <span className="text-coral">*</span>}</span>
                </label>
                {error && <p className="text-coral text-sm mt-1">{error}</p>}
              </div>
            );
          case 'date':
            return (
              <Field key={f.id} label={f.label} required={f.required} error={error}>
                <Input type="date" value={v ?? ''} onChange={(e) => set(f.id, e.target.value)} disabled={disabled} />
              </Field>
            );
          case 'image':
            return <ImageField key={f.id} field={f} value={v ?? ''} onChange={(url) => set(f.id, url)} disabled={disabled} userId={userId} error={error} />;
          default:
            return (
              <Field key={f.id} label={f.label} required={f.required} error={error}>
                <Input value={v ?? ''} onChange={(e) => set(f.id, e.target.value)} disabled={disabled} />
              </Field>
            );
        }
      })}
    </div>
  );
}