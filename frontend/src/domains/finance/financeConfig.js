// Configuration, presets, and normalizers for Finance Domain

export const FINANCE_CONFIG = {
  title: 'Finance & Underwriting',
  subtitle: 'Evaluate debt affordability, credit risk, and default likelihood with transparent SHAP explanations.',
  freeTextExample: 'Example: income 85000, loan 20000, credit score 735',
  examples: [
    'Income 90000, loan 18000, credit score 740',
    'Mera income 12 lakh hai aur loan 5 lakh, credit score 690, risk kitna hai?',
    'Annual income 120000, requested loan 35000, credit score 680',
  ],
  fields: [
    { name: 'income', label: 'Annual Income ($)', type: 'number', min: 1000, required: true },
    { name: 'loan', label: 'Requested Loan Amount ($)', type: 'number', min: 0, required: true },
    { name: 'credit_score', label: 'Credit Score (FICO)', type: 'number', min: 300, max: 850, required: true },
  ],
}

export const FINANCE_PRESETS = [
  {
    label: 'Prime Credit Borrower',
    desc: 'Strong income, high credit score',
    badge: 'Low Risk',
    data: {
      income: 110000,
      loan: 20000,
      credit_score: 780,
    },
  },
  {
    label: 'Standard Market Profile',
    desc: 'Moderate income, manageable debt',
    badge: 'Moderate',
    data: {
      income: 75000,
      loan: 18000,
      credit_score: 710,
    },
  },
  {
    label: 'Elevated Leverage Profile',
    desc: 'High loan-to-income ratio',
    badge: 'Elevated',
    data: {
      income: 48000,
      loan: 32000,
      credit_score: 640,
    },
  },
  {
    label: 'High Risk Applicant',
    desc: 'Low score, elevated repayment risk',
    badge: 'High Risk',
    data: {
      income: 38000,
      loan: 25000,
      credit_score: 560,
    },
  },
]

const clamp = (val, min, max) => Math.max(min, Math.min(val, max))

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

export const parseFinancePrompt = (text) => {
  const commaParts = text.replace(/[\n]/g, ' ').split(/[,;]+/).map((v) => v.trim()).filter(Boolean)
  const income = pickNumber(extractNumber(text, ['income', 'salary']), Number(commaParts[0])) ?? 60000
  const loan = pickNumber(extractNumber(text, ['loan', 'debt', 'amount']), Number(commaParts[1])) ?? 15000
  const credit = clamp(
    pickNumber(extractNumber(text, ['credit score', 'credit', 'score', 'fico']), Number(commaParts[2])) ?? 680,
    300,
    850
  )
  return { income, loan, credit_score: credit }
}

export const validateFinancePayload = (payload) => {
  const errors = {}
  if (!payload.income || payload.income < 1000) errors.income = 'Annual income must be at least $1,000.'
  if (payload.loan === null || payload.loan === undefined || payload.loan < 0) errors.loan = 'Loan amount is required.'
  if (!payload.credit_score || payload.credit_score < 300 || payload.credit_score > 850) {
    errors.credit_score = 'Credit score must be between 300 and 850.'
  }
  return errors
}
