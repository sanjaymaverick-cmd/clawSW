# Test logins (all roles)

Rehearsal / local testing only — **not for production**.

Enable on API startup:

```env
SEED_DEMO_DATA=true
SEED_DEMO_PASSWORD=demo-password
ADMIN_EMAIL=owner@clawsw.example
ADMIN_PASSWORD=demo-password
```

Then restart the API (or `docker compose up --build`) so demo users and sample data are seeded.

Staff sign-in: **http://localhost:8080/login** (or dashboard `/app/`).

| Role | Name | Email | Password |
|---|---|---|---|
| **owner** | Owner | `owner@clawsw.example` | `demo-password` |
| **manager** | Demo Manager | `manager@clawsw.example` | `demo-password` |
| **accountant** | Demo Accountant | `accountant@clawsw.example` | `demo-password` |
| **service_manager** | Demo Service Manager | `service_manager@clawsw.example` | `demo-password` |
| **technician** | Demo Technician | `technician@clawsw.example` | `demo-password` |
| **warehouse** | Demo Warehouse | `warehouse@clawsw.example` | `demo-password` |

All six passwords match when you set `ADMIN_PASSWORD` and `SEED_DEMO_PASSWORD` to the same value (as above).

### What each role can open (tabs)

| Role | Dashboard | Inventory | Service | Invoicing | Website orders | Users | Audit |
|---|---|---|---|---|---|---|---|
| owner | full | full | full | full | full | full | full |
| manager | yes | r/w | full | read | r/w | — | — |
| accountant | financial-ish | read | — | full | read | — | — |
| service_manager | service-ish | read | full | — | — | — | — |
| technician | — | read* | own jobs | — | — | — | — |
| warehouse | stock-ish | full | — | — | read | — | — |

\*Exact grants come from the permissions table in `api/app/seed.py`.

### Notes

- Demo seed is **idempotent**: re-running does not duplicate users or demo rows.
- Owner is created only if the DB has **no users yet**. If you already seeded a different owner, use that email/password for owner, or reset the DB (`pgdata`) for a clean demo.
- Non-owner demo users are created whenever `SEED_DEMO_DATA=true` and their emails are missing.
- Turn off for real deployments: `SEED_DEMO_DATA=false` and use strong unique passwords.
