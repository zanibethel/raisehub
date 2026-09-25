export const BUSINESS_CATEGORIES = [
  'Restaurant / Food',
  'Food Truck',
  'Salon / Beauty',
  'Automotive',
  'Retail / Boutique',
  'Fitness / Wellness',
  'Home Services',
  'Medical / Dental',
  'Entertainment',
  'Pet Services',
  'Professional Services',
  'Mobile Business',
  'Pop-Up / Event Vendor',
  'Other',
] as const

export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number]
