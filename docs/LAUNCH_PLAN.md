# RaiseHub Five-Day Business Onboarding Launch Plan

## Launch Objective

At the end of five focused days, RaiseHub should be ready to accept applications or signups from real local businesses.

This does not require every future feature to be complete.

It does require a trustworthy onboarding flow, a clear free offer, a polished public experience, and a safe separation between demo and production behavior.

## Available Work Time

- Five days
- Three focused hours per day
- Fifteen total user work hours

## Launch Definition

RaiseHub is ready for business onboarding when:

- A business owner understands the value quickly
- The business owner clearly sees that signup is free
- The free plan includes up to three active offers
- Supporting organizations is available on every plan
- A business can create an account
- Production email verification is enabled
- A business can complete its profile
- A business can create its first offer
- A business can choose its POS or redemption method
- Unsupported POS users receive a working QR/manual option
- Demo data does not contaminate real production records
- Demo and production modes are clearly separated
- The business can reach a usable dashboard
- The business can understand what happens next
- Core pages work well on mobile

## Day 1 — Product Foundation

### Goals

- Save the RaiseHub vision and business rules in the repository
- Confirm demo and production architecture
- Define the launch-blocking database changes
- Define business onboarding steps
- Document required environment variables

### Deliverables

- `docs/VISION.md`
- `docs/BUSINESS_MODEL.md`
- `docs/LAUNCH_PLAN.md`
- `.env.example`
- Demo/production implementation plan

## Day 2 — Demo and Public Story

### Goals

- Make the public homepage clearly explain RaiseHub
- Present RaiseHub primarily to businesses and organizations
- Clearly communicate that business signup is free
- Show realistic businesses, offers, and organizations
- Prevent demo mode from displaying real production data

### Deliverables

- Updated homepage messaging
- Dedicated demo dataset
- Diverse demo businesses
- Diverse demo organizations
- Varying fundraising progress levels
- Clear business signup CTA
- Clear organization interest CTA

## Day 3 — Business Signup and Authentication

### Goals

- Improve signup and login
- Require production email verification
- Add the OAuth code structure for Google and Apple
- Preserve business/customer/organization account roles
- Add an authentication callback route
- Handle confirmation and error messages clearly

### Deliverables

- Improved signup page
- Improved login page
- Email-verification message
- OAuth buttons and callback structure
- Production redirect configuration checklist

Google and Apple provider credentials may require external account configuration and should not be allowed to block all business onboarding.

## Day 4 — Business Intake Workflow

### Proposed Steps

1. Account and role
2. Business basics
3. Business goals
4. First offer
5. Fundraising preferences
6. POS and redemption method
7. Review and publish

### POS Options

- Square
- Clover
- Toast
- Shopify POS
- Stripe Terminal
- Other
- No POS or cash register

Where a direct integration is not yet supported, the business should receive QR/manual redemption without being blocked.

### Business Goals

- Attract new customers
- Increase repeat visits
- Fill slower days
- Promote a new service or product
- Support local organizations
- Improve community reputation

## Day 5 — Dashboard, Testing, and Launch

### Goals

- Confirm profile and offer data saves correctly
- Confirm free-plan limits
- Confirm the business can create up to three offers
- Confirm mobile usability
- Confirm demo data remains isolated
- Test a new production business account
- Prepare the first Facebook business-recruitment advertisement
- Deploy and perform a launch checklist

## Launch Blockers

The following must work before advertising broadly:

- Account creation
- Email confirmation
- Login
- Business profile completion
- First offer creation
- Correct database permissions
- Clear free-plan messaging
- Mobile usability
- Error handling
- Demo/production separation
- Privacy policy and terms links
- A way to contact RaiseHub for help

## Features That Do Not Block Initial Business Signup

These can be introduced after initial onboarding begins:

- Full Square integration
- Full Clover integration
- Full Toast integration
- Automated AI image generation
- Advanced AI marketing coach
- Advanced analytics
- Native mobile applications
- Customer impact history
- Full organization payout automation
- Multi-location management
- Referral programs

## Initial Launch Audience

Start with local business owners in and around Lubbock, Texas.

Target a diverse group including:

- Salons
- Restaurants
- Coffee shops
- Auto services
- Gyms
- Boutiques
- Dentists
- Pet businesses
- Home-service businesses
- Entertainment businesses

## Initial Facebook Ad Principle

The advertisement should clearly communicate:

- Signup is free
- Businesses receive a useful profile
- Businesses may publish up to three offers
- Customers can discover them through RaiseHub
- Every purchase may support a local organization
- Paid upgrades are optional growth tools