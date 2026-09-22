// Configuration, presets, and normalizers for Career Domain

export const CAREER_CONFIG = {
  title: 'Career & Talent',
  subtitle: 'Evaluate academic credentials, engineering projects, and skills alignment with explainable career signals.',
  freeTextExample: 'Example: cgpa 8.4, course btech cse, specialization ai and ml, skills python sql react, certifications aws cloud practitioner, projects fraud detector dashboard, interest software development',
  examples: [
    'CGPA 8.2, BTech CSE, skills Python SQL React, projects chatbot and dashboard, interest software engineering',
    'Meri CGPA 7.8 hai, skills Python SQL hain, data science ke liye roadmap batao',
    'GPA 3.8/4.0, BS Computer Science, skills PyTorch Docker Kubernetes, projects ML pipeline, interest AI Systems',
  ],
  fields: [
    { name: 'cgpa', label: 'Academic Score', type: 'number', min: 0, max: 10, required: true },
    { name: 'course', label: 'Course / Degree', type: 'text', required: true },
    { name: 'specialization', label: 'Specialization', type: 'text' },
    { name: 'education_level', label: 'Education Level', type: 'text' },
    { name: 'year_of_study', label: 'Year Of Study', type: 'number', min: 1, max: 8 },
    { name: 'skills', label: 'Skills (comma-separated)', type: 'text', required: true },
    { name: 'certifications', label: 'Certifications (comma-separated)', type: 'text' },
    { name: 'projects', label: 'Projects (comma-separated)', type: 'text', required: true },
    { name: 'interest', label: 'Interest / Direction', type: 'text', required: true },
  ],
}

export const CAREER_PERSONAS = [
  {
    id: 'student',
    label: 'Student / Final Year',
    badge: 'Academic Focus',
    icon: 'academic-cap',
    color: 'from-blue-500 to-indigo-600',
    description: 'College credentials, CGPA/GPA, academic coursework & capstone projects.',
    defaultYears: 0,
  },
  {
    id: 'graduate',
    label: 'Recent Graduate / Job Seeker',
    badge: 'Hiring Focus',
    icon: 'user-check',
    color: 'from-emerald-500 to-teal-600',
    description: 'Immediate hiring readiness, portfolio proof & internship experience.',
    defaultYears: 0.5,
  },
  {
    id: 'professional',
    label: 'Working Professional',
    badge: 'Growth & Pivot',
    icon: 'briefcase',
    color: 'from-purple-500 to-violet-600',
    description: 'Career pivot, domain shift, Years of Experience (YoE) & senior role growth.',
    defaultYears: 3.0,
  },
]

export const CAREER_PARENT_DOMAINS = [
  {
    id: 'engineering',
    label: 'Engineering & Technology',
    badge: 'Tech & AI',
    icon: 'code',
    color: 'from-cyan-500 to-blue-600',
    description: 'Software Engineering, Cloud Infrastructure, Data Science, AI/ML & Cybersecurity.',
    skillSuggestions: ['Python', 'React', 'TypeScript', 'Docker', 'SQL', 'FastAPI', 'PyTorch', 'AWS', 'Kubernetes', 'MLOps'],
    projectSuggestions: ['Multimodal RAG Agent', 'Real-Time Fraud Detection Pipeline', 'Collaborative Whiteboard'],
    roleSuggestions: ['AI Systems & Machine Learning Engineer', 'Full-Stack Software Engineer', 'Cloud & DevOps Architect', 'Cybersecurity Specialist'],
    defaultValues: {
      course: 'B.Tech',
      specialization: 'Computer Science & Engineering',
      skills: ['Python', 'React', 'SQL', 'Docker', 'FastAPI'],
      projects: ['Full-Stack Collaborative Whiteboard', 'LLM RAG Pipeline'],
      interest: 'AI & Software Engineering',
    },
    samplePrompts: [
      'CGPA 8.4, BTech CSE, skills Python SQL React Docker FastAPI, projects LLM RAG Pipeline, interest AI & Software Engineering',
      'GPA 3.8/4.0, BS Computer Science, skills PyTorch Docker Kubernetes, projects ML Pipeline, interest AI Systems',
      'Meri CGPA 7.8 hai, skills Python SQL React, degree BTech, interest full-stack software development',
    ],
  },
  {
    id: 'legal',
    label: 'Legal, Risk & Compliance',
    badge: 'Law & Governance',
    icon: 'scale',
    color: 'from-amber-500 to-orange-600',
    description: 'Corporate Law, Cyber Law, GDPR & Data Privacy, Regulatory Compliance & IP.',
    skillSuggestions: ['GDPR & Data Privacy', 'Contract Drafting', 'Cyber Law', 'Intellectual Property', 'CIPP/E', 'Regulatory Compliance', 'Legal Research'],
    projectSuggestions: ['Corporate GDPR Compliance Audit Protocol', 'Cross-Border SaaS Contract Engine', 'Cyber Law & IP Case Law Synthesis'],
    roleSuggestions: ['In-House Legal Counsel & Compliance', 'Corporate Regulatory & Risk Officer', 'Cyber Law & IP Specialist'],
    defaultValues: {
      course: 'BA LLB',
      specialization: 'Cyber Law & Corporate Governance',
      skills: ['GDPR & Data Privacy', 'Contract Drafting', 'Regulatory Compliance', 'Legal Research', 'CIPP/E'],
      projects: ['SaaS Data Privacy & Compliance Framework', 'M&A Legal Due Diligence Audit'],
      interest: 'Corporate & Cyber Law',
    },
    samplePrompts: [
      'CGPA 8.2, BA LLB, specialization Cyber Law & Corporate Governance, skills GDPR & Data Privacy, Contract Drafting, CIPP/E, projects SaaS Data Privacy Audit, interest Corporate & Cyber Law',
      'Meri CGPA 7.8 hai, BA LLB in Cyber Law, skills Contract Drafting Regulatory Compliance Legal Research, interest In-House Legal Counsel',
      'GPA 3.9/4.0, LLM Corporate Law, skills GDPR Compliance IP Cyber Law, projects Cross-Border Contract Audit, interest Cyber Law Specialist',
    ],
  },
  {
    id: 'finance',
    label: 'Finance, Banking & Accounting',
    badge: 'Capital & Markets',
    icon: 'trending-up',
    color: 'from-emerald-500 to-teal-600',
    description: 'FinTech, Investment Banking, Equity Research, Valuation & Risk Analytics.',
    skillSuggestions: ['Financial Modeling', 'Corporate Finance', 'Valuation', 'Excel (VBA)', 'Python for Finance', 'SQL', 'Risk Analysis', 'CFA Level 1'],
    projectSuggestions: ['LBO Valuation & DCF Model Suite', 'Credit Risk Scoring Engine', 'Algorithmic Portfolio Rebalancer'],
    roleSuggestions: ['Financial Risk & Investment Analyst', 'Corporate Finance Associate'],
    defaultValues: {
      course: 'B.Com / MBA',
      specialization: 'Finance & Financial Analytics',
      skills: ['Financial Modeling', 'Valuation', 'Corporate Finance', 'Excel (VBA)', 'Python'],
      projects: ['DCF & M&A Valuation Model', 'Fintech Credit Risk Assessment Engine'],
      interest: 'Investment Banking & Corporate Finance',
    },
    samplePrompts: [
      'CGPA 8.5, B.Com, specialization Finance & Financial Analytics, skills Financial Modeling, Valuation, Excel VBA, CFA Level 1, projects DCF & M&A Valuation Model, interest Investment Banking',
      'GPA 3.7/4.0, MBA Finance, skills Python for Finance SQL Risk Analysis, projects Fintech Credit Risk Assessment Engine, interest Corporate Finance',
      'Meri CGPA 8.0 hai, B.Com, skills Valuation Financial Modeling Excel, interest Financial Risk Analyst',
    ],
  },
  {
    id: 'strategy',
    label: 'Product, Strategy & Consulting',
    badge: 'PM & Advisory',
    icon: 'briefcase',
    color: 'from-sky-500 to-indigo-600',
    description: 'Product Management, BizOps, Management Consulting & Strategic Transformation.',
    skillSuggestions: ['PRDs & Specs', 'Product Analytics (GA4/Mixpanel)', 'Agile / Scrum', 'Market Entry Strategy', 'Financial Modeling', 'Stakeholder Management'],
    projectSuggestions: ['B2B SaaS Growth & Churn PRD Case Study', 'Market Entry Strategy for EdTech Platform', 'Operational Digital Transformation Blueprint'],
    roleSuggestions: ['Product & Tech Strategy', 'Management & Strategy Consultant'],
    defaultValues: {
      course: 'MBA / B.Tech',
      specialization: 'Product Management & Strategy',
      skills: ['PRDs & Specs', 'Product Analytics', 'Agile / Scrum', 'Market Entry Strategy', 'User Research'],
      projects: ['B2B SaaS Growth PRD', 'Market Entry Strategy Case Study'],
      interest: 'Product Management & Business Strategy',
    },
    samplePrompts: [
      'CGPA 8.3, MBA, specialization Product Management & Strategy, skills PRDs & Specs, Product Analytics (GA4), Agile Scrum, projects B2B SaaS Growth PRD Case Study, interest Product Management',
      'BTech + MBA, skills Market Entry Strategy, Financial Modeling, Stakeholder Management, projects Market Entry Strategy Case Study, interest Management Consulting',
      'Meri CGPA 8.1 hai, MBA, skills User Research PRDs Agile, interest Product Strategy Lead',
    ],
  },
  {
    id: 'design',
    label: 'Design & Creative Tech',
    badge: 'UI/UX & Product',
    icon: 'palette',
    color: 'from-purple-500 to-violet-600',
    description: 'UI/UX Design, User Experience Research, Figma Design Systems & Prototyping.',
    skillSuggestions: ['Figma', 'UI Design', 'UX Research', 'Design Systems', 'Prototyping', 'Wireframing', 'User Testing', 'Micro-interactions'],
    projectSuggestions: ['Design System Component Library (Figma)', 'SaaS Dashboard UX Redesign & Usability Audit', 'Mobile Health App Prototype'],
    roleSuggestions: ['Product UI/UX & Interaction Designer', 'UX Research Lead'],
    defaultValues: {
      course: 'B.Des',
      specialization: 'Interaction Design & UX Research',
      skills: ['Figma', 'UI Design', 'UX Research', 'Design Systems', 'Wireframing'],
      projects: ['Design System Library in Figma', 'Fintech Mobile App Redesign'],
      interest: 'Product Design & User Experience',
    },
    samplePrompts: [
      'CGPA 8.6, B.Des, specialization Interaction Design & UX Research, skills Figma, UI Design, UX Research, Design Systems, Wireframing, projects Design System Library in Figma, interest Product Design',
      'B.Des graduate, skills Prototyping User Testing Micro-interactions Figma, projects Fintech Mobile App Redesign, interest UX Research Lead',
      'Meri CGPA 8.2 hai, B.Des, skills Figma UI Design User Research, interest Product UI/UX Designer',
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing, Growth & Operations',
    badge: 'GTM & Performance',
    icon: 'target',
    color: 'from-indigo-500 to-blue-600',
    description: 'Digital Growth Strategy, SEO/SEM, Funnel Optimization, Performance Marketing & Sales Ops.',
    skillSuggestions: ['SEO / SEM', 'Google Analytics 4', 'Content Strategy', 'HubSpot', 'Copywriting', 'Growth Hacking', 'A/B Testing', 'Funnel Analytics'],
    projectSuggestions: ['B2B SaaS Organic Growth & SEO Audit', 'Multi-Channel Funnel Conversion Experiment', 'Brand Positioning & Content Playbook'],
    roleSuggestions: ['Digital Growth & Marketing Strategist', 'Performance Marketing Lead'],
    defaultValues: {
      course: 'BBA / MBA',
      specialization: 'Digital Marketing & Growth',
      skills: ['SEO / SEM', 'Google Analytics 4', 'A/B Testing', 'Content Strategy', 'HubSpot'],
      projects: ['SaaS Organic Growth Audit & SEO Overhaul', 'Conversion Rate Optimization Campaign'],
      interest: 'Digital Marketing & Growth Strategy',
    },
    samplePrompts: [
      'CGPA 8.1, BBA Digital Marketing, skills SEO/SEM, Google Analytics 4, Content Strategy, HubSpot, Copywriting, projects SaaS Organic Growth Audit & SEO Overhaul, interest Digital Marketing & Growth Strategy',
      'MBA Marketing, skills Growth Hacking A/B Testing Funnel Analytics, projects Conversion Rate Optimization Campaign, interest Performance Marketing Lead',
      'Meri CGPA 7.9 hai, BBA, skills SEO GA4 Content Strategy, interest Digital Growth Manager',
    ],
  },
]

export const CAREER_TARGET_ROLES = [
  {
    id: 'auto',
    label: 'Auto-Detect Best Fit (AI Recommended)',
    desc: 'System maps credentials across all job profiles to find highest affinity',
  },
  {
    id: 'AI Systems & Machine Learning Engineer',
    label: 'AI Systems & ML Engineer (Tech)',
    desc: 'PyTorch, LLMs, Vector Databases, Python, MLOps',
  },
  {
    id: 'Full-Stack Software Engineer',
    label: 'Full-Stack Software Engineer (Tech)',
    desc: 'React, Node.js, TypeScript, REST APIs, Microservices',
  },
  {
    id: 'Cloud & DevOps Architect',
    label: 'Cloud & DevOps Architect (Tech)',
    desc: 'AWS, Kubernetes, Terraform, Docker, CI/CD',
  },
  {
    id: 'Data Scientist & Analytics Engineer',
    label: 'Data Scientist & Analytics (Tech)',
    desc: 'SQL, Pandas, Scikit-learn, Feature Engineering, BI',
  },
  {
    id: 'Cybersecurity Engineer',
    label: 'Cybersecurity Specialist (Tech)',
    desc: 'Network Security, Threat Analysis, Penetration Testing, IAM',
  },
  {
    id: 'Product & Tech Strategy',
    label: 'Product & Engineering Lead (Tech/PM)',
    desc: 'Roadmaps, System Architecture, Agile, Stakeholder Management',
  },
  {
    id: 'In-House Legal Counsel & Compliance',
    label: 'In-House Legal Counsel & Compliance (Legal)',
    desc: 'Contract Drafting, GDPR, Regulatory Risk, Corporate Law, Litigation',
  },
  {
    id: 'Corporate Regulatory & Risk Officer',
    label: 'Corporate Regulatory & Risk Officer (Legal)',
    desc: 'Compliance Audits, ESG, Regulatory Affairs, Policy Frameworks',
  },
  {
    id: 'Cyber Law & IP Specialist',
    label: 'Cyber Law & IP Specialist (Legal)',
    desc: 'Cybersecurity Law, Data Protection, Trademarks, Tech Licensing',
  },
  {
    id: 'Financial Risk & Investment Analyst',
    label: 'Financial Risk & Investment Analyst (Finance)',
    desc: 'Valuation, DCF Modeling, Equity Research, Excel VBA, Risk Analysis',
  },
  {
    id: 'Corporate Finance & Valuation Associate',
    label: 'Corporate Finance Associate (Finance)',
    desc: 'M&A Due Diligence, Capital Budgeting, Financial Reporting',
  },
  {
    id: 'Healthcare Regulatory & Clinical Specialist',
    label: 'Healthcare Regulatory & Clinical Lead (Healthcare)',
    desc: 'Clinical Trials, FDA Compliance, HIPAA Protocols, Medical Affairs',
  },
  {
    id: 'Product UI/UX & Interaction Designer',
    label: 'Product UI/UX Designer (Design)',
    desc: 'Figma, Design Systems, UX Research, Micro-interactions, Wireframes',
  },
  {
    id: 'Digital Growth & Marketing Strategist',
    label: 'Digital Growth Strategist (Marketing)',
    desc: 'SEO/SEM, Growth Funnels, Google Analytics 4, Content Strategy',
  },
  {
    id: 'Management & Strategy Consultant',
    label: 'Management Strategy Consultant (Consulting)',
    desc: 'Market Entry, Business Transformation, Case Analysis, Operations',
  },
  {
    id: 'custom',
    label: 'Custom Target Role...',
    desc: 'Specify any specialized position or niche job title',
  },
]

export const CAREER_PRESETS = [
  {
    label: 'AI Systems Engineer',
    desc: 'PyTorch, LLM agents, Vector DBs',
    badge: 'AI/ML',
    data: {
      cgpa: 8.8,
      score_type: 'cgpa_10',
      raw_score: 8.8,
      course: 'B.Tech',
      specialization: 'Computer Science (AI/ML)',
      education_level: 'Undergraduate',
      year_of_study: 4,
      skills: ['Python', 'PyTorch', 'TensorFlow', 'FastAPI', 'Docker', 'LangChain'],
      certifications: ['AWS Machine Learning Specialty', 'Deep Learning Specialization'],
      projects: ['Multimodal RAG Agent', 'Low-Latency Neural Inference API', 'LLM Benchmark Studio'],
      interest: 'Artificial Intelligence',
    },
  },
  {
    label: 'Full-Stack Engineer',
    desc: 'TypeScript, React, Distributed APIs',
    badge: 'Software',
    data: {
      cgpa: 8.3,
      score_type: 'cgpa_10',
      raw_score: 8.3,
      course: 'B.Tech',
      specialization: 'Information Technology',
      education_level: 'Undergraduate',
      year_of_study: 4,
      skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Redis', 'Docker'],
      certifications: ['AWS Certified Developer Associate'],
      projects: ['Real-time Collaborative Whiteboard', 'Event-Driven E-Commerce API', 'Telemetry Dashboard'],
      interest: 'Software Engineering',
    },
  },
  {
    label: 'Cloud & DevOps Specialist',
    desc: 'Kubernetes, Terraform, AWS',
    badge: 'Infra',
    data: {
      cgpa: 8.0,
      score_type: 'cgpa_10',
      raw_score: 8.0,
      course: 'B.Tech',
      specialization: 'Computer Science',
      education_level: 'Undergraduate',
      year_of_study: 4,
      skills: ['Go', 'Python', 'Kubernetes', 'Terraform', 'Docker', 'AWS', 'Linux'],
      certifications: ['CKA Certified Kubernetes Administrator', 'AWS Solutions Architect'],
      projects: ['GitOps Multi-Cluster Deployment', 'Zero-Downtime Blue-Green Pipeline', 'Infrastructure Monitoring Stack'],
      interest: 'Cloud Architecture',
    },
  },
  {
    label: 'Data Scientist',
    desc: 'Predictive Modeling, SQL, Pandas',
    badge: 'Analytics',
    data: {
      cgpa: 8.6,
      score_type: 'cgpa_10',
      raw_score: 8.6,
      course: 'B.Tech',
      specialization: 'Data Science',
      education_level: 'Undergraduate',
      year_of_study: 4,
      skills: ['Python', 'SQL', 'Pandas', 'Scikit-learn', 'XGBoost', 'Tableau'],
      certifications: ['Databricks Certified Data Engineer', 'Google Data Analytics'],
      projects: ['Customer Churn Prediction Engine', 'Automated ETL Warehouse Pipeline', 'Credit Risk Classifier'],
      interest: 'Data Science',
    },
  },
]

export const splitItems = (value) => {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean)
  const str = String(value || '').trim()
  if (!str) return []

  // Split on commas, semicolons, or newlines; or fallback to ' and ' if no punctuation
  const hasDelimiter = /[,;\n]/.test(str)
  let rawList = []
  if (hasDelimiter) {
    rawList = str.split(/[,;\n]+/)
  } else if (/\s+and\s+/i.test(str)) {
    rawList = str.split(/\s+and\s+/i)
  } else {
    rawList = [str]
  }

  return rawList
    .map((item) => item.trim().replace(/^[:\-\s]+|[:\-\s]+$/g, ''))
    .filter(Boolean)
}

const sectionBreaks = '(?=\\s*(?:cgpa|gpa|course|degree|specialization|major|skills|skill|certifications|certification|projects|project|interest|target|education level|year of study|$))'

const extractSection = (text, keys) => {
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const match = text.match(new RegExp(`\\b${escaped}\\b[:\\s-]*(.*?)${sectionBreaks}`, 'is'))
    if (match?.[1]) return match[1].trim().replace(/[.:,;\-\s]+$/g, '')
  }
  return ''
}

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

export const parseCareerPrompt = (text) => {
  const commaParts = text.replace(/[\n]/g, ' ').split(/[,;]+/).map((v) => v.trim()).filter(Boolean)
  let cgpa = null
  let scoreType = 'cgpa_10'
  const match4 = text.match(/(\d+(?:\.\d+)?)\s*(?:\/|out of)\s*4(?:\.0)?\b/i)
  const matchPct = text.match(/(?:percentage|percent|%)\s*[:=]?\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:%|percent\b)/i)

  if (match4) {
    cgpa = parseFloat(match4[1])
    scoreType = 'gpa_4'
  } else if (matchPct) {
    cgpa = parseFloat(matchPct[1] || matchPct[2])
    scoreType = 'percentage'
  } else {
    cgpa = pickNumber(extractNumber(text, ['cgpa', 'gpa']), Number(commaParts[0])) ?? null
  }

  const course = extractSection(text, ['course', 'degree']) || commaParts[1] || 'B.Tech'
  const specialization = extractSection(text, ['specialization']) || 'Computer Science'
  const educationLevel = extractSection(text, ['education level']) || 'Undergraduate'
  const yearOfStudy = pickNumber(extractNumber(text, ['year of study', 'year']), 4)
  const skillsSection = extractSection(text, ['skills', 'skill', 'expertise'])
  const certificationsSection = extractSection(text, ['certifications', 'certification'])
  const projectsSection = extractSection(text, ['projects', 'project'])

  const skills = skillsSection ? splitItems(skillsSection) : splitItems(commaParts[2] || 'Python, SQL')
  const certifications = certificationsSection ? splitItems(certificationsSection) : []
  const projects = projectsSection ? splitItems(projectsSection) : splitItems(commaParts[3] || 'Capstone Project')
  const interest = extractSection(text, ['interest', 'domain']) || (commaParts[4] || 'Technical')

  return {
    cgpa: cgpa ?? 8.0,
    score_type: scoreType,
    raw_score: cgpa ?? 8.0,
    course,
    specialization,
    education_level: educationLevel,
    year_of_study: yearOfStudy,
    skills,
    certifications,
    projects,
    interest,
  }
}

export const normalizeCareerPayload = (input) => {
  const payload = { ...input }
  const scoreType = payload.score_type || 'cgpa_10'
  let rawScore = payload.raw_score ?? payload.cgpa

  if (rawScore !== null && rawScore !== undefined && rawScore !== '') {
    rawScore = Number(rawScore)
    if (Number.isFinite(rawScore)) {
      payload.raw_score = rawScore
      if (scoreType === 'percentage') {
        payload.cgpa = Math.round((rawScore / 10) * 100) / 100
      } else if (scoreType === 'gpa_4') {
        payload.cgpa = Math.round(((rawScore / 4.0) * 10) * 100) / 100
      } else {
        payload.cgpa = rawScore
      }
    }
  }

  if (typeof payload.skills === 'string') payload.skills = splitItems(payload.skills)
  if (typeof payload.certifications === 'string') payload.certifications = splitItems(payload.certifications)
  if (typeof payload.projects === 'string') payload.projects = splitItems(payload.projects)
  if (typeof payload.internships === 'string') payload.internships = splitItems(payload.internships)

  return payload
}

export const validateCareerPayload = (payload) => {
  const errors = {}
  const rawVal = payload.raw_score ?? payload.cgpa
  const st = payload.score_type || 'cgpa_10'

  if (rawVal === null || rawVal === undefined || rawVal === '') {
    errors.cgpa = 'Academic score is required.'
  } else {
    const num = Number(rawVal)
    if (st === 'percentage' && (num < 0 || num > 100)) errors.cgpa = 'Percentage must be between 0 and 100.'
    else if (st === 'gpa_4' && (num < 0 || num > 4.0)) errors.cgpa = 'GPA must be between 0 and 4.0.'
    else if (st === 'cgpa_10' && (num < 0 || num > 10.0)) errors.cgpa = 'CGPA must be between 0 and 10.0.'
  }

  if (!payload.course?.trim?.()) errors.course = 'Course/Degree is required.'
  if (!payload.interest?.trim?.()) errors.interest = 'Interest/Track is required.'
  if (!payload.skills || payload.skills.length < 1) errors.skills = 'Please add at least 1 skill.'
  if (!payload.projects || payload.projects.length < 1) errors.projects = 'Please add at least 1 project.'

  return errors
}
