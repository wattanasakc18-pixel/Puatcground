import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Tags, Building2 } from 'lucide-react';
import { useCategories, useDepartments } from '../../hooks/useQueries.js';
import { categoriesApi, departmentsApi } from '../../api/taxonomy.js';
import { toThaiError } from '../../lib/errors.js';
import { useToast } from '../../components/ui/Toast.jsx';
import Button from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Field.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/States.jsx';

function TaxonomyPanel({ title, icon: Icon, query, api, queryKey, addPlaceholder }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [editName, setEditName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [queryKey] });

  const add = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    try {
      await api.create(name);
      setNewName('');
      invalidate();
      toast(`เพิ่ม "${name}" แล้ว`);
    } catch (err) {
      toast(err.code === '23505' ? 'มีชื่อนี้อยู่แล้ว' : toThaiError(err, 'เพิ่มไม่สำเร็จ'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const rename = async () => {
    const name = editName.trim();
    if (!name) return;
    setBusy(true);
    try {
      await api.rename(editTarget.id, name);
      invalidate();
      toast('เปลี่ยนชื่อแล้ว');
      setEditTarget(null);
    } catch (err) {
      toast(err.code === '23505' ? 'มีชื่อนี้อยู่แล้ว' : toThaiError(err, 'เปลี่ยนชื่อไม่สำเร็จ'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.remove(deleteTarget.id);
      invalidate();
      toast(`ลบ "${deleteTarget.name}" แล้ว`);
      setDeleteTarget(null);
    } catch (err) {
      toast(err.code === '23503'
        ? `ลบไม่ได้ เนื่องจากยังมีข้อมูลใช้งาน "${deleteTarget.name}" อยู่`
        : toThaiError(err, 'ลบไม่สำเร็จ'), 'error');
      setDeleteTarget(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-line p-4 sm:p-5">
      <h2 className="font-semibold flex items-center gap-2 mb-3"><Icon className="w-5 h-5 text-cobalt" /> {title}</h2>
      <form onSubmit={add} className="flex gap-2 mb-4">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={addPlaceholder} aria-label={`เพิ่ม${title}`} />
        <Button type="submit" loading={busy} disabled={!newName.trim()}><Plus className="w-4 h-4" /> เพิ่ม</Button>
      </form>

      {query.isLoading ? <LoadingState /> : query.isError ? (
        <ErrorState message={toThaiError(query.error)} onRetry={query.refetch} />
      ) : query.data.length === 0 ? (
        <EmptyState icon={Icon} title={`ยังไม่มี${title}`} hint={`พิมพ์ชื่อในช่องด้านบนแล้วกด เพิ่ม เพื่อสร้าง${title}แรก`} />
      ) : (
        <ul className="divide-y divide-line">
          {query.data.map((item) => (
            <li key={item.id} className="flex items-center gap-2 py-2">
              <span className="flex-1 text-sm">{item.name}</span>
              <button
                onClick={() => { setEditTarget(item); setEditName(item.name); }}
                aria-label={`เปลี่ยนชื่อ ${item.name}`}
                className="p-2 rounded-lg hover:bg-line/60"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeleteTarget(item)}
                aria-label={`ลบ ${item.name}`}
                className="p-2 rounded-lg hover:bg-coral/10 text-coral"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={Boolean(editTarget)} onClose={busy ? undefined : () => setEditTarget(null)} title={`เปลี่ยนชื่อ${title}`}>
        <Input value={editName} onChange={(e) => setEditName(e.target.value)} aria-label="ชื่อใหม่" />
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="secondary" onClick={() => setEditTarget(null)} disabled={busy}>ยกเลิก</Button>
          <Button onClick={rename} loading={busy} disabled={!editName.trim()}>บันทึก</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`ลบ${title}`}
        message={`ต้องการลบ "${deleteTarget?.name}" หรือไม่?\nถ้ายังมีการใช้งานอยู่จะลบไม่ได้`}
        confirmLabel="ลบ"
        danger
        loading={busy}
        onConfirm={remove}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  );
}

export default function SettingsPage() {
  const categories = useCategories();
  const departments = useDepartments();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">หมวดและแผนก</h1>
      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <TaxonomyPanel
          title="หมวดกิจกรรม" icon={Tags} query={categories} api={categoriesApi}
          queryKey="categories" addPlaceholder="เช่น ประเพณี, กีฬา"
        />
        <TaxonomyPanel
          title="แผนกวิชา" icon={Building2} query={departments} api={departmentsApi}
          queryKey="departments" addPlaceholder="ชื่อแผนกวิชา"
        />
      </div>
    </div>
  );
}