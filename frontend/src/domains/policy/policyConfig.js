// Configuration, presets, and normalizers for Policy Domain

export const POLICY_CONFIG = {
  title: 'Government Policy & Public Impact',
  subtitle: 'Estimate public policy feasibility, budget allocation efficacy, and population impact with explainable signals.',
  freeTextExample: 'Example: sector renewable energy, budget 5000000, population 1200000',
  examples: [
    'Sector education, budget 5000000, population 1200000, political support high',
    'Rural health policy ke liye budget 2 crore aur population 8 lakh hai, feasibility batao',
    'Clean urban water initiative, budget 3500000, target population 950000',
  ],
  fields: [
    { name: 'sector', label: 'Policy Sector / Portfolio', type: 'text', required: true },
    { name: 'budget', label: 'Allocated Budget ($)', type: 'number', min: 10000, required: true },
    { name: 'population', label: 'Beneficiary Population', type: 'number', min: 100, required: true },
  ],
}

export const POLICY_PRESETS = [
  {
    label: 'Renewable Clean Energy',
    desc: 'Grid modernization & distributed solar subsidies',
    badge: 'Energy',
    data: {
      sector: 'Renewable Energy & Power Grid',
      budget: 15000000,
      population: 2500000,
    },
  },
  {
    label: 'Primary Rural Healthcare',
    desc: 'Mobile diagnostic clinics & health worker capacity',
    badge: 'Healthcare',
    data: {
      sector: 'Public Health Infrastructure',
      budget: 8000000,
      population: 1400000,
    },
  },
  {
    label: 'STEM Digital Education',
    desc: 'Classroom connectivity & curriculum modernization',
    badge: 'Education',
    data: {
      sector: 'Public Education & Skills',
      budget: 6500000,
      population: 850000,
    },
  },
  {
    label: 'Urban Transit Expansion',
    desc: 'Electric bus fleet & congestion reduction',
    badge: 'Transit',
    data: {
      sector: 'Urban Transport & Transit',
      budget: 22000000,
      population: 4200000,
    },
  },
]

const extractNumber = (text, keys) => {
  const lower = text.toLowerCase()
  for (const key of keys) {
    const match = lower.match(new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b\\D*([0-9]+(?:\\.[0-9]+)?)`, 'i'))
    if (match) return Number(match[1])
  }
  return null
}

const pickNumber = (...values) => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value) && value !== 0) return value
  }
  return null
}

export const parsePolicyPrompt = (text) => {
  const commaParts = text.replace(/[\n]/g, ' ').split(/[,;]+/).map((v) => v.trim()).filter(Boolean)
  const sectorMatch = text.match(/(?:sector|domain|area|portfolio)\s*[:=]?\s*([a-zA-Z0-9\s-]+?)(?:,|\.|$)/i)
  const sector = sectorMatch ? sectorMatch[1].trim() : (commaParts[0] || 'Public Infrastructure')
  const budget = pickNumber(extractNumber(text, ['budget', 'fund', 'allocation', 'cost']), Number(commaParts[1])) ?? 5000000
  const population = pickNumber(extractNumber(text, ['population', 'people', 'citizens', 'beneficiaries']), Number(commaParts[2])) ?? 1200000

  return {
    sector,
    budget,
    population,
  }
}

export const validatePolicyPayload = (payload) => {
  const errors = {}
  if (!payload.sector?.trim?.()) {
    errors.sector = 'Policy sector is required.'
  }
  if (!payload.budget || payload.budget < 10000) {
    errors.budget = 'Budget allocation must be at least $10,000.'
  }
  if (!payload.population || payload.population < 100) {
    errors.population = 'Beneficiary population must be at least 100.'
  }
  return errors
}
