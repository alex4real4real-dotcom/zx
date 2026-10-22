# Automatic identity verification

Status: database setup applied and tested, with automatic verification disabled. Edge Function and frontend are prepared for review and have not been published. Provider configuration and live validation are still required. No real identity documents have been used to test this code.

The hosted Didit journey collects the identity document first, then a live selfie. Document authenticity, liveness and face matching must all pass. An authoritative declined face verdict rejects the request immediately; uncertain captures request another attempt. No site-admin approval is used for these requests.

## Provider setup

Create a Didit business application and a **live User Verification/KYC workflow** with exactly the intended ID Verification → Liveness → Face Match path. Configure supported national ID documents for your users, including Saudi IDs if required, in the provider console. Confirm document coverage with the provider before activation. Require fresh document and live camera captures; do not enable portrait reuse, gallery-only authentication, manual approval, bypass paths, demographic analysis, age estimation, AML or unrelated checks for this workflow. Use the provider's matching and capture-quality verdicts, not a locally invented similarity percentage.

Set these secrets in Supabase's Edge Function secrets settings, never in frontend files or chat:

- `DIDIT_API_KEY`: live application's API key.
- `DIDIT_WORKFLOW_ID`: workflow UUID.
- `DIDIT_ID_NODE_ID`, `DIDIT_LIVENESS_NODE_ID`, `DIDIT_FACE_NODE_ID`: exact node IDs from that workflow. Missing or duplicate reports cannot approve a request.
- `DIDIT_WEBHOOK_SECRET`: the signing secret of a webhook destination subscribed to `status.updated`.
- `IDENTITY_RETURN_URL`: `https://alex4real4real-dotcom.github.io/zx/verify.html`.
- `IDENTITY_MODE=live` and `IDENTITY_ENABLED=true` only after live configuration and provider testing are complete.

The runtime supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Never copy the service key into site files. Configure a finite media/biometric retention period and the site's privacy contact in the provider account before collecting production data. The page provides separate explicit consent and a data-use notice; actual retention and deletion are controlled by the provider account and site operator.

## Deployment order

1. `supabase/automatic-identity.sql` was applied after `supabase/admin.sql` in the connected project. It leaves the service disabled in `account_identity_private.settings`. For a new project, apply both scripts in that order.
2. Deploy `account-identity` with `index.ts`, `handler.mjs`, and `provider.mjs`. Set `verify_jwt=false`: user endpoints validate the bearer token using Supabase Auth; the webhook verifies the full-payload HMAC V2 signature, signed timestamp, age and destination secret.
3. Set the provider webhook destination to `https://zsbhldxeaihrjcvygdcx.supabase.co/functions/v1/account-identity/webhook`. Browser return URLs do not approve identities. Test webhooks are deliberately ignored; they cannot grant live seller permissions.
4. Publish the frontend and confirm disabled, retry, mismatch and successful journeys using the provider's isolated test environment first. Sandbox keys must never be wired to the production database. This production handler deliberately requires `IDENTITY_MODE=live`; use a separate Supabase test project for provider sandbox testing.
5. Configure live secrets and enable `account_identity_private.settings.enabled` only when the workflow, document coverage, data notice, retention and real provider integration have been verified. Do not activate without a working provider application.

Turning on the database flag also blocks new manual verification submissions and approval of old manual requests. Already verified accounts remain verified. Auto requests appear in the existing admin list as read-only outcomes. Failed identity verification does not ban the user. Local retries are limited to three new sessions per day; provider reads have a per-user session cooldown. Transient service failures leave the user unverified and do not invent a face mismatch.

## Data and trust

Only the authenticated user's request can be started or resumed. Session links are private capability URLs and are returned only to that user, never through the public verification table. ID images, selfies, extracted ID fields, facial templates, raw reports and provider scores are not copied into the site database or logs. The result stores request metadata, consent, session identifier and three feature statuses. The server fetches the current decision directly from the provider even after a valid webhook. Request ID, provider session and workflow must match the recorded binding. Terminal decisions are idempotent and cannot be changed by delayed events or client-supplied status fields.

## Validation

- `node --test tests/automatic-identity.test.mjs`
- Run `tests/automatic-identity.sql` transactionally against the prepared schema; it rolls back all fixture changes.
- Live camera and real document matching remain untested until a provider application is configured. Automated matching can make mistakes; a reported technical failure or uncertain capture is a retry rather than a confirmed mismatch.

Official references (checked October 22, 2026):

- https://docs.didit.me/sessions-api/create-session
- https://docs.didit.me/sessions-api/retrieve-session
- https://docs.didit.me/integration/webhooks
- https://didit.me/ar/terms/verification-privacy-notice/
- https://supabase.com/docs/guides/functions/auth-headers
