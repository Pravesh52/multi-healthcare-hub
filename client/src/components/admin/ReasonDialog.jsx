import ConfirmDialog from '@/components/common/ConfirmDialog.jsx';

export default function ReasonDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  reasonLabel = 'Reason',
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <ConfirmDialog
      open={open}
      title={title}
      message={message}
      confirmLabel={confirmLabel}
      tone="danger"
      askReason
      reasonLabel={reasonLabel}
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}