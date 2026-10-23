import { useEffect, useState } from 'react';
import { CalendarX, RefreshCw } from 'lucide-react';
import LiveStatusCard from '@/components/patient/LiveStatusCard.jsx';
import ReceiptModal from '@/components/patient/ReceiptModal.jsx';
import Button from '@/components/common/Button.jsx';
import EmptyState, { ErrorState } from '@/components/common/EmptyState.jsx';
import { Skeleton } from '@/components/common/Loader.jsx';
import { usePatientQueue } from '@/hooks/useLiveQueue.js';
import useSocket from '@/hooks/useSocket.js';
import { formatDate, todayIST } from '@/utils/formatDate.js';
import { APP_NAME } from '@/utils/constants.js';

export default function LiveQueue() {
  const { items, loading, error, refresh } = usePatientQueue();
  const { connected } = useSocket();
  const [receiptId, setReceiptId] = useState(null);

  useEffect(() => {
    document.title = `Live queue - ${APP_NAME}`;
  }, []);

  const sorted = [...items].sort((a, b) => (a.slot || '').localeCompare(b.slot || ''));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Live queue</h1>
          <p className="text-muted">Today, {formatDate(todayIST())}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            role="status"
            className={`inline-flex items-center gap-2 text-sm font-semibold ${connected ? 'text-ok' : 'text-warn'}`}
          >
            <span className={connected ? 'live-dot' : 'inline-block h-2.5 w-2.5 rounded-full bg-warn'} />
            {connected ? 'Live updates are on' : 'Reconnecting...'}
          </span>
          <Button size="sm" variant="outline" icon={RefreshCw} onClick={refresh}>
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-56" />
      ) : error && items.length === 0 ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : sorted.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={CalendarX}
            title="You have no appointment today"
            message="When you have an approved appointment for today, your place in the queue appears here."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button to="/patient/appointments?status=approved">My approved appointments</Button>
                <Button to="/search" variant="outline">
                  Find a doctor
                </Button>
              </div>
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map((item) => (
            <LiveStatusCard key={item.appointmentId} item={item} onReceipt={setReceiptId} />
          ))}
        </div>
      )}

      <section className="card bg-soft" aria-label="How the queue works">
        <h2 className="text-lg font-bold">How it works</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
          <li>Reach the clinic and show the QR code of your receipt at the reception. This checks you in.</li>
          <li>The doctor calls patients one by one. Your number of people ahead goes down on this screen by itself.</li>
          <li>When it is your turn, this page turns green and you get a notification.</li>
        </ol>
        <p className="mt-2 text-sm text-muted">Keep this page open on your phone so that you do not miss your turn.</p>
      </section>

      <ReceiptModal open={!!receiptId} appointmentId={receiptId} onClose={() => setReceiptId(null)} />
    </div>
  );
}