import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, Plus, Trash2, TriangleAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '@/components/common/Modal.jsx';
import Button from '@/components/common/Button.jsx';
import Badge from '@/components/common/Badge.jsx';
import Loader from '@/components/common/Loader.jsx';
import { ErrorState } from '@/components/common/EmptyState.jsx';
import { Input, Textarea } from '@/components/common/FormField.jsx';
import { getAppointment } from '@/services/appointment.service.js';
import { getPrescription, savePrescription } from '@/services/prescription.service.js';
import { getErrorMessage, getFieldErrors, getStatus } from '@/utils/apiError.js';
import { formatDate } from '@/utils/formatDate.js';

const LOCK_MS = 24 * 60 * 60 * 1000;
const MAX_MEDS = 20;
const DOSAGES = ['1-0-1', '1-1-1', '1-0-0', '0-0-1', '0-1-0', 'Once a day', 'Twice a day', 'SOS (only if needed)'];
const DURATIONS = ['3 days', '5 days', '7 days', '10 days', '15 days', '1 month'];

let counter = 0;
const newMed = (m = {}) => ({
  key: ++counter,
  name: m.name || '',
  dosage: m.dosage || '',
  duration: m.duration || '',
  notes: m.notes || '',
});

const allergyFor = (name, allergies) => {
  const n = name.trim().toLowerCase();
  if (n.length < 3) return null;
  return allergies.find((a) => {
    const x = a.toLowerCase();
    return n.includes(x) || (x.length >= 3 && x.includes(n));
  });
};

export default function PrescriptionForm({ open, appointmentId, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({ meds: {} });

  const apptQ = useQuery({
    queryKey: ['appt-detail', appointmentId],
    queryFn: () => getAppointment(appointmentId),
    enabled: open && !!appointmentId,
    staleTime: 60000,
    retry: false,
  });
  const rxQ = useQuery({
    queryKey: ['prescription', appointmentId],
    queryFn: () => getPrescription(appointmentId),
    enabled: open && !!appointmentId,
    retry: (count, err) => getStatus(err) !== 404 && count < 1,
  });

  const appt = apptQ.data?.appointment;
  const patient = appt?.patient;
  const allergies = patient?.medical?.allergies || [];
  const existing = rxQ.data?.prescription;
  const locked = !!existing && Date.now() - new Date(existing.createdAt).getTime() > LOCK_MS;
  const loadFailed = rxQ.isError && getStatus(rxQ.error) !== 404;

  useEffect(() => {
    if (!open) {
      setForm(null);
      setErrors({ meds: {} });
    }
  }, [open, appointmentId]);

  // Fill the form once, when we know whether a prescription already exists
  useEffect(() => {
    if (!open || form || rxQ.isLoading || loadFailed) return;
    setForm({
      diagnosis: existing?.diagnosis || '',
      advice: existing?.advice || '',
      followUpDate: existing?.followUpDate || '',
      medicines: (existing?.medicines?.length ? existing.medicines : [{}]).map(newMed),
    });
  }, [open, form, rxQ.isLoading, loadFailed, existing]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setMed = (key, patch) => set({ medicines: form.medicines.map((m) => (m.key === key ? { ...m, ...patch } : m)) });

  const save = useMutation({
    mutationFn: (body) => savePrescription(appointmentId, body),
    onSuccess: (d) => {
      toast.success(d.message || 'Prescription saved');
      queryClient.invalidateQueries({ queryKey: ['prescription', appointmentId] });
      onSaved?.();
      onClose();
    },
    onError: (err) => {
      const fields = getFieldErrors(err);
      setErrors({ meds: {}, general: Object.values(fields)[0] || getErrorMessage(err) });
    },
  });

  const submit = () => {
    const rows = form.medicines.filter((m) => m.name.trim() || m.dosage.trim() || m.duration.trim() || m.notes.trim());
    const e = { meds: {} };
    rows.forEach((m) => {
      if (m.name.trim().length < 2) e.meds[m.key] = 'Enter the medicine name (at least 2 letters)';
    });
    if (!form.diagnosis.trim() && !form.advice.trim() && !rows.some((m) => m.name.trim())) {
      e.general = 'Please add at least a diagnosis, a medicine or some advice.';
    }
    if (form.followUpDate && appt?.date && form.followUpDate < appt.date) {
      e.followUpDate = 'The follow-up date cannot be before the visit date';
    }
    setErrors(e);
    if (e.general || e.followUpDate || Object.keys(e.meds).length) return;

    const body = {
      medicines: rows.map((m) => ({
        name: m.name.trim(),
        ...(m.dosage.trim() && { dosage: m.dosage.trim() }),
        ...(m.duration.trim() && { duration: m.duration.trim() }),
        ...(m.notes.trim() && { notes: m.notes.trim() }),
      })),
    };
    if (form.diagnosis.trim()) body.diagnosis = form.diagnosis.trim();
    if (form.advice.trim()) body.advice = form.advice.trim();
    if (form.followUpDate) body.followUpDate = form.followUpDate;
    save.mutate(body);
  };

  const patientLine = [patient?.name, patient?.age ? `${patient.age} years` : null, patient?.gender].filter(Boolean).join(', ');

  return (
    <Modal
      open={open}
      onClose={save.isPending ? undefined : onClose}
      dismissible={!save.isPending}
      title={existing ? 'Prescription' : 'Write a prescription'}
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>
            {locked ? 'Close' : 'Cancel'}
          </Button>
          {!locked && (
            <Button loading={save.isPending} disabled={!form} onClick={submit}>
              {existing ? 'Update prescription' : 'Save prescription'}
            </Button>
          )}
        </>
      }
    >
      {rxQ.isLoading || (!form && !loadFailed) ? (
        <Loader label="Loading..." />
      ) : loadFailed ? (
        <ErrorState message={getErrorMessage(rxQ.error)} onRetry={() => rxQ.refetch()} />
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl bg-soft p-3 text-sm">
            <p className="font-bold">{patientLine || 'Patient'}</p>
            {appt?.date && <p className="text-muted">Visit on {formatDate(appt.date)}</p>}
            {(allergies.length > 0 || patient?.medical?.conditions?.length > 0 || patient?.medical?.bloodGroup) && (
              <div className="mt-2 flex flex-wrap gap-2">
                {patient.medical.bloodGroup && <Badge tone="info">Blood group {patient.medical.bloodGroup}</Badge>}
                {allergies.map((a) => (
                  <Badge key={a} tone="bad">
                    Allergy: {a}
                  </Badge>
                ))}
                {(patient.medical.conditions || []).map((c) => (
                  <Badge key={c} tone="warn">
                    {c}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {locked && (
            <p role="status" className="flex items-start gap-2 rounded-xl bg-warn-soft p-3 text-sm text-warn">
              <Lock size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              This prescription is locked. A prescription can be changed only within 24 hours of writing it.
            </p>
          )}

          <fieldset disabled={locked || save.isPending} className="space-y-4">
            <Textarea
              label="Diagnosis"
              rows={2}
              maxLength={500}
              value={form.diagnosis}
              onChange={(e) => set({ diagnosis: e.target.value })}
              placeholder="For example: Viral fever"
            />

            <div>
              <p className="label">Medicines</p>
              <datalist id="rx-dosages">
                {DOSAGES.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
              <datalist id="rx-durations">
                {DURATIONS.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>

              <ol className="space-y-3">
                {form.medicines.map((m, i) => {
                  const hit = allergyFor(m.name, allergies);
                  return (
                    <li key={m.key} className="rounded-xl border border-line p-3">
                      <div className="flex items-start gap-2">
                        <span className="mt-2 w-5 shrink-0 text-sm font-bold text-muted">{i + 1}.</span>
                        <div className="min-w-0 flex-1 space-y-2">
                          <Input
                            label="Medicine name"
                            value={m.name}
                            maxLength={100}
                            placeholder="For example: Paracetamol 500 mg"
                            onChange={(e) => setMed(m.key, { name: e.target.value })}
                            error={errors.meds[m.key]}
                          />
                          {hit && (
                            <p role="alert" className="flex items-start gap-2 rounded-lg bg-bad-soft p-2 text-sm font-semibold text-bad">
                              <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                              The patient is allergic to {hit}. Please check before you save.
                            </p>
                          )}
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Input
                              label="How often"
                              list="rx-dosages"
                              value={m.dosage}
                              maxLength={50}
                              placeholder="1-0-1"
                              onChange={(e) => setMed(m.key, { dosage: e.target.value })}
                            />
                            <Input
                              label="For how long"
                              list="rx-durations"
                              value={m.duration}
                              maxLength={50}
                              placeholder="5 days"
                              onChange={(e) => setMed(m.key, { duration: e.target.value })}
                            />
                          </div>
                          <Input
                            label="Note (optional)"
                            value={m.notes}
                            maxLength={150}
                            placeholder="For example: after food"
                            onChange={(e) => setMed(m.key, { notes: e.target.value })}
                          />
                        </div>
                        {form.medicines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => set({ medicines: form.medicines.filter((x) => x.key !== m.key) })}
                            aria-label={`Remove medicine ${i + 1}`}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-bad hover:bg-bad-soft"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>

              {form.medicines.length < MAX_MEDS && (
                <Button className="mt-2" variant="outline" size="sm" icon={Plus} onClick={() => set({ medicines: [...form.medicines, newMed()] })}>
                  Add another medicine
                </Button>
              )}
            </div>

            <Textarea
              label="Advice"
              rows={3}
              maxLength={1000}
              value={form.advice}
              onChange={(e) => set({ advice: e.target.value })}
              placeholder="Rest, drink plenty of water, avoid oily food..."
            />

            <Input
              label="Follow-up visit (optional)"
              type="date"
              min={appt?.date}
              value={form.followUpDate}
              onChange={(e) => set({ followUpDate: e.target.value })}
              error={errors.followUpDate}
              hint="The patient gets a reminder one day before."
            />
          </fieldset>

          {errors.general && (
            <p role="alert" className="rounded-xl bg-bad-soft p-3 text-sm font-medium text-bad">
              {errors.general}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}