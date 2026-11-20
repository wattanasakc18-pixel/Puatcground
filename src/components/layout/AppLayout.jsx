import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { Home, CalendarDays, ListChecks, Info, User, Menu, LogOut, ChevronDown, BarChart3, Settings, Users, Tags, MessageSquareWarning, CalendarCog } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { signOut } from '../../api/auth.js';
import { fullName, fmtDate, todayStr } from '../../lib/format.js';
import Avatar from '../Avatar.jsx';
import Crest from '../Crest.jsx';
import Modal from '../ui/Modal.jsx';

const MAIN_LINKS = [
  { to: '/', label: 'หน้าแรก', icon: Home, end: true },
  { to: '/events', label: 'กิจกรรมและลงชื่อ', icon: CalendarDays },
  { to: '/roster', label: 'รายชื่อตัวแทน', icon: ListChecks },
  { to: '/about', label: 'เกี่ยวกับเรา', icon: Info },
];

const MANAGE_LINKS = [
  { to: '/admin/events', label: 'จัดการกิจกรรม', icon: CalendarCog, roles: ['admin', 'organizer'] },
  { to: '/reports', label: 'รายงาน', icon: BarChart3, roles: ['admin', 'organizer'] },
  { to: '/admin/users', label: 'ผู้ใช้', icon: Users, roles: ['admin'] },
  { to: '/admin/settings', label: 'หมวดและแผนก', icon: Tags, roles: ['admin'] },
  { to: '/admin/feedbacks', label: 'คำติชม', icon: MessageSquareWarning, roles: ['admin'] },
];

export default function AppLayout({ children }) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const role = profile?.role ?? 'student';
  const manageLinks = MANAGE_LINKS.filter((l) => l.roles.includes(role));

  const logout = async () => {
    await signOut();
    setMenuOpen(false);
    setProfileDropdownOpen(false);
    navigate('/login', { replace: true });
  };

  const navLinkClass = ({ isActive }) =>
    `px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${isActive ? 'text-cobalt' : 'text-ink/60 hover:text-ink'}`;

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <a
        href="#main"
        className="absolute left-2 top-2 z-[70] -translate-y-20 focus:translate-y-0 transition-transform bg-white border border-cobalt rounded-md px-3 py-2 text-sm font-medium"
      >
        ข้ามไปเนื้อหา
      </a>
      <header className="sticky top-0 z-40 bg-white border-b border-line">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-4 h-14">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 shrink-0">
              <Crest className="w-9 h-9 shrink-0" />
              <div className="leading-tight hidden sm:block">
                <span className="block font-display font-bold text-base">Puatc Ground</span>
                <span className="block text-[11px] text-ink/50 -mt-0.5">ระบบลงชื่อตัวแทนทำกิจกรรม · วิทยาลัย</span>
              </div>
            </Link>

            {/* Divider */}
            <div className="hidden md:block w-px h-5 bg-line shrink-0" />

            {/* Nav links — desktop */}
            <nav className="hidden md:flex items-center gap-0.5 flex-1 min-w-0" aria-label="เมนูหลัก">
              {MAIN_LINKS.map((l) => (
                <NavLink key={l.to} to={l.to} end={l.end} className={navLinkClass}>{l.label}</NavLink>
              ))}
              {manageLinks.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setManageOpen((v) => !v)}
                    aria-expanded={manageOpen}
                    className="px-3 py-2 text-sm font-medium text-ink/60 hover:text-ink flex items-center gap-1 whitespace-nowrap"
                  >
                    จัดการ <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  {manageOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setManageOpen(false)} aria-hidden />
                      <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-line rounded-xl shadow-lg py-1 min-w-44">
                        {manageLinks.map((l) => (
                          <NavLink
                            key={l.to}
                            to={l.to}
                            onClick={() => setManageOpen(false)}
                            className={({ isActive }) => `flex items-center gap-2 px-4 py-2.5 text-sm ${isActive ? 'text-cobalt bg-cobalt/10' : 'text-ink/80 hover:bg-bg'}`}
                          >
                            <l.icon className="w-4 h-4" /> {l.label}
                          </NavLink>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </nav>

            {/* Right side */}
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <span className="hidden lg:block text-sm text-ink/40">{fmtDate(todayStr())}</span>

              {/* Desktop Profile Menu */}
              <div className="relative hidden md:block">
                <button
                  onClick={() => setProfileDropdownOpen((v) => !v)}
                  aria-expanded={profileDropdownOpen}
                  aria-label="เมนูโปรไฟล์"
                  className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-line/60 transition-colors"
                >
                  <Avatar url={profile?.avatar_url} name={fullName(profile)} size="w-8 h-8 text-xs" />
                  <span className="text-sm font-medium text-ink max-w-[130px] truncate">{fullName(profile)}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-ink/50" />
                </button>

                {profileDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileDropdownOpen(false)} aria-hidden />
                    <div className="absolute right-0 top-full mt-1.5 z-50 bg-white border border-line rounded-2xl shadow-xl py-2 min-w-56 overflow-hidden">
                      <div className="px-4 py-2 border-b border-line bg-bg/50">
                        <p className="font-semibold text-sm text-ink truncate">{fullName(profile)}</p>
                        <p className="text-xs text-ink/60 truncate mt-0.5">
                          {profile?.student_code ? `${profile.student_code} · ` : ''}{profile?.department_name || 'ไม่ระบุแผนก'}
                        </p>
                      </div>
                      <div className="p-1 space-y-0.5">
                        <Link
                          to="/profile"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-ink/80 hover:bg-bg hover:text-ink font-medium"
                        >
                          <User className="w-4 h-4 text-cobalt" /> โปรไฟล์ของฉัน
                        </Link>
                        {manageLinks.map((l) => (
                          <Link
                            key={l.to}
                            to={l.to}
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-ink/80 hover:bg-bg hover:text-ink"
                          >
                            <l.icon className="w-4 h-4 text-ink/50" /> {l.label}
                          </Link>
                        ))}
                        <div className="h-px bg-line my-1" />
                        <button
                          onClick={logout}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-coral hover:bg-coral/10 w-full font-medium"
                        >
                          <LogOut className="w-4 h-4" /> ออกจากระบบ
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Mobile hamburger button */}
              <button
                onClick={() => setMenuOpen(true)}
                aria-label="เปิดเมนู"
                className="md:hidden flex items-center gap-1 px-3 min-h-10 rounded-xl hover:bg-line/60 text-sm font-medium"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main id="main" className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        {children ?? <Outlet />}
      </main>

      {/* แถบเมนูล่างสำหรับมือถือ */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-line" aria-label="เมนูหลัก">
        <div className="grid grid-cols-5">
          {MAIN_LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => `flex flex-col items-center justify-center gap-0.5 min-h-14 py-1.5 text-[11px] border-t-2 ${isActive ? 'text-cobalt font-semibold border-cobalt' : 'text-ink/50 border-transparent'}`}
            >
              <l.icon className="w-5 h-5" aria-hidden />
              {l.label === 'กิจกรรมและลงชื่อ' ? 'กิจกรรม' : l.label}
            </NavLink>
          ))}
          {/* โปรไฟล์ — กดที่รูปโปรไฟล์ */}
          <NavLink
            to="/profile"
            className={({ isActive }) => `flex flex-col items-center justify-center gap-0.5 min-h-14 py-1.5 text-[11px] border-t-2 ${isActive ? 'text-cobalt font-semibold border-cobalt' : 'text-ink/50 border-transparent'}`}
          >
            <Avatar url={profile?.avatar_url} name={fullName(profile)} size="w-6 h-6 text-[10px]" />
            โปรไฟล์
          </NavLink>
        </div>
      </nav>

      {/* เมนูมือถือ: ข้อมูลผู้ใช้ + เมนูทั้งหมด + เมนูจัดการ + ออกจากระบบ */}
      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} title="เมนู">
        {/* Profile Card -> Clickable to /profile */}
        <Link
          to="/profile"
          onClick={() => setMenuOpen(false)}
          className="flex items-center gap-3 p-3 rounded-2xl bg-bg hover:bg-cobalt/5 border border-line transition-colors mb-3 group"
        >
          <Avatar url={profile?.avatar_url} name={fullName(profile)} size="w-12 h-12 text-sm" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink group-hover:text-cobalt transition-colors truncate">{fullName(profile)}</p>
            <p className="text-xs text-ink/60 truncate">{profile?.department_name || 'ไม่ระบุแผนก'} · {profile?.level || 'ไม่ระบุระดับ'}</p>
            <span className="text-[11px] text-cobalt font-medium mt-0.5 inline-block">แตะเพื่อดูโปรไฟล์ของคุณ →</span>
          </div>
        </Link>

        {/* เมนูหลัก */}
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-ink/40 uppercase tracking-wider px-3 mb-1">เมนูหลัก</p>
          {MAIN_LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 min-h-11 rounded-xl font-medium transition-colors ${
                  isActive ? 'text-cobalt bg-cobalt/10' : 'text-ink/80 hover:bg-bg'
                }`
              }
            >
              <l.icon className="w-5 h-5 text-cobalt" /> {l.label}
            </NavLink>
          ))}
          <NavLink
            to="/profile"
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 min-h-11 rounded-xl font-medium transition-colors ${
                isActive ? 'text-cobalt bg-cobalt/10' : 'text-ink/80 hover:bg-bg'
              }`
            }
          >
            <User className="w-5 h-5 text-cobalt" /> โปรไฟล์ของฉัน
          </NavLink>
        </div>

        {/* เมนูจัดการ (admin / organizer) */}
        {manageLinks.length > 0 && (
          <div className="space-y-1 mt-4 pt-3 border-t border-line">
            <p className="text-[11px] font-semibold text-ink/40 uppercase tracking-wider px-3 mb-1">การจัดการ</p>
            {manageLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 min-h-11 rounded-xl font-medium transition-colors ${
                    isActive ? 'text-cobalt bg-cobalt/10' : 'text-ink/80 hover:bg-bg'
                  }`
                }
              >
                <l.icon className="w-5 h-5 text-cobalt" /> {l.label}
              </NavLink>
            ))}
          </div>
        )}

        {/* ออกจากระบบ */}
        <div className="mt-4 pt-3 border-t border-line">
          <button onClick={logout} className="flex items-center gap-3 px-3 min-h-11 rounded-xl hover:bg-coral/10 text-coral font-medium w-full">
            <LogOut className="w-5 h-5" /> ออกจากระบบ
          </button>
        </div>
      </Modal>
    </div>
  );
}