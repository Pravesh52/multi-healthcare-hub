import { useEffect } from 'react';
import { APP_NAME } from '@/utils/constants.js';

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
      <div className="mt-2 space-y-2 text-muted">{children}</div>
    </section>
  );
}

const List = ({ items }) => (
  <ul className="list-disc space-y-1 pl-5">
    {items.map((i) => (
      <li key={i}>{i}</li>
    ))}
  </ul>
);

export default function Privacy() {
  useEffect(() => {
    document.title = `Privacy policy - ${APP_NAME}`;
  }, []);

  return (
    <div className="container-page max-w-3xl space-y-7 py-8 sm:py-12">
      <header>
        <h1 className="text-3xl font-bold sm:text-4xl">Privacy policy</h1>
        <p className="mt-2 text-sm text-muted">Last updated: October 2026</p>
        <p className="mt-3 text-lg text-muted">
          Your health information is private. This page explains in simple words what {APP_NAME} collects, who can see
          it and how we protect it.
        </p>
      </header>

      <Section title="What we collect">
        <p>
          <b className="text-ink">Patients:</b>
        </p>
        <List
          items={[
            'Mobile number, name, age and gender.',
            'Blood group, allergies and past conditions, only if you add them.',
            'Your appointments, the reason you type for a visit, and prescriptions written by your doctor.',
            'Reviews you write.',
          ]}
        />
        <p>
          <b className="text-ink">Doctors:</b> name, email, gender, speciality, qualification, medical registration number,
          fees, schedule, photo and a medical certificate.
        </p>
        <p>
          <b className="text-ink">Clinics:</b> owner name, email, clinic name, registration number, phone, address, map
          location, timings, photos and a licence document.
        </p>
      </Section>

      <Section title="How we use it">
        <List
          items={[
            'To run bookings, the live queue, receipts and prescriptions.',
            'To verify doctors and clinics before they appear in search.',
            'To show notifications inside the app.',
            'To keep the service safe, for example by recording who looked at patient information.',
          ]}
        />
        <p>We do not sell your information.</p>
      </Section>

      <Section title="Who can see your information">
        <List
          items={[
            'Prescriptions: only you and the doctor who wrote them.',
            'Your doctor: your name, age, gender, mobile number, and your allergies and conditions, for appointments booked with them.',
            'A clinic: the appointments booked at that clinic. A clinic cannot see your allergies or conditions.',
            'Our admin team: can manage accounts and review appointment records for safety. They cannot read prescriptions or medical history.',
            'Everyone: a doctor or clinic public profile (name, speciality, address, timings, ratings). Reviews show only the first name of the patient.',
          ]}
        />
        <p>You can see who looked at your information in the Access log on your dashboard.</p>
      </Section>

      <Section title="How we protect it">
        <List
          items={[
            'Login codes (OTP) are short-lived and are stored in a scrambled form, not as plain numbers.',
            'Login sessions are short, and each role can only open its own pages.',
            'Doctor certificates and clinic licences are private files, opened only through temporary links, and every look is recorded.',
            'We limit repeated login and OTP attempts to stop misuse.',
          ]}
        />
      </Section>

      <Section title="Cookies and storage">
        <p>
          A secure cookie keeps you logged in. Your browser also remembers your light or dark theme and a note that you
          are logged in. We do not use advertising cookies.
        </p>
      </Section>

      <Section title="Other services we use">
        <p>
          To run the app we use services for the database, temporary data, file storage, SMS (for login codes), online
          payments when they are turned on, and map tiles when a map is shown. They receive only what they need to do
          their job.
        </p>
      </Section>

      <Section title="Your choices">
        <p>
          You can update your name, age, gender, blood group, allergies and conditions from your profile. To correct or
          delete your information, or to close your account, please contact us from the Contact page.
        </p>
      </Section>

      <Section title="Not for emergencies">
        <p>
          {APP_NAME} does not replace a doctor&apos;s advice. In an emergency, call 108 (ambulance) or 112 (police) at
          once.
        </p>
      </Section>
    </div>
  );
}