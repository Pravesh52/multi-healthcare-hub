import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, ImagePlus } from 'lucide-react';
import clsx from 'clsx';
import Button from '@/components/common/Button.jsx';

const ELEMENT_ID = 'clinic-qr-reader';
const REPEAT_MS = 4000;

const cameraMessage = (err) => {
  const text = String(err?.name || err?.message || err || '');
  if (/NotAllowed|Permission/i.test(text)) {
    return 'Camera permission is blocked. Click the lock icon next to the address bar, allow the camera, and try again.';
  }
  if (/NotFound|Devices/i.test(text)) return 'No camera was found on this device.';
  if (/NotReadable|TrackStart/i.test(text)) return 'The camera is being used by another app. Close it and try again.';
  return 'The camera could not be started. You can scan from a photo instead, or use Check in from the list below.';
};

export default function QrScanner({ onScan, disabled = false }) {
  const scannerRef = useRef(null);
  const lastRef = useRef({ text: '', at: 0 });
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan; // always the latest function, so the camera never uses an old one

  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState('');

  const stop = useCallback(async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (s) {
      try {
        await s.stop();
      } catch {
        /* it was not running */
      }
      try {
        await s.clear();
      } catch {
        /* nothing to clear */
      }
    }
    setRunning(false);
  }, []);

  // Never leave the camera on when the page is closed
  useEffect(
    () => () => {
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        Promise.resolve(s.stop())
          .catch(() => {})
          .finally(() => Promise.resolve(s.clear()).catch(() => {}));
      }
    },
    []
  );

  const handleDecoded = useCallback((text) => {
    const now = Date.now();
    if (text === lastRef.current.text && now - lastRef.current.at < REPEAT_MS) return;
    lastRef.current = { text, at: now };
    onScanRef.current?.(text);
  }, []);

  const start = async () => {
    setError('');
    if (!window.isSecureContext) {
      setError('The camera works only on secure pages (https or localhost).');
      return;
    }
    setStarting(true);
    const scanner = new Html5Qrcode(ELEMENT_ID, { verbose: false });
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (w, h) => {
            const size = Math.floor(Math.min(w, h) * 0.7);
            return { width: size, height: size };
          },
        },
        handleDecoded,
        () => {} // "no QR in this frame" is normal, not an error
      );
      setRunning(true);
    } catch (err) {
      scannerRef.current = null;
      try {
        await scanner.clear();
      } catch {
        /* nothing to clear */
      }
      setError(cameraMessage(err));
    } finally {
      setStarting(false);
    }
  };

  const scanPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setPhotoBusy(true);
    const scanner = new Html5Qrcode(ELEMENT_ID, { verbose: false });
    try {
      const text = await scanner.scanFile(file, false);
      await onScanRef.current?.(text);
    } catch {
      setError('No QR code was found in this photo. Please try a clearer, closer photo.');
    } finally {
      try {
        await scanner.clear();
      } catch {
        /* nothing to clear */
      }
      setPhotoBusy(false);
    }
  };

  return (
    <div>
      <div
        id={ELEMENT_ID}
        className={clsx('overflow-hidden rounded-xl border border-line bg-black', running ? 'min-h-[260px]' : 'h-0 border-0')}
      />

      {!running && (
        <div className="rounded-xl border-2 border-dashed border-line p-5 text-center">
          <Camera size={36} className="mx-auto text-brand" aria-hidden="true" />
          <p className="mt-2 font-semibold">Scan the QR code on the patient&apos;s receipt</p>
          <p className="text-sm text-muted">The patient is checked in and joins the queue at once.</p>
        </div>
      )}
      {running && <p className="mt-2 text-center text-sm text-muted">Hold the QR code inside the square.</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {running ? (
          <Button variant="danger" icon={CameraOff} onClick={stop}>
            Stop camera
          </Button>
        ) : (
          <Button icon={Camera} loading={starting} disabled={disabled} onClick={start}>
            Start camera
          </Button>
        )}
        {!running && (
          <label
            className={clsx(
              'btn btn-outline cursor-pointer focus-within:ring-2 focus-within:ring-amber-500',
              (photoBusy || disabled) && 'pointer-events-none opacity-50'
            )}
          >
            <ImagePlus size={18} aria-hidden="true" />
            {photoBusy ? 'Reading...' : 'Scan from a photo'}
            <input type="file" accept="image/*" className="sr-only" onChange={scanPhoto} disabled={photoBusy || disabled} />
          </label>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 rounded-xl bg-bad-soft p-3 text-sm font-medium text-bad">
          {error}
        </p>
      )}
    </div>
  );
}