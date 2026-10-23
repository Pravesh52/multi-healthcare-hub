import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Modal from '@/components/common/Modal.jsx';
import Button from '@/components/common/Button.jsx';
import StarRating from '@/components/common/StarRating.jsx';
import { Textarea } from '@/components/common/FormField.jsx';
import { createReview } from '@/services/review.service.js';
import { getErrorMessage, getStatus } from '@/utils/apiError.js';
import { markReviewed } from '@/utils/appointment.js';
import { formatDate } from '@/utils/formatDate.js';

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

export default function ReviewForm({ open, appointment, onClose, onDone }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setRating(0);
      setComment('');
      setError('');
    }
  }, [open, appointment?._id]);

  const finish = () => {
    markReviewed(appointment._id);
    queryClient.invalidateQueries({ queryKey: ['recent-reviews'] });
    queryClient.invalidateQueries({ queryKey: ['reviews'] });
    onDone?.();
  };

  const submit = useMutation({
    mutationFn: () =>
      createReview({ appointmentId: appointment._id, rating, comment: comment.trim() || undefined }),
    onSuccess: () => {
      toast.success('Thank you for your feedback');
      finish();
    },
    onError: (err) => {
      if (getStatus(err) === 409) {
        toast('You have already reviewed this visit.', { icon: 'ℹ️' });
        finish();
      } else {
        setError(getErrorMessage(err));
      }
    },
  });

  const send = () => {
    if (!rating) {
      setError('Please choose a rating from 1 to 5 stars.');
      return;
    }
    setError('');
    submit.mutate();
  };

  const doctorName = appointment?.doctor?.user?.name || 'your doctor';

  return (
    <Modal
      open={open}
      onClose={submit.isPending ? undefined : onClose}
      dismissible={!submit.isPending}
      title="Rate your visit"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submit.isPending}>
            Not now
          </Button>
          <Button loading={submit.isPending} onClick={send}>
            Submit review
          </Button>
        </>
      }
    >
      {appointment && (
        <p className="text-muted">
          How was your visit with <b className="text-ink">{doctorName}</b> on {formatDate(appointment.date)}?
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StarRating value={rating} onChange={setRating} label="Your rating" />
        <span className="min-w-[5rem] font-semibold">{LABELS[rating]}</span>
      </div>

      <Textarea
        className="mt-3"
        label="Tell others about your visit (optional)"
        placeholder="Was the doctor kind? Was the waiting time short?"
        maxLength={500}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        hint={`${comment.length}/500. Only your first name is shown with your review.`}
      />

      {error && (
        <p role="alert" className="field-error mt-2">
          {error}
        </p>
      )}
    </Modal>
  );
}