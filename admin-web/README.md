# iPermit Admin Dashboard

Next.js + TypeScript admin web app for the licensing department. See
[../docs/design.md](../docs/design.md) for architecture.

## Run locally

Backend must be running first — see [../backend/README.md](../backend/README.md).

```bash
cd admin-web
cp .env.example .env.local   # adjust NEXT_PUBLIC_API_URL if needed
npm install
npm run dev
```

Open http://localhost:3000. Log in with an ADMIN account — self-registration only
creates DRIVER accounts, so create one first:

```bash
docker compose exec backend python -m app.scripts.create_admin \
  --email admin@ipermit.lk --nic <your-nic> --password <your-password>
```

Any non-ADMIN login is rejected client-side even if the credentials are valid —
this dashboard is admin-only; police use the mobile app.

## Quality checks

```bash
npx tsc --noEmit
npx eslint .
```
