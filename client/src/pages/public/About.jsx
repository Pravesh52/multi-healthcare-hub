import { useEffect } from 'react';
import { CalendarCheck, FileText, ListOrdered, Search, ShieldCheck } from 'lucide-react';
import Button from '@/components/common/Button.jsx';
import { APP_NAME } from '@/utils/constants.js';

const STEPS = [
  { icon: Search, title: '1. Find', text: 'Choose your state and district, or use Near me, to see verified clinics and doctors.' },
  { icon: CalendarCheck, title: '2. Request', text: 'Pick a day and a time slot. Your request goes to the doctor.' },
  { icon: FileText, title: '3. Get your receipt', text: 'When the doctor approves, you get a receipt with a QR code.' },
  { icon: ListOrdered, title: '4. Follow the queue', text: 'On the day, see how many people are ahead of you, live from your phone.' },
];

export default function About() {
  useEffect(() => {
    document.title = `About us - ${APP_NAME}`;
  }, []);

  return (
    <div className="container-page max-w-3xl space-y-8 py-8 sm:py-12">
      <header>
        <h1 className="text-3xl font-bold sm:text-4xl">About {APP_NAME}</h1>
        <p className="mt-3 text-lg text-muted">
          {APP_NAME} helps people find nearby verified doctors and clinics, book an appointment without standing in a
          line, and follow their turn live.
        </p>
      </header>

      <section>
        <h2 className="text-2xl font-bold">Why we built it</h2>
        <p className="mt-2 text-muted">
          In many towns, patients wait for hours without knowing when their turn will come. Clinics write names in a
          register, prescriptions get lost, and people who do not turn up waste the doctor&apos;s time. We wanted a
          simple tool that works on any phone and helps small clinics as much as big hospitals.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold">How it works for patients</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {STEPS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-soft text-brand">
                <Icon size={22} aria-hidden="true" />
              </span>
              <h3 className="mt-3 text-lg font-bold">{title}</h3>
              <p className="mt-1 text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold">For doctors and clinics</h2>
        <p className="mt-2 text-muted">
          Register with your documents. After our team verifies them, you appear in search. You can then approve or
          reject requests, call the next patient with one tap, press Done when the visit ends, write prescriptions, and
          see how your day went.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button to="/register/doctor">Register as a doctor</Button>
          <Button to="/register/clinic" variant="outline">
            Register a clinic or hospital
          </Button>
        </div>
      </section>

      <section className="card bg-soft">
        <div className="flex items-start gap-3">
          <ShieldCheck size={28} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
          <div>
            <h2 className="text-xl font-bold">Trust and safety</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
              <li>Every doctor and clinic is checked by our team before it appears in search.</li>
              <li>Doctor certificates and clinic licences are private. Only our team can open them.</li>
              <li>Your prescription is visible only to you and the doctor who wrote it.</li>
              <li>You can see who looked at your information, from your dashboard.</li>
              <li>You can review a doctor only after a completed visit.</li>
            </ul>
          </div>
        </div>
      </section>

      <p className="text-sm text-muted">
        {APP_NAME} does not replace a doctor&apos;s advice. In an emergency, call 108 or 112.
      </p>
    </div>
  );
}