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

export const CAREER_TARGET_ROLES = [
  {
    id: 'auto',
    label: 'Auto-Detect Best Fit (AI Recommended)',
    desc: 'System maps credentials across all job profiles to find highest affinity',
  },
  {
    id: 'AI Systems & Machine Learning Engineer',
    label: 'AI Systems & ML Engineer',
    desc: 'PyTorch, LLMs, Vector Databases, Python, MLOps',
  },
  {
    id: 'Full-Stack Software Engineer',
    label: 'Full-Stack Software Engineer',
    desc: 'React, Node.js, TypeScript, REST APIs, Microservices',
  },
  {
    id: 'Cloud & DevOps Architect',
    label: 'Cloud & DevOps Architect',
    desc: 'AWS, Kubernetes, Terraform, Docker, CI/CD',
  },
  {
    id: 'Data Scientist & Analytics Engineer',
    label: 'Data Scientist & Analytics',
    desc: 'SQL, Pandas, Scikit-learn, Feature Engineering, BI',
  },
  {
    id: 'Cybersecurity Engineer',
    label: 'Cybersecurity Specialist',
    desc: 'Network Security, Threat Analysis, Penetration Testing, IAM',
  },
  {
    id: 'Product & Tech Strategy',
    label: 'Product & Engineering Lead',
    desc: 'Roadmaps, System Architecture, Agile, Stakeholder Management',
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

const sectionBreaks = '(?=(?:cgpa|course|specialization|skills|certifications|projects|interest|education level|year of study|$))'

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
  if (!payload.skills || payload.skills.length < 2) errors.skills = 'Add at least 2 skills.'
  if (!payload.projects || payload.projects.length < 1) errors.projects = 'Add at least 1 project.'

  return errors
}
