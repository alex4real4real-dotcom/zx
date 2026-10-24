# Social-account bio ownership

**Retired at the site owner's request.** The current seller and admin pages do not use this feature. Apply `supabase/disable-account-ownership.sql` to disable its publication requirement and revoke the retired RPCs. Historical records remain private. Run `tests/account-ownership-removed.sql` and `tests/seller-products.sql` for the current listing behavior. The implementation notes below describe the retired feature; do not reactivate it as part of deployment.

Deploy `supabase/social-account-ownership.sql` before deploying this function and updating `sell.html` and `admin.html`. The private rollout flag starts disabled, so an interrupted frontend release preserves the previous listing behavior. After the frontend deployment succeeds, an operator activates the feature with `update account_bio_private.settings set enabled=true where singleton;`. Sellers cannot change this flag.

The seller requests a cryptographically random, eight-digit, 24-hour code bound to their authenticated user, proposed product UUID, platform and normalized username. A client cannot mark a proof approved. All challenge rows are private, have RLS enabled with no user table privileges, and are accessed through owner-checked RPCs. Administrators can view results but cannot approve ownership.

`account-social-ownership` validates the bearer token with Supabase Auth before calling the service-only RPC. Gateway `verify_jwt` is disabled because authentication is performed explicitly with `auth/v1/user`, supporting the project's publishable key and current JWT signing configuration. The service-role key is read from runtime environment variables and never returned or forwarded to a social platform.

Automatic readers check only an exact account's biography, never answers, posts, display names or the entire response. They do not accept client-provided biographies or follow redirects. Requests have an eight-second timeout and a two-megabyte response limit. Missing codes, inaccessible profiles and unconnected platforms remain unverified; there is no manual fallback.

| Platform | Reader and required connection |
| --- | --- |
| Tellonym | Public `https://api.tellonym.me/profiles/name/{username}` response; exact `username` and `aboutMe` only. The live first-party response was checked during implementation. |
| Telegram | Public profile description with an exact matching canonical profile URL. |
| TikTok | Structured public-profile `uniqueId` and `signature`. TikTok may return a waiting page rather than a bio; this is never approved. Reliable access still needs an approved Display API/Login Kit integration with `user.info.profile`. No TikTok OAuth integration is claimed in this release. |
| Twitter / X | Same platform, `x`. Official User Lookup reads `data.username` and `data.description`. Requires server-only `X_API_BEARER_TOKEN`; unavailable until configured and authorized. |
| Snapchat | Official Public Profile API search, exact single successful `snap_user_name` and `description`. Requires allowlisted Public Profile API access and server-only `SNAPCHAT_PROFILE_ACCESS_TOKEN`. Only public personal profiles covered by the API can be checked. The access token must be kept valid by the operator; token refresh is not implemented here. |
| Instagram, Discord, PlayStation (Sony), Xbox | No compatible connected biography reader is installed. All are protected from publishing and clearly display the connection requirement. Adding their names does not activate verification. They need a supported authorized integration before automatic approval can be enabled. |

The authenticated `capabilities` action exposes only capability names, never credentials. The seller form shows an unavailable integration before asking someone to add a code, and continues to allow drafts. `public_bio` means an automatic read can be attempted, not that every profile is reachable. Official reader capability means configured credentials exist, not that an expired token or every profile will work. API errors fail closed. Platform credentials stay in Edge Function secrets; never put them in GitHub or browser code.

References: [X User Lookup](https://docs.x.com/x-api/users/lookup/quickstart/user-lookup), [Snap Public Profile setup](https://developers.snap.com/marketing-api/Public-Profile-API/GetStarted), [Snap profile search](https://developers.snap.com/marketing-api/Public-Profile-API/CreatorDiscovery), [TikTok user information](https://developers.tiktok.com/doc/tiktok-api-v2-get-user-info).

Manual review RPC execution is revoked. The publication guard accepts only automatic verification methods. Previous pending requests keep their code and can be retried; the seller status distinguishes a missing code, an unavailable profile and an unsupported integration.

The seller save RPC, visibility changes and direct product publication enforce ownership for all nine account types, including PlayStation and Xbox. Xbox challenge identities support Unicode letters/numbers, spaces, commas and numeric `#` suffixes; usernames remain bound exactly after trimming and case normalization. Delivery and verified usernames must agree. Approvals cannot be reused for another seller, listing, platform or username. An approval used by a successfully published listing remains bound to that listing; unused approvals expire. Existing published listings are not automatically removed, but new publication, republishing and seller saves require proof. Non-account services and games retain their existing flow.

For an existing installation, apply `supabase/expand-account-ownership-platforms.sql`, redeploy this Edge Function, then deploy the updated seller page. The existing rollout flag remains enabled and manual review permissions remain revoked.

Run `node --test tests/social-account-ownership.test.mjs`. Database checks in `tests/social-account-ownership.sql` run transactionally and roll back all fixtures and simulated automatic decisions.
