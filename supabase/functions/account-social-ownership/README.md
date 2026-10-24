# Social-account bio ownership

Deploy `supabase/social-account-ownership.sql` before deploying this function and updating `sell.html` and `admin.html`. The private rollout flag starts disabled, so an interrupted frontend release preserves the previous listing behavior. After the frontend deployment succeeds, an operator activates the feature with `update account_bio_private.settings set enabled=true where singleton;`. Sellers cannot change this flag.

The seller requests a cryptographically random, 24-hour code bound to their authenticated user, proposed product UUID, platform and normalized username. A client cannot mark a proof approved. All challenge rows are private, have RLS enabled with no user table privileges, and are accessed through owner/admin-checked RPCs.

`account-social-ownership` validates the bearer token with Supabase Auth before calling the service-only RPC. Gateway `verify_jwt` is disabled because authentication is performed explicitly with `auth/v1/user`, supporting the project's publishable key and current JWT signing configuration. The service-role key is read from runtime environment variables and never returned or forwarded to a social platform.

Automatic checking currently reads only a Telegram profile's biography with a matching canonical URL, or TikTok's structured profile biography with a matching username. It never searches an entire HTML page for the code, accepts user-provided biographies, or follows redirects. Public-profile requests are bounded and timed out. An inaccessible profile, missing code, or another platform stays pending for administrator review; it never approves by fallback.

Administrators open the original profile and enter the code actually observed in its bio, with an explicit confirmation. The server requires that code to match the challenge. Discord review uses its username inside Discord because no public username profile URL is assumed. A screenshot supplied by a seller is not accepted as proof.

The seller save RPC, visibility changes and direct product publication all enforce ownership. Delivery and verified usernames must agree. Approvals cannot be reused for another seller, listing, platform or username. An approval used by a successfully published listing remains bound to that listing; unused approvals expire. Existing published listings are not automatically removed, but new publication, republishing and seller saves require proof. Gaming platforms and non-account services retain their existing flow.

Run `node --test tests/social-account-ownership.test.mjs`. Database checks in `tests/social-account-ownership.sql` run transactionally and roll back all fixtures and simulated approvals.
