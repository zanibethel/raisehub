# Seller Dashboard launch polish

## Launch behavior

- Sellers land on `/seller/dashboard` after claiming a roster entry.
- The dashboard defaults to a currently active campaign when one exists.
- Sellers connected to multiple campaigns can switch the dashboard view with the `campaign` query parameter.
- Paused, ended, completed, archived, or inactive seller connections remain visible as history but do not show active sharing controls.
- Active campaigns keep the seller's stable referral code in every campaign link.
- Seller performance excludes fully refunded and lost-dispute purchases from launch-facing credited totals.
- Recent activity remains non-identifying; buyer names, emails, payment details, and seller payout claims are not shown.

## Sharing

The seller can copy the personal campaign URL, use the device share sheet, show a QR code, or download the QR code as a PNG. QR generation happens in the browser from the existing public seller URL.

## Deferred

- First-party seller avatar upload.
- Seller reward/payout reporting until RaiseHub has a canonical seller reward ledger.
- Rich social creative generation.
