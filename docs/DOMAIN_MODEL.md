# RaiseHub Domain Model

**Last updated:** July 2026

This document defines the major business entities in RaiseHub, how they relate to one another, and which concepts are distinct even when they share the same underlying profile record.

The goal is to give developers and AI coding agents a stable understanding of the product before they modify code, database queries, permissions, or workflows.

---

# 1. Core Product Model

RaiseHub connects three main participant groups:

    Organizations
    ↓
    Fundraising Campaigns
    ↓
    Customers purchase access
    ↓
    Local Business Offers
    ↓
    Customers save and redeem value

The platform also includes:

    Admin
    Owner
    Support
    Audit
    Demo and live environments

RaiseHub is designed to create value for all sides:

- Organizations raise money.
- Businesses gain customer traffic and visibility.
- Customers save money.
- RaiseHub earns platform revenue.
- Communities retain more value locally.

---

# 2. Primary Identity Concepts

RaiseHub must distinguish these concepts:

    User
    Profile
    Role
    Actor
    Subject
    Workspace

They are related, but they are not interchangeable.

---

# 3. User

A user is an authenticated Supabase account.

Typical source:

    auth.users

A user provides authentication identity such as:

- User ID
- Email
- Authentication provider
- Session
- Verification state

The authenticated user ID is the stable identity used to connect authentication to the RaiseHub profile.

A user is not automatically a business, organization, or customer until the associated profile establishes the application role.

---

# 4. Profile

A profile represents the application-level identity connected to an authenticated user.

Typical source:

    profiles

Current profile roles include:

    customer
    business
    organization
    admin
    owner

A profile may contain:

- Display name
- Full name
- Business name
- Email
- Phone
- Address
- Logo
- Website
- Description
- Subscription tier
- Onboarding status
- Role

The exact fields vary by role and implementation phase.

Never invent profile fields without checking the live schema.

---

# 5. Role

A role defines broad application authorization and the main dashboard experience.

Current roles:

## Customer

A supporter who may:

- Purchase fundraiser access
- View purchased passes
- Save offers
- Redeem offers
- Review redemption history

## Business

A participating local business that may:

- Complete business onboarding
- Create offers
- Pause or resume offers
- Review offer activity
- Review redemptions
- Review business analytics
- Manage subscription-dependent limits

## Organization

A school, team, church, nonprofit, or other fundraising group that may:

- Create campaigns
- Share campaigns
- Track sales
- Track sellers
- Review campaign earnings
- Review fundraising performance

## Admin

A platform-management role intended for operational moderation and administration.

Admin is not a client workspace role.

## Owner

The highest internal platform role.

The owner account remains permanently authenticated as `owner`.

It may preview role experiences and open approved client workspaces without changing its saved role.

Owner is not a client workspace role.

---

# 6. Actor

The actor is the authenticated user performing an action.

Examples:

    Customer saving an offer
    Business creating an offer
    Organization creating a campaign
    Owner reviewing a client workspace

For standard account activity:

    Actor ID = Subject ID

For owner support:

    Actor ID ≠ Subject ID

The actor must remain identifiable during all support activity.

---

# 7. Subject

The subject is the account being represented, viewed, or affected.

Examples:

- The customer whose saved offers are displayed
- The business whose offers are being reviewed
- The organization whose campaign data is being viewed
- The client account being assisted by an owner

For ordinary use, the authenticated account is also the subject.

For owner support, the owner is the actor while the selected client is the subject.

---

# 8. Workspace

A workspace is the currently selected account context.

Supported client workspace roles:

    customer
    business
    organization

Admin and owner are platform experiences, not client workspaces.

A workspace should include or resolve:

- Workspace ID
- Workspace role
- Display name
- Contact information
- Subscription plan
- Setup progress
- Demo or live status
- Selected support mode
- Related resources

Opening a workspace must not change the authenticated owner identity.

---

# 9. Support Mode

Support mode defines how an internal actor may interact with a selected client workspace.

Current foundation:

    Workspace preview
    Read-only support

Future mode:

    Assisted editing

## Workspace Preview

Used to inspect the selected workspace context while preserving owner identity.

## Read-Only Support

Used to inspect real client-owned information without write controls.

## Assisted Editing

A future explicit support state that may allow approved writes after authorization, resource validation, support reason capture, and audit logging.

---

# 10. Organization

An organization is a fundraising entity.

Examples:

- School
- Sports team
- Church
- Nonprofit
- Booster club
- Youth organization
- Community group

An organization profile owns fundraising campaigns.

Relationship:

    Organization
    1
    ↓
    Many Campaigns

Typical ownership field:

    campaigns.organization_id

---

# 11. Campaign

A campaign is a fundraising sale created by an organization.

A campaign may include:

- Name
- Description
- Goal amount
- Pass price
- Start and end timing
- Status
- Organization owner
- Seller information
- Purchase records

Typical statuses may include:

    draft
    active
    completed
    archived

Exact status values must be confirmed from the real schema before use.

A campaign is not the same as an offer.

A campaign raises money.

An offer provides customer value.

---

# 12. Seller

A seller is a participant credited with campaign sales.

Examples:

- Student
- Player
- Team member
- Family member
- Organization participant

The current implementation may represent seller identity through a seller name rather than a fully authenticated seller account.

Future versions may introduce:

- Seller profiles
- Seller links
- Seller codes
- Seller dashboards
- Seller rankings
- Referral attribution

Do not assume sellers are authenticated users unless the data model explicitly supports that.

---

# 13. Campaign Purchase

A campaign purchase records a customer’s fundraiser transaction.

Typical relationships:

    Customer
    ↓
    Campaign Purchase
    ↓
    Campaign
    ↓
    Organization

A purchase may include:

- Purchase ID
- User ID
- Campaign ID
- Selected organization ID
- Seller attribution
- Amount paid
- Donation amount
- Platform fee
- Organization earnings
- Payment status
- Created timestamp

Financial totals must define which payment statuses count.

A purchase row should not automatically be treated as completed revenue merely because it exists.

---

# 14. Fundraiser Pass

A fundraiser pass is the customer-facing access created by a valid campaign purchase.

The pass gives the customer access to participating business offers for the approved period.

Conceptually:

    Valid Campaign Purchase
    ↓
    Fundraiser Pass
    ↓
    Available Business Offers

A pass may currently be represented through purchase records rather than a dedicated pass table.

Developers must confirm the implemented storage model before introducing new pass assumptions.

---

# 15. Business

A business is a participating local merchant or service provider.

A business profile may include:

- Business name
- Contact information
- Address
- Website
- Logo
- Description
- Map link
- Subscription tier
- Onboarding status

A business owns offers.

Relationship:

    Business
    1
    ↓
    Many Offers

Typical ownership field:

    offers.business_id

---

# 16. Offer

An offer is a reusable local-business promotion.

Examples:

- Five dollars off
- Buy one, get one
- Free appetizer
- Percentage discount
- Service upgrade
- Customer reward

An offer may include:

- Title
- Description
- Business owner
- Start date
- End date
- Active status
- Redemption instructions
- Terms
- Health score
- Performance metrics

Offer behavior should be governed by deterministic rules where possible.

Examples:

- Active or expired status
- Offer health
- Review recommendation
- Subscription limit
- Attention alerts

---

# 17. Offer Status

Offer status is the current operational condition of an offer.

Possible conditions include:

- Active
- Scheduled
- Paused
- Expired
- Archived

The exact status may be derived from:

- `is_active`
- Start time
- End time
- Archive state
- Moderation state

Do not duplicate status logic across components.

Use a shared rule.

---

# 18. Offer Health

Offer health is a deterministic evaluation of offer quality or readiness.

It may consider:

- Title quality
- Description
- Terms
- Dates
- Images
- Redemption clarity
- Performance
- Missing information

The rule engine decides the health result.

AI may explain the result or suggest improvements.

AI must not independently redefine the score.

---

# 19. Saved Offer

A saved offer connects a customer to an offer they want to retain.

Relationship:

    Customer
    Many
    ↕
    Many Offers

Typical source:

    saved_offers

Typical fields:

- ID
- User ID
- Offer ID
- Created timestamp

Saving an offer is not the same as redeeming it.

---

# 20. Redemption

A redemption records a customer using an offer.

Typical relationships:

    Customer
    ↓
    Redemption
    ↓
    Offer
    ↓
    Business

Typical source:

    redemptions

A redemption may include:

- User ID
- Offer ID
- Created timestamp
- Validation state
- Future staff or device verification

Redemption reporting must respect business ownership.

A business should not receive analytics for unrelated businesses’ offers.

---

# 21. Offer View and Click

Offer engagement may be tracked through:

    offer_views
    offer_clicks

These records support analytics such as:

- Total views
- Total clicks
- Conversion rate
- Offer performance
- Business attention alerts

Analytics should be restricted to the relevant offer or business owner.

Repeated calculations should be centralized.

---

# 22. Subscription

A subscription defines paid or free business access.

Current profile data includes a subscription tier foundation.

Possible tiers may include:

    free
    paid
    pro
    enterprise

Only real supported values should be used in application logic.

Subscription behavior may control:

- Active offer limits
- Analytics access
- Promotion tools
- AI assistance
- Featured placement
- Support level
- Future business tools

Subscription limits should come from centralized configuration or rules rather than magic numbers scattered across components.

---

# 23. Setup Progress

Setup progress is a role-specific readiness calculation.

Examples for a business:

- Business name
- Email
- Phone
- Address
- Logo
- Description
- Onboarding completed

Examples for an organization:

- Organization name
- Email
- Phone
- Address
- Onboarding completed

Examples for a customer:

- Name
- Email
- Phone

Setup progress is an application model calculated by a service or rule.

It is not necessarily a stored database percentage.

The checklist must remain consistent across every UI that displays readiness.

---

# 24. Admin Experience

Admin is an internal platform role.

Potential admin responsibilities:

- Business management
- Organization management
- Customer management
- Offer moderation
- Campaign moderation
- Account suspension
- Platform reporting
- Support permissions

Admin capability is not automatically identical to owner capability.

Future permission models may allow limited internal roles.

---

# 25. Owner Platform

The Owner Platform Console is RaiseHub’s internal operating system.

It may include:

- Platform overview
- Workspace search
- Business workspaces
- Organization workspaces
- Customer workspaces
- Demo preview
- Read-only client support
- Assisted editing
- Support notes
- Audit timeline
- Revenue
- Platform settings
- Global search
- System health

The owner account must remain visibly and technically identifiable as the actor.

---

# 26. Preview Mapping

Owner preview may use designated profile mappings.

Typical source:

    owner_preview_profiles

A preview mapping may connect:

- Owner account
- Preview role
- Subject profile

The application must validate that the mapped subject actually has the requested role.

Demo preview must remain distinct from live client support.

---

# 27. Audit Log

An audit log records sensitive owner-assisted actions.

Typical source:

    owner_action_logs

Recommended fields:

- Actor user ID
- Subject user ID
- Action
- Resource type
- Resource ID
- Before data
- After data
- Reason
- Created timestamp

Audit records should be append-only from the application perspective.

Audit logging is mandatory before assisted editing is considered complete.

---

# 28. Support Note

A support note records internal context rather than a system change.

Examples:

- Client requested help uploading a logo
- Waiting for updated campaign information
- Follow up next week
- Assisted with first offer

Support notes and audit logs are different.

## Support Note

Describes context, communication, and follow-up.

## Audit Log

Records an actual system action and affected values.

Both may belong to the same support session.

---

# 29. Demo Data

Demo data exists for safe product preview and sales demonstrations.

Demo records should be distinguishable from live records.

Possible fields or strategies:

    is_demo
    demo_group
    data_source
    owner preview mapping

Demo data should not:

- Mix invisibly with live client reporting
- Affect real financial totals
- Appear as live business adoption
- Be used for destructive support testing

---

# 30. Live Data

Live data belongs to real platform users and clients.

Live records may include:

- Real profiles
- Real campaigns
- Real offers
- Real purchases
- Real redemptions
- Real contact information

Until environment separation exists, local development may affect live data.

Treat all writes as potentially production-impacting.

---

# 31. Environment

RaiseHub’s future target is:

    Development
    Staging
    Production

Current risk:

Local development and production share the same Supabase project.

This means environment is currently a deployment context, not necessarily an isolated data boundary.

No coding agent should assume local writes are safe.

---

# 32. Ownership Relationships

Important ownership examples:

    profiles.id = authenticated user ID

    campaigns.organization_id = organization profile ID

    offers.business_id = business profile ID

    saved_offers.user_id = customer profile ID

    redemptions.user_id = customer profile ID

    campaign_purchases.user_id = purchasing customer ID

Every owner-support query must verify that the requested resource belongs to the selected subject or workspace.

---

# 33. Primary Relationship Map

    Auth User
    ↓
    Profile
    ↓
    Role

    Organization Profile
    ↓
    Campaign
    ↓
    Campaign Purchase
    ↓
    Customer / Fundraiser Pass

    Business Profile
    ↓
    Offer
    ↓
    Saved Offer
    ↓
    Redemption

    Owner Actor
    ↓
    Selected Workspace
    ↓
    Subject Profile
    ↓
    Read-Only Resource View
    ↓
    Future Assisted Edit
    ↓
    Audit Log

---

# 34. Important Distinctions

Do not confuse:

## Campaign and Offer

Campaign raises money.

Offer provides value.

## Purchase and Redemption

Purchase creates access.

Redemption records offer use.

## Saved Offer and Purchased Pass

Saved offer is a customer preference.

Purchased pass is fundraiser access.

## Role and Workspace

Role defines authorization.

Workspace defines selected account context.

## Actor and Subject

Actor performs the action.

Subject is the account being represented or affected.

## Preview and Support

Preview uses designated testing context.

Support opens a real client account.

## Support Note and Audit Log

Support note records context.

Audit log records action.

## UI Status and Database State

A rendered badge is not proof of authorization or ownership.

---

# 35. Domain Modeling Rules

AI agents and developers must:

- Confirm actual schema before using field names.
- Keep ownership explicit.
- Avoid representing different concepts with one vague type.
- Avoid using raw database rows as every UI model.
- Introduce mapped application models when a UI needs derived data.
- Centralize repeated calculations.
- Preserve actor and subject identity separately.
- Treat financial records as high risk.
- Treat demo and live data separately.
- Update this document when a new core entity or relationship is introduced.

---

# 36. Current Domain Gaps

The following areas are still evolving:

- Dedicated pass representation
- Payment status model
- Refund model
- Seller identity model
- Subscription entitlement model
- Support-note schema
- Granular owner capabilities
- Account suspension model
- Demo-record tagging
- Environment separation
- Audit integration
- Assisted-editing session model

Do not present these areas as finalized architecture unless the implementation and documentation are updated.

---

# 37. Non-Negotiable Domain Rules

- A role is not a workspace.
- A workspace is not authentication.
- The owner remains the actor.
- A client remains the subject.
- A campaign is not an offer.
- A purchase is not a redemption.
- Demo data is not live data.
- Financial rows require explicit status handling.
- Ownership must be verified before private data is loaded.
- Assisted editing requires audit logging.