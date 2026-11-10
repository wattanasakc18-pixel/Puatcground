import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { signIn } from '../../api/auth.js';
import { toThaiError } from '../../lib/errors.js';
import Button from '../../components/ui/Button.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';
import { LoadingState } from '../../components/ui/States.jsx';
import AuthPanel from '../../components/auth/AuthPanel.jsx';

export default function LoginPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [studentCode, setStudentCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <LoadingState />;
  if (session) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!studentCode.trim() || !password) {
      setError('กรุณากรอกรหัสนักศึกษาและรหัสผ่าน');
      return;
    }
    setSubmitting(true);
    try {
      await signIn(studentCode, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(toThaiError(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-bg">
      <AuthPanel />
      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <h2 className="text-3xl font-bold">เข้าสู่ระบบ</h2>
          <p className="text-ink/60 text-sm mt-1 mb-6">ใช้รหัสนักศึกษาและรหัสผ่านที่สมัครไว้</p>
          <form onSubmit={submit} className="space-y-4">
            {error && <p role="alert" className="text-sm text-coral bg-coral/10 rounded-xl px-3 py-2">{error}</p>}
            <Field label="รหัสนักศึกษา" htmlFor="student_code">
              <Input
                id="student_code"
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
                autoComplete="username"
                placeholder="เช่น 66102010001"
                className="min-h-12"
              />
            </Field>
            <Field label="รหัสผ่าน" htmlFor="password">
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="pr-16 min-h-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-0 h-full flex items-center text-sm font-semibold text-cobalt"
                >
                  {showPassword ? 'ซ่อน' : 'แสดง'}
                </button>
              </div>
            </Field>
            <Button type="submit" loading={submitting} className="w-full min-h-12 text-base rounded-xl">เข้าสู่ระบบ</Button>
          </form>
          <p className="text-sm text-center text-ink/60 mt-5">
            ยังไม่มีบัญชี?{' '}
            <Link to="/register" className="text-cobalt font-semibold">สมัครสมาชิก</Link>
          </p>
          <p className="text-ink/50 text-xs text-center mt-3">ลืมรหัสผ่าน? ติดต่อผู้ดูแลระบบของวิทยาลัย</p>
        </div>
      </main>
    </div>
  );
}