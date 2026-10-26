"""
Resume Parser Service for Decision XAI.

Extracts structured text from uploaded PDF/DOCX resumes using pdfplumber/pypdf/docx,
dynamically detects key sections (Education, Skills, Projects, Experience, Certifications, Achievements),
extracts internships and work history, calculates an ATS readability & impact score,
and normalizes candidate attributes for direct ingestion into the ML Decision Engine.
"""
from __future__ import annotations

import io
import os
from pathlib import Path
import re
from typing import Any

from services.career_input_parser_service import _extract_cgpa
from services.hybrid_decision_service import normalize_career_input, analyze_career_profile


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extract raw text from PDF bytes using pdfplumber with layout-aware
    page reading, table preservation, and fallback to pypdf.
    """
    text = ""
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            pages = []
            for page in pdf.pages:
                extracted = page.extract_text(layout=False) or ""
                if len(extracted.strip()) < 50:
                    extracted = page.extract_text(layout=True) or ""

                # Extract any structured tables (e.g. coursework, education, skill matrices)
                tables = page.extract_tables() or []
                table_lines = []
                for table in tables:
                    for row in table:
                        if row:
                            row_str = " | ".join(str(cell or "").strip() for cell in row if str(cell or "").strip())
                            if row_str:
                                table_lines.append(row_str)
                if table_lines:
                    extracted = (extracted + "\n" + "\n".join(table_lines)).strip()

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
                if extracted and extracted.strip():
                    pages.append(extracted.strip())
            text = "\n\n".join(pages).strip()
        except Exception:
            pass

    return text


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract raw text from docx bytes including paragraphs and tables."""
    try:
        import docx
        doc = docx.Document(io.BytesIO(file_bytes))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]

        for table in doc.tables:
            for row in table.rows:
                row_str = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                if row_str:
                    paragraphs.append(row_str)

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

        # Check for inline section header, e.g. "Skills: Python, ..." or "Education: BBA LLB..."
        inline_match = re.match(r"^([A-Za-z\s&]{2,30})\s*:\s*(.+)$", stripped)
        matched_section = None

        if inline_match:
            cand_header = re.sub(r"[:\-_|•*#]+", " ", inline_match.group(1)).strip().lower()
            for sec_name, aliases in section_aliases.items():
                if any(cand_header == alias or cand_header.startswith(alias + " ") for alias in aliases):
                    matched_section = sec_name
                    current_section = sec_name
                    if current_section not in sections:
                        sections[current_section] = []
                    sections[current_section].append(inline_match.group(2).strip())
                    break

        if not matched_section:
            cleaned_header = re.sub(r"[:\-_|•*#]+", " ", stripped).strip().lower()
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


# Comprehensive canonical domain skills across Software, AI/ML, Cloud, Data, Legal, Finance, and Design
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
    # Legal, Privacy & Compliance
    "ip due diligence", "trademark filing", "patent search", "patent prosecution", "antitrust compliance",
    "regulatory risk assessment", "competition law", "contract drafting", "gdpr", "dpdp", "dpdp act 2023",
    "data privacy", "merger control", "due diligence", "corporate governance", "sebi compliance",
    "intellectual property", "fto opinion", "freedom to operate", "trademark clearance", "licensing agreements",
    "commercial contracts", "standard contractual clauses", "dpa", "legal compliance", "compliance audit",
    # Finance, Valuation & Investment
    "financial modeling", "dcf valuation", "lbo", "equity research", "cfa", "credit risk", "basel iii",
    "ifrs 9", "portfolio management", "var", "risk management", "investment banking", "m&a advisory",
    "corporate valuation", "wealth management", "derivatives", "financial analysis", "balance sheet analysis",
    "accounting", "financial reporting", "excel modeling", "vba",
    # Design & Product
    "figma", "ui/ux", "user research", "wireframing", "prototyping", "design systems", "wcag", "wcag 2.1",
    "usability testing", "interaction design", "information architecture", "product management", "prd",
    "product analytics", "mixpanel", "google analytics", "a/b testing", "user journey mapping", "scrum", "agile",
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
    """Extract degree and specialization from the education block with priority over full text."""
    edu_lower = (edu_section or "").lower()
    full_lower = (raw_text or "").lower()
    
    # Priority order for search text: education section first, then full resume
    search_texts = [edu_lower, full_lower] if edu_lower.strip() else [full_lower]

    def _find_degree(text: str) -> str | None:
        if any(d in text for d in ["bba llb", "bba.llb", "bba-llb", "bba ll.b"]):
            return "BBA LLB"
        if any(d in text for d in ["ba llb", "ba.llb", "ba-llb", "ba ll.b"]):
            return "BA LLB"
        if any(d in text for d in ["b.tech", "btech", "bachelor of technology"]):
            return "B.Tech"
        if any(d in text for d in ["b.e.", "b.e ", "bachelor of engineering"]):
            return "B.E."
        if any(d in text for d in ["m.tech", "mtech", "master of technology"]):
            return "M.Tech"
        if any(d in text for d in ["mca", "master of computer applications"]):
            return "MCA"
        if any(d in text for d in ["bca", "bachelor of computer applications"]):
            return "BCA"
        if any(d in text for d in ["mba", "master of business administration"]):
            return "MBA"
        if any(d in text for d in ["bba", "bachelor of business administration"]):
            return "BBA"
        if any(d in text for d in ["b.com", "bcom", "bachelor of commerce"]):
            return "B.Com"
        if any(d in text for d in ["b.des", "bdes", "m.des", "mdes", "bachelor of design"]):
            return "B.Des"
        if any(d in text for d in ["b.sc", "bsc", "bachelor of science"]):
            return "B.Sc"
        if any(d in text for d in ["m.sc", "msc", "master of science"]):
            return "M.Sc"
        if re.search(r"\b(?:ll\.m\.?|master of laws)\b", text) or (
            re.search(r"\bllm\b", text) and any(w in text for w in ["law", "legal", "advocate", "barrister", "juris"])
        ):
            return "LLM"
        if any(d in text for d in ["ll.b", "llb", "bachelor of laws"]):
            return "LLB"
        if "diploma" in text:
            return "Diploma"
        return None

    degree = "B.Tech"
    for st in search_texts:
        found_deg = _find_degree(st)
        if found_deg:
            degree = found_deg
            break

    # Specialization - prioritize education section first
    spec = "General"
    target_text = f"{edu_lower} {full_lower}"
    if any(s in target_text for s in ["data science", "cse(ds)", "cse (ds)", "cse - ds", "ds specialization"]):
        spec = "Computer Science (Data Science)"
    elif any(s in target_text for s in ["artificial intelligence", "ai & ml", "ai/ml", "cse(ai)", "cse (ai)"]):
        spec = "Computer Science (AI & ML)"
    elif any(s in target_text for s in ["intellectual property", "ip law", "patent", "trademark", "wipo"]):
        spec = "Intellectual Property & Competition Law"
    elif any(s in target_text for s in ["competition law", "antitrust", "merger control"]):
        spec = "Competition & Corporate Law"
    elif any(s in target_text for s in ["corporate law", "company law", "commercial law"]):
        spec = "Corporate Law"
    elif any(s in target_text for s in ["cyber law", "technology law", "privacy law", "data privacy"]):
        spec = "Cyber & Technology Law"
    elif any(s in target_text for s in ["investment banking", "corporate finance", "equity research"]):
        spec = "Investment Banking & Valuation"
    elif any(s in target_text for s in ["financial risk", "credit risk", "risk management"]):
        spec = "Financial Risk & Banking"
    elif any(s in target_text for s in ["ui/ux", "interaction design", "product design"]):
        spec = "UI/UX & Product Design"
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


def _clean_achievement_entry(entry: str) -> str:
    cleaned = entry.strip()
    # Strip bullet characters or list numbering like "1. ", "1) ", but preserve ordinals like "1st", "2nd"
    cleaned = re.sub(r"^(?:[-*•–—]\s*|\d+(?!(?:st|nd|rd|th)\b)[\.\)]\s*)", "", cleaned).strip()
    # Repair missing or truncated leading ordinal digits: e.g. "nd Place" -> "2nd Place", "st Place" -> "1st Place", "rd Place" -> "3rd Place"
    cleaned = re.sub(r"^\bnd\s+Place\b", "2nd Place", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"^\bst\s+Place\b", "1st Place", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"^\brd\s+Place\b", "3rd Place", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"^\bth\s+Place\b", "4th Place", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\[.*?\]", "", cleaned).strip()
    return cleaned


def extract_achievements_from_resume(raw_text: str, ach_section: str = "") -> list[str]:
    """Extract awards, hackathon rankings, and competitive achievements without ordinal corruption or fragmentation."""
    achievements: list[str] = []
    if not ach_section and raw_text:
        sections = segment_resume_sections(raw_text)
        ach_section = sections.get("achievements", "")
    if ach_section:
        lines = ach_section.split("\n")
        current_ach = ""
        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue
            is_bullet = stripped.startswith(("-", "*", "•", "–", "—")) or bool(re.match(r"^\d+(?!(?:st|nd|rd|th)\b)[\.\)]\s+", stripped))
            clean_line = _clean_achievement_entry(stripped)

            if is_bullet or not current_ach:
                if current_ach and len(current_ach) >= 6:
                    cleaned_curr = _clean_achievement_entry(current_ach)
                    if cleaned_curr:
                        achievements.append(cleaned_curr[:250])
                current_ach = clean_line
            else:
                current_ach += " " + clean_line

        if current_ach and len(current_ach) >= 6:
            cleaned_curr = _clean_achievement_entry(current_ach)
            if cleaned_curr:
                achievements.append(cleaned_curr[:250])

    if raw_text:
        # Scan raw_text for high-impact achievements (rankings, hackathons, national percentiles, competitions)
        patterns = [
            r"(?:ranked|rank)\s+in\s+the\s+top\s+[\d\.]+%[^.\n]+",
            r"(?:top\s+[\d\.]+%|rank\s+#?\d+|(?:1st|2nd|3rd|4th|\d+th)\s+place|winner|runner-up|finalist)[^.\n]+",
            r"(?:promptwars|codeforces|leetcode|hackathon|kaggle|olympiad)[^.\n]+",
        ]
        for pat in patterns:
            for match in re.finditer(pat, raw_text, flags=re.IGNORECASE):
                found = _clean_achievement_entry(match.group(0))
                if len(found) >= 8 and not any(found.lower() in a.lower() for a in achievements):
                    achievements.append(found[:250])
                if len(achievements) >= 6:
                    break
            if len(achievements) >= 6:
                break

    return [_clean_achievement_entry(a) for a in achievements[:6] if _clean_achievement_entry(a)]


def infer_best_fit_role(skills: list[str], specialization: str, target_role: str | None) -> str:
    """Intelligently map credentials to the highest-affinity benchmark career track."""
    if target_role and target_role.strip() and target_role.strip().lower() != "auto":
        return target_role.strip()

    skills_lower = set(s.lower() for s in skills)
    spec_lower = specialization.lower()

    # 1. AI / ML & Agentic Systems (Evaluate first when candidate has modern LLM/AI stack)
    ai_ml_keywords = [
        "machine learning", "deep learning", "nlp", "gemini", "claude", "groq", "pytorch",
        "tensorflow", "rag", "generative ai", "prompt engineering", "langchain", "llamaindex",
        "ollama", "llm", "llama", "multi-agent", "agent orchestration", "agentic", "vector",
        "embeddings", "fine-tuning", "lora", "transformers", "hugging face", "neural"
    ]
    ai_ml_hits = sum(1 for s in skills_lower if any(kw in s for kw in ai_ml_keywords))
    if ai_ml_hits >= 2 or ("data science" in spec_lower and ai_ml_hits >= 1) or ("ai" in spec_lower and ai_ml_hits >= 1):
        return "AI Systems & Machine Learning Engineer"

    # 2. Legal & Compliance
    legal_keywords = ["legal", "trademark", "patent", "antitrust", "gdpr", "dpdp", "compliance", "regulatory", "ip due", "contract", "merger", "wipo"]
    legal_hits = sum(1 for s in skills_lower if any(w in s for w in legal_keywords))
    if legal_hits >= 2 or any(l in spec_lower for l in ["law", "legal", "compliance", "intellectual property", "antitrust"]):
        return "IP & Technology Lawyer"

    # 3. Finance & Investment
    fin_keywords = ["finance", "valuation", "dcf", "lbo", "equity research", "cfa", "credit risk", "accounting", "banking", "financial modeling"]
    fin_hits = sum(1 for s in skills_lower if any(w in s for w in fin_keywords))
    if fin_hits >= 2 or any(f in spec_lower for f in ["finance", "banking", "investment", "accounting"]):
        return "Finance & Investment Analyst"

    # 4. UI/UX & Design (Requires genuine design tools/methodologies, not just wcag accessibility)
    design_keywords = ["figma", "wireframing", "prototyping", "adobe xd", "user research", "ui design", "ux design", "interaction design"]
    design_hits = sum(1 for s in skills_lower if any(w in s for w in design_keywords))
    if design_hits >= 2 or ("design" in spec_lower and "system" not in spec_lower and "science" not in spec_lower):
        return "Product UI/UX Designer"

    # 5. Cloud & DevOps
    cloud_keywords = ["docker", "kubernetes", "aws", "gcp", "azure", "ci/cd", "terraform", "github actions", "linux", "devops"]
    cloud_hits = sum(1 for s in skills_lower if any(w in s for w in cloud_keywords))
    if cloud_hits >= 3:
        return "Cloud & DevOps Architect"

    # 6. Data Science / Analytics
    ds_keywords = ["sql", "pandas", "numpy", "tableau", "power bi", "data analysis", "data analytics", "data warehouse"]
    ds_hits = sum(1 for s in skills_lower if any(w in s for w in ds_keywords))
    if ds_hits >= 2 or "data science" in spec_lower:
        return "Data Scientist & Analytics Engineer"

    # 7. Full-Stack Software
    sde_keywords = ["react", "javascript", "typescript", "node.js", "fastapi", "django", "html", "css", "java", "c++", "c", "springboot"]
    sde_hits = sum(1 for s in skills_lower if any(w in s for w in sde_keywords))
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
    has_edu = any(w in lowered for w in ["education", "degree", "university", "college", "b.tech", "btech", "bca", "mca", "b.e", "m.tech", "llb", "ba llb", "bba llb", "llm", "law", "b.com", "bcom", "bba", "mba", "b.des"])
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

    # 5. Link & Repository Verifiability
    has_links = bool(re.search(r"https?://|github\.com/|linkedin\.com/|vercel\.app|render\.com", lowered))
    if has_links:
        score += 4
        strengths.append("Verified online portfolio and code repository links present.")
    else:
        score -= 4
        feedback.append("Add direct GitHub repository or live deployment URLs for instant 1-click recruiter verification.")

    # 6. Competitive Honors & Achievements
    achievements_detected = any(w in lowered for w in ["hackathon", "rank", "winner", "runner-up", "finalist", "promptwars", "codeforces", "leetcode", "kaggle", "top 0.", "top 1%"])
    if achievements_detected:
        score += 4
        strengths.append("Verified competitive hackathon or high-percentile contest achievements present.")

    # 7. Actionable Enterprise ATS Recommendations
    if "jwt" in lowered or "fastapi" in lowered or "rag" in lowered or "api" in lowered or "llm" in lowered:
        if not any(w in lowered for w in ["latency", "throughput", "qps", "response time", "ms"]):
            feedback.append("Quantify system performance (e.g., API latency in ms, token cost reductions, or user concurrency) on core backend projects.")

    if len(feedback) < 2:
        feedback.append("Ensure every project bullet point follows the Google X-Y-Z formula (Accomplished [X] as measured by [Y], by doing [Z]).")
        if not has_links:
            feedback.append("Embed clickable GitHub repository and live demo links directly into project headers for instant recruiter verification.")
        else:
            feedback.append("Align technical skill token frequency with target role postings to pass strict enterprise ATS keyword density filters.")

    # Calibrate realistic enterprise score: 88.0 - 93.0 for strong early career profiles
    raw_calc = score - 8.0
    ats_score = round(max(25.0, min(94.0 if (has_links and achievements_detected) else 91.0, raw_calc)), 1)

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
        "section_checks": {
            "education": has_edu,
            "skills": has_skills,
            "projects": has_proj,
            "experience": has_exp,
        },
        "strengths": strengths[:5],
        "recommendations": feedback[:4],
        "word_count": words,
        "detected_metrics_count": metrics_count,
        "sample_metrics": detected_metrics[:6],
    }


def extract_profile_with_llm(raw_text: str, target_role: str | None = None) -> dict[str, Any] | None:
    """
    Uses Gemini API (via resilient LLM Client) to deeply and accurately parse resumes.
    STRICT ZERO-HALLUCINATION GUARDRAILS:
    - Never invent, exaggerate, or assume details not in the resume text.
    - Captures rich project descriptions (tech stack, real-world purpose, impact).
    - Captures competitive achievements, hackathon placements, and honors accurately.
    - Returns structured profile dictionary or None on failure.
    """
    if not raw_text or len(raw_text.strip()) < 40:
        return None

    try:
        from services.llm_client import call_llm_json

        system_prompt = (
            "You are an expert ATS & Resume Intelligence Parser for Decision XAI.\n"
            "Your core principle is 100% TRANSPARENCY, AUDITABILITY, AND ZERO HALLUCINATION.\n"
            "Rules:\n"
            "1. NEVER invent, exaggerate, or assume details not present in the resume text.\n"
            "2. Only extract verified facts explicitly mentioned in the text.\n"
            "3. For PROJECTS: Extract project title, tech stack (libraries/tools), and a detailed description explaining what was built, how it works, and its real-world impact. Do not just return 1-word titles.\n"
            "4. For ACHIEVEMENTS: Extract all hackathon ranks, competition placements, awards, and national percentiles accurately without truncating them.\n"
            "5. For CERTIFICATIONS: Only include verified credentials explicitly listed in a certifications/courses section. If none, return an empty array [].\n"
            "6. Return ONLY valid JSON in this exact structure:\n"
            "{\n"
            '  "full_name": "Candidate Name",\n'
            '  "degree": "e.g. B.Tech, B.E., BS, MBA, BA LLB",\n'
            '  "specialization": "e.g. Computer Science (Data Science)",\n'
            '  "cgpa": 8.47,\n'
            '  "score_type": "cgpa_10",\n'
            '  "skills": ["Python", "FastAPI", "React", ...],\n'
            '  "project_titles": ["Project 1", "Project 2"],\n'
            '  "project_descriptions": ["Project 1: Full description with stack...", "Project 2: ..."],\n'
            '  "achievements": ["2nd Place Winner (Rank 2) - STARTUPATHON...", "Rank 8 - HACKDAY..."],\n'
            '  "internships": ["AI Intern - Organization"],\n'
            '  "certifications": [],\n'
            '  "experience_years": 0.0,\n'
            '  "inferred_role": "AI Engineer (Agentic & LLM Systems)",\n'
            '  "evidence_citations": {"degree": "snippet from resume", "achievements": "snippet from resume"}\n'
            "}"
        )

        prompt = f"Resume Content:\n```text\n{raw_text[:7000]}\n```"
        if target_role:
            prompt += f"\nTarget Benchmark Role: {target_role}"

        parsed = call_llm_json(prompt, system_prompt=system_prompt, timeout_seconds=25)
        if isinstance(parsed, dict) and (parsed.get("skills") or parsed.get("project_titles") or parsed.get("degree")):
            return parsed
    except Exception as exc:
        import logging
        logging.getLogger("DeciXAI.ResumeParser").warning("Gemini LLM resume parser exception: %s", exc)

    return None


def parse_and_analyze_resume(file_bytes: bytes, filename: str, target_role: str | None = None) -> dict[str, Any]:
    """
    Parses an uploaded resume file (PDF or DOCX), extracts candidate attributes dynamically
    using Gemini API intelligence with deterministic guardrails, computes an ATS audit,
    and runs the Decision XAI career analysis engine.
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

    # 2. Deterministic Extractors (always available as benchmark and fallback)
    cgpa_det, score_type_det = extract_cgpa_from_resume(raw_text, edu_section)
    degree_det, spec_det = extract_degree_and_spec(raw_text, edu_section)
    skills_det = extract_skills_from_resume(raw_text, skills_section)
    projects_det, project_desc_det = extract_projects_from_resume(raw_text, proj_section)
    internships_det, internship_count_det, exp_years_det, exp_entries_det = extract_experience_from_resume(raw_text, exp_section)
    certifications_det = extract_certifications_from_resume(raw_text, cert_section)
    achievements_det = extract_achievements_from_resume(raw_text, ach_section)

    # 3. Gemini / Resilient LLM Deep Resume Intelligence Parser
    llm_profile = extract_profile_with_llm(raw_text, target_role=target_role)

    # 4. Synthesize with Transparent Guardrails
    if llm_profile:
        # CGPA
        llm_cgpa = llm_profile.get("cgpa")
        cgpa = float(llm_cgpa) if (isinstance(llm_cgpa, (int, float)) and 0.0 < float(llm_cgpa) <= 100.0) else cgpa_det
        score_type = str(llm_profile.get("score_type") or score_type_det)

        # Degree & Specialization
        degree = str(llm_profile.get("degree") or degree_det)
        specialization = str(llm_profile.get("specialization") or spec_det)

        # Skills: Union of LLM extracted skills and deterministic keyword hits
        llm_skills = llm_profile.get("skills") or []
        combined_skills = []
        seen_skills = set()
        for s in (llm_skills + skills_det):
            clean_s = str(s).strip()
            if clean_s and clean_s.lower() not in seen_skills and len(clean_s) < 50:
                seen_skills.add(clean_s.lower())
                combined_skills.append(clean_s)
        skills = combined_skills if combined_skills else skills_det

        # Projects: Keep rich descriptions and titles
        llm_proj_titles = llm_profile.get("project_titles") or []
        llm_proj_desc = llm_profile.get("project_descriptions") or []
        if llm_proj_titles:
            projects = [str(p).strip() for p in llm_proj_titles if str(p).strip()]
            project_descriptions = [str(d).strip() for d in llm_proj_desc if str(d).strip()]
        else:
            projects = projects_det
            project_descriptions = project_desc_det

        # Achievements: Deeply capture competition rankings & awards
        llm_achs = llm_profile.get("achievements") or []
        combined_achs = []
        seen_achs = set()
        for a in (llm_achs + achievements_det):
            clean_a = _clean_achievement_entry(str(a))
            if clean_a and clean_a.lower() not in seen_achs:
                seen_achs.add(clean_a.lower())
                combined_achs.append(clean_a)
        achievements = combined_achs if combined_achs else [_clean_achievement_entry(a) for a in achievements_det]

        # Internships
        llm_interns = llm_profile.get("internships") or []
        internships = [str(i).strip() for i in llm_interns if str(i).strip()] if llm_interns else internships_det
        internship_count = len(internships)

        # Experience years
        llm_exp = llm_profile.get("experience_years")
        experience_years = float(llm_exp) if isinstance(llm_exp, (int, float)) else exp_years_det

        # Certifications
        llm_certs = llm_profile.get("certifications")
        certifications = [str(c).strip() for c in llm_certs if str(c).strip()] if isinstance(llm_certs, list) else certifications_det

        inferred_track = llm_profile.get("inferred_role") or infer_best_fit_role(skills, specialization, target_role)
        evidence_citations = llm_profile.get("evidence_citations") or {}
    else:
        cgpa, score_type = cgpa_det, score_type_det
        degree, specialization = degree_det, spec_det
        skills = skills_det
        projects, project_descriptions = projects_det, project_desc_det
        internships, internship_count, experience_years = internships_det, internship_count_det, exp_years_det
        certifications = certifications_det
        achievements = achievements_det
        inferred_track = infer_best_fit_role(skills, specialization, target_role)
        evidence_citations = {}

    active_target = target_role.strip() if (target_role and target_role.strip()) else inferred_track

    # Persona
    persona = "student" if experience_years < 1.0 else ("graduate" if experience_years < 2.5 else "professional")

    # Domain umbrella detection
    active_domain = None
    target_lower = active_target.lower()
    if any(k in target_lower for k in ["legal", "law", "compliance", "regulatory", "ip", "patent", "trademark"]):
        active_domain = "legal"
        domain_options = [active_target, "Corporate Legal Counsel", "Compliance & Regulatory Manager"]
    elif any(k in target_lower for k in ["finance", "banking", "investment", "valuation", "equity"]):
        active_domain = "finance"
        domain_options = [active_target, "Financial Analyst", "Investment Banking Analyst"]
    elif any(k in target_lower for k in ["design", "ui", "ux"]):
        active_domain = "design"
        domain_options = [active_target, "Product UI/UX Designer", "Design Systems Lead"]
    else:
        active_domain = "engineering"
        domain_options = [active_target, "Data Scientist & Analytics Engineer", "Full-Stack Software Engineer"]

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
        "options": domain_options,
        "persona": persona,
        "domain": active_domain,
        "parent_domain": active_domain,
        "target_role": active_target,
        "raw_prompt": raw_text[:2500],
    })

    # Run decision XAI model
    decision_result = analyze_career_profile(normalized, source="resume_upload")
    decision_result["intent"] = "career"

    # ATS Compatibility Audit
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

    # Candidate name extraction: LLM name, or first non-empty header line of resume, or filename fallback
    candidate_name = None
    if llm_profile and llm_profile.get("full_name"):
        candidate_name = str(llm_profile.get("full_name")).strip()
    if not candidate_name:
        for line in raw_text.splitlines()[:6]:
            line_str = line.strip()
            if line_str and not any(k in line_str.lower() for k in ["http", "email", "phone", "curriculum", "resume", "@", "+91", "github", "linkedin"]):
                words = line_str.split()
                if 1 <= len(words) <= 4 and all(re.match(r"^[A-Za-z\.\'-]+$", w) for w in words):
                    candidate_name = line_str
                    break
    if not candidate_name and filename:
        clean_name = re.sub(r"(?i)\b(resume|cv|updated|profile|final|docx|pdf)\b", "", Path(filename).stem).strip(" _-")
        if clean_name and len(clean_name.split()) <= 4:
            candidate_name = clean_name.replace("_", " ").title()

    parsed_profile = {
        "name": candidate_name or "Candidate",
        "full_name": candidate_name or "Candidate",
        "degree": degree,
        "course": degree,
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
        "target_role": target_role.strip() if target_role else "auto",
        "persona": persona,
        "domain": active_domain,
        "llm_parsed": bool(llm_profile),
        "evidence_citations": evidence_citations,
    }

    return {
        "filename": filename,
        "target_role": target_role.strip() if target_role else "auto",
        "extracted_text_preview": raw_text[:1200] + ("..." if len(raw_text) > 1200 else ""),
        "raw_text": raw_text,
        "parsed_profile": parsed_profile,
        "parsed_credentials": parsed_profile,
        "normalized": normalized,
        "ats_audit": ats_audit,
        "decision": decision_result,
    }
