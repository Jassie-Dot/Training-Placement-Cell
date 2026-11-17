# GNDEC Training & Placement Portal

Next.js App Router portal for faculty-managed training assignments and student progress reporting. The existing public site, Auth.js credentials/password login, faculty dashboard, training dashboards, tables, charts, notifications, and student export paths are preserved and extended.

## Local setup

1. Use Node.js 20.9 or newer and run `npm install`.
2. Copy `.env.example` to `.env.local` and configure MongoDB Atlas and a long random `AUTH_SECRET`.
3. Configure a verified Resend sender and institutional email domains for student registration and email OTP.
4. Configure a private S3-compatible bucket (Cloudflare R2 is supported) for PDF reports. Do not enable public bucket access.
5. Run `npm run db:indexes`, `npm run seed:trainings`, and provision the first teacher with the controlled `npm run provision:teacher` command.
6. Run `npm run dev` and open `http://localhost:3000`.

The public pages render without third-party credentials. Authenticated pages and APIs fail closed if their database, email, or storage dependency is missing. No sample student or faculty records are created.

## Environment and setup commands

See `.env.example` for the full variable list. Required in production: `MONGODB_URI`, `AUTH_SECRET`, `AUTH_URL`, `APP_BASE_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `INSTITUTIONAL_EMAIL_DOMAINS`, `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, and `CRON_SECRET`. `INITIAL_REPORTING_DATE` and numeric policy variables provide defaults; authorized faculty can change operational settings in the portal. Secrets stay server-side and must never use a `NEXT_PUBLIC_` prefix.

- **MongoDB Atlas:** create an Atlas database user and restrict network access to the deployment’s required egress. Set `MONGODB_URI`; use the controlled `npm run db:indexes` command before production traffic. Atlas transactions require a replica set, which Atlas provides.
- **Trainings:** `npm run seed:trainings` creates TR-101 through TR-104 as inactive, generic records only when absent. Faculty can configure names, descriptions, dates, status, and reporting frequency. No official program details are invented.
- **First faculty account:** set `TEACHER_EMAIL`, `TEACHER_NAME`, and `TEACHER_INITIAL_PASSWORD` only in the process environment, then run `npm run provision:teacher`; never commit those values. Provisioning is not available through a public endpoint.
- **Faculty permissions:** use the controlled `npm run faculty:access` command with `ACCESS_ACTOR_EMAIL` (an institution-wide faculty manager), `TARGET_FACULTY_EMAIL`, `TARGET_PERMISSIONS`, and `TARGET_TRAINING_CODES`. The command validates scope, updates only faculty permissions/training codes, and records an audit event. Teacher self-registration and web privilege changes are not available.
- **Student registration:** students register from the Student section with their university details and a password. Student login uses the registered `@gndec.ac.in` address for both password and OTP sign-in. Duplicate roll numbers/emails are rejected without exposing whether an account exists. New accounts remain pending until email OTP verification; faculty still controls training assignments.
- **Teacher access:** teacher login and provisioning require a Gmail address. The Teacher section links to the controlled registration instructions; public teacher account creation is disabled.
- **Resend:** verify the sender domain, configure a sender such as an approved institutional address, and set `RESEND_API_KEY` and `EMAIL_FROM`. OTP delivery uses the configured institutional allowlist, which includes the required `gndec.ac.in` and `gmail.com` domains.
- **Private object storage:** configure an R2/S3-compatible private bucket and access key. Restrict bucket access to the portal service. Configure bucket CORS to permit `PUT` from the exact production portal origin with `Content-Type`, `Content-Length`, `x-amz-meta-studentid`, and `x-amz-meta-periodid` headers. Configure a lifecycle rule to remove abandoned objects under `pending-uploads/` after one day. Keep `reports/` private and exclude it from lifecycle deletion unless an approved retention policy is defined.
- **Vercel:** set the environment variables for Production and Preview as appropriate. Set `AUTH_URL` and `APP_BASE_URL` to the deployed origin. `vercel.json` schedules the protected reporting job daily; the cron request must send `Authorization: Bearer <CRON_SECRET>`.

## Student and reporting workflows

Faculty with `STUDENTS_WRITE` can create or edit student records, change account status, assign multiple training programs, and import up to 1,000 CSV/XLSX rows after preview and duplicate checks. Students may also register directly; their new account stays pending until one-time email verification succeeds. Student email sign-in uses the institutional address stored in the profile, and the sign-in form cannot change it. Self-registered students choose a password, but cannot assign their own training programs.

Students can view their own academic profile, training, deadlines, progress, notifications, and report history. They can edit only their contact number. Report PDFs upload directly to private storage using a short-lived signed PUT URL. The server checks stored object metadata, size, MIME type, PDF signature, student ownership, enrollment, and open deadline before saving report metadata. Downloads are authorized per student or training-scoped faculty and use short-lived signed GET links.

Faculty with `TRAININGS_MANAGE` configure dates and reporting periods, extend deadlines, close periods, and update system settings. `REPORTS_REVIEW` is required to review reports. Rejection and resubmission requests require feedback; each upload and review is retained in version/review history. Reminder generation is idempotent and supports five-day, two-day, deadline-day, and overdue notifications. Email delivery attempts and failures are tracked; in-app notices remain available when email sending is disabled or unavailable.

## Validation

Run `npm run lint`, `npx tsc --noEmit`, `npm test`, and `npm run build -- --webpack`. The built-in automated tests cover OTP generation/digest checks, date-window boundaries, review transitions, and PDF signatures. MongoDB/Resend/R2 integration and browser end-to-end verification require isolated service credentials and a configured test deployment; never point automated integration checks at production data.

## Operational notes

- Auth.js uses eight-hour encrypted/signed JWT sessions. Protected services re-check active account identity and current role/permission in MongoDB. Client role values and browser-supplied student IDs do not grant access.
- Faculty `trainingCodes` restrict list, profile, report, export, settings, and mutation services. A faculty account with an empty training code list receives institution-wide scope only when its explicit permissions allow the operation.
- The OTP endpoint does not reveal whether an account exists. It stores only a keyed OTP digest, consumes codes atomically, enforces attempts/cooldowns/rate limits, and logs no OTP value.
- Soft-deleted records and report revisions are retained for audit. Define institutional data retention and backup policies before real student records are loaded.
- See [ARCHITECTURE.md](./ARCHITECTURE.md) for schemas, routes, security boundaries, and known integration limits.
