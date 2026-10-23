# zx
xz


## 12-hour settlement simulation

`supabase/test-settlement.sql` adds a server-side 12-hour dispute window for **new test order items**. Existing orders retain their prior support workflow. A database trigger snapshots the buyer, seller, item amount and purchase time. A minutely Cron job allocates undisputed, expired items to their seller. A timely dispute freezes that item's simulated settlement until a party concedes or an administrator resolves it for the buyer (refunded) or seller (released). No-winner closure is rejected, and settled items cannot be reversed or reopened through dispute actions. Missing or self-assigned sellers go to manual review rather than automatic release.

The settlement table and audit history are not a wallet, a provider payment confirmation, a bank payout, or a real refund. Real payment integration is still absent; all current orders, allocations and refunds remain simulations. The policy is shown before test checkout and on the orders/disputes pages. Buyer and admin views display simulated settlement states. SQL verification is in `tests/test-settlement.sql`; all fixture changes roll back.


`supabase/inline-order-disputes.sql` adds participant concessions and permanently final decisions for every case, including legacy disputes. Seller closure derives `resolved_buyer`; buyer closure derives `resolved_seller` on the server. Request IDs make retries safe. Buyers and sellers review the private thread inside the item card on orders/disputes pages; only the buyer can create a case. The creation dialog fixes the item and offers reason choices. `account_seller_orders` exposes only a seller’s purchased-item snapshots, never buyer emails, other sellers’ items or listing secrets. Existing test/real-payment limits remain unchanged. Verify with `tests/inline-order-disputes.sql` (rollback fixtures).


## Test withdrawals

Apply `supabase/test-withdrawals.sql` after the settlement scripts. `withdraw.html` shows the signed-in account’s test balance, masked bank-account entries and paginated withdrawal history. Only released test settlements credit this separate simulation balance; held/disputed/refunded amounts do not. Pending and approved test requests are subtracted from available credit. Request submission and admin review serialize on the account’s profile row, preventing concurrent reservations from overspending. Retried request IDs return the same record. Rejection releases the reservation once; approval is final and remains a simulation, with no bank transfer. Admins review requests in the Withdrawals tab. Real profile sales and real withdrawable balances are not credited.

Bank accounts and immutable request bank snapshots are held in an unexposed private schema with RLS and no client table grants. RPCs return masked IBANs only. IBAN validation checks Saudi structure/checksum, not account ownership or bank existence. The test suite `tests/test-withdrawals.sql` verifies balance restrictions, reservations, rejection/approval, idempotency, invalid amounts, cross-user isolation and API privileges with rollback fixtures.

## Unique registration identifiers
Apply `supabase/unique-signup-identifiers.sql` to reserve normalized email and phone identifiers when an account is first created, including pending email verification. Existing accounts are preserved. Private reservations survive identifier changes and account removal. Client preflight gives a clear duplicate message; database triggers and unique keys enforce the rule even if preflight is bypassed. Run `tests/unique-signup-identifiers.sql` in a rollback transaction to verify email/phone collisions, normalization, pending accounts, profile updates and private-table access.

## Social-account sales and dummy delivery
Apply `supabase/social-account-delivery.sql` and `supabase/social-checkout-lock.sql` together. New social account purchases atomically reserve one sale, hide the catalog listing, prevent republishing, and preserve order history. Only details explicitly marked as fictitious by the seller are copied into test receipts and delivered by an authenticated buyer-only RPC. Public listings never include these fields. Services and games retain their existing stock behavior. Real credentials are not delivered through test orders.

`supabase/repair-declared-dummy-order.sql` repairs only the one pictured order whose seller explicitly declared the data fictitious. It does not modify other historical orders.

Validation: `tests/social-account-delivery.sql` and `tests/social-account-delivery-modes.sql` passed in rollback transactions. These cover buyer-only access, immutable dummy snapshots, no release without opt-in, second purchase and republishing prevention, idempotency, repeatable services, and seller/buyer eligibility checks. UI delivery fields were verified with synthetic fixtures.

## Current payment readiness
`supabase/payment-methods-inactive.sql` disables new checkout, bank-account submission and withdrawals in the official storefront until a merchant payment integration is available. Apple Pay and bank transfer are disabled presentation elements. No new simulated order can be confirmed or delivered through the public checkout RPC. Existing records remain for audit and retain their original test labels. Apply this readiness gate after the historical test-order migrations. `tests/payment-methods-inactive.sql` verifies server rejection without creating records or broadening anonymous access. Earlier purchase/withdrawal tests describe the prior development behavior; run them only in an isolated development database before this readiness gate.
