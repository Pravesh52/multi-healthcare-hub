import { useEffect } from 'react';
import { Mail, Phone, TriangleAlert } from 'lucide-react';
import Button from '@/components/common/Button.jsx';
import { APP_NAME, SUPPORT_PHONE } from '@/utils/constants.js';

const SUPPORT_EMAIL = (import.meta.env.VITE_SUPPORT_EMAIL || '').trim();

export default function Contact() {
  useEffect(() => {
    document.title = `Contact - ${APP_NAME}`;
  }, []);

  const hasContact = SUPPORT_PHONE || SUPPORT_EMAIL;

  return (
    <div className="container-page max-w-3xl space-y-6 py-8 sm:py-12">
      <header>
        <h1 className="text-3xl font-bold sm:text-4xl">Contact us</h1>
        <p className="mt-3 text-lg text-muted">Questions about your account, a booking or your clinic? Reach out to us.</p>
      </header>

      <section className="card space-y-3">
        <h2 className="text-xl font-bold">Support</h2>
        {SUPPORT_PHONE && (
          <p className="flex items-center gap-3">
            <Phone size={20} className="shrink-0 text-brand" aria-hidden="true" />
            <a href={`tel:${SUPPORT_PHONE}`} className="font-semibold text-brand hover:underline">
              {SUPPORT_PHONE}
            </a>
          </p>
        )}
        {SUPPORT_EMAIL && (
          <p className="flex items-center gap-3">
            <Mail size={20} className="shrink-0 text-brand" aria-hidden="true" />
            <a href={`mailto:${SUPPORT_EMAIL}`} className="break-all font-semibold text-brand hover:underline">
              {SUPPORT_EMAIL}
            </a>
          </p>
        )}
        {!hasContact && <p className="text-muted">Our support phone number and email will be added here soon.</p>}
      </section>

      <section className="card border-cross/40">
        <div className="flex items-start gap-3">
          <TriangleAlert size={24} className="mt-0.5 shrink-0 text-cross" aria-hidden="true" />
          <div>
            <h2 className="text-xl font-bold">In an emergency</h2>
            <p className="mt-1 text-muted">Please do not wait for a reply from us. Call for help right away.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button href="tel:108" variant="danger">
                Ambulance 108
              </Button>
              <Button href="tel:112" variant="danger">
                Police 112
              </Button>
              <Button to="/#helpline" variant="outline">
                All helplines
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="text-xl font-bold">Doctors and clinics</h2>
        <p className="mt-1 text-muted">Want to be listed on {APP_NAME}? Register and our team will verify your documents.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button to="/register/doctor">Register as a doctor</Button>
          <Button to="/register/clinic" variant="outline">
            Register a clinic or hospital
          </Button>
        </div>
      </section>
    </div>
  );
}