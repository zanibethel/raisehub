export type BusinessAppModuleKey = 'menu' | 'locations' | 'booking'

export type BusinessAppModuleDefinition = {
  key: BusinessAppModuleKey
  title: string
  shortTitle: string
  description: string
  setupHint: string
}

export type MenuItem = {
  name: string
  price: string
  description: string
  category: string
}

export type MenuConfig = {
  heading: string
  intro: string
  items: MenuItem[]
}

export type LocationStop = {
  name: string
  address: string
  schedule: string
  note: string
}

export type LocationConfig = {
  heading: string
  intro: string
  stops: LocationStop[]
}

export type BookingConfig = {
  heading: string
  intro: string
  url: string
  label: string
}

export const BUSINESS_APP_MODULES: Record<
  BusinessAppModuleKey,
  BusinessAppModuleDefinition
> = {
  menu: {
    key: 'menu',
    title: 'Menu / Catalog',
    shortTitle: 'Menu',
    description:
      'Show food, products, or services with prices, categories, and short descriptions.',
    setupHint: 'Add only the items customers need to see first. You can grow it later.',
  },
  locations: {
    key: 'locations',
    title: 'Roaming Locations',
    shortTitle: 'Locations',
    description:
      'Show where a mobile business will be today and what stops are coming next.',
    setupHint: 'Use this for food trucks, pop-ups, mobile services, and rotating locations.',
  },
  booking: {
    key: 'booking',
    title: 'Book / Schedule',
    shortTitle: 'Booking',
    description:
      'Give customers a clear booking action now, with native RaiseHub scheduling added later.',
    setupHint: 'Connect the booking page you already use so customers have one obvious next step.',
  },
}

const CATEGORY_MODULES: Record<string, BusinessAppModuleKey[]> = {
  'restaurant / food': ['menu', 'booking'],
  'food truck': ['menu', 'locations'],
  'salon / beauty': ['booking', 'menu'],
  automotive: ['booking'],
  'retail / boutique': ['menu'],
  'fitness / wellness': ['booking'],
  'home services': ['booking'],
  'medical / dental': ['booking'],
  entertainment: ['booking'],
  'pet services': ['booking'],
  'professional services': ['booking'],
  'mobile business': ['locations', 'booking'],
  'pop-up / event vendor': ['menu', 'locations'],
  other: ['booking'],
}

export function normalizeBusinessCategory(category: string | null | undefined) {
  return (category ?? '').trim().toLowerCase()
}

export function getRecommendedBusinessModules(
  category: string | null | undefined
): BusinessAppModuleKey[] {
  const normalized = normalizeBusinessCategory(category)
  return CATEGORY_MODULES[normalized] ?? CATEGORY_MODULES.other
}

export function normalizeEnabledModules(value: unknown): BusinessAppModuleKey[] {
  if (!Array.isArray(value)) return []
  const allowed = new Set<BusinessAppModuleKey>(['menu', 'locations', 'booking'])
  return value.filter(
    (item): item is BusinessAppModuleKey =>
      typeof item === 'string' && allowed.has(item as BusinessAppModuleKey)
  )
}

export function normalizeMenuConfig(value: unknown): MenuConfig {
  const source =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}

  const items = Array.isArray(source.items)
    ? source.items
        .filter(
          (item): item is Record<string, unknown> =>
            Boolean(item) && typeof item === 'object' && !Array.isArray(item)
        )
        .map((item) => ({
          name: typeof item.name === 'string' ? item.name : '',
          price: typeof item.price === 'string' ? item.price : '',
          description:
            typeof item.description === 'string' ? item.description : '',
          category: typeof item.category === 'string' ? item.category : '',
        }))
    : []

  return {
    heading:
      typeof source.heading === 'string' && source.heading.trim()
        ? source.heading
        : 'Menu / Catalog',
    intro: typeof source.intro === 'string' ? source.intro : '',
    items,
  }
}

export function normalizeLocationConfig(value: unknown): LocationConfig {
  const source =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}

  const stops = Array.isArray(source.stops)
    ? source.stops
        .filter(
          (item): item is Record<string, unknown> =>
            Boolean(item) && typeof item === 'object' && !Array.isArray(item)
        )
        .map((item) => ({
          name: typeof item.name === 'string' ? item.name : '',
          address: typeof item.address === 'string' ? item.address : '',
          schedule: typeof item.schedule === 'string' ? item.schedule : '',
          note: typeof item.note === 'string' ? item.note : '',
        }))
    : []

  return {
    heading:
      typeof source.heading === 'string' && source.heading.trim()
        ? source.heading
        : 'Where to find us',
    intro: typeof source.intro === 'string' ? source.intro : '',
    stops,
  }
}

export function normalizeBookingConfig(value: unknown): BookingConfig {
  const source =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}

  return {
    heading:
      typeof source.heading === 'string' && source.heading.trim()
        ? source.heading
        : 'Book with us',
    intro: typeof source.intro === 'string' ? source.intro : '',
    url: typeof source.url === 'string' ? source.url : '',
    label:
      typeof source.label === 'string' && source.label.trim()
        ? source.label
        : 'Book appointment',
  }
}
