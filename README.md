# MultiHealth Care Hub

A web platform where patients find nearby verified clinics and doctors, book an appointment, and follow a live queue. A doctor must approve every request, and the receipt is issued only after approval.

> **Status:** backend is complete. The React frontend is not built yet.

## What it does

- **Four roles:** patient, doctor, clinic, admin. Doctors and clinics are verified by an admin (documents are private) before they appear in search.
- **Search:** by state and district, by name, speciality, gender and fees, and a "near me" search with distance.
- **Booking:** slots come from the doctor's schedule. A request stays *pending* until the doctor approves, rejects, or it expires after 24 hours. Two people cannot take the same slot (unique database index).
- **Receipt:** PDF with a signed QR code, available only after approval.
- **Live queue:** QR check-in, Call Next, Done, Skip, Emergency, Pause, walk-in tokens, and a wait-time estimate from recent visits. Only one patient can be inside at a time.
- **Real time:** Socket.io pushes queue changes and notifications to the app.
- **Also:** prescriptions (PDF), reviews with ratings, reschedule, patient medical profile, audit log of who viewed a patient's data, clinic and doctor analytics, follow-up reminders, Razorpay payments with webhook verification.
- **SMS is used only for login OTP.** Everything else is an in-app notification.

## Tech stack

Node.js, Express, MongoDB (Mongoose), Redis (ioredis, BullMQ), Socket.io, JWT, Zod, Razorpay, Cloudinary, PDFKit, Jest and Supertest.

## Getting started

Requirements: Node.js 20 or newer, a MongoDB Atlas database, a Redis database (for example Upstash).

```bash
cd server
npm install
cp .env.example .env     # on Windows: copy .env.example .env
# fill in the values in .env, then:
npm run seed             # creates the admin and demo data (development only)
npm run dev              # http://localhost:5000/api/v1/health
```

### Environment variables

| Name | Needed | Meaning |
|---|---|---|
| `MONGO_URI` | yes | MongoDB connection string |
| `REDIS_URL` | yes | Redis URL (use `rediss://` for Upstash) |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | yes | Two different random secrets |
| `OTP_DEV_MODE` | no | `true` prints the OTP in the terminal instead of sending an SMS |
| `JOBS_IN_SERVER` | no | `true` runs background jobs inside the server |
| `CLOUDINARY_*` | for uploads | Document and photo upload |
| `RAZORPAY_*` | for payments | Test keys are enough for development |

Never commit `.env`.

### Scripts (inside `server/`)

| Command | What it does |
|---|---|
| `npm run dev` | Start the server with auto restart |
| `npm start` | Start the server |
| `npm run worker` | Run background jobs alone (do not use together with `JOBS_IN_SERVER=true`) |
| `npm run seed` | Create the admin and demo data. `-- --fresh` rebuilds the demo visits |
| `npm test` | Run the tests (they use a temporary in-memory database, never your real one) |

## API overview

All routes start with `/api/v1`.

| Area | Routes |
|---|---|
| Auth | `/auth/patient/send-otp`, `/auth/patient/verify-otp`, `/auth/doctor/signup`, `/auth/clinic/signup`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me` |
| Search | `/locations`, `/clinics`, `/doctors`, `/doctors/:id/slots?date=` |
| Booking | `/appointments` (create, list, cancel, reschedule, approve, reject) |
| Queue | `/queue/doctors/:id/live`, `/queue/doctors/:id/call-next`, `/queue/appointments/:id/done`, `/queue/check-in`, `/queue/walk-in`, `/queue/me` |
| Documents | `/receipts/:appointmentId`, `/prescriptions/...`, `/reviews/...` |
| Patient | `/patients/me`, `/patients/me/access-log`, `/notifications` |
| Admin | `/admin/stats`, `/admin/doctors`, `/admin/clinics` (verify, reject, view documents) |
| Analytics | `/clinics/me/analytics`, `/doctors/me/analytics` |
| Payments | `/payments/order`, `/payments/verify`, `/payments/webhook` |

## Security notes

- OTPs are stored as hashes with a short expiry, a cooldown, and a limit on wrong tries.
- Access tokens last 15 minutes. The refresh token is an httpOnly cookie and is rotated.
- Doctor certificates and clinic licences are private files, opened only through a 5 minute link that is written to the audit log.
- A patient's prescription is visible only to that patient and their doctor.
- Payment signatures are verified on the server, never trusted from the browser.

## Not done yet

- React frontend (login, home, dashboards, live queue, map)
- PWA and web push notifications
- Family members under one account
- A real SMS provider for OTP, and HTTPS and deployment
- Docker and CI