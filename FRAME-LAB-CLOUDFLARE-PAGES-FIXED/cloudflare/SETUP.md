# FRAME LAB — password-only admin gateway (Cloudflare Worker)

This gateway keeps the admin username/password and Supabase service-role key on Cloudflare, never in the public GitHub repository. The admin login uses a signed HttpOnly cookie (12-hour session). Admin REST and private-file requests are proxied through the Worker.

## 1. Supabase preparation
1. Create a Supabase project and run `../supabase/schema.sql` in SQL Editor.
2. In Supabase Project Settings → API, copy the Project URL and **service_role** key. Keep the service role key private; add it only as a Cloudflare Worker secret.
3. Generate a random UUID for `ADMIN_USER_ID` (e.g. `uuidgen`). This is an internal actor identifier for admin activity records; it is not a login account.
4. Run `supabase/admin-password-login-migration.sql` in SQL Editor. It removes Auth-user foreign keys from private admin activity metadata because login is now handled by the Worker.

## 2. Cloudflare Worker
1. In Cloudflare → Workers & Pages → Create → Worker. Name it e.g. `frame-lab-admin`.
2. Paste the contents of `worker.js` into the Worker editor and deploy.
3. Add Worker variables/secrets:
   - `SUPABASE_URL` — Supabase Project URL (variable)
   - `ADMIN_USERNAME` — choose your own login (secret or variable)
   - `ADMIN_PASSWORD` — choose a long unique password (secret)
   - `SESSION_SECRET` — random secret at least 32 bytes (secret)
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase service_role key (secret)
   - `ADMIN_USER_ID` — UUID generated above (variable)
4. Attach a route to the same hostname serving the GitHub Pages site: `/auth/*` and `/api/*` (Cloudflare Worker route patterns are host-based; use `your-domain.example/auth/*` and `your-domain.example/api/*`). If using the default `github.io` domain, a custom domain on Cloudflare is needed to route the Worker on the same origin.

## 3. Important hosting note
GitHub Pages alone cannot execute server code. The Worker must be reachable on the **same hostname** as the site so the HttpOnly cookie is sent automatically. For a `username.github.io` address, configure a custom domain through Cloudflare DNS, or use Cloudflare Pages instead of GitHub Pages for the static files.

## 4. Security
- Never commit Worker secrets, service_role keys, or real passwords to GitHub.
- Use HTTPS and a long unique password. Add a Cloudflare rate-limiting rule for `/auth/login` (for example, challenge/block repeated attempts).
- The Worker only proxies the specific admin tables and the private `client-files` bucket.
- Realtime push has been replaced with a 30-second refresh check while the admin page is open.
