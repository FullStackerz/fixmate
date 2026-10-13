# FixMate — Home Appliance Repair Marketplace

FixMate is a home-appliance repair marketplace for India. Customer, Technician and Admin
interfaces are role-aware layouts inside one Next.js app and share a single local data layer, so
an action in one role (booking, quote, payment, stock movement) is immediately visible in the others.

> **Integration status.** The UI is production-styled, but payments, GPS tracking, KYC and authentication are simulated locally. Nothing is
> charged, no location is read from your device, and no identity documents are stored.

## Requirements

- Node.js 18.17+ (developed with Node 18.18.2, npm 10.8.3)
- No environment variables, API keys or external services are needed.

## Commands

```bash
npm install        # install dependencies
npm run dev        # development server at http://localhost:3000
npm run lint       # ESLint (next lint)
npx tsc --noEmit   # type-check (strict mode)
npm run build      # production build
npm run start      # serve the production build
```

There is no automated test script configured in `package.json`.

## Walkthrough (≈5 minutes)

1. **Customer** → `/customer`: browse AC, refrigerator, washing machine, microwave and dishwasher services.
2. `/customer/book`: choose appliance, issue, address, 6-digit PIN, date and slot; review the price estimate; confirm.
3. **Admin** → `/admin/bookings`: select the new booking and assign **Rajesh Kumar** (assigning the
   pending-KYC technician is refused and logged as a blocked attempt).
4. **Technician** → `/technician` → *New Offers*: open the job, **Accept Offer**, then mark
   En Route → Arrived → Start Diagnosis, and submit an itemized diagnosis/quote.
5. **Customer** → booking detail: **Approve** (or reject — the technician can then send a revised quote).
6. **Technician**: Start Repair (only possible after approval), then Mark Repair Complete and record parts used.
7. **Customer**: pay (UPI / card / cash), view the receipt, leave a rating.
8. **Admin** → `/admin`, `/admin/inventory`, `/admin/analytics`: booking, stock and revenue figures reflect the run.

Seeded shortcuts: `BK-1003` has a pending quote, `BK-1010` is an un-accepted offer for Rajesh,
`BK-1001` is unassigned, `BK-1004` is mid-repair.

## Routes

| Area | Routes |
|------|--------|
| General | `/` (landing), `/login` (account chooser; `/demo` redirects here) |
| Customer | `/customer`, `/customer/book`, `/customer/bookings`, `/customer/bookings/[id]` |
| Technician | `/technician`, `/technician/jobs/[id]` (signed in as Rajesh Kumar, `tech_001`) |
| Admin | `/admin`, `/admin/bookings`, `/admin/technicians`, `/admin/services`, `/admin/inventory`, `/admin/analytics` |

## Switching roles & resetting data

- Sign in from `/login` by choosing an account, or use the avatar menu → **Switch app** (Customer app / Partner app / Operations console).
  No password or OTP is required — this is *not* production authentication.
- **Reset data** is in the avatar menu and asks for confirmation. It restores the deterministic seed.
- Data is stored in the browser's `localStorage` (key `fixmate_demo_state`). It survives refreshes
  and syncs across tabs of the same browser. Corrupted or outdated data is re-seeded automatically.

## Architecture

```
src/lib/types.ts      domain types, booking status machine (VALID_TRANSITIONS), labels
src/lib/seed-data.ts  deterministic seed (1 customer, 3 technicians, 10 bookings, quotes, parts, messages)
src/lib/store.ts      the only place state changes: bookings, assignment, quotes, payment, stock, analytics
src/lib/hooks.ts      useDemoState (useSyncExternalStore over the store) and toasts
src/components/       shared design system (ui.tsx) and role-aware layout shell
src/app/              routes
```

Business rules enforced in `store.ts` (not in the UI):

- Status changes follow `VALID_TRANSITIONS`. Statuses with side effects are reachable only via their own
  action: quote submission/approval, completion, payment, cancellation and assignment.
- Technicians must have approved KYC to be assigned and must accept an offer before going en route.
- Repair can start only after the customer approves the active quote; superseded/rejected quotes cannot be approved.
- Quote totals are computed once (`calculateQuoteTotal`, discounts subtract) and stored on the quote.
- Bookings keep a price snapshot, so catalogue edits affect only new estimates.
- `applyStockMovement` is the single function that changes stock; available stock can never go negative.
  Completing a repair with parts validates all parts first, then updates booking and inventory in one save.

## Simulated vs. real

| Capability | Current implementation |
|------------|--------------|
| Authentication | Account chooser at `/login`, no credentials |
| Payments | "Pay now" records the chosen method locally — no gateway, no money moves |
| Tracking / ETA | Illustrative map and status-based ETA — no device location is read |
| KYC | Mock document metadata; approve/reject only changes local state |
| Chat | Local messages only, no SMS/push |
| Prices, ratings, earnings | Seed values, configurable in Admin → Services |
| Backend | None — `localStorage` behind `store.ts` |

## Known limitations

- Single browser only; data is not shared between devices or users.
- One fixed customer and one technician identity (`tech_001`).
- Photo upload on the booking form is not sent anywhere.
- No automated test suite in the repo; the store's workflow rules were exercised with a throwaway Node script during development.

## Next steps for production

1. Replace `store.ts` internals with API calls to a real backend and database; keep the function signatures.
2. Phone-OTP authentication with role-based authorization enforced server-side.
3. Payment gateway integration (e.g. UPI/cards) with webhook-confirmed payment status and refunds.
4. Real maps/geolocation with technician consent, and live status updates (WebSockets/push).
5. SMS/WhatsApp notifications; KYC verification through a compliant provider with encrypted document storage.
6. Privacy/compliance review (DPDP Act), audit logging, monitoring, CI with automated tests, and deployment.
