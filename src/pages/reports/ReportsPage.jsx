import { useMemo, useState } from 'react';
import { BarChart3, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useEvents, useOrganizerLevels, useEventCounts, useRoster, useFormFields, useDepartments } from '../../hooks/useQueries.js';
import { exportRosterCsv } from '../../lib/rosterCsv.js';
import { toThaiError } from '../../lib/errors.js';
import Button from '../../components/ui/Button.jsx';
import { Field, Select } from '../../components/ui/Field.jsx';
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/States.jsx';
import DeptSummaryBar from '../../components/DeptSummaryBar.jsx';
import { LevelBadge } from '../../components/Badges.jsx';

export default function ReportsPage() {
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const events = useEvents({ approvedOnly: false });
  const assigned = useOrganizerLevels(isAdmin ? null : user?.id);
  const [eventId, setEventId] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');

  const visibleEvents = useMemo(() => {
    const all = events.data ?? [];
    if (isAdmin) return all;
    const ids = new Set(assigned.data ?? []);
    return all.filter((ev) => ev.created_by === user?.id || ev.event_levels.some((l) => ids.has(l.id)));
  }, [events.data, isAdmin, assigned.data, user?.id]);

  const event = visibleEvents.find((e) => e.id === eventId) ?? null;
  const counts = useEventCounts(eventId);
  const roster = useRoster(eventId);
  const fields = useFormFields(eventId);
  const departmentsQuery = useDepartments();

  const filteredCounts = useMemo(() => {
    const rows = counts.data ?? [];
    return levelFilter === 'all' ? rows : rows.filter((c) => c.level === levelFilter);
  }, [counts.data, levelFilter]);

  const total = filteredCounts.reduce((sum, c) => sum + c.registered, 0);

  const perLevel = useMemo(() => {
    const map = {};
    for (const c of counts.data ?? []) map[c.level] = (map[c.level] ?? 0) + c.registered;
    return map;
  }, [counts.data]);

  const deptRows = useMemo(() => {
    const map = {};
    for (const c of filteredCounts) {
      if (!map[c.department_id]) map[c.department_id] = { name: c.department_name, levels: {} };
      map[c.department_id].levels[c.level] = c;
    }
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name, 'th'));
  }, [filteredCounts]);

  const exportCsv = () => {
    const rows = (roster.data ?? []).filter((r) => levelFilter === 'all' || r.level === levelFilter);
    exportRosterCsv({
      event,
      levelLabel: levelFilter === 'all' ? 'ทั้งหมด' : levelFilter,
      rows,
      fields: fields.data ?? [],
    });
  };

  const loading = events.isLoading || (!isAdmin && assigned.isLoading);
  const error = events.error ?? (!isAdmin ? assigned.error : null);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">รายงาน</h1>

      {loading ? <LoadingState /> : error ? (
        <ErrorState message={toThaiError(error)} onRetry={() => { events.refetch(); assigned.refetch(); }} />
      ) : visibleEvents.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title={isAdmin ? 'ยังไม่มีกิจกรรม' : 'ยังไม่มีกิจกรรมของคุณ'}
          hint={isAdmin ? 'สร้างกิจกรรมในหน้า จัดการกิจกรรม ก่อน ดูรายงาน' : 'สร้างกิจกรรมของคุณเองในหน้า จัดการกิจกรรม หรือให้ผู้ดูแลระบบกำหนดให้คุณดูแลกิจกรรมในหน้า ผู้ใช้'}
        />
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-line p-4 grid gap-3 sm:grid-cols-2">
            <Field label="เลือกกิจกรรม" htmlFor="rp-event">
              <Select id="rp-event" value={eventId} onChange={(e) => { setEventId(e.target.value); setLevelFilter('all'); }}>
                <option value="">— เลือกกิจกรรม —</option>
                {visibleEvents.map((ev) => <option key={ev.id} value={ev.id}>{ev.title} (ปี {ev.academic_year})</option>)}
              </Select>
            </Field>
            {event && event.event_levels.length > 1 && (
              <Field label="ระดับ" htmlFor="rp-level">
                <Select id="rp-level" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
                  <option value="all">ทุกระดับ</option>
                  {event.event_levels.map((l) => <option key={l.id} value={l.level}>{l.level}</option>)}
                </Select>
              </Field>
            )}
          </div>

          {!event ? (
            <EmptyState icon={BarChart3} title="เลือกกิจกรรมเพื่อดูรายงาน" hint="เลือกจากช่องด้านบนเพื่อสรุปจำนวนผู้ลงชื่อรายแผนกและระดับ" />
          ) : counts.isLoading ? <LoadingState /> : counts.isError ? (
            <ErrorState message={toThaiError(counts.error)} onRetry={counts.refetch} />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-ink text-white rounded-2xl p-4">
                  <p className="text-sm text-white/70">ผู้ลงชื่อรวม{levelFilter !== 'all' ? ` (${levelFilter})` : ''}</p>
                  <p className="text-3xl font-bold mt-1">{total}</p>
                </div>
                {event.event_levels.map((l) => (
                  <div key={l.id} className="bg-white rounded-2xl border border-line p-4">
                    <LevelBadge level={l.level} />
                    <p className="text-3xl font-bold mt-2">{perLevel[l.level] ?? 0}</p>
                  </div>
                ))}
              </div>

              <DeptSummaryBar
                counts={filteredCounts}
                departments={departmentsQuery.data ?? []}
                eventLevels={levelFilter === 'all' ? (event?.event_levels ?? []) : (event?.event_levels ?? []).filter((l) => l.level === levelFilter)}
              />

              <div className="bg-white rounded-2xl border border-line overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[480px]">
                    <thead>
                      <tr className="bg-bg text-left">
                        <th className="px-4 py-3 font-semibold">แผนกวิชา</th>
                        {event.event_levels
                          .filter((l) => levelFilter === 'all' || l.level === levelFilter)
                          .map((l) => <th key={l.id} className="px-4 py-3 font-semibold text-center">{l.level}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {deptRows.map((d) => (
                        <tr key={d.name}>
                          <td className="px-4 py-2.5">{d.name}</td>
                          {event.event_levels
                            .filter((l) => levelFilter === 'all' || l.level === levelFilter)
                            .map((l) => {
                              const c = d.levels[l.level];
                              if (!c) return <td key={l.id} className="px-4 py-2.5 text-center text-ink/40">-</td>;
                              return (
                                <td key={l.id} className={`px-4 py-2.5 text-center ${c.is_below_min ? 'text-coral font-semibold' : ''}`}>
                                  {c.registered}{c.min_per_dept != null ? `/${c.min_per_dept}` : ''}
                                  {c.is_full && <span className="block text-xs text-coral">เต็ม</span>}
                                </td>
                              );
                            })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={exportCsv} disabled={roster.isLoading || fields.isLoading || !roster.data}>
                  <Download className="w-4 h-4" /> ส่งออก CSV
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}