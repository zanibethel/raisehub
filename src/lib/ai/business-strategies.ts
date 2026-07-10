import type { OfferGoal } from '@/app/dashboard/offers/new/components/goal-step'

export type BusinessStrategy = {
  category: string
  commonGoals: OfferGoal[]
  preferredOfferTypes: string[]
  avoidOfferTypes: string[]
  highPerceivedValueIdeas: string[]
  businessProtectionNotes: string[]
}

export const BUSINESS_STRATEGIES: Record<string, BusinessStrategy> = {
  'food truck': {
    category: 'Food Truck',

    commonGoals: [
      'event-traffic',
      'new-customers',
      'slow-day',
      'repeat-customers',
      'average-purchase',
    ],

    preferredOfferTypes: [
      'Free side with combo',
      'Free drink with entrée or combo',
      'Event-only bundle',
      'VIP combo upgrade',
      'Buy one item and receive a second item at a strong discount',
      'Location-specific special',
    ],

    avoidOfferTypes: [
      '$1 off',
      '$2 off without another benefit',
      'Small percentage discounts',
      'Offers already available through social media',
    ],

    highPerceivedValueIdeas: [
      'Free loaded fries with any combo',
      'Free regular drink with an entrée',
      'Exclusive entrée, side, and drink bundle',
      'Buy two entrées and receive a selected side free',
      'RaiseHub-only menu item or combo',
    ],

    businessProtectionNotes: [
      'Prefer high-margin sides, drinks, and upgrades.',
      'Require an entrée or combo purchase when appropriate.',
      'Use event-specific or location-specific redemption windows.',
      'Avoid discounting the highest-cost menu item without a purchase requirement.',
    ],
  },

  'restaurant / food': {
    category: 'Restaurant / Food',

    commonGoals: [
      'new-customers',
      'repeat-customers',
      'slow-day',
      'average-purchase',
      'new-product',
    ],

    preferredOfferTypes: [
      'Free appetizer with entrée purchase',
      'Free dessert with two entrées',
      'Kids eat free with adult purchase',
      'BOGO entrée with restrictions',
      'Exclusive meal bundle',
      'Complimentary upgrade',
    ],

    avoidOfferTypes: [
      '5% off',
      '10% off without a minimum purchase',
      'Free low-value item with no purchase',
      'Publicly available happy-hour pricing',
    ],

    highPerceivedValueIdeas: [
      'Free appetizer with two entrée purchases',
      'Buy one entrée and receive the second at 50% off',
      'Free dessert with a qualifying meal purchase',
      'RaiseHub-exclusive family meal bundle',
      'Complimentary premium side upgrade',
    ],

    businessProtectionNotes: [
      'Require qualifying entrée purchases.',
      'Prefer high-margin appetizers, desserts, drinks, and upgrades.',
      'Limit offers to quieter days when useful.',
      'Exclude premium items when necessary.',
    ],
  },

  'salon / beauty': {
    category: 'Salon / Beauty',

    commonGoals: [
      'new-customers',
      'appointments',
      'repeat-customers',
      'slow-day',
      'new-product',
    ],

    preferredOfferTypes: [
      'Free conditioning treatment',
      'Free brow wax with service',
      'Complimentary service upgrade',
      'Product sample or treatment',
      'Referral reward',
      'Midweek appointment bonus',
    ],

    avoidOfferTypes: [
      '$5 off',
      'Small percentage discounts',
      'Discounting high-labor services too deeply',
      'Offers already given to every new client',
    ],

    highPerceivedValueIdeas: [
      'Free conditioning treatment with color service',
      'Complimentary brow wax with qualifying service',
      'Free premium product treatment',
      'Bring a friend and both receive an upgrade',
      'RaiseHub-only midweek beauty package',
    ],

    businessProtectionNotes: [
      'Prefer low-product-cost upgrades over reducing service prices.',
      'Limit offers to selected services or appointment windows.',
      'Use add-ons that create a premium experience.',
      'Avoid discounts that fail to cover stylist time.',
    ],
  },

  automotive: {
    category: 'Automotive',

    commonGoals: [
      'new-customers',
      'repeat-customers',
      'slow-day',
      'average-purchase',
    ],

    preferredOfferTypes: [
      'Free tire rotation with service',
      'Free inspection',
      'Free alignment check',
      'Complimentary car wash',
      'Seasonal vehicle check',
    ],

    avoidOfferTypes: [
      'Small percentage discounts on major repair work',
      'Open-ended discounts',
      'Offers without service qualification',
    ],

    highPerceivedValueIdeas: [
      'Free tire rotation with oil change',
      'Complimentary seasonal inspection',
      'Free alignment check with tire purchase',
      'Free car wash with qualifying service',
    ],

    businessProtectionNotes: [
      'Require a qualifying paid service.',
      'Use diagnostic or inspection services with low fulfillment cost.',
      'Clearly exclude parts or premium services when appropriate.',
    ],
  },

  'retail / boutique': {
    category: 'Retail / Boutique',

    commonGoals: [
      'new-customers',
      'repeat-customers',
      'average-purchase',
      'new-product',
      'slow-day',
    ],

    preferredOfferTypes: [
      'Free accessory with purchase',
      'Exclusive bundle',
      'Buy one get one discounted',
      'Spend threshold reward',
      'Members-only product',
    ],

    avoidOfferTypes: [
      '5% off',
      'Discounts lower than normal public sales',
      'Offers already available through email signup',
    ],

    highPerceivedValueIdeas: [
      'Free selected accessory with a qualifying purchase',
      'RaiseHub-exclusive product bundle',
      'Buy one item and receive the second at 50% off',
      'Spend $50 and receive a premium gift',
    ],

    businessProtectionNotes: [
      'Use products with strong margin or low cost.',
      'Set a minimum purchase threshold.',
      'Exclude clearance or premium brands where necessary.',
    ],
  },

  'fitness / wellness': {
    category: 'Fitness / Wellness',

    commonGoals: [
      'new-customers',
      'repeat-customers',
      'appointments',
      'new-product',
    ],

    preferredOfferTypes: [
      'Free guest pass',
      'Free first class',
      'Complimentary body scan',
      'Free training session',
      'Premium trial package',
    ],

    avoidOfferTypes: [
      'Small membership discounts',
      'Offers identical to public free trials',
      'Deep recurring membership discounts',
    ],

    highPerceivedValueIdeas: [
      'Free personal training introduction',
      'Bring a friend free',
      'Complimentary body composition scan',
      'RaiseHub-only seven-day premium trial',
    ],

    businessProtectionNotes: [
      'Use introductory services that can convert into memberships.',
      'Limit one redemption per new customer.',
      'Avoid ongoing discounts that reduce recurring revenue.',
    ],
  },

  general: {
    category: 'Community Partner',

    commonGoals: [
      'new-customers',
      'repeat-customers',
      'slow-day',
      'new-product',
      'average-purchase',
    ],

    preferredOfferTypes: [
      'Free upgrade',
      'Free add-on',
      'Exclusive bundle',
      'Buy one get one',
      'Members-only experience',
      'Limited-time premium bonus',
    ],

    avoidOfferTypes: [
      '5% off',
      '$1 off',
      '$2 off',
      'Generic discounts',
      'Promotions already available publicly',
    ],

    highPerceivedValueIdeas: [
      'Complimentary premium add-on with purchase',
      'RaiseHub-exclusive bundle',
      'Buy one and receive a second benefit',
      'Members-only upgrade',
    ],

    businessProtectionNotes: [
      'Use high-perceived-value, low-cost additions.',
      'Require a qualifying purchase when appropriate.',
      'Set clear limits and expiration dates.',
      'Keep the offer exclusive to RaiseHub members.',
    ],
  },
}

export function normalizeBusinessCategory(category: string) {
  return category.trim().toLowerCase()
}

export function getBusinessStrategy(category: string) {
  const normalized = normalizeBusinessCategory(category)

  return BUSINESS_STRATEGIES[normalized] ?? BUSINESS_STRATEGIES.general
}
