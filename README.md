# zx
xz


## 12-hour settlement simulation

`supabase/test-settlement.sql` adds a server-side 12-hour dispute window for **new test order items**. Existing orders retain their prior support workflow. A database trigger snapshots the buyer, seller, item amount and purchase time. A minutely Cron job allocates undisputed, expired items to their seller. A timely dispute freezes that item's simulated settlement until an administrator explicitly resolves it for the buyer (refunded) or seller (released). No-winner closure is rejected, and settled items cannot be reversed or reopened through dispute actions. Missing or self-assigned sellers go to manual review rather than automatic release.

The settlement table and audit history are not a wallet, a provider payment confirmation, a bank payout, or a real refund. Real payment integration is still absent; all current orders, allocations and refunds remain simulations. The policy is shown before test checkout and on the orders/disputes pages. Buyer and admin views display simulated settlement states. SQL verification is in `tests/test-settlement.sql`; all fixture changes roll back.
