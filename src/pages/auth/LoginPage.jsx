import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { signIn } from '../../api/auth.js';
import { toThaiError } from '../../lib/errors.js';
import Button from '../../components/ui/Button.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';
import { LoadingState } from '../../components/ui/States.jsx';
import Crest from '../../components/Crest.jsx';

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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <Crest className="w-16 h-16 mb-3 inline-block" />
          <h1 className="text-2xl font-bold">Puatc Ground</h1>
          <p className="text-ink/60 text-sm mt-1">ระบบลงชื่อตัวแทนทำกิจกรรมของวิทยาลัย</p>
        </div>
        <form onSubmit={submit} className="bg-white rounded-lg border border-line border-t-4 border-t-cobalt p-5 space-y-4 shadow-sm">
          <h2 className="text-lg font-semibold">เข้าสู่ระบบ</h2>
          {error && <p role="alert" className="text-sm text-coral bg-coral/10 rounded-xl px-3 py-2">{error}</p>}
          <Field label="รหัสนักศึกษา" htmlFor="student_code" required>
            <Input
              id="student_code"
              value={studentCode}
              onChange={(e) => setStudentCode(e.target.value)}
              autoComplete="username"
              placeholder="เช่น 66102010001"
            />
          </Field>
          <Field label="รหัสผ่าน" htmlFor="password" required>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
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
          <Button type="submit" loading={submitting} className="w-full">เข้าสู่ระบบ</Button>
          <p className="text-sm text-center text-ink/60">
            ยังไม่มีบัญชี?{' '}
            <Link to="/register" className="text-cobalt font-medium">สมัครสมาชิก</Link>
          </p>
        </form>
      </div>
    </div>
  );
}