export const LAKEVIEW_DEMO_GROUP_KEY = 'lakeview_launch_2026'

const EXPO_DEMO_DISCLAIMER = 'Demo concept only — not affiliated with or endorsed by the named company.'

export const LAKEVIEW_IDENTITIES = {
  customer: { slug: 'customer', email: 'supporter.demo@raisehub.app', fullName: 'Maya Thompson', displayName: 'Maya Thompson', role: 'customer' },
  organization: { slug: 'organization', email: 'organization.demo@raisehub.app', fullName: 'Elena Ramirez', displayName: 'Elena Ramirez', businessName: 'Lakeview Elementary PTA', role: 'organization' },
  mapleCoffee: { slug: 'business-maple-coffee', email: 'business.demo@raisehub.app', fullName: 'Jordan Lee', displayName: 'Maple Street Coffee Co.', businessName: 'Maple Street Coffee Co.', role: 'business' },
  willowSalon: { slug: 'business-willow-salon', email: 'willow.demo@raisehub.app', fullName: 'Avery Brooks', displayName: 'Willow & Co. Salon', businessName: 'Willow & Co. Salon', role: 'business' },
  jumpHouse: { slug: 'business-jump-house', email: 'jumphouse.demo@raisehub.app', fullName: 'Marcus Hill', displayName: 'Lakeview Jump House', businessName: 'Lakeview Jump House', role: 'business' },
  autoCare: { slug: 'business-auto-care', email: 'autocare.demo@raisehub.app', fullName: 'Nina Patel', displayName: 'North Loop Auto Care', businessName: 'North Loop Auto Care', role: 'business' },
  fitness: { slug: 'business-fitness', email: 'fitness.demo@raisehub.app', fullName: 'Caleb Morgan', displayName: 'Momentum Family Fitness', businessName: 'Momentum Family Fitness', role: 'business' },
  homeService: { slug: 'business-home-service', email: 'homeservice.demo@raisehub.app', fullName: 'Rosa Martinez', displayName: 'BrightSide Home Services', businessName: 'BrightSide Home Services', role: 'business' },
  quantumRehab: { slug: 'business-quantum-rehab-expo', email: 'quantum.expo.demo@raisehub.app', fullName: 'Abilities Expo Demo', displayName: 'Quantum Rehab', businessName: 'Quantum Rehab', role: 'business' },
  sunriseMedical: { slug: 'business-sunrise-medical-expo', email: 'sunrise.expo.demo@raisehub.app', fullName: 'Abilities Expo Demo', displayName: 'Sunrise Medical / RGK', businessName: 'Sunrise Medical / RGK', role: 'business' },
  mobilityWorks: { slug: 'business-mobilityworks-expo', email: 'mobilityworks.expo.demo@raisehub.app', fullName: 'Abilities Expo Demo', displayName: 'MobilityWorks', businessName: 'MobilityWorks', role: 'business' },
  sureHands: { slug: 'business-surehands-expo', email: 'surehands.expo.demo@raisehub.app', fullName: 'Abilities Expo Demo', displayName: 'SureHands Lift & Care Systems', businessName: 'SureHands Lift & Care Systems', role: 'business' },
} as const

export type LakeviewIdentityKey = keyof typeof LAKEVIEW_IDENTITIES

export const LAKEVIEW_BUSINESSES = [
  { key: 'mapleCoffee', name: 'Maple Street Coffee Co.', description: 'A neighborhood café known for handcrafted drinks, fresh pastries, and dependable support for local schools.', category: 'Coffee & Bakery', address: '412 Maple Street, Lubbock, TX 79401', phone: '(806) 555-0142', websiteUrl: 'https://example.com/maple-street-coffee', mapsUrl: 'https://maps.google.com/?q=412+Maple+Street+Lubbock+TX', subscriptionTier: 'growth' },
  { key: 'willowSalon', name: 'Willow & Co. Salon', description: 'A welcoming full-service salon offering family cuts, color, styling, and special-event services.', category: 'Salon & Personal Care', address: '2210 34th Street, Lubbock, TX 79411', phone: '(806) 555-0168', websiteUrl: 'https://example.com/willow-salon', mapsUrl: 'https://maps.google.com/?q=2210+34th+Street+Lubbock+TX', subscriptionTier: 'growth' },
  { key: 'jumpHouse', name: 'Lakeview Jump House', description: 'Indoor family entertainment with open jump sessions, birthday parties, and group events.', category: 'Family Entertainment', address: '5802 Slide Road, Lubbock, TX 79414', phone: '(806) 555-0191', websiteUrl: 'https://example.com/lakeview-jump-house', mapsUrl: 'https://maps.google.com/?q=5802+Slide+Road+Lubbock+TX', subscriptionTier: 'growth' },
  { key: 'autoCare', name: 'North Loop Auto Care', description: 'Local preventive maintenance and repair shop focused on clear recommendations and reliable service.', category: 'Automotive Services', address: '3301 North Loop 289, Lubbock, TX 79415', phone: '(806) 555-0127', websiteUrl: 'https://example.com/north-loop-auto-care', mapsUrl: 'https://maps.google.com/?q=3301+North+Loop+289+Lubbock+TX', subscriptionTier: 'free' },
  { key: 'fitness', name: 'Momentum Family Fitness', description: 'Community fitness studio with beginner-friendly classes, youth sessions, and practical wellness coaching.', category: 'Fitness & Wellness', address: '7415 Quaker Avenue, Lubbock, TX 79424', phone: '(806) 555-0184', websiteUrl: 'https://example.com/momentum-family-fitness', mapsUrl: 'https://maps.google.com/?q=7415+Quaker+Avenue+Lubbock+TX', subscriptionTier: 'growth' },
  { key: 'homeService', name: 'BrightSide Home Services', description: 'A newer locally owned home-service company providing seasonal maintenance and small household repairs.', category: 'Home Services', address: 'Lubbock, TX 79423', phone: '(806) 555-0119', websiteUrl: null, mapsUrl: null, subscriptionTier: 'free' },
  { key: 'quantumRehab', name: 'Quantum Rehab', description: `Power mobility and complex rehabilitation technology example for an in-person RaiseHub demonstration. ${EXPO_DEMO_DISCLAIMER}`, category: 'Mobility & Complex Rehab', address: 'Abilities Expo Houston demo', phone: '(800) 555-0707', websiteUrl: null, mapsUrl: null, subscriptionTier: 'growth' },
  { key: 'sunriseMedical', name: 'Sunrise Medical / RGK', description: `Custom manual wheelchairs, seating, and mobility configuration example for an in-person RaiseHub demonstration. ${EXPO_DEMO_DISCLAIMER}`, category: 'Wheelchairs & Seating', address: 'Abilities Expo Houston demo', phone: '(800) 555-0800', websiteUrl: null, mapsUrl: null, subscriptionTier: 'growth' },
  { key: 'mobilityWorks', name: 'MobilityWorks', description: `Accessible vehicle and mobility-equipment consultation example for an in-person RaiseHub demonstration. ${EXPO_DEMO_DISCLAIMER}`, category: 'Accessible Transportation', address: 'Abilities Expo Houston demo', phone: '(800) 555-1007', websiteUrl: null, mapsUrl: null, subscriptionTier: 'growth' },
  { key: 'sureHands', name: 'SureHands Lift & Care Systems', description: `Home transfer, lift, and independent-living consultation example for an in-person RaiseHub demonstration. ${EXPO_DEMO_DISCLAIMER}`, category: 'Home Accessibility', address: 'Abilities Expo Houston demo', phone: '(800) 555-0818', websiteUrl: null, mapsUrl: null, subscriptionTier: 'growth' },
] as const

export const LAKEVIEW_CAMPAIGNS = [
  { key: 'library', name: 'Lakeview Library Refresh', description: 'Add new reading sets, flexible seating, and family literacy resources.', goalAmount: 400, purchaseCount: 2, daysStartedAgo: 5, daysRemaining: 55, status: 'active' },
  { key: 'arts', name: 'Lakeview Arts & Music Fund', description: 'Replace classroom instruments and expand hands-on art supplies for every grade.', goalAmount: 500, purchaseCount: 12, daysStartedAgo: 18, daysRemaining: 42, status: 'active' },
  { key: 'playground', name: 'Lakeview Playground Improvement Fund', description: 'Add inclusive playground equipment, shaded seating, and safer ground surfacing.', goalAmount: 600, purchaseCount: 25, daysStartedAgo: 28, daysRemaining: 32, status: 'active' },
  { key: 'stem', name: 'Lakeview STEM Lab Finish Line', description: 'Complete the school STEM lab with robotics kits, storage, and collaborative work tables.', goalAmount: 500, purchaseCount: 27, daysStartedAgo: 40, daysRemaining: 20, status: 'active' },
] as const

export const LAKEVIEW_OFFERS = [
  { key: 'coffee-bogo', businessKey: 'mapleCoffee', title: 'Buy One Drink, Get One 50% Off', description: 'Enjoy a second handcrafted drink for half price.', discount: '50% off second drink', usageRule: 'one-time', startOffsetDays: -30, endOffsetDays: 120, active: true },
  { key: 'coffee-pastry', businessKey: 'mapleCoffee', title: 'Free Pastry with Two Large Drinks', description: 'Choose one bakery pastry with the purchase of two large drinks.', discount: 'Free pastry', usageRule: 'one-time', startOffsetDays: -10, endOffsetDays: 70, active: true },
  { key: 'salon-upgrade', businessKey: 'willowSalon', title: 'Complimentary Deep Conditioning Upgrade', description: 'Add a deep conditioning treatment to any paid haircut service.', discount: 'Free service upgrade', usageRule: 'one-time', startOffsetDays: -15, endOffsetDays: 90, active: true },
  { key: 'jump-family', businessKey: 'jumpHouse', title: '$8 Off a Family Jump Session', description: 'Save on one family open-jump session for up to four guests.', discount: '$8 off', usageRule: 'one-time', startOffsetDays: -20, endOffsetDays: 45, active: true },
  { key: 'auto-oil', businessKey: 'autoCare', title: 'Free Tire Rotation with Oil Change', description: 'Receive a standard tire rotation with a qualifying oil change.', discount: 'Free tire rotation', usageRule: 'one-time', startOffsetDays: 7, endOffsetDays: 100, active: true },
  { key: 'fitness-class', businessKey: 'fitness', title: 'Two-for-One Family Fitness Class', description: 'Bring a family member free to one eligible group class.', discount: 'Buy one, get one free', usageRule: 'one-time', startOffsetDays: -35, endOffsetDays: 10, active: true },
  { key: 'home-check', businessKey: 'homeService', title: '$15 Off a Seasonal Home Check', description: 'Save on a scheduled seasonal home-maintenance assessment.', discount: '$15 off', usageRule: 'one-time', startOffsetDays: -120, endOffsetDays: -10, active: false },
  { key: 'quantum-consult', businessKey: 'quantumRehab', title: 'Complimentary Mobility Technology Consultation', description: `Discuss mobility goals, power-chair features, seating, and control options. ${EXPO_DEMO_DISCLAIMER}`, discount: 'Free consultation', usageRule: 'one-time', startOffsetDays: -2, endOffsetDays: 120, active: true },
  { key: 'sunrise-config', businessKey: 'sunriseMedical', title: 'Free Wheelchair Configuration Review', description: `Review fit, chair configuration, seating, and potential efficiency improvements. ${EXPO_DEMO_DISCLAIMER}`, discount: 'Free configuration review', usageRule: 'one-time', startOffsetDays: -2, endOffsetDays: 120, active: true },
  { key: 'mobilityworks-assessment', businessKey: 'mobilityWorks', title: 'Free Accessible Vehicle Needs Assessment', description: `Explore vehicle access, driving adaptations, transfers, and mobility-equipment transport needs. ${EXPO_DEMO_DISCLAIMER}`, discount: 'Free assessment', usageRule: 'one-time', startOffsetDays: -2, endOffsetDays: 120, active: true },
  { key: 'surehands-home', businessKey: 'sureHands', title: 'Free Home Transfer Consultation', description: `Discuss lift, transfer, bathroom, and home-accessibility needs with no purchase required. ${EXPO_DEMO_DISCLAIMER}`, discount: 'Free consultation', usageRule: 'one-time', startOffsetDays: -2, endOffsetDays: 120, active: true },
] as const

export function expectedCampaignProgress(goalAmount: number, purchaseCount: number) {
  const organizationEarningsPerPurchase = 18
  return Math.min(100, (purchaseCount * organizationEarningsPerPurchase / goalAmount) * 100)
}

export function validateLakeviewScenario() {
  const businessKeys = new Set(LAKEVIEW_BUSINESSES.map((business) => business.key))
  const offerKeys = new Set(LAKEVIEW_OFFERS.map((offer) => offer.key))
  const campaignKeys = new Set(LAKEVIEW_CAMPAIGNS.map((campaign) => campaign.key))

  if (businessKeys.size !== LAKEVIEW_BUSINESSES.length) throw new Error('Duplicate Lakeview business key.')
  if (offerKeys.size !== LAKEVIEW_OFFERS.length) throw new Error('Duplicate Lakeview offer key.')
  if (campaignKeys.size !== LAKEVIEW_CAMPAIGNS.length) throw new Error('Duplicate Lakeview campaign key.')

  for (const offer of LAKEVIEW_OFFERS) {
    if (!businessKeys.has(offer.businessKey)) throw new Error(`Unknown business key for ${offer.key}.`)
  }

  return {
    identities: Object.keys(LAKEVIEW_IDENTITIES).length,
    businesses: LAKEVIEW_BUSINESSES.length,
    campaigns: LAKEVIEW_CAMPAIGNS.length,
    offers: LAKEVIEW_OFFERS.length,
  }
}
