# GNDEC Training & Placement Portal — architecture and delivery plan

## Repository audit

The workspace was empty at the start of this work: no app source, dependency manifest, Git metadata, database connection, authentication, environment sample, or deployment configuration. Node.js 24 and npm 11 are available. The reference T&P site presents member/resource links, downloads, contact details and company/alumni invitations. Its content does not establish definitions or eligibility for TR-101 through TR-104, reporting rules, or verified program dates.

## Proposed architecture

- **Web:** Next.js App Router, React, strict TypeScript, Tailwind CSS v4, server components by default; client components only for interactive forms/tables/charts.
- **Authentication:** Auth.js credentials providers with server-side bcrypt verification, encrypted/signed eight-hour JWT cookies, role claims (`TEACHER`, `STUDENT`) and authorization helpers used in protected server pages/actions/route handlers. A student principal is re-resolved to one active student record in MongoDB on each protected request; data services accept that identity rather than arbitrary student IDs. Auth.js Credentials uses JWT sessions; a separate database session adapter would require a different sign-in design.
- **Data:** MongoDB Atlas/Mongoose. Server-only services own queries and domain rules; schemas define validation, timestamps, soft deletion and indexes.
- **Files:** private S3-compatible bucket (Cloudflare R2), random object keys, MIME/extension/size validation, short-lived signed downloads, metadata only in MongoDB.
- **Forms and exports:** Zod + React Hook Form; server-side paginated TanStack tables; CSV generation first, with Excel/PDF added when requested and dependency choice is justified.
- **Operations:** Vercel-compatible route handlers and scheduled cron endpoint protected by a secret; notifications use idempotency keys and Resend. Cron and notifications are optional until provider credentials and deployment schedules are configured.

## Data model

| Collection | Main fields and relationships | Important indexes |
|---|---|---|
| `users` | normalized login identifier, password hash, role, status, optional student/faculty ref | unique normalized identifier; role/status |
| `students` | user ref, name, roll number, registration number, email, department, semester, CGPA, contact, status, soft-delete timestamp | unique roll number; department/semester; text/search fields |
| `faculty` | user ref, name, email, permissions, status | unique user; permissions |
| `trainings` | code (`TR-101`…`TR-104`), configurable name/description, date range, 15-day default frequency, active flag | unique code |
| `enrollments` | student ref, training ref, status, start/end overrides | unique student+training; training/status; student/status |
| `reportingPeriods` | training ref, sequence, start/end, due date, extension, status | unique training+sequence; due date/status |
| `reports` | enrollment, period, current status, submission metadata, revision history and review events | unique enrollment+period for current report; enrollment/status; period/status |
| `notifications` | recipient user, channel, type, payload, idempotency key, sent/read timestamps | unique idempotency key; recipient/read/created |
| `auditLogs` | actor, action, entity type/ref, safe metadata, timestamp | created time; entity+time; actor+time |
| `otpChallenges` | user/role, keyed OTP hash, attempt count, expiry, one-time consumption | unique user; TTL cleanup |
| `rateLimitBuckets` | keyed opaque account/IP bucket, window count, expiry | TTL cleanup |
| `systemSettings` | allowlisted operational key/value and updater | unique key |

References are used instead of copying student records into enrollments or reports. Report history is embedded as bounded revision/review events because it is read with a report; audit events remain separately queryable. Unique constraints and service-level transactions/compensation protect import and review consistency.

## Routes and navigation

- Public: `/`, `/about`, `/programs`, `/guidelines`, `/contact`.
- Auth: `/student/login`, `/faculty/login`, `/forgot-password`.
- Faculty: `/faculty/dashboard`, `/faculty/students`, `/faculty/students/new`, `/faculty/students/import`, `/faculty/trainings/TR-101` through `/faculty/trainings/TR-104`, `/faculty/notifications`, `/faculty/reports`, `/faculty/settings`.
- Student: `/student/dashboard`, `/student/training`, `/student/upload-report`, `/student/submissions`, `/student/notifications`, `/student/profile`.
- APIs/handlers: `/api/auth/*`, `/api/cron/reporting`, faculty student import/exports, student signed report upload and report download/review handlers; mutations use guarded server actions/route handlers.
- Faculty sidebar keeps the four training routes as distinct items. Each route reuses a common training module backed by a training code parameter and server-filtered records.

## Permission matrix

| Capability | Teacher | Student |
|---|---:|---:|
| Browse public content | Yes | Yes |
| View/manage student records | Permission-scoped | Own record only |
| Configure training and periods | Granted faculty permission | No |
| View reports | Authorized training scope | Own submissions only |
| Review/approve/reject | Granted faculty permission | No |
| Submit/resubmit report | No | Own enrollment and open period only |
| Access private PDF | Authorized training scope | Own report only |
| Export records | Granted faculty permission | No |

## Reporting workflow

Training configuration generates date-bounded reporting periods on the server, including a partial final period. Due dates default to period end and can be extended. Students submit a PDF to a private object key; the server validates ownership, enrollment, period state, size and MIME signature before recording metadata. Review transitions are validated server-side; rejection requires remarks and creates a new revision opportunity without erasing prior versions. A scheduled job processes due-date windows and overdue transitions idempotently, with in-app records and optional email delivery.

## Assumptions needing institutional confirmation

1. TR-101–TR-104 names, descriptions, eligibility, coordinators and program calendars are not supplied; current public copy is explicitly generic and configurable.
2. Default reporting period is 15 calendar days; due at period end. Timezone is Asia/Kolkata. Faculty can override dates and extensions.
3. One current enrollment per student+program, while schema permits multiple programs. Student import never changes existing records without an explicit edit flow.
4. Login identifiers: student `@gndec.ac.in` email and teacher Gmail address. Both password and OTP flows use the registered email.
5. File size limit should be configurable; initial proposed default is 10 MB, pending approval.
6. No real student/faculty records or official performance metrics will be seeded.

## External configuration required

MongoDB Atlas URI, Auth.js secret and production URL, private S3/R2 endpoint/bucket/credentials, Resend API key and verified sender, and deployment cron schedule/secret. `.env.example` records the names; no secrets are present. Domain/email policy, verified institutional content, and initial teacher provisioning method are still required for production rollout.

## Phase 2 implementation status

Implemented Mongoose models and indexes, cached MongoDB connection, teacher/student Auth.js credentials providers, eight-hour session configuration, login forms, protected faculty/student dashboards, server-side identity and permission guards, UI redirect proxy, hashed one-time password setup/reset primitives, controlled first-teacher provisioning, idempotent initial training seeder, and an explicit index synchronization command. The database has not yet been provisioned because no `MONGODB_URI` was supplied. Training records and teacher provisioning are scripts ready to run once configured; records have not been represented as live data.

Production uses `autoIndex: false` to avoid runtime index builds; run `npm run db:indexes` against the target database before enabling traffic. Index setup can uncover duplicate existing data that must be resolved deliberately.

## Phase 3 implementation status

Implemented the persistent faculty workspace shell, responsive/collapsible navigation, separate TR-101–TR-104 route trees, database-backed overview metrics and charts, per-training dashboard/statistics, server-paginated training and all-student lists, search/filter/sort/column controls, student profiles, permission-guarded CSV exports, report queues including overdue periods, recipient-scoped notifications, faculty profile/settings, and browser-local light/dark appearance. This phase established the read-only/reporting table baseline; the following implementation record covers subsequent create/import and report operations. Dashboard and student data queries honor each faculty account's training-code scope.

## Remaining development implementation status

- Auth.js includes teacher/student OTP and password providers. Student sign-in/registration requires `@gndec.ac.in`; teacher sign-in/provisioning requires a Gmail address. Both roles use their registered email for OTP and password. OTPs are six-digit cryptographic values; only keyed digests are stored, with atomic one-time consumption, attempt limits, cooldowns, account/IP rate limits, generic account responses, and delivery records that do not include codes. Student self-registration creates a pending account with a bcrypt password hash and activates it only after email OTP verification. Teacher self-registration remains unavailable. Resend delivery is unavailable until provider configuration is supplied.
- Student routes provide an ownership-scoped dashboard, training/period detail, upload, report history, notifications, help, and contact-only self-service profile editing. Faculty can create/edit students, change status, assign multiple training programs, inspect reporting history, and import up to 1,000 CSV/XLSX rows after row validation and preview. Import executes transactionally.
- Faculty can configure training details and reporting windows, extend deadlines, and close periods. Windows use Asia/Kolkata calendar dates and include a partial final window. Duplicate training/sequence records are not overwritten.
- Student PDF transfer uses a 120-second signed private-storage upload to a pending prefix. The server verifies storage metadata, owner, period, content type, signature and size before promoting the object to its permanent private key. Authorized reads redirect to 60-second signed URLs. A bucket lifecycle rule should remove abandoned `pending-uploads/` objects.
- Faculty can move reports into review, approve, reject, or request resubmission with required feedback. Revisions and review events remain in MongoDB; actions check the assigned training on the server. Report exports support CSV and Excel.
- A protected cron endpoint creates idempotent five-day, two-day, due-day and overdue in-app reminders and tracks Resend delivery attempts. Faculty settings configure allowed email domains, OTP limits, upload limit, reporting cadence, initial date, reminder email toggle, and editable training details. API/storage credentials remain environment-only.
- Controlled CLI commands provision the first teacher and update faculty access. The access updater requires an active, institution-wide training manager and writes the permission change and audit record in one Atlas transaction.
- A small Node test suite covers OTP crypto helpers, reporting-window calculation, review transitions and PDF signatures. This is not an integration or end-to-end suite.

## Verification and operational limits

`npx tsc --noEmit`, `npm run lint`, `npm test`, and `npm run build -- --webpack` pass in the current workspace. MongoDB Atlas, Resend delivery, R2/S3 uploads, signed downloads, scheduled production execution, and real teacher/student session flows are implemented but were not live-tested because credentials and institutional data were not configured. The `.env.example` file contains variable names only. Provider secrets should be rotated if they have ever been exposed outside the provider console.

Production requires Atlas transactions and a one-time index sync. Browser-to-bucket uploads require exact-origin CORS for PUT and the signed metadata headers. The scheduled route requires `CRON_SECRET`; `vercel.json` schedules it daily. Configure an explicit institutional retention policy before loading real student data. No PDF report binary is stored in MongoDB.

## Phased delivery plan

1. **Foundation and public experience** (implemented): scaffold, design system, institutional landing page, configuration documentation.
2. **Data and identity (implemented; integration verification pending):** Mongoose models/indexes, connection, Auth.js, role/permission services, controlled first teacher provisioning and training configuration commands.
3. **Faculty dashboard (implemented; database verification pending):** dashboard, training modules, paginated read-only tables, search, reports queue, notifications and exports. Student create/edit/import remain to be implemented.
4. **Training modules** (implemented; live database verification pending): scoped routes, student assignment management and period generation/extensions.
5. **Student portal and reports** (implemented; storage/database verification pending): owned student data, private PDF upload/download, history and review/resubmission.
6. **Notifications and analytics** (implemented; provider verification pending): scheduled reminders, in-app/email delivery tracking and CSV/Excel report exports.
7. **Production readiness** (partially verified): lint, types, unit tests, and Webpack production build pass; configured-service integration and browser E2E checks remain pending external credentials and an isolated test database.
