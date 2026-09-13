# Connection repair — v0.2.19

The previous `rutin-api.tepe-aykut05.workers.dev` hostname resolved and accepted
TCP connections, but TLS stopped after ClientHello on the tested network. Both
resolved IPv4 addresses and TLS 1.2 exhibited the same timeout. GitHub was
reachable concurrently. This establishes a network/TLS failure on that path;
it does not identify the responsible network operator or prove global downtime.

`api.mytepeapi.com.tr` is attached directly to the existing `rutin-api` Worker,
using the same database and accounts. Cloudflare manages its DNS and certificate.
No database migration or credential reset was performed.

Initial verification using authoritative DNS resolution and normal certificate
validation: TLS 0.294 s, health HTTP 200 in 0.976 s, catalog HTTP 200 in 0.541 s.
Login with a deliberately invalid diagnostic code returned the expected HTTP 401
in 1.364 s; anonymous sync returned HTTP 401 in 0.624 s. The local recursive DNS
initially cached NXDOMAIN from before domain creation. No IP address is pinned
in the app. A real phone/account sync still needs verification after APK update.

## Client behavior

- Saved old-cloud and legacy local origins migrate to the custom domain.
- Only the exact old cloud hostname is trusted for migration; unrelated origins
  and lookalike hostnames remain isolated.
- Native tokens migrate only after matching user verification. Old account
  snapshots remain recoverable in the local vault.
- Login and sync now share a deadline covering transport and body parsing.
  Network, timeout, HTTP, and malformed-response failures are distinguishable.
- Timed-out writes are not automatically replayed. Failed logout retains the
  credentials so a temporary network failure does not disconnect the account.
- Release CI runs connection/migration tests and native type checking before
  packaging, and installs dependencies from lockfiles with npm ci.

## Deployment persistence

The API source is in the sibling `../rutin-api` project. Its `wrangler.jsonc`
must retain the following configuration on future deployments:

```json
{
  "workers_dev": true,
  "routes": [{ "pattern": "api.mytepeapi.com.tr", "custom_domain": true }]
}
```

The old endpoint remains attached for backwards compatibility. Do not redirect
or copy user credentials to arbitrary fallback hosts. Do not replace the
protected prototype `worker/index.js`; it is not the sync API.
