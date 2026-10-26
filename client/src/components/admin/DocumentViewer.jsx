import { useEffect, useState } from 'react';
import { ExternalLink, FileText } from 'lucide-react';
import Modal from '@/components/common/Modal.jsx';
import Button from '@/components/common/Button.jsx';
import Loader from '@/components/common/Loader.jsx';
import { ErrorState } from '@/components/common/EmptyState.jsx';
import { getErrorMessage } from '@/utils/apiError.js';

const IMAGE = ['jpg', 'jpeg', 'png', 'webp'];

// load: async () => ({ url, format, expiresInSeconds })
export default function DocumentViewer({ open, title, load, onClose }) {
  const [state, setState] = useState({ status: 'idle' });
  const [left, setLeft] = useState(0);
  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setState({ status: 'loading' });
    setPreviewFailed(false);
    load()
      .then((d) => {
        if (cancelled) return;
        setState({ status: 'ready', url: d.url, format: String(d.format || '').toLowerCase() });
        setLeft(d.expiresInSeconds || 300);
      })
      .catch((err) => !cancelled && setState({ status: 'error', message: getErrorMessage(err) }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (state.status !== 'ready') return undefined;
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [state.status]);

  const expired = state.status === 'ready' && left === 0;
  const isImage = IMAGE.includes(state.format);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {state.status === 'ready' && !expired && (
            <Button href={state.url} target="_blank" rel="noreferrer" icon={ExternalLink}>
              Open document
            </Button>
          )}
        </>
      }
    >
      {state.status === 'loading' && <Loader label="Getting a secure link..." />}
      {state.status === 'error' && <ErrorState message={state.message} />}

      {state.status === 'ready' && (
        <div>
          <p className={`mb-3 rounded-lg p-2 text-sm font-medium ${expired ? 'bg-bad-soft text-bad' : 'bg-soft'}`}>
            {expired
              ? 'This link has expired. Close this window and open the document again.'
              : `This private link works for ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} more. Opening it is recorded in the audit log.`}
          </p>

          {!expired && isImage && !previewFailed ? (
            <img
              src={state.url}
              alt={title}
              referrerPolicy="no-referrer"
              onError={() => setPreviewFailed(true)}
              className="mx-auto max-h-[60vh] w-auto max-w-full rounded-lg border border-line object-contain"
            />
          ) : (
            !expired && (
              <div className="flex flex-col items-center gap-2 py-6 text-center text-muted">
                <FileText size={44} className="text-brand" aria-hidden="true" />
                <p>{isImage ? 'The preview could not be shown here.' : 'This is a PDF file.'}</p>
                <p className="text-sm">Use the Open document button to see it in a new tab.</p>
              </div>
            )
          )}
        </div>
      )}
    </Modal>
  );
}