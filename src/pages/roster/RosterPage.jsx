import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Users, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useEvents, useRoster, useFormFields, useEventCounts, useDepartments } from '../../hooks/useQueries.js';
import { formatAnswer } from '../../lib/answers.js';
import { fullName, fmtDate } from '../../lib/format.js';
import { exportRosterCsv } from '../../lib/rosterCsv.js';
import { LEVELS } from '../../lib/constants.js';
import { toThaiError } from '../../lib/errors.js';
import Button from '../../components/ui/Button.jsx';
import { Field, Input, Select } from '../../components/ui/Field.jsx';
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/States.jsx';
import DeptSummaryBar from '../../components/DeptSummaryBar.jsx';
import Avatar from '../../components/Avatar.jsx';

function AnswerCell({ field, value }) {
  if (field.field_type === 'image' && value) {
    return (
      <a href={value} target="_blank" rel="noreferrer">
        <img src={value} alt={field.label} className="w-12 h-12 rounded-lg object-cover border border-line" />
      </a>
    );
  }
  return <span className="break-words">{formatAnswer(field, value)}</span>;
}

export default function RosterPage() {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const eventId = searchParams.get('event') ?? '';
  const [eventSearch, setEventSearch] = useState('');
  const [year, setYear] = useState('');
  const [level, setLevel] = useState('all');
  const [dept, setDept] = useState('');

  const eventsQuery = useEvents();
  const departmentsQuery = useDepartments();
  const rosterQuery = useRoster(eventId);
  const fieldsQuery = useFormFields(eventId);
  const countsQuery = useEventCounts(eventId);

  const canExport = ['admin', 'organizer'].includes(profile?.role);
  const events = eventsQuery.data ?? [];
  const years = useMemo(() => [...new Set(events.map((e) => e.academic_year))].sort().reverse(), [events]);
  const event = events.find((e) => e.id === eventId);
  const fields = useMemo(
    () => (fieldsQuery.data ?? []).filter((f) => f.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [fieldsQuery.data],
  );

  const rows = useMemo(
    () => (rosterQuery.data ?? []).filter((r) => (level === 'all' || r.level === level) && (!dept || r.department_id === dept)),
    [rosterQuery.data, level, dept],
  );

  const selectableEvents = events.filter(
    (e) => (!year || e.academic_year === year) && (!eventSearch.trim() || e.title.includes(eventSearch.trim())),
  );

  const pickEvent = (id) => setSearchParams(id ? { event: id } : {});
  const levelLabel = level === 'all' ? 'ทุกระดับ' : level;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-xl font-bold">รายชื่อตัวแทน</h1>
        {canExport && event && rows.length > 0 && (
          <Button variant="secondary" onClick={() => exportRosterCsv({ event, levelLabel, rows, fields })}>
            <Download className="w-4 h-4" /> ส่งออก CSV
          </Button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-line p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Field label="ค้นหากิจกรรม">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-ink/40" aria-hidden />
            <Input value={eventSearch} onChange={(e) => setEventSearch(e.target.value)} placeholder="ชื่อกิจกรรม" className="pl-9" />
          </div>
        </Field>
        <Field label="ปีการศึกษา">
          <Select value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="">ทุกปี</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </Select>
        </Field>
        <Field label="กิจกรรม">
          <Select value={eventId} onChange={(e) => pickEvent(e.target.value)}>
            <option value="">เลือกกิจกรรม</option>
            {selectableEvents.map((e) => <option key={e.id} value={e.id}>{e.title} ({e.academic_year})</option>)}
          </Select>
        </Field>
        <Field label="แผนก">
          <Select value={dept} onChange={(e) => setDept(e.target.value)} disabled={!event}>
            <option value="">ทุกแผนก</option>
            {(departmentsQuery.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>
      </div>

      {!event ? (
        <div className="bg-white rounded-2xl border border-line">
          {eventsQuery.isPending ? <LoadingState /> : eventsQuery.isError ? (
            <ErrorState message={toThaiError(eventsQuery.error)} onRetry={() => eventsQuery.refetch()} />
          ) : events.length === 0 ? (
            <EmptyState icon={Users} title="ยังไม่มีกิจกรรม" hint="เมื่อผู้ดูแลระบบสร้างกิจกรรมแล้ว จะเลือกรายชื่อดูได้ที่นี่" />
          ) : (
            <EmptyState icon={Users} title="เลือกกิจกรรมเพื่อดูรายชื่อ" hint="ใช้ช่องค้นหาด้านบนเพื่อหากิจกรรมที่ต้องการ" />
          )}
        </div>
      ) : (
        <>
          <div className="flex gap-1 bg-white border border-line rounded-xl p-1 w-fit" role="group" aria-label="กรองตามระดับ">
            {[['all', 'ทั้งหมด'], ...LEVELS.map((l) => [l, l])].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setLevel(value)}
                aria-pressed={level === value}
                className={`px-3 min-h-9 rounded-lg text-sm font-medium ${level === value ? 'bg-cobalt text-white' : 'text-ink/60 hover:bg-bg'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {countsQuery.data && (
            <DeptSummaryBar
              counts={level === 'all' ? countsQuery.data : countsQuery.data.filter((c) => c.level === level)}
              departments={departmentsQuery.data ?? []}
              eventLevels={level === 'all' ? (event?.event_levels ?? []) : (event?.event_levels ?? []).filter((l) => l.level === level)}
            />
          )}

          <div className="bg-white rounded-2xl border border-line overflow-hidden">
            {rosterQuery.isPending || fieldsQuery.isPending ? <LoadingState /> : rosterQuery.isError ? (
              <ErrorState message={toThaiError(rosterQuery.error)} onRetry={() => rosterQuery.refetch()} />
            ) : rows.length === 0 ? (
              <EmptyState icon={Users} title="ยังไม่มีผู้ลงชื่อ" hint="เมื่อมีผู้ลงชื่อเป็นตัวแทน รายชื่อจะแสดงที่นี่ ลองปรับตัวกรองระดับ/แผนก" />
            ) : (
              <>
                {/* เดสก์ท็อป: ตาราง */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line bg-bg text-left">
                        <th className="px-3 py-2.5 font-medium">#</th>
                        <th className="px-3 py-2.5 font-medium">ชื่อ-สกุล</th>
                        <th className="px-3 py-2.5 font-medium">รหัสนักศึกษา</th>
                        <th className="px-3 py-2.5 font-medium">แผนก</th>
                        <th className="px-3 py-2.5 font-medium">ระดับ</th>
                        <th className="px-3 py-2.5 font-medium">ห้อง</th>
                        {fields.map((f) => <th key={f.id} className="px-3 py-2.5 font-medium">{f.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={r.id} className="border-b border-line last:border-0">
                          <td className="px-3 py-2.5 text-ink/50">{i + 1}</td>
                          <td className="px-3 py-2.5">
                            <span className="flex items-center gap-2">
                              <Avatar url={r.avatar_url} name={fullName(r)} size="w-8 h-8 text-xs" />
                              <span className="font-medium whitespace-nowrap">{fullName(r)}</span>
                            </span>
                          </td>
                          <td className="px-3 py-2.5">{r.student_code}</td>
                          <td className="px-3 py-2.5">{r.department_name}</td>
                          <td className="px-3 py-2.5">{r.level}</td>
                          <td className="px-3 py-2.5">{r.class_room}</td>
                          {fields.map((f) => <td key={f.id} className="px-3 py-2.5"><AnswerCell field={f} value={r.answers?.[f.id]} /></td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* มือถือ: การ์ดต่อคน */}
                <ul className="md:hidden divide-y divide-line">
                  {rows.map((r, i) => (
                    <li key={r.id} className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar url={r.avatar_url} name={fullName(r)} />
                        <div className="min-w-0">
                          <p className="font-medium">{i + 1}. {fullName(r)}</p>
                          <p className="text-sm text-ink/50">{r.student_code} · {r.department_name} · {r.level} · ห้อง {r.class_room}</p>
                        </div>
                      </div>
                      {fields.some((f) => r.answers?.[f.id] !== undefined) && (
                        <dl className="mt-2 space-y-1 text-sm">
                          {fields.filter((f) => r.answers?.[f.id] !== undefined).map((f) => (
                            <div key={f.id} className="flex gap-2">
                              <dt className="text-ink/50 shrink-0">{f.label}:</dt>
                              <dd><AnswerCell field={f} value={r.answers[f.id]} /></dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          {event && <p className="text-sm text-ink/50">รวม {rows.length} รายการ · {event.title} · อัปเดตล่าสุด ณ วันที่โหลด ({fmtDate(new Date())})</p>}
        </>
      )}
    </div>
  );
}