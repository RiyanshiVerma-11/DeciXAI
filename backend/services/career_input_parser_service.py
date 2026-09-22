from __future__ import annotations

import re
from difflib import get_close_matches


DEFAULT_CAREER_OPTIONS = [
    "data science",
    "software development",
    "product management",
]

SECTION_LABELS = (
    "degree",
    "course",
    "program",
    "field",
    "major",
    "specialization",
    "branch",
    "stream",
    "education level",
    "year of study",
    "year",
    "cgpa",
    "gpa",
    "skills",
    "tech stack",
    "technologies",
    "key projects",
    "projects",
    "project",
    "certifications",
    "certification",
    "achievements",
    "internships",
    "internship",
    "experience",
    "interest",
    "target career options",
    "target options",
    "career options",
    "options",
)

NOISE_PATTERNS = (
    r"\brecommend(?:\s+me)?\s+the\s+best\s+one\b",
    r"\brecommend(?:\s+me)?\s+the\s+better\s+one\b",
    r"\bwith\s+probabilit(?:y|ies)\b",
    r"\bwhat(?:\s+career)?\s+should\s+i\s+choose\b",
    r"\bwhich\s+is\s+better\b",
    r"\bsuggest(?:\s+the)?\s+best\b",
    r"\btell\s+me\s+the\s+best\b",
    r"\bplease\b",
    r"\brecommend.*",
    r"\bwith.*probabilities.*",
)


def _extract_section(text: str, labels: tuple[str, ...]) -> str:
    """Extract the free-text segment following a label until the next known label."""
    escaped_labels = [re.escape(label) for label in sorted(SECTION_LABELS, key=len, reverse=True)]
    pattern_boundary = r"(?=\n\s*(?:" + "|".join(escaped_labels) + r")\b|[,;]\s*(?:" + "|".join(escaped_labels) + r")\b|\s+\b(?:" + "|".join(escaped_labels) + r")\b|\b(?:" + "|".join(escaped_labels) + r")\s*[:=]|$)"
    for label in labels:
        match = re.search(
            rf"\b{re.escape(label)}\b[:\s=\-]*(.*?){pattern_boundary}",
            text,
            flags=re.IGNORECASE | re.DOTALL,
        )
        if match:
            return _collapse_spaces(match.group(1).strip(" .,:;-"))
    return ""


SPELLING_CORRECTIONS = {
    "pyhotn": "python",
    "pthyon": "python",
    "machiene": "machine",
    "lerning": "learning",
    "statstics": "statistics",
    "stastics": "statistics",
    "javscript": "javascript",
    "datasceince": "data science",
    "sofware": "software",
    "develpment": "development",
    "cybersecuirty": "cybersecurity",
    "managment": "management",
    "certfications": "certifications",
    "projets": "projects",
    "enginering": "engineering",
}

DEGREE_ALIASES = {
    "BA LLB": ("ba llb", "b.a. ll.b", "b.a.ll.b", "ballb", "ba-llb", "bachelor of arts and bachelor of legislative law", "bachelor of arts and bachelor of laws"),
    "BBA LLB": ("bba llb", "b.b.a. ll.b", "b.b.a.ll.b", "bballb", "bba-llb"),
    "BCom LLB": ("bcom llb", "b.com. ll.b", "bcomllb"),
    "LLB": ("llb", "ll.b", "bachelor of laws", "bachelor of legislative law"),
    "LLM": ("llm", "ll.m", "master of laws"),
    "BTech": ("btech", "b tech", "b.tech", "bachelor of technology"),
    "BE": ("be", "b e", "b.e", "bachelor of engineering"),
    "BCA": ("bca", "bachelor of computer applications"),
    "MCA": ("mca", "master of computer applications"),
    "BSc": ("bsc", "b sc", "b.sc", "bachelor of science"),
    "MSc": ("msc", "m sc", "m.sc", "master of science"),
    "MTech": ("mtech", "m tech", "m.tech", "master of technology"),
    "BBA": ("bba", "bachelor of business administration"),
    "MBA": ("mba", "master of business administration"),
    "BCom": ("bcom", "b com", "b.com", "bachelor of commerce"),
    "MCom": ("mcom", "m com", "m.com", "master of commerce"),
    "CA": ("ca", "chartered accountant", "chartered accountancy"),
    "CFA": ("cfa", "chartered financial analyst"),
    "BA": ("ba", "b.a", "bachelor of arts"),
    "MA": ("ma", "m.a", "master of arts"),
    "MBBS": ("mbbs", "m.b.b.s", "bachelor of medicine"),
    "BDS": ("bds", "b.d.s", "dental"),
    "BPharm": ("bpharm", "b.pharm", "b pharm", "bachelor of pharmacy"),
    "MPharm": ("mpharm", "m.pharm", "m pharm", "master of pharmacy"),
    "BDes": ("bdes", "b.des", "b des", "bachelor of design"),
    "MDes": ("mdes", "m.des", "m des", "master of design"),
    "Diploma": ("diploma",),
}

SPECIALIZATION_ALIASES = {
    "Corporate Law": ("corporate law", "company law", "commercial law", "business law", "corporate governance"),
    "Intellectual Property Law": ("intellectual property", "ip law", "patent law", "trademark law", "copyright law"),
    "Cyber Law": ("cyber law", "technology law", "tech law", "data privacy law", "privacy law", "information technology law"),
    "Criminal Law": ("criminal law", "penal law", "criminal justice"),
    "Constitutional Law": ("constitutional law", "public law"),
    "Taxation Law": ("taxation law", "tax law", "indirect tax", "direct tax"),
    "Computer Science Engineering": (
        "computer science engineering",
        "computer science",
        "cse",
        "cs",
    ),
    "Data Science": (
        "data science",
        "datascience",
        "ds",
        "ai ml",
        "artificial intelligence and machine learning",
    ),
    "Information Technology": ("information technology", "it"),
    "Artificial Intelligence": ("artificial intelligence", "ai"),
    "Electronics and Communication": (
        "electronics and communication",
        "ece",
    ),
    "Electrical Engineering": ("electrical engineering", "eee", "ee"),
    "Mechanical Engineering": ("mechanical engineering", "me"),
    "Civil Engineering": ("civil engineering", "ce"),
    "Business Administration": ("business administration", "management", "general management"),
    "Finance": ("finance", "banking and finance", "financial management", "corporate finance", "investment banking"),
    "Fintech": ("fintech", "financial technology"),
    "Marketing": ("marketing", "digital marketing", "growth marketing", "brand management"),
    "Human Resources": ("human resources", "hr", "people operations", "talent acquisition"),
    "Operations": ("operations", "supply chain", "logistics"),
    "Biotechnology": ("biotechnology", "biotech"),
    "Clinical Research": ("clinical research", "clinical"),
    "UI/UX Design": ("ui/ux", "ui ux", "user experience", "product design", "interaction design"),
    "Commerce": ("commerce", "accounting", "accountancy"),
}

SKILL_ALIASES = {
    # ── Tech & Engineering Skills ──
    "python": ("python", "py"),
    "java": ("java",),
    "c++": ("c++", "cpp"),
    "c": (" c ",),
    "javascript": ("javascript", "js"),
    "typescript": ("typescript", "ts"),
    "sql": ("sql", "mysql", "postgresql", "postgres", "neon postgresql", "neon postgres", "sqlite", "sqlite3"),
    "fastapi": ("fastapi",),
    "react": ("react", "reactjs", "react.js"),
    "streamlit": ("streamlit",),
    "prompt engineering": ("prompt engineering", "prompt design", "promptwars"),
    "gemini api": ("gemini api", "gemini", "gemini 2.0 flash", "gemini 2.0"),
    "groq": ("groq", "groq api"),
    "llama": ("llama", "llama-3", "llama 3", "llama-3.3", "llama 3.3", "llama-3.1", "llama 3.1"),
    "xgboost": ("xgboost",),
    "random forest": ("random forest", "rf"),
    "numpy": ("numpy",),
    "pandas": ("pandas",),
    "docker": ("docker", "containerized", "containerization"),
    "git": ("git", "github"),
    "github actions": ("github actions", "ci/cd", "cicd"),
    "google cloud": ("google cloud", "gcp"),
    "agentic ide": ("agentic ide", "antigravity"),
    "render": ("render",),
    "neon postgresql": ("neon postgresql", "neon postgres"),
    "pytest": ("pytest",),
    "machine learning": ("machine learning", "ml"),
    "deep learning": ("deep learning", "dl"),
    "statistics": ("statistics", "stats"),
    "data analysis": ("data analysis", "analytics"),
    "data visualization": ("data visualization", "visualization"),
    "software development": ("coding", "development", "software development"),
    "scikit-learn": ("scikit learn", "sklearn"),
    "tensorflow": ("tensorflow",),
    "pytorch": ("pytorch",),
    "excel": ("excel", "advanced excel", "spreadsheets", "vba"),
    "power bi": ("power bi", "powerbi"),
    "tableau": ("tableau",),
    "node.js": ("node", "nodejs", "node.js"),
    "aws": ("aws",),
    "azure": ("azure",),
    "dsa": ("dsa", "data structures", "data structures and algorithms"),
    "langchain": ("langchain",),
    "langgraph": ("langgraph",),
    "llamaindex": ("llamaindex",),
    "vector db": ("vector db", "qdrant", "milvus", "chroma", "pgvector"),
    "vllm": ("vllm", "ollama"),
    "ci/cd": ("ci/cd", "cicd", "ci cd", "continuous integration"),
    "ui/ux": ("ui/ux", "ui ux", "ui", "ux", "user experience", "user interface"),
    "pl/sql": ("pl/sql", "plsql", "pl sql"),
    "c#": ("c#", "csharp", "c sharp"),
    "figma": ("figma",),

    # ── Law & Legal Track Skills ──
    "contract drafting": ("contract drafting", "drafting contracts", "agreement drafting", "contract management", "contracts"),
    "due diligence": ("due diligence", "legal due diligence", "corporate due diligence"),
    "gdpr compliance": ("gdpr compliance", "gdpr", "data privacy", "privacy law", "dpdp", "data protection"),
    "legal research": ("legal research", "case law research", "statutory interpretation", "westlaw", "manupatra", "lexisnexis"),
    "intellectual property": ("intellectual property", "ip law", "patent drafting", "trademark prosecution", "copyright law", "patents"),
    "corporate governance": ("corporate governance", "board compliance", "secretarial audit", "compliance"),
    "litigation": ("litigation", "dispute resolution", "arbitration", "moot court", "court drafting"),
    "mergers and acquisitions": ("mergers and acquisitions", "m&a", "ma", "joint ventures"),
    "tax law": ("tax law", "taxation law", "gst", "direct tax", "indirect tax"),

    # ── Finance & Accounting Track Skills ──
    "financial modeling": ("financial modeling", "financial model", "dcf", "dcf modeling", "lbo", "three statement modeling"),
    "valuation": ("valuation", "company valuation", "equity valuation", "comparable analysis"),
    "auditing": ("auditing", "statutory audit", "internal audit", "tax audit", "assurance"),
    "accounting": ("accounting", "accountancy", "bookkeeping", "ifrs", "gaap", "tally", "quickbooks", "sap"),
    "financial analysis": ("financial analysis", "ratio analysis", "equity research", "credit analysis"),
    "portfolio management": ("portfolio management", "asset management", "wealth management", "fund management"),
    "risk management": ("risk management", "credit risk", "market risk", "basel", "financial risk"),
    "corporate finance": ("corporate finance", "capital budgeting", "working capital management"),
    "bloomberg": ("bloomberg", "bloomberg terminal", "factset", "reuters"),

    # ── Healthcare, Biotech & Pharma Skills ──
    "clinical trials": ("clinical trials", "clinical research", "clinical study", "gcp", "good clinical practice"),
    "pharmacology": ("pharmacology", "pharmacokinetics", "pharmacodynamics"),
    "drug discovery": ("drug discovery", "formulation", "medicinal chemistry", "assay development"),
    "molecular biology": ("molecular biology", "pcr", "gel electrophoresis", "dna sequencing", "western blot"),
    "bioinformatics": ("bioinformatics", "blast", "genomics", "biopython", "sequence analysis"),
    "drug safety": ("drug safety", "pharmacovigilance", "pv", "adverse event reporting", "meddra"),
    "patient care": ("patient care", "clinical care", "diagnostics", "patient assessment"),
    "biostatistics": ("biostatistics", "clinical biostatistics", "survival analysis", "epidemiology"),

    # ── Design & Creative Track Skills ──
    "wireframing": ("wireframing", "wireframes", "low fidelity wireframes"),
    "prototyping": ("prototyping", "interactive prototype", "figma prototype", "high fidelity prototype"),
    "user research": ("user research", "user interviews", "usability testing", "persona mapping", "heuristic evaluation"),
    "design systems": ("design systems", "design system", "component library", "atomic design"),
    "visual design": ("visual design", "typography", "color theory", "graphic design", "layout design"),

    # ── Marketing & Strategy Skills ──
    "seo": ("seo", "search engine optimization", "sem", "google search console"),
    "content strategy": ("content strategy", "copywriting", "content writing", "technical writing"),
    "digital marketing": ("digital marketing", "social media marketing", "performance marketing", "meta ads", "google ads"),
    "market research": ("market research", "competitor analysis", "market sizing", "tam sam som"),
    "brand management": ("brand management", "brand strategy", "brand positioning"),

    # ── Management, Consulting & Operations Skills ──
    "project management": ("project management", "agile", "scrum", "kanban", "jira", "pmp", "sprint planning"),
    "strategy": ("business strategy", "corporate strategy", "consulting", "management consulting", "case studies"),
    "operations": ("operations", "supply chain", "logistics", "six sigma", "lean operations"),
    "human resources": ("human resources", "talent acquisition", "recruitment", "hr", "payroll", "people ops"),
}

CAREER_OPTION_ALIASES = {
    # Engineering & Tech Tracks
    "ai engineer": (
        "ai engineer",
        "ai engineering",
        "agentic ai",
        "llm engineer",
        "llm systems engineer",
        "genai engineer",
        "generative ai engineer",
        "agentic systems",
        "llm orchestration",
    ),
    "product management": (
        "product management",
        "product manager",
        "technical product management",
        "product strategy",
        "tpm",
        "pm",
        "product",
    ),
    "data science": (
        "data science",
        "datascience",
        "data scientist",
        "machine learning engineer",
        "ml engineer",
        "data analyst",
        "data analytics",
    ),
    "software development": (
        "software development",
        "software dev",
        "software engineer",
        "software engineering",
        "developer",
        "sde",
        "web development",
        "full stack",
        "frontend",
        "backend",
    ),
    "cybersecurity": (
        "cybersecurity",
        "cyber security",
        "security analyst",
        "security engineer",
    ),
    "data engineering": (
        "data engineering",
        "data engineer",
        "etl",
        "big data",
    ),
    "cloud devops": (
        "cloud devops",
        "cloud",
        "devops",
        "sre",
        "cloud engineer",
    ),
    "ui ux design": (
        "ui ux design",
        "ui/ux",
        "ui ux",
        "ux designer",
        "ui designer",
        "product designer",
        "product design",
    ),
    "finance": (
        "finance",
        "financial analyst",
        "corporate finance",
        "fp&a",
        "financial planning",
    ),
    "investment banking": (
        "investment banking",
        "investment banker",
        "ib analyst",
        "m&a analyst",
        "equity research",
    ),
    "marketing": (
        "marketing",
        "digital marketing",
        "growth marketer",
        "brand manager",
    ),
    "consulting": (
        "consulting",
        "consultant",
        "management consulting",
        "strategy consulting",
    ),
    # Legal & Corporate Track Options
    "corporate legal counsel": (
        "corporate legal counsel",
        "corporate lawyer",
        "in-house counsel",
        "legal counsel",
        "corporate law",
        "company lawyer",
        "legal advisor",
    ),
    "ip tech lawyer": (
        "ip tech lawyer",
        "intellectual property lawyer",
        "tech lawyer",
        "cyber lawyer",
        "data privacy counsel",
        "patent attorney",
        "ip counsel",
    ),
    "compliance regulatory manager": (
        "compliance regulatory manager",
        "compliance officer",
        "regulatory affairs",
        "legal compliance",
        "risk and compliance",
        "compliance manager",
    ),
    # Healthcare & Biotech Track Options
    "clinical research associate": (
        "clinical research associate",
        "clinical research",
        "cra",
        "clinical trials manager",
        "clinical trial lead",
    ),
    "pharmacovigilance specialist": (
        "pharmacovigilance specialist",
        "drug safety officer",
        "safety specialist",
        "drug safety associate",
    ),
}

INTEREST_ALIASES = {
    # Tech
    "ai engineer": (
        "ai engineering",
        "agentic systems",
        "genai",
        "generative ai",
        "llm orchestration",
        "llm systems",
        "prompt engineering",
    ),
    "product management": (
        "product management",
        "product strategy",
        "technical product management",
        "product manager",
        "tpm",
        "feature scoping",
        "prd drafting",
        "user stories",
    ),
    "data science": (
        "data science",
        "machine learning",
        "artificial intelligence",
        "deep learning",
    ),
    "software development": (
        "software development",
        "software engineering",
        "coding",
        "development",
    ),
    "cybersecurity": ("cybersecurity", "cyber security", "security"),
    "data engineering": ("data engineering", "data pipelines"),
    "ui ux design": ("ui/ux", "ui ux", "user experience", "product design", "interaction design"),

    # Legal
    "corporate legal counsel": (
        "corporate law",
        "legal counsel",
        "corporate counsel",
        "in-house counsel",
        "company law",
        "commercial law",
        "legal counsel in tech",
        "legal counsel in fintech",
        "fintech legal",
        "contract management",
    ),
    "compliance regulatory manager": (
        "compliance",
        "regulatory compliance",
        "regulatory affairs",
        "legal compliance",
        "data privacy",
        "gdpr",
    ),

    # Finance
    "finance": ("finance", "banking and finance", "corporate finance", "financial management"),
    "investment banking": ("investment banking", "equity research", "valuation", "m&a"),

    # Healthcare
    "clinical research associate": ("clinical research", "clinical trials", "pharmacology", "drug safety", "pharmacovigilance"),

    # Business
    "marketing": ("marketing", "digital marketing", "growth marketing", "brand strategy"),
    "consulting": ("consulting", "management consulting", "strategy"),
}

PROJECT_ENDINGS = (
    "analysis",
    "prediction",
    "system",
    "app",
    "application",
    "compressor",
    "dashboard",
    "portal",
    "website",
    "classifier",
    "detection",
    "tracker",
    "engine",
    "model",
    "analyzer",
)

HIGH_VALUE_PROJECTS = [
    "prediction",
    "machine learning",
    "deep learning",
    "nlp",
    "recommendation",
]

MEDIUM_VALUE_PROJECTS = [
    "analysis",
    "dashboard",
    "visualization",
    "analyzer",
]

LOW_VALUE_PROJECTS = [
    "calculator",
    "basic app",
]

CERTIFICATION_STOP_WORDS = {
    "internship",
    "internships",
    "intern",
    "project",
    "projects",
    "interest",
    "skills",
    "skill",
}


def _collapse_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _build_token_vocabulary() -> set[str]:
    vocabulary: set[str] = set()
    alias_groups = (
        DEGREE_ALIASES,
        SPECIALIZATION_ALIASES,
        SKILL_ALIASES,
        CAREER_OPTION_ALIASES,
        INTEREST_ALIASES,
    )
    for group in alias_groups:
        for canonical, aliases in group.items():
            for phrase in (canonical, *aliases):
                for token in re.findall(r"[a-z]+", phrase.lower()):
                    if len(token) >= 3:
                        vocabulary.add(token)
    vocabulary.update({"cgpa", "gpa", "skills", "projects", "certifications", "interest"})
    return vocabulary


TOKEN_VOCABULARY = _build_token_vocabulary()


def _normalize_text(text: str) -> str:
    """Lowercase and normalize punctuation before extraction."""
    normalized = str(text or "").lower()
    normalized = normalized.replace("&", " and ").replace("%", " percent ")
    normalized = re.sub(r"[^a-z0-9+.\s/,;-]", " ", normalized)
    return _collapse_spaces(normalized)


def _remove_noise(text: str) -> str:
    """Strip common instruction phrases that do not add signal."""
    cleaned = text
    for pattern in NOISE_PATTERNS:
        cleaned = re.sub(pattern, " ", cleaned)
    return _collapse_spaces(cleaned)


def _correct_spelling(text: str) -> str:
    """Apply deterministic spelling fixes and light fuzzy correction."""
    corrected = text
    for wrong, right in SPELLING_CORRECTIONS.items():
        corrected = re.sub(rf"\b{re.escape(wrong)}\b", right, corrected)

    tokens = corrected.split()
    normalized_tokens: list[str] = []
    for token in tokens:
        if not token.isalpha() or len(token) < 4 or token in TOKEN_VOCABULARY:
            normalized_tokens.append(token)
            continue

        match = get_close_matches(token, TOKEN_VOCABULARY, n=1, cutoff=0.9)
        normalized_tokens.append(match[0] if match else token)
    return " ".join(normalized_tokens)


def _apply_phrase_replacements(text: str, replacements: dict[str, str]) -> str:
    updated = text
    for source, target in sorted(replacements.items(), key=lambda item: len(item[0]), reverse=True):
        updated = re.sub(rf"\b{re.escape(source)}\b", target, updated)
    return _collapse_spaces(updated)


def _map_synonyms(text: str) -> str:
    """Map short forms and near-synonyms into a consistent vocabulary."""
    replacements = {
        "software dev": "software development",
        "software engineer": "software development",
        "software engineering": "software development",
        "sde": "software development",
        "product manager": "product management",
        "cyber security": "cybersecurity",
        "data engineer": "data engineering",
        "data scientist": "data science",
        "datascience": "data science",
        "ds": "data science",
        "ml": "machine learning",
        "ai ml": "data science",
        "proj": "projects",
        "pr": "projects",
        "cert": "certifications",
        "b tech": "btech",
        "bachelor of technology": "btech",
        "bachelor of engineering": "be",
        "bachelor of business administration": "bba",
        "bachelor of computer applications": "bca",
    }
    return _apply_phrase_replacements(text, replacements)


def _clean_input(text: str) -> str:
    """Run the full normalization pipeline before any extraction logic."""
    cleaned = _normalize_text(text)
    cleaned = _remove_noise(cleaned)
    cleaned = _correct_spelling(cleaned)
    return _map_synonyms(cleaned)


def _contains_phrase(text: str, phrase: str) -> bool:
    escaped = re.escape(phrase)
    if phrase == " c ":
        return " c " in f" {text} "
    return re.search(rf"\b{escaped}\b", text) is not None


def _extract_from_aliases(text: str, aliases: dict[str, tuple[str, ...]]) -> list[str]:
    """Return canonical values whose aliases appear in the cleaned text."""
    matches: list[str] = []
    for canonical, variants in aliases.items():
        for variant in (canonical.lower(), *variants):
            # Allow 2-character abbreviations like "cs", "ds", "ml", "dl", "py"
            if len(variant) < 2:
                continue

            if _contains_phrase(text, variant):
                matches.append(canonical)
                break
    return matches


# (First _extract_section definition near top of file is used)


def _extract_number_near_keywords(text: str, keywords: tuple[str, ...]) -> int | None:
    """Capture numeric counts placed before or after labels such as projects or certifications."""
    for keyword in keywords:
        after_match = re.search(rf"\b{re.escape(keyword)}\b\s*[:=\-]?\s*(\d+)\b(?!\s*[\.\)])", text, flags=re.IGNORECASE)
        if after_match:
            return int(after_match.group(1))
        before_match = re.search(rf"\b(\d+)\b\s*(?:total\s*)?\b{re.escape(keyword)}\b", text, flags=re.IGNORECASE)
        if before_match:
            return int(before_match.group(1))
    return None


def _extract_cgpa(text: str) -> float:
    """Extract CGPA/GPA/Percentage and auto-convert to 10-point scale."""
    # 1. Standard CGPA / GPA / SGPA patterns with explicit keyword (highest priority)
    # e.g., "CGPA: 8.5", "CGPA: 8.28/10", "GPA 3.8 / 4.0", "CGPA 9.2", "8.5 CGPA", "Grade: 8.4"
    patterns = (
        r"\b(?:cgpa|sgpa|gpa|grade|academic score)\b\s*(?:is\s+|of\s+|[:=\-])*\s*(\d+(?:\.\d+)?)\s*(?:/\s*(10(?:\.0)?|4(?:\.0)?))?",
        r"(\d+(?:\.\d+)?)\s*(?:/\s*(10(?:\.0)?|4(?:\.0)?))?\s*(?:cgpa|sgpa|gpa)\b",
    )
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            val = float(match.group(1))
            denom = match.group(2) if len(match.groups()) > 1 else None
            # If explicit denominator given
            if denom and "4" in denom:
                return max(0.0, min((val / 4.0) * 10.0, 10.0))
            elif denom and "10" in denom:
                return max(0.0, min(val, 10.0))

            # Determine scale from value
            if val > 10.0 and val <= 100.0:
                return max(0.0, min(val / 10.0, 10.0))
            elif 0.0 < val <= 4.0 and re.search(r"\b(?:gpa|4(?:\.0)?)\b", match.group(0), flags=re.IGNORECASE):
                return max(0.0, min((val / 4.0) * 10.0, 10.0))
            elif val >= 1.0:
                return max(0.0, min(val, 10.0))

    # 2. Check for explicit 4-point scale with keyword 'gpa' or 'score'
    match_4 = re.search(r"\b(?:gpa|score|grade)\s*[:=\-]?\s*(\d+(?:\.\d+)?)\s*(?:/|out of)\s*4(?:\.0)?\b", text, flags=re.IGNORECASE)
    if match_4:
        val = float(match_4.group(1))
        if 1.0 <= val <= 4.0:
            return max(0.0, min((val / 4.0) * 10.0, 10.0))

    # 3. Check for percentage (e.g. "82%", "82 percent", "percentage 85")
    match_pct = re.search(r"(\d+(?:\.\d+)?)\s*(?:%|percent\b)|\b(?:percentage|percent|aggregate|marks)\b\s*[:=]?\s*(\d+(?:\.\d+)?)", text, flags=re.IGNORECASE)
    if match_pct:
        val_str = match_pct.group(1) or match_pct.group(2)
        val = float(val_str)
        if 30.0 <= val <= 100.0:
            return max(0.0, min(val / 10.0, 10.0))

    # 4. Check for score out of 10
    match_10 = re.search(r"\b(?:cgpa|gpa|grade)?\s*[:=\-]?\s*(\d+(?:\.\d+)?)\s*(?:/|out of)\s*10(?:\.0)?\b", text, flags=re.IGNORECASE)
    if match_10:
        val = float(match_10.group(1))
        if 1.0 <= val <= 10.0:
            return max(0.0, min(val, 10.0))

    return 0.0


def _extract_degree(text: str) -> str:
    matches = _extract_from_aliases(text, DEGREE_ALIASES)
    return matches[0] if matches else ""


def _extract_specialization(text: str) -> str:
    """
    Extract specialization with priority to explicit section.
    First check for explicit "specialization" label, then search full text
    but exclude interest section to avoid matching career interests as specializations.
    """
    # Try explicit section first
    section = _extract_section(text, ("specialization", "branch", "stream"))
    if section:
        matches = _extract_from_aliases(section, SPECIALIZATION_ALIASES)
        if matches:
            return matches[0]
    
    # Fall back to searching full text, but avoid interest section
    # Remove interest section to prevent "data science" from interest overriding actual specialization
    text_without_interest = re.sub(
        r"\b(?:interest|interested)\b[:\s-]*(.*?)(?=\b(?:skill|project|cert|cgpa|gpa)\b|$)",
        " ",
        text,
        flags=re.IGNORECASE
    )
    matches = _extract_from_aliases(text_without_interest, SPECIALIZATION_ALIASES)
    return matches[0] if matches else ""


def _split_section_items(section: str) -> list[str]:
    if not section:
        return []
    raw_items = re.split(
        r",|;|\band\b|\bor\b|\n|(?<!\bci)(?<!\bui)(?<!\bpl)(?<!\btcp)(?<!\ba)\/(?!cd\b)(?!ux\b)(?!sql\b)(?!ip\b)(?!b\b)",
        section,
        flags=re.IGNORECASE,
    )
    items = []
    for item in raw_items:
        cleaned = _collapse_spaces(item.strip(" .,:;-"))
        if cleaned:
            items.append(cleaned)
    return items


def _clean_certification_items(items: list[str]) -> list[str]:
    cleaned_items: list[str] = []
    for item in items:
        normalized = _collapse_spaces(item.strip(" .,:;-"))
        if not normalized:
            continue
        lower = normalized.lower()
        if lower in CERTIFICATION_STOP_WORDS:
            continue
        if lower.startswith('internship ') or lower.startswith('intern ') or lower.startswith('internships '):
            continue
        cleaned_items.append(normalized)
    return _dedupe_preserve_order(cleaned_items)


def _split_project_phrases(section: str) -> list[str]:
    if not section:
        return []

    explicit_items = _split_section_items(section)
    if len(explicit_items) > 1:
        return explicit_items

    tokens = section.split()
    if not tokens:
        return []

    chunks: list[str] = []
    current: list[str] = []
    endings = {ending.lower() for ending in PROJECT_ENDINGS}
    for token in tokens:
        current.append(token)
        if token.lower() in endings:
            chunks.append(" ".join(current).strip())
            current = []

    if current:
        chunks.append(" ".join(current).strip())

    cleaned_chunks = [
        _collapse_spaces(chunk.strip(" .,:;-"))
        for chunk in chunks
        if _collapse_spaces(chunk.strip(" .,:;-"))
    ]
    return _dedupe_preserve_order(cleaned_chunks)


def _extract_skills(text: str) -> list[str]:
    """Scan text and skills section for skills across all professional tracks."""
    section = _extract_section(text, ("skills", "skill", "technologies", "tech stack"))
    search_space = text
    matches = _extract_from_aliases(search_space, SKILL_ALIASES)

    if section:
        for item in _split_section_items(section):
            item_clean = _collapse_spaces(item.strip(" .,:;-"))
            if not item_clean or len(item_clean) < 2 or len(item_clean) > 50:
                continue
            sub_matches = _extract_from_aliases(item_clean, SKILL_ALIASES)
            if sub_matches:
                for skill in sub_matches:
                    if skill not in matches:
                        matches.append(skill)
            else:
                # Free-form domain skill fallback: preserve real specialized skills
                lower_item = item_clean.lower()
                stop_tokens = ("none", "nothing", "na", "cgpa", "course", "projects", "certifications", "options")
                if not any(sw in lower_item for sw in stop_tokens):
                    if lower_item not in {m.lower() for m in matches}:
                        matches.append(item_clean)

    return matches


def _estimate_phrase_count(section: str) -> int:
    """Estimate project-like phrase count when items are not comma-separated."""
    if not section:
        return 0

    phrase_items = _split_project_phrases(section)
    if phrase_items:
        return len(phrase_items)

    tokens = section.split()
    return 1 if tokens else 0


def _extract_project_descriptions(text: str) -> list[str]:
    """Extract project descriptors from explicit project sections."""
    section = _extract_section(text, ("projects", "project", "proj"))
    if not section:
        return []

    project_items = _split_project_phrases(section)
    return project_items


def _score_project_description(project: str) -> int:
    normalized = project.lower()
    if any(keyword in normalized for keyword in HIGH_VALUE_PROJECTS):
        return 3
    if any(keyword in normalized for keyword in MEDIUM_VALUE_PROJECTS):
        return 2
    return 1


def extract_project_keywords(text: str) -> int:
    keywords = ["prediction", "recommendation", "machine learning", "model"]
    lowered = str(text or "").lower()
    return sum(1 for keyword in keywords if keyword in lowered)


def _calculate_project_quality_score(project_descriptions: list[str], project_count: int) -> int:
    if not project_descriptions:
        return project_count

    score = 0
    for project in project_descriptions:
        score += _score_project_description(project)

    if project_count > len(project_descriptions):
        score += project_count - len(project_descriptions)

    return score


def _extract_projects_count(text: str, raw_text: str = "") -> int:
    search_text = f"{text}\n{raw_text}"
    explicit_count = _extract_number_near_keywords(search_text, ("projects", "project", "proj"))
    if explicit_count is not None and explicit_count > 0:
        return explicit_count

    if raw_text:
        raw_numbered = re.findall(r"(?:^|\n|\b)\d+[\.\)]\s+[A-Za-z0-9]", raw_text)
        if len(raw_numbered) >= 1:
            return len(raw_numbered)

    section = _extract_section(search_text, ("key projects", "projects", "project", "proj"))
    if section:
        numbered = re.findall(r"(?:^|\n|\b)(?:\d+[\.\)]|•|\*|-)\s*([^\n]+)", section)
        if len(numbered) >= 1:
            return len(numbered)
        estimated = _estimate_phrase_count(section)
        if estimated > 0:
            return estimated

    raw_numbered = re.findall(r"\b\d+[\.\)]\s+[A-Za-z0-9]", search_text)
    if len(raw_numbered) >= 1:
        return len(raw_numbered)

    return 0


def _extract_certifications_count(text: str, raw_text: str = "") -> int:
    search_text = f"{text}\n{raw_text}"
    explicit_count = _extract_number_near_keywords(
        search_text,
        ("certifications", "certification", "certs", "cert", "achievements"),
    )
    if explicit_count is not None and explicit_count > 0:
        return explicit_count

    if raw_text:
        ach_keywords = ["rank 1", "promptwars", "diamond league", "rank 30", "winner", "first place", "award", "cup"]
        raw_lower = raw_text.lower()
        ach_count = sum(1 for kw in ach_keywords if kw in raw_lower)
        if ach_count >= 1:
            ach_items = re.findall(r"(?:^|\n|\b)(?:•|\*|-|\d+[\.\)])\s*([^\n]+)", raw_text)
            return max(ach_count, len(ach_items) if ach_items else 2)

    section = _extract_section(search_text, ("achievements", "certifications", "certification", "certs", "cert"))
    if section:
        items = _clean_certification_items(_split_section_items(section))
        if items:
            return len(items)
        numbered = re.findall(r"(?:^|\n|\b)(?:\d+[\.\)]|•|\*|-)\s*([^\n]+)", section)
        if numbered:
            return len(numbered)

    cert_keywords = ["google", "infosys", "coursera", "udemy", "aws", "promptwars", "rank 1", "diamond league", "certificate", "certification"]
    lowered = search_text.lower()
    matches = sum(1 for kw in cert_keywords if kw in lowered)
    return min(matches, 5) if matches > 0 else 0


def _dedupe_preserve_order(items: list[str]) -> list[str]:
    unique: list[str] = []
    seen: set[str] = set()
    for item in items:
        key = item.strip().lower()
        if key and key not in seen:
            seen.add(key)
            unique.append(item)
    return unique

def _clean_certification_items(items: list[str]) -> list[str]:
    cleaned_items: list[str] = []
    for item in items:
        normalized = _collapse_spaces(item.strip(" .,:;-"))
        if not normalized:
            continue
        lower = normalized.lower()
        if lower in CERTIFICATION_STOP_WORDS:
            continue
        if lower.startswith('internship ') or lower.startswith('intern ') or lower.startswith('internships '):
            continue
        cleaned_items.append(normalized)
    return _dedupe_preserve_order(cleaned_items)


def _split_project_phrases(section: str) -> list[str]:
    if not section:
        return []

    explicit_items = _split_section_items(section)
    if len(explicit_items) > 1:
        return explicit_items

    tokens = section.split()
    if not tokens:
        return []

    chunks: list[str] = []
    current: list[str] = []
    endings = {ending.lower() for ending in PROJECT_ENDINGS}
    for token in tokens:
        current.append(token)
        if token.lower() in endings:
            chunks.append(" ".join(current).strip())
            current = []

    if current:
        chunks.append(" ".join(current).strip())

    cleaned_chunks = [
        _collapse_spaces(chunk.strip(" .,:;-"))
        for chunk in chunks
        if _collapse_spaces(chunk.strip(" .,:;-"))
    ]
    return _dedupe_preserve_order(cleaned_chunks)


def _extract_skills(text: str) -> list[str]:
    """Scan text and skills section for skills across all professional tracks."""
    section = _extract_section(text, ("skills", "skill", "technologies", "tech stack"))
    search_space = text
    matches = _extract_from_aliases(search_space, SKILL_ALIASES)

    if section:
        for item in _split_section_items(section):
            item_clean = _collapse_spaces(item.strip(" .,:;-"))
            if not item_clean or len(item_clean) < 2 or len(item_clean) > 50:
                continue
            sub_matches = _extract_from_aliases(item_clean, SKILL_ALIASES)
            if sub_matches:
                for skill in sub_matches:
                    if skill not in matches:
                        matches.append(skill)
            else:
                # Free-form domain skill fallback: preserve real specialized skills
                lower_item = item_clean.lower()
                stop_tokens = ("none", "nothing", "na", "cgpa", "course", "projects", "certifications", "options")
                if not any(sw in lower_item for sw in stop_tokens):
                    if lower_item not in {m.lower() for m in matches}:
                        matches.append(item_clean)

    return matches


def _estimate_phrase_count(section: str) -> int:
    """Estimate project-like phrase count when items are not comma-separated."""
    if not section:
        return 0

    phrase_items = _split_project_phrases(section)
    if phrase_items:
        return len(phrase_items)

    tokens = section.split()
    return 1 if tokens else 0


def _extract_project_descriptions(text: str) -> list[str]:
    """Extract project descriptors from explicit project sections."""
    section = _extract_section(text, ("projects", "project", "proj"))
    if not section:
        return []

    project_items = _split_project_phrases(section)
    return project_items


def _score_project_description(project: str) -> int:
    normalized = project.lower()
    if any(keyword in normalized for keyword in HIGH_VALUE_PROJECTS):
        return 3
    if any(keyword in normalized for keyword in MEDIUM_VALUE_PROJECTS):
        return 2
    return 1


def extract_project_keywords(text: str) -> int:
    keywords = ["prediction", "recommendation", "machine learning", "model"]
    lowered = str(text or "").lower()
    return sum(1 for keyword in keywords if keyword in lowered)


def _calculate_project_quality_score(project_descriptions: list[str], project_count: int) -> int:
    if not project_descriptions:
        return project_count

    score = 0
    for project in project_descriptions:
        score += _score_project_description(project)

    if project_count > len(project_descriptions):
        score += project_count - len(project_descriptions)

    return score


def _extract_projects_count(text: str, raw_text: str = "") -> int:
    search_text = f"{text}\n{raw_text}"
    explicit_count = _extract_number_near_keywords(search_text, ("projects", "project", "proj"))
    if explicit_count is not None and explicit_count > 0:
        return explicit_count

    if raw_text:
        raw_numbered = re.findall(r"(?:^|\n|\b)\d+[\.\)]\s+[A-Za-z0-9]", raw_text)
        if len(raw_numbered) >= 1:
            return len(raw_numbered)

    section = _extract_section(search_text, ("key projects", "projects", "project", "proj"))
    if section:
        numbered = re.findall(r"(?:^|\n|\b)(?:\d+[\.\)]|•|\*|-)\s*([^\n]+)", section)
        if len(numbered) >= 1:
            return len(numbered)
        estimated = _estimate_phrase_count(section)
        if estimated > 0:
            return estimated

    raw_numbered = re.findall(r"\b\d+[\.\)]\s+[A-Za-z0-9]", search_text)
    if len(raw_numbered) >= 1:
        return len(raw_numbered)

    return 0


def _extract_certifications_count(text: str, raw_text: str = "") -> int:
    search_text = f"{text}\n{raw_text}"
    explicit_count = _extract_number_near_keywords(
        search_text,
        ("certifications", "certification", "certs", "cert", "achievements"),
    )
    if explicit_count is not None and explicit_count > 0:
        return explicit_count

    if raw_text:
        ach_keywords = ["rank 1", "promptwars", "diamond league", "rank 30", "winner", "first place", "award", "cup"]
        raw_lower = raw_text.lower()
        ach_count = sum(1 for kw in ach_keywords if kw in raw_lower)
        if ach_count >= 1:
            ach_items = re.findall(r"(?:^|\n|\b)(?:•|\*|-|\d+[\.\)])\s*([^\n]+)", raw_text)
            return max(ach_count, len(ach_items) if ach_items else 2)

    section = _extract_section(search_text, ("achievements", "certifications", "certification", "certs", "cert"))
    if section:
        items = _clean_certification_items(_split_section_items(section))
        if items:
            return len(items)
        numbered = re.findall(r"(?:^|\n|\b)(?:\d+[\.\)]|•|\*|-)\s*([^\n]+)", section)
        if numbered:
            return len(numbered)

    cert_keywords = ["google", "infosys", "coursera", "udemy", "aws", "promptwars", "rank 1", "diamond league", "certificate", "certification"]
    lowered = search_text.lower()
    matches = sum(1 for kw in cert_keywords if kw in lowered)
    return min(matches, 5) if matches > 0 else 0


def _dedupe_preserve_order(items: list[str]) -> list[str]:
    unique: list[str] = []
    seen: set[str] = set()
    for item in items:
        key = item.strip().lower()
        if key and key not in seen:
            seen.add(key)
            unique.append(item)
    return unique


def _extract_interest(text: str, options: list[str]) -> str:
    """Extract interest explicitly, or infer it from detected options."""
    section = _extract_section(text, ("interest", "interested"))
    if section:
        matches = _extract_from_aliases(section, INTEREST_ALIASES)
        if matches:
            return matches[0]
        return section

    return options[0] if options else ""


def _extract_options(text: str) -> list[str]:
    """
    Extract career options ONLY from comparison-related segments.
    Prevents random matches from entire text.
    """
    options_match = re.search(r"\b(?:options|compare options|target options|target career options|compare|between|confused between)\b[:\s-]*(.*?)(?:$|\n)", text, flags=re.IGNORECASE)
    options_segment = options_match.group(1) if options_match else ""

    options_from_segment = _extract_from_aliases(options_segment, CAREER_OPTION_ALIASES) if options_segment else []

    if len(options_from_segment) < 2:
        full_comparison_match = re.search(r"\b(?:between|compare|confused between|vs|versus)\b\s+(.*)", text, flags=re.IGNORECASE)
        if full_comparison_match:
            options_from_segment.extend(_extract_from_aliases(full_comparison_match.group(1), CAREER_OPTION_ALIASES))

    interest_section = _extract_section(text, ("interest", "interested"))
    options_from_interest = []
    if interest_section:
        interest_items = re.split(r'\s+(?:and|or|vs|,)\s+', interest_section, flags=re.IGNORECASE)
        for item in interest_items:
            item_clean = item.strip()
            if item_clean:
                matched = _extract_from_aliases(item_clean, CAREER_OPTION_ALIASES)
                options_from_interest.extend(matched)

    all_options = options_from_segment + options_from_interest
    options = _dedupe_preserve_order(all_options)

    return options if len(options) >= 2 else []


def parse_natural_language_input(text: str) -> dict:
    """
    Parse messy free-form career input into clean structured fields for the ML layer.
    """
    cleaned_text = _clean_input(text)
    options = _extract_options(cleaned_text)

    project_descriptions = _extract_project_descriptions(cleaned_text)
    project_count = _extract_projects_count(cleaned_text, raw_text=text)
    project_quality_score = _calculate_project_quality_score(project_descriptions, project_count)
    project_quality_score = max(project_quality_score, extract_project_keywords(cleaned_text))
    project_signal = 0.5 * project_quality_score + 0.3 * project_count

    # Section-aware skill extraction to prevent inflation
    skills_text = cleaned_text
    skills_match = re.search(r"skills?\s*[:\-]?\s*(.*?)(?=\b(?:cgpa|course|specialization|interest|projects?|certifications?|options?|compare|vs)\b|$)", cleaned_text, flags=re.IGNORECASE)
    if skills_match:
        skills_text = skills_match.group(1)

    certifications_count = _extract_certifications_count(cleaned_text, raw_text=text)

    return {
        "degree": _extract_degree(cleaned_text),
        "specialization": _extract_specialization(cleaned_text),
        "cgpa": _extract_cgpa(cleaned_text),
        "skills": _extract_skills(skills_text),
        "projects": project_count,
        "project_descriptions": project_descriptions,
        "project_quality_score": project_quality_score,
        "project_signal": project_signal,
        "certifications": certifications_count,
        "interest": _extract_interest(cleaned_text, options),
        "options": options,
    }
