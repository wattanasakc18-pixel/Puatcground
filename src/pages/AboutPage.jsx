import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, Info, Target, Eye, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { sendFeedback } from '../api/feedbacks.js';
import { about } from '../content/about.js';
import { toThaiError } from '../lib/errors.js';
import Button from '../components/ui/Button.jsx';
import { Field, Textarea } from '../components/ui/Field.jsx';
import AppLayout from '../components/layout/AppLayout.jsx';
import { useToast } from '../components/ui/Toast.jsx';

const SECTIONS = [
  { key: 'intro',   icon: Info,   title: 'คำนำ' },
  { key: 'purpose', icon: Target, title: 'จุดประสงค์' },
  { key: 'vision',  icon: Eye,    title: 'วิสัยทัศน์' },
  { key: 'contact', icon: Phone,  title: 'ข้อมูลติดต่อ' },
];

function Content() {
  const { session, user } = useAuth();
  const toast = useToast();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!message.trim()) { setError('กรุณาเขียนข้อความก่อนส่ง'); return; }
    setSending(true);
    setError('');
    try {
      await sendFeedback(user.id, message.trim());
      toast('ส่งคำติชมถึงผู้ดูแลระบบแล้ว ขอบคุณสำหรับข้อเสนอแนะ');
      setMessage('');
    } catch (err) {
      setError(toThaiError(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* Hero */}
      <div className="bg-gradient-to-br from-cobalt to-cobalt/80 rounded-2xl p-8 text-white">
        <p className="text-white/70 text-sm font-medium mb-1">Puatc Ground · วิทยาลัย</p>
        <h1 className="text-2xl sm:text-3xl font-bold">เกี่ยวกับเรา</h1>
        <p className="text-white/80 mt-2 text-sm max-w-lg">
          ระบบลงชื่อตัวแทนทำกิจกรรม สำหรับนักเรียน นักศึกษา และบุคลากร
        </p>
      </div>

      {/* Info cards 2×2 */}
      <div className="grid sm:grid-cols-2 gap-4">
        {SECTIONS.map(({ key, icon: Icon, title }) => (
          <div key={key} className="bg-white rounded-2xl border border-line p-5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-cobalt/10 text-cobalt flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4" />
              </span>
              <h2 className="font-semibold">{title}</h2>
            </div>
            <p className="text-ink/70 text-sm whitespace-pre-line leading-relaxed">{about[key]}</p>
          </div>
        ))}
      </div>

      {/* Feedback */}
      <div className="bg-white rounded-2xl border border-line p-6">
        <h2 className="font-semibold text-base mb-1">ส่งคำติชมถึงผู้ดูแลระบบ</h2>
        <p className="text-sm text-ink/50 mb-4">มีอะไรอยากแนะนำหรือรายงานปัญหา บอกเราได้เลย</p>
        {!session ? (
          <div className="text-sm text-ink/60">
            <p>ต้องเข้าสู่ระบบก่อนส่งคำติชม</p>
            <Link to="/login" className="inline-block mt-2">
              <Button variant="secondary">เข้าสู่ระบบ</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 max-w-xl">
            <Field label="ข้อความ" required error={error}>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="บอกเราได้ว่าอยากให้มีอะไรปรับปรุง"
                maxLength={2000}
              />
            </Field>
            <Button type="submit" loading={sending}>
              <Send className="w-4 h-4" /> ส่งคำติชม
            </Button>
          </form>
        )}
      </div>

    </div>
  );
}

// เข้าได้ทั้งก่อนและหลัง login
export default function AboutPage() {
  const { session, loading } = useAuth();
  if (!loading && session) {
    return <AppLayout><Content /></AppLayout>;
  }
  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-line">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-cobalt text-white flex items-center justify-center font-bold">P</span>
            <span className="font-bold">Puatc Ground</span>
          </Link>
          <Link to="/login" className="text-sm text-cobalt font-medium">เข้าสู่ระบบ</Link>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-5"><Content /></main>
    </div>
  );
}
