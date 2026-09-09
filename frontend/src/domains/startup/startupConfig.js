// Configuration, presets, and normalizers for Startup Domain

export const STARTUP_CONFIG = {
  title: 'Startup & Venture',
  subtitle: 'Assess founder readiness, runway runway viability, and team traction with explainable signals.',
  freeTextExample: 'Example: funding 250000, team size 7, market fintech enterprise, experience 4',
  examples: [
    'Funding 350000, team size 6, market B2B SaaS, experience 5',
    'Meri startup fintech hai, funding 20 lakh, team 4 log, founder experience 2 saal',
    'Pre-seed stage, raised 150000, 3 engineers, market HealthTech AI, founder experience 3 years',
  ],
  fields: [
    { name: 'funding', label: 'Funding Capital ($)', type: 'number', min: 0, required: true },
    { name: 'team_size', label: 'Team Size (Headcount)', type: 'number', min: 1, required: true },
    { name: 'market', label: 'Target Market / Vertical', type: 'text', required: true },
    { name: 'experience', label: 'Founder Experience (Years)', type: 'number', min: 0, required: true },
  ],
}

export const STARTUP_PRESETS = [
  {
    label: 'AI Agents Infra Seed',
    desc: 'Strong engineering team, high venture interest',
    badge: 'DeepTech',
    data: {
      funding: 500000,
      team_size: 5,
      market: 'Developer Tools & AI Infrastructure',
      experience: 6,
    },
  },
  {
    label: 'Bootstrapped B2B SaaS',
    desc: 'Lean team, capital efficient',
    badge: 'SaaS',
    data: {
      funding: 75000,
      team_size: 4,
      market: 'B2B Enterprise Software',
      experience: 4,
    },
  },
  {
    label: 'Fintech Regulated',
    desc: 'High capital requirements, experienced founders',
    badge: 'Fintech',
    data: {
      funding: 750000,
      team_size: 8,
      market: 'Digital Banking & Compliance',
      experience: 8,
    },
  },
  {
    label: 'Early Pre-Seed Team',
    desc: 'First-time founders, prototyping phase',
    badge: 'Pre-Seed',
    data: {
      funding: 25000,
      team_size: 2,
      market: 'Consumer Productivity',
      experience: 1,
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

export const parseStartupPrompt = (text) => {
  const commaParts = text.replace(/[\n]/g, ' ').split(/[,;]+/).map((v) => v.trim()).filter(Boolean)
  const funding = pickNumber(extractNumber(text, ['funding', 'capital', 'raised']), Number(commaParts[0])) ?? 250000
  const teamSize = pickNumber(extractNumber(text, ['team size', 'team', 'members', 'headcount']), Number(commaParts[1])) ?? 5
  const marketMatch = text.match(/(?:market|sector|domain|industry)\s*[:=]?\s*([a-zA-Z0-9\s-]+?)(?:,|\.|$)/i)
  const market = marketMatch ? marketMatch[1].trim() : (commaParts[2] || 'Enterprise Software')
  const experience = pickNumber(extractNumber(text, ['experience', 'years']), Number(commaParts[3])) ?? 4

  return {
    funding,
    team_size: teamSize,
    market,
    experience,
  }
}

export const validateStartupPayload = (payload) => {
  const errors = {}
  if (payload.funding === null || payload.funding === undefined || payload.funding < 0) {
    errors.funding = 'Funding amount is required.'
  }
  if (!payload.team_size || payload.team_size < 1) {
    errors.team_size = 'Team size must be at least 1.'
  }
  if (!payload.market?.trim?.()) {
    errors.market = 'Target market is required.'
  }
  if (payload.experience === null || payload.experience === undefined || payload.experience < 0) {
    errors.experience = 'Founder experience in years is required.'
  }
  return errors
}
