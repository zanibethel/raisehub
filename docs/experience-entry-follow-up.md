# Experience Entry Follow-up

This follow-up corrects two issues discovered after Sprint #42 merged.

## Corrected behavior

- `raisehub.app` is always treated as the Live Platform.
- `demo.raisehub.app` is always treated as the Interactive Demo.
- Vercel project identity takes precedence over a copied or stale `NEXT_PUBLIC_APP_MODE` value.
- The root experience chooser remains at `/`.
- Selecting either experience now opens `/home` on the chosen domain.
- `/home` restores the original RaiseHub marketing experience, including the logo, featured-deals, and campaign-progress carousels.
- Demo role selection remains available through the existing “Explore Every Experience” action and `/demo` route.
- The duplicate green Demo strip is removed. The existing persistent Demo banner remains the single Demo indicator.
- Live pages retain the compact `RaiseHub · Live Platform` label.

## Routing

- Live choice: `https://raisehub.app/home`
- Demo choice: `https://demo.raisehub.app/home`
- Demo role launcher: `https://demo.raisehub.app/demo`

No database, authentication, Stripe, or row-filtering behavior is changed by this follow-up.
