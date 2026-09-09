"""
Resume Parser Service for Decision XAI.

Extracts structured text from uploaded PDF/DOCX resumes using pdfplumber/pypdf/docx,
dynamically detects key sections (Education, Skills, Projects, Experience, Certifications, Achievements),
extracts internships and work history, calculates an ATS readability & impact score,
and normalizes candidate attributes for direct ingestion into the ML Decision Engine.
"""
from __future__ import annotations

import io
import re
from typing import Any

from services.career_input_parser_service import _extract_cgpa
from services.hybrid_decision_service import normalize_career_input, analyze_career_profile


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract raw text from PDF bytes using pdfplumber with fallback to pypdf."""
    text = ""
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            pages = []
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    pages.append(extracted)
            text = "\n\n".join(pages).strip()
    except Exception:
        text = ""

    if not text:
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            pages = []
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    pages.append(extracted)
            text = "\n\n".join(pages).strip()
        except Exception:
            pass

    return text


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract raw text from docx bytes."""
    try:
        import docx
        doc = docx.Document(io.BytesIO(file_bytes))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n".join(paragraphs).strip()
    except Exception:
        return ""


def segment_resume_sections(raw_text: str) -> dict[str, str]:
    """
    Splits resume into distinct sections by detecting standard section headers
    dynamically across varied resume templates and formatting conventions.
    """
    section_aliases = {
        "summary": ("summary", "professional summary", "about me", "profile", "career summary", "executive summary", "objective"),
        "education": ("education", "academic", "academics", "qualifications", "academic background", "education & coursework"),
        "skills": ("technical skills", "skills", "technologies", "tech stack", "proficiencies", "competencies", "key skills", "core competencies", "technical proficiencies", "areas of expertise"),
        "projects": ("technical projects", "academic projects", "key projects", "personal projects", "engineering projects", "projects", "featured projects"),
        "experience": ("work experience", "professional experience", "employment history", "internships", "internship", "experience", "relevant experience", "industry experience"),
        "certifications": ("certifications & courses", "certifications", "licenses", "courses", "credentials", "professional certifications", "certificates"),
        "achievements": ("achievements", "honors & awards", "awards & achievements", "honors", "awards", "accomplishments", "hackathons & competitions", "competitions"),
        "publications": ("publications", "research papers", "patents"),
    }

    lines = raw_text.split("\n")
    sections: dict[str, list[str]] = {"header": []}
    current_section = "header"

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        cleaned_header = re.sub(r"[:\-_|•*#]+", " ", stripped).strip().lower()
        matched_section = None

        # Headers are usually concise lines (< 50 chars)
        if len(stripped) <= 50:
            for sec_name, aliases in section_aliases.items():
                if any(cleaned_header == alias or cleaned_header.startswith(alias + " ") for alias in aliases):
                    matched_section = sec_name
                    break

        if matched_section:
            current_section = matched_section
            if current_section not in sections:
                sections[current_section] = []
        else:
            sections[current_section].append(stripped)

    return {k: "\n".join(v).strip() for k, v in sections.items()}


# Comprehensive canonical tech vocabulary across software, AI/ML, cloud, data, and devops
KNOWN_TECH_SKILLS = [
    # AI / ML & GenAI
    "machine learning", "deep learning", "nlp", "computer vision", "generative ai", "genai",
    "prompt engineering", "gemini api", "gemini 2.0", "gemini", "claude", "groq", "groq api",
    "langchain", "langgraph", "llamaindex", "ollama", "vllm", "llama", "llama 3", "llama 3.3", "llama 3.1",
    "rag", "retrieval augmented generation", "transformers", "pytorch", "tensorflow", "keras",
    "scikit-learn", "llms", "large language models", "vector database", "qdrant", "chromadb",
    "pinecone", "milvus", "faiss", "huggingface", "opencv", "speech recognition", "whisper",
    "diffusion models", "stable diffusion",
    # Programming Languages
    "python", "c++", "c#", "java", "javascript", "typescript", "c", "sql", "r", "go", "golang", "rust",
    "html", "html5", "css", "css3", "bash", "shell", "powershell", "solidity", "kotlin", "swift", "dart",
    # Web & Backend Frameworks
    "fastapi", "flask", "django", "react", "react.js", "reactjs", "next.js", "node.js", "nodejs",
    "express", "express.js", "tailwind css", "tailwind", "rest api", "rest apis", "restful apis",
    "graphql", "websockets", "microservices", "pwa", "progressive web app", "progressive web apps",
    "vite", "redux", "vue", "vue.js", "angular", "svelte", "bootstrap", "spring boot", "asp.net",
    # Security, Auth & Architecture
    "jwt", "rbac", "oauth", "google oauth", "saml", "system design", "distributed systems",
    # Data Engineering & Analytics
    "pandas", "numpy", "scipy", "matplotlib", "seaborn", "tableau", "power bi", "spark", "apache spark",
    "hadoop", "etl", "airflow", "kafka", "dbt", "databricks", "snowflake", "bigquery",
    # Cloud, DevOps & Infrastructure
    "docker", "kubernetes", "git", "github actions", "github", "gitlab", "gitlab ci", "aws", "amazon web services",
    "azure", "microsoft azure", "gcp", "google cloud", "google cloud platform", "linux", "ci/cd",
    "terraform", "ansible", "nginx", "redis", "postgresql", "postgres", "neon postgresql", "neon postgres",
    "mysql", "mongodb", "sqlite", "sqlite3", "sqlalchemy", "prisma", "render", "vercel", "aws lambda",
    # Developer Tooling
    "vs code", "visual studio code", "postman", "jupyter", "streamlit", "gradio",
]


def extract_skills_from_resume(raw_text: str, skills_section: str) -> list[str]:
    """
    Extract recognized technical skills with high recall and precision.
    Combines:
    1. Direct structural parsing of category lines in the skills section (e.g. Languages: Python, C)
    2. Comprehensive matching against a modern 180+ technology ontology across the entire text.
    """
    found: list[str] = []
    seen = set()

    # 1. Parse structured category lines from skills section
    if skills_section:
        for line in skills_section.split("\n"):
            stripped = line.strip()
            if not stripped:
                continue
            # Look for Category: items or Category - items
            if ":" in stripped or (" - " in stripped and not stripped.startswith(("-", "*", "•"))):
                delimiter = ":" if ":" in stripped else " - "
                _, items_str = stripped.split(delimiter, 1)
                tokens = re.split(r"[,;/|•]+", items_str)
                for token in tokens:
                    clean_token = re.sub(r"\s*\(.*?\)", "", token).strip()
                    clean_token = clean_token.rstrip(". ").strip()
                    # Filter out purely non-technical headings or noise words
                    if clean_token and 1 <= len(clean_token) <= 35:
                        lower_key = clean_token.lower()
                        if lower_key not in seen and not any(stop in lower_key for stop in ["etc", "and others", "proficient", "familiar"]):
                            seen.add(lower_key)
                            found.append(clean_token)

    # 2. Vocabulary-based scan across entire resume text for known technologies
    combined_lower = f"{skills_section}\n{raw_text}".lower()
    for skill in KNOWN_TECH_SKILLS:
        pattern = rf"\b{re.escape(skill)}\b"
        if skill in ("c", "r"):
            # Avoid single character false positives like "c/o" or "section c"
            pattern = rf"(?:\b|\s){re.escape(skill)}(?:,|\s|$|/)"
        if re.search(pattern, combined_lower, flags=re.IGNORECASE):
            key = skill.lower()
            if key not in seen:
                seen.add(key)
                # Normalize display capitalization
                display_skill = skill
                if skill.lower() in ("python", "sql", "docker", "fastapi", "react", "sqlite", "git", "c++", "c#", "java", "bash", "html", "css", "streamlit"):
                    display_skill = skill.title() if skill.lower() != "sql" else "SQL"
                elif skill.lower() in ("rag", "pwa", "jwt", "rbac", "oauth", "gcp", "aws", "rest api", "rest apis"):
                    display_skill = skill.upper()
                found.append(display_skill)

    return found


def extract_cgpa_from_resume(raw_text: str, edu_section: str) -> tuple[float, str]:
    """
    Extract CGPA/GPA with priority to the Education section.
    Returns (cgpa_10_scale, score_type).
    """
    if edu_section:
        cgpa = _extract_cgpa(edu_section)
        if cgpa >= 1.0:
            return cgpa, "cgpa_10"

    cgpa_full = _extract_cgpa(raw_text)
    if cgpa_full >= 1.0:
        return cgpa_full, "cgpa_10"

    if edu_section:
        score_match = re.search(r"\b([5-9]\.\d{1,2}|10(?:\.0)?)\b", edu_section)
        if score_match:
            try:
                val = float(score_match.group(1))
                return val, "cgpa_10"
            except Exception:
                pass

    return 8.0, "cgpa_10"


def extract_degree_and_spec(raw_text: str, edu_section: str) -> tuple[str, str]:
    """Extract degree and specialization from the education block or full text."""
    target_text = f"{edu_section} {raw_text}".lower()

    # Degree
    degree = "B.Tech"
    if any(d in target_text for d in ["b.tech", "btech", "bachelor of technology"]):
        degree = "B.Tech"
    elif any(d in target_text for d in ["b.e.", "b.e ", "bachelor of engineering"]):
        degree = "B.E."
    elif any(d in target_text for d in ["m.tech", "mtech", "master of technology"]):
        degree = "M.Tech"
    elif any(d in target_text for d in ["mca", "master of computer applications"]):
        degree = "MCA"
    elif any(d in target_text for d in ["bca", "bachelor of computer applications"]):
        degree = "BCA"
    elif any(d in target_text for d in ["b.sc", "bsc", "bachelor of science"]):
        degree = "B.Sc"
    elif any(d in target_text for d in ["m.sc", "msc", "master of science"]):
        degree = "M.Sc"
    elif any(d in target_text for d in ["diploma"]):
        degree = "Diploma"

    # Specialization
    spec = "Computer Science Engineering"
    if any(s in target_text for s in ["data science", "cse(ds)", "cse (ds)", "cse - ds", "ds specialization"]):
        spec = "Computer Science (Data Science)"
    elif any(s in target_text for s in ["artificial intelligence", "ai & ml", "ai/ml", "cse(ai)", "cse (ai)"]):
        spec = "Computer Science (AI & ML)"
    elif any(s in target_text for s in ["cybersecurity", "cyber security", "information security"]):
        spec = "Cybersecurity"
    elif any(s in target_text for s in ["information technology", " it\b"]):
        spec = "Information Technology"
    elif any(s in target_text for s in ["computer science", "cse", "cs"]):
        spec = "Computer Science Engineering"

    return degree, spec


def extract_projects_from_resume(raw_text: str, proj_section: str) -> tuple[list[str], list[str]]:
    """
    Extracts clean project titles and full project implementation descriptions.
    Correctly distinguishes between project title lines and wrapped bullet points.
    Returns (project_titles, project_descriptions).
    """
    project_titles: list[str] = []
    project_descriptions: list[str] = []

    action_start_words = {
        "built", "engineered", "architected", "developed", "integrated", "implemented",
        "designed", "created", "spearheaded", "optimized", "scaled", "automated",
        "into", "and", "featuring", "with", "for", "to", "by", "that", "utilizing", "using",
    }

    if proj_section:
        lines = proj_section.split("\n")
        current_title = None
        current_bullets: list[str] = []

        def _save_current_project():
            nonlocal current_title, current_bullets
            if current_title and current_title not in project_titles:
                project_titles.append(current_title)
                full_desc = f"{current_title}: " + " ".join(current_bullets)
                project_descriptions.append(full_desc.strip())

        has_any_bullets = any(
            l.strip().startswith(("-", "*", "•", "–", "—")) or bool(re.match(r"^\d+[\.\)]\s+", l.strip()))
            for l in lines
        )

        for idx, line in enumerate(lines):
            stripped = line.strip()
            if not stripped:
                continue

            is_bullet = stripped.startswith(("-", "*", "•", "–", "—")) or bool(re.match(r"^\d+[\.\)]\s+", stripped))

            if is_bullet:
                bullet_content = re.sub(r"^[-*•–—\d\.\)\s]+", "", stripped).strip()
                if bullet_content:
                    current_bullets.append(bullet_content)
                continue

            # Check if this line is a continuation or a project title
            has_unmatched_closing = stripped.count(")") > stripped.count("(") or stripped.count("]") > stripped.count("[")
            starts_lowercase = stripped[0].islower()
            has_project_links = bool(re.search(r"\[(?:github|demo|code|link|live|paper)\]|https?://|\(rank\s*\d+", stripped, re.IGNORECASE))
            has_tech_separator = bool(re.search(r"\s*\|\s*|\s*[-–—]\s*(?:react|python|vue|node|aws|fastapi|flutter|java|c\+\+|sql)", stripped, re.IGNORECASE))

            next_is_bullet = False
            for nxt in lines[idx + 1:]:
                s_nxt = nxt.strip()
                if s_nxt:
                    next_is_bullet = s_nxt.startswith(("-", "*", "•", "–", "—")) or bool(re.match(r"^\d+[\.\)]\s+", s_nxt))
                    break

            cleaned_line = re.sub(r"^(\d+[\.\)]\s*|#+\s*)", "", stripped).strip()
            cleaned_title = re.sub(r"\[.*?\]|\(.*?\)", "", cleaned_line).strip()
            cleaned_title = re.sub(r"\s*\|\s*.*$", "", cleaned_title).strip()
            first_word = cleaned_title.split()[0].lower() if cleaned_title.split() else ""

            is_likely_title = (
                (next_is_bullet or has_project_links or has_tech_separator or not has_any_bullets)
                and not has_unmatched_closing
                and not starts_lowercase
                and first_word not in action_start_words
                and not any(k in cleaned_title.lower() for k in ["technologies", "tech stack", "tools", "overview", "key features"])
                and 3 <= len(cleaned_title) <= 60
            )

            if is_likely_title:
                _save_current_project()
                current_title = cleaned_title
                current_bullets = []
            elif current_bullets:
                # Wrapped continuation of previous bullet point
                current_bullets[-1] += " " + stripped
            elif current_title:
                current_bullets.append(stripped)

        _save_current_project()

    # Fallback to direct GitHub repository links if no projects parsed
    if not project_titles:
        gh_links = re.findall(r"https?://github\.com/([a-zA-Z0-9_\-\.]+)/([a-zA-Z0-9_\-\.]+)", raw_text, re.IGNORECASE)
        for owner, repo in gh_links:
            clean_repo = repo.replace("-", " ").replace("_", " ").title()
            if clean_repo.lower() not in [p.lower() for p in project_titles]:
                project_titles.append(clean_repo)
                project_descriptions.append(f"{clean_repo} repository hosted on GitHub")

    if not project_titles:
        project_titles = ["Technical Engineering Project"]
        project_descriptions = ["Hands-on technical engineering project and software system."]

    return project_titles[:5], project_descriptions[:5]


def extract_experience_from_resume(raw_text: str, exp_section: str) -> tuple[list[str], int, float, list[str]]:
    """
    Extracts work experience and internships dynamically from the experience block.
    Classifies internships, calculates tenure/experience_years, and returns:
    (internships, internship_count, experience_years, experience_entries).
    """
    internships: list[str] = []
    experience_entries: list[str] = []
    exp_years = 0.0

    target_text = exp_section if exp_section.strip() else raw_text
    lines = target_text.split("\n")

    current_role_title = ""
    current_bullets: list[str] = []

    def _save_current_entry():
        nonlocal current_role_title, current_bullets
        if current_role_title:
            full_entry = f"{current_role_title}: " + " ".join(current_bullets)
            experience_entries.append(full_entry.strip())
            lowered_title = current_role_title.lower()
            if any(hint in lowered_title for hint in ["intern", "internship", "co-op", "apprentice", "trainee", "fellow"]):
                if current_role_title not in internships:
                    internships.append(current_role_title)

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        is_bullet = stripped.startswith(("-", "*", "•", "–", "—")) or bool(re.match(r"^\d+[\.\)]\s+", stripped))
        if is_bullet:
            bullet_content = re.sub(r"^[-*•–—\d\.\)\s]+", "", stripped).strip()
            if bullet_content:
                current_bullets.append(bullet_content)
            continue

        # Check if line looks like an experience entry heading (contains title/company or dates)
        has_dates = bool(re.search(r"\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})\b", stripped, re.IGNORECASE))
        has_role_hint = any(w in stripped.lower() for w in [
            "intern", "engineer", "developer", "trainee", "associate", "analyst", "consultant",
            "lead", "manager", "specialist", "assistant", "fellow", "technologist", "scientist"
        ])

        if (has_role_hint or has_dates) and len(stripped) <= 95:
            _save_current_entry()
            # Clean trailing date strings or clean delimiters
            clean_title = re.sub(
                r"[\s\|\(,\-]+(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|summer|winter|spring|fall)[a-z]*\.?\s*)?(?:\d{2,4})?\s*[-–—to]+\s*(?:present|current|now|(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(?:\d{2,4}))[\)]?\s*$",
                "",
                stripped,
                flags=re.IGNORECASE
            ).strip()
            clean_title = re.sub(
                r"[\s\|\(,\-]+(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|summer|winter|spring|fall)[a-z]*\.?\s*)?\d{4}[\)]?\s*$",
                "",
                clean_title,
                flags=re.IGNORECASE
            ).strip()
            clean_title = clean_title.rstrip("–- ").strip()
            current_role_title = clean_title if clean_title else stripped
            current_bullets = []
        elif current_role_title:
            if current_bullets:
                current_bullets[-1] += " " + stripped
            else:
                current_bullets.append(stripped)

    _save_current_entry()

    # Dynamic experience years calculation
    if experience_entries:
        # Check if full-time vs internship
        full_time_entries = [e for e in experience_entries if not any(h in e.lower() for h in ["intern", "trainee", "apprentice"])]
        if full_time_entries:
            exp_years = max(1.0 * len(full_time_entries), 1.0)
        elif internships:
            exp_years = round(max(0.3 * len(internships), 0.25), 2)
    elif internships:
        exp_years = 0.25

    return internships, len(internships), exp_years, experience_entries


def extract_certifications_from_resume(raw_text: str, cert_section: str) -> list[str]:
    """Extract actual certification names from the certifications section without line fragmentation."""
    certs: list[str] = []
    if cert_section:
        lines = cert_section.split("\n")
        current_cert = ""
        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue
            is_bullet = stripped.startswith(("-", "*", "•", "–", "—")) or bool(re.match(r"^\d+[\.\)]\s+", stripped))
            clean_line = re.sub(r"^[-*•–—\d\.\)\s]+", "", stripped).strip()
            clean_line = re.sub(r"\[.*?\]", "", clean_line).strip()

            if is_bullet or not current_cert:
                if current_cert and 6 <= len(current_cert) <= 100:
                    if not any(stop in current_cert.lower() for stop in ["certificate:", "link:", "credential id:", "http"]):
                        certs.append(current_cert)
                current_cert = clean_line
            else:
                # Continuation of wrapped certification
                current_cert += " " + clean_line

        if current_cert and 6 <= len(current_cert) <= 100:
            if not any(stop in current_cert.lower() for stop in ["certificate:", "link:", "credential id:", "http"]):
                certs.append(current_cert)

    return certs[:6]


def extract_achievements_from_resume(raw_text: str, ach_section: str) -> list[str]:
    """Extract awards, hackathon rankings, and competitive achievements without fragmentation."""
    achievements: list[str] = []
    if ach_section:
        lines = ach_section.split("\n")
        current_ach = ""
        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue
            is_bullet = stripped.startswith(("-", "*", "•", "–", "—")) or bool(re.match(r"^\d+[\.\)]\s+", stripped))
            clean_line = re.sub(r"^[-*•–—\d\.\)\s]+", "", stripped).strip()
            clean_line = re.sub(r"\[.*?\]", "", clean_line).strip()

            if is_bullet or not current_ach:
                if current_ach and len(current_ach) >= 6:
                    achievements.append(current_ach[:110])
                current_ach = clean_line
            else:
                current_ach += " " + clean_line

        if current_ach and len(current_ach) >= 6:
            achievements.append(current_ach[:110])

    return achievements[:5]


def infer_best_fit_role(skills: list[str], specialization: str, target_role: str | None) -> str:
    """Intelligently map credentials to the highest-affinity benchmark career track."""
    if target_role and target_role.strip():
        return target_role.strip()

    skills_lower = set(s.lower() for s in skills)
    spec_lower = specialization.lower()

    # AI / ML Engineer
    ai_ml_hits = sum(1 for s in skills_lower if s in {
        "machine learning", "deep learning", "nlp", "gemini api", "gemini", "claude", "groq", "pytorch",
        "tensorflow", "rag", "generative ai", "prompt engineering", "langchain", "llamaindex", "ollama", "llms", "llama"
    })
    if ai_ml_hits >= 2 or "data science" in spec_lower or "ai" in spec_lower:
        return "AI Systems & Machine Learning Engineer"

    # Cloud & DevOps
    cloud_hits = sum(1 for s in skills_lower if s in {"docker", "kubernetes", "aws", "gcp", "azure", "ci/cd", "terraform", "github actions", "linux"})
    if cloud_hits >= 3:
        return "Cloud & DevOps Architect"

    # Data Science / Analytics
    ds_hits = sum(1 for s in skills_lower if s in {"sql", "pandas", "numpy", "tableau", "power bi", "python"})
    if ds_hits >= 3:
        return "Data Scientist & Analytics Engineer"

    # Full-Stack Software
    sde_hits = sum(1 for s in skills_lower if s in {"react", "javascript", "typescript", "node.js", "fastapi", "django", "html", "css", "java", "c++", "c"})
    if sde_hits >= 2:
        return "Full-Stack Software Engineer"

    return "AI Systems & Machine Learning Engineer"


def calculate_ats_audit(text: str, parsed_profile: dict[str, Any]) -> dict[str, Any]:
    """
    Computes an ATS (Applicant Tracking System) Compatibility & Audit breakdown.
    Checks for:
    1. Key sections presence (Education, Skills, Experience, Projects)
    2. Quantified action impact bullets (Percentages, Ranks, Scale, Latency, Scores)
    3. Action verbs
    4. Ideal token length
    """
    lowered = text.lower()
    feedback = []
    strengths = []
    score = 72.0

    # 1. Section checks
    has_edu = any(w in lowered for w in ["education", "degree", "university", "college", "b.tech", "btech", "bca", "mca", "b.e", "m.tech"])
    has_skills = any(w in lowered for w in ["skills", "technical skills", "technologies", "proficiencies", "tech stack"])
    has_proj = any(w in lowered for w in ["projects", "technical projects", "key projects"])
    has_exp = any(w in lowered for w in ["experience", "work experience", "professional experience", "internship", "internships"])

    if has_edu:
        score += 5
        strengths.append("Education section clearly recognized by ATS filters.")
    else:
        score -= 10
        feedback.append("Missing distinct 'Education' section heading.")

    if has_skills:
        score += 6
        strengths.append("Skills section formatted with recognizable technology tokens.")
    else:
        score -= 10
        feedback.append("Missing explicit 'Skills' or 'Technologies' section.")

    if has_proj:
        score += 5
        strengths.append("Demonstrable technical project portfolio present.")
    else:
        score -= 10
        feedback.append("No clear 'Projects' heading found.")

    if has_exp:
        score += 6
        strengths.append("Professional industry or internship experience documented.")

    # 2. Universal Quantified Action Metrics Engine
    metric_patterns = [
        # Percentages (including ~, +, decimals)
        r"(?:~|\+)?\b\d+(?:\.\d+)?%",
        # Competition ranks & placements
        r"\b(?:rank|ranked)\s*(?:#?\d+|\d+(?:st|nd|rd|th)?)\b(?:\s*/\s*[\d,]+[kK+]?|\s*among\s*[\d,.]+[kK+]?)?",
        # Scale, volume & user adoption
        r"\b\d+[\d,]*\+?\s*(?:users|clients|customers|requests|queries|downloads|visitors|events|records|rows|datasets|languages|documents|points|stars)\b",
        # Speed, latency & performance
        r"\b\d+(?:\.\d+)?\s*(?:ms|milliseconds?|seconds?|mins?|hours?|x\s*faster|latency reduction|speedup)\b",
        # Grades & academic scores
        r"\b(?:cgpa|ygpa|sgpa|gpa|grade|score)[:\s]*\d+(?:\.\d+)?(?:\s*/\s*10(?:\.0)?)?\b",
        r"\b\d+\.\d+\s*(?:ygpa|cgpa|gpa)\b",
        # Financials & currency
        r"(?:\$|€|£|₹|inr)\s*\d+[\d,]*(?:\.\d+)?(?:\s*(?:k|m|b|cr|lakh|crore))?\b",
    ]

    detected_metrics = []
    for pattern in metric_patterns:
        for match in re.finditer(pattern, text, flags=re.IGNORECASE):
            token = match.group(0).strip()
            if token and token.lower() not in [m.lower() for m in detected_metrics]:
                detected_metrics.append(token)

    metrics_count = len(detected_metrics)
    if metrics_count >= 5:
        score += 10
        strengths.append(f"Strong quantified impact: detected {metrics_count} quantifiable metrics and outcome figures.")
    elif metrics_count >= 2:
        score += 5
        strengths.append(f"Quantifiable proof present: detected {metrics_count} measurable outcome indicators.")
    elif metrics_count >= 1:
        score += 2
        feedback.append("Add more quantified business or performance outcomes (% increase, latency reduction, user scale).")
    else:
        score -= 8
        feedback.append("Low quantifiable proof: most bullet points describe duties rather than measurable results.")

    # 3. Action verbs check
    action_verbs = [
        "architected", "built", "engineered", "designed", "deployed", "implemented",
        "optimized", "spearheaded", "developed", "scaled", "automated", "integrated",
        "orchestrated", "refactored", "authored", "accelerated", "trained", "delivered"
    ]
    action_verb_count = sum(1 for verb in action_verbs if re.search(rf"\b{verb}\b", lowered))
    if action_verb_count >= 4:
        score += 5
        strengths.append(f"Action-oriented vocabulary: detected {action_verb_count} high-impact technical action verbs.")
    else:
        feedback.append("Begin project bullet points with strong technical action verbs (e.g., Engineered, Scaled, Deployed).")

    # 4. Length / token check
    words = len(text.split())
    if 250 <= words <= 1200:
        score += 5
        strengths.append("Ideal resume length for early-to-mid career ATS screening.")
    elif words < 200:
        score -= 10
        feedback.append("Resume is very brief. Expand on technical architecture and responsibilities.")

    ats_score = round(max(20.0, min(100.0, score)), 1)

    if ats_score >= 80:
        ats_grade = "High ATS Match"
        grade_color = "emerald"
    elif ats_score >= 65:
        ats_grade = "Moderate ATS Match"
        grade_color = "amber"
    else:
        ats_grade = "Needs ATS Optimization"
        grade_color = "rose"

    return {
        "ats_score": ats_score,
        "ats_grade": ats_grade,
        "grade_color": grade_color,
        "strengths": strengths[:5],
        "recommendations": feedback[:4],
        "word_count": words,
        "detected_metrics_count": metrics_count,
        "sample_metrics": detected_metrics[:6],
    }


def parse_and_analyze_resume(file_bytes: bytes, filename: str, target_role: str | None = None) -> dict[str, Any]:
    """
    Parses an uploaded resume file (PDF or DOCX), extracts candidate attributes dynamically,
    computes an ATS audit, and runs the Decision XAI career analysis engine.
    Optionally evaluates candidate fit against a specified target_role.
    """
    filename_lower = filename.lower()
    if filename_lower.endswith(".docx"):
        raw_text = extract_text_from_docx(file_bytes)
    else:
        raw_text = extract_text_from_pdf(file_bytes)

    if not raw_text.strip():
        raise ValueError("Could not extract readable text from the uploaded file. Please ensure it is an ATS-readable PDF or DOCX.")

    # 1. Segment resume into standard structural blocks
    sections = segment_resume_sections(raw_text)
    edu_section = sections.get("education", "")
    skills_section = sections.get("skills", "")
    proj_section = sections.get("projects", "")
    exp_section = sections.get("experience", "")
    cert_section = sections.get("certifications", "")
    ach_section = sections.get("achievements", "")

    # 2. Extract credentials dynamically with high precision
    cgpa, score_type = extract_cgpa_from_resume(raw_text, edu_section)
    degree, specialization = extract_degree_and_spec(raw_text, edu_section)
    skills = extract_skills_from_resume(raw_text, skills_section)
    projects, project_descriptions = extract_projects_from_resume(raw_text, proj_section)
    internships, internship_count, experience_years, exp_entries = extract_experience_from_resume(raw_text, exp_section)
    certifications = extract_certifications_from_resume(raw_text, cert_section)
    achievements = extract_achievements_from_resume(raw_text, ach_section)

    # 3. Determine target track & options
    inferred_track = infer_best_fit_role(skills, specialization, target_role)
    active_target = target_role.strip() if (target_role and target_role.strip()) else inferred_track

    # 4. Normalize profile for ML model
    normalized = normalize_career_input({
        "degree": degree,
        "course": degree,
        "specialization": specialization,
        "cgpa": cgpa,
        "score_type": score_type,
        "raw_score": cgpa,
        "skills": skills,
        "skills_count": len(skills),
        "projects": projects,
        "project_count": len(projects),
        "project_descriptions": project_descriptions,
        "internships": internships,
        "internship_count": internship_count,
        "experience_years": experience_years,
        "certifications": certifications,
        "certification_count": len(certifications),
        "achievements": achievements,
        "interest": active_target,
        "options": [active_target, "Data Scientist & Analytics Engineer", "Full-Stack Software Engineer"],
        "raw_prompt": raw_text[:2500],
    })

    # 5. Run hybrid decision XAI model
    decision_result = analyze_career_profile(normalized, source="resume_upload")
    decision_result["intent"] = "career"

    # 6. Compute ATS Compatibility Audit
    ats_audit = calculate_ats_audit(raw_text, {
        "degree": degree,
        "specialization": specialization,
        "cgpa": cgpa,
        "skills": skills,
        "projects": len(projects),
        "internships": len(internships),
    })

    if active_target:
        target_lower = active_target.lower()
        role_matched = any(w in raw_text.lower() for w in target_lower.split() if len(w) > 2)
        if role_matched:
            ats_audit["strengths"].insert(0, f"Target Role Match: Resume reflects relevant keywords for '{active_target}'.")
        else:
            ats_audit["recommendations"].insert(0, f"Target Role Gap: Add more explicit projects/skills tailored to '{active_target}'.")
        ats_audit["target_role"] = active_target

    return {
        "filename": filename,
        "target_role": target_role.strip() if target_role else None,
        "extracted_text_preview": raw_text[:1200] + ("..." if len(raw_text) > 1200 else ""),
        "parsed_profile": {
            "degree": degree,
            "specialization": specialization,
            "cgpa": cgpa,
            "score_type": score_type,
            "skills": skills,
            "skills_count": len(skills),
            "projects": projects,
            "projects_count": len(projects),
            "project_descriptions": project_descriptions,
            "internships": internships,
            "internships_count": len(internships),
            "certifications": certifications,
            "certifications_count": len(certifications),
            "achievements": achievements,
            "achievements_count": len(achievements),
            "experience_years": experience_years,
            "interest": active_target,
            "target_role": target_role.strip() if target_role else None,
        },
        "ats_audit": ats_audit,
        "decision": decision_result,
    }
