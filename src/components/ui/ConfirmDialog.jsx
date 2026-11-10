import Modal from './Modal.jsx';
import Button from './Button.jsx';

export default function ConfirmDialog({
  open, title, message, confirmLabel = 'ยืนยัน', danger = false, loading = false, onConfirm, onCancel,
}) {
  return (
    <Modal open={open} onClose={loading ? undefined : onCancel} title={title}>
      <p className="text-ink/80 whitespace-pre-line">{message}</p>
      <div className="flex gap-2 justify-end mt-5">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>ยกเลิก</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}