import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Modal from '@/components/common/Modal.jsx';
import Button from '@/components/common/Button.jsx';
import Loader from '@/components/common/Loader.jsx';
import { ErrorState } from '@/components/common/EmptyState.jsx';
import SlotPicker from '@/components/booking/SlotPicker.jsx';
import { getDoctor } from '@/services/doctor.service.js';
import { rescheduleAppointment } from '@/services/appointment.service.js';
import { getErrorMessage, getStatus } from '@/utils/apiError.js';
import { formatTime, relativeDay } from '@/utils/formatDate.js';

export default function RescheduleModal({ open, appointment, onClose, onDone }) {
  const queryClient = useQueryClient();
  const doctorId = appointment?.doctor?._id;
  const [sel, setSel] = useState({ date: '', slot: '' });

  useEffect(() => {
    if (open) setSel({ date: '', slot: '' });
  }, [open, appointment?._id]);

  const doctorQ = useQuery({
    queryKey: ['doctor', doctorId],
    queryFn: () => getDoctor(doctorId),
    enabled: open && !!doctorId,
  });
  const doctor = doctorQ.data?.doctor;

  const mutate = useMutation({
    mutationFn: () => rescheduleAppointment(appointment._id, { date: sel.date, slot: sel.slot }),
    onSuccess: (d) => {
      toast.success(d.message || 'Done');
      queryClient.invalidateQueries({ queryKey: ['my-appts'] });
      queryClient.invalidateQueries({ queryKey: ['slots', doctorId] });
      onDone?.();
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
      if ([400, 409].includes(getStatus(err))) {
        queryClient.invalidateQueries({ queryKey: ['slots', doctorId] });
        setSel((s) => ({ ...s, slot: '' }));
      }
    },
  });

  const approved = appointment?.status === 'approved';
  const name = appointment?.doctor?.user?.name || 'the doctor';

  return (
    <Modal
      open={open}
      onClose={mutate.isPending ? undefined : onClose}
      dismissible={!mutate.isPending}
      title="Change the time"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutate.isPending}>
            Keep the current time
          </Button>
          <Button loading={mutate.isPending} disabled={!sel.date || !sel.slot} onClick={() => mutate.mutate()}>
            {sel.slot ? `Move to ${relativeDay(sel.date)}, ${formatTime(sel.slot)}` : 'Choose a new time'}
          </Button>
        </>
      }
    >
      {appointment && (
        <p className="mb-3 rounded-xl bg-soft p-3 text-sm">
          Now: <b>{relativeDay(appointment.date)}, {formatTime(appointment.slot)}</b> with {name}.{' '}
          {approved
            ? 'Your current appointment stays until the doctor approves the new time. If the doctor approves it, the old one is cancelled.'
            : 'Your request will move to the new time and the doctor will see it.'}
        </p>
      )}

      {doctorQ.isLoading ? (
        <Loader label="Loading the doctor's timings..." />
      ) : doctorQ.isError ? (
        <ErrorState message={getErrorMessage(doctorQ.error)} onRetry={() => doctorQ.refetch()} />
      ) : doctor ? (
        <SlotPicker
          doctorId={doctor._id}
          schedule={doctor.schedule || []}
          leaveDates={doctor.leaveDates || []}
          unavailableToday={doctor.unavailableToday}
          clinicOffDays={doctor.clinic?.timings?.offDays || []}
          value={sel}
          onChange={setSel}
        />
      ) : null}
    </Modal>
  );
}