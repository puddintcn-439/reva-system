# Deployment environment variables

This project expects production & preview environment variables to be configured in the deployment platform (we use Vercel).

Confirmed variables (set in Vercel for Production & Preview):

- `DATABASE_URL` — PostgreSQL connection string (used by backend)
- `JWT_SECRET` — JWT signing secret (REQUIRED in production)
- `NODE_ENV` — typically `production`
- `CLIENT_URL` — frontend URL allowed by CORS
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_BUCKET` — optional Supabase storage for uploads
- `REDIS_URL` — optional cache/session endpoint
- SMTP vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

Notes:
- Do NOT commit secrets into the repository. Set secrets in Vercel / Docker secrets / your secret manager.
- The code no longer contains an insecure JWT fallback. If `JWT_SECRET` is not configured in production, the server will fail-fast at startup.
- To generate a secure secret locally:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# or
openssl rand -hex 48
```

If you need this file included in project docs, feel free to move it under `docs/`.
