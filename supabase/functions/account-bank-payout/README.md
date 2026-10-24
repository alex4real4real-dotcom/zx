# Seller-requested payouts from the marketplace's Al Rajhi business account

Prepared infrastructure; no live bank transfer or live collection integration is enabled.

The buyer's verified payment must settle into the marketplace's business account. After protection/disputes are resolved, the future trusted collection integration credits the seller's real-funds ledger through service-only `account_payout_credit`. Funds stay attributed to that seller until they request withdrawal. Saving an IBAN does not verify its ownership. A bank-approved verification integration must populate the private beneficiary verification fields before withdrawals can start.

`bank-payout-preparation.sql` installs a separate real-funds ledger. It does not read test top-ups, the profile's old balance, historical test settlements or test withdrawals. Clients and administrators cannot create real credit or declare a payout paid. A server credit source is globally unique and bound to seller, amount and bank settlement reference. Collection integration must verify payment authenticity, order ownership, bank settlement, commission, refunds, chargebacks and protection/dispute resolution before creating a credit; that integration is not implemented or claimed here.

The seller dashboard, account registration, masked IBANs, on-demand withdrawal, cancellation before dispatch, atomic reservations, queue, outcome receipts and administration view are implemented. The account owner must be authenticated, email-confirmed, identity-verified and not banned. Accounts are owner-bound. Preparation mode permits saving beneficiaries, but submission stays disabled until all four private settings (`enabled`, `collections_ready`, `bank_ready`, `adapter_ready`) are true. There is no client or admin UI switch to activate these settings.

## State and accounting rules

- `queued`: funds reserved; seller can cancel before worker claim.
- `processing`: claimed for initial dispatch. Bank idempotency key is the immutable payout UUID.
- `reconciling`: outcome uncertain/pending; reservation stays. A subsequent claim performs a lookup, not another submission. Processing jobs abandoned for two minutes also become lookup jobs.
- `paid`: only after a verified, matching final bank result with a bank reference; reserved funds become paid debits exactly once.
- `failed`: only after a verified definitive rejection/failure; reservation released.
- `cancelled`: only while queued; reservation released.

Reservations, credit posting and payout results lock the same seller profile to serialize balance changes. Queue claims use `FOR UPDATE SKIP LOCKED`. Requests, bank transfers and events have stable unique identifiers. A response for the wrong seller request, amount or IBAN cannot pay a request. Duplicate results are idempotent; reused event IDs with different outcomes are rejected. Bank references cannot pay two withdrawals. Timeout or malformed response never releases the reservation. Worker crashes before saving the bank result are reconciled by lookup using the same UUID. Real available balance = confirmed credits - reserved - paid, denominated in SAR.

## Required before activation

1. Obtain the commercial Al Rajhi agreement and production integration specification for outgoing transfers, the permitted debit account, beneficiary verification and any approval rules. A personal banking login is not used.
2. Implement `alrajhi-adapter.mjs` against that exact specification. Endpoint URLs, authentication, certificates, signing, status mapping and timing are not assumed. Implement both submission and lookup by the same immutable idempotency key; verify the response and correlate amount, SAR currency and beneficiary. Normalize amounts to the job's two-decimal string format. Map `paid` only to confirmed completed transfers, and `failed` only to definite terminal nonpayment. Unknown/pending statuses map to `reconciling`. A lookup must never itself create a transfer. Include the bank's stable event/reference identifiers.
3. Complete and certify the real payment-collection, bank-settlement and seller entitlement integration. Only then authorize it to call `account_payout_credit`. Supply beneficiary verification through an approved bank identity check. Do not approve beneficiaries simply because the IBAN checksum passes.
4. Store credentials, bank account identifiers, signing material and a random 32+ character `PAYOUT_WORKER_TOKEN` in server secrets. No real values belong in this repository or public settings. Credentials alone do not enable this adapter: its default remains `configured:false`.
5. Run approved bank sandbox tests for success, rejection, pending/unknown results, duplicate dispatch prevention, delayed outcomes, network loss after debit, amount/IBAN mismatch, insufficient bank liquidity and concurrent withdrawals. Match database totals to bank statements. Confirm refunds/chargebacks and suspension/recovery procedures.
6. After approval, enable the private readiness settings and schedule authorized POST requests to the worker. Scheduling and live flags are intentionally not activated in this release. Resume/report existing uncertain transfers before any new dispatch after an outage. Do not mark a payout paid via administrator approval.

The worker endpoint accepts only POST with `Authorization: Bearer <PAYOUT_WORKER_TOKEN>`. It takes no caller-supplied amount, beneficiary, job ID or result. It calls service-only claim/report RPCs; the database supplies the beneficiary. The unimplemented Al Rajhi adapter returns `BANK_INTEGRATION_NOT_CONFIGURED` before claiming any job or contacting a bank. Do not expose a generic unverified webhook; add a provider-specific verified webhook only if required by the bank's approved specification.

Apply the SQL using the authenticated Supabase migration workflow, deploy `account-bank-payout` with `verify_jwt:false` (the worker secret provides its own authentication), and deploy seller/admin files. Tests: `node --test tests/bank-payout-worker.test.mjs`; `tests/bank-payout-preparation.sql` rolls back every fixture. Historical withdrawal records remain in their original schema and their old public operations stay disabled.
