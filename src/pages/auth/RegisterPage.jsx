import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ImagePlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { signUp } from '../../api/auth.js';
import { updateProfile } from '../../api/profiles.js';
import { uploadAvatar } from '../../api/storage.js';
import { departmentsApi } from '../../api/taxonomy.js';
import { toThaiError } from '../../lib/errors.js';
import { LEVELS, TITLES, MAX_AVATAR_SIZE } from '../../lib/constants.js';
import Button from '../../components/ui/Button.jsx';
import { Field, Input, Select } from '../../components/ui/Field.jsx';
import { LoadingState } from '../../components/ui/States.jsx';
import AuthPanel from '../../components/auth/AuthPanel.jsx';
import { useToast } from '../../components/ui/Toast.jsx';

const initial = {
  student_code: '', title: '', first_name: '', last_name: '',
  department_id: '', level: '', class_room: '', email: '', phone: '',
  password: '', confirm: '',
};

export default function RegisterPage() {
  const { session, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // ระหว่าง signUp → อัปโหลดรูป → อัปเดตโปรไฟล์ ห้าม redirect ออกจากหน้านี้
  const [completing, setCompleting] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [deptLoading, setDeptLoading] = useState(true);
  const [deptError, setDeptError] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const loadDepartments = useCallback(() => {
    setDeptLoading(true);
    setDeptError('');
    departmentsApi.list()
      .then(setDepartments)
      .catch((err) => setDeptError(toThaiError(err, 'โหลดรายชื่อแผนกไม่สำเร็จ ตรวจสอบการตั้งค่า Supabase ในไฟล์ .env')))
      .finally(() => setDeptLoading(false));
  }, []);

  useEffect(loadDepartments, [loadDepartments]);

  useEffect(() => () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); }, [avatarPreview]);

  if (loading) return <LoadingState />;
  if (session && !completing) return <Navigate to="/" replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const pickAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrors((er) => ({ ...er, avatar: 'เลือกได้เฉพาะไฟล์รูปภาพ' }));
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setErrors((er) => ({ ...er, avatar: 'รูปต้องไม่เกิน 2 MB' }));
      return;
    }
    setErrors((er) => ({ ...er, avatar: '' }));
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const validate = () => {
    const er = {};
    if (!/^[A-Za-z0-9]{4,20}$/.test(form.student_code)) er.student_code = 'ตัวอักษรหรือตัวเลข 4-20 ตัว ไม่มีช่องว่าง';
    if (!form.title) er.title = 'เลือกคำนำหน้า';
    if (!form.first_name.trim()) er.first_name = 'กรอกชื่อ';
    if (!form.last_name.trim()) er.last_name = 'กรอกนามสกุล';
    if (!form.department_id) er.department_id = 'เลือกแผนกวิชา';
    if (!form.level) er.level = 'เลือกระดับชั้น';
    if (!form.class_room.trim()) er.class_room = 'กรอกชั้นปี/ห้อง เช่น 2/1';
    else if (form.class_room.trim().length > 10) er.class_room = 'ไม่เกิน 10 ตัวอักษร';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) er.email = 'กรอกอีเมลให้ถูกต้อง';
    if (form.password.length < 8) er.password = 'อย่างน้อย 8 ตัวอักษร';
    if (form.confirm !== form.password) er.confirm = 'รหัสผ่านไม่ตรงกัน';
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!validate()) return;
    setSubmitting(true);
    setCompleting(true);
    try {
      const meta = {
        title: form.title,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        department_id: form.department_id,
        level: form.level,
        class_room: form.class_room.trim(),
        contact_email: form.email.trim(),
        phone: form.phone.trim(),
        avatar_url: '',
      };
      const data = await signUp(form.student_code, form.password, meta);
      if (data.session) {
        // อัปโหลดรูปหลังสมัครสำเร็จ ถ้าพลาด การสมัครต้องยังสำเร็จ
        if (avatarFile) {
          try {
            const url = await uploadAvatar(data.session.user.id, avatarFile);
            await updateProfile(data.session.user.id, { avatar_url: url });
          } catch {
            toast('สมัครสำเร็จ แต่อัปโหลดรูปไม่สำเร็จ เพิ่มรูปภายหลังได้ที่หน้าโปรไฟล์', 'error');
          }
        }
        await refreshProfile(data.session.user.id);
        navigate('/', { replace: true });
      } else {
        toast('สมัครสำเร็จ กรุณาเข้าสู่ระบบ');
        navigate('/login', { replace: true });
      }
    } catch (err) {
      setSubmitError(toThaiError(err));
      setCompleting(false);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-bg">
      <div className="lg:sticky lg:top-0 lg:h-screen">
        <AuthPanel note="สมัครครั้งเดียว ใช้ลงชื่อได้ทุกกิจกรรม" />
      </div>
      <main className="flex justify-center p-5 sm:p-10">
        <div className="w-full max-w-lg">
          <div className="mb-6">
            <h2 className="text-3xl font-bold">สมัครสมาชิก</h2>
            <p className="text-ink/60 text-sm mt-1">กรอกข้อมูลให้ครบ แล้วเริ่มลงชื่อตัวแทนได้เลย</p>
          </div>
          <form onSubmit={submit} className="bg-white rounded-2xl border border-line p-5 sm:p-6 space-y-4 shadow-sm">
            {submitError && <p role="alert" className="text-sm text-coral bg-coral/10 rounded-xl px-3 py-2">{submitError}</p>}

            <div className="flex items-center gap-4">
              <label className="relative w-20 h-20 rounded-2xl bg-bg border border-dashed border-line flex items-center justify-center overflow-hidden cursor-pointer shrink-0">
                {avatarPreview
                  ? <img src={avatarPreview} alt="ตัวอย่างรูปโปรไฟล์" className="w-full h-full object-cover" />
                  : <ImagePlus className="w-7 h-7 text-ink/40" />}
                <input type="file" accept="image/*" onChange={pickAvatar} className="absolute inset-0 opacity-0 cursor-pointer" aria-label="เลือกรูปโปรไฟล์" />
              </label>
              <div className="text-sm text-ink/60">
                <p className="font-medium text-ink">รูปโปรไฟล์ (ไม่บังคับ)</p>
                <p>ไฟล์รูปไม่เกิน 2 MB</p>
                {errors.avatar && <p className="text-coral">{errors.avatar}</p>}
              </div>
            </div>

            <Field label="รหัสนักศึกษา (ใช้เป็น Username)" htmlFor="student_code" required error={errors.student_code}>
              <Input id="student_code" value={form.student_code} onChange={set('student_code')} autoComplete="username" />
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field label="คำนำหน้า" htmlFor="title" required error={errors.title}>
                <Select id="title" value={form.title} onChange={set('title')}>
                  <option value="">เลือก</option>
                  {TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </Field>
              <Field label="ชื่อ" htmlFor="first_name" required error={errors.first_name}>
                <Input id="first_name" value={form.first_name} onChange={set('first_name')} />
              </Field>
              <Field label="นามสกุล" htmlFor="last_name" required error={errors.last_name}>
                <Input id="last_name" value={form.last_name} onChange={set('last_name')} />
              </Field>
            </div>

            <Field label="แผนกวิชา" htmlFor="department" required error={errors.department_id || deptError}>
              <Select id="department" value={form.department_id} onChange={set('department_id')} disabled={deptLoading}>
                <option value="">{deptLoading ? 'กำลังโหลดแผนกวิชา...' : 'เลือกแผนกวิชา'}</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
              {deptError && (
                <Button variant="secondary" onClick={loadDepartments} className="mt-2 text-sm">ลองโหลดแผนกใหม่</Button>
              )}
            </Field>

            <Field label="ระดับชั้น" required error={errors.level}>
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="ระดับชั้น">
                {LEVELS.map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, level: lv }))}
                    aria-pressed={form.level === lv}
                    className={`min-h-11 rounded-xl border font-medium transition-colors ${form.level === lv ? 'bg-cobalt text-white border-cobalt' : 'bg-white border-line'}`}
                  >
                    {lv}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="ชั้นปี/ห้อง" htmlFor="class_room" required error={errors.class_room}>
              <Input id="class_room" value={form.class_room} onChange={set('class_room')} placeholder="เช่น 2/1" maxLength={10} />
            </Field>

            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="อีเมลติดต่อ" htmlFor="email" required error={errors.email}>
                <Input id="email" type="email" value={form.email} onChange={set('email')} autoComplete="email" />
              </Field>
              <Field label="เบอร์โทร (ไม่บังคับ)" htmlFor="phone">
                <Input id="phone" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
              </Field>
            </div>

            <Field label="รหัสผ่าน" htmlFor="password" required error={errors.password}>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  autoComplete="new-password"
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                  className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-ink/50"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </Field>
            <Field label="ยืนยันรหัสผ่าน" htmlFor="confirm" required error={errors.confirm}>
              <Input id="confirm" type={showPassword ? 'text' : 'password'} value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
            </Field>

            <Button type="submit" loading={submitting} className="w-full min-h-12 text-base rounded-xl">สมัครสมาชิก</Button>
            <p className="text-sm text-center text-ink/60">
              มีบัญชีแล้ว?{' '}
              <Link to="/login" className="text-cobalt font-semibold">เข้าสู่ระบบ</Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}