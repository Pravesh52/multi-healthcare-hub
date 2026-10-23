import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Download, Eye, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import Badge from '@/components/common/Badge.jsx';
import Button from '@/components/common/Button.jsx';
import Pagination from '@/components/common/Pagination.jsx';
import EmptyState, { ErrorState } from '@/components/common/EmptyState.jsx';
import { Skeleton } from '@/components/common/Loader.jsx';
import { PrescriptionModal } from '@/components/patient/PrescriptionView.jsx';
import useLiveRefresh from '@/hooks/useLiveRefresh.js';
import { downloadPrescriptionPdf, listMyPrescriptions } from '@/services/prescription.service.js';
import { getErrorMessage } from '@/utils/apiError.js';
import { formatDate, todayIST } from '@/utils/formatDate.js';
import { APP_NAME } from '@/utils/constants.js';

export default function Prescriptions() {
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const today = todayIST();

  useEffect(() => {
    document.title = `My prescriptions - ${APP_NAME}`;
  }, []);
  useLiveRefresh(['my-rx']);

  const q = useQuery({
    queryKey: ['my-rx', 'list', page],
    queryFn: () => listMyPrescriptions({ page, limit: 10 }),
    placeholderData: keepPreviousData,
  });
  const list = q.data?.prescriptions ?? [];

  const download = async (r) => {
    setDownloading(r.id);
    try {
      await downloadPrescriptionPdf(r.appointmentId, r.date);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">My prescriptions</h1>
        <p className="text-muted">Written by your doctors after a visit. Only you and the doctor who wrote it can see them.</p>
      </div>

      {q.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : q.isError && !q.data ? (
        <ErrorState message={getErrorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : list.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={FileText}
            title="No prescriptions yet"
            message="After a visit, your doctor's prescription appears here."
            action={<Button to="/patient/appointments">My appointments</Button>}
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((r) => (
            <li key={r.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-lg font-bold">{r.doctorName}</p>
                  <p className="text-sm text-muted">
                    {r.speciality} · {formatDate(r.date)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="info">
                    {r.medicineCount} {r.medicineCount === 1 ? 'medicine' : 'medicines'}
                  </Badge>
                  {r.followUpDate && (
                    <Badge tone={r.followUpDate >= today ? 'warn' : 'info'}>
                      Follow-up {formatDate(r.followUpDate)}
                    </Badge>
                  )}
                </div>
              </div>
              {r.diagnosis && <p className="mt-2 break-words text-muted">Diagnosis: {r.diagnosis}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" icon={Eye} onClick={() => setOpenId(r.appointmentId)}>
                  View
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={Download}
                  loading={downloading === r.id}
                  onClick={() => download(r)}
                >
                  PDF
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={q.data?.page ?? page}
        pages={q.data?.pages ?? 1}
        onChange={(p) => {
          setPage(p);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      <PrescriptionModal open={!!openId} appointmentId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}