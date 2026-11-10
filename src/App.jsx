import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { isSupabaseConfigured } from './lib/supabase.js';
import { useAuth } from './context/AuthContext.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import RegisterPage from './pages/auth/RegisterPage.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import EventsPage from './pages/events/EventsPage.jsx';
import EventDetailPage from './pages/events/EventDetailPage.jsx';
import RosterPage from './pages/roster/RosterPage.jsx';
import ProfilePage from './pages/profile/ProfilePage.jsx';
import HomePage from './pages/HomePage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import AdminEventsPage from './pages/admin/AdminEventsPage.jsx';
import EventEditorPage from './pages/admin/EventEditorPage.jsx';
import SettingsPage from './pages/admin/SettingsPage.jsx';
import UsersPage from './pages/admin/UsersPage.jsx';
import FeedbacksPage from './pages/admin/FeedbacksPage.jsx';
import ReportsPage from './pages/reports/ReportsPage.jsx';
import { LoadingState, ErrorState } from './components/ui/States.jsx';
import Button from './components/ui/Button.jsx';

function ConfigNotice() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-line p-6 max-w-md space-y-3">
        <h1 className="text-xl font-bold">ยังไม่ได้ตั้งค่าการเชื่อมต่อ</h1>
        <ol className="list-decimal list-inside space-y-2 text-sm text-ink/80">
          <li>คัดลอกไฟล์ <code className="bg-bg px-1 rounded">.env.example</code> เป็น <code className="bg-bg px-1 rounded">.env</code></li>
          <li>ใส่ค่า VITE_SUPABASE_URL และ VITE_SUPABASE_PUBLISHABLE_KEY จาก Supabase Dashboard</li>
          <li>หยุดแล้วรัน <code className="bg-bg px-1 rounded">npm run dev</code> ใหม่</li>
        </ol>
        <p className="text-sm text-ink/60">ดูรายละเอียดใน README.md</p>
      </div>
    </div>
  );
}

function RequireAuth({ children }) {
  const { session, profile, loading, refreshProfile } = useAuth();
  if (loading) return <LoadingState />;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile) return <ErrorState message="โหลดโปรไฟล์ไม่สำเร็จ" onRetry={() => refreshProfile()} />;
  return children;
}

function Forbidden() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-coral/10 flex items-center justify-center">
        <ShieldX className="w-7 h-7 text-coral" />
      </div>
      <h1 className="text-xl font-bold">ไม่มีสิทธิ์เข้าถึง</h1>
      <p className="text-ink/60 text-sm">หน้านี้สำหรับบทบาทที่ได้รับสิทธิ์เท่านั้น</p>
      <Link to="/"><Button variant="secondary">กลับหน้าแรก</Button></Link>
    </div>
  );
}

export function RequireRole({ roles, children }) {
  const { profile } = useAuth();
  if (!roles.includes(profile?.role)) return <Forbidden />;
  return children;
}

export default function App() {
  if (!isSupabaseConfigured) return <ConfigNotice />;
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<HomePage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="events/:eventId" element={<EventDetailPage />} />
        <Route path="roster" element={<RosterPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="reports" element={<RequireRole roles={['admin', 'organizer']}><ReportsPage /></RequireRole>} />
        <Route path="admin/events" element={<RequireRole roles={['admin', 'organizer']}><AdminEventsPage /></RequireRole>} />
        <Route path="admin/events/new" element={<RequireRole roles={['admin', 'organizer']}><EventEditorPage /></RequireRole>} />
        <Route path="admin/events/:id/edit" element={<RequireRole roles={['admin', 'organizer']}><EventEditorPage /></RequireRole>} />
        <Route path="admin/settings" element={<RequireRole roles={['admin']}><SettingsPage /></RequireRole>} />
        <Route path="admin/users" element={<RequireRole roles={['admin']}><UsersPage /></RequireRole>} />
        <Route path="admin/feedbacks" element={<RequireRole roles={['admin']}><FeedbacksPage /></RequireRole>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}