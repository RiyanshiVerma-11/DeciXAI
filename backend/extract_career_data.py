"""
One-time script to extract hardcoded data from career_accelerator_service.py into JSON config files.
Run from the backend/ directory.
"""
import importlib.util
import json
import os
import sys

# Add backend to path so imports resolve
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the module to access its data
spec = importlib.util.spec_from_file_location(
    "career_accelerator_service",
    os.path.join(os.path.dirname(__file__), "services", "career_accelerator_service.py"),
)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

datasets_dir = os.path.join(os.path.dirname(__file__), "datasets")
os.makedirs(datasets_dir, exist_ok=True)

# 1. Compensation data
compensation_data = {
    "country_configs": mod.COUNTRY_CONFIGS,
    "salary_database": mod._SALARY_DATABASE,
    "domain_ladder_levels": mod._DOMAIN_LADDER_LEVELS,
    "domain_skill_roi_premiums": mod._DOMAIN_SKILL_ROI_PREMIUMS,
}

comp_path = os.path.join(datasets_dir, "career_compensation_data.json")
with open(comp_path, "w", encoding="utf-8") as f:
    json.dump(compensation_data, f, indent=2, ensure_ascii=False)
print(f"Wrote compensation data to {comp_path} ({os.path.getsize(comp_path)} bytes)")

# 2. Skills taxonomy
skills_taxonomy = {
    "tech_keywords": sorted(mod._TECH_KEYWORDS_SET),
    "skill_synonyms": mod._SKILL_SYNONYMS,
}

skills_path = os.path.join(datasets_dir, "career_skills_taxonomy.json")
with open(skills_path, "w", encoding="utf-8") as f:
    json.dump(skills_taxonomy, f, indent=2, ensure_ascii=False)
print(f"Wrote skills taxonomy to {skills_path} ({os.path.getsize(skills_path)} bytes)")

print("Done.")
