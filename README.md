# XBART Upload Test Worker

Test Worker for XBART Technical Cleaning, isolated on `workers.dev`. Production Worker `xbart-booking` is not affected by this configuration.

## Included

- `/privacy` privacy policy in Dutch, English, and Italian
- Privacy link in the form footer
- Ten-service indicative pricing table with per-service minimums
- Consumer price labels incl. 21% VAT and business labels excl. VAT
- Manual quote labels for underground parking and oil stains
- NL/EN/IT language switcher

## Endpoints

| Route | Method | Purpose |
|---|---|---|
| `/` or `/form` | GET | Quote form; choose language with `?lang=nl`, `?lang=en`, or `?lang=it` |
| `/privacy` | GET | Privacy page in NL/EN/IT |
| `/api/submit` | POST | Test submission to D1/R2; email disabled; bounded uploads and total records |
| `/api/submissions` | GET | Submission metadata; requires `ADMIN_TOKEN` |

## Bindings

- `DB`: D1 database `xbart-test-db`
- `PHOTOS`: private R2 bucket `xbart-test-photos`
- `ADMIN_TOKEN`: optional secret for `/api/submissions`
- This test Worker does not use Turnstile; submit fictional data only.
- Server limits: 5 photos, 5 MiB per photo, 36 MiB per request, 100 total test submissions.

## Deploy

Run from this directory:

```sh
npx wrangler deploy
```

Before any production deployment: verify the contact inboxes, inspect actual cookies, implement and verify deletion/retention logic, and review production bindings. This project does not include automatic retention deletion. The `/privacy` page is a test draft. Do not use this Worker to collect real customer data. Production changes require a separate review.

