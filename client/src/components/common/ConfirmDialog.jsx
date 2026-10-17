import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import { Textarea } from './FormField.jsx';

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  loading = false,
  askReason = false,
  reasonLabel = 'Reason',
  reasonMinLength = 3,
  onConfirm,
  onCancel,
}) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setTouched(false);
    }
  }, [open]);

  const tooShort = askReason && reason.trim().length < reasonMinLength;

  const submit = () => {
    if (tooShort) {
      setTouched(true);
      return;
    }
    onConfirm?.(askReason ? reason.trim() : undefined);
  };

  const confirmProps =
    tone === 'danger'
      ? { variant: 'none', className: 'border-bad bg-bad text-on-solid hover:opacity-90' }
      : { variant: 'primary' };

  return (
    <Modal
      open={open}
      onClose={onCancel}
      dismissible={!loading}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button {...confirmProps} onClick={submit} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message && <p className="text-muted">{message}</p>}
      {children}
      {askReason && (
        <Textarea
          className="mt-3"
          label={reasonLabel}
          required
          data-autofocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={300}
          error={touched && tooShort ? `Please write at least ${reasonMinLength} characters` : undefined}
        />
      )}
    </Modal>
  );
}