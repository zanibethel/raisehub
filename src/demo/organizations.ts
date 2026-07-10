export type DemoOrganization = {
  id: string
  name: string
  category: string
  story: string
  goal: number
  raised: number
  supporters: number
  daysRemaining: number
  badge?: string
}

export const demoOrganizations: DemoOrganization[] = [
  {
    id: 'monterey-robotics',
    name: 'Monterey Robotics',
    category: 'School',
    story: 'Helping students build and compete with their next-generation robot.',
    goal: 12000,
    raised: 10860,
    supporters: 241,
    daysRemaining: 9,
    badge: 'Almost funded',
  },
  {
    id: 'lubbock-youth-soccer',
    name: 'Lubbock Youth Soccer',
    category: 'Youth Sports',
    story: 'Providing uniforms, equipment, and registration assistance for local players.',
    goal: 8500,
    raised: 4590,
    supporters: 138,
    daysRemaining: 24,
  },
  {
    id: 'south-plains-rescue',
    name: 'South Plains Animal Rescue',
    category: 'Nonprofit',
    story: 'Funding food, vaccinations, and emergency veterinary care for rescued animals.',
    goal: 6000,
    raised: 5175,
    supporters: 196,
    daysRemaining: 6,
    badge: 'Urgent need',
  },
  {
    id: 'coronado-band',
    name: 'Coronado Band Boosters',
    category: 'Arts',
    story: 'Helping students cover travel, instruments, and performance costs.',
    goal: 15000,
    raised: 6120,
    supporters: 174,
    daysRemaining: 31,
  },
  {
    id: 'west-texas-food-bank',
    name: 'West Texas Food Bank Drive',
    category: 'Community',
    story: 'Providing meals and pantry support for families across the region.',
    goal: 10000,
    raised: 7350,
    supporters: 304,
    daysRemaining: 14,
  },
  {
    id: 'veterans-family-fund',
    name: 'Veterans Family Support Fund',
    category: 'Community',
    story: 'Supporting local veterans and their families with emergency assistance.',
    goal: 7500,
    raised: 1980,
    supporters: 67,
    daysRemaining: 42,
  },
]
