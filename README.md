# zx
xz


## 12-hour settlement simulation

`supabase/test-settlement.sql` adds a server-side 12-hour dispute window for **new test order items**. Existing orders retain their prior support workflow. A database trigger snapshots the buyer, seller, item amount and purchase time. A minutely Cron job allocates undisputed, expired items to their seller. A timely dispute freezes that item's simulated settlement until a party concedes or an administrator resolves it for the buyer (refunded) or seller (released). No-winner closure is rejected, and settled items cannot be reversed or reopened through dispute actions. Missing or self-assigned sellers go to manual review rather than automatic release.

The settlement table and audit history are not a wallet, a provider payment confirmation, a bank payout, or a real refund. Real payment integration is still absent; all current orders, allocations and refunds remain simulations. The policy is shown before test checkout and on the orders/disputes pages. Buyer and admin views display simulated settlement states. SQL verification is in `tests/test-settlement.sql`; all fixture changes roll back.


`supabase/inline-order-disputes.sql` adds participant concessions and permanently final decisions for every case, including legacy disputes. Seller closure derives `resolved_buyer`; buyer closure derives `resolved_seller` on the server. Request IDs make retries safe. Buyers and sellers review the private thread inside the item card on orders/disputes pages; only the buyer can create a case. The creation dialog fixes the item and offers reason choices. `account_seller_orders` exposes only a seller’s purchased-item snapshots, never buyer emails, other sellers’ items or listing secrets. Existing test/real-payment limits remain unchanged. Verify with `tests/inline-order-disputes.sql` (rollback fixtures).
